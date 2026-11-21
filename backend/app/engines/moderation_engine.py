import re
from typing import Dict, Any, List

class ModerationEngine:
    """
    Engine 5: Auto Moderation Intelligence.
    Detects spam, toxic attacks, abusive language, repetitive bot patterns, and duplicate comments.
    Enforces safe recommendation-only policy.
    """

    SPAM_PATTERNS = [
        r"(https?://\S+|www\.\S+|t\.me/\S+|wa\.me/\S+|bit\.ly/\S+)",
        r"(dm\s+me|whatsapp\s+group|whatsapp|message\s+me|contact\s+me)",
        r"(\$\d+|\d+\s*crypto|crypto\s+signals|crypto|earn\s+daily|free\s+money|passive\s+income|bitcoin)",
        r"(subscribe\s+to\s+my|check\s+my\s+bio|link\s+in\s+bio)",
        r"(telegram\s*:\s*@\w+|telegram\s+group|telegram|call\s*:\s*\+?\d{8,})",
    ]

    TOXIC_LEXICON = {
        # Harassment & Insults
        "idiot", "stupid", "moron", "dumb", "bastard", "loser", "jerk", "ugly",
        "chutiya", "madarchod", "bhenchod", "saale", "kamina", "harami", "kutta",
        "गधा", "कुत्ता", "कमीना", "हरामी",
        # Severe Abuse & Threat cues
        "kill yourself", "die", "murder", "threat", "destroy you", "mar ja",
    }

    def analyze(self, text: str, is_duplicate: bool = False) -> Dict[str, Any]:
        raw = text or ""
        t_lower = raw.casefold()

        # 1. Spam Detection
        spam_hits = []
        for pattern in self.SPAM_PATTERNS:
            if re.search(pattern, t_lower, flags=re.IGNORECASE):
                spam_hits.append(pattern)

        # Repetitive bot patterns (e.g. repeated uppercase letters or excessive symbols)
        if len(raw) > 20 and raw.isupper():
            spam_hits.append("all_caps_screaming")
        if re.search(r"(.)\1{5,}", raw):  # e.g. "aaaaaaa" or "!!!!!!!"
            spam_hits.append("character_repetition")

        # Each distinct spam hit contributes 0.4, min capped at 0.99
        spam_prob = min(0.99, len(spam_hits) * 0.40) if spam_hits else 0.01

        # 2. Toxicity Detection
        toxic_hits = []
        for word in self.TOXIC_LEXICON:
            if word in t_lower:
                toxic_hits.append(word)

        toxicity_score = min(0.99, len(toxic_hits) * 0.45) if toxic_hits else 0.0

        # 3. Action Recommendation
        if is_duplicate:
            action = "Review"
            reason = "Duplicate content detected across multiple comments."
        elif spam_prob >= 0.70:
            action = "Hide"
            reason = f"High confidence automated spam solicitation ({len(spam_hits)} triggers detected)."
        elif toxicity_score >= 0.70:
            action = "Flag"
            reason = f"Severe toxic or abusive language detected ({', '.join(toxic_hits[:2])})."
        elif spam_prob >= 0.40 or toxicity_score >= 0.30:
            action = "Review"
            reason = "Moderate risk signals detected; human review recommended."
        else:
            action = "Clear"
            reason = None

        return {
            "spam_probability": round(spam_prob, 2),
            "spam_signals": spam_hits,
            "toxicity_score": round(toxicity_score, 2),
            "toxicity_categories": {
                "harassment": round(min(1.0, len(toxic_hits) * 0.5), 2),
                "hate_speech": round(min(1.0, len(toxic_hits) * 0.4), 2),
                "insult": round(min(1.0, len(toxic_hits) * 0.6), 2),
            },
            "is_duplicate": is_duplicate,
            "moderation_action_recommended": action,
            "moderation_reason": reason,
        }

moderation_engine = ModerationEngine()
