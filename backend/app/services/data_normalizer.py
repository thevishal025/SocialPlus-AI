"""
Unified Data Normalizer for SocialPlus.ai Universal Scraper AI Engine.
Standardizes records from YouTube, Meta (Instagram & Facebook), and E-Commerce platforms
into consistent schemas ready for the 5 AI intelligence engines and database persistence.
"""
import re
import hashlib
import datetime
from typing import Dict, Any, List, Optional, Tuple, Set

class DataNormalizer:
    """
    Normalizes heterogeneous comments and customer reviews into a uniform, verified data structure.
    Strictly removes duplicates and strips unwanted artifacts.
    """

    @staticmethod
    def clean_text(text: Any) -> str:
        """Sanitizes text by stripping HTML tags, extra whitespace, and control characters."""
        if text is None:
            return ""
        s = str(text)
        # Strip HTML tags
        s = re.sub(r"<[^>]+>", " ", s)
        # Collapse multiple spaces and linebreaks
        s = re.sub(r"\s+", " ", s).strip()
        return s

    @staticmethod
    def normalize_comment(
        raw: Dict[str, Any],
        platform: str,
        content_id: str = "",
        content_title: str = "",
        default_author: str = "Anonymous",
    ) -> Dict[str, Any]:
        """
        Normalizes a single comment/review item into the SocialPlus.ai standard dictionary.
        """
        text = DataNormalizer.clean_text(
            raw.get("text") or raw.get("comment_text") or raw.get("comment") or raw.get("body") or raw.get("review") or ""
        )

        username = (
            raw.get("username")
            or raw.get("author")
            or raw.get("user")
            or raw.get("display_name")
            or raw.get("reviewer_name")
            or default_author
        )
        username = str(username).strip() or default_author

        likes = 0
        try:
            likes = int(raw.get("likes") or raw.get("like_count") or raw.get("upvotes") or 0)
        except (ValueError, TypeError):
            likes = 0

        rating = None
        if "rating" in raw and raw["rating"] is not None:
            try:
                rating = float(raw["rating"])
            except (ValueError, TypeError):
                rating = None

        helpful_votes = 0
        if "helpful_votes" in raw and raw["helpful_votes"] is not None:
            try:
                helpful_votes = int(raw["helpful_votes"])
            except (ValueError, TypeError):
                helpful_votes = 0

        # Comment / review ID
        comment_id = str(
            raw.get("id")
            or raw.get("comment_id")
            or raw.get("review_id")
            or hashlib.md5(f"{platform}_{username}_{text}".encode("utf-8")).hexdigest()[:16]
        )

        parent_id = raw.get("parent_id") or raw.get("parent_comment_id")
        is_reply = bool(raw.get("is_reply") or parent_id)

        published_at = raw.get("published_at") or raw.get("timestamp") or raw.get("date") or raw.get("created_at")
        if isinstance(published_at, (datetime.datetime, datetime.date)):
            published_at = published_at.isoformat()
        elif published_at:
            published_at = str(published_at).strip()

        return {
            "id": comment_id,
            "comment_id": comment_id,
            "platform": platform.lower(),
            "content_id": content_id,
            "content_title": content_title,
            "username": username,
            "text": text,
            "comment_text": text,
            "like_count": likes,
            "likes": likes,
            "rating": rating,
            "helpful_votes": helpful_votes,
            "parent_id": str(parent_id) if parent_id else None,
            "parent_comment_id": str(parent_id) if parent_id else None,
            "is_reply": is_reply,
            "published_at": published_at,
            "retrieved_at": datetime.datetime.utcnow().isoformat(),
        }

    @staticmethod
    def deduplicate(records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], int]:
        """
        Deduplicates records based on text hash and author/ID.
        Returns (unique_records, duplicate_count).
        """
        seen_hashes: Set[str] = set()
        unique: List[Dict[str, Any]] = []
        duplicates = 0

        for r in records:
            text = (r.get("text") or r.get("comment_text") or "").strip().lower()
            if not text:
                continue
            author = (r.get("username") or r.get("author") or "").strip().lower()
            
            # Combine text and author for fingerprinting
            fingerprint = hashlib.md5(f"{text}###{author}".encode("utf-8")).hexdigest()
            if fingerprint in seen_hashes:
                duplicates += 1
                continue

            seen_hashes.add(fingerprint)
            unique.append(r)

        return unique, duplicates

data_normalizer = DataNormalizer()

