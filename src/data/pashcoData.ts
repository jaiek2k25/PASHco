export interface DailyChallengeItem {
  id: string;
  dayLabel: string;
  category: string;
  title: string;
  scenario: string;
  question: string;
  options: {
    id: string;
    label: string;
    detail: string;
  }[];
  correctOptionId: string;
  explanation: string;
  mentalModelTag: string;
  xpReward: number;
  arenaPoints: number;
}

export interface NeuroColorChannel {
  id: string;
  name: string;
  cueLabel: string;
  designRole: string;
  designRationale: string;
  kahootShape: '▲' | '◆' | '●' | '■' | '✦';
  hexCode: string;
  bgClass: string;
}

export interface ClinicalNeuroMechanism {
  id: string;
  title: string;
  equation: string;
  learningSystem: string;
  clinicalSummary: string;
  howPashcoImplementsIt: string;
  evidenceBasis: string;
  limitations: string;
}

export interface RewardItem {
  id: string;
  title: string;
  subtitle: string;
  xpCost: number;
  arenaPtsRequired: number;
  category: 'Credential' | 'Mentorship' | 'Learning Tool' | 'Social Perk';
  designRationale: string;
  fulfillment: 'IN_APP_BADGE' | 'STREAK_TOKENS' | 'TEAM_REQUEST' | 'STUDY_PLAN';
  deliveryNote: string;
  badgeText: string;
}

export interface LessonSlide {
  slideNumber: number;
  tag: string;
  title: string;
  body: string;
  highlightBox: {
    label: string;
    content: string;
  };
  example: string;
}

export interface LessonQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type CourseCategory =
  | 'Computational Neuroscience'
  | 'AI & Future Tech'
  | 'Mental Models'
  | 'Behavioral Economics'
  | 'Design & Systems'
  | 'Financial Fluency';

export interface MicroLesson {
  id: string;
  courseCode: string;
  title: string;
  subtitle: string;
  category: CourseCategory;
  durationHours: number;
  modulesCount: number;
  durationMinutes: number;
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced';
  xpReward: number;
  curator: string;
  curatorRole: string;
  learningFocus: string;
  coreTakeaway: string;
  slides: LessonSlide[];
  quiz: LessonQuizQuestion[];
}

export interface QuizLabQuestion {
  id: string;
  domain: CourseCategory;
  difficulty: 'Quick Recall' | 'Applied Scenario' | 'Deep Synthesis';
  prompt: string;
  context?: string;
  options: string[];
  correctIndex: number;
  rationale: string;
  xp: number;
  arenaPoints: number;
}

export interface AchievementBadge {
  id: string;
  title: string;
  subtitle: string;
  requirementText: string;
  category: 'Streak' | 'Mastery' | 'Editorial' | 'Social';
  xpBonus: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  iconName: 'flame' | 'sparkles' | 'book' | 'share' | 'trophy' | 'brain' | 'compass' | 'crown';
  defaultUnlocked?: boolean;
}

export interface ExpertInsight {
  id: string;
  issueNumber: string;
  category: string;
  title: string;
  subtitle: string;
  author: {
    name: string;
    role: string;
    publication: string;
    avatarInitials: string;
    verified: boolean;
  };
  readTime: string;
  publishedAt: string;
  Featured?: boolean;
  pullQuote: string;
  keyTakeaways: string[];
  paragraphs: string[];
  synthesisQuestion: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    xpReward: number;
  };
}

export const CLINICAL_NEURO_MECHANISMS: ClinicalNeuroMechanism[] = [
  {
    id: 'retrieval-practice',
    title: 'Retrieval practice with corrective feedback',
    equation: 'Attempt from memory → check the answer → explain the correction → retrieve again later',
    learningSystem: 'Memory retrieval and feedback processes',
    clinicalSummary:
      'Trying to recall an idea before rereading it makes gaps visible and creates a useful learning event. Feedback matters: learners need the correct answer and an explanation, not just a right-or-wrong signal. The benefit depends on material, prior knowledge, and practice quality.',
    howPashcoImplementsIt:
      'Lessons ask for an answer before revealing feedback, then retain the result in the learner’s progress record for a later review prompt.',
    evidenceBasis:
      'Roediger & Karpicke (2006), Psychological Science, doi:10.1111/j.1467-9280.2006.01693.x; Dunlosky et al. (2013), Psychological Science in the Public Interest, doi:10.1111/1529-1006.01138.',
    limitations:
      'A quiz response is a learning record, not direct evidence that a particular synapse changed. This product does not measure brain activity or guarantee a retention percentage.',
  },
  {
    id: 'distributed-practice',
    title: 'Distributed practice and review spacing',
    equation: 'Revisit after a delay; adjust the next interval using observed recall (an app heuristic)',
    learningSystem: 'Long-term retention across repeated learning sessions',
    clinicalSummary:
      'Distributed practice generally supports long-term retention better than concentrating all practice into one sitting. The best gap depends on how long the material must be retained, task difficulty, and current knowledge; there is no single universal schedule.',
    howPashcoImplementsIt:
      'PASHco records review dates and quiz accuracy, then suggests a transparent next interval. A missed or difficult retrieval brings the suggestion forward.',
    evidenceBasis:
      'Cepeda et al. (2006), Psychological Bulletin, doi:10.1037/0033-2909.132.3.354; Dunlosky et al. (2013), Psychological Science in the Public Interest, doi:10.1111/1529-1006.01138.',
    limitations:
      'The schedule is a simple product rule, not a fitted Ebbinghaus curve, validated adaptive-learning model, or measurement of memory strength.',
  },
  {
    id: 'metacognitive-calibration',
    title: 'Metacognitive confidence calibration',
    equation: 'Brier score = mean((confidence − outcome)²); lower scores indicate better calibration',
    learningSystem: 'Judgments about one’s own knowledge and uncertainty',
    clinicalSummary:
      'A confidence judgment is useful when compared with actual accuracy over many attempts. This makes overconfidence and underconfidence visible and encourages targeted review. One answer is too small a sample to characterize a learner.',
    howPashcoImplementsIt:
      'Learners choose a confidence level before feedback. The profile stores these choices and reports a Brier score only after observations have accumulated.',
    evidenceBasis:
      'Fleming & Lau (2014), Frontiers in Human Neuroscience, doi:10.3389/fnhum.2014.00443.',
    limitations:
      'The score is a behavioral summary, not an IQ estimate, clinical assessment, or neural measurement. It is most interpretable across a reasonably sized set of questions.',
  },
  {
    id: 'cognitive-load',
    title: 'Manage avoidable cognitive load',
    equation: 'Keep instructions clear; chunk complex material; remove decoration that competes with the task',
    learningSystem: 'Working-memory limits during new and complex learning',
    clinicalSummary:
      'Complex tasks can overload working memory, especially for novices. Clear sequencing, concise prompts, worked explanations, and consistent visual coding can reduce avoidable search and help learners spend effort on the concept itself.',
    howPashcoImplementsIt:
      'The interface uses a stable four-option layout, distinct shapes as well as color, short sections, and visible explanations. The visual theme is a design choice—not a claim that a hue changes neurotransmitter levels.',
    evidenceBasis:
      'Sweller (1988), Cognitive Science, doi:10.1207/s15516709cog1202_4; Dunlosky et al. (2013), Psychological Science in the Public Interest, doi:10.1111/1529-1006.01138.',
    limitations:
      'Color preference and readability vary. Users should be able to rely on labels and shapes without interpreting color, and visual styling alone does not make instruction effective.',
  },
];

export const REWARDS_CATALOG: RewardItem[] = [
  {
    id: 'rew-course-badge',
    title: 'Course Portfolio Badge',
    subtitle: 'Unlock a shareable PASHco progress badge reflecting the sample modules and quiz results saved in your profile. It is not an accredited qualification.',
    xpCost: 500,
    arenaPtsRequired: 1000,
    category: 'Credential',
    designRationale: 'A visible milestone can make progress easier to review; it does not guarantee motivation or learning gains.',
    fulfillment: 'IN_APP_BADGE',
    deliveryNote: 'Unlocks a local badge for your scorecard; remote verification requires your API.',
    badgeText: 'IN-APP UNLOCK',
  },
  {
    id: 'rew-mentorship-request',
    title: 'Systems & AI Portfolio Review Request',
    subtitle: 'Create a request for a 30-minute portfolio or project discussion. Availability and fulfillment are confirmed by the PASHco team.',
    xpCost: 1500,
    arenaPtsRequired: 3500,
    category: 'Mentorship',
    designRationale: 'A clear milestone can help learners plan a concrete next step; this is a product-design rationale, not a biological effect.',
    fulfillment: 'TEAM_REQUEST',
    deliveryNote: 'Request code is saved to your profile; email cyberjai2k25@gmail.com to coordinate.',
    badgeText: 'TEAM REQUEST',
  },
  {
    id: 'rew-scholar-spotlight',
    title: 'Instagram Scholar Spotlight Request',
    subtitle: 'Request a scholar feature on @love_me_for_my_wits and unlock a gold scorecard frame in this browser.',
    xpCost: 800,
    arenaPtsRequired: 2200,
    category: 'Social Perk',
    designRationale: 'Optional sharing can support reflection and peer conversation. Public posting is always the learner’s choice.',
    fulfillment: 'TEAM_REQUEST',
    deliveryNote: 'Feature request is subject to review; the in-app frame is available locally.',
    badgeText: 'OPTIONAL SOCIAL',
  },
  {
    id: 'rew-streak-tokens',
    title: 'Three Streak Recovery Tokens',
    subtitle: 'Add three optional local recovery tokens. If a day is missed, one armed token can preserve the current streak; tokens do not affect learning outcomes.',
    xpCost: 350,
    arenaPtsRequired: 700,
    category: 'Learning Tool',
    designRationale: 'A forgiving recovery rule can reduce all-or-nothing product friction; it is not a cortisol or brain-state intervention.',
    fulfillment: 'STREAK_TOKENS',
    deliveryNote: 'Adds three tokens to your local profile. Configure an API to keep them across devices.',
    badgeText: 'IN-APP TOOL',
  },
  {
    id: 'rew-study-plan',
    title: '15-Track Study Plan Export',
    subtitle: 'Download a structured overview of all 15 course tracks, estimated hours, and sample-module progress.',
    xpCost: 1100,
    arenaPtsRequired: 2500,
    category: 'Credential',
    designRationale: 'A downloadable plan helps learners inspect scope and choose a manageable sequence.',
    fulfillment: 'STUDY_PLAN',
    deliveryNote: 'Unlocks the course-plan JSON export from your profile.',
    badgeText: 'STUDY PLAN',
  },
  {
    id: 'rew-founder-feedback',
    title: 'Priority Product Feedback Request',
    subtitle: 'Submit a request for early feedback on PASHco’s upcoming adaptive review and course-planning features.',
    xpCost: 2000,
    arenaPtsRequired: 4000,
    category: 'Learning Tool',
    designRationale: 'Learner feedback can help prioritize product changes; no beta access is promised until confirmed.',
    fulfillment: 'TEAM_REQUEST',
    deliveryNote: 'Request code is saved locally; email cyberjai2k25@gmail.com to follow up.',
    badgeText: 'FEEDBACK REQUEST',
  },
];

export const NEURO_PALETTE_GUIDE: NeuroColorChannel[] = [
  {
    id: 'crimson-alert',
    name: 'Coral · Retry / error cue',
    cueLabel: '▲ Retry / error feedback',
    designRole: 'High-salience error state',
    designRationale: 'The coral cue is paired with the triangle and explicit feedback text. Meaning is not carried by hue alone.',
    kahootShape: '▲',
    hexCode: '#E11D48',
    bgClass: 'kahoot-tile-red',
  },
  {
    id: 'sapphire-focus',
    name: 'Sapphire · Navigation cue',
    cueLabel: '◆ Navigation / information',
    designRole: 'Secondary information state',
    designRationale: 'Blue distinguishes an information category in the interface. It is not represented as a wavelength-based cognitive intervention.',
    kahootShape: '◆',
    hexCode: '#2563EB',
    bgClass: 'kahoot-tile-blue',
  },
  {
    id: 'gold-progress',
    name: 'Gold · Progress cue',
    cueLabel: '● Progress / points',
    designRole: 'Progress and action emphasis',
    designRationale: 'Gold is reserved for progress indicators and primary actions so the visual system stays predictable.',
    kahootShape: '●',
    hexCode: '#D97706',
    bgClass: 'kahoot-tile-gold',
  },
  {
    id: 'emerald-success',
    name: 'Emerald · Correctness cue',
    cueLabel: '■ Correct / completed',
    designRole: 'Successful state',
    designRationale: 'Green is paired with a checkmark or completion label; success is not inferred from color alone.',
    kahootShape: '■',
    hexCode: '#059669',
    bgClass: 'kahoot-tile-green',
  },
  {
    id: 'violet-synthesis',
    name: 'Violet · Synthesis cue',
    cueLabel: '✦ Synthesis / stage',
    designRole: 'Stage and section grouping',
    designRationale: 'Violet groups synthesis content and sections. The palette is an interface convention, not a direct neural signal.',
    kahootShape: '✦',
    hexCode: '#6D28D9',
    bgClass: 'arena-stage-header',
  },
];

export const DAILY_CHALLENGES: DailyChallengeItem[] = [
  {
    id: 'dc-1',
    dayLabel: "Today's Arena · #142",
    category: 'Behavioral Economics',
    title: 'The Sunk Cost Fallacy & Prefrontal Override',
    scenario:
      'Your team spent $400k and 8 months building a custom engine. A new open-source tool launches today that is 3× faster and costs $0, requiring only 2 weeks to migrate.',
    question: 'What is the rationally optimal decision under first-principles thinking?',
    options: [
      {
        id: 'opt-a',
        label: 'Finish the custom engine so the $400k is not wasted',
        detail: 'Reasoning that treats irrecoverable past spend as a current benefit',
      },
      {
        id: 'opt-b',
        label: 'Switch now—the $400k is irrecoverable either way',
        detail: 'Compare future migration effort, reliability, maintenance, and expected benefit',
      },
      {
        id: 'opt-c',
        label: 'Run both engines in parallel for 12 months',
        detail: 'May add parallel maintenance cost; evaluate against the transition risk',
      },
      {
        id: 'opt-d',
        label: 'Delay the decision until next fiscal year',
        detail: 'Has an opportunity cost; quantify it against waiting for more evidence',
      },
    ],
    correctOptionId: 'opt-b',
    explanation:
      'The past $400k is a sunk cost. Compare only prospective costs and benefits, including migration risk, maintenance, performance, and opportunity cost; the scenario does not establish that any one choice is universally optimal.',
    mentalModelTag: 'Prospective Marginal Utility',
    xpReward: 50,
    arenaPoints: 950,
  },
  {
    id: 'dc-2',
    dayLabel: 'Arena Round · #143',
    category: 'AI & Future Tech',
    title: 'Why Transformer Self-Attention Scales ($O(N^2)$ Routing)',
    scenario:
      'Before Transformers (2017), recurrent networks (RNNs) processed words one by one sequentially, suffering vanishing gradients across long paragraphs.',
    question: 'What mathematical mechanism allowed Transformers to route long-range context in parallel?',
    options: [
      {
        id: 'opt-a',
        label: 'Scaled Dot-Product Attention: softmax(QKᵀ / √d_k)V across all tokens at once',
        detail: 'O(1) path length between any two tokens regardless of distance',
      },
      {
        id: 'opt-b',
        label: 'Compressing whole books into a single 64-bit integer',
        detail: 'Fixed bottleneck vectors caused early information loss',
      },
      {
        id: 'opt-c',
        label: 'Replacing matrix math with hand-coded grammar rules',
        detail: 'Transformers rely on parallel GPU tensor contractions',
      },
      {
        id: 'opt-d',
        label: 'Deleting all adjectives before reading a sentence',
        detail: 'Attention preserves and weights every token dynamically',
      },
    ],
    correctOptionId: 'opt-a',
    explanation:
      'Scaled Dot-Product Attention computes relevance affinities (Query · Key) between all token pairs simultaneously, reducing maximum path length between distant concepts to O(1).',
    mentalModelTag: 'Parallel Context Routing',
    xpReward: 60,
    arenaPoints: 980,
  },
  {
    id: 'dc-3',
    dayLabel: 'Arena Round · #144',
    category: 'Computational Neuroscience',
    title: 'NMDA Receptor Coincidence Detection in Active Recall',
    scenario:
      'A learner rereads a chapter several times in one sitting. Another closes the book, attempts to explain the main idea, checks the explanation, and revisits it after a delay.',
    question: 'Which practice pattern has stronger general support for durable learning, and why?',
    options: [
      {
        id: 'opt-a',
        label: 'Attempt retrieval, check corrective feedback, and space later attempts over time',
        detail: 'Retrieval practice and distributed practice have robust support across many learning studies',
      },
      {
        id: 'opt-b',
        label: 'Reread the same text continuously until it feels familiar',
        detail: 'Familiarity can be mistaken for the ability to retrieve or apply the idea',
      },
      {
        id: 'opt-c',
        label: 'Highlight every sentence and avoid testing yourself',
        detail: 'Highlighting alone is not a reliable substitute for retrieval practice',
      },
      {
        id: 'opt-d',
        label: 'Avoid feedback so that incorrect answers remain unchallenged',
        detail: 'Corrective feedback helps resolve errors after an attempt',
      },
    ],
    correctOptionId: 'opt-a',
    explanation:
      'Retrieval practice and spacing are well-supported learning techniques. This evidence concerns learning outcomes; it does not mean a quiz directly measures or proves a particular synaptic mechanism.',
    mentalModelTag: 'Retrieval + Distributed Practice',
    xpReward: 65,
    arenaPoints: 990,
  },
];

/* ============================================================================
   15 HIGH-DURATION COURSE TRACKS (465 ESTIMATED CURRICULUM HOURS)
============================================================================ */
export const MICRO_LESSONS: MicroLesson[] = [
  {
    id: 'lesson-1',
    courseCode: 'SYS-101',
    title: 'Second-Order Systems & Incentive Architecture',
    subtitle: 'Mapping multi-step feedback loops, Cobra effects, and non-linear policy adaptations in complex human networks.',
    category: 'Mental Models',
    durationHours: 24,
    modulesCount: 18,
    durationMinutes: 15,
    difficulty: 'Foundational',
    xpReward: 150,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Dorsolateral PFC (BA9/46) · Multi-Horizon Relational Simulation',

    coreTakeaway: 'First-order thinking asks "What happens next?" Second-order thinking models how rational agents mutate their strategy in response to your rule.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · DYNAMICAL FEEDBACK LOOPS',
        title: 'First-Order vs. Second-Order System Equilibria',
        body: 'In coupled adaptive systems, every intervention alters the payoff matrix of participating agents. First-order thinking treats actors as static; second-order thinking solves for the new Nash equilibrium after actors adapt.',
        highlightBox: {
          label: 'Dynamical Systems Equation',
          content: 'State(t+2) = F(Action_t) + Σ Agent_Adaptation(Incentive_Gradient)',
        },
        example: 'Antibiotic over-prescription solves today’s mild infection (t+1) while selecting for resistant bacterial strains across the population (t+2).',
      },
      {
        slideNumber: 2,
        tag: 'MODULE 02 · INCENTIVE PERVERSION',
        title: 'The Cobra Bounty & Endogenous Supply Creation',
        body: 'When colonial administrators offered a cash bounty per dead cobra skin, they priced dead cobras above the marginal cost of breeding cobras. Rational households responded by establishing cobra farms.',
        highlightBox: {
          label: 'Mechanism Design Rule',
          content: 'Whenever Bounty_Price > Marginal_Cost_of_Fabrication, the metric will manufacture the very problem it was meant to eliminate.',
        },
        example: 'Paying software teams per bug fixed incentivizes hasty initial code and fragmented bug tickets.',
      },
      {
        slideNumber: 3,
        tag: 'MODULE 03 · TEMPORAL HORIZON CALIBRATION',
        title: 'The 10-Day / 10-Month / 10-Year Planning Prompt',
        body: 'Intertemporal-choice models describe how people may value immediate and delayed outcomes differently. Writing out consequences at 10 days, 10 months, and 10 years makes the time horizon explicit; this is a planning prompt, not a measurement of brain activity.',
        highlightBox: {
          label: 'High-Leverage Asymmetry',
          content: 'Compare near-term effort with expected long-term benefit, uncertainty, and opportunity cost; avoid assuming a positive return without evidence.',
        },
        example: 'A short, effortful practice session can be easier to sustain than a long session; learning gains still depend on content, feedback, and repeated review.',
      },
    ],
    quiz: [
      {
        id: 'l1-q1',
        question: 'In the Cobra Effect case study, what fundamental mathematical error did policy designers make?',
        options: [
          'They set the bounty price below zero',
          'They set the bounty above the marginal cost of breeding cobras, assuming human supply behavior would remain static',
          'They waited too long to announce the program publicly',
          'They focused only on cobras instead of all reptiles',
        ],
        correctIndex: 1,
        explanation: 'When a reward exceeds the marginal cost of manufacturing the proxy target, endogenous supply expands—violating static first-order assumptions.',
      },
      {
        id: 'l1-q2',
        question: 'Which practical step makes delayed consequences more explicit when planning?',
        options: [
          'Write down likely consequences across short, medium, and long time horizons',
          'Assume that a distant outcome is always more valuable',
          'Ignore uncertainty and opportunity cost',
          'Choose the option with the most complicated explanation',
        ],
        correctIndex: 0,
        explanation: 'A written time-horizon comparison is a practical planning aid. It does not guarantee a better decision or imply a specific brain-region response.',
      },
    ],
  },
  {
    id: 'lesson-2',
    courseCode: 'AI-204',
    title: 'Transformer Mechanics, Attention Geometry & Interpretability',
    subtitle: 'Deep mathematical walkthrough of QKV projections, residual streams, induction heads, and chain-of-thought serial compute.',
    category: 'AI & Future Tech',
    durationHours: 36,
    modulesCount: 28,
    durationMinutes: 20,
    difficulty: 'Advanced',
    xpReward: 220,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Parietal-Prefrontal Tensor Network · Spatial-Algebraic Abstraction',

    coreTakeaway: 'Each generated token allocates a fresh O(L·d²) serial forward pass—chain-of-thought turns output tokens into external working memory.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · HIGH-DIMENSIONAL RESIDUAL STREAMS',
        title: 'Superposition & Linear Representations in Embedding Space',
        body: 'Transformers store thousands of sparse semantic features in superposition across d_model dimensions using nearly-orthogonal directions. Attention heads read from and write linear subspaces into a shared residual stream.',
        highlightBox: {
          label: 'Attention Head Equation',
          content: 'Attn(Q, K, V) = softmax((X W_Q)(X W_K)ᵀ / √d_k) (X W_V) W_O',
        },
        example: 'Induction heads copy patterns ([A][B] ... [A] → [B]) across thousands of tokens to enable in-context learning.',
      },
      {
        slideNumber: 2,
        tag: 'MODULE 02 · SERIAL DEPTH BOUNDARY',
        title: 'Why Fixed-Depth Forward Passes Need Reasoning Tokens',
        body: 'A single token prediction executes a fixed circuit depth L (e.g., 80 layers). Problems requiring >L sequential logical compositions cannot be solved in one token emission unless intermediate states are materialized into the context window.',
        highlightBox: {
          label: 'Computational Complexity Law',
          content: 'Effective Serial Compute Depth = Layers (L) × Intermediate Reasoning Tokens (T)',
        },
        example: 'Emitting 50 structured verification tokens multiplies effective serial circuit depth by 50×.',
      },
    ],
    quiz: [
      {
        id: 'l2-q1',
        question: 'Why does generating intermediate reasoning tokens ("Chain-of-Thought") allow a Transformer to solve problems that fail in a 1-word answer?',
        options: [
          'It unlocks a hidden SQL database on the motherboard',
          'Each emitted token feeds back into the context window, multiplying serial circuit depth beyond the fixed layer count L',
          'It lowers the GPU clock frequency',
          'It deletes the softmax normalization step',
        ],
        correctIndex: 1,
        explanation: 'A single forward pass is bounded by fixed layer depth L; writing intermediate tokens into the context window turns autoregressive generation into unbounded serial computation.',
      },
      {
        id: 'l2-q2',
        question: 'Why do we divide the dot product QKᵀ by √d_k in Scaled Dot-Product Attention?',
        options: [
          'To prevent large dot-product magnitudes from pushing softmax into regions with vanishingly small gradients',
          'To convert floating-point numbers into ASCII strings',
          'To reduce the number of words in the prompt',
          'Because √d_k is always equal to 1',
        ],
        correctIndex: 0,
        explanation: 'As dimension d_k grows, the variance of Q·K grows proportionally to d_k; scaling by 1/√d_k keeps variance at 1 and prevents softmax saturation.',
      },
    ],
  },
  {
    id: 'lesson-3',
    courseCode: 'NEURO-301',
    title: 'Memory Consolidation, Retrieval Practice & Spacing',
    subtitle: 'An evidence-led introduction to synaptic plasticity, systems consolidation, sleep research, and the limits of simple forgetting-curve models.',
    category: 'Computational Neuroscience',
    durationHours: 32,
    modulesCount: 25,
    durationMinutes: 18,
    difficulty: 'Advanced',
    xpReward: 210,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Hippocampal CA1-CA3 & Neocortical Ensembles · Synaptic Tagging',

    coreTakeaway: 'Retrieval practice and spacing can support long-term learning; a simple decay equation is a model, not a measurement of an individual learner’s memory.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · MOLECULAR MEMORY SWITCHES',
        title: 'Synaptic Tagging and Capture (STC) Hypothesis',
        body: 'Synaptic tagging and capture is a proposed account of how some synaptic changes can persist: local activity may mark synapses, while plasticity-related proteins support longer-lasting change. It is a cellular model, not a direct explanation of every learning session.',
        highlightBox: {
          label: 'Consolidation Formula',
          content: 'Synaptic tagging and capture: local synaptic tag + plasticity-related proteins → potential persistence of plasticity',
        },
        example: 'A learning quiz can be described at the behavioral level as retrieval plus feedback; this app cannot infer the cellular events that occurred in a learner’s brain.',
      },
      {
        slideNumber: 2,
        tag: 'MODULE 02 · SLEEP SPINDLES & SHARP-WAVE RIPPLES',
        title: 'How Slow-Wave Sleep Transfers Traces to the Neocortex',
        body: 'Sleep research studies hippocampal replay, sharp-wave ripples, and thalamocortical spindles as candidate contributors to memory consolidation. Their interactions are an active research area; this course avoids treating a single mechanism or frequency as a complete account of learning.',
        highlightBox: {
          label: 'A spacing principle',
          content: 'Retrieval after a meaningful delay can be more informative than immediate rereading; the useful interval varies with the learner and task.',
        },
        example: 'Shorter sessions spaced over time give the learner repeated opportunities to retrieve and correct the idea.',
      },
    ],
    quiz: [
      {
        id: 'l3-q1',
        question: 'What is the careful interpretation of the Synaptic Tagging and Capture model?',
        options: [
          'It proposes that local synaptic tags can capture plasticity-related proteins and help sustain some forms of synaptic change',
          'Looking at the same page without blinking',
          'Lowering room temperature below freezing',
          'Skipping REM and non-REM sleep',
        ],
        correctIndex: 0,
        explanation: 'Synaptic tagging and capture is a mechanistic model supported in particular experimental contexts; it should not be treated as a direct, measured account of a learner’s quiz performance.',
      },
    ],
  },
  {
    id: 'lesson-4',
    courseCode: 'ECON-210',
    title: 'Asymmetric Convexity, Ergodicity & Tail-Risk Decision Theory',
    subtitle: 'Ensemble probability vs. time-series probability, Jensen’s Inequality, and structuring antifragile career and R&D bets.',
    category: 'Behavioral Economics',
    durationHours: 28,
    modulesCount: 22,
    durationMinutes: 16,
    difficulty: 'Intermediate',
    xpReward: 180,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Anterior Insula & Ventromedial PFC · Risk-Payoff Integration',

    coreTakeaway: 'By Jensen’s Inequality, if a payoff function f(x) is convex, E[f(X)] > f(E[X])—volatility increases your expected return when downside is capped.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · JENSEN’S INEQUALITY IN PRACTICE',
        title: 'Why Convex Payoffs Love Uncertainty',
        body: 'A convex function curves upward: the upside of a +1σ shock is far larger than the downside of a −1σ shock. When your worst-case loss is strictly bounded (e.g., 10 hours of research) and upside follows a power law, variance becomes your ally.',
        highlightBox: {
          label: 'Mathematical Convexity Condition',
          content: 'E[f(X)] ≥ f(E[X])  whenever  f″(x) > 0  (Positive Second Derivative)',
        },
        example: 'Shipping open-source research or technical synthesis: capped time cost, uncapped global network upside.',
      },
      {
        slideNumber: 2,
        tag: 'MODULE 02 · ERGODICITY ECONOMICS',
        title: 'Why Ensemble Averages Lie When Ruin Is Possible',
        body: 'If 100 people play Russian Roulette for $10M, the "ensemble average" return is +$8.3M—yet any single person playing repeatedly over time has a 100% probability of ruin. Time-average growth requires zero absorbing barriers.',
        highlightBox: {
          label: 'The Non-Ergodic Survival Rule',
          content: 'Never confuse the average outcome of 100 parallel actors today with the sequential outcome of 1 actor over 100 steps.',
        },
        example: 'Eliminate catastrophic tail risk first; then maximize convex experiments with your surplus bandwidth.',
      },
    ],
    quiz: [
      {
        id: 'l4-q1',
        question: 'According to Jensen’s Inequality, what happens when you face uncertainty under a convex payoff function (f″(x) > 0)?',
        options: [
          'Higher variance increases your expected payoff E[f(X)] above f(E[X])',
          'Your upside is capped at zero',
          'Every outcome is guaranteed to be negative',
          'Variance has zero effect on expected value',
        ],
        correctIndex: 0,
        explanation: 'Under convexity (capped downside, accelerating upside), positive deviations outweigh negative deviations, so E[f(X)] > f(E[X]).',
      },
    ],
  },
  {
    id: 'lesson-5',
    courseCode: 'DES-108',
    title: 'Computational Cognitive Load & Visual Psychophysics',
    subtitle: 'Sweller’s Cognitive Load Theory, Hick-Hyman information entropy, Fitts’s index of difficulty, and accessible contrast and interaction design.',
    category: 'Design & Systems',
    durationHours: 22,
    modulesCount: 16,
    durationMinutes: 14,
    difficulty: 'Foundational',
    xpReward: 140,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Fronto-Parietal Attention Network · Visual Search Efficiency',

    coreTakeaway: 'Decision time scales logarithmically with option entropy: T = b · log₂(n + 1). Subtract extraneous visual noise to free germane working memory.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · SWELLER’S TRIAD',
        title: 'Intrinsic, Extraneous, and Germane Cognitive Load',
        body: 'Working-memory capacity is limited and varies with prior knowledge and task structure. Intrinsic load comes from the material, avoidable extraneous load from presentation, and productive effort goes toward building and using a mental model.',
        highlightBox: {
          label: 'Bandwidth Conservation Law',
          content: 'Germane_Schema_Formation = Total_WM_Capacity − (Intrinsic_Load + Extraneous_Clutter)',
        },
        example: 'Color-and-shape dual coding (▲ ◆ ● ■) offloads spatial indexing to pre-attentive V4 visual cortex in <80ms.',
      },
    ],
    quiz: [
      {
        id: 'l5-q1',
        question: 'In instructional design, what is productive effort directed toward understanding the material?',
        options: [
          'Mental effort directed toward understanding and integrating the material',
          'Effort wasted hunting for a hidden close button',
          'The pixel resolution of an external monitor',
          'Server latency measured in milliseconds',
        ],
        correctIndex: 0,
        explanation: 'Eliminating extraneous UI clutter frees working memory capacity for germane load—the deep processing that builds durable schemas.',
      },
    ],
  },
  {
    id: 'lesson-6',
    courseCode: 'NEURO-402',
    title: 'Neuroeconomics: Dopamine RPE (δ) & Intertemporal Choice',
    subtitle: 'Wolfram Schultz’s reward-prediction-error research, temporal-difference models, and the limits of applying those models to product design.',
    category: 'Computational Neuroscience',
    durationHours: 40,
    modulesCount: 32,
    durationMinutes: 22,
    difficulty: 'Advanced',
    xpReward: 250,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Midbrain VTA & Ventral Striatum · Temporal Difference Learning',

    coreTakeaway: 'Reward-prediction-error models describe one important role of dopamine signaling; XP points in an app are not a measure of dopamine, motivation, or learning.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · TEMPORAL DIFFERENCE REINFORCEMENT',
        title: 'Why Predictable Rewards Stop Firing Dopamine Neurons',
        body: 'In Schultz’s landmark recordings, VTA dopamine neurons fire strongly when an unexpected reward arrives (+δ). Once the reward becomes 100% predictable, firing shifts to the earliest predictive cue—and drops below baseline (−δ) if an expected reward is omitted.',
        highlightBox: {
          label: 'Rescorla-Wagner / TD Update',
          content: 'V_new(s) = V_old(s) + α · [R_actual − V_old(s)]',
        },
        example: 'Progressive difficulty is a design hypothesis. PASHco does not measure dopamine or guarantee a reward-prediction response.'
      },
    ],
    quiz: [
      {
        id: 'l6-q1',
        question: 'What does a phasic burst of VTA dopamine neurons mathematically represent in Temporal Difference (TD) learning?',
        options: [
          'A positive Reward Prediction Error (+δ): the outcome was better or more skillfully achieved than predicted',
          'Complete exhaustion of all neurotransmitters',
          'A static constant that never changes with experience',
          'Pure motor reflex in the knee joint',
        ],
        correctIndex: 0,
        explanation: 'In influential reinforcement-learning accounts, dopamine activity can carry reward-prediction-error-like signals. The model is useful for understanding some learning processes, but this app does not measure dopamine or infer it from XP.'
      },
    ],
  },
  {
    id: 'lesson-7',
    courseCode: 'AI-310',
    title: 'Autonomous Agentic Systems, RAG Verification & Tool Use',
    subtitle: 'Designing multi-step planning loops, dense vector retrieval, cross-encoder re-ranking, and formal verification guards.',
    category: 'AI & Future Tech',
    durationHours: 45,
    modulesCount: 36,
    durationMinutes: 24,
    difficulty: 'Advanced',
    xpReward: 260,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Executive Planning Loop · Hierarchical Task Decomposition',

    coreTakeaway: 'Reliable agentic systems separate stochastic generation from deterministic verification: Generate → Ground via RAG → Verify Constraints.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · COMPOUND ERROR PROBABILITY',
        title: 'Why 95% Per-Step Accuracy Fails Over 20 Sequential Steps',
        body: 'If an autonomous agent has a 95% success rate per step without verification, a 20-step workflow succeeds only 0.95²⁰ = 35.8% of the time. Adding a verifier check after each step restores reliability above 99%.',
        highlightBox: {
          label: 'Reliability Compounding Formula',
          content: 'P(System_Success) = [1 − (1 − p_gen)(1 − p_verify)]^N',
        },
        example: 'Pairing code generation with automated compiler/test verification turns fragile chains into self-healing loops.',
      },
    ],
    quiz: [
      {
        id: 'l7-q1',
        question: 'If an unverified agent step has 90% accuracy, what happens over a 10-step sequential pipeline (0.90¹⁰)?',
        options: [
          'End-to-end reliability drops to ~34.8%, demonstrating why closed-loop verification checkpoints are mandatory',
          'Reliability increases to 100%',
          'Reliability stays at exactly 90%',
          'The pipeline runs in zero milliseconds',
        ],
        correctIndex: 0,
        explanation: 'Sequential probabilities multiply (0.9¹⁰ ≈ 0.348). Closed-loop verification and grounding catch errors before they cascade.',
      },
    ],
  },
  {
    id: 'lesson-8',
    courseCode: 'SYS-205',
    title: 'Lindy Epistemology, Bayesian Updating & Scientific Inference',
    subtitle: 'Bayes’ theorem under noisy evidence, base-rate neglect, survival hazard rates, and distinguishing signal from narrative.',
    category: 'Mental Models',
    durationHours: 30,
    modulesCount: 24,
    durationMinutes: 17,
    difficulty: 'Intermediate',
    xpReward: 190,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Posterior Parietal & dlPFC · Probabilistic Belief Updating',

    coreTakeaway: 'Posterior Odds = Prior Odds × Likelihood Ratio. Never update on a dramatic anecdote without anchoring to the base rate first.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · BAYES’ RULE IN ODDS FORM',
        title: 'Overcoming Base-Rate Neglect in High-Stakes Diagnostics',
        body: 'Humans instinctively equate P(Evidence | Hypothesis) with P(Hypothesis | Evidence). When a condition has a 0.1% base rate, even a 99%-accurate test produces more false positives than true positives.',
        highlightBox: {
          label: 'Bayesian Odds Update',
          content: 'O(H | E) = O(H) · [P(E | H) / P(E | ¬H)]',
        },
        example: 'Always ask: "How often would I see this exact data if my hypothesis were completely false?"',
      },
    ],
    quiz: [
      {
        id: 'l8-q1',
        question: 'In Bayes’ Rule (Odds Form), what is the Likelihood Ratio?',
        options: [
          'The probability of seeing the evidence if the hypothesis is true divided by the probability of seeing it if the hypothesis is false',
          'The number of words in a research paper',
          'The sum of all prior mistakes',
          'Always equal to 50%',
        ],
        correctIndex: 0,
        explanation: 'The Likelihood Ratio P(E|H)/P(E|¬H) measures diagnostic power—how strongly the evidence discriminates between hypothesis and null.',
      },
    ],
  },
  {
    id: 'lesson-9',
    courseCode: 'NEURO-215',
    title: 'Prefrontal Executive Control, Working Memory Gating & Ultradian Focus',
    subtitle: 'Basal ganglia Go/No-Go gating, catecholamine inverted-U curves (Yerkes-Dodson), and 90-minute ultradian BRAC cycles.',
    category: 'Computational Neuroscience',
    durationHours: 26,
    modulesCount: 20,
    durationMinutes: 16,
    difficulty: 'Intermediate',
    xpReward: 175,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Prefrontal-Basal Ganglia Loops · D1/D2 Receptor Gating',

    coreTakeaway: 'Task switching can impose resumption costs; reducing avoidable interruptions may help some complex tasks, though the size varies by person and context.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · ATTENTION RESIDUE & SWITCHING PENALTY',
        title: 'Task Switching, Attention Residue & Context Rebuilding',
        body: 'Switching between demanding tasks can leave attention on the previous task and impose a resumption cost. The size and duration vary by task and person; there is no universal 15–23 minute neural reset time.',
        highlightBox: {
          label: 'Yerkes-Dodson Catecholamine Curve',
          content: 'Task-switching cost depends on task complexity, interruptions, goals, and the individual learner',
        },
        example: 'Try grouping notifications during a study block, then compare your own task completion and perceived effort rather than assuming a universal productivity gain.',
      },
    ],
    quiz: [
      {
        id: 'l9-q1',
        question: 'What is "Attention Residue" in cognitive neuroscience?',
        options: [
          'The persistence of neural activation from Task A that degrades working-memory capacity after switching to Task B',
          'Dust on a computer screen',
          'A permanent increase in IQ from checking 50 emails at once',
          'The speed of light in fiber-optic cables',
        ],
        correctIndex: 0,
        explanation: 'Context switching leaves residual neural ensembles active from the prior task, fragmenting prefrontal working memory.',
      },
    ],
  },
  {
    id: 'lesson-10',
    courseCode: 'ECON-305',
    title: 'Mechanism Design, Auction Theory & Nash Equilibria',
    subtitle: 'Vickrey-Clarke-Groves (VCG) truth-telling mechanisms, prisoner’s dilemmas, and engineering incentive-compatible protocols.',
    category: 'Behavioral Economics',
    durationHours: 34,
    modulesCount: 26,
    durationMinutes: 19,
    difficulty: 'Advanced',
    xpReward: 215,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Temporoparietal Junction (TPJ) & dmPFC · Theory-of-Mind Strategic Modeling',

    coreTakeaway: 'Game theory analyzes how agents play a given game; Mechanism Design ("reverse game theory") engineers the rules so honest behavior is the dominant strategy.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · INCENTIVE COMPATIBILITY',
        title: 'Why Second-Price (Vickrey) Auctions Make Honesty Optimal',
        body: 'In a first-price sealed auction, rational bidders shade their bids below true value. In a second-price auction (highest bidder wins but pays the second-highest bid), bidding your exact true valuation is a dominant strategy regardless of what others do.',
        highlightBox: {
          label: 'Dominant Strategy Equilibrium',
          content: 'Utility(Truthful_Bid, b_{-i}) ≥ Utility(Any_Other_Bid, b_{-i})  for all opponent profiles b_{-i}',
        },
        example: 'Good governance and protocol design align private self-interest with collective truth revelation.',
      },
    ],
    quiz: [
      {
        id: 'l10-q1',
        question: 'Why is bidding your true valuation a dominant strategy in a Vickrey (second-price sealed-bid) auction?',
        options: [
          'Because your bid only determines whether you win, while the price you pay is set by the second-highest bid',
          'Because everyone pays zero dollars',
          'Because the lowest bidder wins the item',
          'Because bidders are not allowed to use numbers',
        ],
        correctIndex: 0,
        explanation: 'Decoupling the winning condition from the payment price eliminates the incentive to shade bids or bluff.',
      },
    ],
  },
  {
    id: 'lesson-11',
    courseCode: 'DES-302',
    title: 'Information Theory: Shannon Entropy, Signal-to-Noise & Compression',
    subtitle: 'Claude Shannon’s H(X) equations, Kullback-Leibler divergence, Kolmogorov complexity, and high-signal communication.',
    category: 'Design & Systems',
    durationHours: 20,
    modulesCount: 15,
    durationMinutes: 15,
    difficulty: 'Intermediate',
    xpReward: 165,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Superior Temporal & Prefrontal Cortex · Predictive Coding',

    coreTakeaway: 'Information is the resolution of uncertainty: I(x) = −log₂ P(x). Predictable boilerplate carries near-zero bits of information.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · SHANNON ENTROPY & SURPRISAL',
        title: 'Measuring Information in Bits of Uncertainty Resolved',
        body: 'Claude Shannon defined the information content (surprisal) of an event x as −log₂ P(x). A message that states what everyone already expects has P(x) ≈ 1 and therefore 0 bits of information.',
        highlightBox: {
          label: 'Shannon Entropy Formula',
          content: 'H(X) = − Σ P(x_i) · log₂ P(x_i)   [Measured in Shannons / Bits]',
        },
        example: 'High-signal writing maximizes insight-per-word by stripping predictable filler and focusing on high-surprisal mechanisms.',
      },
    ],
    quiz: [
      {
        id: 'l11-q1',
        question: 'According to Claude Shannon’s Information Theory, how much information (in bits) is carried by an event that is 100% certain (P(x) = 1)?',
        options: [
          '0 bits (−log₂(1) = 0), because no uncertainty is resolved',
          '1,000,000 bits',
          'Infinite bits',
          'Exactly 42 bits',
        ],
        correctIndex: 0,
        explanation: 'Information is strictly the reduction of uncertainty. If an event has probability 1, −log₂(1) = 0 bits.',
      },
    ],
  },
  {
    id: 'lesson-12',
    courseCode: 'FIN-401',
    title: 'Quantitative Capital Allocation, Kelly Criterion & Stochastic Compounding',
    subtitle: 'Maximizing geometric growth rates, variance drain (r_geom ≈ r_arith − σ²/2), and optimal position sizing under uncertainty.',
    category: 'Financial Fluency',
    durationHours: 38,
    modulesCount: 30,
    durationMinutes: 20,
    difficulty: 'Advanced',
    xpReward: 230,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Intraparietal Sulcus (IPS) & dlPFC · Logarithmic Magnitude Estimation',

    coreTakeaway: 'Geometric compounding is penalized by half the variance: g ≈ μ − σ²/2. Avoiding large drawdowns matters more than chasing volatile spikes.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · VARIANCE DRAIN & GEOMETRIC GROWTH',
        title: 'Why a +50% Gain Followed by a −50% Loss Leaves You Down −25%',
        body: 'Arithmetic average return of (+50%, −50%) is 0%, yet $100 → $150 → $75 loses 25% of your capital. In multiplicative compounding, volatility imposes a mathematical tax of σ²/2 on long-term wealth and skill growth.',
        highlightBox: {
          label: 'Kelly Optimal Fraction Formula',
          content: 'f* = (p · b − q) / b = Expected_Edge / Odds   (Never over-bet beyond f*)',
        },
        example: 'In both capital and daily study habits, steady low-variance consistency compounds faster than boom-and-bust sprints.',
      },
    ],
    quiz: [
      {
        id: 'l12-q1',
        question: 'Why does a portfolio (or learning habit) with steady 12% growth outperform one that alternates between +60% and −40% despite having the same 10% arithmetic average?',
        options: [
          'Variance drain (g ≈ μ − σ²/2): multiplicative compounding penalizes large drawdowns asymmetrically',
          'Calculators cannot multiply negative percentages',
          '12% is larger than 60%',
          'Volatility has zero impact on geometric growth',
        ],
        correctIndex: 0,
        explanation: '+60% then −40% yields 1.6 × 0.6 = 0.96 (−4% net loss per cycle), illustrating how variance erodes geometric compounding.',
      },
    ],
  },
  {
    id: 'lesson-13',
    courseCode: 'SYS-312',
    title: 'Epistemic Calibration, Superforecasting & Brier Score Optimization',
    subtitle: 'Philip Tetlock’s superforecasting protocols, decomposing Fermi estimates, outside-view reference classes, and Brier scoring.',
    category: 'Mental Models',
    durationHours: 18,
    modulesCount: 14,
    durationMinutes: 14,
    difficulty: 'Intermediate',
    xpReward: 160,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Rostrolateral PFC (BA10) · Metacognitive Confidence Auditing',

    coreTakeaway: 'Treat beliefs as testable hypotheses with explicit probabilities (e.g., 72%), not binary identities to defend.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · INSIDE VIEW VS. OUTSIDE VIEW',
        title: 'Anchoring on the Reference Class Before Adjusting for Specifics',
        body: 'When planning a project, the "Inside View" focuses on your team’s optimistic plan and underestimates delays. The "Outside View" starts with the historical distribution of 100 similar projects (base rate) and adjusts incrementally.',
        highlightBox: {
          label: 'Brier Score Accuracy Metric',
          content: 'BS = (1/N) Σ (Forecast_Probability_t − Actual_Outcome_t)²   [Lower = Better Calibrated]',
        },
        example: 'Reviewing a Brier score across repeated forecasts can reveal calibration patterns; no particular number of forecasts guarantees a change.',
      },
    ],
    quiz: [
      {
        id: 'l13-q1',
        question: 'What is the "Outside View" (Reference Class Forecasting) pioneered by Kahneman and Tetlock?',
        options: [
          'Anchoring your initial estimate on the statistical base rate of comparable past cases before adjusting for unique details',
          'Looking out a physical window while making a guess',
          'Ignoring all historical data and trusting gut instinct',
          'Always predicting 100% or 0%',
        ],
        correctIndex: 0,
        explanation: 'Starting with the empirical distribution of a reference class neutralizes planning fallacy and optimistic bias.',
      },
    ],
  },
  {
    id: 'lesson-14',
    courseCode: 'NEURO-501',
    title: 'Neural Oscillations: Theta-Gamma Coupling & Memory Models',
    subtitle: 'An advanced look at neural oscillation research, theta-gamma coupling hypotheses, experimental methods, and the limits of translating them into learning advice.',
    category: 'Computational Neuroscience',
    durationHours: 48,
    modulesCount: 38,
    durationMinutes: 25,
    difficulty: 'Advanced',
    xpReward: 280,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Entorhinal-Hippocampal Circuit · Cross-Frequency Phase-Amplitude Coupling',

    coreTakeaway: 'Theta-gamma coupling is one proposed account of neural coordination; it is not a complete or universally accepted explanation of working memory.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · NEURAL SYNTAX & OSCILLATORY BINDING',
        title: 'Theta-Gamma Coupling as a Research Hypothesis',
        body: 'Some models propose that faster gamma activity can be organized relative to slower theta rhythms in hippocampal circuits. Oscillation measurements and interpretations vary across studies; this framework should be treated as a research hypothesis, not a literal clock or a direct explanation of a fixed item capacity.',
        highlightBox: {
          label: 'Cross-Frequency Coupling Law',
          content: 'Proposed relationship: theta phase may modulate gamma-band amplitude in some hippocampal recordings',
        },
        example: 'PASHco’s cross-domain questions are a teaching design choice; the app cannot detect or induce theta-gamma coupling in a learner.',
      },
    ],
    quiz: [
      {
        id: 'l14-q1',
        question: 'What is the cautious interpretation of theta-gamma coupling in hippocampal research?',
        options: [
          'It is a proposed coordination mechanism in some neural recordings, not a settled universal account of working memory',
          'It proves that a single frequency directly causes better learning',
          'It provides a fixed working-memory capacity formula for every person',
          'It shows that screen audio can reliably entrain hippocampal rhythms',
        ],
        correctIndex: 0,
        explanation: 'Theta-gamma coupling is studied as one possible coordination mechanism. It should not be presented as a fixed item-count formula or as proof of what occurred during an individual learning task.',
      },
    ],
  },
  {
    id: 'lesson-15',
    courseCode: 'FIN-308',
    title: 'Network Effects, Power Laws & Institutional Scale-Up Architecture',
    subtitle: 'Metcalfe’s and Reed’s laws, multi-sided liquidity thresholds, data flywheels, and building enduring educational ecosystems.',
    category: 'Financial Fluency',
    durationHours: 24,
    modulesCount: 19,
    durationMinutes: 16,
    difficulty: 'Intermediate',
    xpReward: 185,
    curator: 'PASHco Curriculum Team',
    curatorRole: 'Sample module authoring team',
    learningFocus: 'Medial PFC & Temporoparietal Network · Macro-Topology Modeling',

    coreTakeaway: 'Network effects can produce nonlinear value under specific assumptions; their size depends on real participation and useful connections.',
    slides: [
      {
        slideNumber: 1,
        tag: 'MODULE 01 · METCALFE’S & REED’S LAWS OF NETWORK VALUE',
        title: 'Why Group-Forming Knowledge Networks Scale as 2^N',
        body: 'Broadcast networks scale linearly (O(N)), two-way communication networks scale quadratically (O(N²)), and subgroup-forming learning cohorts (Reed’s Law) scale exponentially as communities form specialized study guilds.',
        highlightBox: {
          label: 'Network Scaling Hierarchy',
          content: 'Sarnoff: O(N)  <  Metcalfe: O(N²)  <  Reed Cohort Guilds: O(2^N)',
        },
        example: 'Shareable progress and future study cohorts could support peer exchange; this MVP does not yet have a live cohort or measured network effect.',
      },
    ],
    quiz: [
      {
        id: 'l15-q1',
        question: 'What do Metcalfe’s and Reed’s Laws describe in network economics?',
        options: [
          'Under particular assumptions, the number of potential pairwise links or subgroups can grow faster than the number of participants',
          'Single-player courses use too much disk space',
          'Network effects reduce the number of lessons to zero',
          'Social scorecards disable the internet',
        ],
        correctIndex: 0,
        explanation: 'Peer discussion and accountability are design possibilities, not guaranteed learning effects. The current MVP stores individual progress; it does not yet provide a live cohort.'
      },
    ],
  },
];

export const QUIZ_LAB_QUESTIONS: QuizLabQuestion[] = [
  {
    id: 'ql-1',
    domain: 'Behavioral Economics',
    difficulty: 'Applied Scenario',
    prompt: 'A streaming service offers Basic ($9), Digital + Print ($19), and Print-Only ($19). Almost nobody picks Print-Only, yet adding it boosts Digital + Print sales by 42%. What mechanism is at work?',
    context: 'Pricing Architecture & Choice Framing',
    options: [
      'The Decoy Effect (Asymmetric Dominance)',
      'Hyperbolic Discounting',
      'The Availability Heuristic',
      'Regression to the Mean',
    ],
    correctIndex: 0,
    rationale: 'An asymmetrically dominated "decoy" option (Print-Only at $19) gives buyers an effortless comparison anchor that makes the target option (Digital + Print at $19) feel like an unmistakable bargain.',
    xp: 45,
    arenaPoints: 890,
  },
  {
    id: 'ql-2',
    domain: 'AI & Future Tech',
    difficulty: 'Quick Recall',
    prompt: 'When building an AI-assisted knowledge system, why do engineers combine Retrieval-Augmented Generation (RAG) with a language model?',
    context: 'Applied AI Systems',
    options: [
      'To ground responses in verified documents & cite primary sources',
      'To make the font size of the output larger',
      'Because LLMs cannot generate English sentences without RAG',
      'To over later practice sessions delete the model’s training weights',
    ],
    correctIndex: 0,
    rationale: 'RAG retrieves relevant verified passages at query time and injects them into the context window, dramatically improving factual accuracy and auditability.',
    xp: 45,
    arenaPoints: 940,
  },
  {
    id: 'ql-3',
    domain: 'Mental Models',
    difficulty: 'Deep Synthesis',
    prompt: 'During WWII, analysts mapped bullet holes on returning planes and wanted to armor the most-hit wing sections. Abraham Wald said to armor the engines—where returning planes had ZERO bullet holes. Why?',
    context: 'Statistical Reasoning',
    options: [
      'Survivorship Bias: planes hit in the engines never returned',
      'Confirmation Bias: mechanics disliked working on wings',
      'The Gambler’s Fallacy: bullets never strike the same spot twice',
      'Parkinson’s Law: work expands to fill available time',
    ],
    correctIndex: 0,
    rationale: 'Survivorship bias occurs when we analyze only the visible winners or survivors while ignoring the silent dataset that failed along the way.',
    xp: 50,
    arenaPoints: 990,
  },
  {
    id: 'ql-4',
    domain: 'Computational Neuroscience',
    difficulty: 'Deep Synthesis',
    prompt: 'Which practice pattern is most consistent with evidence for retrieval practice and distributed learning?',
    context: 'NMDA Plasticity & Reconsolidation',
    options: [
      'Attempt to recall, check corrective feedback, then revisit the idea in a later session',
      'Reviewing at 99% deletes the hippocampus',
      'Forgetting curves only apply to fictional words',
      'Synapses cannot fire more than once per week',
    ],
    correctIndex: 0,
    rationale: 'Retrieval practice and spacing have broad support as learning techniques; this product’s review interval is a simple heuristic, not a measured forgetting curve or synaptic-stability score.',
    xp: 60,
    arenaPoints: 1050,
  },
];

export const ACHIEVEMENTS_LIST: AchievementBadge[] = [
  {
    id: 'ach-streak-12',
    title: 'Sunlit Consistency',
    subtitle: 'Maintained a 12+ day active learning streak without missing a daily recall check.',
    requirementText: 'Complete 12 consecutive days',
    category: 'Streak',
    xpBonus: 150,
    rarity: 'Rare',
    iconName: 'flame',
    defaultUnlocked: true,
  },
  {
    id: 'ach-first-challenge',
    title: 'First-Principles Spark',
    subtitle: 'Solved today’s interactive Daily Challenge Arena and secured your daily streak extension.',
    requirementText: 'Solve any Daily Challenge on the homepage',
    category: 'Mastery',
    xpBonus: 75,
    rarity: 'Common',
    iconName: 'sparkles',
    defaultUnlocked: false,
  },
  {
    id: 'ach-lesson-master',
    title: 'Neuro-Curriculum Scholar',
    subtitle: 'Completed 3+ high-duration course modules with calibrated checkpoint quiz accuracy.',
    requirementText: 'Complete 3 course modules in the Studio',
    category: 'Mastery',
    xpBonus: 200,
    rarity: 'Epic',
    iconName: 'brain',
    defaultUnlocked: true,
  },
  {
    id: 'ach-editorial-reader',
    title: 'Substack-Grade Polymath',
    subtitle: 'Read an Expert Insight dispatch and verified the core mental model takeaway.',
    requirementText: 'Complete a synthesis check inside any Expert Insight',
    category: 'Editorial',
    xpBonus: 120,
    rarity: 'Rare',
    iconName: 'book',
    defaultUnlocked: false,
  },
  {
    id: 'ach-social-share',
    title: 'Gold Scorecard Creator',
    subtitle: 'Generated or shared a PASHco Learning Scorecard (@love_me_for_my_wits).',
    requirementText: 'Export or copy a Scorecard in the Studio',
    category: 'Social',
    xpBonus: 150,
    rarity: 'Epic',
    iconName: 'share',
    defaultUnlocked: false,
  },
  {
    id: 'ach-quiz-ace',
    title: 'Active Recall Virtuoso',
    subtitle: 'Answered 3+ questions correctly in the interactive Kahoot Quiz & Mastery Arena.',
    requirementText: 'Score 3 correct answers in the Quiz Arena',
    category: 'Mastery',
    xpBonus: 180,
    rarity: 'Legendary',
    iconName: 'crown',
    defaultUnlocked: false,
  },
];

export const EXPERT_INSIGHTS: ExpertInsight[] = [
  {
    id: 'insight-1',
    issueNumber: 'DISPATCH #048 · FEATURED ESSAY',
    category: 'Cognitive Architecture',
    title: 'Why Micro-Habits Beat Marathon Study Sessions in the Age of AI',
    subtitle: 'When information is infinite and instant, human advantage shifts from passive reading to daily active synthesis.',
    author: {
      name: 'PASHco Learning Editorial',
      role: 'Illustrative sample dispatch',
      publication: 'PASHco Review · Sample',
      avatarInitials: 'PE',
      verified: false,
    },
    readTime: '4 min read',
    publishedAt: 'Oct 2026',
    Featured: true,
    pullQuote:
      '“We do not rise to the level of our bookmarked articles; we fall to the level of the mental models we can actively retrieve under pressure.”',
    keyTakeaways: [
      'Passive reading creates an "Illusion of Explanatory Depth"—you recognize terms without owning the logic.',
      'Pairing an editorial insight with a retrieval question gives learners a chance to check what they can recall.',
      'Social proof scorecards turn private discipline into shared intellectual identity among peers.',
    ],
    paragraphs: [
      'Every ambitious professional today suffers from the same quiet paradox: our "Read Later" folders are overflowing with brilliant essays, yet six weeks after finishing a 300-page book, most of us struggle to articulate three actionable mechanisms from it.',
      'Reading fluently can create a feeling of familiarity that is not the same as retrieving or applying an idea. A short question can reveal what is remembered and where an explanation is needed. Only when you are asked to make a concrete decision—like diagnosing a sunk-cost trap or designing an incentive loop—does the gap between recognition and mastery appear.',
      'That is why PASHco fuses two worlds that were never meant to be separate: the nuanced, creator-led depth of Substack essays and the immediate, active-recall practice of Duolingo and Kahoot.',
      'Instead of asking you for two uninterrupted hours on a Sunday afternoon, PASHco offers short sample modules with retrieval questions, explanations, and review suggestions. The current MVP does not deliver a daily email or verify social posts.',
    ],
    synthesisQuestion: {
      question: 'What is the difference between recognizing a familiar explanation and retrieving it from memory?',
      options: [
        'Mistaking smooth, passive recognition of a text for the ability to actively apply its logic under pressure',
        'Reading articles on a higher-resolution monitor',
        'Writing longer essays than necessary',
        'Memorizing footnotes instead of headlines',
      ],
      correctIndex: 0,
      explanation: 'Fluency during passive reading masks gaps in understanding; active recall immediately closes the loop and cements retrieval pathways.',
      xpReward: 30,
    },
  },
  {
    id: 'insight-2',
    issueNumber: 'DISPATCH #047 · AI & SOCIETY',
    category: 'AI & Future Tech',
    title: 'From Prompt Engineering to Systems Literacy: The Next Decade of Work',
    subtitle: 'Why the highest-leverage learners treat AI not as an oracle that replaces thinking, but as an amplifier for clear mental models.',
    author: {
      name: 'PASHco AI Editorial',
      role: 'Illustrative sample dispatch',
      publication: 'PASHco Review · Sample',
      avatarInitials: 'PA',
      verified: false,
    },
    readTime: '5 min read',
    publishedAt: 'Oct 2026',
    pullQuote:
      '“An AI model can generate ten plausible strategies in four seconds. Only a human armed with first-principles judgment knows which nine to discard.”',
    keyTakeaways: [
      'As generation cost drops toward zero, verification and taste become the primary economic bottlenecks.',
      'Cross-disciplinary fluency (combining economics, design, and systems thinking) lets you ask questions others never think to frame.',
      'Structured micro-curricula build the vocabulary required to direct autonomous agents with precision.',
    ],
    paragraphs: [
      'Three years ago, people worried that memorizing syntax tricks was the key to working with AI. Today, frontier models understand natural intent effortlessly—yet the gap between average outputs and extraordinary outcomes has only widened.',
      'Why? Because when you ask a vague question rooted in shallow domain knowledge, you receive a polished, generic average of the internet. When you bring precise conceptual vocabulary—like asymmetric convexity, Fitts’s Law, or second-order incentive feedback—you steer the model into rare, high-signal territory.',
      'Building that conceptual vocabulary cannot be outsourced. It requires a daily ritual of encountering sharp ideas from domain practitioners and testing your grasp until those concepts become second nature.',
    ],
    synthesisQuestion: {
      question: 'As the cost of generating content approaches zero, what becomes the primary human bottleneck?',
      options: [
        'Typing speed on a mechanical keyboard',
        'Domain judgment, verification, and conceptual vocabulary to evaluate and steer outputs',
        'Memorizing boilerplate code templates',
        'Installing more browser extensions',
      ],
      correctIndex: 1,
      explanation: 'When generation is abundant, high-caliber judgment and cross-disciplinary mental models determine the quality of direction and verification.',
      xpReward: 30,
    },
  },
  {
    id: 'insight-3',
    issueNumber: 'DISPATCH #046 · DESIGN & CULTURE',
    category: 'Social Learning',
    title: 'Status Games Worth Playing: Making Intellectual Growth Visibly Celebrated',
    subtitle: 'Fitness apps made running marathons a proud social artifact. Why shouldn’t daily curiosity have its own visual language?',
    author: {
      name: 'PASHco Design Editorial',
      role: 'Illustrative sample dispatch',
      publication: 'PASHco Review · Sample',
      avatarInitials: 'PD',
      verified: false,
    },
    readTime: '3 min read',
    publishedAt: 'Oct 2026',
    pullQuote:
      '“When people can share a beautifully crafted artifact of what they learned today, they invite their entire network into a healthier, smarter conversation.”',
    keyTakeaways: [
      'Strava and Instagram proved that visual artifacts turn solitary effort into supportive community rituals.',
      'Most educational certificates look like dusty 1998 bureaucracy—PASHco Scorecards are designed like collectible editorial art.',
      'Sharing a key takeaway publicly doubles personal accountability and sparks high-trust conversations.',
    ],
    paragraphs: [
      'Think about how people share a morning 5K run: a clean metric overlay, a route trace, and a sense of earned momentum. Nobody shares it to boast about being an Olympian; they share it to mark consistency and connect with friends on the same journey.',
      'Education has lacked that visual warmth. Traditional platforms hide your progress inside sterile dashboards or hand you a PDF certificate after 60 grueling hours. By then, the daily spark of curiosity has gone invisible.',
      'With PASHco Scorecards, every completed micro-lesson, streak milestone, or quiz breakthrough can be rendered into a warm, sunlit glassmorphic card built for Instagram Stories (@love_me_for_my_wits), LinkedIn, or group chats—celebrating the habit of learning something valuable every single day.',
    ],
    synthesisQuestion: {
      question: 'What role do visual scorecards play in sustaining a long-term learning habit?',
      options: [
        'They transform solitary study into a visible, socially reinforced ritual that sparks peer discussion',
        'They replace the need to actually read the lesson',
        'They only work for professional graphic designers',
        'They hide your progress from everyone else',
      ],
      correctIndex: 0,
      explanation: 'Visual artifacts build identity-based habits and positive peer accountability—the same way fitness trackers elevated everyday running.',
      xpReward: 30,
    },
  },
];

export interface RoadmapPhase {
  phase: string;
  timeline: string;
  status: 'LIVE MVP' | 'IN DEVELOPMENT' | 'PLANNED' | 'LONG-TERM VISION';
  title: string;
  subtitle: string;
  capabilities: string[];
}

export const PRODUCT_ROADMAP: RoadmapPhase[] = [
  {
    phase: 'Phase 01',
    timeline: 'Now Available · Functional Digital MVP',
    status: 'LIVE MVP',
    title: 'Core Loop: 15 High-Duration Tracks, Kahoot Arena & Account Progress',
    subtitle: '15 planned specialist tracks (465 estimated hours) with one sample module each, interactive recall practice, optional Google sign-in, local account-scoped progress, a Rewards Vault, and shareable scorecards.',
    capabilities: [
      '15 high-duration course tracks (18h–48h estimated each); sample module content in this MVP',
      'Google sign-in setup + per-account local progress + optional custom API sync',
      'Evidence-informed retrieval, feedback, and review scheduling',
      'High-DPI Instagram Scorecard Studio (@love_me_for_my_wits)',
    ],
  },
  {
    phase: 'Phase 02',
    timeline: 'Next Horizon · Adaptive Intelligence',
    status: 'IN DEVELOPMENT',
    title: 'AI Concept Graphs & Personalized Socratic Tutor',
    subtitle: 'Future AI learning nodes may adapt questions to a validated review model and debate mental models with learners.',
    capabilities: [
      'Accuracy-based review interval suggestions (currently a simple heuristic)',
      'Socratic AI companion for probing "Why?" inside any essay',
      'Dynamic synthesis quizzes generated from creator dispatches',
    ],
  },
  {
    phase: 'Phase 03',
    timeline: 'Expansion · Creator & Cohort Ecosystem',
    status: 'PLANNED',
    title: 'Live Seminar Studios & Multiplayer Quiz Arenas',
    subtitle: 'Empowering world-class researchers, authors, and operators to host live multiplayer Kahoot-style cohort arenas and interactive salons.',
    capabilities: [
      'Live synchronous cohort quiz arenas with real-time podiums',
      'Creator studio to turn essays into interactive quiz modules',
      'Verified domain credentials backed by active recall scores',
    ],
  },
  {
    phase: 'Phase 04',
    timeline: 'Long-Term Ecosystem Vision',
    status: 'LONG-TERM VISION',
    title: 'PASHco Physical Schools & University-Level Campuses',
    subtitle: 'Bridging digital mastery with physical learning spaces—hybrid micro-campuses, residential fellowships, and accredited higher education.',
    capabilities: [
      'Physical PASHco learning studios & city salons',
      'Interdisciplinary undergraduate & fellowship tracks',
      'Global employer & academic mastery recognition network',
    ],
  },
];
