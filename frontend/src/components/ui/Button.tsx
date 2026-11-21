import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-accent-yellow hover:bg-accent-gold text-bg-primary font-bold shadow-glow-sm hover:shadow-glow-md focus:ring-accent-yellow border border-accent-gold/60',
    secondary: 'bg-bg-card hover:bg-bg-secondary text-text-primary border border-border-dark hover:border-border-light focus:ring-border-dark',
    outline: 'bg-transparent hover:bg-white/5 text-slate-200 border border-border-dark hover:border-accent-yellow/50 focus:ring-accent-yellow',
    danger: 'bg-rose-600/90 hover:bg-rose-600 text-white shadow-glow-rose focus:ring-rose-500 border border-rose-500/30',
    ghost: 'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};

