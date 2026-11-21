import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  historyService,
  HistoryCategory,
  HistoryItem,
} from '../services/historyService';
import { useAnalysis } from '../context/AnalysisContext';
import { AnalysisResponse, EcommerceAnalysisResponse } from '../api/types';
import {
  History,
  Youtube,
  Instagram,
  ShoppingBag,
  ExternalLink,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Link as LinkIcon,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { DownloadReportButton } from '../components/ui/DownloadReportButton';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { setResult, setEcommerceResult } = useAnalysis();

  const [activeTab, setActiveTab] = useState<HistoryCategory>('youtube');
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load history whenever tab changes
  useEffect(() => {
    loadCategoryHistory(activeTab);
  }, [activeTab]);

  const loadCategoryHistory = async (category: HistoryCategory) => {
    setLoading(true);
    setError(null);
    try {
      const records = await historyService.getHistoryByCategory(category);
      setItems(records);
    } catch (err: any) {
      setError(err?.message || 'Failed to load analysis history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setDeletingId(id);
      await historyService.deleteHistoryItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(`Could not delete item: ${err?.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearCategory = async () => {
    try {
      await historyService.clearHistory(activeTab);
      setItems([]);
      setConfirmClearOpen(false);
    } catch (err: any) {
      alert(`Could not clear history: ${err?.message || 'Unknown error'}`);
    }
  };

  // View saved result WITHOUT re-running API calls
  const handleViewAnalysis = (item: HistoryItem) => {
    if (item.category === 'ecommerce') {
      setEcommerceResult(item.result as EcommerceAnalysisResponse);
      navigate('/analyze/ecommerce');
    } else if (item.category === 'youtube') {
      setResult(item.result as AnalysisResponse);
      navigate('/analyze/youtube');
    } else {
      setResult(item.result as AnalysisResponse);
      navigate('/analyze/instagram');
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getInputTypeBadge = (inputType: string) => {
    switch (inputType) {
      case 'url':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-medium">
            <LinkIcon className="w-3 h-3" /> Live Link
          </span>
        );
      case 'csv':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium">
            <FileSpreadsheet className="w-3 h-3" /> CSV File
          </span>
        );
      case 'excel':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-medium">
            <FileText className="w-3 h-3" /> Excel File
          </span>
        );
      case 'manual':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-medium">
            Manual Entry
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-border-dark text-[10px]">
            {inputType}
          </span>
        );
    }
  };

  const getPlatformIcon = (category: HistoryCategory, platform?: string) => {
    if (category === 'youtube' || platform === 'youtube') {
      return (
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center shrink-0">
          <Youtube className="w-5 h-5" />
        </div>
      );
    }
    if (category === 'instagram' || platform === 'instagram') {
      return (
        <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-500 flex items-center justify-center shrink-0">
          <Instagram className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
        <ShoppingBag className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-dark mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 border border-accent-yellow/30 text-accent-yellow text-xs font-bold tracking-widest uppercase mb-2">
            <History className="w-3.5 h-3.5" />
            <span>Analysis Archive</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Analysis History
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Revisit previous results instantly without re-running API requests. Stored persistently in your browser.
          </p>
        </div>

        {items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
            onClick={() => setConfirmClearOpen(true)}
          >
            Clear {activeTab === 'youtube' ? 'YouTube' : activeTab === 'instagram' ? 'Instagram' : 'E-Commerce'} History
          </Button>
        )}
      </div>

      {/* Category Tabs: [ YouTube ] [ Instagram ] [ E-Commerce ] */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-bg-card border border-border-dark mb-6 w-full sm:w-auto self-start overflow-x-auto">
        <button
          onClick={() => setActiveTab('youtube')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'youtube'
              ? 'bg-accent-yellow text-bg-primary shadow-glow-sm font-bold'
              : 'text-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <Youtube className="w-4 h-4" />
          <span>YouTube History</span>
        </button>

        <button
          onClick={() => setActiveTab('instagram')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'instagram'
              ? 'bg-accent-yellow text-bg-primary shadow-glow-sm font-bold'
              : 'text-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <Instagram className="w-4 h-4" />
          <span>Instagram History</span>
        </button>

        <button
          onClick={() => setActiveTab('ecommerce')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'ecommerce'
              ? 'bg-accent-yellow text-bg-primary shadow-glow-sm font-bold'
              : 'text-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>E-Commerce History</span>
        </button>
      </div>

      {/* Confirmation Modal for Clearing Category History */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-bg-card border border-border-dark shadow-card-hover">
            <h3 className="text-lg font-bold text-white mb-2">Clear {activeTab} history?</h3>
            <p className="text-xs text-text-muted mb-6">
              This will remove all saved analysis records for this category from your local browser storage. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={() => setConfirmClearOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleClearCategory}>
                Yes, Clear All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-muted">Loading analysis history...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h4 className="text-base font-bold text-white">Error Loading History</h4>
          <p className="text-xs text-text-muted mt-1">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => loadCategoryHistory(activeTab)}
          >
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <div className="py-16 px-4 text-center rounded-2xl bg-bg-card border border-border-dark shadow-card-depth">
          <div className="w-14 h-14 rounded-2xl bg-bg-secondary border border-border-dark text-accent-yellow flex items-center justify-center mx-auto mb-4 shadow-glow-sm">
            <History className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            No {activeTab === 'youtube' ? 'YouTube' : activeTab === 'instagram' ? 'Instagram' : 'E-Commerce'} Analyses Yet
          </h3>
          <p className="text-xs text-text-muted max-w-md mx-auto mb-6">
            Whenever you run an analysis on {activeTab === 'youtube' ? 'YouTube' : activeTab === 'instagram' ? 'Instagram' : 'an e-commerce product'}, the results will automatically be saved here (up to 10 latest).
          </p>
          <Button
            variant="primary"
            size="md"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={() => {
              if (activeTab === 'youtube') navigate('/analyze/youtube');
              else if (activeTab === 'instagram') navigate('/analyze/instagram');
              else navigate('/analyze/ecommerce');
            }}
          >
            Start {activeTab === 'youtube' ? 'YouTube' : activeTab === 'instagram' ? 'Instagram' : 'E-Commerce'} Analysis
          </Button>
        </div>
      ) : (
        /* History Item Cards */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-text-muted px-1">
            <span>Showing latest {items.length} of max 10 records</span>
            <span>Click any record to restore full saved results</span>
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => handleViewAnalysis(item)}
              className="group cursor-pointer rounded-2xl bg-bg-card border border-border-dark hover:border-accent-yellow/60 transition-all duration-200 p-5 shadow-card-depth hover:shadow-card-hover flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {getPlatformIcon(item.category, item.platform)}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {getInputTypeBadge(item.inputType)}
                    <span className="text-[11px] text-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatDate(item.timestamp)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-accent-yellow transition-colors truncate">
                    {item.title || 'Untitled Analysis'}
                  </h3>

                  {item.url && (
                    <p className="text-xs text-text-muted truncate mt-0.5 flex items-center gap-1 max-w-lg">
                      <span className="truncate">{item.url}</span>
                    </p>
                  )}

                  {/* Summary Pills from Actual Saved Data */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-bg-secondary border border-border-dark text-slate-300">
                      <MessageSquare className="w-3 h-3 text-accent-yellow" />
                      <span className="font-semibold text-white">{item.summary.totalComments}</span> comments
                    </span>

                    {typeof item.summary.netSentiment === 'number' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-bg-secondary border border-border-dark text-slate-300">
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                        <span>Net Score:</span>
                        <span className={`font-bold ${item.summary.netSentiment >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {item.summary.netSentiment > 0 ? `+${item.summary.netSentiment}` : item.summary.netSentiment}
                        </span>
                      </span>
                    )}

                    {item.summary.dominantEmotion && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-bg-secondary border border-border-dark text-slate-300">
                        <span>Emotion:</span>
                        <span className="font-semibold text-accent-gold">{item.summary.dominantEmotion}</span>
                      </span>
                    )}

                    {typeof item.summary.flaggedCount === 'number' && item.summary.flaggedCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{item.summary.flaggedCount} Flags</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons: View Analysis, Download Report, Delete */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-border-dark shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewAnalysis(item);
                  }}
                >
                  View Analysis
                </Button>

                <DownloadReportButton
                  result={item.result}
                  platform={
                    item.category === 'youtube'
                      ? 'YouTube'
                      : item.category === 'instagram'
                      ? 'Instagram'
                      : item.platform || 'E-Commerce'
                  }
                  title={item.title}
                  variant="secondary"
                  size="sm"
                />

                <button
                  type="button"
                  title="Delete from history"
                  disabled={deletingId === item.id}
                  onClick={(e) => handleDeleteItem(e, item.id)}
                  className="p-2 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

