import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, Code2, ChevronDown, Check, Loader2 } from 'lucide-react';
import { AnalysisResponse, EcommerceAnalysisResponse } from '../../api/types';
import { downloadHTMLReport, downloadPDFReport } from '../../utils/reportGenerator';

interface DownloadReportButtonProps {
  result: AnalysisResponse | EcommerceAnalysisResponse;
  platform?: string;
  title?: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({
  result,
  platform,
  title,
  variant = 'secondary',
  size = 'sm',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadingType, setDownloadingType] = useState<'pdf' | 'html' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleDownloadPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingType('pdf');
    try {
      // Small timeout for UI responsiveness
      await new Promise((resolve) => setTimeout(resolve, 100));
      downloadPDFReport(result, platform, title);
    } catch (err: any) {
      alert(`Could not generate PDF: ${err?.message || 'Unknown error'}`);
    } finally {
      setDownloadingType(null);
      setIsOpen(false);
    }
  };

  const handleDownloadHTML = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingType('html');
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      downloadHTMLReport(result, platform, title);
    } catch (err: any) {
      alert(`Could not generate HTML: ${err?.message || 'Unknown error'}`);
    } finally {
      setDownloadingType(null);
      setIsOpen(false);
    }
  };

  const buttonStyle =
    variant === 'primary'
      ? 'bg-accent-yellow hover:bg-accent-gold text-bg-primary font-bold shadow-glow-sm border border-accent-gold/60'
      : 'bg-bg-card hover:bg-bg-secondary text-text-primary border border-border-dark hover:border-accent-yellow/50';

  const sizeStyle = size === 'sm' ? 'px-3 py-1.5 text-xs gap-1.5' : 'px-4 py-2 text-sm gap-2';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 select-none ${buttonStyle} ${sizeStyle}`}
      >
        <Download className="w-3.5 h-3.5 text-accent-yellow shrink-0" />
        <span>Download Report</span>
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${isOpen ? 'rotate-180 text-accent-yellow' : ''}`} />
      </button>

      {/* Premium Dark Dropdown with Yellow Accents */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl bg-bg-card border border-border-dark p-1.5 shadow-card-hover z-50 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-text-muted border-b border-border-dark mb-1">
            Export Format
          </div>

          {/* Option 1: PDF */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloadingType !== null}
            className="w-full text-left flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 group transition-colors select-none"
          >
            <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30 group-hover:scale-105 transition-transform mt-0.5">
              {downloadingType === 'pdf' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-yellow" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-accent-yellow transition-colors">
                Download PDF
              </p>
              <p className="text-[10px] text-text-muted">Multi-page formatted document</p>
            </div>
          </button>

          {/* Option 2: HTML */}
          <button
            type="button"
            onClick={handleDownloadHTML}
            disabled={downloadingType !== null}
            className="w-full text-left flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 group transition-colors select-none"
          >
            <div className="p-1.5 rounded-md bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30 group-hover:scale-105 transition-transform mt-0.5">
              {downloadingType === 'html' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-yellow" />
              ) : (
                <Code2 className="w-3.5 h-3.5" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-accent-yellow transition-colors">
                Download HTML
              </p>
              <p className="text-[10px] text-text-muted">Self-contained browser report</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

