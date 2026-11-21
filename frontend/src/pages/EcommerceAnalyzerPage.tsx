import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import { api } from '../api/client';
import { historyService } from '../services/historyService';
import { EcommerceAnalysisResponse, CommentItem, FilePreviewResponse } from '../api/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DownloadReportButton } from '../components/ui/DownloadReportButton';
import { UniversalExportButton } from '../components/common/UniversalExportButton';
import { CommentDetailModal } from '../components/comments/CommentDetailModal';
import { AnalysisDashboardView } from '../components/analysis/AnalysisDashboardView';
import { LogarithmicCommentSlider } from '../components/common/LogarithmicCommentSlider';
import {
  ShoppingBag,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Upload,
  FileSpreadsheet,
  FileText,
  Clock,
  Search,
  Star,
  Globe,
  Radio,
  X,
  Package,
  Layers,
  Store,
} from 'lucide-react';

const SAMPLE_FLIPKART_URL = 'https://dl.flipkart.com/s/v6zq!mNNNN';

const ECOMMERCE_PLATFORMS = [
  { id: 'flipkart', name: 'Flipkart', color: 'from-blue-500/20 to-sky-500/20 text-blue-400 border-blue-500/40' },
  { id: 'amazon', name: 'Amazon', color: 'from-amber-500/20 to-orange-500/20 text-orange-400 border-orange-500/40' },
  { id: 'meesho', name: 'Meesho', color: 'from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-500/40' },
  { id: 'myntra', name: 'Myntra', color: 'from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/40' },
  { id: 'ajio', name: 'AJIO', color: 'from-teal-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/40' },
  { id: 'snapdeal', name: 'Snapdeal', color: 'from-red-500/20 to-amber-500/20 text-red-400 border-red-500/40' },
  { id: 'ebay', name: 'eBay', color: 'from-blue-500/20 to-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  { id: 'shopify', name: 'Shopify', color: 'from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-500/40' },
  { id: 'generic', name: 'Generic / Other', color: 'from-slate-500/20 to-gray-500/20 text-slate-300 border-slate-600' },
];

export const EcommerceAnalyzerPage: React.FC = () => {
  const navigate = useNavigate();
  const { ecommerceResult, setEcommerceResult } = useAnalysis();

  // Exactly TWO Methods: 'scraper' (Option 1) vs. 'upload' (Option 2)
  const [method, setMethod] = useState<'scraper' | 'upload'>('scraper');

  // Selected Platform (defaults to Flipkart or Amazon)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('flipkart');

  // Option 1: URL & Limit states
  const [url, setUrl] = useState('');
  const [maxReviews, setMaxReviews] = useState(30);
  const [isMaxReviews, setIsMaxReviews] = useState(false);

  // Option 2: Upload File & Mapping states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreviewResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<{
    text: string;
    rating: string;
    username: string;
    timestamp: string;
    likes: string;
  }>({
    text: '',
    rating: '',
    username: '',
    timestamp: '',
    likes: '',
  });

  // Optional Product Metadata for file upload
  const [manualTitle, setManualTitle] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Execution states
  const [loading, setLoading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result interaction states
  const [selectedReview, setSelectedReview] = useState<CommentItem | null>(null);

  // Auto-detect e-commerce platform from URL
  const handleUrlChange = (val: string) => {
    setUrl(val);
    const lower = val.toLowerCase();
    if (lower.includes('flipkart.com') || lower.includes('dl.flipkart.com')) setSelectedPlatform('flipkart');
    else if (lower.includes('amazon.')) setSelectedPlatform('amazon');
    else if (lower.includes('meesho.com')) setSelectedPlatform('meesho');
    else if (lower.includes('myntra.com')) setSelectedPlatform('myntra');
    else if (lower.includes('ajio.com')) setSelectedPlatform('ajio');
    else if (lower.includes('snapdeal.com')) setSelectedPlatform('snapdeal');
    else if (lower.includes('ebay.')) setSelectedPlatform('ebay');
    else if (lower.includes('myshopify.com')) setSelectedPlatform('shopify');
  };

  const handleUseSampleUrl = () => {
    setSelectedPlatform('flipkart');
    setUrl(SAMPLE_FLIPKART_URL);
  };

  // Handle file selection for Option 2
  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setPreviewLoading(true);

    try {
      const preview = await api.previewScraperFile(file);
      setFilePreview(preview);
      setColumnMapping({
        text: preview.suggested_mapping?.text || preview.columns[0] || '',
        rating: preview.suggested_mapping?.rating || '',
        username: preview.suggested_mapping?.username || '',
        timestamp: preview.suggested_mapping?.timestamp || '',
        likes: preview.suggested_mapping?.likes || '',
      });
      if (!manualTitle) {
        setManualTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
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

  // Execute OPTION 1: Search Product Without API (Universal Scraper)
  const handleAnalyzeUrl = async () => {
    const targetUrl = url.trim();
    if (!targetUrl) {
      setErrorMessage(`Please enter a valid product URL.`);
      return;
    }

    setEcommerceResult(null);
    setErrorMessage(null);
    setLoading(true);
    setProgressPercent(15);
    setProgressStage(`Connecting to ${selectedPlatform.toUpperCase()} & extracting product metadata...`);

    try {
      setProgressPercent(40);
      setProgressStage('Extracting verified customer reviews & rating distribution...');

      const targetLimit = isMaxReviews ? 10000 : maxReviews;
      const requestMode = isMaxReviews ? 'all' : 'limit';

      // Call universal scraper orchestrator for e-commerce
      const response = await api.scrapeUniversal({
        url: targetUrl,
        category: 'ecommerce',
        platform: selectedPlatform,
        max_items: targetLimit,
        request_mode: requestMode,
      });

      setProgressPercent(80);
      setProgressStage('Executing 5 AI Intelligence Engines (Sentiment, Emotions, Intent, Emoji, Moderation)...');

      setEcommerceResult(response as any);

      // Save to History
      await historyService.saveHistoryItem({
        category: 'ecommerce',
        platform: selectedPlatform,
        url: targetUrl,
        title: (response as any).product?.title || `${selectedPlatform.toUpperCase()} Product Analysis`,
        inputType: 'url',
        result: response,
        summary: {
          totalComments: (response as any).summary?.total_comments || (response as any).comments?.length || 0,
          netSentiment: (response as any).summary?.net_sentiment_score,
          dominantSentiment: Object.entries((response as any).summary?.sentiment_distribution || {}).sort((a: any, b: any) => (Number(b[1]) || 0) - (Number(a[1]) || 0))[0]?.[0] || 'Positive',
          dominantEmotion: (response as any).summary?.dominant_emotion || 'Trust',
          flaggedCount: (response as any).summary?.moderation_summary?.flagged_count || 0,
        },
      });

      setProgressPercent(100);
      setProgressStage('Universal Scraper analysis complete!');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || err.message || 'Failed to analyze product. Please verify the URL and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Execute OPTION 2: Upload Reviews (CSV / Excel / JSON)
  const handleAnalyzeUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a CSV, Excel (.xlsx/.xls), or JSON file to upload.');
      return;
    }
    if (!columnMapping.text) {
      setErrorMessage('Please select which column contains the review text.');
      return;
    }

    setEcommerceResult(null);
    setErrorMessage(null);
    setLoading(true);
    setProgressPercent(20);
    setProgressStage(`Reading and parsing ${selectedFile.name}...`);

    try {
      setProgressPercent(50);
      setProgressStage('Normalizing review records, ratings, and deduplicating...');

      const response = await api.processScraperFile(
        selectedFile,
        selectedPlatform,
        columnMapping,
        manualTitle.trim() || undefined,
        manualBrand.trim() || undefined,
        manualPrice.trim() || undefined
      );

      setProgressPercent(85);
      setProgressStage('Executing 5 AI Intelligence Engines across imported reviews...');

      setEcommerceResult(response as any);

      // Save to History
      await historyService.saveHistoryItem({
        category: 'ecommerce',
        platform: selectedPlatform,
        title: manualTitle.trim() || selectedFile.name,
        inputType: 'file',
        result: response,
        summary: {
          totalComments: (response as any).summary?.total_comments || (response as any).comments?.length || 0,
          netSentiment: (response as any).summary?.net_sentiment_score,
          dominantSentiment: Object.entries((response as any).summary?.sentiment_distribution || {}).sort((a: any, b: any) => (Number(b[1]) || 0) - (Number(a[1]) || 0))[0]?.[0] || 'Positive',
          dominantEmotion: (response as any).summary?.dominant_emotion || 'Trust',
          flaggedCount: (response as any).summary?.moderation_summary?.flagged_count || 0,
        },
      });

      setProgressPercent(100);
      setProgressStage('Uploaded reviews analyzed successfully!');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || err.message || 'Failed to process uploaded file.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-dark">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-widest uppercase mb-2">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Universal Product Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            E-Commerce Review Analyzer
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Universal AI review scraper and sentiment engine supporting Amazon, Flipkart, Meesho, Myntra, AJIO, Snapdeal, eBay, Shopify & Uploads.
          </p>
        </div>

        {/* Global Action & Export Buttons when Result exists */}
        <div className="flex items-center gap-2.5">
          {ecommerceResult && (
            <UniversalExportButton
              category="ecommerce"
              platform={selectedPlatform}
              title={ecommerceResult.product?.title || 'Ecommerce_Reviews'}
              items={ecommerceResult.comments || []}
              summary={ecommerceResult.summary}
            />
          )}
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            ← Back to Platforms
          </Button>
        </div>
      </div>

      {/* INPUT METHODS CONTAINER: Exactly TWO Options */}
      <Card className="border border-border-dark bg-bg-card shadow-card-depth">
        {/* TWO Options Header Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-border-dark pb-5 mb-6">
          {/* Option 1: Search Product Without API (Universal Scraper) */}
          <button
            type="button"
            onClick={() => {
              setMethod('scraper');
              setErrorMessage(null);
            }}
            className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${
              method === 'scraper'
                ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/5'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Globe className="w-4 h-4 text-amber-400" />
                Option 1: Search Product Without API
              </div>
              <Badge variant="default" className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] font-bold">
                UNIVERSAL SCRAPER
              </Badge>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">
              Scrape product reviews, star ratings, reviewer names, dates, and verified purchase status directly from any store URL.
            </p>
          </button>

          {/* Option 2: Upload Reviews (Upload Product Reviews) */}
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
                Option 2: Upload Reviews
              </div>
              <Badge variant="default" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] font-bold">
                CSV / XLSX / JSON
              </Badge>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">
              Upload exported customer reviews with smart column mapping, optional product metadata, and full 5-module AI analysis.
            </p>
          </button>
        </div>

        {/* Multi-Platform Selector Pills */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Store className="w-3.5 h-3.5 text-accent-yellow" />
            Select Store / Platform
          </label>
          <div className="flex flex-wrap gap-2">
            {ECOMMERCE_PLATFORMS.map((plat) => {
              const isSelected = selectedPlatform === plat.id;
              return (
                <button
                  key={plat.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlatform(plat.id);
                    setErrorMessage(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    isSelected
                      ? `bg-gradient-to-r ${plat.color} shadow-sm font-bold scale-[1.02]`
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {plat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* OPTION 1: Universal Scraper (Without API) Form */}
        {method === 'scraper' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                  Paste {ECOMMERCE_PLATFORMS.find((p) => p.id === selectedPlatform)?.name || 'Store'} Product URL
                </label>
                <button
                  type="button"
                  onClick={handleUseSampleUrl}
                  className="text-xs text-accent-yellow hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Use Sample Flipkart URL</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder={`Paste ${selectedPlatform} product URL (e.g. Amazon, Flipkart, Meesho, Myntra, etc.)...`}
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
              availableCount={ecommerceResult?.product?.review_count}
              analyzedCount={ecommerceResult?.comments?.length}
              label="Reviews to Analyze"
              itemType="reviews"
              disabled={loading}
            />

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="md"
                loading={loading}
                icon={<Sparkles className="w-4 h-4" />}
                onClick={handleAnalyzeUrl}
                disabled={!url.trim()}
              >
                Scrape & Analyze Product Reviews →
              </Button>
            </div>
          </div>
        )}

        {/* OPTION 2: Upload Reviews (Upload Product Reviews) Form */}
        {method === 'upload' && (
          <div className="space-y-5">
            {/* Optional Product Metadata Input */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-accent-yellow" />
                Optional Product Metadata
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Product Title</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="e.g. Wireless Noise-Cancelling Headphones"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-accent-yellow"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Brand</label>
                  <input
                    type="text"
                    value={manualBrand}
                    onChange={(e) => setManualBrand(e.target.value)}
                    placeholder="e.g. Sony, Apple, Samsung"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-accent-yellow"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Price</label>
                  <input
                    type="text"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="e.g. $199.99 or ₹14,999"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-accent-yellow"
                  />
                </div>
              </div>
            </div>

            {/* Hidden Native File Input */}
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
                  Drag and drop customer reviews dataset here
                </h4>
                <p className="text-xs text-text-muted mb-4">
                  Supports CSV, Excel (.xlsx, .xls), and JSON files up to 50MB
                </p>
                <Button variant="outline" size="sm" type="button">
                  Browse Reviews File
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
                        {(selectedFile.size / 1024).toFixed(1)} KB • {filePreview?.total_rows || 0} reviews detected
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1">
                          Review Text Column <span className="text-accent-yellow">*</span>
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
                          Star Rating Column (optional)
                        </label>
                        <select
                          value={columnMapping.rating}
                          onChange={(e) => setColumnMapping({ ...columnMapping, rating: e.target.value })}
                          className="w-full bg-bg-primary border border-border-dark rounded-lg px-3 py-2 text-xs text-white"
                        >
                          <option value="">Auto-Detect / None</option>
                          {filePreview.columns.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1">
                          Reviewer Name Column (optional)
                        </label>
                        <select
                          value={columnMapping.username}
                          onChange={(e) => setColumnMapping({ ...columnMapping, username: e.target.value })}
                          className="w-full bg-bg-primary border border-border-dark rounded-lg px-3 py-2 text-xs text-white"
                        >
                          <option value="">Auto-Generate</option>
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
                        onClick={handleAnalyzeUpload}
                        disabled={!columnMapping.text}
                      >
                        Process & Analyze Reviews File →
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress bar */}
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

        {/* Error banner */}
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

      {/* RESULT DASHBOARD SECTION */}
      {ecommerceResult && !errorMessage && (
        <AnalysisDashboardView
          platform={selectedPlatform}
          title={ecommerceResult.product?.title || manualTitle || 'E-Commerce Product Review Analysis'}
          productMeta={ecommerceResult.product}
          comments={ecommerceResult.comments}
          summary={ecommerceResult.summary}
          rawResponse={ecommerceResult}
          onCommentSelect={setSelectedReview}
          requestedCount={isMaxReviews ? 'ALL' : maxReviews}
          reportedCount={ecommerceResult.reported_count ?? ecommerceResult.audit?.reported_reviews ?? ecommerceResult.product?.review_count}
          extractedCount={ecommerceResult.extracted_count ?? ecommerceResult.audit?.retrieved_reviews ?? ecommerceResult.comments?.length}
          analyzedCount={ecommerceResult.analyzed_count ?? ecommerceResult.audit?.analyzed_reviews ?? ecommerceResult.comments?.length}
          status={ecommerceResult.status || (ecommerceResult.reviews_blocked ? 'Blocked' : 'Complete')}
        />
      )}

      {/* Review Modal */}
      <CommentDetailModal
        comment={selectedReview}
        isOpen={Boolean(selectedReview)}
        onClose={() => setSelectedReview(null)}
      />
    </div>
  );
};
export default EcommerceAnalyzerPage;
