from typing import Dict, Any, List, Optional
from ..engines.sentiment_engine import sentiment_engine, SentimentEngine

class SentimentClassifier:
    """
    Open-Source Multilingual Sentiment Classifier.
    Predicts Positive, Negative, Neutral, or Mixed with confidence and distribution scores.
    """
    def __init__(self):
        self._engine = sentiment_engine

    def predict(self, text: str, emojis: Optional[List[str]] = None) -> Dict[str, Any]:
        return self._engine.analyze(text, emojis=emojis)

sentiment_classifier = SentimentClassifier()

