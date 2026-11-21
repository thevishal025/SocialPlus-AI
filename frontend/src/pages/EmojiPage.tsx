import React, { useState } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { MetricCard } from '../components/ui/MetricCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import {
  Smile,
  Flame,
  Heart,
  MessageCircle,
  HelpCircle,
  Sparkles,
  Info,
} from 'lucide-react';

export const EmojiPage: React.FC = () => {
  const { result, setSelectedComment } = useAnalysis();
  const navigate = useNavigate();
  const [selectedEmojiFilter, setSelectedEmojiFilter] = useState<string | null>(null);

  if (!result) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
          <Smile className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">No Emoji Intelligence Data</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Analyze comments to decode visual language, contextual emoji sarcasm, and non-verbal audience sentiment.
        </p>
        <Button size="sm" variant="primary" onClick={() => navigate('/analyze')}>
          Analyze Content Now
        </Button>
      </div>
    );
  }

  const { summary, comments } = result;

  const emojiList = summary.top_emojis || [];
  const totalEmojiOccurrences = emojiList.reduce((acc, curr) => acc + curr.count, 0);

  const emojiOnlyComments = comments.filter((c) => c.analysis.emoji_only);

  const filteredComments = selectedEmojiFilter
    ? comments.filter((c) => c.analysis.emojis?.includes(selectedEmojiFilter))
    : comments.filter((c) => (c.analysis.emojis?.length || 0) > 0);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">
            ENGINE 4 OF 5
          </span>
          <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-0.5">
            Emoji Intelligence Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Contextual interpretation of emojis; evaluates surrounding text rather than assigning static polarity.
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>Recognizes 😭 as either crying with laughter or genuine sadness depending on context.</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Emojis Found"
          value={totalEmojiOccurrences}
          subtitle="Unique & repetitive emojis"
          icon={<Smile className="w-5 h-5" />}
          accent="amber"
        />
        <MetricCard
          title="Distinct Emojis Used"
          value={emojiList.length}
          subtitle="Vocabulary variety in feedback"
          icon={<Sparkles className="w-5 h-5" />}
          accent="purple"
        />
        <MetricCard
          title="Emoji-Only Comments"
          value={summary.emoji_only_count || emojiOnlyComments.length}
          subtitle="Non-verbal short reactions"
          icon={<MessageCircle className="w-5 h-5" />}
          accent="cyan"
        />
        <MetricCard
          title="Most Used Emoji"
          value={emojiList[0]?.emoji || 'None'}
          subtitle={`${emojiList[0]?.count || 0} occurrences (${emojiList[0]?.meaning || 'N/A'})`}
          icon={<Flame className="w-5 h-5" />}
          accent="rose"
        />
      </div>

      {/* Emoji Frequency Cloud & Analysis Cards */}
      <Card>
        <CardHeader
          title="Emoji Frequency & Contextual Meaning Matrix"
          subtitle="Click any emoji card below to isolate and review the exact comments using it"
          icon={<Smile className="w-4 h-4 text-amber-400" />}
          action={
            selectedEmojiFilter && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedEmojiFilter(null)}
              >
                Clear Filter ({selectedEmojiFilter})
              </Button>
            )
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {emojiList.map((item) => {
            const isSelected = selectedEmojiFilter === item.emoji;
            return (
              <div
                key={item.emoji}
                onClick={() =>
                  setSelectedEmojiFilter(isSelected ? null : item.emoji)
                }
                className={`p-4 rounded-xl text-center cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 shadow-glow-sm scale-105'
                    : 'bg-navy-950/70 border-white/5 hover:border-amber-400/40 hover:bg-navy-800/80'
                }`}
              >
                <div className="text-3xl mb-1 select-none">{item.emoji}</div>
                <div className="text-xs font-bold text-white mt-1">
                  {item.count} {item.count === 1 ? 'time' : 'times'}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5" title={item.meaning}>
                  {item.meaning}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Emoji Comments Viewer */}
      <Card>
        <CardHeader
          title={
            selectedEmojiFilter
              ? `Comments Containing ${selectedEmojiFilter}`
              : 'All Comments with Emoji Signals'
          }
          subtitle="Inspect how audience applies visual expressions in context"
          icon={<MessageCircle className="w-4 h-4" />}
        />

        <div className="space-y-3">
          {filteredComments.length > 0 ? (
            filteredComments.slice(0, 10).map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedComment(c)}
                className="p-3 rounded-lg bg-navy-950/60 border border-white/5 hover:border-amber-500/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-xs">@{c.username || 'user'}</span>
                    <Badge sentiment={c.analysis.sentiment} size="sm">
                      {c.analysis.sentiment}
                    </Badge>
                    {c.analysis.emoji_only && (
                      <Badge variant="mixed" size="sm">
                        Emoji-Only
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">"{c.text}"</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex gap-1 bg-navy-900 px-2 py-1 rounded-md border border-white/5 text-base">
                    {c.analysis.emojis?.map((em, i) => (
                      <span key={i}>{em}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 p-6 text-center">
              No comments found matching emoji filter.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};
