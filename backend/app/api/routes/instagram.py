import logging
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...schemas.analysis import InstagramAnalyzeRequest, AnalysisResponseSchema
from ...services.analysis_service import analysis_service
from ...services.rapidapi_instagram_service import rapidapi_instagram_service, InstagramAPIError
from ...services.instagram_mcp_service import instagram_mcp_service
from ...services.instagram_automatic_service import instagram_automatic_service, InstagramAutomaticExtractionError
from ...services.meta_instagram_service import meta_instagram_service, MetaInstagramAPIError

logger = logging.getLogger("socialpulse.instagram.api")
router = APIRouter(prefix="/instagram", tags=["Instagram Intelligence"])

@router.post("/analyze")
async def analyze_instagram_post(body: InstagramAnalyzeRequest, db: Session = Depends(get_db)):
    """
    Ingests and analyzes comments from an Instagram Post or Reel URL across 3 supported methods:
    - Method 1: 'official_api' (Meta Graph API / configured API adapter)
    - Method 2: 'automatic_without_api' (Permitted public webpage extraction)
    - Method 3: 'csv_upload' (Handled via file ingestion endpoint)
    Returns full 5-engine AI analysis or structured JSON diagnostics on error.
    """
    method = body.method or "official_api"
    mode = body.mode or "limit"
    try:
        result = await analysis_service.analyze_instagram(
            url=body.url,
            max_comments=body.max_comments,
            method=method,
            mode=mode,
            db=db,
        )
        return {
            "success": True,
            "job_id": None,
            "video": result["video"],
            "comments": result["comments"],
            "summary": result["summary"],
            "notice": result.get("notice"),
            "source_type": result.get("source_type", method),
            "status": result.get("status", "complete"),
            "reported_count": result.get("reported_count"),
            "requested_count": result.get("requested_count"),
            "available_count": result.get("available_count"),
            "extracted_count": result.get("extracted_count"),
            "analyzed_count": result.get("analyzed_count"),
        }
    except InstagramAutomaticExtractionError as auto_err:
        logger.warning(
            "Instagram Automatic Extraction Notice [%s]: %s (Status: %s)",
            auto_err.error_code,
            auto_err.message,
            auto_err.status_code,
        )
        return JSONResponse(
            status_code=auto_err.status_code,
            content=auto_err.to_dict(),
        )
    except MetaInstagramAPIError as meta_err:
        logger.warning(
            "Meta Instagram API Notice [%s]: %s (Status: %s)",
            meta_err.error_code,
            meta_err.message,
            meta_err.status_code,
        )
        return JSONResponse(
            status_code=meta_err.status_code,
            content=meta_err.to_dict(),
        )
    except InstagramAPIError as api_err:
        logger.warning(
            "Instagram API Error [%s]: %s (Status: %s)",
            api_err.error_code,
            api_err.message,
            api_err.status_code,
        )
        return JSONResponse(
            status_code=api_err.status_code,
            content=api_err.to_dict(),
        )
    except ValueError as val_err:
        logger.warning("Invalid input for Instagram retrieval: %s", str(val_err))
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "platform": "instagram",
                "method": method,
                "error_code": "INVALID_REQUEST",
                "message": str(val_err),
                "details": "The provided Instagram link format is invalid.",
                "detail": str(val_err),
                "retryable": False,
            },
        )
    except Exception as exc:
        logger.error("Unexpected error in Instagram pipeline: %s", str(exc), exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "platform": "instagram",
                "method": method,
                "error_code": "INTERNAL_BACKEND_ERROR",
                "message": "Internal processing error while analyzing Instagram comments.",
                "details": str(exc),
                "detail": f"Internal processing error: {str(exc)}",
                "retryable": True,
            },
        )

@router.post("/analyze-automatic")
async def analyze_instagram_automatic(body: InstagramAnalyzeRequest, db: Session = Depends(get_db)):
    """
    Dedicated endpoint for Method 2: Automatic Instagram Comment Extraction Without API.
    """
    body.method = "automatic_without_api"
    return await analyze_instagram_post(body, db)

@router.get("/validate")
async def validate_instagram_url(url: str):
    try:
        shortcode = rapidapi_instagram_service.validate_url(url)
        return {"valid": True, "shortcode": shortcode}
    except InstagramAPIError as err:
        return {"valid": False, "error": err.message}
    except Exception as err:
        return {"valid": False, "error": str(err)}

@router.get("/status")
async def instagram_integration_status():
    mcp_configured = instagram_mcp_service.is_configured()
    rest_configured = rapidapi_instagram_service.is_configured()
    meta_configured = meta_instagram_service.is_configured()
    quota_exhausted = rapidapi_instagram_service.is_quota_exhausted()

    return {
        "configured": True,
        "methods": {
            "method_1_official_api": {
                "name": "Official Instagram API",
                "meta_configured": meta_configured,
                "rapidapi_configured": mcp_configured or rest_configured,
                "quota_exhausted": quota_exhausted,
                "status": "ready" if (meta_configured or (rest_configured and not quota_exhausted)) else "quota_exhausted" if quota_exhausted else "unconfigured",
            },
            "method_2_automatic": {
                "name": "Automatic Analysis (Without API)",
                "status": "available",
                "requires_api_key": False,
            },
            "method_3_upload": {
                "name": "CSV / Excel / File Upload",
                "status": "available",
                "supported_formats": [".csv", ".xlsx", ".xls", ".json"],
            },
        },
        "mcp_enabled": mcp_configured,
        "rest_fallback_enabled": rest_configured,
        "provider": "RapidAPI Instagram Scraper Stable API + Meta Graph API",
    }

@router.get("/tools")
async def list_mcp_tools():
    tools = await instagram_mcp_service.list_tools()
    return {"tools_count": len(tools), "tools": tools}
