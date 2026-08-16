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
 * so the page stays fully presentational — no local state and no hooks. The
 * upcoming-events filter is a plain derived value computed inside the component
 * body: deriving it per render (rather than once at module scope) keeps a
 * long-lived SPA session from serving a stale "today", and a derived `const` is
 * not a hook, so the page's hook-free status is preserved.
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

function Events() {
  // Start of TODAY in the viewer's local timezone. Derived per render (never at
  // module scope) so a long-lived SPA session that stays open across midnight
  // cannot keep serving a stale "today". This is a plain derived value, not a
  // hook, so the page remains hook-free and stateless.
  //
  // The boundary is local MIDNIGHT rather than `Date.now()` on purpose: an event
  // scheduled for later today is still upcoming, and comparing against the
  // current instant would drop it from the grid part-way through its own day.
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

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
    return eventDate.getTime() >= startOfToday.getTime()
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
