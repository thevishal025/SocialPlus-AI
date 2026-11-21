import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.moderation import ModerationAnalysis
from ..models.moderation_action import ModerationAction
from ..models.comment import Comment
from ..schemas.comments import ModerationReviewRequest

router = APIRouter(prefix="/moderation", tags=["Auto Moderation Intelligence"])

@router.get("/analytics")
def get_moderation_analytics(video_id: str = None, db: Session = Depends(get_db)):
    query = db.query(ModerationAnalysis)
    if video_id:
        query = query.join(Comment, ModerationAnalysis.comment_id == Comment.id).filter(Comment.video_id == video_id)

    total = query.count()
    flagged = query.filter(ModerationAnalysis.recommendation != "Clear").count()
    spam = query.filter(ModerationAnalysis.spam_probability > 0.5).count()
    toxic = query.filter(ModerationAnalysis.toxicity_score > 0.25).count()

    return {
        "total_analyzed": total,
        "flagged_count": flagged,
        "spam_count": spam,
        "toxic_count": toxic,
        "clean_count": total - flagged,
    }

@router.post("/{comment_id}/review")
def review_comment_moderation(comment_id: str, body: ModerationReviewRequest, db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(
        (Comment.id == comment_id) | (Comment.platform_comment_id == comment_id)
    ).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")

    action = ModerationAction(
        id=str(uuid.uuid4()),
        comment_id=comment.id,
        action_taken=body.action,
        notes=body.notes,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(action)

    # If action is approve, update recommendation to Clear
    if comment.moderation_analysis:
        if body.action == "approve":
            comment.moderation_analysis.recommendation = "Clear"
        elif body.action in ("flag", "hide", "delete"):
            comment.moderation_analysis.recommendation = body.action.capitalize()

    db.commit()
    return {"success": True, "comment_id": comment_id, "action": body.action}

