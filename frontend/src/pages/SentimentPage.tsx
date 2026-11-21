import React from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { MetricCard } from '../components/ui/MetricCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Info,
} from 'lucide-react';

export const SentimentPage: React.FC = () => {
  const { result, setSelectedComment } = useAnalysis();
  const navigate = useNavigate();

  if (!result) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-brand-purple/20 text-brand-purple mx-auto flex items-center justify-center">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">No Sentiment Data Available</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Analyze content from YouTube, Instagram, or CSV upload to generate deep sentiment intelligence.
        </p>
        <Button size="sm" variant="primary" onClick={() => navigate('/analyze')}>
          Analyze Content Now
        </Button>
      </div>
    );
  }

  const { summary, comments } = result;

  const sentimentData = [
    { name: 'Positive', count: summary.sentiment_distribution.Positive || 0, percent: summary.sentiment_percentages.Positive || 0, color: '#10B981' },
    { name: 'Negative', count: summary.sentiment_distribution.Negative || 0, percent: summary.sentiment_percentages.Negative || 0, color: '#F43F5E' },
    { name: 'Neutral', count: summary.sentiment_distribution.Neutral || 0, percent: summary.sentiment_percentages.Neutral || 0, color: '#0EA5E9' },
    { name: 'Mixed', count: summary.sentiment_distribution.Mixed || 0, percent: summary.sentiment_percentages.Mixed || 0, color: '#F59E0B' },
  ];

  const positiveComments = comments
    .filter((c) => c.analysis.sentiment === 'Positive')
    .sort((a, b) => b.analysis.sentiment_confidence - a.analysis.sentiment_confidence)
    .slice(0, 5);

  const negativeComments = comments
    .filter((c) => c.analysis.sentiment === 'Negative')
    .sort((a, b) => b.analysis.sentiment_confidence - a.analysis.sentiment_confidence)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Title & Equation Box */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-brand-purple tracking-wider uppercase">
            ENGINE 1 OF 5
          </span>
          <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-0.5">
            Sentiment Intelligence Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Multilingual and code-mixed (Hinglish/English) 4-class classification with confidence weighting.
          </p>
        </div>

        {/* Formula breakdown card */}
        <div className="p-3 rounded-xl bg-navy-900 border border-white/5 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
            <Info className="w-3.5 h-3.5 text-brand-purple" />
            <span>Formula Reference</span>
          </div>
          <code>Net Sentiment = Positive % - Negative %</code>
          <p className="text-[10px] text-slate-500 mt-0.5">Scale: -100 (Max Negative) to +100 (Max Positive)</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Net Sentiment Score"
          value={summary.net_sentiment_score > 0 ? `+${summary.net_sentiment_score}` : `${summary.net_sentiment_score}`}
          subtitle="Net advocacy index (-100 to +100)"
          icon={<TrendingUp className="w-5 h-5" />}
          accent={summary.net_sentiment_score >= 0 ? 'emerald' : 'rose'}
        />
        <MetricCard
          title="Positive Percentage"
          value={`${summary.sentiment_percentages.Positive || 0}%`}
          subtitle={`${summary.sentiment_distribution.Positive || 0} positive comments`}
          icon={<ThumbsUp className="w-5 h-5" />}
          accent="emerald"
        />
        <MetricCard
          title="Negative Percentage"
          value={`${summary.sentiment_percentages.Negative || 0}%`}
          subtitle={`${summary.sentiment_distribution.Negative || 0} negative comments`}
          icon={<ThumbsDown className="w-5 h-5" />}
          accent="rose"
        />
        <MetricCard
          title="Confidence Index"
          value={`${((summary.average_sentiment_confidence || 0.85) * 100).toFixed(1)}%`}
          subtitle="Model prediction certainty"
          icon={<Sparkles className="w-5 h-5" />}
          accent="purple"
        />
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Breakdown */}
        <Card>
          <CardHeader
            title="Sentiment Class Distribution"
            subtitle="Percentage share across classified comments"
            icon={<BarChart3 className="w-4 h-4" />}
          />
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F1523', borderColor: '#2E3E65', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/5 text-center">
            {sentimentData.map((s) => (
              <div key={s.name} className="p-2 rounded-lg bg-navy-950/60">
                <span className="text-[11px] text-slate-400 block">{s.name}</span>
                <strong className="text-sm text-white">{s.percent}%</strong>
              </div>
            ))}
          </div>
        </Card>

        {/* Bar Comparison */}
        <Card>
          <CardHeader
            title="Category Volume Comparison"
            subtitle="Raw comment volume by sentiment category"
            icon={<BarChart3 className="w-4 h-4" />}
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sentimentData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2B48" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0F1523', borderColor: '#2E3E65', borderRadius: '8px' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Extreme Comments Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Positive Comments */}
        <Card>
          <CardHeader
            title="Highest Confidence Positive Comments"
            subtitle="Strongest audience appreciation signals"
            icon={<ThumbsUp className="w-4 h-4 text-emerald-400" />}
          />
          <div className="space-y-3">
            {positiveComments.length > 0 ? (
              positiveComments.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedComment(c)}
                  className="p-3 rounded-lg bg-navy-950/60 border border-emerald-500/20 hover:border-emerald-500/50 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">@{c.username || 'user'}</span>
                    <Badge variant="positive" size="sm">
                      {(c.analysis.sentiment_confidence * 100).toFixed(0)}% Conf
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-200 line-clamp-2">"{c.text}"</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 p-4 text-center">No positive comments detected.</p>
            )}
          </div>
        </Card>

        {/* Most Negative Comments */}
        <Card>
          <CardHeader
            title="Highest Confidence Negative Comments"
            subtitle="Strongest critical feedback requiring attention"
            icon={<ThumbsDown className="w-4 h-4 text-rose-400" />}
          />
          <div className="space-y-3">
            {negativeComments.length > 0 ? (
              negativeComments.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedComment(c)}
                  className="p-3 rounded-lg bg-navy-950/60 border border-rose-500/20 hover:border-rose-500/50 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">@{c.username || 'user'}</span>
                    <Badge variant="negative" size="sm">
                      {(c.analysis.sentiment_confidence * 100).toFixed(0)}% Conf
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-200 line-clamp-2">"{c.text}"</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 p-4 text-center">No negative comments detected.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
