import {
  ASSESSMENT_MAX_SCORE,
  ASSESSMENT_OPTION_COUNT,
  ASSESSMENT_QUESTION_COUNT,
  DEFAULT_DISCOUNT_SLABS,
} from '@/shared/constants';

/**
 * Assessment builder model + live validation (KD5, MM7). Pure functions, no React.
 *
 * Editor state ("draft"):
 *   questions: [{ key, _id?, text, options: [4 strings], correctIndex: 0-3 | null, marks }]
 *   slabs:     [{ key, minScore, maxScore, discountPercent }]   (input strings while editing)
 * The server re-checks everything when publishing; these checks only guide the admin.
 */

export const QUESTION_COUNT = ASSESSMENT_QUESTION_COUNT; // 15
export const OPTION_COUNT = ASSESSMENT_OPTION_COUNT; // 4
export const MIN_SCORE = 0;
export const MAX_SCORE = ASSESSMENT_MAX_SCORE; // 15
/** One slab per score at most (0..15). */
export const MAX_SLABS = MAX_SCORE - MIN_SCORE + 1;
export const QUESTION_TEXT_MAX = 1000;
export const OPTION_TEXT_MAX = 300;
export const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

let keyCounter = 0;

/** Client-only React key for rows that don't have a server id yet. */
export function createRowKey(prefix = 'row') {
  keyCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${keyCounter}`;
}

function toInputValue(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return String(value);
}

/** '' / null / undefined / non-numbers -> null; otherwise the number. */
export function toNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export function createEmptyQuestion() {
  return {
    key: createRowKey('question'),
    text: '',
    options: Array.from({ length: OPTION_COUNT }, () => ''),
    correctIndex: null,
    marks: 1,
  };
}

export function createSlabRow(slab = {}) {
  return {
    key: createRowKey('slab'),
    minScore: toInputValue(slab.minScore),
    maxScore: toInputValue(slab.maxScore),
    discountPercent: toInputValue(slab.discountPercent),
  };
}

export function createDefaultSlabRows() {
  return DEFAULT_DISCOUNT_SLABS.map((slab) => createSlabRow(slab));
}

function questionRowFromServer(question) {
  const options = Array.isArray(question?.options) ? question.options : [];
  const row = {
    key: question?._id ? `question-${question._id}` : createRowKey('question'),
    text: typeof question?.text === 'string' ? question.text : '',
    options: Array.from({ length: OPTION_COUNT }, (_, index) =>
      typeof options[index] === 'string' ? options[index] : '',
    ),
    correctIndex:
      Number.isInteger(question?.correctIndex) &&
      question.correctIndex >= 0 &&
      question.correctIndex < OPTION_COUNT
        ? question.correctIndex
        : null,
    marks: Number(question?.marks) > 0 ? Number(question.marks) : 1,
  };
  if (question?._id) row._id = question._id;
  return row;
}

/**
 * Editor state for a config from the API. `null` (no config yet) starts an empty draft with one
 * blank question and the default discount slabs.
 */
export function createInitialDraft(config) {
  if (!config) {
    return { questions: [createEmptyQuestion()], slabs: createDefaultSlabRows() };
  }
  const questions = Array.isArray(config.questions) ? config.questions.map(questionRowFromServer) : [];
  const slabs = Array.isArray(config.discountSlabs)
    ? config.discountSlabs.map((slab) => createSlabRow(slab))
    : createDefaultSlabRows();
  return { questions, slabs };
}

/** Request body for PUT /admin/assessments/:designationId (drafts may be incomplete). */
export function toPayload(draft) {
  const questions = (draft?.questions ?? []).map((row) => {
    const question = {
      text: String(row.text ?? '').trim(),
      options: Array.from({ length: OPTION_COUNT }, (_, index) => String(row.options?.[index] ?? '').trim()),
      correctIndex: Number.isInteger(row.correctIndex) ? row.correctIndex : null,
      marks: Number(row.marks) > 0 ? Number(row.marks) : 1,
    };
    return row._id ? { _id: row._id, ...question } : question;
  });
  const discountSlabs = (draft?.slabs ?? []).map((row) => ({
    minScore: toNumberOrNull(row.minScore),
    maxScore: toNumberOrNull(row.maxScore),
    discountPercent: toNumberOrNull(row.discountPercent),
  }));
  return { questions, discountSlabs };
}

/** Stable snapshot used to detect unsaved changes. */
export function serializeDraft(draft) {
  return JSON.stringify(toPayload(draft));
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** [3, 7, 12] -> "3, 7 and 12"; long lists are shortened ("1, 2, 3, 4, 5 and 6 more"). */
export function formatNumberList(numbers, max = 5) {
  const list = numbers.map(String);
  if (list.length <= 1) return list.join('');
  if (list.length > max) {
    return `${list.slice(0, max).join(', ')} and ${list.length - max} more`;
  }
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

/** [5, 6] -> "5–6", [9, 9] -> "9" */
export function formatRange([start, end]) {
  return start === end ? String(start) : `${start}–${end}`;
}

function formatRanges(ranges) {
  const labels = ranges.map(formatRange);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function noun(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

/**
 * What is missing or wrong in one question:
 * { missingText, textTooLong, emptyOptions: [i], longOptions: [i], duplicateOptions: [i],
 *   missingCorrect, isComplete, summary: string[] (human readable, for the row status line) }
 */
export function getQuestionIssues(question) {
  const text = String(question?.text ?? '').trim();
  const options = Array.from({ length: OPTION_COUNT }, (_, index) =>
    String(question?.options?.[index] ?? '').trim(),
  );
  const emptyOptions = [];
  const longOptions = [];
  options.forEach((option, index) => {
    if (!option) emptyOptions.push(index);
    else if (option.length > OPTION_TEXT_MAX) longOptions.push(index);
  });

  const duplicateOptions = [];
  const seen = new Map();
  options.forEach((option, index) => {
    if (!option) return;
    const normalised = option.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(normalised)) {
      const first = seen.get(normalised);
      if (!duplicateOptions.includes(first)) duplicateOptions.push(first);
      duplicateOptions.push(index);
    } else {
      seen.set(normalised, index);
    }
  });
  duplicateOptions.sort((a, b) => a - b);

  const missingText = text.length === 0;
  const textTooLong = text.length > QUESTION_TEXT_MAX;
  const missingCorrect = !(
    Number.isInteger(question?.correctIndex) &&
    question.correctIndex >= 0 &&
    question.correctIndex < OPTION_COUNT
  );

  const summary = [];
  if (missingText) summary.push('question text');
  if (textTooLong) summary.push(`shorter question text (max ${QUESTION_TEXT_MAX} characters)`);
  if (emptyOptions.length) {
    const letters = emptyOptions.map((index) => OPTION_LETTERS[index]);
    summary.push(`${noun(letters.length, 'option')} ${formatNumberList(letters, OPTION_COUNT)}`);
  }
  if (longOptions.length) summary.push(`shorter options (max ${OPTION_TEXT_MAX} characters)`);
  if (duplicateOptions.length) summary.push('different text for each option');
  if (missingCorrect) summary.push('a correct answer');

  return {
    missingText,
    textTooLong,
    emptyOptions,
    longOptions,
    duplicateOptions,
    missingCorrect,
    isComplete: summary.length === 0,
    summary,
  };
}

// ---------------------------------------------------------------------------
// Discount slabs
// ---------------------------------------------------------------------------

function rangesWhere(scores, predicate) {
  const ranges = [];
  let start = null;
  scores.forEach((entry, index) => {
    if (predicate(entry)) {
      if (start === null) start = entry.score;
      if (index === scores.length - 1) ranges.push([start, entry.score]);
    } else if (start !== null) {
      ranges.push([start, scores[index - 1].score]);
      start = null;
    }
  });
  return ranges;
}

/**
 * Parses and checks every slab, then maps each score 0..15 to the slabs that contain it.
 * Returns {
 *   rows: [{ index, min, max, discount, errors: { minScore?, maxScore?, discountPercent? },
 *            missingRange, missingDiscount, incomplete, rangeValid }],
 *   scores: [{ score, slabIndexes: [] }], gaps: [[from, to]], overlaps: [[from, to]]
 * }
 * `errors` only holds values that are wrong (out of range, min above max); blanks are `incomplete`.
 */
export function analyseSlabs(slabRows) {
  const rows = (slabRows ?? []).map((row, index) => {
    const min = toNumberOrNull(row.minScore);
    const max = toNumberOrNull(row.maxScore);
    const discount = toNumberOrNull(row.discountPercent);
    const errors = {};
    const isScore = (value) => Number.isInteger(value) && value >= MIN_SCORE && value <= MAX_SCORE;

    if (min !== null && !isScore(min)) errors.minScore = `Use a whole number from ${MIN_SCORE} to ${MAX_SCORE}.`;
    if (max !== null && !isScore(max)) errors.maxScore = `Use a whole number from ${MIN_SCORE} to ${MAX_SCORE}.`;
    if (min !== null && max !== null && !errors.minScore && !errors.maxScore && min > max) {
      errors.maxScore = 'Must be at least the minimum score.';
    }
    if (discount !== null && (discount < 0 || discount > 100)) {
      errors.discountPercent = 'Use a value from 0 to 100.';
    }

    const missingRange = min === null || max === null;
    const missingDiscount = discount === null;
    const rangeValid = !missingRange && !errors.minScore && !errors.maxScore;
    return {
      index,
      min,
      max,
      discount,
      errors,
      missingRange,
      missingDiscount,
      incomplete: missingRange || missingDiscount,
      rangeValid,
    };
  });

  const scores = [];
  for (let score = MIN_SCORE; score <= MAX_SCORE; score += 1) {
    scores.push({
      score,
      slabIndexes: rows
        .filter((row) => row.rangeValid && score >= row.min && score <= row.max)
        .map((row) => row.index),
    });
  }

  return {
    rows,
    scores,
    gaps: rangesWhere(scores, (entry) => entry.slabIndexes.length === 0),
    overlaps: rangesWhere(scores, (entry) => entry.slabIndexes.length > 1),
  };
}

// ---------------------------------------------------------------------------
// Whole draft
// ---------------------------------------------------------------------------

/**
 * Live checklist for the builder. Every check: { id, label, ok, detail, target }.
 * `target` is the section to jump to when the check needs attention.
 */
export function validateDraft(draft) {
  const questions = draft?.questions ?? [];
  const slabRows = draft?.slabs ?? [];
  const questionIssues = questions.map(getQuestionIssues);
  const slabs = analyseSlabs(slabRows);
  const count = questions.length;

  const numbersWhere = (predicate) =>
    questionIssues.reduce((list, issues, index) => (predicate(issues) ? [...list, index + 1] : list), []);

  const missingText = numbersWhere((issues) => issues.missingText || issues.textTooLong);
  const badOptions = numbersWhere(
    (issues) => issues.emptyOptions.length > 0 || issues.longOptions.length > 0 || issues.duplicateOptions.length > 0,
  );
  const missingCorrect = numbersWhere((issues) => issues.missingCorrect);

  const slabNumbersWhere = (predicate) =>
    slabs.rows.filter(predicate).map((row) => row.index + 1);
  const slabRangeProblems = slabNumbersWhere(
    (row) => row.missingRange || Boolean(row.errors.minScore || row.errors.maxScore),
  );
  const missingDiscounts = slabNumbersWhere((row) => row.missingDiscount);
  const invalidDiscounts = slabNumbersWhere((row) => Boolean(row.errors.discountPercent));
  const countScores = (ranges) => ranges.reduce((total, [start, end]) => total + end - start + 1, 0);
  const overlapScores = countScores(slabs.overlaps);
  const gapScores = countScores(slabs.gaps);

  let countDetail = `${count} of ${QUESTION_COUNT} added.`;
  if (count < QUESTION_COUNT) {
    const missing = QUESTION_COUNT - count;
    countDetail = `Add ${missing} more ${noun(missing, 'question')} (${count} of ${QUESTION_COUNT}).`;
  } else if (count > QUESTION_COUNT) {
    const extra = count - QUESTION_COUNT;
    countDetail = `Remove ${extra} ${noun(extra, 'question')} (${count} of ${QUESTION_COUNT}).`;
  }

  const checks = [
    {
      id: 'question-count',
      label: `Exactly ${QUESTION_COUNT} questions`,
      ok: count === QUESTION_COUNT,
      detail: countDetail,
      target: 'questions',
    },
    {
      id: 'question-text',
      label: 'Every question has text',
      ok: missingText.length === 0,
      detail: missingText.length
        ? `Check ${noun(missingText.length, 'question')} ${formatNumberList(missingText)}.`
        : null,
      target: 'questions',
    },
    {
      id: 'question-options',
      label: 'Every question has 4 different options',
      ok: badOptions.length === 0,
      detail: badOptions.length
        ? `Check the options on ${noun(badOptions.length, 'question')} ${formatNumberList(badOptions)}.`
        : null,
      target: 'questions',
    },
    {
      id: 'question-answer',
      label: 'Every question has one correct answer',
      ok: missingCorrect.length === 0,
      detail: missingCorrect.length
        ? `Choose the correct answer on ${noun(missingCorrect.length, 'question')} ${formatNumberList(missingCorrect)}.`
        : null,
      target: 'questions',
    },
    {
      id: 'slab-ranges',
      label: `Slab scores are whole numbers from ${MIN_SCORE} to ${MAX_SCORE}`,
      ok: slabRows.length > 0 && slabRangeProblems.length === 0,
      detail:
        slabRows.length === 0
          ? 'Add at least one slab.'
          : slabRangeProblems.length
            ? `Check ${noun(slabRangeProblems.length, 'slab')} ${formatNumberList(slabRangeProblems)}.`
            : null,
      target: 'slabs',
    },
    {
      id: 'slab-discounts',
      label: 'Discounts are between 0% and 100%',
      ok: invalidDiscounts.length === 0 && missingDiscounts.length === 0,
      detail: invalidDiscounts.length
        ? `Check ${noun(invalidDiscounts.length, 'slab')} ${formatNumberList(invalidDiscounts)}.`
        : missingDiscounts.length
          ? `Enter the discount for ${noun(missingDiscounts.length, 'slab')} ${formatNumberList(missingDiscounts)}.`
          : null,
      target: 'slabs',
    },
    {
      id: 'slab-overlap',
      label: "Slabs don't overlap",
      ok: slabs.overlaps.length === 0,
      detail: slabs.overlaps.length
        ? `${overlapScores === 1 ? 'Score' : 'Scores'} ${formatRanges(slabs.overlaps)} ${overlapScores === 1 ? 'is' : 'are'} in more than one slab.`
        : null,
      target: 'slabs',
    },
    {
      id: 'slab-coverage',
      label: `Slabs cover every score from ${MIN_SCORE} to ${MAX_SCORE}`,
      ok: slabs.gaps.length === 0,
      detail: slabs.gaps.length
        ? `No slab for ${gapScores === 1 ? 'score' : 'scores'} ${formatRanges(slabs.gaps)}.`
        : null,
      target: 'slabs',
    },
  ];

  const issueCount = checks.filter((check) => !check.ok).length;
  const completeQuestions = questionIssues.filter((issues) => issues.isComplete).length;

  return {
    checks,
    isValid: issueCount === 0,
    issueCount,
    questionCount: count,
    completeQuestions,
    questionIssues,
    slabs,
  };
}
