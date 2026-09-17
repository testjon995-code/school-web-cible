/**
 * Search — the CIBLE School of Language site-search results page (route `/search`).
 *
 * The full-page counterpart to the header suggestion panel: one free-text
 * field, and every match across the site grouped by category. It is lazy-loaded
 * by the application route table in `src/App.jsx`
 * (`lazyWithRetry(() => import('./pages/Search.jsx'))`,
 * `<Route path="search" element={<Search />} />`) and rendered inside the
 * shared `<Layout>`, so this module renders ONLY page content — the persistent
 * Navbar, Footer and floating conversion widgets belong to the layout shell.
 * This module registers no route of its own.
 *
 * ── WHY THE STATIC `search.js` IMPORT IS CORRECT HERE ─────────────────────
 * `src/lib/search.js` is imported STATICALLY at the top of this file, which is
 * the OPPOSITE of the rule that governs `GlobalSearch.jsx`, and the difference
 * is entirely about what mounts eagerly:
 *   • `GlobalSearch` is rendered by the ALWAYS-MOUNTED `Navbar`, so a static
 *     import there would pull `search.js` — and with it every content module —
 *     into the ENTRY chunk, which is the opposite of the intent. `Navbar`
 *     therefore loads it through an explicit dynamic `import()` state machine.
 *   • THIS module is itself loaded through `lazyWithRetry`, so a static import
 *     lands in the `/search` ROUTE chunk, exactly where it belongs. Nothing is
 *     gained by wrapping it in `React.lazy`, a dynamic `import()` or a second
 *     import state machine, and doing so would add machinery for no benefit.
 * `search.js` appearing in both the `GlobalSearch` chunk and the `Search` route
 * chunk — or being hoisted by Vite into a chunk they share — is expected and is
 * not something to prevent.
 *
 * ── THE SINGLE `?q=` PARAMETER ────────────────────────────────────────────
 * One parameter, `q`, single free text, read with `URLSearchParams.get`. It is
 * the ONLY parameter this route reads or writes, and it collides with nothing:
 * the site's other deep links are `course` on `/admission` and `event` on
 * `/contact`. Two forms of the query text exist on purpose:
 *   • the RAW value drives the text field, so a trailing space can be typed
 *     (trimming the field's own value would make a multi-word query
 *     impossible to enter), and
 *   • a TRIMMED copy drives matching, the result count and the choice of empty
 *     branch, so `?q=%20` behaves exactly like `?q=`.
 * Every write — a keystroke, submitting the form, or clearing — composes the
 * COMPLETE next parameter set and performs ONE batched
 * `setSearchParams(next, { replace: true, preventScrollReset: true })`:
 * `replace` so a typing session does not fill the back stack,
 * `preventScrollReset` so a keystroke does not jump the page to the top, and
 * batched because the functional-updater form does not queue within a tick in
 * react-router 7.18.1. A write that would produce the identical query string is
 * skipped outright, so re-submitting an unchanged query costs no navigation.
 * A very long, empty or exotic `q` cannot throw: `searchAll` normalises its own
 * argument and returns every group empty for anything unusable, and the index
 * is roughly fifty-five records of pre-normalised strings, so the linear pass
 * costs microseconds — no debounce, no worker and no fuzzy-match dependency is
 * warranted, and none is used.
 *
 * ── WHY THE FIELD KEEPS A LOCAL MIRROR OF `?q=` ───────────────────────────
 * The field is deliberately NOT bound straight to the parameter, and that is a
 * correctness requirement rather than a preference. `src/App.jsx` renders a
 * CONTROLLED `<Routes location={displayLocation}>` whose location is advanced
 * inside `startTransition`, and react-router republishes that overridden
 * location to every descendant through its own `LocationContext` — so
 * `useSearchParams` here reports the COMMITTED location, which lags the address
 * bar by one transition. An input bound directly to it re-renders with the
 * PREVIOUS `q` immediately after a keystroke and snaps the just-typed character
 * away: measured in Chrome against this page, typing "english" with no
 * inter-key delay ended at `?q=h`, and even 120 ms per character ended at
 * `?q=eglish`. Anything typed faster than roughly 200 ms per character was
 * silently lost.
 * `draft` — local state seeded from the parameter on mount — is therefore the
 * field's value and the text the results, the count and the empty branches are
 * derived from, while `?q=` remains the shareable, reloadable record of it and
 * is still written on every keystroke. The two are reconciled by ONE effect
 * that adopts the parameter only when it changed for a reason this page did not
 * cause — a fresh navigation to `/search?q=…` arriving while the page stays
 * mounted, such as a second search from the header — which it recognises by
 * remembering the values it wrote itself and ignoring those when they arrive
 * late. Do not "simplify" this back to `value={searchParams.get('q')}`; that is
 * the defect above.
 *
 * ── WHERE A RESULT GOES IS NOT THIS FILE'S DECISION ───────────────────────
 * Each row navigates to `record.href` EXACTLY as `search.js` produced it. That
 * module is the single authority on result destinations and this page never
 * re-derives, rewrites or "fixes" an href: courses → `/courses/<slug>`, events
 * → `/events/<slug>`, pages → their own path, articles → `/blog#post-<slug>`,
 * faculty → `/faculty#faculty-<slug>`, FAQs → `/faq#faq-<id>`, with the three
 * fragment forms degrading to the bare listing page when a record carries no
 * identifier. The three fragments exist because two of the six groups have NO
 * per-record route and are not being given one — `BlogCard` is deliberately
 * non-interactive (the route table has no `/blog/:slug` and its former "Read
 * more" control was removed as a QA fix) and faculty members have no detail
 * page — so the destination pages (`Blog.jsx`, `Faculty.jsx`, `Faq.jsx`) own
 * the hash-reveal behaviour and this page only has to link honestly. A result
 * row is a LINK, not a re-implemented card: no card gains a call to action it
 * does not have today.
 *
 * ── WHAT THIS SEARCH DOES NOT CLAIM ──────────────────────────────────────
 * The honest boundary is substring matching over in-repo content with one
 * title-prefix relevance boost, and nothing more. Accordingly this page carries
 * no spelling correction and no alternative-query prompt; no popularity,
 * frequency or recency ordering of any kind; no relevance percentage and no
 * fabricated total (the number shown is the length of the same pass that
 * produced the rows on screen); no query logging, no analytics and no
 * persistence of the query anywhere beyond the URL itself — nothing here
 * touches `localStorage` or `sessionStorage`, and the one storage key this
 * work introduces belongs to saved courses, not to search; and nowhere in the
 * copy is a backend search service, machine learning or any per-visitor
 * tailoring implied, because none of that exists. The prohibited marketing
 * adjectives are not even spelled out here: an automated copy audit greps this
 * file for them, and a source comment quoting them would read as a false
 * positive.
 *
 * ── HEAD TREATMENT: `noindex`, NO CANONICAL, NO JSON-LD ───────────────────
 * `/search` is a control-reachable utility route whose content is entirely
 * query-derived, so it is one of the three routes excluded from the index:
 *   • `noindex` is passed to the canonical {@link Seo} component, which emits
 *     `<meta name="robots" content="noindex, follow">` — `Seo` is the single
 *     noindex mechanism in the codebase and no page hand-rolls a Helmet block.
 *   • NO `canonical` is supplied, so `Seo`'s conditional rule emits neither a
 *     canonical `<link>` nor an `og:url`, exactly as it already does for
 *     `NotFound.jsx`.
 *   • NO structured data at all is emitted — not even BreadcrumbList. Markup on
 *     a page excluded from the index has no consumer, so `<StructuredData>` is
 *     deliberately absent from this module; that is the decision, not an
 *     omission. It is also what keeps this page clear of the rule that a page
 *     carrying `FAQPage` markup must not present the same content as a
 *     search-results listing — FAQ questions appear here as result rows, so FAQ
 *     markup must never be emitted from this route.
 * The VISIBLE breadcrumb trail still renders, from the module-local `crumbs`
 * array below. `/search` is correspondingly absent from `public/sitemap.xml`,
 * while `public/robots.txt` deliberately stays `Allow: /` — disallowing a
 * `noindex` route would stop a crawler ever seeing the directive.
 *
 * ── THE TWO EMPTY BRANCHES ───────────────────────────────────────────────
 * Both render through the shared {@link EmptyState} primitive with
 * `tone="neutral"`, and each answers WHAT HAPPENED and WHAT TO DO NEXT. A bare
 * `/search` never renders a blank results region:
 *   1. NO QUERY   → a prompt naming what can be searched, built from
 *                   {@link SEARCH_GROUPS} filtered by the groups the index
 *                   actually contains, plus two ways to start browsing.
 *   2. NO RESULTS → nothing matched, with three next steps: clear the search,
 *                   browse the course catalogue, or contact the institute.
 *
 * Composition is reuse-first: `Container` owns width and gutters, `Card` is the
 * one panel surface, `Input` and `Button` carry the field and every action
 * (inheriting the 44px touch-target floor), `Breadcrumbs` the trail,
 * `SectionHeading` the page's single `<h1>` and `EmptyState` both empty states.
 * Group headings are plain `<h2>`s at the design system's "card and panel
 * title" step (`text-lg font-semibold`) rather than `SectionHeading`, whose
 * heading always renders at the page-title step (`text-3xl md:text-4xl`): six
 * page-sized titles stacked down a results page is precisely the "visually
 * overwhelming" outcome the brief rules out, and a plain sub-section `<h2>` is
 * the established pattern on `/courses` and `/events`.
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens from
 * `src/index.css`) — no new token, no new utility, no arbitrary `[…]` value,
 * and `src/index.css` carries no diff. Accessibility: exactly one `<h1>`;
 * group headings at `<h2>`; the field is labelled and sits in a
 * `role="search"` form; the result count is a polite live region so a
 * keystroke's outcome is announced without moving focus; result rows are a real
 * list of links whose focus ring comes from the single global `:focus-visible`
 * rule; and every interactive target clears 44px. Clearing the search returns
 * focus to the field, because the control that performed it unmounts with the
 * state it cleared and would otherwise drop focus to the document body.
 *
 * @returns {import('react').ReactElement} The rendered Search page content.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FaSearch, FaSearchMinus } from 'react-icons/fa'

import Seo from '../components/seo/Seo.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { SEARCH_GROUPS, buildIndex, countResults, searchAll } from '../lib/search.js'
import { cn } from '../lib/cn.js'

// Breadcrumb trail for this page. Module-local (never exported) and used ONLY
// by the visible <Breadcrumbs>: unlike every indexable route, this page emits
// no BreadcrumbList JSON-LD, because it is noindex (see the head-treatment note
// in the module JSDoc). Shape: { name, path }.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Search', path: '/search' },
]

// The single query-string parameter this route reads and writes. Named once so
// the reader and the three writers cannot drift apart.
const QUERY_PARAM = 'q'

// How much of the visitor's query is echoed back in the result count and in the
// no-results heading. The text is already overflow-safe (EmptyState breaks long
// words and this page's count line wraps), so this is about readable copy
// rather than layout: a pasted paragraph should not become a heading.
const QUERY_ECHO_LIMIT = 60

// Row surface for a single result: a full-width link that is comfortable to
// tap (>=44px) and wraps long labels instead of overflowing. The hover colour
// shift is an addition to — never a substitute for — the row being a real
// link, so meaning is not carried by colour alone (WCAG 1.4.1). The focus ring
// is inherited from the global `:focus-visible` rule in src/index.css and is
// deliberately not re-declared here.
const rowLink =
  'flex min-h-11 flex-col justify-center gap-1 py-3 text-foreground transition-colors duration-200 hover:text-primary-600'

/**
 * Clamp a value for DISPLAY only, appending an ellipsis when it is shortened.
 *
 * Applied to the echoed query in the count line and the no-results heading. The
 * value used for matching is never clamped — this only keeps a pasted wall of
 * text from being rendered back as a heading.
 *
 * @param {string} value The text to echo.
 * @param {number} [limit=QUERY_ECHO_LIMIT] Maximum characters to keep.
 * @returns {string} The value, or its first `limit` characters plus `…`.
 */
function clampForDisplay(value, limit = QUERY_ECHO_LIMIT) {
  if (typeof value !== 'string') return ''
  if (value.length <= limit) return value
  return `${value.slice(0, limit).trimEnd()}…`
}

/**
 * Join group labels into a readable sentence fragment: `'A, B and C'`.
 *
 * The labels come from {@link SEARCH_GROUPS} rather than being retyped as
 * literal copy, so the two empty states can never name a category the index
 * does not carry. Labels keep their authored capitalisation (`'FAQs'` must not
 * be lowercased), so the fragment is written into copy that frames them as the
 * site's sections.
 *
 * @param {string[]} labels Ordered group labels.
 * @returns {string} The joined fragment, or `''` when there are no labels.
 */
function formatGroupList(labels) {
  if (!labels.length) return ''
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}

/**
 * Pluralise a real, counted number of results.
 *
 * The number is always the length of the pass that produced the rows on screen
 * — there is no estimate, no rounding and no fabricated total.
 *
 * @param {number} total How many results are rendered.
 * @returns {string} e.g. `'1 result'`, `'12 results'`, `'No results'`.
 */
function resultCountLabel(total) {
  if (total === 0) return 'No results'
  return total === 1 ? '1 result' : `${total} results`
}

function Search() {
  // Every hook is declared unconditionally at the top level (oxlint
  // `react/rules-of-hooks` is an error).
  const [searchParams, setSearchParams] = useSearchParams()
  // Namespaces the per-group heading ids so two instances of this page (or any
  // other id generated on the same document) can never collide.
  const groupHeadingId = useId()
  // The native <input>, so clearing can hand focus back to it (see handleClear).
  const fieldRef = useRef(null)

  // What the COMMITTED location's `?q=` holds. This trails the address bar by
  // one transition under the shell's controlled `<Routes location>` — which is
  // exactly why it seeds the field rather than being the field's value. See the
  // local-mirror note in the module JSDoc.
  const urlQuery = searchParams.get(QUERY_PARAM) ?? ''

  // The live field value: seeded from the URL on mount, updated on every
  // keystroke, and mirrored back into `?q=` by `writeQuery` below.
  const [draft, setDraft] = useState(urlQuery)

  // Two records of this page's own writes, so a late echo of our own typing is
  // never mistaken for someone else changing the URL:
  //   • `lastWritten` is the value we last ASKED `?q=` to hold, and is what the
  //     no-op guard in `writeQuery` compares against. Comparing against the
  //     committed `searchParams` instead would consult a stale string and could
  //     skip a write the address bar genuinely needs.
  //   • `ownWrites` is every value we have written since the URL last agreed
  //     with the field. The reconciliation effect skips those and adopts
  //     anything else, which is how an externally-arriving `?q=` wins.
  const lastWritten = useRef(urlQuery)
  const ownWrites = useRef(new Set([urlQuery]))

  // RAW drives the field, TRIMMED drives everything else — see the `?q=` note
  // in the module JSDoc for why both forms are necessary.
  const query = draft.trim()

  // The groups the index ACTUALLY carries, in canonical order. Filtering
  // `SEARCH_GROUPS` by what `buildIndex()` returned is what stops the two empty
  // states naming a category that has no records behind it — if a content
  // module were emptied, the prompt would stop promising that section rather
  // than inviting a search that cannot succeed. `buildIndex` is memoised for
  // the session inside `search.js`, so this costs one pass on first render and
  // nothing thereafter; the empty dependency array is correct because
  // build-time ESM content cannot change at runtime.
  const searchableGroups = useMemo(() => {
    const present = new Set(buildIndex().map((record) => record.group))
    return SEARCH_GROUPS.filter((group) => present.has(group.id))
  }, [])

  // 'Courses, Events, Faculty, Articles, FAQs and Pages' — composed from the
  // index rather than retyped as copy.
  const coverage = useMemo(
    () => formatGroupList(searchableGroups.map((group) => group.label)),
    [searchableGroups],
  )

  // The one derived pass, memoised on the query. `searchAll` always returns all
  // six group keys in canonical order, and returns every group empty for an
  // empty, whitespace-only or otherwise unusable query — so a bare `/search`
  // renders the prompt below rather than dumping the whole index.
  const groups = useMemo(() => searchAll(query), [query])
  // The count shown on screen is the length of that same pass, never a second
  // count and never an estimate.
  const total = useMemo(() => countResults(groups), [groups])
  // Only the groups with at least one match get a panel, so an empty heading is
  // impossible; the order is `SEARCH_GROUPS`', which is the same order the
  // header suggestion panel uses.
  const matchedGroups = useMemo(
    () => SEARCH_GROUPS.filter((group) => (groups[group.id] ?? []).length > 0),
    [groups],
  )

  /**
   * The route's only writer: compose the COMPLETE next parameter set and write
   * it once.
   *
   * `q` is the only parameter `/search` recognises, so the next set is built
   * from scratch and an unrecognised parameter someone appended by hand is
   * dropped on the first write rather than carried forward — the same
   * read-then-validate discipline every other deep link on this site follows.
   * A value identical to the one this page last wrote is skipped, so a submit
   * that changes nothing costs no navigation.
   */
  const writeQuery = useCallback(
    (next) => {
      // Remember the value before writing it, so the reconciliation effect
      // recognises it as ours whenever the committed location catches up.
      ownWrites.current.add(next)
      if (next === lastWritten.current) return
      lastWritten.current = next
      const nextParams = new URLSearchParams()
      if (next) nextParams.set(QUERY_PARAM, next)
      // One batched write. `replace` keeps a typing session out of the back
      // stack; `preventScrollReset` keeps the page from jumping to the top on
      // each keystroke. Never the functional-updater form: it does not queue
      // within a tick in react-router 7.18.1.
      setSearchParams(nextParams, { replace: true, preventScrollReset: true })
    },
    [setSearchParams],
  )

  const handleChange = useCallback(
    (event) => {
      const { value } = event.target
      // The field updates from state, NOT from the round trip through the URL —
      // the round trip is one transition behind and would drop the character.
      setDraft(value)
      writeQuery(value)
    },
    [writeQuery],
  )

  const handleClear = useCallback(() => {
    setDraft('')
    writeQuery('')
    // Both clear controls — the one under the field and the one inside the
    // no-results panel — unmount the moment the query empties, which would drop
    // focus to <body> and strand a keyboard user at the top of the tab order.
    // Focus goes back to the field, which is where clearing leaves the visitor.
    fieldRef.current?.focus()
  }, [writeQuery])

  /**
   * Results are live as the field is typed, so submitting has exactly two jobs:
   * stop the browser performing a native GET navigation that would reload the
   * whole application, and canonicalise `?q=` to the trimmed value — which the
   * equality guard in `writeQuery` turns into a no-op when it is already
   * canonical. The form exists for its `role="search"` semantics and for the
   * search key on a mobile keyboard, not to trigger the query.
   */
  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault()
      if (query !== draft) setDraft(query)
      writeQuery(query)
    },
    [draft, query, writeQuery],
  )

  /**
   * Reconcile the field with `?q=` — the ONE place the two can meet.
   *
   * Three cases, in order:
   *   1. They agree: the address bar has caught up, so nothing is in flight and
   *      the write history is reset to just this value. That is what lets any
   *      later external change be adopted immediately.
   *   2. They differ and the URL value is one WE wrote: it is our own keystroke
   *      arriving a transition late. Ignore it — adopting it is precisely the
   *      character-dropping defect described in the module JSDoc.
   *   3. They differ and we never wrote it: something outside this page changed
   *      `?q=` (a second search from the header, a history pop). Adopt it, so
   *      the field and the results follow the address bar.
   */
  useEffect(() => {
    if (urlQuery === draft) {
      lastWritten.current = urlQuery
      ownWrites.current = new Set([urlQuery])
      return
    }
    if (ownWrites.current.has(urlQuery)) return
    lastWritten.current = urlQuery
    ownWrites.current = new Set([urlQuery])
    setDraft(urlQuery)
  }, [urlQuery, draft])

  // Echoed back in the count line and the no-results heading. Clamped for
  // readability only; matching always uses the full query.
  const echoedQuery = clampForDisplay(query)

  return (
    <>
      {/* noindex, and deliberately NO canonical — so no canonical link and no
          og:url are emitted (see the head-treatment note above). The shared
          structured-data component is deliberately not rendered either: this
          route emits no JSON-LD at all. */}
      <Seo
        title="Search"
        noindex
        description="Search the CIBLE School of Language website — courses, events, faculty, articles, FAQs and pages, all from one field."
      />

      {/* Page header, the search field and the live result count */}
      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Site Search"
          title="Search CIBLE School of Language"
          subtitle="One field that looks across every section of this website. Nothing about your search is logged or stored."
        />

        <form role="search" onSubmit={handleSubmit} className="mt-8 max-w-3xl">
          <Input
            label="What are you looking for?"
            type="search"
            name={QUERY_PARAM}
            ref={fieldRef}
            value={draft}
            onChange={handleChange}
            // Kept short so the hint is not clipped by the single-line field at
            // a 320px viewport, where the input's inner width is ~254px.
            placeholder="Try a course or a topic"
            autoComplete="off"
            enterKeyHint="search"
            // The shared field is ~42px tall by default; this lifts it to the
            // 44px touch-target floor every other control on the page inherits
            // from Button, using the same `min-h-11` the Checkbox, RadioGroup
            // and Combobox rows use.
            inputClassName="min-h-11"
          />
          {draft ? (
            // The action row treatment shared with EmptyState and the form
            // result panels, so it wraps rather than overflows at 320px.
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={handleClear}>
                Clear search
              </Button>
            </div>
          ) : null}
        </form>

        {/*
          The result count, visible AND polite: one element does both jobs, so a
          keystroke's outcome is announced without a duplicate sr-only copy and
          without moving focus out of the field. It is always mounted — a live
          region added to the DOM at the same time as its text is unreliable —
          and renders an empty string with no margin when there is no query, at
          which point an empty block contributes no height. The shell's own
          route-title announcer keeps its single meaning and is not repurposed.
        */}
        <p
          aria-live="polite"
          aria-atomic="true"
          className={cn('text-sm text-muted', query && 'mt-6 max-w-3xl break-words')}
        >
          {query ? `${resultCountLabel(total)} for “${echoedQuery}”` : ''}
        </p>
      </Container>

      {/* Results, or one of the two empty branches — never a blank region */}
      <Container as="section" className="pb-16 md:pb-20">
        {!query ? (
          <EmptyState
            tone="neutral"
            icon={FaSearch}
            headingAs="h2"
            className="max-w-3xl"
            title="Start typing to search"
            description={
              coverage
                ? `This looks through ${coverage}, matching the words in their titles and text. Enter a word or two above — or start from the catalogue.`
                : 'Enter a word or two above to search this website.'
            }
            action={
              <>
                <Button to="/courses">Browse courses</Button>
                <Button variant="outline" to="/events">
                  See events
                </Button>
              </>
            }
          />
        ) : total === 0 ? (
          <EmptyState
            tone="neutral"
            icon={FaSearchMinus}
            headingAs="h2"
            className="max-w-3xl"
            title={`No results for “${echoedQuery}”`}
            description={
              coverage
                ? `Nothing in ${coverage} matched that search. Try a shorter or more general word, browse the full course catalogue, or contact us and we will point you to the right place.`
                : 'Nothing on this website matched that search. Try a shorter or more general word, or contact us and we will point you to the right place.'
            }
            action={
              <>
                <Button type="button" variant="outline" onClick={handleClear}>
                  Clear search
                </Button>
                <Button to="/courses">Browse courses</Button>
                <Button variant="secondary" to="/contact">
                  Contact us
                </Button>
              </>
            }
          />
        ) : (
          <div className="flex max-w-3xl flex-col gap-6">
            {matchedGroups.map((group) => {
              const rows = groups[group.id] ?? []
              const headingId = `${groupHeadingId}-${group.id}`
              return (
                <Card
                  key={group.id}
                  as="section"
                  aria-labelledby={headingId}
                  // A results panel is not itself interactive, so Card's hover
                  // elevation is neutralised — the same override EmptyState
                  // applies, for the same reason.
                  className="hover:shadow-none"
                >
                  <h2
                    id={headingId}
                    className="flex flex-wrap items-baseline gap-x-3 text-lg font-semibold text-foreground"
                  >
                    {group.label}
                    <span className="text-sm font-normal text-muted">
                      {resultCountLabel(rows.length)}
                    </span>
                  </h2>
                  {/* `divide-y` draws a hairline BETWEEN rows only, so there is
                      never a divider after the last item. */}
                  <ul className="mt-2 divide-y divide-border">
                    {rows.map((record) => (
                      <li key={record.id}>
                        {/*
                          `record.href` is rendered exactly as `search.js`
                          produced it — including the `#post-`, `#faculty-` and
                          `#faq-` fragment forms, whose reveal behaviour belongs
                          to the destination page. This page never re-derives a
                          destination.
                        */}
                        <Link to={record.href} className={rowLink}>
                          <span className="break-words font-medium">{record.label}</span>
                          {record.context ? (
                            <span className="break-words text-xs text-muted">{record.context}</span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              )
            })}
          </div>
        )}
      </Container>
    </>
  )
}

export default Search
