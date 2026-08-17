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
 * Anatomy — all three parts style through the Tailwind `@theme` brand tokens in
 * `src/index.css`, with no hardcoded or arbitrary values:
 * - eyebrow  : an optional uppercase kicker rendered as a `<p>`, NOT a heading, so
 *              it never pollutes the accessibility outline. Its small-caps label
 *              treatment is shared with the footer's column kickers so the site
 *              speaks one label voice — change it here and `layout/Footer.jsx`
 *              must change with it.
 * - title    : the section's REAL heading, rendered through the `as` tag so
 *              callers keep the outline logical (pages pass `as="h1"` for the
 *              page's single `<h1>`; sections take the `<h2>` default,
 *              sub-sections `<h3>`).
 * - subtitle : an optional supporting paragraph in muted body prose.
 *
 * Line height is pinned EXPLICITLY on the title and the subtitle, because
 * Tailwind's per-size defaults drift across the breakpoint: the title's leading
 * would tighten as the type scales up and the subtitle's would loosen. One pinned
 * value per element holds each steady on both steps, matches the hero's `<h1>` for
 * display headings, and leaves descenders room on the multi-line wraps long titles
 * take at the narrowest widths.
 *
 * Wrapping is refined by the balance/pretty text-wrap utilities: the heading's
 * lines are evened out instead of leaving a lone trailing word, and the paragraph
 * avoids orphans. Both are progressive enhancements — browsers without
 * `text-wrap` support simply wrap normally, so no layout depends on them.
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
 * @param {'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'} [props.as='h2'] - Heading element
 *   to render, to keep the outline logical. Any heading level is accepted and
 *   rendered verbatim: page modules pass `as="h1"`, and `common/FAQ.jsx` derives
 *   the tag from its numeric `headingLevel` prop, so the render stays deliberately
 *   permissive — no validation, clamping or coercion, which those callers rely on.
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
      <Component className="text-balance text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
        {title}
      </Component>
      {subtitle ? (
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted md:text-lg">
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}

export default SectionHeading
