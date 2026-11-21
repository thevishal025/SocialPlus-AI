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
import {
  Target,
  HelpCircle,
  AlertOctagon,
  Lightbulb,
  Share2,
  Filter,
  CheckCircle,
} from 'lucide-react';
import { IntentType } from '../api/types';

export const IntentPage: React.FC = () => {
  const { result, setSelectedComment } = useAnalysis();
  const navigate = useNavigate();
  const [selectedIntentFilter, setSelectedIntentFilter] = useState<string>('All');

  if (!result) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 mx-auto flex items-center justify-center">
          <Target className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">No Intent Data Available</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Analyze content to uncover what your audience is trying to accomplish: questions, complaints, feedback, or suggestions.
        </p>
        <Button size="sm" variant="primary" onClick={() => navigate('/analyze')}>
          Analyze Content Now
        </Button>
      </div>
    );
  }

  const { summary, comments } = result;

  const ALL_INTENTS: IntentType[] = [
    'Questioning',
    'Reply / Response',
    'Appreciation',
    'Complaint',
    'Suggestion',
    'Request',
    'Feedback',
    'Promotion',
    'Spam',
    'General Discussion',
  ];

  const intentColors: Record<string, string> = {
    Questioning: '#06B6D4',
    'Reply / Response': '#3B82F6',
    Appreciation: '#10B981',
    Complaint: '#EF4444',
    Suggestion: '#F59E0B',
    Request: '#8B5CF6',
    Feedback: '#6366F1',
    Promotion: '#EC4899',
    Spam: '#DC2626',
    'General Discussion': '#64748B',
  };

  const chartData = ALL_INTENTS.map((intent) => {
    const count = summary.intent_distribution?.[intent] || 0;
    const percent = summary.intent_percentages?.[intent] || 0;
    return {
      intent,
      count,
      percent,
      color: intentColors[intent] || '#3B82F6',
    };
  }).sort((a, b) => b.count - a.count);

  const questionsCount = summary.intent_distribution?.['Questioning'] || 0;
  const complaintsCount = summary.intent_distribution?.['Complaint'] || 0;
  const suggestionsCount = summary.intent_distribution?.['Suggestion'] || 0;
  const promotionsCount = (summary.intent_distribution?.['Promotion'] || 0) + (summary.intent_distribution?.['Spam'] || 0);

  const filteredComments = comments.filter((c) => {
    if (selectedIntentFilter === 'All') return true;
    return c.analysis.intent === selectedIntentFilter;
  });

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-sky-400 tracking-wider uppercase">
            ENGINE 3 OF 5
          </span>
          <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-0.5">
            Intent Intelligence Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Categorizes audience communicative intentions; maintains semantic independence from sentiment.
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300">
          💡 Note: Questions retain their true emotional sentiment (positive, negative, or neutral).
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Audience Questions"
          value={questionsCount}
          subtitle="Inquiries needing answers"
          icon={<HelpCircle className="w-5 h-5" />}
          accent="cyan"
        />
        <MetricCard
          title="Complaints / Issues"
          value={complaintsCount}
          subtitle="Pain points requiring resolution"
          icon={<AlertOctagon className="w-5 h-5" />}
          accent="rose"
        />
        <MetricCard
          title="Ideas & Suggestions"
          value={suggestionsCount}
          subtitle="Feature / content suggestions"
          icon={<Lightbulb className="w-5 h-5" />}
          accent="amber"
        />
        <MetricCard
          title="Promotions / Solicitations"
          value={promotionsCount}
          subtitle="Self-promotion & link sharing"
          icon={<Share2 className="w-5 h-5" />}
          accent="purple"
        />
      </div>

      {/* Intent Distribution Chart */}
      <Card>
        <CardHeader
          title="Audience Intent Hierarchy"
          subtitle="Frequency breakdown of intent across analyzed comments"
          icon={<Target className="w-4 h-4 text-sky-400" />}
        />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2B48" />
              <XAxis dataKey="intent" stroke="#94A3B8" fontSize={11} interval={0} angle={-25} textAnchor="end" />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0F1523', borderColor: '#2E3E65', borderRadius: '8px' }}
                formatter={(val: any, name: any, props: any) => [
                  `${val} comments (${props.payload.percent}%)`,
                  'Comments',
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

      {/* Filtered Intent Comments */}
      <Card>
        <CardHeader
          title="Intent-Specific Audience Remarks"
          subtitle="Examine audience signals by chosen communicative goal"
          icon={<Filter className="w-4 h-4" />}
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Filter Intent:</span>
              <select
                value={selectedIntentFilter}
                onChange={(e) => setSelectedIntentFilter(e.target.value)}
                className="bg-navy-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-500/50"
              >
                <option value="All">All Intents ({comments.length})</option>
                {ALL_INTENTS.map((it) => (
                  <option key={it} value={it}>
                    {it} ({summary.intent_distribution?.[it] || 0})
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
                className="p-3 rounded-lg bg-navy-950/60 border border-white/5 hover:border-sky-500/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-xs">@{c.username || 'user'}</span>
                    <Badge variant="cyan" size="sm">
                      {c.analysis.intent}
                    </Badge>
                    <Badge sentiment={c.analysis.sentiment} size="sm">
                      {c.analysis.sentiment}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300">"{c.text}"</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-xs">
                  <span className="text-slate-500 text-[11px]">
                    {(c.analysis.intent_confidence * 100).toFixed(0)}% Certainty
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 p-6 text-center">
              No comments found with intent "{selectedIntentFilter}".
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};
