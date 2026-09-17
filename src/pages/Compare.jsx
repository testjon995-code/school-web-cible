import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import Seo from '../components/seo/Seo.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ComparisonTable from '../components/common/ComparisonTable.jsx'
import { useComparison } from '../hooks/useComparison.js'
import { courses } from '../data/courses.js'
import { cn } from '../lib/cn.js'

/**
 * Compare — CIBLE School of Language course comparison (route `/compare`, F2).
 *
 * The destination of the catalogue's "Compare selected (n)" control. It renders
 * the comparison working set — at most {@link COMPARISON_CAP} courses — side by
 * side, and it is the shareable artifact the feature is named for: the whole
 * comparison travels in one `?courses=a,b,c` link.
 *
 * Lazy-loaded by the application route table in `src/App.jsx`
 * (`lazyWithRetry(() => import('./pages/Compare.jsx'))`, `<Route path="compare"
 * …>`) and rendered inside the shared `<Layout>`, so this module renders ONLY
 * page content — the Navbar, Footer and floating conversion widgets belong to
 * the layout shell, and `Container` owns the width and the gutters.
 *
 * ## THIS PAGE DOES NOT PARSE THE URL — `useComparison` OWNS IT
 *
 * `src/hooks/useComparison.js` is the single owner of the `?courses=`
 * parameter, in both directions, and the reason is a requirement rather than a
 * preference: **a shared link and a locally built selection must be
 * indistinguishable**. On read the hook splits on commas, trims, drops empties,
 * drops any slug absent from the catalogue, de-duplicates keeping the FIRST
 * occurrence, and takes the first three — so an over-cap link loads a valid
 * three-course comparison instead of failing, and URL order is preserved
 * because it is the order the sharer chose. On write, every `remove` and
 * `clear` performed here rewrites the parameter through ONE batched
 * `setSearchParams(next, { replace: true, preventScrollReset: true })`, so the
 * address stays copyable mid-session without filling the back stack or jumping
 * the page to the top.
 *
 * This page therefore consumes `slugs` and resolves it against
 * `src/data/courses.js`. It re-implements none of those rules, and the one
 * place it touches the query string at all is the deliberately read-only
 * presence check in {@link hasRequestedSelection} — see below.
 *
 * `?courses=` is also the ONE comma-joined parameter in this work; every other
 * multi-value parameter repeats its key. That is intentional (the value is a
 * short ordered sequence read as a single unit, and `?courses=a,b,c` is what
 * people share), so it must not be "fixed" to repeated keys.
 *
 * ## THE TWO EMPTY STATES, AND HOW THEY ARE TOLD APART
 *
 * This route owns two distinct empty cases, and they must not share copy:
 *
 *   1. **Nothing selected** — no comparison has been built (a cold load of a
 *      bare `/compare`, or a reload that cleared the in-memory set). The state
 *      explains that courses are added from the catalogue, up to three.
 *   2. **A shared link whose slugs are ALL unknown** — the link refers to
 *      courses that are no longer listed. The state says exactly that and
 *      offers a new comparison.
 *
 * Both arrive as an empty `slugs` array, because the hook drops unknown slugs,
 * and the hook exposes no flag that separates them — its own documentation
 * assigns that job here. So this page reads the raw `courses` value ONCE,
 * READ-ONLY, purely to detect that a selection was *expressed*, and never to
 * derive the working set (which remains entirely the hook's output). Neither
 * case may render an empty table or an unexplained empty container, and both
 * use `tone="neutral"`: an absence is not a failure.
 *
 * On a bare `/compare` with no parameter the in-memory set is used as-is —
 * arriving from a card selection shows that selection. The accepted trade-off,
 * documented rather than papered over: the working set has no storage key (that
 * keeps the application's device-local storage surface to exactly one key and
 * its privacy disclosure to one accurate statement), so **a full page reload
 * clears it** and the `?courses=` URL is the durable form. The nothing-selected
 * copy says so, because "I reloaded and my comparison vanished" is precisely
 * the visitor this state has to explain itself to.
 *
 * ## HEAD TREATMENT: THE STRICTEST OF THE NEW ROUTES
 *
 * A route supplies a canonical and joins `public/sitemap.xml` if and only if
 * its bare URL renders stable, repository-authored, crawler-meaningful content.
 * This one renders only an empty state, and its content is entirely
 * query-determined. Hence, deliberately:
 *
 *   - `noindex` is passed to `Seo`, emitting `noindex, follow`.
 *   - NO `canonical` is supplied, so `Seo`'s conditional rule emits neither a
 *     canonical `<link>` nor an `og:url` — exactly as the catch-all 404 behaves.
 *     One must not be added "for completeness": it would assert a canonical URL
 *     for a view that has none.
 *   - NO JSON-LD of any kind is emitted — not even `BreadcrumbList`.
 *     `StructuredData` is intentionally not imported by this file, because
 *     structured data on a page excluded from the index has no consumer. That
 *     is the decision, not an omission.
 *   - The route is absent from the sitemap.
 *
 * The **visible** breadcrumb trail still renders: `Breadcrumbs` keys on
 * `item.path` and renders the last entry as a non-link `<span
 * aria-current="page">`, so the final crumb carries a `path` even though it is
 * not a link.
 *
 * ## WHAT THIS PAGE RENDERS, AND WHAT IT DELIBERATELY DOES NOT
 *
 * The comparison itself — the three-slot header naming each selected course
 * with its "View course" link and its remove control, the transposed per-course
 * cards below `md`, the attribute rows from `md`, and the collapsed long
 * attributes — is ALL owned by {@link ComparisonTable}. This page composes it
 * once and adds nothing on top of it. In particular this page renders **no
 * per-course remove control and no per-course `/courses/:slug` link**, and that
 * is load-bearing on two counts:
 *
 *   - Duplicating them would put two controls for one action on one screen, and
 *     the table's column header is already the three-slot header above the
 *     attribute rows.
 *   - The label, icon and button variant for the selection state belong to
 *     `compareState()` in `src/lib/states.js`, which the table and the course
 *     card both read so the same state cannot be described two different ways.
 *     A remove control authored at this call site could not reach that
 *     authority, so it would re-introduce exactly the card-versus-detail drift
 *     that single authority exists to eliminate.
 *
 * What this page does own is the SET-level frame around the table: the count and
 * remaining capacity, the route back to the catalogue to add another course, and
 * the clear-all. The cap is three, and the refusal of a fourth belongs to the
 * course card (which keeps its toggle focusable with `aria-disabled="true"` and
 * announces what `toggle` hands back) — so no second refusal path is built
 * here. Because adding happens on the catalogue and not on this route, the
 * capacity line states the position without repeating the card's refusal copy.
 *
 * ## ACCESSIBILITY AND DESIGN SYSTEM
 *
 * Outline: exactly one `<h1>` (the page title through `SectionHeading as="h1"`),
 * this page's own summary heading at `<h2>`, and the per-course titles at
 * `<h3>` inside the table — so no level is skipped. The empty states are handed
 * `headingAs="h2"` for the same reason, since they sit directly under the
 * `<h1>`. Every control is a `Button`, so the 44px minimum hit area and the
 * global `:focus-visible` ring come from its base class and are never
 * re-declared. The count line is a page-local `role="status"`, so removing a
 * course announces the new count politely without touching the shell's
 * title-mirroring announcer, which keeps its single meaning. No table ARIA and
 * no landmark is invented: the table's native semantics carry it, and the
 * summary is named by its visible heading rather than by a redundant region.
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens from
 * `src/index.css`) on the project's spacing scale, composed through `cn()` so a
 * caller utility would merge last. Zero new tokens, zero new named utilities
 * and no arbitrary `[…]` value — `src/index.css` carries no diff.
 *
 * @module pages/Compare
 */

/**
 * The comparison cap, mirroring the module-private `MAX_COMPARISON` in
 * `src/hooks/useComparison.js` (and `MAX_COLUMNS` in `ComparisonTable`, which
 * mirrors it defensively for the same reason).
 *
 * Held locally because the hook keeps the number private and exposes `isFull`
 * as the question consumers actually ask. It is used here for the numeric slot
 * count only; every BEHAVIOURAL statement on this page is derived from the
 * hook's `isFull` rather than from this constant, so the two cannot disagree
 * about whether more courses may be added.
 *
 * @type {number}
 */
const COMPARISON_CAP = 3

/**
 * The query-parameter name, matching the one `useComparison` owns.
 *
 * Declared here solely for the read-only presence check in
 * {@link hasRequestedSelection}. This page never writes it.
 *
 * @type {string}
 */
const COURSES_PARAM = 'courses'

/**
 * The separator inside the parameter value — the one comma-joined parameter in
 * this work. Slugs are kebab-case by contract, so they can never contain it.
 *
 * @type {string}
 */
const SLUG_SEPARATOR = ','

/**
 * The catalogue route: where a comparison is built, and the next step every
 * state on this page offers. Written once so the destination cannot drift
 * between the populated view and the two empty ones.
 *
 * @type {string}
 */
const CATALOGUE_PATH = '/courses'

// Breadcrumb trail for this page. Module-local and never exported. Unlike the
// indexable routes, it feeds ONLY the visible <Breadcrumbs> — there is no
// BreadcrumbList JSON-LD on this route (see the head-treatment note above), so
// there is no second consumer to keep in lockstep. The last entry still needs a
// `path` because <Breadcrumbs> keys on it.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Courses', path: CATALOGUE_PATH },
  { name: 'Compare', path: '/compare' },
]

// The set-level summary surface: the established filter-panel treatment
// (`bg-surface` inside a `radius-2xl` hairline border), which is the same
// resting surface the empty states use, so the frame around the table reads as
// one family whether or not anything is selected. Held as a constant and
// composed with the element's own layout utilities through `cn()`, the way every
// multi-source class list in this codebase is built.
const SUMMARY_SURFACE_CLASSES = 'rounded-2xl border border-border bg-surface p-6'

/**
 * Whether a raw `?courses=` value expressed a selection at all.
 *
 * THE ONLY place this page looks at the query string, and it is READ-ONLY and
 * deliberately narrow: it answers "did this link ask for courses?" and nothing
 * else. It exists because the two empty states need different copy but arrive
 * identically — `useComparison` drops unknown slugs, so a link full of retired
 * slugs and a bare `/compare` both yield an empty `slugs` array, and the hook
 * exposes no flag separating them (its own documentation assigns the
 * distinction to this module). The working set is ALWAYS the hook's `slugs`;
 * this function never contributes to it, never validates against the catalogue
 * and never applies the cap.
 *
 * Presence is judged on the entries rather than on the string, so a value that
 * names nothing — `''`, `','`, `',,'` — correctly reads as "no selection
 * expressed" and gets the nothing-selected copy, while `'ghost-course'` reads
 * as a selection that no longer resolves.
 *
 * @param {unknown} raw - The value `URLSearchParams.get('courses')` returned.
 * @returns {boolean} True when at least one non-blank entry was requested.
 */
function hasRequestedSelection(raw) {
  if (typeof raw !== 'string') return false

  return raw.split(SLUG_SEPARATOR).some((entry) => entry.trim() !== '')
}

/**
 * Whether a record can actually be rendered as a comparison column.
 *
 * The test is deliberately the SAME one `ComparisonTable` applies when it
 * decides which records to render: a usable `slug` (the destination, the remove
 * target and the React key) and a usable `title` (the column's accessible
 * name). Aligning the two is what guarantees this page's count equals the
 * number of columns the table will draw — otherwise a record the table silently
 * dropped would leave the summary claiming a comparison above a table that
 * rendered `null`, which is the unexplained empty container this route must
 * never produce.
 *
 * @param {unknown} course - A candidate catalogue record.
 * @returns {boolean} True when the record is renderable as a column.
 */
function isRenderableCourse(course) {
  if (!course || typeof course !== 'object') return false

  const hasSlug = typeof course.slug === 'string' && course.slug.trim() !== ''
  const hasTitle = typeof course.title === 'string' && course.title.trim() !== ''

  return hasSlug && hasTitle
}

/**
 * Resolve the working-set slugs into catalogue records, in the hook's order.
 *
 * Order is preserved because it is meaningful — selection order locally, and the
 * sharer's order from a link — and the comparison columns are rendered in it.
 * A slug that resolves to nothing, or to a record that could not be rendered as
 * a column, is dropped rather than shown blank. In practice the hook guarantees
 * every slug resolves, so this is the defensive belt that keeps a catalogue edit
 * mid-session from producing an empty column; it also means an empty result here
 * is an honest signal to fall through to an empty state.
 *
 * @param {ReadonlyArray<string>} slugs - The working set, in order.
 * @returns {object[]} The renderable course records, in the same order.
 */
function resolveCourses(slugs) {
  const catalogue = Array.isArray(courses) ? courses : []

  return slugs
    .map((slug) => catalogue.find((course) => course && course.slug === slug))
    .filter((course) => isRenderableCourse(course))
}

/**
 * The capacity sentence that follows the count.
 *
 * Derived from the hook's `isFull` rather than from arithmetic on
 * {@link COMPARISON_CAP}, so the page and the hook cannot disagree about
 * whether another course may be added. At the cap it states the position and
 * stops: the refusal wording, and the advice to free a slot, belong to the
 * course card where the fourth selection is actually attempted.
 *
 * @param {number} remaining - Free slots, already clamped to zero or more.
 * @param {boolean} isFull - The hook's own "no room left" answer.
 * @returns {string} One complete sentence.
 */
function capacitySentence(remaining, isFull) {
  if (isFull) return 'All three comparison slots are in use.'
  if (remaining === 1) return 'You can add one more course from the catalogue.'

  return `You can add ${remaining} more courses from the catalogue.`
}

/**
 * The two empty states this route owns, with the copy that tells them apart.
 *
 * Kept as one map so the difference between them is visible in a single place
 * rather than buried in a branch, and so neither can quietly decay into the
 * other's wording. Both answer the two questions an empty state must answer —
 * WHAT HAPPENED (`title` plus `description`) and WHAT NEXT (`description`'s
 * closing instruction, realised by `actionLabel`) — and both are `neutral`,
 * because nothing has gone wrong in either case.
 *
 *   - `none` — no selection was ever expressed. It also explains the
 *     no-persistence trade-off, because a visitor whose reload just cleared a
 *     comparison arrives in exactly this state and deserves to know why it is
 *     empty and how to keep one next time.
 *   - `unlisted` — a link asked for courses that the catalogue no longer holds.
 *     It names that specifically instead of implying the visitor never chose
 *     anything.
 *
 * Page-level copy lives here rather than in `src/data/`, which holds the
 * institute's structured CONTENT (courses, events, faculty, FAQs); this is
 * interface wording for one route, and no other module consumes it.
 *
 * @type {Record<'none'|'unlisted', {title: string, description: string, actionLabel: string}>}
 */
const EMPTY_STATES = {
  none: {
    title: 'No courses added to comparison yet',
    description:
      'Add up to three courses from the catalogue — use the Compare control on any course card — and they will appear here side by side, attribute by attribute. A comparison is not saved on your device, so reloading the page clears it; copy this page’s address while courses are selected and the link keeps the whole comparison.',
    actionLabel: 'Browse courses',
  },
  unlisted: {
    title: 'Those courses are no longer listed',
    description:
      'This comparison link points to courses that are not in the catalogue any more, so there is nothing left to compare. Start a new comparison from the catalogue and pick up to three courses.',
    actionLabel: 'Start a new comparison',
  },
}

/**
 * The `/compare` route.
 *
 * See the module header for the URL ownership, the head treatment, the two
 * empty cases and the division of labour with `ComparisonTable`.
 *
 * @returns {import('react').ReactElement} The rendered comparison page content.
 */
function Compare() {
  // Every hook is called unconditionally at the top level, in a stable order,
  // with no early return above them — `react/rules-of-hooks` is an error here.
  // `useComparison` owns the working set AND the `?courses=` parameter.
  const { slugs, remove, clear, isFull } = useComparison()
  const [searchParams] = useSearchParams()

  // Resolved from the hook's output, never from the URL, and memoised on the
  // store's frozen list — which is referentially stable between real changes,
  // so this recomputes only when the working set actually changes.
  const selected = useMemo(() => resolveCourses(slugs), [slugs])

  // The ONE read-only look at the query string, and only to choose between the
  // two empty states. See hasRequestedSelection: it never derives the set.
  const requestedSelection = hasRequestedSelection(searchParams.get(COURSES_PARAM))

  const count = selected.length
  const remaining = Math.max(0, COMPARISON_CAP - count)
  const emptyState = requestedSelection ? EMPTY_STATES.unlisted : EMPTY_STATES.none

  return (
    <>
      {/* noindex, and deliberately NO canonical — so neither a canonical link
          nor an og:url is emitted for a view whose content is entirely
          query-determined. No <StructuredData> on this route at all. */}
      <Seo
        title="Compare Courses"
        description="Compare up to three CIBLE School of Language courses side by side — category, level, duration, learner goals and prerequisites — to see which one fits you best."
        noindex
      />

      {/* Page header */}
      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Courses"
          title="Compare Courses"
          subtitle="Put up to three CIBLE courses side by side and compare them attribute by attribute — category, level, duration, learner goals and prerequisites."
        />
      </Container>

      {/* The comparison, or the empty state that explains its absence */}
      <Container as="section" className="pb-16 md:pb-20">
        {count > 0 ? (
          <div className="flex flex-col gap-8">
            {/* The SET-level frame. The per-course header — each course's title,
                its "View course" link and its remove control — is rendered by
                ComparisonTable below, and is deliberately not repeated here. */}
            <div className={cn('flex flex-col gap-4', SUMMARY_SURFACE_CLASSES)}>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-foreground">Your comparison</h2>
                {/* Page-local polite region: removing a course updates this
                    sentence, so the new count is announced without touching the
                    shell's route-title announcer. */}
                {/* The noun agrees with the CAP, not the count — "1 of up to 3
                    courses" — so no pluralisation branch belongs here. */}
                <p role="status" className="text-sm leading-relaxed text-muted">
                  {`Comparing ${count} of up to ${COMPARISON_CAP} courses. ${capacitySentence(remaining, isFull)}`}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {/* At the cap the label stops inviting an addition that the card
                    would refuse, while still offering the catalogue. */}
                <Button to={CATALOGUE_PATH} variant="outline" size="sm">
                  {isFull ? 'Browse all courses' : 'Add another course'}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => clear()}>
                  Clear comparison
                </Button>
              </div>
            </div>

            {/* Owns both presentations, the per-course links and the remove
                controls. `remove` also rewrites `?courses=`. */}
            <ComparisonTable courses={selected} onRemove={remove} />
          </div>
        ) : (
          <EmptyState
            tone="neutral"
            headingAs="h2"
            title={emptyState.title}
            description={emptyState.description}
            action={<Button to={CATALOGUE_PATH}>{emptyState.actionLabel}</Button>}
          />
        )}
      </Container>
    </>
  )
}

export default Compare
