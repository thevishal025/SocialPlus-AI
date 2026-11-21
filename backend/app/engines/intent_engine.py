import re
from typing import Dict, Any, List

class IntentEngine:
    """
    Engine 3: Intent Intelligence Engine.
    Detects communicative goals across 10 functional classes:
    Questioning, Reply / Response, Appreciation, Complaint, Suggestion, Request, Feedback, Promotion, Spam, General Discussion.
    """

    INTENT_CUES = {
        "Questioning": {
            "?", "how", "what", "why", "when", "where", "which", "who", "whom", "can you",
            "could you", "is it", "does it", "kya", "kyu", "kyun", "kaise", "kab", "kaha",
            "kisko", "kaun", "batao", "bataiye", "बताओ", "कैसे", "क्यों", "क्या"
        },
        "Appreciation": {
            "thanks", "thank you", "kudos", "appreciate", "grateful", "amazing work", "great job",
            "loved it", "hats off", "shukriya", "dhanyawad", "dil jeet liya", "shandar", "धन्यवाद", "शुक्रिया"
        },
        "Complaint": {
            "issue", "problem", "broken", "bug", "glitch", "error", "horrible", "audio bad", "lag",
            "not working", "fail", "terrible", "waste", "disappointed", "kharab", "pareshan", "शिकायत"
        },
        "Suggestion": {
            "should", "suggest", "suggestion", "recommend", "how about", "next time", "could improve",
            "would be better", "agle video me", "salah", "सुझाव", "सलाह"
        },
        "Request": {
            "please make", "please upload", "can you provide", "request", "need github", "source code",
            "bhejo", "dedo", "kardo", "कृपया", "दीजिए"
        },
        "Feedback": {
            "pacing", "explanation was", "in depth", "clear", "good explanation", "detailed",
            "constructive", "concept", "clarity", "feedback"
        },
        "Promotion": {
            "subscribe", "follow me", "check my channel", "discount code", "link in bio", "dm for promo",
            "collab", "my page", "visit my", "check profile"
        },
        "Spam": {
            "crypto", "whatsapp group", "telegram", "earn daily", "investment", "bitcoin",
            "forex", "free money", "hack", "click here", "cash app"
        },
        "Reply / Response": {
            "agree", "disagree", "same here", "true", "exactly", "i think", "imo", "true that",
            "sahi baat", "bilkul", "wahi to", "हाँ", "बिल्कुल"
        }
    }

    def analyze(self, text: str) -> Dict[str, Any]:
        raw = text or ""
        t_lower = raw.casefold()
        tokens = set(re.findall(r"[\w\u0900-\u0963\u0966-\u097F']+|[?]", t_lower, flags=re.UNICODE))

        scores: Dict[str, float] = {}

        for intent, cues in self.INTENT_CUES.items():
            hit_count = len(tokens & cues)
            for phrase in cues:
                if " " in phrase and phrase in t_lower:
                    hit_count += 1.5
            if hit_count > 0:
                scores[intent] = hit_count

        # Question mark strongly boosts questioning
        if "?" in raw:
            scores["Questioning"] = scores.get("Questioning", 0) + 2.0

        # Promotional URL check
        if re.search(r"https?://|t\.me/|wa\.me/|bit\.ly/", t_lower):
            scores["Spam"] = scores.get("Spam", 0) + 3.0

        if scores:
            ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
            primary_intent, top_score = ranked[0]
            confidence = min(0.98, max(0.65, 0.55 + top_score * 0.15))
        else:
            primary_intent = "General Discussion"
            confidence = 0.60

        return {
            "intent": primary_intent,
            "intent_confidence": round(confidence, 2)
        }

intent_engine = IntentEngine()
