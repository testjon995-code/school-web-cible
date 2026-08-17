import { useState } from 'react'
import { motion } from 'framer-motion'
import CourseCard from './CourseCard.jsx'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'
import { useScrollReveal, prefersReducedMotion, fadeUp, staggerContainer } from '../../hooks/useScrollReveal.js'
import courses from '../../data/courses.js'

/**
 * CourseGrid — the responsive, reuse-first grid of course tiles for CIBLE School of
 * Language. It is the single canonical way the catalog is laid out on a page, and it is
 * consumed by the Home featured-courses band, the Courses index (with the category
 * filter enabled) and the category landing pages, which pre-filter through the `items`
 * prop.
 *
 * Composition & reuse (design-system rule: compose ONE canonical primitive,
 * never duplicate markup):
 *  - Every tile is the shared {@link CourseCard} primitive — this component
 *    lays cards out but never restyles or forks a card of its own.
 *  - The optional filter chips are the shared {@link Button} primitive rendered
 *    as real <button>s (no `to`/`href`), so they inherit the project's focus
 *    ring, sizing and variant tokens rather than re-implementing a styled
 *    control.
 *  - Class composition flows through the shared {@link cn} helper (clsx +
 *    tailwind-merge) so a caller-supplied `className` always wins on conflicting
 *    utilities.
 *  - Reveal animation reuses the shared {@link useScrollReveal} hook and the
 *    site-wide framer-motion variants ({@link staggerContainer} / {@link fadeUp})
 *    — the single, shared animation vocabulary.
 *  - Content comes from the `src/data/courses.js` single source of truth,
 *    overridable via the `items` prop for pre-filtered / test scenarios.
 *
 * Filtering:
 *  - The category list is derived from the *current* `items` (`'All'` + the
 *    unique `category` values in source order), so a pre-filtered `items` prop
 *    only ever offers the categories it actually contains.
 *  - Selecting a chip narrows the grid to that `category`; `'All'` shows
 *    everything. The active chip is the filled `primary` variant and carries
 *    `aria-pressed`; the rest are `outline`.
 *
 * Animation:
 *  - A single top-level {@link useScrollReveal} call returns a callback `ref`
 *    (attached to the grid) and an `inView` flag. The grid `<motion.div>` plays
 *    `staggerContainer` and each card wrapper plays `fadeUp` when `inView` flips
 *    to true (the hook triggers once, so cards never re-animate on scroll-back).
 *  - Under prefers-reduced-motion, `useScrollReveal` skips observation and
 *    returns `inView=true` immediately AND the grid mounts with
 *    `initial={false}` (via {@link prefersReducedMotion}), so cards render
 *    directly at their final state with no enter animation at all (WCAG 2.3.3).
 *
 * Styling — 100% token-driven (Tailwind v4 `@theme` tokens in `src/index.css`), no
 * hardcoded values (only the exempt 0/auto/inherit/currentColor/transparent), spacing
 * on the project's 8px scale. The grid runs one column on mobile, two from `sm` and
 * three from `lg`, so there is never horizontal overflow.
 *
 * Accessibility (WCAG AA):
 *  - The filter is a labeled `role="group"` ("Filter courses by category") and
 *    each chip is a keyboard-focusable native <button> (via {@link Button}) with
 *    `aria-pressed` reflecting selection — state is never conveyed by color
 *    alone.
 *  - Each {@link CourseCard} keeps its own semantics and heading (an <h3> under
 *    the section <h2>), so the grid adds no redundant landmarks.
 *  - When a filter yields no matches, a friendly, centered message is rendered
 *    instead of a silently empty grid, so the outcome is always communicated.
 *
 * @param {object} props
 * @param {Array<{
 *   slug: string,
 *   title: string,
 *   category: 'English'|'Science'|'Computer'|'Career',
 *   summary?: string,
 *   duration?: string,
 *   level?: string,
 *   eligibility?: string,
 *   suitableFor?: string,
 *   prerequisites?: string,
 *   highlights?: string[],
 *   icon?: import('react-icons').IconType,
 * }>} [props.items=courses] Courses to render; defaults to the `src/data/courses.js`
 *   single source of truth. Pass a pre-filtered subset for the category landing pages.
 *   `level`, `eligibility`, `suitableFor` and `prerequisites` are the optional
 *   discovery fields {@link CourseCard} renders only when present — see the shape
 *   contract in `src/data/courses.js`.
 * @param {boolean} [props.showFilter=false] When true, renders the category
 *   filter chip group above the grid.
 * @param {string | ((course: object) => string)} [props.ctaTo] Optional CTA
 *   destination forwarded to every {@link CourseCard} as its `to`. Pass a string
 *   for a shared target, or a function `(course) => path` to compute a per-card
 *   route (the category landing pages pass
 *   `(c) => `/admission?course=${encodeURIComponent(c.title)}`` so their cards
 *   drive admission instead of self-linking). When omitted, each card falls back
 *   to its category-derived route.
 * @param {string} [props.ctaLabel] Optional CTA label forwarded to every
 *   {@link CourseCard} (the category landing pages pass "Apply Now"). When omitted,
 *   cards use "Learn more".
 * @param {string} [props.className] Extra classes merged LAST via {@link cn} onto the
 *   root wrapper, so a caller can extend or override layout.
 * @returns {import('react').ReactElement} The course grid section.
 *
 * Any other props (`id`, `aria-*`, `data-*`, …) are forwarded to the root <div>.
 */
export default function CourseGrid({
  items = courses,
  showFilter = false,
  ctaTo,
  ctaLabel,
  className,
  ...props
}) {
  const [active, setActive] = useState('All')

  // One unconditional, top-level reveal hook: `ref` attaches to the grid and `inView`
  // gates the stagger reveal.
  const { ref, inView } = useScrollReveal()
  // Synchronous, SSR-safe read of prefers-reduced-motion — a plain helper, not a hook.
  // When true the grid mounts with `initial={false}`, so cards appear at their final
  // state with no reveal animation at all (WCAG 2.3.3).
  const reduce = prefersReducedMotion()

  // Derived from the CURRENT items, preserving source order, so a pre-filtered `items`
  // prop only offers categories it actually contains.
  const categories = ['All', ...Array.from(new Set(items.map((c) => c.category)))]

  const filtered = active === 'All' ? items : items.filter((c) => c.category === active)

  return (
    <div className={cn('flex flex-col gap-8', className)} {...props}>
      {showFilter ? (
        <div
          role="group"
          aria-label="Filter courses by category"
          className="flex flex-wrap justify-center gap-2"
        >
          {categories.map((cat) => (
            <Button
              key={cat}
              type="button"
              variant={active === cat ? 'primary' : 'outline'}
              size="sm"
              aria-pressed={active === cat}
              onClick={() => setActive(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <motion.div
          ref={ref}
          variants={staggerContainer}
          initial={reduce ? false : 'hidden'}
          animate={inView ? 'visible' : 'hidden'}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((course) => (
            <motion.div key={course.slug} variants={fadeUp} className="h-full">
              <CourseCard
                course={course}
                to={typeof ctaTo === 'function' ? ctaTo(course) : ctaTo}
                ctaLabel={ctaLabel}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        // The empty state uses the `muted` token, the neutral the @theme actually
        // defines; there is no `-foreground` alias, so that variant would emit no CSS.
        <p className="text-center text-muted">No courses in this category yet.</p>
      )}
    </div>
  )
}
