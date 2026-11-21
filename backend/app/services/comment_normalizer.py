import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class NormalizedComment(BaseModel):
    """
    Standard unified comment representation across all social platforms (YouTube, Instagram, Uploads).
    """
    platform: str = Field(..., description="Source platform e.g. 'youtube' or 'instagram'")
    content_id: str = Field(..., description="External media/video ID or shortcode")
    content_title: str = Field(default="", description="Post/Video Title")
    comment_id: str = Field(..., description="Unique platform comment ID")
    username: str = Field(default="user", description="Author username or display name")
    comment_text: str = Field(..., description="Cleaned, plain-text comment content")
    like_count: int = Field(default=0, ge=0, description="Number of likes/reactions")
    reply_count: int = Field(default=0, ge=0, description="Number of replies")
    parent_comment_id: Optional[str] = Field(default=None, description="Parent comment ID if this is a reply")
    published_at: Optional[datetime.datetime] = Field(default=None, description="Original publication timestamp")
    retrieved_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow, description="Retrieval timestamp")
    is_reply: bool = Field(default=False, description="True if this is a nested response")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.comment_id,
            "platform": self.platform,
            "content_id": self.content_id,
            "content_title": self.content_title or f"{self.platform.capitalize()} Content ({self.content_id})",
            "comment_id": self.comment_id,
            "username": self.username,
            "text": self.comment_text,
            "comment_text": self.comment_text,
            "like_count": self.like_count,
            "reply_count": self.reply_count,
            "parent_id": self.parent_comment_id,
            "parent_comment_id": self.parent_comment_id,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "retrieved_at": self.retrieved_at.isoformat(),
            "is_reply": self.is_reply,
        }

class CommentNormalizer:
    """
    Adapter and normalizer converting heterogeneous platform payloads into NormalizedComment.
    """

    @staticmethod
    def parse_datetime(val: Any) -> Optional[datetime.datetime]:
        if not val:
            return None
        if isinstance(val, datetime.datetime):
            return val
        if isinstance(val, (int, float)):
            try:
                # Unix timestamp (seconds or milliseconds)
                if val > 1e11:
                    val = val / 1000.0
                return datetime.datetime.utcfromtimestamp(val)
            except Exception:
                return None
        if isinstance(val, str):
            try:
                # ISO format or trailing 'Z'
                return datetime.datetime.fromisoformat(val.replace("Z", "+00:00"))
            except Exception:
                pass
        return None

    @classmethod
    def from_youtube(cls, item: Dict[str, Any], content_id: str, is_reply: bool = False, content_title: str = "") -> NormalizedComment:
        snippet = item.get("snippet", {})
        cid = str(item.get("id", ""))
        text = str(snippet.get("textDisplay", snippet.get("textOriginal", ""))).strip()
        author = snippet.get("authorDisplayName", "YouTube User")
        likes = int(snippet.get("likeCount", 0))
        pub_at = cls.parse_datetime(snippet.get("publishedAt"))
        parent_id = str(snippet.get("parentId")) if (is_reply and snippet.get("parentId")) else None

        return NormalizedComment(
            platform="youtube",
            content_id=content_id,
            content_title=content_title,
            comment_id=cid,
            username=author,
            comment_text=text,
            like_count=max(0, likes),
            reply_count=0,
            parent_comment_id=parent_id,
            published_at=pub_at,
            is_reply=is_reply,
        )

    @classmethod
    def from_instagram(cls, item: Dict[str, Any], content_id: str, is_reply: bool = False, content_title: str = "") -> NormalizedComment:
        # Unwrap GraphQL node if present
        if isinstance(item, dict) and "node" in item and isinstance(item["node"], dict):
            item = item["node"]

        cid = str(item.get("id", item.get("pk", item.get("comment_id", f"ig-{id(item)}"))))
        
        # Text extraction across diverse RapidAPI schema variants
        text = str(
            item.get("text")
            or item.get("comment")
            or item.get("comment_text")
            or item.get("caption", {}).get("text")
            or ""
        ).strip()
        
        # Author extraction
        user_val = item.get("user") or item.get("owner") or item.get("author") or "instagram_user"
        if isinstance(user_val, dict):
            author = user_val.get("username") or user_val.get("full_name") or "instagram_user"
        else:
            author = str(user_val or "instagram_user")

        # Like counts
        likes = 0
        if "like_count" in item:
            likes = int(item.get("like_count") or 0)
        elif "likes_count" in item:
            likes = int(item.get("likes_count") or 0)
        elif "edge_liked_by" in item and isinstance(item["edge_liked_by"], dict):
            likes = int(item["edge_liked_by"].get("count") or 0)

        # Reply counts
        reply_count = 0
        if "child_comment_count" in item:
            reply_count = int(item.get("child_comment_count") or 0)
        elif "reply_count" in item:
            reply_count = int(item.get("reply_count") or 0)
        elif "edge_threaded_comments" in item and isinstance(item["edge_threaded_comments"], dict):
            reply_count = int(item["edge_threaded_comments"].get("count") or 0)

        # Datetime parsing
        pub_at = cls.parse_datetime(
            item.get("created_at_utc")
            or item.get("created_at")
            or item.get("published_at")
        )

        parent_id = str(item.get("parent_id") or item.get("parent_comment_id") or "") or None

        return NormalizedComment(
            platform="instagram",
            content_id=content_id,
            comment_id=cid,
            username=author,
            comment_text=text,
            like_count=max(0, likes),
            reply_count=max(0, reply_count),
            parent_comment_id=parent_id if is_reply else None,
            published_at=pub_at,
            is_reply=bool(is_reply or parent_id),
        )

    @classmethod
    def from_dict(cls, data: Dict[str, Any], default_platform: str = "uploaded", content_id: str = "batch") -> NormalizedComment:
        cid = str(data.get("id", data.get("comment_id", f"c-{id(data)}")))
        platform = data.get("platform", default_platform)
        text = str(data.get("text", data.get("comment_text", ""))).strip()
        author = str(data.get("username", data.get("author_username", "user")))
        likes = int(data.get("like_count", 0))
        pub_at = cls.parse_datetime(data.get("published_at"))
        parent_id = data.get("parent_id", data.get("parent_comment_id"))
        is_reply = bool(data.get("is_reply", False) or parent_id)

        return NormalizedComment(
            platform=platform,
            content_id=data.get("content_id", content_id),
            comment_id=cid,
            username=author,
            comment_text=text,
            like_count=max(0, likes),
            reply_count=int(data.get("reply_count", 0)),
            parent_comment_id=str(parent_id) if parent_id else None,
            published_at=pub_at,
            is_reply=is_reply,
        )

comment_normalizer = CommentNormalizer()
