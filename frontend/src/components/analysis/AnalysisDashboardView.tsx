import React, { useState, useMemo } from 'react';
import {
  CommentItem,
  EngineSummary,
  VideoMetadata,
  EcommerceProduct,
  AnalysisResponse,
  EcommerceAnalysisResponse,
} from '../../api/types';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { MetricCard } from '../ui/MetricCard';
import { Badge } from '../ui/Badge';
import { DownloadReportButton } from '../ui/DownloadReportButton';
import { CommentDetailModal } from '../comments/CommentDetailModal';
import { extractTopKeywords, KeywordItem } from '../../utils/keywords';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  Sparkles,
  TrendingUp,
  Heart,
  Target,
  ShieldAlert,
  MessageSquare,
  ThumbsUp,
  Hash,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
  Star,
  Youtube,
  Instagram,
  ShoppingBag,
  Filter,
  RotateCcw,
  AlertTriangle,
  Smile,
  Cpu,
  Layers,
  Crown,
  CheckCircle,
  Eye,
  Info,
} from 'lucide-react';

interface AnalysisDashboardViewProps {
  platform: 'youtube' | 'instagram' | 'flipkart' | 'amazon' | 'ecommerce' | 'overview' | 'meta' | 'facebook' | string;
  title?: string;
  videoMeta?: VideoMetadata;
  productMeta?: EcommerceProduct;
  comments: CommentItem[];
  summary: EngineSummary;
  rawResponse?: AnalysisResponse | EcommerceAnalysisResponse;
  onCommentSelect?: (comment: CommentItem) => void;
  requestedCount?: number | string;
  reportedCount?: number;
  extractedCount?: number;
  analyzedCount?: number;
  status?: string;
}

const SENTIMENT_COLORS: Record<string, string> = {
  Positive: '#10B981',
  Negative: '#F43F5E',
  Neutral: '#0EA5E9',
  Mixed: '#F59E0B',
  Sarcastic: '#A855F7',
};

export const AnalysisDashboardView: React.FC<AnalysisDashboardViewProps> = ({
  platform,
  title,
  videoMeta,
  productMeta,
  comments = [],
  summary,
  rawResponse,
  onCommentSelect,
  requestedCount,
  reportedCount,
  extractedCount,
  analyzedCount,
  status,
}) => {
  // Active Tab for Intelligence Deep-Dive
  const [activeModuleTab, setActiveModuleTab] = useState<
    'all' | 'sentiment' | 'emotion' | 'intent' | 'emoji' | 'moderation'
  >('all');

  // Multi-Filter States for Comment Explorer
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [emotionFilter, setEmotionFilter] = useState<string>('all');
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [emojiFilter, setEmojiFilter] = useState<'all' | 'has_emoji' | 'emoji_only'>('all');
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [spamFilter, setSpamFilter] = useState<'all' | 'spam_only' | 'clean_only'>('all');
  const [toxicityFilter, setToxicityFilter] = useState<'all' | 'toxic_only' | 'safe_only'>('all');
  const [sortBy, setSortBy] = useState<'likes_desc' | 'date_desc' | 'date_asc' | 'toxicity_desc'>('likes_desc');

  // Pagination for Comment Explorer
  const [visibleCount, setVisibleCount] = useState(20);

  // Keyword Table toggle
  const [showAllWords, setShowAllWords] = useState(false);

  // Selected comment for deep dive modal
  const [modalComment, setModalComment] = useState<CommentItem | null>(null);

  // Extract top keywords with aggressive stop-word removal
  const topKeywords = useMemo(() => {
    return extractTopKeywords(comments, 25);
  }, [comments]);

  const displayedKeywords = showAllWords ? topKeywords : topKeywords.slice(0, 10);

  // Top 10 Most Liked Comments
  const top10LikedComments = useMemo(() => {
    return comments
      .slice()
      .sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
      .slice(0, 10);
  }, [comments]);

  // Sentiment chart data
  const sentimentDistribution = summary?.sentiment_distribution || {
    Positive: 0,
    Negative: 0,
    Neutral: 0,
    Mixed: 0,
    Sarcastic: 0,
  };

  const sentimentPercentages = summary?.sentiment_percentages || {
    Positive: 0,
    Negative: 0,
    Neutral: 0,
    Mixed: 0,
    Sarcastic: 0,
  };

  const sentimentChartData = useMemo(() => {
    return [
      { name: 'Positive', count: sentimentDistribution.Positive || 0, percent: sentimentPercentages.Positive || 0, fill: SENTIMENT_COLORS.Positive },
      { name: 'Neutral', count: sentimentDistribution.Neutral || 0, percent: sentimentPercentages.Neutral || 0, fill: SENTIMENT_COLORS.Neutral },
      { name: 'Negative', count: sentimentDistribution.Negative || 0, percent: sentimentPercentages.Negative || 0, fill: SENTIMENT_COLORS.Negative },
      { name: 'Mixed', count: sentimentDistribution.Mixed || 0, percent: sentimentPercentages.Mixed || 0, fill: SENTIMENT_COLORS.Mixed },
      { name: 'Sarcastic', count: sentimentDistribution.Sarcastic || 0, percent: sentimentPercentages.Sarcastic || 0, fill: SENTIMENT_COLORS.Sarcastic },
    ];
  }, [sentimentDistribution, sentimentPercentages]);

  // Emotion chart data
  const emotionChartData = useMemo(() => {
    const dist = summary?.emotion_distribution || {};
    return Object.entries(dist)
      .map(([name, count]) => ({
        name,
        count,
        percent: summary.total_comments > 0 ? Math.round((count / summary.total_comments) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [summary]);

  // Intent chart data
  const intentChartData = useMemo(() => {
    const dist = summary?.intent_distribution || {};
    return Object.entries(dist)
      .map(([name, count]) => ({
        name,
        count,
        percent: summary.total_comments > 0 ? Math.round((count / summary.total_comments) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [summary]);

  // Moderation metrics
  const spamCount = summary?.moderation_summary?.spam_count || 0;
  const toxicCount = summary?.moderation_summary?.toxic_count || 0;
  const totalComments = summary?.total_comments || comments.length || 1;
  const spamRate = totalComments > 0 ? (spamCount / totalComments) * 100 : 0;
  const toxicRate = totalComments > 0 ? (toxicCount / totalComments) * 100 : 0;

  const spamRiskLevel = spamRate > 35 ? 'High Risk' : spamRate > 15 ? 'Moderate Risk' : 'Low Risk';
  const toxicRiskLevel = toxicRate > 25 ? 'High Toxicity' : toxicRate > 10 ? 'Moderate Toxicity' : 'Low Toxicity';

  // Clear all active filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSentimentFilter('all');
    setEmotionFilter('all');
    setIntentFilter('all');
    setEmojiFilter('all');
    setSelectedKeyword(null);
    setSelectedEmoji(null);
    setSpamFilter('all');
    setToxicityFilter('all');
    setSortBy('likes_desc');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    sentimentFilter !== 'all' ||
    emotionFilter !== 'all' ||
    intentFilter !== 'all' ||
    emojiFilter !== 'all' ||
    selectedKeyword !== null ||
    selectedEmoji !== null ||
    spamFilter !== 'all' ||
    toxicityFilter !== 'all';

  // Filtered & Sorted Comments
  const filteredComments = useMemo(() => {
    return comments
      .filter((c) => {
        // Search query
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchText = (c.text || '').toLowerCase().includes(q);
          const matchUser = (c.username || '').toLowerCase().includes(q);
          if (!matchText && !matchUser) return false;
        }

        // Sentiment
        if (sentimentFilter !== 'all') {
          if ((c.analysis.sentiment || '').toLowerCase() !== sentimentFilter.toLowerCase()) return false;
        }

        // Emotion
        if (emotionFilter !== 'all') {
          const dom = (c.analysis.dominant_emotion || '').toLowerCase();
          if (dom !== emotionFilter.toLowerCase()) return false;
        }

        // Intent
        if (intentFilter !== 'all') {
          if ((c.analysis.intent || '').toLowerCase() !== intentFilter.toLowerCase()) return false;
        }

        // Emoji mode
        if (emojiFilter === 'has_emoji' && (!c.analysis.emojis || c.analysis.emojis.length === 0)) return false;
        if (emojiFilter === 'emoji_only' && !c.analysis.emoji_only) return false;

        // Selected specific emoji
        if (selectedEmoji && (!c.analysis.emojis || !c.analysis.emojis.includes(selectedEmoji))) return false;

        // Selected keyword
        if (selectedKeyword) {
          const regex = new RegExp(`\\b${selectedKeyword}\\b`, 'i');
          if (!regex.test(c.text || '')) return false;
        }

        // Spam
        if (spamFilter === 'spam_only' && (c.analysis.spam_probability || 0) <= 0.5) return false;
        if (spamFilter === 'clean_only' && (c.analysis.spam_probability || 0) > 0.5) return false;

        // Toxicity
        if (toxicityFilter === 'toxic_only' && (c.analysis.toxicity_score || 0) <= 0.25) return false;
        if (toxicityFilter === 'safe_only' && (c.analysis.toxicity_score || 0) > 0.25) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'likes_desc') return (b.like_count || 0) - (a.like_count || 0);
        if (sortBy === 'toxicity_desc') return (b.analysis.toxicity_score || 0) - (a.analysis.toxicity_score || 0);
        if (sortBy === 'date_asc') return (a.published_at || '').localeCompare(b.published_at || '');
        return (b.published_at || '').localeCompare(a.published_at || '');
      });
  }, [
    comments,
    searchQuery,
    sentimentFilter,
    emotionFilter,
    intentFilter,
    emojiFilter,
    selectedKeyword,
    selectedEmoji,
    spamFilter,
    toxicityFilter,
    sortBy,
  ]);

  const displayedComments = filteredComments.slice(0, visibleCount);

  // Engagement calculation
  const getEngagementRate = () => {
    if (videoMeta && videoMeta.views && videoMeta.views > 0) {
      const likes = videoMeta.likes || 0;
      const commentCount = videoMeta.comment_count || comments.length;
      return `${(((likes + commentCount) / videoMeta.views) * 100).toFixed(2)}%`;
    }
    if (comments.length > 0) {
      const totalLikes = comments.reduce((acc, c) => acc + (c.like_count || 0), 0);
      return `${((totalLikes / comments.length)).toFixed(1)} avg likes/comment`;
    }
    return 'N/A';
  };

  const handleOpenModal = (comment: CommentItem) => {
    setModalComment(comment);
    if (onCommentSelect) onCommentSelect(comment);
  };

  // Reusable report payload fallback
  const reportPayload = rawResponse || {
    comments,
    summary,
    video: videoMeta,
    product: productMeta,
  };

  // Audit Metrics Calculation (Reported | Requested | Extracted | Analyzed)
  const effectiveReported =
    reportedCount ??
    (rawResponse as any)?.reported_count ??
    videoMeta?.comment_count ??
    productMeta?.review_count ??
    comments.length;

  const rawReq = requestedCount ?? (rawResponse as any)?.requested_count;
  const effectiveRequested =
    rawReq === 'ALL' || rawReq === 'all'
      ? 'ALL'
      : typeof rawReq === 'number'
      ? rawReq.toLocaleString()
      : rawReq
      ? String(rawReq)
      : comments.length.toLocaleString();

  const effectiveExtracted =
    extractedCount ??
    (rawResponse as any)?.extracted_count ??
    comments.length;

  const effectiveAnalyzed =
    analyzedCount ??
    (rawResponse as any)?.analyzed_count ??
    comments.length;

  const currentStatus =
    status ||
    (rawResponse as any)?.status ||
    (typeof rawReq === 'number' && effectiveAnalyzed < rawReq ? 'Partial' : 'Complete');

  const isPartial = String(currentStatus).toLowerCase() === 'partial';

  return (
    <div className="space-y-6">
      {/* 1. TOP ACTION BAR WITH DOWNLOAD REPORT BUTTON & 4-TIER AUDIT BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-bg-card border border-border-dark shadow-card-depth">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPartial ? 'bg-amber-400' : 'bg-emerald-400'
              } animate-pulse`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              {isPartial ? 'Partial Analysis Complete' : 'Intelligence Engine Complete'}
            </span>
            {isPartial && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Partial
              </span>
            )}
          </div>

          {/* 4-tier quantity audit: Reported | Requested | Extracted | Analyzed */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono py-1 px-3 rounded-lg bg-bg-secondary border border-border-dark text-text-muted">
            <span className="text-text-muted">
              Reported: <strong className="text-white font-bold">{effectiveReported.toLocaleString()}</strong>
            </span>
            <span className="text-border-light font-bold">|</span>
            <span className="text-text-muted">
              Requested: <strong className="text-accent-yellow font-bold">{effectiveRequested}</strong>
            </span>
            <span className="text-border-light font-bold">|</span>
            <span className="text-text-muted">
              Extracted: <strong className="text-sky-400 font-bold">{effectiveExtracted.toLocaleString()}</strong>
            </span>
            <span className="text-border-light font-bold">|</span>
            <span className="text-text-muted">
              Analyzed: <strong className="text-emerald-400 font-bold">{effectiveAnalyzed.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        <DownloadReportButton
          result={reportPayload as any}
          platform={platform.toUpperCase()}
          title={title || videoMeta?.title || productMeta?.title || 'SocialPlus Analysis Report'}
        />
      </div>

      {/* 2. PLATFORM PERFORMANCE OVERVIEW HEADER */}
      {/* YouTube Specific Header */}
      {platform === 'youtube' && videoMeta && (
        <Card className="bg-bg-card border-border-dark shadow-card-depth">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            {videoMeta.thumbnail && (
              <img
                src={videoMeta.thumbnail}
                alt={videoMeta.title}
                className="w-full md:w-56 h-32 object-cover rounded-xl border border-border-dark shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="default" size="sm">
                  <Youtube className="w-3.5 h-3.5 text-red-500" />
                  <span>YouTube Video</span>
                </Badge>
                {videoMeta.channel && (
                  <span className="text-xs font-semibold text-text-muted">{videoMeta.channel}</span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-2">
                {videoMeta.title}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-border-dark text-xs">
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Views</span>
                  <strong className="text-white font-mono text-sm">{videoMeta.views?.toLocaleString() || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Likes</span>
                  <strong className="text-white font-mono text-sm">{videoMeta.likes?.toLocaleString() || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Comments</span>
                  <strong className="text-accent-yellow font-mono text-sm">{comments.length.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Engagement Rate</span>
                  <strong className="text-emerald-400 font-mono text-sm">{getEngagementRate()}</strong>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Instagram Specific Header */}
      {platform === 'instagram' && (
        <Card className="bg-bg-card border-border-dark shadow-card-depth">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            {videoMeta?.thumbnail ? (
              <img
                src={videoMeta.thumbnail}
                alt={videoMeta.title || 'Instagram Post'}
                className="w-full md:w-44 h-36 object-cover rounded-xl border border-border-dark shrink-0"
              />
            ) : (
              <div className="w-full md:w-36 h-28 rounded-xl bg-gradient-to-tr from-yellow-500/20 via-pink-500/20 to-purple-500/20 border border-border-dark flex items-center justify-center shrink-0">
                <Instagram className="w-10 h-10 text-pink-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="purple" size="sm">
                  <Instagram className="w-3.5 h-3.5 text-pink-400" />
                  <span>Instagram Reel / Post</span>
                </Badge>
                {videoMeta?.channel && (
                  <span className="text-xs font-semibold text-text-muted">@{videoMeta.channel}</span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-2">
                {videoMeta?.title || title || 'Instagram Comment Intelligence'}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-border-dark text-xs">
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Likes</span>
                  <strong className="text-white font-mono text-sm">{videoMeta?.likes?.toLocaleString() || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Comments Analyzed</span>
                  <strong className="text-accent-yellow font-mono text-sm">{comments.length.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Audience Activity</span>
                  <strong className="text-emerald-400 font-mono text-sm">High Active</strong>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* E-Commerce Specific Header (Amazon & Flipkart) */}
      {(platform === 'flipkart' || platform === 'amazon' || platform === 'ecommerce') && productMeta && (
        <Card className="bg-bg-card border-border-dark shadow-card-depth">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            {productMeta.image ? (
              <img
                src={productMeta.image}
                alt={productMeta.title}
                className="w-full md:w-44 h-40 object-contain p-2 bg-white/5 rounded-xl border border-border-dark shrink-0"
              />
            ) : (
              <div className="w-full md:w-40 h-32 rounded-xl bg-accent-yellow/10 border border-accent-yellow/20 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-10 h-10 text-accent-yellow" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="default" size="sm">
                  <ShoppingBag className="w-3.5 h-3.5 text-accent-yellow" />
                  <span className="capitalize">{productMeta.platform || platform}</span>
                </Badge>
                {productMeta.brand && (
                  <span className="text-xs font-semibold text-text-muted">Brand: {productMeta.brand}</span>
                )}
                {productMeta.price && (
                  <Badge variant="positive" size="sm">{productMeta.price}</Badge>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-2">
                {productMeta.title}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-border-dark text-xs">
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Average Rating</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <strong className="text-white font-mono text-sm">
                      {productMeta.average_rating ? `${productMeta.average_rating.toFixed(1)} / 5.0` : 'N/A'}
                    </strong>
                    <div className="flex text-accent-yellow">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            (productMeta.average_rating || 0) >= star ? 'fill-accent-yellow' : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Reported Ratings</span>
                  <strong className="text-white font-mono text-sm">
                    {productMeta.rating_count ? productMeta.rating_count.toLocaleString() : 'N/A'}
                  </strong>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Reported Reviews</span>
                  <strong className="text-white font-mono text-sm">
                    {productMeta.review_count ? productMeta.review_count.toLocaleString() : 'N/A'}
                  </strong>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Analyzed Reviews</span>
                  <strong className="text-accent-yellow font-mono text-sm">{comments.length.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Generic / Overview Header */}
      {platform === 'overview' && (
        <Card className="bg-bg-card border-border-dark shadow-card-depth">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent-yellow/10 border border-accent-yellow/20 flex items-center justify-center">
                <Layers className="w-6 h-6 text-accent-yellow" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {title || 'Cross-Platform Intelligence Dataset'}
                </h2>
                <p className="text-xs text-text-muted">
                  Unified audience feedback aggregation across social and commerce channels
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-muted block">Total Records</span>
              <span className="text-xl font-bold font-mono text-accent-yellow">{comments.length}</span>
            </div>
          </div>
        </Card>
      )}

      {/* 3. KEY METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Ingested"
          value={summary.total_comments || comments.length}
          subtitle="Analyzed by all 5 engines"
          icon={<MessageSquare className="w-5 h-5 text-accent-yellow" />}
        />
        <MetricCard
          title="Net Sentiment Score"
          value={
            summary.net_sentiment_score > 0
              ? `+${summary.net_sentiment_score}`
              : summary.net_sentiment_score
          }
          subtitle="Polarity (-100 to +100)"
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Dominant Emotion"
          value={summary.dominant_emotion || 'Joy'}
          subtitle="Primary audience feeling"
          icon={<Heart className="w-5 h-5 text-rose-400" />}
        />
        <MetricCard
          title="Audience Safety"
          value={`${(100 - Math.max(spamRate, toxicRate)).toFixed(1)}%`}
          subtitle={`${spamCount} spam • ${toxicCount} toxic`}
          icon={<ShieldAlert className="w-5 h-5 text-accent-yellow" />}
        />
      </div>

      {/* 4. DEDICATED SECTION: TOP 10 MOST LIKED / HELPFUL COMMENTS */}
      {top10LikedComments.length > 0 && (
        <Card className="bg-bg-card border-border-dark shadow-card-depth">
          <CardHeader
            title="Top 10 Most Liked & Influential Comments"
            subtitle="The highest-engagement audience opinions ranked by helpful votes and likes"
            icon={<Crown className="w-5 h-5 text-accent-yellow" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {top10LikedComments.map((comment, idx) => {
              const sent = comment.analysis.sentiment || 'Neutral';
              return (
                <div
                  key={comment.id || idx}
                  onClick={() => handleOpenModal(comment)}
                  className="p-4 rounded-xl bg-bg-secondary/70 hover:bg-bg-secondary border border-border-dark hover:border-accent-yellow/50 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                >
                  <div>
                    {/* Header: Rank + User + Likes */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            idx === 0
                              ? 'bg-accent-yellow text-bg-primary shadow-glow-sm'
                              : idx === 1
                              ? 'bg-slate-300 text-bg-primary'
                              : idx === 2
                              ? 'bg-amber-600 text-white'
                              : 'bg-bg-primary text-text-muted border border-border-dark'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-white group-hover:text-accent-yellow transition-colors">
                          @{comment.username || 'user'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-yellow/10 border border-accent-yellow/30 text-accent-yellow text-xs font-bold font-mono">
                        <ThumbsUp className="w-3 h-3" />
                        <span>{comment.like_count?.toLocaleString() || 0}</span>
                      </div>
                    </div>

                    {/* Comment text */}
                    <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
                      "{comment.text}"
                    </p>
                  </div>

                  {/* Badges footer */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-dark/60 text-[11px]">
                    <Badge sentiment={sent} size="sm">
                      {sent}
                    </Badge>
                    <span className="px-2 py-0.5 rounded bg-bg-primary border border-border-dark text-slate-300">
                      🎭 {comment.analysis.dominant_emotion || 'Neutral'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-bg-primary border border-border-dark text-slate-300">
                      🎯 {comment.analysis.intent || 'Discussion'}
                    </span>
                    {comment.analysis.spam_probability > 0.5 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                        Spam Signal
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 5. COMPLETE FIVE INTELLIGENCE MODULES (INTERACTIVE) */}
      <Card className="bg-bg-card border-border-dark shadow-card-depth space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-dark">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-accent-yellow" />
              Complete Five AI Intelligence Engines
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Deep-dive metrics, interactive distribution charts, and contextual intelligence models
            </p>
          </div>

          {/* Module Selector Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-bg-secondary border border-border-dark text-xs font-semibold">
            <button
              onClick={() => setActiveModuleTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeModuleTab === 'all'
                  ? 'bg-accent-yellow text-bg-primary font-bold shadow-glow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              All Modules
            </button>
            <button
              onClick={() => setActiveModuleTab('sentiment')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeModuleTab === 'sentiment'
                  ? 'bg-accent-yellow text-bg-primary font-bold shadow-glow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              1. Sentiment
            </button>
            <button
              onClick={() => setActiveModuleTab('emotion')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeModuleTab === 'emotion'
                  ? 'bg-accent-yellow text-bg-primary font-bold shadow-glow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              2. Emotion
            </button>
            <button
              onClick={() => setActiveModuleTab('intent')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeModuleTab === 'intent'
                  ? 'bg-accent-yellow text-bg-primary font-bold shadow-glow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              3. Intent
            </button>
            <button
              onClick={() => setActiveModuleTab('emoji')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeModuleTab === 'emoji'
                  ? 'bg-accent-yellow text-bg-primary font-bold shadow-glow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              4. Emoji
            </button>
            <button
              onClick={() => setActiveModuleTab('moderation')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeModuleTab === 'moderation'
                  ? 'bg-accent-yellow text-bg-primary font-bold shadow-glow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              5. Moderation
            </button>
          </div>
        </div>

        {/* MODULE 1: ADVANCED SENTIMENT INTELLIGENCE (5 CATEGORIES) */}
        {(activeModuleTab === 'all' || activeModuleTab === 'sentiment') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-accent-yellow flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-accent-yellow" />
                1. Sentiment Intelligence (5 Dimensions)
              </span>
              <span className="text-xs text-text-muted">Click any sentiment card to filter comments</span>
            </div>

            {/* 5 Category Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Positive', count: sentimentDistribution.Positive || 0, pct: sentimentPercentages.Positive || 0, color: '#10B981', border: 'border-emerald-500/30' },
                { label: 'Neutral', count: sentimentDistribution.Neutral || 0, pct: sentimentPercentages.Neutral || 0, color: '#0EA5E9', border: 'border-sky-500/30' },
                { label: 'Negative', count: sentimentDistribution.Negative || 0, pct: sentimentPercentages.Negative || 0, color: '#F43F5E', border: 'border-rose-500/30' },
                { label: 'Mixed', count: sentimentDistribution.Mixed || 0, pct: sentimentPercentages.Mixed || 0, color: '#F59E0B', border: 'border-amber-500/30' },
                { label: 'Sarcastic', count: sentimentDistribution.Sarcastic || 0, pct: sentimentPercentages.Sarcastic || 0, color: '#A855F7', border: 'border-purple-500/30' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setSentimentFilter(sentimentFilter.toLowerCase() === item.label.toLowerCase() ? 'all' : item.label.toLowerCase());
                  }}
                  className={`p-3.5 rounded-xl bg-bg-secondary text-left border transition-all ${
                    sentimentFilter.toLowerCase() === item.label.toLowerCase()
                      ? 'border-accent-yellow ring-1 ring-accent-yellow shadow-glow-sm'
                      : `${item.border} hover:border-white/30`
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </span>
                    <span className="text-xs text-text-muted">{item.count}</span>
                  </div>
                  <div className="text-xl font-bold font-mono mt-1" style={{ color: item.color }}>
                    {item.pct}%
                  </div>
                </button>
              ))}
            </div>

            {/* Charts Grid: Bar Chart + Donut Pie Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-bg-secondary/60 border border-border-dark">
                <span className="text-xs font-semibold text-text-muted block mb-3">
                  Sentiment Volume & Percentage Breakdown
                </span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sentimentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} />
                      <YAxis stroke="#888" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                        labelStyle={{ color: '#FFD700', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-bg-secondary/60 border border-border-dark flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-text-muted block mb-2">
                    Proportional Sentiment Share
                  </span>
                  <div className="h-44 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sentimentChartData}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {sentimentChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sarcasm Contextual Detection Note */}
                <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-purple-400 mt-0.5" />
                  <span>
                    <strong>Contextual Sarcasm:</strong> Detected when praise or positive keywords are juxtaposed with mocking emojis (🙄, 🤡, 💀) or ironical phrasing.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 2: EMOTIONAL INTELLIGENCE METER */}
        {(activeModuleTab === 'all' || activeModuleTab === 'emotion') && (
          <div className="space-y-4 pt-4 border-t border-border-dark">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-400" />
                2. Emotional Intelligence Spectrum
              </span>
              <span className="text-xs text-text-muted">Click any emotion to filter comments</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Emotion Bars */}
              <div className="p-4 rounded-xl bg-bg-secondary/60 border border-border-dark">
                <span className="text-xs font-semibold text-text-muted block mb-3">
                  Dominant Emotional Frequency
                </span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={emotionChartData} layout="vertical" margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis type="number" stroke="#888" fontSize={11} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#FFF" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                      />
                      <Bar dataKey="count" fill="#FFD700" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Emotion Cards Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {Object.entries(summary.emotion_distribution || {})
                  .slice(0, 6)
                  .map(([em, cnt]) => {
                    const pct = totalComments > 0 ? Math.round((cnt / totalComments) * 100) : 0;
                    return (
                      <button
                        key={em}
                        onClick={() => setEmotionFilter(emotionFilter.toLowerCase() === em.toLowerCase() ? 'all' : em.toLowerCase())}
                        className={`p-3 rounded-lg text-left border transition-all ${
                          emotionFilter.toLowerCase() === em.toLowerCase()
                            ? 'bg-rose-500/20 border-rose-500 text-white'
                            : 'bg-bg-secondary/70 border-border-dark hover:border-rose-400/40 text-text-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white">{em}</span>
                          <span className="text-rose-400 font-mono font-bold">{pct}%</span>
                        </div>
                        <div className="w-full bg-bg-primary h-1.5 rounded-full overflow-hidden mt-2">
                          <div className="bg-rose-400 h-full" style={{ width: `${Math.min(pct * 2, 100)}%` }} />
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* MODULE 3: INTENT INTELLIGENCE */}
        {(activeModuleTab === 'all' || activeModuleTab === 'intent') && (
          <div className="space-y-4 pt-4 border-t border-border-dark">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-sky-400" />
                3. Audience Intent Intelligence
              </span>
              <span className="text-xs text-text-muted">Click any intent to filter comments</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Intent Bar Chart */}
              <div className="p-4 rounded-xl bg-bg-secondary/60 border border-border-dark">
                <span className="text-xs font-semibold text-text-muted block mb-3">
                  Audience Action & Intent Categorization
                </span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={intentChartData} layout="vertical" margin={{ top: 5, right: 10, left: 25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis type="number" stroke="#888" fontSize={11} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#FFF" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                      />
                      <Bar dataKey="count" fill="#0EA5E9" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Intent Distribution Badges */}
              <div className="grid grid-cols-2 gap-2.5">
                {Object.entries(summary.intent_distribution || {})
                  .slice(0, 6)
                  .map(([it, cnt]) => {
                    const pct = totalComments > 0 ? Math.round((cnt / totalComments) * 100) : 0;
                    return (
                      <button
                        key={it}
                        onClick={() => setIntentFilter(intentFilter.toLowerCase() === it.toLowerCase() ? 'all' : it.toLowerCase())}
                        className={`p-3 rounded-lg text-left border transition-all ${
                          intentFilter.toLowerCase() === it.toLowerCase()
                            ? 'bg-sky-500/20 border-sky-500 text-white'
                            : 'bg-bg-secondary/70 border-border-dark hover:border-sky-400/40 text-text-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white truncate max-w-[120px]">{it}</span>
                          <span className="text-sky-400 font-mono font-bold">{pct}%</span>
                        </div>
                        <div className="w-full bg-bg-primary h-1.5 rounded-full overflow-hidden mt-2">
                          <div className="bg-sky-400 h-full" style={{ width: `${Math.min(pct * 2, 100)}%` }} />
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* MODULE 4: EMOJI INTELLIGENCE */}
        {(activeModuleTab === 'all' || activeModuleTab === 'emoji') && (
          <div className="space-y-4 pt-4 border-t border-border-dark">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Smile className="w-4 h-4 text-amber-400" />
                4. Emoji Intelligence & Visual Reactions
              </span>
              <span className="text-xs text-text-muted">Click an emoji to filter comments</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {summary.top_emojis && summary.top_emojis.length > 0 ? (
                summary.top_emojis.map((emItem) => (
                  <button
                    key={emItem.emoji}
                    onClick={() => setSelectedEmoji(selectedEmoji === emItem.emoji ? null : emItem.emoji)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedEmoji === emItem.emoji
                        ? 'bg-accent-yellow/20 border-accent-yellow ring-1 ring-accent-yellow'
                        : 'bg-bg-secondary/70 border-border-dark hover:border-accent-yellow/40'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{emItem.emoji}</span>
                    <strong className="text-xs text-white block font-mono">{emItem.count} uses</strong>
                    <span className="text-[10px] text-text-muted block truncate mt-0.5">{emItem.meaning}</span>
                  </button>
                ))
              ) : (
                <p className="text-xs text-text-muted col-span-full">No emojis extracted from this dataset.</p>
              )}
            </div>
          </div>
        )}

        {/* MODULE 5: REDESIGNED AUTO MODERATION (CLEAN BLACK & YELLOW) */}
        {(activeModuleTab === 'all' || activeModuleTab === 'moderation') && (
          <div className="space-y-4 pt-4 border-t border-border-dark">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-accent-yellow flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-accent-yellow" />
                5. Automated Content Moderation & Risk Assessment
              </span>
              <span className="text-xs text-text-muted">Objective Risk Telemetry</span>
            </div>

            {/* TWO PRIMARY SCORE CARDS: SPAM RISK & TOXICITY RISK */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: SPAM RISK */}
              <div className="p-5 rounded-2xl bg-bg-secondary border border-border-dark space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                      SPAM RISK
                    </span>
                    <p className="text-[11px] text-text-muted">Repetitive links, bots & commercial solicitation</p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                      spamRate > 35
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : spamRate > 15
                        ? 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {spamRiskLevel}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono text-white">
                    {spamRate.toFixed(1)}%
                  </span>
                  <span className="text-xs text-text-muted">
                    ({spamCount} of {totalComments} comments)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      spamRate > 35 ? 'bg-rose-500' : spamRate > 15 ? 'bg-accent-yellow' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(spamRate, 100)}%` }}
                  />
                </div>

                <p className="text-xs text-text-muted leading-relaxed pt-1">
                  Evaluates frequency of unauthorized links, telegram handles, promotional cryptocurrency scripts, and bot patterns.
                </p>
              </div>

              {/* Card 2: TOXICITY RISK */}
              <div className="p-5 rounded-2xl bg-bg-secondary border border-border-dark space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                      TOXICITY RISK
                    </span>
                    <p className="text-[11px] text-text-muted">Harassment, hate speech, abusive insults</p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                      toxicRate > 25
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : toxicRate > 10
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {toxicRiskLevel}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono text-white">
                    {toxicRate.toFixed(1)}%
                  </span>
                  <span className="text-xs text-text-muted">
                    ({toxicCount} of {totalComments} comments)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-bg-primary h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      toxicRate > 25 ? 'bg-rose-500' : toxicRate > 10 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(toxicRate, 100)}%` }}
                  />
                </div>

                <p className="text-xs text-text-muted leading-relaxed pt-1">
                  Classifies hostile commentary, personal insults, derogatory slurs, and offensive audience language in Hindi, English, and Hinglish.
                </p>
              </div>
            </div>

            {/* MANDATORY SUBTLE DISCLAIMER */}
            <div className="p-3.5 rounded-xl bg-accent-yellow/5 border border-accent-yellow/20 flex items-start gap-2.5 text-xs text-text-muted">
              <AlertTriangle className="w-4 h-4 text-accent-yellow shrink-0 mt-0.5" />
              <span>
                <strong>⚠ Note:</strong> These AI-generated results depend on the available content and data. They are estimates, not fixed or definitive judgments. Please verify important findings independently.
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* 6. ADVANCED KEYWORD INTELLIGENCE SECTION */}
      {topKeywords.length > 0 && (
        <Card className="bg-bg-card border-border-dark shadow-card-depth">
          <CardHeader
            title="Most Used Words / Keyword Frequency"
            subtitle="Topic-specific terms extracted from actual comments after aggressive multi-lingual stop-word removal"
            icon={<Hash className="w-5 h-5 text-accent-yellow" />}
            action={
              <Button
                variant="outline"
                size="sm"
                icon={showAllWords ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                onClick={() => setShowAllWords(!showAllWords)}
              >
                {showAllWords ? 'Show Top 10' : `Show All (${topKeywords.length})`}
              </Button>
            }
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-secondary text-text-muted uppercase border-b border-border-dark">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Rank</th>
                  <th className="py-2.5 px-4 font-semibold">Keyword</th>
                  <th className="py-2.5 px-4 font-semibold">Frequency</th>
                  <th className="py-2.5 px-4 font-semibold">% of Comments</th>
                  <th className="py-2.5 px-4 font-semibold">Prevalence</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Filter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark">
                {displayedKeywords.map((item, idx) => {
                  const isSelected = selectedKeyword === item.word;
                  return (
                    <tr
                      key={item.word}
                      className={`hover:bg-white/5 transition-colors cursor-pointer ${
                        isSelected ? 'bg-accent-yellow/10' : ''
                      }`}
                      onClick={() => setSelectedKeyword(isSelected ? null : item.word)}
                    >
                      <td className="py-2.5 px-4 text-text-muted font-mono font-bold">#{idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-yellow" />
                        {item.word}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-accent-yellow">{item.count}</td>
                      <td className="py-2.5 px-4 text-text-muted">{item.percent}%</td>
                      <td className="py-2.5 px-4 w-44">
                        <div className="w-full bg-bg-secondary h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-accent-yellow h-full rounded-full"
                            style={{ width: `${Math.min(item.percent * 2, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            isSelected
                              ? 'bg-accent-yellow text-bg-primary font-bold'
                              : 'bg-bg-secondary text-text-muted border border-border-dark'
                          }`}
                        >
                          {isSelected ? 'Active' : 'Click to Filter'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 7. COMPLETE COMMENT EXPLORER & MULTI-FILTERS */}
      <Card className="bg-bg-card border-border-dark shadow-card-depth space-y-4">
        <CardHeader
          title="Audience Comments Explorer"
          subtitle={`Showing ${displayedComments.length} of ${filteredComments.length} matching comments (${comments.length} total)`}
          icon={<MessageSquare className="w-5 h-5 text-accent-yellow" />}
          action={
            hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={handleResetFilters}
              >
                Clear All Filters
              </Button>
            )
          }
        />

        {/* Filter Controls Bar */}
        <div className="p-4 rounded-xl bg-bg-secondary border border-border-dark space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search comments by text, username, keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-bg-primary border border-border-dark rounded-lg text-xs text-white placeholder-text-muted focus:outline-none focus:border-accent-yellow"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-bg-primary border border-border-dark rounded-lg px-3 py-2 text-xs text-text-muted focus:outline-none focus:border-accent-yellow"
              >
                <option value="likes_desc">Most Liked / Helpful</option>
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="toxicity_desc">Highest Toxicity</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Selectors Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-border-dark/60 text-xs">
            {/* Sentiment */}
            <div>
              <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Sentiment</label>
              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value)}
                className="w-full bg-bg-primary border border-border-dark rounded-md p-1.5 text-slate-300 focus:outline-none focus:border-accent-yellow"
              >
                <option value="all">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
                <option value="mixed">Mixed</option>
                <option value="sarcastic">Sarcastic</option>
              </select>
            </div>

            {/* Emotion */}
            <div>
              <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Emotion</label>
              <select
                value={emotionFilter}
                onChange={(e) => setEmotionFilter(e.target.value)}
                className="w-full bg-bg-primary border border-border-dark rounded-md p-1.5 text-slate-300 focus:outline-none focus:border-accent-yellow"
              >
                <option value="all">All Emotions</option>
                {Object.keys(summary.emotion_distribution || {}).map((em) => (
                  <option key={em} value={em}>{em}</option>
                ))}
              </select>
            </div>

            {/* Intent */}
            <div>
              <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Intent</label>
              <select
                value={intentFilter}
                onChange={(e) => setIntentFilter(e.target.value)}
                className="w-full bg-bg-primary border border-border-dark rounded-md p-1.5 text-slate-300 focus:outline-none focus:border-accent-yellow"
              >
                <option value="all">All Intents</option>
                {Object.keys(summary.intent_distribution || {}).map((it) => (
                  <option key={it} value={it}>{it}</option>
                ))}
              </select>
            </div>

            {/* Emoji Mode */}
            <div>
              <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Emoji Mode</label>
              <select
                value={emojiFilter}
                onChange={(e) => setEmojiFilter(e.target.value as any)}
                className="w-full bg-bg-primary border border-border-dark rounded-md p-1.5 text-slate-300 focus:outline-none focus:border-accent-yellow"
              >
                <option value="all">Any</option>
                <option value="has_emoji">Contains Emoji</option>
                <option value="emoji_only">Emoji Only</option>
              </select>
            </div>

            {/* Spam */}
            <div>
              <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Spam Risk</label>
              <select
                value={spamFilter}
                onChange={(e) => setSpamFilter(e.target.value as any)}
                className="w-full bg-bg-primary border border-border-dark rounded-md p-1.5 text-slate-300 focus:outline-none focus:border-accent-yellow"
              >
                <option value="all">All Comments</option>
                <option value="spam_only">Spam Signals Only</option>
                <option value="clean_only">Clean Only</option>
              </select>
            </div>

            {/* Toxicity */}
            <div>
              <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Toxicity Risk</label>
              <select
                value={toxicityFilter}
                onChange={(e) => setToxicityFilter(e.target.value as any)}
                className="w-full bg-bg-primary border border-border-dark rounded-md p-1.5 text-slate-300 focus:outline-none focus:border-accent-yellow"
              >
                <option value="all">All Comments</option>
                <option value="toxic_only">Toxic Language Only</option>
                <option value="safe_only">Non-Toxic Only</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 text-xs">
              <span className="text-[10px] text-text-muted uppercase font-bold">Active:</span>
              {sentimentFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30 flex items-center gap-1">
                  Sentiment: {sentimentFilter}
                  <button onClick={() => setSentimentFilter('all')} className="hover:text-white font-bold ml-1">×</button>
                </span>
              )}
              {emotionFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  Emotion: {emotionFilter}
                  <button onClick={() => setEmotionFilter('all')} className="hover:text-white font-bold ml-1">×</button>
                </span>
              )}
              {intentFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                  Intent: {intentFilter}
                  <button onClick={() => setIntentFilter('all')} className="hover:text-white font-bold ml-1">×</button>
                </span>
              )}
              {selectedKeyword && (
                <span className="px-2 py-0.5 rounded-full bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30 flex items-center gap-1">
                  Keyword: {selectedKeyword}
                  <button onClick={() => setSelectedKeyword(null)} className="hover:text-white font-bold ml-1">×</button>
                </span>
              )}
              {selectedEmoji && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  Emoji: {selectedEmoji}
                  <button onClick={() => setSelectedEmoji(null)} className="hover:text-white font-bold ml-1">×</button>
                </span>
              )}
              {spamFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  {spamFilter}
                  <button onClick={() => setSpamFilter('all')} className="hover:text-white font-bold ml-1">×</button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Comments List */}
        <div className="space-y-3">
          {displayedComments.length > 0 ? (
            displayedComments.map((comment, i) => {
              const sent = comment.analysis.sentiment || 'Neutral';
              return (
                <div
                  key={comment.id || i}
                  onClick={() => handleOpenModal(comment)}
                  className="p-4 rounded-xl bg-bg-secondary/60 hover:bg-bg-secondary border border-border-dark hover:border-accent-yellow/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-accent-yellow transition-colors">
                        @{comment.username || 'user'}
                      </span>
                      {comment.like_count > 0 && (
                        <span className="text-[11px] text-text-muted flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3 text-accent-yellow" />
                          {comment.like_count}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge sentiment={sent} size="sm">
                        {sent}
                      </Badge>
                      <span className="text-[10px] text-text-muted px-2 py-0.5 rounded bg-bg-primary border border-border-dark">
                        {comment.analysis.dominant_emotion || 'Neutral'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">
                    {comment.text}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 mt-2 border-t border-border-dark/50">
                    <span className="flex items-center gap-1.5">
                      <span>Intent: <strong className="text-slate-300">{comment.analysis.intent || 'General'}</strong></span>
                    </span>

                    <span className="text-accent-yellow/80 group-hover:text-accent-yellow text-[10px] font-semibold">
                      Click for AI breakdown →
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-bg-secondary/40 rounded-xl border border-border-dark text-text-muted">
              <p className="text-xs">No comments found matching your selected filters.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleResetFilters}
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>

        {/* Pagination / Load More Button */}
        {filteredComments.length > visibleCount && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setVisibleCount((prev) => prev + 20)}
            >
              Load More Comments (Showing {visibleCount} of {filteredComments.length})
            </Button>
          </div>
        )}
      </Card>

      {/* COMMENT DETAIL MODAL */}
      <CommentDetailModal
        comment={modalComment}
        isOpen={!!modalComment}
        onClose={() => setModalComment(null)}
      />
    </div>
  );
};

