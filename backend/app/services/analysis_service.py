import uuid
import json
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from ..core.database import SessionLocal
from ..models.video import Video
from ..models.comment import Comment
from ..models.sentiment import SentimentAnalysis
from ..models.emotion import EmotionAnalysis
from ..models.intent import IntentAnalysis
from ..models.emoji import EmojiAnalysis
from ..models.moderation import ModerationAnalysis
from ..models.job import AnalysisJob
from ..engines.pipeline import pipeline
from .youtube_service import youtube_service
from .rapidapi_instagram_service import rapidapi_instagram_service, InstagramAPIError
from .instagram_mcp_service import instagram_mcp_service
from .instagram_automatic_service import instagram_automatic_service, InstagramAutomaticExtractionError
from .meta_instagram_service import meta_instagram_service, MetaInstagramAPIError
from .comment_normalizer import comment_normalizer

class AnalysisService:
    """
    Central Service orchestrating social media data ingestion, normalization,
    running the 5 AI intelligence engines, database persistence, and aggregate analytics.
    """

    async def analyze_youtube(
        self,
        url: str,
        max_comments: int = 250,
        mode: str = "limit",
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Fetches from YouTube Data API v3 and analyzes."""
        payload = await youtube_service.fetch_content_and_comments(url, max_comments=max_comments)
        video_meta = payload["video"]
        raw_comments = payload["comments"]

        processed = pipeline.process_comments(raw_comments)
        
        if db:
            self._persist_results(db, video_meta, processed["comments"])

        reported = video_meta.get("comment_count", len(raw_comments))
        requested = "ALL" if mode == "all" else max_comments
        extracted = len(raw_comments)
        analyzed = len(processed["comments"])
        is_partial = (mode != "all" and requested and extracted < requested)

        return {
            "video": video_meta,
            "comments": processed["comments"],
            "summary": processed["summary"],
            "notice": f"Live YouTube Data API v3: {analyzed} comments processed.",
            "status": "partial" if is_partial else "complete",
            "reported_count": reported,
            "requested_count": requested,
            "available_count": reported or extracted,
            "extracted_count": extracted,
            "analyzed_count": analyzed,
        }

    async def analyze_instagram(
        self,
        url: str,
        max_comments: int = 100,
        method: str = "automatic_without_api",
        mode: str = "limit",
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """
        Ingests Instagram comments via one of three methods:
        - Method 1: 'official_api' (Meta Graph API / configured API adapter)
        - Method 2: 'automatic_without_api' (Permitted public webpage extraction)
        - Method 3: 'csv_upload' (File upload handled via FileIngestionService)
        Then runs the unified 5-engine AI intelligence pipeline (Sentiment, Emotions, Intent, Emojis, Moderation).
        """
        payload = None
        source_tag = method or "automatic_without_api"

        if source_tag == "automatic_without_api":
            # Method 2: Automatic extraction without API
            payload = await instagram_automatic_service.extract_comments(url, max_comments=max_comments, mode=mode)
            source_used = "Automatic Web Extraction (Without API)"
        elif source_tag == "official_api":
            # Method 1: Official API (Meta Graph API or configured API adapter)
            if meta_instagram_service.is_configured():
                payload = await meta_instagram_service.fetch_comments_official(url, max_comments=max_comments)
                source_used = "Official Meta Graph API"
            else:
                # Fallback to configured RapidAPI provider adapter if available
                try:
                    payload = await rapidapi_instagram_service.fetch_content_and_comments(url, max_comments=max_comments)
                    source_used = "RapidAPI Instagram Provider"
                except InstagramAPIError as api_err:
                    raise api_err
        else:
            # Fallback default to automatic extraction
            payload = await instagram_automatic_service.extract_comments(url, max_comments=max_comments, mode=mode)
            source_used = "Automatic Web Extraction"

        video_meta = payload["video"]
        raw_comments = payload["comments"]

        # Run All 5 AI Intelligence Engines
        processed = pipeline.process_comments(raw_comments)

        # Persist Video & Comments to DB with source_type
        if db:
            self._persist_results(db, video_meta, processed["comments"], source_type=source_tag)

        reported = payload.get("reported_count") or video_meta.get("comment_count") or len(raw_comments)
        requested = "ALL" if mode == "all" else max_comments
        extracted = len(raw_comments)
        analyzed = len(processed["comments"])
        is_partial = (mode != "all" and requested and extracted < requested)

        notice = (
            f"Instagram ({source_used}): {analyzed} comments processed across all 5 AI intelligence engines."
            if analyzed > 0
            else f"Instagram content retrieved: 0 comments available."
        )

        return {
            "video": video_meta,
            "comments": processed["comments"],
            "summary": processed["summary"],
            "notice": notice,
            "source_type": source_tag,
            "status": "partial" if is_partial else "complete",
            "reported_count": reported,
            "requested_count": requested,
            "available_count": reported or extracted,
            "extracted_count": extracted,
            "analyzed_count": analyzed,
        }

    def analyze_batch(self, comments: List[str]) -> Dict[str, Any]:
        """Analyzes a batch of uploaded or test comments."""
        raw_comments = [
            {
                "id": f"upload-{i}",
                "platform": "uploaded",
                "content_id": "uploaded-dataset",
                "content_title": "Custom Ingested Comment Batch",
                "username": f"user_{i+1}",
                "text": text,
                "like_count": 0,
                "is_reply": False,
            }
            for i, text in enumerate(comments)
        ]
        processed = pipeline.process_comments(raw_comments)
        return {
            "video": {
                "id": "upload-batch",
                "platform": "uploaded",
                "title": "Uploaded Comments Dataset",
                "channel": "Batch Ingestion",
                "comment_count": len(comments),
            },
            "comments": processed["comments"],
            "summary": processed["summary"],
            "notice": "Direct dataset processed across all 5 AI engines without external API dependencies."
        }

    def _persist_results(self, db: Session, video_meta: Dict[str, Any], processed_comments: List[Dict[str, Any]], source_type: str = "api"):
        """Idempotently saves Video, Comment, and 5-engine analysis rows to the database."""
        platform = video_meta.get("platform", "youtube")
        platform_vid = str(video_meta.get("id"))

        # Find or create Video record
        video = db.query(Video).filter(Video.platform == platform, Video.platform_video_id == platform_vid).first()
        if not video:
            video = Video(
                id=str(uuid.uuid4()),
                platform=platform,
                platform_video_id=platform_vid,
                title=video_meta.get("title", ""),
                channel_title=video_meta.get("channel", ""),
                thumbnail_url=video_meta.get("thumbnail"),
                view_count=video_meta.get("views", 0),
                like_count=video_meta.get("likes", 0),
                comment_count=len(processed_comments),
            )
            db.add(video)
            db.commit()
            db.refresh(video)
        else:
            video.title = video_meta.get("title", video.title)
            video.channel_title = video_meta.get("channel", video.channel_title)
            video.view_count = video_meta.get("views", video.view_count)
            video.like_count = video_meta.get("likes", video.like_count)
            video.comment_count = len(processed_comments)
            db.commit()

        # Save comments & analysis
        for c in processed_comments:
            cid = str(c.get("id", f"{platform}-{uuid.uuid4()}"))
            existing = db.query(Comment).filter(Comment.platform == platform, Comment.platform_comment_id == cid).first()
            if not existing:
                pub_at = None
                raw_pub = c.get("published_at")
                if raw_pub:
                    if isinstance(raw_pub, datetime.datetime):
                        pub_at = raw_pub
                    elif isinstance(raw_pub, str):
                        try:
                            pub_at = datetime.datetime.fromisoformat(raw_pub.replace("Z", "+00:00"))
                        except Exception:
                            pub_at = None

                comment_row = Comment(
                    id=str(uuid.uuid4()),
                    video_id=video.id,
                    platform=platform,
                    source_type=c.get("source_type", video_meta.get("source_type", "api")),
                    platform_comment_id=cid,
                    author_username=c.get("username", "user"),
                    text=c.get("text", ""),
                    like_count=int(c.get("like_count", 0)),
                    published_at=pub_at,
                    is_reply=bool(c.get("is_reply", False)),
                )
                db.add(comment_row)
                db.flush()

                # Add 5 analysis records matching exact table schema
                analysis = c.get("analysis", {})
                
                # 1. Sentiment
                sentiment_scores = analysis.get("sentiment_scores") or analysis.get("sentiment_probabilities") or {}
                db.add(SentimentAnalysis(
                    id=str(uuid.uuid4()),
                    comment_id=comment_row.id,
                    sentiment=analysis.get("sentiment", "Neutral"),
                    confidence=float(analysis.get("sentiment_confidence", 0.5)),
                    positive_score=float(sentiment_scores.get("positive", 0.0)),
                    negative_score=float(sentiment_scores.get("negative", 0.0)),
                    neutral_score=float(sentiment_scores.get("neutral", 0.0)),
                ))

                # 2. Emotion
                raw_emotions = analysis.get("emotions", [])
                emotions_dict = {}
                if isinstance(raw_emotions, list):
                    for item in raw_emotions:
                        if isinstance(item, dict) and "emotion" in item and "score" in item:
                            emotions_dict[str(item["emotion"]).lower()] = float(item["score"])
                elif isinstance(raw_emotions, dict):
                    emotions_dict = {str(k).lower(): float(v) for k, v in raw_emotions.items()}

                db.add(EmotionAnalysis(
                    id=str(uuid.uuid4()),
                    comment_id=comment_row.id,
                    dominant_emotion=analysis.get("dominant_emotion", "Neutral"),
                    joy_score=float(emotions_dict.get("joy", 0.0)),
                    love_score=float(emotions_dict.get("love", 0.0)),
                    excitement_score=float(emotions_dict.get("excitement", 0.0)),
                    anger_score=float(emotions_dict.get("anger", 0.0)),
                    sadness_score=float(emotions_dict.get("sadness", 0.0)),
                    surprise_score=float(emotions_dict.get("surprise", 0.0)),
                    fear_score=float(emotions_dict.get("fear", 0.0)),
                    disgust_score=float(emotions_dict.get("disgust", 0.0)),
                    frustration_score=float(emotions_dict.get("frustration", 0.0)),
                    curiosity_score=float(emotions_dict.get("curiosity", 0.0)),
                ))

                # 3. Intent
                db.add(IntentAnalysis(
                    id=str(uuid.uuid4()),
                    comment_id=comment_row.id,
                    primary_intent=analysis.get("intent", analysis.get("primary_intent", "General Discussion")),
                    intent_confidence=float(analysis.get("intent_confidence", 0.5)),
                    intent_breakdown_json=json.dumps(analysis.get("intent_scores", {})),
                ))

                # 4. Emoji
                emojis_list = analysis.get("emojis", [])
                db.add(EmojiAnalysis(
                    id=str(uuid.uuid4()),
                    comment_id=comment_row.id,
                    emojis_json=json.dumps(emojis_list),
                    emoji_count=int(analysis.get("emoji_count", len(emojis_list))),
                    is_emoji_only=bool(analysis.get("emoji_only", False)),
                    dominant_emoji=emojis_list[0] if emojis_list else None,
                    contextual_interpretation=analysis.get("emoji_sentiment"),
                ))

                # 5. Moderation
                db.add(ModerationAnalysis(
                    id=str(uuid.uuid4()),
                    comment_id=comment_row.id,
                    toxicity_score=float(analysis.get("toxicity_score", 0.0)),
                    spam_probability=float(analysis.get("spam_probability", 0.0)),
                    abuse_categories_json=json.dumps(analysis.get("flag_reasons", [])),
                    is_duplicate=bool(analysis.get("is_duplicate", False)),
                    recommendation=analysis.get("moderation_action_recommended", analysis.get("recommended_action", "Clear")),
                    risk_reason=analysis.get("moderation_reason"),
                ))

        db.commit()

analysis_service = AnalysisService()
