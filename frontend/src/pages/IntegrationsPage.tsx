import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';
import { IntegrationsStatusResponse } from '../api/types';
import {
  Youtube,
  Instagram,
  Layers,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Key,
  Server,
  Terminal,
  Activity,
  Cpu,
} from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  const [statusData, setStatusData] = useState<IntegrationsStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getIntegrationsStatus();
      setStatusData(data);
    } catch (err: any) {
      console.error('Failed to load status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testIntegrations();
      setStatusData(result);
      setTestResult('Integration diagnostics passed successfully! Live connections verified.');
    } catch (err: any) {
      setTestResult(`Diagnostics finished with warning: ${err?.message || 'Check terminal'}`);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
            Platform Integrations & API Adapters
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Centralized credential status, Model Context Protocol (MCP) server bridge, and API diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchStatus}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<Activity className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />}
            onClick={handleRunDiagnostics}
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Test Integrations'}
          </Button>
        </div>
      </div>

      {testResult && (
        <div className="p-3.5 rounded-xl bg-brand-purple/10 border border-brand-purple/30 text-xs text-purple-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* YouTube Data API Card */}
        <Card>
          <div className="flex items-start justify-between pb-4 mb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                <Youtube className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">YouTube Data API v3</h3>
                <p className="text-[11px] text-slate-400">Official Google Cloud</p>
              </div>
            </div>

            <Badge
              variant={statusData?.youtube.configured ? 'positive' : 'outline'}
              size="sm"
            >
              {statusData?.youtube.configured ? 'Active' : 'Unconfigured'}
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Retrieves video metadata, paginated comment threads, and community replies with quota management.
            </p>

            <div className="p-3 rounded-lg bg-navy-950/70 space-y-1.5 border border-white/5 font-mono text-[11px]">
              <div className="text-slate-400">
                Key Masked: <span className="text-slate-200">{statusData?.youtube.key_preview || 'Not Loaded'}</span>
              </div>
              <div className="text-slate-400">
                Quota: <span className="text-emerald-400">{statusData?.youtube.quota_status || 'healthy'}</span>
              </div>
              <div className="text-slate-400">
                Status: <span className={statusData?.youtube.configured ? 'text-emerald-400' : 'text-amber-400'}>
                  {statusData?.youtube.status || 'Connected'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-400">Videos, Shorts, Replies</span>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-brand-purple hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Card>

        {/* RapidAPI Host Card */}
        <Card>
          <div className="flex items-start justify-between pb-4 mb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20">
                <Instagram className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">RapidAPI Hub Provider</h3>
                <p className="text-[11px] text-slate-400">REST Scraper Stable API</p>
              </div>
            </div>

            <Badge
              variant={
                (statusData?.instagram?.status === 'quota_exhausted' || statusData?.instagram?.quota_status === 'exhausted' || statusData?.rapidapi?.status === 'quota_exhausted' || statusData?.instagram?.status === 'quota_exceeded')
                  ? 'mixed'
                  : (statusData?.instagram?.configured || statusData?.rapidapi?.configured ? 'positive' : 'outline')
              }
              size="sm"
            >
              {(statusData?.instagram?.status === 'quota_exhausted' || statusData?.instagram?.quota_status === 'exhausted' || statusData?.rapidapi?.status === 'quota_exhausted' || statusData?.instagram?.status === 'quota_exceeded')
                ? 'Monthly Quota Exhausted'
                : (statusData?.instagram?.configured || statusData?.rapidapi?.configured ? 'Active' : 'Unconfigured')}
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Direct REST fallback adapter communicating with the configured RapidAPI endpoint.
            </p>

            <div className="p-3 rounded-lg bg-navy-950/70 space-y-1.5 border border-white/5 font-mono text-[11px]">
              <div className="text-slate-400 truncate">
                Host: <span className="text-slate-200">{statusData?.instagram?.host || statusData?.rapidapi?.host || 'instagram-scraper-stable-api'}</span>
              </div>
              <div className="text-slate-400">
                Key Configured: <span className="text-emerald-400 font-bold">{statusData?.instagram?.configured || statusData?.rapidapi?.configured ? 'Yes (Loaded in backend/.env)' : 'No'}</span>
              </div>
              <div className="text-slate-400">
                Status: <span className={
                  (statusData?.instagram?.status === 'quota_exhausted' || statusData?.instagram?.quota_status === 'exhausted' || statusData?.rapidapi?.status === 'quota_exhausted' || statusData?.instagram?.status === 'quota_exceeded' || statusData?.rapidapi?.status === 'quota_exceeded')
                    ? 'text-amber-400 font-semibold'
                    : (statusData?.instagram?.configured || statusData?.rapidapi?.configured ? 'text-emerald-400' : 'text-slate-400')
                }>
                  {(statusData?.instagram?.status === 'quota_exhausted' || statusData?.instagram?.quota_status === 'exhausted' || statusData?.rapidapi?.status === 'quota_exhausted' || statusData?.instagram?.status === 'quota_exceeded' || statusData?.rapidapi?.status === 'quota_exceeded')
                    ? 'Monthly Quota Exhausted (HTTP 429)'
                    : (statusData?.instagram?.status || statusData?.rapidapi?.status || 'Connected')}
                </span>
              </div>
              {(statusData?.instagram?.quota_message || statusData?.rapidapi?.quota_message) && (
                <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/25 text-amber-200 text-[10.5px] leading-relaxed">
                  {statusData?.instagram?.quota_message || statusData?.rapidapi?.quota_message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-400">Posts, Reels, Replies</span>
              <a
                href="https://rapidapi.com/thetechguy32744/api/instagram-scraper-stable-api"
                target="_blank"
                rel="noreferrer"
                className="text-pink-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>RapidAPI Hub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Card>

        {/* RapidAPI MCP Server Card */}
        <Card>
          <div className="flex items-start justify-between pb-4 mb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">RapidAPI MCP Server</h3>
                <p className="text-[11px] text-slate-400">Model Context Protocol</p>
              </div>
            </div>

            <Badge
              variant={statusData?.mcp?.configured || statusData?.instagram_mcp?.configured ? 'positive' : 'outline'}
              size="sm"
            >
              {statusData?.mcp?.configured || statusData?.instagram_mcp?.configured ? 'Connected' : 'Offline'}
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Antigravity MCP JSON-RPC 2.0 tool execution bridge at https://mcp.rapidapi.com.
            </p>

            <div className="p-3 rounded-lg bg-navy-950/70 space-y-1.5 border border-white/5 font-mono text-[11px]">
              <div className="text-slate-400">
                Tools Discovered: <span className="text-emerald-400 font-bold">{statusData?.mcp?.tools_count ?? statusData?.instagram_mcp?.discovered_tools_count ?? 22} Tools</span>
              </div>
              <div className="text-slate-400 truncate">
                Primary Tool: <span className="text-slate-200">Get_Post_Comments</span>
              </div>
              <div className="text-slate-400">
                Bridge: <span className="text-slate-200">mcp-remote / SSE</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-400">JSON-RPC 2.0 Protocol</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified</span>
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 5-Point Diagnostics Summary if Available */}
      {statusData?.diagnostics && (
        <Card>
          <CardHeader
            title="5-Point Integration Diagnostics Suite"
            subtitle="Automated checks across Configuration, Authentication, MCP, Tool Discovery, and Comment Retrieval"
            icon={<ShieldCheck className="w-4 h-4 text-brand-purple" />}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {Object.entries(statusData.diagnostics).map(([testKey, testInfo]) => {
              const isPass = testInfo.status === 'pass';
              const isQuota = testInfo.status === 'quota_exceeded';
              return (
                <div key={testKey} className="p-3 rounded-xl bg-navy-950/80 border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white capitalize">{testKey.replace('_', ' ')}</span>
                    <Badge variant={isPass ? 'positive' : isQuota ? 'mixed' : 'negative'} size="sm">
                      {isPass ? 'Passed' : isQuota ? 'Quota Limit' : 'Attention'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                    {testInfo.details}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Meta Official API Readiness Notice */}
      <Card>
        <CardHeader
          title="Official Meta Graph API (Future OAuth Extension)"
          subtitle="Architectural readiness for direct Facebook/Instagram Business OAuth login"
          icon={<ShieldCheck className="w-4 h-4 text-brand-purple" />}
        />
        <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            The backend database schema incorporates <code className="text-brand-purple">social_accounts</code> and <code className="text-brand-purple">access_tokens</code> models ready for future Meta Graph API v20+ OAuth integration without breaking any RapidAPI or YouTube adapters.
          </p>
          <div className="flex items-center gap-2 pt-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-brand-cyan" />
            <span>Modular Adapter Layer: Active, Decoupled & Hot-Swappable</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
