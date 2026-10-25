import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Clock,
  Award,
  Share2,
  BookOpen,
  Lightbulb,
  Zap,
  RotateCcw,
  Brain,
  Activity,
} from 'lucide-react';
import { MicroLesson } from '../data/pashcoData';
import { CalibrationObservation } from '../utils/progressStore';

interface LessonPlayerModalProps {
  lesson: MicroLesson | null;
  isCompleted: boolean;
  onClose: () => void;
  onCompleteLesson: (
    lesson: MicroLesson,
    correctCount: number,
    totalQuestions: number,
    observations: CalibrationObservation[]
  ) => void;
  onShareLessonScorecard: (lesson: MicroLesson) => void;
}

const KAHOOT_TILE_STYLES = [
  { shape: '▲', cls: 'kahoot-tile-red', label: 'Crimson Alert' },
  { shape: '◆', cls: 'kahoot-tile-blue', label: 'Sapphire Focus' },
  { shape: '●', cls: 'kahoot-tile-gold', label: 'Progress Gold' },
  { shape: '■', cls: 'kahoot-tile-green', label: 'Emerald Growth' },
];

export const LessonPlayerModal: React.FC<LessonPlayerModalProps> = ({
  lesson,
  isCompleted,
  onClose,
  onCompleteLesson,
  onShareLessonScorecard,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [confidenceLevels, setConfidenceLevels] = useState<Record<string, number>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<string, boolean>>({});
  const [lessonFinished, setLessonFinished] = useState(false);

  if (!lesson) return null;

  const totalSlides = lesson.slides.length;
  const totalQuiz = lesson.quiz.length;
  const totalSteps = totalSlides + totalQuiz;

  const isSlideStep = stepIndex < totalSlides;
  const currentSlide = isSlideStep ? lesson.slides[stepIndex] : null;
  const currentQuizIndex = stepIndex - totalSlides;
  const currentQuiz = !isSlideStep && currentQuizIndex < totalQuiz ? lesson.quiz[currentQuizIndex] : null;

  const progressPercent = lessonFinished
    ? 100
    : Math.round(((stepIndex + 1) / (totalSteps + 1)) * 100);

  const handleSelectOption = (qId: string, optionIdx: number) => {
    if (submittedQuestions[qId]) return;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
    if (!confidenceLevels[qId]) {
      setConfidenceLevels((prev) => ({ ...prev, [qId]: 75 }));
    }
  };

  const handleCheckQuizAnswer = (qId: string) => {
    if (selectedAnswers[qId] === undefined) return;
    setSubmittedQuestions((prev) => ({ ...prev, [qId]: true }));
  };

  const handleNext = () => {
    if (stepIndex + 1 < totalSteps) {
      setStepIndex(stepIndex + 1);
    } else {
      let correct = 0;
      const observations = lesson.quiz.map((question) => {
        const isCorrect = selectedAnswers[question.id] === question.correctIndex;
        if (isCorrect) correct += 1;
        return {
          confidence: (confidenceLevels[question.id] || 75) / 100,
          correct: isCorrect,
          recordedAt: new Date().toISOString(),
        };
      });
      setLessonFinished(true);
      onCompleteLesson(lesson, correct, lesson.quiz.length, observations);
    }
  };

  const handleRestart = () => {
    setStepIndex(0);
    setSelectedAnswers({});
    setConfidenceLevels({});
    setSubmittedQuestions({});
    setLessonFinished(false);
  };

  let correctCount = 0;
  lesson.quiz.forEach((q) => {
    if (selectedAnswers[q.id] === q.correctIndex) correctCount += 1;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-modal-title"
    >
      <div className="box-behind-stage w-full max-w-3xl">
        <div className="relative w-full max-h-[90vh] overflow-y-auto rounded-[28px] glass-card p-6 sm:p-8 text-slate-100">
          {/* Top Header */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/15">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-extrabold bg-amber-400 text-slate-950">
                  {lesson.courseCode}
                </span>
                <span className="px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-violet-500/25 text-violet-200 border border-violet-400/40">
                  {lesson.category}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-300 font-bold bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  {lesson.durationHours} Hours · {lesson.modulesCount} Modules
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-mono font-extrabold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                  +{lesson.xpReward} XP · {lesson.durationHours}h track · {lesson.modulesCount} modules
                </span>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-300 bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Module done
                  </span>
                )}
              </div>
              <h2 id="lesson-modal-title" className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                {lesson.title}
              </h2>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-mono text-blue-300">
                <Brain className="w-3.5 h-3.5 text-blue-400" />
                <span>Learning focus: {lesson.learningFocus}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/10 hover:bg-rose-500/30 text-white border border-white/25 transition-colors"
              aria-label="Close lesson studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 mb-6">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 mb-2">
              <span>
                {lessonFinished
                  ? '✓ RETRIEVAL SEQUENCE COMPLETE'
                  : isSlideStep
                  ? `📚 RIGOROUS MODULE ${stepIndex + 1} OF ${totalSlides}`
                  : `⚡ RETRIEVAL PRACTICE ${currentQuizIndex + 1} OF ${totalQuiz}`}
              </span>
              <span className="font-extrabold text-amber-300">{progressPercent}% Complete</span>
            </div>
            <div className="w-full h-3.5 rounded-full bg-[#110E1E] overflow-hidden border border-white/15 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-amber-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Step Content: Slide */}
          {!lessonFinished && currentSlide && (
            <div className="space-y-5">
              <div className="p-6 sm:p-7 rounded-2xl kahoot-question-box space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/25 text-violet-200 border border-violet-400/40 text-xs font-mono font-extrabold uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-violet-300" />
                  {currentSlide.tag}
                </div>
                <h3 className="text-2xl font-extrabold text-white leading-snug">
                  {currentSlide.title}
                </h3>
                <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-medium">
                  {currentSlide.body}
                </p>

                {/* Mental Formula / Highlight Box */}
                <div className="p-4 sm:p-5 rounded-xl glass-gold">
                  <div className="flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-wider text-amber-300 mb-1">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    {currentSlide.highlightBox.label}
                  </div>
                  <p className="text-sm sm:text-base font-mono font-extrabold text-white">
                    {currentSlide.highlightBox.content}
                  </p>
                </div>

                {/* Concrete Example */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-950/60 border border-blue-400/40">
                  <Lightbulb className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-blue-300 block mb-0.5">
                      Empirical / Systems Application
                    </span>
                    <p className="text-sm text-slate-200 leading-relaxed font-medium">
                      {currentSlide.example}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step Content: Kahoot-Style 2x2 Checkpoint Quiz + Metacognitive Confidence Wager */}
          {!lessonFinished && currentQuiz && (
            <div className="space-y-5">
              {/* Stage Banner */}
              <div className="p-5 sm:p-6 rounded-2xl kahoot-question-box text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full arena-stage-header text-xs font-mono font-extrabold uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  Active retrieval · Question {currentQuizIndex + 1} of {totalQuiz}
                </div>

                <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                  {currentQuiz.question}
                </h3>
              </div>

              {/* 2x2 Kahoot Geometric Answer Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentQuiz.options.map((opt, idx) => {
                  const tileStyle = KAHOOT_TILE_STYLES[idx % 4];
                  const isSelected = selectedAnswers[currentQuiz.id] === idx;
                  const isSubmitted = !!submittedQuestions[currentQuiz.id];
                  const isCorrect = idx === currentQuiz.correctIndex;

                  let stateOverlay = '';
                  if (!isSubmitted && isSelected) {
                    stateOverlay = 'ring-4 ring-amber-300 scale-[1.02]';
                  } else if (isSubmitted) {
                    if (isCorrect) {
                      stateOverlay = 'ring-4 ring-emerald-300 scale-[1.02]';
                    } else if (isSelected && !isCorrect) {
                      stateOverlay = 'opacity-65 ring-4 ring-rose-400';
                    } else {
                      stateOverlay = 'opacity-40 saturate-50';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectOption(currentQuiz.id, idx)}
                      disabled={isSubmitted}
                      className={`kahoot-tile ${tileStyle.cls} ${stateOverlay} p-4 sm:p-5 text-left flex items-center justify-between gap-3 min-h-[92px]`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="w-10 h-10 rounded-xl bg-black/30 border border-white/35 flex items-center justify-center text-xl font-extrabold shrink-0 shadow-inner">
                          {tileStyle.shape}
                        </span>
                        <span className="text-sm sm:text-base font-extrabold leading-snug text-white">
                          {opt}
                        </span>
                      </div>
                      {isSubmitted && isCorrect && (
                        <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Anterior PFC (BA10) Metacognitive Confidence Calibration Wager */}
              <div className="p-4 rounded-2xl bg-black/45 border border-violet-400/35 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-mono font-extrabold text-violet-200">
                    BA10 Metacognitive Confidence Calibration:
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { pct: 50, label: '50% Exploring' },
                    { pct: 75, label: '75% Confident' },
                    { pct: 95, label: '95% Certain (+Bonus δ)' },
                  ].map((c) => {
                    const activeConf = (confidenceLevels[currentQuiz.id] || 75) === c.pct;
                    return (
                      <button
                        key={c.pct}
                        type="button"
                        disabled={!!submittedQuestions[currentQuiz.id]}
                        onClick={() =>
                          setConfidenceLevels((prev) => ({ ...prev, [currentQuiz.id]: c.pct }))
                        }
                        className={`px-3 py-1 rounded-full font-mono text-xs font-extrabold border transition-all ${
                          activeConf
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : 'bg-white/10 text-slate-300 border-white/15 hover:bg-white/20'
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {submittedQuestions[currentQuiz.id] && (
                <div className="p-4 rounded-2xl glass-gold space-y-1">
                  <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-amber-300">
                    {selectedAnswers[currentQuiz.id] === currentQuiz.correctIndex
                      ? 'Correct retrieval · response recorded for your review schedule'
                      : 'Review the explanation · this topic will be scheduled for another attempt'}
                  </div>
                  <p className="text-sm text-slate-100 font-medium leading-relaxed">
                    {currentQuiz.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step Content: Lesson Finished Celebration */}
          {lessonFinished && (
            <div className="p-6 sm:p-8 rounded-2xl kahoot-question-box text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl arena-stage-header flex items-center justify-center">
                <Award className="w-9 h-9 text-amber-300" />
              </div>

              <div className="space-y-2">
                <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-extrabold uppercase tracking-wider border border-emerald-400/50">
                  ✓ Sample module saved · +{lesson.xpReward} XP added locally
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Sample module complete: “{lesson.title}”
                </h3>
                <p className="text-slate-300 max-w-xl mx-auto text-sm sm:text-base font-medium">
                  Retrieval quiz accuracy:{' '}
                  <strong className="text-amber-300">
                    {correctCount} / {lesson.quiz.length} ({Math.round((correctCount / lesson.quiz.length) * 100)}%)
                  </strong>
                  . Your profile now includes this sample-module attempt and an accuracy-based suggested review date. The schedule is a learning aid—not a measurement of synaptic change.
                </p>
              </div>

              {/* Synthesized Takeaway Card */}
              <div className="p-5 rounded-2xl glass-gold text-left max-w-xl mx-auto">
                <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-amber-300 mb-1">
                  Takeaway ready for your Scorecard
                </div>
                <p className="font-serif italic text-lg text-white font-semibold">
                  “{lesson.coreTakeaway}”
                </p>
                <div className="mt-2 text-xs text-slate-300 font-bold">
                  Curated by {lesson.curator} · {lesson.durationHours}h Full Course Track
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onShareLessonScorecard(lesson)}
                  className="btn-gold px-6 py-3.5 rounded-full font-extrabold text-sm inline-flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Load into Scorecard Studio & Share
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="btn-dark-surface px-5 py-3.5 rounded-full font-bold text-sm inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Replay Arena
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-violet px-5 py-3.5 rounded-full font-bold text-sm"
                >
                  Back to Arena
                </button>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          {!lessonFinished && (
            <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
                disabled={stepIndex === 0}
                className="btn-dark-surface px-4 py-2.5 rounded-full disabled:opacity-40 font-bold text-sm inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="text-xs font-mono text-slate-300 hidden sm:block">
                Curated by <strong className="text-white">{lesson.curator}</strong>
              </div>

              {isSlideStep ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-gold px-6 py-2.5 rounded-full font-extrabold text-sm inline-flex items-center gap-2"
                >
                  {stepIndex + 1 === totalSlides ? 'Enter Kahoot Quiz Arena' : 'Next Concept'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                currentQuiz && (
                  <>
                    {!submittedQuestions[currentQuiz.id] ? (
                      <button
                        type="button"
                        onClick={() => handleCheckQuizAnswer(currentQuiz.id)}
                        disabled={selectedAnswers[currentQuiz.id] === undefined}
                        className="btn-gold disabled:opacity-45 px-6 py-2.5 rounded-full font-extrabold text-sm inline-flex items-center gap-2"
                      >
                        Lock In Answer
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="btn-gold px-6 py-2.5 rounded-full font-extrabold text-sm inline-flex items-center gap-2"
                      >
                        {stepIndex + 1 < totalSteps ? 'Next Arena Question' : 'Save module progress'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
