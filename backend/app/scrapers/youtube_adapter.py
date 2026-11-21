"""
YouTube Adapter for SocialPlus.ai Universal Scraper AI Engine.
Extracts public video information, comments, and replies without an API key using browser automation
and structured web page parsing.
"""
import re
import asyncio
import logging
from typing import Dict, Any, List, Optional, Callable, Tuple
from urllib.parse import urlparse

from .youtube_scraper import YouTubeScraper, extract_video_id
from ..services.data_normalizer import data_normalizer
from ..services.pagination_manager import PaginationManager

logger = logging.getLogger("socialpulse.adapter.youtube")

class YouTubeAdapter:
    """
    Adapter bridging the Universal Scraper Orchestrator to YouTube's public web interface.
    Operates completely WITHOUT API keys.
    """

    def __init__(self):
        self.scraper = YouTubeScraper()

    def validate_url(self, url: str) -> Tuple[bool, str, Dict[str, Any]]:
        """Validates YouTube URL and extracts video ID."""
        video_id = extract_video_id(url)
        if not video_id:
            return False, "Invalid YouTube video link. Enter a link like https://www.youtube.com/watch?v=VIDEO_ID", {}
        return True, "", {"video_id": video_id, "clean_url": f"https://www.youtube.com/watch?v={video_id}"}

    async def extract_comments(
        self,
        url: str,
        max_comments: int = 250,
        mode: str = "limit",
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """
        Executes public extraction without API keys.
        Supports pagination, deduplication, and reply extraction.
        """
        is_valid, err, meta = self.validate_url(url)
        if not is_valid:
            raise ValueError(err)

        video_id = meta["video_id"]
        clean_url = meta["clean_url"]
        target_limit = 50000 if mode == "all" else max_comments

        if progress_callback:
            self.scraper.set_progress_callback(progress_callback)

        # Run extraction in worker thread
        loop = asyncio.get_event_loop()
        raw_result = await loop.run_in_executor(
            None,
            self.scraper.extract,
            clean_url,
            target_limit,
        )

        if not raw_result.get("success", False) and raw_result.get("status") in ("comments_disabled", "unavailable", "blocked"):
            return {
                "success": False,
                "platform": "youtube",
                "method": "without_api",
                "error": raw_result.get("error", "YouTube comments are currently inaccessible on this video."),
                "video_title": raw_result.get("video_title", "YouTube Video"),
                "video_id": video_id,
                "comments": [],
                "total_extracted": 0,
                "duplicate_count": 0,
                "status": raw_result.get("status", "failed"),
            }

        raw_comments = raw_result.get("comments", [])

        # Normalize and deduplicate
        normalized_comments = [
            data_normalizer.normalize_comment(
                raw=c,
                platform="youtube",
                content_id=video_id,
                content_title=raw_result.get("video_title", f"YouTube Video ({video_id})"),
            )
            for c in raw_comments
        ]

        unique_comments, dup_count = data_normalizer.deduplicate(normalized_comments)

        return {
            "success": True,
            "platform": "youtube",
            "method": "without_api",
            "video": {
                "id": video_id,
                "title": raw_result.get("video_title") or f"YouTube Video ({video_id})",
                "channel": raw_result.get("channel") or "YouTube Creator",
                "platform": "youtube",
                "comment_count": len(unique_comments),
                "url": clean_url,
            },
            "comments": unique_comments,
            "total_extracted": len(raw_comments),
            "duplicate_count": dup_count,
            "status": "complete" if len(unique_comments) >= target_limit or mode == "all" else "partial",
        }

youtube_adapter = YouTubeAdapter()
