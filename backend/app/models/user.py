import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    social_accounts = relationship("SocialAccount", back_populates="user", cascade="all, delete-orphan")
    videos = relationship("Video", back_populates="user")
    jobs = relationship("AnalysisJob", back_populates="user")
    reports = relationship("Report", back_populates="user")
    moderation_actions = relationship("ModerationAction", back_populates="user")

