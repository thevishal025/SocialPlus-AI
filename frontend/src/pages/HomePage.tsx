import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Youtube, Instagram, ShoppingBag, ArrowRight, Sparkles, Layers, ShieldCheck, Zap } from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Subtle Yellow Ambient Background Glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[280px] bg-accent-yellow/10 rounded-full blur-[130px] pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* Main Hero Section - Strictly Flexbox Centered */}
      <div className="w-full flex-1 flex flex-col items-center justify-center text-center py-6 sm:py-10 max-w-4xl mx-auto">
        {/* 1. COMMENT INTELLIGENCE Badge */}
        <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-accent-yellow/10 border border-accent-yellow/30 text-accent-yellow text-xs font-extrabold tracking-widest uppercase mb-4 shadow-glow-sm select-none">
          <Sparkles className="w-3.5 h-3.5 fill-current text-accent-yellow" />
          <span>COMMENT INTELLIGENCE</span>
        </div>

        {/* 2. SocialPlus.ai Heading - Perfectly Centered, High Contrast & Subtle Glow */}
        <div className="relative w-full flex items-center justify-center my-2">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-tight text-center select-none">
            Social<span className="text-accent-yellow">Plus</span>
            <span className="text-accent-gold text-3xl sm:text-5xl md:text-6xl font-extrabold">.ai</span>
          </h1>
          <div
            className="absolute inset-0 bg-accent-yellow/15 blur-3xl -z-10 rounded-full max-w-md mx-auto pointer-events-none"
            aria-hidden="true"
          />
        </div>

        {/* 3. Short Description */}
        <p className="text-sm sm:text-base md:text-lg text-text-muted leading-relaxed max-w-xl mx-auto mt-3 text-center">
          Analyze comments, understand audience sentiment, and discover meaningful insights across platforms.
        </p>

        {/* 4. Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-6 text-xs text-text-muted">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border-dark shadow-sm">
            <Zap className="w-3.5 h-3.5 text-accent-yellow" />
            <span>5 AI Engines</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border-dark shadow-sm">
            <Layers className="w-3.5 h-3.5 text-accent-yellow" />
            <span>Multi-Platform</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border-dark shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-yellow" />
            <span>Auto Moderation</span>
          </div>
        </div>
      </div>

      {/* Three Interactive Platform Cards (Immediately Visible, Fits Desktop Screen) */}
      <div className="w-full pb-4">
        <div className="text-center mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Select an Analysis Platform
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {/* Card 1: YouTube Analytics */}
          <div
            onClick={() => navigate('/analyze/youtube')}
            className="group relative cursor-pointer rounded-2xl bg-bg-card border border-border-dark hover:border-accent-yellow/60 transition-all duration-300 p-6 flex flex-col justify-between shadow-card-depth hover:shadow-card-hover hover:-translate-y-1.5"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="w-13 h-13 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 group-hover:scale-110 transition-transform duration-200">
                <Youtube className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/5 text-text-muted border border-border-dark group-hover:border-accent-yellow/30 group-hover:text-accent-yellow transition-colors">
                Video
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-accent-yellow transition-colors mb-2">
                YouTube Analytics
              </h3>
              <p className="text-xs text-text-muted leading-relaxed mb-6">
                Analyze YouTube video comments, audience sentiment, and engagement insights.
              </p>
            </div>

            <div className="pt-4 border-t border-border-dark flex items-center justify-between">
              <span className="text-xs font-semibold text-accent-yellow flex items-center gap-1 group-hover:gap-2 transition-all">
                Analyze YouTube <ArrowRight className="w-3.5 h-3.5" />
              </span>
              <span className="text-[10px] text-text-muted">Link • CSV • Excel</span>
            </div>
          </div>

          {/* Card 2: Meta Analytics (Instagram + Facebook) */}
          <div
            onClick={() => navigate('/analyze/meta')}
            className="group relative cursor-pointer rounded-2xl bg-bg-card border border-border-dark hover:border-accent-yellow/60 transition-all duration-300 p-6 flex flex-col justify-between shadow-card-depth hover:shadow-card-hover hover:-translate-y-1.5"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="w-13 h-13 p-3 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-500 group-hover:scale-110 transition-transform duration-200 flex items-center justify-center">
                <Instagram className="w-7 h-7" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/30">
                  Instagram
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Facebook
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-accent-yellow transition-colors mb-2">
                Meta Analytics
              </h3>
              <p className="text-xs text-text-muted leading-relaxed mb-6">
                Analyze audience sentiment, comments, and engagement across Instagram and Facebook.
              </p>
            </div>

            <div className="pt-4 border-t border-border-dark flex items-center justify-between">
              <span className="text-xs font-semibold text-accent-yellow flex items-center gap-1 group-hover:gap-2 transition-all">
                Analyze Meta <ArrowRight className="w-3.5 h-3.5" />
              </span>
              <span className="text-[10px] text-text-muted">API • Scraper • Upload</span>
            </div>
          </div>

          {/* Card 3: E-Commerce Analytics */}
          <div
            onClick={() => navigate('/analyze/ecommerce')}
            className="group relative cursor-pointer rounded-2xl bg-bg-card border border-border-dark hover:border-accent-yellow/60 transition-all duration-300 p-6 flex flex-col justify-between shadow-card-depth hover:shadow-card-hover hover:-translate-y-1.5"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="w-13 h-13 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 group-hover:scale-110 transition-transform duration-200">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Flipkart
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30">
                  Amazon
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-accent-yellow transition-colors mb-2">
                E-Commerce Analytics
              </h3>
              <p className="text-xs text-text-muted leading-relaxed mb-6">
                Analyze product reviews and customer feedback from supported shopping platforms.
              </p>
            </div>

            <div className="pt-4 border-t border-border-dark flex items-center justify-between">
              <span className="text-xs font-semibold text-accent-yellow flex items-center gap-1 group-hover:gap-2 transition-all">
                Analyze E-Commerce <ArrowRight className="w-3.5 h-3.5" />
              </span>
              <span className="text-[10px] text-text-muted">URL • CSV • Reviews</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
