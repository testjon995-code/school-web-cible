import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'
import { formatCivilDate } from '../../lib/dates.js'
import { FiClock, FiMapPin } from 'react-icons/fi'

/**
 * EventCard
 *
 * The single canonical event card for the CIBLE School of Language SPA. The Events
 * page and the Home events band compose it to render one entry from
 * `src/data/events.js`. Reuse it rather than restyling a raw surface, so every event
 * tile stays visually and semantically consistent.
 *
 * It is intentionally presentational — no data fetching, no local state, no animation
 * library: the parent list owns layout and any scroll reveal. The only motion baked in
 * is a subtle CSS hover lift, which the global reduced-motion reset neutralises.
 *
 * Composition (never forks a second Button/Card/Badge):
 * - Root surface  → `ui/Card` as an `<article>`, with zero padding merged LAST so it
 *   overrides Card's default and lets the banner bleed to the rounded, clipped edges.
 * - Category label → `ui/Badge`, the accessible source of `event.type`.
 * - Conversion CTA → `ui/Button` as a react-router `<Link>`. The default target is
 *   EVENT-AWARE (`/contact?event=<slug>`), so the event's identity survives the handoff
 *   to the Contact page.
 *
 * Banner: a truthy `event.image` renders an `<img>`, treated as decorative because the
 * title, type and date already convey the event, and lazy-loaded for Core Web Vitals.
 * Otherwise a brand-gradient fallback fills the same 16:9 box, so an image-less event
 * still reads as a finished card rather than an empty rectangle; the gradient uses the
 * darker secondary steps so the large white label over it clears the WCAG AA large-text
 * minimum. In both cases a white date badge is overlaid, the two-digit day over the
 * short month, wrapped in a machine-readable `<time dateTime>`.
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens from src/index.css) —
 * every colour, spacing, radius and shadow resolves to a design token or native utility
 * on the 8px scale, with no hardcoded or arbitrary values (the banner ratio is the
 * native aspect utility).
 *
 * Accessibility (WCAG AA):
 * - Semantic `<article>`, a single `<h3>` title, and `<time dateTime>` for both the
 *   badge and the full date.
 * - The banner image and the meta icons are decorative and `aria-hidden`.
 * - The repeated "Register" CTA is disambiguated with a per-event `aria-label`.
 * - Every text pairing clears AA on the white surface (the contrast ledger lives in
 *   src/index.css).
 *
 * @param {object} props
 * @param {object} props.event Event record — `{ slug, title, date, time, type,
 *   description, location, image }`. `date` is an ISO 'YYYY-MM-DD' string parsed
 *   as a civil date; `slug` scopes the event-aware Register link; `image` is a
 *   URL or `null` (→ gradient fallback). If `event` is missing the component
 *   renders `null`.
 * @param {string} [props.to] Explicit route for the "Register" CTA. When omitted
 *   it defaults to the event-aware `/contact?event=<slug>` (or `/contact` when
 *   the event has no slug).
 * @param {string} [props.className] Extra classes merged LAST onto the Card root.
 * @returns {import('react').ReactElement|null} The rendered event card, or `null` when
 *   no `event` is supplied.
 *
 * Any other props (`id`, `aria-*`, `data-*`, event handlers, …) are forwarded to the
 * Card root.
 */

// Every date helper delegates to the shared `formatCivilDate` (src/lib/dates.js),
// which parses a date-only 'YYYY-MM-DD' string as a CIVIL date — `new Date(y, m-1, d)`
// in local time rather than `new Date(iso)`'s UTC-midnight parse, which would shift the
// displayed day by one in any timezone west of UTC. It returns '' for a missing or
// invalid date, so the card degrades gracefully, and its locale matches the audience.

function getDay(iso) {
  return formatCivilDate(iso, { day: '2-digit' })
}

function getMonth(iso) {
  return formatCivilDate(iso, { month: 'short' })
}

function formatFullDate(iso) {
  return formatCivilDate(iso, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function EventCard({ event, to, className, ...props }) {
  if (!event) return null

  const { slug, title, date, time, type, description, location, image } = event

  // Empty parts are dropped, so an invalid date never yields a stray separator.
  const schedule = [formatFullDate(date), time].filter(Boolean).join(' · ')

  // Event-aware Register target: the `?event=<slug>` query carries the event identity
  // to the Contact page, which validates the slug against its own allowlist and
  // pre-fills the subject, so the registration stays scoped to THIS event. An explicit
  // `to` prop overrides, and a slugless event falls back to plain `/contact`.
  const registerTo = to || (slug ? `/contact?event=${encodeURIComponent(slug)}` : '/contact')

  return (
    <Card
      as="article"
      className={cn(
        'flex h-full flex-col overflow-hidden p-0 transition-transform duration-200 hover:-translate-y-1',
        className,
      )}
      {...props}
    >
      {/* Banner — a real image when supplied, the brand-gradient fallback otherwise. */}
      <div className="relative aspect-video">
        {image ? (
          <img
            src={image}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary-700 to-secondary-800">
            {/* The gradient uses the darker secondary steps so this large white label
                clears the WCAG AA large-text minimum with margin. The label stays
                aria-hidden because the same `type` is announced by the <Badge> below,
                so it is never read twice. */}
            {type ? (
              <span
                aria-hidden="true"
                className="px-4 text-center text-2xl font-bold uppercase tracking-wide text-white"
              >
                {type}
              </span>
            ) : null}
          </div>
        )}

        <div className="absolute left-4 top-4 flex flex-col items-center rounded-lg bg-white px-3 py-2 shadow-sm">
          <time dateTime={date} className="flex flex-col items-center">
            <span className="text-xl font-bold leading-none text-primary-600">
              {getDay(date)}
            </span>
            <span className="text-xs font-medium uppercase text-muted">
              {getMonth(date)}
            </span>
          </time>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        {type ? (
          <Badge variant="accent" className="self-start">
            {type}
          </Badge>
        ) : null}

        <h3 className="text-lg font-semibold text-foreground">{title}</h3>

        {description ? (
          <p className="text-sm leading-relaxed text-muted">{description}</p>
        ) : null}

        {schedule ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <FiClock aria-hidden="true" />
            {schedule}
          </p>
        ) : null}

        {location ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <FiMapPin aria-hidden="true" />
            {location}
          </p>
        ) : null}

        {/* `mt-auto` pins the CTA to the bottom, so every card in a row ends with its
            action on the same line whatever the description length. */}
        <Button
          to={registerTo}
          variant="primary"
          size="sm"
          className="mt-auto"
          aria-label={title ? `Register for ${title}` : 'Register for this event'}
        >
          Register
        </Button>
      </div>
    </Card>
  )
}
