import { useEffect, useId, useRef, useState } from 'react'
import Button from '../ui/Button.jsx'
import Checkbox from '../ui/Checkbox.jsx'
import Dialog from '../ui/Dialog.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { cn } from '../../lib/cn.js'
import {
  DEFAULT_SORT,
  DURATION_BANDS,
  LEVELS,
  PREREQ_TAGS,
  SORTS,
  SORT_IDS,
  durationBandOf,
} from '../../lib/courseFilters.js'
import { goals } from '../../data/goals.js'

/**
 * CourseFilters — the control surface for smart course discovery on `/courses`
 * (AAP §0.2.1 F1). It renders the search field, the sort and learner-goal
 * selects, and the level / duration / prior-knowledge checkbox groups, together
 * with the active-filter count and the clear-all action.
 *
 * ── THIS COMPONENT HOLDS NO FILTER STATE. READ THIS FIRST. ──────────────────
 * `src/hooks/useCourseFilters.js` is the SINGLE owner of the `/courses` URL
 * contract — all seven parameters, their cardinality, their normalisation and
 * every write — and its instance lives in `src/pages/Courses.jsx`. This
 * component is a pure VIEW over state it does not own: it is handed `values`
 * and the writer, and it renders them.
 *
 * So, deliberately and permanently:
 *  - The router's search-parameter hook is NOT imported or called in this file.
 *    There is exactly one call site for the catalogue's URL state, and it is
 *    `useCourseFilters`.
 *  - There is no `useState` mirror of a filter value and no debounce into local
 *    state. A locally remembered filter value is how a shared URL and a back
 *    navigation start disagreeing with the screen, so the moment this file
 *    wants to remember a selection, the design has gone wrong.
 *  - The ONE piece of state this component legitimately owns is the open/closed
 *    state of the mobile filter sheet, which is presentation rather than filter
 *    state, plus the `matchMedia` guard that closes the sheet if the viewport
 *    crosses `lg` while it is open (otherwise `lg:hidden` would hide the
 *    trigger and leave the body scroll lock engaged on desktop — the same
 *    failure the navigation drawer guards against at
 *    `src/components/layout/Navbar.jsx:163-185`).
 *  - Every user action produces exactly ONE `onChange(dimension, next)` call.
 *    That is not stylistic: react-router 7.18.1's functional-updater form of
 *    `setSearchParams` does not queue within a tick, so two writes in one tick
 *    silently lose the first (AAP §0.3.3). The hook owns the batching; this
 *    component owns never calling the writer twice for one interaction.
 *
 * ── CARDINALITY (AAP §0.5.2 — decided once, not re-litigated here) ──────────
 * | Dimension  | Cardinality | Control                                       |
 * | ---------- | ----------- | --------------------------------------------- |
 * | `category` | single      | the chip row, which stays in {@link CourseGrid} |
 * | `level`    | MULTI       | {@link Checkbox} group                        |
 * | `duration` | MULTI       | {@link Checkbox} group                        |
 * | `prereq`   | MULTI       | {@link Checkbox} group                        |
 * | `goal`     | SINGLE      | {@link Select}                                |
 * | `sort`     | single      | {@link Select}                                |
 * | `q`        | single text | {@link Input}                                 |
 *
 * Two of those rows are worth stating out loud because a plausible-looking
 * implementation gets them wrong:
 *  - `category` is NOT this component's concern. It is the one dimension that
 *    predates this work: `CourseGrid` holds a single active category string,
 *    the three track pages depend on that single-value behaviour, and widening
 *    it would change a working surface for no requirement. There is deliberately
 *    no second category control here.
 *  - `goal` is SINGLE, rendered as a `Select` and NOT as a checkbox group. It is
 *    the same question the learning-path questionnaire asks, and asking it once
 *    with one answer is what keeps the two surfaces consistent. AAP §0.5.2
 *    explicitly corrects an earlier draft that made it multi.
 *
 * The three multi dimensions travel as REPEATED URL keys
 * (`?level=Beginner&level=Advanced`), never as a delimited string. The hook owns
 * that encoding; this component's only obligation is to hand the writer the
 * right shape — an array for a multi dimension, a scalar for a single one.
 *
 * ── COMBINATION: OR WITHIN A DIMENSION, AND ACROSS DIMENSIONS ───────────────
 * Ticking a second level WIDENS the result set; adding a duration on top
 * NARROWS it. A dimension with no value imposes no constraint at all. Every
 * hint and legend below is written to that reading, because the opposite reading
 * would return an empty result for every multi-select.
 *
 * ── OPTION SETS COME FROM MODULES, NEVER FROM LITERALS ──────────────────────
 * Level literals, duration bands (id AND display label), the prerequisite
 * taxonomy and the sort ids all come from `src/lib/courseFilters.js`; the six
 * learner goals come from `src/data/goals.js`, whose declaration order is
 * contractual because the hook normalises URL values into it. Ordering here
 * follows those same declaration orders, so the control and the canonical URL
 * can never disagree about sequence.
 *
 * ── ONLY WHAT THE CATALOGUE HAS — AND THE GAP IS DISCLOSED, NOT HIDDEN ──────
 * Offered values are derived from the `courses` prop, following the precedent at
 * `CourseGrid.jsx:119` (`Array.from(new Set(items.map(...)))`, ordered by the
 * owning module rather than by first appearance). That has a visible consequence
 * this component is required to own: only ONE of the ten catalogue records
 * carries a `level` today, the other nine awaiting content-owner input, and
 * inferring a level from a subject or a duration would be an invented
 * pedagogical claim (AAP §0.7.2). So the level group offers one value rather
 * than four, AND it reports how many courses carry no level at all in a short
 * `text-xs text-muted` line. That disclosure is load-bearing: `filterCourses`
 * treats a MISSING field as "does not match that filter" rather than as a match,
 * so a level-filtered view legitimately shows very few courses, and the sentence
 * is what makes that read as honest rather than broken. The same derivation and
 * the same disclosure apply to `duration` (a course whose `duration` string does
 * not parse has no `durationWeeks` and therefore no band) and to `prereq`.
 *
 * One refinement makes "offer only what is present" safe rather than lossy: the
 * offered set is the values present in the catalogue UNION the values currently
 * selected. The hook validates a URL value against the FULL taxonomy, so
 * `?level=Advanced` is a legitimate filter that yields zero results and the
 * explained no-match empty state. Were the control to offer present values only,
 * that selection would have no checkbox, so the visitor could see the constraint
 * in the address bar but could not clear it. Including the selection keeps the
 * panel an accurate picture of the URL at all times.
 *
 * ── `prereq` MATCHES `prereqTags`, NEVER THE PROSE `prerequisites` ──────────
 * The filter values are the three machine ids from the prerequisite taxonomy.
 * The `courses[].prerequisites` field is free-text content-owner prose ("a
 * working knowledge of basic arithmetic" is a sentence, not an identifier), is
 * mostly unpopulated, and is displayed on the course detail route but NEVER
 * matched or filtered (AAP §0.5.2). And `none` is an explicit selectable value
 * meaning "requires nothing prior": a course matches it only by carrying
 * `'none'` in `prereqTags`, never by inference, so a course whose `prereqTags`
 * is absent or `[]` matches no `prereq` selection at all — which is exactly what
 * the disclosure line for that group reports.
 *
 * ── PRESENTATION: ONE AUTHORED CONTROL SET, TWO PLACES ──────────────────────
 * The controls are authored ONCE, in the module-local `FilterControls` below,
 * and presented twice — a `bg-surface` panel from `lg` upward (the consumer
 * places it beside the grid; width and gutters stay with `Container` on the
 * page, so this component adds neither), and the identical set inside a
 * bottom-placed {@link Dialog} below `lg`, opened by a single "Filters" button
 * that carries the active count. Authoring two copies of the controls would be
 * precisely the duplicate component the plan's prohibitions forbid.
 *
 * The sheet's height is capped by the EXISTING `max-h-screen-85` utility, which
 * `Dialog`'s `bottom` placement already applies, and it scrolls rather than
 * overflowing. A shallower 70vh sibling of that ceiling was considered for this
 * sheet and RETRACTED (AAP §0.8.3): a named `@utility` whose body is a raw 70vh
 * is a hardcoded value wearing a token's name, because 70vh appears nowhere in
 * the token block. Reusing the existing 85vh ceiling — which serves this sheet
 * and the search listbox both — is why this work adds zero utilities and
 * `src/index.css` carries no diff.
 *
 * ── THE `Select` TRAP THIS FILE AVOIDS ──────────────────────────────────────
 * `Select` renders `defaultValue={placeholder ? '' : undefined}`
 * (`src/components/ui/Select.jsx`). Passing BOTH a `placeholder` and a
 * controlled `value` therefore puts `defaultValue` and `value` on the same
 * `<select>`, React warns ("specify either the value prop, or the defaultValue
 * prop, but not both") and controlled behaviour breaks. Both selects here are
 * controlled, so NEITHER passes `placeholder`: the goal select supplies its
 * "Any goal" option through `children` (which take precedence over `options`),
 * leaving `defaultValue` undefined, and the sort select needs no empty option at
 * all because `DEFAULT_SORT` is always one of the rendered ids.
 *
 * ── ACCESSIBILITY (AAP §0.12.4) ─────────────────────────────────────────────
 *  - Native controls throughout: a real `<select>` and real checkboxes. The
 *    catalogue filters are deliberately NOT a combobox — AAP §0.3.3 reserves
 *    that pattern for the global search field and applies "no ARIA is better
 *    than bad ARIA" here — so this file builds no listbox and declares none of
 *    that widget's roles or active-descendant wiring.
 *  - Each multi-select dimension is a real `<fieldset>` with a `<legend>`, so
 *    the group name comes from the platform rather than from `role="group"` and
 *    an `aria-label`. The fieldset is left at its default `display` and the
 *    options sit in a nested flex column, because a flex fieldset makes the
 *    legend a flex item and legend layout is quirky in that position.
 *  - Every control carries a real label, and the 44px floor comes from
 *    `Button`'s base class and from `Checkbox`'s `min-h-11` row and label.
 *  - The focus ring is INHERITED from the single global `:focus-visible` rule in
 *    `src/index.css` and from the primitives' own `focus-visible` classes; it is
 *    never re-declared here.
 *  - NO polite region is declared in this file. The result count's single
 *    announcement belongs to `CourseGrid`, and a second region would double
 *    every announcement; the sheet's footer label is plain text for that reason,
 *    and so is the active-filter summary line.
 *  - The "Filters" trigger is a plain button with no `aria-expanded`: it opens a
 *    modal dialog that takes focus, which is not a disclosure, and the
 *    parenthesised count is mirrored by a visually hidden clarifier so the
 *    accessible name still contains the visible label (WCAG 2.5.3).
 *
 * ── DESIGN SYSTEM ───────────────────────────────────────────────────────────
 * Composition only, through {@link cn}: `bg-surface` for the panel,
 * `border-border` hairlines, `rounded-2xl` on the panel, `text-foreground` for
 * titles and `text-xs text-muted` for counts and disclosures. Zero new tokens,
 * zero new utilities, no arbitrary bracket value, no gradient, no glassmorphism
 * and no animation of its own — the sheet's entrance is `Dialog`'s, under the
 * shell's `MotionConfig reducedMotion="user"`.
 *
 * @param {Array<object>} [courses=[]] The catalogue the offered filter values
 *   are derived from. Pass the SAME list the grid renders (the unfiltered
 *   catalogue, or a pre-filtered subset on a track page) so the panel only ever
 *   offers values that list actually contains. A non-array is treated as empty.
 * @param {{q?: string, category?: string, goal?: string, sort?: string,
 *   level?: string|string[], duration?: string|string[], prereq?: string|string[]}}
 *   [values={}] The normalised current selection from `useCourseFilters`. Read
 *   only — this component never mutates it and never keeps a copy.
 * @param {(dimension: string, next: string|string[]) => void} [onChange] The
 *   hook's `setValue`. Called at most ONCE per interaction, with an array for
 *   `level`/`duration`/`prereq` and a string for `q`/`goal`/`sort`. An empty
 *   string or empty array means "no constraint", which the hook turns into a
 *   removed parameter.
 * @param {() => void} [onClearAll] The hook's `clearAll`. The same code path the
 *   no-match empty state in `CourseGrid` triggers, so there is exactly one way
 *   to clear everything.
 * @param {number} [resultCount] How many courses currently match. Rendered only
 *   on the mobile sheet's footer button, where the grid is hidden behind the
 *   sheet; the on-page count row and its polite region stay with `CourseGrid`.
 * @param {number} [activeCount] Optional active-dimension count from the hook.
 *   When supplied it wins, because the hook counts dimensions authoritatively.
 *   When omitted it is derived over the dimensions this panel owns — `q`, `goal`,
 *   `level`, `duration` and `prereq` — excluding `sort`, which is an ordering
 *   rather than a filter, and `category`, whose control lives in `CourseGrid`.
 * @param {string} [className] Extra classes merged LAST via {@link cn} onto the
 *   root wrapper, so a caller can place the panel in its own grid column.
 * @param {object} [props] Any other props (`id`, `aria-*`, `data-*`, …) are
 *   forwarded to the root `<div>`.
 * @returns {import('react').ReactElement} The filter control surface.
 */

/**
 * The three multi-select dimensions, each bound to the module that owns its
 * vocabulary. Module-local and NOT exported, so this file exposes only the
 * `CourseFilters` component (`react/only-export-components`), matching how
 * `Dialog` and `Button` keep their variant maps private.
 *
 * `options` is the full taxonomy in the owning module's declaration order — the
 * same order the hook normalises URL values into. `valuesOf` reports the values
 * a single course contributes to the dimension, and is the ONLY place a course
 * field is read, so the derivation and the matching predicate in `filterCourses`
 * can never drift apart. `gapNoun` and `filterNoun` are the two nouns the
 * disclosure sentence needs; they are wording, never data.
 *
 * @type {ReadonlyArray<Readonly<{
 *   id: 'level'|'duration'|'prereq',
 *   legend: string,
 *   filterNoun: string,
 *   gapNoun: string,
 *   options: ReadonlyArray<Readonly<{value: string, label: string}>>,
 *   valuesOf: (course: object) => string[],
 * }>>}
 */
const FILTER_GROUPS = Object.freeze([
  Object.freeze({
    id: 'level',
    legend: 'Level',
    filterNoun: 'level',
    gapNoun: 'level',
    options: Object.freeze(LEVELS.map((level) => Object.freeze({ value: level, label: level }))),
    // `level` is optional on a course record and is never inferred (AAP §0.7.2).
    valuesOf: (course) => (typeof course.level === 'string' ? [course.level] : []),
  }),
  Object.freeze({
    id: 'duration',
    legend: 'Duration',
    filterNoun: 'duration',
    gapNoun: 'comparable duration',
    options: Object.freeze(
      DURATION_BANDS.map((band) => Object.freeze({ value: band.id, label: band.label })),
    ),
    // The band comes from the shared helper, which reads the numeric
    // `durationWeeks` field and returns null when there is nothing comparable —
    // never from parsing the free-text `duration` string here.
    valuesOf: (course) => {
      const band = durationBandOf(course)
      return band === null ? [] : [band]
    },
  }),
  Object.freeze({
    id: 'prereq',
    legend: 'Prior knowledge',
    filterNoun: 'prior knowledge',
    gapNoun: 'prior-knowledge tag',
    options: Object.freeze(PREREQ_TAGS.map((tag) => Object.freeze({ value: tag.id, label: tag.label }))),
    // The machine tags, NOT the prose `prerequisites` field, which is
    // display-only and is never matched. An absent or empty array contributes
    // nothing, so such a course matches no prereq selection — including 'none'.
    valuesOf: (course) => (Array.isArray(course.prereqTags) ? course.prereqTags : []),
  }),
])

/**
 * Coerce a dimension's value to the list shape the multi-select controls read.
 *
 * Tolerates every representation a caller might hold — an array, a bare string
 * from a single-valued URL read, or nothing at all — because this component is
 * handed state it does not own and must render whatever arrives without
 * throwing. Empty and non-string entries are dropped rather than rendered as a
 * ghost selection.
 *
 * @param {unknown} value - The raw dimension value from `values`.
 * @returns {string[]} The selected values, possibly empty.
 */
function toList(value) {
  if (Array.isArray(value)) return value.filter((entry) => typeof entry === 'string' && entry !== '')
  if (typeof value === 'string' && value !== '') return [value]
  return []
}

/**
 * Coerce a single-valued dimension to a string, so a controlled input never
 * receives `undefined` and flips to uncontrolled mid-session.
 *
 * @param {unknown} value - The raw dimension value from `values`.
 * @returns {string} The value, or `''`.
 */
function toText(value) {
  return typeof value === 'string' ? value : ''
}

/**
 * Reduce a multi-select dimension's value to the entries this panel can
 * actually show — the ones belonging to the dimension's taxonomy.
 *
 * This is the single test for "is this dimension really constrained?", and it
 * exists because the answer has to agree with what the controls render. The
 * controls offer taxonomy members only, so a value outside the taxonomy renders
 * no checkbox; counting it as an active filter would print "4 filters applied"
 * over a panel whose every control sits at its default, with nothing the
 * visitor could untick. In the assembled application the hook drops such a
 * value long before it reaches this component, but a component that contradicts
 * itself on a hand-edited URL is still a component that contradicts itself.
 *
 * A taxonomy member the current catalogue happens not to carry (`Advanced`
 * today) IS offered, by the union rule, and so IS counted — the visitor can see
 * it and clear it, and it genuinely constrains the result set.
 *
 * @param {object} group - An entry from {@link FILTER_GROUPS}.
 * @param {unknown} value - The raw dimension value from `values`.
 * @returns {string[]} The recognised selection, possibly empty.
 */
function knownSelection(group, value) {
  return toList(value).filter((entry) => group.options.some((option) => option.value === entry))
}

/**
 * Work out which options a multi-select dimension should offer, and how many
 * records cannot satisfy it.
 *
 * `options` is the intersection of the taxonomy with the values actually
 * present in `list`, UNION anything currently selected — so the control offers
 * only what the catalogue has, while never hiding an active selection the
 * visitor has to be able to clear (a URL value is validated against the full
 * taxonomy by the hook, so `?level=Advanced` is legitimate even though no
 * course carries it). Order always comes from the taxonomy.
 *
 * `missing` counts the records that contribute NO recognised value to this
 * dimension — precisely the records any selection in it can never match. That
 * number is what the disclosure sentence reports, and it is a fact about the
 * data rather than an estimate.
 *
 * @param {object} group - An entry from {@link FILTER_GROUPS}.
 * @param {object[]} list - The course records to inspect.
 * @param {string[]} selected - The dimension's current selection.
 * @returns {{options: ReadonlyArray<{value: string, label: string}>, missing: number}}
 */
function deriveGroup(group, list, selected) {
  const present = new Set()
  let missing = 0

  for (const course of list) {
    if (!course || typeof course !== 'object') {
      missing += 1
      continue
    }
    const known = group.valuesOf(course).filter((value) =>
      group.options.some((option) => option.value === value),
    )
    if (known.length === 0) missing += 1
    for (const value of known) present.add(value)
  }

  return {
    options: group.options.filter(
      (option) => present.has(option.value) || selected.includes(option.value),
    ),
    missing,
  }
}

/**
 * Compose the honest disclosure sentence for a dimension whose records are only
 * partly populated, or `null` when every record carries a value and there is
 * nothing to disclose.
 *
 * This is the sentence that stops an almost-empty level filter reading as a
 * defect: `filterCourses` excludes a record missing the filtered field, so
 * saying how many records that is turns a surprising result count into an
 * explained one. Nothing here fabricates the absent values.
 *
 * @param {object} group - An entry from {@link FILTER_GROUPS}.
 * @param {number} missing - Records contributing no recognised value.
 * @param {number} total - Records inspected.
 * @returns {string|null} The sentence, or `null` when none is warranted.
 */
function gapNote(group, missing, total) {
  if (total === 0 || missing === 0) return null
  if (missing === total) {
    return `No course listed here has a ${group.gapNoun} recorded yet, so a ${group.filterNoun} filter cannot match anything.`
  }
  const verb = missing === 1 ? 'has' : 'have'
  const pronoun = missing === 1 ? 'it' : 'them'
  return `${missing} of ${total} courses ${verb} no ${group.gapNoun} recorded yet, so filtering by ${group.filterNoun} leaves ${pronoun} out.`
}

/**
 * Label the active-filter summary line.
 *
 * @param {number} count - Active dimensions.
 * @returns {string} The summary text.
 */
function activeFilterLabel(count) {
  if (count === 0) return 'No filters applied'
  return count === 1 ? '1 filter applied' : `${count} filters applied`
}

/**
 * Label the mobile sheet's footer button, which both reports the current match
 * count and dismisses the sheet.
 *
 * It reports rather than announces: `CourseGrid` owns the single polite region,
 * so this is plain text. An unknown count (the prop is optional) degrades to a
 * neutral dismissal label rather than to a fabricated number, and zero matches
 * is stated plainly instead of being dressed up as a result.
 *
 * @param {unknown} count - The current result count, when known.
 * @returns {string} The button label.
 */
function resultsButtonLabel(count) {
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) return 'Close filters'
  if (count === 0) return 'Close — no courses match'
  return count === 1 ? 'Show 1 course' : `Show ${count} courses`
}

/**
 * Work out which learner goals to offer.
 *
 * Same rule as the multi-select dimensions: the goals actually carried by the
 * listed courses, UNION the one currently selected so an active constraint can
 * always be cleared, ordered by the taxonomy's contractual declaration order.
 *
 * @param {object[]} list - The course records to inspect.
 * @param {string} selected - The currently selected goal id, or `''`.
 * @returns {Array<{id: string, label: string, description: string}>} Offered goals.
 */
function deriveGoalOptions(list, selected) {
  const present = new Set()
  for (const course of list) {
    if (course && typeof course === 'object' && Array.isArray(course.goals)) {
      for (const id of course.goals) present.add(id)
    }
  }
  return goals.filter((goal) => present.has(goal.id) || goal.id === selected)
}

/**
 * The control set, authored ONCE and rendered by both presentations — the
 * desktop panel and the mobile sheet. Module-local and not exported, so the
 * file's only export stays the `CourseFilters` component.
 *
 * It is as stateless as its parent: every value it renders comes from `values`
 * and every change leaves through `onChange` in a single call. The two
 * presentations therefore cannot drift, and there is only one place to edit a
 * control.
 *
 * @param {object[]} courses - Normalised course list (already array-checked).
 * @param {object} values - Normalised selection (already object-checked).
 * @param {(dimension: string, next: string|string[]) => void} [onChange] Writer.
 * @param {() => void} [onClearAll] Clear-everything action.
 * @param {number} activeCount - Active dimensions, for the summary line.
 * @param {{current: HTMLElement|null}} [focusFallbackRef] The surrounding
 *   presentation's own heading, focused when the clear-all control removes
 *   itself. Each presentation passes its own, which is why the two call sites
 *   differ by exactly this one prop.
 * @returns {import('react').ReactElement} The stacked controls.
 */
function FilterControls({ courses, values, onChange, onClearAll, activeCount, focusFallbackRef }) {
  const query = toText(values.q)
  const rawSort = toText(values.sort)
  // An unrecognised or absent sort resolves to the module's declared default, so
  // the controlled `<select>` always has a value that matches a rendered option
  // — never a blank control misreporting the ordering actually in force.
  const sortValue = SORT_IDS.includes(rawSort) ? rawSort : DEFAULT_SORT
  const rawGoal = toText(values.goal)
  const goalOptions = deriveGoalOptions(courses, rawGoal)
  // Same discipline as the sort above: a goal that is not one of the offered
  // options resolves to the empty "Any goal" value. Without this the controlled
  // `<select>` would be handed a value matching no `<option>`, which leaves the
  // control showing whatever the browser coerces it to — an unreliable way to
  // report state. Resolving it here makes the rendering deterministic and keeps
  // the control agreeing with the active-filter count, which applies the same
  // taxonomy test.
  const goalValue = goalOptions.some((goal) => goal.id === rawGoal) ? rawGoal : ''
  const selectedGoal = goalOptions.find((goal) => goal.id === goalValue)

  /**
   * Clear every dimension, then put focus somewhere that still exists.
   *
   * The clear-all control removes itself the instant the count reaches zero, so
   * focus has to be moved DELIBERATELY: leave it on the button and the focused
   * node is destroyed, which drops focus to `<body>` — and inside the open
   * sheet, with the rest of the page inert, that leaves a keyboard or
   * screen-reader user with no position at all. The destination is the
   * surrounding presentation's own heading, which never unmounts. React batches
   * the update `onClearAll` schedules until this handler returns, so this focus
   * call lands before the removal is committed and therefore survives it.
   *
   * @returns {void}
   */
  const handleClearAll = () => {
    onClearAll?.()
    const fallback = focusFallbackRef?.current
    if (fallback && typeof fallback.focus === 'function') fallback.focus()
  }

  /**
   * Toggle one value of a multi-select dimension, in ONE write.
   *
   * The next selection is emitted in the taxonomy's declaration order, so the
   * array is already canonical before the hook normalises it, and a value the
   * taxonomy does not recognise is dropped on the way out — the same treatment
   * the hook gives a hand-edited URL. One user action produces exactly one
   * `onChange` call, because react-router's functional-updater form does not
   * queue within a tick and a second call would discard the first.
   *
   * @param {object} group - An entry from {@link FILTER_GROUPS}.
   * @param {string} optionValue - The value being toggled.
   * @param {boolean} checked - The checkbox's new state.
   * @returns {void}
   */
  const handleToggle = (group, optionValue, checked) => {
    const next = new Set(toList(values[group.id]))
    if (checked) next.add(optionValue)
    else next.delete(optionValue)
    onChange?.(
      group.id,
      group.options.filter((option) => next.has(option.value)).map((option) => option.value),
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary + clear-all. The count is plain text, not a live region:
          `CourseGrid` owns the single polite region on this page. The clear-all
          button is rendered only when there is something to clear, rather than
          sitting permanently disabled and out of the tab order. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">{activeFilterLabel(activeCount)}</p>
        {activeCount > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={handleClearAll}>
            Clear all
          </Button>
        ) : null}
      </div>

      <Input
        type="search"
        label="Search courses"
        value={query}
        onChange={(event) => onChange?.('q', event.target.value)}
        hint="Matches a course title, category, summary or highlight."
      />

      {/* Controlled, so NO `placeholder` is passed (see the Select trap in the
          header). No empty option is needed either: the resolved sort is always
          one of the rendered ids. */}
      <Select
        label="Sort by"
        value={sortValue}
        onChange={(event) => onChange?.('sort', event.target.value)}
      >
        {SORTS.map((sort) => (
          <option key={sort.id} value={sort.id}>
            {sort.label}
          </option>
        ))}
      </Select>

      {/* Single-select by design (AAP §0.5.2), and the "Any goal" option is
          supplied through `children` — which take precedence over `options` —
          so `defaultValue` stays undefined on a controlled select. A native
          `<option>` cannot carry a hint, so the chosen goal's own description
          is surfaced as the field hint instead. */}
      <Select
        label="Learner goal"
        value={goalValue}
        onChange={(event) => onChange?.('goal', event.target.value)}
        hint={
          selectedGoal
            ? selectedGoal.description
            : 'Choose one goal to see only the courses that work towards it.'
        }
      >
        <option value="">Any goal</option>
        {goalOptions.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.label}
          </option>
        ))}
      </Select>

      {FILTER_GROUPS.map((group) => {
        const selected = toList(values[group.id])
        const { options, missing } = deriveGroup(group, courses, selected)
        const note = gapNote(group, missing, courses.length)

        // Nothing to offer and nothing to disclose (an empty list) — render no
        // group at all rather than an unexplained empty container.
        if (options.length === 0 && note === null) return null

        return (
          // A real fieldset/legend carries the group name from the platform, so
          // no `role="group"` and no `aria-label` are needed. The fieldset keeps
          // its default display and the options sit in a nested flex column,
          // because a flex fieldset turns the legend into a flex item and legend
          // layout is quirky there.
          <fieldset key={group.id}>
            <legend className="text-sm font-medium text-foreground">{group.legend}</legend>
            {options.length > 0 ? (
              <div className="mt-2 flex flex-col gap-2">
                {options.map((option) => (
                  <Checkbox
                    key={option.value}
                    label={option.label}
                    value={option.value}
                    checked={selected.includes(option.value)}
                    onChange={(event) => handleToggle(group, option.value, event.target.checked)}
                  />
                ))}
              </div>
            ) : null}
            {/* The disclosure. Ticking two boxes in one group WIDENS the result
                set; this sentence explains why the group cannot reach every
                course, and it is derived from the data rather than authored. */}
            {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
          </fieldset>
        )
      })}
    </div>
  )
}

function CourseFilters({
  courses,
  values,
  onChange,
  onClearAll,
  resultCount,
  activeCount,
  className,
  ...props
}) {
  // Hooks first and unconditionally (`react/rules-of-hooks` is an oxlint ERROR).
  // The ONLY state here is the sheet's open flag — presentation, never a filter
  // value.
  const [sheetOpen, setSheetOpen] = useState(false)
  const triggerRef = useRef(null)
  const headingRef = useRef(null)
  const panelHeadingRef = useRef(null)
  const headingId = useId()

  // Close the sheet if the viewport reaches `lg` while it is open. Without this,
  // `lg:hidden` would hide the trigger while `useDialog`'s body scroll lock
  // stayed engaged on desktop — the exact failure the navigation drawer guards
  // against at src/components/layout/Navbar.jsx:163-185, whose guarded
  // `addEventListener`/`addListener` shape is mirrored here. `64rem` is the `lg`
  // breakpoint, so the JS boundary and the CSS boundary are the same number.
  useEffect(() => {
    if (!sheetOpen) return undefined
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined

    // Closing for width rather than by request needs its own focus decision.
    // `useDialog` restores focus to `returnFocusRef` — the trigger — but from
    // `lg` up the trigger is `display: none`, so that `focus()` is silently
    // dropped and a keyboard user lands on `<body>`. The panel is visible at
    // exactly this width, so its heading is the correct destination. Focus is
    // only relocated when the visitor actually HAD a position inside the sheet,
    // so a plain mouse resize does not steal focus from elsewhere on the page.
    //
    // The focus call is deferred by one frame DELIBERATELY, and this is the
    // load-bearing detail: React has not committed `setSheetOpen(false)` when
    // this handler returns, so the dialog is still mounted and `#root` is still
    // `inert` — and a `focus()` into an inert subtree is silently dropped, the
    // very hazard `useDialog` documents. This destination lives INSIDE `#root`
    // (unlike the clear-all fallback, which lives in the portal and can
    // therefore be focused synchronously), so it has to wait for the close to
    // commit and the inert flag to clear. `requestAnimationFrame` runs after
    // React has flushed and after the hook's own teardown, which is what makes
    // this the last focus call standing. The ref is re-read inside the callback
    // so an unmount in between is a no-op rather than a throw.
    const closeForDesktop = () => {
      const active = document.activeElement
      const wasInsideSheet =
        active && typeof active.closest === 'function' && active.closest('[role="dialog"]') !== null
      setSheetOpen(false)
      if (!wasInsideSheet) return
      window.requestAnimationFrame(() => {
        const heading = panelHeadingRef.current
        if (heading && typeof heading.focus === 'function') heading.focus()
      })
    }

    const desktopQuery = window.matchMedia('(min-width: 64rem)')
    const onViewportChange = (event) => {
      if (event.matches) closeForDesktop()
    }
    // Already at or above `lg` when opened (a keyboard activation of a control
    // that is visually hidden, for instance) — close immediately.
    if (desktopQuery.matches) closeForDesktop()
    if (typeof desktopQuery.addEventListener === 'function') {
      desktopQuery.addEventListener('change', onViewportChange)
    } else {
      desktopQuery.addListener(onViewportChange)
    }

    return () => {
      if (typeof desktopQuery.removeEventListener === 'function') {
        desktopQuery.removeEventListener('change', onViewportChange)
      } else {
        desktopQuery.removeListener(onViewportChange)
      }
    }
  }, [sheetOpen])

  // Defensive normalisation of props this component does not own: a non-array
  // catalogue and a missing selection both render as "nothing selected, nothing
  // to offer" instead of throwing.
  const list = Array.isArray(courses) ? courses : []
  const selection = values && typeof values === 'object' ? values : {}

  // Derived over the dimensions THIS panel owns — `sort` is an ordering rather
  // than a filter, and `category` belongs to the chip row in `CourseGrid`, so
  // the count always describes exactly what the sheet contains. A hook-supplied
  // `activeCount` wins, because the hook counts dimensions authoritatively.
  //
  // Each dimension is counted through the SAME taxonomy test its control uses,
  // so the count can never claim a filter the panel does not render: an
  // unrecognised `?goal=` or `?level=` value is dropped from the controls and
  // from the count alike, leaving "No filters applied" over the default view
  // rather than a phantom constraint nobody can clear.
  const derivedActiveCount =
    (toText(selection.q).trim() === '' ? 0 : 1) +
    (goals.some((goal) => goal.id === toText(selection.goal)) ? 1 : 0) +
    FILTER_GROUPS.reduce(
      (total, group) => total + (knownSelection(group, selection[group.id]).length > 0 ? 1 : 0),
      0,
    )
  const activeFilterCount = Number.isFinite(activeCount)
    ? Math.max(0, Math.trunc(activeCount))
    : derivedActiveCount

  const closeSheet = () => setSheetOpen(false)

  // Authored ONCE: one control set, one place its props are written. Both
  // presentations call this, so a control can never exist in one and not the
  // other, and they differ by exactly one argument — the heading focus falls
  // back to when the clear-all control removes itself.
  const renderControls = (fallbackRef) => (
    <FilterControls
      courses={list}
      values={selection}
      onChange={onChange}
      onClearAll={onClearAll}
      activeCount={activeFilterCount}
      focusFallbackRef={fallbackRef}
    />
  )

  return (
    <div className={cn('flex flex-col gap-4', className)} {...props}>
      {/* Below `lg`: the single trigger. A plain button, not a disclosure — it
          opens a modal dialog that takes focus, so `aria-expanded` would be
          bad ARIA rather than extra information. The parenthesised count is
          decorative and mirrored by a visually hidden clarifier, so the
          accessible name still contains the visible label (WCAG 2.5.3). */}
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        className="w-full lg:hidden"
        onClick={() => setSheetOpen(true)}
      >
        Filters
        {activeFilterCount > 0 ? (
          <>
            <span aria-hidden="true">({activeFilterCount})</span>
            <span className="sr-only">, {activeFilterLabel(activeFilterCount)}</span>
          </>
        ) : null}
      </Button>

      {/* From `lg` up: the panel. The consumer places it beside the grid; width
          and gutters stay with `Container` on the page, so nothing here adds a
          second measure. */}
      <div className="hidden rounded-2xl border border-border bg-surface p-6 lg:block">
        {/* `tabIndex={-1}` makes this heading a programmatic focus destination
            without joining the tab order — it is where focus goes when the
            clear-all control removes itself, and where it goes when the
            breakpoint guard closes the sheet. */}
        <h2 ref={panelHeadingRef} tabIndex={-1} className="text-lg font-semibold text-foreground">
          Filters
        </h2>
        <div className="mt-6">{renderControls(panelHeadingRef)}</div>
      </div>

      {/* Below `lg`: the same controls as a bottom sheet. `Dialog` supplies the
          portal, the focus trap, Escape, the scrim, the scroll lock, the
          `rounded-t-2xl bg-white p-6 shadow-md` surface and the existing
          `max-h-screen-85` ceiling with `overflow-y-auto`, so nothing about the
          sheet is re-implemented here. Focus lands on the heading rather than on
          the search field, which would raise the on-screen keyboard over the
          controls the visitor came to use, and returns to the trigger on close.
          `Dialog` renders nothing while closed, which is what establishes and
          tears the focus trap down. */}
      <Dialog
        open={sheetOpen}
        onClose={closeSheet}
        placement="bottom"
        labelledBy={headingId}
        initialFocusRef={headingRef}
        returnFocusRef={triggerRef}
      >
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold text-foreground"
        >
          Filter courses
        </h2>
        <div className="mt-6">{renderControls(headingRef)}</div>
        {/* Dismissal that doubles as a report of what the choices produced,
            because the grid is behind the sheet. Plain text, not a live region. */}
        <div className="mt-6">
          <Button type="button" className="w-full" onClick={closeSheet}>
            {resultsButtonLabel(resultCount)}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

export default CourseFilters
