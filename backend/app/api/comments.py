from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.comment import Comment
from ..models.sentiment import SentimentAnalysis
from ..models.emotion import EmotionAnalysis
from ..models.intent import IntentAnalysis
from ..models.emoji import EmojiAnalysis
from ..models.moderation import ModerationAnalysis
from ..schemas.analysis import CommentItemSchema, CommentAnalysisSchema
from ..engines.pipeline import pipeline

router = APIRouter(prefix="/comments", tags=["Comment Explorer"])

@router.get("")
def list_comments(
    video_id: Optional[str] = None,
    platform: Optional[str] = None,
    sentiment: Optional[str] = None,
    emotion: Optional[str] = None,
    intent: Optional[str] = None,
    spam_only: bool = False,
    min_toxicity: float = 0.0,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Comment)

    if video_id:
        query = query.filter(Comment.video_id == video_id)
    if platform and platform != "All":
        query = query.filter(Comment.platform == platform)
    if search:
        query = query.filter(Comment.text.ilike(f"%{search}%") | Comment.author_username.ilike(f"%{search}%"))

    # Join engine tables if filtered
    if sentiment and sentiment != "All":
        query = query.join(SentimentAnalysis).filter(SentimentAnalysis.sentiment == sentiment)
    if emotion and emotion != "All":
        query = query.join(EmotionAnalysis).filter(EmotionAnalysis.dominant_emotion == emotion)
    if intent and intent != "All":
        query = query.join(IntentAnalysis).filter(IntentAnalysis.primary_intent == intent)
    if spam_only:
        query = query.join(ModerationAnalysis).filter(ModerationAnalysis.spam_probability > 0.5)
    if min_toxicity > 0:
        query = query.join(ModerationAnalysis).filter(ModerationAnalysis.toxicity_score >= min_toxicity)

    total = query.count()
    comments = query.order_by(Comment.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    formatted = []
    for c in comments:
        # If engine models exist use them, or fallback to real-time analysis
        analysis = pipeline.process_comment(c.text)
        formatted.append({
            "id": c.platform_comment_id,
            "platform": c.platform,
            "content_id": c.video_id,
            "content_title": c.video.title if c.video else "Social Comment",
            "username": c.author_username or "user",
            "text": c.text,
            "like_count": c.like_count,
            "published_at": c.published_at.isoformat() if c.published_at else None,
            "is_reply": c.is_reply,
            "analysis": analysis,
        })

    return {
        "comments": formatted,
        "total": total,
        "page": page,
        "page_size": page_size,
    }

@router.get("/{comment_id}")
def get_comment_details(comment_id: str, db: Session = Depends(get_db)):
    c = db.query(Comment).filter(
        (Comment.id == comment_id) | (Comment.platform_comment_id == comment_id)
    ).first()

    if not c:
        raise HTTPException(status_code=404, detail="Comment not found.")

    analysis = pipeline.process_comment(c.text)
    return {
        "id": c.platform_comment_id,
        "platform": c.platform,
        "content_id": c.video_id,
        "content_title": c.video.title if c.video else "Social Comment",
        "username": c.author_username or "user",
        "text": c.text,
        "like_count": c.like_count,
        "published_at": c.published_at.isoformat() if c.published_at else None,
        "is_reply": c.is_reply,
        "analysis": analysis,
    }

