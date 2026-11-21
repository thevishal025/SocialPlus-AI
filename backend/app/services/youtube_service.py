import re
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse, parse_qs
import httpx
from ..core.config import settings
from .comment_normalizer import comment_normalizer, NormalizedComment

class YouTubeService:
    BASE_URL = "https://www.googleapis.com/youtube/v3"

    @staticmethod
    def validate_url(url: str) -> str:
        if not url or not isinstance(url, str):
            raise ValueError("YouTube URL is required.")
        
        cleaned = url.strip()
        # Prepend https:// if protocol is omitted (e.g. www.youtube.com/watch?v=...)
        if not cleaned.startswith(("http://", "https://")):
            cleaned = "https://" + cleaned

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

        # Handle raw 11-char video ID if passed directly
        if not video_id:
            raw_check = url.strip()
            if re.fullmatch(r"[A-Za-z0-9_-]{11}", raw_check):
                video_id = raw_check

        if not video_id or not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
            raise ValueError(f"Invalid YouTube URL or video ID: '{url}'. Please provide a valid watch, Shorts, or embed link.")

        return video_id

    def is_configured(self) -> bool:
        return settings.is_youtube_configured()

    def _parse_api_error(self, res: httpx.Response) -> str:
        """Extracts structured, human-readable Google API error descriptions."""
        try:
            data = res.json()
            err = data.get("error", {})
            errors = err.get("errors", [{}])
            reason = errors[0].get("reason", "") if errors else ""
            msg = err.get("message", "")
            if reason == "commentsDisabled":
                return "Comments are disabled for this YouTube video."
            elif reason == "quotaExceeded":
                return "YouTube API daily quota exceeded. Please try again tomorrow or upgrade your quota in Google Cloud Console."
            elif reason == "accessNotConfigured":
                return "YouTube Data API v3 has not been enabled in your Google Cloud Project. Please enable it in Google Cloud Console."
            elif reason == "keyInvalid" or "API key not valid" in msg:
                return "The configured YouTube API key is invalid or has expired."
            elif reason == "videoNotFound":
                return "The YouTube video does not exist, is private, or has been removed."
            return msg or f"YouTube API returned HTTP {res.status_code}"
        except Exception:
            return f"YouTube API returned HTTP {res.status_code}"

    async def fetch_video_metadata(self, video_id: str) -> Dict[str, Any]:
        api_key = (settings.youtube_api_key or "").strip()
        if not api_key:
            raise RuntimeError(
                "YouTube API key is not configured. Please add YOUTUBE_API_KEY to your backend/.env file."
            )

        async with httpx.AsyncClient(timeout=25.0) as client:
            params = {
                "part": "snippet,statistics,contentDetails",
                "id": video_id,
                "key": api_key,
            }
            res = await client.get(f"{self.BASE_URL}/videos", params=params)

            if res.status_code != 200:
                err_msg = self._parse_api_error(res)
                raise RuntimeError(err_msg)

            items = res.json().get("items", [])
            if not items:
                raise ValueError("This YouTube video does not exist, is private, or has been removed.")

            item = items[0]
            snippet = item.get("snippet", {})
            stats = item.get("statistics", {})

            return {
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

    async def fetch_content_and_comments(self, url: str, max_comments: int = 250) -> Dict[str, Any]:
        video_id = self.validate_url(url)
        video_meta = await self.fetch_video_metadata(video_id)
        api_key = (settings.youtube_api_key or "").strip()

        comments: List[Dict[str, Any]] = []
        seen_ids = set()
        page_token = None

        async with httpx.AsyncClient(timeout=30.0) as client:
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

                if c_res.status_code != 200:
                    if len(comments) == 0:
                        err_msg = self._parse_api_error(c_res)
                        raise RuntimeError(err_msg)
                    break

                c_data = c_res.json()
                thread_items = c_data.get("items", [])
                if not thread_items:
                    break

                video_title = video_meta.get("title", "")
                for thread in thread_items:
                    top = thread.get("snippet", {}).get("topLevelComment", {})
                    if top and top.get("id") not in seen_ids:
                        norm = comment_normalizer.from_youtube(top, video_id, is_reply=False, content_title=video_title)
                        if norm.comment_text:
                            seen_ids.add(norm.comment_id)
                            comments.append(norm.to_dict())

                    # Child replies from snippet
                    replies = thread.get("replies", {}).get("comments", [])
                    for reply in replies:
                        if reply.get("id") not in seen_ids and len(comments) < max_comments:
                            r_norm = comment_normalizer.from_youtube(reply, video_id, is_reply=True, content_title=video_title)
                            if r_norm.comment_text:
                                seen_ids.add(r_norm.comment_id)
                                comments.append(r_norm.to_dict())

                    # If thread has additional replies not in snippet, retrieve via comments.list
                    total_replies = int(thread.get("snippet", {}).get("totalReplyCount", 0))
                    if total_replies > len(replies) and len(comments) < max_comments:
                        try:
                            rem = max_comments - len(comments)
                            thread_id = thread.get("id")
                            if thread_id:
                                r_res = await client.get(
                                    f"{self.BASE_URL}/comments",
                                    params={
                                        "part": "snippet",
                                        "parentId": thread_id,
                                        "maxResults": min(100, rem),
                                        "textFormat": "plainText",
                                        "key": api_key,
                                    }
                                )
                                if r_res.status_code == 200:
                                    extra_replies = r_res.json().get("items", [])
                                    for extra in extra_replies:
                                        if extra.get("id") not in seen_ids and len(comments) < max_comments:
                                            r_norm = comment_normalizer.from_youtube(extra, video_id, is_reply=True, content_title=video_title)
                                            if r_norm.comment_text:
                                                seen_ids.add(r_norm.comment_id)
                                                comments.append(r_norm.to_dict())
                        except Exception:
                            pass

                page_token = c_data.get("nextPageToken")
                if not page_token:
                    break

        return {
            "video": video_meta,
            "comments": comments[:max_comments]
        }

youtube_service = YouTubeService()

