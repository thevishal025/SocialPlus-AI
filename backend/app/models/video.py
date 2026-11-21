import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from ..database import Base

class Video(Base):
    __tablename__ = "videos"

    id = Column(String(36), primary_key=True, index=True)
    platform = Column(String(50), nullable=False, index=True) # 'youtube' | 'instagram' | 'uploaded'
    platform_video_id = Column(String(255), nullable=False, index=True)
    title = Column(Text, nullable=False)
    channel_title = Column(String(255), nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    view_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    published_at = Column(DateTime, nullable=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("platform", "platform_video_id", name="uq_video_platform_id"),
    )

    user = relationship("User", back_populates="videos")
    comments = relationship("Comment", back_populates="video", cascade="all, delete-orphan")
    jobs = relationship("AnalysisJob", back_populates="video")
    reports = relationship("Report", back_populates="video")

