import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import { api } from '../api/client';
import { historyService } from '../services/historyService';
import { FilePreviewResponse } from '../api/types';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { DownloadReportButton } from '../components/ui/DownloadReportButton';
import { AnalysisDashboardView } from '../components/analysis/AnalysisDashboardView';
import { LogarithmicCommentSlider } from '../components/common/LogarithmicCommentSlider';
import {
  Instagram,
  Upload,
  FileSpreadsheet,
  FileText,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Heart,
  Target,
  ShieldAlert,
  MessageSquare,
  ThumbsUp,
  Hash,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  X,
  Search,
  ExternalLink,
} from 'lucide-react';

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't",
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', "can't", 'cannot', 'could', "couldn't", 'did', "didn't", 'do', 'does', "doesn't", 'doing',
  "don't", 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', "hadn't", 'has', "hasn't",
  'have', "haven't", 'having', 'he', "he'd", "he'll", "he's", 'her', 'here', "here's", 'hers', 'herself',
  'him', 'himself', 'his', 'how', "how's", 'i', "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is',
  'just', 'like', 'also', 'get', 'got', 'really', 'one', 'even', 'will', 'well', 'much', 'many',
  'make', 'see', 'look', 'now', 'know', 'think', 'please', 'pls', 'thank', 'thanks', 'bro', 'sir',
  'im', 'thats', 'dont', 'cant', 'wont', 'gonna', 'wanna', 'hey', 'hi', 'hello', 'ok', 'okay',
  'yeah', 'yes', 'nah', 'ur', 'u', 'r', 'post', 'reel', 'reels', 'insta', 'instagram'
]);

export const InstagramAnalyzerPage: React.FC = () => {
  const { result, setResult, setSelectedComment } = useAnalysis();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Three Ingestion Methods: 'official' (Method 1), 'automatic' (Method 2), 'file' (Method 3)
  const [method, setMethod] = useState<'automatic' | 'official' | 'file'>('automatic');
  const [url, setUrl] = useState('');
  const [maxComments, setMaxComments] = useState(250);
  const [isMaxComments, setIsMaxComments] = useState(false);
  const [canSwitchToCsv, setCanSwitchToCsv] = useState(false);

  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreviewResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<{
    text: string;
    username: string;
    timestamp: string;
    likes: string;
    comment_id: string;
    parent_id: string;
  }>({
    text: '',
    username: '',
    timestamp: '',
    likes: '',
    comment_id: '',
    parent_id: '',
  });
  const [datasetTitle, setDatasetTitle] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Execution states
  const [loading, setLoading] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<
    'idle' | 'extracting' | 'analyzing' | 'complete' | 'partial' | 'blocked' | 'failed'
  >('idle');
  const [progressStage, setProgressStage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInstagramQuotaExhausted, setIsInstagramQuotaExhausted] = useState(false);

  // Result table states
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [showAllWords, setShowAllWords] = useState(false);

  // Check quota status on mount
  useEffect(() => {
    api.getIntegrationsStatus()
      .then((status) => {
        if (
          status?.instagram?.status === 'quota_exhausted' ||
          status?.instagram?.quota_status === 'exhausted' ||
          status?.rapidapi?.status === 'quota_exhausted'
        ) {
          setIsInstagramQuotaExhausted(true);
        }
      })
      .catch(() => {});
  }, []);

  const validateInstagramUrl = (input: string) => {
    return /(?:instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+))|([A-Za-z0-9_-]{5,30})/.test(
      input.trim()
    );
  };

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setPreviewLoading(true);

    try {
      const preview = await api.previewFile(file);
      setFilePreview(preview);
      setColumnMapping({
        text: preview.suggested_mapping.text || preview.columns[0] || '',
        username: preview.suggested_mapping.username || '',
        timestamp: preview.suggested_mapping.timestamp || '',
        likes: preview.suggested_mapping.likes || '',
        comment_id: preview.suggested_mapping.comment_id || '',
        parent_id: preview.suggested_mapping.parent_id || '',
      });
      if (!datasetTitle) {
        setDatasetTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || err.message || 'Could not parse uploaded file. Please provide a valid CSV or Excel file.'
      );
      setSelectedFile(null);
      setFilePreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Helper to switch directly to CSV method and trigger file picker
  const handleSwitchToMethod3 = () => {
    setErrorMessage(null);
    setCanSwitchToCsv(false);
    setMethod('file');
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 150);
  };

  const handleAnalyze = async () => {
    // Clear any previous stale results immediately so an error never shows with a stale card
    setResult(null);
    setErrorMessage(null);
    setCanSwitchToCsv(false);
    setLoading(true);
    setAnalysisStatus('extracting');
    setProgressPercent(15);
    setProgressStage('Initializing Instagram analysis pipeline...');

    try {
      if (method === 'automatic') {
        // METHOD 2: Automatic Analysis (Without API)
        if (!validateInstagramUrl(url)) {
          throw new Error('Please enter a valid Instagram post or reel link (e.g. https://www.instagram.com/reel/CODE/).');
        }

        setProgressPercent(30);
        setProgressStage('Validating public Instagram link & connecting to webpage...');

        setProgressPercent(50);
        setProgressStage('Extracting publicly accessible comment threads...');

        const targetComments = isMaxComments ? 50000 : maxComments;
        const requestMode = isMaxComments ? 'all' : 'limit';
        const data = await api.analyzeInstagram(url.trim(), targetComments, 'automatic_without_api', requestMode);

        setAnalysisStatus('analyzing');
        setProgressPercent(75);
        setProgressStage(`Collected ${data.comments?.length || 0} comments. Normalizing data...`);

        setProgressPercent(90);
        setProgressStage('Executing 5 AI Intelligence Engines across comments...');

        setResult(data);
        setAnalysisStatus(data.status === 'partial' ? 'partial' : 'complete');

        // Save successfully to History
        await historyService.saveHistoryItem({
          category: 'instagram',
          platform: 'instagram',
          url: url.trim(),
          title: data.video?.title || 'Instagram Post / Reel (Automatic)',
          inputType: 'url',
          result: data,
          summary: {
            totalComments: data.summary?.total_comments || data.comments?.length || 0,
            netSentiment: data.summary?.net_sentiment_score,
            dominantSentiment: Object.entries(data.summary?.sentiment_distribution || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Positive',
            dominantEmotion: data.summary?.dominant_emotion || 'Joy',
            flaggedCount: data.summary?.moderation_summary?.flagged_count || 0,
          },
        });

        setProgressPercent(100);
        setProgressStage('Automatic analysis complete!');
      } else if (method === 'official') {
        // METHOD 1: Official Instagram API
        if (!validateInstagramUrl(url)) {
          throw new Error('Please enter a valid Instagram post or reel link (e.g. https://www.instagram.com/p/CODE/).');
        }

        setProgressPercent(35);
        setProgressStage('Connecting to Official Meta Graph API / Provider...');

        const targetComments = isMaxComments ? 50000 : maxComments;
        const requestMode = isMaxComments ? 'all' : 'limit';
        const data = await api.analyzeInstagram(url.trim(), targetComments, 'official_api', requestMode);

        setAnalysisStatus('analyzing');
        setProgressPercent(85);
        setProgressStage('Running 5 AI Intelligence Engines across comments...');

        setResult(data);
        setAnalysisStatus(data.status === 'partial' ? 'partial' : 'complete');

        // Save successfully to History
        await historyService.saveHistoryItem({
          category: 'instagram',
          platform: 'instagram',
          url: url.trim(),
          title: data.video?.title || 'Instagram Official API Analysis',
          inputType: 'url',
          result: data,
          summary: {
            totalComments: data.summary?.total_comments || data.comments?.length || 0,
            netSentiment: data.summary?.net_sentiment_score,
            dominantSentiment: Object.entries(data.summary?.sentiment_distribution || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Positive',
            dominantEmotion: data.summary?.dominant_emotion || 'Joy',
            flaggedCount: data.summary?.moderation_summary?.flagged_count || 0,
          },
        });

        setProgressPercent(100);
        setProgressStage('Official API analysis complete!');
      } else {
        // METHOD 3: CSV / File Upload
        if (!selectedFile) {
          throw new Error('Please select an Instagram CSV or Excel file to import.');
        }
        if (!columnMapping.text) {
          throw new Error('Please select which column contains the comment text.');
        }

        setProgressPercent(35);
        setProgressStage(`Reading ${selectedFile.name}...`);

        const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');

        const data = await api.processFileImport(
          selectedFile,
          'instagram',
          columnMapping,
          datasetTitle.trim() || undefined
        );

        setAnalysisStatus('analyzing');
        setProgressPercent(85);
        setProgressStage('Running AI NLP models across comments...');

        setResult(data);
        setAnalysisStatus(data.status === 'partial' ? 'partial' : 'complete');

        // Save successfully to History
        await historyService.saveHistoryItem({
          category: 'instagram',
          platform: 'instagram',
          title: datasetTitle.trim() || selectedFile.name,
          inputType: isExcel ? 'excel' : 'csv',
          result: data,
          summary: {
            totalComments: data.summary?.total_comments || data.comments?.length || 0,
            netSentiment: data.summary?.net_sentiment_score,
            dominantSentiment: Object.entries(data.summary?.sentiment_distribution || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Positive',
            dominantEmotion: data.summary?.dominant_emotion || 'Joy',
            flaggedCount: data.summary?.moderation_summary?.flagged_count || 0,
          },
        });

        setProgressPercent(100);
        setProgressStage('Import and analysis complete!');
      }
    } catch (err: any) {
      setResult(null); // CRITICAL: Stale results are discarded on failure
      const resp = err.response?.data;
      const msg = resp?.message || resp?.detail || err.message || 'Instagram analysis request failed.';

      const isBlocked =
        resp?.can_switch_to_csv ||
        resp?.error_code === 'LOGIN_REQUIRED' ||
        resp?.error_code === 'SCRAPING_RESTRICTED' ||
        resp?.error_code === 'COMMENTS_INACCESSIBLE' ||
        err.response?.status === 429 ||
        msg.includes('quota') ||
        msg.includes('rate limit');

      setAnalysisStatus(isBlocked ? 'blocked' : 'failed');

      if (resp?.can_switch_to_csv || resp?.error_code === 'LOGIN_REQUIRED' || resp?.error_code === 'SCRAPING_RESTRICTED' || resp?.error_code === 'COMMENTS_INACCESSIBLE') {
        setCanSwitchToCsv(true);
        setErrorMessage(resp?.details || msg);
      } else if (
        err.response?.status === 429 ||
        msg.includes('quota') ||
        msg.includes('rate limit') ||
        msg.includes('exceeded')
      ) {
        setIsInstagramQuotaExhausted(true);
        setCanSwitchToCsv(true);
        setErrorMessage(
          'Instagram API monthly request quota exhausted. Please upgrade your RapidAPI subscription or switch to Method 2: Automatic Analysis (Without API) or Method 3: Upload CSV / Excel!'
        );
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Keyword Frequency Calculation
  const topKeywords = useMemo(() => {
    if (!result?.comments || result.comments.length === 0) return [];

    const counts = new Map<string, number>();
    const total = result.comments.length;

    for (const c of result.comments) {
      if (!c.text) continue;
      const seen = new Set<string>();
      const words = c.text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

      for (const w of words) {
        if (!seen.has(w)) {
          seen.add(w);
          counts.set(w, (counts.get(w) || 0) + 1);
        }
      }
    }

    return Array.from(counts.entries())
      .map(([word, count]) => ({
        word: word.charAt(0).toUpperCase() + word.slice(1),
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [result]);

  const filteredComments = useMemo(() => {
    if (!result?.comments) return [];
    return result.comments.filter((c) => {
      const matchesSearch =
        searchQuery === '' ||
        c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.username.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSentiment =
        sentimentFilter === 'all' ||
        c.analysis.sentiment.toLowerCase() === sentimentFilter.toLowerCase();

      return matchesSearch && matchesSentiment;
    });
  }, [result, searchQuery, sentimentFilter]);

  const displayedKeywords = showAllWords ? topKeywords.slice(0, 30) : topKeywords.slice(0, 10);
  const isInstagramResult = result?.video?.platform === 'instagram' || result?.comments?.[0]?.platform === 'instagram';

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-dark">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-500 text-xs font-bold tracking-widest uppercase mb-2">
            <Instagram className="w-3.5 h-3.5" />
            <span>Instagram Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Instagram Comment Analyzer
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Discover audience opinions and sentiment from Instagram posts and reels.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
          ← Back to Platforms
        </Button>
      </div>

      {/* Quota Exceeded Notice Banner */}
      {isInstagramQuotaExhausted && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200">
            <p className="font-bold text-amber-100">RapidAPI Monthly Quota Limit Notice</p>
            <p className="mt-0.5">
              Instagram API monthly request quota exhausted. Please upgrade your RapidAPI subscription or wait for the next quota reset. You can still use the <strong>Upload CSV / Excel</strong> tab to analyze Instagram comments with all 5 AI engines!
            </p>
          </div>
        </div>
      )}

      {/* Input Section Container */}
      <Card className="border border-border-dark bg-bg-card shadow-card-depth">
        <div className="flex flex-wrap items-center gap-2 border-b border-border-dark pb-4 mb-6">
          <button
            onClick={() => {
              setMethod('official');
              setErrorMessage(null);
              setCanSwitchToCsv(false);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              method === 'official'
                ? 'bg-accent-yellow text-bg-primary font-bold shadow-glow-sm'
                : 'text-text-muted hover:text-white hover:bg-white/5 border border-border-dark/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Method 1: Official Instagram API</span>
          </button>

          <button
            onClick={() => {
              setMethod('automatic');
              setErrorMessage(null);
              setCanSwitchToCsv(false);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              method === 'automatic'
                ? 'bg-accent-yellow text-bg-primary font-bold shadow-glow-sm'
                : 'text-text-muted hover:text-white hover:bg-white/5 border border-border-dark/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-yellow" />
            <span>Method 2: Automatic Analysis (Without API)</span>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              NEW
            </span>
          </button>

          <button
            onClick={() => {
              setMethod('file');
              setErrorMessage(null);
              setCanSwitchToCsv(false);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              method === 'file'
                ? 'bg-accent-yellow text-bg-primary font-bold shadow-glow-sm'
                : 'text-text-muted hover:text-white hover:bg-white/5 border border-border-dark/60'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Method 3: Upload CSV / Excel</span>
          </button>
        </div>

        {/* Actionable Error State with CSV Fallback */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-3.5 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200">
                  <p className="font-bold text-amber-100 flex items-center gap-2">
                    <span>{canSwitchToCsv ? 'Instagram Platform Restriction Detected' : 'Analysis Request Notice'}</span>
                    {canSwitchToCsv && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Method 3 Ready
                      </span>
                    )}
                  </p>
                  <p className="mt-1 leading-relaxed">{errorMessage}</p>
                </div>
              </div>

              {canSwitchToCsv && (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSwitchToMethod3}
                    icon={<Upload className="w-3.5 h-3.5" />}
                    className="text-xs font-bold shadow-glow-sm bg-accent-yellow text-bg-primary"
                  >
                    Switch to Method 3: Upload CSV / Excel →
                  </Button>
                  <button
                    onClick={() => {
                      setErrorMessage(null);
                      setCanSwitchToCsv(false);
                      setMethod('official');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-white hover:bg-white/5 border border-border-dark/60 transition-colors"
                  >
                    Try Method 1 (Official API)
                  </button>
                </div>
              )}
            </div>

            {canSwitchToCsv && (
              <div className="pt-2 border-t border-amber-500/20 text-[11px] text-amber-300/80 flex items-center gap-2">
                <span className="font-semibold text-amber-200">💡 Why did this happen?</span>
                <span>Meta enforces anti-scraping and login barriers on public links. Exporting comments via a free browser tool and uploading via Method 3 bypasses all restrictions and gives you full 5-engine AI analysis.</span>
              </div>
            )}
          </div>
        )}

        {/* METHOD 2: Automatic Analysis (Without API) [NEW] */}
        {method === 'automatic' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Direct Public Ingestion:</span> Enter any public Instagram Post or Reel URL. Our automatic engine retrieves accessible comments directly without requiring API keys. If Meta blocks anonymous access for a link, SocialPlus AI will transparently detect it and offer a 1-click switch to Method 3 (CSV/Excel Upload).
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Enter Instagram Post / Reel URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/reel/CODE/ or https://www.instagram.com/p/CODE/"
                className="w-full bg-bg-secondary border border-border-dark rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted/60 focus:outline-none focus:border-accent-yellow transition-colors"
              />
              <p className="text-[11px] text-text-muted mt-1.5">
                Supports public feed posts (<span className="text-slate-300 font-mono">/p/CODE/</span>) and Reels (<span className="text-slate-300 font-mono">/reel/CODE/</span>).
              </p>
            </div>

            {/* Logarithmic Comment Limit Slider */}
            <LogarithmicCommentSlider
              value={maxComments}
              onChange={(val, isAll) => {
                setMaxComments(val);
                if (isAll !== undefined) setIsMaxComments(isAll);
              }}
              isMax={isMaxComments}
              isAll={isMaxComments}
              onMaxChange={setIsMaxComments}
              reportedCount={result?.reported_count ?? result?.video?.comment_count}
              availableCount={result?.available_count ?? result?.video?.comment_count}
              extractedCount={result?.extracted_count ?? result?.comments?.length}
              analyzedCount={result?.analyzed_count ?? result?.comments?.length}
              label="Comments to Analyze"
              itemType="comments"
              disabled={loading}
            />

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="md"
                loading={loading}
                icon={<Sparkles className="w-4 h-4" />}
                onClick={handleAnalyze}
                disabled={!url.trim()}
              >
                Analyze Public Instagram (Without API) →
              </Button>
            </div>
          </div>
        )}

        {/* METHOD 1: Official Instagram API */}
        {method === 'official' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Meta Developer App Integration:</span> Ingests comments via the official Meta Graph API or configured RapidAPI adapter. Requires authorized account connection and <code className="text-white bg-black/40 px-1 py-0.5 rounded">META_ACCESS_TOKEN</code> configured in <code className="text-white bg-black/40 px-1 py-0.5 rounded">backend/.env</code>.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Instagram Media ID or Authorized Post URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter Instagram Media ID or Post link (e.g. 179823482390482 or https://www.instagram.com/p/CODE/)"
                className="w-full bg-bg-secondary border border-border-dark rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted/60 focus:outline-none focus:border-accent-yellow transition-colors"
              />
            </div>

            {/* Logarithmic Comment Limit Slider */}
            <LogarithmicCommentSlider
              value={maxComments}
              onChange={(val, isAll) => {
                setMaxComments(val);
                if (isAll !== undefined) setIsMaxComments(isAll);
              }}
              isMax={isMaxComments}
              isAll={isMaxComments}
              onMaxChange={setIsMaxComments}
              reportedCount={result?.reported_count ?? result?.video?.comment_count}
              availableCount={result?.available_count ?? result?.video?.comment_count}
              extractedCount={result?.extracted_count ?? result?.comments?.length}
              analyzedCount={result?.analyzed_count ?? result?.comments?.length}
              label="Comments to Analyze"
              itemType="comments"
              disabled={loading}
            />

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="md"
                loading={loading}
                icon={<Sparkles className="w-4 h-4" />}
                onClick={handleAnalyze}
                disabled={!url.trim()}
              >
                Analyze via Official API →
              </Button>
            </div>
          </div>
        )}

        {/* METHOD 3: Upload CSV / Excel */}
        {method === 'file' && (
          <div className="space-y-5">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls,.json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />

            {!selectedFile ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border-dark hover:border-accent-yellow/60 rounded-2xl p-8 text-center cursor-pointer transition-all bg-bg-secondary/40 hover:bg-bg-secondary"
              >
                <Upload className="w-10 h-10 text-accent-yellow mx-auto mb-3" />
                <h4 className="text-sm font-bold text-white mb-1">
                  Drag and drop Instagram comments file here
                </h4>
                <p className="text-xs text-text-muted mb-4">
                  Supports CSV (.csv) and Excel (.xlsx, .xls) comment exports
                </p>
                <Button variant="outline" size="sm" type="button">
                  Browse File
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-bg-secondary border border-border-dark space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/30">
                      {selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <FileSpreadsheet className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{selectedFile.name}</p>
                      <p className="text-xs text-text-muted">
                        {(selectedFile.size / 1024).toFixed(1)} KB • {filePreview?.total_rows || 0} rows detected
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Column Mapping Selector */}
                {filePreview && (
                  <div className="pt-3 border-t border-border-dark space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1">
                          Comment Text Column <span className="text-accent-yellow">*</span>
                        </label>
                        <select
                          value={columnMapping.text}
                          onChange={(e) => setColumnMapping({ ...columnMapping, text: e.target.value })}
                          className="w-full bg-bg-primary border border-border-dark rounded-lg px-3 py-2 text-xs text-white"
                        >
                          {filePreview.columns.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1">
                          Username / Author Column (optional)
                        </label>
                        <select
                          value={columnMapping.username}
                          onChange={(e) => setColumnMapping({ ...columnMapping, username: e.target.value })}
                          className="w-full bg-bg-primary border border-border-dark rounded-lg px-3 py-2 text-xs text-white"
                        >
                          <option value="">Auto-generate</option>
                          {filePreview.columns.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        variant="primary"
                        size="md"
                        loading={loading}
                        icon={<Sparkles className="w-4 h-4" />}
                        onClick={handleAnalyze}
                        disabled={!columnMapping.text}
                      >
                        Process & Analyze File →
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress Bar during execution */}
        {loading && (
          <div className="mt-6 pt-4 border-t border-border-dark space-y-2">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>{progressStage}</span>
              <span className="font-bold text-accent-yellow">{progressPercent}%</span>
            </div>
            <div className="w-full bg-bg-secondary h-2 rounded-full overflow-hidden">
              <div
                className="bg-accent-yellow h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

      </Card>

      {/* RESULT DASHBOARD SECTION - Guarantees stale results are NEVER shown during error or blocked states */}
      {result && isInstagramResult && !errorMessage && (analysisStatus === 'complete' || analysisStatus === 'partial') && (
        <AnalysisDashboardView
          platform="instagram"
          title={result.video?.title || datasetTitle || 'Instagram Reel Analysis'}
          videoMeta={result.video}
          comments={result.comments}
          summary={result.summary}
          rawResponse={result}
          onCommentSelect={setSelectedComment}
          requestedCount={isMaxComments ? 'ALL' : maxComments}
          reportedCount={result.reported_count ?? result.video?.comment_count}
          extractedCount={result.extracted_count ?? result.comments?.length}
          analyzedCount={result.analyzed_count ?? result.comments?.length}
          status={analysisStatus === 'partial' || result.status === 'partial' ? 'Partial' : 'Complete'}
        />
      )}
    </div>
  );
};
