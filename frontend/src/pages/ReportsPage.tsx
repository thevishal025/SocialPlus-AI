import React, { useState } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../api/client';
import {
  FileText,
  FileSpreadsheet,
  Download,
  BarChart3,
  Heart,
  Target,
  Smile,
  ShieldAlert,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { result } = useAnalysis();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExportCSV = (reportType = 'full') => {
    if (!result) return;
    setDownloading(reportType);

    try {
      const header = [
        'ID',
        'Platform',
        'Author',
        'Comment Text',
        'Sentiment',
        'Sentiment Confidence',
        'Dominant Emotion',
        'Intent',
        'Intent Confidence',
        'Emojis',
        'Is Emoji Only',
        'Spam Probability',
        'Toxicity Score',
        'Moderation Recommendation',
        'Source Title',
      ];

      const rows = result.comments.map((c) => [
        c.id,
        c.platform,
        c.username || 'Anonymous',
        c.text,
        c.analysis.sentiment,
        c.analysis.sentiment_confidence,
        c.analysis.dominant_emotion,
        c.analysis.intent,
        c.analysis.intent_confidence,
        c.analysis.emojis?.join(' ') || '',
        c.analysis.emoji_only ? 'Yes' : 'No',
        c.analysis.spam_probability,
        c.analysis.toxicity_score,
        c.analysis.moderation_action_recommended,
        c.content_title,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [header.join(','), ...rows.map((e) => e.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `SocialPulse_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloading(null), 500);
    }
  };

  const handleExportPDF = async () => {
    if (!result) return;
    setDownloading('pdf');
    try {
      // Call backend PDF generator
      const blob = await api.exportReport('pdf');
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SocialPulse_Executive_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      // Fallback print/PDF
      window.print();
    } finally {
      setDownloading(null);
    }
  };

  if (!result) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-brand-purple/20 text-brand-purple mx-auto flex items-center justify-center">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">No Reports Generated Yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Run an analysis on YouTube or Instagram content to generate comprehensive CSV and executive PDF reports.
        </p>
      </div>
    );
  }

  const { summary, comments, video } = result;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
            Analytics & Intelligence Reports
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Export structured dataset outputs, executive summaries, and compliance audit records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
            loading={downloading === 'full'}
            onClick={() => handleExportCSV('full')}
          >
            Export All CSV
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<FileText className="w-4 h-4" />}
            loading={downloading === 'pdf'}
            onClick={handleExportPDF}
          >
            Export PDF Report
          </Button>
        </div>
      </div>

      {/* Available Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Full Combined Report */}
        <Card>
          <CardHeader
            title="Combined Master Report"
            subtitle="All 5 engines in a single normalized schema"
            icon={<Sparkles className="w-4 h-4 text-brand-purple" />}
          />
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Includes all comments with sentiment scores, multi-label emotion tags, intent labels, emojis, toxicity indexes, and platform metadata.
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
            <span className="text-slate-400">{comments.length} Comments</span>
            <Button
              size="sm"
              variant="outline"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => handleExportCSV('master')}
            >
              CSV
            </Button>
          </div>
        </Card>

        {/* Sentiment Report */}
        <Card>
          <CardHeader
            title="Sentiment & Net Score Report"
            subtitle="Engine 1: Distribution & Net Score metrics"
            icon={<BarChart3 className="w-4 h-4 text-brand-purple" />}
          />
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Net Sentiment: <strong>{summary.net_sentiment_score > 0 ? `+${summary.net_sentiment_score}` : summary.net_sentiment_score}</strong>. Breakdowns for Positive, Negative, Neutral, and Mixed categories.
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
            <span className="text-slate-400">4 Categories</span>
            <Button
              size="sm"
              variant="outline"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => handleExportCSV('sentiment')}
            >
              CSV
            </Button>
          </div>
        </Card>

        {/* Emotional Spectrum Report */}
        <Card>
          <CardHeader
            title="Emotional Intelligence Report"
            subtitle="Engine 2: 10 discrete emotion spectrum"
            icon={<Heart className="w-4 h-4 text-rose-400" />}
          />
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Dominant emotion: <strong>{summary.dominant_emotion}</strong>. Full breakdown across Joy, Love, Excitement, Anger, Sadness, Curiosity.
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
            <span className="text-slate-400">10 Emotions</span>
            <Button
              size="sm"
              variant="outline"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => handleExportCSV('emotions')}
            >
              CSV
            </Button>
          </div>
        </Card>

        {/* Intent Breakdown Report */}
        <Card>
          <CardHeader
            title="Audience Intent Audit"
            subtitle="Engine 3: Questions, complaints, feedback"
            icon={<Target className="w-4 h-4 text-sky-400" />}
          />
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Isolates customer questions, support complaints, suggestions, and promo solicitations for actionable team routing.
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
            <span className="text-slate-400">10 Intent Types</span>
            <Button
              size="sm"
              variant="outline"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => handleExportCSV('intent')}
            >
              CSV
            </Button>
          </div>
        </Card>

        {/* Emoji Analysis Report */}
        <Card>
          <CardHeader
            title="Emoji Frequency & Context Log"
            subtitle="Engine 4: Visual and non-verbal reactions"
            icon={<Smile className="w-4 h-4 text-amber-400" />}
          />
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Summary of top emojis, contextual meaning, emoji-only responses, and emoji sentiment contribution.
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
            <span className="text-slate-400">{summary.top_emojis?.length || 0} Emojis</span>
            <Button
              size="sm"
              variant="outline"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => handleExportCSV('emojis')}
            >
              CSV
            </Button>
          </div>
        </Card>

        {/* Auto Moderation Compliance Report */}
        <Card>
          <CardHeader
            title="Moderation & Risk Compliance Report"
            subtitle="Engine 5: Spam, toxicity & safety signals"
            icon={<ShieldAlert className="w-4 h-4 text-emerald-400" />}
          />
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Audit trail of flagged comments, spam probabilities, harassment risk, and human review authorization status.
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
            <span className="text-slate-400">{summary.moderation_summary?.flagged_count || 0} Flags</span>
            <Button
              size="sm"
              variant="outline"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => handleExportCSV('moderation')}
            >
              CSV
            </Button>
          </div>
        </Card>
      </div>

      {/* Video Summary Brief */}
      {video && (
        <Card>
          <CardHeader
            title="Session Content Metadata"
            subtitle="Metadata verified during comment ingestion"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-navy-950/60">
              <span className="text-slate-400 block">Title</span>
              <strong className="text-white truncate block">{video.title}</strong>
            </div>
            <div className="p-3 rounded-lg bg-navy-950/60">
              <span className="text-slate-400 block">Channel / Author</span>
              <strong className="text-white block">{video.channel || 'N/A'}</strong>
            </div>
            <div className="p-3 rounded-lg bg-navy-950/60">
              <span className="text-slate-400 block">Total Views</span>
              <strong className="text-white block">{video.views?.toLocaleString() || 'N/A'}</strong>
            </div>
            <div className="p-3 rounded-lg bg-navy-950/60">
              <span className="text-slate-400 block">Likes</span>
              <strong className="text-white block">{video.likes?.toLocaleString() || 'N/A'}</strong>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

