from typing import List, Dict, Any

# Curated Gold-Standard Multilingual Validation Dataset
BENCHMARK_DATASET: List[Dict[str, Any]] = [
    # --- English ---
    {
        "text": "This explanation was incredibly clear and helpful! Thank you so much.",
        "language": "English",
        "expected_sentiment": "Positive",
        "expected_emotion": "Joy",
        "expected_intent": "Appreciation",
        "expected_moderation": "Clear",
    },
    {
        "text": "Worst tutorial ever. The audio is terrible and code is completely broken.",
        "language": "English",
        "expected_sentiment": "Negative",
        "expected_emotion": "Anger",
        "expected_intent": "Complaint",
        "expected_moderation": "Clear",
    },
    {
        "text": "What design pattern did you use for the notification service at 15:20?",
        "language": "English",
        "expected_sentiment": "Neutral",
        "expected_emotion": "Curiosity",
        "expected_intent": "Questioning",
        "expected_moderation": "Clear",
    },
    {
        "text": "EARN $5000 A DAY WITH CRYPTO SIGNALS!! CLICK MY TELEGRAM LINK t.me/profit_fast",
        "language": "English",
        "expected_sentiment": "Positive",
        "expected_emotion": "Excitement",
        "expected_intent": "Spam",
        "expected_moderation": "Hide",
    },
    {
        "text": "You are a complete idiot and should delete your channel moron.",
        "language": "English",
        "expected_sentiment": "Negative",
        "expected_emotion": "Anger",
        "expected_intent": "Complaint",
        "expected_moderation": "Flag",
    },

    # --- Hinglish (Hindi Transliterated) ---
    {
        "text": "Bhai kya zabardast video banaya hai, maza aa gaya ekdum!",
        "language": "Hinglish",
        "expected_sentiment": "Positive",
        "expected_emotion": "Joy",
        "expected_intent": "Appreciation",
        "expected_moderation": "Clear",
    },
    {
        "text": "Ekdum bekar aur ghatiya explanation tha, time waste ho gaya mera.",
        "language": "Hinglish",
        "expected_sentiment": "Negative",
        "expected_emotion": "Frustration",
        "expected_intent": "Complaint",
        "expected_moderation": "Clear",
    },
    {
        "text": "Agla part kab aayega bhai? Fastapi deployment ka bhi video banao na please.",
        "language": "Hinglish",
        "expected_sentiment": "Positive",
        "expected_emotion": "Curiosity",
        "expected_intent": "Request",
        "expected_moderation": "Clear",
    },
    {
        "text": "Concept sahi tha par second half thoda confusing laga mujhe.",
        "language": "Hinglish",
        "expected_sentiment": "Mixed",
        "expected_emotion": "Frustration",
        "expected_intent": "Feedback",
        "expected_moderation": "Clear",
    },

    # --- Devanagari Hindi ---
    {
        "text": "बहुत ही शानदार और सटीक जानकारी दी आपने। धन्यवाद!",
        "language": "Hindi",
        "expected_sentiment": "Positive",
        "expected_emotion": "Joy",
        "expected_intent": "Appreciation",
        "expected_moderation": "Clear",
    },
    {
        "text": "यह बिल्कुल बकवास और खराब वीडियो है, कुछ समझ नहीं आया।",
        "language": "Hindi",
        "expected_sentiment": "Negative",
        "expected_emotion": "Anger",
        "expected_intent": "Complaint",
        "expected_moderation": "Clear",
    },
    {
        "text": "क्या आप इसका सोर्स कोड गिटहब पर शेयर कर सकते हैं?",
        "language": "Hindi",
        "expected_sentiment": "Neutral",
        "expected_emotion": "Curiosity",
        "expected_intent": "Questioning",
        "expected_moderation": "Clear",
    },

    # --- Emoji-Only ---
    {
        "text": "❤️🔥🙌",
        "language": "Emoji-Only",
        "expected_sentiment": "Positive",
        "expected_emotion": "Excitement",
        "expected_intent": "Appreciation",
        "expected_moderation": "Clear",
    },
    {
        "text": "😡👎🤮",
        "language": "Emoji-Only",
        "expected_sentiment": "Negative",
        "expected_emotion": "Anger",
        "expected_intent": "Complaint",
        "expected_moderation": "Clear",
    },
    {
        "text": "🤔🧐",
        "language": "Emoji-Only",
        "expected_sentiment": "Neutral",
        "expected_emotion": "Curiosity",
        "expected_intent": "Questioning",
        "expected_moderation": "Clear",
    },
]

