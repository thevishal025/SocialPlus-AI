import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class EmotionAnalysis(Base):
    __tablename__ = "emotion_analyses"

    id = Column(String(36), primary_key=True, index=True)
    comment_id = Column(String(36), ForeignKey("comments.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    dominant_emotion = Column(String(50), nullable=False, index=True)
    joy_score = Column(Float, default=0.0)
    love_score = Column(Float, default=0.0)
    excitement_score = Column(Float, default=0.0)
    anger_score = Column(Float, default=0.0)
    sadness_score = Column(Float, default=0.0)
    surprise_score = Column(Float, default=0.0)
    fear_score = Column(Float, default=0.0)
    disgust_score = Column(Float, default=0.0)
    frustration_score = Column(Float, default=0.0)
    curiosity_score = Column(Float, default=0.0)
    model_version = Column(String(50), default="multilingual-emotion-v1")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    comment = relationship("Comment", back_populates="emotion_analysis")

