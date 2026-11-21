"""
Unit and Integration Tests for SocialPlus.ai Universal Scraper AI Engine.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.platform_detector import detect_platform, inspect_url
from app.services.data_normalizer import data_normalizer
from app.services.pagination_manager import PaginationManager
from app.services.extraction_job_manager import extraction_job_manager
from app.services.export_service import export_service

client = TestClient(app)

def test_platform_detector_all_platforms():
    """Verifies that platform detector correctly identifies all supported platforms."""
    test_cases = [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "youtube"),
        ("https://youtu.be/dQw4w9WgXcQ", "youtube", "youtube"),
        ("https://www.instagram.com/reel/C321vN2IM7x/", "instagram", "meta"),
        ("https://www.instagram.com/p/DFmJ6Ftz_yI/", "instagram", "meta"),
        ("https://www.facebook.com/watch/?v=123456789", "facebook", "meta"),
        ("https://fb.watch/xyz123/", "facebook", "meta"),
        ("https://www.amazon.in/dp/B0CX54GDSX", "amazon", "ecommerce"),
        ("https://www.amazon.com/dp/B0CX54GDSX", "amazon", "ecommerce"),
        ("https://www.flipkart.com/samsung-galaxy-s24/p/itm123", "flipkart", "ecommerce"),
        ("https://www.meesho.com/s/p/abc12", "meesho", "ecommerce"),
        ("https://www.myntra.com/shoes/nike/123", "myntra", "ecommerce"),
        ("https://www.ajio.com/men-shoes/p/456", "ajio", "ecommerce"),
        ("https://www.snapdeal.com/product/abc/789", "snapdeal", "ecommerce"),
        ("https://www.ebay.com/itm/123456789", "ebay", "ecommerce"),
        ("https://gymshark.myshopify.com/products/shirt", "shopify", "ecommerce"),
    ]

    for url, expected_platform, expected_category in test_cases:
        p = detect_platform(url)
        assert p == expected_platform, f"Failed for {url}: expected {expected_platform}, got {p}"
        info = inspect_url(url)
        assert info["platform"] == expected_platform
        assert info["category"] == expected_category
        assert info["is_valid"] is True

def test_data_normalizer_and_deduplication():
    """Verifies standard normalization and duplicate removal."""
    raw_comments = [
        {"text": "  Great phone with excellent battery!  ", "username": "Alice", "likes": 5},
        {"text": "Terrible customer service and late delivery.", "username": "Bob", "likes": 2},
        {"text": "great phone with excellent battery!", "username": "Alice", "likes": 0},  # duplicate
        {"text": "", "username": "Ghost"},  # empty
        {"text": "Loved the camera and screen clarity.", "username": "Charlie", "likes": 12},
    ]

    normalized = [
        data_normalizer.normalize_comment(c, platform="youtube", content_id="vid1")
        for c in raw_comments
        if c.get("text")
    ]

    unique, dup_count = data_normalizer.deduplicate(normalized)

    assert len(unique) == 3
    assert dup_count == 1
    assert unique[0]["username"] == "Alice"
    assert unique[0]["text"] == "Great phone with excellent battery!"
    assert unique[0]["likes"] == 5

def test_pagination_manager_lifecycle():
    """Tests pagination throttling and limit stopping conditions."""
    pm = PaginationManager(max_items=50, max_pages=10)
    assert pm.should_continue(current_count=0) is True

    # Page 1: 20 items
    pm.record_page(new_items_count=20)
    assert pm.should_continue(current_count=20) is True

    # Page 2: 30 items -> total 50
    pm.record_page(new_items_count=30)
    assert pm.should_continue(current_count=50) is False

def test_extraction_job_manager():
    """Verifies job creation, event updates, and state reporting."""
    job = extraction_job_manager.create_job(platform="meta", method="without_api", url="https://instagram.com/p/123")
    assert job.status == "pending"

    job.update(stage="Extracting...", progress_percent=45, extracted_count=30, status="running")
    dict_repr = job.to_dict()
    assert dict_repr["stage"] == "Extracting..."
    assert dict_repr["progress_percent"] == 45
    assert dict_repr["extracted_count"] == 30
    assert dict_repr["status"] == "running"

    job.complete({"comments": [], "summary": {}})
    assert job.status == "completed"
    assert job.progress_percent == 100

def test_export_service_csv_excel_json():
    """Verifies that export service produces valid CSV, XLSX, and JSON payloads."""
    sample_comments = [
        {
            "id": "c1",
            "username": "Reviewer1",
            "text": "Superb product quality, highly recommend!",
            "like_count": 8,
            "rating": 5,
            "analysis": {"sentiment": "Positive", "dominant_emotion": "Joy", "intent": "Feedback"},
        },
        {
            "id": "c2",
            "username": "Reviewer2",
            "text": "Overpriced and broken on arrival.",
            "like_count": 1,
            "rating": 1,
            "analysis": {"sentiment": "Negative", "dominant_emotion": "Anger", "intent": "Complaint"},
        },
    ]

    # CSV
    csv_bytes, csv_filename, csv_mime = export_service.export_csv(sample_comments, platform="amazon", title="Sample")
    assert len(csv_bytes) > 0
    assert csv_filename.endswith(".csv")
    assert "text/csv" in csv_mime
    assert b"Superb product quality" in csv_bytes

    # Excel
    xlsx_bytes, xlsx_filename, xlsx_mime = export_service.export_excel(sample_comments, platform="amazon", title="Sample")
    assert len(xlsx_bytes) > 0
    assert xlsx_filename.endswith(".xlsx")

    # JSON
    json_bytes, json_filename, json_mime = export_service.export_json(
        {"comments": sample_comments}, platform="amazon", title="Sample"
    )
    assert len(json_bytes) > 0
    assert json_filename.endswith(".json")
    assert b"Reviewer1" in json_bytes

def test_api_detect_endpoint():
    """Tests /api/v1/scraper/detect route."""
    res = client.get("/api/v1/scraper/detect?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert res.status_code == 200
    data = res.json()
    assert data["platform"] == "youtube"
    assert data["category"] == "youtube"
    assert data["is_valid"] is True

def test_api_meta_status_endpoint():
    """Tests /api/v1/meta/status route."""
    res = client.get("/api/v1/meta/status")
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "meta"
    assert "instagram" in data["platforms"]
    assert "facebook" in data["platforms"]

