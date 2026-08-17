// The page's only two hooks, and they exist for one reason: band 10's event
// preview must retire a session the moment the local calendar day turns over.
// See the DAY-BOUNDARY LIFECYCLE note in the JSDoc below.
import { useEffect, useState } from 'react'
// Icon COMPONENT REFERENCES (never rendered JSX) passed to <FeatureCard icon> and
// <Timeline items[].icon>, which render them internally as decorative glyphs.
import {
  FaChalkboardTeacher,
  FaUserGraduate,
  FaClock,
  FaCertificate,
  FaHeadset,
  FaMapMarkerAlt,
  FaRegClock,
  FaComments,
  FaSearch,
  FaClipboardCheck,
  FaBookOpen,
  FaMicrophone,
  FaChartLine,
  FaBullseye,
} from 'react-icons/fa'
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Hero from '../components/common/Hero.jsx'
import Statistics from '../components/common/Statistics.jsx'
import CourseGrid from '../components/common/CourseGrid.jsx'
import FeatureCard from '../components/common/FeatureCard.jsx'
import Timeline from '../components/common/Timeline.jsx'
import ReviewCard from '../components/common/ReviewCard.jsx'
import TestimonialSlider from '../components/common/TestimonialSlider.jsx'
import FacultyCard from '../components/common/FacultyCard.jsx'
import EventCard from '../components/common/EventCard.jsx'
import RepresentativeNote from '../components/common/RepresentativeNote.jsx'
import CTASection from '../components/common/CTASection.jsx'
import { courses } from '../data/courses.js'
import { faculty } from '../data/faculty.js'
import { testimonials } from '../data/testimonials.js'
import { events } from '../data/events.js'
import { siteConfig } from '../data/siteConfig.js'
// The civil-date parser /events also uses, so band 10's preview applies the same
// local-calendar-day comparison — and, since the midnight rollover below mirrors that
// route's, the same boundary at the same moment (see the cut-off note in the component
// body).
import { parseCivilDate } from '../lib/dates.js'

/**
 * Home — the CIBLE School of Language landing page (index route `/`).
 *
 * Lazily loaded by `src/App.jsx` through the shared `lazyWithRetry` helper and
 * rendered at the index route INSIDE `<Layout>`. Layout already owns the page chrome
 * — the `<Navbar>`, the `<main>` landmark, the `<Footer>` (which globally renders the
 * Newsletter), the floating WhatsApp and Call widgets, the mobile sticky bottom CTA and
 * `ScrollToTop`. This page therefore renders page CONTENT only: it emits no
 * `<main>`/`<header>`/`<footer>`, never re-renders the shell, and never duplicates the
 * Newsletter.
 *
 * Composition — eleven conversion-ordered bands, each a composition of the canonical
 * component set (nothing here is hand-rolled or duplicated):
 *    1. Hero              — <Hero> (owns the page <h1> and its "Apply Now" CTA).
 *    2. Trust / proof     — <Badge> track chips + <FeatureCard> facts +
 *                           <RepresentativeNote> + a tier-3 pair.
 *    3. Courses           — <CourseGrid> over `featuredCourses` +
 *                           <RepresentativeNote>.
 *    4. Why choose CIBLE  — <FeatureCard> grid over `features` +
 *                           <RepresentativeNote>.
 *    5. Learning journey  — <Timeline> over `LEARNING_JOURNEY` + the page's tier-1
 *                           admission CTA.
 *    6. Faculty / mentors — <FacultyCard> preview of the first three mentors.
 *    7. Student success   — <ReviewCard> grid + <RepresentativeNote>.
 *    8. Statistics        — <Statistics> (self-wrapping counters band).
 *    9. Testimonials      — <TestimonialSlider> carousel.
 *   10. Events / content  — <EventCard> grid over the today-or-later slice of `events`,
 *                           or the empty-state note, + <RepresentativeNote>.
 *   11. Final CTA         — <CTASection>, the admission close every page carries.
 * The funnel deliberately puts proof AFTER the value story: statistics land at band 8,
 * where they read as evidence for what bands 2–7 have shown rather than as an unearned
 * claim above the fold.
 *
 * Provenance — the page carries two kinds of content, and which kind a string belongs
 * to decides where it may be edited:
 *   • DATA-DERIVED RECORDS, read from the `src/data/*` single source of truth and never
 *     restated here — the chip row and featured programs (`courses`), the mentor
 *     preview (`faculty`), bands 7 and 9's student voice (`testimonials`), band 10's
 *     sessions (`events`), band 8's counters (`stats`, via <Statistics>) and band 2's
 *     campus address and opening hours (`siteConfig`). Changing any of those means
 *     changing the data module, not this file.
 *   • MODULE-LOCAL PAGE COPY, authored here as the three constants below:
 *     `TRUST_SIGNALS` (its second and third card headings, and its third description),
 *     `features` (band 4) and `LEARNING_JOURNEY` (band 5's stage names and step
 *     descriptions). This is page prose rather than a record, which is why it sits at
 *     module scope here instead of in `src/data/*`.
 *
 * Content integrity: no band authors a statistic, rating, price, pass rate, timeframe
 * or placement figure. Every such value is a data value rendered unchanged. The only
 * numbers written in this file are descriptive counts of what the page itself holds
 * (four course tracks, six journey stages), both checkable against the data and neither
 * a claim about results.
 *
 * REPRESENTATIVE CONTENT — six bands surface content that `src/data` or the project
 * documentation marks as representative rather than client-confirmed, and they are
 * disclosed in two different ways:
 *   • Point-of-claim <RepresentativeNote> panels, which self-hide the moment
 *     `siteConfig.representativeContent` is cleared:
 *       – Band 2, whose batch-timings card renders `siteConfig.hours`, annotated in the
 *         data as representative and still to be confirmed. The note's wording is
 *         scoped to the timings alone, so the disclosure lands on the claim rather than
 *         over the client-supplied address or the counseling offer /faq already makes.
 *       – Band 3, the discovery fields `CourseCard` renders (`level`, `duration`,
 *         `eligibility`, `suitableFor`, `prerequisites`, `highlights`), every one of
 *         them marked representative in the header of src/data/courses.js. Its wording
 *         is /courses' sentence verbatim, so the same claim reads identically on /,
 *         /courses and the three track pages.
 *       – Band 4, whose `features` array is inherited representative page PROSE rather
 *         than a record: three of its six cards make qualitative claims the institute
 *         must confirm or replace — "Expert Faculty", "Proven Results" (with its "track
 *         record" line) and "Recognized Certification". Disclosing prose this way
 *         deliberately widens the earlier rule that reserved the panel for
 *         representative RECORDS: a visitor cannot tell prose from a record, and these
 *         are the most confidently worded claims on the page, so a footer band alone
 *         under-disclosed them. The note qualifies those three cards only.
 *       – Band 7, representative testimonial records.
 *       – Band 10, representative event fixtures.
 *     PLACEMENT follows one rule: a caveat covering every card in a band is read BEFORE
 *     it (bands 3, 7, 10), while a footnote qualifying only some of them sits beneath
 *     them (bands 2 and 4).
 *   • The Footer's site-wide demo-content band alone, with no panel of its own, because
 *     it surfaces no representative RECORD a panel could annotate:
 *       – Band 8's counters. `src/data/stats.js` marks "Students Trained" and "Years of
 *         Excellence" as representative placeholders still to be verified, while the
 *         other two are derived from the faculty roster and the course catalog.
 *         <Statistics> renders no disclosure panel, so the Footer's notice is what
 *         covers them.
 *     That band names all three classes — course details, representative records and
 *     descriptive marketing copy — so page prose is covered globally as well as
 *     locally, and both halves are gated by the same single flag.
 * Band 10 additionally filters its preview to civil dates of today or later, so a
 * session whose date has passed is never shown under an <EventCard> that invites
 * registration; when nothing is upcoming the band renders the same empty-state note
 * /events uses instead of an empty grid. Its heading makes no temporal promise either
 * ("From the CIBLE Calendar", not "Upcoming"), so the band is truthful both by its
 * wording and by what it filters.
 *
 * Accessibility (WCAG AA): the page carries EXACTLY ONE `<h1>`, provided by <Hero>. All
 * ten bands that follow carry an `<h2>` from one of two owners: nine get a visible one
 * from <SectionHeading>, which defaults to `as="h2"` (its `eyebrow` renders as a `<p>`,
 * deliberately outside the outline), while band 8's <Statistics> supplies its own
 * `sr-only` `<h2>` linked by `aria-labelledby` — which is why that band alone is
 * rendered bare rather than wrapped in a heading of this page's making. Card and step
 * titles inside the bands are `<h3>`s, so the outline steps h1 → h2 → h3 with no
 * skipped level. Content bands are semantic `<section>` elements (via
 * `Container as="section"` or a `<section>` wrapping a `<Container>`), and every
 * navigational action uses the polymorphic `<Button to="…">`, so it renders a real
 * react-router `<Link>` with Button's ≥44px touch-target floor.
 *
 * CTA hierarchy — three visually distinct tiers, so the admission action is never
 * competed with: tier 1 is the filled `primary` "Start Your Learning Journey" (band 5)
 * alongside <Hero>'s and <CTASection>'s own "Apply Now"; tier 2 is the `outline`
 * "Explore Courses" (band 3); tier 3 is the low-emphasis `tertiary` step —
 * persistently underlined, so its demotion is a shape difference rather than a colour
 * one — used for band 2's orientation pair and for the faculty, success-story and
 * events/blog routes. <Hero> and <CTASection> own their own action rows and are
 * rendered prop-free.
 *
 * All six of the institute's approved CTA labels are content contracts, and each is
 * placed at the destination the specification maps it to. On this page: "Apply Now"
 * (<Hero> and <CTASection> → /admission), "Start Your Learning Journey" (band 5 →
 * /admission), "Explore Courses" (band 3 → /courses), "View Programs" (band 2 →
 * /courses), "Enquire Now" (band 2 → /contact) and "Talk to an Advisor" (<CTASection> →
 * /contact). Each pair shares a destination but never competes as a synonym, because
 * the two members always differ in emphasis tier AND in the job they do: "View
 * Programs" is band 2's tier-3 orientation link off the track chips while "Explore
 * Courses" is band 3's tier-2 "see the rest of the catalog" action under the grid
 * itself; "Enquire Now" is band 2's tier-3 answer to the free-counseling card while
 * "Talk to an Advisor" is the tier-2 supporting action in the closing band.
 *
 * Styling: 100% token-driven (Tailwind v4 `@theme` tokens from `src/index.css`)
 * with zero hardcoded and zero arbitrary bracket values — spacing stays on the
 * 8px scale (`py-16 md:py-20` bands, `mt-10` heading gaps, `gap-6` card gaps) and
 * the bands alternate white / `bg-surface` so that no two consecutive bands share
 * a background: surface (<Hero>) → white → surface → white → surface → white →
 * surface → `bg-primary-700` (<Statistics>) → white → surface → white
 * (<CTASection>, which is transparent over the white page background). That
 * alternation is the whole of the section-transition treatment — rhythm from
 * consistency, not added ornament. All animation and observation still live inside
 * the composed components, so this page adds no scroll observer and no
 * `framer-motion` import, which is what lets it emit its own lean, code-split route
 * chunk. It holds exactly ONE piece of state and runs exactly ONE effect, and both
 * exist for a single reason described next.
 *
 * DAY-BOUNDARY LIFECYCLE (band 10) — what is guaranteed, and why state is needed.
 * `<EventCard>` renders a "Register" action on every card it is given, so the
 * preview must never show a session whose date has passed. The cut-off is the start
 * of the current LOCAL day, and deriving it during render is necessary but NOT
 * sufficient: React re-renders in response to state, props or context changing, and
 * none of those change merely because a clock passes midnight. A purely derived
 * cut-off is therefore only as fresh as the last render that happened for some
 * unrelated reason — so a tab left open overnight would keep inviting registration
 * for a session that is already over. Closing that gap requires an explicit
 * trigger, which is what `dayStart` (state) and the rollover effect provide:
 *   • `dayStart` holds the cut-off as a timestamp, so changing it re-renders and
 *     re-filters the preview.
 *   • The effect schedules a one-shot `setTimeout` for the next local midnight,
 *     re-reads the clock when it fires, then reschedules itself for the following
 *     midnight. Recomputing the delay from the live clock on every rollover
 *     (instead of repeating a fixed 24-hour interval) means the schedule
 *     self-corrects after a throttled background tab, a suspended machine or a DST
 *     shift rather than drifting further out of step each day.
 *   • The effect's cleanup clears the pending timer, so navigating away from this
 *     route leaves nothing pending — no leaked timer and no `setState` on an
 *     unmounted component.
 * `setDayStart` is called with a freshly computed value, so on the rare rollover
 * where the value is unchanged React bails out of the re-render by itself. The cost
 * to the route chunk is one `react` import that the shared vendor chunk already
 * carries — no observer, no animation library, no asset.
 *
 * This mechanism is deliberately IDENTICAL to the one in `src/pages/Events.jsx`
 * (same grace period, same two helpers, same self-rescheduling one-shot timer, same
 * `parseCivilDate` comparison) so both surfaces retire a session on exactly the same
 * boundary and can never disagree about what is still upcoming. It is stated in both
 * pages rather than shared through an import: `Events.jsx` is a lazily loaded route
 * module, so importing its helpers here would merge the two code-split chunks. If the
 * mechanism is ever extracted, it belongs in a module both routes can import without
 * pulling one route into the other.
 *
 * @returns {import('react').ReactElement} The composed Home page content.
 */

// ── Band 2 · Trust / proof ──────────────────────────────────────────────────
// The course categories, DERIVED from the `courses` source of truth rather than
// restated, so the chip row cannot drift out of step with the catalog: a new category
// in the data becomes a chip automatically and a renamed one leaves no stale label.
// Order follows the data, and the idiom matches the one CourseGrid uses to build its
// filter list.
const COURSE_CATEGORIES = Array.from(new Set(courses.map((course) => course.category)))

// Verifiable, already-published facts only: nothing here is a statistic, rating,
// award, accreditation or superlative. The location and hours cards carry no
// page-authored value at all — their descriptions ARE `siteConfig`, the same source the
// Footer and /contact render, so this band cannot contradict them or go stale
// independently of them. The page copy written here is the second and third headings
// and the third description, and each restates something the site already publishes.
//
// One of those facts is not yet client-confirmed: the data annotates `hours` as
// representative, so the band carries a <RepresentativeNote> scoped to the timings
// alone; the address and the counseling offer are client-supplied and need none. Each
// `icon` is a react-icons COMPONENT REFERENCE, as <FeatureCard> requires.
const TRUST_SIGNALS = [
  {
    icon: FaMapMarkerAlt,
    // Built from `addressParts` so the title tracks the data too.
    title: `On Campus in ${siteConfig.addressParts.addressLocality}, ${siteConfig.addressParts.addressRegion}`,
    description: siteConfig.address,
  },
  {
    icon: FaRegClock,
    // Deliberately not a derived claim like "Open six days a week": prose like that
    // stops tracking the data and could contradict `hours` the moment the institute
    // confirms a different schedule. The heading names the fact; the values carry it.
    title: 'Batch Timings & Visiting Hours',
    description: siteConfig.hours.map((slot) => `${slot.days}: ${slot.time}`).join(' · '),
  },
  {
    icon: FaComments,
    title: 'Free Counseling Before You Enroll',
    description:
      'Not sure which track fits you? Book a free counseling session by phone, WhatsApp or email and we will help you compare programs first.',
  },
]

// ── Band 3 · Courses ────────────────────────────────────────────────────────
// A curated spread across ALL FOUR course categories, so the landing page represents
// the full catalog rather than a single track — which a positional slice of the data
// would not, because the catalog is not evenly ordered by category. Selected by slug
// from the canonical `courses` source of truth and rendered in this order; a slug that
// is not present is skipped defensively, so the grid never renders an undefined tile.
const FEATURED_COURSE_SLUGS = [
  'spoken-english', // English — flagship program
  'english-communication', // English
  'pcm-coaching', // Science
  'basic-computer', // Computer
  'digital-literacy', // Computer
  'career-guidance', // Career
]

const featuredCourses = FEATURED_COURSE_SLUGS.map((slug) =>
  courses.find((course) => course.slug === slug),
).filter(Boolean)

// ── Band 4 · Why choose CIBLE ───────────────────────────────────────────────
// Representative "why choose us" highlights: page copy rather than data, and the one
// place on this page where copy makes a claim the institute has not yet confirmed.
// "Expert Faculty", "Proven Results" (whose description asserts a track record) and
// "Recognized Certification" (which implies recognition by a body none of the data
// names) each need institute-supplied confirmation, qualification or replacement before
// launch; the other three cards describe the batch timings, mentoring and campus
// location the site states elsewhere. This band renders no representative RECORD from
// `src/data/*`, but the claims are disclosed at the point of claim anyway — a
// <RepresentativeNote> footnote directly beneath this grid, worded for those three
// cards rather than all six — as well as site-wide by the Footer's demo-content band,
// whose sentence names descriptive copy about teaching, results and completion
// certificates explicitly. Values are frozen here: the fix is institute-supplied
// wording, not a rewrite in this file.
//
// Each `icon` is a react-icons COMPONENT REFERENCE, which `FeatureCard` renders
// internally as decorative.
const features = [
  {
    icon: FaChalkboardTeacher,
    title: 'Expert Faculty',
    description: 'Learn from experienced, dedicated teachers focused on real results.',
  },
  {
    icon: FaUserGraduate,
    title: 'Proven Results',
    description: 'A track record of confident speakers and successful students.',
  },
  {
    icon: FaClock,
    title: 'Flexible Batches',
    description: 'Morning and evening batches designed around your schedule.',
  },
  {
    icon: FaCertificate,
    title: 'Recognized Certification',
    description: 'Course completion certificates that add value to your profile.',
  },
  {
    icon: FaHeadset,
    title: 'Personal Mentoring',
    description: 'One-on-one guidance and doubt-clearing for every learner.',
  },
  {
    icon: FaMapMarkerAlt,
    title: 'Convenient Location',
    description: 'Easily reachable campus on SH75, Saharghat, Madhubani.',
  },
]

// ── Band 5 · Learning journey ───────────────────────────────────────────────
// The six stages a learner moves through, in the order the institute specified.
// Consumed by the shared <Timeline>, whose item shape is `{ title, description, icon }`
// and which keys on `title` — so every title must stay unique, and each `icon` must be
// a component REFERENCE rather than JSX.
//
// NO-PROMISE CONTRACT: every description states what the LEARNER DOES at that stage and
// nothing else. None promises an outcome, a level of fluency, a timeframe, a score, a
// pass rate or a placement — the institute can stand behind its process, so the process
// is what this band describes. "Achieve Your Goal" is the institute's own stage name, and
// even its copy describes the work of pursuing the learner's OWN goal rather than
// guaranteeing a result.
const LEARNING_JOURNEY = [
  {
    icon: FaSearch,
    title: 'Discover',
    description:
      'Browse the four tracks — English, Science, Computer and Career — and see which programs line up with what you want to work on.',
  },
  {
    icon: FaClipboardCheck,
    title: 'Choose',
    description:
      'Talk it through in a free counseling session, then pick the program and the batch timing that fit your schedule.',
  },
  {
    icon: FaBookOpen,
    title: 'Learn',
    description:
      'Attend your batch and work through the course outline with your teacher, one topic at a time.',
  },
  {
    icon: FaMicrophone,
    title: 'Practice',
    description:
      'Put every lesson to use straight away — speaking practice, group discussion and hands-on computer lab work in class.',
  },
  {
    icon: FaChartLine,
    title: 'Build Confidence',
    description:
      'Present, ask questions and take part regularly, so speaking up and applying what you have learned becomes routine.',
  },
  {
    icon: FaBullseye,
    title: 'Achieve Your Goal',
    description:
      'Keep working toward the goal you set at the start, reviewing your progress with your mentor and deciding your next step together.',
  },
]

// ── Band 7 · Student success ────────────────────────────────────────────────
// A three-record slice of the SAME testimonial source band 9's carousel rotates
// through, cut to three so it fills exactly one row of the card grid at every width.
// The overlap with band 9 is DELIBERATE: `src/data/testimonials.js` is the single
// source of truth for student voice and no new testimonial may be authored, so the two
// bands are differentiated by FRAMING rather than by data — band 7 is the static,
// scannable grid that routes into /success-stories, band 9 the rotating carousel.
// Sliced at module scope so the page body stays a pure composition.
const FEATURED_SUCCESS_STORIES = testimonials.slice(0, 3)

// ── Band 10 · Events / content ──────────────────────────────────────────────
// How many event records the band previews: three fills exactly one grid row at every
// width, so the band never leaves a ragged second row. WHICH records are selected is
// derived per render inside the component (see `featuredEvents`), because the selection
// depends on the current date and so cannot be frozen at module scope.
const FEATURED_EVENT_COUNT = 3

// One second of grace past the boundary, so the rollover timer lands just AFTER
// midnight rather than on it. Timer callbacks can fire a fraction early, and a
// callback that runs at 23:59:59.999 would read the OLD day and schedule its
// successor a full day out, skipping a rollover. One second is imperceptible to
// the reader and removes that class of off-by-one entirely. Same value and same
// reasoning as `src/pages/Events.jsx`.
const ROLLOVER_GRACE_MS = 1000

/**
 * The start of the current day in the viewer's LOCAL timezone, as a timestamp.
 *
 * This is the cut-off band 10's event preview compares against. Local midnight is
 * used rather than the current instant so a session scheduled for later today still
 * counts as upcoming, and it is expressed as a number so it can be held in state and
 * compared with `Date.prototype.getTime()` values directly.
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
 * bumped value can land an hour either side of it. Re-normalising pins the result to
 * the real local start of the next day, which keeps the schedule correct across a
 * DST transition instead of firing an hour early or late.
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

function Home() {
  // ── Band 10 · the today-or-later cut-off ──────────────────────────────────
  // Start of TODAY in the viewer's local timezone, held in STATE so that crossing
  // midnight can actually re-render this page. Initialised lazily (the function is
  // PASSED, not called) so the clock is read once on mount rather than on every
  // render. A value merely derived during render is not sufficient on its own —
  // see the DAY-BOUNDARY LIFECYCLE note in the JSDoc above for why.
  //
  // The boundary is local MIDNIGHT rather than `Date.now()` on purpose: a
  // session scheduled for later today is still upcoming, and comparing against
  // the current instant would drop it from the preview part-way through its own
  // day. Identical reasoning, identical boundary and identical comparison to
  // /events, so the two surfaces retire a session on the same calendar day.
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

    // Clear whichever timer is currently pending. Because each callback reassigns
    // `timerId` before scheduling the next one, this always cancels the live timer
    // — so leaving the route leaves nothing pending and nothing can call
    // `setDayStart` after unmount.
    return () => clearTimeout(timerId)
  }, [])

  // <EventCard> renders a "Register" action on every card it is given, so a record whose
  // date has passed cannot simply be left in the preview: it would invite registration
  // for a session that is over. Filtering here is what keeps that card's call to action
  // truthful.
  //
  // Dates are compared through `parseCivilDate` (src/lib/dates.js), which reads a bare
  // 'YYYY-MM-DD' value as a CIVIL date in local time. The native `new Date('YYYY-MM-DD')`
  // would parse UTC midnight instead, so in any timezone west of UTC the comparison
  // would land on the previous local calendar day and retire a session a day early. Both
  // sides of the comparison are local midnights and are directly comparable everywhere.
  //
  // `filter` preserves source order and src/data/events.js is authored chronologically,
  // so no re-sort is needed — and sorting the raw strings would bypass the civil-date
  // parse above. The slice is taken AFTER the filter, so the band previews the next
  // three upcoming sessions rather than whatever survives from the first three records.
  const featuredEvents = events
    .filter((event) => {
      const eventDate = parseCivilDate(event.date)
      // `parseCivilDate` yields null for a missing, non-string, malformed or
      // rollover date (e.g. '2026-13-40'). Guard before touching the value so a
      // bad record is dropped from the preview rather than throwing.
      if (!eventDate) return false
      return eventDate.getTime() >= dayStart
    })
    .slice(0, FEATURED_EVENT_COUNT)

  return (
    <>
      <Seo
        canonical="/"
        description="CIBLE School of Language, Madhubani — Spoken English, communication, science (PCM/PCB) and computer courses. Learn English, build confidence, shape your future. Admissions open."
      />
      <StructuredData organization localBusiness />

      {/* Band 1 · Hero — owns the page's single <h1> and the tier-1 "Apply Now"
          admission action, and self-wraps its own `bg-surface` band. Rendered bare: it
          is never wrapped, never gated by a scroll reveal and never animated, because it
          holds the LCP element (see the invariant in Hero's own JSDoc). */}
      <Hero />

      {/* Band 2 · Trust / proof — the reassurance strip directly beneath the hero,
          where a first-time visitor decides whether to keep reading. Every claim traces
          back to something the site already publishes and none of them is a statistic;
          the one value the data still marks as unconfirmed is the schedule, so the band
          closes with a <RepresentativeNote> scoped to it. White band, against the
          tinted hero above. */}
      <Container as="section" className="py-16 md:py-20">
        <SectionHeading
          eyebrow="At a Glance"
          title="What to Know Before You Enroll"
          subtitle="Key enrolment details — what we teach, where we are, when we are open, and how to talk to us first."
        />
        {/* A real list, so assistive technology announces the count and the tracks read
            as content rather than decoration. */}
        <ul className="mt-10 flex flex-wrap justify-center gap-2">
          {COURSE_CATEGORIES.map((category) => (
            <li key={category}>
              <Badge variant="neutral">{category}</Badge>
            </li>
          ))}
        </ul>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST_SIGNALS.map((signal) => (
            <FeatureCard
              key={signal.title}
              icon={signal.icon}
              title={signal.title}
              description={signal.description}
            />
          ))}
        </div>
        {/* Placed BELOW the grid, unlike bands 7 and 10, whose notes disclose a whole
            grid and so sit under the heading: here exactly one of three cards carries an
            unconfirmed fact, so the note has to read as a footnote to that card rather
            than as a caveat over the campus address. The wording names the timings for
            the same reason, and reuses the Footer's and /events' existing phrasing so no
            new claim is authored. The tighter top gap against the grid's own rhythm is
            what binds the note to what it annotates. */}
        <RepresentativeNote className="mt-8">
          The batch timings and visiting hours shown above are representative and
          are still to be confirmed by the institute before launch — please call or
          WhatsApp us to check the current schedule before you visit.
        </RepresentativeNote>
        {/* Tier 3 — the two orientation routes out of this band, for a visitor who
            wants to look before committing. Both are the low-emphasis step on purpose:
            this band sits directly under the hero, and anything heavier would compete
            with <Hero>'s own tier-1 action just above. "View Programs" answers the track
            chips and "Enquire Now" answers the counseling card, so each label lands on
            the fact that prompts it. Column-first so the pair never competes for width
            on narrow screens, becoming a row from `sm`. */}
        <div className="mt-10 flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row">
          <Button to="/courses" variant="tertiary" size="md">View Programs</Button>
          <Button to="/contact" variant="tertiary" size="md">Enquire Now</Button>
        </div>
      </Container>

      {/* Band 3 · Courses — the featured cross-category selection, spread across all
          four tracks and linking out to the full catalog. Tinted band, alternating
          against the white band above. */}
      <section className="bg-surface py-16 md:py-20">
        <Container>
          <SectionHeading
            eyebrow="Courses"
            title="Popular Courses"
            subtitle="Explore our most sought-after programs designed to build fluency, confidence and career readiness."
          />
          {/* Disclosure for the discovery fields these cards render. `CourseCard`
              surfaces `level`, `duration`, `eligibility`, `suitableFor`,
              `prerequisites` and `highlights`, and the header of
              src/data/courses.js marks every one of them representative and still
              to be confirmed — so the six tiles below make exactly the claims
              /courses and the three track pages disclose, and this band must
              disclose them too rather than leaning on the Footer alone. The
              sentence is /courses' wording verbatim (Courses.jsx), so one claim
              reads identically wherever a visitor meets it. ABOVE the grid, like
              bands 7 and 10 and unlike bands 2 and 4: this note caveats every card
              in the band, and a whole-grid caveat has to be read before the grid,
              whereas a note qualifying only some cards reads as a footnote and sits
              under them. `mt-8` (32px) against the grid's `mt-10` binds the note to
              the content it annotates. */}
          <RepresentativeNote className="mt-8">
            Course details shown on these cards — the duration, level, eligibility,
            who each course suits, any prerequisites and the listed highlights — are
            representative and shown for demonstration. Please confirm the current
            curriculum, entry requirements, batch timings and fees with the institute
            before enrolling.
          </RepresentativeNote>
          <div className="mt-10">
            <CourseGrid items={featuredCourses} />
          </div>
          {/* Tier 2 — supporting catalog navigation. `outline` keeps it plainly
              actionable while staying subordinate to band 5's admission primary.
              "Explore Courses" is the stronger of the two approved catalog labels and it
              sits at the bottom of the grid, where the visitor has just read the
              featured programs and wants the rest; its counterpart "View Programs" is
              band 2's tier-3 orientation link off the track chips. Both resolve to
              /courses but differ in emphasis and in job, so they are never
              interchangeable synonyms side by side. */}
          <div className="mt-10 flex justify-center">
            <Button to="/courses" variant="outline" size="lg">Explore Courses</Button>
          </div>
        </Container>
      </section>

      {/* Band 4 · Why choose CIBLE — representative differentiators (see the caveat at
          the `features` array). White band, alternating against the tinted band
          above. */}
      <Container as="section" className="py-16 md:py-20">
        <SectionHeading
          eyebrow="Why CIBLE"
          title="Why Choose CIBLE School of Language"
          subtitle="Everything you need to learn effectively and reach your goals."
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} />
          ))}
        </div>
        {/* Disclosure for this band's three unconfirmed cards — "Expert Faculty",
            "Proven Results" and "Recognized Certification" (see the `features`
            declaration, where each is flagged). Those are page PROSE rather than a
            `src/data/*` record, and prose was previously disclosed site-wide only;
            the Footer band now names this class of copy explicitly AND the claim is
            disclosed here at the point it is made, because a qualitative claim about
            teaching, results and certification is exactly what a visitor is most
            likely to read as verified fact.
            BELOW the grid, the band-2 shape rather than the band-3/7/10 one: three
            of these six cards carry an unconfirmed claim and three (batch timings,
            mentoring, campus location) restate facts the site already states
            elsewhere, so the note is a footnote to specific cards and must not read
            as a caveat over the whole band. `mt-8` (32px) against the grid's 40px
            rhythm is the same deliberate tightening band 2 uses to bind a footnote
            to the grid above it. The wording names only what the cards already say
            and asserts nothing further, and it reuses the Footer's "representative"
            / "before launch" phrasing so no new claim is authored. */}
        <RepresentativeNote className="mt-8">
          These strengths are representative page copy shown for demonstration — our
          teaching experience, the results described above and the recognition behind
          our completion certificates are still to be confirmed by the institute
          before launch.
        </RepresentativeNote>
      </Container>

      {/* Band 5 · Learning journey — the six stages, rendered by the shared <Timeline>:
          a semantic <ol> with <h3> step titles and a stagger reveal that mounts at its
          final state under prefers-reduced-motion, so this band needs no observer of its
          own. It carries the page's tier-1 admission action, and "Start Your Learning
          Journey" is reserved for this band; the page's other two routes to /admission
          are <Hero> and <CTASection>, which both use "Apply Now". */}
      <section className="bg-surface py-16 md:py-20">
        <Container>
          <SectionHeading
            eyebrow="How It Works"
            title="Your Learning Journey"
            subtitle="Six stages, from your first look at the catalog to the goal you set for yourself — and what you will be doing at each one."
          />
          <div className="mt-10">
            <Timeline items={LEARNING_JOURNEY} />
          </div>
          {/* Tier 1 — the admission action, and the only filled control this page adds
              of its own. Never demote it. */}
          <div className="mt-10 flex justify-center">
            <Button to="/admission" variant="primary" size="lg">Start Your Learning Journey</Button>
          </div>
        </Container>
      </section>

      {/* Band 6 · Faculty / mentors — the first three mentors, linking out to the full
          roster. White band, for the alternation. */}
      <Container as="section" className="py-16 md:py-20">
        <SectionHeading
          eyebrow="Our Team"
          title="Meet Our Faculty"
          subtitle="Experienced mentors dedicated to your growth."
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {faculty.slice(0, 3).map((member) => (
            <FacultyCard key={member.name} member={member} />
          ))}
        </div>
        {/* Tier 3 — browsing the roster is the least conversion-critical action on the
            page, so it takes the honest low-emphasis step, whose persistent underline
            makes the demotion a shape difference that survives without colour vision.
            The label is left as it is because no institute-supplied string covers
            faculty browsing and inventing one would be content drift. */}
        <div className="mt-10 flex justify-center">
          <Button to="/faculty" variant="tertiary" size="md">View all faculty</Button>
        </div>
      </Container>

      {/* Band 7 · Student success — the same <ReviewCard> the /success-stories route
          uses, over a three-record slice of `testimonials`. The visible <SectionHeading>
          supplies this band's single <h2>, which ReviewCard cannot: it renders a
          <figure>/<blockquote>/<figcaption> with no heading of its own. The disclosure
          wording matches /success-stories, and <RepresentativeNote> self-hides once
          `siteConfig.representativeContent` is cleared. */}
      <section className="bg-surface py-16 md:py-20">
        <Container>
          <SectionHeading
            eyebrow="Student Success"
            title="Success Stories From Our Students"
            subtitle="Representative examples of learner and parent stories from our spoken English, science and computer tracks."
          />
          <RepresentativeNote className="mt-8">
            These success stories and reviews are representative samples for
            demonstration, not verified student records. They will be replaced with
            consent-approved outcomes before launch.
          </RepresentativeNote>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_SUCCESS_STORIES.map((review) => (
              <ReviewCard key={review.name} review={review} />
            ))}
          </div>
          {/* Tier 3 — the onward route into the full collection. */}
          <div className="mt-10 flex justify-center">
            <Button to="/success-stories" variant="tertiary" size="md">Read more success stories</Button>
          </div>
        </Container>
      </section>

      {/* Band 8 · Statistics — proof AFTER the value story rather than before it: by
          this point bands 2–7 have shown the offering, so the counters read as evidence
          instead of as an unearned claim above the fold. Values come from
          src/data/stats.js unchanged, and two of them are representative placeholders
          disclosed by the Footer's site-wide notice (see REPRESENTATIVE CONTENT in the
          file header). Rendered BARE because <Statistics> self-wraps its own band and
          supplies its own sr-only <h2> via `aria-labelledby`; wrapping it in another
          section or giving it a background would duplicate that heading and break the
          alternation. */}
      <Statistics />

      {/* Band 9 · Testimonials — the rotating carousel over the full `testimonials`
          source, framed as the student-voice highlight reel where band 7 is the static
          grid. The records are representative samples, disclosed as such in band 7, so
          neither the subtitle nor the eyebrow may describe them as verified or verbatim
          student voices. White band, between the statistics band above and the tinted
          band below. */}
      <Container as="section" className="py-16 md:py-20">
        <SectionHeading
          eyebrow="Testimonials"
          title="What Our Students Say"
          subtitle="Swipe through highlights from the CIBLE learning community."
        />
        <div className="mt-10">
          <TestimonialSlider />
        </div>
      </Container>

      {/* Band 10 · Events / content — a content teaser rather than a conversion band,
          so it keeps to two low-emphasis onward routes. The heading names the calendar
          instead of promising "Upcoming", but the CARDS still promise: <EventCard>
          renders a "Register" action on every record it is given, so a neutral heading
          is not on its own enough once a fixture date passes. `featuredEvents`, derived
          at the top of this component, therefore previews only sessions dated today or
          later. <EventCard> renders its branded gradient and date fallback because every
          event image is null, so this band needs no artwork. */}
      <section className="bg-surface py-16 md:py-20">
        <Container>
          <SectionHeading
            eyebrow="Events & Insights"
            title="From the CIBLE Calendar"
            subtitle="Examples of the workshops, seminars and orientation sessions on our calendar for students and parents — plus practical study and interview guidance on our blog."
          />
          <RepresentativeNote className="mt-8">
            These events are representative examples shown for demonstration.
            Dates, times and details will be confirmed by the institute before
            launch — please check with us on WhatsApp or by phone before attending.
          </RepresentativeNote>
          {featuredEvents.length > 0 ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredEvents.map((event) => (
                <EventCard key={event.title} event={event} />
              ))}
            </div>
          ) : (
            // Empty state — rendered instead of an empty grid once every session in the
            // data has passed, so the band is never left as a heading, a disclosure and
            // two links over nothing. The copy and the panel treatment match /events, so
            // the two surfaces say the same thing and no new claim is authored.
            //
            // Deliberately NOT a live region: the list is derived once per render with no
            // in-page control, so a status role would be redundant ARIA. The white panel
            // reads as a raised card against this band's tinted fill — the same hairline
            // treatment /events gets on its white background.
            <p className="mt-10 rounded-2xl border border-border bg-white px-6 py-8 text-center text-sm leading-relaxed text-muted">
              No upcoming events are scheduled right now. Please call or WhatsApp
              us and we will be happy to tell you what is coming up next.
            </p>
          )}
          {/* Tier 3 — both onward routes. Column-first so the pair never competes for
              width on narrow screens, becoming a row from `sm`. */}
          <div className="mt-10 flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row">
            <Button to="/events" variant="tertiary" size="md">See all events</Button>
            <Button to="/blog" variant="tertiary" size="md">Read our blog</Button>
          </div>
        </Container>
      </section>

      {/* Band 11 · Final CTA — the shared admission close every page carries. It owns
          its own tiered action row (admission, advisor, WhatsApp and call channels), so
          it is rendered prop-free and no CTA markup is duplicated here. Transparent over
          the white page background, so it alternates against the tinted band above. */}
      <CTASection />
    </>
  )
}

export default Home
