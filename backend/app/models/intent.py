import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

class IntentAnalysis(Base):
    __tablename__ = "intent_analyses"

    id = Column(String(36), primary_key=True, index=True)
    comment_id = Column(String(36), ForeignKey("comments.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    primary_intent = Column(String(50), nullable=False, index=True)
    intent_confidence = Column(Float, nullable=False)
    intent_breakdown_json = Column(Text, nullable=True)
    model_version = Column(String(50), default="intent-classifier-v1")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    comment = relationship("Comment", back_populates="intent_analysis")

