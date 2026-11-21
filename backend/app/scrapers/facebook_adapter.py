"""
Facebook Adapter for SocialPlus.ai Universal Scraper AI Engine.
Supports both public webpage scraping (Without API) and Facebook Graph API integration.
Part of the unified Meta category.
"""
import re
import os
import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple, Callable
from urllib.parse import urlparse, parse_qs
import httpx

from ..services.data_normalizer import data_normalizer

logger = logging.getLogger("socialpulse.adapter.facebook")

class FacebookAdapter:
    """
    Adapter bridging the Universal Scraper Orchestrator to Facebook public posts and pages.
    """

    def __init__(self):
        self.access_token = os.getenv("FACEBOOK_ACCESS_TOKEN", "").strip()
        self.api_version = os.getenv("FACEBOOK_GRAPH_API_VERSION", "v19.0")
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        }

    def validate_url(self, url: str) -> Tuple[bool, str, Dict[str, Any]]:
        """Validates Facebook post or reel URL and extracts post ID."""
        cleaned = (url or "").strip()
        if not any(d in cleaned.lower() for d in ["facebook.com", "fb.com", "fb.watch", "m.facebook.com"]):
            return False, "Invalid Facebook URL. Provide a link from facebook.com or fb.watch.", {}

        # Patterns for Facebook posts:
        # 1. facebook.com/username/posts/123456789
        # 2. facebook.com/permalink.php?story_fbid=123456789&id=987654321
        # 3. facebook.com/groups/group_id/posts/123456789
        # 4. facebook.com/watch/?v=123456789 or fb.watch/abc/
        post_id = None
        m1 = re.search(r"/(?:posts|videos|reel)/([0-9A-Za-z_-]+)", cleaned)
        if m1:
            post_id = m1.group(1)
        else:
            m2 = re.search(r"story_fbid=([0-9]+)", cleaned)
            if m2:
                post_id = m2.group(1)
            else:
                m3 = re.search(r"[?&]v=([0-9]+)", cleaned)
                if m3:
                    post_id = m3.group(1)
                else:
                    # Fallback to last path segment if digits
                    path_parts = [p for p in urlparse(cleaned).path.split("/") if p]
                    if path_parts and re.fullmatch(r"[0-9A-Za-z_-]+", path_parts[-1]):
                        post_id = path_parts[-1]

        if not post_id:
            post_id = "fb_post"

        return True, "", {"post_id": post_id, "clean_url": cleaned}

    async def extract_without_api(
        self,
        url: str,
        max_comments: int = 200,
        mode: str = "limit",
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """
        Public extraction from Facebook webpage without API key.
        Extracts public comments, reactions, and post metadata where accessible.
        Detects login barriers accurately.
        """
        is_valid, err, meta = self.validate_url(url)
        if not is_valid:
            raise ValueError(err)

        post_id = meta["post_id"]
        clean_url = meta["clean_url"]
        target_limit = 50000 if mode == "all" else max_comments

        if progress_callback:
            progress_callback({"stage": "Connecting to Facebook public post...", "percent": 25})

        extracted_comments: List[Dict[str, Any]] = []
        post_title = f"Facebook Post ({post_id})"
        author_name = "Facebook Page / Author"

        # Try HTTP request with mobile/desktop user agents
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers=self.headers) as client:
            try:
                res = await client.get(clean_url)
                html = res.text
                final_url = str(res.url)

                # Check if redirected to login wall
                if "login" in final_url or "Log in to Facebook" in html or "You must log in to continue" in html:
                    logger.warning("Facebook login wall encountered for %s", clean_url)
                    return {
                        "success": False,
                        "platform": "facebook",
                        "method": "without_api",
                        "error": "Facebook requires an active user login to access this post or comment thread.",
                        "error_code": "LOGIN_REQUIRED",
                        "can_switch_to_csv": True,
                        "details": "This Facebook post is restricted to logged-in users. You can export comments and upload them directly via Method 3: Upload CSV / Excel.",
                        "comments": [],
                        "status": "blocked",
                    }

                # Extract OpenGraph / Schema metadata
                title_match = re.search(r'<meta property="og:title" content="([^"]+)"', html)
                if title_match:
                    post_title = title_match.group(1)

                desc_match = re.search(r'<meta property="og:description" content="([^"]+)"', html)
                desc = desc_match.group(1) if desc_match else ""

                # Extract comments from JSON-LD or embedded HTML spans
                # Look for comment text patterns
                comment_matches = re.findall(r'<div[^>]*dir="auto"[^>]*>([^<]{5,500})</div>', html)
                if not comment_matches:
                    comment_matches = re.findall(r'"text":\s*"([^"]{5,400})"', html)

                for idx, c_text in enumerate(comment_matches[:target_limit]):
                    cleaned_text = re.sub(r"\\u[0-9a-fA-F]{4}", " ", c_text).strip()
                    if len(cleaned_text) < 3 or "facebook" in cleaned_text.lower():
                        continue
                    extracted_comments.append({
                        "id": f"fb_{post_id}_{idx}",
                        "username": f"User_{idx+1}",
                        "text": cleaned_text,
                        "likes": 0,
                    })

            except httpx.TimeoutException:
                return {
                    "success": False,
                    "platform": "facebook",
                    "method": "without_api",
                    "error": "Connection timed out while connecting to Facebook.",
                    "can_switch_to_csv": True,
                    "comments": [],
                    "status": "failed",
                }
            except Exception as e:
                logger.error("Error in Facebook public extraction: %s", str(e))
                return {
                    "success": False,
                    "platform": "facebook",
                    "method": "without_api",
                    "error": str(e),
                    "can_switch_to_csv": True,
                    "comments": [],
                    "status": "failed",
                }

        normalized = [
            data_normalizer.normalize_comment(
                raw=c,
                platform="facebook",
                content_id=post_id,
                content_title=post_title,
            )
            for c in extracted_comments
        ]
        unique_comments, dup_count = data_normalizer.deduplicate(normalized)

        return {
            "success": True,
            "platform": "facebook",
            "method": "without_api",
            "video": {
                "id": post_id,
                "title": post_title,
                "channel": author_name,
                "platform": "facebook",
                "comment_count": len(unique_comments),
                "url": clean_url,
            },
            "comments": unique_comments,
            "total_extracted": len(extracted_comments),
            "duplicate_count": dup_count,
            "status": "complete" if len(unique_comments) >= target_limit or mode == "all" else "partial",
        }

    async def extract_with_api(
        self,
        url: str,
        max_comments: int = 200,
        mode: str = "limit",
    ) -> Dict[str, Any]:
        """
        Extracts comments via Official Facebook Graph API.
        Requires FACEBOOK_ACCESS_TOKEN.
        """
        if not self.access_token:
            return {
                "success": False,
                "platform": "facebook",
                "method": "official_api",
                "error": "Facebook Graph API Access Token is not configured.",
                "error_code": "FACEBOOK_API_NOT_CONFIGURED",
                "can_switch_to_csv": True,
                "details": "To use Facebook Graph API, add FACEBOOK_ACCESS_TOKEN to backend/.env. Alternatively, use Without API mode or Upload Data.",
                "comments": [],
                "status": "blocked",
            }

        is_valid, err, meta = self.validate_url(url)
        if not is_valid:
            raise ValueError(err)

        post_id = meta["post_id"]
        api_url = f"https://graph.facebook.com/{self.api_version}/{post_id}/comments"
        params = {
            "access_token": self.access_token,
            "fields": "id,message,from,created_time,like_count,comment_count",
            "limit": min(100, max_comments),
        }

        extracted_comments = []
        async with httpx.AsyncClient(timeout=25.0) as client:
            try:
                res = await client.get(api_url, params=params)
                if res.status_code != 200:
                    err_json = res.json()
                    err_msg = err_json.get("error", {}).get("message", f"Facebook Graph API returned HTTP {res.status_code}")
                    return {
                        "success": False,
                        "platform": "facebook",
                        "method": "official_api",
                        "error": err_msg,
                        "error_code": "GRAPH_API_ERROR",
                        "can_switch_to_csv": True,
                        "comments": [],
                        "status": "failed",
                    }
                data = res.json()
                for item in data.get("data", []):
                    msg = item.get("message", "").strip()
                    if msg:
                        extracted_comments.append({
                            "id": item.get("id"),
                            "username": item.get("from", {}).get("name", "Facebook User"),
                            "text": msg,
                            "likes": item.get("like_count", 0),
                            "timestamp": item.get("created_time"),
                        })
            except Exception as e:
                return {
                    "success": False,
                    "platform": "facebook",
                    "method": "official_api",
                    "error": str(e),
                    "can_switch_to_csv": True,
                    "comments": [],
                    "status": "failed",
                }

        normalized = [
            data_normalizer.normalize_comment(
                raw=c,
                platform="facebook",
                content_id=post_id,
                content_title=f"Facebook Post ({post_id})",
            )
            for c in extracted_comments
        ]
        unique_comments, dup_count = data_normalizer.deduplicate(normalized)

        return {
            "success": True,
            "platform": "facebook",
            "method": "official_api",
            "video": {
                "id": post_id,
                "title": f"Facebook Post ({post_id})",
                "channel": "Facebook Page",
                "platform": "facebook",
                "comment_count": len(unique_comments),
            },
            "comments": unique_comments,
            "total_extracted": len(extracted_comments),
            "duplicate_count": dup_count,
            "status": "complete",
        }

facebook_adapter = FacebookAdapter()

