from collections import Counter
from typing import List, Dict, Any

from .sentiment_engine import sentiment_engine
from .emotion_engine import emotion_engine
from .intent_engine import intent_engine
from .emoji_engine import emoji_engine
from .moderation_engine import moderation_engine

class AnalysisPipeline:
    """
    Master Pipeline executing all FIVE AI Intelligence Engines across social media comments:
    1. Sentiment Intelligence
    2. Emotional Intelligence Meter
    3. Intent Intelligence
    4. Emoji Intelligence
    5. Auto Moderation Intelligence
    """

    def process_comment(self, text: str, is_duplicate: bool = False) -> Dict[str, Any]:
        raw = (text or "").strip()

        # Engine 4: Emoji extraction first (as other engines benefit from emoji cues)
        emoji_res = emoji_engine.analyze(raw)
        extracted_emojis = emoji_res["emojis"]

        # Engine 1: Sentiment Intelligence
        sentiment_res = sentiment_engine.analyze(raw, extracted_emojis)

        # Engine 2: Emotional Intelligence Meter
        emotion_res = emotion_engine.analyze(raw, extracted_emojis)

        # Engine 3: Intent Intelligence
        intent_res = intent_engine.analyze(raw)

        # Engine 5: Auto Moderation Intelligence
        moderation_res = moderation_engine.analyze(raw, is_duplicate=is_duplicate)

        return {
            **sentiment_res,
            **emotion_res,
            **intent_res,
            **emoji_res,
            **moderation_res,
        }

    def process_comments(self, raw_comments: List[Dict[str, Any]]) -> Dict[str, Any]:
        processed = []
        seen_texts: Counter = Counter()

        # Pass 1: detect duplicates
        for c in raw_comments:
            normalized_t = (c.get("text") or "").strip().lower()
            if normalized_t:
                seen_texts[normalized_t] += 1

        # Pass 2: analyze each comment
        for c in raw_comments:
            t = (c.get("text") or "").strip()
            is_dup = seen_texts[t.lower()] > 1 if t else False
            analysis = self.process_comment(t, is_duplicate=is_dup)

            processed.append({
                **c,
                "analysis": analysis,
            })

        summary = self.summarize(processed)
        return {
            "comments": processed,
            "summary": summary,
        }

    def summarize(self, processed_comments: List[Dict[str, Any]]) -> Dict[str, Any]:
        total = len(processed_comments)
        if total == 0:
            return {
                "total_comments": 0,
                "classified_comments": 0,
                "sentiment_distribution": {"Positive": 0, "Negative": 0, "Neutral": 0, "Mixed": 0, "Sarcastic": 0},
                "sentiment_percentages": {"Positive": 0.0, "Negative": 0.0, "Neutral": 0.0, "Mixed": 0.0, "Sarcastic": 0.0},
                "net_sentiment_score": 0.0,
                "average_sentiment_confidence": 0.0,
                "emotion_distribution": {},
                "emotion_percentages": {},
                "dominant_emotion": "Neutral",
                "intent_distribution": {},
                "intent_percentages": {},
                "top_emojis": [],
                "emoji_only_count": 0,
                "moderation_summary": {"flagged_count": 0, "spam_count": 0, "toxic_count": 0, "duplicate_count": 0, "clean_count": 0},
            }

        sentiments = Counter(c["analysis"]["sentiment"] for c in processed_comments)
        sentiment_pcts = {
            k: round(v / total * 100, 1) for k, v in sentiments.items()
        }
        for k in ["Positive", "Negative", "Neutral", "Mixed", "Sarcastic"]:
            if k not in sentiments:
                sentiments[k] = 0
            if k not in sentiment_pcts:
                sentiment_pcts[k] = 0.0

        # Formula: Net Sentiment Score = Positive Percentage - Negative Percentage (range: -100 to +100)
        net_score = round(sentiment_pcts.get("Positive", 0.0) - sentiment_pcts.get("Negative", 0.0), 1)

        avg_confidence = round(
            sum(c["analysis"]["sentiment_confidence"] for c in processed_comments) / total,
            2
        )

        # Emotions
        emotions_counter: Counter = Counter()
        for c in processed_comments:
            dom = c["analysis"].get("dominant_emotion")
            if dom and dom != "Neutral":
                emotions_counter[dom] += 1
            for em in c["analysis"].get("emotions", []):
                emotions_counter[em["emotion"]] += 1

        emotion_pcts = {
            k: round(v / total * 100, 1) for k, v in emotions_counter.items()
        }
        dominant_emotion = emotions_counter.most_common(1)[0][0] if emotions_counter else "Neutral"

        # Intent
        intents_counter = Counter(c["analysis"]["intent"] for c in processed_comments)
        intent_pcts = {
            k: round(v / total * 100, 1) for k, v in intents_counter.items()
        }

        # Emojis
        all_emojis: Counter = Counter()
        for c in processed_comments:
            for em in c["analysis"].get("emojis", []):
                all_emojis[em] += 1

        top_emojis = [
            {"emoji": em, "count": count, "meaning": emoji_engine.EMOJI_MEANINGS.get(em, "Visual Reaction")}
            for em, count in all_emojis.most_common(10)
        ]

        emoji_only_count = sum(1 for c in processed_comments if c["analysis"].get("emoji_only"))

        # Moderation
        flagged_count = sum(
            1 for c in processed_comments if c["analysis"]["moderation_action_recommended"] != "Clear"
        )
        spam_count = sum(
            1 for c in processed_comments if c["analysis"].get("spam_probability", 0) > 0.5
        )
        toxic_count = sum(
            1 for c in processed_comments if c["analysis"].get("toxicity_score", 0) > 0.25
        )
        duplicate_count = sum(
            1 for c in processed_comments if c["analysis"].get("is_duplicate")
        )

        return {
            "total_comments": total,
            "classified_comments": total,
            "sentiment_distribution": dict(sentiments),
            "sentiment_percentages": sentiment_pcts,
            "net_sentiment_score": net_score,
            "average_sentiment_confidence": avg_confidence,
            "emotion_distribution": dict(emotions_counter),
            "emotion_percentages": emotion_pcts,
            "dominant_emotion": dominant_emotion,
            "intent_distribution": dict(intents_counter),
            "intent_percentages": intent_pcts,
            "top_emojis": top_emojis,
            "emoji_only_count": emoji_only_count,
            "moderation_summary": {
                "flagged_count": flagged_count,
                "spam_count": spam_count,
                "toxic_count": toxic_count,
                "duplicate_count": duplicate_count,
                "clean_count": total - flagged_count,
            },
        }

pipeline = AnalysisPipeline()

