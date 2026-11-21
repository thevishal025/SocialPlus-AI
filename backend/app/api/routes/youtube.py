from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...schemas.analysis import YouTubeAnalyzeRequest, AnalysisResponseSchema
from ...services.analysis_service import analysis_service
from ...services.youtube_service import youtube_service

router = APIRouter(prefix="/youtube", tags=["YouTube Intelligence"])

@router.post("/analyze", response_model=AnalysisResponseSchema)
async def analyze_youtube_video(body: YouTubeAnalyzeRequest, db: Session = Depends(get_db)):
    try:
        result = await analysis_service.analyze_youtube(
            url=body.url,
            max_comments=body.max_comments or 250,
            mode=body.mode or "limit",
            db=db,
        )
        return AnalysisResponseSchema(
            video=result["video"],
            comments=result["comments"],
            summary=result["summary"],
            notice=result.get("notice"),
            status=result.get("status", "complete"),
            reported_count=result.get("reported_count"),
            requested_count=result.get("requested_count"),
            available_count=result.get("available_count"),
            extracted_count=result.get("extracted_count"),
            analyzed_count=result.get("analyzed_count"),
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except RuntimeError as run_err:
        raise HTTPException(status_code=502, detail=str(run_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error while analyzing YouTube video: {str(exc)}")

@router.get("/validate")
async def validate_youtube_url(url: str):
    try:
        video_id = youtube_service.validate_url(url)
        return {"valid": True, "video_id": video_id}
    except ValueError as err:
        return {"valid": False, "error": str(err)}

@router.get("/status")
async def youtube_integration_status():
    return {
        "configured": youtube_service.is_configured(),
        "provider": "Google Cloud YouTube Data API v3",
    }

