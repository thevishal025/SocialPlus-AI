import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

class EmojiAnalysis(Base):
    __tablename__ = "emoji_analyses"

    id = Column(String(36), primary_key=True, index=True)
    comment_id = Column(String(36), ForeignKey("comments.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    emojis_json = Column(Text, nullable=True) # list of emojis found
    emoji_count = Column(Integer, default=0)
    is_emoji_only = Column(Boolean, default=False)
    dominant_emoji = Column(String(20), nullable=True)
    contextual_interpretation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    comment = relationship("Comment", back_populates="emoji_analysis")

