import re
from typing import Dict, Any, List
import emoji

class EmojiEngine:
    """
    Engine 4: Emoji Intelligence Engine.
    Detects emoji frequency, emoji combinations, emoji-only comments, and contextual sentiment shifts.
    """

    EMOJI_MEANINGS = {
        "❤️": "Love & Deep Admiration",
        "😍": "High Appreciation & Fondness",
        "🔥": "Peak Excitement & Top Quality",
        "😂": "Joy & Uncontrollable Laughter",
        "😭": "Contextual: Tears of Joy / Grief",
        "😡": "Anger, Outrage & Hostility",
        "👎": "Disapproval & Rejection",
        "🙌": "Appreciation & Celebration",
        "💯": "Full Agreement & Authenticity",
        "🤔": "Critical Inquiry & Curiosity",
        "👏": "Applause & Commendation",
        "✨": "Inspiration & Magic",
        "🚀": "Rapid Growth & Enthusiasm",
        "💩": "Contempt & Disgust",
        "🤮": "Extreme Repulsion",
    }

    def extract_emojis(self, text: str) -> List[str]:
        if not text:
            return []
        try:
            return [d["emoji"] for d in emoji.emoji_list(text)]
        except Exception:
            # Fallback regex if needed
            return list(re.findall(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]", text))

    def analyze(self, text: str) -> Dict[str, Any]:
        raw = text or ""
        emojis = self.extract_emojis(raw)

        # Check if emoji only
        text_without_emojis = emoji.replace_emoji(raw, replace="").strip()
        is_emoji_only = bool(emojis) and (len(text_without_emojis) == 0)

        # Contextual interpretation
        context_notes = []
        t_lower = raw.casefold()
        if "😭" in emojis:
            if any(w in t_lower for w in ["lmao", "lol", "dead", "has", "funny"]):
                context_notes.append("😭 used contextually as tears of laughter")
            else:
                context_notes.append("😭 used contextually expressing grief or sorrow")

        emoji_details = [
            {
                "emoji": em,
                "meaning": self.EMOJI_MEANINGS.get(em, "Visual Expression"),
            }
            for em in emojis
        ]

        return {
            "emojis": emojis,
            "emoji_only": is_emoji_only,
            "emoji_count": len(emojis),
            "emoji_details": emoji_details,
            "context_notes": context_notes,
        }

emoji_engine = EmojiEngine()
