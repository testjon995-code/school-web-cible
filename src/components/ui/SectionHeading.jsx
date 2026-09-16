import { cn } from '../../lib/cn.js'

/**
 * SectionHeading
 *
 * The single canonical section-heading block for the CIBLE School of Language
 * SPA. Every content section (courses, faculty, testimonials, "why choose us",
 * etc.) opens with this component so that typography, spacing and — critically —
 * the document's HEADING HIERARCHY stay consistent across the whole site. Reuse
 * it everywhere instead of hand-rolling heading markup.
 *
 * Anatomy (all styling flows through the Tailwind `@theme` brand tokens defined
 * in `src/index.css`; there are no hardcoded or arbitrary values):
 * - eyebrow  : optional small uppercase kicker rendered as a `<p>` in brand blue
 *              (`text-primary-600`, AA on white). It is NOT a heading, so it
 *              never pollutes the accessibility outline.
 * - title    : the section's REAL heading, rendered via the `as` tag so callers
 *              preserve a logical outline (page `<h1>` in the Hero, sections use
 *              `<h2>`, sub-sections `<h3>`).
 * - subtitle : optional supporting paragraph rendered as a muted `<p>`
 *              (`text-muted`, AA on white).
 *
 * The eyebrow and subtitle render only when their props are truthy, so no empty
 * nodes leak into the DOM. Any extra props (`id`, `aria-*`, `data-*`, …) are
 * forwarded to the wrapping `<div>`, and a caller-supplied `className` is merged
 * LAST via `cn()` so callers can override the defaults.
 *
 * @param {object} props
 * @param {string} [props.eyebrow] - Optional uppercase kicker label above the title.
 * @param {import('react').ReactNode} props.title - Main heading content (required in practice).
 * @param {import('react').ReactNode} [props.subtitle] - Optional supporting paragraph.
 * @param {'h1' | 'h2' | 'h3'} [props.as='h2'] - Heading element to render, to keep the outline logical.
 * @param {'center' | 'left'} [props.align='center'] - Text alignment of the block.
 * @param {string} [props.className] - Extra classes merged after the defaults.
 * @returns {import('react').ReactElement} The rendered heading block.
 */
function SectionHeading({ eyebrow, title, subtitle, as: Component = 'h2', align = 'center', className, ...props }) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className,
      )}
      {...props}
    >
      {eyebrow ? (
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-600">
          {eyebrow}
        </p>
      ) : null}
      <Component className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        {title}
      </Component>
      {subtitle ? (
        <p className="mt-4 text-base text-muted md:text-lg">{subtitle}</p>
      ) : null}
    </div>
  )
}

export default SectionHeading
