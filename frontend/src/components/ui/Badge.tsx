import React from 'react';
import clsx from 'clsx';
import { SentimentType } from '../../api/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'positive' | 'negative' | 'neutral' | 'mixed' | 'purple' | 'cyan' | 'outline' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
  sentiment?: SentimentType;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  sentiment,
}) => {
  let computedVariant = variant;
  if (sentiment) {
    if (sentiment === 'Positive') computedVariant = 'positive';
    else if (sentiment === 'Negative') computedVariant = 'negative';
    else if (sentiment === 'Neutral') computedVariant = 'neutral';
    else if (sentiment === 'Mixed') computedVariant = 'mixed';
    else if (sentiment === 'Sarcastic') computedVariant = 'purple';
  }

  const variantStyles = {
    default: 'bg-navy-800 text-slate-300 border border-white/10',
    positive: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    negative: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    neutral: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
    mixed: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
    danger: 'bg-red-600/20 text-red-400 border border-red-500/40 font-semibold',
    outline: 'bg-transparent text-slate-400 border border-white/15',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] leading-tight rounded-md font-medium',
    md: 'px-2.5 py-1 text-xs leading-normal rounded-md font-medium',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 transition-colors',
        variantStyles[computedVariant],
        sizeStyles[size],
        className
      )}
    >
      {computedVariant === 'positive' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {computedVariant === 'negative' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
      {computedVariant === 'neutral' && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
      {computedVariant === 'mixed' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
      {computedVariant === 'purple' && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
      {children}
    </span>
  );
};

