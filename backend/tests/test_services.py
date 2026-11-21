import pytest
from app.services.comment_normalizer import comment_normalizer
from app.services.youtube_service import youtube_service
from app.services.instagram_rest_service import instagram_rest_service
from app.services.analysis_service import analysis_service
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_comment_normalizer_youtube():
    raw_item = {
        "id": "yt-comment-123",
        "snippet": {
            "authorDisplayName": "TechEnthusiast",
            "textDisplay": "Amazing product review! Really helpful tutorial.",
            "likeCount": 15,
            "publishedAt": "2026-10-31T12:00:00Z"
        }
    }
    norm = comment_normalizer.from_youtube(raw_item, content_id="video-abc", is_reply=False)
    assert norm.platform == "youtube"
    assert norm.content_id == "video-abc"
    assert norm.comment_id == "yt-comment-123"
    assert norm.username == "TechEnthusiast"
    assert "Amazing product review" in norm.comment_text
    assert norm.like_count == 15
    assert norm.is_reply is False

def test_comment_normalizer_instagram():
    raw_item = {
        "id": "ig-comment-456",
        "text": "Love this reel! 🔥❤️",
        "user": {"username": "social_guru"},
        "like_count": 8,
        "child_comment_count": 2,
    }
    norm = comment_normalizer.from_instagram(raw_item, content_id="C_xyz123", is_reply=False)
    assert norm.platform == "instagram"
    assert norm.content_id == "C_xyz123"
    assert norm.comment_id == "ig-comment-456"
    assert norm.username == "social_guru"
    assert "Love this reel" in norm.comment_text
    assert norm.like_count == 8
    assert norm.reply_count == 2

def test_youtube_url_validation():
    assert youtube_service.validate_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert youtube_service.validate_url("https://youtu.be/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert youtube_service.validate_url("https://www.youtube.com/shorts/dQw4w9WgXcQ") == "dQw4w9WgXcQ"

def test_instagram_url_validation():
    assert instagram_rest_service.validate_url("https://www.instagram.com/p/C_mG_p1sA_N/") == "C_mG_p1sA_N"
    assert instagram_rest_service.validate_url("https://www.instagram.com/reel/C_mG_p1sA_N/") == "C_mG_p1sA_N"

def test_analysis_service_batch():
    batch = [
        "This software is absolutely brilliant! Love the AI features ❤️",
        "Total waste of time, terrible buggy mess 😡",
        "Is there a discount code available for students?",
    ]
    res = analysis_service.analyze_batch(batch)
    assert len(res["comments"]) == 3
    assert res["summary"]["total_comments"] == 3
    assert res["summary"]["classified_comments"] == 3

def test_integrations_status_endpoint():
    res = client.get("/api/v1/integrations/status")
    assert res.status_code == 200
    data = res.json()
    assert "youtube" in data
    assert "rapidapi" in data
    assert "instagram_mcp" in data
    # Ensure raw secret keys are NEVER leaked
    assert "AIzaSy" not in str(data)
    assert "7dbdb34f" not in str(data)
    assert data["youtube"]["configured"] is True
    assert data["rapidapi"]["configured"] is True
    assert data["instagram_mcp"]["configured"] is True

def test_analytics_endpoints():
    res = client.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    res = client.get("/api/v1/analytics/sentiment")
    assert res.status_code == 200
    res = client.get("/api/v1/analytics/emotions")
    assert res.status_code == 200
    res = client.get("/api/v1/analytics/intents")
    assert res.status_code == 200
    res = client.get("/api/v1/analytics/moderation")
    assert res.status_code == 200

