import { useState } from 'react'
import { motion } from 'framer-motion'
import { FaRegFolderOpen, FaSearchMinus } from 'react-icons/fa'
import CourseCard from './CourseCard.jsx'
import CourseFilters from './CourseFilters.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { cn } from '../../lib/cn.js'
import { useComparison } from '../../hooks/useComparison.js'
import { useScrollReveal, prefersReducedMotion, fadeUp, staggerContainer } from '../../hooks/useScrollReveal.js'
import courses from '../../data/courses.js'

/**
 * CourseGrid — the responsive, reuse-first grid of course tiles for CIBLE
 * School of Language (AAP §0.6.1 Group 7). It is the single canonical way the
 * catalog is laid out on the page and is consumed by the Home "featured
 * courses" section, the Courses index (with the category filter enabled), and
 * the category landing pages (SpokenEnglish / ScienceCoaching / ComputerCourses,
 * typically pre-filtered via the `items` prop).
 *
 * Composition & reuse (design-system rule: compose ONE canonical primitive,
 * never duplicate markup):
 *  - Every tile is the shared {@link CourseCard} primitive — this component
 *    lays cards out but never restyles or forks a card of its own.
 *  - The optional filter chips are the shared {@link Button} primitive rendered
 *    as real <button>s (no `to`/`href`), so they inherit the project's focus
 *    ring, sizing and variant tokens rather than re-implementing a styled
 *    control.
 *  - Class composition flows through the shared {@link cn} helper (clsx +
 *    tailwind-merge) so a caller-supplied `className` always wins on conflicting
 *    utilities.
 *  - Reveal animation reuses the shared {@link useScrollReveal} hook and the
 *    site-wide framer-motion variants ({@link staggerContainer} / {@link fadeUp})
 *    — the single, shared animation vocabulary.
 *  - Content comes from the `src/data/courses.js` single source of truth,
 *    overridable via the `items` prop for pre-filtered / test scenarios.
 *  - The search / sort / goal / level / duration / prerequisite controls are the
 *    shared {@link CourseFilters} surface — this component renders it and lays
 *    it out beside the grid, but authors none of those controls itself.
 *  - Both no-records branches are the shared {@link EmptyState} primitive, so
 *    there is exactly ONE empty-state implementation reachable from here.
 *
 * Filtering — WHERE THE STATE LIVES, which is the thing to get right:
 *  - `src/hooks/useCourseFilters.js` is the SINGLE owner of the `/courses` URL
 *    contract (all seven parameters, their cardinality, their normalisation and
 *    every write), and its instance lives in `src/pages/Courses.jsx`. This
 *    component therefore holds NO filter state of its own beyond the single
 *    `active` category below, and it never imports the router's
 *    search-parameter hook.
 *  - The CATEGORY chip row stays here and stays SINGLE-select — one chip active
 *    at a time. It is deliberately not widened to multi-select: the three track
 *    pages depend on that single-value behaviour, and the chips reuse
 *    {@link Button} with `aria-pressed` rather than becoming a second "chip"
 *    primitive.
 *  - The chips are CONTROLLED when the page passes `values`/`onChange` (the
 *    active chip mirrors `values.category`, and a click writes the dimension
 *    through the hook so the view is shareable and survives a reload), and
 *    UNCONTROLLED otherwise, falling back to the local `active` state that has
 *    always driven them. `'All'` clears the dimension rather than writing a
 *    sentinel into the URL.
 *  - The category list is derived from the *current* `items` (`'All'` + the
 *    unique `category` values in source order), so a pre-filtered `items` prop
 *    only ever offers the categories it actually contains.
 *  - Selecting a chip narrows the grid to that `category`; `'All'` shows
 *    everything. The active chip is the filled `primary` variant and carries
 *    `aria-pressed`; the rest are `outline`.
 *  - When the page supplies `results` (the hook's already filtered-and-sorted
 *    list) that list is rendered AS-IS. Re-applying the category filter on top
 *    of it would double-filter, because the hook owns `category` too.
 *
 * Layout of the control surface (AAP §0.9.3): the chip row spans the full width
 * above; from `lg` up {@link CourseFilters} is a `bg-surface` panel BESIDE the
 * grid (a `lg:flex-row` split — the panel's own `lg:block` / `lg:hidden` classes
 * do the switching), and below `lg` the identical controls live in that
 * component's bottom sheet behind a single "Filters" button carrying the active
 * count. The sheet is `CourseFilters`' own responsibility; this file only places
 * the panel and never re-authors a control.
 *
 * "Compare selected (n)" — the ONLY visible route into `/compare`:
 *  - It sits in the result-count row beside the live count, so it appears on
 *    every grid that has `showFilter` set and nowhere it would be meaningless
 *    (not on Home's featured grid, not on the track pages).
 *  - It is HIDDEN below two selections and rendered from two upward. That is
 *    deliberately a render decision rather than a `disabled` one: {@link Button}
 *    renders a `<Link>` as soon as `to` is set and ignores `disabled` entirely,
 *    so a "disabled" compare link would still navigate.
 *  - Its label carries the count (`Compare selected (2)`) so the control is
 *    self-describing, and at the cap it reads `3 of 3 selected` — which is how
 *    the three-course limit is disclosed BEFORE a fourth is attempted. Both the
 *    count and the cap are derived from {@link useComparison}, never hardcoded.
 *  - It links to `shareHref`, so the destination is the shareable
 *    `/compare?courses=a,b` URL rather than a bare `/compare`.
 *
 * Animation:
 *  - A single top-level {@link useScrollReveal} call returns a callback `ref`
 *    (attached to the grid) and an `inView` flag. The grid `<motion.div>` plays
 *    `staggerContainer` and each card wrapper plays `fadeUp` when `inView` flips
 *    to true (the hook triggers once, so cards never re-animate on scroll-back).
 *  - Under prefers-reduced-motion, `useScrollReveal` skips observation and
 *    returns `inView=true` immediately AND the grid mounts with
 *    `initial={false}` (via {@link prefersReducedMotion}), so cards render
 *    directly at their final state with no enter animation at all (WCAG 2.3.3).
 *
 * Styling — 100% token-driven (Tailwind v4 @theme tokens in `src/index.css`);
 * no hardcoded values (only the exempt 0/auto/inherit/currentColor/transparent),
 * spacing on the project's 8px scale (gap-8 between sections, gap-6 grid gap,
 * gap-2 between chips). The grid is the required responsive shape:
 * `grid gap-6 sm:grid-cols-2 lg:grid-cols-3` (1 column on mobile, 2 from `sm`,
 * 3 from `lg`), so there is never horizontal overflow.
 *
 * Accessibility (WCAG AA):
 *  - The filter is a labeled `role="group"` ("Filter courses by category") and
 *    each chip is a keyboard-focusable native <button> (via {@link Button}) with
 *    `aria-pressed` reflecting selection — state is never conveyed by color
 *    alone.
 *  - Each {@link CourseCard} keeps its own semantics and heading (an <h3> under
 *    the section <h2>), so the grid adds no redundant landmarks.
 *  - EXACTLY ONE polite region exists per listing, and it is the visible result
 *    count in this file (`role="status" aria-live="polite" aria-atomic="true"`).
 *    It is rendered for the whole lifetime of a filterable grid — not only once
 *    there is something to say — because a live region has to be in the DOM
 *    before its text changes to be announced at all. It carries two things: the
 *    live result count, and the comparison selection state once two courses are
 *    selected (including the "N of N" cap state). `CourseFilters` deliberately
 *    declares no region of its own and `CourseCard` none either, so a filter
 *    change or a compare toggle is announced once rather than three times.
 *  - The comparison CAP WORDING is deliberately NOT restated here. The cap
 *    instruction is authored once, in `src/lib/states.js`, and reaches the
 *    visitor as the refused toggle's `aria-describedby` note on the card; this
 *    region only reports the count-derived state ("3 of 3 courses selected for
 *    comparison"), so the two surfaces cannot drift apart (BUG 1).
 *  - Announcements never move focus: the region is a sibling of the grid, and
 *    nothing in this component calls `focus()`.
 *  - Focus rings are inherited from {@link Button} and the single global
 *    `:focus-visible` rule in `src/index.css`; they are never re-declared here.
 *  - When a listing has no records to show, the shared {@link EmptyState} is
 *    rendered in place of the grid — never an empty container — in TWO distinct
 *    cases that have different causes and different next actions: an empty
 *    catalogue (nothing is listed yet → contact CIBLE) and a non-empty
 *    catalogue narrowed to nothing (the filters match no course → clear them).
 *    Each answers what happened AND what to do next.
 *
 * @param {object} props
 * @param {Array<{
 *   slug: string,
 *   title: string,
 *   category: 'English'|'Science'|'Computer'|'Career',
 *   summary?: string,
 *   duration?: string,
 *   highlights?: string[],
 *   icon?: import('react-icons').IconType,
 * }>} [props.items=courses] Courses to render; defaults to the
 *   `src/data/courses.js` single source of truth. Pass a pre-filtered subset for
 *   the category landing pages.
 * @param {boolean} [props.showFilter=false] When true, renders the category
 *   filter chip group above the grid.
 * @param {string | ((course: object) => string)} [props.ctaTo] Optional CTA
 *   destination forwarded to every {@link CourseCard} as its `to`. Pass a string
 *   for a shared target, or a function `(course) => path` to compute a per-card
 *   route (the category landing pages pass
 *   `(c) => `/admission?course=${encodeURIComponent(c.title)}`` so their cards
 *   drive admission instead of self-linking). When omitted, each card falls back
 *   to its category-derived route.
 * @param {string} [props.ctaLabel] Optional CTA label forwarded to every
 *   {@link CourseCard} (e.g. "Apply now"). When omitted, cards use "Learn more".
 *
 * The next six props are the `useCourseFilters` pass-through. EVERY ONE IS
 * OPTIONAL, and with none of them supplied this component behaves exactly as it
 * always has — which is why Home's featured grid and the three category landing
 * pages (`SpokenEnglish` / `ScienceCoaching` / `ComputerCourses`) are unaffected
 * by their existence and pass none of them. Only `src/pages/Courses.jsx`, which
 * owns the hook, supplies them.
 *
 * @param {{q?: string, category?: string, goal?: string, sort?: string,
 *   level?: string|string[], duration?: string|string[], prereq?: string|string[]}}
 *   [props.values] The hook's normalised selection. Read-only: this component
 *   never mutates it and never keeps a copy. When it carries a string
 *   `category`, the chip row is controlled by it (`''` means "All"); when it is
 *   absent, the chips fall back to local state.
 * @param {(dimension: string, next: string|string[]) => void} [props.onChange]
 *   The hook's `setValue`, forwarded to {@link CourseFilters} and called by the
 *   category chips as `onChange('category', chip === 'All' ? '' : chip)` — one
 *   write per interaction. When absent the chips stay uncontrolled.
 * @param {() => void} [props.onClearAll] The hook's `clearAll`. Wired to BOTH
 *   the filter surface and the no-match empty state's action, so there is
 *   exactly one code path that clears everything. When absent, the empty
 *   state's action still resets the local category selection.
 * @param {object[]} [props.results] The hook's already filtered-and-sorted
 *   list. When supplied (an array) it is rendered AS-IS and the local category
 *   filter is NOT re-applied, because the hook owns `category` too. When
 *   absent, the grid filters `items` by the active chip as before.
 * @param {number} [props.resultCount] The hook's `resultCount`, forwarded to
 *   {@link CourseFilters} for its mobile sheet footer. The count this component
 *   ANNOUNCES is always the length of what it actually renders, so the
 *   announcement can never disagree with the grid.
 * @param {number} [props.activeCount] The hook's `activeCount`, forwarded to
 *   {@link CourseFilters} so the "Filters" button shows how many dimensions are
 *   applied without opening the sheet.
 * @param {string} [props.className] Extra classes merged LAST via {@link cn}
 *   onto the root wrapper, so a caller can extend or override layout.
 * @param {object} [props] Any other props (`id`, `aria-*`, `data-*`, …) are
 *   forwarded to the root <div>.
 * @returns {import('react').ReactElement} The course grid section.
 */

// The sentinel chip label AND the "no category constraint" value, spelled once.
// In the URL that state is the ABSENCE of `?category=`, never the literal
// `'All'`, which is why `selectCategory` maps this value to `''` on the way out
// and `resolveActiveCategory` maps `''` back to it on the way in.
const ALL_CATEGORY = 'All'

// Two selections is the point at which comparing becomes meaningful, so it is
// also the point at which the control appears. Below it the control is not
// rendered at all rather than rendered disabled — see the JSDoc note on
// Button's `to`/`disabled` precedence.
const MIN_COMPARISON_SELECTIONS = 2

// Stable fallback for a non-array `items`, so the degenerate case does not
// allocate a fresh array on every render. Frozen because nothing may mutate it.
const EMPTY_LIST = Object.freeze([])

/**
 * Pluralise the listing's noun.
 *
 * Module-local (not exported) so this file's only export stays the component
 * (`react/only-export-components`).
 *
 * @param {number} count - How many courses the sentence is about.
 * @returns {string} `'course'` or `'courses'`.
 */
function courseNoun(count) {
  return count === 1 ? 'course' : 'courses'
}

/**
 * Decide which category selection drives the chip row.
 *
 * The page that owns `useCourseFilters` passes `values.category`, and it wins:
 * the chips then mirror the URL, so a shared or reloaded link renders the same
 * view. Anything else — no `values` at all, or a `category` that is not a
 * string — falls back to the local chip state that has always driven this
 * component, which is what keeps Home's featured grid and the three track pages
 * behaving exactly as before.
 *
 * @param {unknown} controlled - `values.category`, when the caller supplied it.
 * @param {string} local - The local `active` chip.
 * @returns {string} The category to treat as active, `ALL_CATEGORY` for none.
 */
function resolveActiveCategory(controlled, local) {
  if (typeof controlled !== 'string') return local

  // `''` is the hook's "no constraint" value, which is this row's `'All'` chip.
  return controlled === '' ? ALL_CATEGORY : controlled
}

/**
 * Decide what the grid actually renders.
 *
 * A supplied `results` array is rendered AS-IS: it is the hook's filtered and
 * sorted pass, and the hook owns `category` along with the other six
 * dimensions, so narrowing it again here would double-filter and drop courses
 * the visitor's own selection admits.
 *
 * @param {unknown} results - The caller's pre-derived list, if any.
 * @param {ReadonlyArray<object>} list - The array-checked `items`.
 * @param {string} activeCategory - The resolved chip selection.
 * @returns {ReadonlyArray<object>} The courses to lay out.
 */
function resolveVisible(results, list, activeCategory) {
  if (Array.isArray(results)) return results
  if (activeCategory === ALL_CATEGORY) return list

  return list.filter((course) => course.category === activeCategory)
}

/**
 * Compose the live result-count sentence.
 *
 * Reports the relationship between what is rendered and what the listing holds,
 * so "nothing matched" and "everything matched" are distinguishable both on
 * screen and when read aloud.
 *
 * @param {number} shown - How many courses are rendered.
 * @param {number} total - How many the listing holds before filtering.
 * @returns {string} The count sentence, with no trailing punctuation.
 */
function describeCount(shown, total) {
  if (total === 0) return 'No courses to show'
  if (shown === total) return `Showing ${total} ${courseNoun(total)}`

  return `Showing ${shown} of ${total} ${courseNoun(total)}`
}

/**
 * Compose the comparison clause appended to the count sentence.
 *
 * Silent below two selections, because the first selection is already announced
 * by the card toggle's own `aria-pressed` and a second announcement of the same
 * event would be noise. From two upward it reports the count — which is also
 * when the "Compare selected" control appears, so the announcement explains the
 * new control — and at the cap it reports the `N of N` state.
 *
 * Deliberately count-DERIVED and instruction-free: the cap's "remove one to add
 * another" wording is authored once in `src/lib/states.js` and reaches the
 * visitor as the refused toggle's description on the card. Restating it here
 * would be the same label authored in two places, which is exactly the drift
 * BUG 1 is about.
 *
 * @param {number} count - How many courses are selected for comparison.
 * @param {boolean} isFull - Whether the three-course cap has been reached.
 * @returns {string} The clause, or `''` when there is nothing to report.
 */
function describeSelection(count, isFull) {
  if (count < MIN_COMPARISON_SELECTIONS) return ''
  if (isFull) return `. ${count} of ${count} courses selected for comparison`

  return `. ${count} courses selected for comparison`
}

export default function CourseGrid({
  items = courses,
  showFilter = false,
  ctaTo,
  ctaLabel,
  values,
  onChange,
  onClearAll,
  results,
  resultCount,
  activeCount,
  className,
  ...props
}) {
  // Selected category chip; `'All'` (the default) shows every course. This is
  // the ONLY filter state this component owns, and it is the UNCONTROLLED
  // fallback: it is ignored while the caller supplies `values.category`, whose
  // owner is `useCourseFilters` in `src/pages/Courses.jsx`.
  const [active, setActive] = useState(ALL_CATEGORY)

  // Single, unconditional, top-level reveal hook (satisfies react/rules-of-hooks):
  // `ref` attaches to the grid; `inView` gates the framer-motion stagger reveal.
  const { ref, inView } = useScrollReveal()
  // Synchronous, SSR-safe read of prefers-reduced-motion (plain helper, not a
  // hook). When true the grid mounts with `initial={false}` — cards appear at
  // their final state with no reveal animation at all (WCAG 2.3.3).
  const reduce = prefersReducedMotion()

  // The shared, module-level comparison store — the SAME value every CourseCard
  // in this grid reads, which is what lets this control and those toggles change
  // together in one interaction. Called unconditionally and above every branch,
  // like the hooks before it.
  const { slugs: comparedSlugs, isFull: comparisonFull, shareHref } = useComparison()

  // Defensive: a non-array `items` renders the "nothing listed yet" state rather
  // than throwing on `.map`, matching how every other surface in this codebase
  // treats a collection prop it does not own.
  const list = Array.isArray(items) ? items : EMPTY_LIST

  // Categories are derived from the CURRENT items (preserving source order) so a
  // pre-filtered `items` prop only offers categories it actually contains.
  const categories = [ALL_CATEGORY, ...Array.from(new Set(list.map((c) => c.category)))]

  const selection = values && typeof values === 'object' ? values : null
  const activeCategory = resolveActiveCategory(selection ? selection.category : undefined, active)

  // Narrow to the active category; `'All'` passes everything through. A supplied
  // `results` list replaces this pass entirely.
  const visible = resolveVisible(results, list, activeCategory)

  // The announced count is the length of what is actually rendered, never a
  // separately supplied number, so the announcement cannot disagree with the
  // grid. `resultCount` is still honoured where it is genuinely needed: the
  // mobile sheet's footer, where the grid is hidden behind the sheet.
  const shown = visible.length
  const liveLabel = `${describeCount(shown, list.length)}${describeSelection(
    comparedSlugs.length,
    comparisonFull,
  )}`

  // Label carries the count so the control is self-describing; at the cap it
  // reads "3 of 3 selected", which discloses the limit BEFORE a fourth card's
  // toggle is attempted. Both numbers come from the store, so the cap size is
  // never restated as a literal here.
  const compareLabel = comparisonFull
    ? `${comparedSlugs.length} of ${comparedSlugs.length} selected`
    : `Compare selected (${comparedSlugs.length})`

  /**
   * Activate a category chip.
   *
   * Writes the local state first so the uncontrolled grids keep working, then
   * makes ONE batched write through the hook's `setValue` for the controlled
   * ones. `'All'` is sent as `''`, which the hook turns into a removed
   * parameter rather than a sentinel in the URL.
   *
   * @param {string} category - The chip's category, or `ALL_CATEGORY`.
   * @returns {void}
   */
  function selectCategory(category) {
    setActive(category)
    if (typeof onChange === 'function') {
      onChange('category', category === ALL_CATEGORY ? '' : category)
    }
  }

  /**
   * Clear every applied filter.
   *
   * The no-match empty state's action and the filter surface's own clear-all
   * reach the SAME `onClearAll`, so there is one code path that clears
   * everything. The local reset runs either way, which is what makes the action
   * work on a grid that is not wired to the hook.
   *
   * @returns {void}
   */
  function clearAllFilters() {
    setActive(ALL_CATEGORY)
    if (typeof onClearAll === 'function') onClearAll()
  }

  // Composed once and placed by exactly one of the two layout branches below, so
  // the grid, its reveal ref and both empty states have a single authored copy.
  let body
  if (shown > 0) {
    body = (
      <motion.div
        ref={ref}
        variants={staggerContainer}
        initial={reduce ? false : 'hidden'}
        animate={inView ? 'visible' : 'hidden'}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {visible.map((course) => (
          <motion.div key={course.slug} variants={fadeUp} className="h-full">
            <CourseCard
              course={course}
              // `ctaTo` is a string OR a function `(course) => path`. The three
              // category landing pages pass the FUNCTION form to re-point every
              // card at `/admission?course=<Title>`, so this ternary is load
              // bearing — collapsing it to `to={ctaTo}` would silently send
              // three pages' cards to the string "(c) => …".
              to={typeof ctaTo === 'function' ? ctaTo(course) : ctaTo}
              ctaLabel={ctaLabel}
            />
          </motion.div>
        ))}
      </motion.div>
    )
  } else if (list.length === 0) {
    // CASE 1 — the listing itself holds no records. Nothing to clear, so the
    // next action is to ask the institute rather than to widen a search.
    //
    // BLITZY [TOKEN-SNAP]: the brief suggested `text-muted-foreground`, but the
    // @theme (src/index.css) defines only `--color-muted` (no `-foreground`
    // alias), so muted copy resolves to `text-muted` (#475569, ~7.5:1 on white
    // — AA pass) to keep the class token-backed rather than dead. That class is
    // now applied inside `EmptyState` and on the count row below; the reasoning
    // is kept here so the non-existent alias is not re-introduced.
    body = (
      <EmptyState
        tone="neutral"
        icon={FaRegFolderOpen}
        // h3 keeps the outline h1 -> h2 (the page's section heading) -> h3,
        // exactly the level the CourseCard titles it replaces occupy.
        headingAs="h3"
        className="max-w-3xl"
        title="No courses are listed yet"
        description="There are no course records to show in this listing. Contact CIBLE to ask which programmes are running and when the next batch starts."
        action={<Button to="/contact">Contact CIBLE</Button>}
      />
    )
  } else {
    // CASE 2 — the listing has records but the applied choices admit none of
    // them. Different cause, different next action: clear or widen, never
    // "contact us because there is nothing here".
    body = (
      <EmptyState
        tone="neutral"
        icon={FaSearchMinus}
        headingAs="h3"
        className="max-w-3xl"
        title="No course matches the current filters"
        description={`None of the ${list.length} ${courseNoun(
          list.length,
        )} in this listing match every choice applied. Removing the narrowest choice widens the search, or clear them all to see the full list again.`}
        action={
          <>
            <Button type="button" onClick={clearAllFilters}>
              Clear all filters
            </Button>
            <Button variant="outline" to="/contact">
              Ask about a course
            </Button>
          </>
        }
      />
    )
  }

  return (
    <div className={cn('flex flex-col gap-8', className)} {...props}>
      {showFilter ? (
        <div
          role="group"
          aria-label="Filter courses by category"
          className="flex flex-wrap justify-center gap-2"
        >
          {categories.map((cat) => (
            <Button
              key={cat}
              type="button"
              variant={activeCategory === cat ? 'primary' : 'outline'}
              size="sm"
              aria-pressed={activeCategory === cat}
              onClick={() => selectCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      ) : null}

      {showFilter ? (
        // The delegated control surface beside the results. `CourseFilters`
        // switches itself between the `lg:block` panel and the below-`lg` bottom
        // sheet, so this split only has to give the panel a column: a quarter of
        // the measure, not shrinking, with the results column free to take the
        // rest. `min-w-0` on that column is what lets the grid inside it shrink
        // instead of pushing the row wider than the container.
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <CourseFilters
            courses={list}
            values={values}
            onChange={onChange}
            onClearAll={onClearAll}
            resultCount={Number.isFinite(resultCount) ? resultCount : shown}
            activeCount={activeCount}
            className="lg:w-1/4 lg:shrink-0"
          />

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {/* The result-count row: the listing's ONE polite region, plus the
                only visible route into `/compare`. Rendered for the whole
                lifetime of a filterable grid — a live region has to be in the
                DOM before its text changes to be announced at all — and it
                wraps rather than overflowing at 320px. */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="text-xs text-muted"
              >
                {liveLabel}
              </p>

              {comparedSlugs.length >= MIN_COMPARISON_SELECTIONS ? (
                <Button
                  to={shareHref}
                  variant="outline"
                  size="sm"
                  // At the cap the visible label is a state ("3 of 3 selected"),
                  // so the accessible name restores the link's purpose while
                  // still containing the visible text (WCAG 2.5.3). Below the
                  // cap the label already says what activating it does.
                  aria-label={comparisonFull ? `Compare selected — ${compareLabel}` : undefined}
                >
                  {compareLabel}
                </Button>
              ) : null}
            </div>

            {body}
          </div>
        </div>
      ) : (
        body
      )}
    </div>
  )
}
