import csv
import io
from typing import List, Dict, Any

class CSVReportGenerator:
    """Generates standard RFC 4180 CSV reports for all comments and intelligence engines."""

    @staticmethod
    def generate_master_csv(comments: List[Dict[str, Any]], video_title: str = "SocialPulse Content") -> str:
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        header = [
            "Comment ID",
            "Platform",
            "Source Title",
            "Author Username",
            "Comment Text",
            "Sentiment",
            "Sentiment Confidence",
            "Dominant Emotion",
            "Emotion Scores",
            "Intent",
            "Intent Confidence",
            "Emojis Detected",
            "Is Emoji Only",
            "Spam Probability",
            "Toxicity Score",
            "Moderation Recommendation",
            "Moderation Reason",
            "Published At",
        ]
        writer.writerow(header)

        for c in comments:
            analysis = c.get("analysis", {})
            emotions_str = "; ".join(
                [f"{e['emotion']}:{e['score']}" for e in analysis.get("emotions", [])]
            )
            emojis_str = " ".join(analysis.get("emojis", []))

            row = [
                c.get("id", ""),
                c.get("platform", ""),
                c.get("content_title", video_title),
                c.get("username", "Anonymous"),
                c.get("text", ""),
                analysis.get("sentiment", "Neutral"),
                analysis.get("sentiment_confidence", 0.0),
                analysis.get("dominant_emotion", "Neutral"),
                emotions_str,
                analysis.get("intent", "General Discussion"),
                analysis.get("intent_confidence", 0.0),
                emojis_str,
                "Yes" if analysis.get("emoji_only") else "No",
                analysis.get("spam_probability", 0.0),
                analysis.get("toxicity_score", 0.0),
                analysis.get("moderation_action_recommended", "Clear"),
                analysis.get("moderation_reason", "") or "",
                c.get("published_at", "") or "",
            ]
            writer.writerow(row)

        return output.getvalue()

csv_generator = CSVReportGenerator()

