import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { SentimentType } from '../../api/types';

export interface FilterState {
  search: string;
  platform: string;
  sentiment: string;
  emotion: string;
  intent: string;
  emojiFilter: 'all' | 'has_emoji' | 'emoji_only';
  spamOnly: boolean;
  minToxicity: number;
  sortBy: 'date_desc' | 'date_asc' | 'likes_desc' | 'toxicity_desc' | 'confidence_asc';
}

interface CommentFilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  totalFiltered: number;
  totalComments: number;
}

export const CommentFilterBar: React.FC<CommentFilterBarProps> = ({
  filters,
  onChange,
  onReset,
  totalFiltered,
  totalComments,
}) => {
  const sentiments: Array<SentimentType | 'All'> = ['All', 'Positive', 'Negative', 'Neutral', 'Mixed', 'Sarcastic'];
  const emotions = [
    'All',
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
  const intents = [
    'All',
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

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Top search and sort bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search comment text, author username, keywords..."
            className="w-full bg-navy-950/80 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/50"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={filters.sortBy}
            onChange={(e) => onChange({ ...filters, sortBy: e.target.value as any })}
            className="bg-navy-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-purple/50"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="likes_desc">Most Liked</option>
            <option value="toxicity_desc">Highest Toxicity</option>
            <option value="confidence_asc">Lowest Confidence (Audit)</option>
          </select>

          <button
            onClick={onReset}
            title="Reset Filters"
            className="p-2 rounded-lg bg-navy-800 text-slate-400 hover:text-white hover:bg-navy-750 border border-white/5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Multi-Filter Dropdowns Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-white/5 text-xs">
        {/* Platform */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Platform</label>
          <select
            value={filters.platform}
            onChange={(e) => onChange({ ...filters, platform: e.target.value })}
            className="w-full bg-navy-950 border border-white/10 rounded-md p-1.5 text-slate-300 focus:outline-none focus:border-brand-purple/50"
          >
            <option value="All">All Platforms</option>
            <option value="youtube">YouTube</option>
            <option value="instagram">Instagram</option>
            <option value="uploaded">Uploaded / CSV</option>
          </select>
        </div>

        {/* Sentiment */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Sentiment</label>
          <select
            value={filters.sentiment}
            onChange={(e) => onChange({ ...filters, sentiment: e.target.value })}
            className="w-full bg-navy-950 border border-white/10 rounded-md p-1.5 text-slate-300 focus:outline-none focus:border-brand-purple/50"
          >
            {sentiments.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Emotion */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Emotion</label>
          <select
            value={filters.emotion}
            onChange={(e) => onChange({ ...filters, emotion: e.target.value })}
            className="w-full bg-navy-950 border border-white/10 rounded-md p-1.5 text-slate-300 focus:outline-none focus:border-brand-purple/50"
          >
            {emotions.map((em) => (
              <option key={em} value={em}>{em}</option>
            ))}
          </select>
        </div>

        {/* Intent */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Intent</label>
          <select
            value={filters.intent}
            onChange={(e) => onChange({ ...filters, intent: e.target.value })}
            className="w-full bg-navy-950 border border-white/10 rounded-md p-1.5 text-slate-300 focus:outline-none focus:border-brand-purple/50"
          >
            {intents.map((it) => (
              <option key={it} value={it}>{it}</option>
            ))}
          </select>
        </div>

        {/* Emoji filter */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Emoji Mode</label>
          <select
            value={filters.emojiFilter}
            onChange={(e) => onChange({ ...filters, emojiFilter: e.target.value as any })}
            className="w-full bg-navy-950 border border-white/10 rounded-md p-1.5 text-slate-300 focus:outline-none focus:border-brand-purple/50"
          >
            <option value="all">Any</option>
            <option value="has_emoji">Contains Emojis</option>
            <option value="emoji_only">Emoji Only</option>
          </select>
        </div>

        {/* Spam Toggle & Counter */}
        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 cursor-pointer bg-navy-950 border border-white/10 rounded-md p-1.5 select-none hover:border-white/20">
            <input
              type="checkbox"
              checked={filters.spamOnly}
              onChange={(e) => onChange({ ...filters, spamOnly: e.target.checked })}
              className="rounded bg-navy-800 border-white/20 text-brand-purple focus:ring-0 focus:ring-offset-0"
            />
            <span className="text-[11px] text-rose-300 font-medium">Spam Only</span>
          </label>
        </div>
      </div>

      {/* Filter status row */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-brand-purple" />
          <span>Showing <strong className="text-white">{totalFiltered}</strong> of {totalComments} comments</span>
        </div>
        {filters.minToxicity > 0 && (
          <span className="text-amber-400 text-[11px]">
            Min toxicity filter: {(filters.minToxicity * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
};

