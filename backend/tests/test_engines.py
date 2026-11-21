import pytest
from app.engines.sentiment_engine import sentiment_engine
from app.engines.emotion_engine import emotion_engine
from app.engines.intent_engine import intent_engine
from app.engines.emoji_engine import emoji_engine
from app.engines.moderation_engine import moderation_engine
from app.engines.pipeline import pipeline

def test_engine_1_sentiment():
    # English Positive
    res1 = sentiment_engine.analyze("This explanation was amazing and clear!")
    assert res1["sentiment"] == "Positive"
    assert res1["sentiment_confidence"] >= 0.7

    # Negation Handling
    res_neg = sentiment_engine.analyze("This was not good at all, very bad.")
    assert res_neg["sentiment"] == "Negative"

    # Hinglish Positive
    res2 = sentiment_engine.analyze("Bhai kya zabardast aur mast video banaya hai!")
    assert res2["sentiment"] == "Positive"

    # Devanagari Hindi Negative
    res3 = sentiment_engine.analyze("यह बिल्कुल बकवास और खराब वीडियो है।")
    assert res3["sentiment"] == "Negative"

    # Contextual Sarcasm: Positive words + sarcastic emoji
    res_sarc = sentiment_engine.analyze("Amazing feature, broke on the first try 🙄", emojis=["🙄"])
    assert res_sarc["sentiment"] == "Sarcastic"
    assert res_sarc["sentiment_scores"]["sarcastic"] > 0

    # Sarcastic phrase
    res_sarc2 = sentiment_engine.analyze("Yeah right, what a genius idea that was")
    assert res_sarc2["sentiment"] == "Sarcastic"

def test_engine_2_emotional_meter():
    # Curiosity
    res = emotion_engine.analyze("How does this microservice cache work?")
    assert res["dominant_emotion"] == "Curiosity"

    # Joy & Love
    res2 = emotion_engine.analyze("Loved this so much, dil jeet liya!", emojis=["❤️"])
    assert res2["dominant_emotion"] in ("Love", "Joy")

    # Contextual 😭 laughter vs sadness
    res_laugh = emotion_engine.analyze("This joke was hilarious lmao 😭", emojis=["😭"])
    assert res_laugh["dominant_emotion"] == "Joy"

def test_engine_3_intent():
    # Questioning
    res_q = intent_engine.analyze("Can you share the GitHub repository link?")
    assert res_q["intent"] in ("Questioning", "Request")

    # Spam
    res_sp = intent_engine.analyze("Earn $5000 daily with crypto signals! Click link in bio t.me/fast_profit")
    assert res_sp["intent"] in ("Spam", "Promotion")

def test_engine_4_emojis():
    res = emoji_engine.analyze("Amazing video! ❤️🔥💯")
    assert set(res["emojis"]) == {"❤️", "🔥", "💯"}
    assert res["emoji_only"] is False

    # Emoji only
    res_only = emoji_engine.analyze("🔥🚀")
    assert res_only["emoji_only"] is True

def test_engine_5_moderation():
    # Spam detection
    res_spam = moderation_engine.analyze("Join our whatsapp group for daily crypto signals: wa.me/123456789")
    assert res_spam["spam_probability"] >= 0.70
    assert res_spam["moderation_action_recommended"] in ("Review", "Hide")

    # Abuse/toxic detection
    res_toxic = moderation_engine.analyze("You are a stupid idiot and complete moron.")
    assert res_toxic["toxicity_score"] >= 0.70
    assert res_toxic["moderation_action_recommended"] == "Flag"

    # Clean
    res_clean = moderation_engine.analyze("Thanks for the helpful video!")
    assert res_clean["moderation_action_recommended"] == "Clear"

