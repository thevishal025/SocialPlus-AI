import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Code2, Loader2, ChevronDown } from 'lucide-react';
import { api } from '../../api/client';

interface UniversalExportButtonProps {
  category: 'youtube' | 'meta' | 'ecommerce';
  platform: string;
  title: string;
  items: any[];
  summary?: any;
  className?: string;
}

export const UniversalExportButton: React.FC<UniversalExportButtonProps> = ({
  category,
  platform,
  title,
  items,
  summary,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const handleExport = async (format: 'csv' | 'xlsx' | 'json') => {
    if (!items || items.length === 0) return;
    setExportingFormat(format);
    try {
      const blob = await api.exportScraperData({
        format,
        category,
        platform,
        title,
        items,
        summary,
      });

      const cleanTitle = (title || `${category}_${platform}_export`)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 40);
      const filename = `${cleanTitle}_${new Date().toISOString().slice(0, 10)}.${format}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to export data:', err);
      alert('Failed to export dataset. Please try again.');
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!items || items.length === 0 || exportingFormat !== null}
        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exportingFormat ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span>Export Raw Data</span>
        <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl z-50 py-1 divide-y divide-slate-800">
            <div className="px-3 py-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Choose Export Format ({items.length} items)
            </div>
            <div className="py-1">
              <button
                onClick={() => handleExport('csv')}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-yellow-500/10 hover:text-yellow-400 text-left transition-colors"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-medium">Export CSV</div>
                  <div className="text-[10px] text-slate-400">Comma-separated with UTF-8 BOM</div>
                </div>
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-yellow-500/10 hover:text-yellow-400 text-left transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-400" />
                <div>
                  <div className="font-medium">Export Excel (.xlsx)</div>
                  <div className="text-[10px] text-slate-400">Multi-sheet with summary</div>
                </div>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-yellow-500/10 hover:text-yellow-400 text-left transition-colors"
              >
                <Code2 className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-medium">Export JSON</div>
                  <div className="text-[10px] text-slate-400">Standard formatted records</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

