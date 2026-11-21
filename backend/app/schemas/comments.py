from typing import Optional, Literal
from pydantic import BaseModel, Field

class ModerationReviewRequest(BaseModel):
    action: Literal["approve", "flag", "ignore", "hide", "delete"]
    notes: Optional[str] = None

class CommentFilterParams(BaseModel):
    video_id: Optional[str] = None
    platform: Optional[str] = None
    sentiment: Optional[str] = None
    emotion: Optional[str] = None
    intent: Optional[str] = None
    spam_only: bool = False
    min_toxicity: float = 0.0
    search: Optional[str] = None
    sort_by: str = "date_desc"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

