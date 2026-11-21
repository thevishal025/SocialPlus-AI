from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseSocialAdapter(ABC):
    @abstractmethod
    def validate_url(self, url: str) -> str:
        """Validates social media URL and extracts the unique identifier (video_id, shortcode)."""
        pass

    @abstractmethod
    async def fetch_content_and_comments(self, url: str, max_comments: int = 250) -> Dict[str, Any]:
        """Fetches metadata, comment threads, replies, and returns normalized dictionary."""
        pass

