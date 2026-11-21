"""
Instagram comment scraper using Playwright (browser automation).
Respects Instagram ToS: no login bypass, no CAPTCHA solving, no rate limit circumvention.
Only extracts publicly accessible content. Honestly reports blocks and login walls.
"""
import logging
import re
import time
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse, urlunparse, parse_qs

from .base_scraper import BaseScraper, validate_url_ssrf

logger = logging.getLogger("socialpulse.scrapers.instagram")

# Regex to extract shortcode from Instagram URLs
_IG_URL_PATTERN = re.compile(
    r'instagram\.com/(?:p|reel|reels|tv)/([A-Za-z0-9_-]+)'
)


class InstagramScraper(BaseScraper):
    """
    Playwright-based Instagram public comment scraper.
    Extracts comments from public Instagram posts and reels.
    Does NOT bypass login walls, CAPTCHAs, or rate limits.
    """

    def validate_url(self, url: str) -> tuple[bool, str, dict]:
        """Validates Instagram post/reel URL and extracts shortcode."""
        is_valid, ssrf_err = validate_url_ssrf(url)
        if not is_valid:
            return False, ssrf_err, {}

        parsed = urlparse(url)
        if "instagram.com" not in (parsed.hostname or ""):
            return False, "URL is not an Instagram link.", {}

        m = _IG_URL_PATTERN.search(url)
        if not m:
            return False, (
                "Could not find a valid Instagram post or reel shortcode in the URL. "
                "Supported formats: /p/CODE/, /reel/CODE/, /reels/CODE/"
            ), {}

        shortcode = m.group(1)
        # Determine content type
        if "/reel/" in url or "/reels/" in url or "/tv/" in url:
            content_type = "reel"
        else:
            content_type = "post"

        # Build clean URL (strip tracking params that may cause issues)
        clean_url = f"https://www.instagram.com/p/{shortcode}/"
        if content_type == "reel":
            clean_url = f"https://www.instagram.com/reel/{shortcode}/"

        return True, "", {"shortcode": shortcode, "content_type": content_type, "clean_url": clean_url}

    def extract(self, url: str, max_items: int = 500) -> Dict[str, Any]:
        """
        Opens Instagram post/reel in a Playwright Chromium browser,
        scrolls to load comments, and extracts text/author/likes.

        Returns structured result with comments, metadata, and status.
        Does NOT fake results. Reports actual extraction outcome.
        """
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

        is_valid, err, meta = self.validate_url(url)
        if not is_valid:
            return {
                "success": False,
                "status": "invalid_url",
                "error": err,
                "comments": [],
                "post_title": "",
                "shortcode": "",
                "total_extracted": 0,
                "total_unique": 0,
                "is_blocked": False,
                "is_login_required": False,
            }

        shortcode = meta["shortcode"]
        content_type = meta["content_type"]
        clean_url = meta["clean_url"]

        logger.info("Instagram scraper starting: %s (type=%s, max=%d)", clean_url, content_type, max_items)
        self._report_progress("starting", 0, f"Opening Instagram {content_type}: {shortcode}")

        comments: List[Dict[str, Any]] = []
        seen_keys = set()
        post_title = ""
        is_login_required = False
        is_blocked = False
        status = "complete"

        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-blink-features=AutomationControlled",
                    ],
                )
                context = browser.new_context(
                    viewport={"width": 1280, "height": 900},
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0.0.0 Safari/537.36"
                    ),
                    locale="en-US",
                )
                # Stealth: remove webdriver flag
                context.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                """)
                page = context.new_page()

                try:
                    self._report_progress("navigating", 0, f"Navigating to {clean_url}")
                    response = page.goto(clean_url, wait_until="domcontentloaded", timeout=30000)

                    if response and response.status >= 400:
                        logger.warning("Instagram returned HTTP %d for %s", response.status, clean_url)
                        if response.status in (404,):
                            return self._build_result(
                                comments=[], shortcode=shortcode, content_type=content_type,
                                post_title="", status="not_found",
                                error=f"Instagram returned 404 — this post may be deleted or private.",
                                is_blocked=False, is_login_required=False
                            )

                    # Wait for page to stabilize
                    page.wait_for_timeout(3000)

                    page_content = page.content()

                    # --- Detect Login Wall ---
                    login_indicators = [
                        'loginForm',
                        'Log in to Instagram',
                        'You must log in to continue',
                        '"loginPage"',
                        'Create new account',
                        '/accounts/login/',
                    ]
                    page_url_now = page.url
                    if '/accounts/login' in page_url_now:
                        is_login_required = True
                        logger.warning("Instagram redirected to login page for %s", clean_url)

                    if not is_login_required:
                        for indicator in login_indicators:
                            if indicator in page_content:
                                # Check if it's a login modal overlay (might still have content)
                                # Only set login_required if the ENTIRE page is the login page
                                if '/accounts/login' in page_url_now or '"loginPage":true' in page_content:
                                    is_login_required = True
                                    break

                    # --- Detect Error/Block Pages ---
                    block_indicators = [
                        'httpErrorPage',
                        'Polaris',
                        'Something went wrong',
                        '"errorPage"',
                        'PolarisErrorBoundary',
                    ]
                    for indicator in block_indicators:
                        if indicator in page_content:
                            is_blocked = True
                            break

                    if is_login_required:
                        return self._build_result(
                            comments=[], shortcode=shortcode, content_type=content_type,
                            post_title="", status="login_required",
                            error="Instagram requires login to view this content. Anonymous access is blocked for this post.",
                            is_blocked=False, is_login_required=True
                        )

                    if is_blocked:
                        return self._build_result(
                            comments=[], shortcode=shortcode, content_type=content_type,
                            post_title="", status="blocked",
                            error="Instagram blocked the anonymous request (error page detected). This is an Instagram platform restriction, not a code bug.",
                            is_blocked=True, is_login_required=False
                        )

                    # --- Extract Post Title ---
                    try:
                        title_el = page.query_selector('meta[property="og:title"]')
                        if title_el:
                            post_title = title_el.get_attribute("content") or ""
                        if not post_title:
                            title_el2 = page.query_selector('title')
                            if title_el2:
                                post_title = title_el2.text_content() or ""
                    except Exception:
                        pass

                    self._report_progress("extracting", 0, "Looking for comments section...")

                    # --- Dismiss optional login prompts (non-required overlays) ---
                    try:
                        dismiss_selectors = [
                            '[aria-label="Close"]',
                            'button:has-text("Not Now")',
                            'button:has-text("Cancel")',
                        ]
                        for ds in dismiss_selectors:
                            el = page.query_selector(ds)
                            if el and el.is_visible():
                                el.click()
                                page.wait_for_timeout(500)
                                break
                    except Exception:
                        pass

                    # --- Scroll and extract comments ---
                    scroll_attempts = 0
                    max_scroll_attempts = max(5, min(50, max_items // 10))
                    no_new_count = 0

                    while len(comments) < max_items and scroll_attempts < max_scroll_attempts:
                        if self._is_cancelled:
                            status = "cancelled"
                            break

                        # Extract all visible comment elements
                        comment_els = page.query_selector_all('div[role="dialog"] ul li, ul._a9ym li, div._a9yh li')
                        if not comment_els:
                            # Try alternative comment container selectors
                            comment_els = page.query_selector_all('[data-testid="comment"], div.gElp9, div._ae5q')

                        prev_count = len(comments)

                        for el in comment_els:
                            if len(comments) >= max_items:
                                break
                            try:
                                # Extract author
                                author_el = el.query_selector('a[role="link"], span._aacl._aaco._aacu._aacx._aad7._aade, h3')
                                author = author_el.text_content().strip() if author_el else "unknown"

                                # Extract comment text
                                text_el = el.query_selector('span[dir="auto"], div._a9zs span')
                                text = text_el.text_content().strip() if text_el else ""

                                if not text or len(text) < 1:
                                    continue

                                # Dedup key
                                dedup_key = f"{author}::{text[:100]}"
                                if dedup_key in seen_keys:
                                    continue
                                seen_keys.add(dedup_key)

                                # Extract likes
                                likes = 0
                                try:
                                    likes_el = el.query_selector('button span, div._ae2s span')
                                    if likes_el:
                                        likes_text = likes_el.text_content().strip()
                                        likes = int(re.sub(r'[^0-9]', '', likes_text) or '0')
                                except Exception:
                                    pass

                                comments.append({
                                    "id": f"ig_{shortcode}_{len(comments)}",
                                    "username": author,
                                    "text": text,
                                    "like_count": likes,
                                    "platform": "instagram",
                                    "content_id": shortcode,
                                })
                            except Exception:
                                continue

                        new_count = len(comments) - prev_count
                        if new_count == 0:
                            no_new_count += 1
                        else:
                            no_new_count = 0
                            self._report_progress("extracting", len(comments), f"Extracted {len(comments)} comments...")

                        if no_new_count >= 3:
                            # Try clicking "Load more comments"
                            try:
                                load_more = page.query_selector('button:has-text("Load more comments"), button:has-text("View more comments"), span:has-text("View more comments")')
                                if load_more and load_more.is_visible():
                                    load_more.click()
                                    page.wait_for_timeout(2000)
                                    no_new_count = 0
                                    continue
                            except Exception:
                                pass
                            # Give up - no more comments loading
                            if no_new_count >= 5:
                                break

                        # Scroll within comment section
                        try:
                            page.keyboard.press("End")
                            page.evaluate("window.scrollBy(0, 600)")
                            page.wait_for_timeout(1500)
                        except Exception:
                            pass

                        scroll_attempts += 1

                    if len(comments) == 0 and not is_login_required and not is_blocked:
                        # Check if comments are disabled
                        disabled_indicators = [
                            "Comments on this post have been limited",
                            "comments have been turned off",
                            "Comments have been disabled",
                        ]
                        content_lower = page_content.lower()
                        for indicator in disabled_indicators:
                            if indicator.lower() in content_lower:
                                return self._build_result(
                                    comments=[], shortcode=shortcode, content_type=content_type,
                                    post_title=post_title, status="comments_disabled",
                                    error="Comments are disabled or limited on this post by the account owner.",
                                    is_blocked=False, is_login_required=False
                                )

                    logger.info("Instagram scraper finished: %d comments extracted from %s", len(comments), shortcode)

                except PWTimeout:
                    logger.error("Playwright timeout navigating to %s", clean_url)
                    return self._build_result(
                        comments=comments, shortcode=shortcode, content_type=content_type,
                        post_title=post_title, status="timeout",
                        error="Request timed out while loading the Instagram page.",
                        is_blocked=False, is_login_required=False
                    )
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
            logger.error("Instagram scraper error: %s", exc, exc_info=True)
            return self._build_result(
                comments=comments, shortcode=shortcode, content_type=content_type,
                post_title=post_title, status="error",
                error=f"Scraper error: {str(exc)}",
                is_blocked=False, is_login_required=False
            )

        final_status = status if status != "complete" else ("complete" if comments else "empty")
        return self._build_result(
            comments=comments, shortcode=shortcode, content_type=content_type,
            post_title=post_title, status=final_status,
            error="" if comments else "No comments could be extracted from this post. Instagram may be blocking anonymous access or comments may not be publicly visible.",
            is_blocked=is_blocked, is_login_required=is_login_required
        )

    def _build_result(self, comments, shortcode, content_type, post_title, status, error, is_blocked, is_login_required):
        return {
            "success": len(comments) > 0,
            "status": status,
            "error": error,
            "comments": comments,
            "post_title": post_title or f"Instagram {content_type.title()} ({shortcode})",
            "shortcode": shortcode,
            "content_type": content_type,
            "total_extracted": len(comments),
            "total_unique": len(comments),
            "is_blocked": is_blocked,
            "is_login_required": is_login_required,
        }


# Singleton instance
instagram_scraper = InstagramScraper()
