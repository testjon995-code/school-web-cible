/**
 * EventDetail — CIBLE School of Language per-event page (route `/events/:slug`).
 *
 * The dynamic sibling of the `/events` listing: one URL per authored event
 * record, so a card finally reaches its OWN subject instead of a listing. It is
 * lazy-loaded by the application route table in `src/App.jsx`
 * (`lazyWithRetry(() => import('./pages/EventDetail.jsx'))`,
 * `<Route path="events/:slug" element={<EventDetail />} />`) and rendered inside
 * the shared `<Layout>`, so this module renders ONLY page content — the
 * persistent Navbar, Footer and floating conversion widgets belong to the shell.
 *
 * ── THE FIVE URLS ─────────────────────────────────────────────────────────────
 *
 * `events[].slug` is a PUBLIC CONTRACT. It was already the `/contact?event=`
 * deep-link value the Contact page validates as an allowlist, and it is now also
 * this route's segment, so renaming one breaks two things at once. The five
 * concrete URLs this route resolves today, each of which is indexable and is
 * published in `public/sitemap.xml` by this work's sitemap update — the route
 * table in `src/App.jsx`, `src/data/navigation.js` and that sitemap are required
 * to stay in agreement, and a pattern route contributes one route-table entry
 * but five sitemap URLs:
 *
 *   /events/free-spoken-english-workshop
 *   /events/personality-development-seminar
 *   /events/pcm-pcb-batch-orientation
 *   /events/public-speaking-competition
 *   /events/digital-literacy-webinar
 *
 * ── READ-THEN-VALIDATE ────────────────────────────────────────────────────────
 *
 * The `:slug` parameter is UNTRUSTED input — anyone can type an address — so it
 * is read once and then validated against `src/data/events.js`, the single
 * source of truth, exactly as `src/pages/Contact.jsx` validates its
 * `?event=<slug>` query and `src/pages/Admission.jsx` its `?course=` one. Only a
 * RESOLVED record reaches `Seo`, the structured-data emitter, `AddToCalendar` or
 * any action; nothing downstream ever sees the raw parameter. Every derived
 * value below — the canonical URL, the breadcrumb leaf, the Register target — is
 * built from the matched RECORD's own `slug`, which is authored content, never
 * from the URL string.
 *
 * ── THE UNKNOWN-SLUG BRANCH (AAP §0.11.3) ─────────────────────────────────────
 *
 * An unmatched slug renders an explained unavailable-content state; it does NOT
 * throw. Throwing would reach the shell's `ErrorBoundary` and replace the page
 * with a generic crash panel, which tells a visitor who followed a stale link
 * nothing about what happened or where to go. The branch therefore keeps the
 * visible trail and the page's single `<h1>` so the page stays navigable, and
 * renders the shared `EmptyState` at its `caution` tone (which pins
 * `role="alert"`) stating WHAT HAPPENED and WHAT NEXT — see all events, or
 * contact the institute. Its head treatment differs from the resolved page in
 * two deliberate ways: `noindex` is passed to `Seo`, and NO `canonical` is
 * supplied, because an address that resolves to no record has no canonical of
 * its own (the same reasoning that stopped the catch-all 404 self-canonicalising
 * to the homepage). `Seo` emits neither a canonical link nor an `og:url` when
 * the prop is absent, so nothing extra is needed here. No JSON-LD of any kind is
 * emitted in this branch.
 *
 * ── LIFECYCLE GOVERNS THE ACTIONS, NOT JUST THE LABEL (AAP §0.11.1, BUG 1) ────
 *
 * The state is DERIVED from the record's own date by `lifecycleOf` in
 * `src/lib/eventSchedule.js` (a day-level civil-date comparison), and everything
 * that renders from it — label, icon, badge variant, WHICH actions are permitted
 * and the replacement action when both are withheld — is read from ONE
 * `EVENT_LIFECYCLE` entry in `src/lib/states.js`, through that module's
 * `eventLifecycleState()` accessor. `src/components/common/EventCard.jsx` reads
 * the SAME entry, which is the whole mechanism: a card and its detail page
 * cannot be authored separately and therefore cannot drift. This file authors no
 * lifecycle label, icon, variant or destination of its own and translates no
 * variant vocabulary at the call site — a `Badge` reads `badgeVariant`, a
 * `Button` reads `buttonVariant`.
 *
 * | Lifecycle  | Register     | Add to Calendar | Replacement next action |
 * | ---------- | ------------ | --------------- | ----------------------- |
 * | `upcoming` | shown        | shown           | —                       |
 * | `today`    | shown        | shown           | —                       |
 * | `past`     | NOT rendered | NOT rendered    | "See upcoming events"   |
 * | `undated`  | shown        | NOT rendered    | —                       |
 *
 * The reasons, so the table is not re-litigated: registration for a finished
 * event is the inconsistency the defect names, and exporting a concluded date to
 * a calendar is meaningless — withholding both would leave the page with nothing
 * to offer, which is why `past` is the one state that supplies a replacement,
 * whose label, route and variant are all its entry's. An UNDATED event keeps
 * Register, because enquiring about an unscheduled event is legitimate, but
 * loses the export, because there is no date to put in the file. A TODAY event
 * keeps both, and its schedule row leads with that state's own label so the date
 * reads as today. With the dates authored today three of the five records are
 * already past, so three of these five routes deliberately offer neither action.
 *
 * ── HEAD AND THE `Event` STRUCTURED-DATA GATE (AAP §0.7.4, §0.12.5) ───────────
 *
 * This route is INDEXABLE, so it supplies an explicit `canonical` of
 * `/events/<slug>` and never `noindex`. `BreadcrumbList` JSON-LD is emitted
 * ALWAYS, from the same `crumbs` array that feeds the visible `<Breadcrumbs>`,
 * so the trail and the markup cannot disagree.
 *
 * `Event` JSON-LD is emitted ONLY when that record's `scheduleConfirmed === true`.
 * The gate is evaluated HERE, by the page, because `StructuredData` and
 * `eventSchema` are both deliberately content-agnostic — which is what lets a
 * record become eligible by flipping one boolean with no code change. The reason
 * is a policy one, not a stylistic preference: `src/data/events.js` states in its
 * own header that the institute "must confirm and supply the final event media,
 * exact dates and times before launch", and structured data asserts to a machine
 * that the marked-up content is accurate. Marking up content the repository
 * itself labels provisional is a policy violation.
 *
 * ALL FIVE RECORDS SHIP `scheduleConfirmed: false`, so the correct, PASSING
 * outcome today is that NO `Event` block is emitted on any of these routes — the
 * check is two-sided, and emitting the block over unconfirmed dates fails it
 * rather than passing it. Each route currently carries exactly one JSON-LD
 * script: its breadcrumbs.
 *
 * A SECOND, independent gate lives inside `eventSchema` and is passed straight
 * through: `Event` requires a real `location`, so the builder returns `null`
 * unless the record resolves either a genuine `Place` (`attendanceMode`
 * 'offline' or 'mixed' with a `location` naming an address) or a genuine
 * `VirtualLocation` backed by a resolving `onlineUrl`. `StructuredData` drops a
 * `null` block. The webinar record is therefore expected to stay
 * breadcrumb-only even after its date is confirmed, because its `location` is
 * prose describing an arrangement ("Online via Google Meet (link shared after
 * registration)") and no honest `Place` can be built from a sentence. No
 * location is ever synthesised to force a block into existence.
 *
 * Two related rules hold throughout. `attendanceMode` and `onlineUrl` are
 * DECLARED per record or absent — never inferred from `type` (a programme
 * category, not a delivery mode: a 'Webinar' is not automatically online-only)
 * and never parsed out of the free-text `location`. And `Event` markup belongs
 * to the individual event page under Google's one-event-one-URL rule, so the
 * `/events` listing emits none, and this page emits none for any event other
 * than the one it is showing — the related cards below carry no markup of their
 * own. Nothing here emits `offers`, a price, `aggregateRating`, `review` or an
 * accreditation claim: the repository holds no basis for any of them.
 *
 * ── COMPOSITION (AAP §0.9.3) ──────────────────────────────────────────────────
 *
 * Reuse-first; every element is a shared primitive or composite, never
 * hand-rolled markup:
 * - `Seo` / `StructuredData` → the head treatment described above.
 * - `Container as="section"` → the single width and gutter authority
 *   (`max-w-7xl`, `px-4 md:px-6`); this page renders content only.
 * - `Breadcrumbs` + `SectionHeading as="h1"` → the trail and the page's one
 *   `<h1>`, carrying the event title.
 * - `Badge` ×2 → the event `type` beside its lifecycle state. The row sits BELOW
 *   the heading and wraps, so at 320px the badges reflow onto their own line and
 *   can never crowd the title.
 * - Meta list → the parsed date through the shared `formatCivilDate` (wrapped in
 *   a machine-readable `<time dateTime>`), the authored `time` copy EXACTLY as
 *   written, and the authored `location` string EXACTLY as written. None of the
 *   three is reformatted or synthesised, and `location` is never parsed — it is
 *   prose, and it is accurate for all five records.
 * - The description, then the lifecycle-gated action row, then `AddToCalendar`.
 * - `EventCard` grid → other events, upcoming first, so the grid doubles as the
 *   way onward from a concluded event.
 * - `RepresentativeNote` at its DEFAULT `gate="content"` → this route inherits
 *   the disclosure `/events` already makes about dates and details, and retires
 *   itself with every other content disclosure when the client clears
 *   `siteConfig.representativeContent`. `gate="always"` is never passed here;
 *   `src/pages/Dashboard.jsx` is its only intended caller (AAP §0.6.5).
 * - `CTASection` → the reusable admission call to action that closes every page.
 *
 * No banner image is rendered: every record ships `image: null`, which is
 * precisely why `EventCard` owns a branded gradient fallback, and inventing a
 * media frame here would add an empty container the empty-state rule forbids.
 *
 * ── STYLING AND ACCESSIBILITY ─────────────────────────────────────────────────
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens from
 * `src/index.css`) on the 8px scale — `py-12 md:py-16`, `gap-6`, `mt-8` — with
 * static classNames and no hardcoded or arbitrary `[..]` value. No new token, no
 * new named utility and no second stylesheet: this page leaves `src/index.css`
 * with no diff. Class composition needs no conditional here, so classNames are
 * written directly, exactly as the `/events` listing writes them.
 *
 * Accessibility (WCAG AA): exactly ONE `<h1>` (the event title) with section
 * titles at `<h2>` and the related cards' own titles at `<h3>`, so the outline
 * steps h1 → h2 → h3 with no skipped level; `<time dateTime>` for the date; the
 * lifecycle indicator pairs its badge variant WITH the entry's label and an
 * `aria-hidden` icon, so colour is never the sole carrier of state; every meta
 * glyph is decorative and `aria-hidden`; every action is the shared `Button`, so
 * the ≥44×44px target and the global `:focus-visible` ring are inherited rather
 * than re-declared; and the Register action is named per event, because the
 * related cards below repeat that label on this same page.
 *
 * @returns {import('react').ReactElement} The rendered event detail page content.
 */
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { FiAlertCircle, FiCalendar, FiClock, FiMapPin } from 'react-icons/fi'

import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import AddToCalendar from '../components/common/AddToCalendar.jsx'
import EventCard from '../components/common/EventCard.jsx'
import RepresentativeNote from '../components/common/RepresentativeNote.jsx'
import CTASection from '../components/common/CTASection.jsx'
import events from '../data/events.js'
import { lifecycleOf, partitionEvents } from '../lib/eventSchedule.js'
import { EVENT_LIFECYCLE, eventLifecycleState } from '../lib/states.js'
import { formatCivilDate } from '../lib/dates.js'

// How many sibling events the related grid shows. Three fills the `lg:grid-cols-3`
// row exactly, so the block never renders a lone orphan on a second line.
const RELATED_LIMIT = 3

// The two ancestor crumbs, shared by both branches. Module-local (never
// exported) and the same `{ name, path }` shape `breadcrumbSchema()` consumes,
// so one array feeds the visible trail AND the BreadcrumbList JSON-LD.
const HOME_CRUMB = { name: 'Home', path: '/' }
const EVENTS_CRUMB = { name: 'Events', path: '/events' }

// The trail for the unknown-slug branch. `Breadcrumbs` renders the LAST entry as
// non-link `aria-current="page"` text and keys each item on its `path`, so this
// leaf's path is only a React key and is never navigated to — which is why it is
// a fixed literal rather than the requested slug: a unique key is required (a
// second `/events` would collide with the crumb above it), and echoing an
// arbitrary URL segment into the trail is neither useful to a visitor nor safe
// for the layout. `Home` and `Events` both stay real links, so the page remains
// navigable exactly as the resolved one is.
const NOT_FOUND_CRUMBS = [
  HOME_CRUMB,
  EVENTS_CRUMB,
  { name: 'Event not found', path: '/events/event-not-found' },
]

// Shared layout class for one item of the meta list, so the three rows cannot
// drift apart. Module-local (not exported) so this file exposes only the page
// component, keeping `react/only-export-components` clean.
const META_ITEM = 'flex items-start gap-2'

/**
 * Format an event date for display, in the SAME shape `EventCard` uses.
 *
 * Delegates to the shared `formatCivilDate` (`src/lib/dates.js`), which parses a
 * date-only 'YYYY-MM-DD' string as a CIVIL date — `new Date(y, m - 1, d)` in
 * local time rather than `new Date(iso)`'s UTC-midnight parse — so the calendar
 * day never shifts west of UTC. A `Date` is NEVER constructed from the ISO
 * string here; that is the off-by-one defect these helpers exist to prevent. An
 * unparseable value yields `''`, so the date row is omitted rather than showing
 * "Invalid Date", and the lifecycle badge states "Date to be announced" in words
 * instead. The options match the card's exactly, so the same record reads
 * identically on both surfaces.
 *
 * @param {string|Date|null|undefined} iso - The record's `date` value.
 * @returns {string} e.g. 'Sat, 27 Sep 2026', or '' when unparseable.
 */
function formatFullDate(iso) {
  return formatCivilDate(iso, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function EventDetail() {
  // ── HOOKS ───────────────────────────────────────────────────────────────────
  // All four are declared unconditionally at the TOP LEVEL, above every
  // conditional return below: `react/rules-of-hooks` is an error, not a warning,
  // and a hook placed after the unknown-slug return would break on the very next
  // render.
  const { slug } = useParams()

  // ONE reference instant for the whole surface, pinned for the mount. The
  // lifecycle badge, the action gate, the calendar action and the related-events
  // partition are all classified against this single value, which is what stops
  // two blocks on one page disagreeing across a midnight boundary — the same
  // discipline `partitionEvents` applies internally by resolving its clock once
  // before its loop.
  const now = useMemo(() => new Date(), [])

  // READ-THEN-VALIDATE. The `:slug` parameter is untrusted, so it is matched
  // against the events single source of truth and nothing else; a miss yields
  // `null`, which drives the explained unavailable state rather than an
  // exception. Trimmed and type-checked first, because a router parameter is a
  // string in practice but the guard costs nothing and the empty-segment case
  // ('/events/' with a trailing slash) must not scan for an empty slug.
  const event = useMemo(() => {
    if (typeof slug !== 'string') return null
    const wanted = slug.trim()
    if (!wanted) return null
    return events.find((record) => record && record.slug === wanted) ?? null
  }, [slug])

  // Sibling events for the related grid, ordered UPCOMING first (then undated,
  // then most-recently past) by reusing `partitionEvents` rather than sorting
  // here — a second ordering rule is exactly how two surfaces come to disagree.
  // The order matters most on a concluded event's page: the grid then leads with
  // what a visitor can still attend, reinforcing the `past` state's own "See
  // upcoming events" next step. This event is excluded from its own related
  // list, and the result is capped so the block stays a single row.
  const related = useMemo(() => {
    if (!event) return []
    const { upcoming, undated, past } = partitionEvents(events, now)
    return [...upcoming, ...undated, ...past]
      .filter((record) => record.slug !== event.slug)
      .slice(0, RELATED_LIMIT)
  }, [event, now])

  // ── THE UNKNOWN-SLUG BRANCH ─────────────────────────────────────────────────
  // Rendered, never thrown: reaching the shell's ErrorBoundary would replace an
  // explanation with a crash panel. `noindex` and NO canonical (see the head
  // note in the module header), and deliberately no `<StructuredData>` at all —
  // structured data on a page excluded from the index has no consumer, and there
  // is no record here to describe.
  if (!event) {
    return (
      <>
        <Seo
          title="Event not found"
          description="This event could not be found. Browse all upcoming events and workshops at CIBLE School of Language, or contact us and we will help you find the right session."
          noindex
        />

        <Container as="section" className="py-12 md:py-16">
          <Breadcrumbs items={NOT_FOUND_CRUMBS} className="mb-6" />
          <SectionHeading as="h1" align="left" eyebrow="Events" title="Event not found" />

          {/* `caution` pins role="alert", so assistive tech is told the content
              is unavailable rather than leaving the visitor to infer it from an
              empty page. The title answers WHAT HAPPENED and the description and
              actions answer WHAT NEXT — the two halves the empty-state rule
              requires. `headingAs="h2"` keeps it under the page's single h1. */}
          <EmptyState
            className="mt-8 max-w-3xl"
            tone="caution"
            headingAs="h2"
            icon={FiAlertCircle}
            title="We could not find that event"
            description="The link may be out of date, or the event may no longer be listed. You can see everything we have scheduled, or contact us and we will point you to the right session."
            action={
              <>
                <Button to="/events">See all events</Button>
                <Button to="/contact" variant="outline">
                  Contact the institute
                </Button>
              </>
            }
          />
        </Container>

        <CTASection />
      </>
    )
  }

  // ── THE RESOLVED EVENT ──────────────────────────────────────────────────────
  // Every value below is derived from the MATCHED RECORD, never from the URL
  // parameter, so authored content is the only thing that reaches the head, the
  // structured data and the links.
  const { slug: eventSlug, title, date, time, type, description, location } = event

  // THE LIFECYCLE GATE. Derived from the record's own date, then resolved to the
  // one shared entry that owns the label, the icon, the badge variant, the
  // permitted actions and the replacement action. `eventLifecycleState` is
  // preferred over indexing `EVENT_LIFECYCLE` directly, as that module
  // documents: it resolves own properties only and degrades an unrecognised
  // state to the honest `undated`. Because `EventCard` resolves the same entry
  // the same way, this page and every card for this event agree by construction.
  const lifecycleState = eventLifecycleState(lifecycleOf(event, now))
  const { label: lifecycleLabel, icon: LifecycleIcon, nextAction } = lifecycleState

  // A same-day event's schedule row leads with that state's own label so the
  // date reads as TODAY. The phrase is read back from the entry — there is no
  // hand-written "Today" string here — and the state is identified by comparing
  // the resolved entry with its frozen singleton, which keeps a bare state
  // literal out of this call site. This mirrors the card's schedule line
  // exactly.
  const isToday = lifecycleState === EVENT_LIFECYCLE.today

  // This event's own canonical path, and the event-aware Register target that
  // carries its identity to the Contact page, whose existing allowlist resolves
  // the slug and pre-fills the subject as `Event registration: <title>`. The
  // default matches `EventCard`'s `registerTo`, so both surfaces hand off
  // identically. Encoded for the same reason the card encodes it: a slug
  // carrying a reserved character must not invent a nested path or a second
  // parameter.
  const path = `/events/${encodeURIComponent(eventSlug)}`
  const registerTo = `/contact?event=${encodeURIComponent(eventSlug)}`

  // One trail for the visible breadcrumb AND the BreadcrumbList JSON-LD.
  const crumbs = [HOME_CRUMB, EVENTS_CRUMB, { name: title, path }]

  // THE VERIFICATION GATE, evaluated here because `StructuredData` and
  // `eventSchema` are deliberately content-agnostic. `undefined` leaves the prop
  // falsy, so no Event block is built at all; a strict `=== true` comparison
  // means an absent or non-boolean flag reads as NOT confirmed. Every record
  // ships `false` today, so the passing outcome is no Event markup anywhere —
  // see the module header.
  const confirmedEvent = event.scheduleConfirmed === true ? event : undefined

  const fullDate = formatFullDate(date)

  // Stated once, in one readable place, so the page's action set is legible at a
  // glance. `AddToCalendar` independently self-gates on this same
  // `canAddToCalendar` flag, so the explicit gate here can only ever agree with
  // it — it cannot introduce a second rule. The wrapper is skipped entirely when
  // a state permits nothing, rather than rendering an empty container.
  const hasActionRow = lifecycleState.canRegister || Boolean(nextAction)
  const hasActions = hasActionRow || lifecycleState.canAddToCalendar

  return (
    <>
      {/* Indexable: an explicit canonical, and never `noindex`. */}
      <Seo title={title} description={description} canonical={path} />
      {/* Breadcrumbs ALWAYS; the Event block only through the gate above, whose
          `null` result — when `eventSchema` cannot build an honest location — is
          dropped by the emitter's own filter. */}
      <StructuredData breadcrumbs={crumbs} event={confirmedEvent} />

      {/* Event header — trail, the page's single h1, state, schedule, the
          description and the lifecycle-gated actions. */}
      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        {/* The eyebrow is the structural label for this page's subject, kept
            deliberately static: the record's own `type` renders as the Badge
            below, and repeating it here would state the same fact twice. */}
        <SectionHeading as="h1" align="left" eyebrow="Event" title={title} />

        {/* Badge row — event type beside its lifecycle state. Placed BELOW the
            heading and wrapping rather than compressing, so at 320px the pair
            reflows onto its own line and the title above is untouched. */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {type ? <Badge variant="accent">{type}</Badge> : null}

          {/* Variant, label and icon all come from the one entry resolved
              above — nothing is authored locally, and a Badge reads
              `badgeVariant` only (its vocabulary includes the badge-only
              `neutral` that `past` uses). The icon is decorative; the label
              carries the meaning, so colour is never the sole signal. */}
          <Badge variant={lifecycleState.badgeVariant}>
            <LifecycleIcon aria-hidden="true" />
            {lifecycleLabel}
          </Badge>
        </div>

        {/* Meta list — date, the authored time copy and the authored location.
            A list, because these are three discrete facts rather than a
            sentence; each row is omitted when its value is absent, so no row
            ever renders a bare icon. */}
        <ul className="mt-6 flex flex-col gap-2 text-sm text-muted sm:flex-row sm:flex-wrap sm:gap-x-6">
          {fullDate ? (
            <li className={META_ITEM}>
              <FiCalendar aria-hidden="true" className="mt-1 shrink-0" />
              <span>
                {/* The "today" prefix is the entry's own label, matching the
                    card. `<time dateTime>` keeps the raw ISO value
                    machine-readable while the visible text stays localised. */}
                {isToday ? `${lifecycleLabel} · ` : null}
                <time dateTime={date}>{fullDate}</time>
              </span>
            </li>
          ) : null}

          {/* The authored `time` string, rendered EXACTLY as written in the
              record — never reformatted, and never rebuilt from the
              machine-readable `startTime`/`endTime` companions, which exist for
              the calendar export and structured data rather than for display. */}
          {time ? (
            <li className={META_ITEM}>
              <FiClock aria-hidden="true" className="mt-1 shrink-0" />
              <span>{time}</span>
            </li>
          ) : null}

          {/* The authored `location` string, rendered EXACTLY as written — it is
              prose (one record reads "Online via Google Meet (link shared after
              registration)"), so it is displayed rather than parsed, and an
              attendance mode is never inferred from it. `break-words` keeps a
              long single token inside the box at 320px. */}
          {location ? (
            <li className={META_ITEM}>
              <FiMapPin aria-hidden="true" className="mt-1 shrink-0" />
              <span className="break-words">{location}</span>
            </li>
          ) : null}
        </ul>

        {description ? (
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted md:text-lg">
            {description}
          </p>
        ) : null}

        {/* Action area. WHICH actions appear is decided entirely by the
            lifecycle entry's flags; there is no date arithmetic and no state
            literal in this block, which is precisely what stops a finished
            event from issuing a live invitation to register. */}
        {hasActions ? (
          <div className="mt-8 flex flex-col gap-4">
            {hasActionRow ? (
              <div className="flex flex-wrap gap-3">
                {lifecycleState.canRegister ? (
                  <Button
                    to={registerTo}
                    variant="primary"
                    // Named per event because the related cards further down
                    // this page repeat the label "Register"; without this the
                    // accessible names would be ambiguous in a links list.
                    aria-label={title ? `Register for ${title}` : 'Register for this event'}
                  >
                    Register
                  </Button>
                ) : null}

                {/* The replacement action, present only on the state that
                    withholds both others, so the page is never left with
                    nothing to offer. Its label, route and variant are all the
                    entry's, so this page and the card offer the identical next
                    step — and no per-event name, because every past event points
                    at the same listing. */}
                {nextAction ? (
                  <Button to={nextAction.to} variant={nextAction.buttonVariant}>
                    {nextAction.label}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {/* Calendar export. All of its copy — "downloads a file", "opens
                pre-filled", and every failure sentence — belongs to that
                component and is not overridden or paraphrased here, so nothing
                on this page can imply that anything was synced to an account.
                `now` is forwarded so the export classifies this event against
                the same instant the badge above it did. */}
            {lifecycleState.canAddToCalendar ? (
              <AddToCalendar event={event} now={now} />
            ) : null}
          </div>
        ) : null}
      </Container>

      {/* Other events — internal linking onward, upcoming first. */}
      <Container as="section" className="pb-12 md:pb-16">
        <SectionHeading
          as="h2"
          align="left"
          title="Other events"
          subtitle="More workshops, seminars and sessions at CIBLE — upcoming ones first."
          className="mb-8"
        />

        {related.length > 0 ? (
          // Each card renders its own <article> and <h3>, so the outline steps
          // h1 → h2 → h3. `now` is forwarded so every card classifies against
          // this page's single instant, and each card derives its own lifecycle
          // from the same shared entry — a related card for a past event shows
          // the same "Past event" badge and the same withheld actions it shows
          // on the listing.
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <EventCard key={item.slug} event={item} now={now} />
            ))}
          </div>
        ) : (
          // The grid can legitimately hold no records — a single-event listing,
          // or a content module trimmed to one entry — and an empty grid element
          // is the unexplained empty container the empty-state rule forbids.
          <EmptyState
            className="max-w-3xl"
            headingAs="h3"
            icon={FiCalendar}
            title="No other events are listed yet"
            description="This is the only event currently scheduled. New workshops and seminars are added to the events page as soon as they are confirmed."
            action={
              <Button to="/events" variant="outline">
                See all events
              </Button>
            }
          />
        )}

        {/* Content disclosure at its DEFAULT `gate="content"`, inherited from
            the `/events` listing and covering both this event and the cards
            above it. It retires itself with every other content disclosure the
            moment `siteConfig.representativeContent` is cleared, which is why
            `gate="always"` is never passed here. */}
        <RepresentativeNote className="mt-10 max-w-3xl">
          The events shown on this page are representative examples for
          demonstration. Dates, times and details will be confirmed by the
          institute before launch — please check with us on WhatsApp or by phone
          before attending.
        </RepresentativeNote>
      </Container>

      <CTASection />
    </>
  )
}

export default EventDetail
