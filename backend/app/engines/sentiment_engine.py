import re
from typing import Dict, Any, List

class SentimentEngine:
    """
    Engine 1: Multilingual & Code-Mixed (Hinglish/English/Hindi) Sentiment Intelligence.
    Produces 5-class classification: Positive, Negative, Neutral, Mixed, Sarcastic.
    """

    SARCASM_EMOJIS = {"🙄", "😒", "🤡", "💀", "🙃", "🤦", "🤦‍♂️", "🤦‍♀️"}

    SARCASM_PHRASES = {
        "yeah right", "as if", "thanks for nothing", "what a surprise",
        "genius idea", "groundbreaking", "surely", "wah kya baat",
        "kamaal kar diya", "/s", "great job breaking it", "wow what a genius",
        "obviously", "so helpful /s", "bohot tejaswi", "kya baat hai bhai",
        "best feature ever", "so revolutionary", "such an innovation",
        "clown world", "peak engineering"
    }

    POSITIVE_WORDS = {
        # English
        "good", "great", "excellent", "amazing", "awesome", "fantastic", "outstanding", "brilliant",
        "love", "loved", "lovely", "helpful", "informative", "best", "superb", "perfect", "clear",
        "clean", "solid", "masterpiece", "valuable", "thank", "thanks", "congrats", "congratulations",
        "happy", "delightful", "glad", "gem", "pro", "impressive", "quality", "useful", "appreciate",
        # Hinglish & Hindi transliteration
        "accha", "acha", "achha", "badiya", "badhiya", "mast", "shandar", "shaandaar", "zabardast",
        "dhansu", "dhasu", "lajawab", "sahi", "faadu", "op", "kamaal", "bahut accha", "sundar",
        "pyara", "dhanyawad", "shukriya", "faad", "super",
        # Devanagari Hindi
        "अच्छा", "बढ़िया", "शानदार", "ज़बरदस्त", "बेहतरीन", "लाजवाब", "धन्यवाद", "शुक्रिया", "मस्त",
        "सुंदर", "सटीक", "कमाल", "सराहनीय"
    }

    NEGATIVE_WORDS = {
        # English
        "bad", "terrible", "worst", "poor", "horrible", "awful", "useless", "waste", "boring",
        "disappointing", "disappointed", "hate", "hated", "annoying", "garbage", "trash", "crap",
        "misleading", "fake", "clickbait", "confusing", "failed", "unclear", "wrong", "broken",
        "problem", "issue", "pathetic", "stupid", "idiot", "nonsense", "scam",
        # Hinglish & Hindi transliteration
        "bekar", "bekaar", "ghatiya", "bakwas", "bakwaas", "chirkut", "chutiya", "faltu", "faaltu",
        "kharab", "kharaab", "bura", "dimag kharab", "dhoka", "fraud", "kuch nahi", "bore",
        # Devanagari Hindi
        "बुरा", "घटिया", "बकवास", "बेकार", "खराब", "धोखा", "फालतू", "गलत", "कचरा", "निराशाजनक"
    }

    NEGATION_WORDS = {
        "not", "never", "no", "nahi", "nahin", "nhi", "mat", "na", "doesn't", "don't", "didn't",
        "haven't", "hardly", "scarcely", "न", "नहीं", "मत"
    }

    def analyze(self, text: str, emojis: List[str] = None) -> Dict[str, Any]:
        raw = text or ""
        text_lower = raw.casefold()

        # Tokenize preserving words, apostrophes, and Devanagari Hindi characters
        tokens = re.findall(r"[\w\u0900-\u0963\u0966-\u097F']+|[^\w\s\u0900-\u097F]", text_lower, flags=re.UNICODE)

        pos_count = 0
        neg_count = 0

        # Bigram negation check (e.g. "not good" -> neg, "not bad" -> pos)
        skip_next = False
        for i, word in enumerate(tokens):
            if skip_next:
                skip_next = False
                continue

            is_negated = (i > 0 and tokens[i - 1] in self.NEGATION_WORDS) or (i > 1 and tokens[i - 2] in self.NEGATION_WORDS)

            if word in self.POSITIVE_WORDS:
                if is_negated:
                    neg_count += 1.2
                else:
                    pos_count += 1.0
            elif word in self.NEGATIVE_WORDS:
                if is_negated:
                    pos_count += 0.8
                else:
                    neg_count += 1.0

        # Factor in emoji sentiment
        if emojis:
            for em in emojis:
                if em in {"❤️", "😍", "🔥", "🙌", "💯", "👏", "💖", "✨", "🎉", "👍", "🥰", "👌"}:
                    pos_count += 0.9
                elif em in {"😡", "👎", "🤮", "🤬", "💔", "💩", "😠", "🙄"}:
                    neg_count += 0.9

        # Sarcasm contextual detection (not every negative or humorous comment, but praise juxtaposed with mocking emoji/irony)
        has_sarcasm_phrase = any(phrase in text_lower for phrase in self.SARCASM_PHRASES)
        has_sarcasm_emoji = bool(emojis and any(em in self.SARCASM_EMOJIS for em in emojis))
        is_sarcastic = has_sarcasm_phrase or (has_sarcasm_emoji and pos_count > 0.5)

        # Classification decision
        if is_sarcastic:
            sentiment = "Sarcastic"
            confidence = 0.85
        elif pos_count > 0.5 and neg_count > 0.5:
            sentiment = "Mixed"
            confidence = min(0.92, 0.65 + 0.1 * min(pos_count, neg_count))
        elif pos_count > 0:
            sentiment = "Positive"
            confidence = min(0.98, 0.70 + 0.08 * pos_count)
        elif neg_count > 0:
            sentiment = "Negative"
            confidence = min(0.98, 0.70 + 0.08 * neg_count)
        else:
            sentiment = "Neutral"
            confidence = 0.65

        total_signal = (pos_count + neg_count + 1.0)
        pos_score = round(pos_count / total_signal, 2)
        neg_score = round(neg_count / total_signal, 2)
        neu_score = round(max(0.0, 1.0 - (pos_score + neg_score)), 2)

        return {
            "sentiment": sentiment,
            "sentiment_confidence": round(confidence, 2),
            "sentiment_scores": {
                "positive": pos_score,
                "negative": neg_score,
                "neutral": neu_score,
                "sarcastic": 0.85 if is_sarcastic else 0.0,
            }
        }

sentiment_engine = SentimentEngine()
