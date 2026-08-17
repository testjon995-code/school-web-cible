/**
 * Events — CIBLE School of Language "Events & Workshops" page (route `/events`).
 *
 * Lazily loaded by `src/App.jsx` through the shared `lazyWithRetry` helper and
 * rendered INSIDE `<Layout>`, which owns the page chrome — the Navbar, the `<main>`
 * landmark, the Footer, the floating conversion widgets and scroll-to-top. This file
 * renders page CONTENT only.
 *
 * Composition — shared primitives only, nothing hand-rolled:
 * - `<Seo>` / `<StructuredData>` — the per-page head tags and a BreadcrumbList built
 *   from the SAME `crumbs` array that feeds the visible `<Breadcrumbs>`, so the two
 *   cannot diverge.
 * - `<SectionHeading as="h1">` — the page's ONE `<h1>`.
 * - `<RepresentativeNote>` — the point-of-claim disclosure for the fixture dates,
 *   gated site-wide by `siteConfig.representativeContent`.
 * - `<EventCard>` grid — over `upcomingEvents`, keyed by the unique `event.title`.
 * - An empty-state panel in place of the grid when nothing is upcoming, so the
 *   heading is never left standing over nothing.
 * - `<CTASection>` — the shared admission close, rendered on its own defaults.
 *
 * All data comes from `src/data/events.js`, so every value here is presentational.
 *
 * DAY BOUNDARY — the one reason this page holds state and runs an effect. The grid
 * lists only events dated today or later, compared against the start of the current
 * LOCAL day, so the "Upcoming events" heading stays true as fixture dates pass.
 * Deriving that cut-off during render is necessary but not sufficient: React re-renders
 * for state, props or context, and none of those change because a clock passed
 * midnight, so a derived value is only as fresh as the last render that happened for
 * some other reason — a tab left open overnight would keep listing yesterday's session.
 * `dayStart` (state) plus a self-rescheduling one-shot timer close that gap: each
 * rollover re-reads the clock and reschedules from the live value, so the schedule
 * self-corrects after a throttled tab, a suspended machine or a DST shift instead of
 * drifting; the effect's cleanup clears whatever timer is pending, so leaving the route
 * leaves nothing behind. (Home's band-10 preview mirrors this mechanism exactly — same
 * grace period, same two helpers, same self-rescheduling one-shot timer — so the two
 * surfaces retire a session on the same boundary at the same moment.)
 *
 * Dates are compared through `parseCivilDate` (`src/lib/dates.js`), which reads a bare
 * 'YYYY-MM-DD' value as a CIVIL date from local year/month/day components. The native
 * `new Date('YYYY-MM-DD')` would parse UTC midnight instead, so in any timezone west of
 * UTC the comparison would fall on the previous local calendar day and retire an event
 * a day early. The cut-off is local MIDNIGHT rather than the current instant, so an
 * event scheduled for later today still counts as upcoming; unparseable records are
 * dropped rather than throwing.
 *
 * Accessibility (WCAG AA): one `<h1>`; the grid is a set of self-contained `<article>`
 * cards whose titles are `<h3>`, preceded by a visually-hidden `<h2>` so the outline
 * steps h1 → h2 → h3 with no skipped level. That `<h2>` sits OUTSIDE the
 * populated/empty branch, so it labels the section in both states.
 *
 * @returns {import('react').ReactElement} The rendered Events page content.
 */
import { useEffect, useState } from 'react'
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import EventCard from '../components/common/EventCard.jsx'
import RepresentativeNote from '../components/common/RepresentativeNote.jsx'
import CTASection from '../components/common/CTASection.jsx'
import events from '../data/events.js'
import { parseCivilDate } from '../lib/dates.js'

// Module-local (never exported) and shared by both the visible <Breadcrumbs> and the
// BreadcrumbList JSON-LD, so the two stay in lockstep. Shape: { name, path }.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Events', path: '/events' },
]

// Small cushion added to every rollover timer so the callback lands just AFTER
// the boundary rather than on it. Timer callbacks can fire a fraction early, and
// a callback that runs at 23:59:59.999 would read the OLD day and schedule its
// successor a full day out, skipping a rollover. One second is imperceptible to
// the reader and removes that class of off-by-one entirely.
const ROLLOVER_GRACE_MS = 1000

/**
 * The start of the current day in the viewer's LOCAL timezone, as a timestamp.
 *
 * Returned as a number rather than a Date so it can be held in state and compared with
 * `Date.prototype.getTime()` values directly.
 *
 * @returns {number} Milliseconds since the epoch at local midnight today.
 */
function startOfLocalDay() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * How long until the next local midnight, computed from the live clock.
 *
 * The SECOND `setHours` is not redundant and must not be removed: `setDate`
 * re-resolves the instant through the local timezone's daylight-saving rules, so in a
 * zone whose clocks shift at or near midnight the bumped value can land an hour either
 * side of it. Re-normalising pins the result to the real local start of the next day.
 *
 * @returns {number} Milliseconds from now until the next local midnight.
 */
function msUntilNextLocalMidnight() {
  const next = new Date()
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() + 1)
  next.setHours(0, 0, 0, 0)
  return next.getTime() - Date.now()
}

function Events() {
  // Initialised LAZILY — the function is passed, not called — so the clock is read
  // once on mount rather than on every render. See DAY BOUNDARY in the file header for
  // why this is state rather than a value derived during render.
  const [dayStart, setDayStart] = useState(startOfLocalDay)

  // Re-arms the cut-off at each local midnight for as long as this route is mounted. A
  // self-rescheduling one-shot is used rather than a fixed 24-hour `setInterval` so the
  // delay is recomputed from the live clock each time (see DAY BOUNDARY above).
  // `setDayStart` receives a freshly read value, so on a rollover where the value has
  // not actually changed React bails out of the re-render itself.
  useEffect(() => {
    let timerId

    const scheduleRollover = () => {
      timerId = setTimeout(() => {
        setDayStart(startOfLocalDay())
        scheduleRollover()
      }, msUntilNextLocalMidnight() + ROLLOVER_GRACE_MS)
    }

    scheduleRollover()

    // Each callback reassigns `timerId` before scheduling its successor, so this
    // always cancels the LIVE timer rather than the first one — nothing can call
    // `setDayStart` after unmount.
    return () => clearTimeout(timerId)
  }, [])

  // Only events dated today or later belong under the "Upcoming events" heading. Both
  // sides of the comparison are local midnights, which is what makes them directly
  // comparable in every timezone (see the `parseCivilDate` note in the file header).
  const upcomingEvents = events.filter((event) => {
    const eventDate = parseCivilDate(event.date)
    // `parseCivilDate` yields null for a missing, non-string, malformed or rollover
    // date (e.g. '2026-13-40'). Guard before use so a bad record is dropped rather
    // than throwing.
    if (!eventDate) return false
    return eventDate.getTime() >= dayStart
  })

  // `filter` preserves source order and src/data/events.js is authored
  // chronologically, so no re-sort is needed — and sorting the raw strings would
  // bypass the civil-date parse above.

  return (
    <>
      <Seo
        title="Events"
        canonical="/events"
        description="Upcoming events, workshops and seminars at CIBLE School of Language — spoken English bootcamps, exam prep sessions and career guidance events in Madhubani, Bihar."
      />
      <StructuredData breadcrumbs={crumbs} />

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

      <Container as="section" className="pb-16 md:pb-20">
        {/* Visually hidden, and required rather than decorative: each card title is an
            <h3>, so without an <h2> here the outline would skip a level. It sits outside
            the populated/empty branch so it labels the section in both states. */}
        <h2 className="sr-only">Upcoming events</h2>
        <RepresentativeNote className="mb-8">
          These events are representative examples shown for demonstration.
          Dates, times and details will be confirmed by the institute before
          launch — please check with us on WhatsApp or by phone before attending.
        </RepresentativeNote>
        {upcomingEvents.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.title} event={event} />
            ))}
          </div>
        ) : (
          // Rendered instead of an empty grid once every event in the data has passed,
          // so the heading is never left standing over nothing. The panel reuses the
          // hairline treatment FAQ and CourseGrid already use for this state.
          //
          // Deliberately NOT a live region: this list is derived once per render with no
          // in-page control, so a status role would be redundant ARIA.
          //
          // The copy states only what is verifiable — that nothing is scheduled right
          // now — and invents no date, batch or cadence. It points at the contact
          // channels the page already offers rather than duplicating those controls.
          <p className="rounded-2xl border border-border bg-white px-6 py-8 text-center text-sm leading-relaxed text-muted">
            No upcoming events are scheduled right now. Please call or WhatsApp
            us and we will be happy to tell you what is coming up next.
          </p>
        )}
      </Container>

      <CTASection />
    </>
  )
}

export default Events
