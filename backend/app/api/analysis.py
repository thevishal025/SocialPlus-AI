import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.analysis import PreviewRequest, AnalysisResponseSchema
from ..engines.pipeline import pipeline
from ..evaluation.evaluator import evaluator
from ..models.job import AnalysisJob
from ..models.video import Video
from ..models.comment import Comment

router = APIRouter(prefix="/analysis", tags=["General Analysis Pipeline"])

@router.post("/preview", response_model=AnalysisResponseSchema)
async def preview_analysis(body: PreviewRequest):
    raw_comments = [
        {
            "id": f"upload-{i}",
            "platform": "uploaded",
            "content_id": "uploaded-dataset",
            "content_title": "Custom Ingested Comment Batch",
            "username": f"user_{i+1}",
            "text": text,
            "like_count": 0,
            "is_reply": False,
        }
        for i, text in enumerate(body.comments)
    ]

    processed = pipeline.process_comments(raw_comments)
    return AnalysisResponseSchema(
        video={
            "id": "upload-batch",
            "platform": "uploaded",
            "title": "Uploaded Comments Dataset",
            "channel": "Batch Ingestion",
            "comment_count": len(body.comments),
        },
        comments=processed["comments"],
        summary=processed["summary"],
        notice="Direct dataset processed across all 5 AI engines without external API dependencies."
    )

@router.post("/start")
async def start_analysis_job(platform: str, target_id: str, db: Session = Depends(get_db)):
    job_id = str(uuid.uuid4())
    job = AnalysisJob(
        id=job_id,
        platform=platform,
        status="in_progress",
        created_at=datetime.datetime.utcnow(),
    )
    db.add(job)
    db.commit()
    return {"job_id": job_id, "status": "in_progress"}

@router.get("/{job_id}/status")
async def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return {
        "job_id": job.id,
        "status": job.status,
        "total_comments": job.total_comments,
        "processed_comments": job.processed_comments,
        "created_at": job.created_at,
        "completed_at": job.completed_at,
    }

@router.get("/{job_id}/results", response_model=AnalysisResponseSchema)
async def get_job_results(job_id: str, db: Session = Depends(get_db)):
    job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Job is in '{job.status}' state, not yet completed.")

    video = db.query(Video).filter(Video.id == job.video_id).first()
    comments = db.query(Comment).filter(Comment.video_id == job.video_id).all()

    formatted_comments = []
    for c in comments:
        formatted_comments.append({
            "id": c.platform_comment_id,
            "platform": c.platform,
            "content_id": video.platform_video_id if video else "",
            "content_title": video.title if video else "",
            "username": c.author_username or "user",
            "text": c.text,
            "like_count": c.like_count,
            "published_at": c.published_at.isoformat() if c.published_at else None,
            "analysis": pipeline.process_comment(c.text),
        })

    summary = pipeline.summarize(formatted_comments)
    return AnalysisResponseSchema(
        job_id=job.id,
        video={
            "id": video.platform_video_id if video else "",
            "platform": video.platform if video else "unknown",
            "title": video.title if video else "Analyzed Session",
            "views": video.view_count if video else 0,
            "likes": video.like_count if video else 0,
        } if video else None,
        comments=formatted_comments,
        summary=summary,
    )

@router.get("/evaluation/metrics")
async def get_evaluation_metrics():
    """Runs gold-standard multilingual benchmark evaluation (Precision, Recall, F1, Hindi, Hinglish, English, Emoji-only)."""
    return evaluator.run_evaluation()

