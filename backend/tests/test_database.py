import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import (
    User, SocialAccount, Video, Comment, SentimentAnalysis,
    EmotionAnalysis, IntentAnalysis, EmojiAnalysis, ModerationAnalysis,
    AnalysisJob, Report, ModerationAction
)

TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()

def test_modular_models_creation(db_session):
    # Test video insertion
    video = Video(
        id="vid-1",
        platform="youtube",
        platform_video_id="dQw4w9WgXcQ",
        title="Test Video Title",
        view_count=1000,
    )
    db_session.add(video)
    db_session.commit()

    saved_video = db_session.query(Video).filter_by(id="vid-1").first()
    assert saved_video is not None
    assert saved_video.title == "Test Video Title"

    # Test comment with all 5 engine records
    comment = Comment(
        id="c-1",
        video_id=video.id,
        platform="youtube",
        platform_comment_id="yt-c-1",
        text="Awesome video! ❤️🔥",
    )
    db_session.add(comment)
    db_session.commit()

    sentiment = SentimentAnalysis(
        id="s-1",
        comment_id=comment.id,
        sentiment="Positive",
        confidence=0.95,
    )
    emotion = EmotionAnalysis(
        id="e-1",
        comment_id=comment.id,
        dominant_emotion="Joy",
    )
    intent = IntentAnalysis(
        id="i-1",
        comment_id=comment.id,
        primary_intent="Appreciation",
        intent_confidence=0.98,
    )
    emoji = EmojiAnalysis(
        id="em-1",
        comment_id=comment.id,
        emoji_count=2,
    )
    mod = ModerationAnalysis(
        id="m-1",
        comment_id=comment.id,
        recommendation="Clear",
    )

    db_session.add_all([sentiment, emotion, intent, emoji, mod])
    db_session.commit()

    saved_comment = db_session.query(Comment).filter_by(id="c-1").first()
    assert saved_comment.sentiment_analysis.sentiment == "Positive"
    assert saved_comment.emotion_analysis.dominant_emotion == "Joy"
    assert saved_comment.intent_analysis.primary_intent == "Appreciation"
    assert saved_comment.emoji_analysis.emoji_count == 2
    assert saved_comment.moderation_analysis.recommendation == "Clear"

