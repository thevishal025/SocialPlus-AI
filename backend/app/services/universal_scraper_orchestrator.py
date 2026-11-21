"""
Universal Scraper Orchestrator for SocialPlus.ai.
The central AI scraping engine coordinating:
  1. YouTube (Without API via YouTube Adapter)
  2. Meta: Instagram & Facebook (Without API via Instagram & Facebook Adapters)
  3. E-Commerce (Without API via Amazon, Flipkart, Meesho, Myntra, Ajio, Snapdeal, eBay, Generic Adapters)
  4. Shared Upload Pipeline & Export Service
Connects directly to the existing 5-engine AI intelligence pipeline (Sentiment, Emotions, Intent, Emoji, Moderation).
"""
import asyncio
import logging
from typing import Dict, Any, List, Optional, Callable
from sqlalchemy.orm import Session

from .platform_detector import detect_platform, inspect_url, PLATFORM_CATEGORIES
from .data_normalizer import data_normalizer
from .extraction_job_manager import extraction_job_manager, ExtractionJob
from .file_import_service import file_import_service
from .export_service import export_service
from ..scrapers.youtube_adapter import youtube_adapter
from ..scrapers.instagram_adapter import instagram_adapter
from ..scrapers.facebook_adapter import facebook_adapter
from ..scrapers.ecommerce_adapter import ecommerce_adapter
from ..engines.pipeline import pipeline

logger = logging.getLogger("socialpulse.scraper.orchestrator")

class UniversalScraperOrchestrator:
    """
    Central Controller for all scraping and extraction workflows across SocialPlus.ai.
    """

    async def scrape_and_analyze(
        self,
        url: str,
        platform: Optional[str] = None,
        max_items: int = 250,
        mode: str = "limit",
        method: str = "without_api",
        job_id: Optional[str] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """
        Main execution pipeline:
        1. Auto-detect platform and category if not supplied
        2. Create / track extraction job
        3. Dispatch to platform adapter
        4. Deduplicate & normalize records
        5. Pass to shared 5-engine AI pipeline
        6. Return unified response with complete audit metrics
        """
        cleaned_url = (url or "").strip()
        detected_info = inspect_url(cleaned_url)

        effective_platform = platform or detected_info["platform"]
        effective_category = PLATFORM_CATEGORIES.get(effective_platform, detected_info["category"])

        if effective_platform == "unsupported":
            raise ValueError(f"URL '{cleaned_url}' is not a supported social or e-commerce platform.")

        # Create or retrieve job
        job = extraction_job_manager.get_job(job_id) if job_id else None
        if not job:
            job = extraction_job_manager.create_job(
                platform=effective_platform,
                method=method,
                url=cleaned_url,
                requested_count=max_items,
            )

        job.update(
            stage=f"Connecting to {detected_info['display_name']} ({method.replace('_', ' ').title()})...",
            progress_percent=15,
            status="running",
        )

        def progress_cb(info: Dict[str, Any]):
            stage = info.get("stage", "Extracting...")
            pct = info.get("percent") or 40
            job.update(stage=stage, progress_percent=pct)

        try:
            # 1. Dispatch according to Category & Platform
            raw_extraction = {}

            # YOUTUBE
            if effective_category == "youtube":
                job.update(stage="Extracting publicly accessible YouTube comments...", progress_percent=40)
                raw_extraction = await youtube_adapter.extract_comments(
                    url=cleaned_url,
                    max_comments=max_items,
                    mode=mode,
                    progress_callback=progress_cb,
                )

            # META (Instagram / Facebook)
            elif effective_category == "meta":
                if effective_platform == "instagram":
                    job.update(stage="Extracting accessible Instagram post comments...", progress_percent=40)
                    if method == "official_api":
                        raw_extraction = await instagram_adapter.extract_with_api(
                            url=cleaned_url,
                            max_comments=max_items,
                            mode=mode,
                        )
                    else:
                        raw_extraction = await instagram_adapter.extract_without_api(
                            url=cleaned_url,
                            max_comments=max_items,
                            mode=mode,
                            progress_callback=progress_cb,
                        )
                else:  # facebook
                    job.update(stage="Extracting accessible Facebook post comments...", progress_percent=40)
                    if method == "official_api":
                        raw_extraction = await facebook_adapter.extract_with_api(
                            url=cleaned_url,
                            max_comments=max_items,
                            mode=mode,
                        )
                    else:
                        raw_extraction = await facebook_adapter.extract_without_api(
                            url=cleaned_url,
                            max_comments=max_items,
                            mode=mode,
                            progress_callback=progress_cb,
                        )

            # E-COMMERCE
            elif effective_category == "ecommerce":
                job.update(stage=f"Extracting product details and customer reviews from {effective_platform.capitalize()}...", progress_percent=40)
                raw_extraction = await ecommerce_adapter.extract_product_reviews(
                    url=cleaned_url,
                    platform=effective_platform,
                    max_reviews=max_items,
                    progress_callback=progress_cb,
                )

            # Check if extraction was blocked or returned error
            if not raw_extraction.get("success", False) and raw_extraction.get("status") in ("blocked", "failed", "comments_disabled"):
                error_msg = raw_extraction.get("error") or "Content comments are inaccessible on this link."
                can_switch = raw_extraction.get("can_switch_to_csv", True)
                job.fail(error_msg, can_switch_to_csv=can_switch, status=raw_extraction.get("status", "blocked"))
                return {
                    "success": False,
                    "platform": effective_platform,
                    "category": effective_category,
                    "method": method,
                    "error": error_msg,
                    "details": raw_extraction.get("details", error_msg),
                    "can_switch_to_csv": can_switch,
                    "status": raw_extraction.get("status", "blocked"),
                    "job_id": job.job_id,
                }

            # If e-commerce already synthesized full output with product & audit
            if "top_complaints" in raw_extraction and "audit" in raw_extraction:
                job.complete(raw_extraction)
                raw_extraction["job_id"] = job.job_id
                return raw_extraction

            # 2. Extract and Normalize comments
            raw_comments = raw_extraction.get("comments", [])
            job.update(
                stage="Deduplicating & normalizing collected data...",
                progress_percent=75,
                extracted_count=len(raw_comments),
            )

            unique_comments, dup_count = data_normalizer.deduplicate(raw_comments)
            job.update(unique_count=len(unique_comments), duplicate_count=dup_count)

            # 3. Execute 5 AI Intelligence Engines
            job.update(stage="Running 5 AI Intelligence Engines (Sentiment, Emotion, Intent, Emoji, Moderation)...", progress_percent=85)
            ai_results = pipeline.process_comments(unique_comments)

            # Construct final response
            video_meta = raw_extraction.get("video") or {
                "id": f"{effective_platform}_content",
                "title": f"{detected_info['display_name']} Content",
                "platform": effective_platform,
                "comment_count": len(unique_comments),
            }

            final_response = {
                "success": True,
                "job_id": job.job_id,
                "platform": effective_platform,
                "category": effective_category,
                "method": method,
                "video": video_meta,
                "comments": ai_results["comments"],
                "summary": ai_results["summary"],
                "status": "complete" if len(unique_comments) >= max_items or mode == "all" else "partial",
                "reported_count": raw_extraction.get("total_extracted") or len(unique_comments),
                "requested_count": max_items if mode != "all" else "ALL",
                "extracted_count": raw_extraction.get("total_extracted") or len(raw_comments),
                "analyzed_count": len(unique_comments),
                "duplicate_count": dup_count,
            }

            job.complete(final_response)
            return final_response

        except Exception as exc:
            logger.error("Scraper orchestrator error on %s: %s", cleaned_url, str(exc), exc_info=True)
            job.fail(str(exc), can_switch_to_csv=True)
            raise

universal_scraper_orchestrator = UniversalScraperOrchestrator()

