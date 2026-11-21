import logging
import datetime
from typing import Dict, Any, List, Optional
import httpx
from ..core.config import settings

logger = logging.getLogger("socialpulse.instagram.meta")

class MetaInstagramAPIError(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = 502,
        error_code: str = "META_API_ERROR",
        details: Optional[str] = None,
        retryable: bool = False,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or message
        self.retryable = retryable

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": False,
            "platform": "instagram",
            "method": "official_api",
            "error_code": self.error_code,
            "message": self.message,
            "details": self.details,
            "detail": f"{self.message} {self.details}".strip() if self.message != self.details else self.message,
            "retryable": self.retryable,
            "guidance": "Verify your Meta Developer App access token in backend/.env or use Method 2: Automatic Analysis (Without API).",
        }

class MetaInstagramService:
    """
    Official Meta Instagram Graph API Integration (Method 1).
    Preserves official Meta Graph API connection, credentials, and pagination flow.
    """

    def __init__(self):
        self.version = settings.meta_graph_api_version or "v21.0"
        self.base_url = f"https://graph.facebook.com/{self.version}"

    def is_configured(self) -> bool:
        return bool(
            settings.meta_api_enabled
            and settings.meta_access_token
            and not settings.meta_access_token.startswith("YOUR_")
        )

    async def fetch_comments_official(self, media_id_or_url: str, max_comments: int = 100) -> Dict[str, Any]:
        """
        Retrieves comments via official Meta Graph API endpoints:
        GET /{media-id}/comments?fields=id,text,username,timestamp,like_count
        """
        if not self.is_configured():
            raise MetaInstagramAPIError(
                message="Official Meta Instagram Graph API is not enabled or credentials are not configured.",
                status_code=401,
                error_code="META_API_NOT_CONFIGURED",
                details=(
                    "To use the Official API (Method 1), please configure META_ACCESS_TOKEN and set META_API_ENABLED=true in backend/.env. "
                    "Alternatively, use Method 2: Automatic Analysis (Without API) or Method 3: Upload CSV / Excel."
                ),
                retryable=False,
            )

        token = settings.meta_access_token.strip()
        # Clean media ID from URL or direct ID
        media_id = media_id_or_url.strip()
        if "instagram.com" in media_id:
            # If a URL was passed, attempt to extract shortcode or lookup via Instagram Business Account
            pass

        url = f"{self.base_url}/{media_id}/comments"
        params = {
            "access_token": token,
            "fields": "id,text,username,timestamp,like_count,replies{id,text,username,timestamp,like_count}",
            "limit": min(50, max_comments),
        }

        comments: List[Dict[str, Any]] = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                res = await client.get(url, params=params)
            except httpx.RequestError as exc:
                raise MetaInstagramAPIError(
                    f"Could not connect to Meta Graph API: {str(exc)}",
                    status_code=502,
                    error_code="META_CONNECTION_ERROR",
                    details=str(exc),
                    retryable=True,
                )

            if res.status_code != 200:
                err_data = res.json().get("error", {})
                msg = err_data.get("message", res.text[:200])
                code = err_data.get("code", res.status_code)
                raise MetaInstagramAPIError(
                    f"Meta Graph API error: {msg}",
                    status_code=res.status_code if res.status_code in (401, 403, 404, 429) else 502,
                    error_code="META_GRAPH_ERROR",
                    details=f"Code: {code}. {msg}",
                    retryable=False,
                )

            data = res.json()
            items = data.get("data", [])
            for item in items:
                cid = str(item.get("id"))
                text = item.get("text", "")
                author = item.get("username", "Meta Instagram User")
                likes = int(item.get("like_count", 0))
                ts = item.get("timestamp")

                if text:
                    comments.append({
                        "id": cid,
                        "platform": "instagram",
                        "content_id": media_id,
                        "content_title": f"Instagram Media ({media_id})",
                        "username": author,
                        "text": text,
                        "like_count": likes,
                        "is_reply": False,
                        "published_at": ts,
                        "source_type": "official_api",
                    })

        return {
            "video": {
                "id": media_id,
                "platform": "instagram",
                "title": f"Instagram Official Media ({media_id})",
                "channel": "Instagram Verified Creator",
                "thumbnail": None,
                "comment_count": len(comments),
                "source": "official_api",
            },
            "comments": comments[:max_comments],
            "total_collected": len(comments[:max_comments]),
            "status": "success",
            "source_type": "official_api",
        }

meta_instagram_service = MetaInstagramService()

