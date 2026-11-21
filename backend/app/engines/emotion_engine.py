import re
from typing import Dict, Any, List

class EmotionEngine:
    """
    Engine 2: Fine-Grained 10-Class Emotional Intelligence Meter.
    Detects: Joy, Love, Excitement, Anger, Sadness, Surprise, Fear, Disgust, Frustration, Curiosity.
    Supports multi-label emotion scoring without conflating positive tone with pure happiness.
    """

    EMOTION_LEXICONS = {
        "Joy": {
            "happy", "joy", "glad", "delighted", "cheerful", "smile", "laughing", "hilarious",
            "khushi", "hasna", "mast", "maza", "khush", "मस्त", "खुश", "हंसी", "मज़ा"
        },
        "Love": {
            "love", "loved", "lovely", "adore", "heartwarming", "wholesome", "sweet", "darling",
            "pyaar", "pyar", "mohabbat", "dil", "dil jeet liya", "प्यार", "मोहब्बत", "दिल"
        },
        "Excitement": {
            "excited", "hyped", "pumped", "cant wait", "can't wait", "insane", "banger", "lit", "fire",
            "zabardast", "dhansu", "dhamaka", "faad", "रोमांच", "धमाका", "ज़बरदस्त"
        },
        "Anger": {
            "angry", "mad", "furious", "outraged", "enraged", "pissed", "hate", "scoundrel",
            "gussa", "dimag kharab", "chidh", "गुस्सा", "क्रोधित", "नाराज़"
        },
        "Sadness": {
            "sad", "depressed", "unhappy", "crying", "heartbroken", "gloomy", "tears", "loss",
            "dukhi", "dard", "afsos", "rona", "udaas", "udas", "दुख", "उदास", "दर्द", "आंसू"
        },
        "Surprise": {
            "surprised", "shocked", "stunned", "astonished", "unbelievable", "unexpected", "woah", "whoa",
            "hairan", "achambha", "chauk", "हैरान", "आश्चर्यचकित", "चौंक"
        },
        "Fear": {
            "fear", "scared", "terrified", "frightened", "creepy", "horror", "panic",
            "darr", "dar", "bhay", "khauf", "डर", "खौफ", "भय"
        },
        "Disgust": {
            "disgust", "disgusted", "gross", "sickening", "nasty", "revolting", "vomit", "cringe",
            "ghin", "ghatiya", "chee", "घिन", "घिनौना"
        },
        "Frustration": {
            "frustrated", "frustrating", "annoyed", "irritating", "fed up", "waste of time",
            "boring", "useless", "confusing", "unclear", "pareshan", "tang", "परेशान", "तंग"
        },
        "Curiosity": {
            "curious", "wondering", "why", "how", "what", "when", "where", "explain", "question",
            "kya", "kyu", "kyun", "kaise", "kab", "kaha", "kahan", "क्यों", "कैसे", "क्या", "कब"
        }
    }

    EMOTION_EMOJIS = {
        "Joy": {"😂", "🤣", "😀", "😃", "😄", "😆"},
        "Love": {"❤️", "💖", "💕", "😍", "🥰", "😘", "💓", "💗"},
        "Excitement": {"🔥", "⚡", "🚀", "🎉", "🤩", "✨", "🙌", "💯"},
        "Anger": {"😡", "🤬", "😠", "👿"},
        "Sadness": {"😢", "😥", "💔", "😞", "😔"},
        "Surprise": {"😲", "😮", "🤯", "😳", "😱"},
        "Fear": {"😨", "😰", "👻", "🥶"},
        "Disgust": {"🤮", "🤢", "💩", "🤢"},
        "Frustration": {"🙄", "🤦", "🤦‍♂️", "🤦‍♀️", "😤", "😒"},
        "Curiosity": {"🤔", "🧐", "❓", "❔"}
    }

    def analyze(self, text: str, emojis: List[str] = None) -> Dict[str, Any]:
        raw = text or ""
        t_lower = raw.casefold()
        tokens = set(re.findall(r"[\w\u0900-\u0963\u0966-\u097F']+|[?]", t_lower, flags=re.UNICODE))

        scores: Dict[str, float] = {}

        for emotion, terms in self.EMOTION_LEXICONS.items():
            hit_count = len(tokens & terms)
            # Check phrases
            for term in terms:
                if " " in term and term in t_lower:
                    hit_count += 1.5
            scores[emotion] = hit_count * 0.35

        # Check emojis
        if emojis:
            for em in emojis:
                for emotion, emo_set in self.EMOTION_EMOJIS.items():
                    if em in emo_set:
                        scores[emotion] = scores.get(emotion, 0.0) + 0.45

        # Contextual handling for 😭 (crying emoji):
        if emojis and "😭" in emojis:
            if any(w in t_lower for w in ["lmao", "lol", "dead", "has", "funny", "mar gaya", "hilarious"]):
                scores["Joy"] = scores.get("Joy", 0.0) + 0.5
            else:
                scores["Sadness"] = scores.get("Sadness", 0.0) + 0.45

        # Format emotions list
        detected_emotions: List[Dict[str, Any]] = []
        for emo, raw_score in scores.items():
            if raw_score > 0:
                norm_score = min(0.98, max(0.40, raw_score))
                detected_emotions.append({
                    "emotion": emo,
                    "score": round(norm_score, 2)
                })

        detected_emotions.sort(key=lambda x: x["score"], reverse=True)

        dominant = detected_emotions[0]["emotion"] if detected_emotions else "Neutral"

        return {
            "dominant_emotion": dominant,
            "emotions": detected_emotions[:4],
        }

emotion_engine = EmotionEngine()
