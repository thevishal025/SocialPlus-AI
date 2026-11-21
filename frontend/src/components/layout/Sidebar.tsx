import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  BarChart3,
  Heart,
  Target,
  Smile,
  ShieldAlert,
  MessageSquare,
  FileSpreadsheet,
  Layers,
  Settings,
  Sparkles,
  ChevronRight,
  Zap,
  ShoppingBag,
  Youtube,
  Instagram,
  History,
  Info,
  X,
} from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  activeSource?: { title: string; count: number };
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeSource }) => {
  // Navigation structure preserving every route
  const navSections = [
    {
      label: 'MAIN NAVIGATION',
      items: [
        { name: 'Home Landing', to: '/', icon: Home },
        { name: 'About Analyzer', to: '/about', icon: Info },
        { name: 'Analysis History', to: '/history', icon: History },
      ],
    },
    {
      label: 'ANALYSIS PLATFORMS',
      items: [
        { name: 'YouTube Analytics', to: '/analyze/youtube', icon: Youtube, color: 'text-red-500' },
        { name: 'Meta (IG + FB)', to: '/analyze/meta', icon: Layers, color: 'text-pink-500' },
        { name: 'E-Commerce Analytics', to: '/analyze/ecommerce', icon: ShoppingBag, color: 'text-amber-400' },
      ],
    },
    {
      label: 'ANALYSIS RESULTS & ENGINES',
      items: [
        { name: 'Executive Overview', to: '/overview', icon: LayoutDashboard },
        { name: 'Sentiment Intelligence', to: '/sentiment', icon: BarChart3, color: 'text-accent-yellow' },
        { name: 'Emotional Intelligence', to: '/emotions', icon: Heart, color: 'text-rose-400' },
        { name: 'Intent Intelligence', to: '/intent', icon: Target, color: 'text-sky-400' },
        { name: 'Emoji Intelligence', to: '/emojis', icon: Smile, color: 'text-amber-400' },
        { name: 'Auto Moderation', to: '/moderation', icon: ShieldAlert, color: 'text-emerald-400' },
        { name: 'Comment Explorer', to: '/comments', icon: MessageSquare },
      ],
    },
    {
      label: 'OUTPUT & SYSTEM',
      items: [
        { name: 'Reports', to: '/reports', icon: FileSpreadsheet },
        { name: 'Integrations', to: '/integrations', icon: Layers },
        { name: 'Settings', to: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Dark Backdrop Overlay on all viewports when sidebar is open */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/75 backdrop-blur-sm z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Sidebar Drawer */}
      <aside
        className={clsx(
          'fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-80 bg-bg-secondary border-r border-border-dark flex flex-col transition-transform duration-300 ease-in-out shadow-2xl',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header with Close Button */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border-dark shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-yellow/15 border border-accent-yellow/40 flex items-center justify-center text-accent-yellow shadow-glow-sm">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1 leading-none">
                <span className="font-extrabold text-base tracking-tight text-white">
                  Social<span className="text-accent-yellow">Plus</span>
                </span>
                <span className="text-[11px] font-bold text-accent-gold">.ai</span>
              </div>
              <p className="text-[9px] font-bold tracking-widest text-text-muted uppercase mt-0.5">
                COMMENT INTELLIGENCE
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close menu"
            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 border border-transparent hover:border-border-dark transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Analysis Context Widget */}
        {activeSource && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-bg-card border border-accent-yellow/30 shadow-glow-sm shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent-yellow">
              <Zap className="w-3.5 h-3.5" />
              <span>ACTIVE SESSION</span>
            </div>
            <p className="text-xs text-white font-medium truncate mt-1">
              {activeSource.title}
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
              <span>{activeSource.count} comments loaded</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
        )}

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.label} className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold tracking-wider text-text-muted uppercase">
                {section.label}
              </h4>
              <nav className="space-y-0.5 mt-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group select-none',
                          isActive
                            ? 'bg-accent-yellow/15 text-white border border-accent-yellow/40 shadow-glow-sm font-semibold'
                            : 'text-text-muted hover:text-white hover:bg-white/5'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-3">
                            <Icon
                              className={clsx(
                                'w-4 h-4 transition-colors',
                                isActive ? 'text-accent-yellow' : item.color || 'text-text-muted group-hover:text-slate-300'
                              )}
                            />
                            <span>{item.name}</span>
                          </div>
                          {isActive && <ChevronRight className="w-3.5 h-3.5 text-accent-yellow opacity-80" />}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-border-dark bg-bg-primary/40 shrink-0">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              5 AI Engines Online
            </span>
            <span className="font-mono text-[11px] text-accent-yellow">v2.1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};
