import axios from 'axios';
import {
  AnalysisResponse,
  CommentItem,
  HealthResponse,
  IntegrationsStatusResponse,
  FilePreviewResponse,
  EcommerceAnalysisResponse,
} from './types';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

export const api = {
  getHealth: async (): Promise<HealthResponse> => {
    const res = await apiClient.get<HealthResponse>('/health');
    return res.data;
  },

  getIntegrationsStatus: async (): Promise<IntegrationsStatusResponse> => {
    const res = await apiClient.get<IntegrationsStatusResponse>('/integrations/status');
    return res.data;
  },

  testIntegrations: async (): Promise<IntegrationsStatusResponse> => {
    const res = await apiClient.post<IntegrationsStatusResponse>('/integrations/test');
    return res.data;
  },

  analyzeYouTube: async (
    url: string,
    maxComments = 500,
    mode: 'limit' | 'all' = 'limit'
  ): Promise<AnalysisResponse> => {
    const res = await apiClient.post<AnalysisResponse>('/youtube/analyze', {
      url,
      max_comments: maxComments,
      mode,
    });
    return res.data;
  },

  analyzeInstagram: async (
    url: string,
    maxComments = 200,
    method: 'official_api' | 'automatic_without_api' | 'csv_upload' = 'automatic_without_api',
    mode: 'limit' | 'all' = 'limit'
  ): Promise<AnalysisResponse> => {
    const res = await apiClient.post<AnalysisResponse>('/instagram/analyze', {
      url,
      max_comments: maxComments,
      method,
      mode,
    });
    return res.data;
  },

  analyzeInstagramAutomatic: async (
    url: string,
    maxComments = 200
  ): Promise<AnalysisResponse> => {
    const res = await apiClient.post<AnalysisResponse>('/instagram/analyze-automatic', {
      url,
      max_comments: maxComments,
      method: 'automatic_without_api',
    });
    return res.data;
  },

  analyzeEcommerce: async (url: string, maxReviews = 50): Promise<EcommerceAnalysisResponse> => {
    const res = await apiClient.post<EcommerceAnalysisResponse>('/ecommerce/analyze', {
      url,
      max_reviews: maxReviews,
    });
    return res.data;
  },

  analyzeEcommerceManual: async (data: {
    title?: string;
    brand?: string;
    price?: string;
    reviews: Array<{ text: string; rating?: number; username?: string; date?: string; title?: string }>;
  }): Promise<EcommerceAnalysisResponse> => {
    const res = await apiClient.post<EcommerceAnalysisResponse>('/ecommerce/analyze-manual', data);
    return res.data;
  },

  previewUploaded: async (comments: string[]): Promise<AnalysisResponse> => {
    const res = await apiClient.post<AnalysisResponse>('/analysis/preview', {
      comments,
    });
    return res.data;
  },

  previewFile: async (file: File): Promise<FilePreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<FilePreviewResponse>('/ingestion/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  processFileImport: async (
    file: File,
    platform: 'youtube' | 'instagram',
    mapping: Record<string, string | null>,
    title?: string
  ): Promise<AnalysisResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('platform', platform);
    formData.append('mapping', JSON.stringify(mapping));
    if (title) formData.append('title', title);

    const res = await apiClient.post<AnalysisResponse>('/ingestion/process-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  submitManualComments: async (
    platform: 'youtube' | 'instagram',
    comments: Array<{ text: string; username?: string; timestamp?: string; likes?: number } | string>,
    title?: string
  ): Promise<AnalysisResponse> => {
    const res = await apiClient.post<AnalysisResponse>('/ingestion/manual', {
      platform,
      comments,
      title,
    });
    return res.data;
  },

  getComments: async (params?: Record<string, any>): Promise<{ comments: CommentItem[]; total: number }> => {
    const res = await apiClient.get('/comments', { params });
    return res.data;
  },

  getCommentDetail: async (commentId: string): Promise<CommentItem> => {
    const res = await apiClient.get(`/comments/${commentId}`);
    return res.data;
  },

  reviewModeration: async (
    commentId: string,
    action: 'approve' | 'flag' | 'ignore' | 'hide' | 'delete',
    notes?: string
  ) => {
    const res = await apiClient.post(`/moderation/${commentId}/review`, { action, notes });
    return res.data;
  },

  exportReport: async (format: 'csv' | 'pdf', filterParams?: Record<string, any>) => {
    const res = await apiClient.post(
      '/reports/export',
      { format, ...filterParams },
      { responseType: 'blob' }
    );
    return res.data;
  },

  // UNIVERSAL SCRAPER AI ENGINE ENDPOINTS
  scrapeUniversal: async (params: {
    url: string;
    category?: string;
    platform?: string;
    max_items?: number;
    mode?: 'limit' | 'all';
    request_mode?: 'limit' | 'all';
    method?: 'without_api' | 'official_api';
    job_id?: string;
  }): Promise<any> => {
    const res = await apiClient.post('/scraper/extract', params);
    return res.data;
  },

  detectPlatform: async (url: string) => {
    const res = await apiClient.get('/scraper/detect', { params: { url } });
    return res.data;
  },

  getScraperJob: async (jobId: string) => {
    const res = await apiClient.get(`/scraper/jobs/${jobId}`);
    return res.data;
  },

  exportScraperData: async (params: {
    category?: string;
    comments?: any[];
    items?: any[];
    format: 'csv' | 'xlsx' | 'json';
    platform?: string;
    title?: string;
    summary?: any;
  }): Promise<Blob> => {
    const payload = {
      ...params,
      comments: params.comments || params.items || [],
    };
    const res = await apiClient.post('/scraper/export', payload, { responseType: 'blob' });
    return res.data;
  },

  previewScraperFile: async (file: File): Promise<FilePreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<FilePreviewResponse>('/scraper/preview-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  processScraperFile: async (
    file: File,
    platform: string,
    mapping: Record<string, string | null>,
    title?: string,
    brand?: string,
    price?: string
  ): Promise<AnalysisResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('platform', platform);
    formData.append('mapping', JSON.stringify(mapping));
    if (title) formData.append('title', title);
    if (brand) formData.append('brand', brand);
    if (price) formData.append('price', price);
    const res = await apiClient.post<AnalysisResponse>('/scraper/process-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  // META (INSTAGRAM + FACEBOOK) ENDPOINTS
  analyzeMeta: async (params: {
    url: string;
    platform: 'instagram' | 'facebook';
    method: 'without_api' | 'official_api';
    max_comments?: number;
    mode?: 'limit' | 'all';
  }): Promise<AnalysisResponse> => {
    const res = await apiClient.post<AnalysisResponse>('/meta/analyze', params);
    return res.data;
  },

  getMetaStatus: async () => {
    const res = await apiClient.get('/meta/status');
    return res.data;
  },
};
