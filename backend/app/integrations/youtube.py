import re
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse, parse_qs
import httpx
from ..config import settings
from .base import BaseSocialAdapter

class YouTubeAdapter(BaseSocialAdapter):
    BASE_URL = "https://www.googleapis.com/youtube/v3"

    def validate_url(self, url: str) -> str:
        if not url or not isinstance(url, str):
            raise ValueError("YouTube URL is required.")
        
        cleaned = url.strip()
        parsed = urlparse(cleaned)
        hostname = (parsed.hostname or "").lower()

        video_id = ""
        if hostname in {"youtu.be", "www.youtu.be"}:
            path_parts = parsed.path.strip("/").split("/")
            if path_parts:
                video_id = path_parts[0]
        elif hostname.endswith("youtube.com"):
            if parsed.path == "/watch":
                video_id = parse_qs(parsed.query).get("v", [""])[0]
            elif any(parsed.path.startswith(prefix) for prefix in ("/shorts/", "/embed/", "/live/", "/v/")):
                parts = parsed.path.strip("/").split("/")
                if len(parts) >= 2:
                    video_id = parts[1]

        # Handle raw video ID if passed directly
        if not video_id and re.fullmatch(r"[A-Za-z0-9_-]{11}", cleaned):
            video_id = cleaned

        if not video_id or not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
            raise ValueError(f"Invalid YouTube URL or video ID: '{url}'. Please provide a valid video or Shorts link.")

        return video_id

    async def fetch_content_and_comments(self, url: str, max_comments: int = 250) -> Dict[str, Any]:
        api_key = settings.youtube_api_key
        if not api_key:
            raise RuntimeError(
                "YouTube API key is not configured. Please add YOUTUBE_API_KEY to your backend/.env file and restart the API service."
            )

        video_id = self.validate_url(url)

        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Fetch Video Metadata
            meta_params = {
                "part": "snippet,statistics,contentDetails",
                "id": video_id,
                "key": api_key,
            }
            meta_res = await client.get(f"{self.BASE_URL}/videos", params=meta_params)
            
            if meta_res.status_code == 403:
                error_data = meta_res.json().get("error", {})
                reason = error_data.get("errors", [{}])[0].get("reason", "")
                if reason == "quotaExceeded":
                    raise RuntimeError("YouTube API daily quota exceeded. Please try again tomorrow or upgrade quota.")
                raise RuntimeError(f"YouTube API permission error (403): {error_data.get('message', 'Forbidden')}")
            
            meta_res.raise_for_status()
            items = meta_res.json().get("items", [])
            if not items:
                raise ValueError("This YouTube video does not exist, is private, or has been removed.")

            item = items[0]
            snippet = item.get("snippet", {})
            stats = item.get("statistics", {})

            video_meta = {
                "id": video_id,
                "platform": "youtube",
                "title": snippet.get("title", "Untitled YouTube Video"),
                "channel": snippet.get("channelTitle", "Unknown Channel"),
                "thumbnail": (
                    snippet.get("thumbnails", {}).get("high", {}).get("url")
                    or snippet.get("thumbnails", {}).get("medium", {}).get("url")
                    or snippet.get("thumbnails", {}).get("default", {}).get("url")
                ),
                "views": int(stats.get("viewCount", 0)),
                "likes": int(stats.get("likeCount", 0)),
                "comment_count": int(stats.get("commentCount", 0)),
                "published_at": snippet.get("publishedAt"),
            }

            # 2. Fetch Comment Threads & Available Replies with Pagination
            comments: List[Dict[str, Any]] = []
            seen_ids = set()
            page_token = None

            while len(comments) < min(max_comments, 50000):
                per_page = min(100, max_comments - len(comments))
                comment_params = {
                    "part": "snippet,replies",
                    "videoId": video_id,
                    "maxResults": per_page,
                    "textFormat": "plainText",
                    "key": api_key,
                }
                if page_token:
                    comment_params["pageToken"] = page_token

                c_res = await client.get(f"{self.BASE_URL}/commentThreads", params=comment_params)

                if c_res.status_code == 403:
                    err_json = c_res.json().get("error", {})
                    reason = err_json.get("errors", [{}])[0].get("reason", "")
                    if reason == "commentsDisabled":
                        if not comments:
                            raise RuntimeError("Comments are disabled for this YouTube video.")
                        break
                    elif reason == "quotaExceeded":
                        if not comments:
                            raise RuntimeError("YouTube API quota exceeded while fetching comments.")
                        break
                    break

                if c_res.status_code != 200:
                    break

                c_data = c_res.json()
                thread_items = c_data.get("items", [])
                if not thread_items:
                    break

                for thread in thread_items:
                    top_snippet = thread.get("snippet", {}).get("topLevelComment", {})
                    if top_snippet and top_snippet.get("id") not in seen_ids:
                        c_obj = self._format_yt_comment(top_snippet, video_meta["title"], video_id, is_reply=False)
                        if c_obj["text"].strip():
                            seen_ids.add(c_obj["id"])
                            comments.append(c_obj)

                    # Extract replies if available
                    replies = thread.get("replies", {}).get("comments", [])
                    for reply in replies:
                        if reply.get("id") not in seen_ids and len(comments) < max_comments:
                            r_obj = self._format_yt_comment(reply, video_meta["title"], video_id, is_reply=True)
                            if r_obj["text"].strip():
                                seen_ids.add(r_obj["id"])
                                comments.append(r_obj)

                page_token = c_data.get("nextPageToken")
                if not page_token:
                    break

            return {
                "video": video_meta,
                "comments": comments[:max_comments]
            }

    def _format_yt_comment(self, obj: Dict[str, Any], title: str, video_id: str, is_reply: bool = False) -> Dict[str, Any]:
        s = obj.get("snippet", {})
        return {
            "id": obj.get("id", ""),
            "platform": "youtube",
            "content_id": video_id,
            "content_title": title,
            "username": s.get("authorDisplayName", "YouTube User"),
            "text": s.get("textDisplay", "").strip(),
            "like_count": int(s.get("likeCount", 0)),
            "published_at": s.get("publishedAt"),
            "parent_id": s.get("parentId") if is_reply else None,
            "is_reply": is_reply,
        }

youtube_adapter = YouTubeAdapter()

