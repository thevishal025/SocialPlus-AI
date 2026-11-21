import json
from typing import Optional, List, Dict, Any, Union
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...services.file_ingestion_service import file_ingestion_service
from ...schemas.analysis import AnalysisResponseSchema

router = APIRouter(prefix="/ingestion", tags=["Data Ingestion & Import (YouTube & Instagram)"])

class ManualCommentItem(BaseModel):
    text: str
    username: Optional[str] = None
    timestamp: Optional[str] = None
    likes: Optional[int] = 0

class ManualIngestionRequest(BaseModel):
    platform: str = "youtube" # 'youtube' or 'instagram'
    title: Optional[str] = None
    comments: List[Union[str, ManualCommentItem, Dict[str, Any]]]

@router.post("/preview")
async def preview_upload_file(file: UploadFile = File(...)):
    """
    Parses uploaded CSV, XLSX, XLS, or JSON file,
    auto-detects columns, and returns column preview with suggested mappings.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        preview = file_ingestion_service.get_preview(contents, file.filename)
        return preview
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to inspect file '{file.filename}': {str(e)}"
        )

@router.post("/process-file", response_model=AnalysisResponseSchema)
async def process_file_import(
    file: UploadFile = File(...),
    platform: str = Form("youtube"),
    mapping: str = Form("{}"),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Processes the uploaded file (CSV / Excel / JSON) using user-confirmed column mappings,
    runs the shared 5-engine AI pipeline, persists results to the database,
    and returns complete analytics.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        mapping_dict = json.loads(mapping) if mapping else {}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid column mapping format.")

    clean_platform = (platform or "youtube").strip().lower()
    if clean_platform not in ("youtube", "instagram"):
        clean_platform = "youtube"

    try:
        result = file_ingestion_service.process_import(
            contents=contents,
            filename=file.filename,
            platform=clean_platform,
            mapping=mapping_dict,
            content_title=title,
            db=db,
        )
        return AnalysisResponseSchema(
            video=result["video"],
            comments=result["comments"],
            summary=result["summary"],
            notice=result.get("notice"),
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed processing file import: {str(e)}")

@router.post("/manual", response_model=AnalysisResponseSchema)
async def process_manual_ingestion(
    body: ManualIngestionRequest,
    db: Session = Depends(get_db),
):
    """
    Processes manually submitted comments (pasted text or structured rows)
    for YouTube or Instagram through the shared 5-engine AI pipeline and database.
    """
    clean_platform = (body.platform or "youtube").strip().lower()
    if clean_platform not in ("youtube", "instagram"):
        clean_platform = "youtube"

    # Convert pydantic items if needed
    cleaned_comments = []
    for c in body.comments:
        if isinstance(c, ManualCommentItem):
            cleaned_comments.append(c.model_dump())
        elif isinstance(c, dict):
            cleaned_comments.append(c)
        elif isinstance(c, str):
            cleaned_comments.append({"text": c})

    try:
        result = file_ingestion_service.process_manual_comments(
            comments_data=cleaned_comments,
            platform=clean_platform,
            content_title=body.title,
            db=db,
        )
        return AnalysisResponseSchema(
            video=result["video"],
            comments=result["comments"],
            summary=result["summary"],
            notice=result.get("notice"),
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed processing manual comments: {str(e)}")

