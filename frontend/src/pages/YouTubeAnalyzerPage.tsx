import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import { api } from '../api/client';
import { historyService } from '../services/historyService';
import { FilePreviewResponse } from '../api/types';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DownloadReportButton } from '../components/ui/DownloadReportButton';
import { UniversalExportButton } from '../components/common/UniversalExportButton';
import { AnalysisDashboardView } from '../components/analysis/AnalysisDashboardView';
import { LogarithmicCommentSlider } from '../components/common/LogarithmicCommentSlider';
import {
  Youtube,
  Upload,
  FileSpreadsheet,
  FileText,
  Sparkles,
  AlertCircle,
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
  Globe,
  Radio,
} from 'lucide-react';

export const YouTubeAnalyzerPage: React.FC = () => {
  const { result, setResult, setSelectedComment } = useAnalysis();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // THREE Ingestion Options: 'api' (Option 1), 'scraper' (Option 2), 'upload' (Option 3)
  const [method, setMethod] = useState<'api' | 'scraper' | 'upload'>('api');
  const [url, setUrl] = useState('');
  const [maxComments, setMaxComments] = useState(250);
  const [isMaxComments, setIsMaxComments] = useState(false);

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
  const [progressStage, setProgressStage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateYouTubeUrl = (input: string) => {
    return /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/|v\/)|youtu\.be\/)[A-Za-z0-9_-]{11}|^[A-Za-z0-9_-]{11}$/.test(
      input.trim()
    );
  };

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setPreviewLoading(true);

    try {
      const preview = await api.previewScraperFile(file);
      setFilePreview(preview);
      setColumnMapping({
        text: preview.suggested_mapping?.text || preview.columns[0] || '',
        username: preview.suggested_mapping?.username || '',
        timestamp: preview.suggested_mapping?.timestamp || '',
        likes: preview.suggested_mapping?.likes || '',
        comment_id: preview.suggested_mapping?.comment_id || '',
        parent_id: preview.suggested_mapping?.parent_id || '',
      });
      if (!datasetTitle) {
        setDatasetTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || err.message || 'Could not parse uploaded file. Please provide a valid CSV, XLSX, XLS, or JSON file.'
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

  const handleAnalyze = async () => {
    setResult(null);
    setErrorMessage(null);
    setLoading(true);
    setProgressPercent(15);
    setProgressStage('Initializing YouTube analysis pipeline...');

    const targetComments = isMaxComments ? 50000 : maxComments;
    const requestMode = isMaxComments ? 'all' : 'limit';

    try {
      if (method === 'api') {
        // OPTION 1: YouTube API (Official Google Data API v3)
        if (!validateYouTubeUrl(url)) {
          throw new Error('Please enter a valid YouTube video URL or ID (e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ).');
        }

        setProgressPercent(35);
        setProgressStage('Connecting to YouTube Data API v3 & retrieving comments...');

        const data = await api.analyzeYouTube(url.trim(), targetComments, requestMode);

        setProgressPercent(85);
        setProgressStage('Executing 5 AI Intelligence Engines...');

        setResult(data);

        await historyService.saveHistoryItem({
          category: 'youtube',
          platform: 'youtube',
          url: url.trim(),
          title: data.video?.title || 'YouTube Video Analysis (API)',
          inputType: 'url',
          result: data,
          summary: {
            totalComments: data.summary?.total_comments || data.comments?.length || 0,
            netSentiment: data.summary?.net_sentiment_score,
            dominantSentiment: Object.entries(data.summary?.sentiment_distribution || {}).sort((a: any, b: any) => (Number(b[1]) || 0) - (Number(a[1]) || 0))[0]?.[0] || 'Positive',
            dominantEmotion: data.summary?.dominant_emotion || 'Joy',
            flaggedCount: data.summary?.moderation_summary?.flagged_count || 0,
          },
        });

        setProgressPercent(100);
        setProgressStage('YouTube API analysis complete!');
      } else if (method === 'scraper') {
        // OPTION 2: YouTube Universal Scraper (Without API)
        if (!validateYouTubeUrl(url)) {
          throw new Error('Please enter a valid YouTube video URL or ID (e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ).');
        }

        setProgressPercent(25);
        setProgressStage('Connecting to YouTube via Universal Scraper (Without API)...');

        setProgressPercent(45);
        setProgressStage('Extracting video metadata, comment threads, and top replies...');

        const data = await api.scrapeUniversal({
          url: url.trim(),
          category: 'youtube',
          platform: 'youtube',
          max_items: targetComments,
          request_mode: requestMode,
        });

        setProgressPercent(75);
        setProgressStage(`Collected ${data.comments?.length || 0} comments. Normalizing & deduplicating...`);

        setProgressPercent(90);
        setProgressStage('Executing 5 AI Intelligence Engines across extracted comments...');

        setResult(data);

        await historyService.saveHistoryItem({
          category: 'youtube',
          platform: 'youtube',
          url: url.trim(),
          title: data.video?.title || 'YouTube Universal Scraper Analysis',
          inputType: 'url',
          result: data,
          summary: {
            totalComments: data.summary?.total_comments || data.comments?.length || 0,
            netSentiment: data.summary?.net_sentiment_score,
            dominantSentiment: Object.entries(data.summary?.sentiment_distribution || {}).sort((a: any, b: any) => (Number(b[1]) || 0) - (Number(a[1]) || 0))[0]?.[0] || 'Positive',
            dominantEmotion: data.summary?.dominant_emotion || 'Joy',
            flaggedCount: data.summary?.moderation_summary?.flagged_count || 0,
          },
        });

        setProgressPercent(100);
        setProgressStage('Universal Scraper extraction & analysis complete!');
      } else {
        // OPTION 3: Upload Data (CSV, JSON, XLSX, XLS)
        if (!selectedFile) {
          throw new Error('Please select a CSV, Excel (.xlsx/.xls), or JSON file to import.');
        }
        if (!columnMapping.text) {
          throw new Error('Please select which column contains the comment text.');
        }

        setProgressPercent(35);
        setProgressStage(`Reading and parsing ${selectedFile.name}...`);

        const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');

        const data = await api.processScraperFile(
          selectedFile,
          'youtube',
          columnMapping,
          datasetTitle.trim() || undefined
        );

        setProgressPercent(85);
        setProgressStage('Executing 5 AI Intelligence Engines across imported dataset...');

        setResult(data);

        await historyService.saveHistoryItem({
          category: 'youtube',
          platform: 'youtube',
          title: datasetTitle.trim() || selectedFile.name,
          inputType: isExcel ? 'excel' : 'file',
          result: data,
          summary: {
            totalComments: data.summary?.total_comments || data.comments?.length || 0,
            netSentiment: data.summary?.net_sentiment_score,
            dominantSentiment: Object.entries(data.summary?.sentiment_distribution || {}).sort((a: any, b: any) => (Number(b[1]) || 0) - (Number(a[1]) || 0))[0]?.[0] || 'Positive',
            dominantEmotion: data.summary?.dominant_emotion || 'Joy',
            flaggedCount: data.summary?.moderation_summary?.flagged_count || 0,
          },
        });

        setProgressPercent(100);
        setProgressStage('Import and AI analysis complete!');
      }
    } catch (err: any) {
      setResult(null);
      setErrorMessage(
        err.response?.data?.detail || err.message || 'YouTube analysis request failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isYouTubeResult = result?.video?.platform === 'youtube' || result?.comments?.[0]?.platform === 'youtube' || result !== null;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-dark">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold tracking-widest uppercase mb-2">
            <Youtube className="w-3.5 h-3.5" />
            <span>YouTube Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            YouTube Comment Analyzer
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Analyze YouTube videos and understand audience perspective across sentiment, emotions, intent, and moderation.
          </p>
        </div>

        {/* Global Action & Export Buttons when Result exists */}
        <div className="flex items-center gap-2.5">
          {result && (
            <UniversalExportButton
              category="youtube"
              platform="youtube"
              title={result.video?.title || 'YouTube_Analysis'}
              items={result.comments || []}
              summary={result.summary}
            />
          )}
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            ← Back to Platforms
          </Button>
        </div>
      </div>

      {/* Input Section Container: Exactly THREE Options */}
      <Card className="border border-border-dark bg-bg-card shadow-card-depth">
        {/* THREE Tabs Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-border-dark pb-5 mb-6">
          {/* Option 1: YouTube API */}
          <button
            type="button"
            onClick={() => {
              setMethod('api');
              setErrorMessage(null);
            }}
            className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${
              method === 'api'
                ? 'bg-red-500/10 border-red-500/60 shadow-lg shadow-red-500/5'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Radio className="w-4 h-4 text-red-400" />
                Option 1: YouTube API
              </div>
              <Badge variant="default" className="bg-red-500/20 text-red-300 border-red-500/30 text-[9px] font-bold">
                DATA API V3
              </Badge>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">
              Official YouTube Data API v3 integration with direct quota management and authenticated comment retrieval.
            </p>
          </button>

          {/* Option 2: YouTube Universal Scraper (Without API) */}
          <button
            type="button"
            onClick={() => {
              setMethod('scraper');
              setErrorMessage(null);
            }}
            className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${
              method === 'scraper'
                ? 'bg-yellow-500/10 border-yellow-500/60 shadow-lg shadow-yellow-500/5'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Globe className="w-4 h-4 text-yellow-400" />
                Option 2: Universal Scraper
              </div>
              <Badge variant="default" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[9px] font-bold">
                WITHOUT API
              </Badge>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">
              Public web extraction for video metadata, comments, replies, timestamps, and authors without API keys.
            </p>
          </button>

          {/* Option 3: Upload Data */}
          <button
            type="button"
            onClick={() => {
              setMethod('upload');
              setErrorMessage(null);
            }}
            className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${
              method === 'upload'
                ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Upload className="w-4 h-4 text-emerald-400" />
                Option 3: Upload Data
              </div>
              <Badge variant="default" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] font-bold">
                CSV / XLSX / JSON
              </Badge>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">
              Import YouTube comment files with smart column mapping, deduplication, and full 5-engine AI analysis.
            </p>
          </button>
        </div>

        {/* URL Inputs for Option 1 & Option 2 */}
        {method !== 'upload' ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                  Enter YouTube Video URL or Video ID
                </label>
                <span className="text-[11px] text-slate-500">
                  e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or Shorts link
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-bg-secondary border border-border-dark rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted/60 focus:outline-none focus:border-accent-yellow transition-colors font-mono"
                  disabled={loading}
                />
                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
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
              availableCount={result?.video?.comment_count}
              analyzedCount={result?.comments?.length}
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
                {method === 'api'
                  ? 'Analyze Video via YouTube API →'
                  : 'Scrape & Analyze (Without API) →'}
              </Button>
            </div>
          </div>
        ) : (
          /* OPTION 3: Upload Data Form */
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
                  Drag and drop YouTube comments file here
                </h4>
                <p className="text-xs text-text-muted mb-4">
                  Supports CSV, Excel (.xlsx, .xls), and JSON files up to 50MB
                </p>
                <Button variant="outline" size="sm" type="button">
                  Browse File
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-bg-secondary border border-border-dark space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30">
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
              <span className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 animate-spin text-accent-yellow" />
                {progressStage}
              </span>
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

        {/* Error message banner */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-300">
              <p className="font-bold text-rose-200">Analysis Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}
      </Card>

      {/* RESULT DASHBOARD SECTION (Shown when result is present and no error) */}
      {result && isYouTubeResult && !errorMessage && (
        <AnalysisDashboardView
          platform="youtube"
          title={result.video?.title || datasetTitle || 'YouTube Analysis'}
          videoMeta={result.video}
          comments={result.comments}
          summary={result.summary}
          rawResponse={result}
          onCommentSelect={setSelectedComment}
          requestedCount={isMaxComments ? 'ALL' : maxComments}
          reportedCount={result.reported_count ?? result.video?.comment_count}
          extractedCount={result.extracted_count ?? result.comments?.length}
          analyzedCount={result.analyzed_count ?? result.comments?.length}
          status={result.status || 'Complete'}
        />
      )}
    </div>
  );
};
export default YouTubeAnalyzerPage;
