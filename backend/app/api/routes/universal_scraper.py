"""
Universal Scraper Engine API Routes for SocialPlus.ai.
Endpoints:
- POST /api/v1/scraper/extract: Universal extraction & AI analysis
- GET  /api/v1/scraper/detect: Auto-detection of platform and category
- GET  /api/v1/scraper/jobs/{job_id}: Real-time extraction status & event stream
- POST /api/v1/scraper/export: Multi-format data export (CSV, Excel, JSON)
- POST /api/v1/scraper/preview-file: Shared file preview
- POST /api/v1/scraper/process-file: Shared file import into AI pipeline
"""
import json
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...services.platform_detector import inspect_url
from ...services.universal_scraper_orchestrator import universal_scraper_orchestrator
from ...services.extraction_job_manager import extraction_job_manager
from ...services.export_service import export_service
from ...services.file_import_service import file_import_service

logger = logging.getLogger("socialpulse.scraper.api")
router = APIRouter(prefix="/scraper", tags=["Universal Scraper AI Engine"])

class UniversalScrapeRequest(BaseModel):
    url: str = Field(..., description="Target content or product URL")
    platform: Optional[str] = Field(None, description="Optional explicit platform (youtube, instagram, facebook, amazon, flipkart, etc.)")
    max_items: int = Field(250, ge=1, le=1000000, description="Comment or review limit (1 to 1,000,000)")
    mode: str = Field("limit", description="'limit' or 'all'")
    method: str = Field("without_api", description="'without_api' or 'official_api'")
    job_id: Optional[str] = Field(None, description="Optional client-generated job ID")

class ExportRequest(BaseModel):
    comments: List[Dict[str, Any]] = Field(default_factory=list, description="List of comments/reviews to export")
    format: str = Field("csv", description="'csv', 'xlsx', or 'json'")
    platform: str = Field("socialplus", description="Platform name for filename")
    title: str = Field("Analysis Report", description="Title for export file")
    summary: Optional[Dict[str, Any]] = Field(None, description="Optional intelligence summary")

@router.get("/detect")
async def detect_url_platform(url: str):
    """Auto-detects platform and category from a submitted URL."""
    if not url:
        raise HTTPException(status_code=400, detail="URL parameter is required.")
    return inspect_url(url)

@router.post("/extract")
async def extract_and_analyze(body: UniversalScrapeRequest, db: Session = Depends(get_db)):
    """
    Main extraction endpoint for YouTube, Meta (Instagram & Facebook), and E-Commerce.
    Dispatches to the Universal Scraper Orchestrator and runs the 5 AI intelligence engines.
    """
    try:
        result = await universal_scraper_orchestrator.scrape_and_analyze(
            url=body.url,
            platform=body.platform,
            max_items=body.max_items,
            mode=body.mode,
            method=body.method,
            job_id=body.job_id,
            db=db,
        )
        return result
    except ValueError as val_err:
        logger.warning("Scraper validation error: %s", str(val_err))
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": str(val_err),
                "can_switch_to_csv": True,
                "status": "failed",
            },
        )
    except Exception as exc:
        logger.error("Scraper execution error: %s", str(exc), exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": f"Scraper execution error: {str(exc)}",
                "can_switch_to_csv": True,
                "status": "failed",
            },
        )

@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Retrieves live extraction metrics, stage, and completion status."""
    job = extraction_job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Extraction job '{job_id}' not found.")
    return job.to_dict()

@router.post("/export")
async def export_data(body: ExportRequest):
    """Exports comments and intelligence metrics to CSV, Excel, or JSON."""
    fmt = body.format.lower().strip()
    if fmt == "xlsx" or fmt == "excel":
        file_bytes, filename, media_type = export_service.export_excel(
            comments=body.comments,
            platform=body.platform,
            title=body.title,
            summary=body.summary,
        )
    elif fmt == "json":
        data_payload = {
            "platform": body.platform,
            "title": body.title,
            "summary": body.summary,
            "comments": body.comments,
        }
        file_bytes, filename, media_type = export_service.export_json(
            data=data_payload,
            platform=body.platform,
            title=body.title,
        )
    else:  # csv
        file_bytes, filename, media_type = export_service.export_csv(
            comments=body.comments,
            platform=body.platform,
            title=body.title,
        )

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )

@router.post("/preview-file")
async def preview_upload_file(file: UploadFile = File(...)):
    """Preview columns and suggested mapping for CSV, Excel, or JSON uploads."""
    try:
        contents = await file.read()
        return file_import_service.preview_file(contents, file.filename or "uploaded_data")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to preview file: {str(exc)}")

@router.post("/process-file")
async def process_upload_file(
    file: UploadFile = File(...),
    platform: str = Form("youtube"),
    mapping: str = Form("{}"),
    title: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    price: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """Processes uploaded file, deduplicates, and runs 5 AI intelligence engines."""
    try:
        column_mapping = json.loads(mapping)
        contents = await file.read()
        return file_import_service.process_import(
            contents=contents,
            filename=file.filename or "uploaded_data",
            platform=platform,
            column_mapping=column_mapping,
            title=title,
            brand=brand,
            price=price,
            db=db,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        logger.error("Error processing file import: %s", str(exc), exc_info=True)
        raise HTTPException(status_code=500, detail=f"File import failed: {str(exc)}")
