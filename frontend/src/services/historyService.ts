import { AnalysisResponse, EcommerceAnalysisResponse } from '../api/types';

export type HistoryCategory = 'youtube' | 'instagram' | 'ecommerce' | 'meta';
export type HistoryInputType = 'url' | 'csv' | 'excel' | 'manual' | 'file';

export interface HistoryItemSummary {
  totalComments: number;
  netSentiment?: number;
  dominantSentiment?: string;
  positivePercent?: number;
  dominantEmotion?: string;
  flaggedCount?: number;
}

export interface HistoryItem {
  id: string;
  category: HistoryCategory;
  platform: string;
  url?: string;
  title?: string;
  inputType: HistoryInputType;
  result: AnalysisResponse | EcommerceAnalysisResponse;
  timestamp: string;
  summary: HistoryItemSummary;
}

const DB_NAME = 'SocialPlusDB';
const DB_VERSION = 1;
const STORE_NAME = 'analysis_history';
const MAX_ITEMS_PER_CATEGORY = 10;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open database'));
  });
}

export const historyService = {
  /**
   * Saves a successful analysis record to IndexedDB, enforcing a maximum of 10 records per category.
   */
  async saveHistoryItem(
    item: Omit<HistoryItem, 'id' | 'timestamp'>
  ): Promise<HistoryItem> {
    const db = await openDB();

    // 1. Fetch current items for this category to enforce the 10 item cap
    const existingItems = await this.getHistoryByCategory(item.category);

    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newRecord: HistoryItem = {
      ...item,
      id,
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Enforce max 10 per category: delete oldest items if cap reached
      if (existingItems.length >= MAX_ITEMS_PER_CATEGORY) {
        // Sort ascending (oldest first)
        const sortedOldest = [...existingItems].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const toDeleteCount = (existingItems.length - MAX_ITEMS_PER_CATEGORY) + 1;
        for (let i = 0; i < toDeleteCount; i++) {
          store.delete(sortedOldest[i].id);
        }
      }

      const putRequest = store.put(newRecord);

      putRequest.onsuccess = () => resolve(newRecord);
      putRequest.onerror = () => reject(putRequest.error || new Error('Failed to save analysis history record'));
    });
  },

  /**
   * Retrieves up to 10 latest history items for a specific category, sorted newest first.
   */
  async getHistoryByCategory(category: HistoryCategory): Promise<HistoryItem[]> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('category');
      const request = index.getAll(category);

      request.onsuccess = () => {
        const items: HistoryItem[] = request.result || [];
        // Sort descending (newest first)
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Return maximum 10 items
        resolve(items.slice(0, MAX_ITEMS_PER_CATEGORY));
      };

      request.onerror = () => reject(request.error || new Error(`Failed to load history for ${category}`));
    });
  },

  /**
   * Retrieves a single history record by ID.
   */
  async getHistoryItemById(id: string): Promise<HistoryItem | null> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error(`Failed to retrieve history item ${id}`));
    });
  },

  /**
   * Deletes a single history record by ID.
   */
  async deleteHistoryItem(id: string): Promise<void> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error(`Failed to delete history item ${id}`));
    });
  },

  /**
   * Clears history. If a category is specified, only clears that category.
   * If omitted, clears all categories.
   */
  async clearHistory(category?: HistoryCategory): Promise<void> {
    const db = await openDB();

    if (!category) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error('Failed to clear history'));
      });
    }

    // Clear specific category
    const items = await this.getHistoryByCategory(category);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      items.forEach((item) => {
        store.delete(item.id);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error(`Failed to clear ${category} history`));
    });
  },
};

