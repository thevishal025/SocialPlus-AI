import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.analysis import YouTubeAnalyzeRequest, AnalysisResponseSchema
from ..integrations.youtube import youtube_adapter
from ..engines.pipeline import pipeline
from ..models.video import Video
from ..models.comment import Comment
from ..models.sentiment import SentimentAnalysis
from ..models.emotion import EmotionAnalysis
from ..models.intent import IntentAnalysis
from ..models.emoji import EmojiAnalysis
from ..models.moderation import ModerationAnalysis
from ..models.job import AnalysisJob

router = APIRouter(prefix="/youtube", tags=["YouTube Intelligence"])

@router.post("/analyze", response_model=AnalysisResponseSchema)
async def analyze_youtube_video(body: YouTubeAnalyzeRequest, db: Session = Depends(get_db)):
    try:
        # 1. Ingest via YouTube Data API v3 Adapter
        payload = await youtube_adapter.fetch_content_and_comments(body.url, body.max_comments)
        raw_comments = payload["comments"]
        video_meta = payload["video"]

        # 2. Run All 5 AI Engines via Pipeline
        processed = pipeline.process_comments(raw_comments)
        comments_list = processed["comments"]
        summary = processed["summary"]

        # 3. Persist in Database (PostgreSQL / SQLite)
        job_id = str(uuid.uuid4())
        
        # Check or create Video
        db_video = db.query(Video).filter(
            Video.platform == "youtube",
            Video.platform_video_id == video_meta["id"]
        ).first()

        if not db_video:
            db_video = Video(
                id=str(uuid.uuid4()),
                platform="youtube",
                platform_video_id=video_meta["id"],
                title=video_meta["title"],
                channel_title=video_meta.get("channel"),
                thumbnail_url=video_meta.get("thumbnail"),
                view_count=video_meta.get("views", 0),
                like_count=video_meta.get("likes", 0),
                comment_count=len(comments_list),
            )
            db.add(db_video)
            db.flush()
        else:
            db_video.title = video_meta["title"]
            db_video.view_count = video_meta.get("views", db_video.view_count)
            db_video.like_count = video_meta.get("likes", db_video.like_count)
            db_video.comment_count = len(comments_list)

        # Create Job record
        job = AnalysisJob(
            id=job_id,
            video_id=db_video.id,
            platform="youtube",
            status="completed",
            total_comments=len(comments_list),
            processed_comments=len(comments_list),
            completed_at=datetime.datetime.utcnow(),
        )
        db.add(job)

        # Persist comments and their 5 engine analyses
        for c in comments_list:
            existing_c = db.query(Comment).filter(
                Comment.platform == "youtube",
                Comment.platform_comment_id == c["id"]
            ).first()

            if not existing_c:
                c_id = str(uuid.uuid4())
                db_comment = Comment(
                    id=c_id,
                    video_id=db_video.id,
                    platform="youtube",
                    platform_comment_id=c["id"],
                    author_username=c.get("username"),
                    text=c["text"],
                    like_count=c.get("like_count", 0),
                    is_reply=c.get("is_reply", False),
                )
                db.add(db_comment)
                db.flush()

                # Add 5 engine records
                a = c["analysis"]
                db.add(SentimentAnalysis(
                    id=str(uuid.uuid4()),
                    comment_id=c_id,
                    sentiment=a["sentiment"],
                    confidence=a["sentiment_confidence"],
                ))
                db.add(EmotionAnalysis(
                    id=str(uuid.uuid4()),
                    comment_id=c_id,
                    dominant_emotion=a["dominant_emotion"],
                ))
                db.add(IntentAnalysis(
                    id=str(uuid.uuid4()),
                    comment_id=c_id,
                    primary_intent=a["intent"],
                    intent_confidence=a["intent_confidence"],
                ))
                db.add(EmojiAnalysis(
                    id=str(uuid.uuid4()),
                    comment_id=c_id,
                    emoji_count=len(a.get("emojis", [])),
                    is_emoji_only=a.get("emoji_only", False),
                ))
                db.add(ModerationAnalysis(
                    id=str(uuid.uuid4()),
                    comment_id=c_id,
                    spam_probability=a["spam_probability"],
                    toxicity_score=a["toxicity_score"],
                    recommendation=a["moderation_action_recommended"],
                    risk_reason=a.get("moderation_reason"),
                ))

        db.commit()

        return AnalysisResponseSchema(
            job_id=job_id,
            video=video_meta,
            comments=comments_list,
            summary=summary,
            notice="Live YouTube comments processed across all 5 AI intelligence engines and saved to database."
        )

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"YouTube analysis pipeline failure: {str(e)}")

