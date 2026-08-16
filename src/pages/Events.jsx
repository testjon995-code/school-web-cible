/**
 * Events — CIBLE School of Language "Events & Workshops" page (route `/events`).
 *
 * Lists CIBLE's upcoming events, workshops and seminars as a responsive grid of
 * the single canonical {@link EventCard}. It is lazy-loaded by the application
 * route table in `src/App.jsx`
 * (`const Events = lazy(() => import('./pages/Events.jsx'))`,
 * `<Route path="events" element={<Events />} />`) and rendered inside the shared
 * `<Layout>`, so this module renders ONLY page content — the persistent Navbar,
 * Footer and floating conversion widgets are owned by the layout shell.
 *
 * Composition (reuse-first, zero duplication — every element is a shared
 * primitive/composite, never hand-rolled markup):
 * - <Seo>            → per-page <title>/description/canonical plus Open Graph and
 *                      Twitter tags (unique title "Events").
 * - <StructuredData> → BreadcrumbList JSON-LD built from the SAME `crumbs` array
 *                      that feeds the visible <Breadcrumbs>, keeping the
 *                      structured data and the on-screen trail in agreement.
 * - Page header      → <Container as="section"> wrapping <Breadcrumbs> and the
 *                      page's single <h1> (SectionHeading rendered `as="h1"`).
 * - Events grid      → <Container as="section"> with a responsive 1/2/3-column
 *                      grid of <EventCard>, keyed by the unique `event.title`.
 *                      Only UPCOMING events are listed: the data set is filtered
 *                      at render time down to records dated today or later, so
 *                      the "Upcoming events" heading stays truthful as the
 *                      fixture dates pass instead of silently listing history.
 *                      Each card renders its own semantic markup (<article> +
 *                      <h3>) and an admission-first "Register" CTA to `/contact`.
 * - Empty state      → when nothing is upcoming the grid is replaced by a short
 *                      prose note (never an empty grid under the heading),
 *                      reusing the established FAQ/CourseGrid empty-state
 *                      treatment and directing the reader to the contact
 *                      channels the page already offers.
 * - <CTASection>     → the reusable admission call-to-action that closes every
 *                      page (admissions-priority ruleset).
 *
 * Data comes exclusively from `src/data/events.js` (the single source of truth),
 * so every value on the page is presentational. The page holds exactly ONE piece
 * of state and runs exactly ONE effect, and both exist for a single reason: to
 * make the "Upcoming events" heading stay true in a session that outlives the
 * calendar day it started in.
 *
 * DAY-BOUNDARY LIFECYCLE — what is actually guaranteed, and why state is needed.
 * The cut-off is the start of the current LOCAL day. Deriving it during render is
 * necessary but NOT sufficient: React re-renders in response to state, props or
 * context changing, and none of those change merely because a clock passes
 * midnight. A purely derived cut-off is therefore only as fresh as the last
 * render that happened to occur for some other reason — so a tab left open
 * overnight would keep listing yesterday's session under an "upcoming" heading
 * until something unrelated forced a re-render. Closing that gap requires an
 * explicit trigger, which is what `dayStart` (state) and the rollover effect
 * provide:
 *   • `dayStart` holds the cut-off as a timestamp, so changing it re-renders and
 *     re-filters the grid.
 *   • The effect schedules a one-shot `setTimeout` for the next local midnight,
 *     re-reads the clock when it fires, and then reschedules itself for the
 *     following midnight. Recomputing the delay from the live clock on every
 *     rollover (instead of repeating a fixed 24-hour interval) means the schedule
 *     self-corrects after a throttled background tab, a suspended machine or a DST
 *     shift, rather than drifting a little further out of step each day.
 *   • The effect's cleanup clears the pending timer, so a navigation away from
 *     this route leaves nothing pending — no leaked timer and no `setState` on an
 *     unmounted component.
 * `setDayStart` is called with a freshly computed value, so on the rare rollover
 * where the value is unchanged React bails out of the re-render by itself.
 *
 * Dates are compared through `parseCivilDate` (`src/lib/dates.js`), which reads a
 * bare 'YYYY-MM-DD' value as a CIVIL date using local year/month/day components.
 * The native `new Date('YYYY-MM-DD')` would parse UTC midnight instead, so in any
 * timezone west of UTC the comparison would fall on the previous local calendar
 * day and retire an event a day early. The cut-off is local MIDNIGHT today rather
 * than the current instant, so an event scheduled for later today still counts as
 * upcoming; records whose date cannot be parsed are dropped rather than throwing.
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens in
 * `src/index.css`) on the 8px spacing scale — `py-12`/`py-16`, `pb-16`/`pb-20`,
 * `gap-6` — with static classNames and no hardcoded values.
 *
 * Accessibility (WCAG AA): exactly ONE <h1> per page (the header); the grid is a
 * list of self-contained <article> landmarks whose titles are <h3>s, preceded by
 * a visually-hidden `<h2 class="sr-only">` ("Upcoming events") so the outline
 * steps h1 -> h2 -> h3 with no skipped level (QA Issue 9); the trail is a
 * `<nav aria-label="Breadcrumb">`. That <h2> sits OUTSIDE the populated/empty
 * branch, so it labels the section in both states and the heading outline stays
 * legal (and gap-free) whether cards or the empty-state note are rendered.
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

// Breadcrumb trail for this page. Module-local (never exported) and shared by
// both the visible <Breadcrumbs> and the BreadcrumbList JSON-LD via
// <StructuredData> so the two stay in lockstep. Shape: { name, path }.
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
 * This is the cut-off the upcoming-events filter compares against. Local midnight
 * is used rather than the current instant so an event scheduled for later today
 * still counts as upcoming, and it is expressed as a number so it can be held in
 * state and compared with `Date.prototype.getTime()` values directly.
 *
 * @returns {number} Milliseconds since the epoch at local midnight today.
 */
function startOfLocalDay() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * How long until the next local midnight, measured from the live clock.
 *
 * Computed by normalising to local midnight today, advancing the calendar day by
 * one, then re-normalising the time components. The second `setHours` is not
 * redundant: `setDate` re-resolves the instant through the local timezone's
 * daylight-saving rules, so in a zone whose clocks shift at or near midnight the
 * bumped value can land an hour either side of it. Re-normalising pins the result
 * to the real local start of the next day, which keeps the schedule correct across
 * a DST transition instead of firing an hour early or late.
 *
 * Because the value is derived from the clock at call time, each rescheduled timer
 * corrects any drift the previous one accumulated.
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
  // Start of TODAY in the viewer's local timezone, held in state so that crossing
  // midnight can actually re-render this page. Initialised lazily (the function is
  // PASSED, not called) so the clock is read once on mount rather than on every
  // render. See the DAY-BOUNDARY LIFECYCLE note in the JSDoc above for why a
  // value merely derived during render is not sufficient on its own.
  const [dayStart, setDayStart] = useState(startOfLocalDay)

  // Re-arm the cut-off at each local midnight for as long as this route is
  // mounted. A self-rescheduling one-shot timer is used rather than a fixed
  // 24-hour `setInterval`: the delay is recomputed from the live clock every time,
  // so the schedule stays aligned after a throttled background tab, a suspended
  // machine or a daylight-saving shift. `setDayStart` receives a freshly read
  // value, so if the clock has not in fact crossed a boundary React bails out of
  // the re-render on its own.
  useEffect(() => {
    let timerId

    const scheduleRollover = () => {
      timerId = setTimeout(() => {
        setDayStart(startOfLocalDay())
        scheduleRollover()
      }, msUntilNextLocalMidnight() + ROLLOVER_GRACE_MS)
    }

    scheduleRollover()

    // Clear whichever timer is currently pending. Because each callback
    // reassigns `timerId` before scheduling the next one, this always cancels the
    // live timer — so leaving the route leaves nothing pending and nothing can
    // call `setDayStart` after unmount.
    return () => clearTimeout(timerId)
  }, [])

  // Only events happening today or later belong under the "Upcoming events"
  // heading. Dates are compared through `parseCivilDate` (src/lib/dates.js),
  // which reads a bare 'YYYY-MM-DD' value as a CIVIL date via
  // `new Date(y, m - 1, d)` in local time. The native `new Date('YYYY-MM-DD')`
  // would instead parse UTC midnight, so in any timezone west of UTC the
  // comparison would land on the previous local calendar day and retire an
  // event a day early. Both sides of the comparison are therefore local
  // midnights and are directly comparable in every timezone.
  const upcomingEvents = events.filter((event) => {
    const eventDate = parseCivilDate(event.date)
    // `parseCivilDate` yields null for a missing, non-string, malformed or
    // rollover date (e.g. '2026-13-40'). Guard before touching the value so a
    // bad record is dropped from the grid rather than throwing or sorting
    // unpredictably.
    if (!eventDate) return false
    return eventDate.getTime() >= dayStart
  })

  // `filter` preserves source order and src/data/events.js is already authored
  // chronologically, so no re-sort is needed (and sorting raw 'YYYY-MM-DD'
  // strings would bypass the civil-date parse above).

  return (
    <>
      <Seo
        title="Events"
        canonical="/events"
        description="Upcoming events, workshops and seminars at CIBLE School of Language — spoken English bootcamps, exam prep sessions and career guidance events in Madhubani, Bihar."
      />
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

      {/* Events grid */}
      <Container as="section" className="pb-16 md:pb-20">
        {/* Visually-hidden section heading so each EventCard's <h3> title nests
            under an <h2>, keeping the outline h1 -> h2 -> h3 with no skipped
            level for assistive tech (QA Issue 9). */}
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
          // Empty state — rendered instead of an empty grid once every event in
          // the data set has passed, so the "Upcoming events" heading is never
          // left standing over nothing. Reuses the established empty-state
          // treatment from `common/FAQ.jsx` / `common/CourseGrid.jsx` (a real
          // <p> in a hairline token panel with muted prose) rather than
          // introducing a second pattern.
          //
          // Deliberately NOT a live region: FAQ carries `role="status"` because
          // its list changes in response to user category filtering, whereas
          // this list is derived once per render with no in-page control, so a
          // live region here would be redundant ARIA.
          //
          // The copy states only what is verifiable — that nothing is scheduled
          // right now — and invents no date, batch or cadence. It points at the
          // contact channels the page ALREADY offers (the closing <CTASection>
          // below, plus the Call/WhatsApp widgets the layout shell mounts
          // globally) instead of duplicating those controls here.
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
