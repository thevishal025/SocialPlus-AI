"""
Platform Detector for SocialPlus.ai Universal Scraper AI Engine.
Detects platform identity, category, and URL validity.
Categories:
  1. youtube
  2. meta (instagram, facebook)
  3. ecommerce (amazon, flipkart, meesho, myntra, ajio, snapdeal, ebay, shopify, generic)
"""
import re
from typing import Dict, Any, Tuple
from urllib.parse import urlparse

PLATFORM_CATEGORIES = {
    "youtube": "youtube",
    "instagram": "meta",
    "facebook": "meta",
    "amazon": "ecommerce",
    "flipkart": "ecommerce",
    "meesho": "ecommerce",
    "myntra": "ecommerce",
    "ajio": "ecommerce",
    "snapdeal": "ecommerce",
    "ebay": "ecommerce",
    "shopify": "ecommerce",
    "croma": "ecommerce",
    "tatacliq": "ecommerce",
    "jiomart": "ecommerce",
    "nykaa": "ecommerce",
    "generic_ecommerce": "ecommerce",
}

PLATFORM_DISPLAY_NAMES = {
    "youtube": "YouTube",
    "instagram": "Instagram",
    "facebook": "Facebook",
    "amazon": "Amazon",
    "flipkart": "Flipkart",
    "meesho": "Meesho",
    "myntra": "Myntra",
    "ajio": "AJIO",
    "snapdeal": "Snapdeal",
    "ebay": "eBay",
    "shopify": "Shopify Store",
    "croma": "Croma",
    "tatacliq": "Tata CLiQ",
    "jiomart": "JioMart",
    "nykaa": "Nykaa",
    "generic_ecommerce": "E-Commerce Store",
}

def detect_platform(url: str) -> str:
    """
    Detects the specific platform from a URL string.
    Returns standard platform key (e.g. 'youtube', 'instagram', 'facebook', 'amazon', etc.).
    """
    if not url or not url.strip():
        return "unsupported"

    url_lower = url.lower().strip()

    # YouTube
    if any(d in url_lower for d in ["youtube.com", "youtu.be"]):
        return "youtube"

    # Meta platforms
    if "instagram.com" in url_lower:
        return "instagram"
    if any(d in url_lower for d in ["facebook.com", "fb.com", "fb.watch", "m.facebook.com"]):
        return "facebook"

    # E-commerce platforms
    if any(d in url_lower for d in ["amazon.in", "amazon.com", "amzn.to", "amzn.in"]):
        return "amazon"
    if any(d in url_lower for d in ["flipkart.com", "dl.flipkart.com"]):
        return "flipkart"
    if "meesho.com" in url_lower:
        return "meesho"
    if "myntra.com" in url_lower:
        return "myntra"
    if "ajio.com" in url_lower:
        return "ajio"
    if "snapdeal.com" in url_lower:
        return "snapdeal"
    if any(d in url_lower for d in ["ebay.com", "ebay.in", "ebay.co.uk"]):
        return "ebay"
    if any(d in url_lower for d in ["myshopify.com", "/products/", "/collections/"]):
        return "shopify"
    if "nykaa.com" in url_lower:
        return "nykaa"
    if "tatacliq.com" in url_lower:
        return "tatacliq"
    if "jiomart.com" in url_lower:
        return "jiomart"
    if "croma.com" in url_lower:
        return "croma"

    # Generic shopping indicators
    if any(pattern in url_lower for pattern in ["/product/", "/p/", "/item/", "/dp/", "/buy/"]):
        return "generic_ecommerce"

    return "unsupported"

def inspect_url(url: str) -> Dict[str, Any]:
    """
    Comprehensive inspection returning platform, category, display name, and URL validity.
    """
    cleaned = (url or "").strip()
    platform = detect_platform(cleaned)
    category = PLATFORM_CATEGORIES.get(platform, "unsupported")
    display_name = PLATFORM_DISPLAY_NAMES.get(platform, platform.capitalize())

    is_valid_url = bool(re.match(r"^https?://[^\s/$.?#].[^\s]*$", cleaned, re.IGNORECASE))

    return {
        "url": cleaned,
        "is_valid": is_valid_url and platform != "unsupported",
        "platform": platform,
        "category": category,
        "display_name": display_name,
        "supported": platform != "unsupported",
    }
