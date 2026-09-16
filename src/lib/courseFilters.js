/**
 * Course discovery predicates, sorters, duration banding and relevance scoring
 * for the CIBLE School of Language catalog.
 *
 * This module is the single owner of course filtering, sorting and relevance
 * (AAP §0.2.3). It is consumed by the smart catalog discovery surface (the
 * `useCourseFilters` hook and `CourseFilters`), the comparison view, the
 * learning-path recommender, and global search — so the behaviour defined here
 * is the one definition all of them share rather than four similar ones.
 *
 * **Purity is an architectural requirement, not a preference.** The module has
 * *no imports at all* — deliberately, not incidentally. Every function receives
 * the catalog (or a list) as an argument instead of reaching for
 * `src/data/courses.js`, so the helpers stay side-effect free and can be
 * memoized on their inputs by the consuming hook (AAP §0.9.2, §0.12.6), and so
 * they remain testable against any list rather than being welded to one
 * dataset. There is no module-level mutable state and no caching in this file;
 * memoization belongs to the consumer. Nothing here performs I/O, touches the
 * DOM, reads storage, or contains React, JSX or hooks.
 *
 * **Scale, and why the code is deliberately plain.** The catalog is ten
 * records. A linear `filter`/`sort` pass over lower-cased strings costs
 * microseconds at that size, so there is no index structure, no debounce, no
 * worker and no fuzzy-match dependency here (AAP §0.3.3, and the "do not
 * optimize prematurely" directive). Relevance is substring matching with a
 * fixed weight table — no stemming, no edit distance, no scoring library.
 *
 * **The ids declared below are a PUBLIC CONTRACT from the moment they exist**
 * (AAP §0.7.3). {@link DURATION_BANDS} ids are the `?duration=` URL values, the
 * `time` answer values in the learning-path question set, and what the
 * recommender compares against; {@link PREREQ_TAGS} ids are the `?prereq=` URL
 * values and the vocabulary `courses[].prereqTags` references; {@link SORTS}
 * ids are the `?sort=` URL values. There is no type compiler in this project,
 * so renaming one of these strings breaks its consumers *silently*. Author them
 * once; never rename them.
 *
 * **Prose versus machine fields.** `courses[].prerequisites` is free-text,
 * content-owner prose — "a working knowledge of basic arithmetic" is a
 * sentence, not an identifier — and it is mostly unpopulated. A URL value and a
 * filter option need a stable, short, closed set, so the catalog carries a
 * separate machine field, `prereqTags: string[]`, referencing the ids in
 * {@link PREREQ_TAGS}; the display text and the filter value are therefore
 * never the same string. **The prose `prerequisites` field is display-only and
 * is NEVER matched, filtered or scored by anything in this module.**
 *
 * **Every new course field is additively optional**, which fixes one rule that
 * runs through all of these functions: a record that is *missing* the field a
 * dimension filters on matches **no** selection in that dimension — it is not
 * treated as matching everything, and the predicate never throws. With nine of
 * the ten courses currently carrying no `level`, that distinction is the entire
 * result set, so every array read is guarded with `Array.isArray` and every
 * scalar read is type-checked.
 *
 * All values are exported by name; there is no default export.
 *
 * @module lib/courseFilters
 */

/**
 * The four course difficulty literals, in catalog declaration order.
 *
 * These are exactly the values `courses[].level` may hold, the permitted
 * `?level=` URL values, and the allowlist a consuming hook validates a
 * hand-edited URL against — an unrecognized value is dropped by the caller so
 * the route degrades to its default view rather than rendering a filter that
 * does not exist.
 *
 * `level` is optional on a course record and is deliberately **not** inferred
 * from a subject or a duration: doing so would be an invented pedagogical claim
 * (AAP §0.7.2). Only one of the ten current records identifies a level, so most
 * courses match no level selection at all and sort to the end of a level sort.
 *
 * @type {ReadonlyArray<'Beginner'|'Intermediate'|'Advanced'|'All levels'>}
 */
export const LEVELS = Object.freeze(['Beginner', 'Intermediate', 'Advanced', 'All levels'])

/**
 * Numeric rank per level, used only by the `level` sort in
 * {@link sortCourses}.
 *
 * Ascending rank reads as ascending demand on prior knowledge, and
 * **`'All levels'` is placed first (rank 0) deliberately**: it is not a
 * difficulty step but an explicit statement that no particular starting point
 * is required, which makes it at least as accessible as `'Beginner'`. So an
 * ascending level sort reads: All levels → Beginner → Intermediate → Advanced.
 *
 * A course carrying **no** `level` is *not* rank 0 and is not ranked here at
 * all; {@link sortCourses} places such records deterministically at the end.
 * Lookups must be guarded against non-level strings (a bare
 * `LEVEL_ORDER[value]` would resolve inherited `Object.prototype` keys such as
 * `'toString'` to a function), which is why the sorter validates against
 * {@link LEVELS} before reading this map.
 *
 * @type {Readonly<{'All levels': number, Beginner: number, Intermediate: number, Advanced: number}>}
 */
export const LEVEL_ORDER = Object.freeze({
  'All levels': 0,
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
})

/**
 * The three duration bands, in ascending order of length.
 *
 * Each entry carries its `id` (the `?duration=` URL value and the recommender's
 * `time` answer value), a human `label` rendered by the filter control and
 * inside the recommender's "Fits about *label*" reason sentence, and the
 * inclusive week boundaries the band covers. `maxWeeks` is `null` on the last
 * band, meaning unbounded.
 *
 * Boundaries are fixed and must not be widened or narrowed:
 * - `upto-1-month` — `durationWeeks` of 4 or fewer
 * - `1-3-months` — `durationWeeks` of 5 to 12 inclusive
 * - `3-months-plus` — `durationWeeks` greater than 12
 *
 * **They agree exactly with the catalog's fixed duration conversion** (AAP
 * §0.7.2): a value in days divides by 7 and rounds to the nearest whole week; a
 * value in months multiplies by **4**. Four weeks per month rather than 4.345
 * is a deliberate choice, made precisely so `'3 Months'` lands on 12 rather
 * than 13 and therefore falls inside `1-3-months`. `src/data/courses.js` owns
 * that conversion; this module owns the bands and never re-derives the
 * conversion or parses the free-text `duration` string.
 *
 * **The `upto-1-month` band is empty against the current catalog, and that is
 * correct.** The shortest authored duration is `'45 Days'`, which converts to 6
 * weeks, so today the bands hold 0, 8 and 2 courses respectively. Widening
 * `upto-1-month` to capture the 45-day courses would be a defect, not a fix:
 * the boundaries are a published contract, the filter control offers only the
 * values actually present in the catalog, and the recommender relies on
 * `upto-1-month` being a legitimately unmatchable answer so that its no-match
 * empty state is reachable and verifiable.
 *
 * @type {ReadonlyArray<Readonly<{id: string, label: string, minWeeks: number, maxWeeks: number|null}>>}
 */
export const DURATION_BANDS = Object.freeze([
  Object.freeze({ id: 'upto-1-month', label: 'Up to 1 month', minWeeks: 1, maxWeeks: 4 }),
  Object.freeze({ id: '1-3-months', label: '1–3 months', minWeeks: 5, maxWeeks: 12 }),
  Object.freeze({ id: '3-months-plus', label: '3 months or more', minWeeks: 13, maxWeeks: null }),
])

/**
 * The duration band ids on their own, in the same order as
 * {@link DURATION_BANDS}.
 *
 * Provided so a consuming hook can validate a `?duration=` value with a plain
 * `DURATION_BAND_IDS.includes(value)` check and drop anything unrecognized.
 *
 * @type {ReadonlyArray<string>}
 */
export const DURATION_BAND_IDS = Object.freeze(DURATION_BANDS.map((band) => band.id))

/**
 * The three prerequisite tags, the closed machine vocabulary that
 * `courses[].prereqTags` references and `?prereq=` carries.
 *
 * Matching semantics, which are exact and must not be relaxed:
 * - A course matches a selected tag when its `prereqTags` array **includes**
 *   that tag.
 * - `none` is a **selectable value meaning "requires nothing prior"**. A course
 *   matches it **only** by explicitly carrying `'none'` in `prereqTags`; it is
 *   **never inferred** from an empty or absent array.
 * - A course whose `prereqTags` is absent or `[]` therefore matches **no**
 *   `prereq` selection at all.
 *
 * The prose `courses[].prerequisites` field is display-only and is never
 * consulted by any matching or scoring path in this module.
 *
 * @type {ReadonlyArray<Readonly<{id: string, label: string}>>}
 */
export const PREREQ_TAGS = Object.freeze([
  Object.freeze({ id: 'none', label: 'No prior knowledge needed' }),
  Object.freeze({ id: 'basic-english', label: 'Basic English reading and writing' }),
  Object.freeze({ id: 'basic-computer', label: 'Basic computer familiarity' }),
])

/**
 * The prerequisite tag ids on their own, in the same order as
 * {@link PREREQ_TAGS}, for allowlist validation of a `?prereq=` value.
 *
 * @type {ReadonlyArray<string>}
 */
export const PREREQ_TAG_IDS = Object.freeze(PREREQ_TAGS.map((tag) => tag.id))

/**
 * The available result orderings, which are the `?sort=` URL values.
 *
 * Each entry carries its `id` and the `label` a `Select` control renders:
 * - `relevance` — descending {@link scoreRelevance}. This is the default, and
 *   it is the meaningful ordering when a search query is present.
 * - `duration` — ascending `durationWeeks`, shortest first.
 * - `level` — ascending {@link LEVEL_ORDER}, least prior knowledge first.
 *
 * With **no** query, relevance scores every record 0, so the ordering falls
 * back to **catalog source order** — the stable, deterministic default
 * described in {@link sortCourses}.
 *
 * @type {ReadonlyArray<Readonly<{id: string, label: string}>>}
 */
export const SORTS = Object.freeze([
  Object.freeze({ id: 'relevance', label: 'Most relevant' }),
  Object.freeze({ id: 'duration', label: 'Duration (shortest first)' }),
  Object.freeze({ id: 'level', label: 'Level (entry level first)' }),
])

/**
 * The sort ids on their own, in the same order as {@link SORTS}, for allowlist
 * validation of a `?sort=` value.
 *
 * @type {ReadonlyArray<string>}
 */
export const SORT_IDS = Object.freeze(SORTS.map((sort) => sort.id))

/**
 * The ordering applied when no sort is requested, or when a requested sort id
 * is not one of {@link SORT_IDS} — so a hand-edited URL degrades to the default
 * view instead of throwing.
 *
 * @type {string}
 */
export const DEFAULT_SORT = 'relevance'

/**
 * The fixed relevance weight table used by {@link scoreRelevance}.
 *
 * A title match contributes 3, a category or goal match 2, and a summary or
 * highlight match 1. Exported so the weighting is inspectable rather than
 * buried in the function body, and so a consumer can describe the ordering
 * honestly without restating the numbers.
 *
 * @type {Readonly<{title: number, category: number, goal: number, summary: number, highlight: number}>}
 */
export const RELEVANCE_WEIGHTS = Object.freeze({
  title: 3,
  category: 2,
  goal: 2,
  summary: 1,
  highlight: 1,
})

/**
 * Reduce any value to a trimmed, lower-cased search string.
 *
 * Non-strings — `undefined`, `null`, a number, an object — yield `''`, which
 * every caller treats as "no query" and therefore as "no constraint". This is
 * the single place query text is normalized, so matching is case-insensitive
 * everywhere without each field doing its own `toLowerCase()`.
 *
 * @param {unknown} value - The raw value, typically a URL parameter.
 * @returns {string} The normalized text, or `''`.
 */
function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

/**
 * Normalize a multi-select dimension into a clean list of selected values.
 *
 * Accepts either the array a repeated-key URL parameter produces
 * (`?level=Beginner&level=Advanced` read with `getAll`) or a lone string, so
 * the predicate is tolerant of whichever form a caller holds. Entries are
 * trimmed; non-strings, empty strings and duplicates are dropped. Values are
 * **not** lower-cased — these are exact identifiers and level literals, matched
 * by equality, not by text search.
 *
 * An empty result means the dimension imposes no constraint at all.
 *
 * @param {unknown} value - An array of values, a single value, or nothing.
 * @returns {string[]} The de-duplicated, non-empty selections in input order.
 */
function toSelection(value) {
  const raw = Array.isArray(value) ? value : [value]
  const out = []
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const trimmed = entry.trim()
    if (trimmed === '' || out.includes(trimmed)) continue
    out.push(trimmed)
  }
  return out
}

/**
 * Normalize a single-select dimension to one value, or `null` for "not set".
 *
 * An array is reduced to its first usable entry, mirroring
 * `URLSearchParams.get()`, so a hand-edited `?category=a&category=b` narrows to
 * `a` rather than silently dropping the constraint.
 *
 * @param {unknown} value - A single value, an array, or nothing.
 * @returns {string|null} The selected value, or `null` when nothing is set.
 */
function toSingle(value) {
  const list = toSelection(value)
  return list.length > 0 ? list[0] : null
}

/**
 * Case-insensitive substring test for one scalar field.
 *
 * @param {unknown} value - The field value; a non-string never matches.
 * @param {string} needle - Already-normalized query text.
 * @returns {boolean} `true` when the field contains the query.
 */
function includesText(value, needle) {
  return typeof value === 'string' && value.toLowerCase().includes(needle)
}

/**
 * Case-insensitive substring test across a list field.
 *
 * A missing or non-array field never matches, which is the additively-optional
 * contract: absence excludes rather than crashing or matching everything.
 *
 * @param {unknown} values - The field value, expected to be an array of strings.
 * @param {string} needle - Already-normalized query text.
 * @returns {boolean} `true` when any entry contains the query.
 */
function includesTextInList(values, needle) {
  return Array.isArray(values) && values.some((entry) => includesText(entry, needle))
}

/**
 * Read a course's machine-comparable duration in whole weeks.
 *
 * Only a finite, positive number qualifies. An absent field, `null`,
 * `undefined`, `NaN`, a boolean, or a numeric *string* such as `'12'` all yield
 * `null`, meaning "no comparable duration" — never zero, and never a guess. The
 * free-text `course.duration` string is deliberately never parsed here.
 *
 * @param {unknown} course - A course record.
 * @returns {number|null} The duration in weeks, or `null` when unavailable.
 */
function weeksOf(course) {
  if (!course || typeof course !== 'object') return null
  const weeks = course.durationWeeks
  if (typeof weeks !== 'number' || !Number.isFinite(weeks) || weeks <= 0) return null
  return weeks
}

/**
 * Read a course's level rank from {@link LEVEL_ORDER}.
 *
 * The level is validated against {@link LEVELS} first, so an unrecognized
 * string — including an inherited `Object.prototype` key such as `'toString'`
 * or `'constructor'` — yields `null` rather than resolving to a function. A
 * course with no level also yields `null`, which sorts it to the end rather
 * than to rank 0.
 *
 * @param {unknown} course - A course record.
 * @returns {number|null} The level rank, or `null` when there is no valid level.
 */
function levelRankOf(course) {
  if (!course || typeof course !== 'object') return null
  const level = course.level
  if (typeof level !== 'string' || !LEVELS.includes(level)) return null
  return LEVEL_ORDER[level]
}

/**
 * Whether a course satisfies the free-text query.
 *
 * Searches the fields a visitor would reasonably expect to search — title,
 * category, summary and highlights — and nothing else. Note the deliberate
 * asymmetry with {@link scoreRelevance}, which additionally *scores* a `goals`
 * match: scoring ranks the records that already matched, so goals influence
 * ordering without silently widening the result set beyond the four searchable
 * content fields.
 *
 * @param {object} course - A course record.
 * @param {string} needle - Already-normalized query text.
 * @returns {boolean} `true` when any searched field contains the query.
 */
function matchesQuery(course, needle) {
  return (
    includesText(course.title, needle) ||
    includesText(course.category, needle) ||
    includesText(course.summary, needle) ||
    includesTextInList(course.highlights, needle)
  )
}

/**
 * Resolve a duration band id to its human label.
 *
 * Used where a band has to be named in prose — the recommender's "Fits about
 * *label*" reason sentence, and any surface echoing a selected filter — so no
 * consumer re-implements the lookup or hardcodes the wording.
 *
 * @param {unknown} id - A duration band id.
 * @returns {string} The band's label, or `''` when the id is unknown.
 */
export function durationBandLabel(id) {
  if (typeof id !== 'string') return ''
  const band = DURATION_BANDS.find((entry) => entry.id === id)
  return band ? band.label : ''
}

/**
 * Determine which duration band a course falls into.
 *
 * Derived from the numeric `course.durationWeeks` field and from the boundaries
 * declared on {@link DURATION_BANDS} itself, so the predicate can never drift
 * from the documented bands.
 *
 * A course with **no** comparable duration — the field absent, `null`,
 * `undefined`, `NaN`, non-numeric, or a non-positive number — returns `null`:
 * not a band, and emphatically not the first band. The duration filter and the
 * duration sort both treat that as **unmatched** rather than as zero (AAP
 * §0.7.2), which is what keeps a partially populated record from surfacing
 * under a filter it cannot satisfy.
 *
 * The free-text `course.duration` string is never parsed here — the catalog
 * owns that conversion and this module consumes the numeric field it produces.
 *
 * @param {object} [course] - A course record.
 * @returns {string|null} The matching band id, or `null` when unavailable.
 *
 * @example
 * durationBandOf({ durationWeeks: 4 })  // 'upto-1-month'
 * durationBandOf({ durationWeeks: 6 })  // '1-3-months'   (a '45 Days' course)
 * durationBandOf({ durationWeeks: 48 }) // '3-months-plus' (a '12 Months' course)
 * durationBandOf({})                    // null — no comparable duration
 */
export function durationBandOf(course) {
  const weeks = weeksOf(course)
  if (weeks === null) return null
  const band = DURATION_BANDS.find(
    (entry) => weeks >= entry.minWeeks && (entry.maxWeeks === null || weeks <= entry.maxWeeks),
  )
  return band ? band.id : null
}

/**
 * Score how well a course matches a free-text query.
 *
 * Weights come from {@link RELEVANCE_WEIGHTS} and accumulate additively across
 * the fields that match: a title match contributes 3, a category match 2, a
 * goal match 2, a summary match 1, and a highlight match 1. The query is
 * normalized once here rather than per field, and matching is plain
 * case-insensitive substring containment — there is deliberately no stemming,
 * no fuzzy matching and no edit-distance model.
 *
 * An empty query, a non-string query, or a non-object course scores 0. A
 * missing `goals` or `highlights` array simply contributes nothing.
 *
 * @param {object} [course] - A course record.
 * @param {unknown} query - The free-text query.
 * @returns {number} The relevance score; 0 when nothing matches.
 */
export function scoreRelevance(course, query) {
  const needle = normalizeText(query)
  if (needle === '' || !course || typeof course !== 'object') return 0

  let score = 0
  if (includesText(course.title, needle)) score += RELEVANCE_WEIGHTS.title
  if (includesText(course.category, needle)) score += RELEVANCE_WEIGHTS.category
  if (includesTextInList(course.goals, needle)) score += RELEVANCE_WEIGHTS.goal
  if (includesText(course.summary, needle)) score += RELEVANCE_WEIGHTS.summary
  if (includesTextInList(course.highlights, needle)) score += RELEVANCE_WEIGHTS.highlight
  return score
}

/**
 * Narrow a course list to the records matching every active filter dimension.
 *
 * **Combination rule: OR within a dimension, AND across dimensions.** Selecting
 * two levels *widens* the result set; a level plus a duration *narrows* it. Any
 * other reading would return an empty result for every multi-select.
 *
 * **A dimension with no value imposes no constraint at all** — it is never read
 * as "match nothing". `filterCourses(courses, {})` therefore returns the whole
 * catalog.
 *
 * **A record missing the field a dimension filters on matches no selection in
 * that dimension**, because every new course field is additively optional: a
 * missing `level` matches no `level` selection, an absent or empty `goals`
 * matches no `goal`, a missing `durationWeeks` matches no `duration`, and an
 * absent or empty `prereqTags` matches no `prereq`. None of those cases throws.
 *
 * Dimension cardinality matches the URL contract the consuming hook implements:
 * `category` and `goal` are single-valued, `level`, `duration` and `prereq` are
 * multi-valued repeated keys, and `q` is single free text. A `sort` key on
 * `values` is ignored here — ordering is {@link sortCourses}' job.
 *
 * The input list and every record in it are left untouched; a new array is
 * returned.
 *
 * @param {object[]} [courses] - The course records to filter. A non-array yields `[]`.
 * @param {object} [values] - The active selections.
 * @param {string} [values.q] - Free-text query, matched against title, category, summary and highlights.
 * @param {string} [values.category] - Single category literal.
 * @param {string} [values.goal] - Single goal id, matched against `course.goals`.
 * @param {string|string[]} [values.level] - One or more level literals from {@link LEVELS}.
 * @param {string|string[]} [values.duration] - One or more band ids from {@link DURATION_BAND_IDS}.
 * @param {string|string[]} [values.prereq] - One or more tag ids from {@link PREREQ_TAG_IDS}.
 * @returns {object[]} A new array of the matching records, in input order.
 */
export function filterCourses(courses, values) {
  const list = Array.isArray(courses) ? courses : []
  const selections = values && typeof values === 'object' ? values : {}

  const needle = normalizeText(selections.q)
  const category = toSingle(selections.category)
  const goal = toSingle(selections.goal)
  const levels = toSelection(selections.level)
  const durations = toSelection(selections.duration)
  const prereqs = toSelection(selections.prereq)

  return list.filter((course) => {
    if (!course || typeof course !== 'object') return false

    // Single-select: an exact category literal. The one dimension that predates
    // this work, and single-valued because the category landing pages depend on
    // that behaviour.
    if (category !== null && course.category !== category) return false

    // Single-select: the goal id must be present in the course's own goal list.
    // An absent or non-array `goals` matches no goal selection.
    if (goal !== null && !(Array.isArray(course.goals) && course.goals.includes(goal))) {
      return false
    }

    // Multi-select, OR within the dimension. A course with no level matches no
    // level selection — never "all of them".
    if (levels.length > 0 && !(typeof course.level === 'string' && levels.includes(course.level))) {
      return false
    }

    // Multi-select, OR within the dimension. A course with no comparable
    // duration has no band and therefore matches no duration selection.
    if (durations.length > 0) {
      const band = durationBandOf(course)
      if (band === null || !durations.includes(band)) return false
    }

    // Multi-select, OR within the dimension. `none` is matched only by an
    // explicit 'none' tag and is never inferred from an empty or absent array,
    // so `prereqTags: []` and a missing `prereqTags` both match nothing. The
    // prose `prerequisites` field is never consulted.
    if (
      prereqs.length > 0 &&
      !(Array.isArray(course.prereqTags) && course.prereqTags.some((tag) => prereqs.includes(tag)))
    ) {
      return false
    }

    // Free text, applied last so it narrows whatever the structured dimensions
    // left standing.
    if (needle !== '' && !matchesQuery(course, needle)) return false

    return true
  })
}

/**
 * Order a course list by the requested sort.
 *
 * Supported sorts are the ids in {@link SORT_IDS}:
 * - `relevance` — descending {@link scoreRelevance} against `query`.
 * - `duration` — ascending `durationWeeks`, shortest first.
 * - `level` — ascending {@link LEVEL_ORDER}, least prior knowledge first.
 *
 * **Missing values sort last, deterministically.** A record with no comparable
 * `durationWeeks` or no valid `level` is placed after every record that has
 * one, rather than being treated as zero and leading the list.
 *
 * **With no query, ordering falls back to catalog source order.** Relevance
 * scores every record 0 when there is nothing to match, so the result is the
 * input order. That guarantee is implemented explicitly, by capturing each
 * record's original index up front and using it as the final tie-break, rather
 * than by relying on `Array.prototype.sort` stability for a semantic promise
 * this contract documents.
 *
 * An absent or unrecognized sort id degrades to {@link DEFAULT_SORT}, so a
 * hand-edited `?sort=` value yields the default view instead of an error.
 *
 * The caller's array is never sorted in place — a mutation here would corrupt
 * the memoized derived list the consuming hook holds — and the records
 * themselves are returned by reference, unmodified.
 *
 * @param {object[]} [list] - The records to order. A non-array yields `[]`.
 * @param {string} [sort] - A sort id from {@link SORT_IDS}.
 * @param {unknown} [query] - The free-text query, used only by the relevance sort.
 * @returns {object[]} A new, ordered array.
 */
export function sortCourses(list, sort, query) {
  const source = Array.isArray(list) ? list : []
  const requested = toSingle(sort)
  const mode = requested !== null && SORT_IDS.includes(requested) ? requested : DEFAULT_SORT
  const needle = normalizeText(query)

  // Decorate once: the original index makes source order an explicit tie-break,
  // and the score is computed a single time per record rather than on every
  // comparison.
  const decorated = source.map((course, index) => ({
    course,
    index,
    score: mode === 'relevance' ? scoreRelevance(course, needle) : 0,
  }))

  if (mode === 'duration' || mode === 'level') {
    const rankOf = mode === 'duration' ? weeksOf : levelRankOf
    decorated.sort((a, b) => {
      const rankA = rankOf(a.course)
      const rankB = rankOf(b.course)
      // Records without the sorted field go last, whichever side they are on.
      if (rankA === null && rankB === null) return a.index - b.index
      if (rankA === null) return 1
      if (rankB === null) return -1
      if (rankA !== rankB) return rankA - rankB
      return a.index - b.index
    })
  } else {
    // Relevance: highest score first. With no query every score is 0, so this
    // collapses to catalog source order.
    decorated.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.index - b.index))
  }

  return decorated.map((entry) => entry.course)
}
