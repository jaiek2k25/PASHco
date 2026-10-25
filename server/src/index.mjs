import 'dotenv/config';
import express from 'express';
import { OAuth2Client } from 'google-auth-library';

const app = express();
const port = Number(process.env.PORT || 8787);
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const nimApiKey = process.env.NVIDIA_NIM_API_KEY || '';
const nimModel = process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.3-70b-instruct';
const nimUrl = process.env.NVIDIA_NIM_CHAT_COMPLETIONS_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
const configuredRateLimit = Number(process.env.COURSE_GENERATION_MAX_REQUESTS_PER_HOUR || 6);
const maxRequestsPerHour = Number.isInteger(configuredRateLimit)
  ? Math.max(1, Math.min(30, configuredRateLimit))
  : 6;
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const googleAuth = new OAuth2Client(googleClientId || undefined);
const usageByGoogleSub = new Map();

app.disable('x-powered-by');
app.use((request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  const origin = request.get('Origin');
  if (origin && !allowedOrigins.has(origin)) {
    return response.status(403).json({ error: 'This app origin is not allowed by the course API.' });
  }
  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (request.method === 'OPTIONS') return response.status(204).end();
  next();
});
app.use(express.json({ limit: '24kb', strict: true }));

app.get('/health', (_request, response) => response.json({ ok: true, service: 'pashco-course-api' }));

function readBoundedText(value, { label, min = 1, max = 1200 } = {}) {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  const text = value.trim();
  if (text.length < min || text.length > max) throw new Error(`${label} must be between ${min} and ${max} characters.`);
  return text;
}

function parseInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('A JSON course request is required.');
  const topic = readBoundedText(body.topic, { label: 'Topic', min: 3, max: 160 });
  const learningGoal = readBoundedText(body.learningGoal, { label: 'Learning goal', min: 8, max: 1200 });
  const audience = typeof body.audience === 'string' && body.audience.trim()
    ? readBoundedText(body.audience, { label: 'Audience', min: 2, max: 120 })
    : 'Curious learner';
  const level = ['Beginner', 'Intermediate', 'Advanced'].includes(body.level) ? body.level : null;
  if (!level) throw new Error('Choose Beginner, Intermediate, or Advanced as the starting level.');
  const estimatedHours = Number(body.estimatedHours);
  if (!Number.isInteger(estimatedHours) || estimatedHours < 1 || estimatedHours > 120) {
    throw new Error('Estimated hours must be a whole number from 1 to 120.');
  }
  return { topic, learningGoal, audience, level, estimatedHours };
}

async function verifyGoogleRequest(request) {
  if (!googleClientId) throw Object.assign(new Error('Google sign-in is not configured on the API.'), { status: 503 });
  const authorization = request.get('Authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error('Sign in with Google before generating a course.'), { status: 401 });
  try {
    const ticket = await googleAuth.verifyIdToken({ idToken: match[1], audience: googleClientId });
    const claims = ticket.getPayload();
    if (!claims?.sub || claims.email_verified !== true) {
      throw new Error('Google did not return a verified account.');
    }
    return { sub: claims.sub, email: claims.email || '' };
  } catch {
    throw Object.assign(new Error('Your Google sign-in expired or could not be verified. Sign in again.'), { status: 401 });
  }
}

function checkUserRateLimit(googleSub) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const current = usageByGoogleSub.get(googleSub);
  const state = !current || now - current.windowStartedAt >= windowMs
    ? { windowStartedAt: now, count: 0 }
    : current;
  if (state.count >= maxRequestsPerHour) {
    throw Object.assign(new Error(`Course generation limit reached. Try again later (up to ${maxRequestsPerHour} requests per hour).`), { status: 429 });
  }
  state.count += 1;
  usageByGoogleSub.set(googleSub, state);
}

function parseModelContent(content, requestedHours, audience) {
  if (typeof content !== 'string') throw new Error('The AI provider returned no course outline.');
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error('The AI provider response was not valid course JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('The AI provider returned an invalid outline.');
  const text = (value, label, max = 1500) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`Invalid ${label} in AI outline.`);
    return value.trim();
  };
  if (!Array.isArray(parsed.learningObjectives) || parsed.learningObjectives.length < 2 || parsed.learningObjectives.length > 8) {
    throw new Error('The AI outline needs between 2 and 8 learning objectives.');
  }
  if (!Array.isArray(parsed.modules) || parsed.modules.length < 3 || parsed.modules.length > 12) {
    throw new Error('The AI outline needs between 3 and 12 modules.');
  }
  const learningObjectives = parsed.learningObjectives.map((objective, index) => text(objective, `objective ${index + 1}`, 500));
  const modules = parsed.modules.map((module, index) => {
    if (!module || typeof module !== 'object' || Array.isArray(module)) throw new Error(`Invalid module ${index + 1}.`);
    return {
      title: text(module.title, `module ${index + 1} title`, 180),
      objective: text(module.objective, `module ${index + 1} objective`, 800),
      keyIdea: text(module.keyIdea, `module ${index + 1} key idea`, 1000),
      recallQuestion: text(module.recallQuestion, `module ${index + 1} recall question`, 800),
      expectedAnswer: text(module.expectedAnswer, `module ${index + 1} answer`, 1000),
      explanation: text(module.explanation, `module ${index + 1} explanation`, 1400),
    };
  });
  return {
    title: text(parsed.title, 'course title', 180),
    summary: text(parsed.summary, 'course summary', 1600),
    audience,
    estimatedHours: requestedHours,
    learningObjectives,
    modules,
  };
}

app.post('/api/courses/generate', async (request, response) => {
  let account;
  let input;
  try {
    account = await verifyGoogleRequest(request);
    input = parseInput(request.body);
    checkUserRateLimit(account.sub);
    if (!nimApiKey) return response.status(503).json({ error: 'The course-generation provider is not configured on the API server.' });

    const systemPrompt = [
      'You are a careful instructional designer. Produce a concise, coherent course outline for active learning.',
      'Return only valid JSON with exactly these top-level keys: title, summary, learningObjectives, modules.',
      'learningObjectives must be an array of 3 to 6 strings. modules must be an array of 4 to 8 objects.',
      'Each module must have string keys: title, objective, keyIdea, recallQuestion, expectedAnswer, explanation.',
      'Order modules from prerequisites to application. Make questions answerable from the supplied course plan.',
      'Do not invent citations, credentials, guarantees, brain-state effects, or claims of clinical validity.',
      'Clearly distinguish established evidence from practical suggestions when discussing science.',
    ].join(' ');
    const userPrompt = JSON.stringify({
      topic: input.topic,
      learningGoal: input.learningGoal,
      audience: input.audience,
      startingLevel: input.level,
      targetStudyHours: input.estimatedHours,
    });

    let nimResponse;
    try {
      nimResponse = await fetch(nimUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${nimApiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: nimModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.35,
          max_tokens: 5000,
          stream: false,
        }),
        signal: AbortSignal.timeout(65000),
      });
    } catch {
      return response.status(502).json({ error: 'The AI provider could not be reached. Try again later.' });
    }
    if (!nimResponse.ok) {
      console.error('NVIDIA NIM request failed with HTTP', nimResponse.status);
      return response.status(502).json({ error: 'The AI provider could not generate this outline. Check the backend key/model configuration.' });
    }
    const providerPayload = await nimResponse.json().catch(() => null);
    const content = providerPayload?.choices?.[0]?.message?.content;
    const course = parseModelContent(content, input.estimatedHours, input.audience);
    return response.json({ course, generatedAt: new Date().toISOString() });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 400;
    const message = error instanceof Error ? error.message : 'The course request could not be processed.';
    return response.status(status).json({ error: message.slice(0, 300) });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`PASHco secure course API listening on port ${port}`);
});
