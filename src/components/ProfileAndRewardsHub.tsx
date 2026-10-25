import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  Brain,
  CalendarDays,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  ExternalLink,
  Gift,
  Instagram,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
} from 'lucide-react';
import {
  MICRO_LESSONS,
  REWARDS_CATALOG,
  MicroLesson,
  RewardItem,
} from '../data/pashcoData';
import { GoogleSignInButton } from './GoogleSignInButton';
import {
  ApiConnectionConfig,
  ApiSyncLog,
  GoogleUserProfile,
} from '../utils/apiSync';
import {
  calculateBrierScore,
  PersistedUserState,
} from '../utils/progressStore';

export type ProfileHubView = 'profile' | 'rewards' | 'settings';

interface ProfileAndRewardsHubProps {
  view: ProfileHubView;
  googleUser: GoogleUserProfile | null;
  accountRestoreDone: boolean;
  accountCanSync: boolean;
  googleAuthError: string | null;
  onGoogleSignIn: (profile: GoogleUserProfile, idToken: string) => void;
  onSignOut: () => void;
  userStats: PersistedUserState;
  apiConfig: ApiConnectionConfig;
  syncLogs: ApiSyncLog[];
  onSaveApiConfig: (config: ApiConnectionConfig) => void;
  onTriggerManualSync: () => void;
  onClaimReward: (reward: RewardItem) => void;
  onOpenCourse: (course: MicroLesson) => void;
  onNavigateToScorecards: () => void;
}

function formatDueLabel(nextDueAt?: string): { label: string; isDue: boolean } {
  if (!nextDueAt) return { label: 'No review attempt yet', isDue: false };
  const ms = new Date(nextDueAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return { label: 'Review suggested now', isDue: true };
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return { label: `Review suggested in ${days}d`, isDue: false };
}

export const ProfileAndRewardsHub: React.FC<ProfileAndRewardsHubProps> = ({
  view,
  googleUser,
  accountRestoreDone,
  accountCanSync,
  googleAuthError,
  onGoogleSignIn,
  onSignOut,
  userStats,
  apiConfig,
  syncLogs,
  onSaveApiConfig,
  onTriggerManualSync,
  onClaimReward,
  onOpenCourse,
  onNavigateToScorecards,
}) => {
  const [draftApiUrl, setDraftApiUrl] = useState(apiConfig.apiUrl);
  const [draftCourseApiUrl, setDraftCourseApiUrl] = useState(apiConfig.courseApiUrl);
  const [draftGoogleClientId, setDraftGoogleClientId] = useState(apiConfig.googleClientId);
  const [draftAutoSync, setDraftAutoSync] = useState(apiConfig.autoSyncEnabled);
  const [localAuthError, setLocalAuthError] = useState<string | null>(null);

  useEffect(() => {
    setDraftApiUrl(apiConfig.apiUrl);
    setDraftCourseApiUrl(apiConfig.courseApiUrl);
    setDraftGoogleClientId(apiConfig.googleClientId);
    setDraftAutoSync(apiConfig.autoSyncEnabled);
  }, [apiConfig]);

  const handleGoogleCredential = useCallback(
    (profile: GoogleUserProfile, idToken: string) => {
      setLocalAuthError(null);
      onGoogleSignIn(profile, idToken);
    },
    [onGoogleSignIn]
  );
  const handleGoogleError = useCallback((message: string) => {
    setLocalAuthError(message);
  }, []);

  const totalTrackHours = MICRO_LESSONS.reduce((sum, course) => sum + course.durationHours, 0);
  const completedSampleModules = userStats.completedLessonIds.length;
  const completedTrackRecords = MICRO_LESSONS.filter((course) =>
    userStats.completedLessonIds.includes(course.id)
  ).length;
  const brierScore = calculateBrierScore(userStats.calibrationObservations);
  const authError = googleAuthError || localAuthError;

  const exportCoursePlanJson = () => {
    const plan = {
      title: 'PASHco 15-track study plan',
      estimatedTotalHours: totalTrackHours,
      tracks: MICRO_LESSONS.map((course) => ({
        code: course.courseCode,
        title: course.title,
        category: course.category,
        estimatedHours: course.durationHours,
        modules: course.modulesCount,
        difficulty: course.difficulty,
        sampleModuleCompleted: userStats.completedLessonIds.includes(course.id),
      })),
      exportedAt: new Date().toISOString(),
      note: 'Estimated course-track scope. The current MVP contains a sample module for each track, not the full estimated hours.',
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'pashco-15-track-study-plan.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const exportProfileJson = () => {
    const exportData = {
      account: googleUser
        ? { googleSub: googleUser.googleId, email: googleUser.email, name: googleUser.name }
        : { type: 'guest-local' },
      progress: userStats,
      courseTracks: MICRO_LESSONS.map((course) => ({
        id: course.id,
        code: course.courseCode,
        title: course.title,
        estimatedTrackHours: course.durationHours,
        sampleModuleCompleted: userStats.completedLessonIds.includes(course.id),
        reviewSchedule: userStats.courseReviewById[course.id] || null,
      })),
      contact: {
        email: 'cyberjai2k25@gmail.com',
        instagram: 'https://instagram.com/love_me_for_my_wits',
      },
      exportedAt: new Date().toISOString(),
      note: 'This export is a browser backup. Remote persistence requires a configured API endpoint.',
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `pashco-progress-${googleUser?.email.split('@')[0] || 'guest'}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10">
      {view === 'profile' && (
<section id="profile" className="scroll-mt-28 space-y-7">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-widest text-blue-300">
              <User className="w-4 h-4" />
              <span>Scholar Profile · Account-Scoped Progress</span>
            </div>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
              Your Profile & Learning Record
            </h2>
            <p className="text-slate-300 max-w-3xl text-sm sm:text-base leading-relaxed">
              Progress is saved separately for each Google account on this device. Configure secure remote storage on the Google & API page; until then, this is local browser storage—not cloud sync.
            </p>
          </div>
          <button
            type="button"
            onClick={exportProfileJson}
            className="btn-dark-surface px-4 py-2.5 rounded-full font-extrabold text-xs inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-amber-300" />
            Export progress backup
          </button>
        </div>

        <div className="box-behind-stage">
          <div className="rounded-[30px] glass-card p-6 sm:p-9 space-y-7">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/15">
              <div className="flex items-center gap-4 min-w-0">
                {googleUser?.picture ? (
                  <img
                    src={googleUser.picture}
                    alt=""
                    className="w-16 h-16 rounded-2xl border border-white/20 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl arena-stage-header flex items-center justify-center text-2xl font-extrabold text-amber-300 shrink-0">
                    {googleUser?.avatarInitials || <User className="w-7 h-7" />}
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {googleUser ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 text-xs font-mono font-extrabold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {accountRestoreDone ? 'Google sign-in active' : 'Loading account progress…'}
                      </span>
                    ) : (
                      <span className="px-3 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/15 text-xs font-mono font-extrabold">
                        Guest · local progress
                      </span>
                    )}
                    <span className="text-xs font-mono text-slate-400">
                      {googleUser ? 'Account-specific browser profile' : 'Sign in to create an account-specific profile'}
                    </span>
                  </div>
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white truncate">
                    {googleUser?.name || 'PASHco Scholar'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-slate-300">
                    {googleUser ? (
                      <span className="inline-flex items-center gap-1 text-blue-300">
                        <Mail className="w-3.5 h-3.5" /> {googleUser.email}
                      </span>
                    ) : (
                      <span>Google ID is not connected</span>
                    )}
                    <a
                      href="https://instagram.com/love_me_for_my_wits"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-pink-300 hover:underline"
                    >
                      <Instagram className="w-3.5 h-3.5" /> @love_me_for_my_wits
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {googleUser ? (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="btn-dark-surface px-4 py-2.5 rounded-full font-extrabold text-xs inline-flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                ) : apiConfig.googleClientId ? (
                  <GoogleSignInButton
                    clientId={apiConfig.googleClientId}
                    onCredential={handleGoogleCredential}
                    onError={handleGoogleError}
                  />
                ) : (
                  <a
                    href="#api-console"
                    className="btn-gold px-4 py-2.5 rounded-full font-extrabold text-xs inline-flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Set up Google sign-in
                  </a>
                )}
              </div>
            </div>

            {(authError || (!googleUser && !apiConfig.googleClientId)) && (
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  authError
                    ? 'bg-rose-500/10 border-rose-400/40 text-rose-100'
                    : 'bg-blue-500/10 border-blue-400/30 text-blue-100'
                }`}
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm leading-relaxed">
                  {authError || (
                    <>
                      Google sign-in is ready to configure. Add a <strong>Google OAuth Web client ID</strong> in the API Settings panel. The client ID is public; no Google client secret belongs in this browser app.
                    </>
                  )}
                </div>
              </div>
            )}

            {googleUser && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-100 text-xs sm:text-sm leading-relaxed">
                Google provided this sign-in identity to the browser. Local progress is keyed by its stable Google subject ID. A remote API must verify the ID-token signature, issuer, audience and expiry before accepting writes; this client-side display is not server-side identity verification.
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
              <div className="p-4 rounded-2xl kahoot-question-box">
                <div className="text-[10px] font-mono font-extrabold text-slate-400 uppercase">Experience</div>
                <div className="text-2xl font-display font-extrabold text-amber-300 mt-1">{userStats.xp.toLocaleString()} XP</div>
                <div className="text-[11px] text-slate-400 mt-1">Current profile</div>
              </div>
              <div className="p-4 rounded-2xl kahoot-question-box">
                <div className="text-[10px] font-mono font-extrabold text-slate-400 uppercase">Arena points</div>
                <div className="text-2xl font-display font-extrabold text-violet-300 mt-1">{userStats.arenaPoints.toLocaleString()}</div>
                <div className="text-[11px] text-slate-400 mt-1">Balance available</div>
              </div>
              <div className="p-4 rounded-2xl kahoot-question-box">
                <div className="text-[10px] font-mono font-extrabold text-slate-400 uppercase">Sample modules</div>
                <div className="text-2xl font-display font-extrabold text-emerald-300 mt-1">{completedSampleModules} / {MICRO_LESSONS.length}</div>
                <div className="text-[11px] text-slate-400 mt-1">Track previews completed</div>
              </div>
              <div className="p-4 rounded-2xl kahoot-question-box">
                <div className="text-[10px] font-mono font-extrabold text-slate-400 uppercase">Confidence Brier</div>
                <div className="text-2xl font-display font-extrabold text-blue-300 mt-1">{brierScore === null ? '—' : brierScore.toFixed(3)}</div>
                <div className="text-[11px] text-slate-400 mt-1">Lower is better · {userStats.calibrationObservations.length} responses</div>
              </div>
              <div className="p-4 rounded-2xl kahoot-question-box col-span-2 sm:col-span-1">
                <div className="text-[10px] font-mono font-extrabold text-slate-400 uppercase">Rewards requests</div>
                <div className="text-2xl font-display font-extrabold text-rose-300 mt-1">{userStats.claimedRewardIds.length} / {REWARDS_CATALOG.length}</div>
                <div className="text-[11px] text-slate-400 mt-1">Codes saved locally</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  <span>15 specialist course tracks · {totalTrackHours} estimated study hours</span>
                </div>
                <span className="text-xs font-mono text-slate-400">Accuracy-based review prompts are scheduling aids—not biological memory measurements.</span>
              </div>
              {userStats.claimedRewardIds.includes('rew-study-plan') && (
                <button type="button" onClick={exportCoursePlanJson} className="btn-dark-surface px-4 py-2 rounded-full text-xs font-extrabold inline-flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-300" />Download unlocked 15-track study plan
                </button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-[390px] overflow-y-auto pr-1">
                {MICRO_LESSONS.map((course) => {
                  const isDone = userStats.completedLessonIds.includes(course.id);
                  const review = userStats.courseReviewById[course.id];
                  const due = formatDueLabel(review?.nextDueAt);
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => onOpenCourse(course)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                        isDone
                          ? 'bg-emerald-950/40 border-emerald-400/45 hover:border-emerald-300'
                          : 'bg-black/40 border-white/15 hover:border-amber-400/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-extrabold bg-amber-400 text-slate-950">
                          {course.courseCode} · {course.durationHours}h track
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{course.modulesCount} modules</span>
                      </div>
                      <div className="text-xs font-extrabold text-white line-clamp-2">{course.title}</div>
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                        <span className={due.isDue ? 'text-rose-300' : 'text-blue-300'}>
                          <CalendarDays className="w-3 h-3 inline mr-1" />{due.label}
                        </span>
                        <span className={isDone ? 'text-emerald-300' : 'text-slate-400'}>
                          {isDone ? `Sample module · ${review?.latestAccuracy ?? 0}%` : 'Track preview'}
                        </span>
                      </div>
                      {review && (
                        <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${review.latestAccuracy}%` }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-400 leading-relaxed">
                Completed entries in this MVP mean one sample lesson module per track—not completion of the full estimated track hours.
              </div>
              <div className="text-[11px] text-slate-400">{completedTrackRecords} sample modules completed · full curriculum estimate {totalTrackHours} hours.</div>
            </div>
          </div>
        </div>
      </section>
      )}
      {view === 'rewards' && (
<section id="rewards" className="scroll-mt-28 space-y-7">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-widest text-amber-300">
              <Gift className="w-4 h-4" />
              <span>Rewards Vault · Transparent redemption requests</span>
            </div>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">Rewards for your learning progress</h2>
            <p className="text-slate-300 max-w-3xl text-sm sm:text-base leading-relaxed">
              Redeem XP and Arena points for in-app unlocks or create a request for the PASHco team. External rewards are requests only until your API or the contact email confirms fulfillment.
            </p>
          </div>
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full kahoot-question-box font-mono text-xs font-extrabold">
            <span className="text-amber-300">{userStats.xp.toLocaleString()} XP</span>
            <span className="text-slate-500">·</span>
            <span className="text-violet-300">{userStats.arenaPoints.toLocaleString()} PTS</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">
          {REWARDS_CATALOG.map((reward, index) => {
            const isRequested = userStats.claimedRewardIds.includes(reward.id);
            const claimCode = userStats.rewardClaimCodes[reward.id];
            const hasBalance = userStats.xp >= reward.xpCost && userStats.arenaPoints >= reward.arenaPtsRequired;
            const isSignedIn = !!googleUser;
            const wrapper = ['box-behind-gold', 'box-behind-stage', 'box-behind-blue'][index % 3];
            return (
              <div key={reward.id} className={wrapper}>
                <article className="h-full rounded-[26px] glass-card p-6 flex flex-col justify-between gap-5">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950">{reward.badgeText} · {reward.category}</span>
                      <span className="font-mono text-xs font-extrabold text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-400/40">{reward.xpCost} XP</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-white leading-snug">{reward.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">{reward.subtitle}</p>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/15 space-y-1">
                      <div className="text-[10px] font-mono font-extrabold text-violet-300 uppercase">Design rationale</div>
                      <div className="text-xs text-slate-200 font-medium">{reward.designRationale}</div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/15 space-y-3">
                    <div className="text-[11px] font-mono text-slate-300">{reward.deliveryNote}</div>
                    {isRequested ? (
                      <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/40 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-300">
                          <CheckCircle2 className="w-4 h-4" />
                          {reward.fulfillment === 'TEAM_REQUEST' ? 'Request saved' : 'Redeemed in this profile'} · {claimCode}
                        </div>
                        {reward.fulfillment === 'TEAM_REQUEST' && (
                          <a
                            href={`mailto:cyberjai2k25@gmail.com?subject=${encodeURIComponent(`PASHco reward request ${claimCode}`)}&body=${encodeURIComponent(`Google account: ${googleUser?.email || 'Guest'}\nReward: ${reward.title}\nRequest code: ${claimCode}`)}`}
                            className="text-[11px] font-mono font-extrabold text-amber-300 underline"
                          >
                            Email the request to cyberjai2k25@gmail.com →
                          </a>
                        )}
                        {reward.fulfillment === 'STUDY_PLAN' && (
                          <button type="button" onClick={exportCoursePlanJson} className="text-[11px] font-mono font-extrabold text-amber-300 underline">
                            Download study plan →
                          </button>
                        )}
                        {reward.fulfillment === 'IN_APP_BADGE' && (
                          <button type="button" onClick={onNavigateToScorecards} className="text-[11px] font-mono font-extrabold text-amber-300 underline">
                            Open Scorecard Studio →
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onClaimReward(reward)}
                        disabled={!isSignedIn || !hasBalance}
                        className={`w-full py-3 px-4 rounded-full font-extrabold text-xs inline-flex items-center justify-center gap-2 transition-all ${
                          isSignedIn && hasBalance
                            ? 'btn-gold'
                            : 'bg-white/10 text-slate-400 border border-white/15 cursor-not-allowed'
                        }`}
                      >
                        <Gift className="w-4 h-4" />
                        <span>
                          {!isSignedIn
                            ? 'Sign in with Google to request'
                            : hasBalance
                            ? `Request reward · ${reward.arenaPtsRequired.toLocaleString()} PTS`
                            : `Need ${Math.max(0, reward.xpCost - userStats.xp)} XP & ${Math.max(0, reward.arenaPtsRequired - userStats.arenaPoints)} PTS`}
                        </span>
                      </button>
                    )}
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </section>
      )}
      {view === 'settings' && (
<section id="api-console" className="scroll-mt-28">
        <div className="box-behind-blue">
          <div className="rounded-[28px] glass-card p-6 sm:p-9 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/15 pb-5">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/40 text-xs font-mono font-extrabold uppercase">
                  <Database className="w-3.5 h-3.5" />
                  Google Identity · Custom API settings
                </div>
                <h3 className="font-display font-extrabold text-2xl text-white">Connect your Google client ID and progress API</h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
                  The API URL is intentionally configurable while your API is being prepared. Remote sync uses the Google ID token as a Bearer token; your server must validate it and enable CORS for this app’s origin. Never put a private API key or Google client secret in this frontend.
                </p>
              </div>
              <button
                type="button"
                onClick={onTriggerManualSync}
                className="btn-gold px-5 py-3 rounded-full font-extrabold text-xs inline-flex items-center gap-2 shrink-0"
              >
                <RefreshCw className="w-4 h-4" />Push current progress
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <div>
                  <label htmlFor="pashco-api-url" className="text-xs font-mono font-extrabold uppercase tracking-wider text-amber-300 block mb-1">Your HTTPS API endpoint</label>
                  <input
                    id="pashco-api-url"
                    type="url"
                    placeholder="https://api.example.com/pashco/progress"
                    value={draftApiUrl}
                    onChange={(event) => setDraftApiUrl(event.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/25 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label htmlFor="pashco-course-api-url" className="text-xs font-mono font-extrabold uppercase tracking-wider text-emerald-300 block mb-1">AI course-generation backend</label>
                  <input
                    id="pashco-course-api-url"
                    type="url"
                    placeholder="https://api.example.com/api/courses/generate"
                    value={draftCourseApiUrl}
                    onChange={(event) => setDraftCourseApiUrl(event.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/25 text-sm font-mono text-white focus:outline-none focus:border-emerald-400"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">This URL points to your backend. Keep NVIDIA NIM keys on that server; GitHub Pages cannot protect secrets.</p>
                </div>
                <div>
                  <label htmlFor="pashco-google-client" className="text-xs font-mono font-extrabold uppercase tracking-wider text-blue-300 block mb-1">Google OAuth Web client ID</label>
                  <input
                    id="pashco-google-client"
                    type="text"
                    placeholder="123456789-example.apps.googleusercontent.com"
                    value={draftGoogleClientId}
                    onChange={(event) => setDraftGoogleClientId(event.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/25 text-sm font-mono text-white focus:outline-none focus:border-blue-400"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Register the current site origin in Google Cloud Console → OAuth client → Authorized JavaScript origins.</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={draftAutoSync}
                    onChange={(event) => setDraftAutoSync(event.target.checked)}
                    className="accent-amber-400"
                  />
                  Automatically POST progress after account activity
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSaveApiConfig({
                      apiUrl: draftApiUrl.trim(),
                      courseApiUrl: draftCourseApiUrl.trim(),
                      googleClientId: draftGoogleClientId.trim(),
                      autoSyncEnabled: draftAutoSync,
                    })}
                    className="btn-violet px-5 py-2.5 rounded-full font-extrabold text-xs inline-flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />Save settings
                  </button>
                  <a
                    href="mailto:cyberjai2k25@gmail.com?subject=PASHco%20Google%20OAuth%20or%20API%20setup"
                    className="btn-dark-surface px-4 py-2.5 rounded-full font-extrabold text-xs inline-flex items-center gap-2"
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-300" />Ask Jai about setup
                  </a>
                </div>
              </div>

              <div className="p-4 rounded-2xl kahoot-question-box space-y-3">
                <div className="flex items-center justify-between gap-3 text-xs font-mono">
                  <span className="font-extrabold text-emerald-300 inline-flex items-center gap-1.5"><Cloud className="w-4 h-4" />SYNC ACTIVITY</span>
                  <span className="text-slate-400">
                    {!apiConfig.apiUrl
                      ? 'Local-only mode'
                      : !accountRestoreDone
                      ? 'Loading account snapshot'
                      : !accountCanSync
                      ? 'Remote sync paused · check API log'
                      : 'Endpoint ready'}
                  </span>
                </div>
                {syncLogs.length === 0 ? (
                  <div className="text-slate-400 text-xs py-5">No API events yet. Progress remains in this browser until an endpoint is configured.</div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-[11px]">
                    {syncLogs.map((log) => (
                      <div key={log.id} className="p-2.5 rounded-xl bg-black/50 border border-white/10 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-amber-300 font-bold">[{log.timestamp}] {log.action}</span>
                          <span className={log.status === 'SUCCESS_API' ? 'text-emerald-400 font-bold' : log.status === 'API_ERROR' ? 'text-rose-300 font-bold' : 'text-slate-400'}>{log.status}</span>
                        </div>
                        <div className="text-slate-300 break-words">{log.summary}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-2 border-t border-white/10 text-[11px] leading-relaxed text-slate-400">
                  Expected request: POST JSON with <code>platform</code>, <code>action</code>, <code>occurredAt</code>, and the action payload; Google ID token in <code>Authorization: Bearer</code>. The server must validate the token and upsert by its <code>sub</code> claim.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}
    </div>
  );
};
