/**
 * Learning-path course recommendation for CIBLE School of Language.
 *
 * This module answers one visitor question — "which course should I take?" —
 * from four answers plus the course catalog, and it answers it with a fixed,
 * additive scoring rule that runs entirely in the browser. Nothing is
 * predicted, nothing is inferred about the visitor, and no model, service or
 * remote call is involved: a course appears in the result because named rules
 * fired against named fields, and every result carries the list of those rules
 * as user-visible sentences (AAP §0.6.1, §0.6.3).
 *
 * That explainability is the feature rather than a decoration on it. A visitor
 * can read why a course was suggested and check it against the answers they
 * gave; a colleague can read this file and reproduce any result by hand. No
 * string this module returns claims accuracy, popularity, a success rate, or
 * that other learners chose a course — the reasons state only which of the four
 * rules matched.
 *
 * ── PURITY AND IMMUTABILITY ────────────────────────────────────────────────
 * Every function here is pure and deterministic. There is no clock read, no
 * random source, no module-level mutable state, no storage access, no I/O and
 * no DOM: two calls with the same arguments return deeply equal results in the
 * same order, which is what makes a recommendation reproducible from a shared
 * URL (AAP §0.5.2 keeps the four answers in the address bar for exactly that
 * reason).
 *
 * `src/data/courses.js` exports ONE module-level array shared by eight
 * importers, so the catalog is never sorted, spliced or otherwise touched in
 * place — an in-place sort here would silently reorder Home's featured grid and
 * every category page. New arrays and new result objects are returned; the
 * course records themselves are handed back by reference, unmodified.
 *
 * This module also respects the one-way dependency direction: `src/lib` imports
 * from `src/lib` and `src/data` only, never from `src/components`, `src/pages`
 * or `src/hooks`.
 *
 * ── THE SCORING RULE — ADDITIVE AND FIXED (AAP §0.6.3) ─────────────────────
 * Weights live in {@link RULE_WEIGHTS} and accumulate:
 *   +3  the course's `goals` contains the chosen goal
 *   +2  the course's `level` equals the chosen level, or the course is open to
 *       all levels
 *   +2  the course's duration band equals the chosen time commitment
 *   +1  the course's `category` equals the chosen learning type
 *
 * Ties break on **catalog source order**, implemented by capturing each
 * record's original index before sorting rather than by relying on
 * `Array.prototype.sort` stability for a guarantee this contract documents.
 *
 * The duration band is derived through {@link durationBandOf}, which owns the
 * banding; the free-text `course.duration` string is never parsed here.
 *
 * ── ABSENCE SCORES ZERO, NEVER A PENALTY (AAP §0.7.2) ──────────────────────
 * Every one of the catalog's twelve machine-readable fields is additively
 * optional, so a missing field simply fails to earn its weight. A course with
 * no `level` scores zero on level and is not pushed down for it; a course with
 * no comparable duration has no band and scores zero on time. Every array read
 * is guarded with `Array.isArray` and every scalar read is type-checked, so a
 * partly populated record can never throw.
 *
 * ── ELIGIBILITY: THE ONE HARD CONSTRAINT IS `goal` ─────────────────────────
 * When a goal is answered, a course is eligible only if
 * `Array.isArray(course.goals) && course.goals.includes(answers.goal)`. A
 * course whose `goals` is absent, or does not contain the answer, is dropped
 * regardless of its other matches.
 *
 * Two things are deliberately **not** constraints:
 *   - **Level does not gate.** `courses[].level` is content-owner input that
 *     nine of the ten records do not carry today, so filtering hard on it would
 *     empty the result set for the wrong reason. It scores +2 when present and
 *     matching, or when the course is open to all levels, and nothing
 *     otherwise.
 *   - **`prerequisites` is never matched.** It is free-text prose for display
 *     only — "a working knowledge of basic arithmetic" is a sentence, not an
 *     identifier — so it is neither filtered, scored nor compared here. The
 *     machine field `prereqTags` belongs to the catalog filters and is not a
 *     recommendation input at all.
 *
 * ── THE MINIMUM RELEVANCE THRESHOLD, AND WHY THE GOAL GATE IS NOT ITS OWN
 *    EVIDENCE ─────────────────────────────────────────────────────────────
 * A bare "score greater than zero" filter would be wrong. Every course has a
 * category, so any complete answer set scores at least +1 somewhere: a no-match
 * branch gated on a zero score would be unreachable code, and an unreachable
 * empty state cannot be verified (AAP §0.6.3). {@link MINIMUM_RELEVANCE_SCORE}
 * replaces it — a course qualifies only by matching at least two of level,
 * duration band and category. A course that happens to share only a category is
 * not a recommendation and is not presented as one.
 *
 * The goal answer does double duty, and the threshold arithmetic has to account
 * for it. A chosen goal is the hard constraint above, so **every** course that
 * survives has matched it and every course that did not is already gone: its +3
 * shifts the whole surviving set by the same constant and cannot discriminate
 * between two survivors. Were it also counted as evidence, the threshold would
 * be satisfied by the gate that had just been applied — and because
 * `src/data/goals.js` guarantees every goal id is carried by at least one
 * course, every goal-answered questionnaire would return every course carrying
 * that goal and the no-match state would be unreachable in precisely the case
 * the plan names as its test. So qualification is measured on the rules that
 * discriminate. With no goal answered the gate contributes nothing and the
 * threshold is literally `score >= 3`, exactly as the plan states it; the
 * returned `score` always reports the full additive total, including the goal's
 * +3, because that is the documented weight table and it is what orders
 * results.
 *
 * ── THE VERIFIABLE EMPTY RESULT ────────────────────────────────────────────
 * `{goal: 'interview-preparation', level: 'Advanced', time: 'upto-1-month',
 * mode: 'Science'}` returns `[]` against the shipped catalog, and it is
 * exercised as such (AAP §0.6.3, §0.12.7). Three independent facts produce it:
 *   1. the goal gate admits only courses whose `goals` include interview
 *      preparation, none of which sit in the Science track, so `mode:
 *      'Science'` earns nothing;
 *   2. `upto-1-month` covers four weeks or fewer while the shortest authored
 *      duration is '45 Days' — six weeks — so that band matches **no** course
 *      in the catalog. It is an intentionally unmatchable answer, and widening
 *      the band to "fix" it would be a defect, not a repair;
 *   3. `Advanced` matches nothing, because nine records carry no level and the
 *      one that does is beginner-friendly.
 * No surviving course therefore reaches the threshold. An empty result is
 * returned as an empty array — never a fabricated suggestion, a "closest
 * match" or a fallback course. The consuming view explains that nothing in the
 * catalog matches that combination, offers the full catalog and contact as next
 * steps, and offers to relax the narrowest answer.
 *
 * An empty or malformed catalog reaches the same place: `[]`, not an exception.
 *
 * ── WHAT THIS MODULE DOES NOT DEPEND ON ────────────────────────────────────
 * `src/data/learningPaths.js` is deliberately **not** imported. The curated
 * path layer only groups these results under a named sequence, and it ships
 * empty because no in-repo content states a course progression — inventing one
 * would be a pedagogical claim (AAP §0.7.2). The flat ranked list with its
 * per-course reasons is the complete and honest deliverable; grouping is an
 * enhancement over it, never a precondition for it.
 *
 * ── THE DECLARED FUTURE ADAPTER (AAP §0.6.1) ───────────────────────────────
 * A server-side recommender attaches here by matching this module's return
 * shape, through the adapter named in the plan and **declared, not
 * implemented** — there is no service to call today, and a stub that pretended
 * otherwise would be the fake backend the brief prohibits:
 *
 *   recommendRemote(answers) → Promise<{ok: true, results: Recommendation[]}
 *                              | {ok: false, reason: 'unavailable'|'network'}>
 *
 * See {@link RecommendRemote}. The cost of that switch is stated honestly
 * rather than claimed away: it forces a pending state and a failure state on
 * the results panel. What the seam preserves is narrower than "no changes to
 * the wizard" — it is the **result rendering**, because the view renders
 * `reasons` whatever produced them, so a server-side explanation drops in
 * unchanged.
 *
 * ── CONSUMERS ──────────────────────────────────────────────────────────────
 *   - src/components/common/LearningPathWizard.jsx — renders one card per
 *     result with its `reasons`, that course's own `prerequisites`, and a next
 *     step to the course detail route. The transparency sentence introducing
 *     the list belongs to the view, not to this module, which is why no such
 *     sentence is produced here.
 *   - src/pages/LearningPath.jsx — holds the four answers in the URL and passes
 *     them straight through.
 *   - src/pages/Dashboard.jsx — reproduces a result from the same four URL
 *     parameters, which works only because this function is deterministic.
 *
 * All values are exported by name; there is no default export.
 *
 * @module lib/recommend
 */

import { DURATION_BAND_IDS, LEVELS, durationBandLabel, durationBandOf } from './courseFilters.js'
import { goals } from '../data/goals.js'
import { courses } from '../data/courses.js'

/**
 * A course record, as declared by the catalog module.
 *
 * Documentation-only import: it resolves the name for editors reading these
 * JSDoc contracts without adding a runtime dependency beyond the catalog this
 * module already imports.
 *
 * @typedef {import('../data/courses.js').Course} Course
 */

/**
 * The four questionnaire answers.
 *
 * **Every answer is optional**, so a partially answered questionnaire works:
 * an absent answer imposes no constraint and earns no weight. Each value is
 * constrained to an allowlist owned elsewhere, and this module validates
 * against those owners rather than restating them — an unrecognized value is
 * dropped, so a hand-edited URL degrades to a wider result set instead of
 * rendering an answer that does not exist.
 *
 * @typedef {Object} PathAnswers
 * @property {string} [goal]   A goal id from src/data/goals.js.
 * @property {string} [level]  One of the course level literals.
 * @property {string} [time]   A duration band id from src/lib/courseFilters.js.
 * @property {string} [mode]   A course category literal.
 */

/**
 * One recommendation: the course, the total it scored, and the rules that
 * produced it.
 *
 * `reasons` holds one sentence per rule that **actually fired**, in weight
 * order — goal, level, duration band, category. A result never lists a reason
 * it did not earn, and every sentence names a human label rather than an
 * identifier, so nothing kebab-case ever reaches the screen.
 *
 * `course` is the record itself, by reference and unmodified, so the view can
 * read its `prerequisites`, `slug` and anything else it needs.
 *
 * @typedef {Object} Recommendation
 * @property {Course} course     The recommended course record.
 * @property {number} score      The additive total, including the goal's weight.
 * @property {string[]} reasons  One user-visible sentence per rule that fired.
 */

/**
 * The declared shape of a future server-backed recommender.
 *
 * Declared for documentation only and intentionally not implemented here; see
 * the module header. An implementation resolves `results` in the
 * {@link Recommendation} shape this module returns, so the view's result
 * rendering is unaffected by the switch.
 *
 * @callback RecommendRemote
 * @param {PathAnswers} answers
 * @returns {Promise<{ok: true, results: Recommendation[]}|{ok: false, reason: 'unavailable'|'network'}>}
 */

/**
 * The fixed weight per scoring rule.
 *
 * Exported so the weighting is inspectable rather than buried in the function
 * body — the same reason `courseFilters.js` exports its relevance weights — and
 * so a consumer can describe the ordering without restating the numbers.
 *
 * @type {Readonly<{goal: number, level: number, time: number, mode: number}>}
 */
export const RULE_WEIGHTS = Object.freeze({
  goal: 3,
  level: 2,
  time: 2,
  mode: 1,
})

/**
 * The minimum relevance a course must earn from the discriminating rules —
 * level, duration band and category — to be offered as a recommendation.
 *
 * Three is exactly the bar "at least two of level, duration band and category":
 * level plus duration is 4, level plus category is 3, duration plus category is
 * 3, and any single rule falls short. See the module header for why the goal
 * gate is counted in {@link Recommendation}'s `score` but not in this
 * threshold, and why lowering the bar would make the no-match state
 * unreachable.
 *
 * @type {number}
 */
export const MINIMUM_RELEVANCE_SCORE = 3

/**
 * The level literal meaning "no particular starting point is required".
 *
 * `src/lib/courseFilters.js` remains the declaring authority for the four level
 * literals — this one is named here only so the branch that credits it reads
 * clearly at the point of use. No record carries it today, but it is legal in
 * the catalog's union, so the rule credits it: a course open to every level
 * suits whichever starting point the visitor selected.
 *
 * @type {string}
 */
const OPEN_TO_ALL_LEVELS = 'All levels'

/**
 * Accept a value only when it is one of a list owned by another module.
 *
 * Used for the level and duration-band answers, whose allowlists belong to
 * `src/lib/courseFilters.js`. Returning `null` for anything else is what makes
 * an unrecognized answer impose no constraint instead of silently matching:
 * without it, an absent answer and an absent course field would compare equal
 * to each other and credit a rule that never fired.
 *
 * @param {unknown} value - The raw answer.
 * @param {ReadonlyArray<string>} allowlist - The owning module's value list.
 * @returns {string|null} The accepted value, or `null`.
 */
function fromAllowlist(value, allowlist) {
  return typeof value === 'string' && allowlist.includes(value) ? value : null
}

/**
 * Choose the correct indefinite article for a level literal.
 *
 * "a Beginner starting point" but "an Intermediate starting point" and "an
 * Advanced starting point". The catalog's level union is a closed set of four
 * values and all four are handled, rather than only the one value the data
 * happens to carry today — a reason sentence is user-visible copy on a page
 * about language teaching, so its grammar has to hold for every value the field
 * can take.
 *
 * @param {string} word - The level literal that earned the credit.
 * @returns {string} `'an'` before a vowel, `'a'` otherwise.
 */
function articleFor(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a'
}

/**
 * Validate and resolve the four answers once, before any course is scored.
 *
 * Resolving labels here rather than inside the scoring loop means each label is
 * looked up a single time, and it means a rule can only fire with a real label
 * behind it: `goal` is accepted only when `src/data/goals.js` declares it, and
 * `time` only when `src/lib/courseFilters.js` declares the band, so the
 * "Matches your goal: …" and "Fits about …" sentences can never render an
 * identifier or an empty gap.
 *
 * `mode` is a course category literal. The catalog's `Course` typedef owns that
 * union and exports no array of it, so there is nothing to validate against
 * without restating the literals here; a non-empty string is accepted and
 * compared by exact equality, which means an unrecognized category matches no
 * record and therefore earns nothing — the same outcome an allowlist would
 * produce.
 *
 * A non-object `answers` — `undefined`, `null`, a string — is read as "nothing
 * answered" rather than throwing, because these values arrive from URL
 * parameters.
 *
 * @param {PathAnswers|unknown} answers - The raw answers.
 * @returns {{goalId: string|null, goalLabel: string, level: string|null, time: string|null, timeLabel: string, mode: string|null}}
 *   The resolved answers; `null` in a slot means "not answered".
 */
function resolveAnswers(answers) {
  const input = answers && typeof answers === 'object' ? answers : {}
  const goal = goals.find((entry) => entry.id === input.goal) ?? null
  const time = fromAllowlist(input.time, DURATION_BAND_IDS)
  const mode = typeof input.mode === 'string' && input.mode !== '' ? input.mode : null

  return {
    goalId: goal ? goal.id : null,
    goalLabel: goal ? goal.label : '',
    level: fromAllowlist(input.level, LEVELS),
    time,
    timeLabel: time === null ? '' : durationBandLabel(time),
    mode,
  }
}

/**
 * Apply the four rules to one course.
 *
 * Returns `null` — not a zero-scored entry — when the course is ineligible
 * under the goal gate or falls short of {@link MINIMUM_RELEVANCE_SCORE}, so the
 * caller filters on a single condition.
 *
 * `index` is the course's position in the catalog it came from, carried through
 * so the caller can break score ties on source order explicitly.
 *
 * @param {Course|unknown} course - A course record; a non-object yields `null`.
 * @param {ReturnType<typeof resolveAnswers>} answers - The resolved answers.
 * @param {number} index - The record's original position in the catalog.
 * @returns {(Recommendation & {index: number})|null} The scored entry, or `null`.
 */
function evaluateCourse(course, answers, index) {
  if (!course || typeof course !== 'object') return null

  // The ONE hard constraint. A course whose `goals` is absent, or does not
  // contain the answered goal, is dropped regardless of its other matches.
  const matchesGoal =
    answers.goalId !== null &&
    Array.isArray(course.goals) &&
    course.goals.includes(answers.goalId)

  if (answers.goalId !== null && !matchesGoal) return null

  /** @type {string[]} */
  const reasons = []

  // Relevance earned by the rules that discriminate between eligible courses.
  // The goal gate is deliberately absent from this total; see the module header.
  let relevance = 0

  if (matchesGoal) {
    reasons.push(`Matches your goal: ${answers.goalLabel}`)
  }

  // A course with no `level` — nine of the ten records today — scores zero here
  // and is not penalised for it.
  if (answers.level !== null && typeof course.level === 'string') {
    if (course.level === OPEN_TO_ALL_LEVELS) {
      relevance += RULE_WEIGHTS.level
      reasons.push('Suited to learners at any level')
    } else if (course.level === answers.level) {
      relevance += RULE_WEIGHTS.level
      reasons.push(`Suited to ${articleFor(answers.level)} ${answers.level} starting point`)
    }
  }

  // Banding belongs to `courseFilters.js`; a record with no comparable duration
  // has no band and so matches no time commitment.
  if (answers.time !== null && durationBandOf(course) === answers.time) {
    relevance += RULE_WEIGHTS.time
    reasons.push(`Fits about ${answers.timeLabel}`)
  }

  if (answers.mode !== null && course.category === answers.mode) {
    relevance += RULE_WEIGHTS.mode
    reasons.push(`In the ${course.category} track you chose`)
  }

  if (relevance < MINIMUM_RELEVANCE_SCORE) return null

  return {
    course: /** @type {Course} */ (course),
    score: relevance + (matchesGoal ? RULE_WEIGHTS.goal : 0),
    reasons,
    index,
  }
}

/**
 * Recommend courses from the catalog for a set of questionnaire answers, each
 * with the rules that produced it.
 *
 * The scoring rule, the goal gate, the relevance threshold and the source-order
 * tie-break are all specified in the module header; this function applies them
 * in that order and nothing else. Highest score first, and equal scores in
 * catalog source order — established by the index captured before sorting
 * rather than by relying on sort stability.
 *
 * **An empty array is a real, expected answer.** It is returned when no course
 * clears the threshold, when the answers are empty (nothing can reach the
 * threshold with no rule to fire), and when the catalog is empty or malformed.
 * No fabricated suggestion, "closest match" or fallback course is ever
 * substituted for it — the consuming view explains the outcome and offers the
 * full catalog, contact, and a narrower answer to relax.
 *
 * The catalog is never mutated: a new array of new result objects is returned,
 * and each `course` is the original record by reference.
 *
 * @param {PathAnswers} answers - The four answers; every one optional.
 * @param {Course[]} [catalogue] - The records to score. Defaults to the shipped
 *   catalog; a non-array — `null`, a string, anything else — yields `[]` rather
 *   than an exception, since these values can arrive from a caller reading a URL.
 * @returns {{course: Course, score: number, reasons: string[]}[]} The
 *   recommendations, highest score first; `[]` when nothing qualifies.
 *
 * @example
 * // A well-matched answer set: two courses, each with its own reasons.
 * recommendCourses({
 *   goal: 'improve-spoken-english',
 *   level: 'Beginner',
 *   time: '1-3-months',
 *   mode: 'English',
 * })
 * // → [{course: Spoken English, score: 8, reasons: [
 * //      'Matches your goal: Improve Spoken English',
 * //      'Suited to a Beginner starting point',
 * //      'Fits about 1–3 months',
 * //      'In the English track you chose']}, … ]
 *
 * @example
 * // The no-match case, reachable and reproducible by design.
 * recommendCourses({
 *   goal: 'interview-preparation',
 *   level: 'Advanced',
 *   time: 'upto-1-month',
 *   mode: 'Science',
 * })
 * // → []
 */
export function recommendCourses(answers, catalogue = courses) {
  const list = Array.isArray(catalogue) ? catalogue : []
  const resolved = resolveAnswers(answers)

  return list
    .map((course, index) => evaluateCourse(course, resolved, index))
    .filter((entry) => entry !== null)
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.index - b.index))
    .map(({ course, score, reasons }) => ({ course, score, reasons }))
}
