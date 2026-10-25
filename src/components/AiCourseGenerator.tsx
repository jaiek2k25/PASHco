import React, { FormEvent, useState } from 'react';
import { ArrowRight, BookOpen, Brain, CheckCircle2, Download, LoaderCircle, LockKeyhole, Settings2, Sparkles } from 'lucide-react';
import {
  CourseGeneratorInput,
  GeneratedCourseOutline,
  generateCourseOutline,
} from '../utils/courseGenerator';

interface AiCourseGeneratorProps {
  isSignedIn: boolean;
  courseApiUrl: string;
  googleIdToken: string | null;
  onNavigateToProfile: () => void;
  onNavigateToSettings: () => void;
  onNotify: (title: string, subtitle: string) => void;
}

const INITIAL_FORM: CourseGeneratorInput = {
  topic: '',
  learningGoal: '',
  audience: 'Curious adult learner',
  level: 'Beginner',
  estimatedHours: 12,
};

export const AiCourseGenerator: React.FC<AiCourseGeneratorProps> = ({
  isSignedIn,
  courseApiUrl,
  googleIdToken,
  onNavigateToProfile,
  onNavigateToSettings,
  onNotify,
}) => {
  const [form, setForm] = useState<CourseGeneratorInput>(INITIAL_FORM);
  const [course, setCourse] = useState<GeneratedCourseOutline | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateForm = <K extends keyof CourseGeneratorInput>(key: K, value: CourseGeneratorInput[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setCourse(null);
    if (form.topic.trim().length < 3 || form.learningGoal.trim().length < 8) {
      setError('Add a topic and a specific learning goal so the course has a useful direction.');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateCourseOutline(courseApiUrl, googleIdToken || '', {
        ...form,
        topic: form.topic.trim(),
        learningGoal: form.learningGoal.trim(),
        audience: form.audience.trim() || 'Curious learner',
        estimatedHours: Math.min(120, Math.max(1, Math.round(form.estimatedHours))),
      });
      setCourse(result);
      onNotify('Course outline ready', `${result.modules.length} modules generated for ${result.title}.`);
    } catch (generationError) {
      const message = generationError instanceof Error ? generationError.message : 'The course could not be generated. Please try again.';
      setError(message);
      onNotify('Course generation unavailable', message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadOutline = () => {
    if (!course) return;
    const blob = new Blob([JSON.stringify(course, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'pashco-course-outline'}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] gap-6 items-start">
        <form onSubmit={handleGenerate} className="box-behind-stage">
          <div className="rounded-[28px] glass-card p-5 sm:p-7 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-300/25 flex items-center justify-center text-emerald-200 shrink-0"><Sparkles className="w-5 h-5" /></div>
              <div>
                <h2 className="text-xl font-extrabold text-white">Design your course</h2>
                <p className="text-xs text-slate-400 mt-1">Set the destination. The generator builds the study path.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="ai-course-topic" className="block text-xs font-mono font-extrabold uppercase tracking-wider text-emerald-200 mb-1.5">What do you want to learn?</label>
                <input id="ai-course-topic" required minLength={3} maxLength={160} value={form.topic} onChange={(event) => updateForm('topic', event.target.value)} placeholder="e.g. behavioral economics for product design" className="w-full rounded-xl bg-black/35 border border-white/15 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-300/70" />
              </div>
              <div>
                <label htmlFor="ai-course-goal" className="block text-xs font-mono font-extrabold uppercase tracking-wider text-emerald-200 mb-1.5">Your learning goal</label>
                <textarea id="ai-course-goal" required minLength={8} maxLength={1200} rows={4} value={form.learningGoal} onChange={(event) => updateForm('learningGoal', event.target.value)} placeholder="What should you be able to explain, decide, or do by the end?" className="w-full resize-y rounded-xl bg-black/35 border border-white/15 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-300/70" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="ai-course-level" className="block text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Starting level</label>
                  <select id="ai-course-level" value={form.level} onChange={(event) => updateForm('level', event.target.value as CourseGeneratorInput['level'])} className="w-full rounded-xl bg-[#171426] border border-white/15 px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-300/70">
                    <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ai-course-audience" className="block text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">For whom</label>
                  <input id="ai-course-audience" maxLength={120} value={form.audience} onChange={(event) => updateForm('audience', event.target.value)} className="w-full rounded-xl bg-[#171426] border border-white/15 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-300/70" />
                </div>
                <div>
                  <label htmlFor="ai-course-hours" className="block text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Course hours</label>
                  <input id="ai-course-hours" type="number" min={1} max={120} value={form.estimatedHours} onChange={(event) => updateForm('estimatedHours', Number(event.target.value))} className="w-full rounded-xl bg-[#171426] border border-white/15 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-300/70" />
                </div>
              </div>
            </div>

            {error && <div role="alert" className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-400/30 text-sm text-rose-100">{error}</div>}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-[10px] text-slate-500">AI outlines need human review; they may contain mistakes.</span>
              <button type="submit" disabled={isGenerating || !isSignedIn || !courseApiUrl.trim()} className="btn-gold px-5 py-3 rounded-full font-extrabold text-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isGenerating ? <><LoaderCircle className="w-4 h-4 animate-spin" />Building course…</> : <><Sparkles className="w-4 h-4" />Generate course<ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="p-5 rounded-[24px] glass-panel space-y-3">
            <div className="flex items-center gap-2 text-sm font-extrabold text-white"><Brain className="w-4 h-4 text-violet-300" />Built for learning, not just reading</div>
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />Objectives and short modules make the path scannable.</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />Each module includes a recall prompt, answer, and explanation.</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />Generated content is an editable draft, not a verified credential.</li>
            </ul>
          </div>

          {!isSignedIn && (
            <div className="p-5 rounded-[24px] bg-blue-500/10 border border-blue-400/25 space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-blue-100"><LockKeyhole className="w-4 h-4" />Sign in to generate</div>
              <p className="text-xs text-slate-300 leading-relaxed">Your Google ID token authenticates the request to your backend. The NVIDIA key stays on the server.</p>
              <button type="button" onClick={onNavigateToProfile} className="text-xs font-extrabold text-emerald-200 hover:underline">Open Google sign-in →</button>
            </div>
          )}

          {!courseApiUrl.trim() && (
            <div className="p-5 rounded-[24px] bg-amber-500/10 border border-amber-400/25 space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-amber-100"><Settings2 className="w-4 h-4" />Connect your secure backend</div>
              <p className="text-xs text-slate-300 leading-relaxed">Set the course-generation HTTPS endpoint in Google & API settings. GitHub Pages cannot keep a provider key private.</p>
              <button type="button" onClick={onNavigateToSettings} className="text-xs font-extrabold text-amber-200 hover:underline">Open backend settings →</button>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-black/25 border border-white/10 text-[11px] text-slate-400 leading-relaxed">
            Security note: this app sends a Google ID token to your configured endpoint. It never asks for or stores the NVIDIA NIM API key in the browser.
          </div>
        </aside>
      </div>

      {course && (
        <section className="space-y-5" aria-live="polite">
          <div className="box-behind-gold">
            <div className="rounded-[28px] glass-card p-5 sm:p-7 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-extrabold uppercase tracking-wider text-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" />Draft outline · review before teaching</div>
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white">{course.title}</h2>
                  <p className="max-w-3xl text-sm text-slate-300 leading-relaxed">{course.summary}</p>
                </div>
                <button type="button" onClick={downloadOutline} className="btn-dark-surface shrink-0 px-4 py-2.5 rounded-full font-extrabold text-xs inline-flex items-center gap-2"><Download className="w-4 h-4 text-amber-300" />Download JSON</button>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono font-bold text-slate-300"><span className="px-3 py-1 rounded-full bg-violet-500/15 border border-violet-300/20">{course.audience}</span><span className="px-3 py-1 rounded-full bg-blue-500/15 border border-blue-300/20">~{course.estimatedHours} estimated hours</span><span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-300/20">{course.modules.length} modules</span></div>
              <div className="grid grid-cols-1 lg:grid-cols-[0.75fr_1.25fr] gap-5">
                <div className="p-4 rounded-2xl bg-black/25 border border-white/10 space-y-3">
                  <h3 className="text-sm font-extrabold text-white">By the end, you can…</h3>
                  <ul className="space-y-2">{course.learningObjectives.map((objective, index) => <li key={`${index}-${objective}`} className="flex gap-2 text-xs text-slate-300 leading-relaxed"><span className="text-emerald-300 font-extrabold">{index + 1}.</span>{objective}</li>)}</ul>
                </div>
                <div className="space-y-3">
                  {course.modules.map((module, index) => (
                    <article key={`${index}-${module.title}`} className="p-4 rounded-2xl glass-card space-y-3">
                      <div className="flex items-start gap-3"><span className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-300/25 text-emerald-200 flex items-center justify-center text-xs font-mono font-extrabold shrink-0">{String(index + 1).padStart(2, '0')}</span><div><h3 className="font-extrabold text-white">{module.title}</h3><p className="mt-1 text-xs text-slate-400">{module.objective}</p></div></div>
                      <p className="text-xs text-slate-200 leading-relaxed"><strong className="text-amber-200">Key idea:</strong> {module.keyIdea}</p>
                      <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1"><div className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-blue-200">Try to recall</div><p className="text-xs font-bold text-white">{module.recallQuestion}</p><details className="pt-1 text-xs text-slate-300"><summary className="cursor-pointer text-emerald-200 font-extrabold">Reveal answer and explanation</summary><p className="mt-2"><strong className="text-white">Answer:</strong> {module.expectedAnswer}</p><p className="mt-1">{module.explanation}</p></details></div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
