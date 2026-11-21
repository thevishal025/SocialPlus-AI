import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

class ModerationAnalysis(Base):
    __tablename__ = "moderation_analyses"

    id = Column(String(36), primary_key=True, index=True)
    comment_id = Column(String(36), ForeignKey("comments.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    spam_probability = Column(Float, default=0.0)
    toxicity_score = Column(Float, default=0.0)
    abuse_categories_json = Column(Text, nullable=True) # harassment, hate_speech, threats
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_comment_id = Column(String(36), ForeignKey("comments.id", ondelete="SET NULL"), nullable=True)
    recommendation = Column(String(50), default="Clear", index=True) # Clear, Review, Flag, Hide, Delete
    risk_reason = Column(Text, nullable=True)
    model_version = Column(String(50), default="automoderation-v1")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    comment = relationship("Comment", foreign_keys=[comment_id], back_populates="moderation_analysis")

