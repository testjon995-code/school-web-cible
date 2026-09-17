import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { courses as defaultCatalogue } from '../data/courses.js'
import { goals } from '../data/goals.js'
import {
  DEFAULT_SORT,
  DURATION_BAND_IDS,
  LEVELS,
  PREREQ_TAG_IDS,
  SORT_IDS,
  filterCourses,
  sortCourses,
} from '../lib/courseFilters.js'

/**
 * useCourseFilters — THE single owner of the `/courses` URL contract.
 *
 * Catalogue discovery state (the search text, five filter dimensions and the
 * result ordering) lives in the address bar and nowhere else. That is a
 * deliberate architectural choice, not a convenience: a filtered catalogue is
 * the canonical shareable view (AAP §0.5.2), so holding the state in the URL
 * makes it linkable, reload-proof and restorable by the browser's own back
 * button for free, with no store, no context and no persistence.
 *
 * Because there is exactly one owner, there is exactly one place that decides
 * what a parameter means. `src/components/common/CourseFilters.jsx` is
 * specified to hold **no state of its own** for precisely this reason — it
 * renders `values`, calls {@link useCourseFilters}'s writers, and keeps no
 * shadow copy. A component holding its own copy would create a second owner and
 * the canonical-URL guarantee below would stop holding.
 *
 * ── THE SEVEN PARAMETERS ───────────────────────────────────────────────────
 * | Parameter   | Cardinality | Read with | Allowlist (its owning module)     |
 * | ----------- | ----------- | --------- | --------------------------------- |
 * | `q`         | single text | `get`     | none — free text, trimmed         |
 * | `category`  | single      | `get`     | derived from the `courses` argument |
 * | `level`     | multi       | `getAll`  | `LEVELS`                          |
 * | `duration`  | multi       | `getAll`  | `DURATION_BAND_IDS`               |
 * | `goal`      | single      | `get`     | `goals[].id`                      |
 * | `prereq`    | multi       | `getAll`  | `PREREQ_TAG_IDS`                  |
 * | `sort`      | single      | `get`     | `SORT_IDS`                        |
 *
 * The names deliberately avoid `course` and `event`, the only two deep-link
 * parameters that already exist (`/admission?course=`, `/contact?event=`), and
 * they follow the same read-then-validate-against-a-data-module discipline
 * those two established rather than trusting the URL.
 *
 * `category` is **single-valued on purpose.** It is the one dimension that
 * predates this work: `CourseGrid` holds a single active category string, and
 * the three category landing pages depend on that behaviour. Widening it would
 * change a working surface for no requirement.
 *
 * ── ENCODING: REPEATED KEYS, NEVER A DELIMITER ─────────────────────────────
 * The three multi-select dimensions repeat their key — `?level=Beginner&level=Advanced`.
 * That is what `URLSearchParams.getAll` reads natively and what
 * `URLSearchParams.append` writes, so there is no custom parse rule, no escape
 * rule, and a value containing a comma or a space can never corrupt the set.
 *
 * ── `'All'` IS A UI SENTINEL, NOT A VALUE ──────────────────────────────────
 * The unconstrained catalogue view carries **no `category` parameter at all**.
 * `CourseGrid` renders an `'All'` chip, but `'All'` is not a category any course
 * carries, so it is not in the derived allowlist: `?category=All` is dropped by
 * the same rule as any other unrecognised value, and `setValue('category', 'All')`
 * *removes* the parameter instead of writing it. Every dimension behaves the
 * same way — absent means "no constraint", and an empty selection is never
 * written as an empty value.
 *
 * ── NORMALISATION ON READ ──────────────────────────────────────────────────
 * Every dimension is normalised before anything renders, in this order: trim →
 * de-duplicate → filter against that dimension's allowlist → sort into the
 * owning module's declaration order. The last step is what makes
 * `?level=Advanced&level=Beginner` and `?level=Beginner&level=Advanced` resolve
 * to ONE canonical URL after the first write, so a single view can never have
 * two addresses. Every allowlist comes from a module — `LEVELS`,
 * `DURATION_BAND_IDS`, `PREREQ_TAG_IDS` and `SORT_IDS` from
 * `src/lib/courseFilters.js`, the goal ids from `src/data/goals.js` in that
 * module's contractual declaration order, and the categories derived from the
 * `courses` argument itself — so no literal in this file can drift from the
 * data it validates.
 *
 * An unrecognised value is **dropped, never rendered**, so a hand-edited URL
 * degrades to the default view rather than showing a filter that does not exist.
 * `level` validates against the whole `LEVELS` taxonomy rather than the levels
 * present in the catalogue: only one of the ten records carries a level today,
 * and `?level=Advanced` is a *legitimate* filter that should yield zero results
 * and the explained no-match empty state, not be silently discarded. Offering
 * only the values actually present is the filter control's job; validating the
 * URL against the taxonomy is this hook's.
 *
 * ── COMBINATION: OR WITHIN A DIMENSION, AND ACROSS DIMENSIONS ──────────────
 * Two levels *widen* the result set; a level plus a duration *narrows* it. A
 * dimension with no parameter imposes no constraint at all, and a record
 * missing the field a dimension filters on matches nothing in that dimension
 * rather than everything — every new course field is additively optional, so
 * that is the normal case, not an edge case. The predicate itself belongs to
 * `filterCourses`; this hook's job is to hand it a `values` object it can act
 * on and never to pre-suppose a field exists.
 *
 * ── WRITE DISCIPLINE ───────────────────────────────────────────────────────
 * Every write is ONE batched
 * `setSearchParams(next, { replace: true, preventScrollReset: true })`:
 * `replace` so a filter session does not fill the back stack with an entry per
 * keystroke and per toggle, and `preventScrollReset` so changing a filter does
 * not jump the page to the top. Batching is mandatory rather than stylistic —
 * for react-router 7.18.1 the functional-updater form does **not** queue the
 * way React's `setState` does, so two calls in one tick do not build on each
 * other. Each writer here therefore composes the COMPLETE next parameter set
 * from the current normalised values and writes it exactly once.
 *
 * The next set is composed **from scratch**, appended in one fixed key order
 * (`q`, `category`, `level`, `duration`, `goal`, `prereq`, `sort`), rather than
 * by mutating a copy of the incoming parameters. That is what makes two
 * spellings of one view converge on a byte-identical URL —
 * `URLSearchParams` serialises in insertion order, so key order has to be fixed
 * too — and it is what makes the default view's URL carry no parameters at all.
 * The deliberate consequence: a foreign query parameter appended to `/courses`
 * is dropped on the first filter write. `/courses` has no other parameter, the
 * site runs no analytics and sets no tracking parameter, so nothing in this
 * repository relies on one surviving; the canonical-URL guarantee is worth
 * more.
 *
 * `sort` is omitted while it equals {@link DEFAULT_SORT} for the same reason:
 * `?sort=relevance` and no `sort` parameter render the identical view, so only
 * one of them may be an address.
 *
 * ── WHAT THIS HOOK DELIBERATELY DOES NOT DO ────────────────────────────────
 * It has **no effects**. It never rewrites the URL merely because it read a
 * non-canonical one: normalisation shapes the values and the *next* write, so
 * arriving on a hand-edited link renders the correct, degraded view without a
 * surprise navigation on mount and without any possibility of a render→navigate
 * loop. It also introduces no debounce, no worker, no index structure and no
 * fuzzy-match dependency: the catalogue is ten records, where a linear
 * filter/sort pass over lower-cased strings costs microseconds (AAP §0.3.3),
 * and the user's "do not optimise prematurely" directive applies. The only
 * memoisation is the derived list and the two inputs its memo is keyed on.
 *
 * ── CONSUMERS ──────────────────────────────────────────────────────────────
 *   - `src/pages/Courses.jsx` — owns the hook and passes `values`/`results` down
 *   - `src/components/common/CourseGrid.jsx` — renders `results`, the live
 *     `resultCount` and the no-match `EmptyState` with its clear-all action
 *   - `src/components/common/CourseFilters.jsx` — renders the controls from
 *     `values`, calls `setValue`/`clearAll`, and shows `activeCount` on the
 *     mobile "Filters" button so applied filters are visible without opening
 *     the sheet
 *
 * @module hooks/useCourseFilters
 */

/**
 * The learner-goal ids, in `src/data/goals.js`'s contractual declaration order,
 * which is the allowlist and the canonical ordering for `?goal=`.
 *
 * Derived from the module rather than restated, so a goal added there becomes a
 * valid URL value with no change here. Records without a usable string id are
 * skipped so a malformed entry can never widen the allowlist with `undefined`.
 *
 * @type {ReadonlyArray<string>}
 */
const GOAL_IDS = Object.freeze(
  goals.filter((goal) => goal && typeof goal.id === 'string' && goal.id !== '').map((goal) => goal.id),
)

/**
 * Normalise free-text query input.
 *
 * Trimmed, and nothing else: the text is matched case-insensitively downstream
 * by `filterCourses`, so lower-casing here would only make the URL uglier than
 * what the visitor typed. A non-string — `null` from `URLSearchParams.get`, or
 * anything a caller passes by mistake — yields `''`, which every consumer and
 * the predicate itself read as "no query".
 *
 * @param {unknown} value - The raw parameter or caller value.
 * @returns {string} The trimmed query, or `''` when there is none.
 */
function normalizeQuery(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Reduce a caller value to the single entry a single-select dimension takes.
 *
 * An array is narrowed to its first usable string, mirroring
 * `URLSearchParams.get()`, so a caller that hands a one-element array to
 * `setValue('category', ['English'])` is tolerated rather than silently
 * dropping the constraint.
 *
 * @param {unknown} value - A string, an array, or nothing.
 * @returns {unknown} The single candidate value.
 */
function firstOf(value) {
  if (!Array.isArray(value)) return value
  for (const entry of value) {
    if (typeof entry === 'string' && entry.trim() !== '') return entry
  }
  return ''
}

/**
 * Normalise a single-select dimension against its allowlist.
 *
 * Trimmed, then accepted only if the allowlist contains it. Everything else —
 * a non-string, an empty string, a hand-edited value, the `'All'` chip sentinel
 * — becomes `''`, which means "this dimension imposes no constraint" and is
 * what keeps the parameter out of the next URL.
 *
 * `''` rather than `null` is returned deliberately: these values are bound
 * straight onto controlled `<Input>` and `<Select>` elements, and React warns
 * on a `null` value.
 *
 * @param {unknown} value - The raw parameter or caller value.
 * @param {ReadonlyArray<string>} allowed - The owning module's allowlist.
 * @returns {string} The accepted value, or `''`.
 */
function normalizeOne(value, allowed) {
  const candidate = firstOf(value)
  if (typeof candidate !== 'string') return ''
  const trimmed = candidate.trim()
  return trimmed !== '' && allowed.includes(trimmed) ? trimmed : ''
}

/**
 * Normalise a multi-select dimension against its allowlist.
 *
 * Trim → de-duplicate → allowlist → sort into the allowlist's own declaration
 * order. The final sort is the canonical-URL mechanism: any permutation of the
 * same selection collapses to one ordering, so one view resolves to one
 * address. Every surviving entry is guaranteed to be in `allowed`, so the
 * comparator's `indexOf` can never be `-1`.
 *
 * An empty result means the dimension imposes no constraint, and the key is
 * omitted from the URL rather than written empty.
 *
 * @param {unknown} value - An array (as `getAll` returns), a single value, or nothing.
 * @param {ReadonlyArray<string>} allowed - The owning module's allowlist, in declaration order.
 * @returns {string[]} The accepted values in declaration order.
 */
function normalizeList(value, allowed) {
  const raw = Array.isArray(value) ? value : [value]
  const accepted = []
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const trimmed = entry.trim()
    if (trimmed === '' || accepted.includes(trimmed) || !allowed.includes(trimmed)) continue
    accepted.push(trimmed)
  }
  return accepted.sort((a, b) => allowed.indexOf(a) - allowed.indexOf(b))
}

/**
 * Derive the `?category=` allowlist from the catalogue that was passed in.
 *
 * Mirrors `CourseGrid`'s own chip derivation
 * (`Array.from(new Set(items.map((c) => c.category)))`) so the URL can never
 * accept a category the grid would not offer, and keeps first-appearance
 * catalogue order as the canonical ordering. There is deliberately no
 * `CATEGORIES` export to import: deriving it is what makes a **pre-filtered**
 * grid — a category landing page passing only its own courses — validate
 * against just the categories it actually contains.
 *
 * `'All'` is never included: it is the chip row's sentinel for "no category
 * constraint", not a value any course carries.
 *
 * Non-object records and non-string categories are skipped, so a malformed
 * entry cannot put `undefined` into an allowlist.
 *
 * @param {unknown} list - The catalogue passed to the hook.
 * @returns {string[]} The distinct category literals in catalogue order.
 */
function deriveCategories(list) {
  const source = Array.isArray(list) ? list : []
  const categories = []
  for (const course of source) {
    if (!course || typeof course !== 'object') continue
    const category = typeof course.category === 'string' ? course.category.trim() : ''
    if (category === '' || categories.includes(category)) continue
    categories.push(category)
  }
  return categories
}

/**
 * Read and normalise every dimension out of the current URL.
 *
 * Single-valued dimensions use `get`, multi-valued dimensions use `getAll`, and
 * each is validated against its owning module's allowlist. `sort` always
 * resolves to an effective ordering — {@link DEFAULT_SORT} when the parameter
 * is absent or unrecognised — so a consumer never has to decide what "no sort"
 * means, and the `<Select>` always has a concrete value to show.
 *
 * The returned object is exactly the shape `filterCourses` accepts (it ignores
 * the extra `sort` key), so it can be handed straight to the predicate with no
 * translation step in between.
 *
 * @param {URLSearchParams} searchParams - The current query parameters.
 * @param {ReadonlyArray<string>} categoryAllowlist - Categories derived from the catalogue.
 * @returns {CourseFilterValues} The normalised selection.
 */
function readValues(searchParams, categoryAllowlist) {
  return {
    q: normalizeQuery(searchParams.get('q')),
    category: normalizeOne(searchParams.get('category'), categoryAllowlist),
    level: normalizeList(searchParams.getAll('level'), LEVELS),
    duration: normalizeList(searchParams.getAll('duration'), DURATION_BAND_IDS),
    goal: normalizeOne(searchParams.get('goal'), GOAL_IDS),
    prereq: normalizeList(searchParams.getAll('prereq'), PREREQ_TAG_IDS),
    sort: normalizeOne(searchParams.get('sort'), SORT_IDS) || DEFAULT_SORT,
  }
}

/**
 * Produce the complete next selection with exactly one dimension replaced.
 *
 * The incoming value is normalised by the same rules the URL is read with, so a
 * caller cannot write a value the reader would then reject — which is what
 * keeps a written URL canonical and idempotent. An unknown dimension name
 * returns the current values unchanged, so a typo degrades to a no-op write
 * rather than corrupting the query string.
 *
 * @param {CourseFilterValues} values - The current normalised selection.
 * @param {unknown} dimension - One of `q`, `category`, `level`, `duration`, `goal`, `prereq`, `sort`.
 * @param {unknown} next - The replacement value: a string for a single
 *   dimension, an array for a multi dimension, or `null`/`undefined`/`''`/`[]`
 *   to clear it.
 * @param {ReadonlyArray<string>} categoryAllowlist - Categories derived from
 *   the catalogue, used only by the `category` branch.
 * @returns {CourseFilterValues} The next normalised selection.
 */
function withDimension(values, dimension, next, categoryAllowlist) {
  switch (dimension) {
    case 'q':
      return { ...values, q: normalizeQuery(next) }
    case 'category':
      return { ...values, category: normalizeOne(next, categoryAllowlist) }
    case 'level':
      return { ...values, level: normalizeList(next, LEVELS) }
    case 'duration':
      return { ...values, duration: normalizeList(next, DURATION_BAND_IDS) }
    case 'goal':
      return { ...values, goal: normalizeOne(next, GOAL_IDS) }
    case 'prereq':
      return { ...values, prereq: normalizeList(next, PREREQ_TAG_IDS) }
    case 'sort':
      return { ...values, sort: normalizeOne(next, SORT_IDS) || DEFAULT_SORT }
    default:
      return values
  }
}

/**
 * Serialise a normalised selection into the canonical query string.
 *
 * Keys are appended in ONE fixed order — `q`, `category`, `level`, `duration`,
 * `goal`, `prereq`, `sort` — because `URLSearchParams` serialises in insertion
 * order, so a fixed order is part of what makes equivalent views share a
 * byte-identical address. Multi-select dimensions `append` one entry per value
 * (repeated keys), and every empty dimension is omitted entirely rather than
 * written as an empty value, so the default view's URL carries no parameters at
 * all. `sort` is omitted while it equals {@link DEFAULT_SORT}, since that
 * renders the same view as no `sort` parameter.
 *
 * @param {CourseFilterValues} values - A normalised selection.
 * @returns {URLSearchParams} The canonical parameter set.
 */
function toSearchParams(values) {
  const next = new URLSearchParams()
  if (values.q !== '') next.set('q', values.q)
  if (values.category !== '') next.set('category', values.category)
  for (const level of values.level) next.append('level', level)
  for (const band of values.duration) next.append('duration', band)
  if (values.goal !== '') next.set('goal', values.goal)
  for (const tag of values.prereq) next.append('prereq', tag)
  if (values.sort !== DEFAULT_SORT) next.set('sort', values.sort)
  return next
}

/**
 * Count the dimensions currently constraining the result set.
 *
 * Each dimension counts ONCE however many values it holds — two selected levels
 * are one active filter, because the count answers "how many filters are
 * applied?" on the mobile "Filters" button, not "how many boxes are ticked?".
 *
 * `sort` is deliberately excluded: it reorders the results and never removes a
 * record, so counting it would tell the visitor a filter is applied when none
 * is. `q` IS counted, because a search narrows the result set exactly as a
 * filter does.
 *
 * @param {CourseFilterValues} values - A normalised selection.
 * @returns {number} The number of active filter dimensions, 0 to 6.
 */
function countActiveDimensions(values) {
  let count = 0
  if (values.q !== '') count += 1
  if (values.category !== '') count += 1
  if (values.level.length > 0) count += 1
  if (values.duration.length > 0) count += 1
  if (values.goal !== '') count += 1
  if (values.prereq.length > 0) count += 1
  return count
}

/**
 * The normalised catalogue selection — one entry per dimension, always present.
 *
 * A single-valued dimension is `''` when it imposes no constraint and a
 * multi-valued dimension is `[]`, which is exactly how `filterCourses` reads
 * "no constraint", so this object can be passed to the predicate unchanged.
 * `sort` is never empty: it carries the effective ordering, defaulting to
 * {@link DEFAULT_SORT}.
 *
 * @typedef {Object} CourseFilterValues
 * @property {string} q         Trimmed free-text query; `''` when none.
 * @property {string} category  One category literal present in the catalogue;
 *                              `''` when unconstrained.
 * @property {string[]} level   Level literals from `LEVELS`, in that order;
 *                              `[]` when unconstrained.
 * @property {string[]} duration Duration band ids from `DURATION_BAND_IDS`, in
 *                              that order; `[]` when unconstrained.
 * @property {string} goal      One goal id from `src/data/goals.js`; `''` when
 *                              unconstrained.
 * @property {string[]} prereq  Prerequisite tag ids from `PREREQ_TAG_IDS`, in
 *                              that order; `[]` when unconstrained.
 * @property {string} sort      The effective sort id from `SORT_IDS`;
 *                              {@link DEFAULT_SORT} when none was requested.
 */

/**
 * Catalogue filter, sort and search state backed by the `/courses` query string.
 *
 * Reads and normalises the seven parameters, derives the filtered-and-sorted
 * result list from them, and exposes the two writers that are the only way the
 * query string changes. See the module header for the parameter contract, the
 * canonical-URL rules and the write discipline.
 *
 * Every hook it uses — `useSearchParams`, three `useMemo`s and two
 * `useCallback`s — is called unconditionally at the top level, in a stable
 * order, with no early return anywhere above them, satisfying the Rules of
 * Hooks (`react/rules-of-hooks` is an error in this project). It registers no
 * effect at all, so it never navigates as a side effect of reading.
 *
 * **Memoisation is confined to the derived list and the two inputs its memo is
 * keyed on**, which is the only place it is measurable at this scale. So pass a
 * STABLE `courses` reference: the module's own array, or a caller-memoised
 * subset. An array built inline in the consumer's render body
 * (`courses.filter(...)` as an argument) is a new reference every render and
 * would recompute the derived list every render — harmless for ten records, but
 * pointless.
 *
 * @param {object[]} [courses=defaultCatalogue] - The catalogue to filter. Passed
 *   in rather than imported so the hook stays memoisable on its inputs and a
 *   pre-filtered grid can use it; defaults to `src/data/courses.js`, the single
 *   source of truth, mirroring `CourseGrid`'s own `items = courses` default. A
 *   non-array degrades to an empty result set instead of throwing.
 * @returns {{
 *   values: CourseFilterValues,
 *   setValue: (dimension: string, next: string|string[]|null|undefined) => void,
 *   clearAll: () => void,
 *   results: object[],
 *   resultCount: number,
 *   activeCount: number,
 * }} The catalogue discovery state and its writers:
 *   - `values` — the normalised current selection, one entry per dimension,
 *     safe to bind straight onto controlled inputs and to hand to
 *     `filterCourses`.
 *   - `setValue(dimension, next)` — replace ONE dimension and write the
 *     complete next parameter set once. Pass a string for `q`, `category`,
 *     `goal` or `sort`, an array for `level`, `duration` or `prereq`, and
 *     `''`/`[]`/`null` to clear a dimension (the key is deleted, never written
 *     empty). Because each call composes from the current values, two calls in
 *     the SAME tick collapse to the last one — compose the value you want and
 *     make a single call per interaction.
 *   - `clearAll()` — return to the canonical default view, whose URL carries no
 *     parameters at all (the ordering resets to `DEFAULT_SORT` with it).
 *   - `results` — the matching courses, filtered then sorted. A new array;
 *     neither the input list nor any record is mutated.
 *   - `resultCount` — `results.length`, from that same pass, so the live count a
 *     surface announces can never disagree with what it renders.
 *   - `activeCount` — how many filter dimensions are constraining the results
 *     (0–6, `sort` excluded), for the mobile "Filters" button's badge.
 *
 * @example
 * // /courses — the full control surface
 * const { values, setValue, clearAll, results, resultCount, activeCount } = useCourseFilters(courses)
 *
 * // Free text (one write per keystroke, replace: true so the back stack stays clean)
 * setValue('q', event.target.value)
 *
 * // Single-select: the category chip row. The 'All' chip clears the dimension.
 * setValue('category', chip === 'All' ? '' : chip)
 *
 * // Multi-select: a checkbox toggle composes the next array, then writes once.
 * const next = values.level.includes(level)
 *   ? values.level.filter((entry) => entry !== level)
 *   : [...values.level, level]
 * setValue('level', next)
 *
 * // Result count and the no-match branch:
 * // resultCount === 0 → render <EmptyState … action={
 * //   <Button onClick={clearAll}>Clear all filters</Button>} />
 */
export function useCourseFilters(courses = defaultCatalogue) {
  // The URL is the store. `searchParams` is memoised by react-router on
  // `location.search`, so it is a stable reference between navigations and safe
  // to key memos on; `setSearchParams` is the only writer.
  const [searchParams, setSearchParams] = useSearchParams()

  // The `?category=` allowlist is the catalogue's own distinct categories, so a
  // pre-filtered grid validates against only what it contains.
  const categoryOptions = useMemo(() => deriveCategories(courses), [courses])

  // Normalised once per URL change, before anything renders: trim →
  // de-duplicate → allowlist → declaration order.
  const values = useMemo(
    () => readValues(searchParams, categoryOptions),
    [searchParams, categoryOptions],
  )

  // The one memoised derived pass: filter first, then sort, with the query
  // forwarded so relevance ordering can apply (and fall back to catalogue
  // source order when there is no query). `resultCount` below is this same
  // pass's length, never a second count.
  const results = useMemo(
    () => sortCourses(filterCourses(courses, values), values.sort, values.q),
    [courses, values],
  )

  const setValue = useCallback(
    (dimension, next) => {
      // Compose the COMPLETE next set from the current normalised values, then
      // write exactly once: setSearchParams does not queue within a tick, so a
      // per-dimension write is the only safe shape.
      const nextParams = toSearchParams(withDimension(values, dimension, next, categoryOptions))
      // Skip a write that would produce the identical query string — clicking
      // the already-active chip should not cost a navigation. The comparison is
      // against the RAW current string, so arriving on a non-canonical URL
      // still gets canonicalised by the first real change.
      if (nextParams.toString() === searchParams.toString()) return
      setSearchParams(nextParams, { replace: true, preventScrollReset: true })
    },
    [values, categoryOptions, searchParams, setSearchParams],
  )

  const clearAll = useCallback(() => {
    if (searchParams.toString() === '') return
    setSearchParams(new URLSearchParams(), { replace: true, preventScrollReset: true })
  }, [searchParams, setSearchParams])

  return {
    values,
    setValue,
    clearAll,
    results,
    resultCount: results.length,
    activeCount: countActiveDimensions(values),
  }
}
