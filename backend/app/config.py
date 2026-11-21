"""
Central Configuration re-export.
All services and modules load settings from app.core.config which reads backend/.env.
"""
from .core.config import settings, Settings

__all__ = ["settings", "Settings"]
