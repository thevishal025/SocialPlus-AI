import React, { useState } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { MetricCard } from '../components/ui/MetricCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle,
  Flag,
  EyeOff,
  Trash2,
  Copy,
  Bot,
  Info,
} from 'lucide-react';

export const ModerationPage: React.FC = () => {
  const { result, setSelectedComment } = useAnalysis();
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState<'all_flagged' | 'spam' | 'toxic' | 'clean'>('all_flagged');

  if (!result) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">No Moderation Intelligence Data</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Analyze comments to detect toxic remarks, spam links, bot patterns, and protect your social brand integrity.
        </p>
        <Button size="sm" variant="primary" onClick={() => navigate('/analyze')}>
          Analyze Content Now
        </Button>
      </div>
    );
  }

  const { summary, comments } = result;
  const modSummary = summary.moderation_summary || {
    flagged_count: 0,
    spam_count: 0,
    toxic_count: 0,
    duplicate_count: 0,
    clean_count: comments.length,
  };

  const flaggedComments = comments.filter(
    (c) => c.analysis.moderation_action_recommended !== 'Clear'
  );

  const spamComments = comments.filter((c) => c.analysis.spam_probability > 0.5);
  const toxicComments = comments.filter((c) => c.analysis.toxicity_score > 0.25);
  const cleanComments = comments.filter(
    (c) => c.analysis.moderation_action_recommended === 'Clear'
  );

  let displayedComments = flaggedComments;
  if (filterMode === 'spam') displayedComments = spamComments;
  else if (filterMode === 'toxic') displayedComments = toxicComments;
  else if (filterMode === 'clean') displayedComments = cleanComments;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
            ENGINE 5 OF 5
          </span>
          <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-0.5">
            Auto Moderation Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Detects spam links, hate speech, threats, harassment, and bot repetitions. Recommendation-only by design.
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Safety Policy: Safe recommendation-only. Zero automatic deletions without human approval.</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Flagged for Review"
          value={modSummary.flagged_count}
          subtitle={`${((modSummary.flagged_count / (comments.length || 1)) * 100).toFixed(1)}% of total comments`}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent={modSummary.flagged_count > 0 ? 'rose' : 'emerald'}
        />
        <MetricCard
          title="Spam / Solicitation"
          value={modSummary.spam_count}
          subtitle="Bot & promotional links"
          icon={<Bot className="w-5 h-5" />}
          accent="amber"
        />
        <MetricCard
          title="Toxic Remarks"
          value={modSummary.toxic_count}
          subtitle="Abuse, insults & harassment"
          icon={<Flame className="w-5 h-5" />}
          accent="rose"
        />
        <MetricCard
          title="Clean & Safe"
          value={modSummary.clean_count}
          subtitle="Cleared organic engagement"
          icon={<ShieldCheck className="w-5 h-5" />}
          accent="emerald"
        />
      </div>

      {/* Interactive Moderation Queue */}
      <Card>
        <CardHeader
          title="Moderation Triage & Human Review Queue"
          subtitle="Review AI-flagged comments and authorize action"
          icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
          action={
            <div className="flex rounded-lg bg-navy-950 p-1 border border-white/5 gap-1">
              <button
                onClick={() => setFilterMode('all_flagged')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterMode === 'all_flagged'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Flagged ({flaggedComments.length})
              </button>
              <button
                onClick={() => setFilterMode('spam')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterMode === 'spam'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Spam Only ({spamComments.length})
              </button>
              <button
                onClick={() => setFilterMode('toxic')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterMode === 'toxic'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Toxic Only ({toxicComments.length})
              </button>
              <button
                onClick={() => setFilterMode('clean')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterMode === 'clean'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Clean ({cleanComments.length})
              </button>
            </div>
          }
        />

        <div className="space-y-3">
          {displayedComments.length > 0 ? (
            displayedComments.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-navy-950/70 border border-white/5 hover:border-white/15 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left detail */}
                <div
                  className="space-y-2 flex-1 cursor-pointer"
                  onClick={() => setSelectedComment(c)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white text-xs">@{c.username || 'user'}</span>
                    <Badge
                      variant={
                        c.analysis.moderation_action_recommended === 'Clear'
                          ? 'positive'
                          : c.analysis.moderation_action_recommended === 'Review'
                          ? 'mixed'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {c.analysis.moderation_action_recommended}
                    </Badge>

                    {c.analysis.spam_probability > 0.5 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                        Spam {(c.analysis.spam_probability * 100).toFixed(0)}%
                      </span>
                    )}

                    {c.analysis.toxicity_score > 0.2 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium">
                        Toxicity {(c.analysis.toxicity_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-200">"{c.text}"</p>

                  {c.analysis.moderation_reason && (
                    <p className="text-[11px] text-rose-400 flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{c.analysis.moderation_reason}</span>
                    </p>
                  )}
                </div>

                {/* Right action buttons */}
                <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-2 lg:pt-0 border-white/5">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                    onClick={() => alert(`Comment ${c.id} approved`)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Flag className="w-3.5 h-3.5 text-amber-400" />}
                    onClick={() => alert(`Comment ${c.id} flagged for human review`)}
                  >
                    Flag
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                    onClick={() => alert(`Comment ${c.id} marked to hide where permissions allow`)}
                  >
                    Hide
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => alert(`Comment ${c.id} marked to delete where permissions allow`)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs text-slate-400">
                No comments found under selected filter mode "{filterMode}".
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
