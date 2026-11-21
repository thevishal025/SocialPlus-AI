import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: {
    value: string | number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  accent?: 'purple' | 'blue' | 'emerald' | 'rose' | 'amber' | 'cyan';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  delta,
  icon,
  accent = 'purple',
  className,
}) => {
  const accentClasses = {
    purple: 'from-brand-purple/20 to-transparent border-brand-purple/30 text-brand-purple',
    blue: 'from-brand-blue/20 to-transparent border-brand-blue/30 text-brand-blue',
    emerald: 'from-emerald-500/20 to-transparent border-emerald-500/30 text-emerald-400',
    rose: 'from-rose-500/20 to-transparent border-rose-500/30 text-rose-400',
    amber: 'from-amber-500/20 to-transparent border-amber-500/30 text-amber-400',
    cyan: 'from-cyan-500/20 to-transparent border-cyan-500/30 text-cyan-400',
  };

  return (
    <div
      className={clsx(
        'glass-card p-5 relative overflow-hidden transition-all duration-200 group',
        'hover:border-white/20 hover:-translate-y-0.5',
        className
      )}
    >
      {/* Top subtle gradient highlight line */}
      <div
        className={clsx(
          'absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r',
          accentClasses[accent].split(' ')[0]
        )}
      />

      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <div className="mt-2 text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-baseline gap-2">
            {value}
          </div>
        </div>

        {icon && (
          <div
            className={clsx(
              'p-2.5 rounded-xl bg-navy-800/80 border border-white/5 transition-colors group-hover:scale-105',
              accentClasses[accent].split(' ').slice(2).join(' ')
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {(subtitle || delta) && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/5">
          <span>{subtitle}</span>
          {delta && (
            <div
              className={clsx(
                'inline-flex items-center gap-1 font-medium',
                delta.trend === 'up' && 'text-emerald-400',
                delta.trend === 'down' && 'text-rose-400',
                delta.trend === 'neutral' && 'text-slate-400'
              )}
            >
              {delta.trend === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
              {delta.trend === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
              {delta.trend === 'neutral' && <Minus className="w-3.5 h-3.5" />}
              <span>{delta.value}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

