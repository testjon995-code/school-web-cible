/**
 * Faculty — the CIBLE School of Language faculty listing page (route `/faculty`).
 *
 * Lazy-loaded by `src/App.jsx`
 * (`const Faculty = lazy(() => import('./pages/Faculty.jsx'))`,
 * `<Route path="faculty" element={<Faculty />} />`) and rendered INSIDE the
 * shared `<Layout>`. The Layout owns the page chrome (Navbar, `<main>` landmark,
 * Footer, floating conversion widgets, scroll-to-top), so this file renders ONLY
 * the page's own content — never a second `<main>` or navigation.
 *
 * Composition (reuse-first, zero duplication — every element is a shared
 * primitive/composite, never hand-rolled markup):
 * - `<Seo>`            — per-page title/description/canonical + Open Graph /
 *                        Twitter head tags. `title="Faculty"` resolves to the
 *                        document title "Faculty | CIBLE School of Language".
 * - `<StructuredData>` — emits BreadcrumbList JSON-LD from `crumbs` so the
 *                        visible trail and structured data agree (search-engine
 *                        friendly, AAP §0.6.3 SEO).
 * - `<Container as="section">` — the single canonical width/gutter wrapper,
 *                        rendered as a semantic `<section>` landmark.
 * - `<Breadcrumbs>`    — the visible hierarchy trail (Home / Faculty), sharing
 *                        the exact `{ name, path }` shape passed to
 *                        `<StructuredData>`.
 * - `<SectionHeading as="h1">` — the page's ONE `<h1>` ("Meet Our Faculty").
 * - `<FacultyCard>`    — one card per member from the `faculty` data module
 *                        (single source of truth). Each card owns its own
 *                        photo/initials-avatar fallback and social links, so
 *                        this page adds no presentation of its own — it only
 *                        forwards the anchor attributes described under ANCHOR
 *                        CONTRACT below, which reach the card's ROOT element
 *                        because `FacultyCard` spreads `...props` onto the
 *                        shared `<Card>`. No wrapper element is introduced, so
 *                        the grid layout is untouched.
 * - `<EmptyState>`     — the shared unavailable-content state, rendered IN
 *                        PLACE OF the grid when no faculty record is available
 *                        (AAP §0.11.3, BUG 2). See EMPTY BRANCH below.
 * - `<RepresentativeNote>` — a restrained disclosure that the faculty profiles
 *                        are representative samples, not verified individuals
 *                        (M03, AAP §0.7.2); it retires automatically once
 *                        `siteConfig.representativeContent` is cleared, and it
 *                        is deliberately NOT rendered in the empty branch.
 * - `<CTASection>`     — the reusable admission call-to-action that closes every
 *                        page (Fill Admission Form / Book Free Counseling /
 *                        WhatsApp / Call), keeping conversion actions reachable.
 *
 * ANCHOR CONTRACT (AAP §0.6.4 / §0.7.3) — this page is ADDRESSABLE PER PERSON:
 * every card carrying a `slug` renders with `id="faculty-<slug>"` and
 * `tabIndex={-1}`. That id is a PUBLIC CONTRACT, not an implementation detail:
 * `src/lib/search.js` emits `href: '/faculty#faculty-<slug>'` for every faculty
 * search result, because faculty members have no detail route of their own and
 * are not getting one — fragment addressing IS the mechanism. The slug is read
 * exactly the way `search.js` reads it (a trimmed string, otherwise nothing), so
 * the id this page renders and the href that module emits cannot drift. A record
 * with no usable slug renders with NO `id` and NO `tabIndex` at all — never
 * `id="faculty-undefined"` — which matches `search.js` indexing such a record to
 * `/faculty` with no fragment. `tabIndex={-1}` exists solely to make the card a
 * programmatic focus target; it keeps the card out of the Tab sequence, so the
 * keyboard tab order of the grid is unchanged.
 *
 * HASH-AWARE REVEAL — why this page owns it, and why the order is fixed:
 * `<ScrollToTop>` in the shared Layout scrolls the window to the top on every
 * pathname change and its JSDoc deliberately scopes it to "pathname-change
 * scroll-to-top only … it intentionally does NOT handle hash anchors or
 * scroll-to-element behaviour". Rather than widen a component whose narrow scope
 * is intentional, the DESTINATION page resolves its own fragment (AAP §0.6.4).
 * `revealFragmentTarget` below is the single implementation, driven by two
 * triggers: the routed `location.hash`, and the platform's `hashchange` event
 * for the history traversals the shell's transition-committed routing does not
 * report (the reason is documented at Trigger 2, with the measured journey it
 * fixes). The reveal is idempotent, so the triggers overlap harmlessly.
 * Three details are load-bearing:
 *   1. The work runs inside a `requestAnimationFrame`, so it lands AFTER
 *      ScrollToTop's own scroll instead of racing it (passive effects of a
 *      commit all run before the next animation frame, so this holds regardless
 *      of effect ordering between the two components). The frame handle is
 *      cancelled on cleanup, so a fast hash change cannot leave a stale frame
 *      scrolling to the previous target.
 *   2. SCROLL FIRST, FOCUS SECOND. `focus({ preventScroll: true })` alone
 *      reveals nothing, so a focus-only implementation would leave the target
 *      off-screen. Focus then uses `preventScroll` precisely because the scroll
 *      has already been issued — letting focus perform its own implicit instant
 *      scroll would cancel the smooth animation it was meant to complement.
 *   3. A fragment that matches no element is ignored SILENTLY: the page simply
 *      renders at the top, with no console noise and no thrown error.
 * Motion preference is honoured by reusing the shared synchronous
 * `prefersReducedMotion()` reader (never a second `matchMedia` read), so a
 * reduced-motion visitor gets an instant jump rather than an animation.
 *
 * EMPTY BRANCH (AAP §0.11.3, BUG 2): when the roster is unavailable — an empty
 * array, or a malformed import that is not an array at all, treated as untrusted
 * in the same defensive posture the shared FAQ component takes — the grid is
 * REPLACED by an `<EmptyState>` that answers both what happened and what to do
 * next. The section's `<h2>` is kept in both branches so the region stays named
 * and the outline stays valid, and no empty container or collapsed layout is
 * ever rendered.
 *
 * Hooks: this page is no longer hook-free. `useLocation()` and two `useEffect`s
 * are called UNCONDITIONALLY at the top level of the component body, per the
 * Rules of Hooks (oxlint `react/rules-of-hooks`, configured as an error). It
 * holds no state of its own: the fragment is read from the URL and the roster
 * comes from the data module, so there is nothing to synchronise.
 *
 * Accessibility (WCAG AA): exactly one `<h1>` (the section heading); the faculty
 * grid is a list of repeated cards whose names are `<h3>`s. A visually-hidden
 * `<h2 class="sr-only">` ("Faculty members") is rendered immediately before the
 * grid so the outline steps h1 -> h2 -> h3 with no skipped level (QA Issue 9);
 * the empty state keeps that `<h2>` and titles itself at `<h3>`, so the outline
 * is identical in both branches. The CTA closes with its own `<h2>`. Sections
 * are semantic `<section>` elements — no page-level `<main>`. Anchored cards are
 * reachable by fragment and receive programmatic focus, so a search result lands
 * a screen-reader user on the person they asked for and the next Tab continues
 * from that card; focus styling is inherited from the single global
 * `:focus-visible` rule in src/index.css and is never re-declared here.
 *
 * Styling: token-only Tailwind utilities on the 8px spacing scale
 * (`py-12`/`md:py-16`, `pb-16`/`md:pb-20`, `gap-6`, `mb-6`) and a responsive
 * `grid` (1 → 2 → 3 columns). No arbitrary values, no hardcoded colors, and
 * static classNames (no `cn` needed on this presentational page). Zero new
 * tokens and zero new utilities: src/index.css carries no diff.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import FacultyCard from '../components/common/FacultyCard.jsx'
import RepresentativeNote from '../components/common/RepresentativeNote.jsx'
import CTASection from '../components/common/CTASection.jsx'
import { prefersReducedMotion } from '../hooks/useScrollReveal.js'
import { faculty } from '../data/faculty.js'

// Breadcrumb trail for this page. Module-local (never exported) so the file's
// only public export stays the `Faculty` component. The identical array is
// passed to both the visible <Breadcrumbs> and the <StructuredData>
// BreadcrumbList so the trail and its JSON-LD never diverge.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Faculty', path: '/faculty' },
]

// Prefix for the per-person URL fragment. Module-local and deliberately
// declared once: `src/lib/search.js` builds the matching `/faculty#faculty-…`
// href for every faculty search result, so this literal and that one are a
// single public contract expressed in two files (AAP §0.6.4 / §0.7.3).
const ANCHOR_PREFIX = 'faculty-'

/**
 * Read the roster defensively, so a malformed data module degrades to the empty
 * state instead of throwing.
 *
 * `src/lib/search.js` reads the same collection through the same two guards
 * (`Array.isArray`, then "keep plain objects only"), which is what keeps a
 * record indexed by the search module and a card rendered by this page in
 * agreement about which members exist. Dropping non-object holes here is also
 * what makes `member.name` (the React key) and `member.slug` (the anchor) safe
 * to read below without a per-field guard at every use site.
 *
 * Computed once at module scope because `faculty` is a build-time ES module
 * import that cannot change at runtime — there is nothing to recompute per
 * render.
 *
 * @type {import('../data/faculty.js').FacultyMember[]}
 */
const members = Array.isArray(faculty)
  ? faculty.filter((member) => typeof member === 'object' && member !== null)
  : []

/**
 * Resolve a member's URL-fragment anchor id, or `undefined` when the record
 * carries no usable slug.
 *
 * The slug is read EXACTLY as `src/lib/search.js` reads it — a trimmed string,
 * otherwise nothing — so the id rendered here always matches the href that
 * module emits, whitespace included. `undefined` (never the string
 * `'faculty-undefined'`) is returned for a slugless record, which React omits
 * from the DOM entirely; that mirrors `search.js` indexing such a record to
 * `/faculty` with no fragment, so an unaddressable person is consistently
 * unaddressable on both surfaces rather than pointing at a broken anchor.
 *
 * @param {{ slug?: unknown }} member A faculty record.
 * @returns {string|undefined} The anchor id, or `undefined` when there is none.
 */
function anchorIdOf(member) {
  const slug = typeof member.slug === 'string' ? member.slug.trim() : ''
  return slug ? `${ANCHOR_PREFIX}${slug}` : undefined
}

/**
 * Reveal the card a URL fragment addresses: scroll it into view, then focus it.
 *
 * The single implementation behind both triggers in the component below, so the
 * reveal cannot be written twice and drift. Deferred by one animation frame so
 * it lands AFTER `ScrollToTop`'s own `window.scrollTo` for this navigation
 * rather than racing it; the caller owns the returned handle and cancels it.
 *
 * Idempotent by construction: revealing the same target twice scrolls to the
 * same offset and focuses the already-focused element, which is what lets the
 * two triggers overlap harmlessly rather than needing to be de-duplicated.
 *
 * @param {string} rawHash A `location.hash` value, leading `#` included.
 * @returns {number} The scheduled frame handle, or `0` when nothing was
 *   scheduled (no fragment, or no DOM). `cancelAnimationFrame(0)` is a no-op,
 *   so a caller can cancel unconditionally.
 */
function revealFragmentTarget(rawHash) {
  // `hash` includes the leading '#'. An empty fragment is an ordinary pathname
  // navigation that ScrollToTop has already handled, so there is nothing to do
  // — bailing out also leaves that scroll-to-top behaviour untouched.
  const targetId = rawHash ? rawHash.slice(1) : ''
  // Defensive environment guard in the same style ScrollToTop uses: at runtime
  // in this browser-only SPA both globals always exist, so this only keeps the
  // module safe if it is ever evaluated outside a browser.
  if (!targetId || typeof window === 'undefined' || typeof document === 'undefined') {
    return 0
  }

  return window.requestAnimationFrame(() => {
    const target = document.getElementById(targetId)
    // A fragment matching nothing is ignored silently — the page renders
    // normally at the top. This also means an unrelated fragment on this route
    // is harmless rather than an error.
    if (!target) return

    // 1. Reveal. `block: 'start'` aligns the card with the top of the viewport,
    //    offset by the card's own `scroll-mt-20` so the sticky header clears it.
    target.scrollIntoView({
      block: 'start',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
    // 2. Then focus, so assistive technology and the Tab sequence continue from
    //    the person the visitor asked for. `preventScroll` is correct only
    //    because the scroll above has already been issued: without it, focus
    //    would perform its own instant scroll and cancel that animation.
    target.focus({ preventScroll: true })
  })
}

function Faculty() {
  // Destructured at the top level of the component body (Rules of Hooks), in the
  // same style ScrollToTop reads `pathname`. Only the fragment is needed here:
  // the pathname-change scroll already belongs to ScrollToTop.
  const { hash } = useLocation()

  // TRIGGER 1 — the router. Resolves `#faculty-<slug>` to the matching card on
  // mount and whenever the routed fragment changes, which covers a pasted or
  // bookmarked URL, an external link, and an in-app <Link> from a global search
  // result. See HASH-AWARE REVEAL in the file header for why the animation frame
  // and the scroll-before-focus order are load-bearing.
  useEffect(() => {
    const frame = revealFragmentTarget(hash)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [hash])

  // TRIGGER 2 — the platform, for history traversals the router does not report.
  // Not belt-and-braces: without it a measured journey silently breaks. The
  // shell commits routing through a transition and skips the commit when
  // `location.key` is unchanged [src/App.jsx:103], and EVERY history entry the
  // browser creates itself — a pasted URL, an external link — carries the key
  // `'default'` rather than a router-issued one. So a hash-only Back/Forward
  // between two such entries can leave the routed location un-advanced, Trigger 1
  // never re-runs, and focus stays on the previously addressed person while the
  // URL names another: verified against the production build, where the browser
  // restores the scroll position and thereby hides the stale focus.
  // `hashchange` is the platform's own signal for exactly this change and it does
  // fire on that traversal, so reading `window.location.hash` — the ground truth
  // — closes the gap without touching the shell's frozen routing contract. It
  // cannot double-handle the cases above: `hashchange` does not fire on the
  // initial load or for a `pushState` navigation, and the reveal is idempotent
  // where the two do overlap.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    let frame = 0
    const handleHashChange = () => {
      window.cancelAnimationFrame(frame)
      frame = revealFragmentTarget(window.location.hash)
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <Seo
        title="Faculty"
        canonical="/faculty"
        description="Meet the experienced teachers and mentors at CIBLE School of Language, Madhubani — dedicated faculty guiding students in spoken English, science and computer courses."
      />
      <StructuredData breadcrumbs={crumbs} />

      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Our Team"
          title="Meet Our Faculty"
          subtitle="Passionate educators committed to every student's growth and confidence."
        />
      </Container>

      <Container as="section" className="pb-16 md:pb-20">
        {/* Visually-hidden section heading so the card grid (each faculty card
            name is an <h3>) nests under an <h2>, keeping the outline
            h1 -> h2 -> h3 with no skipped level for assistive tech (QA Issue 9). */}
        <h2 className="sr-only">Faculty members</h2>
        {members.length ? (
          <>
            <RepresentativeNote className="mb-8">
              The faculty profiles shown here are representative examples for
              demonstration and are not verified individuals. They will be replaced
              with the institute's actual team before launch.
            </RepresentativeNote>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => {
                // The fragment target a faculty search result addresses. All
                // three attributes are omitted together for a slugless record:
                // with no id there is nothing to address, so making the card a
                // focus target — or reserving scroll room for it — would only
                // add an unreachable one.
                const anchorId = anchorIdOf(member)
                return (
                  <FacultyCard
                    key={member.name}
                    member={member}
                    id={anchorId}
                    tabIndex={anchorId ? -1 : undefined}
                    // `scroll-mt-20` (5rem) reserves room for the Layout's
                    // sticky `top-0` header, whose bar is `h-16` (4rem): without
                    // it `scrollIntoView({block: 'start'})` aligns the card with
                    // the viewport top and the header paints over its avatar, so
                    // the reveal half-hides the very person it just revealed.
                    // scroll-margin is inert until the element is a scroll
                    // target, so this has NO visual effect on the grid — it only
                    // offsets the fragment landing, leaving a 1rem gap below the
                    // header. A stock Tailwind utility on the default spacing
                    // scale: no new token, no new utility, no index.css diff.
                    className={anchorId ? 'scroll-mt-20' : undefined}
                  />
                )
              })}
            </div>
          </>
        ) : (
          // The RepresentativeNote is deliberately NOT rendered here: its copy
          // discloses that the profiles "shown here" are representative
          // examples, which is untrue when none are shown. Do not add it back.
          <EmptyState
            tone="neutral"
            headingAs="h3"
            title="No faculty profiles are listed yet"
            description="Our teaching team will appear here as soon as their profiles are published. In the meantime, our counsellors can tell you who teaches each course and how the batches are structured."
            action={
              <>
                <Button to="/contact" variant="primary">
                  Contact us
                </Button>
                <Button to="/courses" variant="outline">
                  Browse courses
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

export default Faculty
