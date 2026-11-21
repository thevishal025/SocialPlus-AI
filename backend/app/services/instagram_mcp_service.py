import json
import re
from typing import Dict, Any, List, Optional
import httpx
from ..core.config import settings
from .comment_normalizer import comment_normalizer, NormalizedComment
from .rapidapi_instagram_service import rapidapi_instagram_service, InstagramAPIError, QUOTA_EXHAUSTED_MESSAGE

class InstagramMCPService:
    """
    Instagram Comments Service communicating via the Model Context Protocol (MCP) server
    at https://mcp.rapidapi.com bridging to the configured RapidAPI Instagram provider.
    """

    def __init__(self):
        self.mcp_url = settings.rapidapi_mcp_url
        self.host = settings.rapidapi_host

    def is_configured(self) -> bool:
        return bool(settings.rapidapi_key and self.host and self.mcp_url)

    def _get_headers(self) -> Dict[str, str]:
        key = settings.rapidapi_key.strip()
        host = self.host.strip()
        if not key or not host:
            raise InstagramAPIError(
                "RapidAPI credentials are not configured.",
                status_code=401,
                error_code="API_KEY_MISSING",
                details="Please configure RAPIDAPI_KEY and RAPIDAPI_HOST in backend/.env.",
            )
        return {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "x-api-host": host,
            "x-api-key": key,
            "x-rapidapi-host": host,
            "x-rapidapi-key": key,
        }

    async def list_tools(self) -> List[Dict[str, Any]]:
        """Queries the MCP server tools/list endpoint to discover live tools."""
        if not self.is_configured():
            return []

        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list",
            "params": {}
        }
        async with httpx.AsyncClient(timeout=25.0) as client:
            try:
                res = await client.post(self.mcp_url, headers=self._get_headers(), json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("result", {}).get("tools", [])
            except Exception:
                pass
        return []

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Executes an MCP tool via JSON-RPC 2.0 tools/call."""
        if not self.is_configured():
            raise InstagramAPIError(
                "RapidAPI MCP service is not configured.",
                status_code=401,
                error_code="API_KEY_MISSING",
                details="Please verify RAPIDAPI_KEY in backend/.env.",
            )

        # Circuit breaker check: do not repeatedly retry if quota is known exhausted
        if rapidapi_instagram_service.is_quota_exhausted():
            raise InstagramAPIError(
                message=QUOTA_EXHAUSTED_MESSAGE,
                status_code=429,
                error_code="PROVIDER_QUOTA_EXCEEDED",
                details="Blocked by circuit-breaker to avoid consuming requests while provider quota is exhausted.",
                retryable=False,
            )

        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            }
        }
        async with httpx.AsyncClient(timeout=35.0) as client:
            try:
                res = await client.post(self.mcp_url, headers=self._get_headers(), json=payload)
            except httpx.TimeoutException:
                raise InstagramAPIError(
                    "MCP server connection timed out.",
                    status_code=504,
                    error_code="MCP_TIMEOUT",
                    details=f"Connecting to {self.mcp_url} timed out.",
                    retryable=True,
                )
            except httpx.RequestError as exc:
                raise InstagramAPIError(
                    f"Could not connect to MCP server at {self.mcp_url}.",
                    status_code=502,
                    error_code="MCP_CONNECTION_FAILED",
                    details=str(exc),
                    retryable=True,
                )

            if res.status_code == 429:
                rapidapi_instagram_service.mark_quota_exhausted("MCP server returned HTTP 429")
                raise InstagramAPIError(
                    message=QUOTA_EXHAUSTED_MESSAGE,
                    status_code=429,
                    error_code="PROVIDER_QUOTA_EXCEEDED",
                    details="The RapidAPI provider monthly request quota has been exhausted.",
                    retryable=False,
                )
            elif res.status_code != 200:
                raise InstagramAPIError(
                    f"MCP server returned HTTP {res.status_code}.",
                    status_code=502,
                    error_code="MCP_HTTP_ERROR",
                    details=res.text[:300],
                    retryable=True,
                )
            
            data = res.json()
            if "error" in data:
                err_body = data["error"]
                raise InstagramAPIError(
                    f"MCP tool error: {err_body}",
                    status_code=502,
                    error_code="MCP_TOOL_ERROR",
                    details=str(err_body),
                    retryable=True,
                )
            
            content_items = data.get("result", {}).get("content", [])
            if not content_items:
                return {}
            
            for item in content_items:
                if item.get("type") == "text":
                    try:
                        parsed = json.loads(item.get("text", "{}"))
                        # Inspect for provider errors embedded in text
                        if isinstance(parsed, dict):
                            msg = str(parsed.get("message", "")).lower()
                            if "exceeded the monthly quota" in msg or "exceeded the quota" in msg:
                                rapidapi_instagram_service.mark_quota_exhausted("MCP payload: " + parsed.get("message", ""))
                                raise InstagramAPIError(
                                    message=QUOTA_EXHAUSTED_MESSAGE,
                                    status_code=429,
                                    error_code="PROVIDER_QUOTA_EXCEEDED",
                                    details=parsed.get("message"),
                                    retryable=False,
                                )
                            if "you are not subscribed" in msg:
                                raise InstagramAPIError(
                                    "Not subscribed to RapidAPI Instagram Scraper Stable API.",
                                    status_code=403,
                                    error_code="PROVIDER_SUBSCRIPTION_REQUIRED",
                                    details=parsed.get("message"),
                                    retryable=False,
                                )
                        return parsed
                    except InstagramAPIError:
                        raise
                    except Exception:
                        return {"text": item.get("text")}
            return {}

    async def fetch_comments(self, shortcode: str, max_comments: int = 100) -> Dict[str, Any]:
        """Fetches post comments using MCP tool Get_Post_Comments."""
        raw_result = await self.call_tool("Get_Post_Comments", {"media_code": shortcode})
        return self._normalize_mcp_response(raw_result, shortcode, max_comments)

    def _normalize_mcp_response(self, raw_data: Any, shortcode: str, max_comments: int) -> Dict[str, Any]:
        comments: List[Dict[str, Any]] = []
        seen = set()

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

        # Check for empty response notice
        if isinstance(raw_data, dict):
            err_val = str(raw_data.get("error", "")).lower()
            if "post comments data not found" in err_val:
                return {
                    "video": video_meta,
                    "comments": [],
                    "total_retrieved": 0,
                    "source": "mcp_json_rpc"
                }

        candidates = []
        if isinstance(raw_data, dict):
            if "comments" in raw_data and isinstance(raw_data["comments"], list):
                candidates = raw_data["comments"]
            elif "data" in raw_data:
                data_val = raw_data["data"]
                if isinstance(data_val, list):
                    candidates = data_val
                elif isinstance(data_val, dict):
                    candidates = data_val.get("comments", data_val.get("items", []))
            elif "items" in raw_data and isinstance(raw_data["items"], list):
                candidates = raw_data["items"]
        elif isinstance(raw_data, list):
            candidates = raw_data

        for item in candidates:
            if not isinstance(item, dict):
                continue
            norm = comment_normalizer.from_instagram(item, shortcode, is_reply=False)
            if norm.comment_text and norm.comment_id not in seen:
                seen.add(norm.comment_id)
                comments.append(norm.to_dict())
                if len(comments) >= max_comments:
                    break

        video_meta["comment_count"] = len(comments)
        return {
            "video": video_meta,
            "comments": comments,
            "total_retrieved": len(comments),
            "source": "mcp_json_rpc"
        }

instagram_mcp_service = InstagramMCPService()
