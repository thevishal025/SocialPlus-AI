from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

class YouTubeAnalyzeRequest(BaseModel):
    url: str = Field(..., description="YouTube video or Shorts URL")
    max_comments: Optional[int] = Field(default=250, ge=1, le=1000000, description="Max comments to fetch (1 to 1,000,000)")
    mode: Optional[str] = Field(default="limit", description="Selection mode: 'limit' or 'all'")

class InstagramAnalyzeRequest(BaseModel):
    url: str = Field(..., description="Instagram post or reel URL or shortcode")
    max_comments: Optional[int] = Field(default=250, ge=1, le=1000000, description="Max comments to fetch (1 to 1,000,000)")
    mode: Optional[str] = Field(default="limit", description="Selection mode: 'limit' or 'all'")
    method: Optional[str] = Field(default="official_api", description="Ingestion method: official_api, automatic_without_api, or csv_upload")

class PreviewRequest(BaseModel):
    comments: List[str] = Field(..., min_length=1, max_length=1000000)

class VideoMetadataSchema(BaseModel):
    id: str
    platform: str
    title: str
    channel: Optional[str] = None
    thumbnail: Optional[str] = None
    views: Optional[int] = 0
    likes: Optional[int] = 0
    comment_count: Optional[int] = 0
    published_at: Optional[str] = None

class CommentAnalysisSchema(BaseModel):
    sentiment: str
    sentiment_confidence: float
    sentiment_scores: Optional[Dict[str, float]] = None
    dominant_emotion: str
    emotions: List[Dict[str, Any]]
    intent: str
    intent_confidence: float
    emojis: List[str]
    emoji_only: bool
    spam_probability: float
    spam_signals: Optional[List[str]] = None
    toxicity_score: float
    toxicity_categories: Optional[Dict[str, float]] = None
    is_duplicate: bool = False
    moderation_action_recommended: str
    moderation_reason: Optional[str] = None
    language: Optional[str] = "English"

class CommentItemSchema(BaseModel):
    id: str
    platform: str
    content_id: str
    content_title: Optional[str] = "Social Media Post"
    username: Optional[str] = "Anonymous"
    text: str
    like_count: int = 0
    published_at: Optional[str] = None
    parent_id: Optional[str] = None
    analysis: CommentAnalysisSchema

class EngineSummarySchema(BaseModel):
    total_comments: int
    classified_comments: int
    sentiment_distribution: Dict[str, int]
    sentiment_percentages: Dict[str, float]
    net_sentiment_score: float
    average_sentiment_confidence: float
    emotion_distribution: Dict[str, int]
    emotion_percentages: Dict[str, float]
    dominant_emotion: str
    intent_distribution: Dict[str, int]
    intent_percentages: Dict[str, float]
    top_emojis: List[Dict[str, Any]]
    emoji_only_count: int
    moderation_summary: Dict[str, int]

class AnalysisResponseSchema(BaseModel):
    job_id: Optional[str] = None
    video: Optional[VideoMetadataSchema] = None
    comments: List[CommentItemSchema]
    summary: EngineSummarySchema
    notice: Optional[str] = None
    status: Optional[str] = "complete" # 'complete' | 'partial' | 'blocked' | 'failed'
    reported_count: Optional[int] = 0
    requested_count: Optional[Union[int, str]] = None
    extracted_count: Optional[int] = 0
    analyzed_count: Optional[int] = 0
