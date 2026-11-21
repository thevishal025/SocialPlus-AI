import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAnalysis } from '../../context/AnalysisContext';
import { CommentDetailModal } from '../comments/CommentDetailModal';

export const Shell: React.FC = () => {
  // Requirement 1: Hide sidebar by default across all pages
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { result, selectedComment, setSelectedComment } = useAnalysis();

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col relative overflow-x-hidden">
      {/* Slide-in Overlay Sidebar (Hidden by default, slides in when toggled) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeSource={
          result?.video
            ? { title: result.video.title, count: result.comments.length }
            : undefined
        }
      />

      {/* Main Content Area - Always uses full screen width with no gap */}
      <div className="flex flex-col flex-1 w-full min-w-0">
        <Header
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
          isSidebarOpen={sidebarOpen}
          totalComments={result?.summary.total_comments}
          netSentiment={result?.summary.net_sentiment_score}
          flaggedCount={result?.summary.moderation_summary?.flagged_count}
          platform={result?.video?.platform}
        />

        <main className="flex-1 w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Comment Deep-Dive Modal */}
      <CommentDetailModal
        comment={selectedComment}
        isOpen={Boolean(selectedComment)}
        onClose={() => setSelectedComment(null)}
        onAction={(action) => {
          alert(`Moderator action: ${action.toUpperCase()} recorded for comment.`);
          setSelectedComment(null);
        }}
      />
    </div>
  );
};
