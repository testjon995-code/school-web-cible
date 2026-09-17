import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import FAQ from '../components/common/FAQ.jsx'
import CTASection from '../components/common/CTASection.jsx'
import { prefersReducedMotion } from '../hooks/useScrollReveal.js'
import { faq } from '../data/faq.js'

/**
 * Faq — CIBLE School of Language frequently-asked-questions page.
 *
 * Rendered at the LOWERCASE route `/faq`. Note the deliberate filename/route
 * split: the FILE is `Faq.jsx` (capital `F`, lowercase `aq`) so it matches the
 * lazy import in `src/App.jsx`
 * (`const Faq = lazy(() => import('./pages/Faq.jsx'))`,
 * `<Route path="faq" element={<Faq />} />`), while the URL segment stays
 * lowercase. This page renders ONLY its own content — the persistent Navbar,
 * Footer and floating conversion widgets are supplied by the shared `<Layout>`
 * that hosts the routed `<Outlet/>`.
 *
 * Composition (reuse-first, zero duplication — every element is a shared
 * primitive/composite, never hand-rolled markup):
 * - `<Seo>`            — per-page title/description/canonical + Open Graph and
 *                        Twitter meta. `title="Frequently Asked Questions"`
 *                        renders `document.title` as
 *                        "Frequently Asked Questions | CIBLE School of Language".
 *                        An explicit `canonical` is supplied (and NO `noindex`)
 *                        because the bare `/faq` URL renders stable,
 *                        repository-authored content that belongs in the index.
 * - `<StructuredData>` — emits BreadcrumbList JSON-LD from the same `crumbs`
 *                        array that feeds the visible trail, so the structured
 *                        data and the on-page breadcrumbs never diverge, plus
 *                        the GATED FAQPage block described below.
 * - Page header        — a `Container` section holding the visible
 *                        `<Breadcrumbs>` and the page's single `<SectionHeading
 *                        as="h1">`.
 * - `<FAQ showHeading={false}>` — the canonical FAQ composite. It SELF-WRAPS in
 *                        its own `<section>`/`Container` and pulls its content
 *                        from `src/data/faq.js` by DEFAULT, so this page never
 *                        wraps it again and never passes `items` (doing so would
 *                        fork the single source of truth).
 *                        `showHeading={false}` suppresses FAQ's internal
 *                        VISIBLE `<h2>` so the page header above is the single
 *                        top heading, while FAQ still emits an `sr-only`
 *                        section-level heading — which is what keeps the outline
 *                        `h1` → `h2` → question `h3` instead of skipping from
 *                        `h1` straight to `h3`.
 * - `<CTASection>`     — the admission call-to-action that closes every page.
 *
 * WHY THIS PAGE IMPORTS `faq` (AAP §0.7.2 / §0.7.4). It renders none of that
 * data — `FAQ` still reads the module itself — but two page-level concerns are
 * decided from the records and cannot be delegated:
 *   1. FRAGMENT RESOLUTION. The `#faq-<id>` fragment is validated against the
 *      real record ids before it is acted on, so a hand-edited or stale link
 *      cannot push a phantom id into the accordion's open set. This is the same
 *      read-then-validate discipline `Admission.jsx` (`?course=`) and
 *      `Contact.jsx` (`?event=`) already apply to their deep-link parameters.
 *   2. THE STRUCTURED-DATA GATE. Emission is the CALLING PAGE's decision by
 *      design: `faqPageSchema` and `StructuredData` are deliberately
 *      content-agnostic, so the gate lives here.
 *
 * FRAGMENT ADDRESSING — `#faq-<id>`, and why the order is open → scroll → focus
 * (AAP §0.7.2). `<id>` is the record's own `faq[].id`. This is the ONE canonical
 * form: it is what `src/lib/search.js` emits for its `faq` result group
 * (`/faq#faq-<id>`), what a `courses[].faqIds` cross-reference resolves to, and
 * what any external link should use. Each step of the sequence exists for a
 * concrete reason, and reordering them breaks it:
 *   • OPEN FIRST, declaratively, by passing the validated id through `FAQ`'s
 *     `openIds`. `ui/Accordion` seeds that request into its initial state, so
 *     the panel is open on the FIRST paint. A collapsed panel has a different
 *     height, so measuring before opening would scroll to a stale offset.
 *     `openIds` is an INITIAL-open set, not full control: with no fragment the
 *     request is empty and every panel stays closed on mount exactly as before,
 *     and after the reveal the visitor's own toggling takes over.
 *   • THEN SCROLL, inside a `requestAnimationFrame`. `ScrollToTop` issues its
 *     own smooth scroll to the top on every pathname change and explicitly does
 *     not handle hash anchors; a page effect runs BEFORE that parent effect, so
 *     scrolling synchronously here would only be overridden. Deferring one frame
 *     lands the reveal after it instead of racing it. The handle is cancelled on
 *     cleanup so a fast re-navigation cannot scroll an unmounted page.
 *   • THEN FOCUS the trigger with `preventScroll`, so keyboard and
 *     screen-reader users continue from the revealed question (Enter collapses
 *     it) without the browser undoing the position just computed. Focus alone
 *     reveals nothing, which is why it is the last step rather than the only
 *     one.
 * A fragment that matches no record — unknown id, wrong prefix, malformed
 * percent-encoding — is ignored SILENTLY: the page renders normally at the top
 * with every panel closed and no console error.
 *
 * STRUCTURED DATA — breadcrumbs always, FAQPage only once verified (AAP §0.7.4).
 * `BreadcrumbList` is ungated because it describes the site's own structure
 * rather than a content claim. `FAQPage` is gated per record and evaluated
 * ALL-OR-NOTHING over the emitted set, because a partially marked-up FAQ page
 * misrepresents which answers are authoritative. `src/data/faq.js` records in
 * its own header that its class timings, batch options, fee amounts, payment
 * options, trial availability and certificate details are representative and
 * must be verified with CIBLE before launch, and structured data asserts to a
 * machine that the marked-up content is accurate — so every record ships
 * `answerConfirmed: false` and the CURRENT, INTENDED OUTCOME IS THAT NO FAQPage
 * BLOCK IS EMITTED. The gate withholds markup, never content: all ten questions
 * stay visibly rendered. Flipping the flags once the institute has verified the
 * answers is the only edit required to publish the block; no code changes here.
 * No `aggregateRating`, `review`, priced `offers` or accreditation field is
 * emitted anywhere.
 *
 * EMPTY STATE — deliberately NOT owned here (AAP §0.11.2). See the comment at
 * the `<FAQ>` call site.
 *
 * Accessibility (WCAG AA): exactly ONE `<h1>` (the page header), with FAQ's
 * `sr-only` section heading bridging to the question `<h3>`s. The accordion
 * renders real `<button aria-expanded aria-controls>` triggers, so keyboard
 * operability and the global focus ring come from the shared primitive. The
 * fragment reveal honours `prefers-reduced-motion` by jumping instantly
 * (`behavior: 'auto'`) instead of animating.
 *
 * Styling: static, token-only Tailwind utilities on the project's 8px spacing
 * scale (`py-12`/`md:py-16`, `mb-6`); no `cn()` merge is needed because the
 * page adds no conditional classes, and there are no hardcoded/arbitrary
 * values. This page adds no token, utility or stylesheet rule.
 *
 * @returns {import('react').ReactElement} The rendered FAQ page fragment.
 */

// Breadcrumb trail for this page — module-local (NOT exported). The identical
// array is passed to both the visible <Breadcrumbs> and <StructuredData> so the
// rendered trail and the BreadcrumbList JSON-LD stay in agreement (the shape is
// the shared `{ name, path }` contract consumed by breadcrumbSchema).
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'FAQ', path: '/faq' },
]

// The ONE canonical URL-fragment prefix for a single question: `#faq-<id>`.
// Shared with src/lib/search.js (`faq` result hrefs) and `courses[].faqIds`.
const FAQ_FRAGMENT_PREFIX = 'faq-'

// DOM id handed to the FAQ <section> (through the composite's documented rest
// spread) purely as a FALLBACK reveal target for the rare case where the exact
// question trigger cannot be resolved. It is intentionally NOT of the form
// `faq-<a real question id>`, so it can never shadow a question's fragment.
const FAQ_SECTION_ID = 'faq-questions'

// The infix every `ui/Accordion` trigger id carries between its instance-scoped
// `useId()` prefix and the per-item suffix: `${accordionId}-trigger-${suffix}`.
// The `useId()` half is deliberately unpredictable (it is what keeps two
// accordions on one page from colliding), so a question's full DOM id is NOT
// computable from this page and `getElementById('faq-<id>')` cannot work. The
// suffix, however, IS the record's `faq[].id` whenever one exists, so the
// trigger is found by matching this infix plus that id as an id SUFFIX. See
// {@link findQuestionTrigger}.
const TRIGGER_ID_INFIX = '-trigger-'

// Stable "nothing requested" open set for a visit with no fragment. Reusing one
// frozen array keeps the prop identity constant across renders (the accordion
// tolerates fresh literals, but there is no reason to create one) and makes it
// impossible for a consumer to mutate a shared default.
const NO_OPEN_IDS = Object.freeze([])

// THE FAQPage GATE (AAP §0.7.4), evaluated ONCE at module load because `faq` is
// a static build-time import. The set qualifies only when it is non-empty and
// EVERY record is explicitly `answerConfirmed === true`; an absent flag counts
// as NOT confirmed, so the gate fails closed. The confirmed subset is
// deliberately NOT filtered out and emitted on its own — that would publish a
// partial FAQPage and misrepresent which answers are authoritative. `undefined`
// is the closed value because `StructuredData` pushes the block only for a
// truthy `faq` prop, so a closed gate emits nothing at all.
const faqStructuredData =
  Array.isArray(faq) && faq.length > 0 && faq.every((item) => item?.answerConfirmed === true)
    ? faq
    : undefined

/**
 * Resolve a raw `location.hash` to a KNOWN question id, or `null`.
 *
 * Read-then-validate: the id is accepted only when it matches a real
 * `faq[].id`, so a hand-edited, stale or hostile fragment can never enter the
 * accordion's open set or a DOM query. Every rejection path returns `null` and
 * is handled silently by the caller — a bad fragment is not an error condition,
 * it is simply not a request.
 *
 * Ids are lowercase kebab-case and need no URL escaping, but an inbound link may
 * still arrive percent-encoded from a client that plays safe, so the fragment is
 * decoded first; malformed encoding throws and is treated as no request.
 *
 * @param {string} hash The raw fragment, with or without its leading `#`.
 * @returns {string|null} A validated `faq[].id`, or `null` when none matches.
 */
function questionIdFromHash(hash) {
  if (typeof hash !== 'string' || hash === '') return null

  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    // Malformed percent-encoding (e.g. `#faq-%zz`): not a request.
    return null
  }

  if (!decoded.startsWith(FAQ_FRAGMENT_PREFIX)) return null
  const id = decoded.slice(FAQ_FRAGMENT_PREFIX.length)
  if (id === '') return null

  return faq.some((item) => item && item.id === id) ? id : null
}

/**
 * Find the accordion trigger that renders a given question.
 *
 * The lookup matches the tail of the rendered id (`-trigger-<id>`) rather than
 * the whole id, because the leading half is an instance-scoped `useId()` value
 * that this page cannot know. Including the infix is what disambiguates ids that
 * are suffixes of one another: `…-trigger-class-timings` does not end with
 * `-trigger-timings`.
 *
 * The selector itself is a CONSTANT — the question id is compared in JavaScript,
 * never interpolated into a selector string — so no CSS escaping is required and
 * there is no selector-injection surface. A `null` result is a legitimate
 * outcome (the questions may have rendered their empty state, or the id may have
 * been rejected as a duplicate by the accordion) and the caller degrades to the
 * section-level fallback rather than throwing.
 *
 * @param {string} questionId A validated `faq[].id`.
 * @returns {HTMLElement|null} The trigger button, or `null` when not rendered.
 */
function findQuestionTrigger(questionId) {
  const tail = `${TRIGGER_ID_INFIX}${questionId}`
  const triggers = document.querySelectorAll('button[aria-controls][id]')
  for (const trigger of triggers) {
    if (trigger.id.endsWith(tail)) return trigger
  }
  return null
}

/**
 * Document-space top offset of an element, measured from LAYOUT rather than
 * from its painted box.
 *
 * This is not a stylistic preference — it is the difference between a working
 * reveal and one that lands 24px off. `getBoundingClientRect()` deliberately
 * reports the TRANSFORMED visual box, and `common/FAQ.jsx` wraps the accordion
 * in the shared scroll-reveal, whose `fadeUp` variant holds the section at
 * `{opacity: 0, y: 24}` until it enters the viewport. On a fragment entry the
 * section is therefore still translated 24px DOWN at the instant this scroll is
 * computed, so a rect-derived target aims 24px too low; the moment the reveal
 * resolves `y` to 0 the question rises by exactly that amount and ends up
 * behind the sticky header. The race cannot be waited out either, because the
 * reveal only fires once the section is IN view — which is precisely what this
 * scroll exists to achieve.
 *
 * `offsetTop`/`offsetParent` are layout metrics that CSS transforms do not
 * affect, so accumulating them up the offset chain yields the position the
 * element will occupy once revealed — correct on the first and only scroll.
 * This is valid because the document is this page's single scrollport: there is
 * no nested scrolling container between an accordion trigger and the root.
 *
 * @param {HTMLElement} element The element to locate.
 * @returns {number|null} Document-space top offset, or `null` when the element
 *   is not laid out in an offset chain (no `offsetParent` — e.g. `display:
 *   none` or `position: fixed`), which tells the caller to fall back rather
 *   than scroll to a computed-wrong offset.
 */
function layoutTopOf(element) {
  if (!element.offsetParent) return null
  let top = 0
  for (let node = element; node; node = node.offsetParent) top += node.offsetTop
  return top
}

/**
 * Scroll an element into view, clear of the shell's sticky header.
 *
 * `Layout` owns exactly one `<header className="sticky top-0 z-50">`, which
 * OVERLAYS the top of the scrollport. Aligning a target with the scrollport
 * edge therefore parks it UNDER that header: the revealed question's top border
 * and focus ring disappear behind the navigation bar, and — because the header
 * also wins hit-testing there — a click in that band activates the header
 * instead of the disclosure. The header's height is subtracted so the question
 * rests immediately below it, in ONE scroll rather than a visible two-step
 * correction.
 *
 * That height is MEASURED from the live element (never a hardcoded bar height),
 * so it stays correct at every width and survives any future change to the bar,
 * and it is subtracted only when the header is genuinely `sticky`/`fixed`.
 * `Math.max(…, 0)` keeps a question near the top of the document from asking
 * for a negative scroll offset.
 *
 * The plain `scrollIntoView({block: 'start'})` primitive is the fallback for the
 * one case the offset measurement cannot serve (see {@link layoutTopOf}), so
 * the element is always revealed somehow.
 *
 * @param {HTMLElement} element The element to bring into view.
 * @param {ScrollBehavior} behavior `'smooth'`, or `'auto'` under reduced motion.
 * @returns {void}
 */
function revealElement(element, behavior) {
  const header = document.querySelector('header')
  const position = header ? window.getComputedStyle(header).position : ''
  const overlay =
    position === 'sticky' || position === 'fixed' ? header.getBoundingClientRect().height : 0

  const layoutTop = layoutTopOf(element)
  if (layoutTop === null) {
    element.scrollIntoView({ block: 'start', behavior })
    return
  }

  window.scrollTo({ top: Math.max(layoutTop - overlay, 0), left: 0, behavior })
}

function Faq() {
  // `hash` carries the `#faq-<id>` request; `key` is React Router's per-entry
  // identity, included so following the SAME fragment link a second time
  // re-reveals the question instead of doing nothing. Called unconditionally at
  // the top level of the component body to satisfy the Rules of Hooks
  // (oxlint `react/rules-of-hooks` is an error).
  const { hash, key } = useLocation()
  // Validated against the real records before it is used anywhere — as a prop,
  // and as the needle in the DOM lookup below.
  const questionId = questionIdFromHash(hash)
  // Step 1 of open → scroll → focus. Declarative, so the panel is already open
  // on the first paint and there is nothing to re-measure.
  const openIds = questionId ? [questionId] : NO_OPEN_IDS

  // Steps 2 and 3. Deferred one frame so the reveal lands AFTER the shell's
  // route-change scroll-to-top rather than racing it (see the module JSDoc).
  useEffect(() => {
    if (!questionId) return

    const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
    const frame = window.requestAnimationFrame(() => {
      const trigger = findQuestionTrigger(questionId)
      if (trigger) {
        revealElement(trigger, behavior)
        // `preventScroll` because the scroll above is deliberate and already
        // accounts for the sticky header; letting the browser re-scroll here
        // would undo that adjustment.
        trigger.focus({ preventScroll: true })
        return
      }
      // Graceful degradation: the panel has still been opened declaratively, so
      // fall back to revealing the FAQ section itself rather than leaving the
      // visitor at the top of the page with no idea where their question went.
      const section = document.getElementById(FAQ_SECTION_ID)
      if (section) revealElement(section, behavior)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [questionId, key])

  return (
    <>
      <Seo
        title="Frequently Asked Questions"
        canonical="/faq"
        description="Answers to common questions about CIBLE School of Language — courses, fees, batch timings, admission process and contact details in Madhubani, Bihar."
      />
      {/* BreadcrumbList is ungated (it describes site structure, not content).
          FAQPage is gated per record and `faqStructuredData` is `undefined`
          while any answer is unverified, so today NO FAQPage block is emitted —
          that absence is the intended, verified outcome, not an omission. */}
      <StructuredData breadcrumbs={crumbs} faq={faqStructuredData} />

      {/* Page header — the single <h1> that introduces the FAQ section. */}
      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Help Center"
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about courses, admissions and classes at CIBLE."
        />
      </Container>

      {/* Accordion — FAQ self-wraps its own Container/section and reads
          src/data/faq.js by default, so it is neither wrapped again nor passed
          the data here. showHeading={false} suppresses its visible heading so
          the page header above remains the single top heading (FAQ still emits
          an sr-only section heading, keeping the outline h1 -> h2 -> h3).
          `openIds` carries the validated #faq-<id> request; `id` gives the
          reveal effect a fallback target on FAQ's own <section>.
          NO page-level empty state belongs here (AAP §0.11.2): the shared
          FAQ component already owns that branch and renders it through the
          shared ui/EmptyState primitive, so every FAQ surface inherits one
          implementation — adding a second here is the duplicate the project
          forbids. */}
      <FAQ showHeading={false} openIds={openIds} id={FAQ_SECTION_ID} />

      <CTASection />
    </>
  )
}

export default Faq
