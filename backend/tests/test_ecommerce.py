import pytest
from app.services.ecommerce_service import ecommerce_service

def test_ecommerce_platform_detection():
    assert ecommerce_service.detect_platform("https://dl.flipkart.com/s/v6zq!mNNNN") == "flipkart"
    assert ecommerce_service.detect_platform("https://www.flipkart.com/samsung-galaxy-a36-5g/p/itmc39f6516e0cab") == "flipkart"
    assert ecommerce_service.detect_platform("https://www.amazon.in/dp/B0CX123456") == "amazon"
    assert ecommerce_service.detect_platform("https://www.amazon.com/dp/B0CX123456") == "amazon"
    assert ecommerce_service.detect_platform("https://mybrandstore.com/item/123") == "ecommerce"

def test_ecommerce_manual_reviews_analysis():
    sample_reviews = [
        {
            "text": "Amazing phone! Display is super vibrant and camera quality is awesome. Love the design ❤️🔥",
            "rating": 5,
            "username": "HappyCustomer",
            "title": "Superb phone"
        },
        {
            "text": "Battery drains too fast and phone heating issue during charging. Performance is slow.",
            "rating": 2,
            "username": "DisappointedBuyer",
            "title": "Poor battery and heating"
        },
        {
            "text": "Fast delivery by courier. Value for money phone with decent sound and speaker.",
            "rating": 4,
            "username": "TechLover",
            "title": "Good value"
        },
        {
            "text": "Battery drains too fast and phone heating issue during charging. Performance is slow.", # duplicate
            "rating": 2,
            "username": "DisappointedBuyer",
            "title": "Poor battery and heating"
        }
    ]

    result = ecommerce_service.analyze_manual_reviews(
        reviews_data=sample_reviews,
        product_title="Samsung Galaxy A36 5G",
        brand="Samsung",
        price="₹24,999"
    )

    assert result["success"] is True
    assert result["reviews_blocked"] is False

    # Check Audit Numbers
    audit = result["audit"]
    assert audit["reported_reviews"] == 4
    assert audit["retrieved_reviews"] == 4
    assert audit["unique_reviews"] == 3 # 1 duplicate removed!
    assert audit["analyzed_reviews"] == 3

    # Check Verified Average Rating
    # Ratings: 5, 2, 4 -> (5+2+4)/3 = 3.67
    assert result["verified_average_rating"] == 3.67

    # Check AI Engines processed
    assert len(result["comments"]) == 3
    for c in result["comments"]:
        assert "analysis" in c
        assert "sentiment" in c["analysis"]
        assert "dominant_emotion" in c["analysis"]
        assert "intent" in c["analysis"]

    # Check Top Complaints
    complaints = result["top_complaints"]
    assert len(complaints) > 0
    complaint_names = [c["name"] for c in complaints]
    assert any("Battery" in name for name in complaint_names)
    assert any("Heating" in name for name in complaint_names)

    # Check Supporting Excerpts are genuine
    for c in complaints:
        assert len(c["excerpts"]) > 0
        for ex in c["excerpts"]:
            assert "DisappointedBuyer" in ex or "★" in ex

    # Check Product Strengths
    strengths = result["product_strengths"]
    assert len(strengths) > 0
    strength_aspects = [s["aspect"] for s in strengths]
    assert any("Display" in aspect or "Value" in aspect or "Audio" in aspect for aspect in strength_aspects)

@pytest.mark.asyncio
async def test_flipkart_samsung_galaxy_a36_url_workflow():
    # Test real extraction for Samsung Galaxy A36 5G Flipkart URL
    test_url = "https://dl.flipkart.com/s/v6zq!mNNNN"
    result = await ecommerce_service.analyze_product_url(test_url, max_reviews=10)

    assert result["success"] is True
    product = result["product"]
    assert "Samsung" in product["title"] or product["brand"] == "Samsung"
    assert product["platform"] == "flipkart"

    audit = result["audit"]
    assert audit["retrieved_reviews"] >= 0
    assert audit["unique_reviews"] >= 0

    if not result["reviews_blocked"]:
        assert audit["unique_reviews"] > 0
        assert len(result["comments"]) == audit["unique_reviews"]
        assert result["verified_average_rating"] is not None
        assert "summary" in result
        assert "top_complaints" in result

