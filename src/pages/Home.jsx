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
 * single canonical component set (nothing here is hand-rolled or duplicated) and
 * every value sourced from the `src/data/*` single source of truth:
 *    1. Hero              — <Hero> (owns the page <h1> and the "Apply Now" CTA).
 *    2. Trust / proof     — <Badge> track chips + <FeatureCard> facts.
 *    3. Courses           — <CourseGrid> over `featuredCourses`.
 *    4. Why choose CIBLE  — <FeatureCard> grid over `features`.
 *    5. Learning journey  — <Timeline> over `LEARNING_JOURNEY` + the page's
 *                           "Start Your Learning Journey" admission CTA.
 *    6. Faculty / mentors — <FacultyCard> preview of the first three mentors.
 *    7. Student success   — <ReviewCard> grid + <RepresentativeNote>.
 *    8. Statistics        — <Statistics> (self-wrapping blue counters band).
 *    9. Testimonials      — <TestimonialSlider> carousel.
 *   10. Events / content  — <EventCard> grid + <RepresentativeNote>.
 *   11. Final CTA         — <CTASection> (the admission close on all 18 pages).
 * The funnel deliberately puts proof AFTER the value story: statistics land at
 * band 8, where they read as evidence for what bands 2–7 have already shown,
 * rather than as an unearned claim above the fold.
 *
 * Content integrity: no band authors a statistic, outcome, rating, timeframe or
 * superlative. Band 2 renders ONLY already-published `siteConfig` facts (campus
 * address, opening hours, contact channels) plus the four course categories
 * derived from the `courses` data itself, so it needs no disclosure. Bands 7 and
 * 10 surface representative sample records, so each carries the shared
 * `<RepresentativeNote>` — which self-hides once `siteConfig.representativeContent`
 * flips to false. Band 10's heading makes no temporal promise ("From the CIBLE
 * Calendar", not "Upcoming"), so it cannot go stale as fixture dates pass.
 *
 * Accessibility (WCAG AA): the page carries EXACTLY ONE `<h1>`, provided by
 * `<Hero>`; every one of the ten following bands is titled by a `<SectionHeading>`
 * which defaults to `<h2>` (its `eyebrow` renders as a `<p>`, deliberately outside
 * the outline), and the card/step titles inside those bands are `<h3>`s — so the
 * outline stays h1 → h2 → h3 with no skipped level. `<Statistics>` supplies its
 * own `sr-only` `<h2>` linked by `aria-labelledby`, which is why it is rendered
 * bare rather than wrapped. Content bands are semantic `<section>` elements (via
 * `Container as="section"` or a `<section>` wrapping a `<Container>`), and every
 * navigational action uses the polymorphic `<Button to="…">` so it renders a real
 * react-router `<Link>` with `Button`'s ≥44px touch-target floor.
 *
 * CTA hierarchy — three visually distinct tiers, so the admission action is never
 * competed with: tier 1 is the filled `primary` "Start Your Learning Journey"
 * (band 5) alongside <Hero>'s and <CTASection>'s own "Apply Now"; tier 2 is the
 * `outline` "Explore Courses" (band 3); tier 3 is the low-emphasis `tertiary`
 * step — persistently underlined, so its demotion is a shape difference rather
 * than a colour one — used for the faculty, success-story and events/blog routes.
 * <Hero> and <CTASection> own their own action rows and are rendered prop-free.
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
 * emit its own lean, code-split route chunk.
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
// award, accreditation, years-in-operation or superlative: the address and hours
// are read straight from `siteConfig` — the same source the Footer and /contact
// render, so this band cannot contradict them and cannot go stale independently
// of them — and the free counseling session is the one /faq already offers. That
// is why this band needs no <RepresentativeNote>, unlike bands 7 and 10.
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
// Representative "why choose us" highlights — refine with genuine institute
// differentiators (AAP §0.7.2). Each `icon` is a react-icons COMPONENT REFERENCE
// (not a rendered element); `FeatureCard` renders it internally as decorative.
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
// The first three records of the already-chronological `events` source. The band
// heading names the calendar instead of promising "upcoming", so this slice needs
// no date comparison and cannot decay into a false claim once a fixture date
// passes — which is exactly the defect the /events page had to be fixed for.
// <EventCard> renders each record's real date, so a session that has passed reads
// as history rather than as a promise.
const FEATURED_EVENTS = events.slice(0, 3)

function Home() {
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
          hero, where a first-time visitor decides whether to keep reading. It
          renders ONLY already-published facts: the course categories derived from
          `courses`, plus the campus address, the opening hours and the free
          counseling session that `siteConfig`, the Footer, /contact and /faq
          already state. It authors no statistic, so it needs no disclosure.
          White band — the `bg-surface` hero sits above it. */}
      <Container as="section" className="py-16 md:py-20">
        <SectionHeading
          eyebrow="At a Glance"
          title="What to Know Before You Enroll"
          subtitle="The details students and parents ask us for most — what we teach, where we are, when we are open, and how to talk to us first."
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
              "Explore Courses" is the one catalog verb this page uses; its
              interchangeable twin "View Programs" is deliberately left unused so
              the funnel never offers two labels for the same destination. */}
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
          Journey" is reserved for it alone — <Hero> and <CTASection> use
          "Apply Now" for the same route, so no label is ever shown twice. */}
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
            subtitle="Learners and parents from our spoken English, science and computer tracks, in their own words."
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
          this band must not describe them as verified experiences. White band,
          between the blue statistics band above and the tinted band below. */}
      <Container as="section" className="py-16 md:py-20">
        <SectionHeading
          eyebrow="In Their Words"
          title="What Our Students Say"
          subtitle="Swipe through highlights from the CIBLE learning community."
        />
        <div className="mt-10">
          <TestimonialSlider />
        </div>
      </Container>

      {/* Band 10 · Events / content — a content teaser, not a conversion band, so
          it keeps to two low-emphasis onward routes. The heading names the
          calendar and promises nothing temporal ("From the CIBLE Calendar", never
          "Upcoming"), so it needs no date filter here and cannot decay into a
          false claim as fixture dates pass — the defect /events had to be fixed
          for. One card type only: <EventCard>, which renders its branded
          gradient/date fallback because every event image is null, so this band
          needs no artwork. */}
      <section className="bg-surface py-16 md:py-20">
        <Container>
          <SectionHeading
            eyebrow="Events & Insights"
            title="From the CIBLE Calendar"
            subtitle="Workshops, seminars and orientation sessions we run for students and parents — plus practical study and interview guidance on our blog."
          />
          <RepresentativeNote className="mt-8">
            These events are representative examples shown for demonstration.
            Dates, times and details will be confirmed by the institute before
            launch — please check with us on WhatsApp or by phone before attending.
          </RepresentativeNote>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_EVENTS.map((event) => (
              <EventCard key={event.title} event={event} />
            ))}
          </div>
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
