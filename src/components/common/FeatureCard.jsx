import Card from '../ui/Card.jsx'
import { cn } from '../../lib/cn.js'

/**
 * FeatureCard
 *
 * A small, reusable "why choose us" feature tile — a decorative icon badge, a
 * short heading, and a line or two of supporting copy. It is the canonical way
 * to present a single selling point (e.g. "Expert Faculty", "Small Batches",
 * "Proven Results") across the CIBLE School of Language marketing site, and is
 * typically rendered inside a responsive grid such as the Home page
 * "Why choose us" section.
 *
 * Reuse-first: FeatureCard COMPOSES the shared <Card> surface primitive rather
 * than restyling a raw <div>, so it inherits the one brand surface used by every
 * card in the product (`rounded-2xl border border-border bg-white p-6 shadow-sm
 * hover:shadow-md`). FeatureCard adds only the feature-specific concerns: a
 * vertical layout, an icon badge, and a subtle hover lift.
 *
 * Data-agnostic: all content is supplied by the caller via props, so the same
 * component serves any feature list without duplication (the consuming page owns
 * the data; this component owns the presentation).
 *
 * Styling (Tailwind CSS v4 `@theme` tokens defined in src/index.css — zero
 * hardcoded values, 8px spacing scale):
 * - Root: inherits the Card surface and adds `flex flex-col gap-4` (16px vertical
 *   rhythm for the icon → title → text stack) plus `transition-transform
 *   duration-200 hover:-translate-y-1` — a subtle, GPU-cheap CSS hover lift. It is
 *   deliberately a PURE CSS micro-interaction (no framer-motion), so the card
 *   stays safe to render inside sliders/carousels and automatically honors
 *   `prefers-reduced-motion` via the global reduced-motion reset in index.css.
 * - Icon badge: a 48px (`h-12 w-12`), `rounded-lg` tinted disc — a translucent
 *   `bg-primary-600/10` fill with a `text-primary-600` glyph — rendered ONLY when
 *   an `icon` is provided (no empty badge otherwise). `rounded-lg` is the brand
 *   --radius-lg token (0.75rem); Tailwind's stock `xl` step resolves to the very
 *   same 0.75rem but is a framework value, not one of the two brand radius steps,
 *   so the badge stays on the token to keep the radius vocabulary singular.
 * - Title: an `<h3>` at `text-lg font-semibold text-foreground`.
 * - Description: a `<p>` at `text-sm leading-relaxed text-muted`.
 *
 * Note on tokens: this repo's design system (src/index.css `@theme`) exposes the
 * numbered brand scale (`--color-primary-600`) and a `--color-muted` neutral, so
 * the utilities used here are `text-primary-600` / `bg-primary-600/10` and
 * `text-muted` (matching every sibling primitive) — there is no bare
 * `--color-primary` or `--color-muted-foreground` token, so those variants would
 * emit no CSS and are intentionally NOT used.
 *
 * Accessibility (WCAG AA):
 * - The `icon` is purely decorative: it is rendered with `aria-hidden="true"` and
 *   carries no label, because meaning is conveyed by the visible `title` — never
 *   by the icon or color alone.
 * - Uses an `<h3>`: these tiles sit beneath a section-level `<h2>`, keeping the
 *   document heading hierarchy correct.
 * - Text pairs `text-foreground` (~17:1) and `text-muted` (~7.5:1) both clear AA
 *   contrast on the white card surface.
 *
 * Composition:
 * - `className` is merged LAST through `cn()` (clsx + tailwind-merge), so any
 *   utility a caller passes deterministically overrides the matching base utility.
 * - All other props are forwarded to the underlying <Card>, including its
 *   polymorphic `as` prop (e.g. `as="li"` when rendered inside a <ul>) and any
 *   `id` / `data-*` / `aria-*` attributes.
 *
 * @param {object} props
 * @param {import('react').ComponentType<{ className?: string, 'aria-hidden'?: boolean | 'true' | 'false' }>} [props.icon]
 *   A react-icons component *reference* — pass the component itself
 *   (`icon={FaGraduationCap}`), never a rendered element (`icon={<FaGraduationCap/>}`)
 *   and never a call. Omit to render the card with no icon badge.
 * @param {string} [props.title] Short feature heading (rendered inside an `<h3>`).
 * @param {string} [props.description] Supporting body copy (rendered inside a `<p>`).
 * @param {string} [props.className] Extra classes, merged last (wins on conflict).
 * @param {object} [props] Any other props (`as`, `id`, `aria-*`, `data-*`, event
 *   handlers, …) are forwarded to the underlying <Card> root.
 * @returns {import('react').ReactElement} The rendered feature card.
 */
function FeatureCard({ icon, title, description, className, ...props }) {
  // react-icons are passed as component REFERENCES. Assign to a Capitalized local
  // so JSX renders it as an element; never invoke the icon as a plain function.
  const Icon = icon

  return (
    <Card
      className={cn(
        'flex flex-col gap-4 transition-transform duration-200 hover:-translate-y-1',
        className,
      )}
      {...props}
    >
      {Icon ? (
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary-600/10 text-primary-600">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      ) : null}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </Card>
  )
}

export default FeatureCard
