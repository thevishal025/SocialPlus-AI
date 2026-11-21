from typing import Optional, Literal
from pydantic import BaseModel

class ExportReportRequest(BaseModel):
    format: Literal["csv", "pdf"] = "csv"
    report_type: Literal["master", "sentiment", "emotion", "intent", "emoji", "moderation"] = "master"
    video_id: Optional[str] = None

