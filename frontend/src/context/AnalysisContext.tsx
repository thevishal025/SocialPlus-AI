import React, { createContext, useContext, useState, useEffect } from 'react';
import { AnalysisResponse, CommentItem, EcommerceAnalysisResponse } from '../api/types';

interface AnalysisContextType {
  result: AnalysisResponse | null;
  setResult: (res: AnalysisResponse | null) => void;
  ecommerceResult: EcommerceAnalysisResponse | null;
  setEcommerceResult: (res: EcommerceAnalysisResponse | null) => void;
  selectedComment: CommentItem | null;
  setSelectedComment: (comment: CommentItem | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (err: string | null) => void;
  loadSampleData: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const AnalysisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [result, setResultState] = useState<AnalysisResponse | null>(() => {
    const saved = localStorage.getItem('socialpulse_active_analysis');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [ecommerceResult, setEcommerceResultState] = useState<EcommerceAnalysisResponse | null>(() => {
    const saved = localStorage.getItem('socialpulse_active_ecommerce');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [selectedComment, setSelectedComment] = useState<CommentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setResult = (res: AnalysisResponse | null) => {
    setResultState(res);
    if (res) {
      localStorage.setItem('socialpulse_active_analysis', JSON.stringify(res));
    } else {
      localStorage.removeItem('socialpulse_active_analysis');
    }
  };

  const setEcommerceResult = (res: EcommerceAnalysisResponse | null) => {
    setEcommerceResultState(res);
    if (res) {
      localStorage.setItem('socialpulse_active_ecommerce', JSON.stringify(res));
    } else {
      localStorage.removeItem('socialpulse_active_ecommerce');
    }
  };

  const loadSampleData = () => {
    const sampleData: AnalysisResponse = {
      video: {
        id: 'dQw4w9WgXcQ',
        platform: 'youtube',
        title: 'Complete System Architecture Deep Dive & Modern Microservices Masterclass',
        channel: 'TechPulse Engineering',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        views: 342900,
        likes: 24890,
        comment_count: 5,
        published_at: '2026-10-15T12:00:00Z',
      },
      comments: [
        {
          id: 'c-101',
          platform: 'youtube',
          content_id: 'dQw4w9WgXcQ',
          content_title: 'Complete System Architecture Deep Dive & Modern Microservices Masterclass',
          username: 'rohit_developer',
          text: 'Bhai kya explanation tha! Outstanding clarity on distributed caching and saga patterns. Loved the visuals ❤️🔥',
          like_count: 42,
          published_at: '2026-10-15T14:22:10Z',
          analysis: {
            sentiment: 'Positive',
            sentiment_confidence: 0.94,
            dominant_emotion: 'Joy',
            emotions: [
              { emotion: 'Joy', score: 0.88 },
              { emotion: 'Excitement', score: 0.79 },
              { emotion: 'Love', score: 0.65 },
            ],
            intent: 'Appreciation',
            intent_confidence: 0.96,
            emojis: ['❤️', '🔥'],
            emoji_only: false,
            spam_probability: 0.02,
            toxicity_score: 0.01,
            moderation_action_recommended: 'Clear',
            language: 'Hinglish',
          },
        },
        {
          id: 'c-102',
          platform: 'youtube',
          content_id: 'dQw4w9WgXcQ',
          content_title: 'Complete System Architecture Deep Dive & Modern Microservices Masterclass',
          username: 'alex_turner',
          text: 'How do you handle event deduplication in high throughput Kafka clusters when outbox table is bottlenecked? 🤔',
          like_count: 19,
          published_at: '2026-10-15T15:10:45Z',
          analysis: {
            sentiment: 'Neutral',
            sentiment_confidence: 0.89,
            dominant_emotion: 'Curiosity',
            emotions: [
              { emotion: 'Curiosity', score: 0.92 },
              { emotion: 'Frustration', score: 0.22 },
            ],
            intent: 'Questioning',
            intent_confidence: 0.98,
            emojis: ['🤔'],
            emoji_only: false,
            spam_probability: 0.01,
            toxicity_score: 0.0,
            moderation_action_recommended: 'Clear',
            language: 'English',
          },
        },
        {
          id: 'c-103',
          platform: 'youtube',
          content_id: 'dQw4w9WgXcQ',
          content_title: 'Complete System Architecture Deep Dive & Modern Microservices Masterclass',
          username: 'crypto_trader_77',
          text: 'EARN $5000 DAILY WITH AUTOMATED CRYPTO SIGNALS! Click my link in bio to join VIP telegram group now!! 💰🚀',
          like_count: 0,
          published_at: '2026-10-15T16:04:12Z',
          analysis: {
            sentiment: 'Positive',
            sentiment_confidence: 0.65,
            dominant_emotion: 'Excitement',
            emotions: [{ emotion: 'Excitement', score: 0.72 }],
            intent: 'Promotion',
            intent_confidence: 0.99,
            emojis: ['💰', '🚀'],
            emoji_only: false,
            spam_probability: 0.98,
            spam_signals: ['Promotional financial solicitation', 'High-frequency spam keywords', 'External link bait'],
            toxicity_score: 0.15,
            moderation_action_recommended: 'Hide',
            moderation_reason: 'High confidence automated spam solicitation',
            language: 'English',
          },
        },
        {
          id: 'c-104',
          platform: 'youtube',
          content_id: 'dQw4w9WgXcQ',
          content_title: 'Complete System Architecture Deep Dive & Modern Microservices Masterclass',
          username: 'priya_k',
          text: 'Audio quality in the second half is really poor and echoey. Couldn’t understand anything after 34:00 😡👎',
          like_count: 11,
          published_at: '2026-10-15T17:15:33Z',
          analysis: {
            sentiment: 'Negative',
            sentiment_confidence: 0.92,
            dominant_emotion: 'Anger',
            emotions: [
              { emotion: 'Anger', score: 0.84 },
              { emotion: 'Frustration', score: 0.89 },
              { emotion: 'Sadness', score: 0.35 },
            ],
            intent: 'Complaint',
            intent_confidence: 0.95,
            emojis: ['😡', '👎'],
            emoji_only: false,
            spam_probability: 0.02,
            toxicity_score: 0.28,
            moderation_action_recommended: 'Review',
            moderation_reason: 'Frustrated user complaint regarding production quality',
            language: 'English',
          },
        },
        {
          id: 'c-105',
          platform: 'youtube',
          content_id: 'dQw4w9WgXcQ',
          content_title: 'Complete System Architecture Deep Dive & Modern Microservices Masterclass',
          username: 'vikram_singh',
          text: 'Yeh concept accha tha but can you make a follow up video focusing on Kubernetes deployment patterns? Please!',
          like_count: 8,
          published_at: '2026-10-15T18:40:02Z',
          analysis: {
            sentiment: 'Mixed',
            sentiment_confidence: 0.87,
            dominant_emotion: 'Excitement',
            emotions: [
              { emotion: 'Excitement', score: 0.74 },
              { emotion: 'Curiosity', score: 0.81 },
            ],
            intent: 'Suggestion',
            intent_confidence: 0.92,
            emojis: [],
            emoji_only: false,
            spam_probability: 0.01,
            toxicity_score: 0.0,
            moderation_action_recommended: 'Clear',
            language: 'Hinglish',
          },
        },
      ],
      summary: {
        total_comments: 5,
        classified_comments: 5,
        sentiment_distribution: {
          Positive: 2,
          Negative: 1,
          Neutral: 1,
          Mixed: 1,
        },
        sentiment_percentages: {
          Positive: 40.0,
          Negative: 20.0,
          Neutral: 20.0,
          Mixed: 20.0,
        },
        net_sentiment_score: 20.0,
        average_sentiment_confidence: 0.85,
        emotion_distribution: {
          Joy: 1,
          Curiosity: 2,
          Excitement: 2,
          Anger: 1,
          Frustration: 1,
          Love: 1,
        },
        emotion_percentages: {
          Joy: 20.0,
          Curiosity: 40.0,
          Excitement: 40.0,
          Anger: 20.0,
          Frustration: 20.0,
          Love: 20.0,
        },
        dominant_emotion: 'Curiosity & Excitement',
        intent_distribution: {
          Appreciation: 1,
          Questioning: 1,
          Promotion: 1,
          Complaint: 1,
          Suggestion: 1,
        },
        intent_percentages: {
          Appreciation: 20.0,
          Questioning: 20.0,
          Promotion: 20.0,
          Complaint: 20.0,
          Suggestion: 20.0,
        },
        top_emojis: [
          { emoji: '❤️', count: 1, meaning: 'Affection & Approval' },
          { emoji: '🔥', count: 1, meaning: 'High Excitement & Quality' },
          { emoji: '🤔', count: 1, meaning: 'Pondering & Deep Curiosity' },
          { emoji: '😡', count: 1, meaning: 'Frustration & Displeasure' },
          { emoji: '👎', count: 1, meaning: 'Disapproval' },
        ],
        emoji_only_count: 0,
        moderation_summary: {
          flagged_count: 2,
          spam_count: 1,
          toxic_count: 0,
          duplicate_count: 0,
          clean_count: 3,
        },
      },
      notice: 'Demo dataset loaded. Connect YouTube or Instagram to analyze live posts.',
    };

    setResult(sampleData);
  };

  return (
    <AnalysisContext.Provider
      value={{
        result,
        setResult,
        ecommerceResult,
        setEcommerceResult,
        selectedComment,
        setSelectedComment,
        loading,
        setLoading,
        error,
        setError,
        loadSampleData,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) throw new Error('useAnalysis must be used within an AnalysisProvider');
  return context;
};

