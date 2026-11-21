"""
Direct RapidAPI Instagram REST Service re-export.
"""
from .rapidapi_instagram_service import (
    rapidapi_instagram_service as instagram_rest_service,
    RapidAPIInstagramService as InstagramRestService,
    InstagramAPIError,
)

__all__ = ["instagram_rest_service", "InstagramRestService", "InstagramAPIError"]
