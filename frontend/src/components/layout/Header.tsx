import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  History,
  Menu,
  X,
  Youtube,
  Instagram,
  ShoppingBag,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface HeaderProps {
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
  title?: string;
  subtitle?: string;
  totalComments?: number;
  netSentiment?: number;
  flaggedCount?: number;
  platform?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  isSidebarOpen = false,
  totalComments = 0,
  netSentiment = 0,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [platformsDropdownOpen, setPlatformsDropdownOpen] = useState(false);

  return (
    <header className="h-16 border-b border-border-dark bg-bg-secondary/95 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-colors">
      {/* LEFT: Sidebar Toggle Icon + SocialPlus.ai Logo & Tagline */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            title={isSidebarOpen ? 'Close Navigation Menu' : 'Open Navigation Menu (Engines & Platforms)'}
            aria-label="Toggle Navigation Menu"
            className={`p-2 rounded-xl transition-all select-none border ${
              isSidebarOpen
                ? 'bg-accent-yellow/15 text-accent-yellow border-accent-yellow/40 shadow-glow-sm'
                : 'text-text-muted hover:text-white hover:bg-white/5 border-border-dark'
            }`}
          >
            {isSidebarOpen ? <X className="w-5 h-5 text-accent-yellow" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-accent-yellow/15 border border-accent-yellow/40 flex items-center justify-center text-accent-yellow shadow-glow-sm group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 fill-current" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 leading-none">
              <span className="font-extrabold text-base tracking-tight text-white group-hover:text-accent-yellow transition-colors">
                Social<span className="text-accent-yellow">Plus</span>
              </span>
              <span className="text-[11px] font-bold text-accent-gold">.ai</span>
            </div>
            <span className="text-[9px] font-bold tracking-widest text-text-muted uppercase mt-0.5">
              COMMENT INTELLIGENCE
            </span>
          </div>
        </div>
      </div>

      {/* CENTER: Navigation Links (Home, About Analyzer, Platforms, History) */}
      <nav className="hidden md:flex items-center gap-1 lg:gap-2">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? 'bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30 shadow-glow-sm'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`
          }
        >
          Home
        </NavLink>

        <NavLink
          to="/about"
          className={({ isActive }) =>
            `px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? 'bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30 shadow-glow-sm'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`
          }
        >
          About Analyzer
        </NavLink>

        {/* Platforms Dropdown */}
        <div className="relative">
          <button
            onClick={() => setPlatformsDropdownOpen(!platformsDropdownOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              location.pathname.startsWith('/analyze')
                ? 'bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Platforms</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {platformsDropdownOpen && (
            <div
              className="absolute left-0 mt-2 w-52 rounded-xl bg-bg-card border border-border-dark p-2 shadow-card-hover z-40"
              onMouseLeave={() => setPlatformsDropdownOpen(false)}
            >
              <div
                onClick={() => {
                  setPlatformsDropdownOpen(false);
                  navigate('/analyze/youtube');
                }}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs font-semibold text-white transition-colors"
              >
                <div className="p-1.5 rounded-md bg-red-500/10 text-red-500 border border-red-500/30">
                  <Youtube className="w-3.5 h-3.5" />
                </div>
                <span>YouTube Analytics</span>
              </div>

              <div
                onClick={() => {
                  setPlatformsDropdownOpen(false);
                  navigate('/analyze/meta');
                }}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs font-semibold text-white transition-colors"
              >
                <div className="p-1.5 rounded-md bg-pink-500/10 text-pink-500 border border-pink-500/30">
                  <Instagram className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span>Meta Analytics</span>
                    <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-pink-500/20 text-pink-300">IG + FB</span>
                  </div>
                  <p className="text-[10px] text-text-muted">Instagram & Facebook</p>
                </div>
              </div>

              <div
                onClick={() => {
                  setPlatformsDropdownOpen(false);
                  navigate('/analyze/ecommerce');
                }}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs font-semibold text-white transition-colors"
              >
                <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span>E-Commerce Analytics</span>
                  <p className="text-[10px] text-text-muted">Amazon, Flipkart & more</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <NavLink
          to="/history"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? 'bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30 shadow-glow-sm'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`
          }
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </NavLink>
      </nav>

      {/* RIGHT: Live Stats & Subtle Yellow CTA */}
      <div className="flex items-center gap-3">
        {totalComments > 0 && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-bg-card border border-border-dark text-xs">
            <span className="text-text-muted">Loaded:</span>
            <span className="font-bold text-white">{totalComments}</span>
            <span className="text-slate-600">|</span>
            <span className="text-text-muted">Net:</span>
            <span className={`font-bold ${netSentiment >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netSentiment > 0 ? `+${netSentiment}` : netSentiment}
            </span>
          </div>
        )}

        {/* CTA Button: Subtle Yellow Accent */}
        <Button
          size="sm"
          variant="primary"
          icon={<Sparkles className="w-3.5 h-3.5" />}
          onClick={() => navigate('/')}
        >
          Analyze Now
        </Button>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="md:hidden p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/5"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="absolute top-16 left-0 right-0 bg-bg-card border-b border-border-dark p-4 flex flex-col gap-2 md:hidden z-40 shadow-card-hover">
          <NavLink
            to="/"
            onClick={() => setMobileNavOpen(false)}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            Home
          </NavLink>
          <NavLink
            to="/about"
            onClick={() => setMobileNavOpen(false)}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            About Analyzer
          </NavLink>
          <NavLink
            to="/history"
            onClick={() => setMobileNavOpen(false)}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-white/5 flex items-center gap-2"
          >
            <History className="w-4 h-4 text-accent-yellow" />
            <span>Analysis History</span>
          </NavLink>
          <div className="pt-2 border-t border-border-dark">
            <p className="px-3 text-[10px] uppercase font-bold text-text-muted mb-1">Platforms</p>
            <NavLink
              to="/analyze/youtube"
              onClick={() => setMobileNavOpen(false)}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-white/5 flex items-center gap-2"
            >
              <Youtube className="w-4 h-4 text-red-500" />
              <span>YouTube Analytics</span>
            </NavLink>
            <NavLink
              to="/analyze/meta"
              onClick={() => setMobileNavOpen(false)}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-white/5 flex items-center gap-2"
            >
              <Instagram className="w-4 h-4 text-pink-500" />
              <span>Meta Analytics (IG + FB)</span>
            </NavLink>
            <NavLink
              to="/analyze/ecommerce"
              onClick={() => setMobileNavOpen(false)}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-white/5 flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>E-Commerce Analytics</span>
            </NavLink>
          </div>
        </div>
      )}
    </header>
  );
};
