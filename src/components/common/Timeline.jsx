import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn.js'
import { useScrollReveal, prefersReducedMotion, fadeUp, staggerContainer } from '../../hooks/useScrollReveal.js'

// Link treatment for a stage title that carries an `href` — brand tokens only
// (`text-primary-600` is 4.6:1 on white = AA for normal text; `primary-700` is
// the established hover step). The underline is ALWAYS visible rather than
// hover-only, so the affordance never rests on color alone, and `font-medium` is
// deliberately OMITTED: the link inherits the `<h3>`'s `font-semibold`, keeping
// linked and unlinked stage titles identical in weight. No focus ring is
// declared here — the global `:focus-visible` rule in src/index.css already
// gives every focusable element a 2px primary-600 outline at 2px offset.
const STAGE_LINK_CLASSES =
  'text-primary-600 underline underline-offset-2 transition-colors duration-200 hover:text-primary-700'

/**
 * Timeline — CIBLE School of Language.
 *
 * A vertical, reveal-on-scroll timeline used to communicate an ordered sequence
 * of steps — for example the admission process ("Enquire → Counseling → Enrol")
 * or institute milestones. It renders a semantic ordered list with a single
 * connecting vertical line, a circular numbered/icon marker per step, and a
 * title + description for each entry.
 *
 * This component is intentionally DATA-AGNOSTIC: the consuming page supplies the
 * `items` array (admission steps, milestones, …), so the same primitive is
 * reused everywhere ordered sequences appear. It is NOT a card list — timeline
 * entries are lightweight text rows on a rail, so it deliberately does not use
 * the `ui/Card` surface.
 *
 * Linkable stages (the OPTIONAL per-item `href`):
 * - An item may carry `href`, an in-app route. When present, that step's title
 *   renders as a react-router `<Link>` INSIDE the same `<h3>`; when absent, the
 *   title renders exactly as it always has — bare text in that same `<h3>`.
 *   Only the title CONTENT is conditional: the `<motion.li>`, its `key`, the
 *   marker `<span>` and the description `<p>` are identical either way, so an
 *   item without `href` produces byte-identical output. That is precisely why
 *   the two pre-existing timelines — the three milestones on `src/pages/About.jsx`
 *   and the four-step process on `src/pages/Admission.jsx`, neither of which
 *   passes `href` — are unaffected by this capability.
 * - The motivating consumer is `learningJourney` in `src/data/learningPaths.js`,
 *   whose `{ id, label, body, href? }` records map onto `title`/`description`/
 *   `href`. It is rendered through THIS component by both
 *   `src/components/common/CourseDetailView.jsx` and `src/pages/Dashboard.jsx`,
 *   so the six stages (Discover → Check Eligibility → Enquire → Enroll → Learn
 *   → Complete) have ONE definition rather than a copy per surface, and each
 *   stage can link to the route that acts on it where such a route exists.
 * - A `<Link>` is used rather than a bare `<a>` because these are client-side
 *   routes in a single-page application, and rather than `Button` because a
 *   stage title is a text link inside a heading, not a 44px action target.
 *
 * Animation (respecting reduced-motion):
 * - The reveal is driven by a SINGLE top-level `useScrollReveal()` call (the
 *   project's shared scroll-reveal hook), so the Rules of Hooks are satisfied
 *   and the effect is centralized. When the timeline scrolls into view (or
 *   immediately, if the user prefers reduced motion — the hook forces `inView`
 *   true and skips observation), the parent list transitions to its `visible`
 *   variant.
 * - The parent `<motion.ol>` uses the shared `staggerContainer` variant; each
 *   child `<motion.li>` uses the shared `fadeUp` variant with NO own
 *   `initial`/`animate`, so framer-motion propagates the variant label from the
 *   parent and staggers the children (a smooth top-to-bottom cascade).
 * - Reduced-motion is honored at the JavaScript layer (framer-motion drives
 *   inline transform/opacity tweens that the CSS `prefers-reduced-motion` reset
 *   in src/index.css cannot neutralize): the `<motion.ol>` is gated with
 *   `initial={reduce ? false : 'hidden'}` (via {@link prefersReducedMotion}) so
 *   it mounts DIRECTLY at its final state with no enter animation, and the
 *   site-wide `<MotionConfig reducedMotion="user">` in `src/App.jsx` is the
 *   global safety net (WCAG 2.3.3).
 *
 * Styling (Tailwind v4 `@theme` brand tokens from src/index.css — zero hardcoded
 * values; only native layout/spacing utilities and the exempt `white` color are
 * used directly):
 * - `border-l border-border` on the `<ol>` draws the single vertical rail, and
 *   `pl-8` (32px) reserves the gutter the markers sit in.
 * - Each marker is a `rounded-full` disc in `bg-primary-600` with `text-white`,
 *   absolutely centered on the rail (`-left-8 -translate-x-1/2`).
 * - Titles use `text-foreground`; descriptions use the lower-emphasis
 *   `text-muted` — both AA-contrast on white per the design system.
 * - A stage title carrying an `href` uses the project's established text-link
 *   treatment — `text-primary-600` (AA at 4.6:1 on white) with an always-visible
 *   `underline underline-offset-2` and a `transition-colors duration-200` hover
 *   to `primary-700` — composed through the same `cn(...)` path. It adds NO new
 *   token, NO named `@utility` and no arbitrary value, so src/index.css is
 *   untouched by this component.
 * - `className` is merged LAST via `cn(...)`, so caller utilities win.
 *
 * Accessibility (WCAG AA):
 * - A real `<ol>`/`<li>` conveys the ordered sequence to assistive technology,
 *   so screen readers announce step order natively. The numeric/icon markers are
 *   therefore purely decorative and marked `aria-hidden="true"` to avoid double
 *   announcing the position.
 * - Each step title is an `<h3>`, intended to sit under a section `<h2>` on the
 *   host page, keeping the document outline logical.
 * - Any step icon is a decorative glyph inside the already-hidden marker; the
 *   textual title/description carry the meaning (color is never the sole signal).
 * - A stage title's `href` renders a REAL `<Link>` nested in the `<h3>`, so it is
 *   keyboard reachable in document order and announced as both a heading and a
 *   link. Its focus ring is inherited from the global `:focus-visible` rule, and
 *   its underline means the link is not signalled by color alone.
 *
 * @param {object} props
 * @param {Array<{ title: string, description?: import('react').ReactNode, icon?: import('react').ElementType, href?: string }>} [props.items=[]]
 *   Ordered steps. `title` labels the step (and is used as the React key);
 *   `description` is the supporting copy; `icon` is an OPTIONAL react-icons
 *   component reference rendered inside the marker (when omitted, the 1-based
 *   step number is shown instead); `href` is an OPTIONAL in-app route that turns
 *   the title into a `<Link>` inside the same `<h3>` — omit it and the step
 *   renders exactly as it did before this prop existed.
 * @param {string} [props.className] Extra classes merged LAST onto the `<ol>`
 *   (e.g. width/max-width or spacing overrides).
 * @param {object} [props] Any other props (`id`, `aria-*`, data attributes, …)
 *   are forwarded to the root `<motion.ol>`.
 * @returns {import('react').ReactElement | null} The timeline list, or `null`
 *   when `items` is empty.
 */
export default function Timeline({ items = [], className, ...props }) {
  // Single, unconditional top-level hook (Rules of Hooks): drives the staggered
  // reveal and transparently respects prefers-reduced-motion.
  const { ref, inView } = useScrollReveal()
  // Synchronous, SSR-safe read of prefers-reduced-motion (plain helper, not a
  // hook — safe to call before the early return). When true the list mounts
  // with `initial={false}`: every step renders at its final state with no
  // fade-up/stagger reveal (WCAG 2.3.3).
  const reduce = prefersReducedMotion()

  // Nothing to render for an empty/undefined list — guard AFTER the hooks so
  // hook order stays stable across renders.
  if (!items?.length) return null

  return (
    <motion.ol
      ref={ref}
      variants={staggerContainer}
      initial={reduce ? false : 'hidden'}
      animate={inView ? 'visible' : 'hidden'}
      className={cn('relative flex flex-col gap-8 border-l border-border pl-8', className)}
      {...props}
    >
      {items.map((item, index) => {
        // react-icons component reference supplied by the item data (optional).
        // Capitalized so JSX renders it as a component; falls back to the number.
        const Icon = item.icon
        // Stage title content. With an `href` the title becomes a react-router
        // <Link> INSIDE the unchanged <h3> (heading semantics preserved: the
        // heading is not moved into the link and the link is not a wrapper).
        // WITHOUT an `href` this is the exact same plain-text node the component
        // has always rendered, so items that omit it are byte-identical — which
        // is why the existing About and Admission timelines are unaffected.
        const titleContent = item.href ? (
          <Link to={item.href} className={cn(STAGE_LINK_CLASSES)}>
            {item.title}
          </Link>
        ) : (
          item.title
        )
        return (
          <motion.li key={item.title} variants={fadeUp} className="relative">
            <span
              className="absolute -left-8 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white"
              aria-hidden="true"
            >
              {Icon ? <Icon className="h-4 w-4" /> : index + 1}
            </span>
            <h3 className="text-base font-semibold text-foreground">{titleContent}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
          </motion.li>
        )
      })}
    </motion.ol>
  )
}
