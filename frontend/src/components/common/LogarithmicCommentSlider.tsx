import React, { useMemo, useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const SLIDER_MIN = 1;
const SLIDER_MAX = 10000;
const MANUAL_MAX = 1000000;
const LN_10K = Math.log(SLIDER_MAX); // 9.210340371976184
const K = SLIDER_MAX - 1; // 9999

/**
 * Forward mapping: converts discrete value [1, 10000] to normalized slider position [0, 1]
 * For values > 10000, slider stays at max position (1.0).
 */
export function valueToLogPosition(value: number, sliderMax = SLIDER_MAX): number {
  if (value <= 1) return 0;
  if (value >= sliderMax) return 1;
  const t = (value - 1) / (sliderMax - 1);
  const pos = Math.log(1 + (sliderMax - 1) * t) / Math.log(sliderMax);
  return Math.max(0, Math.min(1, pos));
}

/**
 * Reverse mapping: converts normalized slider position [0, 1] to discrete value [1, 10000]
 */
export function logPositionToValue(sliderPosition: number, sliderMax = SLIDER_MAX): number {
  if (sliderPosition <= 0) return 1;
  if (sliderPosition >= 1) return sliderMax;
  const t = (Math.exp(sliderPosition * Math.log(sliderMax)) - 1) / (sliderMax - 1);
  const val = Math.round(1 + t * (sliderMax - 1));
  return Math.max(SLIDER_MIN, Math.min(sliderMax, val));
}

export interface LogarithmicCommentSliderProps {
  value: number;
  onChange: (value: number, isAll?: boolean, mode?: 'limit' | 'all') => void;
  isMax?: boolean;
  isAll?: boolean;
  onMaxChange?: (isAll: boolean) => void;
  onModeChange?: (mode: 'limit' | 'all') => void;
  mode?: 'limit' | 'all';
  reportedCount?: number;
  availableCount?: number;
  extractedCount?: number;
  analyzedCount?: number;
  maxLimit?: number;
  label?: string;
  itemType?: 'comments' | 'reviews';
  className?: string;
  disabled?: boolean;
}

// 8 exact logarithmic markers: 1, 10, 100, 500, 1K, 2K, 5K, 10K
const REFERENCE_TICKS = [
  { val: 1, label: '1' },
  { val: 10, label: '10' },
  { val: 100, label: '100' },
  { val: 500, label: '500' },
  { val: 1000, label: '1K' },
  { val: 2000, label: '2K' },
  { val: 5000, label: '5K' },
  { val: 10000, label: '10K' },
];

// Quick selection ranges
const QUICK_RANGES = [
  { label: '1–100', targetVal: 100 },
  { label: '100–500', targetVal: 500 },
  { label: '500–1000', targetVal: 1000 },
  { label: '1000–2000', targetVal: 2000 },
  { label: '2000–5000', targetVal: 5000 },
  { label: '5000–10K', targetVal: 10000 },
  { label: 'ALL', isAll: true },
];

export const LogarithmicCommentSlider: React.FC<LogarithmicCommentSliderProps> = ({
  value,
  onChange,
  isMax = false,
  isAll = false,
  onMaxChange,
  onModeChange,
  mode = 'limit',
  reportedCount,
  availableCount,
  extractedCount,
  analyzedCount,
  label = 'Comments to Analyze',
  itemType = 'comments',
  className = '',
  disabled = false,
}) => {
  const allActive = isAll || isMax || mode === 'all';

  // Manual input state (supports 1 to 1,000,000)
  const [inputText, setInputText] = useState<string>(
    allActive ? 'ALL' : value.toString()
  );

  useEffect(() => {
    if (allActive) {
      setInputText('ALL');
    } else {
      setInputText(value.toString());
    }
  }, [value, allActive]);

  // Normalized slider position [0, 1] for 1 to 10,000
  // If value > 10,000, slider remains pinned at 1.0 (100%) while preserving input number
  const currentSliderPos = useMemo(() => {
    if (allActive) return 1;
    return valueToLogPosition(value, SLIDER_MAX);
  }, [value, allActive]);

  // Slider drag handler (maps 0..1 to 1..10,000)
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pos = parseFloat(e.target.value);
    const newValue = logPositionToValue(pos, SLIDER_MAX);
    setInputText(newValue.toString());
    if (onMaxChange) onMaxChange(false);
    if (onModeChange) onModeChange('limit');
    onChange(newValue, false, 'limit');
  };

  // Manual numeric input change (accepts 1 to 1,000,000)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (raw.toUpperCase() === 'ALL') {
      handleToggleAll();
      return;
    }
    setInputText(raw);

    const parsed = parseInt(raw.replace(/,/g, ''), 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(SLIDER_MIN, Math.min(MANUAL_MAX, parsed));
      if (onMaxChange) onMaxChange(false);
      if (onModeChange) onModeChange('limit');
      onChange(clamped, false, 'limit');
    }
  };

  // Manual input blur validation
  const handleInputBlur = () => {
    if (allActive) return;
    const parsed = parseInt(inputText.replace(/,/g, ''), 10);
    if (isNaN(parsed) || parsed < SLIDER_MIN) {
      setInputText('1');
      if (onMaxChange) onMaxChange(false);
      if (onModeChange) onModeChange('limit');
      onChange(1, false, 'limit');
    } else if (parsed > MANUAL_MAX) {
      setInputText(MANUAL_MAX.toLocaleString());
      if (onMaxChange) onMaxChange(false);
      if (onModeChange) onModeChange('limit');
      onChange(MANUAL_MAX, false, 'limit');
    } else {
      setInputText(parsed.toString());
      if (onMaxChange) onMaxChange(false);
      if (onModeChange) onModeChange('limit');
      onChange(parsed, false, 'limit');
    }
  };

  // Toggle ALL button handler
  const handleToggleAll = () => {
    const nextAll = !allActive;
    if (onMaxChange) onMaxChange(nextAll);
    if (onModeChange) onModeChange(nextAll ? 'all' : 'limit');
    if (nextAll) {
      setInputText('ALL');
      onChange(value, true, 'all');
    } else {
      const fallback = Math.min(value, SLIDER_MAX);
      setInputText(fallback.toString());
      onChange(fallback, false, 'limit');
    }
  };

  // Click on reference tick marker
  const handleTickClick = (tickVal: number) => {
    if (disabled) return;
    setInputText(tickVal.toString());
    if (onMaxChange) onMaxChange(false);
    if (onModeChange) onModeChange('limit');
    onChange(tickVal, false, 'limit');
  };

  // Click on quick range pill
  const handleQuickRangeClick = (range: typeof QUICK_RANGES[0]) => {
    if (disabled) return;
    if (range.isAll) {
      handleToggleAll();
    } else if (range.targetVal) {
      if (onMaxChange) onMaxChange(false);
      if (onModeChange) onModeChange('limit');
      setInputText(range.targetVal.toString());
      onChange(range.targetVal, false, 'limit');
    }
  };

  const activePercent = allActive ? 100 : currentSliderPos * 100;

  // Audit display values
  const requestedDisplay = allActive ? 'ALL (Uncapped)' : value.toLocaleString();
  const availableDisplay = availableCount !== undefined ? availableCount.toLocaleString() : null;
  const extractedDisplay = extractedCount !== undefined ? extractedCount.toLocaleString() : null;
  const analyzedDisplay = analyzedCount !== undefined ? analyzedCount.toLocaleString() : null;
  const reportedDisplay = reportedCount !== undefined && reportedCount > 0 ? reportedCount.toLocaleString() : null;

  return (
    <div
      className={`bg-bg-secondary/70 border border-border-dark hover:border-border-light rounded-2xl p-4 sm:p-5 transition-all space-y-4 ${className}`}
    >
      {/* 1. TOP HEADER: Live Value Display & Numeric Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Live Value Display */}
        <div className="flex items-center gap-2">
          {allActive ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-accent-yellow/15 border border-accent-yellow/40 text-accent-yellow">
              <Sparkles className="w-4 h-4 text-accent-yellow animate-pulse" />
              <span className="text-sm font-extrabold tracking-tight">
                ALL – All Accessible {itemType === 'reviews' ? 'Reviews' : 'Comments'} (Uncapped)
              </span>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-xs sm:text-sm font-semibold text-text-muted">
                {label}:
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-accent-yellow tracking-tight">
                {value.toLocaleString()}
              </span>
              <span className="text-[11px] text-text-muted">
                {value > SLIDER_MAX ? '(manual custom quantity)' : '/ 10,000 slider scale'}
              </span>
            </div>
          )}
        </div>

        {/* Right side: Manual QTY input (1 to 1,000,000) & ALL Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Label is exactly "QTY" with editable numeric input beside it */}
          <div className="flex items-center gap-1.5 bg-bg-primary px-2.5 py-1 rounded-lg border border-border-dark focus-within:border-accent-yellow transition-colors">
            <span className="text-xs font-mono font-black text-accent-yellow tracking-wider">
              QTY
            </span>
            <input
              type="text"
              value={allActive ? 'ALL' : inputText}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              disabled={disabled}
              placeholder="1–1,000,000"
              className={`w-28 sm:w-32 px-2 py-0.5 rounded text-sm font-mono font-bold text-right bg-transparent outline-none transition-colors ${
                allActive
                  ? 'text-accent-yellow cursor-default'
                  : 'text-white'
              }`}
            />
          </div>

          {/* Dedicated ALL Button (Not MAX) */}
          <button
            type="button"
            onClick={handleToggleAll}
            disabled={disabled}
            title="Request all accessible comments progressively until genuine end of data"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border ${
              allActive
                ? 'bg-accent-yellow text-bg-primary border-accent-yellow shadow-glow-sm scale-105'
                : 'bg-bg-primary text-text-muted border-border-dark hover:text-white hover:border-accent-yellow/50 hover:bg-white/5'
            }`}
          >
            ALL
          </button>
        </div>
      </div>

      {/* 2. FOUR-TIER AUDIT METRIC BAR: Reported | Requested | Extracted | Analyzed */}
      {(extractedDisplay !== null || analyzedDisplay !== null || availableDisplay !== null) && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono py-2 px-3.5 rounded-xl bg-bg-primary border border-border-dark text-text-muted">
          <span className="text-[10px] uppercase font-bold text-slate-400">Data Audit:</span>
          {reportedDisplay && (
            <>
              <span className="flex items-center gap-1">
                <span>Reported Total:</span>
                <strong className="text-slate-300 font-bold">{reportedDisplay}</strong>
              </span>
              <span className="text-border-light font-bold">|</span>
            </>
          )}
          <span className="flex items-center gap-1">
            <span>Requested:</span>
            <strong className="text-white font-bold">{requestedDisplay}</strong>
          </span>
          <span className="text-border-light font-bold">|</span>
          <span className="flex items-center gap-1">
            <span>Extracted:</span>
            <strong className="text-accent-yellow font-bold">
              {extractedDisplay || availableDisplay || '0'}
            </strong>
          </span>
          <span className="text-border-light font-bold">|</span>
          <span className="flex items-center gap-1">
            <span>Analyzed:</span>
            <strong className="text-emerald-400 font-bold">
              {analyzedDisplay || extractedDisplay || '0'}
            </strong>
          </span>
        </div>
      )}

      {/* 3. QUICK SELECTION RANGES PILLS */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[11px] font-semibold text-text-muted mr-1">Quick Ranges:</span>
        {QUICK_RANGES.map((range) => {
          const isActive = range.isAll ? allActive : (!allActive && value === range.targetVal);
          return (
            <button
              key={range.label}
              type="button"
              onClick={() => handleQuickRangeClick(range)}
              disabled={disabled}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                isActive
                  ? 'bg-accent-yellow text-bg-primary border-accent-yellow font-bold shadow-glow-sm'
                  : 'bg-bg-primary/60 text-text-muted border-border-dark/60 hover:text-white hover:border-border-light hover:bg-white/5'
              }`}
            >
              {range.label}
            </button>
          );
        })}
      </div>

      {/* 4. LOGARITHMIC RANGE SLIDER (1 to 10,000) */}
      <div className="relative pt-1 pb-1">
        <input
          type="range"
          min={0}
          max={1}
          step={0.0001}
          value={currentSliderPos}
          onChange={handleSliderChange}
          disabled={disabled}
          className="log-range-slider"
          style={{
            background: `linear-gradient(to right, #FFD700 0%, #FFD700 ${activePercent}%, #262626 ${activePercent}%, #262626 100%)`,
          }}
          aria-label="Comment limit slider"
        />
      </div>

      {/* 5. 8 VISUAL LOGARITHMIC MARKERS: 1, 10, 100, 500, 1K, 2K, 5K, 10K */}
      <div className="relative pt-1">
        <div className="relative w-full h-5 text-[10px] font-mono font-semibold text-text-muted select-none">
          {REFERENCE_TICKS.map((tick, idx) => {
            const pos = valueToLogPosition(tick.val, SLIDER_MAX);
            const isFirst = idx === 0;
            const isLast = idx === REFERENCE_TICKS.length - 1;
            const isCurrent = !allActive && value === tick.val;

            return (
              <div
                key={tick.val}
                onClick={() => handleTickClick(tick.val)}
                className="absolute flex flex-col items-center cursor-pointer group"
                style={{
                  left: `${pos * 100}%`,
                  transform: isFirst
                    ? 'translateX(0%)'
                    : isLast
                    ? 'translateX(-100%)'
                    : 'translateX(-50%)',
                }}
                title={`Click to set limit to ${tick.val.toLocaleString()}`}
              >
                <div
                  className={`w-0.5 h-1.5 mb-1 transition-colors ${
                    isCurrent
                      ? 'bg-accent-yellow h-2'
                      : 'bg-border-dark group-hover:bg-accent-yellow/60'
                  }`}
                />
                <span
                  className={`transition-colors whitespace-nowrap ${
                    isCurrent
                      ? 'text-accent-yellow font-bold'
                      : 'text-text-muted group-hover:text-white'
                  }`}
                >
                  {tick.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Clear Scale Footnote */}
        <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border-dark/60 mt-1">
          <span className="flex items-center gap-1">
            <span className="text-text-muted/60">Min:</span>
            <span className="font-mono text-slate-300 font-semibold">1</span>
          </span>

          <span className="text-[10px] uppercase tracking-wider text-text-muted/60">
            Logarithmic Scale (1–10,000) • Manual QTY Up to 1,000,000
          </span>

          <span className="flex items-center gap-1">
            <span className="text-text-muted/60">Max Slider:</span>
            <span className="font-mono text-slate-300 font-semibold">
              10,000
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
