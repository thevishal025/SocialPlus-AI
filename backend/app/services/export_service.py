"""
Export Service for SocialPlus.ai Universal Scraper AI Engine.
Generates CSV, Excel (.xlsx), and JSON exports of extracted comments, reviews,
and AI intelligence analysis results.
"""
import io
import json
import datetime
from typing import Dict, Any, List, Tuple, Optional
import pandas as pd

class ExportService:
    """
    Exports comments, reviews, and intelligence metrics into downloadable CSV, XLSX, and JSON files.
    """

    @staticmethod
    def _prepare_export_dataframe(
        comments: List[Dict[str, Any]],
        platform: str = "socialplus",
    ) -> pd.DataFrame:
        """Flattens comments and their AI analysis results into tabular format."""
        rows = []
        for idx, c in enumerate(comments, start=1):
            analysis = c.get("analysis", {})
            row = {
                "No.": idx,
                "Platform": (c.get("platform") or platform).capitalize(),
                "Author": c.get("username") or c.get("author") or "Anonymous",
                "Comment Text": c.get("text") or c.get("comment_text") or "",
                "Likes": c.get("like_count") or c.get("likes") or 0,
                "Rating": c.get("rating") if c.get("rating") is not None else "",
                "Sentiment": analysis.get("sentiment", "Neutral"),
                "Confidence": f"{analysis.get('confidence_score', 0):.2f}" if "confidence_score" in analysis else "",
                "Dominant Emotion": analysis.get("dominant_emotion", "Neutral"),
                "Intent": analysis.get("intent", "General"),
                "Spam Detected": "Yes" if analysis.get("moderation", {}).get("is_spam") else "No",
                "Toxicity Detected": "Yes" if analysis.get("moderation", {}).get("is_toxic") else "No",
                "Published At": c.get("published_at") or "",
                "Comment ID": c.get("id") or c.get("comment_id") or "",
            }
            rows.append(row)

        if not rows:
            return pd.DataFrame(columns=[
                "No.", "Platform", "Author", "Comment Text", "Likes", "Rating",
                "Sentiment", "Dominant Emotion", "Intent", "Spam Detected", "Toxicity Detected"
            ])
        return pd.DataFrame(rows)

    def export_csv(
        self,
        comments: List[Dict[str, Any]],
        platform: str = "socialplus",
        title: str = "export",
    ) -> Tuple[bytes, str, str]:
        """
        Exports comments to CSV with UTF-8 BOM encoding for complete international & Excel compatibility.
        Returns (file_bytes, filename, media_type).
        """
        df = self._prepare_export_dataframe(comments, platform)
        output = io.StringIO()
        df.to_csv(output, index=False, encoding="utf-8")
        csv_bytes = output.getvalue().encode("utf-8-sig")

        clean_title = "".join(c for c in title if c.isalnum() or c in ("-", "_")).strip() or "comments"
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{platform}_{clean_title}_{timestamp}.csv"

        return csv_bytes, filename, "text/csv"

    def export_excel(
        self,
        comments: List[Dict[str, Any]],
        platform: str = "socialplus",
        title: str = "export",
        summary: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bytes, str, str]:
        """
        Exports comments and summary statistics to a styled multi-sheet Excel file (.xlsx).
        Returns (file_bytes, filename, media_type).
        """
        df_comments = self._prepare_export_dataframe(comments, platform)

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df_comments.to_excel(writer, sheet_name="Comments & Analysis", index=False)

            # Optional Summary sheet
            if summary:
                summary_rows = [
                    {"Metric": "Total Comments Analyzed", "Value": summary.get("total_comments", len(comments))},
                    {"Metric": "Net Sentiment Score", "Value": summary.get("net_sentiment_score", "N/A")},
                    {"Metric": "Dominant Emotion", "Value": summary.get("dominant_emotion", "N/A")},
                    {"Metric": "Positive Sentiment %", "Value": f"{summary.get('sentiment_percentages', {}).get('Positive', 0)}%"},
                    {"Metric": "Negative Sentiment %", "Value": f"{summary.get('sentiment_percentages', {}).get('Negative', 0)}%"},
                    {"Metric": "Neutral Sentiment %", "Value": f"{summary.get('sentiment_percentages', {}).get('Neutral', 0)}%"},
                    {"Metric": "Flagged Spam Count", "Value": summary.get("moderation_summary", {}).get("spam_count", 0)},
                    {"Metric": "Flagged Toxic Count", "Value": summary.get("moderation_summary", {}).get("toxic_count", 0)},
                ]
                df_summary = pd.DataFrame(summary_rows)
                df_summary.to_excel(writer, sheet_name="Intelligence Summary", index=False)

        excel_bytes = output.getvalue()
        clean_title = "".join(c for c in title if c.isalnum() or c in ("-", "_")).strip() or "comments"
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{platform}_{clean_title}_{timestamp}.xlsx"

        return (
            excel_bytes,
            filename,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    def export_json(
        self,
        data: Dict[str, Any],
        platform: str = "socialplus",
        title: str = "export",
    ) -> Tuple[bytes, str, str]:
        """
        Exports full structured data (comments, metadata, intelligence summary) to JSON.
        Returns (file_bytes, filename, media_type).
        """
        json_str = json.dumps(data, indent=2, ensure_ascii=False, default=str)
        json_bytes = json_str.encode("utf-8")

        clean_title = "".join(c for c in title if c.isalnum() or c in ("-", "_")).strip() or "comments"
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{platform}_{clean_title}_{timestamp}.json"

        return json_bytes, filename, "application/json"

export_service = ExportService()
