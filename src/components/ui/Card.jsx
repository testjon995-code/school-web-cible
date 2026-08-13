import { cn } from '../../lib/cn.js'

/**
 * Card
 *
 * THE single canonical content-card surface for the CIBLE School of Language
 * SPA. Every card in the product — course cards, faculty cards, review cards,
 * blog/event cards, feature cards, statistic tiles, form panels, etc. — is
 * built by composing this primitive. Never restyle a raw <div> as a card
 * elsewhere; always compose <Card> so the brand surface stays consistent
 * (design system: `bg-white rounded-2xl shadow-sm hover:shadow-md`).
 *
 * The base surface is intentionally neutral (a rounded, white, hairline-bordered
 * panel with soft padding and a subtle shadow that deepens on hover). It bakes
 * in NO use-case-specific typography or spacing — callers compose their own
 * children (heading, body, footer, buttons, media) inside.
 *
 * Styling — every value resolves to a Tailwind v4 `@theme` token from
 * src/index.css or to a built-in utility; zero arbitrary bracket values:
 * - `rounded-2xl`   → --radius-2xl (1.25rem) rounded corners. The brand radius
 *   scale is deliberately two steps only (--radius-lg, --radius-2xl) and cards
 *   sit on the larger one, so keep this class as-is: Tailwind's other default
 *   radii are framework values, not brand tokens.
 * - `border border-border` → 1px hairline in --color-border (slate-200) so the
 *   surface reads crisply on white-on-white and neutral `surface` sections.
 * - `bg-white`      → white card fill. Tailwind's built-in white, identical in
 *   value to the --color-background token (#ffffff) and the fill vocabulary
 *   used consistently across the codebase.
 * - `p-6`           → 24px padding (8px spacing scale).
 * - `shadow-sm` → `hover:shadow-md` → soft shadow (--shadow-sm/--shadow-md)
 *   that deepens on hover. Hover is signalled by SHADOW, not color, so it does
 *   not rely on color alone and text contrast is unaffected (WCAG). This is ONE
 *   elevation step and it stays one: the deeper third elevation token declared
 *   in src/index.css is scoped to fixed/floating surfaces (the persistent
 *   conversion widgets), so a card must never adopt it — the Swiper override
 *   zone in that file reserves slide padding sized to contain exactly the
 *   --shadow-md bleed, which a deeper shadow would overflow.
 * - `transition-shadow duration-200 ease-out` → the elevation blooms over 200ms
 *   on a decelerating curve (`ease-out` resolves Tailwind's built-in --ease-out,
 *   cubic-bezier(0, 0, .2, 1)), so it responds at once and settles instead of
 *   easing in symmetrically. `transition-shadow` keeps the BASE transition on
 *   `box-shadow` alone — a non-layout property, so the base can never shift
 *   layout. How it composes: a caller passing its own `transition-*` utility
 *   REPLACES this one, because tailwind-merge treats them as a single conflict
 *   group; `ease-out` belongs to a different group and survives, so the eased
 *   curve still governs whatever that caller transitions (the media-topped cards
 *   ease their hover lift rather than their shadow). Tailwind v4 scopes every
 *   `hover:` utility behind `@media (hover: hover)`, so touch devices get no
 *   sticky hover, and the global `prefers-reduced-motion` block in src/index.css
 *   neutralises the transition — no local `motion-reduce:` variant is needed.
 *
 * Override contract: `className` is merged LAST via `cn(...)` (clsx +
 * tailwind-merge), so caller-supplied utilities always win over the base. For
 * example an image-topped card can pass `className="p-0 overflow-hidden"` to
 * drop the default padding and clip the media to the rounded corners.
 *
 * Accessibility: this is a structural surface. Use the polymorphic `as` prop to
 * pick the correct semantics (e.g. `as="article"` for a self-contained card,
 * `as="li"` inside a list). It intentionally adds NO click semantics — if a
 * whole card must be actionable, compose an interactive <Button>/<a>/<Link>
 * inside it (or pass appropriate role/handlers via `...props`), so keyboard and
 * screen-reader behaviour remain correct.
 *
 * @param {object} props
 * @param {import('react').ElementType} [props.as='div'] Element/component to
 *   render as the card root (e.g. `'div'`, `'article'`, `'li'`).
 * @param {string} [props.className] Extra classes merged LAST (override the base).
 * @param {import('react').ReactNode} [props.children] Card content.
 * @param {object} [props] Any other props (`id`, `aria-*`, `onClick`, `style`,
 *   data attributes, …) are forwarded to the rendered root element.
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
