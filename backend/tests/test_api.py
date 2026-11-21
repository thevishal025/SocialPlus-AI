import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "integrations" in data
    assert "models" in data
    assert "database" in data

def test_api_preview_analysis():
    payload = {
        "comments": [
            "Great explanation! Loved the architecture visuals ❤️🔥",
            "Terrible sound quality, could not hear anything 😡",
            "How do you configure Redis replica nodes? 🤔"
        ]
    }
    response = client.post("/api/v1/analysis/preview", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["comments"]) == 3
    summary = data["summary"]
    assert summary["total_comments"] == 3
    assert "net_sentiment_score" in summary
    assert "sentiment_distribution" in summary

def test_api_evaluation_metrics():
    response = client.get("/api/v1/analysis/evaluation/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "evaluation_metrics" in data
    assert "language_slice_performance" in data

