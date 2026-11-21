import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    video_id = Column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=True, index=True)
    job_id = Column(String(36), ForeignKey("analysis_jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    report_type = Column(String(50), nullable=False) # master, sentiment, emotion, intent, emoji, moderation
    file_format = Column(String(10), nullable=False) # csv, pdf
    file_path = Column(Text, nullable=True)
    summary_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="reports")
    video = relationship("Video", back_populates="reports")
    job = relationship("AnalysisJob", back_populates="reports")

