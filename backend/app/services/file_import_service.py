"""
Shared File Import Service for SocialPlus.ai Universal Scraper AI Engine.
Supports CSV, Excel (.xlsx, .xls), and JSON file ingestion across YouTube, Meta (Instagram & Facebook),
and E-Commerce platforms. Feeds directly into the normalized analysis pipeline.
"""
import io
import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
from sqlalchemy.orm import Session

from .data_normalizer import data_normalizer
from ..engines.pipeline import pipeline

logger = logging.getLogger("socialpulse.scraper.file_import")

class FileImportService:
    """
    Centralized file import service providing column detection, previews,
    duplicate detection, and standard normalization for all 3 categories:
    - YouTube
    - Meta (Instagram & Facebook)
    - E-Commerce (Amazon, Flipkart, etc.)
    """

    COLUMN_PATTERNS = {
        "text": [
            r"^comment[_\s-]?text$", r"^comment$", r"^text$", r"^content$", r"^body$",
            r"^message$", r"^review[_\s-]?text$", r"^review$", r"^customer[_\s-]?review$"
        ],
        "username": [
            r"^user[_\s-]?name$", r"^author[_\s-]?name$", r"^username$", r"^author$",
            r"^user$", r"^name$", r"^reviewer[_\s-]?name$", r"^reviewer$", r"^customer[_\s-]?name$"
        ],
        "rating": [
            r"^rating$", r"^stars?$", r"^score$", r"^review[_\s-]?rating$", r"^user[_\s-]?rating$"
        ],
        "timestamp": [
            r"^published[_\s-]?at$", r"^created[_\s-]?at$", r"^timestamp$", r"^date$",
            r"^time$", r"^review[_\s-]?date$"
        ],
        "likes": [
            r"^like[_\s-]?count$", r"^likes$", r"^like$", r"^upvotes$", r"^helpful[_\s-]?votes?$"
        ],
        "comment_id": [
            r"^comment[_\s-]?id$", r"^review[_\s-]?id$", r"^id$", r"^pk$", r"^cid$"
        ],
        "parent_id": [
            r"^parent[_\s-]?comment[_\s-]?id$", r"^parent[_\s-]?id$", r"^reply[_\s-]?to[_\s-]?id$"
        ],
    }

    def detect_columns(self, columns: List[str]) -> Dict[str, Optional[str]]:
        """Intelligently matches column names to standard fields."""
        detected: Dict[str, Optional[str]] = {
            "text": None,
            "username": None,
            "rating": None,
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

        # Fallback for text: look for any column containing 'comment', 'review', or 'text'
        if not detected["text"]:
            for col_lower, original_col in col_lower_map.items():
                if any(k in col_lower for k in ["comment", "review", "text", "content"]):
                    detected["text"] = original_col
                    break

        return detected

    def parse_file_to_dataframe(self, contents: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
        """Loads CSV, XLSX, XLS, or JSON into a pandas DataFrame."""
        name_lower = (filename or "").lower()

        if name_lower.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(contents), dtype=str, engine="openpyxl")
            return df, "excel"

        elif name_lower.endswith(".json"):
            text_data = contents.decode("utf-8", errors="replace").strip()
            data = json.loads(text_data)
            if isinstance(data, dict):
                for candidate in ["comments", "reviews", "data", "items", "results", "rows"]:
                    if candidate in data and isinstance(data[candidate], list):
                        data = data[candidate]
                        break
                else:
                    data = [data]
            if not isinstance(data, list):
                raise ValueError("JSON file must contain an array of comment or review objects.")
            df = pd.DataFrame(data)
            return df, "json"

        else:
            # CSV / Delimited
            try:
                df = pd.read_csv(io.BytesIO(contents), dtype=str, encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(contents), dtype=str, encoding="latin1")
            return df, "csv"

    def preview_file(self, contents: bytes, filename: str) -> Dict[str, Any]:
        """Generates file structure preview with suggested column mappings."""
        df, file_type = self.parse_file_to_dataframe(contents, filename)
        columns = list(df.columns)
        suggested = self.detect_columns(columns)

        preview_rows = df.head(5).fillna("").to_dict(orient="records")

        return {
            "filename": filename,
            "file_type": file_type,
            "total_rows": len(df),
            "columns": columns,
            "suggested_mapping": suggested,
            "preview_rows": preview_rows,
        }

    def process_import(
        self,
        contents: bytes,
        filename: str,
        platform: str,
        column_mapping: Dict[str, Optional[str]],
        title: Optional[str] = None,
        brand: Optional[str] = None,
        price: Optional[str] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """
        Parses uploaded file according to mapping, deduplicates, normalizes,
        and executes the 5 AI intelligence engines.
        """
        df, file_type = self.parse_file_to_dataframe(contents, filename)
        text_col = column_mapping.get("text")
        if not text_col or text_col not in df.columns:
            raise ValueError(f"Selected text column '{text_col}' not found in file headers: {list(df.columns)}")

        user_col = column_mapping.get("username")
        time_col = column_mapping.get("timestamp")
        likes_col = column_mapping.get("likes")
        rating_col = column_mapping.get("rating")
        id_col = column_mapping.get("comment_id")
        parent_col = column_mapping.get("parent_id")

        raw_records = []
        for idx, row in df.iterrows():
            raw_text = str(row.get(text_col, "")).strip()
            if not raw_text or raw_text.lower() in ("nan", "null", "none"):
                continue

            raw_item = {
                "text": raw_text,
                "username": str(row.get(user_col, "User")).strip() if user_col and user_col in df.columns else f"User_{idx+1}",
                "timestamp": str(row.get(time_col, "")).strip() if time_col and time_col in df.columns else None,
                "likes": row.get(likes_col, 0) if likes_col and likes_col in df.columns else 0,
                "rating": row.get(rating_col, None) if rating_col and rating_col in df.columns else None,
                "id": str(row.get(id_col, f"imp_{idx+1}")) if id_col and id_col in df.columns else f"imp_{idx+1}",
                "parent_id": str(row.get(parent_col, "")) if parent_col and parent_col in df.columns else None,
            }
            normalized = data_normalizer.normalize_comment(
                raw=raw_item,
                platform=platform,
                content_id=f"file_{filename}",
                content_title=title or filename,
            )
            raw_records.append(normalized)

        # Strict deduplication
        unique_records, duplicate_count = data_normalizer.deduplicate(raw_records)

        if not unique_records:
            raise ValueError("No valid, non-empty comments or reviews could be extracted from the uploaded file.")

        # Run the 5 AI Intelligence Engines
        analysis_result = pipeline.process_comments(unique_records)

        content_title = title or filename.rsplit(".", 1)[0].replace("_", " ").title()

        return {
            "success": True,
            "platform": platform,
            "method": "upload",
            "video": {
                "id": f"upload_{filename}",
                "title": content_title,
                "channel": f"Uploaded Dataset ({filename})",
                "platform": platform,
                "comment_count": len(unique_records),
                "views": len(unique_records),
                "likes": sum(c.get("likes", 0) for c in unique_records),
            },
            "product": {
                "title": content_title,
                "platform": platform,
                "brand": brand,
                "price": price,
                "review_count": len(unique_records),
            },
            "comments": analysis_result["comments"],
            "summary": analysis_result["summary"],
            "status": "complete",
            "reported_count": len(df),
            "requested_count": len(df),
            "extracted_count": len(raw_records),
            "analyzed_count": len(unique_records),
            "duplicate_count": duplicate_count,
            "import_summary": {
                "filename": filename,
                "file_type": file_type,
                "total_rows_read": len(df),
                "valid_comments": len(raw_records),
                "duplicates_removed": duplicate_count,
                "analyzed": len(unique_records),
            },
        }

file_import_service = FileImportService()
