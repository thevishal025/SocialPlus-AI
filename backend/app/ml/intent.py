from typing import Dict, Any
from ..engines.intent_engine import intent_engine, IntentEngine

class IntentClassifier:
    """
    10-Goal User Intent Engine.
    Identifies Question/Inquiry, Appreciation, Feedback, Feature Request, Complaint,
    Bug Report, Purchase Intent, Churn Risk, Recommendation, or General Discussion.
    """
    def __init__(self):
        self._engine = intent_engine

    def predict(self, text: str) -> Dict[str, Any]:
        return self._engine.analyze(text)

intent_classifier = IntentClassifier()

