"""
Meta Platform Intelligence Routes (Instagram + Facebook) for SocialPlus.ai.
Combines Instagram and Facebook into a single unified category with:
1. Meta API
2. Meta Universal Scraper (Without API)
3. Upload Data (CSV/Excel/JSON)
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...services.universal_scraper_orchestrator import universal_scraper_orchestrator
from ...services.meta_instagram_service import meta_instagram_service
from ...services.rapidapi_instagram_service import rapidapi_instagram_service
from ...scrapers.facebook_adapter import facebook_adapter

logger = logging.getLogger("socialpulse.meta.api")
router = APIRouter(prefix="/meta", tags=["Meta Intelligence (Instagram + Facebook)"])

class MetaAnalyzeRequest(BaseModel):
    url: str = Field(..., description="Instagram or Facebook post/reel URL")
    platform: str = Field("instagram", description="'instagram' or 'facebook'")
    method: str = Field("without_api", description="'without_api' or 'official_api'")
    max_comments: int = Field(200, ge=1, le=1000000, description="Comment sample limit (1 to 1,000,000)")
    mode: str = Field("limit", description="'limit' or 'all'")

@router.post("/analyze")
async def analyze_meta_content(body: MetaAnalyzeRequest, db: Session = Depends(get_db)):
    """
    Analyzes comments from Instagram or Facebook via:
    - Method 1: Meta API
    - Method 2: Meta Universal Scraper (Without API)
    """
    platform = body.platform.lower().strip()
    if platform not in ("instagram", "facebook"):
        platform = "instagram"

    try:
        result = await universal_scraper_orchestrator.scrape_and_analyze(
            url=body.url,
            platform=platform,
            max_items=body.max_comments,
            mode=body.mode,
            method=body.method,
            db=db,
        )
        return result
    except ValueError as val_err:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "platform": platform,
                "method": body.method,
                "error": str(val_err),
                "can_switch_to_csv": True,
                "status": "failed",
            },
        )
    except Exception as exc:
        logger.error("Meta analysis error on %s: %s", body.url, str(exc), exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "platform": platform,
                "method": body.method,
                "error": str(exc),
                "can_switch_to_csv": True,
                "status": "failed",
            },
        )

@router.get("/status")
async def meta_integrations_status():
    """Returns configuration status for Instagram and Facebook integrations."""
    return {
        "category": "meta",
        "platforms": {
            "instagram": {
                "name": "Instagram",
                "official_api_configured": meta_instagram_service.is_configured(),
                "rapidapi_configured": rapidapi_instagram_service.is_configured(),
                "without_api_available": True,
                "upload_available": True,
            },
            "facebook": {
                "name": "Facebook",
                "official_api_configured": bool(facebook_adapter.access_token),
                "without_api_available": True,
                "upload_available": True,
            },
        },
    }

