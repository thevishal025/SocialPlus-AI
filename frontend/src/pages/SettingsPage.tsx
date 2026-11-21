import React, { useState } from 'react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Settings as SettingsIcon, Database, Cpu, ShieldCheck, Check, Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [spamThreshold, setSpamThreshold] = useState(0.5);
  const [toxicityThreshold, setToxicityThreshold] = useState(0.25);
  const [minConfidence, setMinConfidence] = useState(0.6);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
            System & Engine Settings
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure AI model confidence gates, moderation strictness, and database parameters.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          icon={saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          onClick={handleSave}
        >
          {saved ? 'Saved Changes' : 'Save Preferences'}
        </Button>
      </div>

      {/* AI Engine Thresholds */}
      <Card>
        <CardHeader
          title="AI Intelligence Sensitivity Gates"
          subtitle="Adjust confidence thresholds for automated classifications"
          icon={<Cpu className="w-4 h-4 text-brand-purple" />}
        />

        <div className="space-y-5 text-xs">
          <div>
            <div className="flex justify-between font-medium text-slate-300 mb-1.5">
              <span>Spam Probability Threshold for Auto-Flagging</span>
              <strong className="text-white font-mono">{(spamThreshold * 100).toFixed(0)}%</strong>
            </div>
            <input
              type="range"
              min="0.2"
              max="0.9"
              step="0.05"
              value={spamThreshold}
              onChange={(e) => setSpamThreshold(Number(e.target.value))}
              className="w-full accent-brand-purple bg-navy-950"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Comments with spam probability above this value are routed to the moderation review queue.
            </p>
          </div>

          <div>
            <div className="flex justify-between font-medium text-slate-300 mb-1.5">
              <span>Toxicity & Hate Speech Sensitivity Gate</span>
              <strong className="text-white font-mono">{(toxicityThreshold * 100).toFixed(0)}%</strong>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={toxicityThreshold}
              onChange={(e) => setToxicityThreshold(Number(e.target.value))}
              className="w-full accent-rose-500 bg-navy-950"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Controls when profane or hostile remarks trigger human review notifications.
            </p>
          </div>

          <div>
            <div className="flex justify-between font-medium text-slate-300 mb-1.5">
              <span>Minimum Sentiment Model Confidence Filter</span>
              <strong className="text-white font-mono">{(minConfidence * 100).toFixed(0)}%</strong>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.95"
              step="0.05"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-full accent-brand-cyan bg-navy-950"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Lower-confidence predictions are labeled as Mixed / Audit Required for human inspection.
            </p>
          </div>
        </div>
      </Card>

      {/* Database & Runtime Info */}
      <Card>
        <CardHeader
          title="Database Architecture & Runtime"
          subtitle="SQLAlchemy ORM with PostgreSQL & SQLite multi-dialect support"
          icon={<Database className="w-4 h-4 text-emerald-400" />}
        />

        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-lg bg-navy-950/70 border border-white/5 space-y-2 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Database Engine:</span>
              <span className="text-white">PostgreSQL (Primary) / SQLite (Graceful Local)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ORM / Migrations:</span>
              <span className="text-white">SQLAlchemy 2.0 + Alembic</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Modular Models:</span>
              <span className="text-white">12 Domain Entity Tables</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Model Versioning:</span>
              <span className="text-emerald-400">v1.2.0 (Active)</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

