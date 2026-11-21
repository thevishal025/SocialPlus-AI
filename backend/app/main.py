from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.database import engine, Base
from .models import * # Import all 12 models so Base registers them

# Modular route imports from app.api.routes
from .api.routes.youtube import router as youtube_routes
from .api.routes.instagram import router as instagram_routes
from .api.routes.meta import router as meta_routes
from .api.routes.universal_scraper import router as universal_scraper_routes
from .api.routes.analysis import router as analysis_routes
from .api.routes.analytics import router as analytics_routes
from .api.routes.comments import router as comments_routes
from .api.routes.integrations import router as integrations_routes
from .api.routes.ingestion import router as ingestion_routes
from .api.routes.ecommerce import router as ecommerce_routes

# Legacy/Specialized feature routers for backward compatibility
from .api.auth import router as auth_router
from .api.sentiment import router as sentiment_router
from .api.emotions import router as emotions_router
from .api.intents import router as intents_router
from .api.emojis import router as emojis_router
from .api.moderation import router as moderation_router
from .api.reports import router as reports_router

# Initialize database schema tables on startup
Base.metadata.create_all(bind=engine)


# Auto-migrate any missing columns for SQLite
from sqlalchemy import text, inspect
try:
    insp = inspect(engine)
    if "comments" in insp.get_table_names():
        comment_cols = [c["name"] for c in insp.get_columns("comments")]
        if "source_type" not in comment_cols:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE comments ADD COLUMN source_type VARCHAR(50) DEFAULT 'api'"))
                conn.commit()
except Exception:
    pass

app = FastAPI(
    title="SOCIALPULSE AI — SaaS Intelligence Engine API",
    version="1.0.0",
    description="Production-grade AI-powered comment intelligence & moderation platform across YouTube and Instagram.",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/health")
def health():
    return {
        "status": "ok",
        "service": "SOCIALPULSE AI API",
        "version": "1.0.0",
        "integrations": {
            "youtube_configured": settings.is_youtube_configured(),
            "rapidapi_configured": settings.is_rapidapi_configured(),
            "instagram_mcp_configured": bool(settings.is_rapidapi_configured() and settings.rapidapi_mcp_url),
        },
        "database": {
            "status": "connected",
            "dialect": engine.dialect.name,
        },
        "models": {
            "sentiment": "Multilingual 4-Class Ready",
            "emotion": "10-Class Spectrum Ready",
            "intent": "10-Goal Classifier Ready",
            "emoji": "Contextual Unicode Engine Ready",
            "moderation": "Safe Auto-Moderation Ready",
        }
    }

# Register all API routers under /api/v1
app.include_router(auth_router, prefix="/api/v1")
app.include_router(integrations_routes, prefix="/api/v1")
app.include_router(ingestion_routes, prefix="/api/v1")
app.include_router(youtube_routes, prefix="/api/v1")
app.include_router(instagram_routes, prefix="/api/v1")
app.include_router(meta_routes, prefix="/api/v1")
app.include_router(universal_scraper_routes, prefix="/api/v1")
app.include_router(analysis_routes, prefix="/api/v1")
app.include_router(analytics_routes, prefix="/api/v1")
app.include_router(comments_routes, prefix="/api/v1")
app.include_router(ecommerce_routes, prefix="/api/v1")

# Specialized feature endpoints
app.include_router(sentiment_router, prefix="/api/v1")
app.include_router(emotions_router, prefix="/api/v1")
app.include_router(intents_router, prefix="/api/v1")
app.include_router(emojis_router, prefix="/api/v1")
app.include_router(moderation_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
