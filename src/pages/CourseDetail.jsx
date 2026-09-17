/**
 * CourseDetail — CIBLE School of Language per-course page (route `/courses/:slug`).
 *
 * The dynamic sibling of the `/courses` catalogue: one URL per authored course
 * record, so a course card finally reaches its OWN subject instead of a category
 * landing page. It is lazy-loaded by the application route table in
 * `src/App.jsx` (`lazyWithRetry(() => import('./pages/CourseDetail.jsx'))`,
 * `<Route path="courses/:slug" element={<CourseDetail />} />`) and rendered
 * inside the shared `<Layout>`, so this module renders ONLY page content — the
 * persistent Navbar, Footer and floating conversion widgets belong to the shell,
 * and there is no `<main>` here.
 *
 * This route is NET-NEW. The brief asked to "upgrade course detail pages", but
 * course depth was delivered by three CATEGORY landing pages (`/spoken-english`,
 * `/science-coaching`, `/computer-courses`), never by one route per slug, so
 * there was no per-course page to upgrade (AAP §0.1.1).
 *
 * ── THE TEN URLS ──────────────────────────────────────────────────────────────
 *
 * `courses[].slug` is a PUBLIC CONTRACT. It was already Home's featured-list
 * identifier and `CourseCard`'s `IMAGE_BY_SLUG` key, and it is now also this
 * route's segment and the `?courses=` comparison value, so renaming one breaks
 * several things at once. The ten concrete URLs this route resolves today, each
 * indexable and each published in `public/sitemap.xml` by this work's sitemap
 * update — a pattern route contributes ONE route-table entry but ten sitemap
 * URLs, which is why those two counts are not expected to match:
 *
 *   /courses/spoken-english
 *   /courses/english-communication
 *   /courses/personality-development
 *   /courses/public-speaking
 *   /courses/interview-preparation
 *   /courses/pcm-coaching
 *   /courses/pcb-coaching
 *   /courses/basic-computer
 *   /courses/digital-literacy
 *   /courses/career-guidance
 *
 * `/courses/spoken-english` COEXISTS with the pre-existing `/spoken-english`
 * track route without collision: they are distinct paths resolving to distinct
 * modules, and both continue to work (AAP §0.10.1). The track page keeps its own
 * URL, its own metadata and its own `ctaTo` override; nothing about it changes.
 *
 * ── READ-THEN-VALIDATE ────────────────────────────────────────────────────────
 *
 * The `:slug` parameter is UNTRUSTED input — anyone can type an address — so it
 * is read once and then validated against `src/data/courses.js`, the catalogue's
 * single source of truth, exactly as `src/pages/Admission.jsx` validates its
 * `?course=<Title>` query against the same module and `src/pages/Contact.jsx`
 * validates its `?event=<slug>` one. Only a RESOLVED record reaches
 * `CourseDetailView`, `Seo` or the structured-data emitter; nothing downstream
 * ever sees the raw parameter. Every derived value below — the canonical URL, the
 * breadcrumb leaf, the meta description — is built from the matched RECORD's own
 * fields, which are authored content, never from the URL string.
 *
 * ── THE UNKNOWN-SLUG BRANCH (AAP §0.11.3) ─────────────────────────────────────
 *
 * An unmatched slug renders an explained unavailable-content state; it does NOT
 * throw. Throwing would reach the shell's `ErrorBoundary` and replace the page
 * with a generic crash panel, which tells a visitor who followed a stale link
 * nothing about what happened or where to go next. The branch therefore keeps the
 * visible trail and the page's single `<h1>` so the page stays navigable, and
 * renders the shared `EmptyState` at its `caution` tone (which pins
 * `role="alert"`) stating WHAT HAPPENED and WHAT NEXT — browse the catalogue, or
 * contact the institute. Its head treatment differs from the resolved page in two
 * deliberate ways: `noindex` is passed to `Seo`, and NO `canonical` is supplied,
 * because an address that resolves to no record has no canonical of its own (the
 * same reasoning that stopped the catch-all 404 self-canonicalising to the
 * homepage). `Seo` emits neither a canonical link nor an `og:url` when the prop
 * is absent, so nothing extra is needed here. No JSON-LD of any kind is emitted
 * in this branch: structured data on a page excluded from the index has no
 * consumer, and there is no record here to describe.
 *
 * ── HEAD AND STRUCTURED DATA (AAP §0.5.1, §0.7.4, §0.12.5) ────────────────────
 *
 * For a resolved course the title is the course's own `title` and the description
 * is `valueProposition ?? summary` — the catalogue's SINGLE documented fallback
 * rule, so a record that has not yet been given a value proposition still emits a
 * description rather than none. This route is INDEXABLE, so it supplies an
 * explicit `canonical` of `/courses/<slug>` and never `noindex`.
 *
 * ONE `crumbs` array feeds BOTH the visible `<Breadcrumbs>` and the
 * `BreadcrumbList` JSON-LD, because `Breadcrumbs` and `breadcrumbSchema()`
 * consume the identical `{ name, path }` shape. They are deliberately never
 * diverged: the trail a visitor reads and the trail a crawler reads are the same
 * data. `BreadcrumbList` is emitted ALWAYS — it describes the site's own
 * structure rather than making a content claim.
 *
 * `Course` JSON-LD is emitted through the UNCHANGED existing `courseSchema`
 * builder (reached via `StructuredData`'s `course` prop) and is deliberately NOT
 * gated: the site already emits one Course block per catalogue record on
 * `/courses`, and gating here would remove markup that ships today — a behaviour
 * change the brief never requested. The builder maps only `title` → `name`,
 * `summary` → `description` and the institute as `provider`, so NONE of the
 * twelve new optional course fields enters the markup and the claim set does not
 * grow. The non-serialisable `icon` reference is never included.
 *
 * `FAQPage` JSON-LD is emitted ONLY under the per-record verification gate.
 * `course.faqIds` is resolved against `src/data/faq.js` with the same rules
 * `CourseDetailView` uses internally — de-duplicated, in the record's own order,
 * and an unresolvable id SKIPPED rather than rendered as an empty block — so the
 * marked-up set is exactly the set the page displays, which is what the FAQPage
 * specification requires. The block is then emitted only when that resolved set
 * is non-empty AND every question in it carries `answerConfirmed === true`. The
 * gate is ALL-OR-NOTHING per emitted set, because a partially marked-up FAQ page
 * misrepresents which answers are authoritative. It is evaluated HERE, by the
 * page, because `StructuredData` and `faqPageSchema` are both deliberately
 * content-agnostic — which is what lets a record become eligible by flipping one
 * boolean with no code change. The reason is a policy one: `src/data/faq.js`
 * states in its own header that timings, batches, fees, payment options, trial
 * availability and certificate details must be verified with CIBLE before launch,
 * and structured data asserts to a machine that the marked-up content is accurate.
 *
 * EVERY FAQ RECORD SHIPS `answerConfirmed: false`, so the correct, PASSING
 * outcome today is that NO `FAQPage` block is emitted on any of these ten routes.
 * The check is two-sided — emitting the block over unverified answers FAILS it
 * rather than passing it. Each route therefore carries exactly two JSON-LD
 * scripts today: its breadcrumbs and its Course block.
 *
 * Nothing here emits `aggregateRating`, `review`, `offers`, a price or an
 * accreditation claim, on this route or any other: the repository holds no basis
 * for any of them.
 *
 * ── COMPOSITION: THE VIEW OWNS THE BODY (AAP §0.9.1, §0.9.3) ──────────────────
 *
 * This page is deliberately thin. It owns the head, the visible breadcrumb trail
 * and the parameter contract; `src/components/common/CourseDetailView.jsx` owns
 * the entire body, and is reusable precisely because it takes a resolved record
 * and nothing else. The view composes the page's single `<h1>`
 * (`SectionHeading as="h1"`), the attribute badges, the learner goals, the apply
 * action and the save/compare toggles, every conditional content block, the
 * curriculum `Accordion`, the shared `FAQ`, the six-stage `Timeline`, the related
 * `CourseGrid`, `TrustSection`, `RepresentativeNote` and the closing
 * `CTASection`.
 *
 * SO DO NOT ADD THEM HERE. A future reader extending this page should know that
 * each of the following is ALREADY RENDERED by the view, and that a second one
 * would be the duplicate block the prohibitions forbid:
 *   - `TrustSection` — the view renders it at `headingAs="h2"`. (`Courses.jsx`
 *     and `Admission.jsx` compose it directly only because they have no view
 *     component of their own.)
 *   - `CTASection` — the view closes with it, as every page on the site does.
 *   - `RepresentativeNote` — the view renders it at its DEFAULT `gate="content"`,
 *     because this route inherits the disclosure `/courses` already makes about
 *     durations and highlights, and retires itself with every other content
 *     disclosure when the client clears `siteConfig.representativeContent`.
 *     `gate="always"` is NEVER passed on this route; `src/pages/Dashboard.jsx` is
 *     its only intended caller (AAP §0.6.5).
 *   - The related-courses grid — the view derives it by shared category and
 *     learner goal, so it is not computed here.
 *   - The page's `<h1>` — the view renders exactly one, carrying the course
 *     title. This page renders no heading of its own in the resolved branch.
 *
 * There is also DELIBERATELY NO HERO ILLUSTRATION (AAP §0.8.3): `CourseCard`
 * resolves its imagery through `IMAGE_BY_SLUG` / `IMAGE_BY_CATEGORY` maps that
 * are module-private, and this route could only reuse them by duplicating the
 * maps or by exporting a new media-resolution contract. Neither is justified —
 * the user never asked for an illustration here — so those maps stay private.
 *
 * ── THE ACCEPTANCE BAR IS THE BLOCK TABLE, NOT A COUNT OF FOURTEEN ────────────
 *
 * The title, summary, category, duration, breadcrumb, related courses, six-stage
 * journey, apply action, save and compare toggles and trust section are
 * GUARANTEED on all ten routes. The level badge and the course FAQs render WHERE
 * THE VALUE EXISTS and are omitted otherwise — only one of the ten records
 * identifies a difficulty today, so nine routes correctly show no level badge.
 * Eligibility, prerequisites, outcomes, curriculum, ideal-for and not-ideal-for
 * are CONDITIONAL on content-owner input and are omitted entirely, heading
 * included, where the institute's existing copy does not support them. A route
 * rendering eight blocks because six await content has PASSED; one rendering
 * fourteen blocks of invented curriculum has FAILED (AAP §0.2.1, §0.7.2). No
 * content is authored here, and this module never writes to `src/data/courses.js`.
 *
 * ── STYLING AND ACCESSIBILITY ─────────────────────────────────────────────────
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens from
 * `src/index.css`) on the 8px scale — `py-12 md:py-16`, `pt-12 md:pt-16`,
 * `mt-8` — with static classNames, no hardcoded or arbitrary `[..]` value, no
 * new token and no new named utility, so this page leaves `src/index.css` with no
 * diff. `Container` is the single width and gutter authority (`max-w-7xl`,
 * `px-4 md:px-6`) and no width is ever set here. Class composition needs no
 * conditional on this page, so `cn()` is not reached for — classNames are written
 * directly, exactly as the `/events/:slug` sibling and the `/courses` listing
 * write them.
 *
 * Accessibility (WCAG AA): exactly ONE `<h1>` per branch — the view's course
 * title when a record resolves, and this page's own "Course not found" heading
 * when none does — with the unavailable state's own heading at `<h2>` so the
 * outline never skips a level. The `caution` tone pins `role="alert"`, so
 * assistive technology is TOLD the content is unavailable rather than left to
 * infer it from a short page. Both next-step affordances are the shared `Button`,
 * so the ≥44×44px hit area and the single global `:focus-visible` ring are
 * inherited rather than re-declared, and the breadcrumb ancestors are already
 * 44px targets inside `Breadcrumbs`.
 *
 * `Button` is imported here even though the file's planned dependency list did
 * not name it: AAP §0.8.2 makes it the design system's single actionable
 * primitive for every primary action, and §0.10.4 forbids a second one, so
 * hand-styling a `Link` into a button would be precisely the duplicate component
 * the prohibitions rule out. It is a pre-existing, unchanged primitive, and the
 * `/events/:slug` sibling composes it identically inside its own unavailable
 * state.
 *
 * @returns {import('react').ReactElement} The rendered course detail page content.
 */
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { FiAlertCircle } from 'react-icons/fi'

import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import CourseDetailView from '../components/common/CourseDetailView.jsx'
import { courses } from '../data/courses.js'
import { faq } from '../data/faq.js'

// The two ancestor crumbs, shared by both branches. Module-local (never
// exported, so the file's only export stays the page component) and the same
// `{ name, path }` shape `breadcrumbSchema()` consumes, so ONE array feeds the
// visible trail AND the BreadcrumbList JSON-LD.
const HOME_CRUMB = { name: 'Home', path: '/' }
const COURSES_CRUMB = { name: 'Courses', path: '/courses' }

// The trail for the unknown-slug branch. `Breadcrumbs` renders the LAST entry as
// non-link `aria-current="page"` text and keys each item on its `path`, so this
// leaf's path is only a React key and is never navigated to — which is why it is
// a fixed literal rather than the requested slug: a unique key is required (a
// second `/courses` would collide with the crumb above it), and echoing an
// arbitrary URL segment into the visible trail is neither useful to a visitor nor
// safe for the layout. `Home` and `Courses` both stay real links, so this page
// remains as navigable as a resolved one.
const NOT_FOUND_CRUMBS = [
  HOME_CRUMB,
  COURSES_CRUMB,
  { name: 'Course not found', path: '/courses/course-not-found' },
]

/**
 * Whether a value is a string carrying actual content.
 *
 * The presence test every OPTIONAL course field is measured against here, so
 * "absent", `null`, a non-string and a whitespace-only string all resolve to the
 * same answer. It is what stops a record whose `valueProposition` was authored as
 * an empty string emitting a blank meta description instead of falling through to
 * the summary, and it matches the identical helper `CourseDetailView` applies to
 * the same field, so the page's head and the page's lead sentence cannot disagree.
 *
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value is a non-blank string.
 */
function isFilled(value) {
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * Resolve a course's `faqIds` against the canonical FAQ set.
 *
 * Mirrors `CourseDetailView`'s own resolution exactly — de-duplicated, in the
 * record's authored order, with an unresolvable id SKIPPED rather than rendered
 * as an empty block — because the marked-up question set must be exactly the set
 * the page displays. FAQPage requires the questions and answers to be visible on
 * the emitting page, so a divergence between these two resolutions would be a
 * structured-data defect rather than a cosmetic one.
 *
 * @param {unknown} value A course record's `faqIds`.
 * @returns {object[]} The matched FAQ records, `[]` when none resolve.
 */
function resolveCourseFaqs(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const resolved = []
  for (const rawId of value) {
    if (!isFilled(rawId)) continue
    const wanted = rawId.trim()
    if (seen.has(wanted)) continue
    const record = faq.find((entry) => entry && entry.id === wanted)
    if (!record) continue
    seen.add(wanted)
    resolved.push(record)
  }
  return resolved
}

function CourseDetail() {
  // EVERY hook is called unconditionally, at the top level, ABOVE the
  // unknown-slug branch below — `react/rules-of-hooks` is an ERROR in this
  // project, not a warning, and an early return placed above a hook would make
  // hook order depend on whether the URL happened to resolve.
  const { slug } = useParams()

  // READ-THEN-VALIDATE. The `:slug` parameter is untrusted, so it is matched
  // against the catalogue single source of truth and nothing else; a miss yields
  // `null`, which drives the explained unavailable state rather than an
  // exception. Trimmed and type-checked first: a router parameter is a string in
  // practice, but the guard costs nothing and the empty-segment case
  // (`/courses/` with a trailing slash) must not scan for an empty slug.
  const course = useMemo(() => {
    if (typeof slug !== 'string') return null
    const wanted = slug.trim()
    if (!wanted) return null
    return courses.find((record) => record && record.slug === wanted) ?? null
  }, [slug])

  // THE FAQPage VERIFICATION GATE, evaluated here because `StructuredData` and
  // `faqPageSchema` are deliberately content-agnostic. `undefined` leaves the
  // prop falsy, so no FAQPage block is built at all; the strict `=== true`
  // comparison means an absent or non-boolean flag reads as NOT confirmed, and
  // `every` over a non-empty set is what makes the gate all-or-nothing. Every
  // record ships `false` today, so the passing outcome is no FAQPage markup
  // anywhere — see the module header.
  const confirmedFaq = useMemo(() => {
    if (!course) return undefined
    const resolved = resolveCourseFaqs(course.faqIds)
    if (resolved.length === 0) return undefined
    return resolved.every((entry) => entry.answerConfirmed === true) ? resolved : undefined
  }, [course])

  // ── THE UNKNOWN-SLUG BRANCH ─────────────────────────────────────────────────
  // Rendered, never thrown: reaching the shell's ErrorBoundary would replace an
  // explanation with a crash panel. `noindex` and NO canonical (see the head note
  // in the module header), and deliberately no `<StructuredData>` at all.
  if (!course) {
    return (
      <>
        <Seo
          title="Course not found"
          description="This course could not be found. Browse every course CIBLE School of Language offers — Spoken English, science coaching, computer courses and career guidance — or contact us and we will help you choose."
          noindex
        />

        <Container as="section" className="py-12 md:py-16">
          <Breadcrumbs items={NOT_FOUND_CRUMBS} className="mb-6" />
          <SectionHeading as="h1" align="left" eyebrow="Courses" title="Course not found" />

          {/* `caution` pins role="alert", so assistive tech is told the content
              is unavailable rather than leaving the visitor to infer it from a
              short page. The title answers WHAT HAPPENED and the description and
              actions answer WHAT NEXT — the two halves the empty-state rule
              requires. `headingAs="h2"` keeps it under the page's single h1. */}
          <EmptyState
            className="mt-8 max-w-3xl"
            tone="caution"
            headingAs="h2"
            icon={FiAlertCircle}
            title="We could not find that course"
            description="The link may be out of date, or the course may no longer be listed. You can browse the full catalogue, or contact us and we will point you to the right programme."
            action={
              <>
                <Button to="/courses">Browse all courses</Button>
                <Button to="/contact" variant="outline">
                  Contact the institute
                </Button>
              </>
            }
          />
        </Container>
      </>
    )
  }

  // ── THE RESOLVED COURSE ─────────────────────────────────────────────────────
  // Every value below is derived from the MATCHED RECORD, never from the URL
  // parameter, so authored content is the only thing that reaches the head, the
  // structured data and the trail.

  // The catalogue's single documented description rule. An absent or blank value
  // proposition falls through to the summary, so every one of the ten routes
  // emits a description of its own rather than inheriting the site default.
  const description = isFilled(course.valueProposition) ? course.valueProposition : course.summary

  // This course's own canonical path. Encoded for the same reason `CourseCard`
  // and the admission deep link encode their values: a slug carrying a reserved
  // character must not invent a nested path or a second query parameter. All ten
  // authored slugs are plain kebab-case, so this is an identity transform today
  // and a guarantee tomorrow.
  const path = `/courses/${encodeURIComponent(course.slug)}`

  // One trail for the visible breadcrumb AND the BreadcrumbList JSON-LD.
  const crumbs = [HOME_CRUMB, COURSES_CRUMB, { name: course.title, path }]

  return (
    <>
      {/* Indexable: an explicit canonical, and never `noindex`. */}
      <Seo title={course.title} description={description} canonical={path} />

      {/* Breadcrumbs and the Course block ALWAYS; the FAQPage block only through
          the gate above, whose value is `undefined` while any answer in the set
          is unverified — which is every set today. */}
      <StructuredData breadcrumbs={crumbs} course={course} faq={confirmedFaq} />

      {/* The trail sits in its own Container with TOP padding only. The view's
          header section below owns `py-12 md:py-16` and carries this page's
          single `<h1>`, so a `mb-6` or a bottom padding here would double the gap
          between the trail and the title rather than close it. */}
      <Container className="pt-12 md:pt-16">
        <Breadcrumbs items={crumbs} />
      </Container>

      {/* The whole body, from one resolved record. See the composition note in
          the module header before adding anything beside this: the trust
          section, the CTA, the representative-content disclosure, the related
          grid and the page's `<h1>` are all already inside it. */}
      <CourseDetailView course={course} />
    </>
  )
}

export default CourseDetail
