import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnalysisProvider } from './context/AnalysisContext';
import { Shell } from './components/layout/Shell';

// Redesigned & New Pages
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { HistoryPage } from './pages/HistoryPage';
import { YouTubeAnalyzerPage } from './pages/YouTubeAnalyzerPage';
import { MetaAnalyzerPage } from './pages/MetaAnalyzerPage';
import { InstagramAnalyzerPage } from './pages/InstagramAnalyzerPage';
import { EcommerceAnalyzerPage } from './pages/EcommerceAnalyzerPage';

// Preserved Core Pages & Deep-Dive Engine Pages
import { OverviewPage } from './pages/OverviewPage';
import { AnalyzeContentPage } from './pages/AnalyzeContentPage';
import { SentimentPage } from './pages/SentimentPage';
import { EmotionalPage } from './pages/EmotionalPage';
import { IntentPage } from './pages/IntentPage';
import { EmojiPage } from './pages/EmojiPage';
import { ModerationPage } from './pages/ModerationPage';
import { CommentExplorerPage } from './pages/CommentExplorerPage';
import { ReportsPage } from './pages/ReportsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AnalysisProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Shell />}>
              {/* Main Landing Page */}
              <Route index element={<HomePage />} />

              {/* Navigation & Workflow Pages */}
              <Route path="about" element={<AboutPage />} />
              <Route path="history" element={<HistoryPage />} />

              {/* Dedicated Analysis Platform Pages */}
              <Route path="analyze/youtube" element={<YouTubeAnalyzerPage />} />
              <Route path="analyze/meta" element={<MetaAnalyzerPage />} />
              <Route path="analyze/instagram" element={<MetaAnalyzerPage />} />
              <Route path="analyze/ecommerce" element={<EcommerceAnalyzerPage />} />

              {/* Executive Overview & Preserved Route Aliases */}
              <Route path="overview" element={<OverviewPage />} />
              <Route path="analyze" element={<AnalyzeContentPage />} />
              <Route path="ecommerce" element={<EcommerceAnalyzerPage />} />

              {/* Five AI Intelligence Engines (Preserved Deep-Dives) */}
              <Route path="sentiment" element={<SentimentPage />} />
              <Route path="emotions" element={<EmotionalPage />} />
              <Route path="intent" element={<IntentPage />} />
              <Route path="emojis" element={<EmojiPage />} />
              <Route path="moderation" element={<ModerationPage />} />
              <Route path="comments" element={<CommentExplorerPage />} />

              {/* System Pages */}
              <Route path="reports" element={<ReportsPage />} />
              <Route path="integrations" element={<IntegrationsPage />} />
              <Route path="settings" element={<SettingsPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AnalysisProvider>
    </QueryClientProvider>
  );
}
