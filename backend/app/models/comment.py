import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from ..database import Base

class Comment(Base):
    __tablename__ = "comments"

    id = Column(String(36), primary_key=True, index=True)
    video_id = Column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String(50), nullable=False, index=True)
    source_type = Column(String(50), default="api", nullable=True) # "api", "file_import", "manual"
    platform_comment_id = Column(String(255), nullable=False, index=True)
    parent_comment_id = Column(String(36), ForeignKey("comments.id", ondelete="SET NULL"), nullable=True, index=True)
    author_username = Column(String(255), nullable=True)
    text = Column(Text, nullable=False)
    like_count = Column(Integer, default=0)
    published_at = Column(DateTime, nullable=True)
    is_reply = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("platform", "platform_comment_id", name="uq_comment_platform_id"),
    )

    video = relationship("Video", back_populates="comments")
    replies = relationship("Comment", backref="parent_comment", remote_side=[id])

    # 1-to-1 relationships with the 5 Intelligence Engines
    sentiment_analysis = relationship("SentimentAnalysis", back_populates="comment", uselist=False, cascade="all, delete-orphan")
    emotion_analysis = relationship("EmotionAnalysis", back_populates="comment", uselist=False, cascade="all, delete-orphan")
    intent_analysis = relationship("IntentAnalysis", back_populates="comment", uselist=False, cascade="all, delete-orphan")
    emoji_analysis = relationship("EmojiAnalysis", back_populates="comment", uselist=False, cascade="all, delete-orphan")
    moderation_analysis = relationship("ModerationAnalysis", foreign_keys="ModerationAnalysis.comment_id", back_populates="comment", uselist=False, cascade="all, delete-orphan")
    moderation_actions = relationship("ModerationAction", back_populates="comment", cascade="all, delete-orphan")

