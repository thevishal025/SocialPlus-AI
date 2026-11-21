import pytest
from app.services.rapidapi_instagram_service import (
    rapidapi_instagram_service,
    InstagramAPIError,
)
from app.services.comment_normalizer import comment_normalizer
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_instagram_reel_url_validation():
    # Instagram Reel URL from user bug report
    assert rapidapi_instagram_service.validate_url("https://www.instagram.com/reel/DfGw6MiB4a4/") == "DfGw6MiB4a4"
    assert rapidapi_instagram_service.validate_url("https://www.instagram.com/reel/DfGw6MiB4a4") == "DfGw6MiB4a4"
    assert rapidapi_instagram_service.validate_url("https://www.instagram.com/reels/DfGw6MiB4a4/") == "DfGw6MiB4a4"
    assert rapidapi_instagram_service.validate_url("https://www.instagram.com/p/DfGw6MiB4a4/") == "DfGw6MiB4a4"
    assert rapidapi_instagram_service.validate_url("DfGw6MiB4a4") == "DfGw6MiB4a4"

def test_instagram_invalid_url_raises_structured_error():
    with pytest.raises(InstagramAPIError) as exc_info:
        rapidapi_instagram_service.validate_url("https://twitter.com/post/123")
    assert exc_info.value.status_code == 400
    assert exc_info.value.error_code == "INVALID_URL"

def test_instagram_comment_normalization_robust():
    # 1. Test standard nested item
    raw_item = {
        "id": "17900123456",
        "text": "This Reel is incredible! 🔥❤️",
        "user": {"username": "creator_pro", "full_name": "Creator Pro"},
        "like_count": 42,
        "child_comment_count": 3,
        "created_at_utc": 1720000000,
    }
    norm = comment_normalizer.from_instagram(raw_item, content_id="DfGw6MiB4a4")
    d = norm.to_dict()
    assert d["platform"] == "instagram"
    assert d["comment_id"] == "17900123456"
    assert d["username"] == "creator_pro"
    assert d["comment_text"] == "This Reel is incredible! 🔥❤️"
    assert d["like_count"] == 42
    assert d["reply_count"] == 3
    assert d["parent_comment_id"] is None

    # 2. Test missing fields fallback (no user, no text, no likes)
    minimal_item = {"pk": 999}
    norm_min = comment_normalizer.from_instagram(minimal_item, content_id="DfGw6MiB4a4")
    assert norm_min.comment_id == "999"
    assert norm_min.username == "instagram_user"
    assert norm_min.like_count == 0
    assert norm_min.reply_count == 0

    # 3. Test GraphQL node structure
    graphql_item = {
        "node": {
            "id": "node_888",
            "text": "Awesome content",
            "owner": {"username": "viewer_1"},
            "edge_liked_by": {"count": 10},
        }
    }
    norm_gql = comment_normalizer.from_instagram(graphql_item, content_id="DfGw6MiB4a4")
    assert norm_gql.comment_id == "node_888"
    assert norm_gql.username == "viewer_1"
    assert norm_gql.like_count == 10

def test_instagram_empty_comments_handling():
    # When provider reports no comments data, it should return 0 comments gracefully
    empty_payload = {"error": "Post comments data not found"}
    comments = rapidapi_instagram_service._extract_raw_comments_list(empty_payload)
    assert comments == []

def test_instagram_comment_limit_presets():
    from app.schemas.analysis import InstagramAnalyzeRequest
    req_1 = InstagramAnalyzeRequest(url="https://www.instagram.com/reel/DfGw6MiB4a4/", max_comments=1)
    assert req_1.max_comments == 1

    req_5k = InstagramAnalyzeRequest(url="https://www.instagram.com/reel/DfGw6MiB4a4/", max_comments=5000)
    assert req_5k.max_comments == 5000

    req_10k = InstagramAnalyzeRequest(url="https://www.instagram.com/reel/DfGw6MiB4a4/", max_comments=10000)
    assert req_10k.max_comments == 10000

    req_inf = InstagramAnalyzeRequest(url="https://www.instagram.com/reel/DfGw6MiB4a4/", max_comments=50000)
    assert req_inf.max_comments == 50000

def test_instagram_analyze_endpoint_no_http_500_on_quota():
    # Calling the endpoint should return structured HTTP 429 when quota is exceeded, NEVER 500
    res = client.post("/api/v1/instagram/analyze", json={
        "url": "https://www.instagram.com/reel/DfGw6MiB4a4/",
        "max_comments": 50,
    })
    # Status must be 429 (or 200 if quota reset) — NEVER 500
    assert res.status_code != 500
    data = res.json()
    if res.status_code == 429:
        assert data["success"] is False
        assert data["error_code"] == "PROVIDER_QUOTA_EXCEEDED"
        assert data["message"] == "Instagram API monthly request quota exhausted. Please upgrade your RapidAPI subscription or wait for the next quota reset."
        assert data["retryable"] is False

def test_quota_exhausted_exact_message():
    from app.services.rapidapi_instagram_service import QUOTA_EXHAUSTED_MESSAGE
    expected = "Instagram API monthly request quota exhausted. Please upgrade your RapidAPI subscription or wait for the next quota reset."
    assert QUOTA_EXHAUSTED_MESSAGE == expected

def test_circuit_breaker_short_circuits_without_network():
    # With quota exhausted flag, fetch_content_and_comments should abort immediately
    rapidapi_instagram_service.mark_quota_exhausted("Unit test")
    assert rapidapi_instagram_service.is_quota_exhausted() is True

    import asyncio
    with pytest.raises(InstagramAPIError) as exc_info:
        asyncio.run(rapidapi_instagram_service.fetch_content_and_comments(
            "https://www.instagram.com/reel/DfGw6MiB4a4/",
            bypass_circuit=False
        ))
    err = exc_info.value
    assert err.status_code == 429
    assert err.error_code == "PROVIDER_QUOTA_EXCEEDED"
    assert err.message == "Instagram API monthly request quota exhausted. Please upgrade your RapidAPI subscription or wait for the next quota reset."
    assert err.retryable is False

def test_integrations_dashboard_status_shows_quota_exhausted():
    res = client.get("/api/v1/integrations/status")
    assert res.status_code == 200
    data = res.json()
    assert "instagram" in data
    assert data["instagram"]["quota_status"] == "exhausted"
    assert data["instagram"]["status"] == "quota_exhausted"
    assert data["instagram"]["quota_message"] == "Instagram API monthly request quota exhausted. Please upgrade your RapidAPI subscription or wait for the next quota reset."

def test_csv_comments_upload_and_all_5_engines():
    # Verifies requirement 9 & 10: CSV comment uploads functional and all five AI engines run without Instagram API
    sample_comments = [
        "This product is absolutely wonderful! Loved every second ❤️🔥",
        "Terrible experience, broke after 2 days. Total waste of money.",
        "Can you please explain how to set up the configuration step?",
        "Sub 4 Sub! Visit my channel for free gift cards www.spamlink.com",
        "Mujhe yeh video bohot pasand aayi! Outstanding work bhai 🙏",
    ]
    res = client.post("/api/v1/analysis/preview", json={"comments": sample_comments})
    assert res.status_code == 200
    data = res.json()
    assert len(data["comments"]) == 5

    # Check each comment has full 5-engine analysis outputs
    for c in data["comments"]:
        analysis = c["analysis"]
        # Engine 1: Sentiment Intelligence
        assert "sentiment" in analysis
        assert analysis["sentiment"] in ["Positive", "Negative", "Neutral", "Mixed"]
        # Engine 2: Emotional Intelligence Meter
        assert "dominant_emotion" in analysis
        # Engine 3: Intent Intelligence
        assert "intent" in analysis
        # Engine 4: Emoji Intelligence
        assert "emojis" in analysis
        # Engine 5: Auto Moderation Intelligence
        assert "moderation_action_recommended" in analysis

    # Check summary metrics from all 5 engines
    summary = data["summary"]
    assert "sentiment_distribution" in summary
    assert "emotion_distribution" in summary
    assert "intent_distribution" in summary
    assert "top_emojis" in summary
    assert "moderation_summary" in summary

def test_instagram_automatic_url_validation():
    from app.services.instagram_automatic_service import instagram_automatic_service, InstagramAutomaticExtractionError
    
    # Valid post URLs
    c_type, code = instagram_automatic_service.validate_url("https://www.instagram.com/p/Cz987654321/")
    assert c_type == "post"
    assert code == "Cz987654321"

    # Valid reel URLs
    c_type, code = instagram_automatic_service.validate_url("https://www.instagram.com/reel/DfGw6MiB4a4/?igsh=abc123xyz")
    assert c_type == "reel"
    assert code == "DfGw6MiB4a4"

    # Valid reels plural
    c_type, code = instagram_automatic_service.validate_url("https://www.instagram.com/reels/DfGw6MiB4a4")
    assert c_type == "reel"
    assert code == "DfGw6MiB4a4"

    # Direct code
    c_type, code = instagram_automatic_service.validate_url("DfGw6MiB4a4")
    assert c_type == "post"
    assert code == "DfGw6MiB4a4"

    # Invalid URL
    with pytest.raises(InstagramAutomaticExtractionError) as exc_info:
        instagram_automatic_service.validate_url("https://not-instagram.com/post/123")
    assert exc_info.value.status_code == 400
    assert exc_info.value.error_code == "UNSUPPORTED_URL_FORMAT"

def test_instagram_automatic_html_parsing():
    from app.services.instagram_automatic_service import instagram_automatic_service
    
    mock_html = """
    <!DOCTYPE html>
    <html>
    <head>
      <title>TechCreator on Instagram: "Awesome new product unboxing! Check it out!"</title>
      <meta property="og:title" content="TechCreator on Instagram: 'Awesome new product unboxing! Check it out!'" />
      <meta property="og:description" content="1,500 likes, 45 comments - 'Awesome new product unboxing! Check it out!'" />
      <meta property="og:image" content="https://instagram.com/thumb.jpg" />
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "SocialMediaPosting",
        "headline": "Awesome new product unboxing!",
        "author": {"@type": "Person", "name": "TechCreator"},
        "comment": [
          {"@type": "Comment", "text": "This phone camera is genuinely revolutionary! 📸❤️", "author": {"name": "gadget_fan"}},
          {"@type": "Comment", "text": "Too expensive for these specs, not buying.", "author": {"name": "skeptic_user"}},
          {"@type": "Comment", "text": "Where can we order this in India?", "author": {"name": "buyer_99"}}
        ]
      }
      </script>
    </head>
    <body>
    </body>
    </html>
    """
    meta = instagram_automatic_service._extract_metadata(mock_html, "test12345", "reel")
    assert meta["id"] == "test12345"
    assert meta["channel"] == "TechCreator"
    assert meta["thumbnail"] == "https://instagram.com/thumb.jpg"
    assert meta["likes"] == 1500

    comments = instagram_automatic_service._parse_accessible_comments(mock_html, "test12345", meta["title"])
    assert len(comments) == 3
    assert comments[0]["text"] == "This phone camera is genuinely revolutionary! 📸❤️"
    assert comments[0]["username"] == "gadget_fan"
    assert comments[0]["source_type"] == "automatic_without_api"
    assert comments[1]["text"] == "Too expensive for these specs, not buying."
    assert comments[2]["username"] == "buyer_99"

def test_instagram_status_reports_all_three_methods():
    res = client.get("/api/v1/instagram/status")
    assert res.status_code == 200
    data = res.json()
    assert "methods" in data
    assert "method_1_official_api" in data["methods"]
    assert "method_2_automatic" in data["methods"]
    assert "method_3_upload" in data["methods"]
    assert data["methods"]["method_2_automatic"]["requires_api_key"] is False

def test_instagram_automatic_endpoint_routing():
    # Calling /analyze-automatic with invalid URL returns structured 400 with guidance
    res = client.post("/api/v1/instagram/analyze-automatic", json={
        "url": "https://invalid-site.com/video",
        "max_comments": 50,
    })
    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["method"] == "automatic_without_api"
    assert "can_switch_to_csv" in data

def test_meta_instagram_service_unconfigured_guidance():
    from app.services.meta_instagram_service import meta_instagram_service, MetaInstagramAPIError
    import asyncio
    
    assert meta_instagram_service.is_configured() is False
    with pytest.raises(MetaInstagramAPIError) as exc_info:
        asyncio.run(meta_instagram_service.fetch_comments_official("1790012345"))
    err = exc_info.value
    assert err.status_code == 401
    assert err.error_code == "META_API_NOT_CONFIGURED"
    assert "Method 2" in err.details

def test_instagram_automatic_share_urls_and_queries():
    from app.services.instagram_automatic_service import instagram_automatic_service
    
    # Share post URL
    c_type, code = instagram_automatic_service.validate_url("https://www.instagram.com/share/p/DFmJ6Ftz_yI/")
    assert c_type == "post"
    assert code == "DFmJ6Ftz_yI"

    # Share reel URL with tracking query params
    c_type, code = instagram_automatic_service.validate_url("https://www.instagram.com/share/reel/CmgB7IaP4eZ/?igsh=MW5xbDZzOTEx&utm_source=qr#comments")
    assert c_type == "reel"
    assert code == "CmgB7IaP4eZ"

def test_instagram_automatic_polaris_error_detection():
    from app.services.instagram_automatic_service import instagram_automatic_service, InstagramAutomaticExtractionError
    import unittest.mock as mock
    import httpx
    import asyncio

    # Mock response returning Polaris httpErrorPage
    mock_resp = mock.MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.url = httpx.URL("https://www.instagram.com/p/DFmJ6Ftz_yI/")
    mock_resp.text = '<html><head><title>Instagram</title></head><body><script>{"canonicalRouteName":"comet.igweb.PolarisErrorRoute","pageID":"httpErrorPage"}</script></body></html>'

    with mock.patch("app.services.instagram_automatic_service.find_chromium_executable", return_value=None):
        with mock.patch("httpx.AsyncClient.get", return_value=mock_resp):
            with pytest.raises(InstagramAutomaticExtractionError) as exc_info:
                asyncio.run(instagram_automatic_service.extract_comments("https://www.instagram.com/p/DFmJ6Ftz_yI/"))
            err = exc_info.value
            assert err.status_code == 403
            assert err.error_code == "SCRAPING_RESTRICTED"
            assert err.can_switch_to_csv is True
            d = err.to_dict()
            assert d["can_switch_to_csv"] is True
            assert d["suggested_method"] == "file"
            assert "Polaris" in d["diagnostic"]

def test_instagram_automatic_login_wall_detection():
    from app.services.instagram_automatic_service import instagram_automatic_service, InstagramAutomaticExtractionError
    import unittest.mock as mock
    import httpx
    import asyncio

    mock_resp = mock.MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.url = httpx.URL("https://www.instagram.com/accounts/login/?next=/p/DFmJ6Ftz_yI/")
    mock_resp.text = "<html><head><title>Login • Instagram</title></head><body>Login Wall</body></html>"

    with mock.patch("app.services.instagram_automatic_service.find_chromium_executable", return_value=None):
        with mock.patch("httpx.AsyncClient.get", return_value=mock_resp):
            with pytest.raises(InstagramAutomaticExtractionError) as exc_info:
                asyncio.run(instagram_automatic_service.extract_comments("https://www.instagram.com/p/DFmJ6Ftz_yI/"))
            err = exc_info.value
            assert err.status_code == 403
            assert err.error_code == "LOGIN_REQUIRED"
            assert err.can_switch_to_csv is True


