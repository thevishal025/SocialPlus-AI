import { CommentItem } from '../api/types';

/**
 * Comprehensive Multi-Lingual Stop Words Set
 * Covers:
 * - English standard grammatical words (pronouns, prepositions, conjunctions, auxiliary verbs)
 * - Social media chat slang and fillers (bro, u, ur, pls, etc.)
 * - Hindi & Hinglish stop words in Latin transliteration (hai, kya, kyu, bhai, etc.)
 * - Hindi stop words in Devanagari script (है, क्या, नहीं, etc.)
 */
export const STOP_WORDS = new Set([
  // English common stop words
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't",
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', "can't", 'cannot', 'could', "couldn't", 'did', "didn't", 'do', 'does', "doesn't", 'doing',
  "don't", 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', "hadn't", 'has', "hasn't",
  'have', "haven't", 'having', 'he', "he'd", "he'll", "he's", 'her', 'here', "here's", 'hers', 'herself',
  'him', 'himself', 'his', 'how', "how's", 'i', "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is',
  "isn't", 'it', "it's", 'its', 'itself', "let's", 'me', 'more', 'most', "mustn't", 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', "shan't", 'she', "she'd", "she'll", "she's", 'should',
  "shouldn't", 'so', 'some', 'such', 'than', 'that', "that's", 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', "there's", 'these', 'they', "they'd", "they'll", "they're", "they've",
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', "wasn't", 'we',
  "we'd", "we'll", "we're", "we've", 'were', "weren't", 'what', "what's", 'when', "when's", 'where',
  "where's", 'which', 'while', 'who', "who's", 'whom', 'why', "why's", 'with', "won't", 'would',
  "wouldn't", 'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself', 'yourselves',
  // Internet/Social fillers & chat slang
  'just', 'like', 'also', 'get', 'got', 'really', 'one', 'even', 'will', 'well', 'much', 'many',
  'make', 'see', 'look', 'now', 'know', 'think', 'please', 'pls', 'thank', 'thanks', 'bro', 'sir',
  'im', 'thats', 'dont', 'cant', 'wont', 'gonna', 'wanna', 'hey', 'hi', 'hello', 'ok', 'okay',
  'yeah', 'yes', 'nah', 'ur', 'u', 'r', 'dm', 'link', 'bio', 'guys', 'thing', 'things', 'video',
  'post', 'reel', 'reels', 'insta', 'instagram', 'youtube', 'phone', 'device', 'item', 'product',
  // Hindi & Hinglish stop words (Latin transliteration)
  'hai', 'hain', 'ho', 'tha', 'thi', 'the', 'hu', 'hoon', 'ka', 'ke', 'ki', 'ko', 'se', 'me', 'mein',
  'par', 'aur', 'ya', 'yaa', 'lekin', 'magar', 'bhi', 'toh', 'to', 'na', 'nahi', 'nahin', 'mat',
  'kya', 'kyu', 'kyun', 'kaise', 'kab', 'kaha', 'kahan', 'kaun', 'kis', 'kisi', 'jise', 'jisko',
  'jo', 'jab', 'tab', 'ab', 'sab', 'hum', 'tum', 'aap', 'mai', 'main', 'mera', 'meri', 'mere',
  'tera', 'teri', 'tere', 'apna', 'apni', 'apne', 'uska', 'uski', 'uske', 'inka', 'inki', 'inke',
  'unka', 'unki', 'unke', 'ye', 'yeh', 'wo', 'woh', 'aise', 'waise', 'karo', 'kar', 'kiya',
  'karna', 'karne', 'karke', 'rahe', 'raha', 'rahi', 'gaya', 'gayi', 'gaye', 'wala', 'wali', 'wale',
  'thoda', 'thodi', 'bahut', 'bohot', 'kuch', 'thik', 'theek', 'bas', 'log', 'bhai', 'yaar', 'ji',
  'hoga', 'hogi', 'hoge', 'karta', 'karti', 'karte', 'baat',
  // Hindi stop words (Devanagari script)
  'है', 'हैं', 'हो', 'था', 'थी', 'थे', 'हूँ', 'का', 'के', 'की', 'को', 'से', 'में', 'पर', 'और', 'या',
  'लेकिन', 'मगर', 'भी', 'तो', 'ना', 'नहीं', 'क्या', 'क्यों', 'कैसे', 'कब', 'कहाँ', 'कौन', 'जो',
  'जब', 'तब', 'अब', 'सब', 'हम', 'तुम', 'आप', 'मैं', 'मेरा', 'मेरी', 'मेरे', 'अपना', 'अपनी',
  'अपने', 'उसका', 'उसकी', 'उसके', 'यह', 'वह', 'इस', 'उस', 'इन', 'उन', 'कर', 'किया', 'करना',
  'करने', 'रहे', 'रहा', 'रही', 'गया', 'गई', 'गए', 'वाला', 'वाली', 'वाले', 'बहुत', 'कुछ', 'ठीक',
  'बस', 'लोग', 'जी', 'होगा', 'होगी', 'होंगे'
]);

export interface KeywordItem {
  word: string;
  count: number;
  percent: number;
}

/**
 * Format keyword capitalization cleanly (supports Latin Title Case & preserves Devanagari)
 */
export function formatKeywordDisplay(kw: string): string {
  return kw
    .split(' ')
    .map((word) => {
      if (!word) return '';
      if (/^[a-z]/i.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
}

/**
 * Aggressive Keyword Extraction:
 * - Removes punctuation and URLs
 * - Filters out all stop words
 * - Counts each keyword ONCE per comment (to represent prevalence % accurately)
 * - Sorts by frequency descending
 */
export function extractTopKeywords(comments: CommentItem[], maxCount = 25): KeywordItem[] {
  if (!comments || comments.length === 0) return [];
  const totalComments = comments.length;
  const keywordMap = new Map<string, number>();

  for (const c of comments) {
    if (!c.text) continue;
    const seenInComment = new Set<string>();

    // Strip URLs
    const sanitized = c.text.replace(/https?:\/\/\S+/g, ' ');

    // Match words including Latin and Devanagari Hindi characters
    const words = sanitized
      .toLowerCase()
      .match(/[\w\u0900-\u097F']+/gu) || [];

    for (const rawWord of words) {
      const cleanWord = rawWord.replace(/^'+|'+$/g, '');
      if (
        cleanWord.length >= 3 &&
        !STOP_WORDS.has(cleanWord) &&
        !/^\d+$/.test(cleanWord)
      ) {
        if (!seenInComment.has(cleanWord)) {
          seenInComment.add(cleanWord);
          keywordMap.set(cleanWord, (keywordMap.get(cleanWord) || 0) + 1);
        }
      }
    }
  }

  return Array.from(keywordMap.entries())
    .map(([word, count]) => ({
      word: formatKeywordDisplay(word),
      count,
      percent: totalComments > 0 ? Math.round((count / totalComments) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxCount);
}

