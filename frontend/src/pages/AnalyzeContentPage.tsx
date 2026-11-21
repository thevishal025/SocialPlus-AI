import React, { useState, useEffect, useRef } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../api/client';
import { FilePreviewResponse, ImportSummary } from '../api/types';
import { LogarithmicCommentSlider } from '../components/common/LogarithmicCommentSlider';
import { useNavigate } from 'react-router-dom';
import {
  Youtube,
  Instagram,
  Upload,
  FileSpreadsheet,
  FileText,
  FileCode,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  RefreshCw,
  Sliders,
  Check,
  X,
  Copy,
  Table as TableIcon,
  ShoppingBag,
} from 'lucide-react';

export const AnalyzeContentPage: React.FC = () => {
  const { setResult } = useAnalysis();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Platform and Ingestion Method States
  const [platform, setPlatform] = useState<'youtube' | 'instagram'>('youtube');
  const [method, setMethod] = useState<'api' | 'file' | 'manual'>('api');

  // Method 1: API URL States
  const [url, setUrl] = useState('');
  const [maxComments, setMaxComments] = useState(250);
  const [isMaxComments, setIsMaxComments] = useState(false);

  // Method 2: File Import States (CSV, Excel, JSON)
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

  // Method 3: Manual Comment Entry States
  const [manualText, setManualText] = useState('');
  const [defaultAuthor, setDefaultAuthor] = useState('');

  // Status and Error States
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isInstagramQuotaExhausted, setIsInstagramQuotaExhausted] = useState(false);
  const [youtubeConfigured, setYoutubeConfigured] = useState(true);
  const [errorInfo, setErrorInfo] = useState<{
    title: string;
    message: string;
    details?: string;
    code?: string;
  } | null>(null);

  // Progress and Results States
  const [progressStage, setProgressStage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  // Initial integration status check
  useEffect(() => {
    api.getIntegrationsStatus()
      .then((status) => {
        setYoutubeConfigured(!!status?.youtube?.configured);
        if (
          status?.instagram?.status === 'quota_exhausted' ||
          status?.instagram?.quota_status === 'exhausted' ||
          status?.rapidapi?.status === 'quota_exhausted'
        ) {
          setIsInstagramQuotaExhausted(true);
        }
      })
      .catch(() => {
        // Backend initializing
      });
  }, []);

  const validateYouTubeUrl = (input: string) => {
    return /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/|v\/)|youtu\.be\/)[A-Za-z0-9_-]{11}|^[A-Za-z0-9_-]{11}$/.test(input.trim());
  };

  const validateInstagramUrl = (input: string) => {
    return /(?:instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+))|([A-Za-z0-9_-]{5,30})/.test(input.trim());
  };

  // Handle File Selection and Automatic Preview
  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setErrorInfo(null);
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
      setErrorInfo({
        title: 'File Preview Error',
        message: err.response?.data?.detail || err.message || 'Could not parse uploaded file.',
        details: 'Supported file formats: .csv, .xlsx, .xls, .json with valid tabular headers.',
      });
      setSelectedFile(null);
      setFilePreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Dropzone drag-and-drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Execution Handler for All Methods
  const handleExecute = async () => {
    setErrorInfo(null);
    setImportSummary(null);
    setLoading(true);
    setProgressPercent(10);
    setProgressStage('Initializing ingestion and AI intelligence engines...');

    try {
      if (method === 'api') {
        if (platform === 'youtube') {
          if (!validateYouTubeUrl(url)) {
            throw new Error('Please enter a valid YouTube video, Shorts, or watch URL (e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ).');
          }

          setProgressPercent(35);
          setProgressStage('Connecting to official YouTube Data API v3 & retrieving comments...');

          const targetComments = isMaxComments ? 50000 : maxComments;
          const data = await api.analyzeYouTube(url.trim(), targetComments);

          setProgressPercent(80);
          setProgressStage('Executing 5 AI Engines (Sentiment, Emotions, Intent, Emojis, Moderation)...');

          setProgressPercent(100);
          setProgressStage('Analysis complete! Storing results in database...');

          setResult(data);
          setTimeout(() => navigate('/'), 1000);
        } else {
          // Instagram Method 1
          if (!validateInstagramUrl(url)) {
            throw new Error('Please enter a valid Instagram post or reel link (e.g. https://www.instagram.com/reel/CODE/).');
          }

          setProgressPercent(35);
          setProgressStage('Connecting to Instagram provider adapter...');

          const targetComments = isMaxComments ? 50000 : maxComments;
          const data = await api.analyzeInstagram(url.trim(), targetComments);

          setProgressPercent(85);
          setProgressStage('Processing comments with NLP models...');

          setProgressPercent(100);
          setProgressStage('Analysis complete!');
          setResult(data);
          setTimeout(() => navigate('/'), 1000);
        }
      } else if (method === 'file') {
        if (!selectedFile) {
          throw new Error('Please select a CSV, Excel (.xlsx/.xls), or JSON file to import.');
        }
        if (!columnMapping.text) {
          throw new Error('Please specify which column contains the comment text.');
        }

        setProgressPercent(30);
        setProgressStage(`Reading ${selectedFile.name} and extracting column data...`);

        const data = await api.processFileImport(
          selectedFile,
          platform,
          columnMapping,
          datasetTitle.trim() || undefined
        );

        setProgressPercent(80);
        setProgressStage('Running 5 AI Intelligence Engines across imported comments...');

        setProgressPercent(100);
        setProgressStage('Import and analysis complete!');

        if (data.import_summary) {
          setImportSummary(data.import_summary);
        }
        setResult(data);
        setTimeout(() => navigate('/'), 1200);
      } else if (method === 'manual') {
        const rawLines = manualText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (rawLines.length === 0) {
          throw new Error('Please enter or paste at least one comment in the text area.');
        }

        setProgressPercent(30);
        setProgressStage(`Formatting ${rawLines.length} manual comments...`);

        const structuredComments = rawLines.map((line, idx) => ({
          text: line,
          username: defaultAuthor.trim() || `${platform}_user_${idx + 1}`,
          likes: 0,
        }));

        setProgressPercent(60);
        setProgressStage('Executing 5 AI Intelligence Engines across comments...');

        const data = await api.submitManualComments(
          platform,
          structuredComments,
          datasetTitle.trim() || undefined
        );

        setProgressPercent(100);
        setProgressStage('Manual analysis complete!');

        if (data.import_summary) {
          setImportSummary(data.import_summary);
        }
        setResult(data);
        setTimeout(() => navigate('/'), 1000);
      }
    } catch (err: any) {
      const respData = err.response?.data;
      let title = `${platform.toUpperCase()} Ingestion Notice`;
      let message = '';
      let details = '';
      let code = respData?.error_code || '';

      if (respData) {
        if (respData.error_code === 'PROVIDER_QUOTA_EXCEEDED' || err.response?.status === 429) {
          setIsInstagramQuotaExhausted(true);
          title = 'RapidAPI Monthly Quota Limit Exceeded (HTTP 429)';
          message = respData.message || 'Instagram API monthly request quota exhausted. Please upgrade your RapidAPI subscription or wait for the next quota reset.';
          details = respData.details || 'The current RapidAPI key has exhausted its monthly request quota. You can import comments via CSV/Excel or Manual Entry below.';
          code = 'PROVIDER_QUOTA_EXCEEDED';
        } else {
          message = respData.detail || respData.message || 'Ingestion request failed.';
          details = respData.details || '';
        }
      }

      if (!message) {
        message = err.message || 'Analysis failed. Please verify input data and backend configuration.';
      }

      setErrorInfo({ title, message, details, code });
      setProgressStage('Failed during execution.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-purple" />
          <span>Multi-Platform Social Media Ingestion & Analysis</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Ingest comments via Official APIs, CSV / Excel / JSON Datasets, or Manual Entry, and process them through all 5 AI intelligence engines.
        </p>
      </div>

      {/* Primary Platform Selector: YouTube vs Instagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* YouTube Analytics Platform Card */}
        <div
          onClick={() => {
            setPlatform('youtube');
            setErrorInfo(null);
          }}
          className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 ${
            platform === 'youtube'
              ? 'bg-red-500/10 border-red-500/50 shadow-glow-sm ring-1 ring-red-500/40'
              : 'bg-navy-900/60 border-white/5 hover:border-white/20'
          }`}
        >
          <div className="p-3 rounded-xl bg-red-500/20 text-red-500 shrink-0">
            <Youtube className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>YouTube Analytics</span>
                {platform === 'youtube' && <span className="w-2 h-2 rounded-full bg-red-500" />}
              </h3>
              <Badge variant={youtubeConfigured ? 'positive' : 'outline'} size="sm">
                {youtubeConfigured ? 'Official API Ready' : 'Key Needed'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Official Data API v3 (videos.list, commentThreads, replies), CSV/Excel/JSON file imports, and manual paste.
            </p>
          </div>
        </div>

        {/* Instagram Analytics Platform Card */}
        <div
          onClick={() => {
            setPlatform('instagram');
            setErrorInfo(null);
          }}
          className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 ${
            platform === 'instagram'
              ? 'bg-pink-500/10 border-pink-500/50 shadow-glow-sm ring-1 ring-pink-500/40'
              : 'bg-navy-900/60 border-white/5 hover:border-white/20'
          }`}
        >
          <div className="p-3 rounded-xl bg-pink-500/20 text-pink-500 shrink-0">
            <Instagram className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Instagram Analytics</span>
                {platform === 'instagram' && <span className="w-2 h-2 rounded-full bg-pink-500" />}
              </h3>
              <Badge variant={isInstagramQuotaExhausted ? 'mixed' : 'positive'} size="sm">
                {isInstagramQuotaExhausted ? 'Quota Exhausted' : 'Ready'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Reels/Posts, CSV/Excel/JSON exports, and manual comments with 5-engine sentiment, emotion, and moderation analysis.
            </p>
          </div>
        </div>

        {/* E-Commerce Product Review Platform Card */}
        <div
          onClick={() => navigate('/ecommerce')}
          className="cursor-pointer p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 bg-navy-900/60 border-white/5 hover:border-amber-400/40 hover:bg-amber-500/5 group"
        >
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>E-Commerce Reviews</span>
              </h3>
              <Badge variant="positive" size="sm" className="bg-amber-500/20 text-amber-300 border-amber-500/40">
                Flipkart / Amazon
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Customer review intelligence, Top Complaint insights, and rating verification across product stores.
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation: Ingestion Methods */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => {
            setMethod('api');
            setErrorInfo(null);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            method === 'api'
              ? platform === 'youtube'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          {platform === 'youtube' ? <Youtube className="w-3.5 h-3.5" /> : <Instagram className="w-3.5 h-3.5" />}
          <span>Method 1: {platform === 'youtube' ? 'Official YouTube Data API v3' : 'Reel / Post URL'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMethod('file');
            setErrorInfo(null);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            method === 'file'
              ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40 shadow-glow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Method 2: CSV / Excel / JSON File Import</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMethod('manual');
            setErrorInfo(null);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            method === 'manual'
              ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40 shadow-glow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Method 3: Manual Comment Entry</span>
        </button>
      </div>

      {/* Main Method Card */}
      <Card>
        {/* METHOD 1: URL / API INGESTION */}
        {method === 'api' && (
          <div className="space-y-4">
            <CardHeader
              title={
                platform === 'youtube'
                  ? 'Official YouTube Data API v3 Ingestion'
                  : 'Instagram Reel / Post URL Ingestion'
              }
              subtitle={
                platform === 'youtube'
                  ? 'Fetches video details via videos.list, comments via commentThreads.list, and child replies via comments.list'
                  : 'Retrieves available public comments using configured adapter; provides fallback guidance on quota limits'
              }
              icon={
                platform === 'youtube' ? (
                  <Youtube className="w-4 h-4 text-red-500" />
                ) : (
                  <Instagram className="w-4 h-4 text-pink-500" />
                )
              }
            />

            {/* Instagram Quota Exhaustion Advisory */}
            {platform === 'instagram' && isInstagramQuotaExhausted && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2.5">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Instagram API Monthly Request Quota Exhausted</span>
                </div>
                <p className="text-amber-200/90 leading-relaxed text-[11px]">
                  Instagram API monthly request quota exhausted. Please upgrade your RapidAPI subscription or wait for the next quota reset.
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-slate-400">Recommended alternatives:</span>
                  <button
                    type="button"
                    onClick={() => setMethod('file')}
                    className="px-2.5 py-1 rounded bg-brand-purple/20 text-purple-300 hover:bg-brand-purple/30 font-medium transition-colors flex items-center gap-1"
                  >
                    <span>Import Instagram CSV / Excel / JSON</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('manual')}
                    className="px-2.5 py-1 rounded bg-white/10 text-slate-200 hover:bg-white/15 font-medium transition-colors"
                  >
                    Manual Comment Paste
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlatform('youtube');
                      setMethod('api');
                    }}
                    className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 font-medium transition-colors"
                  >
                    Switch to YouTube Official API
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {platform === 'youtube' ? 'YouTube Video URL or Shorts Link' : 'Instagram Reel or Post URL'}
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={
                  platform === 'youtube'
                    ? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/...'
                    : 'https://www.instagram.com/reel/DfGw6MiB4a4/ or https://www.instagram.com/p/...'
                }
                className="w-full bg-navy-950 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-purple/50"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {platform === 'youtube'
                  ? 'Supports standard watch links, Shorts (youtube.com/shorts/...), youtu.be, embed, and direct video IDs.'
                  : 'Supports feed posts, Reels (/reel/...), and direct media shortcodes.'}
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
              label="Comments to Analyze"
              itemType="comments"
              disabled={loading}
            />
          </div>
        )}

        {/* METHOD 2: CSV / EXCEL / JSON FILE IMPORT */}
        {method === 'file' && (
          <div className="space-y-5">
            <CardHeader
              title={`${platform.toUpperCase()} File Ingestion (CSV / Excel / JSON)`}
              subtitle="Drag-and-drop comment datasets with automatic column detection and interactive mapping"
              icon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
            />

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-white/15 hover:border-brand-purple/50 rounded-xl p-6 text-center bg-navy-950/60 transition-colors space-y-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-brand-purple/20 text-brand-purple flex items-center justify-center mx-auto">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  {selectedFile ? selectedFile.name : 'Click to select or drag and drop your file here'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supports CSV (.csv), Excel (.xlsx, .xls), JSON (.json), or text lines (.txt)
                </p>
              </div>
            </div>

            {previewLoading && (
              <div className="p-4 rounded-xl bg-navy-950/80 border border-white/5 flex items-center gap-3 text-xs text-slate-300">
                <RefreshCw className="w-4 h-4 text-brand-purple animate-spin" />
                <span>Reading columns and preparing dataset preview...</span>
              </div>
            )}

            {/* File Preview & Column Mapping Section */}
            {filePreview && (
              <div className="space-y-4 pt-2 border-t border-white/5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <TableIcon className="w-3.5 h-3.5 text-brand-purple" />
                      <span>Dataset Structure & Column Mapping</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      File: <strong className="text-slate-200">{filePreview.filename}</strong> ({filePreview.file_type.toUpperCase()}) • Total Rows: <strong className="text-emerald-400">{filePreview.total_rows.toLocaleString()}</strong>
                    </p>
                  </div>
                  <Badge variant="mixed" size="sm">
                    {filePreview.columns.length} Columns Detected
                  </Badge>
                </div>

                {/* Optional Dataset Title */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Dataset Session Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={datasetTitle}
                    onChange={(e) => setDatasetTitle(e.target.value)}
                    placeholder={`e.g. ${platform.toUpperCase()} Feedback Q4 Batch`}
                    className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-purple/50"
                  />
                </div>

                {/* Column Mapping Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 rounded-xl bg-navy-950/80 border border-white/5">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-400 mb-1">
                      Comment Text Column * (Required)
                    </label>
                    <select
                      value={columnMapping.text}
                      onChange={(e) => setColumnMapping({ ...columnMapping, text: e.target.value })}
                      className="w-full bg-navy-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-purple/50"
                    >
                      <option value="">-- Select Comment Column --</option>
                      {filePreview.columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Author / Username Column
                    </label>
                    <select
                      value={columnMapping.username}
                      onChange={(e) => setColumnMapping({ ...columnMapping, username: e.target.value })}
                      className="w-full bg-navy-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-purple/50"
                    >
                      <option value="">-- Optional (Default: user) --</option>
                      {filePreview.columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Likes / Upvotes Column
                    </label>
                    <select
                      value={columnMapping.likes}
                      onChange={(e) => setColumnMapping({ ...columnMapping, likes: e.target.value })}
                      className="w-full bg-navy-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-purple/50"
                    >
                      <option value="">-- Optional (Default: 0) --</option>
                      {filePreview.columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Timestamp / Date Column
                    </label>
                    <select
                      value={columnMapping.timestamp}
                      onChange={(e) => setColumnMapping({ ...columnMapping, timestamp: e.target.value })}
                      className="w-full bg-navy-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-purple/50"
                    >
                      <option value="">-- Optional (Default: Now) --</option>
                      {filePreview.columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Comment ID Column
                    </label>
                    <select
                      value={columnMapping.comment_id}
                      onChange={(e) => setColumnMapping({ ...columnMapping, comment_id: e.target.value })}
                      className="w-full bg-navy-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-purple/50"
                    >
                      <option value="">-- Optional (Auto-generated) --</option>
                      {filePreview.columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Parent ID / Reply Column
                    </label>
                    <select
                      value={columnMapping.parent_id}
                      onChange={(e) => setColumnMapping({ ...columnMapping, parent_id: e.target.value })}
                      className="w-full bg-navy-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-purple/50"
                    >
                      <option value="">-- Optional (Top-level) --</option>
                      {filePreview.columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Top 5 Rows Preview Table */}
                <div className="overflow-x-auto rounded-lg border border-white/5 bg-navy-950/70">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-navy-900/80 text-slate-400 font-semibold border-b border-white/5">
                      <tr>
                        {filePreview.columns.slice(0, 5).map((col) => (
                          <th key={col} className="p-2.5 truncate max-w-[160px]">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {filePreview.preview_rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-white/5">
                          {filePreview.columns.slice(0, 5).map((col) => (
                            <td key={col} className="p-2.5 truncate max-w-[160px] font-mono">
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* METHOD 3: MANUAL COMMENT ENTRY */}
        {method === 'manual' && (
          <div className="space-y-4">
            <CardHeader
              title={`Manual ${platform.toUpperCase()} Comment Entry`}
              subtitle="Paste multiple comments line-by-line for instant 5-engine AI classification"
              icon={<FileText className="w-4 h-4 text-brand-purple" />}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Session Title
                </label>
                <input
                  type="text"
                  value={datasetTitle}
                  onChange={(e) => setDatasetTitle(e.target.value)}
                  placeholder={`Manual ${platform.toUpperCase()} Feedback Batch`}
                  className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-purple/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Default Author Name (Optional)
                </label>
                <input
                  type="text"
                  value={defaultAuthor}
                  onChange={(e) => setDefaultAuthor(e.target.value)}
                  placeholder="e.g. feedback_reviewer"
                  className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-purple/50"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Comments (One comment per line)
                </label>
                <span className="text-[11px] text-brand-purple font-mono font-semibold">
                  {manualText.split('\n').filter((x) => x.trim()).length} comments entered
                </span>
              </div>
              <textarea
                rows={7}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={`Paste ${platform} comments here, one comment per line...\nExample 1: This video was super clear and well-explained! ❤️🔥\nExample 2: Is this code compatible with Python 3.12?`}
                className="w-full bg-navy-950 border border-white/10 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-purple/50 font-mono leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* Error Notification Alert */}
        {errorInfo && (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-rose-300 text-sm">{errorInfo.title}</span>
                {errorInfo.code && (
                  <Badge variant="outline" size="sm" className="font-mono text-[10px] text-rose-300 border-rose-400/40 bg-rose-950/40">
                    {errorInfo.code}
                  </Badge>
                )}
              </div>
              <p className="text-rose-200 font-medium leading-relaxed">{errorInfo.message}</p>
              {errorInfo.details && (
                <div className="text-slate-300 text-[11px] leading-relaxed bg-navy-950/70 p-2.5 rounded-lg border border-white/5 font-mono">
                  {errorInfo.details}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Ingestion Progress Bar */}
        {loading && (
          <div className="mt-5 p-4 rounded-xl bg-navy-950/80 border border-brand-purple/30 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-brand-purple animate-spin" />
                {progressStage}
              </span>
              <span className="font-bold text-brand-purple font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full bg-navy-900 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-brand-violet via-brand-indigo to-brand-cyan h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Import Summary Results Card */}
        {importSummary && (
          <div className="mt-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ingestion & AI Analysis Completed Successfully</span>
              </span>
              <Badge variant="positive" size="sm">
                {importSummary.successfully_imported} Imported
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1">
              <div className="p-2 rounded bg-navy-950/60 border border-white/5">
                <span className="text-slate-400 block text-[10px]">Total Rows Read</span>
                <span className="text-white font-bold">{importSummary.total_rows_read}</span>
              </div>
              <div className="p-2 rounded bg-navy-950/60 border border-white/5">
                <span className="text-slate-400 block text-[10px]">Valid Comments</span>
                <span className="text-emerald-400 font-bold">{importSummary.successfully_imported}</span>
              </div>
              <div className="p-2 rounded bg-navy-950/60 border border-white/5">
                <span className="text-slate-400 block text-[10px]">Duplicates Flagged</span>
                <span className="text-amber-400 font-bold">{importSummary.duplicates_detected}</span>
              </div>
              <div className="p-2 rounded bg-navy-950/60 border border-white/5">
                <span className="text-slate-400 block text-[10px]">Invalid Skipped</span>
                <span className="text-rose-400 font-bold">{importSummary.invalid_rows_skipped}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Trigger Button */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/5">
          <Button
            size="lg"
            variant="primary"
            onClick={handleExecute}
            disabled={loading || previewLoading}
            icon={
              loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )
            }
          >
            {loading
              ? 'Analyzing Dataset...'
              : method === 'api'
              ? `Retrieve & Analyze ${platform === 'youtube' ? 'YouTube Video' : 'Instagram Reel'}`
              : method === 'file'
              ? `Import ${selectedFile ? selectedFile.name : 'Dataset'} & Run 5-Engine Analysis`
              : `Submit Comments & Run 5-Engine Analysis`}
          </Button>
        </div>
      </Card>
    </div>
  );
};
