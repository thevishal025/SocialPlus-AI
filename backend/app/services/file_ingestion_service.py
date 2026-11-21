import io
import re
import json
import uuid
import datetime
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
from sqlalchemy.orm import Session

from .comment_normalizer import comment_normalizer, NormalizedComment
from ..engines.pipeline import pipeline
from .analysis_service import analysis_service

class FileIngestionService:
    """
    Unified Ingestion Engine supporting:
    - CSV (.csv)
    - Excel (.xlsx, .xls)
    - JSON (.json)
    - Manual comment line entry
    Across YouTube and Instagram platforms with automatic column detection,
    manual column mapping, duplicate detection, and shared 5-engine AI pipeline processing.
    """

    COLUMN_PATTERNS = {
        "text": [r"^comment[_\s-]?text$", r"^comment$", r"^text$", r"^content$", r"^body$", r"^message$", r"^review$", r"^caption$"],
        "username": [r"^user[_\s-]?name$", r"^author[_\s-]?name$", r"^username$", r"^author$", r"^user$", r"^name$", r"^display[_\s-]?name$", r"^handle$"],
        "timestamp": [r"^published[_\s-]?at$", r"^created[_\s-]?at$", r"^timestamp$", r"^date$", r"^time$", r"^datetime$"],
        "likes": [r"^like[_\s-]?count$", r"^likes$", r"^like$", r"^upvotes$", r"^favorite[_\s-]?count$"],
        "comment_id": [r"^comment[_\s-]?id$", r"^platform[_\s-]?comment[_\s-]?id$", r"^id$", r"^pk$", r"^cid$"],
        "parent_id": [r"^parent[_\s-]?comment[_\s-]?id$", r"^parent[_\s-]?id$", r"^reply[_\s-]?to[_\s-]?id$", r"^in[_\s-]?reply[_\s-]?to$"],
    }

    def detect_columns(self, columns: List[str]) -> Dict[str, Optional[str]]:
        """Intelligently matches column names to standard fields."""
        detected: Dict[str, Optional[str]] = {
            "text": None,
            "username": None,
            "timestamp": None,
            "likes": None,
            "comment_id": None,
            "parent_id": None,
        }

        col_lower_map = {col.strip().lower(): col for col in columns}

        for target_field, regex_list in self.COLUMN_PATTERNS.items():
            for pattern in regex_list:
                for col_lower, original_col in col_lower_map.items():
                    if re.search(pattern, col_lower):
                        detected[target_field] = original_col
                        break
                if detected[target_field]:
                    break

        # Fallback for text: if no exact pattern matched, look for any column containing 'comment' or 'text'
        if not detected["text"]:
            for col_lower, original_col in col_lower_map.items():
                if "comment" in col_lower or "text" in col_lower or "content" in col_lower:
                    detected["text"] = original_col
                    break

        return detected

    def parse_raw_dataframe(self, contents: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
        """Loads CSV, XLSX, XLS, or JSON bytes into a pandas DataFrame."""
        name_lower = (filename or "").lower()

        if name_lower.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(contents), dtype=str, engine="openpyxl")
            return df, "excel"

        elif name_lower.endswith(".json"):
            text_data = contents.decode("utf-8", errors="replace").strip()
            data = json.loads(text_data)
            # Unwrap common JSON wrappers
            if isinstance(data, dict):
                for candidate_key in ["comments", "data", "items", "results", "rows"]:
                    if candidate_key in data and isinstance(data[candidate_key], list):
                        data = data[candidate_key]
                        break
                else:
                    # Single object or dict of items
                    data = [data]
            if not isinstance(data, list):
                raise ValueError("JSON file must contain an array of comment objects or a wrapper with a 'comments' array.")
            df = pd.DataFrame(data)
            return df, "json"

        else:
            # Default to CSV / delimited text
            try:
                df = pd.read_csv(io.BytesIO(contents), dtype=str, encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(contents), dtype=str, encoding="latin1")
            return df, "csv"

    def get_preview(self, contents: bytes, filename: str) -> Dict[str, Any]:
        """Returns file column structure, intelligent suggestion, and top 5 preview rows."""
        df, file_type = self.parse_raw_dataframe(contents, filename)
        columns = [str(c) for c in df.columns]
        detected_mapping = self.detect_columns(columns)

        preview_records = df.head(5).fillna("").to_dict(orient="records")

        return {
            "filename": filename,
            "file_type": file_type,
            "total_rows": int(len(df)),
            "columns": columns,
            "suggested_mapping": detected_mapping,
            "preview_rows": preview_records,
        }

    def process_import(
        self,
        contents: bytes,
        filename: str,
        platform: str,
        mapping: Dict[str, Optional[str]],
        content_title: Optional[str] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """
        Parses full file contents with specified column mappings,
        validates rows, detects duplicates, executes all 5 AI engines,
        persists to database with source_type='file_import', and returns analysis.
        """
        df, file_type = self.parse_raw_dataframe(contents, filename)
        total_rows = len(df)

        text_col = mapping.get("text")
        if not text_col or text_col not in df.columns:
            raise ValueError(f"Required comment text column '{text_col}' not found in uploaded file.")

        user_col = mapping.get("username")
        time_col = mapping.get("timestamp")
        like_col = mapping.get("likes")
        id_col = mapping.get("comment_id")
        parent_col = mapping.get("parent_id")

        raw_comments: List[Dict[str, Any]] = []
        seen_texts: set = set()
        seen_ids: set = set()
        duplicates_count = 0
        invalid_rows_count = 0
        invalid_details: List[str] = []

        content_id = f"file-{uuid.uuid4().hex[:8]}"

        for idx, row in df.iterrows():
            row_num = idx + 1
            raw_text = row.get(text_col)
            text_str = str(raw_text).strip() if pd.notna(raw_text) else ""

            if not text_str or text_str.lower() in ("nan", "none", "null", ""):
                invalid_rows_count += 1
                if len(invalid_details) < 10:
                    invalid_details.append(f"Row {row_num}: Missing comment text.")
                continue

            # Unique comment ID
            cid = None
            if id_col and pd.notna(row.get(id_col)):
                cid = str(row.get(id_col)).strip()
            if not cid:
                cid = f"{platform}-imp-{row_num}-{uuid.uuid4().hex[:6]}"

            # Duplicate detection (by comment ID or identical comment text)
            normalized_text = text_str.lower()
            if cid in seen_ids or normalized_text in seen_texts:
                duplicates_count += 1
                # Still include or mark as duplicate for analysis
                is_duplicate = True
            else:
                is_duplicate = False
                seen_texts.add(normalized_text)
                seen_ids.add(cid)

            # Username
            username = "user"
            if user_col and pd.notna(row.get(user_col)):
                username = str(row.get(user_col)).strip() or "user"

            # Likes
            likes = 0
            if like_col and pd.notna(row.get(like_col)):
                try:
                    likes = max(0, int(float(str(row.get(like_col)).replace(",", ""))))
                except (ValueError, TypeError):
                    likes = 0

            # Timestamp
            pub_date = None
            if time_col and pd.notna(row.get(time_col)):
                pub_date = comment_normalizer.parse_datetime(row.get(time_col))

            # Parent ID / is_reply
            parent_id = None
            is_reply = False
            if parent_col and pd.notna(row.get(parent_col)):
                parent_val = str(row.get(parent_col)).strip()
                if parent_val and parent_val.lower() not in ("nan", "none", "0"):
                    parent_id = parent_val
                    is_reply = True

            raw_comments.append({
                "id": cid,
                "platform": platform,
                "content_id": content_id,
                "content_title": content_title or f"Imported {filename}",
                "username": username,
                "text": text_str,
                "like_count": likes,
                "published_at": pub_date.isoformat() if pub_date else None,
                "is_reply": is_reply,
                "parent_id": parent_id,
                "is_duplicate": is_duplicate,
                "source_type": "file_import",
            })

        if not raw_comments:
            raise ValueError(f"No valid comments could be extracted from '{filename}'. Please check column mappings.")

        # Process through 5 AI Intelligence Engines
        processed = pipeline.process_comments(raw_comments)

        video_meta = {
            "id": content_id,
            "platform": platform,
            "title": content_title or f"Imported Dataset: {filename}",
            "channel": f"{platform.capitalize()} File Import ({file_type.upper()})",
            "thumbnail": None,
            "views": total_rows,
            "likes": sum(c.get("like_count", 0) for c in raw_comments),
            "comment_count": len(processed["comments"]),
            "source_type": "file_import",
        }

        # Persist to database if db session provided
        if db:
            analysis_service._persist_results(db, video_meta, processed["comments"], source_type="file_import")

        import_summary = {
            "total_rows_read": total_rows,
            "successfully_imported": len(raw_comments),
            "duplicates_detected": duplicates_count,
            "invalid_rows_skipped": invalid_rows_count,
            "invalid_details": invalid_details,
            "file_type": file_type,
            "platform": platform,
        }

        return {
            "video": video_meta,
            "comments": processed["comments"],
            "summary": processed["summary"],
            "import_summary": import_summary,
            "notice": f"{platform.capitalize()} {file_type.upper()} file processed: {len(raw_comments)} comments analyzed across all 5 AI engines.",
        }

    def process_manual_comments(
        self,
        comments_data: List[Dict[str, Any]],
        platform: str,
        content_title: Optional[str] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """
        Processes manual comment submissions (pasted lines or structured rows)
        through the shared 5-engine pipeline and database.
        """
        if not comments_data:
            raise ValueError("Please provide at least one comment for manual analysis.")

        content_id = f"manual-{uuid.uuid4().hex[:8]}"
        raw_comments = []
        seen_texts = set()
        duplicates_count = 0

        for i, item in enumerate(comments_data):
            if isinstance(item, str):
                text = item.strip()
                username = f"user_{i+1}"
                likes = 0
                pub_at = None
            else:
                text = str(item.get("text", "")).strip()
                username = str(item.get("username", "")).strip() or f"user_{i+1}"
                likes = int(item.get("likes", item.get("like_count", 0)) or 0)
                pub_at = item.get("timestamp") or item.get("published_at")

            if not text:
                continue

            normalized_text = text.lower()
            is_dup = normalized_text in seen_texts
            if is_dup:
                duplicates_count += 1
            else:
                seen_texts.add(normalized_text)

            cid = f"{platform}-man-{i+1}-{uuid.uuid4().hex[:6]}"
            raw_comments.append({
                "id": cid,
                "platform": platform,
                "content_id": content_id,
                "content_title": content_title or f"Manual {platform.capitalize()} Entry Session",
                "username": username,
                "text": text,
                "like_count": likes,
                "published_at": pub_at,
                "is_reply": False,
                "is_duplicate": is_dup,
                "source_type": "manual",
            })

        if not raw_comments:
            raise ValueError("All entered comments were blank or invalid.")

        processed = pipeline.process_comments(raw_comments)

        video_meta = {
            "id": content_id,
            "platform": platform,
            "title": content_title or f"Manual {platform.capitalize()} Comments Batch",
            "channel": f"Manual Entry ({len(raw_comments)} comments)",
            "thumbnail": None,
            "views": len(raw_comments),
            "likes": sum(c.get("like_count", 0) for c in raw_comments),
            "comment_count": len(processed["comments"]),
            "source_type": "manual",
        }

        if db:
            analysis_service._persist_results(db, video_meta, processed["comments"], source_type="manual")

        import_summary = {
            "total_rows_read": len(comments_data),
            "successfully_imported": len(raw_comments),
            "duplicates_detected": duplicates_count,
            "invalid_rows_skipped": len(comments_data) - len(raw_comments),
            "invalid_details": [],
            "file_type": "manual",
            "platform": platform,
        }

        return {
            "video": video_meta,
            "comments": processed["comments"],
            "summary": processed["summary"],
            "import_summary": import_summary,
            "notice": f"Manual {platform.capitalize()} submission: {len(raw_comments)} comments analyzed across all 5 AI engines.",
        }

file_ingestion_service = FileIngestionService()

