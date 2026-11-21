export type SentimentType = 'Positive' | 'Negative' | 'Neutral' | 'Mixed' | 'Sarcastic';

export type EmotionType = 
  | 'Joy' 
  | 'Love' 
  | 'Excitement' 
  | 'Anger' 
  | 'Sadness' 
  | 'Surprise' 
  | 'Fear' 
  | 'Disgust' 
  | 'Frustration' 
  | 'Curiosity'
  | 'Neutral';

export type IntentType = 
  | 'Questioning' 
  | 'Reply / Response' 
  | 'Appreciation' 
  | 'Complaint' 
  | 'Suggestion' 
  | 'Request' 
  | 'Feedback' 
  | 'Promotion' 
  | 'Spam' 
  | 'General Discussion';

export interface EmojiDetail {
  emoji: string;
  count: number;
  sentiment_bias?: string;
  emotion_association?: string;
  context_note?: string;
}

export interface CommentAnalysis {
  sentiment: SentimentType;
  sentiment_confidence: number;
  sentiment_scores?: {
    positive: number;
    negative: number;
    neutral: number;
    sarcastic?: number;
  };
  dominant_emotion: EmotionType;
  emotions: Array<{ emotion: EmotionType; score: number }>;
  intent: IntentType;
  intent_confidence: number;
  emojis: string[];
  emoji_details?: EmojiDetail[];
  emoji_only: boolean;
  spam_probability: number;
  spam_signals?: string[];
  toxicity_score: number;
  toxicity_categories?: {
    harassment?: number;
    hate_speech?: number;
    threats?: number;
    insult?: number;
  };
  is_duplicate?: boolean;
  duplicate_count?: number;
  moderation_action_recommended: 'Clear' | 'Review' | 'Flag' | 'Hide' | 'Delete';
  moderation_reason?: string;
  language?: string;
}

export interface CommentItem {
  id: string;
  platform: 'youtube' | 'instagram' | 'uploaded';
  content_id: string;
  content_title: string;
  username: string;
  text: string;
  like_count: number;
  published_at?: string;
  parent_id?: string | null;
  is_reply?: boolean;
  source_type?: string;
  analysis: CommentAnalysis;
}

export interface VideoMetadata {
  id: string;
  platform: 'youtube' | 'instagram';
  title: string;
  channel?: string;
  thumbnail?: string;
  views?: number;
  likes?: number;
  published_at?: string;
  comment_count?: number;
}

export interface EngineSummary {
  total_comments: number;
  classified_comments: number;
  sentiment_distribution: {
    Positive: number;
    Negative: number;
    Neutral: number;
    Mixed: number;
    Sarcastic?: number;
  };
  sentiment_percentages: {
    Positive: number;
    Negative: number;
    Neutral: number;
    Mixed: number;
    Sarcastic?: number;
  };
  net_sentiment_score: number; // -100 to +100
  average_sentiment_confidence: number;
  
  emotion_distribution: Record<string, number>;
  emotion_percentages: Record<string, number>;
  dominant_emotion: string;
  
  intent_distribution: Record<string, number>;
  intent_percentages: Record<string, number>;
  
  top_emojis: Array<{ emoji: string; count: number; meaning: string }>;
  emoji_only_count: number;
  
  moderation_summary: {
    flagged_count: number;
    spam_count: number;
    toxic_count: number;
    duplicate_count: number;
    clean_count: number;
  };
}

export interface ImportSummary {
  total_rows_read: number;
  successfully_imported: number;
  duplicates_detected: number;
  invalid_rows_skipped: number;
  invalid_details?: string[];
  file_type: string;
  platform: string;
}

export interface FilePreviewResponse {
  filename: string;
  file_type: string;
  total_rows: number;
  columns: string[];
  suggested_mapping: {
    text: string | null;
    username: string | null;
    timestamp: string | null;
    likes: string | null;
    comment_id: string | null;
    parent_id: string | null;
    rating?: string | null;
  };
  preview_rows: Record<string, any>[];
}

export interface AnalysisResponse {
  job_id?: string;
  video?: VideoMetadata;
  comments: CommentItem[];
  summary: EngineSummary;
  notice?: string;
  import_summary?: ImportSummary;
  status?: 'complete' | 'partial' | 'blocked' | 'failed' | string;
  reported_count?: number;
  requested_count?: number | string;
  available_count?: number;
  extracted_count?: number;
  analyzed_count?: number;
}

export interface HealthResponse {
  status: string;
  integrations: {
    youtube_configured: boolean;
    rapidapi_configured: boolean;
    instagram_configured: boolean;
    instagram_mcp_configured?: boolean;
  };
  database: {
    status: string;
    engine: string;
  };
  models: {
    sentiment: string;
    emotion: string;
    intent: string;
    moderation: string;
  };
}

export interface IntegrationsStatusResponse {
  timestamp: string;
  youtube: {
    configured: boolean;
    provider?: string;
    status: string;
    quota_status?: string;
    last_test?: string;
    api_key_configured?: boolean;
    key_preview?: string;
  };
  instagram?: {
    configured: boolean;
    host?: string;
    provider?: string;
    status: string;
    quota_status?: string;
    quota_message?: string;
    last_test?: string;
    api_key_configured?: boolean;
    key_preview?: string;
  };
  rapidapi?: {
    configured: boolean;
    host?: string;
    provider_name?: string;
    status: string;
    quota_status?: string;
    quota_message?: string;
    last_test?: string;
    api_key_configured?: boolean;
    key_preview?: string;
  };
  mcp?: {
    configured: boolean;
    server_url?: string;
    status: string;
    tools_count?: number;
    last_test?: string;
  };
  instagram_mcp?: {
    configured: boolean;
    server_url?: string;
    status: string;
    discovered_tools_count?: number;
    primary_tool?: string;
    child_replies_tool?: string;
    last_test?: string;
  };
  diagnostics?: Record<string, { status: string; details?: string; tools_count?: number }>;
  all_systems_ready?: boolean;
}

export interface EcommerceProduct {
  platform: string;
  url: string;
  title: string;
  brand: string;
  image?: string;
  price?: string;
  description?: string;
  average_rating?: number;
  rating_count?: number;
  review_count?: number;
  specifications?: Record<string, string>;
}

export interface EcommerceAudit {
  reported_reviews: number;
  reported_ratings: number;
  reported_average_rating: number;
  retrieved_reviews: number;
  unique_reviews: number;
  analyzed_reviews: number;
}

export interface TopComplaint {
  name: string;
  mentions: number;
  percentage: number;
  excerpts: string[];
}

export interface ProductAspect {
  aspect: string;
  sentiment: string;
  mentions: number;
  percentage: number;
  excerpts: string[];
}

export interface EcommerceAnalysisResponse {
  success: boolean;
  reviews_blocked: boolean;
  message?: string;
  product: EcommerceProduct;
  audit: EcommerceAudit;
  comments: CommentItem[];
  summary: EngineSummary;
  top_complaints: TopComplaint[];
  product_strengths: ProductAspect[];
  product_weaknesses: ProductAspect[];
  verified_average_rating?: number;
  status?: 'complete' | 'partial' | 'blocked' | 'failed' | string;
  reported_count?: number;
  requested_count?: number | string;
  available_count?: number;
  extracted_count?: number;
  analyzed_count?: number;
}

export interface PlatformDetectionResult {
  url: string;
  is_valid: boolean;
  platform: string;
  category: 'youtube' | 'meta' | 'ecommerce' | 'unsupported';
  display_name: string;
  supported: boolean;
}

export interface ScraperJobStatus {
  job_id: string;
  platform: string;
  method: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'partial' | 'blocked' | 'failed';
  stage: string;
  progress_percent: number;
  extracted_count: number;
  unique_count: number;
  duplicate_count: number;
  pages_processed: number;
  requested_count: number;
  error_message?: string;
  can_switch_to_csv: boolean;
  duration_seconds: number;
  has_result: boolean;
}

export interface MetaStatusResponse {
  category: string;
  platforms: {
    instagram: {
      name: string;
      official_api_configured: boolean;
      rapidapi_configured: boolean;
      without_api_available: boolean;
      upload_available: boolean;
    };
    facebook: {
      name: string;
      official_api_configured: boolean;
      without_api_available: boolean;
      upload_available: boolean;
    };
  };
}
