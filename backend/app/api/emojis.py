from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.emoji import EmojiAnalysis
from ..models.comment import Comment

router = APIRouter(prefix="/emojis", tags=["Emoji Intelligence"])

@router.get("/analytics")
def get_emoji_analytics(video_id: str = None, db: Session = Depends(get_db)):
    query = db.query(EmojiAnalysis)
    if video_id:
        query = query.join(Comment).filter(Comment.video_id == video_id)

    total = query.count()
    emoji_only_count = query.filter(EmojiAnalysis.is_emoji_only == True).count()
    total_emoji_hits = db.query(func.sum(EmojiAnalysis.emoji_count)).scalar() or 0

    return {
        "total_analyzed": total,
        "total_emojis_extracted": int(total_emoji_hits),
        "emoji_only_comments": emoji_only_count,
    }

