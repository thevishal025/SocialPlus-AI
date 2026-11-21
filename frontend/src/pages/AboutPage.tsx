import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Layers,
  FileCode2,
  Sparkles,
  BarChart3,
  History,
  ArrowRight,
  ArrowDown,
  Youtube,
  Instagram,
  ShoppingBag,
  Link,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      number: '1',
      title: 'OPEN SOCIALPLUS.AI',
      subtitle: 'Visit the Platform',
      description: 'Visit the SocialPlus.ai website from any browser or device.',
      icon: Globe,
      color: 'text-accent-yellow',
      borderColor: 'border-accent-yellow/40',
      bgColor: 'bg-accent-yellow/10',
    },
    {
      number: '2',
      title: 'SELECT YOUR PLATFORM',
      subtitle: '3 Target Channels',
      description: 'Choose between YouTube, Instagram, or E-Commerce (Amazon & Flipkart).',
      icon: Layers,
      color: 'text-accent-gold',
      borderColor: 'border-accent-gold/40',
      bgColor: 'bg-accent-gold/10',
      subBadges: [
        { label: 'YouTube', icon: Youtube, color: 'text-red-400' },
        { label: 'Instagram', icon: Instagram, color: 'text-pink-400' },
        { label: 'E-Commerce', icon: ShoppingBag, color: 'text-amber-400' },
      ],
    },
    {
      number: '3',
      title: 'CHOOSE YOUR INPUT METHOD',
      subtitle: 'Flexible Ingestion',
      description: 'Paste a video/post link, or upload your existing CSV / Excel comment file.',
      icon: FileCode2,
      color: 'text-accent-yellow',
      borderColor: 'border-accent-yellow/40',
      bgColor: 'bg-accent-yellow/10',
      subBadges: [
        { label: 'Paste Link', icon: Link },
        { label: 'Upload CSV', icon: FileSpreadsheet },
        { label: 'Upload Excel', icon: FileText },
      ],
    },
    {
      number: '4',
      title: 'START ANALYSIS',
      subtitle: 'Single-Click AI',
      description: 'Click the Analyze button to process the available comments with 5 AI engines.',
      icon: Sparkles,
      color: 'text-accent-gold',
      borderColor: 'border-accent-gold/40',
      bgColor: 'bg-accent-gold/10',
    },
    {
      number: '5',
      title: 'VIEW YOUR INSIGHTS',
      subtitle: 'Deep Intelligence',
      description: 'Explore sentiment breakdown, emotional meter, intent goals, word frequencies, and flags.',
      icon: BarChart3,
      color: 'text-accent-yellow',
      borderColor: 'border-accent-yellow/40',
      bgColor: 'bg-accent-yellow/10',
    },
    {
      number: '6',
      title: 'ACCESS YOUR HISTORY',
      subtitle: 'Saved Results',
      description: 'Return anytime to view previously completed analyses without re-running API calls.',
      icon: History,
      color: 'text-accent-gold',
      borderColor: 'border-accent-gold/40',
      bgColor: 'bg-accent-gold/10',
    },
  ];

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 border border-accent-yellow/30 text-accent-yellow text-xs font-bold tracking-widest uppercase mb-3">
          Workflow Architecture
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          About <span className="text-accent-yellow">SocialPlus.ai</span>
        </h1>
        <p className="text-sm sm:text-base text-text-muted mt-2 max-w-xl mx-auto">
          How SocialPlus.ai works: a simple 6-step walkthrough from ingestion to deep comment intelligence.
        </p>
      </div>

      {/* Visual Flowchart - Step by Step */}
      <div className="relative">
        <div className="space-y-4 sm:space-y-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.number} className="relative">
                {/* Step Card */}
                <div className="group rounded-2xl bg-bg-card border border-border-dark hover:border-accent-yellow/50 transition-all duration-300 p-5 sm:p-6 shadow-card-depth hover:shadow-card-hover flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    {/* Step Number with Yellow Glow */}
                    <div className="w-12 h-12 rounded-xl bg-bg-secondary border border-accent-yellow/40 text-accent-yellow font-black text-lg flex items-center justify-center shrink-0 shadow-glow-sm">
                      {step.number}
                    </div>

                    {/* Step Details */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-accent-yellow">
                          STEP {step.number}
                        </span>
                        <span className="text-slate-600">•</span>
                        <h2 className="text-base sm:text-lg font-bold text-white group-hover:text-accent-yellow transition-colors">
                          {step.title}
                        </h2>
                      </div>
                      <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-xl">
                        {step.description}
                      </p>

                      {/* Optional Sub-badges */}
                      {step.subBadges && (
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {step.subBadges.map((badge) => {
                            const BadgeIcon = badge.icon;
                            return (
                              <div
                                key={badge.label}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-secondary border border-border-dark text-[11px] font-medium text-slate-200"
                              >
                                <BadgeIcon className={`w-3.5 h-3.5 ${badge.color || 'text-accent-yellow'}`} />
                                <span>{badge.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Icon illustration */}
                  <div className="hidden sm:flex items-center justify-center w-14 h-14 rounded-2xl bg-bg-secondary border border-border-dark text-accent-yellow shrink-0 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                </div>

                {/* Connecting Arrow between steps */}
                {!isLast && (
                  <div className="flex justify-center my-2 sm:my-3">
                    <div className="w-8 h-8 rounded-full bg-bg-secondary border border-accent-yellow/30 text-accent-yellow flex items-center justify-center shadow-glow-sm">
                      <ArrowDown className="w-4 h-4 animate-bounce" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 text-center p-8 rounded-2xl bg-bg-card border border-border-dark shadow-card-depth">
        <h3 className="text-xl font-bold text-white mb-2">Ready to explore comment insights?</h3>
        <p className="text-xs sm:text-sm text-text-muted mb-6 max-w-md mx-auto">
          Start analyzing YouTube videos, Instagram posts, or e-commerce products in seconds.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            variant="primary"
            size="md"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/')}
          >
            Start Analyzing Now
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={<History className="w-4 h-4 text-accent-yellow" />}
            onClick={() => navigate('/history')}
          >
            View History
          </Button>
        </div>
      </div>
    </div>
  );
};

