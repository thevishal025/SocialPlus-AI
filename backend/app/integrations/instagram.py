import re
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse
import httpx
from ..config import settings
from .base import BaseSocialAdapter

class InstagramRapidAPIAdapter(BaseSocialAdapter):
    """
    Modular Adapter for Instagram comment retrieval via RapidAPI providers.
    Uses configurable endpoint, host and headers so providers can be swapped seamlessly.
    """

    def validate_url(self, url: str) -> str:
        if not url or not isinstance(url, str):
            raise ValueError("Instagram URL is required.")

        clean_url = url.strip()

        # Match standard /p/, /reel/, /reels/, /tv/ patterns
        pattern = r"/(?:p|reel|reels|tv)/([A-Za-z0-9_-]+)"
        match = re.search(pattern, clean_url)
        if match:
            return match.group(1)

        # Direct shortcode string
        if re.fullmatch(r"[A-Za-z0-9_-]{5,35}", clean_url):
            return clean_url

        raise ValueError(
            f"Invalid Instagram URL or shortcode: '{url}'. Please provide a valid post or reel URL (e.g., https://www.instagram.com/p/CODE/)"
        )

    def is_configured(self) -> bool:
        return bool(settings.rapidapi_key and settings.rapidapi_host)

    async def fetch_content_and_comments(self, url: str, max_comments: int = 100) -> Dict[str, Any]:
        if not self.is_configured():
            raise RuntimeError(
                "Instagram RapidAPI provider is not configured. Please set RAPIDAPI_KEY, RAPIDAPI_HOST, and INSTAGRAM_COMMENTS_ENDPOINT in backend/.env"
            )

        shortcode = self.validate_url(url)
        host = settings.rapidapi_host.strip()
        endpoint = settings.instagram_comments_endpoint.strip() or f"https://{host}/comments"
        if not endpoint.startswith("http"):
            endpoint = f"https://{host}{endpoint}"

        headers = {
            "x-rapidapi-key": settings.rapidapi_key.strip(),
            "x-rapidapi-host": host,
            "Accept": "application/json",
        }

        # Adaptable query parameters supported across top RapidAPI Instagram comment providers
        params = {
            "shortcode": shortcode,
            "code_or_id_or_url": shortcode,
            "code": shortcode,
            "url": f"https://www.instagram.com/p/{shortcode}/",
        }

        async with httpx.AsyncClient(timeout=35.0) as client:
            try:
                response = await client.get(endpoint, headers=headers, params=params)
            except httpx.RequestError as exc:
                raise RuntimeError(f"Could not connect to Instagram provider at {host}: {str(exc)}")

            if response.status_code in (401, 403):
                raise RuntimeError("RapidAPI Authentication failed. Please verify your RAPIDAPI_KEY subscription.")
            elif response.status_code == 404:
                raise ValueError("Instagram post or reel not found. It may be private or deleted.")
            elif response.status_code == 429:
                raise RuntimeError("RapidAPI rate limit exceeded. Please wait or check your provider quota plan.")
            elif response.status_code != 200:
                raise RuntimeError(f"Instagram provider returned status {response.status_code}: {response.text[:200]}")

            data = response.json()
            if not isinstance(data, dict):
                raise ValueError("Provider returned unexpected non-JSON response structure.")

            normalized = self._normalize_comments(data, shortcode, max_comments)
            return normalized

    def _normalize_comments(self, raw_data: Dict[str, Any], shortcode: str, max_comments: int) -> Dict[str, Any]:
        """
        Normalizes diverse RapidAPI Instagram comment schemas:
        - Schema A: GraphQL edge_media_to_parent_comment
        - Schema B: Direct data.comments array
        - Schema C: Flat data.items or data array
        """
        comments: List[Dict[str, Any]] = []
        seen = set()

        video_meta = {
            "id": shortcode,
            "platform": "instagram",
            "title": f"Instagram Post ({shortcode})",
            "channel": "Instagram User",
            "thumbnail": None,
            "views": 0,
            "likes": 0,
            "comment_count": 0,
            "published_at": None,
        }

        # Attempt to pull metadata if provided
        inner = raw_data.get("data", raw_data)
        if isinstance(inner, dict):
            if "caption" in inner and isinstance(inner["caption"], dict):
                video_meta["title"] = inner["caption"].get("text", video_meta["title"])[:80]
            if "owner" in inner and isinstance(inner["owner"], dict):
                video_meta["channel"] = inner["owner"].get("username", "Instagram User")
            if "display_url" in inner:
                video_meta["thumbnail"] = inner.get("display_url")

        # 1. Search for GraphQL edges
        edges = []
        if isinstance(inner, dict):
            edges = inner.get("edge_media_to_parent_comment", {}).get("edges", [])
            if not edges and "items" in inner and isinstance(inner["items"], list) and inner["items"]:
                first = inner["items"][0]
                if isinstance(first, dict):
                    edges = first.get("edge_media_to_parent_comment", {}).get("edges", [])

        if edges:
            for edge in edges:
                node = edge.get("node", {})
                cid = node.get("id", f"ig-{len(comments)}")
                if cid not in seen:
                    seen.add(cid)
                    owner = node.get("owner", {})
                    text = node.get("text", "")
                    if text.strip():
                        comments.append({
                            "id": cid,
                            "platform": "instagram",
                            "content_id": shortcode,
                            "content_title": video_meta["title"],
                            "username": owner.get("username", "instagram_user"),
                            "text": text.strip(),
                            "like_count": int(node.get("edge_liked_by", {}).get("count", 0)),
                            "published_at": None,
                            "parent_id": None,
                            "is_reply": False,
                        })

        # 2. Search for direct 'comments' list
        if not comments:
            raw_list = []
            if isinstance(inner, dict) and "comments" in inner:
                raw_list = inner["comments"]
            elif "comments" in raw_data:
                raw_list = raw_data["comments"]
            elif "data" in raw_data and isinstance(raw_data["data"], list):
                raw_list = raw_data["data"]

            if isinstance(raw_list, list):
                for item in raw_list:
                    if isinstance(item, dict):
                        cid = str(item.get("id", item.get("pk", f"ig-{len(comments)}")))
                        text = item.get("text", item.get("comment", item.get("comment_text", "")))
                        user = item.get("user", item.get("owner", item.get("author", {})))
                        username = user.get("username", "instagram_user") if isinstance(user, dict) else str(user)
                        likes = int(item.get("like_count", item.get("likes_count", 0)))

                        if text and text.strip() and cid not in seen:
                            seen.add(cid)
                            comments.append({
                                "id": cid,
                                "platform": "instagram",
                                "content_id": shortcode,
                                "content_title": video_meta["title"],
                                "username": username,
                                "text": text.strip(),
                                "like_count": likes,
                                "published_at": None,
                                "parent_id": None,
                                "is_reply": False,
                            })

        video_meta["comment_count"] = len(comments)
        return {
            "video": video_meta,
            "comments": comments[:max_comments]
        }

instagram_adapter = InstagramRapidAPIAdapter()

