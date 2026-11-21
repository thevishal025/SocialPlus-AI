import React, { useState, useMemo } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { MetricCard } from '../components/ui/MetricCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DownloadReportButton } from '../components/ui/DownloadReportButton';
import { AnalysisDashboardView } from '../components/analysis/AnalysisDashboardView';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  Sparkles,
  TrendingUp,
  Heart,
  Target,
  ShieldAlert,
  ArrowRight,
  MessageSquare,
  ThumbsUp,
  Cpu,
  Youtube,
  Instagram,
  Layers,
  CheckCircle2,
  Hash,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Comprehensive Stop Words (English + Hindi/Hinglish in Latin & Devanagari)
const STOP_WORDS = new Set([
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
  'yeah', 'yes', 'nah', 'ur', 'dm', 'link', 'bio', 'guys', 'thing', 'things',
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

// Format keyword capitalization cleanly (supports Latin Title Case & preserves Devanagari)
const formatKeywordDisplay = (kw: string) => {
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
};

export const OverviewPage: React.FC = () => {
  const { result, setSelectedComment, loadSampleData } = useAnalysis();
  const navigate = useNavigate();
  const [platformFilter, setPlatformFilter] = useState<'all' | 'youtube' | 'instagram'>('all');
  const [showAllWords, setShowAllWords] = useState(false);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-violet to-brand-cyan flex items-center justify-center shadow-glow-md mb-6">
          <Sparkles className="w-8 h-8 text-white animate-pulse" />
        </div>
        <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
          Welcome to SOCIALPULSE AI
        </h2>
        <p className="mt-3 text-sm text-slate-400 max-w-lg leading-relaxed">
          Deep social media comment intelligence platform powered by 5 independent AI engines:
          Sentiment, Emotions, Intent, Emojis, and Auto Moderation.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button
            size="lg"
            variant="primary"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => navigate('/analyze')}
          >
            Analyze YouTube / Instagram
          </Button>
          <Button
            size="lg"
            variant="secondary"
            icon={<Cpu className="w-4 h-4" />}
            onClick={loadSampleData}
          >
            Load Sample Dataset
          </Button>
        </div>
      </div>
    );
  }

  const { summary: defaultSummary, comments, video, import_summary } = result;

  // Filter comments according to platform selection
  const filteredComments = useMemo(() => {
    if (platformFilter === 'all') return comments;
    return comments.filter((c) => c.platform?.toLowerCase() === platformFilter);
  }, [comments, platformFilter]);

  // Dynamic calculations when platform filter changes
  const computedSummary = useMemo(() => {
    if (platformFilter === 'all') return defaultSummary;

    const total = filteredComments.length;
    if (total === 0) {
      return {
        total_comments: 0,
        classified_comments: 0,
        average_sentiment_confidence: 0,
        net_sentiment_score: 0,
        dominant_emotion: 'None',
        sentiment_distribution: { Positive: 0, Negative: 0, Neutral: 0, Mixed: 0, Sarcastic: 0 },
        sentiment_percentages: { Positive: 0, Negative: 0, Neutral: 0, Mixed: 0, Sarcastic: 0 },
        emotion_distribution: {},
        emotion_percentages: {},
        intent_distribution: {},
        intent_percentages: {},
        top_emojis: [],
        emoji_only_count: 0,
        moderation_summary: { flagged_count: 0, spam_count: 0, toxic_count: 0, duplicate_count: 0, clean_count: 0 },
      };
    }

    const sentDist = { Positive: 0, Negative: 0, Neutral: 0, Mixed: 0, Sarcastic: 0 };
    const emoDist: Record<string, number> = {};
    const intentDist: Record<string, number> = {};
    let flagged = 0;
    let spam = 0;
    let toxic = 0;
    let dups = 0;

    for (const c of filteredComments) {
      const a = c.analysis;
      const s = (a.sentiment || 'Neutral') as keyof typeof sentDist;
      if (sentDist[s] !== undefined) sentDist[s]++;

      const emo = a.dominant_emotion || 'Neutral';
      emoDist[emo] = (emoDist[emo] || 0) + 1;

      const intent = a.intent || 'General Discussion';
      intentDist[intent] = (intentDist[intent] || 0) + 1;

      if (a.moderation_action_recommended && a.moderation_action_recommended !== 'Clear') flagged++;
      if (a.spam_probability && a.spam_probability > 0.5) spam++;
      if (a.toxicity_score && a.toxicity_score > 0.5) toxic++;
      if (c.is_reply) dups++;
    }

    const posPct = Math.round((sentDist.Positive / total) * 100);
    const negPct = Math.round((sentDist.Negative / total) * 100);
    const net = posPct - negPct;

    const sortedEmotions = Object.entries(emoDist).sort((a, b) => b[1] - a[1]);
    const dominant = sortedEmotions.length > 0 ? sortedEmotions[0][0] : 'Neutral';

    const emoPcts: Record<string, number> = {};
    Object.entries(emoDist).forEach(([k, v]) => {
      emoPcts[k] = total > 0 ? Math.round((v / total) * 100) : 0;
    });

    const intentPcts: Record<string, number> = {};
    Object.entries(intentDist).forEach(([k, v]) => {
      intentPcts[k] = total > 0 ? Math.round((v / total) * 100) : 0;
    });

    return {
      total_comments: total,
      classified_comments: total,
      average_sentiment_confidence: defaultSummary.average_sentiment_confidence || 0.85,
      net_sentiment_score: net,
      dominant_emotion: dominant,
      sentiment_distribution: sentDist,
      sentiment_percentages: {
        Positive: posPct,
        Negative: negPct,
        Neutral: Math.round(((sentDist.Neutral || 0) / total) * 100),
        Mixed: Math.round(((sentDist.Mixed || 0) / total) * 100),
        Sarcastic: Math.round(((sentDist.Sarcastic || 0) / total) * 100),
      },
      emotion_distribution: emoDist,
      emotion_percentages: emoPcts,
      intent_distribution: intentDist,
      intent_percentages: intentPcts,
      top_emojis: defaultSummary.top_emojis || [],
      emoji_only_count: defaultSummary.emoji_only_count || 0,
      moderation_summary: {
        flagged_count: flagged,
        spam_count: spam,
        toxic_count: toxic,
        duplicate_count: dups,
        clean_count: Math.max(0, total - flagged),
      },
    };
  }, [defaultSummary, filteredComments, platformFilter]);

  const ytCount = comments.filter((c) => c.platform?.toLowerCase() === 'youtube').length;
  const igCount = comments.filter((c) => c.platform?.toLowerCase() === 'instagram').length;

  const sentimentData = [
    { name: 'Positive', count: computedSummary.sentiment_distribution.Positive || 0, color: '#10B981' },
    { name: 'Negative', count: computedSummary.sentiment_distribution.Negative || 0, color: '#F43F5E' },
    { name: 'Neutral', count: computedSummary.sentiment_distribution.Neutral || 0, color: '#0EA5E9' },
    { name: 'Mixed', count: computedSummary.sentiment_distribution.Mixed || 0, color: '#F59E0B' },
  ];

  const emotionData = Object.entries(computedSummary.emotion_distribution || {})
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const intentData = Object.entries(computedSummary.intent_distribution || {})
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Word & Keyword Frequency Analysis with Smart Bigram Phrase Detection
  const keywordFrequency = useMemo(() => {
    if (!filteredComments || filteredComments.length === 0) {
      return [];
    }

    const totalComments = filteredComments.length;
    const wordFreqMap = new Map<string, number>();
    const wordCommentMap = new Map<string, Set<number>>();
    const bigramFreqMap = new Map<string, number>();
    const bigramCommentMap = new Map<string, Set<number>>();

    filteredComments.forEach((comment, idx) => {
      const rawText = comment.text || '';
      if (!rawText.trim()) return;

      // Normalize punctuation, clean URLs, and convert to lowercase
      const cleanText = rawText
        .replace(/https?:\/\/\S+/gi, ' ')
        .replace(/[’']/g, '')
        .toLowerCase();

      // Extract alphanumeric word tokens supporting English and Hindi (Latin + Devanagari)
      const rawTokens = cleanText.match(/[a-z\u0900-\u097F]{2,}/gu) || [];
      const meaningfulTokens: string[] = [];

      rawTokens.forEach((token) => {
        if (!STOP_WORDS.has(token) && token.length > 2) {
          meaningfulTokens.push(token);

          // Update word occurrences & unique comment tracking
          wordFreqMap.set(token, (wordFreqMap.get(token) || 0) + 1);
          if (!wordCommentMap.has(token)) {
            wordCommentMap.set(token, new Set());
          }
          wordCommentMap.get(token)!.add(idx);
        }
      });

      // Extract consecutive meaningful two-word phrases (bigrams)
      for (let i = 0; i < meaningfulTokens.length - 1; i++) {
        const w1 = meaningfulTokens[i];
        const w2 = meaningfulTokens[i + 1];
        if (w1 !== w2) {
          const bigram = `${w1} ${w2}`;
          bigramFreqMap.set(bigram, (bigramFreqMap.get(bigram) || 0) + 1);
          if (!bigramCommentMap.has(bigram)) {
            bigramCommentMap.set(bigram, new Set());
          }
          bigramCommentMap.get(bigram)!.add(idx);
        }
      }
    });

    const results: Array<{
      keyword: string;
      displayKeyword: string;
      frequency: number;
      commentCount: number;
      percentage: number;
      isPhrase: boolean;
    }> = [];

    wordFreqMap.forEach((freq, word) => {
      const commentCount = wordCommentMap.get(word)?.size || 1;
      const pct = totalComments > 0 ? Math.round((commentCount / totalComments) * 100) : 0;
      results.push({
        keyword: word,
        displayKeyword: formatKeywordDisplay(word),
        frequency: freq,
        commentCount,
        percentage: pct,
        isPhrase: false,
      });
    });

    bigramFreqMap.forEach((freq, bigram) => {
      // Include bigrams with recurring relevance
      if (freq >= 2 || (totalComments <= 5 && freq >= 1)) {
        const commentCount = bigramCommentMap.get(bigram)?.size || 1;
        const pct = totalComments > 0 ? Math.round((commentCount / totalComments) * 100) : 0;
        results.push({
          keyword: bigram,
          displayKeyword: formatKeywordDisplay(bigram),
          frequency: freq,
          commentCount,
          percentage: pct,
          isPhrase: true,
        });
      }
    });

    // Rank by frequency descending, then by comment reach
    results.sort((a, b) => {
      if (b.frequency !== a.frequency) {
        return b.frequency - a.frequency;
      }
      return b.commentCount - a.commentCount;
    });

    return results;
  }, [filteredComments]);

  const displayedKeywords = useMemo(() => {
    return showAllWords ? keywordFrequency.slice(0, 25) : keywordFrequency.slice(0, 10);
  }, [keywordFrequency, showAllWords]);

  return (
    <div className="space-y-6">
      {/* Top Controls & Platform Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Executive Social Intelligence Dashboard</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time cross-platform analytics across YouTube and Instagram comments.
          </p>
        </div>

        {/* Download Report & Platform Filter Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <DownloadReportButton
            result={result}
            platform={video?.platform || 'Social Media'}
            title={video?.title || 'Executive Social Intelligence Report'}
            variant="primary"
          />

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-navy-950 border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              platformFilter === 'all'
                ? 'bg-brand-purple text-white shadow-glow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Platforms</span>
            <span className="text-[10px] opacity-75 font-mono">({comments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setPlatformFilter('youtube')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              platformFilter === 'youtube'
                ? 'bg-red-500 text-white shadow-glow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>YouTube</span>
            <span className="text-[10px] opacity-75 font-mono">({ytCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setPlatformFilter('instagram')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              platformFilter === 'instagram'
                ? 'bg-pink-500 text-white shadow-glow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>Instagram</span>
            <span className="text-[10px] opacity-75 font-mono">({igCount})</span>
          </button>
        </div>
      </div>
    </div>

      <AnalysisDashboardView
        platform={platformFilter === 'youtube' ? 'youtube' : platformFilter === 'instagram' ? 'instagram' : 'overview'}
        title={video?.title || 'Executive Social Intelligence Report'}
        videoMeta={video}
        comments={filteredComments}
        summary={computedSummary}
        rawResponse={result}
        onCommentSelect={setSelectedComment}
      />
    </div>
  );
};
