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
 * in `src/index.css` plus stock Tailwind type utilities; there are no hardcoded
 * or arbitrary values):
 * - eyebrow  : optional small uppercase kicker rendered as a `<p>` in brand blue
 *              (`text-primary-600`, AA on white). It is NOT a heading, so it
 *              never pollutes the accessibility outline. Its
 *              `text-sm font-semibold uppercase tracking-wide` treatment is
 *              deliberately identical to the footer's column kickers, so the
 *              whole site speaks ONE small-caps label voice — change it here and
 *              `layout/Footer.jsx` must change with it.
 * - title    : the section's REAL heading, rendered via the `as` tag so callers
 *              preserve a logical outline (pages pass `as="h1"` to make this the
 *              page's single `<h1>`; sections use the `<h2>` default and
 *              sub-sections `<h3>`).
 * - subtitle : optional supporting paragraph rendered as a muted `<p>`
 *              (`text-muted`, AA on white).
 *
 * Type hierarchy. The scale is `text-3xl`/`md:text-4xl` for the title and
 * `text-base`/`md:text-lg` for the subtitle, with the vertical rhythm on the
 * project's 8px scale (`mb-2` = 8px under the eyebrow, `mt-4` = 16px above the
 * subtitle). Line height is pinned EXPLICITLY on both, because Tailwind's
 * per-size defaults would otherwise drift across the breakpoint — a title would
 * run at 1.2 leading while small and TIGHTEN to 1.111 once `md:text-4xl` takes
 * over, and the subtitle would loosen from 1.5 to 1.556. `leading-tight` (1.25)
 * holds the title at one value on both steps and matches the hero's `<h1>`, so
 * every display heading on the site shares a single leading; being marginally
 * looser than both defaults, it also leaves descenders room to breathe on the
 * two- and three-line wraps that long titles take at 320px. `leading-relaxed`
 * (1.625) does the same for the subtitle and is the site-wide body-prose value.
 *
 * Wrapping is refined with `text-balance` on the title and `text-pretty` on the
 * subtitle: the heading's lines are evened out instead of leaving a lone trailing
 * word, and the paragraph avoids orphans. Both are progressive enhancements —
 * browsers without `text-wrap` support simply wrap normally, so no layout depends
 * on them.
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
 *   rendered verbatim — 17 page modules pass `as="h1"` so this block supplies the
 *   page's single `<h1>`, and `common/FAQ.jsx` derives the tag from its numeric
 *   `headingLevel` prop, so the render stays deliberately permissive: no
 *   validation, clamping or coercion here, or those callers would break.
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
