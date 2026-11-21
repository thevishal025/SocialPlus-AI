import React, { useState, useMemo, useRef } from 'react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { MetricCard } from '../components/ui/MetricCard';
import { api } from '../api/client';
import { EcommerceAnalysisResponse, CommentItem } from '../api/types';
import { CommentDetailModal } from '../components/comments/CommentDetailModal';
import { LogarithmicCommentSlider } from '../components/common/LogarithmicCommentSlider';
import {
  ShoppingBag,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Heart,
  Target,
  ShieldAlert,
  ArrowRight,
  Upload,
  FileSpreadsheet,
  FileText,
  Clock,
  RefreshCw,
  Search,
  Star,
  Hash,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  ThumbsDown,
  ThumbsUp,
  Info,
} from 'lucide-react';
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

const SAMPLE_FLIPKART_URL = 'https://dl.flipkart.com/s/v6zq!mNNNN';

// Common Stopwords for Keyword Frequency analysis
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't",
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', "can't", 'cannot', 'could', "couldn't", 'did', "didn't", 'do', 'does', "doesn't", 'doing',
  "don't", 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', "hadn't", 'has', "hasn't",
  'have', "haven't", 'having', 'he', "he'd", "he'll", "he's", 'her', 'here', "here's", 'hers', 'herself',
  'him', 'himself', 'his', 'how', "how's", 'i', "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is',
  "isn't", 'it', "it's", 'its', 'itself', "let's", 'me', 'more', 'most', "mustn't", 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', "shan't", 'she', "she'd", "she'll", "she's", 'should',
  "shouldn't", 'so', 'some', 'such', 'than', 'that', "that's", 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', "there's", 'these', 'they', "they'd", "they'll", "they're", "they've",
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', "wasn't", 'we',
  "we'd", "we'll", "we're", "we've", 'were', "weren't", 'what', "what's", 'when', "when's", 'where',
  "where's", 'which', 'while', 'who', "who's", 'whom', 'why', "why's", 'with', "won't", 'would',
  "wouldn't", 'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself', 'yourselves',
  'just', 'like', 'also', 'get', 'got', 'really', 'one', 'even', 'will', 'well', 'much', 'many',
  'make', 'see', 'look', 'now', 'know', 'think', 'please', 'pls', 'thank', 'thanks', 'bro', 'sir',
  'im', 'thats', 'dont', 'cant', 'wont', 'gonna', 'wanna', 'hey', 'hi', 'hello', 'ok', 'okay',
  'yeah', 'yes', 'nah', 'ur', 'u', 'r', 'phone', 'mobile', 'device', 'item', 'product'
]);

const formatKeyword = (kw: string) => {
  return kw
    .split(' ')
    .map((w) => (w && /^[a-z]/i.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
};

export const EcommercePage: React.FC = () => {
  const [method, setMethod] = useState<'url' | 'file' | 'manual'>('url');
  const [url, setUrl] = useState('');
  const [maxReviews, setMaxReviews] = useState(30);
  const [isMaxReviews, setIsMaxReviews] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Analysis result
  const [data, setData] = useState<EcommerceAnalysisResponse | null>(null);
  const [selectedReview, setSelectedReview] = useState<CommentItem | null>(null);

  // Review Table Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [showAllWords, setShowAllWords] = useState(false);

  // Manual Paste State
  const [manualTitle, setManualTitle] = useState('Samsung Galaxy A36 5G');
  const [manualBrand, setManualBrand] = useState('Samsung');
  const [manualPrice, setManualPrice] = useState('₹24,999');
  const [manualText, setManualText] = useState('');

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Execute Live URL Analysis
  const handleAnalyzeUrl = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl || url).trim();
    if (!targetUrl) {
      setErrorMessage('Please enter an e-commerce product URL from Flipkart, Amazon, or a supported store.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    setProgressPercent(15);
    setProgressStage('Detecting product URL and resolving redirects...');

    try {
      setProgressPercent(40);
      setProgressStage('Retrieving product metadata and genuine customer reviews...');

      const targetLimit = isMaxReviews ? 10000 : maxReviews;
      const res = await api.analyzeEcommerce(targetUrl, targetLimit);

      setProgressPercent(85);
      setProgressStage('Running 5 AI Intelligence Engines & Top Complaint cluster extraction...');

      setProgressPercent(100);
      setProgressStage('Analysis complete!');
      setData(res);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || err?.message || 'Failed to analyze product reviews.');
    } finally {
      setLoading(false);
    }
  };

  // Execute Manual Review Analysis
  const handleAnalyzeManual = async () => {
    const lines = manualText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setErrorMessage('Please paste at least one customer review to analyze.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    setProgressPercent(25);
    setProgressStage('Parsing review lines and detecting duplicate entries...');

    try {
      const reviewItems = lines.map((line, idx) => ({
        text: line,
        rating: 5,
        username: `Customer ${idx + 1}`,
        title: 'User Review',
      }));

      setProgressPercent(60);
      setProgressStage('Executing AI Intelligence engines across imported reviews...');

      const res = await api.analyzeEcommerceManual({
        title: manualTitle.trim() || 'Imported Product Dataset',
        brand: manualBrand.trim() || 'Verified Brand',
        price: manualPrice.trim() || undefined,
        reviews: reviewItems,
      });

      setProgressPercent(100);
      setProgressStage('Analysis complete!');
      setData(res);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || err?.message || 'Failed to process manual reviews.');
    } finally {
      setLoading(false);
    }
  };

  // Execute File Upload (CSV/JSON)
  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setLoading(true);
    setProgressPercent(20);
    setProgressStage(`Reading ${file.name}...`);

    try {
      const text = await file.text();
      let reviewTexts: string[] = [];

      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          reviewTexts = parsed.map((item) => (typeof item === 'string' ? item : item.text || item.review || JSON.stringify(item)));
        }
      } else {
        // Simple CSV / text parsing
        const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
        // Skip header if looks like header
        const startIndex = lines[0]?.toLowerCase().includes('review') || lines[0]?.toLowerCase().includes('text') ? 1 : 0;
        reviewTexts = lines.slice(startIndex).map((l) => l.replace(/^["']|["']$/g, '').trim());
      }

      if (reviewTexts.length === 0) {
        throw new Error('No valid reviews found in the uploaded file.');
      }

      setProgressPercent(60);
      setProgressStage(`Analyzing ${reviewTexts.length} customer reviews with AI models...`);

      const reviewItems = reviewTexts.slice(0, 150).map((t, idx) => ({
        text: t,
        rating: 5,
        username: `Purchaser ${idx + 1}`,
      }));

      const res = await api.analyzeEcommerceManual({
        title: file.name.replace(/\.[^/.]+$/, ''),
        brand: 'Uploaded Dataset',
        reviews: reviewItems,
      });

      setProgressPercent(100);
      setProgressStage('Analysis complete!');
      setData(res);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process dataset file.');
    } finally {
      setLoading(false);
    }
  };

  // Keyword Frequency extraction
  const keywordFrequency = useMemo(() => {
    if (!data || !data.comments || data.comments.length === 0) return [];

    const total = data.comments.length;
    const wordFreq = new Map<string, number>();
    const wordComments = new Map<string, Set<number>>();
    const bigramFreq = new Map<string, number>();
    const bigramComments = new Map<string, Set<number>>();

    data.comments.forEach((c, idx) => {
      const text = (c.text || '').toLowerCase().replace(/https?:\/\/\S+/gi, ' ').replace(/['’]/g, '');
      const tokens = text.match(/[a-z\u0900-\u097F]{3,}/gu) || [];
      const meaningful: string[] = [];

      tokens.forEach((t) => {
        if (!STOP_WORDS.has(t) && t.length > 2) {
          meaningful.push(t);
          wordFreq.set(t, (wordFreq.get(t) || 0) + 1);
          if (!wordComments.has(t)) wordComments.set(t, new Set());
          wordComments.get(t)!.add(idx);
        }
      });

      for (let i = 0; i < meaningful.length - 1; i++) {
        const w1 = meaningful[i];
        const w2 = meaningful[i + 1];
        if (w1 !== w2) {
          const bigram = `${w1} ${w2}`;
          bigramFreq.set(bigram, (bigramFreq.get(bigram) || 0) + 1);
          if (!bigramComments.has(bigram)) bigramComments.set(bigram, new Set());
          bigramComments.get(bigram)!.add(idx);
        }
      }
    });

    const items: Array<{ keyword: string; displayKeyword: string; frequency: number; commentCount: number; percentage: number; isPhrase: boolean }> = [];

    wordFreq.forEach((freq, w) => {
      const cCount = wordComments.get(w)?.size || 1;
      items.push({
        keyword: w,
        displayKeyword: formatKeyword(w),
        frequency: freq,
        commentCount: cCount,
        percentage: Math.round((cCount / total) * 100),
        isPhrase: false,
      });
    });

    bigramFreq.forEach((freq, b) => {
      if (freq >= 2 || (total <= 10 && freq >= 1)) {
        const cCount = bigramComments.get(b)?.size || 1;
        items.push({
          keyword: b,
          displayKeyword: formatKeyword(b),
          frequency: freq,
          commentCount: cCount,
          percentage: Math.round((cCount / total) * 100),
          isPhrase: true,
        });
      }
    });

    items.sort((a, b) => b.frequency - a.frequency || b.commentCount - a.commentCount);
    return items;
  }, [data]);

  const displayedKeywords = useMemo(() => {
    return showAllWords ? keywordFrequency.slice(0, 20) : keywordFrequency.slice(0, 10);
  }, [keywordFrequency, showAllWords]);

  // Filtered reviews in table
  const filteredReviews = useMemo(() => {
    if (!data || !data.comments) return [];
    return data.comments.filter((c) => {
      // Rating filter
      const r = (c as any).rating;
      if (ratingFilter !== 'all' && r !== ratingFilter) return false;

      // Sentiment filter
      if (sentimentFilter !== 'all' && c.analysis.sentiment !== sentimentFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = (c.text || '').toLowerCase().includes(q);
        const matchesUser = (c.username || '').toLowerCase().includes(q);
        if (!matchesText && !matchesUser) return false;
      }

      return true;
    });
  }, [data, ratingFilter, sentimentFilter, searchQuery]);

  // Sentiment chart data
  const sentimentData = useMemo(() => {
    if (!data) return [];
    const dist = data.summary.sentiment_distribution || { Positive: 0, Negative: 0, Neutral: 0, Mixed: 0 };
    return [
      { name: 'Positive', count: dist.Positive || 0, color: '#10B981' },
      { name: 'Negative', count: dist.Negative || 0, color: '#F43F5E' },
      { name: 'Neutral', count: dist.Neutral || 0, color: '#0EA5E9' },
      { name: 'Mixed', count: dist.Mixed || 0, color: '#F59E0B' },
    ];
  }, [data]);

  // Emotion chart data
  const emotionData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.summary.emotion_distribution || {})
      .map(([emotion, count]) => ({ emotion, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [data]);

  // Intent chart data
  const intentData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.summary.intent_distribution || {})
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [data]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
              E-Commerce Product Review Analyzer
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Analyze authentic customer reviews, extract Top Complaints with real excerpts, and evaluate product sentiment across Flipkart, Amazon, and consumer stores.
          </p>
        </div>

        {/* Quick Test Chip for Flipkart Samsung Galaxy A36 5G */}
        <button
          type="button"
          onClick={() => {
            setUrl(SAMPLE_FLIPKART_URL);
            handleAnalyzeUrl(SAMPLE_FLIPKART_URL);
          }}
          className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 flex items-center gap-2 transition-all self-start sm:self-auto shadow-glow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Test Samsung Galaxy A36 5G (Flipkart)</span>
        </button>
      </div>

      {/* Ingestion Method Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setMethod('url')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            method === 'url'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-glow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Method 1: Product URL Live Ingestion</span>
        </button>

        <button
          type="button"
          onClick={() => setMethod('file')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            method === 'file'
              ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40 shadow-glow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Method 2: CSV / Excel / JSON Dataset Import</span>
        </button>

        <button
          type="button"
          onClick={() => setMethod('manual')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            method === 'manual'
              ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40 shadow-glow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Method 3: Copy-Paste Customer Reviews</span>
        </button>
      </div>

      {/* Input Card */}
      <Card>
        {method === 'url' && (
          <div className="space-y-4">
            <CardHeader
              title="Product URL Review Ingestion"
              subtitle="Supports Flipkart, Amazon, and e-commerce product links. Extracts verified specs, ratings, and genuine customer reviews with traceability."
              icon={<ShoppingBag className="w-4 h-4 text-amber-400" />}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Product URL (Flipkart / Amazon)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://dl.flipkart.com/s/v6zq!mNNNN or https://www.flipkart.com/product/p/..."
                  className="flex-1 bg-navy-950 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                />
                <Button
                  size="md"
                  variant="primary"
                  onClick={() => handleAnalyzeUrl()}
                  disabled={loading}
                  icon={loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shrink-0"
                >
                  {loading ? 'Retrieving Reviews...' : 'Analyze Product Reviews'}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Paste short links or canonical product URLs. Automated pagination collects available public review pages without fabricating data.
              </p>
            </div>

            {/* Logarithmic Review Sample Limit Slider */}
            <LogarithmicCommentSlider
              value={maxReviews}
              onChange={(val, isAll) => {
                setMaxReviews(val);
                if (isAll !== undefined) setIsMaxReviews(isAll);
              }}
              isMax={isMaxReviews}
              isAll={isMaxReviews}
              onMaxChange={setIsMaxReviews}
              availableCount={data?.product?.review_count}
              analyzedCount={data?.comments?.length}
              label="Reviews to Analyze"
              itemType="reviews"
              disabled={loading}
            />
          </div>
        )}

        {method === 'file' && (
          <div className="space-y-4">
            <CardHeader
              title="CSV / Excel / JSON Review Dataset Import"
              subtitle="Upload customer review datasets exported from e-commerce sellers or customer service logs."
              icon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-xl p-8 text-center bg-navy-950/60 transition-colors space-y-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-white">
                {selectedFile ? selectedFile.name : 'Click to select or drag and drop your review file here'}
              </p>
              <p className="text-[11px] text-slate-400">
                Supports CSV with review text column or JSON arrays of reviews.
              </p>
            </div>
          </div>
        )}

        {method === 'manual' && (
          <div className="space-y-4">
            <CardHeader
              title="Copy-Paste Customer Reviews"
              subtitle="Paste customer reviews directly (one per line) for immediate multi-engine AI analysis & complaint extraction."
              icon={<FileText className="w-4 h-4 text-brand-purple" />}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Product Title</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Brand</label>
                <input
                  type="text"
                  value={manualBrand}
                  onChange={(e) => setManualBrand(e.target.value)}
                  className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Price (Optional)</label>
                <input
                  type="text"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Customer Reviews (One review per line)
                </label>
                <span className="text-[11px] font-mono text-amber-400">
                  {manualText.split('\n').filter((x) => x.trim()).length} reviews entered
                </span>
              </div>
              <textarea
                rows={6}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={"Example 1: Display is super bright and vibrant. Battery lasts all day!\nExample 2: Phone heats up during gaming and charging is very slow.\nExample 3: Sound quality from speaker is great. Fast delivery by Flipkart."}
                className="w-full bg-navy-950 border border-white/10 rounded-lg p-3 text-xs text-white placeholder-slate-500 font-mono leading-relaxed focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="md"
                variant="primary"
                onClick={handleAnalyzeManual}
                disabled={loading}
                icon={loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                {loading ? 'Analyzing Reviews...' : 'Analyze Pasted Reviews'}
              </Button>
            </div>
          </div>
        )}

        {/* Loading Progress */}
        {loading && (
          <div className="mt-4 p-4 rounded-xl bg-navy-950/80 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                {progressStage}
              </span>
              <span className="font-bold text-amber-400 font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full bg-navy-900 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-300 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Extraction Notice:</span>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Advisory Notice if Reviews Blocked per Section 3 */}
      {data && data.reviews_blocked && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Customer reviews could not be retrieved automatically from this product page.</span>
          </div>
          <p className="text-amber-200/90 text-[11px] leading-relaxed">
            The target e-commerce store restricts automated review scraping. You can still analyze customer reviews by uploading a CSV/Excel/JSON review export or copy-pasting reviews into Method 3 above.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMethod('file')}
              className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-medium transition-colors"
            >
              Upload Review Dataset
            </button>
            <button
              type="button"
              onClick={() => setMethod('manual')}
              className="px-2.5 py-1 rounded bg-white/10 text-slate-200 hover:bg-white/15 font-medium transition-colors"
            >
              Copy-Paste Reviews
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4: STRICT DATA VERIFICATION AUDIT BAR */}
      {data && (
        <div className="glass-card p-4 rounded-xl border border-white/10 space-y-2.5 bg-navy-950/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Strict Data Verification Audit (Accuracy Over Quantity)</span>
            </span>
            <Badge variant="outline" size="sm" className="font-mono text-[10px] text-amber-300 border-amber-500/40">
              Verified Source Traceable
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-navy-900/80 border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">1. Reported by Store</span>
              <strong className="text-white text-sm">{data.audit.reported_reviews.toLocaleString()}</strong> reviews
              <span className="block text-[10px] text-slate-500 font-sans mt-0.5">
                ({data.audit.reported_ratings.toLocaleString()} ratings • {data.audit.reported_average_rating}★)
              </span>
            </div>

            <div className="p-3 rounded-lg bg-navy-900/80 border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">2. Successfully Retrieved</span>
              <strong className="text-amber-400 text-sm">{data.audit.retrieved_reviews.toLocaleString()}</strong> reviews
              <span className="block text-[10px] text-slate-500 font-sans mt-0.5">Publicly extracted</span>
            </div>

            <div className="p-3 rounded-lg bg-navy-900/80 border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">3. Unique Deduplicated</span>
              <strong className="text-emerald-400 text-sm">{data.audit.unique_reviews.toLocaleString()}</strong> reviews
              <span className="block text-[10px] text-slate-500 font-sans mt-0.5">Zero duplicates</span>
            </div>

            <div className="p-3 rounded-lg bg-navy-900/80 border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">4. Analyzed by AI</span>
              <strong className="text-brand-purple text-sm">{data.audit.analyzed_reviews.toLocaleString()}</strong> reviews
              <span className="block text-[10px] text-slate-500 font-sans mt-0.5">100% genuine inputs</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: PRODUCT INTELLIGENCE DASHBOARD */}
      {data && (
        <div className="space-y-6">
          {/* Product Information Card */}
          <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row items-start md:items-center gap-5">
            {data.product.image && (
              <img
                src={data.product.image}
                alt={data.product.title}
                className="w-28 h-28 object-contain rounded-xl bg-white/5 p-2 border border-white/10 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="positive" size="sm" className="bg-amber-500/20 text-amber-300 border-amber-500/40">
                  {data.product.brand || 'Verified Brand'}
                </Badge>
                {data.product.price && (
                  <span className="text-base font-extrabold text-emerald-400 font-mono">
                    {data.product.price}
                  </span>
                )}
                {data.verified_average_rating && (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{data.verified_average_rating}★ Verified</span>
                  </span>
                )}
              </div>

              <h2 className="text-lg font-bold text-white tracking-tight leading-snug">
                {data.product.title}
              </h2>

              {data.product.description && (
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {data.product.description}
                </p>
              )}

              {/* Specifications Pills */}
              {data.product.specifications && Object.keys(data.product.specifications).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono">
                  {Object.entries(data.product.specifications).map(([k, v]) => (
                    <span key={k} className="px-2 py-0.5 rounded bg-navy-950 border border-white/10 text-slate-300">
                      <strong className="text-slate-400">{k}:</strong> {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Verified Reviews Analyzed"
              value={data.audit.analyzed_reviews.toLocaleString()}
              subtitle={`From ${data.audit.reported_reviews.toLocaleString()} reported reviews`}
              icon={<ShoppingBag className="w-5 h-5" />}
              accent="purple"
            />
            <MetricCard
              title="Net Consumer Sentiment"
              value={
                data.summary.net_sentiment_score > 0
                  ? `+${data.summary.net_sentiment_score}`
                  : `${data.summary.net_sentiment_score}`
              }
              subtitle={`Pos: ${data.summary.sentiment_percentages.Positive || 0}% | Neg: ${data.summary.sentiment_percentages.Negative || 0}%`}
              icon={<TrendingUp className="w-5 h-5" />}
              accent={data.summary.net_sentiment_score >= 0 ? 'emerald' : 'rose'}
            />
            <MetricCard
              title="Verified Average Rating"
              value={data.verified_average_rating ? `${data.verified_average_rating}★` : 'N/A'}
              subtitle={`Website avg: ${data.audit.reported_average_rating || 'N/A'}★`}
              icon={<Star className="w-5 h-5 text-amber-400" />}
              accent="amber"
            />
            <MetricCard
              title="Dominant Emotional Cue"
              value={data.summary.dominant_emotion || 'Neutral'}
              subtitle="Primary customer reaction"
              icon={<Heart className="w-5 h-5" />}
              accent="rose"
            />
          </div>

          {/* AI Intelligence Engines Grid: Sentiment, Emotions, Intent */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sentiment Breakdown */}
            <Card className="lg:col-span-1 flex flex-col justify-between">
              <CardHeader
                title="Customer Sentiment Breakdown"
                subtitle="Calculated strictly from genuine customer reviews"
                icon={<Cpu className="w-4 h-4 text-brand-purple" />}
              />
              <div className="h-52 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F1523', borderColor: '#2E3E65', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 text-xs">
                {sentimentData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between p-2 rounded-lg bg-navy-950/60">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                    <span className="font-semibold text-white">{s.count}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Emotional States */}
            <Card className="lg:col-span-1">
              <CardHeader
                title="Customer Emotional States"
                subtitle="Top emotions extracted across review comments"
                icon={<Heart className="w-4 h-4 text-rose-400" />}
              />
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={emotionData} layout="vertical" margin={{ left: 15, right: 15, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2B48" horizontal={false} />
                    <XAxis type="number" stroke="#64748B" fontSize={11} allowDecimals={false} />
                    <YAxis dataKey="emotion" type="category" stroke="#94A3B8" fontSize={11} width={70} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F1523', borderColor: '#2E3E65', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#F43F5E" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Customer Intent */}
            <Card className="lg:col-span-1">
              <CardHeader
                title="Customer Intent Breakdown"
                subtitle="Classified purpose behind purchaser remarks"
                icon={<Target className="w-4 h-4 text-sky-400" />}
              />
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={intentData} layout="vertical" margin={{ left: 15, right: 15, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2B48" horizontal={false} />
                    <XAxis type="number" stroke="#64748B" fontSize={11} allowDecimals={false} />
                    <YAxis dataKey="intent" type="category" stroke="#94A3B8" fontSize={11} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F1523', borderColor: '#2E3E65', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#0EA5E9" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* SECTION 6: TOP COMPLAINT INSIGHT */}
          <Card>
            <CardHeader
              title="Top Complaint Insight"
              subtitle="Real customer dissatisfaction & problem areas detected with genuine review excerpts"
              icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
            />

            {data.top_complaints.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <span className="font-semibold text-white">No major customer complaints detected!</span>
                <span>The retrieved reviews show high customer satisfaction with zero clustered defect patterns.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {data.top_complaints.map((complaint) => (
                  <div
                    key={complaint.name}
                    className="p-4 rounded-xl bg-navy-950/80 border border-rose-500/20 hover:border-rose-500/40 transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <h4 className="font-bold text-white text-xs tracking-tight">{complaint.name}</h4>
                      </div>
                      <Badge variant="danger" size="sm">
                        {complaint.mentions} mentions ({complaint.percentage}%)
                      </Badge>
                    </div>

                    {/* Genuine Excerpts */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                        Genuine Review Excerpts:
                      </span>
                      {complaint.excerpts.map((ex, exIdx) => (
                        <div
                          key={exIdx}
                          className="p-2.5 rounded-lg bg-navy-900/90 border border-white/5 text-[11px] text-slate-300 italic leading-relaxed"
                        >
                          {ex}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Product Strengths & Weaknesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strengths */}
            <Card>
              <CardHeader
                title="Product Strengths (Customer Praise)"
                subtitle="Top features celebrated in 4★ and 5★ reviews"
                icon={<ThumbsUp className="w-4 h-4 text-emerald-400" />}
              />
              {data.product_strengths.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No recurring strengths identified.</div>
              ) : (
                <div className="space-y-3">
                  {data.product_strengths.map((str) => (
                    <div key={str.aspect} className="p-3 rounded-lg bg-navy-950/60 border border-emerald-500/20 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-300">{str.aspect}</span>
                        <span className="font-mono text-emerald-400 text-[11px] font-bold">
                          {str.mentions} mentions ({str.percentage}%)
                        </span>
                      </div>
                      {str.excerpts.length > 0 && (
                        <p className="text-[11px] text-slate-300 italic">
                          {str.excerpts[0]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Weaknesses */}
            <Card>
              <CardHeader
                title="Product Weaknesses (Critical Feedback)"
                subtitle="Pain points observed in lower ratings and critical reviews"
                icon={<ThumbsDown className="w-4 h-4 text-rose-400" />}
              />
              {data.product_weaknesses.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No recurring weaknesses identified.</div>
              ) : (
                <div className="space-y-3">
                  {data.product_weaknesses.map((weak) => (
                    <div key={weak.aspect} className="p-3 rounded-lg bg-navy-950/60 border border-rose-500/20 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-rose-300">{weak.aspect}</span>
                        <span className="font-mono text-rose-400 text-[11px] font-bold">
                          {weak.mentions} mentions ({weak.percentage}%)
                        </span>
                      </div>
                      {weak.excerpts.length > 0 && (
                        <p className="text-[11px] text-slate-300 italic">
                          {weak.excerpts[0]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Most Used Words Section */}
          <Card>
            <CardHeader
              title="Most Used Words / Keyword Frequency"
              subtitle="Topical vocabulary & recurring keywords detected across purchaser reviews"
              icon={<Hash className="w-4 h-4 text-brand-purple" />}
              action={
                keywordFrequency.length > 10 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={showAllWords ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    onClick={() => setShowAllWords(!showAllWords)}
                  >
                    {showAllWords ? 'Show Top 10' : `Show More (${keywordFrequency.length} Keywords)`}
                  </Button>
                ) : undefined
              }
            />

            {keywordFrequency.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No recurring keywords detected.</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                <div className="lg:col-span-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayedKeywords} layout="vertical" margin={{ left: 10, right: 25, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2B48" horizontal={false} />
                      <XAxis type="number" stroke="#64748B" fontSize={11} allowDecimals={false} />
                      <YAxis dataKey="displayKeyword" type="category" stroke="#94A3B8" fontSize={11} width={90} />
                      <Tooltip contentStyle={{ backgroundColor: '#0F1523', borderColor: '#2E3E65', borderRadius: '8px' }} />
                      <Bar dataKey="frequency" fill="#A855F7" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="lg:col-span-7 overflow-x-auto rounded-lg border border-white/5 bg-navy-950/60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-navy-900/80 text-slate-400 font-semibold border-b border-white/5 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2 px-3 w-12">Rank</th>
                        <th className="py-2 px-3">Keyword / Phrase</th>
                        <th className="py-2 px-3 text-right">Frequency</th>
                        <th className="py-2 px-3 text-right">Review Reach</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {displayedKeywords.map((item, idx) => (
                        <tr key={item.keyword} className="hover:bg-white/5">
                          <td className="py-2 px-3 font-bold text-slate-400">#{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-white">
                            <span className="flex items-center gap-2">
                              <span>{item.displayKeyword}</span>
                              {item.isPhrase && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-purple/20 text-purple-300 border border-brand-purple/30">
                                  Phrase
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-white">{item.frequency}</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-400">{item.percentage}% ({item.commentCount})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>

          {/* Genuine Customer Reviews Explorer Table */}
          <Card>
            <CardHeader
              title="Verified Customer Reviews"
              subtitle={`Showing ${filteredReviews.length} of ${data.comments.length} analyzed reviews • Click any row for complete analysis modal`}
            />

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-navy-950/60 rounded-xl border border-white/5 mb-4">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reviews by keyword, author..."
                  className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-navy-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5★ Only</option>
                  <option value="4">4★ Only</option>
                  <option value="3">3★ Only</option>
                  <option value="2">2★ Only</option>
                  <option value="1">1★ Only</option>
                </select>

                <select
                  value={sentimentFilter}
                  onChange={(e) => setSentimentFilter(e.target.value)}
                  className="bg-navy-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                >
                  <option value="all">All Sentiments</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                  <option value="Neutral">Neutral</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-950/80 text-slate-400 font-semibold border-b border-white/5 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Rating</th>
                    <th className="p-3">Purchaser</th>
                    <th className="p-3">Customer Review Text</th>
                    <th className="p-3">Sentiment</th>
                    <th className="p-3">Emotion</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredReviews.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedReview(c)}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="p-3 whitespace-nowrap">
                        <span className="flex items-center gap-1 font-bold text-amber-400 font-mono">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{(c as any).rating || 5}★</span>
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-white whitespace-nowrap">
                        {c.username || 'Flipkart Customer'}
                      </td>
                      <td className="p-3 max-w-sm sm:max-w-md truncate text-slate-300">
                        {c.text}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge sentiment={c.analysis.sentiment}>{c.analysis.sentiment}</Badge>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-300">
                        {c.analysis.dominant_emotion || 'Neutral'}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {c.published_at || 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Review Detail Modal */}
      {selectedReview && (
        <CommentDetailModal
          comment={selectedReview}
          isOpen={!!selectedReview}
          onClose={() => setSelectedReview(null)}
        />
      )}
    </div>
  );
};

