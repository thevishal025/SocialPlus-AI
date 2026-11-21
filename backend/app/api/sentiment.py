from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.sentiment import SentimentAnalysis
from ..models.comment import Comment

router = APIRouter(prefix="/sentiment", tags=["Sentiment Intelligence"])

@router.get("/analytics")
def get_sentiment_analytics(video_id: str = None, db: Session = Depends(get_db)):
    query = db.query(SentimentAnalysis)
    if video_id:
        query = query.join(Comment).filter(Comment.video_id == video_id)

    total = query.count()
    if total == 0:
        return {
            "total_analyzed": 0,
            "distribution": {"Positive": 0, "Negative": 0, "Neutral": 0, "Mixed": 0},
            "percentages": {"Positive": 0.0, "Negative": 0.0, "Neutral": 0.0, "Mixed": 0.0},
            "net_sentiment_score": 0.0,
            "average_confidence": 0.0,
        }

    counts = dict(
        db.query(SentimentAnalysis.sentiment, func.count(SentimentAnalysis.id))
        .group_by(SentimentAnalysis.sentiment)
        .all()
    )

    pos = counts.get("Positive", 0)
    neg = counts.get("Negative", 0)
    neu = counts.get("Neutral", 0)
    mix = counts.get("Mixed", 0)

    pos_pct = round(pos / total * 100, 1)
    neg_pct = round(neg / total * 100, 1)
    neu_pct = round(neu / total * 100, 1)
    mix_pct = round(mix / total * 100, 1)

    avg_conf = db.query(func.avg(SentimentAnalysis.confidence)).scalar() or 0.85

    return {
        "total_analyzed": total,
        "distribution": {"Positive": pos, "Negative": neg, "Neutral": neu, "Mixed": mix},
        "percentages": {"Positive": pos_pct, "Negative": neg_pct, "Neutral": neu_pct, "Mixed": mix_pct},
        "net_sentiment_score": round(pos_pct - neg_pct, 1),
        "average_confidence": round(float(avg_conf), 2),
    }

