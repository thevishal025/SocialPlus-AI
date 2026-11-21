"""
Legacy Instagram route re-export for backward compatibility.
Points directly to app.api.routes.instagram router.
"""
from .routes.instagram import router

__all__ = ["router"]
