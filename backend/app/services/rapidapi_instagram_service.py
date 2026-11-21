import re
import logging
import datetime
from typing import Dict, Any, List, Optional
import httpx
from ..core.config import settings
from .comment_normalizer import comment_normalizer, NormalizedComment

logger = logging.getLogger("socialpulse.instagram")

QUOTA_EXHAUSTED_MESSAGE = "Instagram API monthly request quota exhausted. Please upgrade your RapidAPI subscription or wait for the next quota reset."

class InstagramAPIError(Exception):
    """
    Standardized Instagram integration exception with HTTP status, error code, and diagnostic message.
    Never leaks raw API keys or sensitive authorization headers.
    """
    def __init__(
        self,
        message: str,
        status_code: int = 502,
        error_code: str = "INSTAGRAM_PROVIDER_ERROR",
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
            "error_code": self.error_code,
            "message": self.message,
            "details": self.details,
            "detail": self.message if self.message == self.details else f"{self.message} {self.details}".strip(),
            "retryable": self.retryable,
        }

class RapidAPIInstagramService:
    """
    Direct RapidAPI Service targeting 'Instagram Scraper Stable API' (instagram-scraper-stable-api.p.rapidapi.com).
    Handles Reel/Post comment retrieval, multi-page pagination, circuit-breaking, and response normalization.
    """

    def __init__(self):
        # Circuit breaker state: initialized to True based on verified live 429 state
        self._quota_exhausted: bool = True
        self._quota_exhausted_at: Optional[datetime.datetime] = datetime.datetime.utcnow()
        self._last_quota_message: str = QUOTA_EXHAUSTED_MESSAGE

    def is_quota_exhausted(self) -> bool:
        return self._quota_exhausted

    def mark_quota_exhausted(self, reason: str = ""):
        self._quota_exhausted = True
        self._quota_exhausted_at = datetime.datetime.utcnow()
        logger.warning(
            "RapidAPI Instagram quota marked exhausted. Requests will be short-circuited to avoid consuming requests unnecessarily: %s",
            reason or QUOTA_EXHAUSTED_MESSAGE,
        )

    def reset_quota_circuit(self):
        self._quota_exhausted = False
        self._quota_exhausted_at = None
        logger.info("RapidAPI Instagram quota circuit breaker reset.")

    @staticmethod
    def validate_url(url: str) -> str:
        if not url or not isinstance(url, str):
            raise InstagramAPIError(
                "Instagram URL or shortcode is required.",
                status_code=400,
                error_code="INVALID_URL",
                details="Please provide a valid Instagram post or reel link.",
                retryable=False,
            )

        clean_url = url.strip()
        pattern = r"/(?:p|reel|reels|tv)/([A-Za-z0-9_-]+)"
        match = re.search(pattern, clean_url)
        if match:
            return match.group(1)

        # Direct shortcode string
        if re.fullmatch(r"[A-Za-z0-9_-]{5,35}", clean_url):
            return clean_url

        raise InstagramAPIError(
            f"Invalid Instagram URL: '{url}'.",
            status_code=400,
            error_code="INVALID_URL",
            details="Supported formats: https://www.instagram.com/reel/CODE/, https://www.instagram.com/p/CODE/, or raw shortcode.",
            retryable=False,
        )

    def is_configured(self) -> bool:
        return settings.is_rapidapi_configured()

    def _get_headers(self) -> Dict[str, str]:
        key = settings.rapidapi_key.strip()
        host = settings.rapidapi_host.strip()
        if not key or not host:
            raise InstagramAPIError(
                "RapidAPI credentials are not configured.",
                status_code=401,
                error_code="API_KEY_MISSING",
                details="Please set RAPIDAPI_KEY and RAPIDAPI_HOST in backend/.env.",
                retryable=False,
            )
        return {
            "X-RapidAPI-Key": key,
            "X-RapidAPI-Host": host,
            "Accept": "application/json",
        }

    async def fetch_reel_metadata(self, shortcode: str) -> Dict[str, Any]:
        """
        Attempts to fetch reel title, caption, and user details via GET /get_reel_title.php.
        Short-circuits immediately if quota is exhausted to avoid consuming unnecessary calls.
        """
        video_meta = {
            "id": shortcode,
            "platform": "instagram",
            "title": f"Instagram Reel ({shortcode})",
            "channel": "Instagram User",
            "thumbnail": None,
            "views": 0,
            "likes": 0,
            "comment_count": 0,
            "published_at": None,
        }

        # Do not consume extra API requests if quota is known to be exhausted
        if self._quota_exhausted:
            return video_meta

        host = settings.rapidapi_host.strip()
        meta_url = f"https://{host}/get_reel_title.php"
        params = {
            "reel_post_code_or_url": shortcode,
            "type": "reel",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(meta_url, headers=self._get_headers(), params=params)
                if res.status_code == 200:
                    data = res.json()
                    if isinstance(data, dict):
                        if data.get("title"):
                            video_meta["title"] = str(data["title"])[:120]
                        if data.get("username"):
                            video_meta["channel"] = str(data["username"])
                        if data.get("thumbnail") or data.get("display_url"):
                            video_meta["thumbnail"] = data.get("thumbnail") or data.get("display_url")
                elif res.status_code == 429:
                    self.mark_quota_exhausted("Reel metadata probe returned 429")
        except Exception:
            pass

        return video_meta

    async def fetch_content_and_comments(
        self,
        url: str,
        max_comments: int = 100,
        bypass_circuit: bool = False,
    ) -> Dict[str, Any]:
        """
        Retrieves comments for an Instagram post or reel.
        Implements circuit breaker to prevent repeated retries and unnecessary request consumption
        when monthly quota is exhausted.
        """
        shortcode = self.validate_url(url)

        # 1. Circuit breaker: if quota is exhausted and not explicitly testing, abort immediately
        if self._quota_exhausted and not bypass_circuit:
            logger.info("Aborting Instagram retrieval: quota known exhausted. Zero network calls made.")
            raise InstagramAPIError(
                message=QUOTA_EXHAUSTED_MESSAGE,
                status_code=429,
                error_code="PROVIDER_QUOTA_EXCEEDED",
                details="Request short-circuited to prevent consuming calls while RapidAPI monthly plan quota is exhausted.",
                retryable=False,
            )

        headers = self._get_headers()
        host = settings.rapidapi_host.strip()
        endpoint = f"https://{host}/get_post_comments.php"

        comments: List[Dict[str, Any]] = []
        seen_ids = set()
        pagination_token = ""
        page = 1
        max_pages = max(1, min(2500, (max_comments + 19) // 20))

        video_meta = {
            "id": shortcode,
            "platform": "instagram",
            "title": f"Instagram Reel ({shortcode})",
            "channel": "Instagram User",
            "thumbnail": None,
            "views": 0,
            "likes": 0,
            "comment_count": 0,
            "published_at": None,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            while len(comments) < max_comments and page <= max_pages:
                params = {
                    "media_code": shortcode,
                    "sort_order": "popular",
                }
                if pagination_token:
                    params["pagination_token"] = pagination_token

                try:
                    response = await client.get(endpoint, headers=headers, params=params)
                except httpx.TimeoutException:
                    raise InstagramAPIError(
                        "Request to Instagram comments provider timed out.",
                        status_code=504,
                        error_code="PROVIDER_TIMEOUT",
                        details="The RapidAPI endpoint took longer than 30s to respond.",
                        retryable=True,
                    )
                except httpx.RequestError as exc:
                    raise InstagramAPIError(
                        f"Could not connect to Instagram provider at {host}.",
                        status_code=502,
                        error_code="UPSTREAM_PROVIDER_UNAVAILABLE",
                        details=str(exc),
                        retryable=True,
                    )

                # Check headers for remaining requests count
                rem_header = response.headers.get("x-ratelimit-requests-remaining")
                if rem_header and rem_header.strip() == "0":
                    self.mark_quota_exhausted("x-ratelimit-requests-remaining header is 0")

                # Handle HTTP 429 Quota Exceeded
                if response.status_code == 429:
                    self.mark_quota_exhausted("RapidAPI returned HTTP 429")
                    raise InstagramAPIError(
                        message=QUOTA_EXHAUSTED_MESSAGE,
                        status_code=429,
                        error_code="PROVIDER_QUOTA_EXCEEDED",
                        details="RapidAPI host reported monthly plan limit reached (BASIC plan: 20 reqs/month).",
                        retryable=False,
                    )

                if response.status_code == 400:
                    raise InstagramAPIError(
                        "Bad Request sent to Instagram provider.",
                        status_code=400,
                        error_code="BAD_REQUEST",
                        details=response.text[:300],
                        retryable=False,
                    )
                elif response.status_code in (401, 403):
                    raise InstagramAPIError(
                        "RapidAPI Authentication failed or subscription missing.",
                        status_code=response.status_code,
                        error_code="PROVIDER_AUTH_FAILED",
                        details="Please verify your RAPIDAPI_KEY subscription to 'Instagram Scraper Stable API'.",
                        retryable=False,
                    )
                elif response.status_code == 404:
                    raise InstagramAPIError(
                        "Instagram content or comments endpoint not found.",
                        status_code=404,
                        error_code="CONTENT_NOT_FOUND",
                        details=f"The reel or post with shortcode '{shortcode}' was not found. It may be private or removed.",
                        retryable=False,
                    )
                elif response.status_code != 200:
                    raise InstagramAPIError(
                        f"Instagram provider returned HTTP {response.status_code}.",
                        status_code=502,
                        error_code="UPSTREAM_PROVIDER_ERROR",
                        details=response.text[:300],
                        retryable=True,
                    )

                # Parse JSON response
                try:
                    data = response.json()
                except Exception:
                    raise InstagramAPIError(
                        "Provider returned malformed non-JSON data.",
                        status_code=502,
                        error_code="INVALID_RESPONSE_FORMAT",
                        details="Expected JSON response from RapidAPI.",
                        retryable=False,
                    )

                # Check for in-band provider quota / subscription messages
                if isinstance(data, dict):
                    msg = str(data.get("message", "")).lower()
                    if "exceeded the monthly quota" in msg or "exceeded the quota" in msg:
                        self.mark_quota_exhausted("In-band message: " + data.get("message", ""))
                        raise InstagramAPIError(
                            message=QUOTA_EXHAUSTED_MESSAGE,
                            status_code=429,
                            error_code="PROVIDER_QUOTA_EXCEEDED",
                            details=data.get("message"),
                            retryable=False,
                        )
                    if "you are not subscribed" in msg:
                        raise InstagramAPIError(
                            "Not subscribed to RapidAPI Instagram Scraper Stable API.",
                            status_code=403,
                            error_code="PROVIDER_SUBSCRIPTION_REQUIRED",
                            details=data.get("message"),
                            retryable=False,
                        )

                    # Handled graceful cases: 0 comments found
                    err_val = str(data.get("error", ""))
                    if "post comments data not found" in err_val.lower() or "not found" in err_val.lower():
                        logger.info("Instagram provider reported no comments data found for %s", shortcode)
                        break

                # Extract and normalize comments
                items_to_normalize = self._extract_raw_comments_list(data)
                if not items_to_normalize:
                    break

                for raw_item in items_to_normalize:
                    norm = comment_normalizer.from_instagram(raw_item, shortcode, is_reply=False)
                    if norm.comment_text and norm.comment_id not in seen_ids:
                        seen_ids.add(norm.comment_id)
                        comments.append(norm.to_dict())
                        if len(comments) >= max_comments:
                            break

                # Check pagination token
                next_token = ""
                if isinstance(data, dict):
                    next_token = data.get("pagination_token") or data.get("next_max_id") or ""
                if not next_token or next_token == pagination_token:
                    break
                pagination_token = next_token
                page += 1

        video_meta["comment_count"] = len(comments)
        return {
            "video": video_meta,
            "comments": comments[:max_comments],
            "total_retrieved": len(comments),
            "source": "rapidapi_rest",
        }

    def _extract_raw_comments_list(self, data: Any) -> List[Dict[str, Any]]:
        if isinstance(data, list):
            return [x for x in data if isinstance(x, dict)]

        if not isinstance(data, dict):
            return []

        if "comments" in data and isinstance(data["comments"], list):
            return data["comments"]

        inner = data.get("data")
        if isinstance(inner, list):
            return [x for x in inner if isinstance(x, dict)]
        if isinstance(inner, dict):
            if "comments" in inner and isinstance(inner["comments"], list):
                return inner["comments"]
            if "items" in inner and isinstance(inner["items"], list):
                return inner["items"]
            edges = inner.get("edge_media_to_parent_comment", {}).get("edges", [])
            if edges:
                return [edge.get("node", edge) for edge in edges if isinstance(edge, dict)]

        if "items" in data and isinstance(data["items"], list):
            return data["items"]

        return []

rapidapi_instagram_service = RapidAPIInstagramService()
