from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.report import Report
from ..models.comment import Comment
from ..models.video import Video
from ..reporting.csv_generator import csv_generator
from ..reporting.pdf_generator import pdf_generator
from ..engines.pipeline import pipeline
from ..schemas.reports import ExportReportRequest

router = APIRouter(prefix="/reports", tags=["Reporting & Compliance"])

@router.get("")
def list_reports(db: Session = Depends(get_db)):
    reports = db.query(Report).order_by(Report.created_at.desc()).limit(20).all()
    return [
        {
            "id": r.id,
            "report_type": r.report_type,
            "file_format": r.file_format,
            "created_at": r.created_at,
        }
        for r in reports
    ]

@router.post("/export")
def export_report(body: ExportReportRequest, db: Session = Depends(get_db)):
    # Fetch comments from DB or return active session export
    comments_query = db.query(Comment)
    if body.video_id:
        comments_query = comments_query.filter(Comment.video_id == body.video_id)

    db_comments = comments_query.limit(2000).all()
    formatted = []
    for c in db_comments:
        formatted.append({
            "id": c.platform_comment_id,
            "platform": c.platform,
            "content_title": c.video.title if c.video else "Social Media Post",
            "username": c.author_username or "user",
            "text": c.text,
            "like_count": c.like_count,
            "published_at": c.published_at.isoformat() if c.published_at else "",
            "analysis": pipeline.process_comment(c.text),
        })

    summary = pipeline.summarize(formatted)

    if body.format == "csv":
        csv_data = csv_generator.generate_master_csv(formatted)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=socialpulse_report.csv"}
        )
    elif body.format == "pdf":
        pdf_bytes = pdf_generator.generate_pdf(summary, formatted)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=socialpulse_report.pdf"}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format requested.")

