import pytest
from app.evaluation.evaluator import evaluator

def test_evaluator_benchmark():
    report = evaluator.run_evaluation()

    metrics = report["evaluation_metrics"]
    assert "measured_accuracy" in metrics
    assert "model_average_confidence" in metrics
    assert "macro_f1" in metrics
    assert metrics["measured_accuracy"] > 0.70

    # Ensure all language slices are measured
    lang_slices = report["language_slice_performance"]
    assert "English" in lang_slices
    assert "Hinglish" in lang_slices
    assert "Hindi" in lang_slices
    assert "Emoji-Only" in lang_slices

    for lang, stats in lang_slices.items():
        assert stats["total"] > 0
        assert stats["accuracy"] >= 0.50

