import io
import json
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app
from app.services.youtube_service import youtube_service
from app.services.rapidapi_instagram_service import rapidapi_instagram_service, QUOTA_EXHAUSTED_MESSAGE
from app.core.database import SessionLocal
from app.models.comment import Comment
from app.models.video import Video

client = TestClient(app)

# ==========================================
# 1. YOUTUBE URL PARSING & VALIDATION
# ==========================================
def test_youtube_url_formats():
    expected_id = "dQw4w9WgXcQ"
    urls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
        "https://youtu.be/dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ?t=10",
        "https://www.youtube.com/shorts/dQw4w9WgXcQ",
        "https://www.youtube.com/embed/dQw4w9WgXcQ",
        "https://www.youtube.com/v/dQw4w9WgXcQ",
        "www.youtube.com/watch?v=dQw4w9WgXcQ",
        "dQw4w9WgXcQ",
    ]
    for u in urls:
        assert youtube_service.validate_url(u) == expected_id

def test_youtube_invalid_url():
    with pytest.raises(ValueError):
        youtube_service.validate_url("https://vimeo.com/123456")
    with pytest.raises(ValueError):
        youtube_service.validate_url("")

# ==========================================
# 2. YOUTUBE OFFICIAL API COMMENT RETRIEVAL
# ==========================================
def test_youtube_fetch_comments_live_api():
    if not youtube_service.is_configured():
        pytest.skip("YouTube API key not configured")

    res = client.post("/api/v1/youtube/analyze", json={
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "max_comments": 10
    })
    assert res.status_code == 200
    data = res.json()
    assert data["video"]["id"] == "dQw4w9WgXcQ"
    assert len(data["comments"]) > 0
    assert "sentiment_distribution" in data["summary"]
    assert "dominant_emotion" in data["summary"]
    assert "intent_distribution" in data["summary"]

# ==========================================
# 3. YOUTUBE CSV, EXCEL, JSON, AND MANUAL IMPORT
# ==========================================
def test_youtube_csv_import():
    csv_text = """author,comment_text,likes,date
User1,This tutorial saved my final project! Thank you so much ❤️🔥,25,2026-10-01
User2,Not working on Windows 11. Very frustrating.,4,2026-10-02
User3,Can we get the link to the slides?,8,2026-10-03
"""
    res = client.post(
        "/api/v1/ingestion/process-file",
        data={
            "platform": "youtube",
            "mapping": json.dumps({"text": "comment_text", "username": "author", "likes": "likes", "timestamp": "date"}),
            "title": "YouTube CSV Ingestion Suite",
        },
        files={"file": ("comments.csv", io.BytesIO(csv_text.encode("utf-8")), "text/csv")}
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["comments"]) == 3
    assert data["video"]["platform"] == "youtube"

def test_youtube_excel_import():
    df = pd.DataFrame([
        {"author": "learner_1", "comment": "Brilliant explanation of the neural pipeline!", "likes": 12},
        {"author": "learner_2", "comment": "I loved the practical demonstration in part 2.", "likes": 7},
    ])
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")

    res = client.post(
        "/api/v1/ingestion/process-file",
        data={
            "platform": "youtube",
            "mapping": json.dumps({"text": "comment", "username": "author", "likes": "likes"}),
            "title": "YouTube Excel Ingestion Suite",
        },
        files={"file": ("comments.xlsx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["comments"]) == 2

def test_youtube_json_import():
    data_list = [
        {"user": "dev_a", "text": "Very clean coding style and good practices.", "likes": 30},
        {"user": "dev_b", "text": "Could you do a follow-up on Kubernetes deployment?", "likes": 15},
    ]
    raw = json.dumps(data_list).encode("utf-8")
    res = client.post(
        "/api/v1/ingestion/process-file",
        data={
            "platform": "youtube",
            "mapping": json.dumps({"text": "text", "username": "user", "likes": "likes"}),
            "title": "YouTube JSON Ingestion Suite",
        },
        files={"file": ("comments.json", io.BytesIO(raw), "application/json")}
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["comments"]) == 2

def test_youtube_manual_entry():
    res = client.post("/api/v1/ingestion/manual", json={
        "platform": "youtube",
        "title": "Manual YouTube Test",
        "comments": [
            "Loved the intro music and pace! 🔥",
            "What framework are you using?",
        ]
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data["comments"]) == 2
    assert data["video"]["platform"] == "youtube"

# ==========================================
# 4. INSTAGRAM URL VALIDATION & INGESTION
# ==========================================
def test_instagram_url_validation():
    assert rapidapi_instagram_service.validate_url("https://www.instagram.com/reel/DfGw6MiB4a4/") == "DfGw6MiB4a4"
    assert rapidapi_instagram_service.validate_url("https://www.instagram.com/p/C_mG_p1sA_N/") == "C_mG_p1sA_N"
    assert rapidapi_instagram_service.validate_url("DfGw6MiB4a4") == "DfGw6MiB4a4"

def test_instagram_csv_import():
    csv_text = """user_handle,caption_comment,like_count
fashion_blogger,Obsessed with this outfit inspiration! 😍✨,150
shopper99,Where did you get the leather jacket?,22
"""
    res = client.post(
        "/api/v1/ingestion/process-file",
        data={
            "platform": "instagram",
            "mapping": json.dumps({"text": "caption_comment", "username": "user_handle", "likes": "like_count"}),
            "title": "Instagram CSV Batch",
        },
        files={"file": ("ig.csv", io.BytesIO(csv_text.encode("utf-8")), "text/csv")}
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["comments"]) == 2
    assert data["video"]["platform"] == "instagram"

def test_instagram_excel_import():
    df = pd.DataFrame([
        {"author": "ig_fan", "text": "Incredible camera work in this reel!", "likes": 88},
    ])
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    res = client.post(
        "/api/v1/ingestion/process-file",
        data={
            "platform": "instagram",
            "mapping": json.dumps({"text": "text", "username": "author", "likes": "likes"}),
        },
        files={"file": ("ig.xlsx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["comments"]) == 1
    assert data["video"]["platform"] == "instagram"

def test_instagram_json_import():
    items = [{"username": "photographer", "comment": "The lighting here is magnificent! 📸", "likes": 40}]
    raw = json.dumps(items).encode("utf-8")
    res = client.post(
        "/api/v1/ingestion/process-file",
        data={
            "platform": "instagram",
            "mapping": json.dumps({"text": "comment", "username": "username", "likes": "likes"}),
        },
        files={"file": ("ig.json", io.BytesIO(raw), "application/json")}
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["comments"]) == 1

def test_instagram_manual_entry():
    res = client.post("/api/v1/ingestion/manual", json={
        "platform": "instagram",
        "title": "Manual Instagram Reel Feedback",
        "comments": [
            "Best reel I've seen all week! 🙌",
            "Need a part 2 ASAP please!",
        ]
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data["comments"]) == 2
    assert data["video"]["platform"] == "instagram"

# ==========================================
# 5. DEDUPLICATION AND QUOTA HANDLING
# ==========================================
def test_ingestion_duplicate_detection():
    # Submit dataset with duplicate text
    csv_text = """comment
Great content!
Great content!
Great content!
Unique comment.
"""
    res = client.post(
        "/api/v1/ingestion/process-file",
        data={"platform": "youtube", "mapping": json.dumps({"text": "comment"})},
        files={"file": ("dup.csv", io.BytesIO(csv_text.encode("utf-8")), "text/csv")}
    )
    assert res.status_code == 200
    data = res.json()
    # 4 rows processed, duplicates flagged
    assert len(data["comments"]) == 4

def test_instagram_quota_circuit_breaker():
    # If quota is exhausted, POST /api/v1/instagram/analyze returns 429 with clear message, NEVER 500
    res = client.post("/api/v1/instagram/analyze", json={
        "url": "https://www.instagram.com/reel/DfGw6MiB4a4/",
        "max_comments": 20,
    })
    assert res.status_code != 500
    if res.status_code == 429:
        data = res.json()
        assert data["error_code"] == "PROVIDER_QUOTA_EXCEEDED"
        assert data["message"] == QUOTA_EXHAUSTED_MESSAGE

