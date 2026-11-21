import React, { useState, useRef, useEffect } from 'react';
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
  Instagram,
  Facebook,
  Upload,
  FileSpreadsheet,
  FileText,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Link as LinkIcon,
  X,
  Layers,
  Radio,
  Globe,
} from 'lucide-react';

export const MetaAnalyzerPage: React.FC = () => {
  const { result, setResult, setSelectedComment } = useAnalysis();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Platform Selector: 'instagram' | 'facebook'
  const [platform, setPlatform] = useState<'instagram' | 'facebook'>('instagram');

  // Ingestion Methods: 'official' (Meta API), 'scraper' (Universal Scraper Without API), 'file' (Upload Data)
  const [method, setMethod] = useState<'official' | 'scraper' | 'file'>('scraper');

  // URL & Limit states
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
  const [metaApiStatus, setMetaApiStatus] = useState<{
    instagram: { connected: boolean; status: string; quota_status?: string };
    facebook: { connected: boolean; status: string };
  }>({
    instagram: { connected: false, status: 'available' },
    facebook: { connected: false, status: 'available' },
  });

  // Fetch Meta API integrations status on mount
  useEffect(() => {
    api.getMetaStatus()
      .then((status) => {
        if (status) {
          setMetaApiStatus(status);
        }
      })
      .catch(() => {});
  }, []);

  const validateUrl = (input: string, plat: 'instagram' | 'facebook') => {
    const trimmed = input.trim();
    if (plat === 'instagram') {
      return /(?:instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+))|([A-Za-z0-9_-]{5,30})/.test(trimmed);
    } else {
      return /(?:facebook\.com|fb\.watch|fb\.com)\/.+/.test(trimmed);
    }
  };

  const handleUrlChange = (val: string) => {
    setUrl(val);
    // Auto-detect platform if user pastes a Facebook link while Instagram is selected or vice-versa
    if (val.includes('facebook.com') || val.includes('fb.watch') || val.includes('fb.com')) {
      if (platform !== 'facebook') setPlatform('facebook');
    } else if (val.includes('instagram.com')) {
      if (platform !== 'instagram') setPlatform('instagram');
    }
  };

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setPreviewLoading(true);

    try {
      const preview = await api.previewScraperFile(file);
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

  const handleSwitchToUpload = () => {
    setErrorMessage(null);
    setCanSwitchToCsv(false);
    setMethod('file');
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 150);
  };

  const handleAnalyze = async () => {
    setResult(null);
    setErrorMessage(null);
    setCanSwitchToCsv(false);
    setLoading(true);
    setAnalysisStatus('extracting');
    setProgressPercent(15);
    setProgressStage(`Initializing ${platform === 'instagram' ? 'Instagram' : 'Facebook'} analysis pipeline...`);

    const targetCount = isMaxComments ? 50000 : maxComments;
    const reqMode = isMaxComments ? 'all' : 'limit';

    try {
      if (method === 'scraper') {
        // OPTION 2: Meta Universal Scraper (Without API)
        if (!validateUrl(url, platform)) {
          throw new Error(
            platform === 'instagram'
              ? 'Please enter a valid Instagram post or reel link (e.g. https://www.instagram.com/reel/CODE/).'
              : 'Please enter a valid Facebook public post or page link (e.g. https://www.facebook.com/page/posts/12345).'
          );
        }

        setProgressPercent(30);
        setProgressStage(`Connecting to public ${platform === 'instagram' ? 'Instagram' : 'Facebook'} webpage...`);

        setProgressPercent(50);
        setProgressStage('Extracting publicly accessible comment threads & top replies...');

        // Use analyzeMeta with method='without_api'
        const data = await api.analyzeMeta({
          url: url.trim(),
          platform,
          method: 'without_api',
          max_comments: targetCount,
          mode: reqMode,
        });

        setAnalysisStatus('analyzing');
        setProgressPercent(75);
        setProgressStage(`Collected ${data.comments?.length || 0} comments. Normalizing & deduplicating...`);

        setProgressPercent(90);
        setProgressStage('Executing 5 AI Intelligence Engines across extracted comments...');

        setResult(data);
        setAnalysisStatus(data.status === 'partial' ? 'partial' : 'complete');

        // Save to History
        await historyService.saveHistoryItem({
          category: 'meta',
          platform,
          url: url.trim(),
          title: data.video?.title || `Meta ${platform.toUpperCase()} Analysis (Universal Scraper)`,
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
        setProgressStage('Universal Scraper extraction & AI analysis complete!');
      } else if (method === 'official') {
        // OPTION 1: Meta API
        if (!validateUrl(url, platform)) {
          throw new Error(
            platform === 'instagram'
              ? 'Please enter a valid Instagram post or reel link.'
              : 'Please enter a valid Facebook post or page link.'
          );
        }

        setProgressPercent(35);
        setProgressStage(`Connecting to Official Meta Graph API (${platform.toUpperCase()})...`);

        const data = await api.analyzeMeta({
          url: url.trim(),
          platform,
          method: 'official_api',
          max_comments: targetCount,
          mode: reqMode,
        });

        setAnalysisStatus('analyzing');
        setProgressPercent(85);
        setProgressStage('Executing 5 AI Intelligence Engines...');

        setResult(data);
        setAnalysisStatus(data.status === 'partial' ? 'partial' : 'complete');

        await historyService.saveHistoryItem({
          category: 'meta',
          platform,
          url: url.trim(),
          title: data.video?.title || `Meta ${platform.toUpperCase()} API Analysis`,
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
        setProgressStage('Meta API analysis complete!');
      } else {
        // OPTION 3: Upload Data
        if (!selectedFile) {
          throw new Error('Please select a CSV, Excel (.xlsx/.xls), or JSON file to upload.');
        }
        if (!columnMapping.text) {
          throw new Error('Please select which column contains the comment text.');
        }

        setProgressPercent(35);
        setProgressStage(`Parsing ${selectedFile.name}...`);

        const data = await api.processScraperFile(
          selectedFile,
          platform,
          columnMapping,
          datasetTitle.trim() || undefined
        );

        setProgressPercent(80);
        setProgressStage('Executing 5 AI Intelligence Engines across uploaded records...');

        setResult(data);
        setAnalysisStatus('complete');

        await historyService.saveHistoryItem({
          category: 'meta',
          platform,
          title: datasetTitle.trim() || selectedFile.name,
          inputType: 'file',
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
        setProgressStage('File analysis complete!');
      }
    } catch (err: any) {
      console.error('Meta analysis error:', err);
      const msg = err.response?.data?.detail || err.message || 'Analysis failed. Please verify the URL or try another method.';
      setErrorMessage(msg);
      setAnalysisStatus('failed');

      // Check if error suggests switching to upload
      if (
        msg.toLowerCase().includes('login') ||
        msg.toLowerCase().includes('bot') ||
        msg.toLowerCase().includes('polaris') ||
        msg.toLowerCase().includes('quota') ||
        msg.toLowerCase().includes('anonymous') ||
        msg.toLowerCase().includes('security')
      ) {
        setCanSwitchToCsv(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-100">Meta Analytics</h1>
                <Badge variant="default" className="bg-gradient-to-r from-pink-500/20 to-blue-500/20 text-pink-300 border-pink-500/30 text-[10px] uppercase font-bold tracking-wider">
                  INSTAGRAM + FACEBOOK
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Unified social intelligence engine for Instagram Posts, Reels & Facebook Public Pages and Posts
              </p>
            </div>
          </div>
        </div>

        {/* Global Export & Actions when Results Exist */}
        {result && (
          <div className="flex items-center gap-2.5">
            <UniversalExportButton
              category="meta"
              platform={platform}
              title={result.video?.title || `Meta_${platform}_Analysis`}
              items={result.comments || []}
              summary={result.summary}
            />
            <DownloadReportButton
              result={result}
              platform={platform}
              label="Download Intelligence Report"
            />
          </div>
        )}
      </div>

      {/* Main Configuration Card */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
        <div className="p-6 space-y-6">
          {/* Subsections: Platform Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-yellow-400" />
              1. Select Meta Platform
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => {
                  setPlatform('instagram');
                  setErrorMessage(null);
                }}
                className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border font-semibold text-sm transition-all duration-200 ${
                  platform === 'instagram'
                    ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/60 text-pink-300 shadow-md shadow-pink-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Instagram className="w-4 h-4 text-pink-400" />
                <span>Instagram</span>
                <span className="text-[10px] opacity-75 font-normal">(Posts & Reels)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlatform('facebook');
                  setErrorMessage(null);
                }}
                className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border font-semibold text-sm transition-all duration-200 ${
                  platform === 'facebook'
                    ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-blue-500/60 text-blue-300 shadow-md shadow-blue-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Facebook className="w-4 h-4 text-blue-400" />
                <span>Facebook</span>
                <span className="text-[10px] opacity-75 font-normal">(Posts & Pages)</span>
              </button>
            </div>
          </div>

          {/* Extraction Method Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              2. Choose Ingestion Method
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 2: Meta Universal Scraper (Without API) - Recommended */}
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <Globe className="w-4 h-4 text-yellow-400" />
                    Meta Universal Scraper
                  </div>
                  <Badge variant="default" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[9px] font-bold">
                    WITHOUT API
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">
                  Collect public comments & replies directly from public URLs without requiring Meta API credentials.
                </p>
              </button>

              {/* Option 1: Meta API */}
              <button
                type="button"
                onClick={() => {
                  setMethod('official');
                  setErrorMessage(null);
                }}
                className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${
                  method === 'official'
                    ? 'bg-blue-500/10 border-blue-500/60 shadow-lg shadow-blue-500/5'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <Radio className="w-4 h-4 text-blue-400" />
                    Official Meta API
                  </div>
                  <Badge variant="default" className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[9px] font-bold">
                    API MODE
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">
                  Authenticate via Graph API to access high-volume comment streams from managed accounts.
                </p>
              </button>

              {/* Option 3: Upload Data */}
              <button
                type="button"
                onClick={() => {
                  setMethod('file');
                  setErrorMessage(null);
                }}
                className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${
                  method === 'file'
                    ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    Upload Data
                  </div>
                  <Badge variant="default" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] font-bold">
                    CSV / XLSX / JSON
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">
                  Import exported datasets from Instagram or Facebook with flexible column mapping.
                </p>
              </button>
            </div>
          </div>

          {/* Form Input based on Method */}
          {method !== 'file' ? (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">
                    {platform === 'instagram'
                      ? 'Instagram Post or Reel URL'
                      : 'Facebook Public Post or Page URL'}
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {platform === 'instagram'
                      ? 'Example: https://www.instagram.com/reel/C-Example/'
                      : 'Example: https://www.facebook.com/page/posts/123456'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder={
                      platform === 'instagram'
                        ? 'Paste Instagram Reel or Post link...'
                        : 'Paste Facebook Post or Page link...'
                    }
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all text-sm font-mono"
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

              {/* Logarithmic Comment Slider */}
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
            </div>
          ) : (
            /* File Upload Input */
            <div className="space-y-4 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, .json"
                onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                className="hidden"
              />

              {!selectedFile ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-yellow-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-950/30 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 group-hover:bg-yellow-500/10 flex items-center justify-center mx-auto mb-3 transition-colors text-slate-400 group-hover:text-yellow-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-slate-200">
                    Drag & Drop your {platform === 'instagram' ? 'Instagram' : 'Facebook'} comments dataset here
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Supports CSV, XLSX, XLS, and JSON files up to 50MB
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 border-slate-700 group-hover:border-yellow-500/40 text-xs"
                  >
                    Browse Local File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-200">{selectedFile.name}</div>
                        <div className="text-xs text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {filePreview?.total_rows || 0} rows found
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreview(null);
                      }}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {filePreview && (
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Column Mapping
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-slate-400 block mb-1">Comment Text (Required):</label>
                          <select
                            value={columnMapping.text}
                            onChange={(e) => setColumnMapping({ ...columnMapping, text: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-yellow-500"
                          >
                            <option value="">Select Column</option>
                            {filePreview.columns.map((col) => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1">Author / Username (Optional):</label>
                          <select
                            value={columnMapping.username}
                            onChange={(e) => setColumnMapping({ ...columnMapping, username: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-yellow-500"
                          >
                            <option value="">Auto-Detect / None</option>
                            {filePreview.columns.map((col) => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Button & Live Progress */}
          <div className="pt-2 flex flex-col gap-3">
            <Button
              onClick={handleAnalyze}
              disabled={loading || (method !== 'file' ? !url.trim() : !selectedFile)}
              className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-yellow-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Processing Analysis ({progressPercent}%)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {method === 'scraper'
                      ? `Scrape & Analyze ${platform === 'instagram' ? 'Instagram' : 'Facebook'} (Without API)`
                      : method === 'official'
                      ? `Analyze via Meta API`
                      : `Analyze Uploaded Dataset`}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>

            {/* Live Progress Bar */}
            {loading && (
              <div className="space-y-1.5 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                <div className="flex justify-between text-xs">
                  <span className="text-yellow-400 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    {progressStage}
                  </span>
                  <span className="text-slate-400 font-mono">{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-yellow-500 to-amber-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message & Graceful Fallback */}
            {errorMessage && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
                <div className="flex items-start gap-2 text-rose-400 text-xs leading-relaxed">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                {canSwitchToCsv && (
                  <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
                    <span className="text-[11px] text-slate-300">
                      Instagram/Facebook blocked anonymous scraping for this URL.
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSwitchToUpload}
                      className="border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 text-xs"
                    >
                      Upload CSV / Excel Instead
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Analysis Results View */}
      {result && (
        <AnalysisDashboardView
          platform={platform}
          title={result.video?.title || `Meta ${platform.toUpperCase()} Analysis`}
          videoMeta={result.video}
          comments={result.comments || []}
          summary={result.summary}
          rawResponse={result}
          onCommentSelect={(c) => setSelectedComment(c)}
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
export default MetaAnalyzerPage;
