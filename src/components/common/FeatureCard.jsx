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
 * Reuse-first: FeatureCard COMPOSES the shared <Card> surface primitive rather than
 * restyling a raw <div>, so it inherits the one brand card surface and adds only the
 * feature-specific concerns — a vertical layout, an icon badge and a subtle hover
 * lift.
 *
 * Data-agnostic: all content is supplied by the caller via props, so the same
 * component serves any feature list without duplication (the consuming page owns
 * the data; this component owns the presentation).
 *
 * Styling (Tailwind v4 `@theme` tokens from src/index.css — zero hardcoded values,
 * 8px spacing scale):
 * - Root: the inherited Card surface plus a vertical stack and a subtle CSS hover
 *   lift. The lift is a pure CSS micro-interaction rather than framer-motion, so it
 *   costs no animation runtime and is neutralised automatically by the global
 *   `prefers-reduced-motion` reset in index.css. It is still a TRANSFORM, so this tile
 *   belongs in a grid; <ReviewCard> is the card to use inside a carousel, where a
 *   transform can jitter a slide mid-transition.
 * - Icon badge: a tinted disc on the brand `--radius-lg` step, rendered ONLY when an
 *   `icon` is provided so there is never an empty badge. Tailwind's stock next step up
 *   resolves to the same length but is a framework value rather than one of the two
 *   brand radius steps, so the badge stays on the token and the radius vocabulary
 *   stays singular.
 * - Title: an `<h3>`. Description: a muted `<p>`.
 *
 * Note on tokens: the design system exposes the numbered brand scale and a neutral
 * `muted`, which is what the utilities here use, matching every sibling primitive.
 * There is no bare `--color-primary` or `--color-muted-foreground` token, so those
 * variants would emit no CSS and are intentionally not used.
 *
 * Accessibility (WCAG AA):
 * - The `icon` is purely decorative: it is rendered with `aria-hidden="true"` and
 *   carries no label, because meaning is conveyed by the visible `title` — never
 *   by the icon or color alone.
 * - Uses an `<h3>`: these tiles sit beneath a section-level `<h2>`, keeping the
 *   document heading hierarchy correct.
 * - Both text tokens clear AA contrast on the white card surface (the ledger lives in
 *   src/index.css).
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
 * @returns {import('react').ReactElement} The rendered feature card.
 */
function FeatureCard({ icon, title, description, className, ...props }) {
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
