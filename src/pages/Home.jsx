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
// Civil-date parser shared with /events, so band 10's preview retires a session
// on exactly the same local calendar day the dedicated page does.
import { parseCivilDate } from '../lib/dates.js'

/**
 * Home — the CIBLE School of Language landing page (index route `/`).
 *
 * Lazy-loaded by `src/App.jsx` (`const Home = lazy(() => import('./pages/Home.jsx'))`)
 * and rendered at `<Route index element={<Home />} />` INSIDE the shared
 * `<Layout>`. Layout already owns the page chrome — the `<Navbar>`, the `<main>`
 * landmark, the `<Footer>` (which globally renders the Newsletter), the floating
 * WhatsApp / Call widgets, the mobile sticky bottom CTA, and `ScrollToTop`.
 * Therefore this page renders ONLY the page CONTENT: it never emits a
 * `<main>`/`<header>`/`<footer>`, never re-renders the nav/footer or the
 * floating/sticky conversion widgets, and never duplicates the Newsletter.
 *
 * Composition — eleven conversion-ordered bands, each one a composition of the
 * single canonical component set (nothing here is hand-rolled or duplicated):
 *    1. Hero              — <Hero> (owns the page <h1> and the "Apply Now" CTA).
 *    2. Trust / proof     — <Badge> track chips + <FeatureCard> facts +
 *                           <RepresentativeNote> + the "View Programs" /
 *                           "Enquire Now" tier-3 pair.
 *    3. Courses           — <CourseGrid> over `featuredCourses`.
 *    4. Why choose CIBLE  — <FeatureCard> grid over `features`.
 *    5. Learning journey  — <Timeline> over `LEARNING_JOURNEY` + the page's
 *                           "Start Your Learning Journey" admission CTA.
 *    6. Faculty / mentors — <FacultyCard> preview of the first three mentors.
 *    7. Student success   — <ReviewCard> grid + <RepresentativeNote>.
 *    8. Statistics        — <Statistics> (self-wrapping blue counters band).
 *    9. Testimonials      — <TestimonialSlider> carousel.
 *   10. Events / content  — <EventCard> grid over the today-or-later slice of
 *                           `events`, or the empty-state note when nothing is
 *                           upcoming, + <RepresentativeNote>.
 *   11. Final CTA         — <CTASection> (the admission close on all 18 pages).
 * The funnel deliberately puts proof AFTER the value story: statistics land at
 * band 8, where they read as evidence for what bands 2–7 have already shown,
 * rather than as an unearned claim above the fold.
 *
 * Provenance — the page carries two different kinds of content, and which kind a
 * string belongs to decides where it may be edited:
 *   • DATA-DERIVED RECORDS, read from the `src/data/*` single source of truth and
 *     never restated here — the chip row and featured programs (`courses`), the
 *     mentor preview (`faculty`), bands 7 and 9's student voice (`testimonials`),
 *     band 10's sessions (`events`), band 8's counters (`stats`, via
 *     <Statistics>) and band 2's campus address and opening hours (`siteConfig`).
 *     Changing any of those means changing the data module, not this file.
 *   • MODULE-LOCAL PAGE COPY, authored here as the three constants below:
 *     `TRUST_SIGNALS` (its second and third card headings, and its third card's
 *     description), `features` (band 4) and `LEARNING_JOURNEY` (band 5's stage
 *     names and step descriptions). This is page prose rather than a record, which
 *     is why it sits at module scope here instead of in `src/data/*`.
 *
 * Content integrity: no band authors a statistic, rating, price, pass rate,
 * timeframe or placement figure. Every such value the page shows is a data value
 * rendered unchanged — the counters (`stats`), course durations (`courses`), star
 * scores (`testimonials`) and session dates (`events`). The only numbers written in
 * this file are descriptive counts of what the page itself holds (the four course
 * tracks, the six journey stages), both checkable against the data and neither a
 * claim about results. No band's prose asserts anything the data behind it does not
 * already state — there is no claim about how often a question is asked, no claim
 * that a representative quote is a verbatim student voice, and no claim that a
 * representative fixture is an established programme.
 *
 * The page copy is held to the same bar, with one disclosed exception: band 4's
 * `features` array is INHERITED representative copy, carried forward unchanged, and
 * three of its six cards make qualitative claims the institute must confirm or
 * replace before launch — "Expert Faculty", "Proven Results" (with its "track
 * record" line) and "Recognized Certification". Those are flagged at the array
 * itself and disclosed site-wide by the footer's `representativeContent`
 * demo-content band and README's "representative placeholders … editorial copy"
 * note, rather than by a point-of-claim panel: band 4 surfaces no representative
 * RECORD from `src/data/*`, which is what the <RepresentativeNote> panels mark.
 *
 * THREE bands DO surface content that `src/data` marks as representative rather
 * than client-confirmed, and each therefore carries the shared
 * `<RepresentativeNote>`, which self-hides the moment
 * `siteConfig.representativeContent` flips to false:
 *   • Band 2 — its batch-timings card renders `siteConfig.hours`, annotated in
 *     the data as "Representative opening hours (client to confirm)" and named
 *     explicitly in the Footer's site-wide notice. The rest of the band needs no
 *     disclosure and gets none: the campus address is client-supplied, the free
 *     counseling session is the one /faq already offers, and the track chips are
 *     derived from `courses`. The note's wording is scoped to the timings alone
 *     and sits directly beneath the grid, so the disclosure lands at the point of
 *     claim rather than over facts that are not in doubt.
 *   • Band 7 — representative testimonial records.
 *   • Band 10 — representative event fixtures.
 * Band 10 additionally filters its preview to civil dates of today or later, so a
 * session whose date has passed is never shown under an <EventCard> that invites
 * registration; when nothing is upcoming the band renders the same empty-state
 * note /events uses instead of an empty grid. Its heading makes no temporal promise
 * either ("From the CIBLE Calendar", not "Upcoming"), so the band is truthful both
 * by its wording and by what it filters.
 *
 * Accessibility (WCAG AA): the page carries EXACTLY ONE `<h1>`, provided by
 * `<Hero>`. All ten bands that follow it carry an `<h2>`, from two owners: nine
 * get a visible one from `<SectionHeading>`, which defaults to `as="h2"` (its
 * `eyebrow` renders as a `<p>`, deliberately outside the outline), while band 8's
 * `<Statistics>` supplies its own `sr-only` `<h2>` linked by `aria-labelledby` —
 * which is why that band alone is rendered bare rather than wrapped in a heading
 * of this page's making. The card and step titles inside the bands are `<h3>`s, so
 * the outline stays h1 → h2 → h3 with no skipped level. Content bands are semantic
 * `<section>` elements (via `Container as="section"` or a `<section>` wrapping a
 * `<Container>`), and every navigational action uses the polymorphic
 * `<Button to="…">` so it renders a real react-router `<Link>` with `Button`'s
 * ≥44px touch-target floor.
 *
 * CTA hierarchy — three visually distinct tiers, so the admission action is never
 * competed with: tier 1 is the filled `primary` "Start Your Learning Journey"
 * (band 5) alongside <Hero>'s and <CTASection>'s own "Apply Now"; tier 2 is the
 * `outline` "Explore Courses" (band 3); tier 3 is the low-emphasis `tertiary`
 * step — persistently underlined, so its demotion is a shape difference rather
 * than a colour one — used for band 2's orientation pair ("View Programs",
 * "Enquire Now") and for the faculty, success-story and events/blog routes.
 * <Hero> and <CTASection> own their own action rows and are rendered prop-free.
 *
 * All six of the institute's approved CTA labels are content contracts and all
 * six are placed at the destination the specification maps them to. On this page:
 * "Apply Now" (<Hero> and <CTASection> → /admission), "Start Your Learning
 * Journey" (band 5 → /admission), "Explore Courses" (band 3 → /courses), "View
 * Programs" (band 2 → /courses), "Enquire Now" (band 2 → /contact) and "Talk to
 * an Advisor" (<CTASection> → /contact). Each pair shares a destination but never
 * competes as a synonym, because the two members always differ in emphasis tier
 * AND in the job they do: "View Programs" is band 2's tier-3 orientation link off
 * the track chips while "Explore Courses" is band 3's tier-2 "see the rest of the
 * catalog" action under the grid itself; "Enquire Now" is band 2's tier-3 answer
 * to the free-counseling card while "Talk to an Advisor" is the tier-2 supporting
 * action in the closing band nine sections later.
 *
 * Styling: 100% token-driven (Tailwind v4 `@theme` tokens from `src/index.css`)
 * with zero hardcoded and zero arbitrary bracket values — spacing stays on the
 * 8px scale (`py-16 md:py-20` bands, `mt-10` heading gaps, `gap-6` card gaps) and
 * the bands alternate white / `bg-surface` so that no two consecutive bands share
 * a background: surface (<Hero>) → white → surface → white → surface → white →
 * surface → `bg-primary-700` (<Statistics>) → white → surface → white
 * (<CTASection>, which is transparent over the white page background). That
 * alternation is the whole of the section-transition treatment — rhythm from
 * consistency, not added ornament. This page is stateless and hook-free (all
 * animation, observation and state live inside the composed components, so no
 * scroll observer or `framer-motion` import is added here), which is what lets it
 * emit its own lean, code-split route chunk. Band 10's date cut-off is a plain
 * value derived in the component body — not `useState`/`useMemo` — so it costs the
 * chunk nothing and keeps that contract intact.
 *
 * @returns {import('react').ReactElement} The composed Home page content.
 */

// ── Band 2 · Trust / proof ──────────────────────────────────────────────────
// The course categories, DERIVED from the `courses` source of truth rather than
// restated, so the chip row can never drift out of step with the catalog: a new
// category in the data becomes a chip here automatically, and a renamed one
// cannot leave a stale label behind. Order follows the data (English → Science →
// Computer → Career). Same `Array.from(new Set(...))` idiom `CourseGrid` uses to
// build its filter list, so the two derivations stay recognisably one pattern.
const COURSE_CATEGORIES = Array.from(new Set(courses.map((course) => course.category)))

// Verifiable, ALREADY-PUBLISHED facts only. Nothing here is a statistic, rating,
// award, accreditation, years-in-operation or superlative. The two location/hours
// cards carry no page-authored value at all: their descriptions ARE `siteConfig` —
// the same source the Footer and /contact render, so this band cannot contradict
// them and cannot go stale independently of them — and the first card's heading is
// likewise interpolated from `addressParts`. What IS page copy written here (see
// the Provenance note in the file header) is the second and third headings and the
// third description, and each of those restates something the site already
// publishes: the third card describes the free counseling session /faq already
// offers, over the phone / WhatsApp / email channels `siteConfig` already lists.
//
// One of those facts is nonetheless NOT yet client-confirmed: `siteConfig`
// annotates `hours` as "Representative opening hours (client to confirm)", and the
// Footer's site-wide notice names opening hours among the values still to be
// verified. Rendering a representative schedule as if it were settled is the kind
// of unbacked assertion this page is not allowed to make, so the band carries a
// <RepresentativeNote> scoped to the timings alone (see the band 2 JSX below).
// The address and the counseling offer are client-supplied and stay undisclosed.
// Each `icon` is a react-icons COMPONENT REFERENCE, as <FeatureCard> requires.
const TRUST_SIGNALS = [
  {
    icon: FaMapMarkerAlt,
    // Built from `addressParts` so the title tracks the data too.
    title: `On Campus in ${siteConfig.addressParts.addressLocality}, ${siteConfig.addressParts.addressRegion}`,
    description: siteConfig.address,
  },
  {
    icon: FaRegClock,
    // Deliberately NOT "Open six days a week": that would be a derived claim in
    // prose that no longer tracks the data, so it could contradict `hours` the
    // moment the institute confirms a different schedule. The heading names the
    // fact; the published values below carry it.
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
// Featured on the Home page: a curated spread across ALL FOUR course categories
// (English, Science, Computer, Career) so the landing page represents the full
// catalog rather than a single track. The naive `courses.slice(0, 6)` surfaced
// five English programs + one Science and omitted Computer and Career entirely.
// Selected by slug from the canonical `courses` source of truth and preserved in
// this order; any slug not present is skipped defensively so the grid never
// renders an undefined tile.
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
// Representative "why choose us" highlights, INHERITED UNCHANGED from the page's
// first build — refine with genuine institute differentiators (AAP §0.7.2).
//
// STANDING ACTION ITEM, and the one place on this page where copy makes a claim
// the institute has not yet confirmed: "Expert Faculty", "Proven Results" (whose
// description asserts "a track record of confident speakers and successful
// students") and "Recognized Certification" (which implies recognition by a body
// none of the data names) must each be confirmed, qualified or replaced before
// launch. They are disclosed site-wide rather than at the point of claim — the
// footer's `representativeContent` demo-content band and README's "representative
// placeholders … editorial copy" note — because this band renders no
// representative RECORD from `src/data/*`, which is what a <RepresentativeNote>
// panel marks. The remaining three cards describe the batch timings, mentoring and
// campus location the site already states elsewhere. Values are frozen here: the
// fix is institute-supplied wording, not a rewrite in this file.
//
// Each `icon` is a react-icons COMPONENT REFERENCE (not a rendered element);
// `FeatureCard` renders it internally as decorative.
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
// The six stages a learner moves through, in the order the institute specified:
// Discover → Choose → Learn → Practice → Build Confidence → Achieve Your Goal.
// Consumed by the shared <Timeline>, whose item shape is `{ title, description,
// icon }` and which uses `title` as the React key — so every title here must stay
// unique (they are) and each `icon` must be a component REFERENCE, never JSX.
//
// Every description states what the LEARNER DOES at that stage and nothing else.
// None of them promises an outcome, a level of fluency, a timeframe, a score, a
// pass rate or a placement: the institute can stand behind its process, so the
// process is what this band describes. "Achieve Your Goal" is the institute's own
// stage name and stands as a title, but its copy still describes the work of
// pursuing the learner's OWN goal rather than guaranteeing a result.
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
// A three-record slice of the SAME six-testimonial source that band 9's carousel
// rotates through, cut to three because the card grid ladder tops out at
// `lg:grid-cols-3`. The overlap with band 9 is DELIBERATE, not an oversight:
// `src/data/testimonials.js` is the single source of truth for student voice and
// no new testimonial may be authored, so the two bands are differentiated by
// FRAMING rather than by data — band 7 is the static, scannable success grid that
// routes into /success-stories, band 9 is the rotating "What Our Students Say"
// carousel. Sliced at module scope so the page body stays a pure composition.
const FEATURED_SUCCESS_STORIES = testimonials.slice(0, 3)

// ── Band 10 · Events / content ──────────────────────────────────────────────
// How many event records the band previews. The card grid ladder tops out at
// `lg:grid-cols-3`, so three fills exactly one row at every width and the band
// never leaves a ragged second row. The records themselves are selected per
// render inside the component (see `featuredEvents` below) because the selection
// depends on the current date and therefore cannot be frozen at module scope.
const FEATURED_EVENT_COUNT = 3

function Home() {
  // ── Band 10 · the today-or-later cut-off ──────────────────────────────────
  // Start of TODAY in the viewer's local timezone. Derived per render rather
  // than at module scope: a module-level value is computed once when the chunk
  // is first imported and then frozen for the life of the tab, so a long-lived
  // SPA session would keep previewing a session that has already happened. This
  // is a plain derived value, not a hook, so the page stays stateless and
  // hook-free and its route chunk stays lean.
  //
  // The boundary is local MIDNIGHT rather than `Date.now()` on purpose: a
  // session scheduled for later today is still upcoming, and comparing against
  // the current instant would drop it from the preview part-way through its own
  // day. Identical reasoning, identical boundary and identical comparison to
  // /events, so the two surfaces retire a session on the same calendar day.
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  // <EventCard> renders a "Register" action on every card it is given, so a
  // record whose date has passed cannot simply be left in the preview: it would
  // invite registration for a session that is over. Filtering here is what keeps
  // that card's call to action truthful, and it is why this selection is not the
  // `events.slice(0, 3)` it used to be.
  //
  // Dates are compared through `parseCivilDate` (src/lib/dates.js), which reads a
  // bare 'YYYY-MM-DD' value as a CIVIL date via `new Date(y, m - 1, d)` in local
  // time. The native `new Date('YYYY-MM-DD')` would instead parse UTC midnight,
  // so in any timezone west of UTC the comparison would land on the previous
  // local calendar day and retire a session a day early. Both sides of the
  // comparison are local midnights and are directly comparable in every timezone.
  //
  // `filter` preserves source order and src/data/events.js is already authored
  // chronologically, so no re-sort is needed (and sorting the raw 'YYYY-MM-DD'
  // strings would bypass the civil-date parse above). The slice is taken AFTER
  // the filter so the band always previews the next three upcoming sessions
  // rather than whatever survives from the first three records.
  const featuredEvents = events
    .filter((event) => {
      const eventDate = parseCivilDate(event.date)
      // `parseCivilDate` yields null for a missing, non-string, malformed or
      // rollover date (e.g. '2026-13-40'). Guard before touching the value so a
      // bad record is dropped from the preview rather than throwing.
      if (!eventDate) return false
      return eventDate.getTime() >= startOfToday.getTime()
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
          admission action, and self-wraps its own `bg-surface` band. Rendered
          bare and never wrapped, gated by a scroll reveal or animated: it holds
          the LCP element, and keeping it at opacity 0 until an observer fires is
          the regression its own JSDoc records. */}
      <Hero />

      {/* Band 2 · Trust / proof — the reassurance strip directly beneath the
          hero, where a first-time visitor decides whether to keep reading. Every
          claim traces back to something the site already publishes: the chips are
          the course categories derived from `courses`, the address and hours are
          `siteConfig` values rendered verbatim, and the third card's copy — page
          prose, written in `TRUST_SIGNALS` — restates the free counseling session
          /faq already offers over the channels `siteConfig` lists. It authors no
          statistic. The one value here that the data still marks as unconfirmed is
          the schedule, so the band closes with a <RepresentativeNote> scoped to it.
          White band — the `bg-surface` hero sits above it. */}
      <Container as="section" className="py-16 md:py-20">
        <SectionHeading
          eyebrow="At a Glance"
          title="What to Know Before You Enroll"
          subtitle="Key enrolment details — what we teach, where we are, when we are open, and how to talk to us first."
        />
        {/* Track chips — a real list, so assistive technology announces the count
            and the tracks are conveyed as content rather than as decoration.
            `gap-2` matches the chip-row rhythm CourseGrid's filter row uses. */}
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
        {/* Disclosure for the one representative value in this band. Placed
            BELOW the grid rather than above it — bands 7 and 10 disclose whole
            grids, so their notes sit under the heading, whereas here exactly one
            of three cards carries an unconfirmed fact and the note has to read as
            a footnote to that card, not as a caveat over the campus address. The
            wording names the timings explicitly for the same reason, and reuses
            the Footer's site-wide phrasing ("representative", "before launch")
            and /events' "check with us" close, so no new claim is authored.
            `mt-8` is a deliberate 32px against the grid's 40px rhythm: the
            tighter gap is what binds the note to the grid it annotates. */}
        <RepresentativeNote className="mt-8">
          The batch timings and visiting hours shown above are representative and
          are still to be confirmed by the institute before launch — please call or
          WhatsApp us to check the current schedule before you visit.
        </RepresentativeNote>
        {/* Tier 3 — the two orientation routes out of this band, for the visitor
            who wants to look before committing. Both are deliberately the
            low-emphasis `tertiary` step at `md`: this band sits directly under
            the hero, and anything heavier here would compete with <Hero>'s own
            tier-1 "Apply Now" a few hundred pixels above. "View Programs" answers
            the track chips (what we teach) and "Enquire Now" answers the
            counseling card (how to talk to us first), so each label lands on the
            fact that prompts it. Column-first so the pair never competes for
            width at 320px, switching to a row from `sm` — the same shape band 10
            and <CTASection> use for a multi-action row. */}
        <div className="mt-10 flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row">
          <Button to="/courses" variant="tertiary" size="md">View Programs</Button>
          <Button to="/contact" variant="tertiary" size="md">Enquire Now</Button>
        </div>
      </Container>

      {/* Band 3 · Courses — the six most sought-after programs, spread across all
          four categories and linking out to the full catalog. Moved onto the
          tinted form so it alternates against the white band above. */}
      <section className="bg-surface py-16 md:py-20">
        <Container>
          <SectionHeading
            eyebrow="Courses"
            title="Popular Courses"
            subtitle="Explore our most sought-after programs designed to build fluency, confidence and career readiness."
          />
          <div className="mt-10">
            <CourseGrid items={featuredCourses} />
          </div>
          {/* Tier 2 — supporting catalog navigation. `outline` keeps it plainly
              actionable while staying subordinate to band 5's admission primary.
              "Explore Courses" is the stronger of the two approved catalog labels
              and it is placed here, at the bottom of the actual course grid,
              where the visitor has just read six programs and wants the rest.
              Its counterpart "View Programs" sits in the band directly above at
              tier 3, where it is an orientation link off the track chips rather
              than a "see the other four" action — so although both resolve to
              /courses, the two are separated by emphasis and by job, never
              rendered side by side as interchangeable synonyms. */}
          <div className="mt-10 flex justify-center">
            <Button to="/courses" variant="outline" size="lg">Explore Courses</Button>
          </div>
        </Container>
      </section>

      {/* Band 4 · Why choose CIBLE — representative differentiators. Moved onto
          the white form so it alternates against the tinted band above. */}
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
      </Container>

      {/* Band 5 · Learning journey — the six stages a learner moves through,
          rendered by the shared <Timeline>: a semantic <ol> with <h3> step titles
          and a stagger reveal that already mounts at its final state under
          prefers-reduced-motion, so this band needs no observer of its own.
          It carries the page's tier-1 admission action, and "Start Your Learning
          Journey" is the label reserved for this band alone. The page's other two
          routes to /admission are the opening and closing surfaces — <Hero> and
          <CTASection> — and both deliberately use "Apply Now", so that label is
          shown twice on this page: once above the fold and once at the close. */}
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
          {/* Tier 1 — the admission action, and the only filled control this page
              adds of its own. Never demote it. */}
          <div className="mt-10 flex justify-center">
            <Button to="/admission" variant="primary" size="lg">Start Your Learning Journey</Button>
          </div>
        </Container>
      </section>

      {/* Band 6 · Faculty / mentors — the first three mentors, linking out to the
          full roster. Moved onto the white form for the alternation. */}
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
        {/* Tier 3 — browsing the roster is the least conversion-critical action on
            the page, so it is the honest low-emphasis step: `tertiary` drops the
            fill AND the border and keeps a persistent underline, so the demotion
            reads as a shape difference and survives without colour vision, and
            `md` steps the size down from tier 2's `lg` as well. The label is kept
            verbatim because no institute-supplied string covers faculty browsing
            and inventing one would be content drift. */}
        <div className="mt-10 flex justify-center">
          <Button to="/faculty" variant="tertiary" size="md">View all faculty</Button>
        </div>
      </Container>

      {/* Band 7 · Student success — the same <ReviewCard> the /success-stories
          route uses, over a three-record slice of `testimonials`. The visible
          <SectionHeading> supplies this band's single <h2>, which ReviewCard
          cannot: it renders a <figure>/<blockquote>/<figcaption> with no heading
          of its own, which is why /success-stories has to name its grid with an
          sr-only <h2>. A visible heading serves the same purpose here. The
          disclosure wording is reused verbatim from /success-stories rather than
          reinvented, and <RepresentativeNote> self-hides once
          `siteConfig.representativeContent` is turned off. */}
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

      {/* Band 8 · Statistics — proof AFTER the value story rather than before it:
          at this point bands 2-7 have shown the offering, so the counters read as
          evidence instead of as an unearned claim above the fold. Values come from
          src/data/stats.js unchanged. Rendered BARE because <Statistics>
          self-wraps its own `bg-primary-700` band and supplies its own sr-only
          <h2> via `aria-labelledby` — wrapping it in another <section>/<Container>
          or giving it a background would duplicate that landmark and break the
          alternation. */}
      <Statistics />

      {/* Band 9 · Testimonials — the rotating carousel over the full six-record
          `testimonials` source, framed as the student-voice highlight reel where
          band 7 is the static grid. Subtitle reuses /success-stories' slider copy:
          the records are representative samples disclosed as such in band 7, so
          this band must not describe them as verified experiences. The eyebrow is
          the plain band name for exactly that reason — "In Their Words" would
          assert these are verbatim student voices, the same unbacked claim band
          7's subtitle carried and lost. White band, between the blue statistics
          band above and the tinted band below. */}
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

      {/* Band 10 · Events / content — a content teaser, not a conversion band, so
          it keeps to two low-emphasis onward routes. The heading names the
          calendar rather than promising "Upcoming", but the CARDS still promise:
          <EventCard> renders a "Register" action on every record it is given, so a
          neutral heading is not on its own enough to keep the band truthful once a
          fixture date passes. `featuredEvents` (derived at the top of this
          component) therefore previews only sessions dated today or later, using
          the same civil-date cut-off /events uses. One card type only:
          <EventCard>, which renders its branded gradient/date fallback because
          every event image is null, so this band needs no artwork. */}
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
            // Empty state — rendered instead of an empty grid once every session
            // in the data set has passed, so the band is never left as a heading,
            // a disclosure and two links over nothing. The copy and the panel
            // treatment are reused VERBATIM from /events rather than reworded, so
            // the two surfaces say the same thing and no new claim is authored:
            // it states only that nothing is scheduled right now and points at the
            // contact channels the layout shell already mounts globally.
            //
            // Deliberately NOT a live region: this list is derived once per render
            // with no in-page control, so `role="status"` would be redundant ARIA.
            // The `bg-white` panel reads as a raised card against this band's
            // `bg-surface` fill, which is the same hairline treatment /events gets
            // on its white background — one pattern, two backgrounds.
            <p className="mt-10 rounded-2xl border border-border bg-white px-6 py-8 text-center text-sm leading-relaxed text-muted">
              No upcoming events are scheduled right now. Please call or WhatsApp
              us and we will be happy to tell you what is coming up next.
            </p>
          )}
          {/* Tier 3 — both onward routes. Column-first so the pair never competes
              for width at 320px, switching to a row from `sm`, the same shape
              CTASection uses for its multi-action row. */}
          <div className="mt-10 flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row">
            <Button to="/events" variant="tertiary" size="md">See all events</Button>
            <Button to="/blog" variant="tertiary" size="md">Read our blog</Button>
          </div>
        </Container>
      </section>

      {/* Band 11 · Final CTA — the shared admission close that every one of the 18
          pages carries. It owns its own tiered action row (Apply Now / Talk to an
          Advisor / WhatsApp / Call), so it is rendered prop-free and no CTA markup
          is duplicated here. Transparent over the white page background, so it
          alternates against the tinted band above. */}
      <CTASection />
    </>
  )
}

export default Home
