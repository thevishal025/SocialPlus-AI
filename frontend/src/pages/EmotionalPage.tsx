import React, { useState } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { MetricCard } from '../components/ui/MetricCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Heart, Sparkles, Filter, Smile, Flame, Frown, HelpCircle } from 'lucide-react';
import { EmotionType } from '../api/types';

export const EmotionalPage: React.FC = () => {
  const { result, setSelectedComment } = useAnalysis();
  const navigate = useNavigate();
  const [selectedEmotionFilter, setSelectedEmotionFilter] = useState<string>('All');

  if (!result) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <Heart className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">No Emotional Intelligence Data</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Analyze content to map audience psychological and emotional responses across 10 fine-grained emotions.
        </p>
        <Button size="sm" variant="primary" onClick={() => navigate('/analyze')}>
          Analyze Content Now
        </Button>
      </div>
    );
  }

  const { summary, comments } = result;

  const ALL_EMOTIONS: EmotionType[] = [
    'Joy',
    'Love',
    'Excitement',
    'Anger',
    'Sadness',
    'Surprise',
    'Fear',
    'Disgust',
    'Frustration',
    'Curiosity',
  ];

  const emotionColors: Record<string, string> = {
    Joy: '#10B981',
    Love: '#EC4899',
    Excitement: '#F59E0B',
    Anger: '#EF4444',
    Sadness: '#6366F1',
    Surprise: '#8B5CF6',
    Fear: '#64748B',
    Disgust: '#78716C',
    Frustration: '#F43F5E',
    Curiosity: '#06B6D4',
  };

  const chartData = ALL_EMOTIONS.map((emotion) => {
    const count = summary.emotion_distribution?.[emotion] || 0;
    const percent = summary.emotion_percentages?.[emotion] || 0;
    return {
      emotion,
      count,
      percent,
      color: emotionColors[emotion] || '#8B5CF6',
    };
  }).sort((a, b) => b.count - a.count);

  const filteredComments = comments.filter((c) => {
    if (selectedEmotionFilter === 'All') return true;
    return (
      c.analysis.dominant_emotion === selectedEmotionFilter ||
      c.analysis.emotions?.some((e) => e.emotion === selectedEmotionFilter)
    );
  });

  return (
    <div className="space-y-6">
      {/* Engine Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-rose-400 tracking-wider uppercase">
            ENGINE 2 OF 5
          </span>
          <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-0.5">
            Emotional Intelligence Meter
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Detects 10 discrete emotional dimensions with multi-label support; distinguishes happiness from curiosity or relief.
          </p>
        </div>

        <Badge variant="purple" size="md">
          Dominant: {summary.dominant_emotion || 'Balanced'}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Dominant Emotion"
          value={summary.dominant_emotion || 'Curiosity'}
          subtitle="Prevalent audience reaction"
          icon={<Heart className="w-5 h-5" />}
          accent="rose"
        />
        <MetricCard
          title="Active Emotional Range"
          value={`${chartData.filter((d) => d.count > 0).length} / 10`}
          subtitle="Distinct emotions detected"
          icon={<Sparkles className="w-5 h-5" />}
          accent="purple"
        />
        <MetricCard
          title="Joy & Love Signals"
          value={`${((summary.emotion_percentages?.Joy || 0) + (summary.emotion_percentages?.Love || 0)).toFixed(1)}%`}
          subtitle="Positive emotional affinity"
          icon={<Smile className="w-5 h-5" />}
          accent="emerald"
        />
        <MetricCard
          title="Anger & Frustration"
          value={`${((summary.emotion_percentages?.Anger || 0) + (summary.emotion_percentages?.Frustration || 0)).toFixed(1)}%`}
          subtitle="High-friction negative emotions"
          icon={<Frown className="w-5 h-5" />}
          accent="rose"
        />
      </div>

      {/* 10-Emotion Spectrum Chart */}
      <Card>
        <CardHeader
          title="10-Dimension Emotion Spectrum"
          subtitle="Audience emotional prevalence across all processed comments"
          icon={<Heart className="w-4 h-4 text-rose-400" />}
        />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2B48" />
              <XAxis dataKey="emotion" stroke="#94A3B8" fontSize={11} interval={0} angle={-25} textAnchor="end" />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0F1523', borderColor: '#2E3E65', borderRadius: '8px' }}
                formatter={(value: any, name: any, props: any) => [
                  `${value} comments (${props.payload.percent}%)`,
                  'Frequency',
                ]}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Emotion Filter and Explorer */}
      <Card>
        <CardHeader
          title="Emotion-Specific Comment Signals"
          subtitle="Filter comments by specific emotional state"
          icon={<Filter className="w-4 h-4" />}
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Filter Emotion:</span>
              <select
                value={selectedEmotionFilter}
                onChange={(e) => setSelectedEmotionFilter(e.target.value)}
                className="bg-navy-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-rose-500/50"
              >
                <option value="All">All Emotions ({comments.length})</option>
                {ALL_EMOTIONS.map((em) => (
                  <option key={em} value={em}>
                    {em} ({summary.emotion_distribution?.[em] || 0})
                  </option>
                ))}
              </select>
            </div>
          }
        />

        <div className="space-y-3">
          {filteredComments.length > 0 ? (
            filteredComments.slice(0, 10).map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedComment(c)}
                className="p-3 rounded-lg bg-navy-950/60 border border-white/5 hover:border-rose-500/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-xs">@{c.username || 'user'}</span>
                    <Badge variant="purple" size="sm">
                      {c.analysis.dominant_emotion}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300">"{c.text}"</p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <div className="flex gap-1">
                    {c.analysis.emotions?.slice(0, 2).map((em) => (
                      <span
                        key={em.emotion}
                        className="text-[10px] px-2 py-0.5 rounded bg-navy-800 text-slate-300 border border-white/5"
                      >
                        {em.emotion}: {(em.score * 100).toFixed(0)}%
                      </span>
                    ))}
                  </div>
                  <span className="text-slate-500 text-[11px]">Click to inspect</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 p-6 text-center">
              No comments found expressing "{selectedEmotionFilter}".
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};
