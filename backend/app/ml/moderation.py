from typing import Dict, Any
from ..engines.moderation_engine import moderation_engine, ModerationEngine

class ModerationFilter:
    """
    Safe Recommendation-Only Auto Moderation Intelligence.
    Detects toxicity, severe toxicity, link spam, duplicate spam, and phishing risks.
    Never deletes or hides comments automatically; outputs recommended_action for human review.
    """
    def __init__(self):
        self._engine = moderation_engine

    def predict(self, text: str, is_duplicate: bool = False) -> Dict[str, Any]:
        return self._engine.analyze(text, is_duplicate=is_duplicate)

moderation_filter = ModerationFilter()

