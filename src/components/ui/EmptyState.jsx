import { isValidElement } from 'react'
import Card from './Card.jsx'
import { cn } from '../../lib/cn.js'

/**
 * EmptyState
 *
 * THE single canonical "what happened / what next" state for the CIBLE School
 * of Language SPA. Every view that can render with no records — a filtered
 * catalogue that matched nothing, an unknown course or event slug, an empty
 * comparison set, a learning-path questionnaire whose answers matched no
 * course, an unpopulated dashboard panel, an empty search, the blog / faculty /
 * gallery / success-stories listings, the shared FAQ no-results branch, and the
 * admission flow's blocked and error result panels — renders THIS component.
 * There must be exactly ONE empty-state implementation in the codebase: never
 * hand-roll a bare sentence (the deficiency this replaces, e.g. the former
 * `<p className="text-center text-muted">No courses in this category yet.</p>`)
 * and never fork a second, tone-specific variant of this primitive.
 *
 * ## Contract: a title alone is NOT an empty state
 *
 * The requirement this component exists to satisfy is that every instance
 * answers BOTH questions a visitor has:
 *   1. WHAT HAPPENED  → `title` (short) + `description` (the explanation).
 *   2. WHAT DO I DO NEXT → `action` (one or more composed <Button>s / links).
 * A caller that passes only `title` is using this component incorrectly: the
 * visitor is told a thing is missing and given no route forward, which is the
 * "unexplained empty container" this primitive was created to eliminate.
 * `description` and `action` are therefore first-class props and, by contract,
 * effectively required — they are technically optional only so that the rare
 * genuinely terminal state (e.g. "No past events are listed") is expressible
 * without inventing a fake next step.
 *
 * Deliberately NO default copy is baked in. This primitive authors no content
 * of its own; every string is supplied by the caller (content lives in
 * `src/data/*` or in the calling view, never inside a UI primitive). A caller
 * that forgets a `title` renders no heading — the omission is obvious rather
 * than papered over by generic filler such as "No items found".
 *
 * ## Composition (reuse first, zero duplication)
 *
 * The surface is the shared {@link Card} primitive, so the radius, hairline
 * border and padding come from the one canonical card surface rather than from
 * a second hand-rolled panel. Two of Card's defaults are deliberately
 * overridden through the merged `className`:
 *   • the white fill → the tone surface (`bg-surface` / `bg-secondary-50`), and
 *   • `shadow-sm` / `hover:shadow-md` → `shadow-none` / `hover:shadow-none`,
 *     because an empty state is NOT interactive and every established result
 *     panel in this codebase (the admission form's opened/blocked panels, the
 *     FAQ no-results branch) is a flat bordered surface. A hover lift here
 *     would imply the panel itself is clickable.
 * The action row reuses the proven `flex flex-wrap gap-3` treatment from those
 * same panels, so two or three actions WRAP instead of overflowing at 320px.
 * `action` is a node, so callers compose real <Button>s and inherit the 44px
 * touch-target floor and the global `:focus-visible` ring automatically — this
 * component re-declares neither.
 *
 * ## Tones
 *
 * Exactly TWO, and the vocabulary is a cross-module contract with the `tone`
 * key carried by `src/lib/states.js`: do not rename either value and do not add
 * a third. An unknown value falls back to `'neutral'`, mirroring how `Button`
 * and `Badge` fall back to their `primary` variants.
 *   • `'neutral'` — nothing is wrong; there is simply nothing to show yet
 *     (no saved courses, no results, an unfiltered-but-empty listing). Renders
 *     on `bg-surface` (#f8fafc, the alternating-band / filter-panel surface)
 *     with a `text-foreground` heading. Adds NO ARIA role.
 *   • `'caution'` — something did not work and the visitor must act (a blocked
 *     WhatsApp popup, a dispatch error, an unavailable course or event). Renders
 *     the established caution pairing — `bg-secondary-50` fill with a
 *     `text-secondary-800` heading and a `text-secondary-700` glyph — matching
 *     the admission form's blocked panel exactly. The palette has no red /
 *     danger token by design, so caution standardises on the secondary (orange)
 *     scale; no new colour is introduced here.
 * Both tones use `text-muted` (#475569) body copy, which clears WCAG AA on
 * white, `surface` and `secondary-50` alike.
 *
 * ## The `role` rule (load-bearing — read before changing)
 *
 * `'caution'` PINS `role="alert"` so a failure is announced assertively, and it
 * is applied AFTER the caller's `...rest` spread so it cannot be overridden —
 * the same defensive ordering `Button` uses for its security props. For
 * `'neutral'` a caller-supplied `role` IS honoured and forwarded untouched:
 * this is required, not cosmetic, because the shared FAQ component's existing
 * no-results branch carries `role="status"`, and standardising it onto this
 * primitive must not silently drop that polite announcement.
 *
 * The role sits on the ROOT element (not on an inner text wrapper as the
 * admission form's panels do). That placement is what makes the pin
 * enforceable and the neutral passthrough unambiguous; the cost is that a
 * caution announcement also reads the action labels, which is acceptable —
 * those labels ARE the next step being announced.
 *
 * ## Accessibility
 *
 * - `icon` is purely DECORATIVE: it is always rendered inside a single
 *   `aria-hidden="true"` wrapper, so meaning is carried exclusively by `title`
 *   and `description` and never by an icon or colour alone (WCAG 1.4.1).
 * - `headingAs` lets the heading land at the correct outline depth, since this
 *   primitive appears both as a page-level unavailable state (under an `<h1>`)
 *   and inside dashboard/listing panels (under an `<h2>`). It defaults to
 *   `'h3'`, consistent with `Accordion`'s `headingAs`.
 * - No heading element is emitted when `title` is absent, so an empty heading
 *   can never enter the accessibility tree.
 * - Focus styling is inherited from the single global `:focus-visible` rule in
 *   src/index.css and is never re-declared; there is nothing focusable in this
 *   component itself, so it introduces no keyboard trap.
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens from
 * src/index.css) on the project's spacing scale — `p-6` and the hairline border
 * arrive from Card, `gap-4` separates the icon / text / action blocks and
 * `gap-3` the actions within their row. There are no hardcoded or arbitrary
 * `[..]` values, no new token and no new utility.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.title] Short statement of WHAT
 *   HAPPENED, rendered as the heading (`text-xl font-bold`). Omitted entirely
 *   when not supplied — no placeholder copy is substituted.
 * @param {import('react').ReactNode} [props.description] The explanation, and
 *   usually where the next step is spelled out in prose. Rendered as a muted
 *   paragraph, so pass inline content (text, `<strong>`, a `<Link>`) rather
 *   than block-level elements.
 * @param {import('react').ReactNode} [props.action] The WHAT-NEXT affordance —
 *   one or more composed `<Button>`s (or links). Wrapped in a `flex flex-wrap
 *   gap-3` row so multiple actions wrap rather than overflow on narrow
 *   viewports.
 * @param {'neutral'|'caution'} [props.tone='neutral'] Visual + ARIA treatment.
 *   Unknown values fall back to `'neutral'`. See the Tones section above.
 * @param {import('react').ElementType|import('react').ReactElement} [props.icon]
 *   An OPTIONAL decorative glyph. Pass a react-icons component *reference*
 *   (`icon={FaInbox}`) per the house convention; an already-rendered element
 *   (`icon={<FaInbox />}`) is also tolerated. Either way it is hidden from
 *   assistive technology.
 * @param {import('react').ElementType|number} [props.headingAs='h3'] Heading
 *   element for `title` — an element name (`'h2'`) or a numeric level (`2`,
 *   accepted because the shared FAQ component addresses heading depth
 *   numerically). Anything unusable falls back to `'h3'`.
 * @param {string} [props.className] Extra classes merged LAST via {@link cn},
 *   so a caller's utility always wins (e.g. `'items-center text-center'` to
 *   centre the block, or `'bg-white'` to sit it on a tinted section).
 * @param {object} [props] Any other props (`id`, `aria-*`, `data-*`, …) are
 *   forwarded to the root surface. A `role` is honoured for `'neutral'` and
 *   ignored for `'caution'`, which pins `role="alert"`.
 * @returns {import('react').ReactElement} The rendered empty / unavailable /
 *   failure state.
 */

// Layout + surface-reset classes shared by both tones. Module-local (not
// exported) so this file exposes only the EmptyState component, keeping
// `react/only-export-components` clean. `items-start` matches the admission
// form's result panels; `shadow-none hover:shadow-none` neutralises Card's
// interactive elevation (see the Composition note above).
const layout = 'flex flex-col items-start gap-4 shadow-none hover:shadow-none'

// Tone → surface fill, heading colour, glyph colour and the pinned ARIA role.
// Light token fill with dark token text in both cases, so contrast is AA for
// normal-size text and no white-on-light pairing is ever produced. Keep this
// map at exactly two keys: `src/lib/states.js` populates its `tone` field
// against this vocabulary.
const tones = {
  neutral: {
    surface: 'bg-surface',
    title: 'text-foreground',
    icon: 'text-muted',
    // No role: "there is nothing here yet" is not an alert. A caller may supply
    // one (e.g. role="status" for a live-filtered result set) and it is kept.
    role: undefined,
  },
  caution: {
    surface: 'bg-secondary-50',
    title: 'text-secondary-800',
    icon: 'text-secondary-700',
    role: 'alert',
  },
}

/**
 * Resolve the heading prop into a renderable element type.
 *
 * Accepts an element name or component (`'h2'`, `'h3'`, …) and — because the
 * shared FAQ component expresses heading depth numerically — a numeric level,
 * which is clamped into the valid HTML range and mapped to `h1`–`h6`. Any
 * unusable input (empty string, boolean, null, NaN) falls back to `'h3'`, so a
 * mistaken prop can never produce an invalid tag or crash the render.
 *
 * @param {unknown} headingAs Desired heading element, component, or level.
 * @returns {import('react').ElementType} A renderable heading element type.
 */
function resolveHeading(headingAs) {
  if (typeof headingAs === 'number') {
    if (!Number.isFinite(headingAs)) return 'h3'
    const level = Math.min(6, Math.max(1, Math.trunc(headingAs)))
    return `h${level}`
  }
  if (typeof headingAs === 'string') return headingAs.trim() || 'h3'
  if (typeof headingAs === 'function' || (typeof headingAs === 'object' && headingAs !== null)) {
    return headingAs
  }
  return 'h3'
}

/**
 * Resolve the `icon` prop into a component TYPE to instantiate, or `null` when
 * it is already a rendered element (or is not renderable at all).
 *
 * react-icons are passed as component references per the house convention
 * (`icon={FaInbox}`); `forwardRef`/`memo`-wrapped icons arrive as objects and
 * are equally valid element types. Booleans, numbers and symbols are rejected
 * so an accidental `icon={true}` degrades to no glyph instead of throwing.
 *
 * @param {unknown} icon Candidate icon.
 * @returns {import('react').ElementType|null} The component type, or `null`.
 */
function resolveIconType(icon) {
  if (icon === null || icon === undefined || isValidElement(icon)) return null
  const kind = typeof icon
  if (kind === 'function' || kind === 'string' || kind === 'object') return icon
  return null
}

function EmptyState({
  title,
  description,
  action,
  tone = 'neutral',
  icon,
  headingAs = 'h3',
  className,
  ...rest
}) {
  // Unknown tones fall back to neutral so the state always renders a styled,
  // readable panel (Button/Badge fallback precedent). The lookup is an
  // OWN-property check rather than a bare `tones[tone] || tones.neutral`,
  // because a bare index would resolve inherited Object.prototype keys — a
  // `tone="constructor"` would otherwise yield a truthy non-tone object and
  // render an unstyled panel with no surface colour.
  const toneStyles = Object.hasOwn(tones, tone) ? tones[tone] : tones.neutral
  const Heading = resolveHeading(headingAs)
  const IconType = resolveIconType(icon)
  // Either a component reference to instantiate, or an element the caller
  // already rendered. Both are wrapped in the same aria-hidden span below, so
  // the glyph is decorative regardless of which form was passed.
  const iconContent = IconType ? <IconType /> : isValidElement(icon) ? icon : null
  const hasText = Boolean(title) || Boolean(description)

  return (
    <Card
      {...rest}
      // Applied AFTER the caller spread: `caution` pins role="alert" and cannot
      // be overridden, while `neutral` forwards whatever role the caller set
      // (undefined → React omits the attribute entirely).
      role={toneStyles.role ?? rest.role}
      className={cn(layout, toneStyles.surface, className)}
    >
      {iconContent ? (
        // Decorative only — meaning lives in the title and description. The
        // glyph is sized by font-size because react-icons default to 1em.
        <span aria-hidden="true" className={cn('text-2xl leading-none', toneStyles.icon)}>
          {iconContent}
        </span>
      ) : null}

      {hasText ? (
        <div>
          {title ? (
            <Heading className={cn('text-xl font-bold', toneStyles.title)}>{title}</Heading>
          ) : null}
          {description ? (
            <p className={cn('text-muted', title ? 'mt-2' : null)}>{description}</p>
          ) : null}
        </div>
      ) : null}

      {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
    </Card>
  )
}

export default EmptyState
