import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnalysisResponse, EcommerceAnalysisResponse, CommentItem } from '../api/types';
import { extractTopKeywords, formatKeywordDisplay } from './keywords';

// HTML escape helper to prevent script injection
function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface NormalizedReportData {
  platform: string;
  title: string;
  sourceUrl?: string;
  authorOrChannel?: string;
  timestamp: string;
  totalComments: number;
  netSentiment: number;
  dominantSentiment: string;
  dominantEmotion: string;
  sentimentDistribution: {
    Positive: number;
    Negative: number;
    Neutral: number;
    Mixed: number;
    Sarcastic: number;
  };
  sentimentPercentages: {
    Positive: number;
    Negative: number;
    Neutral: number;
    Mixed: number;
    Sarcastic: number;
  };
  emotionDistribution: Record<string, number>;
  intentDistribution: Record<string, number>;
  topEmojis: Array<{ emoji: string; count: number; meaning: string }>;
  moderationSummary: {
    flaggedCount: number;
    spamCount: number;
    toxicCount: number;
    cleanCount: number;
  };
  topKeywords: Array<{ word: string; count: number; percent: number }>;
  comments: CommentItem[];
  top10Liked: CommentItem[];
  productMeta?: {
    price?: string;
    brand?: string;
    averageRating?: number;
    platform?: string;
  };
}

export function normalizeReportData(
  raw: AnalysisResponse | EcommerceAnalysisResponse,
  fallbackPlatform?: string,
  fallbackTitle?: string
): NormalizedReportData {
  const isEcommerce = 'product' in raw;
  const rawAny = raw as any;

  // Platform detection
  let platform = fallbackPlatform || (isEcommerce ? rawAny.product?.platform || 'E-Commerce' : rawAny.video?.platform || 'Social Media');
  platform = platform.charAt(0).toUpperCase() + platform.slice(1);

  // Title detection
  let title = fallbackTitle || (isEcommerce ? rawAny.product?.title : rawAny.video?.title) || 'Comment Intelligence Dataset';

  // Source URL
  const sourceUrl = isEcommerce ? rawAny.product?.url : (rawAny.video?.id ? `https://www.youtube.com/watch?v=${rawAny.video.id}` : undefined);

  // Author / Channel
  const authorOrChannel = isEcommerce ? rawAny.product?.brand : rawAny.video?.channel;

  // Summary mapping
  const summary = rawAny.summary || {};
  const totalComments = summary.total_comments || rawAny.comments?.length || 0;
  const netSentiment = typeof summary.net_sentiment_score === 'number' ? summary.net_sentiment_score : 0;

  const sentimentDistribution = {
    Positive: summary.sentiment_distribution?.Positive || 0,
    Negative: summary.sentiment_distribution?.Negative || 0,
    Neutral: summary.sentiment_distribution?.Neutral || 0,
    Mixed: summary.sentiment_distribution?.Mixed || 0,
    Sarcastic: summary.sentiment_distribution?.Sarcastic || 0,
  };

  const sentimentPercentages = {
    Positive: summary.sentiment_percentages?.Positive ?? (totalComments > 0 ? Math.round((sentimentDistribution.Positive / totalComments) * 100) : 0),
    Negative: summary.sentiment_percentages?.Negative ?? (totalComments > 0 ? Math.round((sentimentDistribution.Negative / totalComments) * 100) : 0),
    Neutral: summary.sentiment_percentages?.Neutral ?? (totalComments > 0 ? Math.round((sentimentDistribution.Neutral / totalComments) * 100) : 0),
    Mixed: summary.sentiment_percentages?.Mixed ?? (totalComments > 0 ? Math.round((sentimentDistribution.Mixed / totalComments) * 100) : 0),
    Sarcastic: summary.sentiment_percentages?.Sarcastic ?? (totalComments > 0 ? Math.round((sentimentDistribution.Sarcastic / totalComments) * 100) : 0),
  };

  const dominantSentiment =
    Object.entries(sentimentDistribution).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'Positive';

  const dominantEmotion = summary.dominant_emotion || 'Joy';
  const emotionDistribution = summary.emotion_distribution || {};
  const intentDistribution = summary.intent_distribution || {};
  const topEmojis = summary.top_emojis || [];

  const mod = summary.moderation_summary || {};
  const moderationSummary = {
    flaggedCount: mod.flagged_count || 0,
    spamCount: mod.spam_count || 0,
    toxicCount: mod.toxic_count || 0,
    cleanCount: mod.clean_count || Math.max(0, totalComments - (mod.flagged_count || 0)),
  };

  const comments: CommentItem[] = rawAny.comments || [];

  // Extract top keywords using standardized extractor
  const topKeywords = extractTopKeywords(comments, 15);

  // Extract Top 10 Most Liked / Helpful comments
  const top10Liked = comments
    .slice()
    .sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
    .slice(0, 10);

  const productMeta = isEcommerce
    ? {
        price: rawAny.product?.price,
        brand: rawAny.product?.brand,
        averageRating: rawAny.product?.average_rating,
        platform: rawAny.product?.platform,
      }
    : undefined;

  return {
    platform,
    title,
    sourceUrl,
    authorOrChannel,
    timestamp: new Date().toLocaleString(),
    totalComments,
    netSentiment,
    dominantSentiment,
    dominantEmotion,
    sentimentDistribution,
    sentimentPercentages,
    emotionDistribution,
    intentDistribution,
    topEmojis,
    moderationSummary,
    topKeywords,
    comments,
    top10Liked,
    productMeta,
  };
}

/**
 * 1. STANDALONE HTML REPORT GENERATOR
 * Produces a portable, fully self-contained HTML report with embedded CSS.
 */
export function generateHTMLReport(
  raw: AnalysisResponse | EcommerceAnalysisResponse,
  fallbackPlatform?: string,
  fallbackTitle?: string
): string {
  const d = normalizeReportData(raw, fallbackPlatform, fallbackTitle);

  const netSentimentClass = d.netSentiment > 0 ? 'color: #10B981;' : d.netSentiment < 0 ? 'color: #F43F5E;' : 'color: #A1A1A1;';
  const netSentimentPrefix = d.netSentiment > 0 ? '+' : '';

  // Emotion distribution bars
  const emotionRows = Object.entries(d.emotionDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([emotion, count]) => {
      const pct = d.totalComments > 0 ? Math.round((count / d.totalComments) * 100) : 0;
      return `
        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span>${escapeHtml(emotion)}</span>
            <span style="font-weight: 700; color: #FFD700;">${count} (${pct}%)</span>
          </div>
          <div style="background: #222; border-radius: 9999px; height: 8px; overflow: hidden;">
            <div style="background: linear-gradient(90deg, #FFD700, #FFC928); height: 100%; width: ${Math.min(pct * 2, 100)}%;"></div>
          </div>
        </div>
      `;
    })
    .join('');

  // Intent distribution bars
  const intentRows = Object.entries(d.intentDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([intent, count]) => {
      const pct = d.totalComments > 0 ? Math.round((count / d.totalComments) * 100) : 0;
      return `
        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span>${escapeHtml(intent)}</span>
            <span style="font-weight: 700; color: #0EA5E9;">${count} (${pct}%)</span>
          </div>
          <div style="background: #222; border-radius: 9999px; height: 8px; overflow: hidden;">
            <div style="background: #0EA5E9; height: 100%; width: ${Math.min(pct * 2, 100)}%;"></div>
          </div>
        </div>
      `;
    })
    .join('');

  // Keywords table
  const keywordRows = d.topKeywords
    .map(
      (kw, i) => `
      <tr style="border-bottom: 1px solid #292929;">
        <td style="padding: 10px; font-weight: bold; color: #888;">#${i + 1}</td>
        <td style="padding: 10px; font-weight: bold; color: #FFF;">${escapeHtml(kw.word)}</td>
        <td style="padding: 10px; font-weight: bold; color: #FFD700;">${kw.count}</td>
        <td style="padding: 10px; color: #A1A1A1;">${kw.percent}%</td>
        <td style="padding: 10px; width: 140px;">
          <div style="background: #222; border-radius: 9999px; height: 6px; overflow: hidden;">
            <div style="background: #FFD700; height: 100%; width: ${Math.min(kw.percent * 2, 100)}%;"></div>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

    // Top 10 Most Liked Comments rows
    const top10LikedRows = d.top10Liked
      .map((c, i) => {
        const sent = c.analysis.sentiment || 'Neutral';
        const sentBg =
          sent === 'Positive'
            ? 'background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3);'
            : sent === 'Negative'
            ? 'background: rgba(244, 63, 94, 0.15); color: #F43F5E; border: 1px solid rgba(244, 63, 94, 0.3);'
            : sent === 'Sarcastic'
            ? 'background: rgba(168, 85, 247, 0.15); color: #A855F7; border: 1px solid rgba(168, 85, 247, 0.3);'
            : sent === 'Mixed'
            ? 'background: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.3);'
            : 'background: rgba(14, 165, 233, 0.15); color: #0EA5E9; border: 1px solid rgba(14, 165, 233, 0.3);';

        return `
        <tr style="border-bottom: 1px solid #242424;">
          <td style="padding: 10px; color: #FFD700; font-weight: bold; font-size: 11px;">#${i + 1}</td>
          <td style="padding: 10px; font-weight: 600; color: #FFF; font-size: 12px; white-space: nowrap;">@${escapeHtml(c.username || 'user')}</td>
          <td style="padding: 10px; font-weight: 700; color: #FFD700; font-size: 12px; white-space: nowrap;">❤️ ${c.like_count || 0}</td>
          <td style="padding: 10px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; ${sentBg}">
              ${escapeHtml(sent)}
            </span>
          </td>
          <td style="padding: 10px; font-size: 12px; color: #FFC928;">${escapeHtml(c.analysis.dominant_emotion || '-')}</td>
          <td style="padding: 10px; font-size: 11px; color: #0EA5E9;">${escapeHtml(c.analysis.intent || '-')}</td>
          <td style="padding: 10px; font-size: 12px; color: #DDD; max-width: 440px; word-break: break-word; line-height: 1.4;">
            ${escapeHtml(c.text)}
          </td>
        </tr>
      `;
      })
      .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SocialPlus.ai Report — ${escapeHtml(d.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #080808;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 32px 20px;
      line-height: 1.5;
    }
    .container { max-width: 1050px; margin: 0 auto; }
    .card {
      background: #171717;
      border: 1px solid #292929;
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #292929;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #FFFFFF;
    }
    .brand-accent { color: #FFD700; }
    .tagline {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #A1A1A1;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #111111;
      border: 1px solid #292929;
      border-radius: 12px;
      padding: 18px;
    }
    .kpi-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #A1A1A1; }
    .kpi-value { font-size: 26px; font-weight: 900; margin: 6px 0 2px 0; color: #FFFFFF; }
    .kpi-sub { font-size: 11px; color: #777; }
    .section-title {
      font-size: 16px;
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 16px;
      background: #FFD700;
      border-radius: 2px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
    th {
      background: #111111;
      color: #A1A1A1;
      padding: 10px;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      border-bottom: 1px solid #292929;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #666;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #222;
    }
    @media print {
      body { background: #FFF !important; color: #000 !important; }
      .card { background: #FFF !important; border: 1px solid #CCC !important; color: #000 !important; box-shadow: none !important; }
      .kpi-card { background: #F8F8F8 !important; border: 1px solid #DDD !important; }
      .kpi-value { color: #000 !important; }
      th { background: #EEE !important; color: #333 !important; }
      td { color: #222 !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header-bar">
      <div>
        <div class="brand-title">Social<span class="brand-accent">Plus</span><span style="color: #FFC928; font-size: 18px;">.ai</span></div>
        <div class="tagline">COMMENT INTELLIGENCE REPORT</div>
      </div>
      <div style="text-align: right;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; background: rgba(255, 215, 0, 0.15); color: #FFD700; border: 1px solid rgba(255, 215, 0, 0.4); font-size: 12px; font-weight: 800;">
          ${escapeHtml(d.platform)}
        </span>
        <div style="font-size: 11px; color: #A1A1A1; margin-top: 4px;">Generated: ${escapeHtml(d.timestamp)}</div>
      </div>
    </div>

    <!-- Source Information -->
    <div class="card">
      <div class="section-title">Analysis Session Target</div>
      <h1 style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 6px;">${escapeHtml(d.title)}</h1>
      ${d.sourceUrl ? `<p style="font-size: 12px; color: #FFD700; word-break: break-all; margin-bottom: 6px;">Source URL: ${escapeHtml(d.sourceUrl)}</p>` : ''}
      <div style="display: flex; gap: 20px; font-size: 12px; color: #A1A1A1; margin-top: 8px;">
        ${d.authorOrChannel ? `<span>Author / Brand: <strong style="color: #FFF;">${escapeHtml(d.authorOrChannel)}</strong></span>` : ''}
        ${d.productMeta?.price ? `<span>Price: <strong style="color: #FFD700;">${escapeHtml(d.productMeta.price)}</strong></span>` : ''}
        ${typeof d.productMeta?.averageRating === 'number' ? `<span>Rating: <strong style="color: #FFC928;">${d.productMeta.averageRating} / 5</strong></span>` : ''}
      </div>
    </div>

    <!-- Key Metrics Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Ingested Comments</div>
        <div class="kpi-value">${d.totalComments.toLocaleString()}</div>
        <div class="kpi-sub">Audience reactions processed</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Net Sentiment Score</div>
        <div class="kpi-value" style="${netSentimentClass}">${netSentimentPrefix}${d.netSentiment}</div>
        <div class="kpi-sub">${escapeHtml(d.dominantSentiment)} Dominant polarity</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Dominant Emotion</div>
        <div class="kpi-value" style="color: #FFC928;">${escapeHtml(d.dominantEmotion)}</div>
        <div class="kpi-sub">Affective voice of audience</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Moderation Flags</div>
        <div class="kpi-value" style="color: ${d.moderationSummary.flaggedCount > 0 ? '#F43F5E' : '#10B981'};">${d.moderationSummary.flaggedCount}</div>
        <div class="kpi-sub">${d.moderationSummary.cleanCount} clean comments</div>
      </div>
    </div>

    <!-- Sentiment Polarity Breakdown -->
    <div class="card">
      <div class="section-title">Sentiment Intelligence Breakdown</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 16px;">
        <div style="background: #111; padding: 14px; border-radius: 10px; border-left: 4px solid #10B981;">
          <div style="font-size: 11px; color: #A1A1A1;">POSITIVE</div>
          <div style="font-size: 20px; font-weight: 800; color: #10B981;">${d.sentimentPercentages.Positive}%</div>
          <div style="font-size: 11px; color: #777;">${d.sentimentDistribution.Positive} comments</div>
        </div>
        <div style="background: #111; padding: 14px; border-radius: 10px; border-left: 4px solid #0EA5E9;">
          <div style="font-size: 11px; color: #A1A1A1;">NEUTRAL</div>
          <div style="font-size: 20px; font-weight: 800; color: #0EA5E9;">${d.sentimentPercentages.Neutral}%</div>
          <div style="font-size: 11px; color: #777;">${d.sentimentDistribution.Neutral} comments</div>
        </div>
        <div style="background: #111; padding: 14px; border-radius: 10px; border-left: 4px solid #F43F5E;">
          <div style="font-size: 11px; color: #A1A1A1;">NEGATIVE</div>
          <div style="font-size: 20px; font-weight: 800; color: #F43F5E;">${d.sentimentPercentages.Negative}%</div>
          <div style="font-size: 11px; color: #777;">${d.sentimentDistribution.Negative} comments</div>
        </div>
        <div style="background: #111; padding: 14px; border-radius: 10px; border-left: 4px solid #F59E0B;">
          <div style="font-size: 11px; color: #A1A1A1;">MIXED</div>
          <div style="font-size: 20px; font-weight: 800; color: #F59E0B;">${d.sentimentPercentages.Mixed}%</div>
          <div style="font-size: 11px; color: #777;">${d.sentimentDistribution.Mixed} comments</div>
        </div>
        <div style="background: #111; padding: 14px; border-radius: 10px; border-left: 4px solid #A855F7;">
          <div style="font-size: 11px; color: #A1A1A1;">SARCASTIC</div>
          <div style="font-size: 20px; font-weight: 800; color: #A855F7;">${d.sentimentPercentages.Sarcastic}%</div>
          <div style="font-size: 11px; color: #777;">${d.sentimentDistribution.Sarcastic} comments</div>
        </div>
      </div>
    </div>

    <!-- Auto Moderation Risk Assessment (Spam & Toxicity) -->
    <div class="card" style="border-left: 4px solid #FFD700;">
      <div class="section-title">Automated Moderation & Audience Safety Assessment</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 14px;">
        <div style="background: #111; padding: 16px; border-radius: 10px; border: 1px solid #292929;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 12px; font-weight: 800; color: #FFF; text-transform: uppercase;">SPAM RISK</span>
            <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: rgba(255, 215, 0, 0.15); color: #FFD700;">
              ${d.totalComments > 0 ? ((d.moderationSummary.spamCount / d.totalComments) * 100).toFixed(1) : 0}% Rate
            </span>
          </div>
          <div style="background: #222; border-radius: 9999px; height: 8px; overflow: hidden; margin-bottom: 10px;">
            <div style="background: #FFD700; height: 100%; width: ${Math.min((d.totalComments > 0 ? (d.moderationSummary.spamCount / d.totalComments) * 100 : 0) * 2, 100)}%;"></div>
          </div>
          <p style="font-size: 11px; color: #A1A1A1; line-height: 1.4;">
            ${d.moderationSummary.spamCount} comments flagged for repetitive link drops, promotional bots, or solicitation patterns.
          </p>
        </div>

        <div style="background: #111; padding: 16px; border-radius: 10px; border: 1px solid #292929;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 12px; font-weight: 800; color: #FFF; text-transform: uppercase;">TOXICITY RISK</span>
            <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: rgba(244, 63, 94, 0.15); color: #F43F5E;">
              ${d.totalComments > 0 ? ((d.moderationSummary.toxicCount / d.totalComments) * 100).toFixed(1) : 0}% Rate
            </span>
          </div>
          <div style="background: #222; border-radius: 9999px; height: 8px; overflow: hidden; margin-bottom: 10px;">
            <div style="background: #F43F5E; height: 100%; width: ${Math.min((d.totalComments > 0 ? (d.moderationSummary.toxicCount / d.totalComments) * 100 : 0) * 2, 100)}%;"></div>
          </div>
          <p style="font-size: 11px; color: #A1A1A1; line-height: 1.4;">
            ${d.moderationSummary.toxicCount} comments flagged for aggressive language, harassment, insults, or severe negativity.
          </p>
        </div>
      </div>
    </div>

    <!-- Emotions & Intents Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
      <div class="card">
        <div class="section-title">Emotional Intelligence Spectrum</div>
        ${emotionRows || '<p style="font-size: 12px; color: #777;">No emotional spectrum records available.</p>'}
      </div>
      <div class="card">
        <div class="section-title">Audience Intent Distribution</div>
        ${intentRows || '<p style="font-size: 12px; color: #777;">No intent classification records available.</p>'}
      </div>
    </div>

    <!-- Keyword Frequency -->
    ${
      d.topKeywords.length > 0
        ? `
    <div class="card">
      <div class="section-title">Most Used Words / Keyword Frequency</div>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Keyword</th>
            <th>Frequency</th>
            <th>% of Total</th>
            <th>Prevalence</th>
          </tr>
        </thead>
        <tbody>
          ${keywordRows}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    <!-- Top 10 Most Liked & Influential Comments -->
    ${
      d.top10Liked.length > 0
        ? `
    <div class="card" style="border-left: 4px solid #FFD700;">
      <div class="section-title">⭐ Top 10 Most Liked & High-Impact Audience Comments</div>
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>User</th>
              <th>Likes</th>
              <th>Sentiment</th>
              <th>Emotion</th>
              <th>Intent</th>
              <th>Comment Content</th>
            </tr>
          </thead>
          <tbody>
            ${top10LikedRows}
          </tbody>
        </table>
      </div>
    </div>
    `
        : ''
    }

    <!-- Subtle Disclaimer -->
    <div style="margin-top: 24px; padding: 14px 18px; background: rgba(255, 215, 0, 0.05); border: 1px solid rgba(255, 215, 0, 0.25); border-radius: 10px; font-size: 11.5px; color: #AAA; line-height: 1.5;">
      ⚠ Note: These AI-generated results depend on the available content and data. They are estimates, not fixed or definitive judgments. Please verify important findings independently.
    </div>

    <!-- Footer -->
    <div class="footer">
      SocialPlus.ai — Professional Comment Intelligence & Moderation Platform • Report generated on ${escapeHtml(d.timestamp)}
    </div>
  </div>
</body>
</html>`;
}

/**
 * 2. STANDALONE PDF REPORT GENERATOR
 * Uses jsPDF and jspdf-autotable to produce a clean, multi-page vector PDF report.
 */
export function generatePDFReport(
  raw: AnalysisResponse | EcommerceAnalysisResponse,
  fallbackPlatform?: string,
  fallbackTitle?: string
): jsPDF {
  const d = normalizeReportData(raw, fallbackPlatform, fallbackTitle);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 40;

  // Header Banner: Black & Yellow
  doc.setFillColor(15, 15, 15);
  doc.rect(margin, currentY, contentWidth, 54, 'F');

  // Yellow accent left stripe
  doc.setFillColor(255, 215, 0);
  doc.rect(margin, currentY, 6, 54, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('SocialPlus.ai', margin + 18, currentY + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 215, 0);
  doc.text('COMMENT INTELLIGENCE REPORT', margin + 18, currentY + 40);

  // Platform and date on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 215, 0);
  doc.text(d.platform.toUpperCase(), pageWidth - margin - 15, currentY + 24, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(170, 170, 170);
  doc.text(d.timestamp, pageWidth - margin - 15, currentY + 40, { align: 'right' });

  currentY += 70;

  // Session Target Box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, currentY, contentWidth, 48, 4, 4, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(margin, currentY, contentWidth, 48, 4, 4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('ANALYSIS SESSION TARGET:', margin + 12, currentY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  const truncatedTitle = doc.splitTextToSize(d.title, contentWidth - 24)[0];
  doc.text(truncatedTitle, margin + 12, currentY + 34);

  currentY += 60;

  // KPI Overview Cards (4 columns)
  const cardWidth = (contentWidth - 30) / 4;
  const kpis = [
    { label: 'TOTAL COMMENTS', val: d.totalComments.toLocaleString(), color: [20, 20, 20] },
    { label: 'NET SENTIMENT', val: `${d.netSentiment > 0 ? '+' : ''}${d.netSentiment}`, color: d.netSentiment >= 0 ? [16, 185, 129] : [244, 63, 94] },
    { label: 'TOP EMOTION', val: d.dominantEmotion, color: [180, 130, 0] },
    { label: 'MODERATION FLAGS', val: d.moderationSummary.flaggedCount.toString(), color: d.moderationSummary.flaggedCount > 0 ? [244, 63, 94] : [16, 185, 129] },
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (cardWidth + 10);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(x, currentY, cardWidth, 46, 4, 4, 'F');
    doc.setDrawColor(225, 225, 225);
    doc.roundedRect(x, currentY, cardWidth, 46, 4, 4, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(110, 110, 110);
    doc.text(kpi.label, x + 8, currentY + 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, x + 8, currentY + 36);
  });

  currentY += 60;

  // Sentiment Breakdown Table
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Sentiment Class', 'Comment Count', 'Percentage', 'Net Polarity Index']],
    body: [
      ['Positive', `${d.sentimentDistribution.Positive}`, `${d.sentimentPercentages.Positive}%`, d.dominantSentiment === 'Positive' ? 'Dominant Class' : '-'],
      ['Neutral', `${d.sentimentDistribution.Neutral}`, `${d.sentimentPercentages.Neutral}%`, d.dominantSentiment === 'Neutral' ? 'Dominant Class' : '-'],
      ['Negative', `${d.sentimentDistribution.Negative}`, `${d.sentimentPercentages.Negative}%`, d.dominantSentiment === 'Negative' ? 'Dominant Class' : '-'],
      ['Mixed', `${d.sentimentDistribution.Mixed}`, `${d.sentimentPercentages.Mixed}%`, d.dominantSentiment === 'Mixed' ? 'Dominant Class' : '-'],
      ['Sarcastic', `${d.sentimentDistribution.Sarcastic}`, `${d.sentimentPercentages.Sarcastic}%`, d.dominantSentiment === 'Sarcastic' ? 'Dominant Class' : '-'],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 15, 15],
      textColor: [255, 215, 0],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: { fontSize: 8, cellPadding: 4 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 14;

  // Auto Moderation Table
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Safety Dimension', 'Risk Level', 'Flagged Comments', 'Evaluation Status']],
    body: [
      [
        'SPAM RISK',
        `${d.totalComments > 0 ? ((d.moderationSummary.spamCount / d.totalComments) * 100).toFixed(1) : 0}%`,
        `${d.moderationSummary.spamCount} comments`,
        d.moderationSummary.spamCount > 0 ? 'Review Needed' : 'Clean & Safe',
      ],
      [
        'TOXICITY RISK',
        `${d.totalComments > 0 ? ((d.moderationSummary.toxicCount / d.totalComments) * 100).toFixed(1) : 0}%`,
        `${d.moderationSummary.toxicCount} comments`,
        d.moderationSummary.toxicCount > 0 ? 'Moderate Alert' : 'Clean & Safe',
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 15, 15],
      textColor: [255, 215, 0],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: { fontSize: 8, cellPadding: 4 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 14;

  // Keywords Table
  if (d.topKeywords.length > 0) {
    const keywordBody = d.topKeywords.slice(0, 10).map((kw, i) => [
      `#${i + 1}`,
      kw.word,
      `${kw.count}`,
      `${kw.percent}%`,
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Rank', 'Most Used Keyword', 'Frequency Count', '% of Comments']],
      body: keywordBody,
      theme: 'grid',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [20, 20, 20],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: { fontSize: 8, cellPadding: 4 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 14;
  }

  // Top 10 Most Liked Comments Table
  if (d.top10Liked.length > 0) {
    const top10Rows = d.top10Liked.map((c, i) => [
      `#${i + 1}`,
      `@${c.username || 'user'}`,
      `${c.like_count || 0}`,
      c.analysis.sentiment || 'Neutral',
      c.analysis.dominant_emotion || '-',
      c.analysis.intent || '-',
      (c.text || '').replace(/\s+/g, ' ').slice(0, 100),
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 40 },
      head: [['Rank', 'Author', 'Likes', 'Sentiment', 'Emotion', 'Intent', 'Comment Excerpt']],
      body: top10Rows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 15, 15],
        textColor: [255, 215, 0],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: 'bold' },
        1: { cellWidth: 70 },
        2: { cellWidth: 36, fontStyle: 'bold' },
        3: { cellWidth: 50 },
        4: { cellWidth: 50 },
        5: { cellWidth: 60 },
        6: { cellWidth: 'auto' },
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 4,
        overflow: 'linebreak',
      },
      didDrawPage: () => {
        const pageNum = doc.getNumberOfPages();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(140, 140, 140);
        doc.text(
          `⚠ Note: AI-generated results depend on available content. Estimates, not fixed judgments. Please verify independently.`,
          margin,
          pageHeight - 24
        );
        doc.text(
          `SocialPlus.ai Report — Page ${pageNum}`,
          pageWidth / 2,
          pageHeight - 12,
          { align: 'center' }
        );
      },
    });
  }

  return doc;
}

/**
 * Triggers instant browser download of the standalone HTML report
 */
export function downloadHTMLReport(
  raw: AnalysisResponse | EcommerceAnalysisResponse,
  fallbackPlatform?: string,
  fallbackTitle?: string
): void {
  const htmlContent = generateHTMLReport(raw, fallbackPlatform, fallbackTitle);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  const safeTitle = (fallbackTitle || 'Analysis_Report').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  a.href = url;
  a.download = `SocialPlus_${safeTitle}_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers instant browser download of the professional PDF report
 */
export function downloadPDFReport(
  raw: AnalysisResponse | EcommerceAnalysisResponse,
  fallbackPlatform?: string,
  fallbackTitle?: string
): void {
  const doc = generatePDFReport(raw, fallbackPlatform, fallbackTitle);
  const safeTitle = (fallbackTitle || 'Analysis_Report').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  doc.save(`SocialPlus_${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

