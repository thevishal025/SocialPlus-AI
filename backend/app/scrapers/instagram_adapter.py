"""
Instagram Adapter for SocialPlus.ai Universal Scraper AI Engine.
Supports both Without-API public browser extraction (posts & reels) and Official Meta API integration.
"""
import re
import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple, Callable

from ..services.instagram_automatic_service import (
    instagram_automatic_service,
    InstagramAutomaticExtractionError,
)
from ..services.rapidapi_instagram_service import rapidapi_instagram_service, InstagramAPIError
from ..services.meta_instagram_service import meta_instagram_service, MetaInstagramAPIError
from ..services.data_normalizer import data_normalizer

logger = logging.getLogger("socialpulse.adapter.instagram")

class InstagramAdapter:
    """
    Adapter bridging the Universal Scraper Orchestrator to Instagram.
    """

    def validate_url(self, url: str) -> Tuple[bool, str, Dict[str, Any]]:
        """Validates Instagram Post or Reel URL."""
        cleaned = (url or "").strip()
        pattern = r"/(?:share/)?(p|reel|reels|tv)/([A-Za-z0-9_-]+)"
        match = re.search(pattern, cleaned, re.IGNORECASE)
        if match:
            kind = "reel" if match.group(1).lower() in ("reel", "reels") else "post"
            shortcode = match.group(2)
            return True, "", {"kind": kind, "shortcode": shortcode, "clean_url": f"https://www.instagram.com/{match.group(1)}/{shortcode}/"}
        if re.fullmatch(r"[A-Za-z0-9_-]{5,35}", cleaned):
            return True, "", {"kind": "post", "shortcode": cleaned, "clean_url": f"https://www.instagram.com/p/{cleaned}/"}
        return False, "Invalid Instagram URL. Enter a link like https://www.instagram.com/p/CODE/ or https://www.instagram.com/reel/CODE/", {}

    async def extract_without_api(
        self,
        url: str,
        max_comments: int = 200,
        mode: str = "limit",
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """
        Public extraction without API keys using browser automation.
        Detects login challenges transparently and honors security restrictions.
        """
        is_valid, err, meta = self.validate_url(url)
        if not is_valid:
            raise ValueError(err)

        if progress_callback:
            progress_callback({"stage": "Connecting to Instagram public page...", "percent": 20})

        target_limit = 50000 if mode == "all" else max_comments

        try:
            raw_result = await instagram_automatic_service.extract_comments(
                url=url,
                max_comments=target_limit,
                mode=mode,
            )
            raw_comments = raw_result.get("comments", [])
            normalized = [
                data_normalizer.normalize_comment(
                    raw=c,
                    platform="instagram",
                    content_id=meta["shortcode"],
                    content_title=raw_result.get("video", {}).get("title", f"Instagram {meta['kind'].capitalize()}"),
                )
                for c in raw_comments
            ]
            unique_comments, dup_count = data_normalizer.deduplicate(normalized)

            return {
                "success": True,
                "platform": "instagram",
                "method": "without_api",
                "video": raw_result.get("video", {
                    "id": meta["shortcode"],
                    "title": f"Instagram {meta['kind'].capitalize()} ({meta['shortcode']})",
                    "platform": "instagram",
                    "comment_count": len(unique_comments),
                }),
                "comments": unique_comments,
                "total_extracted": len(raw_comments),
                "duplicate_count": dup_count,
                "status": "complete" if len(unique_comments) >= target_limit or mode == "all" else "partial",
            }
        except InstagramAutomaticExtractionError as exc:
            return {
                "success": False,
                "platform": "instagram",
                "method": "without_api",
                "error": exc.message,
                "error_code": exc.error_code,
                "details": exc.details,
                "can_switch_to_csv": exc.can_switch_to_csv,
                "comments": [],
                "status": "blocked" if exc.status_code == 403 else "failed",
            }

    async def extract_with_api(
        self,
        url: str,
        max_comments: int = 200,
        mode: str = "limit",
    ) -> Dict[str, Any]:
        """
        Official API extraction via RapidAPI or Meta Graph API.
        """
        is_valid, err, meta = self.validate_url(url)
        if not is_valid:
            raise ValueError(err)

        # Check if official Meta Graph API credentials configured
        if meta_instagram_service.is_configured():
            raw_result = await meta_instagram_service.fetch_comments_official(
                media_id=meta["shortcode"],
                max_comments=max_comments,
            )
        else:
            raw_result = await rapidapi_instagram_service.fetch_post_comments(
                url_or_code=meta["clean_url"],
                max_comments=max_comments,
            )

        raw_comments = raw_result.get("comments", [])
        normalized = [
            data_normalizer.normalize_comment(
                raw=c,
                platform="instagram",
                content_id=meta["shortcode"],
                content_title=raw_result.get("video", {}).get("title", f"Instagram {meta['kind'].capitalize()}"),
            )
            for c in raw_comments
        ]
        unique_comments, dup_count = data_normalizer.deduplicate(normalized)

        return {
            "success": True,
            "platform": "instagram",
            "method": "official_api",
            "video": raw_result.get("video", {
                "id": meta["shortcode"],
                "title": f"Instagram Post ({meta['shortcode']})",
                "platform": "instagram",
                "comment_count": len(unique_comments),
            }),
            "comments": unique_comments,
            "total_extracted": len(raw_comments),
            "duplicate_count": dup_count,
            "status": "complete",
        }

instagram_adapter = InstagramAdapter()

