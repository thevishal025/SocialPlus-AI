"""
Pagination Manager for SocialPlus.ai Universal Scraper AI Engine.
Coordinates multi-page traversal, cursor handling, scroll-batch loading,
safe throttling, and early termination checks.
"""
import time
import asyncio
import logging
from typing import Optional, Callable, Dict, Any, List

logger = logging.getLogger("socialpulse.scraper.pagination")

class PaginationManager:
    """
    Manages pagination lifecycle for scrapers and APIs.
    """

    def __init__(
        self,
        max_items: int = 500,
        max_pages: int = 50,
        delay_seconds: float = 0.5,
    ):
        self.max_items = max_items
        self.max_pages = max_pages
        self.delay_seconds = delay_seconds
        self.current_page = 0
        self.total_extracted = 0
        self.consecutive_empty_pages = 0
        self.is_finished = False

    def should_continue(self, current_count: int) -> bool:
        """Determines if the scraper should fetch the next page."""
        if self.is_finished:
            return False
        if current_count >= self.max_items:
            return False
        if self.current_page >= self.max_pages:
            return False
        if self.consecutive_empty_pages >= 3:
            return False
        return True

    def record_page(self, new_items_count: int):
        """Updates internal state following a page extraction."""
        self.current_page += 1
        self.total_extracted += new_items_count
        if new_items_count == 0:
            self.consecutive_empty_pages += 1
        else:
            self.consecutive_empty_pages = 0

    async def throttle(self):
        """Asynchronous delay between pagination requests."""
        if self.delay_seconds > 0:
            await asyncio.sleep(self.delay_seconds)

    def throttle_sync(self):
        """Synchronous delay for browser automation threads."""
        if self.delay_seconds > 0:
            time.sleep(self.delay_seconds)

    def finish(self):
        self.is_finished = True

    def get_summary(self) -> Dict[str, Any]:
        return {
            "pages_processed": self.current_page,
            "total_extracted": self.total_extracted,
            "max_items": self.max_items,
            "max_pages": self.max_pages,
            "is_finished": self.is_finished,
        }

