import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    video_id = Column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=True, index=True)
    platform = Column(String(50), nullable=False)
    status = Column(String(50), default="pending", index=True) # pending, in_progress, completed, failed
    total_comments = Column(Integer, default=0)
    processed_comments = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="jobs")
    video = relationship("Video", back_populates="jobs")
    reports = relationship("Report", back_populates="job")

