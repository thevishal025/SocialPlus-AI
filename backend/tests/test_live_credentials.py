import pytest
import asyncio
import httpx
from app.core.config import settings

def test_youtube_live_connection():
    if not settings.is_youtube_configured():
        pytest.skip("YouTube API key not configured")

    async def _run():
        url = "https://www.googleapis.com/youtube/v3/videos"
        params = {
            "part": "snippet,statistics",
            "id": "dQw4w9WgXcQ",
            "key": settings.youtube_api_key
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url, params=params)
            assert r.status_code == 200
            items = r.json().get("items", [])
            assert len(items) > 0
            assert "Rick Astley" in items[0]["snippet"]["title"]

    asyncio.run(_run())

def test_rapidapi_mcp_live_tools_discovery():
    if not settings.is_rapidapi_configured():
        pytest.skip("RapidAPI key not configured")

    async def _run():
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "x-api-host": settings.rapidapi_host,
            "x-api-key": settings.rapidapi_key,
            "x-rapidapi-host": settings.rapidapi_host,
            "x-rapidapi-key": settings.rapidapi_key,
        }
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list",
            "params": {}
        }
        async with httpx.AsyncClient(timeout=25.0) as client:
            r = await client.post(settings.rapidapi_mcp_url, headers=headers, json=payload)
            assert r.status_code == 200
            data = r.json()
            tools = data.get("result", {}).get("tools", [])
            assert len(tools) > 0
            tool_names = [t["name"] for t in tools]
            assert "Get_Post_Comments" in tool_names

    asyncio.run(_run())

def test_rapidapi_rest_connection():
    if not settings.is_rapidapi_configured():
        pytest.skip("RapidAPI key not configured")

    async def _run():
        headers = {
            "X-RapidAPI-Host": settings.rapidapi_host,
            "X-RapidAPI-Key": settings.rapidapi_key,
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(
                f"https://{settings.rapidapi_host}/get_post_comments.php",
                headers=headers,
                params={"media_code": "C_mG_p1sA_N"}
            )
            # Provider returns 200 with comments, 404 for not found, or 429 when monthly quota exhausted
            assert r.status_code in (200, 404, 429)

    asyncio.run(_run())
