from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.emotion import EmotionAnalysis
from ..models.comment import Comment

router = APIRouter(prefix="/emotions", tags=["Emotional Intelligence"])

@router.get("/analytics")
def get_emotion_analytics(video_id: str = None, db: Session = Depends(get_db)):
    query = db.query(EmotionAnalysis)
    if video_id:
        query = query.join(Comment).filter(Comment.video_id == video_id)

    total = query.count()
    if total == 0:
        return {
            "total_analyzed": 0,
            "distribution": {},
            "percentages": {},
            "dominant_emotion": "Neutral",
        }

    counts = dict(
        db.query(EmotionAnalysis.dominant_emotion, func.count(EmotionAnalysis.id))
        .group_by(EmotionAnalysis.dominant_emotion)
        .all()
    )

    percentages = {
        emo: round(count / total * 100, 1) for emo, count in counts.items()
    }

    dominant = max(counts.items(), key=lambda x: x[1])[0] if counts else "Neutral"

    return {
        "total_analyzed": total,
        "distribution": counts,
        "percentages": percentages,
        "dominant_emotion": dominant,
    }

