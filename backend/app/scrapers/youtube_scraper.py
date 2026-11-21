"""
YouTube comment scraper using Playwright browser automation.
Respects YouTube ToS: no login bypass, no CAPTCHA solving.
Only extracts publicly visible content.
"""
import logging
import re
import time
from typing import Dict, Any, List
from urllib.parse import urlparse, parse_qs

from .base_scraper import BaseScraper, validate_url_ssrf

logger = logging.getLogger("socialpulse.scrapers.youtube")


def extract_video_id(url: str) -> str | None:
    """Extracts YouTube video ID from various URL formats."""
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/|youtube\.com/live/|youtube\.com/embed/|youtube\.com/v/)([A-Za-z0-9_-]{11})',
        r'^([A-Za-z0-9_-]{11})$',
    ]
    for p in patterns:
        m = re.search(p, url.strip())
        if m:
            return m.group(1)
    return None


class YouTubeScraper(BaseScraper):
    """
    Playwright-based YouTube public comment scraper.
    Extracts comments by scrolling the YouTube comments section.
    Does NOT bypass login walls or CAPTCHAs.
    """

    def validate_url(self, url: str) -> tuple[bool, str, dict]:
        """Validates YouTube URL and extracts video ID."""
        is_valid, ssrf_err = validate_url_ssrf(url)
        if not is_valid:
            return False, ssrf_err, {}

        video_id = extract_video_id(url)
        if not video_id:
            return False, "Could not extract a valid YouTube video ID from the URL.", {}

        clean_url = f"https://www.youtube.com/watch?v={video_id}"
        return True, "", {"video_id": video_id, "clean_url": clean_url}

    def extract(self, url: str, max_items: int = 500) -> Dict[str, Any]:
        """
        Opens YouTube video in Playwright, scrolls to comments section,
        and extracts visible comment text, authors, and likes.
        """
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

        is_valid, err, meta = self.validate_url(url)
        if not is_valid:
            return {
                "success": False,
                "status": "invalid_url",
                "error": err,
                "comments": [],
                "video_title": "",
                "video_id": "",
                "channel": "",
                "total_extracted": 0,
                "total_unique": 0,
                "is_blocked": False,
            }

        video_id = meta["video_id"]
        clean_url = meta["clean_url"]
        logger.info("YouTube scraper starting: %s (max=%d)", clean_url, max_items)
        self._report_progress("starting", 0, f"Opening YouTube video: {video_id}")

        comments: List[Dict[str, Any]] = []
        seen_keys = set()
        video_title = ""
        channel = ""
        is_blocked = False
        status = "complete"

        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-dev-shm-usage"],
                )
                context = browser.new_context(
                    viewport={"width": 1280, "height": 900},
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0.0.0 Safari/537.36"
                    ),
                )
                page = context.new_page()

                try:
                    self._report_progress("navigating", 0, "Loading YouTube page...")
                    page.goto(clean_url, wait_until="domcontentloaded", timeout=30000)
                    page.wait_for_timeout(3000)

                    # Detect blocked/unavailable video
                    page_content = page.content()
                    if "Video unavailable" in page_content or "This video isn't available" in page_content:
                        return {
                            "success": False, "status": "unavailable",
                            "error": "This YouTube video is unavailable or has been removed.",
                            "comments": [], "video_title": "", "video_id": video_id,
                            "channel": "", "total_extracted": 0, "total_unique": 0, "is_blocked": False,
                        }

                    # Extract video title
                    try:
                        title_el = page.query_selector('h1.ytd-video-primary-info-renderer yt-formatted-string, h1.style-scope.ytd-watch-metadata')
                        if title_el:
                            video_title = title_el.text_content().strip()
                        if not video_title:
                            meta_title = page.query_selector('meta[name="title"]')
                            if meta_title:
                                video_title = meta_title.get_attribute("content") or ""
                    except Exception:
                        pass

                    # Extract channel
                    try:
                        channel_el = page.query_selector('#channel-name a, ytd-video-owner-renderer a')
                        if channel_el:
                            channel = channel_el.text_content().strip()
                    except Exception:
                        pass

                    # Scroll to comments section
                    self._report_progress("scrolling", 0, "Scrolling to comments section...")
                    for _ in range(5):
                        page.evaluate("window.scrollBy(0, 800)")
                        page.wait_for_timeout(1000)

                    # Wait for comment thread renderer
                    try:
                        page.wait_for_selector("ytd-comment-thread-renderer", timeout=15000)
                    except PWTimeout:
                        # Comments might be disabled
                        if "Comments are turned off" in page.content() or "comments are disabled" in page.content().lower():
                            return {
                                "success": False, "status": "comments_disabled",
                                "error": "Comments are disabled on this YouTube video.",
                                "comments": [], "video_title": video_title, "video_id": video_id,
                                "channel": channel, "total_extracted": 0, "total_unique": 0, "is_blocked": False,
                            }
                        logger.warning("Could not find ytd-comment-thread-renderer for %s", clean_url)

                    # Scroll to load comments
                    scroll_count = 0
                    max_scrolls = max(5, min(60, max_items // 8))
                    no_new_count = 0

                    while len(comments) < max_items and scroll_count < max_scrolls:
                        if self._is_cancelled:
                            status = "cancelled"
                            break

                        comment_threads = page.query_selector_all("ytd-comment-thread-renderer")
                        prev_count = len(comments)

                        for thread in comment_threads:
                            if len(comments) >= max_items:
                                break
                            try:
                                # Extract author
                                author_el = thread.query_selector("#author-text span, a#author-text")
                                author = author_el.text_content().strip() if author_el else "unknown"

                                # Extract text
                                text_el = thread.query_selector("#content-text")
                                text = text_el.text_content().strip() if text_el else ""
                                if not text:
                                    continue

                                # Dedup
                                dedup_key = f"{author}::{text[:100]}"
                                if dedup_key in seen_keys:
                                    continue
                                seen_keys.add(dedup_key)

                                # Likes
                                likes = 0
                                try:
                                    likes_el = thread.query_selector("#vote-count-middle")
                                    if likes_el:
                                        likes_text = likes_el.text_content().strip()
                                        likes = int(re.sub(r'[^0-9]', '', likes_text) or '0')
                                except Exception:
                                    pass

                                comments.append({
                                    "id": f"yt_{video_id}_{len(comments)}",
                                    "username": author,
                                    "text": text,
                                    "like_count": likes,
                                    "platform": "youtube",
                                    "content_id": video_id,
                                })
                            except Exception:
                                continue

                        new_count = len(comments) - prev_count
                        if new_count == 0:
                            no_new_count += 1
                        else:
                            no_new_count = 0
                            self._report_progress("extracting", len(comments), f"Extracted {len(comments)} comments...")

                        if no_new_count >= 5:
                            break

                        page.evaluate("window.scrollBy(0, 1000)")
                        page.wait_for_timeout(1500)
                        scroll_count += 1

                    logger.info("YouTube scraper finished: %d comments for %s", len(comments), video_id)

                except PWTimeout:
                    logger.error("Playwright timeout for YouTube %s", clean_url)
                    return {
                        "success": len(comments) > 0, "status": "timeout",
                        "error": "Request timed out while loading the YouTube page.",
                        "comments": comments, "video_title": video_title, "video_id": video_id,
                        "channel": channel, "total_extracted": len(comments), "total_unique": len(comments), "is_blocked": False,
                    }
                finally:
                    try:
                        page.close()
                    except Exception:
                        pass
                    try:
                        context.close()
                    except Exception:
                        pass
                    try:
                        browser.close()
                    except Exception:
                        pass

        except Exception as exc:
            logger.error("YouTube scraper error: %s", exc, exc_info=True)
            return {
                "success": len(comments) > 0, "status": "error",
                "error": f"Scraper error: {str(exc)}",
                "comments": comments, "video_title": video_title, "video_id": video_id,
                "channel": channel, "total_extracted": len(comments), "total_unique": len(comments), "is_blocked": False,
            }

        final_status = status if status != "complete" else ("complete" if comments else "empty")
        return {
            "success": len(comments) > 0,
            "status": final_status,
            "error": "" if comments else "No comments could be extracted. YouTube may require login or comments are disabled.",
            "comments": comments,
            "video_title": video_title,
            "video_id": video_id,
            "channel": channel,
            "total_extracted": len(comments),
            "total_unique": len(comments),
            "is_blocked": is_blocked,
        }


youtube_scraper = YouTubeScraper()
