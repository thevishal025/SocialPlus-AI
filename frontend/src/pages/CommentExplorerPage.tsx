import React, { useState, useMemo } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { CommentFilterBar, FilterState } from '../components/comments/CommentFilterBar';
import {
  MessageSquare,
  Youtube,
  Instagram,
  ThumbsUp,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CommentExplorerPage: React.FC = () => {
  const { result, setSelectedComment } = useAnalysis();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    platform: 'All',
    sentiment: 'All',
    emotion: 'All',
    intent: 'All',
    emojiFilter: 'all',
    spamOnly: false,
    minToxicity: 0,
    sortBy: 'date_desc',
  });

  const [page, setPage] = useState(1);
  const pageSize = 15;

  const handleResetFilters = () => {
    setFilters({
      search: '',
      platform: 'All',
      sentiment: 'All',
      emotion: 'All',
      intent: 'All',
      emojiFilter: 'all',
      spamOnly: false,
      minToxicity: 0,
      sortBy: 'date_desc',
    });
    setPage(1);
  };

  const filteredComments = useMemo(() => {
    if (!result) return [];

    return result.comments
      .filter((c) => {
        // Text & Username Search
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const matchText = (c.text || '').toLowerCase().includes(q);
          const matchUser = (c.username || '').toLowerCase().includes(q);
          if (!matchText && !matchUser) return false;
        }

        // Platform filter
        if (filters.platform !== 'All' && c.platform !== filters.platform) {
          return false;
        }

        // Sentiment filter
        if (filters.sentiment !== 'All' && c.analysis.sentiment !== filters.sentiment) {
          return false;
        }

        // Emotion filter
        if (filters.emotion !== 'All') {
          const hasEmotion =
            c.analysis.dominant_emotion === filters.emotion ||
            c.analysis.emotions?.some((e) => e.emotion === filters.emotion);
          if (!hasEmotion) return false;
        }

        // Intent filter
        if (filters.intent !== 'All' && c.analysis.intent !== filters.intent) {
          return false;
        }

        // Emoji filter
        if (filters.emojiFilter === 'has_emoji' && (c.analysis.emojis?.length || 0) === 0) {
          return false;
        }
        if (filters.emojiFilter === 'emoji_only' && !c.analysis.emoji_only) {
          return false;
        }

        // Spam filter
        if (filters.spamOnly && c.analysis.spam_probability < 0.5) {
          return false;
        }

        // Toxicity filter
        if (filters.minToxicity > 0 && c.analysis.toxicity_score < filters.minToxicity) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'likes_desc') {
          return (b.like_count || 0) - (a.like_count || 0);
        }
        if (filters.sortBy === 'toxicity_desc') {
          return (b.analysis.toxicity_score || 0) - (a.analysis.toxicity_score || 0);
        }
        if (filters.sortBy === 'confidence_asc') {
          return (a.analysis.sentiment_confidence || 0) - (b.analysis.sentiment_confidence || 0);
        }
        if (filters.sortBy === 'date_asc') {
          return (a.published_at || '').localeCompare(b.published_at || '');
        }
        // default date_desc
        return (b.published_at || '').localeCompare(a.published_at || '');
      });
  }, [result, filters]);

  const totalPages = Math.ceil(filteredComments.length / pageSize) || 1;
  const paginatedComments = filteredComments.slice((page - 1) * pageSize, page * pageSize);

  if (!result) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-brand-purple/20 text-brand-purple mx-auto flex items-center justify-center">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">No Comments to Explore</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Ingest and analyze a YouTube video, Instagram post/reel, or comment file to browse with full multi-engine filters.
        </p>
        <Button size="sm" variant="primary" onClick={() => navigate('/analyze')}>
          Analyze Content Now
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
          Unified Comment Explorer
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Explore individual comments across platform origins with combined 5-engine signals, search, and deep-dive analysis.
        </p>
      </div>

      {/* Filter Component */}
      <CommentFilterBar
        filters={filters}
        onChange={(newFilters) => {
          setFilters(newFilters);
          setPage(1);
        }}
        onReset={handleResetFilters}
        totalFiltered={filteredComments.length}
        totalComments={result.comments.length}
      />

      {/* Data Table */}
      <Card>
        <CardHeader
          title="Classified Comment Feed"
          subtitle="Showing page {page} of {totalPages} • Click any row for deep-dive panel"
          icon={<MessageSquare className="w-4 h-4 text-brand-purple" />}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-950/80 text-slate-400 font-semibold border-b border-white/5 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Platform</th>
                <th className="p-3">Author</th>
                <th className="p-3">Comment Text</th>
                <th className="p-3">Sentiment</th>
                <th className="p-3">Emotion</th>
                <th className="p-3">Intent</th>
                <th className="p-3">Emojis</th>
                <th className="p-3">Spam / Tox</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedComments.length > 0 ? (
                paginatedComments.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedComment(c)}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="p-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                        {c.platform === 'youtube' && <Youtube className="w-3.5 h-3.5 text-red-500" />}
                        {c.platform === 'instagram' && <Instagram className="w-3.5 h-3.5 text-pink-500" />}
                        {c.platform === 'uploaded' && <MessageSquare className="w-3.5 h-3.5 text-brand-purple" />}
                        <span className="capitalize">{c.platform}</span>
                      </span>
                    </td>

                    <td className="p-3 font-semibold text-white whitespace-nowrap">
                      @{c.username || 'user'}
                    </td>

                    <td className="p-3 max-w-xs md:max-w-md truncate text-slate-200" title={c.text}>
                      {c.text}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <Badge sentiment={c.analysis.sentiment} size="sm">
                        {c.analysis.sentiment}
                      </Badge>
                    </td>

                    <td className="p-3 whitespace-nowrap text-slate-300">
                      {c.analysis.dominant_emotion}
                    </td>

                    <td className="p-3 whitespace-nowrap text-slate-300">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-navy-800 border border-white/5">
                        {c.analysis.intent}
                      </span>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {c.analysis.emojis && c.analysis.emojis.length > 0 ? (
                        <span className="text-sm">{c.analysis.emojis.slice(0, 3).join('')}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {c.analysis.spam_probability > 0.5 ? (
                        <Badge variant="danger" size="sm">Spam</Badge>
                      ) : c.analysis.toxicity_score > 0.25 ? (
                        <Badge variant="negative" size="sm">Toxic</Badge>
                      ) : (
                        <Badge variant="positive" size="sm">Clean</Badge>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap">
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
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No comments found matching current filter configuration.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between p-4 border-t border-white/5 text-xs">
          <span className="text-slate-400">
            Page {page} of {totalPages} ({filteredComments.length} total results)
          </span>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              icon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              icon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
