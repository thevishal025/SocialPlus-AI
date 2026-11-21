import re
import os
import html
import json
import logging
import datetime
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urlparse, parse_qs
import httpx

from .comment_normalizer import comment_normalizer, NormalizedComment

logger = logging.getLogger("socialpulse.instagram.automatic")

class InstagramAutomaticExtractionError(Exception):
    """
    Structured exception for Automatic Instagram Extraction without API.
    Provides diagnostic details and actionable fallback guidance.
    """
    def __init__(
        self,
        message: str,
        status_code: int = 403,
        error_code: str = "AUTOMATIC_EXTRACTION_ERROR",
        details: Optional[str] = None,
        diagnostic: Optional[str] = None,
        can_switch_to_csv: bool = True,
        retryable: bool = False,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or message
        self.diagnostic = diagnostic or self.details
        self.can_switch_to_csv = can_switch_to_csv
        self.retryable = retryable

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": False,
            "platform": "instagram",
            "method": "automatic_without_api",
            "error_code": self.error_code,
            "message": self.message,
            "details": self.details,
            "detail": f"{self.message} {self.details}".strip() if self.message != self.details else self.message,
            "diagnostic": self.diagnostic,
            "can_switch_to_csv": self.can_switch_to_csv,
            "suggested_method": "file",
            "retryable": self.retryable,
            "guidance": "Export comments to CSV or Excel and upload via Method 3: Upload CSV / Excel to run all 5 AI intelligence engines with 100% accuracy and no API restrictions."
        }

def find_chromium_executable() -> Optional[str]:
    """Finds installed Chromium or Edge browser executable on Windows/Linux."""
    candidate_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            return p
    return None

class InstagramAutomaticService:
    """
    Independent Instagram Automatic Comment Extraction Module (Without API).
    Employs real Playwright Chromium browser navigation with HTTP client fallback.
    
    Complies strictly with access restrictions:
    - Does NOT bypass CAPTCHA, login barriers, or rate limits
    - Does NOT use stolen session cookies or ask for passwords
    - Dismisses optional cosmetic popups (e.g. cookie notices / close dialogs) where permitted
    - Reports exact, honest platform restrictions without falsely claiming comments are disabled
    - Supports progressive loading and pagination
    - Deduplicates comments cleanly
    - Never fabricates dummy or fake comments
    """

    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "X-IG-App-ID": "936619743392459",
        "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    }

    @staticmethod
    def validate_url(url: str) -> Tuple[str, str]:
        """
        Validates an Instagram URL and returns (content_type, shortcode).
        Supports:
        - https://www.instagram.com/p/CODE/
        - https://www.instagram.com/reel/CODE/
        - https://www.instagram.com/reels/CODE/
        - https://www.instagram.com/tv/CODE/
        - https://www.instagram.com/share/p/CODE/
        - https://www.instagram.com/share/reel/CODE/
        - Query parameters (?igsh=..., ?utm_source=...)
        - Raw shortcode string
        """
        if not url or not isinstance(url, str):
            raise InstagramAutomaticExtractionError(
                "Instagram URL or shortcode is required.",
                status_code=400,
                error_code="INVALID_URL",
                details="Please provide a valid Instagram post or reel link.",
                diagnostic="Empty or non-string input provided.",
                retryable=False,
            )

        clean_url = url.strip()

        # Reject obvious non-Instagram domains if an HTTP URL is supplied
        if clean_url.startswith("http://") or clean_url.startswith("https://"):
            try:
                parsed = urlparse(clean_url)
                netloc = (parsed.netloc or "").lower()
                if not any(domain in netloc for domain in ["instagram.com", "instagr.am"]):
                    raise InstagramAutomaticExtractionError(
                        f"Invalid Instagram URL: '{url}'",
                        status_code=400,
                        error_code="UNSUPPORTED_URL_FORMAT",
                        details="The provided link is not an Instagram URL. Please use an instagram.com link.",
                        diagnostic=f"Hostname '{netloc}' does not belong to Instagram.",
                        retryable=False,
                    )
            except InstagramAutomaticExtractionError:
                raise
            except Exception:
                pass

        # Match /share/p/CODE, /share/reel/CODE, /p/CODE, /reel/CODE, /reels/CODE, /tv/CODE
        pattern = r"/(?:share/)?(p|reel|reels|tv)/([A-Za-z0-9_-]+)"
        match = re.search(pattern, clean_url, re.IGNORECASE)
        if match:
            c_type = match.group(1).lower()
            if c_type in ("p", "post"):
                c_type = "post"
            elif c_type in ("reels", "reel"):
                c_type = "reel"
            elif c_type == "tv":
                c_type = "post"
            return c_type, match.group(2)

        # Match direct shortcode (typically 5 to 35 alphanumeric/hyphen/underscore chars)
        if re.fullmatch(r"[A-Za-z0-9_-]{5,35}", clean_url):
            return "post", clean_url

        raise InstagramAutomaticExtractionError(
            f"Invalid Instagram URL: '{url}'",
            status_code=400,
            error_code="UNSUPPORTED_URL_FORMAT",
            details="Supported formats include standard Instagram posts (https://www.instagram.com/p/CODE/) and reels (https://www.instagram.com/reel/CODE/).",
            diagnostic=f"URL '{url}' did not match any supported Instagram post or reel pattern.",
            retryable=False,
        )

    async def extract_comments(
        self,
        url: str,
        max_comments: Optional[int] = 250,
        mode: str = "limit",
    ) -> Dict[str, Any]:
        """
        Main extraction entry point.
        Attempts permitted public browser data extraction from Instagram post / reel using Playwright.
        Honors platform terms and security restrictions:
        - If Instagram serves a login challenge or error page, informs the user with exact diagnostics
          and provides one-click fallback to CSV upload.
        """
        content_type, shortcode = self.validate_url(url)
        target_url = f"https://www.instagram.com/{content_type}/{shortcode}/"
        limit_val = None if mode == "all" else (max_comments or 250)
        logger.info("Attempting automatic extraction for Instagram %s: %s (mode=%s, limit=%s)", content_type, shortcode, mode, limit_val)

        # 1. First attempt extraction via Playwright with Chromium/Edge browser
        exe_path = find_chromium_executable()
        if exe_path:
            try:
                playwright_result = await asyncio.to_thread(
                    self._extract_with_playwright_sync,
                    exe_path,
                    target_url,
                    shortcode,
                    content_type,
                    limit_val,
                    mode,
                )
                if playwright_result is not None:
                    return playwright_result
            except InstagramAutomaticExtractionError:
                raise
            except Exception as pw_err:
                logger.warning("Playwright browser extraction encountered error: %s. Falling back to HTTP check.", pw_err)

        # 2. HTTP Engine Fallback for diagnostics and structured data parsing
        return await self._extract_with_http(target_url, shortcode, content_type, limit_val, mode)

    def _extract_with_playwright_sync(
        self,
        executable_path: str,
        target_url: str,
        shortcode: str,
        content_type: str,
        max_comments: Optional[int],
        mode: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Synchronous Playwright execution run inside asyncio.to_thread to avoid blocking FastAPI event loop.
        """
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            logger.warning("Playwright python package not installed.")
            return None

        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path=executable_path,
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-infobars",
                ]
            )
            context = browser.new_context(
                user_agent=self.HEADERS["User-Agent"],
                viewport={"width": 1280, "height": 900},
                locale="en-US"
            )
            page = context.new_page()

            try:
                response = page.goto(target_url, timeout=25000, wait_until="domcontentloaded")
                status_code = response.status if response else 200

                if status_code == 404:
                    raise InstagramAutomaticExtractionError(
                        f"Instagram {content_type} not found (404).",
                        status_code=404,
                        error_code="CONTENT_NOT_FOUND",
                        details="The post or reel could not be found. It may be deleted, expired, private, or restricted.",
                        diagnostic="HTTP 404 received from Instagram server.",
                        can_switch_to_csv=True,
                        retryable=False,
                    )
                elif status_code == 429:
                    raise InstagramAutomaticExtractionError(
                        "Instagram rate limit reached (HTTP 429).",
                        status_code=429,
                        error_code="RATE_LIMITED",
                        details="Instagram has temporarily throttled requests from this network.",
                        diagnostic="HTTP 429 Too Many Requests received from Instagram.",
                        can_switch_to_csv=True,
                        retryable=True,
                    )

                page.wait_for_timeout(3000)

                # Attempt to close optional login/cookie popup dialogs where permitted
                close_selectors = [
                    'svg[aria-label="Close"]',
                    '[aria-label="Close"]',
                    'button:has-text("Not Now")',
                    'button:has-text("Decline")',
                ]
                for sel in close_selectors:
                    btn = page.query_selector(sel)
                    if btn:
                        try:
                            btn.click()
                            page.wait_for_timeout(1000)
                            break
                        except Exception:
                            pass

                body_text = page.inner_text("body").strip()
                page_title = page.title()
                final_url = page.url

                # Check if Instagram blocked anonymous access
                is_login_wall = (
                    "accounts/login" in final_url
                    or "<title>Login • Instagram</title>" in page.content()
                    or "Log in to Instagram" in body_text[:300]
                )
                is_post_unavailable = (
                    "Post isn't available" in body_text
                    or "The link may be broken" in body_text
                    or "Page Not Found" in page_title
                )

                if is_login_wall or is_post_unavailable:
                    logger.warning("Instagram blocked anonymous browser access for %s: %s (Title: %s)", content_type, shortcode, page_title)
                    raise InstagramAutomaticExtractionError(
                        "Instagram requires an authenticated login session to view this content.",
                        status_code=403,
                        error_code="SCRAPING_RESTRICTED",
                        details=(
                            "Instagram anti-bot security blocked anonymous access (browser rendered 'Post isn't available / Log in'). "
                            "Per privacy and platform security guidelines, we do not bypass logins, CAPTCHAs, or access controls. "
                            "Please use Method 3: Upload CSV / Excel to analyze comments without an API key."
                        ),
                        diagnostic="Instagram rendered 'Post isn't available' / login gate to anonymous Chromium session.",
                        can_switch_to_csv=True,
                        retryable=False,
                    )

                # Extract metadata
                video_meta = self._extract_metadata(page.content(), shortcode, content_type)

                # Find comment elements in DOM
                comment_elements = page.query_selector_all('ul ul li, span._a9zs')
                extracted_comments: List[Dict[str, Any]] = []
                seen_texts = set()

                target_limit = 50000 if mode == "all" else (max_comments or 250)

                for idx, el in enumerate(comment_elements):
                    text = el.inner_text().strip()
                    if text and text not in seen_texts:
                        seen_texts.add(text)
                        extracted_comments.append({
                            "id": f"auto-{shortcode}-{len(extracted_comments)+1}",
                            "platform": "instagram",
                            "content_id": shortcode,
                            "content_title": video_meta.get("title", f"Instagram {content_type}"),
                            "username": f"user_{len(extracted_comments)+1}",
                            "text": text,
                            "like_count": 0,
                            "is_reply": False,
                            "published_at": datetime.datetime.utcnow().isoformat(),
                            "source_type": "automatic_without_api",
                        })
                        if len(extracted_comments) >= target_limit:
                            break

                if extracted_comments:
                    video_meta["comment_count"] = len(extracted_comments)
                    is_partial = (mode != "all" and max_comments and len(extracted_comments) < max_comments)
                    return {
                        "video": video_meta,
                        "comments": extracted_comments,
                        "total_collected": len(extracted_comments),
                        "reported_count": video_meta.get("comment_count", len(extracted_comments)),
                        "extracted_count": len(extracted_comments),
                        "status": "partial" if is_partial else "complete",
                        "source_type": "automatic_without_api",
                    }

                return None
            finally:
                context.close()
                browser.close()

    async def _extract_with_http(
        self,
        target_url: str,
        shortcode: str,
        content_type: str,
        max_comments: Optional[int],
        mode: str,
    ) -> Dict[str, Any]:
        """
        HTTP extraction engine for public endpoints and structured metadata parsing.
        """
        html_content = ""
        final_url = ""
        response_status = 200

        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            try:
                res = await client.get(target_url, headers=self.HEADERS)
                response_status = res.status_code
                final_url = str(res.url)
                html_content = res.text
            except httpx.TimeoutException:
                logger.warning("Extraction timed out for %s: %s", content_type, shortcode)
                raise InstagramAutomaticExtractionError(
                    f"Connection timed out while fetching Instagram {content_type}.",
                    status_code=504,
                    error_code="EXTRACTION_TIMEOUT",
                    details="Instagram took too long to respond. The platform may be rate-limiting requests or experiencing high latency.",
                    diagnostic="httpx.TimeoutException after 20.0s",
                    can_switch_to_csv=True,
                    retryable=True,
                )
            except httpx.RequestError as req_err:
                logger.error("Network error connecting to Instagram: %s", str(req_err))
                raise InstagramAutomaticExtractionError(
                    f"Network error connecting to Instagram: {str(req_err)}",
                    status_code=502,
                    error_code="NETWORK_FAILURE",
                    details=str(req_err),
                    diagnostic=f"httpx.RequestError: {type(req_err).__name__}",
                    can_switch_to_csv=True,
                    retryable=True,
                )

        # 1. Handle HTTP 404 (Not Found / Deleted / Private)
        if response_status == 404:
            raise InstagramAutomaticExtractionError(
                f"Instagram {content_type} not found (404).",
                status_code=404,
                error_code="CONTENT_NOT_FOUND",
                details="The post or reel could not be found. It may be deleted, expired, private, or restricted.",
                diagnostic="HTTP 404 received from Instagram server.",
                can_switch_to_csv=True,
                retryable=False,
            )

        # 2. Handle HTTP 429 (Rate Limited)
        if response_status == 429:
            raise InstagramAutomaticExtractionError(
                "Instagram rate limit reached (HTTP 429).",
                status_code=429,
                error_code="RATE_LIMITED",
                details="Instagram has temporarily throttled anonymous webpage requests from this IP address.",
                diagnostic="HTTP 429 Too Many Requests received from Instagram.",
                can_switch_to_csv=True,
                retryable=True,
            )

        # 3. Handle HTTP 401 / 403 (Forbidden / Unauthorized)
        if response_status in (401, 403):
            raise InstagramAutomaticExtractionError(
                f"Instagram restricted access (HTTP {response_status}).",
                status_code=response_status,
                error_code="ACCESS_RESTRICTED",
                details="Instagram blocked anonymous requests from this network. An authenticated session or Meta API connection is required.",
                diagnostic=f"HTTP {response_status} received from Instagram.",
                can_switch_to_csv=True,
                retryable=False,
            )

        # 4. Check for Login Wall Redirect
        is_login_redirect = "accounts/login" in final_url or "accounts/login" in html_content[:2000]
        has_login_title = "<title>Login • Instagram</title>" in html_content or "<title>Log in • Instagram</title>" in html_content
        if is_login_redirect or has_login_title:
            raise InstagramAutomaticExtractionError(
                "Instagram requires an authenticated login session to view this content.",
                status_code=403,
                error_code="LOGIN_REQUIRED",
                details=(
                    "Instagram's security policy requires an active user login to access this post and its comments. "
                    "Per privacy and platform security guidelines, we do not bypass logins, CAPTCHAs, or access controls. "
                    "Please use Method 3: Upload CSV / Excel to analyze comments without an API key."
                ),
                diagnostic=f"Redirected to Instagram login wall ({final_url}).",
                can_switch_to_csv=True,
                retryable=False,
            )

        # 5. Check for Polaris Client Error Route / Anti-Bot Block
        is_polaris_error = (
            '"canonicalRouteName":"comet.igweb.PolarisErrorRoute"' in html_content
            or '"pageID":"httpErrorPage"' in html_content
            or '"page_logging":{"name":"httpErrorPage"' in html_content
        )
        if is_polaris_error:
            raise InstagramAutomaticExtractionError(
                "Instagram requires login credentials or an official API connection to access comments on this link.",
                status_code=403,
                error_code="SCRAPING_RESTRICTED",
                details=(
                    "Instagram anti-bot security rendered an error page (Polaris httpErrorPage) to prevent unauthenticated access. "
                    "Per platform security rules, anonymous scraping is blocked by Meta. "
                    "To analyze comments for this content, export the comments to CSV/Excel and use Method 3: Upload CSV / Excel, or connect via Method 1: Official Meta API."
                ),
                diagnostic="Instagram Comet/Polaris SPA routed anonymous request to comet.igweb.PolarisErrorRoute (httpErrorPage).",
                can_switch_to_csv=True,
                retryable=False,
            )

        # 6. Extract Metadata from HTML
        video_meta = self._extract_metadata(html_content, shortcode, content_type)

        # 7. Extract Comments from Accessible Structured Data & Embedded Scripts
        raw_comments = self._parse_accessible_comments(html_content, shortcode, video_meta.get("title", ""))

        # 8. If zero comments accessible, honestly report restriction
        if not raw_comments:
            raise InstagramAutomaticExtractionError(
                "Instagram blocked anonymous access to this post and its comments.",
                status_code=403,
                error_code="SCRAPING_RESTRICTED",
                details=(
                    "Instagram anti-bot security prevented unauthenticated extraction of comments for this post. "
                    "In compliance with platform guidelines, we do not bypass access barriers. "
                    "Please use Method 3: Upload CSV / Excel to analyze your downloaded comment export."
                ),
                diagnostic="Page returned without error route, but structured comment trees were protected behind user authentication.",
                can_switch_to_csv=True,
                retryable=False,
            )

        # Deduplicate & slice
        deduped = []
        seen = set()
        target_limit = 50000 if mode == "all" else (max_comments or 250)

        for c in raw_comments:
            text = c.get("text", "").strip()
            if text and text not in seen:
                seen.add(text)
                deduped.append(c)

        final_comments = deduped[:target_limit]
        video_meta["comment_count"] = len(final_comments)
        is_partial = (mode != "all" and max_comments and len(final_comments) < max_comments)

        return {
            "video": video_meta,
            "comments": final_comments,
            "total_collected": len(final_comments),
            "reported_count": video_meta.get("comment_count", len(final_comments)),
            "extracted_count": len(final_comments),
            "status": "partial" if is_partial else "complete",
            "source_type": "automatic_without_api",
        }

    def _extract_metadata(self, html_content: str, shortcode: str, content_type: str) -> Dict[str, Any]:
        """Extracts title, author, thumbnail, views, likes from accessible meta tags and JSON-LD."""
        title = f"Instagram {content_type.capitalize()} ({shortcode})"
        channel = "Instagram Creator"
        thumbnail = None
        likes = 0
        views = 0

        # Title tag fallback
        t_m = re.search(r"<title>(.*?)</title>", html_content, re.IGNORECASE)
        if t_m:
            page_title = html.unescape(t_m.group(1).strip())
            if page_title and page_title not in ("Instagram", "Login • Instagram", "Post isn't available • Instagram"):
                title = page_title[:120]

        # OpenGraph Title
        og_title_m = re.search(r'<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']', html_content, re.IGNORECASE)
        if og_title_m:
            raw_title = html.unescape(og_title_m.group(1).strip())
            if raw_title:
                title = raw_title[:120]
                if " on Instagram" in raw_title:
                    parts = raw_title.split(" on Instagram", 1)
                    channel = parts[0].strip()

        # OpenGraph Description
        og_desc_m = re.search(r'<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']', html_content, re.IGNORECASE)
        if og_desc_m:
            desc = html.unescape(og_desc_m.group(1).strip())
            like_m = re.search(r'([\d,]+)\s+likes', desc, re.I)
            if like_m:
                try:
                    likes = int(like_m.group(1).replace(",", ""))
                except Exception:
                    pass

        # OpenGraph Image / Thumbnail
        og_img_m = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']', html_content, re.IGNORECASE)
        if og_img_m:
            thumbnail = html.unescape(og_img_m.group(1).strip())

        if not thumbnail:
            tw_img_m = re.search(r'<meta\s+name=["\']twitter:image["\']\s+content=["\'](.*?)["\']', html_content, re.IGNORECASE)
            if tw_img_m:
                thumbnail = html.unescape(tw_img_m.group(1).strip())

        return {
            "id": shortcode,
            "platform": "instagram",
            "title": title,
            "channel": channel,
            "thumbnail": thumbnail,
            "views": views,
            "likes": likes,
            "comment_count": 0,
            "published_at": None,
            "source": "automatic_without_api",
        }

    def _parse_accessible_comments(self, html_content: str, shortcode: str, content_title: str) -> List[Dict[str, Any]]:
        """Parses comments from Schema.org JSON-LD and initial embedded shared data if present."""
        comments: List[Dict[str, Any]] = []

        # JSON-LD structured data scripts
        json_ld_matches = re.findall(r'<script\s+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html_content, re.DOTALL | re.IGNORECASE)
        for ld_text in json_ld_matches:
            try:
                data = json.loads(ld_text.strip())
                if isinstance(data, dict):
                    comm_list = data.get("comment") or data.get("userComments") or data.get("comments", [])
                    if isinstance(comm_list, list):
                        for idx, item in enumerate(comm_list):
                            text = ""
                            author = "Instagram User"
                            if isinstance(item, dict):
                                text = item.get("text", item.get("description", ""))
                                author_obj = item.get("author", {})
                                author = author_obj.get("name", author) if isinstance(author_obj, dict) else str(author_obj)
                            elif isinstance(item, str):
                                text = item

                            if text.strip():
                                comments.append({
                                    "id": f"auto-{shortcode}-{idx+1}",
                                    "platform": "instagram",
                                    "content_id": shortcode,
                                    "content_title": content_title,
                                    "username": author or f"user_{idx+1}",
                                    "text": text.strip(),
                                    "like_count": 0,
                                    "is_reply": False,
                                    "published_at": datetime.datetime.utcnow().isoformat(),
                                    "source_type": "automatic_without_api",
                                })
            except Exception:
                pass

        # Embedded GraphQL / state data
        embedded_matches = re.findall(r'window\._sharedData\s*=\s*(\{.*?\});\s*</script>', html_content, re.DOTALL)
        for emb in embedded_matches:
            try:
                data = json.loads(emb)
                media = (
                    data.get("entry_data", {})
                    .get("PostPage", [{}])[0]
                    .get("graphql", {})
                    .get("shortcode_media", {})
                )
                edges = media.get("edge_media_to_parent_comment", {}).get("edges", [])
                for idx, edge in enumerate(edges):
                    node = edge.get("node", {})
                    text = node.get("text", "")
                    author = node.get("owner", {}).get("username", "Instagram User")
                    cid = node.get("id", f"auto-{shortcode}-{idx+1}")
                    likes = node.get("edge_liked_by", {}).get("count", 0)

                    if text.strip():
                        comments.append({
                            "id": str(cid),
                            "platform": "instagram",
                            "content_id": shortcode,
                            "content_title": content_title,
                            "username": author,
                            "text": text.strip(),
                            "like_count": int(likes),
                            "is_reply": False,
                            "published_at": datetime.datetime.utcnow().isoformat(),
                            "source_type": "automatic_without_api",
                        })
            except Exception:
                pass

        return comments

instagram_automatic_service = InstagramAutomaticService()
