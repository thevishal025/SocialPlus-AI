import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

class ModerationAction(Base):
    __tablename__ = "moderation_actions"

    id = Column(String(36), primary_key=True, index=True)
    comment_id = Column(String(36), ForeignKey("comments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action_taken = Column(String(50), nullable=False) # approve, flag, ignore, hide, delete
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    comment = relationship("Comment", back_populates="moderation_actions")
    user = relationship("User", back_populates="moderation_actions")

