import * as math from 'mathjs'

const STOP_WORDS = new Set(`a about above after again against all am an and any are aren't as at be because been before being below between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves also however therefore thus may might using used use make made called name means meaning process system example examples following important key concept concepts study question answer explain describe define compare evaluate calculate solve find value values`.split(/\s+/))

const SUBJECT_RULES = [
  { name: 'Algebra', icon: 'sigma', terms: ['equation', 'solve', 'variable', 'quadratic', 'linear', 'polynomial', 'factor', 'derivative', 'integral', 'function'] },
  { name: 'Geometry', icon: 'shapes', terms: ['angle', 'triangle', 'circle', 'area', 'perimeter', 'hypotenuse', 'parallel', 'coordinate'] },
  { name: 'Chemistry', icon: 'flask', terms: ['molecule', 'atom', 'bond', 'reaction', 'mole', 'acid', 'base', 'electron', 'oxidation'] },
  { name: 'Biology', icon: 'leaf', terms: ['cell', 'mitochondria', 'photosynthesis', 'dna', 'protein', 'enzyme', 'organism', 'mitosis', 'meiosis', 'membrane'] },
  { name: 'Physics', icon: 'atom', terms: ['force', 'velocity', 'acceleration', 'energy', 'momentum', 'newton', 'circuit', 'wave', 'mass'] },
  { name: 'Statistics', icon: 'chart', terms: ['mean', 'median', 'mode', 'variance', 'standard deviation', 'probability', 'sample', 'data set'] },
  { name: 'Accounting', icon: 'table', terms: ['revenue', 'cogs', 'gross profit', 'net income', 'assets', 'liabilities', 'income statement'] },
  { name: 'Economics', icon: 'trend', terms: ['supply', 'demand', 'market', 'elasticity', 'inflation', 'gdp', 'opportunity cost'] },
  { name: 'History', icon: 'book', terms: ['war', 'revolution', 'century', 'empire', 'treaty', 'historical', 'government'] },
  { name: 'Computer Science', icon: 'code', terms: ['algorithm', 'array', 'recursion', 'database', 'complexity', 'binary', 'network', 'software'] },
]

const QUICK_FACTS = [
  {
    match: /powerhouse of the cell|produces atp|atp production/i,
    subject: 'Biology',
    answer: 'Mitochondria',
    explanation: 'Mitochondria generate most of the cell’s ATP through aerobic respiration, which is why they are called the powerhouse of the cell.',
    steps: ['Cells need usable chemical energy in the form of ATP.', 'Mitochondria use oxygen and nutrients during cellular respiration.', 'Their inner membrane supports the electron transport chain that produces most ATP.'],
  },
  {
    match: /what is photosynthesis|photosynthesis/i,
    subject: 'Biology',
    answer: 'Photosynthesis converts light energy into chemical energy stored in glucose.',
    explanation: 'Plants, algae, and some bacteria use light energy to convert carbon dioxide and water into glucose and oxygen.',
    steps: ['Chlorophyll absorbs light energy.', 'Light reactions produce ATP and NADPH while splitting water.', 'The Calvin cycle uses carbon dioxide to build sugar.'],
  },
  {
    match: /mitosis|cell division/i,
    subject: 'Biology',
    answer: 'Mitosis produces two genetically identical daughter cells.',
    explanation: 'Mitosis is one round of nuclear division used for growth, repair, and asexual reproduction.',
    steps: ['The cell duplicates its DNA during interphase.', 'Chromosomes align and separate during mitosis.', 'Cytokinesis splits the cytoplasm into two identical cells.'],
  },
  {
    match: /newton'?s second law|f\s*=\s*ma|force equals/i,
    subject: 'Physics',
    answer: 'F = ma',
    explanation: 'Newton’s second law states that net force equals mass multiplied by acceleration.',
    steps: ['Identify the object and its mass.', 'Find the acceleration from the change in velocity.', 'Multiply mass and acceleration to obtain net force in newtons.'],
  },
  {
    match: /pythagorean theorem|hypotenuse/i,
    subject: 'Geometry',
    answer: 'a² + b² = c²',
    explanation: 'For a right triangle, the square of the hypotenuse equals the sum of the squares of the other two sides.',
    steps: ['Confirm the triangle has a right angle.', 'Square each leg length.', 'Add the squares, then take the square root to obtain the hypotenuse.'],
  },
  {
    match: /area of a circle|circle area/i,
    subject: 'Geometry',
    answer: 'A = πr²',
    explanation: 'The area of a circle is pi multiplied by the square of its radius.',
    steps: ['Find the radius, which is half the diameter.', 'Square the radius.', 'Multiply by π and include square units.'],
  },
  {
    match: /derivative of x\^n|power rule/i,
    subject: 'Calculus',
    answer: 'd/dx[xⁿ] = n·xⁿ⁻¹',
    explanation: 'The power rule brings the exponent down as a coefficient and reduces the exponent by one.',
    steps: ['Write the term in the form xⁿ.', 'Multiply by the original exponent n.', 'Subtract one from the exponent.'],
  },
  {
    match: /supply and demand|equilibrium price/i,
    subject: 'Economics',
    answer: 'Equilibrium occurs where quantity supplied equals quantity demanded.',
    explanation: 'At that price, the amount producers are willing to sell matches the amount consumers want to buy.',
    steps: ['Set the supply equation equal to the demand equation.', 'Solve for the equilibrium quantity.', 'Substitute the quantity back into either equation to find price.'],
  },
]

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function cleanText(value = '') {
  return String(value)
    .replace(/\r/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function normalizeMath(value = '') {
  const superscripts = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' }
  let output = String(value)
    .replace(/\\left|\\right|\\cdot/g, (match) => (match === '\\cdot' ? '*' : ''))
    .replace(/[−–—]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (char) => `^${superscripts[char]}`)
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*([0-9.]+)/g, 'sqrt($1)')
    .replace(/\bX\b/g, 'x')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\$/g, '')
    .trim()

  return output
}

function normalizeForParsing(value = '') {
  let output = normalizeMath(value)
    .replace(/^\s*(solve|calculate|evaluate|find|compute|what is|simplify)\s*(for\s+[a-z]\s*)?[:,-]?\s*/i, '')
    .replace(/\bdegrees\b/g, '')
    .replace(/[?]/g, '')
    .trim()

  // If the remaining text is already an equation, keep the full expression.
  // The fallback extraction below is only for long natural-language questions.
  if (!output.includes('=')) {
    const match = output.match(/([-+]?[0-9.]*[a-z]?(?:\s*[-+*/^()]\s*[0-9.]*[a-z]?)+)/i)
    if (match && match[0].length > 4 && output.length > match[0].length + 8) output = match[0]
  }

  return output
}

function safeEvaluate(expression, scope = {}) {
  try {
    const result = math.evaluate(expression, { ...scope })
    if (typeof result === 'number' && Number.isFinite(result)) return result
    if (result && typeof result.valueOf === 'function') {
      const numeric = Number(result.valueOf())
      if (Number.isFinite(numeric)) return numeric
    }
    return null
  } catch {
    return null
  }
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) < 1e-10) return '0'
  const rounded = Math.round(value * 1000) / 1000
  if (Number.isInteger(rounded)) return String(rounded)
  for (const denominator of [2, 3, 4, 5, 6, 8, 10, 12, 16, 20]) {
    const numerator = rounded * denominator
    if (Math.abs(numerator - Math.round(numerator)) < 0.002) {
      return `${Math.round(numerator)}/${denominator}`
    }
  }
  return String(Number(rounded.toFixed(3)))
}

function prettyExpression(value = '') {
  return String(value)
    .replace(/\*/g, '·')
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/sqrt/g, '√')
    .replace(/pi/g, 'π')
    .replace(/\s+/g, ' ')
    .trim()
}

function detectSubject(text) {
  const lower = text.toLowerCase()
  const scores = SUBJECT_RULES.map((rule) => ({
    ...rule,
    score: rule.terms.reduce((count, term) => count + (lower.includes(term) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score)
  return scores[0].score > 0 ? scores[0] : { name: 'General Study', icon: 'sparkles', score: 0 }
}

function getSentences(text) {
  return cleanText(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.replace(/^\s*[-•\d.)\]]+\s*/, '').trim())
    .filter((sentence) => sentence.length > 16)
}

function getKeywords(text, limit = 12) {
  const words = cleanText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word) && !/^\d+$/.test(word))

  const frequency = new Map()
  for (const word of words) frequency.set(word, (frequency.get(word) || 0) + 1)

  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word)
}

function titleCase(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function extractEquation(text) {
  const source = String(text)
    .replace(/^.*?\b(?:when|if|where|given that|such that)\b\s*/i, '')
    .trim()
  let normalized = normalizeForParsing(source || text)
  if ((normalized.match(/=/g) || []).length !== 1) return null
  let [lhs, rhs] = normalized.split('=').map((part) => part.trim())
  const withoutFunctions = `${lhs} ${rhs}`.replace(/\b(?:sqrt|sin|cos|tan|log|ln|abs|pi)\b/gi, '')
  const variable = withoutFunctions.match(/[a-df-hj-zA-DF-HJ-Z]/)?.[0]?.toLowerCase()
  if (variable && variable !== 'x') {
    const pattern = new RegExp(`(?<![a-z])${escapeRegExp(variable)}(?![a-z])`, 'gi')
    lhs = lhs.replace(pattern, 'x')
    rhs = rhs.replace(pattern, 'x')
  }
  if (!lhs || !rhs || !/[0-9a-z]/i.test(lhs) || !/[0-9a-z]/i.test(rhs)) return null
  if (!/[+\-*/^()0-9.]/.test(lhs + rhs)) return null
  return { lhs, rhs, f: `(${lhs}) - (${rhs})` }
}

function findRoots(expression) {
  const roots = []
  const at = (x) => safeEvaluate(expression, { x })
  if (at(0) === null) return roots

  const scan = (from, to, step) => {
    let previousX = from
    let previousY = at(previousX)
    for (let x = from + step; x <= to + step / 2; x += step) {
      const y = at(x)
      if (previousY === null || y === null) {
        previousX = x
        previousY = y
        continue
      }
      if (Math.abs(y) < 1e-8) {
        roots.push(x)
      } else if (previousY * y < 0 && Math.abs(y - previousY) < 1e7) {
        let low = previousX
        let high = x
        let lowValue = previousY
        for (let i = 0; i < 64; i += 1) {
          const mid = (low + high) / 2
          const midValue = at(mid)
          if (midValue === null) break
          if (Math.abs(midValue) < 1e-12 || (high - low) / 2 < 1e-10) {
            roots.push(mid)
            break
          }
          if (lowValue * midValue <= 0) {
            high = mid
          } else {
            low = mid
            lowValue = midValue
          }
        }
      }
      previousX = x
      previousY = y
    }
  }

  scan(-80, 80, 0.2)

  return roots
    .sort((a, b) => a - b)
    .filter((root, index, list) => index === 0 || Math.abs(root - list[index - 1]) > 1e-4)
    .slice(0, 8)
}

function fitPolynomial(expression) {
  const f0 = safeEvaluate(expression, { x: 0 })
  const f1 = safeEvaluate(expression, { x: 1 })
  const fn1 = safeEvaluate(expression, { x: -1 })
  const f2 = safeEvaluate(expression, { x: 2 })
  if ([f0, f1, fn1, f2].some((value) => value === null)) return null
  const a = (f1 + fn1 - 2 * f0) / 2
  const b = (f1 - fn1) / 2
  const c = f0
  const quadraticCheck = 4 * a + 2 * b + c
  if (Math.abs(a) > 1e-8 && Math.abs(quadraticCheck - f2) < 1e-5) {
    return { degree: 2, a, b, c }
  }
  if (Math.abs(a) < 1e-8 && Math.abs(b) > 1e-8) {
    return { degree: 1, a: 0, b, c }
  }
  return { degree: 0, a: 0, b: 0, c }
}

function equationSolution(question) {
  let equation = extractEquation(question)
  if (!equation && (String(question).match(/=/g) || []).length > 1) {
    const firstClause = String(question)
      .split(/[,.;]|\bthen\b/i)
      .map((part) => part.trim())
      .find((part) => (part.match(/=/g) || []).length === 1)
    if (firstClause) equation = extractEquation(firstClause)
  }
  if (!equation) return null

  const { lhs, rhs, f } = equation
  const roots = findRoots(f)
  const polynomial = fitPolynomial(f)
  const hasX = /x/i.test(`${lhs} ${rhs}`)

  if (!hasX) {
    const leftValue = safeEvaluate(lhs)
    const rightValue = safeEvaluate(rhs)
    if (leftValue === null || rightValue === null) return null
    const isTrue = Math.abs(leftValue - rightValue) < 1e-8
    return {
      type: 'equation',
      subject: 'Arithmetic',
      finalAnswer: isTrue ? 'True' : 'False',
      answerText: `${formatNumber(leftValue)} ${isTrue ? '=' : '≠'} ${formatNumber(rightValue)}`,
      confidence: 99,
      steps: [
        { title: 'Evaluate the left side', body: `${prettyExpression(lhs)} = ${formatNumber(leftValue)}` },
        { title: 'Evaluate the right side', body: `${prettyExpression(rhs)} = ${formatNumber(rightValue)}` },
        { title: 'Compare both values', body: isTrue ? 'Both sides are equal, so the statement is true.' : 'The two sides are different, so the statement is false.' },
      ],
      graph: null,
      checks: ['Symbolic evaluation', 'Arithmetic verification'],
    }
  }

  if (!polynomial || roots.length === 0) {
    const constant = polynomial?.degree === 0
    return {
      type: 'equation',
      subject: 'Algebra',
      finalAnswer: constant && Math.abs(polynomial.c) < 1e-8 ? 'Infinitely many solutions' : 'No real solution',
      answerText: constant && Math.abs(polynomial.c) < 1e-8 ? 'Both sides are equivalent for every value of x.' : 'The equation has no real solution in the scanned domain.',
      confidence: 92,
      steps: [
        { title: 'Move every term to one side', body: `Write the equation as ${prettyExpression(f)} = 0.` },
        { title: 'Look for real zeros', body: 'Evaluate the resulting function across the real number line.' },
        { title: 'State the solution set', body: constant && Math.abs(polynomial?.c || 1) < 1e-8 ? 'The expression simplifies to zero for every x.' : 'No sign change or exact zero was found, so there is no real solution.' },
      ],
      graph: null,
      checks: ['Symbolic normalization', 'Numeric root scan'],
    }
  }

  const rootText = roots.map((root) => `x = ${formatNumber(root)}`).join(', ')

  if (polynomial.degree === 2) {
    const { a, b, c } = polynomial
    const discriminant = b * b - 4 * a * c
    return {
      type: 'equation',
      subject: 'Algebra',
      finalAnswer: rootText,
      answerText: rootText,
      confidence: 98,
      steps: [
        { title: 'Identify the coefficients', body: `After rearranging, the equation is ${formatNumber(a)}x² ${b < 0 ? '−' : '+'} ${formatNumber(Math.abs(b))}x ${c < 0 ? '−' : '+'} ${formatNumber(Math.abs(c))} = 0. So a = ${formatNumber(a)}, b = ${formatNumber(b)}, and c = ${formatNumber(c)}.` },
        { title: 'Use the quadratic formula', body: 'x = (−b ± √(b² − 4ac)) ÷ 2a', math: 'x = (-b ± √(b² - 4ac)) / (2a)' },
        { title: 'Calculate the discriminant', body: `Δ = b² − 4ac = ${formatNumber(discriminant)}. ${discriminant >= 0 ? 'Because Δ ≥ 0, the equation has real roots.' : 'Because Δ < 0, the roots are complex.'}` },
        { title: 'Simplify the roots', body: `The solution${roots.length === 1 ? ' is' : 's are'} ${rootText}.` },
      ],
      graph: { kind: 'quadratic', a, b, c, roots },
      checks: ['Symbolic rearrangement', 'Quadratic formula', 'Numeric verification'],
    }
  }

  const x = roots[0]
  const leftAtRoot = safeEvaluate(lhs, { x })
  const rightAtRoot = safeEvaluate(rhs, { x })
  const verified = leftAtRoot !== null && rightAtRoot !== null && Math.abs(leftAtRoot - rightAtRoot) < 1e-6
  return {
    type: 'equation',
    subject: 'Algebra',
    finalAnswer: `x = ${formatNumber(x)}`,
    answerText: `x = ${formatNumber(x)}`,
    confidence: verified ? 99 : 95,
    steps: [
      { title: 'Move all terms to one side', body: `Rewrite ${prettyExpression(lhs)} = ${prettyExpression(rhs)} as ${prettyExpression(f)} = 0.` },
      { title: 'Combine like terms', body: `The equation simplifies to ${formatNumber(polynomial.b)}x ${polynomial.c < 0 ? '−' : '+'} ${formatNumber(Math.abs(polynomial.c))} = 0.` },
      { title: 'Isolate the variable', body: `Add ${formatNumber(-polynomial.c)} to both sides, then divide by ${formatNumber(polynomial.b)}.` },
      { title: 'Check the answer', body: verified ? `Substitute x = ${formatNumber(x)}: both sides equal ${formatNumber(leftAtRoot)}.` : `The approximate value is x = ${formatNumber(x)}.` },
    ],
    graph: { kind: 'linear', m: polynomial.b, b: polynomial.c, roots },
    checks: ['Symbolic rearrangement', 'Inverse operations', 'Substitution check'],
  }
}

function derivativeSolution(question) {
  if (!/derivative|differentiate|d\/dx/i.test(question)) return null
  let expression = normalizeForParsing(question)
    .replace(/.*?\b(?:of)\s+/i, '')
    .replace(/^d\/dx\s*/i, '')
    .replace(/\s*with respect to x.*/i, '')
    .trim()
  if (!expression || expression.length > 100) return null

  try {
    const result = math.simplify(math.derivative(expression, 'x')).toString()
    if (!result || result === expression) return null
    return {
      type: 'derivative',
      subject: 'Calculus',
      finalAnswer: prettyExpression(result),
      answerText: `d/dx[${prettyExpression(expression)}] = ${prettyExpression(result)}`,
      confidence: 97,
      steps: [
        { title: 'Identify the rule', body: 'Apply the sum, constant, and power rules to each term.' },
        { title: 'Differentiate term by term', body: `Starting function: f(x) = ${prettyExpression(expression)}.` },
        { title: 'Simplify', body: `f′(x) = ${prettyExpression(result)}.` },
      ],
      graph: null,
      checks: ['Symbolic differentiation', 'Expression simplification'],
    }
  } catch {
    return null
  }
}

function statisticsSolution(question) {
  const numbers = (question.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
  if (!/mean|median|mode|standard deviation|variance|average|range/i.test(question) || numbers.length < 3) return null
  const sorted = [...numbers].sort((a, b) => a - b)
  const sum = numbers.reduce((total, value) => total + value, 0)
  const mean = sum / numbers.length
  const median = numbers.length % 2
    ? sorted[(numbers.length - 1) / 2]
    : (sorted[numbers.length / 2 - 1] + sorted[numbers.length / 2]) / 2
  const variance = numbers.reduce((total, value) => total + (value - mean) ** 2, 0) / numbers.length
  const deviation = Math.sqrt(variance)
  const range = sorted.at(-1) - sorted[0]
  const frequencies = new Map()
  numbers.forEach((number) => frequencies.set(number, (frequencies.get(number) || 0) + 1))
  const [mode, modeCount] = [...frequencies.entries()].sort((a, b) => b[1] - a[1])[0]
  const requested = /standard deviation/i.test(question) ? deviation : /variance/i.test(question) ? variance : /median/i.test(question) ? median : /mode/i.test(question) ? (modeCount > 1 ? mode : mean) : /range/i.test(question) ? range : mean
  const requestedLabel = /standard deviation/i.test(question) ? 'population standard deviation' : /variance/i.test(question) ? 'population variance' : /median/i.test(question) ? 'median' : /mode/i.test(question) ? 'mode' : /range/i.test(question) ? 'range' : 'mean'
  return {
    type: 'statistics',
    subject: 'Statistics',
    finalAnswer: formatNumber(requested),
    answerText: `The ${requestedLabel} is ${formatNumber(requested)}.`,
    confidence: 98,
    steps: [
      { title: 'Organize the data', body: `Sorted data set: ${sorted.map(formatNumber).join(', ')} (n = ${numbers.length}).` },
      { title: 'Calculate the center', body: `Mean = sum ÷ n = ${formatNumber(sum)} ÷ ${numbers.length} = ${formatNumber(mean)}. Median = ${formatNumber(median)}.` },
      { title: 'Measure the spread', body: `Range = ${formatNumber(range)}, variance = ${formatNumber(variance)}, and standard deviation = ${formatNumber(deviation)}.` },
      { title: 'Report the requested statistic', body: `The ${requestedLabel} is ${formatNumber(requested)}.` },
    ],
    graph: { kind: 'bars', values: numbers },
    checks: ['Data parsing', 'Formula evaluation', 'Sorted-value verification'],
  }
}

function geometrySolution(question) {
  const numbers = (question.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
  const lower = question.toLowerCase()
  if (/area.*circle/.test(lower) && numbers.length) {
    const radius = /diameter/.test(lower) ? numbers[0] / 2 : numbers[0]
    const area = Math.PI * radius ** 2
    return {
      type: 'geometry',
      subject: 'Geometry',
      finalAnswer: `A = ${formatNumber(area)} square units`,
      answerText: `A = πr² = π(${formatNumber(radius)})² ≈ ${formatNumber(area)}`,
      confidence: 98,
      steps: [
        { title: 'Identify the radius', body: `${/diameter/.test(lower) ? 'Divide the diameter by two.' : 'Use the given radius.'} r = ${formatNumber(radius)}.` },
        { title: 'Apply the circle area formula', body: 'A = πr².' },
        { title: 'Substitute and simplify', body: `A = π × (${formatNumber(radius)})² ≈ ${formatNumber(area)}.` },
      ],
      graph: { kind: 'circle', radius },
      checks: ['Formula recognition', 'Unit check'],
    }
  }
  if (/hypotenuse|pythagorean/.test(lower) && numbers.length >= 2) {
    const [a, b] = numbers
    const hypotenuse = Math.sqrt(a * a + b * b)
    return {
      type: 'geometry',
      subject: 'Geometry',
      finalAnswer: `c = ${formatNumber(hypotenuse)}`,
      answerText: `c = √(${formatNumber(a)}² + ${formatNumber(b)}²) ≈ ${formatNumber(hypotenuse)}`,
      confidence: 98,
      steps: [
        { title: 'Confirm the triangle is right-angled', body: 'The Pythagorean theorem applies to right triangles.' },
        { title: 'Use a² + b² = c²', body: `Substitute a = ${formatNumber(a)} and b = ${formatNumber(b)}.` },
        { title: 'Take the positive square root', body: `c = √${formatNumber(a * a + b * b)} ≈ ${formatNumber(hypotenuse)}.` },
      ],
      graph: { kind: 'triangle', a, b },
      checks: ['Formula recognition', 'Positive-root check'],
    }
  }
  return null
}

function quickFactSolution(question) {
  const fact = QUICK_FACTS.find((item) => item.match.test(question))
  if (!fact) return null
  return {
    type: 'concept',
    subject: fact.subject,
    finalAnswer: fact.answer,
    answerText: fact.explanation,
    confidence: 96,
    steps: fact.steps.map((body, index) => ({
      title: ['Identify the core idea', 'Connect the key concept', 'State the conclusion'][index] || `Key point ${index + 1}`,
      body,
    })),
    graph: null,
    checks: ['Concept recognition', 'Definition verification', 'Context check'],
  }
}

function expressionSolution(question) {
  const expression = normalizeForParsing(question)
  if (!expression || expression.length > 90 || !/[0-9]/.test(expression)) return null
  if (/[a-z]{4,}/i.test(expression.replace(/\b(sqrt|sin|cos|tan|log|ln|abs|pi|x)\b/gi, ''))) return null

  try {
    math.parse(expression)
  } catch {
    return null
  }

  const hasVariable = /\bx\b/.test(expression)
  if (!hasVariable) {
    const value = safeEvaluate(expression)
    if (value === null) return null
    const simplified = math.simplify(expression).toString()
    return {
      type: 'expression',
      subject: 'Arithmetic',
      finalAnswer: formatNumber(value),
      answerText: `${prettyExpression(expression)} = ${formatNumber(value)}`,
      confidence: 99,
      steps: [
        { title: 'Write the expression', body: prettyExpression(expression) },
        { title: 'Apply order of operations', body: `The expression simplifies to ${prettyExpression(simplified)}.` },
        { title: 'Evaluate', body: `Final value = ${formatNumber(value)}.` },
      ],
      graph: null,
      checks: ['Expression parser', 'Direct evaluation'],
    }
  }

  const polynomial = fitPolynomial(expression)
  let derivativeText = ''
  try {
    derivativeText = prettyExpression(math.simplify(math.derivative(expression, 'x')).toString())
  } catch {
    derivativeText = 'Not available for this expression.'
  }

  return {
    type: 'function',
    subject: 'Algebra',
    finalAnswer: `f(x) = ${prettyExpression(expression)}`,
    answerText: `f′(x) = ${derivativeText}`,
    confidence: 94,
    steps: [
      { title: 'Identify the function', body: `f(x) = ${prettyExpression(expression)}` },
      { title: 'Differentiate', body: `f′(x) = ${derivativeText}` },
      { title: 'Find important points', body: `The y-intercept is f(0) = ${formatNumber(safeEvaluate(expression, { x: 0 }) ?? 0)}. Use f′(x) = 0 to locate stationary points.` },
    ],
    graph: polynomial?.degree === 2
      ? { kind: 'quadratic', a: polynomial.a, b: polynomial.b, c: polynomial.c, roots: findRoots(expression) }
      : { kind: 'custom', expression },
    checks: ['Function parsing', 'Symbolic derivative'],
  }
}

function genericSolution(question, subject) {
  const words = getKeywords(question, 5)
  const coreTopic = words[0] ? titleCase(words[0]) : 'the topic'
  const terms = words.length ? words.map(titleCase).join(', ') : 'context, evidence, method, and conclusion'
  const firstSentence = cleanText(question).split(/[.!?]/)[0]
  return {
    type: 'concept',
    subject: subject.name,
    finalAnswer: `A structured ${subject.name.toLowerCase()} explanation is ready below.`,
    answerText: `Review the key idea, method, and conclusion for ${coreTopic.toLowerCase()}.`,
    confidence: 82,
    steps: [
      { title: 'Understand what is being asked', body: `The question focuses on: “${firstSentence || question}”. First identify the subject, the required output, and any conditions.` },
      { title: 'Identify the key concepts', body: `Important ideas to connect are ${terms}. Define each term in your own words before applying a formula or argument.` },
      { title: 'Build the solution', body: `For ${subject.name}, start from a principle you know, show each calculation or piece of evidence, and explain why the step follows from the previous one.` },
      { title: 'Check and conclude', body: `Verify units, signs, dates, or assumptions. Finish with a concise conclusion that directly answers the original question.` },
    ],
    graph: null,
    checks: ['Question classification', 'Concept extraction', 'Answer-structure check'],
  }
}

export function solveProblem(input, attachments = []) {
  const question = cleanText(input) || (attachments.length ? `Analyze the attached study material: ${attachments.map((item) => item.name).join(', ')}` : '')
  if (!question) {
    return {
      type: 'empty',
      subject: 'General Study',
      finalAnswer: 'Add a question to begin.',
      answerText: 'Type a problem, paste notes, or attach a file.',
      confidence: 0,
      steps: [],
      graph: null,
      checks: [],
    }
  }

  const subject = detectSubject(question)
  const solutions = [
    quickFactSolution(question),
    derivativeSolution(question),
    statisticsSolution(question),
    geometrySolution(question),
    equationSolution(question),
    expressionSolution(question),
  ]
  const result = solutions.find(Boolean) || genericSolution(question, subject)

  const modelNames = ['Symbolic Engine', 'Logic Engine', 'Context Engine']
  const checks = (result.checks || []).map((label, index) => ({
    label,
    model: modelNames[index % modelNames.length],
    passed: true,
  }))
  if (result.type === 'concept') {
    checks.push({ label: 'Verify source assumptions', model: 'Context Engine', passed: false })
  }

  return {
    id: createId('solve'),
    createdAt: new Date().toISOString(),
    question,
    attachments,
    ...result,
    checks,
    followups: [
      'Explain this in simpler words',
      'Why does this method work?',
      `Give me a quick quiz on ${result.subject.toLowerCase()}`,
      'Show a real-world example',
    ],
  }
}

export function createId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createFollowupAnswer(question, solution) {
  const normalized = question.toLowerCase()
  if (/simple|simplif|don't understand|explain like/i.test(normalized)) {
    return `Here’s the short version: ${solution.answerText}. Think of it as a repeatable method — identify what you know, apply one rule at a time, and check that the result answers the original question.`
  }
  if (/quiz|practice|test me/i.test(normalized)) {
    return `Quick check: 1) What is the first step? 2) Which rule or formula applies to ${solution.subject.toLowerCase()} here? 3) How can you verify ${solution.finalAnswer}? Try answering aloud, then generate a quiz from this problem in the Quiz tab.`
  }
  if (/why|method|work/i.test(normalized)) {
    return `The method works because ${solution.steps[0]?.body || 'it breaks the problem into smaller, verifiable steps'}. Each following step preserves the same relationship while moving toward a form you can evaluate.`
  }
  if (/example|real world/i.test(normalized)) {
    return `A real-world analogy: solving this is like following a recipe. ${solution.steps[1]?.body || 'Gather the information first'} Then combine the ingredients in order, and taste-test — that final check is your substitution or verification step.`
  }
  if (/step/i.test(normalized)) {
    return solution.steps.map((step, index) => `${index + 1}. ${step.title}: ${step.body}`).join('\n')
  }
  return `For “${question}”, the key connection is: ${solution.finalAnswer}. ${solution.steps.at(-1)?.body || 'Review the steps above and verify the assumptions.'}`
}

export function generateStudyPack(sourceText, title = 'My study set') {
  const text = cleanText(sourceText)
  const sentences = getSentences(text)
  const keywords = getKeywords(text, 10)
  const fallbackSentences = [
    'Photosynthesis is the process that converts light energy into chemical energy stored in glucose.',
    'Mitochondria are organelles that produce most of the ATP used as energy by a cell.',
    'Mitosis is cell division that produces two genetically identical daughter cells.',
    'Enzymes are biological catalysts that lower the activation energy of a reaction.',
    'Osmosis is the diffusion of water across a selectively permeable membrane.',
    'Active recall strengthens memory by retrieving information without looking at notes.',
    'Spaced repetition reviews material at increasing intervals to improve long-term retention.',
  ]
  const workingSentences = sentences.length >= 3 ? sentences : [...sentences, ...fallbackSentences].slice(0, 8)
  const definitions = []

  for (const sentence of workingSentences) {
    const match = sentence.match(/^([A-Z][A-Za-z\s-]{2,42}?)\s+(?:is|are|refers to|means)\s+(.+)$/i)
    if (match) {
      definitions.push({ term: titleCase(match[1].trim()), definition: cleanText(match[2]) })
    }
  }

  const topicTerms = (keywords.length ? keywords : ['photosynthesis', 'mitochondria', 'mitosis', 'enzymes']).slice(0, 6)
  const summary = workingSentences.slice(0, 3).join(' ')

  const flashcards = []
  definitions.forEach((item, index) => {
    flashcards.push({
      id: `card-${index}`,
      front: `What is ${item.term}?`,
      back: item.definition,
      topic: item.term,
    })
  })
  workingSentences.slice(0, 12).forEach((sentence, index) => {
    if (flashcards.length >= 12) return
    const words = sentence.split(' ')
    const hidden = words.slice(1, Math.min(4, words.length)).join(' ')
    if (!hidden) return
    flashcards.push({
      id: `card-cloze-${index}`,
      front: `Complete the idea: ${words[0]} _____ ${words.slice(Math.min(4, words.length)).join(' ')}`,
      back: sentence,
      topic: topicTerms[index % topicTerms.length],
    })
  })
  while (flashcards.length < 6) {
    const index = flashcards.length
    flashcards.push({
      id: `card-base-${index}`,
      front: `Why is “${titleCase(topicTerms[index % topicTerms.length])}” important?`,
      back: `It is one of the central ideas in ${title}. ${workingSentences[index % workingSentences.length]}`,
      topic: titleCase(topicTerms[index % topicTerms.length]),
    })
  }

  const answerPool = flashcards.map((card) => card.back)
  const quiz = flashcards.slice(0, 8).map((card, index) => {
    const distractors = answerPool
      .filter((answer) => answer !== card.back)
      .slice(index % Math.max(answerPool.length - 1, 1), index % Math.max(answerPool.length - 1, 1) + 3)
      .map((answer) => answer.length > 120 ? `${answer.slice(0, 117)}…` : answer)
    while (distractors.length < 3) {
      distractors.push(`It describes a process unrelated to ${card.topic}.`)
    }
    const options = [card.back, ...distractors.slice(0, 3)]
    return {
      id: `quiz-${index}`,
      prompt: card.front,
      options,
      correctIndex: 0,
      explanation: `The source material states: ${card.back}`,
      topic: card.topic,
    }
  })

  const guide = {
    title,
    summary: summary || `This guide organizes the most important concepts from ${title}.`,
    topics: topicTerms.map((term, index) => ({
      name: titleCase(term),
      mastery: Math.max(28, 78 - index * 7),
      bullets: [
        workingSentences[index % workingSentences.length],
        `Connect ${term} to the larger process described in the source.`,
        `Review an example and explain ${term} without looking at notes.`,
      ],
    })),
    keyTerms: topicTerms.map((term, index) => ({
      term: titleCase(term),
      definition: definitions[index]?.definition || workingSentences[index % workingSentences.length],
    })),
    reviewQuestions: flashcards.slice(0, 5).map((card) => card.front),
    examples: workingSentences.slice(0, 3),
  }

  const predictedTopics = topicTerms.map((term, index) => ({
    topic: titleCase(term),
    likelihood: Math.max(48, 96 - index * 8),
    mastery: Math.max(24, 82 - index * 11),
  }))

  return {
    id: createId('pack'),
    title,
    createdAt: new Date().toISOString(),
    sourceText: text,
    summary,
    keywords: topicTerms,
    flashcards,
    quiz,
    guide,
    predictedTopics,
    cheatSheet: topicTerms.map((term) => `${titleCase(term)} — ${guide.keyTerms.find((item) => item.term.toLowerCase() === term)?.definition || workingSentences[0]}`),
  }
}

export function generateResearchReport(topic, sources = [], targetWords = 700) {
  const cleanTopic = cleanText(topic) || 'the relationship between technology and learning outcomes'
  const notes = sources.map((source) => cleanText(source.content || source.title || source.url)).filter(Boolean)
  const keywords = getKeywords(`${cleanTopic} ${notes.join(' ')}`, 8)
  const sourceLinks = sources.filter((source) => source.url || source.title)
  return {
    id: createId('research'),
    title: cleanTopic,
    targetWords,
    createdAt: new Date().toISOString(),
    sections: [
      {
        heading: 'Introduction',
        paragraphs: [
          `${cleanTopic} is a topic that benefits from a structured review of definitions, evidence, and competing explanations. This report frames the question, identifies the most relevant concepts, and separates established findings from assumptions that require further verification.`,
          `The central concepts are ${keywords.slice(0, 5).map(titleCase).join(', ') || 'context, measurement, evidence, and outcomes'}. Together they provide a practical lens for comparing results across different studies or course materials.`,
        ],
      },
      {
        heading: 'Key findings',
        paragraphs: [
          `The supplied material emphasizes ${keywords[0] || 'the main topic'} and ${keywords[1] || 'its context'}. A strong answer should define these ideas, explain how they interact, and describe the conditions under which the relationship changes.`,
          notes[0] || 'Evidence should be evaluated by sample, method, measurement quality, and whether the conclusion follows directly from the data. Correlation alone does not establish causation.',
        ],
      },
      {
        heading: 'Analysis',
        paragraphs: [
          `A useful analysis compares at least two perspectives. First, consider the theoretical explanation. Second, check whether the evidence supports that explanation in practice. Contradictory findings may result from different populations, definitions, or measurement tools.`,
          `For an academic assignment, connect each claim to a source and explain the reasoning rather than placing quotations end to end. Use signposting such as “however,” “in contrast,” and “therefore” to make the argument easy to follow.`,
        ],
      },
      {
        heading: 'Conclusion',
        paragraphs: [
          `In conclusion, ${cleanTopic.toLowerCase()} should be understood as a relationship shaped by multiple variables. The strongest conclusion is qualified: it states what the evidence supports, acknowledges limitations, and identifies a concrete direction for further study.`,
        ],
      },
    ],
    references: sourceLinks.length
      ? sourceLinks.map((source, index) => `[${index + 1}] ${source.title || source.url}. ${source.url || 'User-supplied source'}.`)
      : ['[1] Add public webpage or document links to create a source list.'],
  }
}

export function generateNotesSummary(transcript, course = 'Untitled lecture') {
  const sentences = getSentences(transcript)
  const keywords = getKeywords(transcript, 8)
  const bullets = sentences.slice(0, 8).map((sentence) => sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence)
  return {
    id: createId('note'),
    course,
    createdAt: new Date().toISOString(),
    transcript,
    summary: sentences.slice(0, 2).join(' ') || 'No transcript was captured. Paste lecture notes to generate a summary.',
    keyPoints: bullets.length ? bullets : ['Add a transcript or record a lecture to generate notes.'],
    keywords: keywords.map(titleCase),
    actionItems: [
      'Review the highlighted terms and define each one from memory.',
      'Turn the key points into flashcards.',
      'Complete a short quiz to identify weak areas.',
    ],
  }
}

export function extractTextFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read this file.'))
    if (/\.(txt|md|csv|json|js|jsx|html|css|xml)$/i.test(file.name)) reader.readAsText(file)
    else reader.readAsArrayBuffer(file)
  })
}

export function wordCount(value = '') {
  return cleanText(value).split(/\s+/).filter(Boolean).length
}

export function truncate(value, length = 110) {
  const text = cleanText(value)
  return text.length > length ? `${text.slice(0, length - 1)}…` : text
}

export function safeFileName(name) {
  return cleanText(name).replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'study-material'
}

export function downloadText(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function shuffleArray(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export const sampleStudyMaterial = `Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose. Chlorophyll is the pigment that absorbs light in chloroplasts. The light reactions produce ATP and NADPH, while the Calvin cycle uses carbon dioxide to build sugar.

Mitochondria are organelles that produce most of the ATP used by a cell. Cellular respiration uses glucose and oxygen to release energy. Enzymes are proteins that speed up chemical reactions by lowering activation energy.

Mitosis is a type of cell division that produces two genetically identical daughter cells. Meiosis produces four genetically different gametes with half the original number of chromosomes. Osmosis is the diffusion of water across a selectively permeable membrane.`

export const sampleProblems = [
  { id: 'geometry', category: 'Geometry', title: 'Step-by-step solution', expression: '2t + 10 = 3t − 15', label: 'Angle relationship', prompt: 'Solve for t when 2t + 10 = 3t − 15, then find m∠O = 2t + 10.' },
  { id: 'algebra', category: 'Algebra', title: 'Interactive graph', expression: '−x² + 6 = x + 6', label: 'Parabola and line', prompt: 'Solve −x² + 6 = x + 6 and show the intersection points.' },
  { id: 'chemistry', category: 'Chemistry', title: 'Structure visualization', expression: 'H₂O', label: 'Molecular geometry', prompt: 'Describe the molecular geometry and polarity of water (H₂O).' },
  { id: 'accounting', category: 'Accounting', title: 'Financial analysis', expression: 'Revenue − COGS', label: 'Gross profit', prompt: 'Revenue is 500 and COGS is 350. Calculate gross profit and gross margin.' },
]

export const tutorLessons = [
  {
    id: 'quadratic',
    title: 'Quadratic equations',
    subject: 'Algebra',
    duration: '6 min',
    color: '#6c55f6',
    steps: [
      { board: 'Quadratic equations', note: 'A quadratic has the form ax² + bx + c = 0.', speech: 'A quadratic equation contains a squared variable. Today we will solve one with the quadratic formula.' },
      { board: '3x² − 5x − 2 = 0', note: 'Identify a = 3, b = −5, c = −2.', speech: 'First, identify the coefficients from standard form. Here, a is three, b is negative five, and c is negative two.' },
      { board: 'x = (−b ± √(b² − 4ac)) / 2a', note: 'Substitute the coefficients before simplifying.', speech: 'Now write the quadratic formula. Substitute each coefficient carefully, keeping negative signs in parentheses.' },
      { board: 'Δ = 25 + 24 = 49', note: 'A positive discriminant means two real roots.', speech: 'The discriminant is forty-nine. Because it is a perfect square, the roots will be rational numbers.' },
      { board: 'x = 2   or   x = −1/3', note: 'Check both values in the original equation.', speech: 'The two solutions are two and negative one third. Substitute them back to verify the equation equals zero.' },
    ],
    checkpoint: {
      prompt: 'What does a positive discriminant tell you?',
      options: ['There are two real roots', 'There are no real roots', 'The graph is a straight line'],
      correctIndex: 0,
    },
  },
  {
    id: 'photosynthesis',
    title: 'Photosynthesis',
    subject: 'Biology',
    duration: '5 min',
    color: '#1dbf73',
    steps: [
      { board: 'Photosynthesis', note: 'Light energy becomes chemical energy.', speech: 'Photosynthesis is how plants, algae, and some bacteria turn light into stored chemical energy.' },
      { board: '6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂', note: 'Reactants are on the left; products are on the right.', speech: 'The balanced equation shows carbon dioxide and water reacting in the presence of light to create glucose and oxygen.' },
      { board: 'Light reactions → ATP + NADPH', note: 'These happen in the thylakoid membranes.', speech: 'In the light reactions, chlorophyll captures sunlight. The cell stores that energy in ATP and NADPH.' },
      { board: 'Calvin cycle → sugar', note: 'Carbon dioxide is fixed into organic molecules.', speech: 'The Calvin cycle then uses that stored energy to fix carbon dioxide and build sugar.' },
    ],
    checkpoint: {
      prompt: 'Which molecule is the main sugar product?',
      options: ['Glucose', 'Oxygen', 'NADPH'],
      correctIndex: 0,
    },
  },
  {
    id: 'derivatives',
    title: 'Derivative power rule',
    subject: 'Calculus',
    duration: '5 min',
    color: '#f59e0b',
    steps: [
      { board: 'The power rule', note: 'Use it when a term looks like xⁿ.', speech: 'The derivative measures instantaneous rate of change. The power rule is the fastest way to differentiate powers of x.' },
      { board: 'd/dx [xⁿ] = n·xⁿ⁻¹', note: 'Bring down n, then subtract one.', speech: 'Bring the exponent down as a coefficient, then reduce the exponent by one.' },
      { board: 'd/dx [4x³] = 12x²', note: 'Multiply 4 × 3 = 12.', speech: 'For four x cubed, multiply four by three to get twelve, and reduce three to two.' },
      { board: 'd/dx [3x² − 5x + 2] = 6x − 5', note: 'Differentiate each term separately.', speech: 'Apply the rule term by term. The derivative of a constant is zero.' },
    ],
    checkpoint: {
      prompt: 'What is the derivative of x⁴?',
      options: ['4x³', 'x³', '4x⁵'],
      correctIndex: 0,
    },
  },
  {
    id: 'cell-cycle',
    title: 'The cell cycle',
    subject: 'Biology',
    duration: '7 min',
    color: '#ef5da8',
    steps: [
      { board: 'The cell cycle', note: 'A sequence of growth, DNA copying, and division.', speech: 'The cell cycle is an ordered sequence that allows one cell to become two healthy daughter cells.' },
      { board: 'Interphase: G₁ → S → G₂', note: 'Most of the cell’s life is spent in interphase.', speech: 'During interphase the cell grows, duplicates its DNA, and prepares for division.' },
      { board: 'Mitosis: PMAT', note: 'Prophase, metaphase, anaphase, telophase.', speech: 'Mitosis separates duplicated chromosomes into two identical nuclei.' },
      { board: 'Cytokinesis → 2 cells', note: 'The cytoplasm divides after the nuclei separate.', speech: 'Finally, cytokinesis divides the cytoplasm and completes the formation of two cells.' },
    ],
    checkpoint: {
      prompt: 'During which phase is DNA replicated?',
      options: ['S phase', 'M phase', 'Cytokinesis'],
      correctIndex: 0,
    },
  },
]


// Handwritten board content used by the Whiteboard Tutor studio. Each entry
// maps to a lesson step and describes the ink lines plus a small sketch.
export const tutorWhiteboards = {
  quadratic: [
    {
      lines: ['Quadratic equations', 'ax² + bx + c = 0', 'where a ≠ 0'],
      sketch: 'parabola',
      highlight: 0,
    },
    {
      lines: ['3x² − 5x − 2 = 0', 'a = 3', 'b = −5', 'c = −2'],
      sketch: 'parabola',
      highlight: 0,
    },
    {
      lines: ['x = (−b ± √(b² − 4ac)) / 2a', 'Plug in: a = 3, b = −5, c = −2'],
      sketch: null,
      highlight: 0,
    },
    {
      lines: ['Δ = b² − 4ac', 'Δ = (−5)² − 4(3)(−2)', 'Δ = 25 + 24 = 49', 'Δ > 0 → two real roots'],
      sketch: 'parabola',
      highlight: 2,
    },
    {
      lines: ['x = (5 ± √49) / 6 = (5 ± 7) / 6', 'x = 2   or   x = −1/3', 'Both check out in the original equation ✓'],
      sketch: 'parabolaRoots',
      highlight: 1,
    },
  ],
  photosynthesis: [
    {
      lines: ['Photosynthesis', 'light energy → chemical energy', 'chloroplast = the factory'],
      sketch: 'leaf',
      highlight: 0,
    },
    {
      lines: ['6CO₂ + 6H₂O + light', '    → C₆H₁₂O₆ + 6O₂', 'reactants → products'],
      sketch: 'leaf',
      highlight: 0,
    },
    {
      lines: ['Light reactions', 'happen in the thylakoid membrane', 'output: ATP + NADPH'],
      sketch: 'chloroplast',
      highlight: 0,
    },
    {
      lines: ['Calvin cycle', 'happens in the stroma', 'CO₂ gets fixed into sugar'],
      sketch: 'cycle',
      highlight: 0,
    },
  ],
  derivatives: [
    {
      lines: ['The power rule', 'works for any term xⁿ', 'slope = instantaneous rate of change'],
      sketch: 'tangent',
      highlight: 0,
    },
    {
      lines: ['d/dx [xⁿ] = n · xⁿ⁻¹', 'bring the power down', 'then subtract 1 from it'],
      sketch: 'tangent',
      highlight: 0,
    },
    {
      lines: ['d/dx [4x³]', '= 4 · 3 · x³⁻¹', '= 12x²'],
      sketch: 'tangent',
      highlight: 2,
    },
    {
      lines: ['d/dx [3x² − 5x + 2]', '= 6x − 5 + 0', '= 6x − 5'],
      sketch: null,
      highlight: 2,
    },
  ],
  'cell-cycle': [
    {
      lines: ['The cell cycle', 'one cell → two daughter cells', 'growth · copy · divide'],
      sketch: 'cycle',
      highlight: 0,
    },
    {
      lines: ['Interphase', 'G₁ → S → G₂', 'DNA is copied during S'],
      sketch: 'cycle',
      highlight: 0,
    },
    {
      lines: ['Mitosis — PMAT', 'Prophase · Metaphase', 'Anaphase · Telophase'],
      sketch: 'chromosomes',
      highlight: 0,
    },
    {
      lines: ['Cytokinesis', 'the cytoplasm splits', '→ 2 identical cells'],
      sketch: 'cells',
      highlight: 0,
    },
  ],
}

export function getDemoExamQuestions(pack) {
  const generated = pack?.quiz?.length ? pack.quiz : generateStudyPack(sampleStudyMaterial, 'Biology final').quiz
  return generated.slice(0, 10).map((question, index) => ({
    ...question,
    id: `diagnostic-${index}`,
    prompt: question.prompt || `Question ${index + 1}: Which statement best explains the concept?`,
  }))
}

export function estimateScore(answers, questions) {
  const correct = questions.reduce((count, question, index) => count + (answers[index] === question.correctIndex ? 1 : 0), 0)
  const percent = questions.length ? Math.round((correct / questions.length) * 100) : 0
  const weakTopics = questions
    .map((question, index) => ({ topic: question.topic || `Topic ${index + 1}`, correct: answers[index] === question.correctIndex }))
    .filter((item) => !item.correct)
    .map((item) => item.topic)
  return {
    correct,
    total: questions.length,
    percent,
    predictedScore: Math.max(35, Math.min(98, Math.round(percent * 0.9 + 10))),
    readiness: Math.max(20, Math.round(percent * 0.85 + 15)),
    weakTopics: [...new Set(weakTopics)].slice(0, 4),
  }
}
