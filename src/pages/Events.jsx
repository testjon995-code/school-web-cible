/**
 * Events — CIBLE School of Language "Events & Workshops" page (route `/events`).
 *
 * Lists CIBLE's events as a responsive grid of the single canonical
 * {@link EventCard}, divided into the three lifecycle groups a visitor actually
 * asks about and narrowed by two secondary filters. It is lazy-loaded by the
 * application route table in `src/App.jsx`
 * (`const Events = lazyWithRetry(() => import('./pages/Events.jsx'))`,
 * `<Route path="events" element={<Events />} />`) and rendered inside the shared
 * `<Layout>`, so this module renders ONLY page content — the persistent Navbar,
 * Footer and floating conversion widgets are owned by the layout shell.
 *
 * ## The defect this page used to carry (BUG 1, AAP §0.11.1)
 *
 * It previously rendered `events.map(...)` — every record, in source order —
 * beneath a single visually-hidden `<h2>Upcoming events</h2>`, with NO date
 * comparison anywhere in the file. Three of the five authored records are
 * already in the past, so three concluded events were presented under a heading
 * that called them upcoming. That is the listing half of the card-versus-detail
 * inconsistency the defect names.
 *
 * The fix is structural rather than cosmetic: the group is DERIVED by
 * {@link partitionEvents}, exactly one group renders at a time, and the `<h2>`
 * names the group being rendered. A heading can no longer describe content the
 * section does not contain, because the heading and the records now read from
 * the same value.
 *
 * The other half of the defect — a finished event still offering "Register" or
 * a calendar export — belongs to {@link EventCard}, which derives its own
 * lifecycle and gates its own actions from `EVENT_LIFECYCLE`. It is deliberately
 * NOT re-gated here: one owner per state, so the card and its detail route
 * cannot come to disagree.
 *
 * ## The URL contract this page owns (AAP §0.5.2)
 *
 * | Parameter | Cardinality | Accepted values                                  |
 * | --------- | ----------- | ------------------------------------------------ |
 * | `when`    | single      | `'upcoming'` · `'past'` · `'undated'` (default)  |
 * | `type`    | single      | any `events[].type` literal actually present     |
 * | `q`       | single      | free text                                        |
 *
 * `type` is safe as a name on this route because the pre-existing `event`
 * parameter belongs to `/contact`, a different route, and the two never appear
 * together.
 *
 * Every value is READ THEN VALIDATED, never trusted — the same discipline the
 * two existing deep links already use (`/admission?course=` validates against
 * the catalogue, `/contact?event=` against the events module). An unrecognised
 * `when` falls back to `upcoming`; a `type` no record carries is dropped, so a
 * hand-edited address can never filter by a phantom value while the control
 * beside it reads "All types"; `q` is trimmed for matching. A hand-edited URL
 * therefore degrades to the default view rather than crashing or rendering a
 * filter that does not exist. Nothing is written on mount: the address is read,
 * not rewritten, so an inbound `?when=upcoming` link (the target
 * `EVENT_LIFECYCLE.past.nextAction` uses) costs no extra navigation.
 *
 * Each change is ONE batched `setSearchParams(next, { replace: true,
 * preventScrollReset: true })` built from scratch: `replace` so a filter session
 * does not fill the back stack, `preventScrollReset` so changing a filter does
 * not jump the page to the top, and batched because react-router 7.18.1's
 * functional-updater form does not queue within a tick (AAP §0.3.3) — two calls
 * in one tick would lose one another. The default group is omitted from the
 * address, so the cleared view is the canonical `/events`.
 *
 * ## `q` is MIRRORED to the address, not read back out of it
 *
 * `when` and `type` are read straight from the URL, because a segment click or
 * a select change cannot outrun its own navigation. A text field can. A field
 * whose `value` round-trips through a router commit loses characters typed
 * faster than that commit: the second keystroke of a pair re-reads the
 * not-yet-updated value, so the new character REPLACES the text instead of
 * appending. Browser testing measured "english" arriving as "eglish" at a 100ms
 * cadence (about 120 words per minute) and as "egsh" at 50ms.
 *
 * So the keyword lives in local state that the field and the predicate both
 * read, and the URL is written alongside it on every change — shareable and
 * reloadable, but never the field's source of truth. A small ledger of the
 * values this page has written lets the reconciliation effect tell one of its
 * own commits catching up (ignore it; the field is already ahead) from a value
 * that genuinely arrived from outside, via Back, Forward or an inbound
 * `/events?q=` link (adopt it; the address wins). `src/pages/Search.jsx` draws
 * the same division for its own `?q=` field, so the two keyword surfaces on
 * this site behave identically.
 *
 * ## One group at a time, behind a segmented `aria-pressed` control — NOT tabs
 *
 * The lifecycle selector lives in {@link EventFilters} and is a labelled
 * `role="group"` of real `<button>`s carrying `aria-pressed`, the same shape
 * `CourseGrid`'s category chips already use. AAP §0.2.3 and §0.8.4 take this
 * decision explicitly and record "no tabs primitive" as NOT a gap: a Tabs widget
 * would import a whole second ARIA vocabulary (`role="tablist"`, `role="tab"`,
 * `aria-selected`, roving `tabIndex`, an owned `role="tabpanel"`) to express a
 * choice three toggle buttons already express correctly. There is no
 * `role="tab"`, no `role="tablist"` and no `aria-selected` on this page, and
 * none may be added.
 *
 * `lifecycleOf` returns FOUR states but `?when=` takes only THREE, because an
 * event happening today belongs with the upcoming group — it has not happened
 * yet and carries the identical action set. `partitionEvents` already owns that
 * mapping; it is not re-derived here. Such a record still renders its own
 * distinct "Happening today" badge, because the group a record sits in and the
 * state it displays are different questions.
 *
 * ## Composition (reuse-first, zero duplication)
 *
 * - <Seo>            → per-page <title>/description/canonical plus Open Graph
 *                      and Twitter tags (unique title "Events"). Indexable: no
 *                      `noindex`, and the explicit canonical is retained so the
 *                      filter parameters consolidate under the bare path.
 * - <StructuredData> → BreadcrumbList JSON-LD built from the SAME `crumbs` array
 *                      that feeds the visible <Breadcrumbs>, keeping the
 *                      structured data and the on-screen trail in agreement.
 *                      NO `Event` block is emitted here under any condition —
 *                      see the head-treatment note below.
 * - Page header      → <Container as="section"> wrapping <Breadcrumbs> and the
 *                      page's single <h1> (SectionHeading rendered `as="h1"`).
 * - <EventFilters>   → the stateless control surface; this page owns the state.
 * - Events grid      → <Container as="section"> with a responsive 1/2/3-column
 *                      grid of <EventCard>, keyed by the unique `event.slug`.
 *                      Each card renders its own semantic markup (<article> +
 *                      <h3>), its lifecycle badge, its `/events/<slug>` detail
 *                      link and its lifecycle-gated conversion actions.
 * - <EmptyState>     → the four no-records branches, so no view ever renders an
 *                      empty container or a collapsed layout.
 * - <CTASection>     → the reusable admission call-to-action that closes every
 *                      page (admissions-priority ruleset).
 *
 * ## Head treatment: breadcrumbs only, never an Event block
 *
 * Google's event guidance requires event structured data to sit on the
 * INDIVIDUAL event page rather than on a listing (one event, one URL), so Event
 * markup belongs to `/events/:slug` alone and this page emits exactly one
 * `application/ld+json` block: the BreadcrumbList. That exclusion is a rule in
 * its own right, independent of the per-record `scheduleConfirmed` gate in
 * AAP §0.7.4 — which happens to suppress every Event block today anyway, since
 * all five records ship unconfirmed. No `aggregateRating`, no `review`, no
 * priced `offers` and no accreditation field is emitted anywhere.
 *
 * ## Four empty states (AAP §0.11.3)
 *
 * This page owns four of the inventory's cases, and group-empty is kept distinct
 * from filter-empty because they need different next steps: no upcoming records,
 * no past records, the undated group selected while nothing awaits a date, and
 * the type/keyword filter matching nothing within a group that does hold
 * records. All four are `tone="neutral"` — these are absences, not failures —
 * and each answers BOTH what happened and what to do next.
 *
 * Data comes exclusively from `src/data/events.js` (the single source of truth);
 * this module reads it and never mutates it, and `partitionEvents` likewise
 * returns fresh arrays over the same records so the shared module-level array is
 * never reordered for the other surfaces that import it.
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens in
 * `src/index.css`) on the 8px spacing scale — `py-12`/`py-16`, `pb-16`/`pb-20`,
 * `gap-6`, `mb-6`/`mb-8` — with static classNames, zero new tokens, zero new
 * utilities and no arbitrary `[…]` values, so `src/index.css` carries no diff.
 *
 * Accessibility (WCAG AA): exactly ONE <h1> per page (the header); the rendered
 * group carries a visually-hidden `<h2>` naming THAT group, so each card's <h3>
 * title nests correctly and the outline steps h1 -> h2 -> h3 with no skipped
 * level; the result count is a page-local polite live region, always mounted, so
 * a filter change is announced without moving focus and without repurposing the
 * shell's route-title announcer, which keeps its single existing meaning; the
 * trail is a `<nav aria-label="Breadcrumb">`; and the selector carries its state
 * in `aria-pressed` as well as in colour.
 *
 * @returns {import('react').ReactElement} The rendered Events page content.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FaSearchMinus } from 'react-icons/fa'

import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import EventCard from '../components/common/EventCard.jsx'
import EventFilters from '../components/common/EventFilters.jsx'
import RepresentativeNote from '../components/common/RepresentativeNote.jsx'
import CTASection from '../components/common/CTASection.jsx'
import { partitionEvents } from '../lib/eventSchedule.js'
import { eventLifecycleState } from '../lib/states.js'
import events from '../data/events.js'

// Breadcrumb trail for this page. Module-local (never exported) and shared by
// both the visible <Breadcrumbs> and the BreadcrumbList JSON-LD via
// <StructuredData> so the two stay in lockstep. Shape: { name, path }.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Events', path: '/events' },
]

// ---------------------------------------------------------------------------
// The URL contract. These three names are fixed by AAP §0.5.2 and are held here
// as constants rather than as inline literals so the read and the write paths
// can never drift onto different spellings.
// ---------------------------------------------------------------------------

/** Query-parameter name selecting the lifecycle group. */
const WHEN_PARAM = 'when'

/** Query-parameter name selecting an `events[].type` literal. */
const TYPE_PARAM = 'type'

/** Query-parameter name carrying the free-text filter. */
const QUERY_PARAM = 'q'

/**
 * The lifecycle groups `?when=` accepts, which are exactly the three keys
 * {@link partitionEvents} returns.
 *
 * One list, so the address, the partition and the selector cannot drift apart.
 * `'today'` is deliberately absent: it is a state a record DISPLAYS, not a group
 * a listing offers, and it partitions into `upcoming`.
 *
 * @type {readonly ('upcoming'|'past'|'undated')[]}
 */
const GROUP_IDS = ['upcoming', 'past', 'undated']

/**
 * The group rendered when `?when=` is absent or unrecognised.
 *
 * Upcoming events are what a visitor arriving at `/events` came for, and this is
 * the same target `EVENT_LIFECYCLE.past.nextAction` links to
 * (`/events?when=upcoming`), so the default view and that recovery action agree.
 */
const DEFAULT_GROUP = 'upcoming'

/**
 * Per-group copy: the section heading, the count nouns and the group-empty
 * state.
 *
 * This is page-local CONTENT, not a second state authority. The lifecycle
 * LABELS and ICONS remain owned by `src/lib/states.js` and are read from there
 * by {@link EventFilters} for the selector and by {@link EventCard} for each
 * badge — that single authority is the mechanism BUG 1's fix rests on. What
 * lives here is different in kind: a section title naming a COLLECTION
 * ("Past events") is not a record's state label ("Past event"), and reusing the
 * latter as a heading over three records would read as a mislabel. The group
 * icons below are still taken from `states.js` at the point of use, so the
 * visual vocabulary stays single-sourced.
 *
 * Keyed by the same three ids as {@link GROUP_IDS}, and every string is
 * authored in the institute's own terms: no figure, no claim, and no filler.
 *
 * @typedef {object} GroupMeta
 * @property {string} heading    The section `<h2>` naming this group.
 * @property {string} countOne   Singular noun phrase for the result count.
 * @property {string} countMany  Plural noun phrase for the result count.
 * @property {string} emptyTitle WHAT HAPPENED, when the group holds no records.
 * @property {string} emptyBody  WHY, and what the visitor can do instead.
 * @property {{label: string, to: string, variant: string}[]} emptyActions
 *   WHAT NEXT — held as plain data so the copy and the routes stay out of JSX.
 *
 * @type {Record<'upcoming'|'past'|'undated', GroupMeta>}
 */
const GROUP_META = {
  upcoming: {
    heading: 'Upcoming events',
    countOne: 'upcoming event',
    countMany: 'upcoming events',
    emptyTitle: 'No upcoming events are scheduled',
    emptyBody:
      'Nothing is on the calendar at the moment. New workshops, seminars and batch orientations are announced through the year — look through the past events to see the kind of sessions we run, or ask us what is coming next.',
    emptyActions: [
      { label: 'See past events', to: '/events?when=past', variant: 'primary' },
      { label: 'Contact us', to: '/contact', variant: 'outline' },
    ],
  },
  past: {
    heading: 'Past events',
    countOne: 'past event',
    countMany: 'past events',
    emptyTitle: 'No past events are listed',
    emptyBody:
      'Nothing has been archived here yet. Everything currently published is still ahead, so the upcoming group is where to look.',
    emptyActions: [
      { label: 'See upcoming events', to: '/events?when=upcoming', variant: 'primary' },
    ],
  },
  undated: {
    heading: 'Events awaiting a date',
    countOne: 'event awaiting a date',
    countMany: 'events awaiting a date',
    emptyTitle: 'No events are awaiting a date',
    emptyBody:
      'Every event listed here has a scheduled date, so nothing is waiting on one. See the upcoming events, or ask us about sessions we are still planning.',
    emptyActions: [
      { label: 'See upcoming events', to: '/events?when=upcoming', variant: 'primary' },
      { label: 'Ask about a date', to: '/contact', variant: 'outline' },
    ],
  },
}

/**
 * Resolve an incoming `?when=` value to a group this page actually renders.
 *
 * Anything that is not one of the three ids — absent (`null` from
 * `URLSearchParams.get`), misspelled, or an inherited `Object.prototype` member
 * — resolves to the default group. Validating through a list membership check
 * rather than an object index is what makes a hand-edited value harmless: the
 * result is always one of three known literals, so every later lookup keyed on
 * it (`GROUP_META`, the partition) is safe by construction.
 *
 * @param {unknown} value The candidate group id, straight from the address.
 * @returns {'upcoming'|'past'|'undated'} One of the three rendered groups.
 */
function resolveGroup(value) {
  return GROUP_IDS.includes(/** @type {'upcoming'|'past'|'undated'} */ (value))
    ? /** @type {'upcoming'|'past'|'undated'} */ (value)
    : DEFAULT_GROUP
}

/**
 * Derive the selectable `?type=` values from the records themselves.
 *
 * Source order is preserved (it is the institute's authored order) and
 * duplicates are collapsed, mirroring how `CourseGrid` derives its category
 * chips from its current `items`: a list holding no webinar never offers — and
 * never accepts — a Webinar filter, and adding a sixth type to
 * `src/data/events.js` needs no change here.
 *
 * This must stay in agreement with the option set {@link EventFilters} derives,
 * which is why both read the same full list. A page that validated only `when`
 * and passed the raw `type` into its own predicate would filter by
 * `?type=Bootcamp` while the control correctly showed "All types", leaving a
 * visitor on an empty list with every filter apparently cleared and nothing to
 * clear. `events[].type` is a PUBLIC CONTRACT, so the literals are used exactly
 * as authored — never slugified, re-cased or trimmed into a new form.
 *
 * @param {unknown} source The records to read. A non-array yields no options.
 * @returns {string[]} The distinct type literals present, in source order.
 */
function deriveTypeOptions(source) {
  const present = (Array.isArray(source) ? source : [])
    .map((event) =>
      event && typeof event === 'object' ? /** @type {{type?: unknown}} */ (event).type : null,
    )
    .filter((type) => typeof type === 'string' && type.trim() !== '')
  return Array.from(new Set(/** @type {string[]} */ (present)))
}

/**
 * Build one record's pre-lowercased searchable text.
 *
 * Only the record's own authored strings are searched — title, description,
 * location, type and the free-text schedule copy — so a match is always
 * something the visitor can see on the card. Non-string and missing fields are
 * skipped rather than coerced, because every field but `title`, `date`,
 * `description` and `location` is optional on the record and `String(undefined)`
 * would put the literal text "undefined" into the haystack.
 *
 * At five records this is microseconds per keystroke, which is why there is no
 * index structure, no debounce and no memoised haystack here: AAP §0.12.6 is
 * explicit that optimisation belongs only where it is measurable.
 *
 * @param {unknown} event The record to flatten.
 * @returns {string} Lowercased searchable text, or `''` for an unusable record.
 */
function haystackOf(event) {
  if (!event || typeof event !== 'object') return ''
  const record = /** @type {Record<string, unknown>} */ (event)
  return [record.title, record.description, record.location, record.type, record.time]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase()
}

/**
 * Pick the singular or plural noun phrase for a real, counted number.
 *
 * @param {number} count The number being described.
 * @param {GroupMeta} meta The active group's copy.
 * @returns {string} e.g. `'upcoming event'` or `'upcoming events'`.
 */
function nounFor(count, meta) {
  return count === 1 ? meta.countOne : meta.countMany
}

/**
 * Compose the result-count sentence for the visible group.
 *
 * The number is always the length of the list actually rendered — there is no
 * estimate, no rounding and no fabricated total. When a filter has narrowed the
 * group, both numbers are given, because "1 of 3" tells the visitor that
 * clearing the filter has something to bring back and "1" alone does not. A
 * count of zero still produces a sentence: the element is a live region, and
 * switching to an empty group must announce something rather than fall silent.
 *
 * @param {number} shown How many records are rendered.
 * @param {number} total How many records the group holds before filtering.
 * @param {GroupMeta} meta The active group's copy.
 * @param {boolean} filtered Whether a type or keyword filter is applied.
 * @returns {string} The count sentence.
 */
function resultCountLabel(shown, total, meta, filtered) {
  if (shown === 0) return `No ${meta.countMany} to show.`
  if (filtered && shown < total) {
    return `Showing ${shown} of ${total} ${nounFor(total, meta)}.`
  }
  return `Showing ${shown} ${nounFor(shown, meta)}.`
}

/**
 * Name the filters currently applied, for the filter-empty explanation.
 *
 * Echoing the visitor's own words back is what turns "nothing matched" into an
 * explanation they can act on. The quotation marks are the same curly pair the
 * search page uses, and the values are rendered as text by React, so an
 * echoed value cannot inject markup.
 *
 * @param {string} type The active type literal, or `''`.
 * @param {string} query The active trimmed keyword, or `''`.
 * @returns {string} A phrase naming the active filters.
 */
function describeFilters(type, query) {
  const parts = []
  if (type) parts.push(`the “${type}” type`)
  if (query) parts.push(`the words “${query}”`)
  // Defence in depth: this branch only renders while at least one filter is
  // active, so `parts` is never empty in practice — but a generic phrase is
  // better than a sentence with a hole in it.
  return parts.length > 0 ? parts.join(' and ') : 'the current filters'
}

function Events() {
  const [searchParams, setSearchParams] = useSearchParams()

  // ONE instant for the whole page, captured deliberately on mount. The
  // lifecycle of every record, the segment counts inside <EventFilters> and each
  // <EventCard>'s own badge and actions are all classified against this same
  // Date, so no two surfaces on this page can disagree across a midnight
  // boundary and the view stays deterministic for the length of the visit.
  // Not module scope — that would freeze the clock at import time for the whole
  // session, so a tab left open overnight would keep yesterday's grouping. Not a
  // bare `new Date()` in the render body either, which would re-partition on
  // every pass and hand a new object to every child.
  const now = useMemo(() => new Date(), [])

  // The three groups, derived rather than assumed. `partitionEvents` always
  // returns all three keys as arrays (an empty group is a first-class result
  // with its own empty state) and never mutates or reorders the shared
  // `events` array, which the card, the dashboard and the search index also
  // read.
  const groups = useMemo(() => partitionEvents(events, now), [now])

  // `events` is a module-level import and therefore a stable reference, so the
  // option set is derived once for the life of the component.
  const typeOptions = useMemo(() => deriveTypeOptions(events), [])

  // READ THEN VALIDATE. `URLSearchParams.get` returns `string | null`; each
  // value is checked against its own allowlist before it reaches either the
  // predicate below or the control above, so the filter that is APPLIED is
  // always the filter that is DISPLAYED.
  const activeGroup = resolveGroup(searchParams.get(WHEN_PARAM))
  const rawType = searchParams.get(TYPE_PARAM) ?? ''
  const activeType = typeOptions.includes(rawType) ? rawType : ''
  const urlQuery = searchParams.get(QUERY_PARAM) ?? ''

  // The keyword field is backed by LOCAL state and MIRRORED to the address —
  // never read back out of it. A field whose value round-trips through a router
  // navigation drops characters typed faster than the commit: the second
  // keystroke of a pair re-reads the not-yet-updated value, so "english" typed
  // at about 120 words per minute arrives as "eglish". Browser testing measured
  // exactly that at a 100ms cadence, losing three of seven characters at 50ms.
  // Holding the draft here makes the field lossless and instant while the URL
  // is still written on every change, so the view stays shareable and
  // reloadable. This is the same division `src/pages/Search.jsx` uses for its
  // own `?q=` field, so the two keyword surfaces behave identically.
  //
  // Initialised FROM the address, so an inbound `/events?q=` link hydrates both
  // the field and the predicate on first render.
  const [queryDraft, setQueryDraft] = useState(urlQuery)

  // Every `q` this page has written since the address last agreed with the
  // field. Our own writes commit one after another, so an EARLIER one can land
  // while the field is already further ahead; adopting it would undo characters
  // the visitor has typed. The ledger is what separates those from a value that
  // genuinely arrived from outside.
  const ownQueryWrites = useRef(new Set([urlQuery]))

  useEffect(() => {
    // Settled: the address and the field agree, so reset the ledger to this one
    // value. That bounds its growth and, more importantly, discards stale
    // entries — otherwise a word typed earlier in the session could later be
    // mistaken for our own write when it arrives back via Back or a shared link.
    if (urlQuery === queryDraft) {
      ownQueryWrites.current = new Set([urlQuery])
      return
    }
    // One of our own intermediate writes catching up. Ignore it; the field is
    // already ahead.
    if (ownQueryWrites.current.has(urlQuery)) return
    // Anything else came from outside this component — Back, Forward, or an
    // inbound link — and the address wins.
    ownQueryWrites.current = new Set([urlQuery])
    setQueryDraft(urlQuery)
  }, [urlQuery, queryDraft])

  // The draft is what the field shows, so typing a trailing space is not
  // fought; the trimmed form is what matching uses, so a stray space never
  // empties the list. A whitespace-only value degrades to the unfiltered view.
  const query = queryDraft.trim()

  const meta = GROUP_META[activeGroup]
  const groupEvents = groups[activeGroup]
  const filtersActive = Boolean(activeType) || Boolean(query)

  // Pure, cheap and memoised on its own inputs, per AAP §0.12.6. OR within a
  // dimension is moot here (both axes are single-valued) and AND across
  // dimensions is what a type plus a keyword implies. A record missing the field
  // a dimension filters on simply fails that dimension rather than crashing the
  // predicate, because every one of these fields is optional on the record.
  const visible = useMemo(() => {
    const needle = query.toLowerCase()
    if (!activeType && !needle) return groupEvents
    return groupEvents.filter(
      (event) =>
        (!activeType || event?.type === activeType) &&
        (!needle || haystackOf(event).includes(needle)),
    )
  }, [groupEvents, activeType, query])

  /**
   * Write the complete filter state to the address in ONE navigation.
   *
   * The next set is built from scratch, so a parameter someone appended by hand
   * is dropped on the first write rather than carried forward, and the default
   * group is omitted so the cleared view is the canonical `/events`. Never the
   * functional-updater form: it does not queue within a tick in react-router
   * 7.18.1, so two changes in one tick would lose one another.
   *
   * @param {{when?: string, type?: string, q?: string}} next The complete next
   *   filter set. Already validated by the caller — either by
   *   {@link EventFilters}, which hands back its merged and checked values, or by
   *   `clearFilters`, which supplies the validated active group.
   * @returns {void}
   */
  const writeFilters = useCallback(
    (next) => {
      const nextQuery = typeof next.q === 'string' ? next.q : ''
      // The field adopts the value IMMEDIATELY, so a keystroke never waits on a
      // navigation, and the value is recorded as ours so the reconciliation
      // effect recognises the commit when it eventually lands.
      setQueryDraft(nextQuery)
      ownQueryWrites.current.add(nextQuery)

      const params = new URLSearchParams()
      if (next.when && next.when !== DEFAULT_GROUP) params.set(WHEN_PARAM, next.when)
      if (next.type) params.set(TYPE_PARAM, next.type)
      if (nextQuery) params.set(QUERY_PARAM, nextQuery)
      // `replace` keeps a filter session out of the back stack;
      // `preventScrollReset` keeps the page from jumping to the top on a change.
      setSearchParams(params, { replace: true, preventScrollReset: true })
    },
    [setSearchParams],
  )

  const handleFilterChange = useCallback(
    // <EventFilters> reports (dimension, next, nextValues). The third argument is
    // the complete, already-merged and already-validated set, which is exactly
    // what a single batched write needs; the first two only name the axis that
    // moved and are not needed to express the change.
    (dimension, next, nextValues) => writeFilters(nextValues),
    [writeFilters],
  )

  // Clearing drops the two secondary filters and KEEPS the chosen group, because
  // "clear the filter" is not "leave the group the visitor selected".
  const clearFilters = useCallback(
    () => writeFilters({ when: activeGroup, type: '', q: '' }),
    [writeFilters, activeGroup],
  )

  return (
    <>
      <Seo
        title="Events"
        canonical="/events"
        description="Upcoming events, workshops and seminars at CIBLE School of Language — spoken English bootcamps, exam prep sessions and career guidance events in Madhubani, Bihar."
      />
      {/* Breadcrumbs ONLY. Event structured data belongs to the individual
          event page under Google's one-event-one-URL rule, so no `event` prop is
          passed from this listing under any condition. */}
      <StructuredData breadcrumbs={crumbs} />

      {/* Page header */}
      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="What's On"
          title="Events & Workshops"
          subtitle="Join our upcoming sessions to learn, practise and get ahead with CIBLE."
        />
      </Container>

      {/* Events listing */}
      <Container as="section" className="pb-16 md:pb-20">
        {/* Visually-hidden section heading naming the group ACTUALLY rendered, so
            each EventCard's <h3> title nests under an <h2> and the outline steps
            h1 -> h2 -> h3 with no skipped level. It is derived from the same
            validated group id as the records beneath it, which is what stops a
            heading describing content the section does not contain — the visible
            symptom of BUG 1. The group is also conveyed visibly by the pressed
            segment and by the count sentence, so nothing is hidden from a
            sighted visitor by keeping this sr-only. */}
        <h2 className="sr-only">{meta.heading}</h2>

        <RepresentativeNote className="mb-8">
          These events are representative examples shown for demonstration.
          Dates, times and details will be confirmed by the institute before
          launch — please check with us on WhatsApp or by phone before attending.
        </RepresentativeNote>

        {/* Stateless control surface: it receives the validated values and
            reports changes; this page owns every parameter. `now` is forwarded so
            its segment counts are classified against the same instant as the
            partition and the cards. */}
        <EventFilters
          events={events}
          values={{ when: activeGroup, type: activeType, q: queryDraft }}
          onChange={handleFilterChange}
          now={now}
          className="mb-6"
        />

        {/* The result count, visible AND polite: one element does both jobs, so a
            filter change is announced without a duplicate sr-only copy and
            without moving focus. Always mounted, because a live region inserted
            into the DOM at the same time as its text is unreliable. This is a
            PAGE-LOCAL region — the shell's route-title announcer keeps its single
            existing meaning and is never repurposed. */}
        <p aria-live="polite" aria-atomic="true" className="mb-6 text-sm text-muted">
          {resultCountLabel(visible.length, groupEvents.length, meta, filtersActive)}
        </p>

        {visible.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((event) => (
              // The card owns its own lifecycle badge, its `/events/<slug>`
              // detail link and which conversion actions it may offer. `now` is
              // the page's single instant; nothing is gated from here.
              <EventCard key={event.slug ?? event.title} event={event} now={now} />
            ))}
          </div>
        ) : groupEvents.length === 0 ? (
          /* GROUP-EMPTY. The group holds no records at all, so clearing a filter
             would not bring anything back — the honest next step is another
             group or a conversation. `headingAs="h3"` keeps the outline stepping
             under the group's own <h2>. The icon is the group's own lifecycle
             glyph, read from the single state authority. */
          <EmptyState
            tone="neutral"
            icon={eventLifecycleState(activeGroup).icon}
            headingAs="h3"
            className="max-w-3xl"
            title={meta.emptyTitle}
            description={meta.emptyBody}
            action={meta.emptyActions.map((item) => (
              <Button key={item.to} to={item.to} variant={item.variant}>
                {item.label}
              </Button>
            ))}
          />
        ) : (
          /* FILTER-EMPTY. The group does hold records, so the filter is what
             removed them and clearing it is a next step that genuinely works.
             The description names the active filters and how many records are
             waiting behind them. */
          <EmptyState
            tone="neutral"
            icon={FaSearchMinus}
            headingAs="h3"
            className="max-w-3xl"
            title="No event matches the current filter"
            description={`None of the ${groupEvents.length} ${nounFor(groupEvents.length, meta)} in this group match ${describeFilters(activeType, query)}. Clearing the filters brings them all back, or try a shorter word.`}
            action={
              <>
                <Button type="button" onClick={clearFilters}>
                  Clear filters
                </Button>
                <Button variant="outline" to="/contact">
                  Contact us
                </Button>
              </>
            }
          />
        )}
      </Container>

      <CTASection />
    </>
  )
}

export default Events
