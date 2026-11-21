import logging
from fastapi import APIRouter, HTTPException, status
from ...schemas.ecommerce import (
    EcommerceAnalyzeRequest,
    EcommerceManualAnalyzeRequest,
    EcommerceResponseSchema,
)
from ...services.ecommerce_service import ecommerce_service

logger = logging.getLogger("socialpulse.ecommerce.api")
router = APIRouter(prefix="/ecommerce", tags=["E-Commerce Product Intelligence"])

@router.post("/analyze", response_model=EcommerceResponseSchema)
async def analyze_ecommerce_product(body: EcommerceAnalyzeRequest):
    """
    Ingests and analyzes genuine customer reviews from an E-Commerce product URL (Flipkart, Amazon, etc.).
    Maintains strict audit values: reported, retrieved, unique, and analyzed reviews.
    Extracts Top Complaints with verified real excerpts.
    """
    try:
        result = await ecommerce_service.analyze_product_url(
            url=body.url,
            max_reviews=body.max_reviews,
        )
        return result
    except ValueError as val_err:
        logger.warning("Invalid E-Commerce input: %s", str(val_err))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        logger.error("Error analyzing e-commerce product: %s", str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while analyzing e-commerce product: {str(exc)}",
        )

@router.post("/analyze-manual", response_model=EcommerceResponseSchema)
async def analyze_ecommerce_manual(body: EcommerceManualAnalyzeRequest):
    """
    Analyzes user-imported customer reviews (CSV, Excel, JSON or manual paste)
    for products where automated scraping is restricted or when analyzing offline datasets.
    """
    try:
        reviews_dicts = [r.model_dump() for r in body.reviews]
        result = ecommerce_service.analyze_manual_reviews(
            reviews_data=reviews_dicts,
            product_title=body.title,
            brand=body.brand,
            price=body.price,
        )
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze imported reviews: {str(exc)}",
        )

@router.get("/detect")
async def detect_ecommerce_url(url: str):
    """Detects e-commerce platform and validates URL format."""
    try:
        platform = ecommerce_service.detect_platform(url)
        return {
            "valid": bool(url.strip().startswith("http")),
            "platform": platform,
            "url": url.strip(),
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}

