from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ...core.database import get_db
from ...models.sentiment import SentimentAnalysis
from ...models.emotion import EmotionAnalysis
from ...models.intent import IntentAnalysis
from ...models.emoji import EmojiAnalysis
from ...models.moderation import ModerationAnalysis
from ...models.comment import Comment

router = APIRouter(prefix="/analytics", tags=["Cross-Engine Analytics"])

@router.get("/overview")
def get_overview_analytics(video_id: Optional[str] = None, db: Session = Depends(get_db)):
    comment_q = db.query(Comment)
    if video_id:
        comment_q = comment_q.filter(Comment.video_id == video_id)
    total_comments = comment_q.count()

    sentiment_q = db.query(SentimentAnalysis)
    if video_id:
        sentiment_q = sentiment_q.join(Comment).filter(Comment.video_id == video_id)
    
    sentiment_counts = dict(
        sentiment_q.with_entities(SentimentAnalysis.sentiment, func.count(SentimentAnalysis.id))
        .group_by(SentimentAnalysis.sentiment)
        .all()
    )

    pos = sentiment_counts.get("Positive", 0)
    neg = sentiment_counts.get("Negative", 0)
    total_sent = sum(sentiment_counts.values()) or 1
    net_score = round(((pos - neg) / total_sent) * 100, 1) if total_comments > 0 else 0.0

    flagged_q = db.query(ModerationAnalysis).filter(ModerationAnalysis.recommendation != "Clear")
    if video_id:
        flagged_q = flagged_q.join(Comment).filter(Comment.video_id == video_id)
    flagged_count = flagged_q.count()

    return {
        "total_comments": total_comments,
        "net_sentiment_score": net_score,
        "sentiment_counts": sentiment_counts,
        "flagged_moderation_count": flagged_count,
        "moderation_risk_rate": round((flagged_count / max(1, total_comments)) * 100, 1),
    }

@router.get("/sentiment")
def get_sentiment_analytics(video_id: Optional[str] = None, db: Session = Depends(get_db)):
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
        query.with_entities(SentimentAnalysis.sentiment, func.count(SentimentAnalysis.id))
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

    avg_conf = query.with_entities(func.avg(SentimentAnalysis.confidence)).scalar() or 0.85

    return {
        "total_analyzed": total,
        "distribution": {"Positive": pos, "Negative": neg, "Neutral": neu, "Mixed": mix},
        "percentages": {"Positive": pos_pct, "Negative": neg_pct, "Neutral": neu_pct, "Mixed": mix_pct},
        "net_sentiment_score": round(pos_pct - neg_pct, 1),
        "average_confidence": round(float(avg_conf), 2),
    }

@router.get("/emotions")
def get_emotion_analytics(video_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(EmotionAnalysis)
    if video_id:
        query = query.join(Comment).filter(Comment.video_id == video_id)

    total = query.count()
    if total == 0:
        return {"total_analyzed": 0, "dominant_emotion": "Neutral", "distribution": {}, "percentages": {}}

    counts = dict(
        query.with_entities(EmotionAnalysis.dominant_emotion, func.count(EmotionAnalysis.id))
        .group_by(EmotionAnalysis.dominant_emotion)
        .all()
    )

    dominant = max(counts.items(), key=lambda x: x[1])[0] if counts else "Neutral"
    percentages = {k: round(v / total * 100, 1) for k, v in counts.items()}

    return {
        "total_analyzed": total,
        "dominant_emotion": dominant,
        "distribution": counts,
        "percentages": percentages,
    }

@router.get("/intents")
def get_intent_analytics(video_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(IntentAnalysis)
    if video_id:
        query = query.join(Comment).filter(Comment.video_id == video_id)

    total = query.count()
    if total == 0:
        return {"total_analyzed": 0, "distribution": {}, "action_required_count": 0}

    counts = dict(
        query.with_entities(IntentAnalysis.primary_intent, func.count(IntentAnalysis.id))
        .group_by(IntentAnalysis.primary_intent)
        .all()
    )

    action_count = query.filter(IntentAnalysis.primary_intent.in_(["Questioning", "Complaint", "Request", "Feedback"])).count()

    return {
        "total_analyzed": total,
        "distribution": counts,
        "percentages": {k: round(v / total * 100, 1) for k, v in counts.items()},
        "action_required_count": action_count,
    }

@router.get("/moderation")
def get_moderation_analytics(video_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ModerationAnalysis)
    if video_id:
        query = query.join(Comment).filter(Comment.video_id == video_id)

    total = query.count()
    if total == 0:
        return {"total_analyzed": 0, "flagged_count": 0, "recommendations": {}, "spam_count": 0}

    flagged = query.filter(ModerationAnalysis.recommendation != "Clear").count()
    spam = query.filter(ModerationAnalysis.spam_probability >= 0.5).count()
    
    actions = dict(
        query.with_entities(ModerationAnalysis.recommendation, func.count(ModerationAnalysis.id))
        .group_by(ModerationAnalysis.recommendation)
        .all()
    )

    return {
        "total_analyzed": total,
        "flagged_count": flagged,
        "flagged_rate": round(flagged / total * 100, 1),
        "spam_count": spam,
        "recommended_actions": actions,
    }
