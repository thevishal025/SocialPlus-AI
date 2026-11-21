import React from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CommentItem } from '../../api/types';
import {
  Heart,
  Target,
  Smile,
  ShieldAlert,
  ThumbsUp,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Flag,
  EyeOff,
  Trash2,
  Cpu,
} from 'lucide-react';

interface CommentDetailModalProps {
  comment: CommentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: 'approve' | 'flag' | 'ignore' | 'hide' | 'delete') => void;
}

export const CommentDetailModal: React.FC<CommentDetailModalProps> = ({
  comment,
  isOpen,
  onClose,
  onAction,
}) => {
  if (!comment) return null;

  const { analysis } = comment;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Comment Intelligence Deep-Dive"
      subtitle={`ID: ${comment.id} • Platform: ${comment.platform}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Original Comment Card */}
        <div className="p-4 rounded-xl bg-navy-800/80 border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-brand-purple/20 text-brand-purple flex items-center justify-center font-bold">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-white">{comment.username || 'Anonymous'}</span>
            </div>
            {comment.published_at && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(comment.published_at).toLocaleString()}</span>
              </div>
            )}
          </div>

          <p className="text-sm text-slate-100 font-medium leading-relaxed bg-navy-950/60 p-3 rounded-lg border border-white/5">
            "{comment.text}"
          </p>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span className="truncate max-w-[70%]">Source: {comment.content_title}</span>
            <div className="flex items-center gap-1 text-slate-300">
              <ThumbsUp className="w-3.5 h-3.5 text-brand-purple" />
              <span>{comment.like_count} likes</span>
            </div>
          </div>
        </div>

        {/* Five Intelligence Engines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ENGINE 1: Sentiment */}
          <div className="p-4 rounded-xl bg-navy-850 border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-brand-purple" />
                1. Sentiment Intelligence
              </span>
              <Badge sentiment={analysis.sentiment}>{analysis.sentiment}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Model Confidence:</span>
              <span className="font-semibold text-white">
                {(analysis.sentiment_confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-navy-950 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full"
                style={{ width: analysis.sentiment === 'Positive' ? `${analysis.sentiment_confidence * 100}%` : '0%' }}
              />
              <div
                className="bg-rose-500 h-full"
                style={{ width: analysis.sentiment === 'Negative' ? `${analysis.sentiment_confidence * 100}%` : '0%' }}
              />
              <div
                className="bg-sky-500 h-full"
                style={{ width: analysis.sentiment === 'Neutral' ? `${analysis.sentiment_confidence * 100}%` : '0%' }}
              />
              <div
                className="bg-amber-500 h-full"
                style={{ width: analysis.sentiment === 'Mixed' ? `${analysis.sentiment_confidence * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* ENGINE 2: Emotional Meter */}
          <div className="p-4 rounded-xl bg-navy-850 border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                2. Emotional Intelligence
              </span>
              <Badge variant="purple">{analysis.dominant_emotion || 'Neutral'}</Badge>
            </div>
            <div className="space-y-1.5">
              {analysis.emotions && analysis.emotions.length > 0 ? (
                analysis.emotions.map((e) => (
                  <div key={e.emotion} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{e.emotion}</span>
                    <span className="font-semibold text-slate-200">{(e.score * 100).toFixed(0)}%</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No intense emotion detected.</p>
              )}
            </div>
          </div>

          {/* ENGINE 3: Intent Intelligence */}
          <div className="p-4 rounded-xl bg-navy-850 border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-sky-400" />
                3. Intent Intelligence
              </span>
              <Badge variant="cyan">{analysis.intent}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Intent Certainty:</span>
              <span className="font-semibold text-white">
                {(analysis.intent_confidence * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-slate-400 italic">
              {analysis.intent === 'Questioning' && 'Inquiring audience prompt - not defaulted to neutral.'}
              {analysis.intent === 'Complaint' && 'Critical feedback demanding customer/creator support.'}
              {analysis.intent === 'Appreciation' && 'Positive reinforcement & organic brand loyalty.'}
              {analysis.intent === 'Promotion' && 'Potential external solicitation / link marketing.'}
              {analysis.intent === 'General Discussion' && 'Casual conversational community engagement.'}
            </p>
          </div>

          {/* ENGINE 4: Emoji Intelligence */}
          <div className="p-4 rounded-xl bg-navy-850 border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-amber-400" />
                4. Emoji Intelligence
              </span>
              {analysis.emoji_only && <Badge variant="mixed">Emoji-Only</Badge>}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {analysis.emojis && analysis.emojis.length > 0 ? (
                analysis.emojis.map((emoji, idx) => (
                  <span
                    key={idx}
                    className="text-lg p-1.5 rounded-lg bg-navy-950 border border-white/10"
                  >
                    {emoji}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">No emojis found in comment.</span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Contextual interpretation applied; emojis evaluated alongside text sentiment.
            </p>
          </div>
        </div>

        {/* ENGINE 5: Auto Moderation Card */}
        <div className="p-4 rounded-xl bg-navy-800/80 border border-rose-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              5. Auto Moderation Intelligence
            </span>
            <Badge
              variant={
                analysis.moderation_action_recommended === 'Clear'
                  ? 'positive'
                  : analysis.moderation_action_recommended === 'Review'
                  ? 'mixed'
                  : 'danger'
              }
            >
              Recommended: {analysis.moderation_action_recommended}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-2.5 rounded-lg bg-navy-950/60 border border-white/5">
              <span className="text-slate-400">Spam Probability</span>
              <div className="text-base font-bold text-white mt-1">
                {(analysis.spam_probability * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-navy-950/60 border border-white/5">
              <span className="text-slate-400">Toxicity Score</span>
              <div className="text-base font-bold text-white mt-1">
                {(analysis.toxicity_score * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {analysis.moderation_reason && (
            <div className="text-xs text-rose-300/90 flex items-start gap-2 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{analysis.moderation_reason}</span>
            </div>
          )}

          {/* Moderation Actions Bar */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-400">Manual Moderator Action:</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                icon={<CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                onClick={() => onAction && onAction('approve')}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={<Flag className="w-3.5 h-3.5 text-amber-400" />}
                onClick={() => onAction && onAction('flag')}
              >
                Flag
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={<EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                onClick={() => onAction && onAction('hide')}
              >
                Hide
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => onAction && onAction('delete')}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

