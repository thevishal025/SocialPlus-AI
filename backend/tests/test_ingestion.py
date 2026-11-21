import io
import json
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_csv_file_preview_and_process():
    csv_content = """Author,Comment Text,Like Count,Date
Alex,This tutorial was super clear and helpful! ❤️🔥,15,2026-10-15
Maria,I completely disagree with the conclusion.,3,2026-10-16
Chris,Can you please upload the source code link?,8,2026-10-17
"""
    # 1. Preview
    res_prev = client.post(
        "/api/v1/ingestion/preview",
        files={"file": ("comments.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    )
    assert res_prev.status_code == 200
    prev_data = res_prev.json()
    assert prev_data["total_rows"] == 3
    assert "Comment Text" in prev_data["columns"]
    assert prev_data["suggested_mapping"]["text"] == "Comment Text"
    assert prev_data["suggested_mapping"]["username"] == "Author"

    # 2. Process
    mapping_str = json.dumps(prev_data["suggested_mapping"])
    res_proc = client.post(
        "/api/v1/ingestion/process-file",
        data={"platform": "youtube", "mapping": mapping_str, "title": "Test YouTube CSV Import"},
        files={"file": ("comments.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    )
    assert res_proc.status_code == 200
    proc_data = res_proc.json()
    assert len(proc_data["comments"]) == 3
    assert proc_data["video"]["platform"] == "youtube"
    assert "sentiment_distribution" in proc_data["summary"]

def test_json_file_preview_and_process():
    json_data = [
        {"username": "traveler", "text": "Stunning visuals and great editing! 🚀", "likes": 42},
        {"username": "critic", "text": "Audio quality could be much better.", "likes": 2},
    ]
    raw_bytes = json.dumps(json_data).encode("utf-8")

    # Preview
    res_prev = client.post(
        "/api/v1/ingestion/preview",
        files={"file": ("ig_data.json", io.BytesIO(raw_bytes), "application/json")}
    )
    assert res_prev.status_code == 200
    prev = res_prev.json()
    assert prev["total_rows"] == 2
    assert prev["suggested_mapping"]["text"] == "text"

    # Process for Instagram
    res_proc = client.post(
        "/api/v1/ingestion/process-file",
        data={"platform": "instagram", "mapping": json.dumps(prev["suggested_mapping"])},
        files={"file": ("ig_data.json", io.BytesIO(raw_bytes), "application/json")}
    )
    assert res_proc.status_code == 200
    data = res_proc.json()
    assert len(data["comments"]) == 2
    assert data["video"]["platform"] == "instagram"

def test_excel_file_process():
    df = pd.DataFrame([
        {"user": "dev1", "content": "Awesome explanation of the architecture! 👏", "upvotes": "20"},
        {"user": "dev2", "content": "Where can we find the Docker compose file?", "upvotes": "5"},
    ])
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    buf.seek(0)

    res_prev = client.post(
        "/api/v1/ingestion/preview",
        files={"file": ("comments.xlsx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    assert res_prev.status_code == 200
    prev = res_prev.json()
    assert prev["file_type"] == "excel"
    assert prev["total_rows"] == 2

    # Process
    res_proc = client.post(
        "/api/v1/ingestion/process-file",
        data={"platform": "youtube", "mapping": json.dumps(prev["suggested_mapping"])},
        files={"file": ("comments.xlsx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    assert res_proc.status_code == 200
    data = res_proc.json()
    assert len(data["comments"]) == 2

def test_manual_comments_ingestion_youtube_and_instagram():
    # YouTube manual
    res_yt = client.post("/api/v1/ingestion/manual", json={
        "platform": "youtube",
        "title": "Manual YouTube Session",
        "comments": [
            "This video answered all my questions, thanks a lot! 🙏",
            "Too fast, could not follow line 5.",
            {"text": "Is this applicable to Python 3.12?", "username": "python_fan", "likes": 12}
        ]
    })
    assert res_yt.status_code == 200
    yt_data = res_yt.json()
    assert len(yt_data["comments"]) == 3
    assert yt_data["video"]["platform"] == "youtube"

    # Instagram manual
    res_ig = client.post("/api/v1/ingestion/manual", json={
        "platform": "instagram",
        "title": "Manual Instagram Session",
        "comments": [
            "Love this reel so much! 😍🔥",
            "Song name please? 🎶",
        ]
    })
    assert res_ig.status_code == 200
    ig_data = res_ig.json()
    assert len(ig_data["comments"]) == 2
    assert ig_data["video"]["platform"] == "instagram"

