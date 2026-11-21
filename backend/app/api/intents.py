from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.intent import IntentAnalysis
from ..models.comment import Comment

router = APIRouter(prefix="/intents", tags=["Intent Intelligence"])

@router.get("/analytics")
def get_intent_analytics(video_id: str = None, db: Session = Depends(get_db)):
    query = db.query(IntentAnalysis)
    if video_id:
        query = query.join(Comment).filter(Comment.video_id == video_id)

    total = query.count()
    if total == 0:
        return {
            "total_analyzed": 0,
            "distribution": {},
            "percentages": {},
        }

    counts = dict(
        db.query(IntentAnalysis.primary_intent, func.count(IntentAnalysis.id))
        .group_by(IntentAnalysis.primary_intent)
        .all()
    )

    percentages = {
        intent: round(count / total * 100, 1) for intent, count in counts.items()
    }

    return {
        "total_analyzed": total,
        "distribution": counts,
        "percentages": percentages,
    }

