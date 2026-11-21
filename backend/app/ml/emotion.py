from typing import Dict, Any, List, Optional
from ..engines.emotion_engine import emotion_engine, EmotionEngine

class EmotionClassifier:
    """
    10-Class Emotional Spectrum Meter.
    Detects Joy, Love, Excitement, Anger, Sadness, Surprise, Fear, Disgust, Frustration, and Curiosity.
    Supports multi-label scoring when multiple distinct emotions are evoked.
    """
    def __init__(self):
        self._engine = emotion_engine

    def predict(self, text: str, emojis: Optional[List[str]] = None) -> Dict[str, Any]:
        return self._engine.analyze(text, emojis=emojis)

emotion_classifier = EmotionClassifier()

