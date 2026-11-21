import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class SentimentAnalysis(Base):
    __tablename__ = "sentiment_analyses"

    id = Column(String(36), primary_key=True, index=True)
    comment_id = Column(String(36), ForeignKey("comments.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    sentiment = Column(String(20), nullable=False, index=True) # Positive, Negative, Neutral, Mixed
    confidence = Column(Float, nullable=False)
    positive_score = Column(Float, default=0.0)
    negative_score = Column(Float, default=0.0)
    neutral_score = Column(Float, default=0.0)
    model_version = Column(String(50), default="multilingual-sentiment-v1")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    comment = relationship("Comment", back_populates="sentiment_analysis")

