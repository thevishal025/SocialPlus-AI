import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, glow = false, ...props }) => {
  return (
    <div
      className={clsx(
        'glass-card p-5 relative overflow-hidden transition-all duration-200',
        glow && 'hover:border-brand-purple/40 hover:shadow-glow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; icon?: React.ReactNode }> = ({
  title,
  subtitle,
  action,
  icon,
}) => (
  <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
    <div className="flex items-center gap-3">
      {icon && (
        <div className="p-2 rounded-lg bg-navy-800 text-brand-purple border border-white/5">
          {icon}
        </div>
      )}
      <div>
        <h3 className="font-semibold text-slate-100 text-base">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
);

