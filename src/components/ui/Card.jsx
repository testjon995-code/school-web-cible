import { cn } from '../../lib/cn.js'

/**
 * Card
 *
 * The canonical reusable content-card surface for the CIBLE School of Language
 * SPA: the course, faculty, review, blog, event and feature cards all compose it.
 * Reach for it rather than restyling a raw <div> as a card, so the brand surface
 * stays consistent wherever a card appears.
 *
 * The base surface is intentionally neutral — a rounded, white, hairline-bordered
 * panel with soft padding and a subtle shadow that deepens on hover. It bakes in
 * no use-case-specific typography or spacing; callers compose their own children
 * (heading, body, footer, buttons, media) inside.
 *
 * Styling: every value resolves to a Tailwind v4 `@theme` token from src/index.css
 * or to a built-in utility, with zero arbitrary bracket values — the larger of the
 * two brand radius steps, the hairline border token, a white fill, 24px padding on
 * the 8px scale, and the two-step card elevation.
 *
 * ELEVATION IS ONE STEP AND STAYS ONE: hover deepens `--shadow-sm` to
 * `--shadow-md`, which signals the state by shadow rather than by colour and
 * leaves text contrast untouched. The deeper third elevation token in
 * src/index.css belongs to fixed/floating surfaces (the persistent conversion
 * widgets) and a card must never adopt it: the Swiper override zone reserves slide
 * padding sized to contain exactly the `--shadow-md` bleed, which a deeper shadow
 * would overflow.
 *
 * The base transition is scoped to `box-shadow` — a non-layout property, so the
 * base surface can never shift layout — on a decelerating curve. A caller passing
 * its own transition utility replaces that one (tailwind-merge treats them as a
 * single conflict group) while the easing survives in its own group, which is how
 * the media-topped cards ease their hover lift instead of their shadow. Tailwind
 * scopes `hover:` behind `@media (hover: hover)`, so touch devices get no sticky
 * hover, and the global `prefers-reduced-motion` block in src/index.css
 * neutralises the transition — no local motion variant is needed.
 *
 * Override contract: `className` is merged LAST via `cn(...)` (clsx +
 * tailwind-merge), so caller-supplied utilities always win over the base. An
 * image-topped card, for instance, drops the default padding and clips its media
 * to the rounded corners that way. Any other props (`id`, `aria-*`, `onClick`,
 * `style`, data attributes, …) are forwarded to the rendered root element.
 *
 * Accessibility: this is a structural surface. Use the polymorphic `as` prop to
 * pick the correct semantics (`as="article"` for a self-contained card, `as="li"`
 * inside a list). It intentionally adds NO click semantics — if a whole card must
 * be actionable, compose an interactive <Button>/<a>/<Link> inside it (or pass
 * role/handlers through the forwarded props), so keyboard and screen-reader
 * behaviour remain correct.
 *
 * @param {object} props
 * @param {import('react').ElementType} [props.as='div'] Element/component to
 *   render as the card root (e.g. `'div'`, `'article'`, `'li'`).
 * @param {string} [props.className] Extra classes merged LAST (override the base).
 * @param {import('react').ReactNode} [props.children] Card content.
 * @returns {import('react').ReactElement} The rendered card surface.
 */
function Card({ as: Component = 'div', className, children, ...props }) {
  return (
    <Component
      className={cn(
        'rounded-2xl border border-border bg-white p-6 shadow-sm transition-shadow duration-200 ease-out hover:shadow-md',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  )
}

export default Card
