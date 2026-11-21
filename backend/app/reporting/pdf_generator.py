import io
from typing import List, Dict, Any

class PDFReportGenerator:
    """Generates professional executive PDF analytics reports."""

    @staticmethod
    def generate_pdf(summary: Dict[str, Any], comments: List[Dict[str, Any]], video: Dict[str, Any] = None) -> bytes:
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib import colors
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
            styles = getSampleStyleSheet()

            # Custom styling matching SOCIALPULSE dark branding
            title_style = ParagraphStyle(
                'TitleStyle',
                parent=styles['Heading1'],
                fontSize=20,
                textColor=colors.HexColor('#1E1B4B'),
                spaceAfter=6,
            )
            subtitle_style = ParagraphStyle(
                'SubStyle',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#64748B'),
                spaceAfter=14,
            )
            section_style = ParagraphStyle(
                'SectionStyle',
                parent=styles['Heading2'],
                fontSize=13,
                textColor=colors.HexColor('#4338CA'),
                spaceBefore=12,
                spaceAfter=6,
            )
            body_style = ParagraphStyle(
                'BodyStyle',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#334155'),
            )

            story = []

            # 1. Header
            story.append(Paragraph("SOCIALPULSE AI — EXECUTIVE COMMENT INTELLIGENCE REPORT", title_style))
            content_name = video.get("title", "Social Media Session") if video else "Analyzed Content Session"
            story.append(Paragraph(f"Session Target: <b>{content_name}</b> | Generated: Oct 2026", subtitle_style))
            story.append(Spacer(1, 10))

            # 2. Executive KPI Table
            net_sentiment = summary.get("net_sentiment_score", 0.0)
            net_str = f"+{net_sentiment}" if net_sentiment > 0 else f"{net_sentiment}"
            kpi_data = [
                ["Total Comments Analyzed", "Net Sentiment Score", "Dominant Emotion", "Flagged for Moderation"],
                [
                    str(summary.get("total_comments", len(comments))),
                    net_str,
                    summary.get("dominant_emotion", "Neutral"),
                    str(summary.get("moderation_summary", {}).get("flagged_count", 0)),
                ]
            ]
            kpi_table = Table(kpi_data, colWidths=[130, 130, 130, 130])
            kpi_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EEF2FF')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#312E81')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('FONTSIZE', (0, 1), (-1, 1), 12),
                ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
            ]))
            story.append(kpi_table)
            story.append(Spacer(1, 14))

            # 3. Sentiment & Emotion Breakdown
            story.append(Paragraph("1. Sentiment & Emotional Distribution", section_style))
            s_pcts = summary.get("sentiment_percentages", {})
            e_pcts = summary.get("emotion_percentages", {})
            dist_data = [
                ["Positive Sentiment", f"{s_pcts.get('Positive', 0.0)}%", "Joy Prevalence", f"{e_pcts.get('Joy', 0.0)}%"],
                ["Negative Sentiment", f"{s_pcts.get('Negative', 0.0)}%", "Curiosity Prevalence", f"{e_pcts.get('Curiosity', 0.0)}%"],
                ["Neutral Sentiment", f"{s_pcts.get('Neutral', 0.0)}%", "Frustration Prevalence", f"{e_pcts.get('Frustration', 0.0)}%"],
                ["Mixed Sentiment", f"{s_pcts.get('Mixed', 0.0)}%", "Anger Prevalence", f"{e_pcts.get('Anger', 0.0)}%"],
            ]
            dist_table = Table(dist_data, colWidths=[150, 100, 150, 100])
            dist_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                ('FONTSIZE', (0, 0), (-1, -1), 8.5),
                ('PADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(dist_table)
            story.append(Spacer(1, 14))

            # 4. Moderation Compliance Section
            story.append(Paragraph("2. Auto Moderation & Risk Summary", section_style))
            mod_s = summary.get("moderation_summary", {})
            mod_data = [
                ["Risk Metric", "Count", "Policy Status"],
                ["Spam Solicitations Detected", str(mod_s.get("spam_count", 0)), "Hidden/Queued"],
                ["Toxic / Harassment Attacks", str(mod_s.get("toxic_count", 0)), "Flagged for Human Review"],
                ["Duplicate Comments", str(mod_s.get("duplicate_count", 0)), "Marked Duplicate"],
                ["Clean Organic Audience Feedback", str(mod_s.get("clean_count", 0)), "Cleared"],
            ]
            mod_table = Table(mod_data, colWidths=[200, 100, 200])
            mod_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FEF2F2')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#991B1B')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('FONTSIZE', (0, 0), (-1, -1), 8.5),
                ('PADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(mod_table)
            story.append(Spacer(1, 14))

            # 5. Sample Selected Comments
            story.append(Paragraph("3. Audited Comment Records (Top Signals)", section_style))
            comment_rows = [["Author", "Comment Text", "Sentiment", "Intent", "Recommendation"]]
            for c in comments[:6]:
                a = c.get("analysis", {})
                txt = c.get("text", "")[:60] + ("..." if len(c.get("text", "")) > 60 else "")
                comment_rows.append([
                    c.get("username", "user")[:15],
                    txt,
                    a.get("sentiment", "Neutral"),
                    a.get("intent", "General"),
                    a.get("moderation_action_recommended", "Clear"),
                ])
            c_table = Table(comment_rows, colWidths=[90, 210, 65, 75, 60])
            c_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('PADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(c_table)

            doc.build(story)
            return buffer.getvalue()
        except ImportError:
            # Fallback simple text-based PDF or binary placeholder if reportlab isn't ready
            return b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000108 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF"

pdf_generator = PDFReportGenerator()

