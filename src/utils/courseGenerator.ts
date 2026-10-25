export interface CourseGeneratorInput {
  topic: string;
  learningGoal: string;
  audience: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedHours: number;
}

export interface GeneratedCourseModule {
  title: string;
  objective: string;
  keyIdea: string;
  recallQuestion: string;
  expectedAnswer: string;
  explanation: string;
}

export interface GeneratedCourseOutline {
  title: string;
  summary: string;
  audience: string;
  estimatedHours: number;
  learningObjectives: string[];
  modules: GeneratedCourseModule[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function requiredText(value: unknown, label: string, maxLength = 1200): string {
  if (typeof value !== 'string') throw new Error(`The course API returned an invalid ${label}.`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) throw new Error(`The course API returned an invalid ${label}.`);
  return trimmed;
}

function validateGeneratedCourse(payload: unknown): GeneratedCourseOutline {
  if (!isRecord(payload)) throw new Error('The course API returned an invalid course outline.');
  const courseValue = isRecord(payload.course) ? payload.course : payload;
  const title = requiredText(courseValue.title, 'title', 180);
  const summary = requiredText(courseValue.summary, 'summary', 1600);
  const audience = requiredText(courseValue.audience, 'audience', 400);
  const estimatedHours = Number(courseValue.estimatedHours);
  if (!Number.isFinite(estimatedHours) || estimatedHours < 1 || estimatedHours > 120) {
    throw new Error('The course API returned an invalid estimated duration.');
  }
  if (!Array.isArray(courseValue.learningObjectives) || courseValue.learningObjectives.length < 2 || courseValue.learningObjectives.length > 10) {
    throw new Error('The course API returned an invalid objective list.');
  }
  if (!Array.isArray(courseValue.modules) || courseValue.modules.length < 3 || courseValue.modules.length > 16) {
    throw new Error('The course API returned an invalid module list.');
  }

  const learningObjectives = courseValue.learningObjectives.map((objective, index) =>
    requiredText(objective, `learning objective ${index + 1}`, 500)
  );
  const modules = courseValue.modules.map((module, index) => {
    if (!isRecord(module)) throw new Error(`The course API returned an invalid module ${index + 1}.`);
    return {
      title: requiredText(module.title, `module ${index + 1} title`, 180),
      objective: requiredText(module.objective, `module ${index + 1} objective`, 800),
      keyIdea: requiredText(module.keyIdea, `module ${index + 1} key idea`, 1000),
      recallQuestion: requiredText(module.recallQuestion, `module ${index + 1} recall question`, 800),
      expectedAnswer: requiredText(module.expectedAnswer, `module ${index + 1} answer`, 1000),
      explanation: requiredText(module.explanation, `module ${index + 1} explanation`, 1400),
    };
  });

  return { title, summary, audience, estimatedHours, learningObjectives, modules };
}

/**
 * Calls the user's HTTPS backend. Google ID tokens are sent only in memory and
 * are never persisted by this helper. NVIDIA secrets must stay on that backend.
 */
export async function generateCourseOutline(
  endpoint: string,
  googleIdToken: string,
  input: CourseGeneratorInput
): Promise<GeneratedCourseOutline> {
  const trimmedEndpoint = endpoint.trim();
  if (!trimmedEndpoint) throw new Error('Add your AI course-generation backend URL in Google & API settings first.');
  if (!googleIdToken) throw new Error('Sign in with Google before generating a course.');

  let parsedEndpoint: URL;
  try {
    parsedEndpoint = new URL(trimmedEndpoint, window.location.origin);
  } catch {
    throw new Error('Enter a valid HTTPS course-generation backend URL.');
  }
  const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(parsedEndpoint.hostname);
  if (parsedEndpoint.protocol !== 'https:' && !isLocalDevelopment) {
    throw new Error('The course-generation backend must use HTTPS.');
  }

  const response = await fetch(parsedEndpoint.toString(), {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${googleIdToken}`,
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === 'string'
      ? payload.error
      : `Course generation failed (HTTP ${response.status}).`;
    throw new Error(message.slice(0, 300));
  }
  return validateGeneratedCourse(payload);
}
