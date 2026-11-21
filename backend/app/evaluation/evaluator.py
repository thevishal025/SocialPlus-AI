from collections import defaultdict
from typing import Dict, Any, List
from .benchmark_dataset import BENCHMARK_DATASET
from ..engines.pipeline import pipeline

class ModelEvaluator:
    """
    Evaluates the 5 AI engines on the gold-standard multilingual benchmark dataset.
    Calculates Precision, Recall, F1, and slices performance across English, Hindi, Hinglish, and Emoji-only.
    """

    def run_evaluation(self, dataset: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = dataset or BENCHMARK_DATASET
        total = len(data)

        sentiment_correct = 0
        sentiment_matrix = defaultdict(lambda: defaultdict(int))
        confidence_sum = 0.0

        lang_perf = defaultdict(lambda: {"total": 0, "correct": 0})
        intent_perf = {"total": 0, "correct": 0}
        emotion_perf = {"total": 0, "correct": 0}
        moderation_perf = {"total": 0, "correct": 0}

        # Class counts for precision/recall
        classes = ["Positive", "Negative", "Neutral", "Mixed"]
        tp = defaultdict(int)
        fp = defaultdict(int)
        fn = defaultdict(int)

        for item in data:
            text = item["text"]
            lang = item["language"]
            expected_sent = item["expected_sentiment"]
            expected_intent = item["expected_intent"]
            expected_emotion = item["expected_emotion"]
            expected_mod = item["expected_moderation"]

            analysis = pipeline.process_comment(text)
            pred_sent = analysis["sentiment"]
            pred_intent = analysis["intent"]
            pred_emotion = analysis["dominant_emotion"]
            pred_mod = analysis["moderation_action_recommended"]
            conf = analysis["sentiment_confidence"]

            confidence_sum += conf
            lang_perf[lang]["total"] += 1

            # Confusion Matrix & Sentiment TP/FP/FN
            sentiment_matrix[expected_sent][pred_sent] += 1
            if pred_sent == expected_sent:
                sentiment_correct += 1
                lang_perf[lang]["correct"] += 1
                tp[expected_sent] += 1
            else:
                fp[pred_sent] += 1
                fn[expected_sent] += 1

            # Intent Check
            intent_perf["total"] += 1
            if pred_intent == expected_intent:
                intent_perf["correct"] += 1

            # Emotion Check
            emotion_perf["total"] += 1
            if pred_emotion == expected_emotion or any(e["emotion"] == expected_emotion for e in analysis.get("emotions", [])):
                emotion_perf["correct"] += 1

            # Moderation Check
            moderation_perf["total"] += 1
            if pred_mod == expected_mod or (expected_mod != "Clear" and pred_mod != "Clear"):
                moderation_perf["correct"] += 1

        # Calculate macro Precision, Recall, F1
        precisions = []
        recalls = []
        f1s = []

        for c in classes:
            p = tp[c] / (tp[c] + fp[c]) if (tp[c] + fp[c]) > 0 else 0.0
            r = tp[c] / (tp[c] + fn[c]) if (tp[c] + fn[c]) > 0 else 0.0
            f1 = (2 * p * r) / (p + r) if (p + r) > 0 else 0.0
            precisions.append(p)
            recalls.append(r)
            f1s.append(f1)

        macro_precision = round(sum(precisions) / len(classes), 3)
        macro_recall = round(sum(recalls) / len(classes), 3)
        macro_f1 = round(sum(f1s) / len(classes), 3)

        measured_accuracy = round(sentiment_correct / total, 3) if total else 0.0
        avg_confidence = round(confidence_sum / total, 3) if total else 0.0

        lang_accuracy = {
            lang: {
                "total": stats["total"],
                "accuracy": round(stats["correct"] / stats["total"], 2) if stats["total"] else 0.0
            }
            for lang, stats in lang_perf.items()
        }

        return {
            "evaluation_metrics": {
                "measured_accuracy": measured_accuracy,
                "model_average_confidence": avg_confidence,
                "confidence_accuracy_delta": round(avg_confidence - measured_accuracy, 3),
                "macro_precision": macro_precision,
                "macro_recall": macro_recall,
                "macro_f1": macro_f1,
            },
            "language_slice_performance": lang_accuracy,
            "engine_accuracy": {
                "sentiment_accuracy": measured_accuracy,
                "emotion_accuracy": round(emotion_perf["correct"] / emotion_perf["total"], 2),
                "intent_accuracy": round(intent_perf["correct"] / intent_perf["total"], 2),
                "moderation_accuracy": round(moderation_perf["correct"] / moderation_perf["total"], 2),
            },
            "confusion_matrix": {k: dict(v) for k, v in sentiment_matrix.items()},
        }

evaluator = ModelEvaluator()

