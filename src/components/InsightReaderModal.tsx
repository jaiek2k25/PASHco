import React, { useState } from 'react';
import {
  X,
  Bookmark,
  CheckCircle2,
  Sparkles,
  Share2,
  Clock,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import { ExpertInsight } from '../data/pashcoData';

interface InsightReaderModalProps {
  insight: ExpertInsight | null;
  isRead: boolean;
  isBookmarked: boolean;
  onClose: () => void;
  onToggleBookmark: (id: string) => void;
  onCompleteSynthesis: (insight: ExpertInsight) => void;
  onShareInsightScorecard: (insight: ExpertInsight) => void;
}

const KAHOOT_TILE_STYLES = [
  { shape: '▲', cls: 'kahoot-tile-red' },
  { shape: '◆', cls: 'kahoot-tile-blue' },
  { shape: '●', cls: 'kahoot-tile-gold' },
  { shape: '■', cls: 'kahoot-tile-green' },
];

export const InsightReaderModal: React.FC<InsightReaderModalProps> = ({
  insight,
  isRead,
  isBookmarked,
  onClose,
  onToggleBookmark,
  onCompleteSynthesis,
  onShareInsightScorecard,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [verified, setVerified] = useState(false);

  if (!insight) return null;

  const handleVerify = () => {
    if (selectedIdx === null) return;
    setVerified(true);
    if (selectedIdx === insight.synthesisQuestion.correctIndex) {
      onCompleteSynthesis(insight);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insight-modal-title"
    >
      <div className="box-behind-gold w-full max-w-3xl">
        <div className="relative w-full max-h-[90vh] overflow-y-auto rounded-[28px] glass-card p-6 sm:p-10 text-slate-100">
          {/* Top Utility Bar */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/15">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-extrabold uppercase tracking-wider bg-violet-500/25 text-violet-200 border border-violet-400/40">
                {insight.issueNumber}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-300">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {insight.readTime}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleBookmark(insight.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold border inline-flex items-center gap-1.5 transition-all ${
                  isBookmarked
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'btn-dark-surface'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                {isBookmarked ? 'Saved to Library' : 'Save Essay'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-rose-500/30 text-white border border-white/25 transition-colors"
                aria-label="Close insight reader"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Editorial Headline & Byline */}
          <article className="mt-6 space-y-6">
            <div className="space-y-3">
              <div className="text-xs font-mono font-extrabold uppercase tracking-widest text-amber-300">
                {insight.category} · {insight.author.publication}
              </div>
              <h1
                id="insight-modal-title"
                className="font-serif text-3xl sm:text-4xl font-semibold text-white leading-tight"
              >
                {insight.title}
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-medium">
                {insight.subtitle}
              </p>
            </div>

            {/* Author Card */}
            <div className="flex items-center justify-between p-4 rounded-2xl kahoot-question-box">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full arena-stage-header font-extrabold text-sm flex items-center justify-center">
                  {insight.author.avatarInitials}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-extrabold text-white text-sm">
                    {insight.author.name}
                    {insight.author.verified && (
                      <ShieldCheck className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    {insight.author.role} · Published {insight.publishedAt}
                  </div>
                </div>
              </div>
              {isRead && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 text-xs font-extrabold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Synthesized
                </span>
              )}
            </div>

            {/* Key Takeaways Box */}
            <div className="p-5 rounded-2xl glass-gold space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-wider text-amber-300">
                <BookOpen className="w-4 h-4 text-amber-400" />
                30-Second Executive Synthesis
              </div>
              <ul className="space-y-2">
                {insight.keyTakeaways.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-100 font-medium leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-mono text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Essay Body Paragraphs */}
            <div className="space-y-4 font-serif text-lg sm:text-[19px] text-slate-200 leading-[1.78]">
              {insight.paragraphs.map((para, index) => (
                <React.Fragment key={index}>
                  <p>{para}</p>
                  {index === 1 && (
                    <blockquote className="my-6 p-6 rounded-2xl kahoot-question-box font-serif italic text-xl text-amber-200">
                      {insight.pullQuote}
                    </blockquote>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Interactive Kahoot-Style Synthesis Check (+30 XP) */}
            <div className="mt-8 p-6 rounded-2xl kahoot-question-box space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full arena-stage-header text-xs font-mono font-extrabold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Kahoot Synthesis Check · Turn Reading Into Recall
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 font-mono text-xs font-extrabold border border-amber-400/40">
                  +{insight.synthesisQuestion.xpReward} XP · +500 Arena Pts
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-extrabold text-white">
                {insight.synthesisQuestion.question}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {insight.synthesisQuestion.options.map((opt, idx) => {
                  const tile = KAHOOT_TILE_STYLES[idx % 4];
                  const isSelected = selectedIdx === idx;
                  const isCorrect = idx === insight.synthesisQuestion.correctIndex;

                  let stateCls = '';
                  if (!verified && isSelected) {
                    stateCls = 'ring-4 ring-amber-300 scale-[1.02]';
                  } else if (verified) {
                    if (isCorrect) {
                      stateCls = 'ring-4 ring-emerald-300 scale-[1.02]';
                    } else if (isSelected) {
                      stateCls = 'opacity-65 ring-4 ring-rose-400';
                    } else {
                      stateCls = 'opacity-40 saturate-50';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedIdx(idx);
                        setVerified(false);
                      }}
                      className={`kahoot-tile ${tile.cls} ${stateCls} p-4 text-left flex items-center justify-between gap-3`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-black/30 border border-white/35 flex items-center justify-center text-base font-extrabold shrink-0">
                          {tile.shape}
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold leading-snug text-white">
                          {opt}
                        </span>
                      </div>
                      {verified && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {verified && (
                <div className="p-4 rounded-xl glass-gold text-sm text-slate-100">
                  <strong className="block text-xs font-mono font-extrabold uppercase tracking-wider text-amber-300 mb-1">
                    {selectedIdx === insight.synthesisQuestion.correctIndex
                      ? `🎉 SYNTHESIS VERIFIED! +${insight.synthesisQuestion.xpReward} XP ADDED`
                      : '💡 Not quite — select the tile that captures active retrieval:'}
                  </strong>
                  {insight.synthesisQuestion.explanation}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={selectedIdx === null}
                  className="btn-gold disabled:opacity-45 px-6 py-2.5 rounded-full font-extrabold text-sm inline-flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Lock In Takeaway (+{insight.synthesisQuestion.xpReward} XP)
                </button>

                <button
                  type="button"
                  onClick={() => onShareInsightScorecard(insight)}
                  className="btn-dark-surface px-4 py-2.5 rounded-full font-extrabold text-sm inline-flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4 text-amber-300" />
                  Quote in Scorecard Studio
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};
