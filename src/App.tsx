import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Search,
  Flame,
  Sparkles,
  BookOpen,
  Share2,
  CheckCircle2,
  ArrowRight,
  Award,
  Brain,
  Compass,
  Crown,
  Clock,
  ShieldCheck,
  Download,
  Copy,
  Check,
  TrendingUp,
  Layers,
  GraduationCap,
  ChevronRight,
  Bookmark,
  RotateCcw,
  Menu,
  X,
  Zap,
  Target,
  BarChart3,
  Globe,
  Trophy,
  Activity,
  Eye,
} from 'lucide-react';
import {
  DAILY_CHALLENGES,
  MICRO_LESSONS,
  QUIZ_LAB_QUESTIONS,
  ACHIEVEMENTS_LIST,
  EXPERT_INSIGHTS,
  PRODUCT_ROADMAP,
  NEURO_PALETTE_GUIDE,
  CLINICAL_NEURO_MECHANISMS,
  RewardItem,
  MicroLesson,
  ExpertInsight,
  AchievementBadge,
} from './data/pashcoData';
import { LessonPlayerModal } from './components/LessonPlayerModal';
import { InsightReaderModal } from './components/InsightReaderModal';
import { downloadScorecardPng, ScorecardConfig } from './utils/scorecardCanvas';
import { ProfileAndRewardsHub, ProfileHubView } from './components/ProfileAndRewardsHub';
import { AiCourseGenerator } from './components/AiCourseGenerator';
import {
  ApiConnectionConfig,
  ApiSyncLog,
  fetchRemoteProgress,
  GoogleUserProfile,
  loadApiConfig,
  saveApiConfig,
  syncPayloadToCustomApi,
} from './utils/apiSync';
import {
  createInitialUserState,
  hydrateRemoteUserProgress,
  loadUserProgress,
  CalibrationObservation,
  PersistedUserState,
  progressStorageKey,
  recordCourseReview,
  recordLearningActivity,
  saveUserProgress,
} from './utils/progressStore';

const KAHOOT_TILES = [
  {
    shape: '▲',
    cls: 'kahoot-tile-red',
    optionLabel: 'Option 1',
    badgeBg: 'bg-black/30',
  },
  {
    shape: '◆',
    cls: 'kahoot-tile-blue',
    optionLabel: 'Option 2',
    badgeBg: 'bg-black/30',
  },
  {
    shape: '●',
    cls: 'kahoot-tile-gold',
    optionLabel: 'Option 3',
    badgeBg: 'bg-black/30',
  },
  {
    shape: '■',
    cls: 'kahoot-tile-green',
    optionLabel: 'Option 4',
    badgeBg: 'bg-black/30',
  },
];

type AppPage =
  | 'learn' | 'arena' | 'quiz' | 'progress' | 'science' | 'insights'
  | 'scorecards' | 'ai-studio' | 'profile' | 'rewards' | 'settings' | 'about';

const PAGE_FROM_HASH: Record<string, AppPage> = {
  learn: 'learn', top: 'learn', lessons: 'learn',
  arena: 'arena', 'daily-challenge': 'arena',
  quiz: 'quiz', 'quiz-lab': 'quiz',
  progress: 'progress', streaks: 'progress',
  science: 'science', 'neuro-palette': 'science',
  insights: 'insights', 'insights-page': 'insights',
  scorecards: 'scorecards', 'scorecards-page': 'scorecards',
  'ai-studio': 'ai-studio',
  profile: 'profile', 'profile-page': 'profile',
  rewards: 'rewards', 'rewards-page': 'rewards',
  settings: 'settings', 'settings-page': 'settings', 'api-console': 'settings',
  about: 'about', 'why-pashco': 'about', 'about-page': 'about',
};

function getAppPageFromHash(hash: string): AppPage {
  return PAGE_FROM_HASH[hash.replace(/^#/, '')] || 'learn';
}

const SIDEBAR_GROUPS = [
  { label: 'Learning', items: [{ page: 'learn', label: 'Home & courses', icon: BookOpen }] },
  { label: 'Practice', items: [
    { page: 'arena', label: 'Daily Arena', icon: Target },
    { page: 'quiz', label: 'Quiz Lab', icon: Zap },
  ] },
  { label: 'Your space', items: [
    { page: 'progress', label: 'Progress & streaks', icon: Flame },
    { page: 'profile', label: 'Profile', icon: Award },
    { page: 'rewards', label: 'Rewards', icon: Sparkles },
  ] },
  { label: 'Create & explore', items: [
    { page: 'ai-studio', label: 'AI Course Studio', icon: Brain },
    { page: 'science', label: 'Learning science', icon: Activity },
    { page: 'insights', label: 'Expert insights', icon: Bookmark },
    { page: 'scorecards', label: 'Scorecards', icon: Share2 },
    { page: 'settings', label: 'Google & API', icon: Globe },
    { page: 'about', label: 'About PASHco', icon: Compass },
  ] },
] as const;

export function App() {
  const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(null);
  // Google ID tokens are kept in memory only; they are never written to localStorage.
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [apiConfig, setApiConfig] = useState<ApiConnectionConfig>(() => loadApiConfig());
  const [syncLogs, setSyncLogs] = useState<ApiSyncLog[]>([]);
  const [accountRestoreDone, setAccountRestoreDone] = useState(true);
  const [accountCanSync, setAccountCanSync] = useState(true);
  const authGeneration = useRef(0);
  const [userState, setUserState] = useState<PersistedUserState>(() => loadUserProgress(null));
  const currentProgressSubject = googleUser?.googleId ?? null;

  useEffect(() => {
    saveUserProgress(currentProgressSubject, userState);
  }, [currentProgressSubject, userState]);

  // Neuro-ergonomic visual theme. Hue is used for interface grouping, not as a
  // claim that colors stimulate particular neurotransmitters or brain states.
  const [neuroMode, setNeuroMode] = useState<'obsidian' | 'focus' | 'arcade'>('obsidian');
  const [selectedNeuroChannel, setSelectedNeuroChannel] = useState(NEURO_PALETTE_GUIDE[0]);

  // Navigation & Toast Notification state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState<AppPage>(() => getAppPageFromHash(window.location.hash));
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ title: string; subtitle: string } | null>(null);


  const navigateToPage = useCallback((page: AppPage, anchor?: string) => {
    const destination = anchor || page;
    setActivePage(page);
    setMobileMenuOpen(false);
    const hash = `#${destination}`;
    if (window.location.hash !== hash) {
      window.location.hash = destination;
      return;
    }
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const target = document.getElementById(destination);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
  }, []);

  useEffect(() => {
    const syncPageFromLocation = () => {
      const hash = window.location.hash.replace(/^#/, '');
      setActivePage(getAppPageFromHash(hash));
      setMobileMenuOpen(false);
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        const target = hash ? document.getElementById(hash) : null;
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }));
    };
    window.addEventListener('hashchange', syncPageFromLocation);
    window.addEventListener('popstate', syncPageFromLocation);
    return () => {
      window.removeEventListener('hashchange', syncPageFromLocation);
      window.removeEventListener('popstate', syncPageFromLocation);
    };
  }, []);

  // Hero Kahoot Daily Challenge Arena state
  const [activeChallengeIdx, setActiveChallengeIdx] = useState(0);
  const [selectedChallengeOption, setSelectedChallengeOption] = useState<Record<string, string>>({});
  const [submittedChallenges, setSubmittedChallenges] = useState<Record<string, boolean>>({});
  const [speedMultiplier] = useState(1.5);

  // Micro-Lessons section state
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeLessonModal, setActiveLessonModal] = useState<MicroLesson | null>(null);

  // Interactive Quiz Lab state
  const [activeQuizLabIdx, setActiveQuizLabIdx] = useState(0);
  const [quizLabSelections, setQuizLabSelections] = useState<Record<string, number>>({});
  const [quizLabSubmitted, setQuizLabSubmitted] = useState<Record<string, boolean>>({});

  // Expert Insights Modal state
  const [activeInsightModal, setActiveInsightModal] = useState<ExpertInsight | null>(null);

  // Scorecard Studio state (defaulting to Obsidian Luxe dark theme)
  const [scorecardConfig, setScorecardConfig] = useState<ScorecardConfig>({
    learnerName: 'PASHco Scholar',
    handle: '@love_me_for_my_wits',
    theme: 'obsidian-luxe',
    format: 'portrait',
    headline: 'A new idea, learned one recall at a time',
    category: 'PASHco · Learning Progress',
    takeawayQuote:
      'Try to retrieve the idea, check the explanation, and return to it after a delay.',
    streakDays: 0,
    xpEarned: 0,
    quizAccuracy: 0,
    lessonsCompleted: 0,
    dateLabel: 'Oct 17, 2026',
  });
  const [copiedShareText, setCopiedShareText] = useState(false);

  // Footer Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Keep the shareable artifact synchronized with this account's actual progress.
  useEffect(() => {
    const observations = userState.calibrationObservations;
    const answered = observations.length;
    const correct = observations.filter((item) => item.correct).length;
    setScorecardConfig((prev) => ({
      ...prev,
      streakDays: userState.streakDays,
      xpEarned: userState.xp,
      lessonsCompleted: userState.completedLessonIds.length,
      quizAccuracy: answered ? Math.round((correct / answered) * 100) : 0,
    }));
  }, [
    userState.streakDays,
    userState.xp,
    userState.completedLessonIds.length,
    userState.calibrationObservations,
  ]);

  const showToast = useCallback((title: string, subtitle: string) => {
    setToastMessage({ title, subtitle });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.title === title ? null : prev));
    }, 4500);
  }, []);

  const appendSyncLog = useCallback((log: ApiSyncLog) => {
    setSyncLogs((previous) => [log, ...previous].slice(0, 12));
  }, []);

  const logApiSync = useCallback(
    async (
      action: ApiSyncLog['action'],
      payload: Record<string, unknown>,
      token: string | null = googleIdToken
    ) => {
      const result = await syncPayloadToCustomApi(apiConfig, action, payload, token);
      appendSyncLog(result);
      return result;
    },
    [apiConfig, googleIdToken, appendSyncLog]
  );

  const restoreRemoteProgress = useCallback(
    async (
      profile: GoogleUserProfile,
      idToken: string,
      config: ApiConnectionConfig,
      generation: number
    ) => {
      const result = await fetchRemoteProgress(config, idToken, profile.googleId);
      if (authGeneration.current !== generation) return;
      appendSyncLog(result.log);
      setAccountCanSync(result.safeToSync);
      if (!result.safeToSync) {
        setAccountRestoreDone(true);
        return;
      }
      if (result.progress) {
        const remoteState = hydrateRemoteUserProgress(result.progress);
        if (remoteState) {
          setUserState(remoteState);
          saveUserProgress(profile.googleId, remoteState);
          showToast('Remote progress loaded', `Restored the PASHco record for ${profile.email}.`);
        } else {
          showToast('Remote progress was not loaded', 'The API returned a snapshot with an unsupported shape; local progress was kept.');
        }
      }
      setAccountRestoreDone(true);
      const authLog = await syncPayloadToCustomApi(
        config,
        'GOOGLE_AUTH',
        { googleSub: profile.googleId, email: profile.email, name: profile.name },
        idToken
      );
      if (authGeneration.current === generation) appendSyncLog(authLog);
    },
    [appendSyncLog, showToast]
  );

  const handleGoogleSignIn = useCallback(
    (profile: GoogleUserProfile, idToken: string) => {
      const generation = ++authGeneration.current;
      const accountProgress = loadUserProgress(profile.googleId);
      setAccountRestoreDone(false);
      setAccountCanSync(false);
      setGoogleUser(profile);
      setGoogleIdToken(idToken);
      setGoogleAuthError(null);
      setUserState(accountProgress);
      setSelectedChallengeOption({});
      setSubmittedChallenges({});
      setQuizLabSelections({});
      setQuizLabSubmitted({});
      setScorecardConfig((previous) => ({
        ...previous,
        learnerName: profile.name,
        handle: '@love_me_for_my_wits',
      }));
      showToast(
        'Google profile connected',
        apiConfig.apiUrl
          ? 'Checking for remote progress, then syncing this Google account.'
          : 'Progress is separated by Google account on this device. Add your API endpoint for cross-device sync.'
      );
      void restoreRemoteProgress(profile, idToken, apiConfig, generation);
    },
    [showToast, apiConfig, restoreRemoteProgress]
  );

  const handleSignOut = useCallback(() => {
    authGeneration.current += 1;
    setAccountRestoreDone(true);
    setAccountCanSync(true);
    setGoogleUser(null);
    setGoogleIdToken(null);
    setGoogleAuthError(null);
    setUserState(loadUserProgress(null));
    setScorecardConfig((previous) => ({
      ...previous,
      learnerName: 'PASHco Scholar',
      handle: '@love_me_for_my_wits',
    }));
    showToast('Signed out', 'Your Google account progress remains saved separately on this device.');
  }, [showToast]);

  const handleSaveApiConfig = useCallback((config: ApiConnectionConfig) => {
    saveApiConfig(config);
    setApiConfig(config);
    showToast('Connection settings saved', 'Google sign-in and API settings are stored locally.');
    if (googleUser && googleIdToken && config.apiUrl) {
      const generation = ++authGeneration.current;
      setAccountRestoreDone(false);
      setAccountCanSync(false);
      void restoreRemoteProgress(googleUser, googleIdToken, config, generation);
    }
  }, [showToast, googleUser, googleIdToken, restoreRemoteProgress]);

  const handleManualSync = useCallback(() => {
    if ((!accountRestoreDone || !accountCanSync) && googleUser) {
      showToast('Remote sync is paused', 'Resolve the account lookup/API response first to avoid overwriting remote progress.');
      return;
    }
    void logApiSync('SYNC_PROGRESS', {
      googleSub: googleUser?.googleId || null,
      email: googleUser?.email || null,
      progress: userState,
    });
    showToast('Progress sync requested', apiConfig.apiUrl
      ? 'Check the sync activity panel for the API response.'
      : 'No API endpoint is configured yet; progress is saved in this browser.');
  }, [logApiSync, googleUser, userState, apiConfig.apiUrl, accountRestoreDone, accountCanSync, showToast]);

  const lastAutoSyncSignature = useRef('');
  useEffect(() => {
    if (!googleUser || !googleIdToken || !accountRestoreDone || !accountCanSync || !apiConfig.apiUrl || !apiConfig.autoSyncEnabled) return;
    const signature = `${apiConfig.apiUrl}:${googleUser.googleId}:${JSON.stringify(userState)}`;
    if (lastAutoSyncSignature.current === signature) return;
    lastAutoSyncSignature.current = signature;
    const timeout = window.setTimeout(() => {
      void logApiSync('SYNC_PROGRESS', {
        googleSub: googleUser.googleId,
        email: googleUser.email,
        progress: userState,
      });
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [userState, googleUser, googleIdToken, accountRestoreDone, accountCanSync, apiConfig.apiUrl, apiConfig.autoSyncEnabled, logApiSync]);

  const triggerSubtleConfetti = () => {
    try {
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.68 },
        colors: ['#F43F5E', '#3B82F6', '#FBBF24', '#10B981', '#8B5CF6'],
      });
    } catch {
      // fallback if canvas-confetti fails
    }
  };

  const currentChallenge = DAILY_CHALLENGES[activeChallengeIdx];

  // Handler: Select & Immediately Lock In or Submit Daily Challenge (Kahoot feel)
  const handleChallengeSubmit = (overrideOptionId?: string) => {
    const chosen = overrideOptionId || selectedChallengeOption[currentChallenge.id];
    if (!chosen) return;

    setSelectedChallengeOption((prev) => ({ ...prev, [currentChallenge.id]: chosen }));
    setSubmittedChallenges((prev) => ({ ...prev, [currentChallenge.id]: true }));
    const isCorrect = chosen === currentChallenge.correctOptionId;

    if (isCorrect && !userState.solvedChallengeIds.includes(currentChallenge.id)) {
      triggerSubtleConfetti();
      const streakBump = userState.todayCompleted ? 0 : 1;
      const newUnlocked = [...userState.unlockedAchievementIds];
      if (!newUnlocked.includes('ach-first-challenge')) {
        newUnlocked.push('ach-first-challenge');
      }

      setUserState((prev) => ({
        ...prev,
        xp: prev.xp + currentChallenge.xpReward,
        arenaPoints: prev.arenaPoints + currentChallenge.arenaPoints,
        comboStreak: prev.comboStreak + 1,
        streakDays: prev.streakDays + streakBump,
        ...recordLearningActivity(prev),
        solvedChallengeIds: [...prev.solvedChallengeIds, currentChallenge.id],
        unlockedAchievementIds: newUnlocked,
        domainMastery: {
          ...prev.domainMastery,
          [currentChallenge.category]: Math.min(
            100,
            (prev.domainMastery[currentChallenge.category] || 0) + 5
          ),
        },
      }));

      showToast(
        `🎉 +${currentChallenge.arenaPoints} ARENA PTS (+${currentChallenge.xpReward} XP)!`,
        streakBump > 0
          ? `🔥 ${userState.comboStreak + 1}x Combo! Streak extended to ${userState.streakDays + 1} days!`
          : `🔥 ${userState.comboStreak + 1}x Combo Streak! ${currentChallenge.category} practice points +5.`
      );
    }
  };

  // Handler: save one sample-module completion and its review/calibration data.
  const handleCompleteLesson = (
    lesson: MicroLesson,
    correctCount: number,
    totalQuestions: number,
    observations: CalibrationObservation[]
  ) => {
    triggerSubtleConfetti();
    const alreadyDone = userState.completedLessonIds.includes(lesson.id);
    const xpGain = alreadyDone ? 25 : lesson.xpReward;
    const ptsGain = alreadyDone ? 300 : 900;
    const accuracyPercent = Math.round((correctCount / Math.max(1, totalQuestions)) * 100);
    const completedAt = new Date().toISOString();

    setUserState((prev) => {
      const updatedLessons = prev.completedLessonIds.includes(lesson.id)
        ? prev.completedLessonIds
        : [...prev.completedLessonIds, lesson.id];
      const newUnlocked = [...prev.unlockedAchievementIds];
      if (updatedLessons.length >= 3 && !newUnlocked.includes('ach-lesson-master')) {
        newUnlocked.push('ach-lesson-master');
      }
      return {
        ...prev,
        xp: prev.xp + xpGain,
        arenaPoints: prev.arenaPoints + ptsGain,
        comboStreak: prev.comboStreak + 1,
        streakDays: prev.streakDays + (prev.todayCompleted ? 0 : 1),
        ...recordLearningActivity(prev),
        completedLessonIds: updatedLessons,
        unlockedAchievementIds: newUnlocked,
        calibrationObservations: [...prev.calibrationObservations, ...observations].slice(-200),
        courseReviewById: {
          ...prev.courseReviewById,
          [lesson.id]: recordCourseReview(prev.courseReviewById[lesson.id], accuracyPercent),
        },
        domainMastery: {
          ...prev.domainMastery,
          [lesson.category]: Math.min(100, (prev.domainMastery[lesson.category] || 0) + 7),
        },
      };
    });

    setScorecardConfig((prev) => ({
      ...prev,
      headline: `Sample module: ${lesson.title}`,
      category: `${lesson.category} · Course-track preview`,
      takeawayQuote: lesson.coreTakeaway,
    }));

    void logApiSync('COURSE_COMPLETE', {
      googleSub: googleUser?.googleId || null,
      email: googleUser?.email || null,
      courseId: lesson.id,
      courseCode: lesson.courseCode,
      sampleModuleCompleted: true,
      accuracyPercent,
      completedAt,
    });

    showToast(
      `✓ +${ptsGain} Arena Pts · +${xpGain} XP`,
      `Sample module saved with ${accuracyPercent}% quiz accuracy. Your review suggestion is in Profile.`
    );
  };

  // Handler: Load Lesson into Scorecard Studio and Scroll
  const handleShareLessonScorecard = (lesson: MicroLesson) => {
    setScorecardConfig((prev) => ({
      ...prev,
      headline: `Sample module: ${lesson.title}`,
      category: `${lesson.category} · Course-track preview`,
      takeawayQuote: lesson.coreTakeaway,
    }));
    setActiveLessonModal(null);
    navigateToPage('scorecards');
    showToast('Loaded into Scorecard Studio', 'Customize your theme and export your high-res PNG scorecard.');
  };

  // Handler: Complete Insight Synthesis Check
  const handleCompleteInsightSynthesis = (insight: ExpertInsight) => {
    if (userState.readInsightIds.includes(insight.id)) return;
    triggerSubtleConfetti();
    const newUnlocked = [...userState.unlockedAchievementIds];
    if (!newUnlocked.includes('ach-editorial-reader')) {
      newUnlocked.push('ach-editorial-reader');
    }

    setUserState((prev) => ({
      ...prev,
      xp: prev.xp + insight.synthesisQuestion.xpReward,
      arenaPoints: prev.arenaPoints + 500,
      streakDays: prev.streakDays + (prev.todayCompleted ? 0 : 1),
      ...recordLearningActivity(prev),
      readInsightIds: [...prev.readInsightIds, insight.id],
      unlockedAchievementIds: newUnlocked,
    }));

    showToast(
      `+${insight.synthesisQuestion.xpReward} XP · +500 Arena Pts!`,
      'Unlocked the "Substack-Grade Polymath" achievement badge.'
    );
  };

  // Handler: Share Insight Quote in Scorecard Studio
  const handleShareInsightScorecard = (insight: ExpertInsight) => {
    setScorecardConfig((prev) => ({
      ...prev,
      headline: insight.title,
      category: `${insight.author.publication} · ${insight.issueNumber}`,
      takeawayQuote: insight.pullQuote.replace(/[“”"]/g, ''),
    }));
    setActiveInsightModal(null);
    navigateToPage('scorecards');
    showToast('Essay Quote Loaded into Studio', 'Ready to customize and share socially.');
  };

  // Handler: Toggle Bookmark on Insight
  const handleToggleBookmark = (insightId: string) => {
    setUserState((prev) => {
      const exists = prev.bookmarkedInsightIds.includes(insightId);
      const next = exists
        ? prev.bookmarkedInsightIds.filter((id) => id !== insightId)
        : [...prev.bookmarkedInsightIds, insightId];
      return { ...prev, bookmarkedInsightIds: next };
    });
  };

  // Handler: Submit Quiz Lab Question
  const currentQuizLab = QUIZ_LAB_QUESTIONS[activeQuizLabIdx];
  const handleQuizLabVerify = (overrideIdx?: number) => {
    const selected =
      overrideIdx !== undefined ? overrideIdx : quizLabSelections[currentQuizLab.id];
    if (selected === undefined) return;

    setQuizLabSelections((prev) => ({ ...prev, [currentQuizLab.id]: selected }));
    setQuizLabSubmitted((prev) => ({ ...prev, [currentQuizLab.id]: true }));
    const isCorrect = selected === currentQuizLab.correctIndex;

    if (isCorrect && !userState.solvedQuizLabIds.includes(currentQuizLab.id)) {
      triggerSubtleConfetti();
      const nextSolved = [...userState.solvedQuizLabIds, currentQuizLab.id];
      const newUnlocked = [...userState.unlockedAchievementIds];
      if (nextSolved.length >= 3 && !newUnlocked.includes('ach-quiz-ace')) {
        newUnlocked.push('ach-quiz-ace');
      }

      setUserState((prev) => ({
        ...prev,
        xp: prev.xp + currentQuizLab.xp,
        arenaPoints: prev.arenaPoints + currentQuizLab.arenaPoints,
        comboStreak: prev.comboStreak + 1,
        streakDays: prev.streakDays + (prev.todayCompleted ? 0 : 1),
        ...recordLearningActivity(prev),
        solvedQuizLabIds: nextSolved,
        unlockedAchievementIds: newUnlocked,
        domainMastery: {
          ...prev.domainMastery,
          [currentQuizLab.domain]: Math.min(
            100,
            (prev.domainMastery[currentQuizLab.domain] || 0) + 6
          ),
        },
      }));

      showToast(
        `⚡ +${currentQuizLab.arenaPoints} ARENA PTS (+${currentQuizLab.xp} XP)!`,
        `Correct response saved! ${currentQuizLab.domain} practice points +6.`
      );
    }
  };

  const handleClaimReward = (reward: RewardItem) => {
    if (!googleUser) {
      showToast('Google sign-in required', 'Sign in before creating an account-specific reward request.');
      return;
    }
    if (userState.claimedRewardIds.includes(reward.id)) return;
    if (userState.xp < reward.xpCost || userState.arenaPoints < reward.arenaPtsRequired) {
      showToast('Not enough reward balance', 'Earn the required XP and Arena points before redeeming this item.');
      return;
    }

    const claimCode = `PASH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    setUserState((prev) => ({
      ...prev,
      xp: prev.xp - reward.xpCost,
      arenaPoints: prev.arenaPoints - reward.arenaPtsRequired,
      claimedRewardIds: [...prev.claimedRewardIds, reward.id],
      rewardClaimCodes: { ...prev.rewardClaimCodes, [reward.id]: claimCode },
      streakFreezeTokens: prev.streakFreezeTokens + (reward.fulfillment === 'STREAK_TOKENS' ? 3 : 0),
    }));

    void logApiSync('CLAIM_REWARD', {
      googleSub: googleUser.googleId,
      email: googleUser.email,
      rewardId: reward.id,
      rewardTitle: reward.title,
      fulfillment: reward.fulfillment,
      claimCode,
      xpSpent: reward.xpCost,
      arenaPointsSpent: reward.arenaPtsRequired,
    });
    showToast(
      reward.fulfillment === 'TEAM_REQUEST' ? 'Reward request saved' : 'Reward unlocked',
      `${reward.title} · ${claimCode}. External requests are not confirmed until the team responds.`
    );
  };

  // Handler: Export or Copy Scorecard
  const handleExportScorecardPng = () => {
    downloadScorecardPng(scorecardConfig);
    if (!userState.unlockedAchievementIds.includes('ach-social-share')) {
      setUserState((prev) => ({
        ...prev,
        xp: prev.xp + 150,
        arenaPoints: prev.arenaPoints + 600,
        unlockedAchievementIds: [...prev.unlockedAchievementIds, 'ach-social-share'],
      }));
      triggerSubtleConfetti();
      showToast(
        '+150 XP · "Gold Scorecard Creator" Unlocked!',
        'Your high-resolution PASHco Scorecard PNG has been downloaded.'
      );
    } else {
      showToast('Scorecard PNG Downloaded', 'Ready to post on Instagram Stories, LinkedIn, or X.');
    }
  };

  const handleCopyScorecardText = () => {
    const shareString = `✨ PASHco Daily Learning Scorecard\n📚 ${scorecardConfig.headline}\n💡 "${scorecardConfig.takeawayQuote}"\n🔥 ${scorecardConfig.streakDays}-Day Streak · 🏆 ${userState.arenaPoints.toLocaleString()} Arena Pts · 🎯 ${scorecardConfig.quizAccuracy}% Recall\n— via PASHco (${scorecardConfig.handle})`;
    navigator.clipboard?.writeText(shareString).catch(() => {});
    setCopiedShareText(true);
    setTimeout(() => setCopiedShareText(false), 3000);

    if (!userState.unlockedAchievementIds.includes('ach-social-share')) {
      setUserState((prev) => ({
        ...prev,
        xp: prev.xp + 150,
        unlockedAchievementIds: [...prev.unlockedAchievementIds, 'ach-social-share'],
      }));
      showToast('+150 XP · Social Scholar Unlocked!', 'Scorecard summary copied to clipboard.');
    } else {
      showToast('Copied to Clipboard', 'Paste your formatted learning scorecard anywhere.');
    }
  };

  const totalCourseHours = MICRO_LESSONS.reduce((sum, lesson) => sum + lesson.durationHours, 0);
  const completedTrackCount = MICRO_LESSONS.filter((lesson) => userState.completedLessonIds.includes(lesson.id)).length;
  const pathProgressPercent = Math.round((completedTrackCount / Math.max(1, MICRO_LESSONS.length)) * 100);
  const nextLesson = MICRO_LESSONS.find((lesson) => !userState.completedLessonIds.includes(lesson.id)) ?? MICRO_LESSONS[0]!;
  const learnerFirstName = googleUser?.name?.trim().split(/\s+/)[0] || 'Scholar';
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredLessons = MICRO_LESSONS.filter((lesson) => {
    const categoryMatches = selectedCategory === 'All' || lesson.category === selectedCategory;
    const queryMatches = !normalizedSearch || [lesson.courseCode, lesson.title, lesson.subtitle, lesson.category]
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    return categoryMatches && queryMatches;
  });

  const renderAchievementIcon = (iconName: AchievementBadge['iconName']) => {
    switch (iconName) {
      case 'flame':
        return <Flame className="w-6 h-6 text-rose-400" />;
      case 'sparkles':
        return <Sparkles className="w-6 h-6 text-amber-300" />;
      case 'book':
        return <BookOpen className="w-6 h-6 text-blue-400" />;
      case 'share':
        return <Share2 className="w-6 h-6 text-emerald-400" />;
      case 'brain':
        return <Brain className="w-6 h-6 text-violet-300" />;
      case 'compass':
        return <Compass className="w-6 h-6 text-blue-300" />;
      case 'crown':
        return <Crown className="w-6 h-6 text-amber-300" />;
      default:
        return <Award className="w-6 h-6 text-amber-300" />;
    }
  };

  // Live Kahoot Podium Leaderboard sorted dynamically by points
  const liveLeaderboard = [
    { name: 'Sample learner A', badge: 'Demo score', pts: 4850, isUser: false, avatar: 'A' },
    { name: 'Sample learner B', badge: 'Demo score', pts: 4210, isUser: false, avatar: 'B' },
    { name: 'Sample learner C', badge: 'Demo score', pts: 3690, isUser: false, avatar: 'C' },
    {
      name: `${scorecardConfig.learnerName} (You)`,
      badge: `${userState.comboStreak}x Combo 🔥`,
      pts: userState.arenaPoints,
      isUser: true,
      avatar: 'YOU',
    },
  ].sort((a, b) => b.pts - a.pts);

  // Account-scoped weekly activity (only days with saved learning events light up).
  const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      day: date.toLocaleDateString(undefined, { weekday: 'short' }),
      active: userState.activityDates.includes(dateKey),
      isToday: index === 6,
    };
  });
  const activeDaysThisWeek = weeklyActivity.filter((day) => day.active).length;

  const renderAccountHub = (view: ProfileHubView) => (
    <ProfileAndRewardsHub
      view={view}
      googleUser={googleUser}
      accountRestoreDone={accountRestoreDone}
      accountCanSync={accountCanSync}
      googleAuthError={googleAuthError}
      onGoogleSignIn={handleGoogleSignIn}
      onSignOut={handleSignOut}
      userStats={userState}
      apiConfig={apiConfig}
      syncLogs={syncLogs}
      onSaveApiConfig={handleSaveApiConfig}
      onTriggerManualSync={handleManualSync}
      onClaimReward={handleClaimReward}
      onOpenCourse={(course) => setActiveLessonModal(course)}
      onNavigateToScorecards={() => navigateToPage('scorecards')}
    />
  );

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSelectedCategory('All');
    navigateToPage('learn', 'lessons');
  };

  return (
    <div className="min-h-screen relative text-slate-100 selection:bg-amber-400/30 selection:text-amber-200">
      {/* Supplied PASHco Background Image + Dark Obsidian Neuro-Calibrated Veil */}
      <div className="pashco-bg-canvas" aria-hidden="true" />
      <div
        className={
          neuroMode === 'focus'
            ? 'pashco-bg-veil-focus'
            : neuroMode === 'arcade'
            ? 'pashco-bg-veil-arcade'
            : 'pashco-bg-veil'
        }
        aria-hidden="true"
      />

      {/* Live Achievement / Kahoot Arena Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 lg:bottom-5 right-5 z-50 max-w-md box-behind-stage">
          <div className="rounded-2xl kahoot-question-box p-4 flex items-start gap-3 animate-bounce">
            <div className="w-10 h-10 rounded-xl arena-stage-header flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="pr-2">
              <div className="text-sm font-extrabold text-white">{toastMessage.title}</div>
              <div className="text-xs text-slate-300 font-medium mt-0.5">{toastMessage.subtitle}</div>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white ml-auto"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          1. PREMIUM FLOATING DARK GLASSMORPHIC NAVIGATION BAR
      ===================================================================== */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0A12]/95 backdrop-blur-2xl">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5">
          <div className="h-16 flex items-center gap-3 sm:gap-5">
            <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} className="lg:hidden p-2 rounded-full text-slate-200 hover:bg-white/10" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button type="button" onClick={() => navigateToPage('learn')} className="flex items-center gap-2.5 shrink-0 group" aria-label="PASHco home">
              <div className="w-9 h-9 rounded-xl arena-stage-header flex items-center justify-center group-hover:scale-105 transition-transform"><span className="font-display font-extrabold text-lg text-amber-300">P</span></div>
              <span className="font-display font-extrabold text-xl tracking-tight text-white">PASHco</span>
            </button>

            <form onSubmit={handleSearchSubmit} role="search" className="hidden sm:flex flex-1 max-w-2xl mx-auto">
              <label htmlFor="course-search-desktop" className="sr-only">Search course tracks</label>
              <div className="flex w-full rounded-full border border-white/20 bg-white/[0.06] overflow-hidden focus-within:border-emerald-300/60">
                <input id="course-search-desktop" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search course tracks and topics" className="min-w-0 flex-1 bg-transparent px-5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none" />
                <button type="submit" aria-label="Search courses" className="w-14 flex items-center justify-center border-l border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"><Search className="w-4 h-4" /></button>
              </div>
            </form>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button type="button" onClick={() => navigateToPage('progress')} title="View learning streak" className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full bg-rose-500/15 border border-rose-400/25 text-rose-100 text-xs font-mono font-extrabold"><Flame className="w-4 h-4 text-rose-300 fill-rose-400" /><span>{userState.streakDays}</span><span className="hidden sm:inline">day streak</span></button>
              <button type="button" onClick={() => navigateToPage('progress')} title="View XP and points" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-500/10 border border-amber-300/20 text-amber-100 text-xs font-mono font-extrabold"><Sparkles className="w-4 h-4 text-amber-300" /><span>{userState.xp.toLocaleString()} XP</span></button>
              <button type="button" onClick={() => navigateToPage('profile')} aria-label={googleUser ? `Profile for ${googleUser.name}` : 'Open profile and Google sign-in'} className="w-9 h-9 rounded-full border border-white/20 bg-violet-500/20 text-violet-100 flex items-center justify-center font-extrabold text-xs hover:border-emerald-300/60">{googleUser?.avatarInitials || <Award className="w-4 h-4" />}</button>
            </div>
          </div>
          <form onSubmit={handleSearchSubmit} role="search" className="sm:hidden pb-3">
            <label htmlFor="course-search-mobile" className="sr-only">Search course tracks</label>
            <div className="flex w-full rounded-full border border-white/20 bg-white/[0.06] overflow-hidden focus-within:border-emerald-300/60">
              <input id="course-search-mobile" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search course tracks" className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none" />
              <button type="submit" aria-label="Search courses" className="w-12 flex items-center justify-center border-l border-white/10 bg-white/5 text-slate-200"><Search className="w-4 h-4" /></button>
            </div>
          </form>
        </div>
      </header>

      {mobileMenuOpen && <button type="button" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 top-16 z-40 bg-black/65 lg:hidden" />}

      <div className="max-w-[1600px] mx-auto lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className={`fixed lg:sticky left-0 top-16 z-50 lg:z-30 h-[calc(100vh-4rem)] w-[280px] lg:w-auto border-r border-white/10 bg-[#0D0B16] lg:bg-transparent px-3 py-5 overflow-y-auto transform transition-transform duration-200 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Main navigation">
          <nav className="space-y-5">
            {SIDEBAR_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <h2 className="px-3 text-[10px] font-mono font-extrabold uppercase tracking-[0.18em] text-slate-500">{group.label}</h2>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const selected = activePage === item.page;
                  return (
                    <button key={item.page} type="button" aria-current={selected ? 'page' : undefined} onClick={() => navigateToPage(item.page)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-colors ${selected ? 'bg-white/10 text-white border border-white/10 shadow-[0_3px_0_0_#05040A]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                      <Icon className={`w-[18px] h-[18px] shrink-0 ${selected ? 'text-emerald-300' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                      {item.page === 'learn' && <ChevronRight className="w-4 h-4 ml-auto text-slate-500" />}
                    </button>
                  );
                })}
                <div className="pt-2 border-b border-white/10" />
              </div>
            ))}
          </nav>
          <button type="button" onClick={() => navigateToPage('progress')} className="mt-5 w-full p-4 rounded-2xl glass-panel text-left hover:border-emerald-300/30 transition-colors">
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-extrabold text-white">Your progress</span><Flame className="w-4 h-4 text-rose-300" /></div>
            <div className="mt-2 text-2xl font-display font-extrabold text-white">{userState.streakDays}<span className="ml-1 text-sm text-slate-400">day streak</span></div>
            <div className="mt-2 h-2 rounded-full bg-black/50 overflow-hidden"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${pathProgressPercent}%` }} /></div>
            <div className="mt-1.5 text-[10px] text-slate-400">{completedTrackCount} sample modules saved</div>
          </button>
        </aside>

        <div className="min-w-0">
      <main id="app-main" className="min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-28 lg:pb-10">
        {activePage === 'learn' && (
          <div id="learn" className="space-y-12 lg:space-y-16">
        <section id="top" className="space-y-7">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 text-xs font-mono font-extrabold uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5" /><span>Your learning path</span>
              </div>
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl xl:text-5xl text-white tracking-tight leading-tight">
                Pick up where you left off, <span className="text-emerald-300">{learnerFirstName}</span>.
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Choose a specialist track, finish its sample module, then come back for a spaced review. The course-hour figures describe the planned full tracks—not the samples in this MVP.
              </p>
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-2xl glass-panel">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 pl-2">Theme</span>
              {([
                { id: 'obsidian', label: 'Obsidian' },
                { id: 'focus', label: 'Focus' },
                { id: 'arcade', label: 'Arcade' },
              ] as const).map((mode) => (
                <button key={mode.id} type="button" aria-pressed={neuroMode === mode.id} onClick={() => setNeuroMode(mode.id)} className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-colors ${neuroMode === mode.id ? 'bg-emerald-400 text-slate-950 shadow-[0_3px_0_0_#064E3B]' : 'text-slate-300 hover:bg-white/10'}`}>
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-6 xl:gap-8 items-stretch">
            <div className="box-behind-gold">
              <div className="h-full rounded-[28px] glass-card p-5 sm:p-7 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-amber-300">Continue your path</div>
                    <div className="text-xs text-slate-400 font-mono">{nextLesson.courseCode} · {nextLesson.category}</div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-300/35 flex items-center justify-center text-emerald-200 shrink-0">
                    {completedTrackCount === MICRO_LESSONS.length ? <CheckCircle2 className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white leading-tight">{nextLesson.title}</h2>
                  <p className="text-sm text-slate-300 leading-relaxed">{nextLesson.subtitle}</p>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3 text-xs font-mono font-extrabold"><span className="text-slate-300">Sample modules completed</span><span className="text-emerald-300">{completedTrackCount} / {MICRO_LESSONS.length}</span></div>
                  <div role="progressbar" aria-label="Sample modules completed" aria-valuemin={0} aria-valuemax={MICRO_LESSONS.length} aria-valuenow={completedTrackCount} className="h-3 rounded-full bg-black/50 border border-white/10 overflow-hidden p-0.5">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-lime-300 to-amber-300 transition-all duration-500" style={{ width: `${pathProgressPercent}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">A saved sample is not a completed full course track.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button type="button" onClick={() => setActiveLessonModal(nextLesson)} className="btn-gold px-5 py-3 rounded-full font-extrabold text-sm inline-flex items-center gap-2">
                    {completedTrackCount === MICRO_LESSONS.length ? 'Review a sample' : 'Continue learning'}<ArrowRight className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => navigateToPage('learn', 'lessons')} className="px-4 py-3 rounded-full text-sm font-extrabold text-slate-200 border border-white/15 hover:bg-white/10 transition-colors">Browse all tracks</button>
                </div>
                <div className="pt-4 border-t border-white/10 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-mono text-slate-400">
                  <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-300" />{nextLesson.durationMinutes} min sample</span>
                  <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-300" />+{nextLesson.xpReward} XP</span>
                  <span>{nextLesson.durationHours}h estimated full track</span>
                </div>
              </div>
            </div>

            <div className="box-behind-stage">
              <div className="h-full rounded-[28px] glass-card p-5 sm:p-7 flex flex-col justify-between gap-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-wider text-violet-200"><Target className="w-4 h-4 text-amber-300" />Daily practice</div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-mono font-extrabold text-emerald-200">{activeChallengeIdx + 1} / {DAILY_CHALLENGES.length}</span>
                  </div>
                  <div className="p-5 rounded-2xl kahoot-question-box space-y-2.5">
                    <div className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-violet-200">{currentChallenge.category}</div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">{currentChallenge.title}</h2>
                    <p className="text-sm text-slate-300 leading-relaxed">{currentChallenge.scenario}</p>
                    <div className="pt-3 border-t border-white/10 text-sm font-extrabold text-amber-200">{currentChallenge.question}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">Recall · feedback · one step at a time</span>
                  <button type="button" onClick={() => navigateToPage('arena')} className="btn-violet px-5 py-2.5 rounded-full font-extrabold text-xs inline-flex items-center gap-2">Open daily arena<ArrowRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="lessons" className="scroll-mt-24 space-y-7">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-widest text-amber-300"><BookOpen className="w-4 h-4 text-amber-400" />Course map · {MICRO_LESSONS.length} specialist tracks</div>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">Your learning path</h2>
              <p className="text-sm text-slate-300 leading-relaxed">{totalCourseHours} estimated hours across the full tracks. This MVP offers one sample module for each track; sample completion is tracked separately from full-course completion.</p>
            </div>
            <div className="w-full xl:max-w-sm p-4 rounded-2xl glass-panel space-y-2.5">
              <div className="flex items-center justify-between gap-3 text-xs font-mono font-extrabold"><span className="text-slate-300">Path progress</span><span className="text-emerald-300">{completedTrackCount} / {MICRO_LESSONS.length} samples</span></div>
              <div role="progressbar" aria-label="Course sample path progress" aria-valuemin={0} aria-valuemax={MICRO_LESSONS.length} aria-valuenow={completedTrackCount} className="h-3 rounded-full bg-black/50 border border-white/10 overflow-hidden p-0.5"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-300 transition-all duration-500" style={{ width: `${pathProgressPercent}%` }} /></div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-extrabold text-white">Browse by topic</h3><span className="text-[11px] text-slate-400">Choose a track to preview its sample lesson</span></div>
            <div className="flex flex-wrap items-center gap-2">
              {['All', 'Computational Neuroscience', 'Mental Models', 'AI & Future Tech', 'Behavioral Economics', 'Design & Systems', 'Financial Fluency'].map((category) => (
                <button key={category} type="button" aria-pressed={selectedCategory === category} onClick={() => setSelectedCategory(category)} className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all ${selectedCategory === category ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-[0_4px_0_0_#064E3B]' : 'bg-white/5 text-slate-300 border-white/15 hover:bg-white/10'}`}>{category}</button>
              ))}
            </div>
          </div>

          {filteredLessons.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {filteredLessons.map((lesson, index) => {
                const isCompleted = userState.completedLessonIds.includes(lesson.id);
                const trackNumber = MICRO_LESSONS.findIndex((track) => track.id === lesson.id) + 1;
                const isNext = lesson.id === nextLesson.id;
                const accentBorders = ['box-behind-gold', 'box-behind-blue', 'box-behind-stage'];
                return (
                  <div key={lesson.id} className={accentBorders[index % accentBorders.length]}>
                    <article className="h-full rounded-[24px] glass-card glass-card-interactive p-5 sm:p-6 flex flex-col gap-4 relative overflow-hidden">
                      <div className="flex items-start gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 font-mono font-extrabold ${isCompleted ? 'bg-emerald-500/20 border-emerald-300/50 text-emerald-200' : isNext ? 'bg-amber-400 border-amber-200 text-slate-950 shadow-[0_4px_0_0_#92400E]' : 'bg-violet-500/15 border-violet-300/30 text-violet-100'}`}>
                          {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : String(trackNumber).padStart(2, '0')}
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2"><span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-violet-500/20 text-violet-100 border border-violet-300/25">{lesson.category}</span>{isCompleted ? <span className="inline-flex items-center gap-1 text-[10px] font-mono font-extrabold text-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" />Sample complete</span> : isNext ? <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-amber-400/15 border border-amber-300/30 text-amber-200">UP NEXT</span> : null}</div>
                          <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug">{lesson.title}</h3>
                          <p className="text-sm text-slate-300 leading-relaxed">{lesson.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-mono font-bold text-slate-300"><span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-300" />{lesson.durationHours}h estimated full track</span><span>{lesson.modulesCount} planned modules</span><span className="text-amber-200">+{lesson.xpReward} XP sample reward</span></div>
                      <div className="p-3.5 rounded-xl bg-black/30 border border-white/10"><div className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-amber-300 mb-1">Key idea</div><p className="text-xs text-slate-200 italic leading-relaxed">“{lesson.coreTakeaway}”</p></div>
                      <div className="pt-3 border-t border-white/10 mt-auto flex flex-wrap items-center justify-between gap-3"><span className="text-[11px] text-slate-400">Sample module · {lesson.slides.length} concepts · retrieval quiz</span><button type="button" onClick={() => setActiveLessonModal(lesson)} className={`px-4 py-2.5 rounded-full font-extrabold text-xs inline-flex items-center gap-1.5 transition-all ${isCompleted ? 'btn-dark-surface' : 'btn-gold'}`}>{isCompleted ? 'Replay sample' : 'Open sample'}<ArrowRight className="w-3.5 h-3.5" /></button></div>
                    </article>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-2xl glass-panel text-center space-y-3"><Search className="w-7 h-7 text-slate-400 mx-auto" /><p className="text-white font-extrabold">No tracks match “{searchQuery}”</p><button type="button" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className="text-sm font-extrabold text-emerald-300 hover:underline">Clear search and filters</button></div>
          )}
        </section>
          </div>
        )}

        {activePage === 'arena' && (
          <div id="arena" className="space-y-8">
            <div className="space-y-2 max-w-3xl"><div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-widest text-violet-200"><Target className="w-4 h-4 text-amber-300" />Daily practice</div><h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white">Daily Arena</h1><p className="text-sm text-slate-300 leading-relaxed">Take one retrieval challenge, check the explanation, then return to your course path when you are ready.</p></div>
<div id="daily-challenge" className="scroll-mt-24 max-w-4xl mx-auto">
              <div className="box-behind-stage">
                <div className="rounded-[28px] glass-card p-5 sm:p-7 space-y-5 relative overflow-hidden">
                  {/* Top Kahoot Arena Stage Bar */}
                  <div className="p-3.5 rounded-2xl arena-stage-header flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono text-xs font-extrabold">
                        PIN: 408-921
                      </span>
                      <span className="text-xs font-mono font-extrabold tracking-wider uppercase text-white">
                        {currentChallenge.dayLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-xs font-extrabold inline-flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                        {userState.comboStreak}x Combo
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-black/30 text-amber-300 font-mono text-xs font-extrabold border border-amber-400/30">
                        ⚡ {speedMultiplier}x Speed Bonus
                      </span>
                    </div>
                  </div>

                  {/* Challenge Round Switcher + Category */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-violet-200 bg-violet-500/25 px-3 py-1 rounded-full border border-violet-400/40">
                      {currentChallenge.category} · +{currentChallenge.arenaPoints} PTS
                    </span>

                    <div className="flex items-center gap-1.5">
                      {DAILY_CHALLENGES.map((dc, idx) => {
                        const solved = userState.solvedChallengeIds.includes(dc.id);
                        return (
                          <button
                            key={dc.id}
                            type="button"
                            onClick={() => setActiveChallengeIdx(idx)}
                            className={`px-3 py-1 rounded-full font-mono text-xs font-extrabold border transition-all ${
                              activeChallengeIdx === idx
                                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_3px_0_0_#7C3AED]'
                                : solved
                                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50'
                                : 'bg-white/10 text-slate-200 border-white/20 hover:bg-white/20'
                            }`}
                          >
                            Round #{idx + 1} {solved ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Elevated 3D Question Stage Box ("Box Behind It Shadow") */}
                  <div className="p-5 rounded-2xl kahoot-question-box space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-mono font-extrabold text-slate-400">
                      <span>SCENARIO STAGE</span>
                      <span className="text-emerald-400">+{currentChallenge.xpReward} XP REWARD</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                      {currentChallenge.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                      {currentChallenge.scenario}
                    </p>
                    <div className="pt-2 border-t border-white/15 text-sm sm:text-base font-extrabold text-amber-300">
                      Q: {currentChallenge.question}
                    </div>
                  </div>

                  {/* KAHOOT 2x2 GEOMETRIC ANSWER TILES (▲ ◆ ● ■) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {currentChallenge.options.map((opt, idx) => {
                      const tile = KAHOOT_TILES[idx % 4];
                      const isSelected = selectedChallengeOption[currentChallenge.id] === opt.id;
                      const isSubmitted = !!submittedChallenges[currentChallenge.id];
                      const isCorrect = opt.id === currentChallenge.correctOptionId;

                      let stateStyles = '';
                      if (!isSubmitted && isSelected) {
                        stateStyles = 'ring-4 ring-amber-300 scale-[1.02]';
                      } else if (isSubmitted) {
                        if (isCorrect) {
                          stateStyles = 'ring-4 ring-emerald-300 scale-[1.02]';
                        } else if (isSelected && !isCorrect) {
                          stateStyles = 'opacity-70 ring-4 ring-rose-400';
                        } else {
                          stateStyles = 'opacity-40 saturate-50';
                        }
                      }

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            if (isSubmitted) return;
                            handleChallengeSubmit(opt.id);
                          }}
                          className={`kahoot-tile ${tile.cls} ${stateStyles} p-4 text-left flex flex-col justify-between gap-2 min-h-[112px]`}
                        >
                          <div className="flex items-start justify-between gap-2 w-full">
                            <span className="w-9 h-9 rounded-xl bg-black/30 border border-white/40 flex items-center justify-center text-lg font-extrabold shrink-0 shadow-inner">
                              {tile.shape}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${tile.badgeBg} text-white/95`}
                            >
                              {tile.optionLabel}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <div className="text-xs sm:text-sm font-extrabold leading-snug text-white">
                              {opt.label}
                            </div>
                            <div className="text-[11px] text-white/85 font-medium leading-tight">
                              {opt.detail}
                            </div>
                          </div>

                          {isSubmitted && isCorrect && (
                            <div className="inline-flex items-center gap-1 text-[11px] font-mono font-extrabold bg-slate-950 text-emerald-300 border border-emerald-400 px-2.5 py-0.5 rounded-full self-start">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              CORRECT · +{currentChallenge.arenaPoints} PTS
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Instant Rationale & Next Round Controls */}
                  {submittedChallenges[currentChallenge.id] ? (
                    <div className="p-4 rounded-2xl glass-gold space-y-3 animate-fadeIn">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-amber-300">
                          {selectedChallengeOption[currentChallenge.id] ===
                          currentChallenge.correctOptionId
                            ? `🎉 PODIUM STREAK! +${currentChallenge.arenaPoints} PTS (+${currentChallenge.xpReward} XP)`
                            : '💡 FIRST-PRINCIPLES RATIONALE'}
                        </span>
                        <span className="text-[11px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-black/40 text-amber-300 border border-amber-400/40">
                          {currentChallenge.mentalModelTag}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                        {currentChallenge.explanation}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveChallengeIdx(
                              (activeChallengeIdx + 1) % DAILY_CHALLENGES.length
                            );
                          }}
                          className="btn-gold px-5 py-2.5 rounded-full font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5"
                        >
                          <span>Next Arena Round</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setScorecardConfig((prev) => ({
                              ...prev,
                              headline: `Won Arena Round: ${currentChallenge.title}`,
                              category: `${currentChallenge.category} · +${currentChallenge.arenaPoints} PTS`,
                              takeawayQuote: currentChallenge.explanation,
                            }));
                            navigateToPage('scorecards');
                          }}
                          className="btn-dark-surface px-4 py-2.5 rounded-full font-extrabold text-xs inline-flex items-center gap-1.5"
                        >
                          <Share2 className="w-3.5 h-3.5 text-amber-300" />
                          <span>Share Arena Scorecard</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 px-1">
                      <span>👆 Tap any 3D shape tile (▲ ◆ ● ■) to lock in your answer!</span>
                      <span className="text-amber-300">Instant Feedback</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activePage === 'quiz' && (<div id="quiz" className="space-y-10">
<section id="quiz-lab" className="scroll-mt-24 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-widest text-rose-400">
                <Target className="w-4 h-4 text-rose-400" />
                <span>Active Recall Arena · Local progress</span>
              </div>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                Test Your Recall & Build Your Arena Score
              </h2>
              <p className="text-slate-300 max-w-2xl text-base font-medium">
                Use the shape-coded answer tiles (▲ ◆ ● ■) to practise retrieval and earn local Arena Points. The podium below includes sample entries; a shared live leaderboard requires an API.
              </p>
            </div>

            <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full kahoot-question-box text-xs font-mono font-extrabold">
              <span className="text-slate-200">
                Arena Solved:{' '}
                <strong className="text-amber-300">
                  {userState.solvedQuizLabIds.length}/{QUIZ_LAB_QUESTIONS.length}
                </strong>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-rose-400">
                🔥 {userState.comboStreak}x Combo
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-300">
                🏆 {userState.arenaPoints.toLocaleString()} PTS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left 7 Cols: Kahoot 2x2 Interactive Quiz Workbench with Box-Behind-Stage Shadow */}
            <div className="lg:col-span-7 box-behind-stage">
              <div className="h-full rounded-[28px] glass-card p-6 sm:p-8 flex flex-col justify-between gap-6">
                <div className="space-y-5">
                  {/* Question Selector Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/15">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full arena-stage-header font-mono text-xs font-extrabold">
                        {currentQuizLab.domain}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        +{currentQuizLab.arenaPoints} PTS · +{currentQuizLab.xp} XP
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {QUIZ_LAB_QUESTIONS.map((q, idx) => {
                        const done = userState.solvedQuizLabIds.includes(q.id);
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setActiveQuizLabIdx(idx)}
                            className={`w-9 h-9 rounded-xl font-mono text-xs font-extrabold border transition-all ${
                              activeQuizLabIdx === idx
                                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_3px_0_0_#7C3AED]'
                                : done
                                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50'
                                : 'bg-white/10 text-slate-200 border-white/20 hover:bg-white/20'
                            }`}
                          >
                            Q{idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Elevated 3D Question Prompt Box */}
                  <div className="p-5 sm:p-6 rounded-2xl kahoot-question-box space-y-2">
                    <div className="text-xs font-mono uppercase tracking-wider text-amber-300 font-extrabold">
                      {currentQuizLab.difficulty} · {currentQuizLab.context}
                    </div>
                    <h3 className="text-lg sm:text-2xl font-extrabold text-white leading-snug">
                      {currentQuizLab.prompt}
                    </h3>
                  </div>

                  {/* 2x2 Kahoot Geometric Answer Tiles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentQuizLab.options.map((opt, idx) => {
                      const tile = KAHOOT_TILES[idx % 4];
                      const isSelected = quizLabSelections[currentQuizLab.id] === idx;
                      const isSubmitted = !!quizLabSubmitted[currentQuizLab.id];
                      const isCorrect = idx === currentQuizLab.correctIndex;

                      let stateCls = '';
                      if (!isSubmitted && isSelected) {
                        stateCls = 'ring-4 ring-amber-300 scale-[1.02]';
                      } else if (isSubmitted) {
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
                            if (isSubmitted) return;
                            handleQuizLabVerify(idx);
                          }}
                          className={`kahoot-tile ${tile.cls} ${stateCls} p-4 sm:p-5 text-left flex items-center justify-between gap-3 min-h-[96px]`}
                        >
                          <div className="flex items-center gap-3.5">
                            <span className="w-10 h-10 rounded-xl bg-black/30 border border-white/40 flex items-center justify-center text-xl font-extrabold shrink-0">
                              {tile.shape}
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

                  {/* Rationale Box */}
                  {quizLabSubmitted[currentQuizLab.id] && (
                    <div className="p-4 rounded-2xl glass-gold text-sm text-slate-100 space-y-1">
                      <div className="font-mono text-xs font-extrabold uppercase tracking-wider text-amber-300">
                        {quizLabSelections[currentQuizLab.id] === currentQuizLab.correctIndex
                          ? `🏆 +${currentQuizLab.arenaPoints} ARENA PTS! ${currentQuizLab.domain.toUpperCase()} MASTERY BOOSTED`
                          : '💡 MECHANISM BREAKDOWN'}
                      </div>
                      <p className="font-medium leading-relaxed">{currentQuizLab.rationale}</p>
                    </div>
                  )}
                </div>

                {/* Quiz Lab Footer Controls */}
                <div className="pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveQuizLabIdx((activeQuizLabIdx + 1) % QUIZ_LAB_QUESTIONS.length);
                    }}
                    className="btn-gold px-6 py-3 rounded-full font-extrabold text-sm inline-flex items-center gap-2"
                  >
                    <span>Next Arena Question</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-mono font-bold text-slate-300">
                    Arena Question {activeQuizLabIdx + 1} of {QUIZ_LAB_QUESTIONS.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Kahoot Live Podium + Domain Mastery + Weekly Velocity */}
            <div className="lg:col-span-5 box-behind-gold">
              <div className="h-full rounded-[28px] glass-card p-6 sm:p-7 flex flex-col justify-between gap-6">
                {/* Live Kahoot Arena Leaderboard Podium */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-400" />
                      <h3 className="font-extrabold text-lg text-white">
                        Sample Podium
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono font-extrabold text-violet-200 bg-violet-500/25 px-2.5 py-0.5 rounded-full border border-violet-400/40">
Demo scores · API needed
                    </span>
                  </div>

                  <div className="space-y-2">
                    {liveLeaderboard.map((entry, idx) => (
                      <div
                        key={entry.name}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                          entry.isUser
                            ? 'bg-amber-500/20 border-amber-400 shadow-[0_4px_0_0_#05040A]'
                            : 'bg-black/35 border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-lg font-mono text-xs font-extrabold flex items-center justify-center ${
                              idx === 0
                                ? 'bg-amber-400 text-slate-950'
                                : idx === 1
                                ? 'bg-slate-400 text-slate-950'
                                : idx === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-violet-600 text-white'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="text-xs sm:text-sm font-extrabold text-white">
                              {entry.name}
                            </div>
                            <div className="text-[10px] font-mono font-bold text-slate-300">
                              {entry.badge}
                            </div>
                          </div>
                        </div>

                        <span className="font-mono text-xs sm:text-sm font-extrabold text-amber-300">
                          {entry.pts.toLocaleString()} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Account-scoped practice points by course domain */}
                <div className="space-y-3 pt-2 border-t border-white/15">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      <h4 className="font-extrabold text-sm text-white uppercase tracking-wider font-mono">
                        Practice points by domain
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      Activity indicator · not an ability score
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {Object.entries(userState.domainMastery).map(([domain, pct], idx) => {
                      const barGradients = [
                        'from-violet-500 to-indigo-400',
                        'from-blue-500 to-cyan-400',
                        'from-rose-500 to-amber-400',
                        'from-emerald-500 to-teal-400',
                        'from-amber-400 to-yellow-300',
                      ];
                      return (
                        <div key={domain} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-slate-200">{domain}</span>
                            <span className="font-mono font-extrabold text-amber-300">{pct}%</span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-black/40 overflow-hidden p-0.5 border border-white/15">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${
                                barGradients[idx % barGradients.length]
                              } transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Account-scoped activity calendar */}
                <div className="p-4 rounded-2xl kahoot-question-box space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400">
                        Learning days · last 7 days
                      </div>
                      <div className="text-lg font-extrabold text-white">
                        {activeDaysThisWeek} / 7 active days
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-400">This profile only</span>
                  </div>
                  <div className="grid grid-cols-7 gap-2 items-end h-20 pt-1">
                    {weeklyActivity.map((day, index) => (
                      <div key={`${day.day}-${index}`} className="flex flex-col items-center gap-1 h-full justify-end">
                        <span className="text-[9px] font-mono font-bold text-slate-300">{day.active ? '✓' : '·'}</span>
                        <div
                          className={`w-full rounded-t-md border border-white/20 transition-all duration-500 ${
                            day.active
                              ? 'bg-gradient-to-t from-emerald-700 to-emerald-400'
                              : 'bg-white/5'
                          }`}
                          style={{ height: day.active ? '72%' : '18%' }}
                        />
                        <span className={`text-[9px] font-mono ${day.isToday ? 'font-extrabold text-amber-300' : 'text-slate-400'}`}>
                          {day.day}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        </div>)}

        {activePage === 'progress' && (<div id="progress" className="space-y-10">
<section id="streaks" className="scroll-mt-24 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-widest text-amber-300">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>Consistency Engine · Duolingo-Inspired Habit Mechanics</span>
              </div>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                Daily Streak & Collectible Achievement Vault
              </h2>
              <p className="text-slate-300 max-w-2xl text-base font-medium">
                Build a steady practice habit, use optional grace tokens for missed days, and collect badges for completed activities. Tokens preserve a counter; they do not replace learning.
              </p>
            </div>

            {/* Daily Pace Selector */}
            <div className="flex items-center gap-2 p-1.5 rounded-full kahoot-question-box">
              <span className="text-xs font-mono font-extrabold text-slate-300 pl-3 pr-1">
                Daily Goal:
              </span>
              {([5, 10, 15] as const).map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() =>
                    setUserState((prev) => ({ ...prev, dailyGoalMinutes: mins }))
                  }
                  className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all ${
                    userState.dailyGoalMinutes === mins
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {mins}m / day
                </button>
              ))}
            </div>
          </div>

          {/* 14-Day Streak Banner with Box-Behind-Stage Shadow */}
          <div className="box-behind-stage">
            <div className="rounded-[28px] glass-gold p-6 sm:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Flame Counter */}
                <div className="lg:col-span-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl kahoot-tile kahoot-tile-red flex items-center justify-center shrink-0">
                    <Flame className="w-9 h-9 text-amber-200 fill-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-extrabold text-3xl sm:text-4xl text-white">
                        {userState.streakDays} Day Streak
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-200 font-semibold mt-0.5">
                      {userState.todayCompleted
                        ? '✓ Learning activity recorded today.'
                        : 'Complete a challenge, quiz, or sample lesson today to continue your streak.'}
                    </p>
                  </div>
                </div>

                {/* 7-Day Visual Flame Strip */}
                <div className="lg:col-span-5">
                  <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-amber-300 mb-2">
                    Learning activity · last 7 days
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {weeklyActivity.map((day, index) => (
                      <div
                        key={`${day.day}-${index}`}
                        className={`p-2.5 rounded-2xl border text-center flex flex-col items-center gap-1 ${
                          day.active
                            ? 'bg-black/45 border-amber-400/60 shadow-[0_4px_0_0_#05040A]'
                            : 'bg-black/25 border-dashed border-white/25'
                        }`}
                      >
                        <span className="text-[10px] font-mono font-extrabold text-slate-300">
                          {day.isToday ? 'Today' : day.day}
                        </span>
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            day.active
                              ? 'bg-gradient-to-br from-emerald-500 to-teal-400 text-white'
                              : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {day.active ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs">·</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Streak Freeze Shield Toggle */}
                <div className="lg:col-span-3 flex flex-col items-start lg:items-end justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!userState.streakFreezeActive && userState.streakFreezeTokens === 0) {
                        showToast('No grace tokens available', 'Redeem the recovery-token reward in the Rewards Vault first.');
                        return;
                      }
                      setUserState((prev) => ({
                        ...prev,
                        streakFreezeActive: !prev.streakFreezeActive,
                      }));
                    }}
                    className={`px-4 py-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      userState.streakFreezeActive
                        ? 'bg-black/45 border-emerald-400/60 shadow-[0_5px_0_0_#05040A]'
                        : 'bg-black/25 border-white/20 opacity-75'
                    }`}
                  >
                    <ShieldCheck
                      className={`w-6 h-6 shrink-0 ${
                        userState.streakFreezeActive ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-extrabold text-white">
                        Streak Grace:{' '}
                        {userState.streakFreezeActive ? `ARMED · ${userState.streakFreezeTokens} left` : `PAUSED · ${userState.streakFreezeTokens} left`}
                      </div>
                      <div className="text-[11px] text-slate-300 font-medium">
Consumes one token per missed day; no learning activity is recorded
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Collectible Achievement Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ACHIEVEMENTS_LIST.map((badge) => {
              const isUnlocked = userState.unlockedAchievementIds.includes(badge.id);

              return (
                <div
                  key={badge.id}
                  className={`rounded-[24px] p-5 transition-all flex flex-col justify-between gap-4 ${
                    isUnlocked
                      ? 'kahoot-question-box'
                      : 'glass-panel opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                          isUnlocked
                            ? 'bg-amber-500/20 border-amber-400 shadow-[0_3px_0_0_#05040A]'
                            : 'bg-white/5 border-white/15'
                        }`}
                      >
                        {renderAchievementIcon(badge.iconName)}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/25 text-violet-200 border border-violet-400/40">
                          {badge.rarity} · {badge.category}
                        </span>
                        <h3 className="font-extrabold text-base text-white mt-1">
                          {badge.title}
                        </h3>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-extrabold text-amber-300 bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 rounded-full">
                      +{badge.xpBonus} XP
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                    {badge.subtitle}
                  </p>

                  <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 font-extrabold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Unlocked on this profile
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-slate-400">
                        🔒 {badge.requirementText}
                      </span>
                    )}

                    {isUnlocked && (
                      <button
                        type="button"
                        onClick={() => {
                          setScorecardConfig((prev) => ({
                            ...prev,
                            headline: `Unlocked Badge: ${badge.title}`,
                            category: `${badge.rarity} Achievement · +${badge.xpBonus} XP`,
                            takeawayQuote: badge.subtitle,
                          }));
                          navigateToPage('scorecards');
                        }}
                        className="text-amber-300 hover:text-white font-extrabold underline"
                      >
                        Share Badge →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        </div>)}

        {activePage === 'science' && (<div id="science" className="space-y-10">
<section id="neuro-palette" className="scroll-mt-24 space-y-7">
          <div className="box-behind-gold">
            <div className="rounded-[30px] glass-card p-6 sm:p-9 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/15 pb-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40 text-xs font-mono font-extrabold uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span>Learning Science · Interface Design</span>
                  </div>
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                    Serious about learning, careful about brain claims
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl">
                  Color and shape are used as redundant interface cues for grouping and feedback. Screen colors do not map to single wavelengths or neurotransmitters, and PASHco does not claim to measure brain state.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {NEURO_PALETTE_GUIDE.map((channel) => {
                  const isSelected = selectedNeuroChannel.id === channel.id;
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`${channel.cueLabel}, ${channel.name}`}
                      onClick={() => setSelectedNeuroChannel(channel)}
                      className={`kahoot-tile ${channel.bgClass} p-4 text-left flex flex-col justify-between gap-3 min-h-[125px] ${
                        isSelected ? 'ring-4 ring-amber-300 scale-[1.03]' : 'opacity-90'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="w-8 h-8 rounded-lg bg-black/30 border border-white/40 flex items-center justify-center text-lg font-extrabold">
                          {channel.kahootShape}
                        </span>
                        <span className="font-mono text-[10px] font-extrabold bg-black/30 px-2 py-0.5 rounded-full">
                          {channel.hexCode}
                        </span>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-white leading-tight">{channel.name}</div>
                        <div className="text-[11px] text-white/90 font-mono mt-0.5">{channel.cueLabel}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-5 rounded-2xl kahoot-question-box grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-4 flex items-center gap-3.5">
                  <div className={`w-14 h-14 rounded-2xl kahoot-tile ${selectedNeuroChannel.bgClass} flex items-center justify-center text-2xl font-extrabold shrink-0`}>
                    {selectedNeuroChannel.kahootShape}
                  </div>
                  <div>
                    <div className="text-xs font-mono font-extrabold uppercase text-amber-300">
                      {selectedNeuroChannel.hexCode} · interface cue
                    </div>
                    <h3 className="text-lg font-extrabold text-white">{selectedNeuroChannel.name}</h3>
                    <div className="text-xs font-bold text-slate-300">{selectedNeuroChannel.designRole}</div>
                  </div>
                </div>
                <div className="md:col-span-8 md:border-l md:border-white/15 md:pl-6 space-y-1">
                  <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-blue-400" />Design rationale
                  </div>
                  <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
                    {selectedNeuroChannel.designRationale}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-amber-300">What the product actually uses</div>
                <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white">Research-informed learning mechanisms</h3>
              </div>
              <span className="text-[11px] text-slate-400">Selected research references and explicit limitations are included below.</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {CLINICAL_NEURO_MECHANISMS.map((mechanism) => (
                <article key={mechanism.id} className="rounded-[24px] glass-card p-5 sm:p-6 space-y-3">
                  <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-violet-300">{mechanism.learningSystem}</div>
                  <h4 className="text-lg font-extrabold text-white">{mechanism.title}</h4>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/15 font-mono text-xs text-amber-200">{mechanism.equation}</div>
                  <p className="text-sm text-slate-200 leading-relaxed">{mechanism.clinicalSummary}</p>
                  <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-400/30 space-y-1">
                    <div className="text-[10px] font-mono font-extrabold uppercase text-blue-300">PASHco implementation</div>
                    <p className="text-xs text-slate-200 leading-relaxed">{mechanism.howPashcoImplementsIt}</p>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed"><strong className="text-slate-300">Evidence basis:</strong> {mechanism.evidenceBasis}</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed"><strong className="text-amber-200">Limitations:</strong> {mechanism.limitations}</div>
                </article>
              ))}
            </div>
          </div>
        </section>
        </div>)}

        {activePage === 'insights' && (<div id="insights-page" className="space-y-10">
<section id="insights" className="scroll-mt-24 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-widest text-blue-300">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Pillar 02 · Substack-Inspired Creator Knowledge & Essays</span>
              </div>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                Expert Insights & Resident Fellow Dispatches
              </h2>
              <p className="text-slate-300 max-w-2xl text-base font-medium">
                High-signal short essays from researchers, designers, and strategists—each paired with an interactive Kahoot synthesis check so ideas stick permanently.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full kahoot-question-box text-xs font-mono font-extrabold text-white">
              <Bookmark className="w-3.5 h-3.5 text-amber-300" />
              <span>Saved Dispatches: {userState.bookmarkedInsightIds.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Featured Essay (Left 7 Columns) wrapped in Box-Behind-Stage */}
            {EXPERT_INSIGHTS.slice(0, 1).map((featured) => {
              const isRead = userState.readInsightIds.includes(featured.id);
              const isSaved = userState.bookmarkedInsightIds.includes(featured.id);

              return (
                <div key={featured.id} className="lg:col-span-7 box-behind-stage">
                  <div className="h-full rounded-[28px] glass-card p-6 sm:p-9 flex flex-col justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="px-3 py-1 rounded-full arena-stage-header font-mono text-xs font-extrabold">
                          {featured.issueNumber}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-300">
                            {featured.readTime}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleBookmark(featured.id)}
                            className={`p-2 rounded-full border transition-colors ${
                              isSaved
                                ? 'bg-amber-400 text-slate-950 border-amber-300'
                                : 'bg-white/10 text-slate-200 border-white/20 hover:bg-white/20'
                            }`}
                            aria-label="Bookmark featured essay"
                          >
                            <Bookmark className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-white leading-tight">
                        {featured.title}
                      </h3>

                      <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">
                        {featured.subtitle}
                      </p>

                      <blockquote className="p-5 rounded-2xl kahoot-question-box font-serif italic text-lg text-amber-200">
                        {featured.pullQuote}
                      </blockquote>

                      <div className="space-y-2 pt-1">
                        <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-amber-300">
                          Key Takeaways Inside This Dispatch:
                        </div>
                        <ul className="space-y-1.5">
                          {featured.keyTakeaways.map((kt, i) => (
                            <li key={i} className="text-xs sm:text-sm text-slate-200 font-medium flex items-start gap-2">
                              <span className="text-amber-400 font-extrabold">•</span>
                              <span>{kt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Author + Read CTA */}
                    <div className="pt-5 border-t border-white/15 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full arena-stage-header font-extrabold text-sm flex items-center justify-center">
                          {featured.author.avatarInitials}
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-white flex items-center gap-1">
                            {featured.author.name}
                            <ShieldCheck className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="text-xs text-slate-300 font-medium">
                            {featured.author.role} · {featured.author.publication}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveInsightModal(featured)}
                        className="btn-gold px-6 py-3 rounded-full font-extrabold text-sm inline-flex items-center gap-2"
                      >
                        <span>
                          {isRead
                            ? 'Re-Read Essay'
                            : `Read Dispatch & Play Quiz (+${featured.synthesisQuestion.xpReward} XP)`}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Right 5 Columns: Secondary Creator Dispatches */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-6">
              {EXPERT_INSIGHTS.slice(1).map((insight, idx) => {
                const isRead = userState.readInsightIds.includes(insight.id);
                const isSaved = userState.bookmarkedInsightIds.includes(insight.id);

                return (
                  <div
                    key={insight.id}
                    className={idx === 0 ? 'box-behind-blue' : 'box-behind-gold'}
                  >
                    <div className="rounded-[24px] glass-card glass-card-interactive p-6 flex flex-col justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-amber-300 font-extrabold">{insight.issueNumber}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-300 font-bold">{insight.readTime}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleBookmark(insight.id)}
                              className={`p-1.5 rounded-full border ${
                                isSaved
                                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                                  : 'bg-white/10 text-slate-300 border-white/20'
                              }`}
                              aria-label="Save essay"
                            >
                              <Bookmark className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h3 className="font-serif text-xl sm:text-2xl font-semibold text-white leading-snug">
                          {insight.title}
                        </h3>

                        <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                          {insight.subtitle}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/15 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full arena-stage-header font-extrabold text-xs flex items-center justify-center">
                            {insight.author.avatarInitials}
                          </div>
                          <div className="text-xs">
                            <div className="font-extrabold text-white">{insight.author.name}</div>
                            <div className="text-slate-400 font-medium">{insight.author.publication}</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveInsightModal(insight)}
                          className="btn-dark-surface px-4 py-2 rounded-full font-extrabold text-xs inline-flex items-center gap-1.5"
                        >
                          <span>{isRead ? 'Synthesized ✓' : 'Read & Verify'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        </div>)}

        {activePage === 'scorecards' && (<div id="scorecards-page" className="space-y-10">
<section id="scorecards" className="scroll-mt-24 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-widest text-emerald-300">
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>Pillar 03 · Instagram-Inspired Shareable Learning Achievements</span>
              </div>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                Shareable Learning Scorecard Studio
              </h2>
              <p className="text-slate-300 max-w-2xl text-base font-medium">
                Turn daily intellectual momentum into a visual social artifact. Customize your theme, aspect ratio, and takeaway quote, then download a crisp PNG for Instagram Stories or LinkedIn.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportScorecardPng}
                className="btn-gold px-5 py-2.5 rounded-full font-extrabold text-xs sm:text-sm inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Scorecard PNG</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 6 Cols: Interactive Customizer Controls with Box-Behind-Gold */}
            <div className="lg:col-span-6 box-behind-gold">
              <div className="rounded-[28px] glass-card p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-white/15 pb-4">
                  <h3 className="font-extrabold text-lg text-white">
                    Customize Your Scorecard Artifact
                  </h3>
                  <span className="text-xs font-mono text-amber-300 bg-amber-500/20 border border-amber-400/40 px-2.5 py-0.5 rounded-full font-extrabold">
                    Live Canvas Sync
                  </span>
                </div>

                {/* Milestone Quick Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-300 block">
                    1. Choose Achievement Preset
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        label: 'Second-Order Thinking',
                        headline: 'Sample: Second-Order Thinking & Incentive Systems',
                        category: 'Mental Models · Sample module',
                        quote:
                          'First-order thinking asks "What happens next?" Second-order thinking asks "And then what happens after that?"',
                      },
                      {
                        label: 'LLM Reasoning Architecture',
                        headline: 'Completed: How Large Language Models Reason',
                        category: 'AI & Future Tech · Micro-Lesson #02',
                        quote:
                          'Generating intermediate reasoning tokens expands the serial compute budget allocated to a complex problem.',
                      },
                      {
                        label: `${userState.streakDays}-Day Streak Milestone`,
                        headline: `Reached a ${userState.streakDays}-Day Active Recall Streak on PASHco`,
                        category: 'Consistency Milestone · Local progress',
                        quote:
                          'A short attempt to recall, followed by feedback and a later review, is a practical learning routine.'
                      },
                    ].map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setScorecardConfig((prev) => ({
                            ...prev,
                            headline: preset.headline,
                            category: preset.category,
                            takeawayQuote: preset.quote,
                          }))
                        }
                        className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-white/10 hover:bg-amber-400 hover:text-slate-950 border border-white/20 text-slate-200 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Aesthetic Theme Picker */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-300 block">
                      2. Visual Theme
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: 'obsidian-luxe', label: 'Obsidian Luxe' },
                          { id: 'sunlit-gold', label: 'Sunlit Gold' },
                          { id: 'alabaster-editorial', label: 'Alabaster Glass' },
                          { id: 'amber-prism', label: 'Amber Prism' },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setScorecardConfig((prev) => ({ ...prev, theme: t.id }))
                          }
                          className={`px-3 py-2 rounded-xl text-xs font-extrabold border text-left transition-all ${
                            scorecardConfig.theme === t.id
                              ? 'bg-amber-400 text-slate-950 border-amber-300'
                              : 'bg-white/10 text-slate-200 border-white/15 hover:bg-white/20'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-300 block">
                      3. Social Aspect Ratio
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setScorecardConfig((prev) => ({ ...prev, format: 'portrait' }))
                        }
                        className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                          scorecardConfig.format === 'portrait'
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : 'bg-white/10 text-slate-200 border-white/15'
                        }`}
                      >
                        4:5 Feed Portrait
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setScorecardConfig((prev) => ({ ...prev, format: 'story' }))
                        }
                        className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                          scorecardConfig.format === 'story'
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : 'bg-white/10 text-slate-200 border-white/15'
                        }`}
                      >
                        9:16 IG Story
                      </button>
                    </div>
                  </div>
                </div>

                {/* Editable Identity & Takeaway Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="scorecard-name"
                      className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-300 block mb-1"
                    >
                      Learner Name
                    </label>
                    <input
                      id="scorecard-name"
                      type="text"
                      value={scorecardConfig.learnerName}
                      onChange={(e) =>
                        setScorecardConfig((prev) => ({ ...prev, learnerName: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="scorecard-handle"
                      className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-300 block mb-1"
                    >
                      Social Handle
                    </label>
                    <input
                      id="scorecard-handle"
                      type="text"
                      value={scorecardConfig.handle}
                      onChange={(e) =>
                        setScorecardConfig((prev) => ({ ...prev, handle: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="scorecard-headline"
                    className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-300 block mb-1"
                  >
                    Achievement Headline
                  </label>
                  <input
                    id="scorecard-headline"
                    type="text"
                    value={scorecardConfig.headline}
                    onChange={(e) =>
                      setScorecardConfig((prev) => ({ ...prev, headline: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="scorecard-quote"
                    className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-300 block mb-1"
                  >
                    Key Mental Model / Reflection Note
                  </label>
                  <textarea
                    id="scorecard-quote"
                    rows={2}
                    value={scorecardConfig.takeawayQuote}
                    onChange={(e) =>
                      setScorecardConfig((prev) => ({ ...prev, takeawayQuote: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm font-medium text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Export & Copy Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleExportScorecardPng}
                    className="btn-gold px-6 py-3.5 rounded-full font-extrabold text-sm inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export High-Res PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyScorecardText}
                    className="btn-dark-surface px-5 py-3.5 rounded-full font-extrabold text-sm inline-flex items-center gap-2"
                  >
                    {copiedShareText ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Copied Share Text!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-amber-300" />
                        <span>Copy Share Caption</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right 6 Cols: Live Rendered Scorecard Preview with Box-Behind-Stage */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center">
              <div className="box-behind-stage w-full max-w-md">
                <div
                  className={`w-full rounded-[32px] p-6 sm:p-8 border-2 border-amber-400/50 shadow-[0_10px_0_0_#05040A] transition-all duration-300 relative overflow-hidden ${
                    scorecardConfig.format === 'story' ? 'min-h-[620px]' : 'min-h-[500px]'
                  } ${
                    scorecardConfig.theme === 'obsidian-luxe'
                      ? 'bg-gradient-to-br from-[#131122] via-[#1C1833] to-[#0E0C1A] text-white'
                      : scorecardConfig.theme === 'amber-prism'
                      ? 'bg-gradient-to-br from-amber-50 via-gold-200 to-amber-300 text-obsidian-900'
                      : scorecardConfig.theme === 'alabaster-editorial'
                      ? 'bg-gradient-to-br from-white via-ivory-50 to-ivory-200 text-obsidian-900'
                      : 'bg-gradient-to-br from-ivory-50 via-gold-100 to-gold-200 text-obsidian-900'
                  }`}
                >
                  <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                    {/* Scorecard Brand Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl arena-stage-header font-extrabold text-sm flex items-center justify-center text-amber-300">
                          P
                        </div>
                        <div>
                          <div className="font-display font-extrabold text-sm tracking-tight">
                            PASHco
                          </div>
                          <div
                            className={`text-[10px] font-mono font-bold uppercase tracking-widest ${
                              scorecardConfig.theme === 'obsidian-luxe'
                                ? 'text-amber-300'
                                : 'text-violet-800'
                            }`}
                          >
                            PASHco Scorecard
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase ${
                          scorecardConfig.theme === 'obsidian-luxe'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                            : 'bg-white text-obsidian-900 border border-obsidian-900'
                        }`}
                      >
                        {scorecardConfig.format === 'story' ? '9:16 Story' : '4:5 Social'}
                      </span>
                    </div>

                    {/* Category & Headline */}
                    <div className="space-y-2.5">
                      <div
                        className={`text-xs font-mono font-extrabold uppercase tracking-wider ${
                          scorecardConfig.theme === 'obsidian-luxe'
                            ? 'text-amber-300'
                            : 'text-violet-900'
                        }`}
                      >
                        {scorecardConfig.category}
                      </div>
                      <h4 className="font-display font-extrabold text-2xl sm:text-3xl leading-tight">
                        {scorecardConfig.headline}
                      </h4>
                    </div>

                    {/* Takeaway Quote Card */}
                    <div
                      className={`p-4 rounded-2xl border ${
                        scorecardConfig.theme === 'obsidian-luxe'
                          ? 'bg-white/10 border-amber-400/35 text-slate-100'
                          : 'bg-white/95 border-obsidian-900/20 text-obsidian-900'
                      }`}
                    >
                      <div
                        className={`text-[10px] font-mono font-extrabold uppercase tracking-wider mb-1 ${
                          scorecardConfig.theme === 'obsidian-luxe'
                            ? 'text-amber-300'
                            : 'text-amber-800'
                        }`}
                      >
                        Synthesized Takeaway
                      </div>
                      <p className="font-serif italic text-sm sm:text-base font-medium leading-relaxed">
                        “{scorecardConfig.takeawayQuote}”
                      </p>
                    </div>

                    {/* 4-Metric Neuro-Colored Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          label: '▲ DAILY STREAK',
                          value: `${scorecardConfig.streakDays} Days 🔥`,
                        },
                        {
                          label: '◆ ARENA SCORE',
                          value: `${userState.arenaPoints.toLocaleString()} PTS`,
                        },
                        {
                          label: '● QUIZ ACCURACY',
                          value: `${scorecardConfig.quizAccuracy}%`,
                        },
                        {
                          label: '■ MODULES MASTERED',
                          value: `${scorecardConfig.lessonsCompleted} Lessons`,
                        },
                      ].map((stat, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-2xl border ${
                            scorecardConfig.theme === 'obsidian-luxe'
                              ? 'bg-black/35 border-white/15'
                              : 'bg-white/95 border-obsidian-900/20'
                          }`}
                        >
                          <div
                            className={`text-[10px] font-mono font-extrabold ${
                              scorecardConfig.theme === 'obsidian-luxe'
                                ? 'text-slate-300'
                                : 'text-obsidian-600'
                            }`}
                          >
                            {stat.label}
                          </div>
                          <div
                            className={`font-display font-extrabold text-lg mt-0.5 ${
                              scorecardConfig.theme === 'obsidian-luxe'
                                ? 'text-amber-300'
                                : 'text-obsidian-900'
                            }`}
                          >
                            {stat.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Learner Signature Footer */}
                    <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold">{scorecardConfig.learnerName}</span>{' '}
                        <span className="opacity-75 font-mono">{scorecardConfig.handle}</span>
                      </div>
                      <span className="font-mono font-bold opacity-85">{scorecardConfig.dateLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        </div>)}

        {activePage === 'ai-studio' && (
          <section id="ai-studio" className="space-y-8">
            <div className="space-y-2 max-w-3xl"><div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-widest text-emerald-200"><Sparkles className="w-4 h-4 text-emerald-300" />AI Course Studio</div><h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white">Build a course around what you want to learn</h1><p className="text-sm text-slate-300 leading-relaxed">Describe a learning goal and create an outline with objectives, short modules, recall questions, and explanations.</p></div>
            <AiCourseGenerator isSignedIn={!!googleUser} courseApiUrl={apiConfig.courseApiUrl} googleIdToken={googleIdToken} onNavigateToProfile={() => navigateToPage('profile')} onNavigateToSettings={() => navigateToPage('settings')} onNotify={showToast} />
          </section>
        )}

        {activePage === 'profile' && (<div id="profile-page" className="space-y-10">{renderAccountHub('profile')}</div>)}
        {activePage === 'rewards' && (<div id="rewards-page" className="space-y-10">{renderAccountHub('rewards')}</div>)}
        {activePage === 'settings' && (<div id="settings" className="space-y-10">{renderAccountHub('settings')}</div>)}

        {activePage === 'about' && (<div id="about" className="space-y-10">
<section id="why-pashco" className="scroll-mt-24 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full arena-stage-header text-xs font-mono font-extrabold uppercase tracking-widest">
              <Layers className="w-3.5 h-3.5 text-amber-300" />
              <span>Why PASHco Is Different</span>
            </div>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
              A course platform built around active retrieval, feedback, and review.
            </h2>
            <p className="text-slate-300 text-base sm:text-lg font-medium">
              Traditional platforms force a trade-off between addictive game mechanics, deep editorial substance, and social community. PASHco unifies all three.
            </p>
          </div>

          {/* 3-Column Comparison Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-[24px] glass-panel p-6 space-y-3">
              <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-rose-400">
                Legacy Video Courses & MOOCs
              </div>
              <h3 className="font-extrabold text-xl text-white">
                Long-form content can be hard to finish
              </h3>
              <p className="text-sm text-slate-300 font-medium leading-relaxed">
                Long lectures can demand uninterrupted time. PASHco breaks the first interaction into sample modules, while clearly showing the estimated scope of each full course track.
              </p>
            </div>

            <div className="rounded-[24px] glass-panel p-6 space-y-3">
              <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-blue-400">
                Passive Newsletters & Feeds
              </div>
              <h3 className="font-extrabold text-xl text-white">
                Recognition is not the same as recall
              </h3>
              <p className="text-sm text-slate-300 font-medium leading-relaxed">
                Rereading can make material feel familiar without showing whether it can be retrieved later. PASHco adds questions and explanations so learners can check their understanding.
              </p>
            </div>

            <div className="box-behind-gold">
              <div className="h-full rounded-[24px] glass-gold p-6 space-y-3">
                <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>The PASHco Synthesis</span>
                </div>
                <h3 className="font-extrabold text-xl text-white">
                  Retrieve · Check · Review · Reflect
                </h3>
                <p className="text-sm text-slate-100 font-medium leading-relaxed">
                  PASHco pairs creator-grade mental models with instant 2×2 Kahoot recall arenas, streak protection, and shareable Instagram-ready scorecards.
                </p>
              </div>
            </div>
          </div>

          {/* Product Roadmap & Long-Term Educational Ecosystem Vision */}
          <div className="box-behind-stage">
            <div className="rounded-[32px] glass-card p-6 sm:p-10 space-y-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-widest text-amber-300">
                    <GraduationCap className="w-4 h-4 text-amber-400" />
                    <span>Modular Architecture & Long-Term Ecosystem Roadmap</span>
                  </div>
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                    From Digital Daily Arena to Physical Schools & Universities
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-300">
                  Structured for scalable educational expansion
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {PRODUCT_ROADMAP.map((item, idx) => {
                  const isLive = item.status === 'LIVE MVP';
                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl p-5 flex flex-col justify-between gap-4 ${
                        isLive
                          ? 'kahoot-question-box'
                          : 'bg-black/35 border border-white/15'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-extrabold text-slate-300">
                            {item.phase}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase ${
                              isLive
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                                : 'bg-violet-500/20 text-violet-200 border border-violet-400/30'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-lg text-white leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                          {item.subtitle}
                        </p>
                      </div>

                      <ul className="space-y-1.5 pt-3 border-t border-white/15">
                        {item.capabilities.map((cap, cIdx) => (
                          <li
                            key={cIdx}
                            className="text-xs text-slate-200 font-medium flex items-start gap-1.5"
                          >
                            <span className="text-emerald-400 font-extrabold">✓</span>
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
        </div>)}
      </main>
        </div>
      </div>

      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0B0A12]/95 backdrop-blur-xl px-2 pt-2 pb-2 lg:hidden">
        <div className="max-w-lg mx-auto grid grid-cols-4 gap-1">
          {[
            { page: 'learn' as const, label: 'Learn', icon: BookOpen },
            { page: 'arena' as const, label: 'Arena', icon: Target },
            { page: 'progress' as const, label: 'Progress', icon: Flame },
            { page: 'profile' as const, label: 'Profile', icon: Award },
          ].map((item) => {
            const Icon = item.icon;
            const selected = activePage === item.page;
            return <button key={item.page} type="button" aria-current={selected ? 'page' : undefined} onClick={() => navigateToPage(item.page)} className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-extrabold ${selected ? 'text-emerald-200' : 'text-slate-400'}`}><Icon className="w-4 h-4" /><span>{item.label}</span></button>;
          })}
        </div>
      </nav>

      <footer className="border-t border-white/10 bg-[#0B0A12]/75 glass-panel mt-8 pb-16 lg:pb-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-xl arena-stage-header flex items-center justify-center font-display font-extrabold text-lg text-amber-300">P</div><span className="font-display font-extrabold text-xl text-white">PASHco</span></div>
            <p className="max-w-sm text-xs text-slate-400 leading-relaxed">A retrieval-first learning MVP with 15 estimated course tracks, sample modules, account-scoped progress and an optional secure API.</p>
            <div className="flex flex-col gap-1.5 text-xs font-semibold text-slate-400"><a href="mailto:cyberjai2k25@gmail.com" className="hover:text-amber-300">cyberjai2k25@gmail.com</a><a href="https://instagram.com/love_me_for_my_wits" target="_blank" rel="noreferrer" className="hover:text-pink-300">@love_me_for_my_wits</a></div>
          </div>
          <div className="space-y-3">
            <div className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-500">Explore PASHco</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-semibold text-slate-300">
              <button type="button" onClick={() => navigateToPage('learn')} className="text-left hover:text-white">Course path</button>
              <button type="button" onClick={() => navigateToPage('arena')} className="text-left hover:text-white">Daily Arena</button>
              <button type="button" onClick={() => navigateToPage('progress')} className="text-left hover:text-white">Progress</button>
              <button type="button" onClick={() => navigateToPage('ai-studio')} className="text-left hover:text-white">AI Course Studio</button>
              <button type="button" onClick={() => navigateToPage('settings')} className="text-left hover:text-white">Google & API</button>
              <button type="button" onClick={() => navigateToPage('rewards')} className="text-left hover:text-white">Rewards</button>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-4">
            <div className="text-xs text-slate-500">© {new Date().getFullYear()} PASHco · Sample-module progress is not full-course completion.</div>
            <button type="button" onClick={() => {
              localStorage.removeItem(progressStorageKey(currentProgressSubject));
              setUserState(createInitialUserState());
              setSelectedChallengeOption({});
              setSubmittedChallenges({});
              setQuizLabSelections({});
              setQuizLabSubmitted({});
              showToast('Profile progress reset', 'Only the current guest or Google-account progress record was cleared from this browser.');
            }} className="self-start inline-flex items-center gap-1.5 text-[11px] font-mono font-extrabold text-amber-300 hover:underline">
              <RotateCcw className="w-3.5 h-3.5" /> Reset this profile
            </button>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          INTERACTIVE MODALS (LESSON PLAYER + EDITORIAL INSIGHT READER)
      ===================================================================== */}
      <LessonPlayerModal
        lesson={activeLessonModal}
        isCompleted={
          activeLessonModal
            ? userState.completedLessonIds.includes(activeLessonModal.id)
            : false
        }
        onClose={() => setActiveLessonModal(null)}
        onCompleteLesson={handleCompleteLesson}
        onShareLessonScorecard={handleShareLessonScorecard}
      />

      <InsightReaderModal
        insight={activeInsightModal}
        isRead={
          activeInsightModal ? userState.readInsightIds.includes(activeInsightModal.id) : false
        }
        isBookmarked={
          activeInsightModal
            ? userState.bookmarkedInsightIds.includes(activeInsightModal.id)
            : false
        }
        onClose={() => setActiveInsightModal(null)}
        onToggleBookmark={handleToggleBookmark}
        onCompleteSynthesis={handleCompleteInsightSynthesis}
        onShareInsightScorecard={handleShareInsightScorecard}
      />
    </div>
  );
}
export default App;
