export interface CalibrationObservation {
  confidence: number;
  correct: boolean;
  recordedAt: string;
}

export interface CourseReviewRecord {
  reviewCount: number;
  intervalDays: number;
  latestAccuracy: number;
  lastReviewedAt: string;
  nextDueAt: string;
}

export interface PersistedUserState {
  xp: number;
  arenaPoints: number;
  comboStreak: number;
  streakDays: number;
  todayCompleted: boolean;
  lastActivityDate: string | null;
  dailyGoalMinutes: 5 | 10 | 15;
  streakFreezeActive: boolean;
  streakFreezeTokens: number;
  activityDates: string[];
  completedLessonIds: string[];
  solvedChallengeIds: string[];
  readInsightIds: string[];
  bookmarkedInsightIds: string[];
  solvedQuizLabIds: string[];
  unlockedAchievementIds: string[];
  claimedRewardIds: string[];
  rewardClaimCodes: Record<string, string>;
  domainMastery: Record<string, number>;
  calibrationObservations: CalibrationObservation[];
  courseReviewById: Record<string, CourseReviewRecord>;
}

export const PROGRESS_STORAGE_PREFIX = 'pashco_progress_v3_';

export function createInitialUserState(): PersistedUserState {
  return {
    xp: 0,
    arenaPoints: 0,
    comboStreak: 0,
    streakDays: 0,
    todayCompleted: false,
    lastActivityDate: null,
    dailyGoalMinutes: 10,
    streakFreezeActive: false,
    streakFreezeTokens: 0,
    activityDates: [],
    completedLessonIds: [],
    solvedChallengeIds: [],
    readInsightIds: [],
    bookmarkedInsightIds: [],
    solvedQuizLabIds: [],
    unlockedAchievementIds: [],
    claimedRewardIds: [],
    rewardClaimCodes: {},
    domainMastery: {},
    calibrationObservations: [],
    courseReviewById: {},
  };
}

export function progressStorageKey(subject: string | null): string {
  const accountKey = subject ? encodeURIComponent(subject) : 'guest';
  return `${PROGRESS_STORAGE_PREFIX}${accountKey}`;
}

export function loadUserProgress(subject: string | null): PersistedUserState {
  const empty = createInitialUserState();
  try {
    const raw = localStorage.getItem(progressStorageKey(subject));
    if (!raw) return empty;
    const saved = JSON.parse(raw) as Partial<PersistedUserState>;
    const state: PersistedUserState = {
      ...empty,
      ...saved,
      completedLessonIds: Array.isArray(saved.completedLessonIds) ? saved.completedLessonIds : [],
      solvedChallengeIds: Array.isArray(saved.solvedChallengeIds) ? saved.solvedChallengeIds : [],
      readInsightIds: Array.isArray(saved.readInsightIds) ? saved.readInsightIds : [],
      bookmarkedInsightIds: Array.isArray(saved.bookmarkedInsightIds) ? saved.bookmarkedInsightIds : [],
      solvedQuizLabIds: Array.isArray(saved.solvedQuizLabIds) ? saved.solvedQuizLabIds : [],
      unlockedAchievementIds: Array.isArray(saved.unlockedAchievementIds) ? saved.unlockedAchievementIds : [],
      claimedRewardIds: Array.isArray(saved.claimedRewardIds) ? saved.claimedRewardIds : [],
      rewardClaimCodes: saved.rewardClaimCodes || {},
      domainMastery: saved.domainMastery || {},
      calibrationObservations: Array.isArray(saved.calibrationObservations)
        ? saved.calibrationObservations.slice(-200)
        : [],
      courseReviewById: saved.courseReviewById || {},
      streakFreezeTokens: Math.max(0, Number(saved.streakFreezeTokens) || 0),
      activityDates: Array.isArray(saved.activityDates) ? saved.activityDates.slice(-90) : [],
    };

    // Reconcile missed calendar days. An armed local grace token covers one
    // elapsed day at a time; grace days preserve the streak counter but are not
    // recorded as learning activity.
    const today = getLocalDateKey();
    state.todayCompleted = state.lastActivityDate === today;
    if (state.lastActivityDate) {
      const elapsedDays = calendarDaysBetween(state.lastActivityDate, today);
      const missedDays = Math.max(0, elapsedDays - 1);
      if (missedDays > 0) {
        if (state.streakFreezeActive && state.streakFreezeTokens >= missedDays) {
          state.streakFreezeTokens -= missedDays;
          state.lastActivityDate = addCalendarDays(today, -1);
          state.todayCompleted = false;
        } else {
          state.streakDays = 0;
          state.comboStreak = 0;
          state.streakFreezeActive = false;
          state.todayCompleted = false;
        }
      }
    }
    return state;
  } catch {
    return empty;
  }
}

export function saveUserProgress(subject: string | null, state: PersistedUserState): void {
  try {
    localStorage.setItem(progressStorageKey(subject), JSON.stringify(state));
  } catch {
    // Storage can be unavailable or full; the active session can still continue.
  }
}

/** Validate the response body before hydrating progress returned by the API. */
export function hydrateRemoteUserProgress(candidate: unknown): PersistedUserState | null {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const source = candidate as Record<string, unknown>;
  const initial = createInitialUserState();
  const nonNegativeInt = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
  const stringArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  const dateKey = typeof source.lastActivityDate === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(source.lastActivityDate)
    ? source.lastActivityDate
    : null;
  const activityDates = stringArray(source.activityDates).filter((value) => /^\\d{4}-\\d{2}-\\d{2}$/.test(value)).slice(-90);
  const calibrationObservations = Array.isArray(source.calibrationObservations)
    ? source.calibrationObservations
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
        .filter((item) => typeof item.confidence === 'number' && item.confidence >= 0 && item.confidence <= 1 && typeof item.correct === 'boolean')
        .map((item) => ({
          confidence: item.confidence as number,
          correct: item.correct as boolean,
          recordedAt: typeof item.recordedAt === 'string' ? item.recordedAt : new Date().toISOString(),
        }))
        .slice(-200)
    : [];
  const domainMastery: Record<string, number> = {};
  if (source.domainMastery && typeof source.domainMastery === 'object' && !Array.isArray(source.domainMastery)) {
    for (const [key, value] of Object.entries(source.domainMastery as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value)) domainMastery[key] = Math.max(0, Math.min(100, value));
    }
  }
  const rewardClaimCodes: Record<string, string> = {};
  if (source.rewardClaimCodes && typeof source.rewardClaimCodes === 'object' && !Array.isArray(source.rewardClaimCodes)) {
    for (const [key, value] of Object.entries(source.rewardClaimCodes as Record<string, unknown>)) {
      if (typeof value === 'string') rewardClaimCodes[key] = value;
    }
  }
  const courseReviewById: Record<string, CourseReviewRecord> = {};
  if (source.courseReviewById && typeof source.courseReviewById === 'object' && !Array.isArray(source.courseReviewById)) {
    for (const [key, value] of Object.entries(source.courseReviewById as Record<string, unknown>)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const record = value as Record<string, unknown>;
      if (typeof record.lastReviewedAt !== 'string' || typeof record.nextDueAt !== 'string') continue;
      courseReviewById[key] = {
        reviewCount: nonNegativeInt(record.reviewCount, 0),
        intervalDays: nonNegativeInt(record.intervalDays, 1),
        latestAccuracy: Math.max(0, Math.min(100, nonNegativeInt(record.latestAccuracy, 0))),
        lastReviewedAt: record.lastReviewedAt,
        nextDueAt: record.nextDueAt,
      };
    }
  }

  return {
    ...initial,
    xp: nonNegativeInt(source.xp, 0),
    arenaPoints: nonNegativeInt(source.arenaPoints, 0),
    comboStreak: nonNegativeInt(source.comboStreak, 0),
    streakDays: nonNegativeInt(source.streakDays, 0),
    todayCompleted: dateKey === getLocalDateKey(),
    lastActivityDate: dateKey,
    dailyGoalMinutes: source.dailyGoalMinutes === 5 || source.dailyGoalMinutes === 15 ? source.dailyGoalMinutes : 10,
    streakFreezeActive: source.streakFreezeActive === true,
    streakFreezeTokens: nonNegativeInt(source.streakFreezeTokens, 0),
    activityDates,
    completedLessonIds: stringArray(source.completedLessonIds),
    solvedChallengeIds: stringArray(source.solvedChallengeIds),
    readInsightIds: stringArray(source.readInsightIds),
    bookmarkedInsightIds: stringArray(source.bookmarkedInsightIds),
    solvedQuizLabIds: stringArray(source.solvedQuizLabIds),
    unlockedAchievementIds: stringArray(source.unlockedAchievementIds),
    claimedRewardIds: stringArray(source.claimedRewardIds),
    rewardClaimCodes,
    domainMastery,
    calibrationObservations,
    courseReviewById,
  };
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calendarDaysBetween(from: string, to: string): number {
  const parse = (key: string) => {
    const [year, month, day] = key.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.max(0, Math.floor((parse(to) - parse(from)) / 86_400_000));
}

function addCalendarDays(dateKey: string, offset: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offset);
  return getLocalDateKey(date);
}

export function recordLearningActivity(state: PersistedUserState, date = new Date()): Pick<
  PersistedUserState,
  'todayCompleted' | 'lastActivityDate' | 'activityDates'
> {
  const dateKey = getLocalDateKey(date);
  return {
    todayCompleted: true,
    lastActivityDate: dateKey,
    activityDates: [...new Set([...state.activityDates, dateKey])].slice(-90),
  };
}

/**
 * A transparent, accuracy-based review-interval heuristic. It is an app
 * scheduling rule inspired by distributed-practice research, not a measurement
 * of memory strength or biological synaptic change.
 */
export function recordCourseReview(
  previous: CourseReviewRecord | undefined,
  accuracyPercent: number,
  now = new Date()
): CourseReviewRecord {
  const accuracy = Math.max(0, Math.min(100, Math.round(accuracyPercent)));
  const priorInterval = previous?.intervalDays ?? 0;
  let intervalDays: number;

  if (accuracy < 70) {
    intervalDays = 1;
  } else if (priorInterval === 0) {
    intervalDays = accuracy >= 90 ? 3 : 2;
  } else if (accuracy >= 90) {
    intervalDays = Math.min(60, Math.max(3, Math.round(priorInterval * 2)));
  } else {
    intervalDays = Math.min(30, Math.max(2, Math.round(priorInterval * 1.5)));
  }

  const nextDue = new Date(now);
  nextDue.setDate(nextDue.getDate() + intervalDays);
  return {
    reviewCount: (previous?.reviewCount ?? 0) + 1,
    intervalDays,
    latestAccuracy: accuracy,
    lastReviewedAt: now.toISOString(),
    nextDueAt: nextDue.toISOString(),
  };
}

/** Mean squared probability error (0 is best; 1 is worst) for confidence wagers. */
export function calculateBrierScore(observations: CalibrationObservation[]): number | null {
  if (observations.length === 0) return null;
  const total = observations.reduce((sum, observation) => {
    const confidence = Math.max(0, Math.min(1, observation.confidence));
    const outcome = observation.correct ? 1 : 0;
    return sum + (confidence - outcome) ** 2;
  }, 0);
  return Math.round((total / observations.length) * 1000) / 1000;
}
