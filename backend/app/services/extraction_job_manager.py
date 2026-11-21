"""
Extraction Job Manager for SocialPlus.ai Universal Scraper AI Engine.
Tracks real extraction events, metrics, live progress stages, and results.
"""
import uuid
import time
import threading
from typing import Dict, Any, Optional, List

class ExtractionJob:
    def __init__(
        self,
        job_id: str,
        platform: str,
        method: str,
        url: Optional[str] = None,
        requested_count: int = 250,
    ):
        self.job_id = job_id
        self.platform = platform
        self.method = method
        self.url = url or ""
        self.requested_count = requested_count
        self.status = "pending"  # pending, running, completed, partial, blocked, failed
        self.stage = "Initializing extraction job..."
        self.progress_percent = 0
        self.extracted_count = 0
        self.unique_count = 0
        self.duplicate_count = 0
        self.pages_processed = 0
        self.error_message: Optional[str] = None
        self.can_switch_to_csv: bool = False
        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.result_data: Optional[Dict[str, Any]] = None

    def update(
        self,
        stage: Optional[str] = None,
        progress_percent: Optional[int] = None,
        extracted_count: Optional[int] = None,
        unique_count: Optional[int] = None,
        duplicate_count: Optional[int] = None,
        pages_processed: Optional[int] = None,
        status: Optional[str] = None,
        error_message: Optional[str] = None,
        can_switch_to_csv: Optional[bool] = None,
    ):
        if stage is not None:
            self.stage = stage
        if progress_percent is not None:
            self.progress_percent = max(0, min(100, progress_percent))
        if extracted_count is not None:
            self.extracted_count = extracted_count
        if unique_count is not None:
            self.unique_count = unique_count
        if duplicate_count is not None:
            self.duplicate_count = duplicate_count
        if pages_processed is not None:
            self.pages_processed = pages_processed
        if status is not None:
            self.status = status
            if status in ("completed", "failed", "blocked"):
                self.end_time = time.time()
        if error_message is not None:
            self.error_message = error_message
        if can_switch_to_csv is not None:
            self.can_switch_to_csv = can_switch_to_csv

    def complete(self, result_data: Dict[str, Any]):
        self.status = "completed"
        self.progress_percent = 100
        self.stage = "Extraction & AI Intelligence Analysis complete!"
        self.end_time = time.time()
        self.result_data = result_data

    def fail(self, message: str, can_switch_to_csv: bool = False, status: str = "failed"):
        self.status = status
        self.error_message = message
        self.can_switch_to_csv = can_switch_to_csv
        self.stage = f"Extraction halted: {message}"
        self.end_time = time.time()

    def to_dict(self) -> Dict[str, Any]:
        duration = (self.end_time or time.time()) - self.start_time
        return {
            "job_id": self.job_id,
            "platform": self.platform,
            "method": self.method,
            "url": self.url,
            "status": self.status,
            "stage": self.stage,
            "progress_percent": self.progress_percent,
            "extracted_count": self.extracted_count,
            "unique_count": self.unique_count,
            "duplicate_count": self.duplicate_count,
            "pages_processed": self.pages_processed,
            "requested_count": self.requested_count,
            "error_message": self.error_message,
            "can_switch_to_csv": self.can_switch_to_csv,
            "duration_seconds": round(duration, 2),
            "has_result": self.result_data is not None,
        }


class ExtractionJobManager:
    """Thread-safe in-memory manager for extraction jobs."""

    def __init__(self):
        self._jobs: Dict[str, ExtractionJob] = {}
        self._lock = threading.Lock()

    def create_job(
        self,
        platform: str,
        method: str,
        url: Optional[str] = None,
        requested_count: int = 250,
    ) -> ExtractionJob:
        job_id = str(uuid.uuid4())
        job = ExtractionJob(
            job_id=job_id,
            platform=platform,
            method=method,
            url=url,
            requested_count=requested_count,
        )
        with self._lock:
            # Housekeeping: remove jobs older than 2 hours
            now = time.time()
            stale_keys = [
                k for k, v in self._jobs.items()
                if (now - v.start_time) > 7200
            ]
            for k in stale_keys:
                del self._jobs[k]
            self._jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> Optional[ExtractionJob]:
        with self._lock:
            return self._jobs.get(job_id)

    def list_jobs(self, limit: int = 20) -> List[Dict[str, Any]]:
        with self._lock:
            sorted_jobs = sorted(
                self._jobs.values(), key=lambda j: j.start_time, reverse=True
            )
            return [j.to_dict() for j in sorted_jobs[:limit]]

extraction_job_manager = ExtractionJobManager()

