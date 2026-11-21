"""
Base scraper with SSRF protection and browser lifecycle management.
"""
import logging
import re
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Callable
from urllib.parse import urlparse

logger = logging.getLogger("socialpulse.scrapers.base")

# SSRF Protection: Only allow these domains
ALLOWED_DOMAINS = {
    "youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com",
    "instagram.com", "www.instagram.com",
    "amazon.in", "www.amazon.in", "amazon.com", "www.amazon.com",
    "flipkart.com", "www.flipkart.com", "dl.flipkart.com",
    "myntra.com", "www.myntra.com",
    "meesho.com", "www.meesho.com",
    "ajio.com", "www.ajio.com",
    "snapdeal.com", "www.snapdeal.com",
    "nykaa.com", "www.nykaa.com",
    "tatacliq.com", "www.tatacliq.com",
    "jiomart.com", "www.jiomart.com",
}

# Private IP patterns to block
PRIVATE_IP_PATTERNS = [
    re.compile(r'^10\.'),
    re.compile(r'^192\.168\.'),
    re.compile(r'^172\.(1[6-9]|2[0-9]|3[01])\.'),
    re.compile(r'^127\.'),
    re.compile(r'^0\.'),
    re.compile(r'^169\.254\.'),
    re.compile(r'^::1$'),
    re.compile(r'^fc00:'),
    re.compile(r'^fe80:'),
]

def validate_url_ssrf(url: str) -> tuple[bool, str]:
    """
    Validates URL against SSRF allowlist and private IP blocklist.
    Returns (is_valid, error_message).
    """
    try:
        parsed = urlparse(url.strip())
        if parsed.scheme not in ("http", "https"):
            return False, "URL must use http or https scheme."
        hostname = parsed.hostname or ""
        # Block private/loopback IPs
        for pattern in PRIVATE_IP_PATTERNS:
            if pattern.match(hostname):
                return False, f"Private/internal IP addresses are not allowed: {hostname}"
        if hostname in ("localhost", ""):
            return False, "localhost is not an allowed target."
        # Check allowlist
        if hostname not in ALLOWED_DOMAINS:
            # Also check if it ends with an allowed domain
            is_allowed = any(hostname.endswith("." + d) or hostname == d for d in ALLOWED_DOMAINS)
            if not is_allowed:
                return False, f"Domain '{hostname}' is not in the supported platform list."
        return True, ""
    except Exception as e:
        return False, f"URL parsing error: {str(e)}"


class BaseScraper(ABC):
    """Abstract base class for all platform scrapers."""

    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
        self._progress_callback: Optional[Callable] = None
        self._extracted_count = 0
        self._is_cancelled = False

    def set_progress_callback(self, callback: Callable):
        self._progress_callback = callback

    def _report_progress(self, stage: str, count: int = 0, message: str = ""):
        if self._progress_callback:
            try:
                self._progress_callback({"stage": stage, "count": count, "message": message})
            except Exception:
                pass

    def cancel(self):
        self._is_cancelled = True

    @abstractmethod
    def validate_url(self, url: str) -> tuple[bool, str, dict]:
        """
        Validates platform-specific URL.
        Returns (is_valid, error_message, metadata_dict)
        """
        pass

    @abstractmethod
    def extract(self, url: str, max_items: int = 500) -> Dict[str, Any]:
        """
        Main extraction entrypoint. Returns structured result dict.
        """
        pass

    def close(self):
        """Cleanup browser resources."""
        try:
            if self.page:
                self.page.close()
        except Exception:
            pass
        try:
            if self.context:
                self.context.close()
        except Exception:
            pass
        try:
            if self.browser:
                self.browser.close()
        except Exception:
            pass
        self.page = None
        self.context = None
        self.browser = None
