/**
 * Courses — the full course catalog page for CIBLE School of Language
 * (route `/courses`).
 *
 * Lazy-loaded by `src/App.jsx`
 * (`const Courses = lazy(() => import('./pages/Courses.jsx'))`,
 * `<Route path="courses" element={<Courses />} />`) and rendered INSIDE the
 * shared `<Layout>`. The Layout owns the page chrome (Navbar, `<main>`
 * landmark, Footer, floating conversion widgets, scroll-to-top), so this file
 * renders ONLY the page's own content — never a second `<main>` or navigation.
 *
 * Purpose (AAP §0.1.1): surface ALL 10 CIBLE courses in one browsable catalog
 * with smart discovery — free-text search, five filter dimensions and three
 * orderings on top of the category chips (English / Science / Computer /
 * Career) — then answer the visitor's trust questions and drive them toward
 * admission via the closing call-to-action.
 *
 * WHERE THE DISCOVERY STATE LIVES — the one thing to get right here. This page
 * holds THE single {@link useCourseFilters} instance in the application, which
 * makes it the single owner of the `/courses` query contract: `q`, `category`,
 * `level`, `duration`, `goal`, `prereq` and `sort`. The hook reads and
 * normalises those seven parameters (trim, de-duplicate, allowlist-filter, sort
 * into declaration order) and writes them back as ONE batched
 * `setSearchParams(next, { replace: true, preventScrollReset: true })` — so a
 * filter session neither fills the back stack nor jumps the page to the top, and
 * one view always resolves to exactly one canonical address.
 *
 * Consequences worth stating because they are easy to undo by accident:
 *  - `CourseGrid` and `CourseFilters` hold NO filter state (beyond the grid's
 *    uncontrolled category fallback, which this page overrides by supplying
 *    `values`) and neither may call this hook or `useSearchParams`. A second
 *    instance would be a second writer and the canonical-URL guarantee would
 *    stop holding.
 *  - Because the state is in the URL, a filtered catalogue is shareable and
 *    survives a reload and the browser's back button for free — no store, no
 *    context, no persistence.
 *  - An unrecognised value (`?level=Wizard`, `?sort=nonsense`) is dropped rather
 *    than rendered, so a hand-edited link degrades to the default view instead
 *    of showing a filter that does not exist.
 *  - The `<Seo canonical="/courses">` below is what makes every one of those
 *    parameter combinations consolidate under the bare path for crawlers, with
 *    no per-parameter work (AAP §0.5.1).
 *
 * Composition (reuse-first, zero duplication — every element is a shared
 * primitive/composite, never hand-rolled markup):
 * - `<Seo>`            — per-page title/description/canonical + Open Graph /
 *                        Twitter head tags. `title="Courses"` resolves to the
 *                        document title "Courses | CIBLE School of Language".
 * - `<StructuredData>` — emits BreadcrumbList JSON-LD from `crumbs` so the
 *                        visible trail and the structured data always agree,
 *                        PLUS one Course JSON-LD block for every catalog entry
 *                        (`courses.map(courseSchema)`) so all ten courses —
 *                        including Career Guidance — are covered by structured
 *                        data (search-engine friendly, AAP §0.6.3 SEO; M19).
 * - `<Container as="section">` — the single canonical width/gutter wrapper,
 *                        rendered as a semantic `<section>` landmark.
 * - `<Breadcrumbs>`    — the visible hierarchy trail (Home / Courses), sharing
 *                        the exact `{ name, path }` shape passed to
 *                        `<StructuredData>`.
 * - `<SectionHeading as="h1">` — the page's ONE `<h1>`.
 * - `<CourseGrid showFilter>` — the shared responsive grid and the full control
 *                        surface. It receives the hook's DERIVED list and holds
 *                        no filter state of its own. Note that `items` and
 *                        `results` are not interchangeable: `items` stays the
 *                        full catalogue (it derives the chip row, feeds
 *                        `CourseFilters` its options, supplies the "of 10" in
 *                        the live count, and distinguishes an empty catalogue
 *                        from one narrowed to nothing), while `results` is what
 *                        actually renders. The grid also owns the listing's ONE
 *                        polite region and the only visible route into
 *                        `/compare`, so neither is declared here — a second live
 *                        region would announce every filter change twice.
 * - `<TrustSection>`   — the shared trust-and-transparency block (F10), rendered
 *                        from `src/data/trust.js` on four surfaces from one
 *                        module. It closes the page before the CTA and is a
 *                        SIBLING of the Containers above, because it brings its
 *                        own `<section>` and `<Container>`.
 * - `<CTASection>`     — the reusable admission call-to-action that closes every
 *                        page (Fill Admission Form / Book Free Counseling /
 *                        WhatsApp / Call), keeping conversion actions reachable.
 *
 * Accessibility (WCAG AA): exactly one `<h1>` (the section heading). The grid's
 * filter chips are keyboard-accessible `<button>`s with `aria-pressed` (owned by
 * `CourseGrid`), and each course card title is an `<h3>`. A visually-hidden
 * `<h2 class="sr-only">` ("All courses") is rendered immediately before the grid
 * so the outline steps h1 -> h2 -> h3 with no skipped level (QA Issue 9); the
 * trust block contributes its own `<h2>` over `<h3>` cards and the CTA closes
 * with a third, so the outline stays legal end to end. Sections are semantic
 * `<section>` elements — no page-level `<main>`.
 *
 * The result count and the no-match explanation are announced by `CourseGrid`'s
 * single `role="status" aria-live="polite"` region. This page declares no live
 * region of its own, and it does not repurpose the shell's title-mirroring
 * announcer in `Layout.jsx`, which keeps its one existing meaning (AAP §0.5.1).
 *
 * Styling: token-only Tailwind utilities on the 8px spacing scale
 * (`py-12`/`md:py-16`, `pb-16`/`md:pb-20`, `mb-6`). No arbitrary values, no
 * hardcoded colors, no new tokens or utilities (`src/index.css` needs no change
 * for this page), and static classNames (no `cn` needed on this presentational
 * page — every layout decision below the fold belongs to the composed
 * components).
 */
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import CourseGrid from '../components/common/CourseGrid.jsx'
import RepresentativeNote from '../components/common/RepresentativeNote.jsx'
import TrustSection from '../components/common/TrustSection.jsx'
import CTASection from '../components/common/CTASection.jsx'
import { courses } from '../data/courses.js'
import { courseSchema } from '../lib/schema.js'
import { useCourseFilters } from '../hooks/useCourseFilters.js'

// Breadcrumb trail for this page. Module-local (never exported) so the file's
// only public export stays the `Courses` component. The identical array is
// passed to both the visible <Breadcrumbs> and the <StructuredData>
// BreadcrumbList so the trail and its JSON-LD never diverge.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Courses', path: '/courses' },
]

function Courses() {
  // THE single `useCourseFilters` instance in the application, and therefore the
  // single owner of the `/courses` query contract (`q`, `category`, `level`,
  // `duration`, `goal`, `prereq`, `sort`). Neither `CourseGrid` nor
  // `CourseFilters` may call this hook or the router's search-parameter hook: a
  // second instance would be a second writer, and the canonical-URL guarantee
  // (one view resolves to exactly one address) would stop holding. Called
  // unconditionally at the top of the body, above every branch and with no early
  // return anywhere before it, which is what `react/rules-of-hooks` — an ERROR
  // in this project, not a warning — requires.
  //
  // `courses` is passed by reference rather than as an inline expression on
  // purpose: the hook memoises its derived list on that identity, so a fresh
  // array per render (`courses.filter(...)` as an argument) would recompute it
  // every render for no benefit.
  const { values, setValue, clearAll, results, resultCount, activeCount } = useCourseFilters(courses)

  return (
    <>
      <Seo
        title="Courses"
        canonical="/courses"
        description="Browse all CIBLE courses — Spoken English, English Communication, Personality Development, Public Speaking, Interview Preparation, PCM & PCB science coaching, Basic Computer, Digital Literacy and Career Guidance."
      />
      {/* Breadcrumb trail plus one Course JSON-LD block for EVERY catalog entry.
          `courses` is the full 10-course single source of truth, so mapping it
          through `courseSchema` guarantees the tenth course (Career Guidance)
          emits its Course structured data here rather than being the only course
          with no schema consumer anywhere in the site (M19). StructuredData
          spreads the array into individual, injection-safe <script> blocks. */}
      <StructuredData breadcrumbs={crumbs} schema={courses.map(courseSchema)} />

      {/* Page header */}
      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Our Programs"
          title="Courses at CIBLE School of Language"
          subtitle="From spoken English to science and computer courses — find the program that fits your goals."
        />
      </Container>

      {/* Full catalog with category filter */}
      <Container as="section" className="pb-16 md:pb-20">
        {/* Visually-hidden section heading so the card grid (each course card
            title is an <h3>) nests under an <h2>, keeping the outline
            h1 -> h2 -> h3 with no skipped level for assistive tech (QA Issue 9). */}
        <h2 className="sr-only">All courses</h2>
        <RepresentativeNote className="mb-8">
          Course details such as durations and highlights are representative and
          shown for demonstration. Please confirm the current curriculum, batch
          timings and fees with the institute before enrolling.
        </RepresentativeNote>
        {/* `items` stays the FULL catalogue while `results` carries the derived
            list — the two props answer different questions and are not
            interchangeable. `CourseGrid` reads `items` to derive the category
            chip row, to give `CourseFilters` its option lists, to say "Showing 3
            of 10 courses", and to tell an EMPTY CATALOGUE ("no courses are
            listed yet") apart from a catalogue NARROWED TO NOTHING ("no course
            matches the current filters", which offers clear-all). It renders
            `results` as-is and skips its own category pass, because this hook
            already owns `category`. Passing the filtered list as `items` would
            collapse the chip row to just the categories that survived the
            filter — leaving no chip to switch back with — and make every count
            read "Showing 3 courses". */}
        <CourseGrid
          items={courses}
          results={results}
          values={values}
          onChange={setValue}
          onClearAll={clearAll}
          resultCount={resultCount}
          activeCount={activeCount}
          showFilter
        />
      </Container>

      {/* Trust block, rendered as a SIBLING of the Containers above: it owns its
          own <section> and <Container> (the site's tinted `bg-surface` band), so
          nesting it inside one would double the `px-4 md:px-6` gutters. Its
          heading is an `h2` because this page's own title is the `h1`; its cards
          are fixed at `h3`, so the outline stays h1 -> h2 -> h3. Every string it
          shows comes from `src/data/trust.js` — `sections` is deliberately not
          passed so the canonical set stays the default. */}
      <TrustSection headingAs="h2" />

      <CTASection />
    </>
  )
}

export default Courses
