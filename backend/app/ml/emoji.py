from typing import Dict, Any
from ..engines.emoji_engine import emoji_engine, EmojiEngine

class EmojiAnalyzer:
    """
    Contextual Unicode Emoji Intelligence Engine.
    Handles composite glyphs, sentiment polarity, and emoji-only expressions.
    """
    def __init__(self):
        self._engine = emoji_engine

    def predict(self, text: str) -> Dict[str, Any]:
        return self._engine.analyze(text)

emoji_analyzer = EmojiAnalyzer()

