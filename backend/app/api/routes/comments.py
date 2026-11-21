import uuid
import json
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from ...core.database import get_db
from ...models.comment import Comment
from ...models.sentiment import SentimentAnalysis
from ...models.emotion import EmotionAnalysis
from ...models.intent import IntentAnalysis
from ...models.emoji import EmojiAnalysis
from ...models.moderation import ModerationAnalysis
from ...models.moderation_action import ModerationAction
from ...schemas.comments import ModerationReviewRequest

router = APIRouter(prefix="/comments", tags=["Comments & Deep Dives"])

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
    sort_by: str = "date_desc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Comment)

    if video_id:
        query = query.filter(Comment.video_id == video_id)
    if platform:
        query = query.filter(Comment.platform == platform)
    if search:
        query = query.filter(Comment.text.ilike(f"%{search}%"))

    if sentiment:
        query = query.join(SentimentAnalysis).filter(SentimentAnalysis.sentiment == sentiment)
    if emotion:
        query = query.join(EmotionAnalysis).filter(EmotionAnalysis.dominant_emotion == emotion)
    if intent:
        query = query.join(IntentAnalysis).filter(IntentAnalysis.primary_intent == intent)
    if spam_only:
        query = query.join(ModerationAnalysis).filter(ModerationAnalysis.spam_probability >= 0.5)
    elif min_toxicity > 0.0:
        query = query.join(ModerationAnalysis).filter(ModerationAnalysis.toxicity_score >= min_toxicity)

    total = query.count()

    if sort_by == "likes_desc":
        query = query.order_by(desc(Comment.like_count))
    elif sort_by == "date_asc":
        query = query.order_by(asc(Comment.published_at))
    else:
        query = query.order_by(desc(Comment.published_at))

    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    results = []
    for c in items:
        results.append({
            "id": c.id,
            "platform_id": c.platform_comment_id,
            "platform": c.platform,
            "author": c.author_username or "user",
            "text": c.text,
            "likes": c.like_count,
            "published_at": c.published_at.isoformat() if c.published_at else None,
            "is_reply": c.is_reply,
            "analysis": {
                "sentiment": c.sentiment_analysis.sentiment if c.sentiment_analysis else "Neutral",
                "sentiment_confidence": c.sentiment_analysis.confidence if c.sentiment_analysis else 0.5,
                "dominant_emotion": c.emotion_analysis.dominant_emotion if c.emotion_analysis else "Neutral",
                "primary_intent": c.intent_analysis.primary_intent if c.intent_analysis else "General Discussion",
                "is_spam": bool(c.moderation_analysis.spam_probability >= 0.5) if c.moderation_analysis else False,
                "toxicity_score": c.moderation_analysis.toxicity_score if c.moderation_analysis else 0.0,
                "recommended_action": c.moderation_analysis.recommendation if c.moderation_analysis else "Clear",
            }
        })

    return {
        "comments": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total > 0 else 1,
    }

@router.get("/{comment_id}")
def get_comment_deep_dive(comment_id: str, db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(
        (Comment.id == comment_id) | (Comment.platform_comment_id == comment_id)
    ).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    emojis_list = []
    if comment.emoji_analysis and comment.emoji_analysis.emojis_json:
        try:
            emojis_list = json.loads(comment.emoji_analysis.emojis_json)
        except Exception:
            pass

    return {
        "id": comment.id,
        "platform_comment_id": comment.platform_comment_id,
        "platform": comment.platform,
        "video_id": comment.video_id,
        "author": comment.author_username,
        "text": comment.text,
        "likes": comment.like_count,
        "published_at": comment.published_at.isoformat() if comment.published_at else None,
        "sentiment": {
            "sentiment": comment.sentiment_analysis.sentiment if comment.sentiment_analysis else "Neutral",
            "confidence": comment.sentiment_analysis.confidence if comment.sentiment_analysis else 0.5,
            "probabilities": {
                "positive": comment.sentiment_analysis.positive_score if comment.sentiment_analysis else 0.0,
                "negative": comment.sentiment_analysis.negative_score if comment.sentiment_analysis else 0.0,
                "neutral": comment.sentiment_analysis.neutral_score if comment.sentiment_analysis else 1.0,
            } if comment.sentiment_analysis else {},
        },
        "emotion": {
            "dominant_emotion": comment.emotion_analysis.dominant_emotion if comment.emotion_analysis else "Neutral",
            "scores": {
                "joy": comment.emotion_analysis.joy_score if comment.emotion_analysis else 0.0,
                "love": comment.emotion_analysis.love_score if comment.emotion_analysis else 0.0,
                "excitement": comment.emotion_analysis.excitement_score if comment.emotion_analysis else 0.0,
                "anger": comment.emotion_analysis.anger_score if comment.emotion_analysis else 0.0,
                "sadness": comment.emotion_analysis.sadness_score if comment.emotion_analysis else 0.0,
                "surprise": comment.emotion_analysis.surprise_score if comment.emotion_analysis else 0.0,
                "fear": comment.emotion_analysis.fear_score if comment.emotion_analysis else 0.0,
                "disgust": comment.emotion_analysis.disgust_score if comment.emotion_analysis else 0.0,
                "frustration": comment.emotion_analysis.frustration_score if comment.emotion_analysis else 0.0,
                "curiosity": comment.emotion_analysis.curiosity_score if comment.emotion_analysis else 0.0,
            } if comment.emotion_analysis else {},
        },
        "intent": {
            "primary_intent": comment.intent_analysis.primary_intent if comment.intent_analysis else "General Discussion",
            "confidence": comment.intent_analysis.intent_confidence if comment.intent_analysis else 0.5,
        },
        "emoji": {
            "emoji_count": comment.emoji_analysis.emoji_count if comment.emoji_analysis else 0,
            "unique_emojis": emojis_list,
            "is_emoji_only": comment.emoji_analysis.is_emoji_only if comment.emoji_analysis else False,
            "interpretation": comment.emoji_analysis.contextual_interpretation if comment.emoji_analysis else None,
        },
        "moderation": {
            "toxicity_score": comment.moderation_analysis.toxicity_score if comment.moderation_analysis else 0.0,
            "spam_probability": comment.moderation_analysis.spam_probability if comment.moderation_analysis else 0.0,
            "is_duplicate": comment.moderation_analysis.is_duplicate if comment.moderation_analysis else False,
            "recommendation": comment.moderation_analysis.recommendation if comment.moderation_analysis else "Clear",
            "risk_reason": comment.moderation_analysis.risk_reason if comment.moderation_analysis else None,
        },
    }

@router.post("/{comment_id}/review")
def review_comment_moderation(comment_id: str, body: ModerationReviewRequest, db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(
        (Comment.id == comment_id) | (Comment.platform_comment_id == comment_id)
    ).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    action = ModerationAction(
        id=str(uuid.uuid4()),
        comment_id=comment.id,
        action_type=body.action,
        actor="human_moderator",
        reason=body.notes or f"Manual review marked as {body.action}",
    )
    db.add(action)
    db.commit()

    return {
        "status": "success",
        "action": body.action,
        "comment_id": comment.id,
        "message": f"Action '{body.action}' recorded for comment {comment.id}."
    }
