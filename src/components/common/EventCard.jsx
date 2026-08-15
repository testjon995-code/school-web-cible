import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'
import { formatCivilDate } from '../../lib/dates.js'
import { FiClock, FiMapPin } from 'react-icons/fi'

/**
 * EventCard
 *
 * The single canonical upcoming-event card for the CIBLE School of Language SPA
 * (AAP §0.6.1 Group 7). It is composed on the Events page and in the Home page
 * events preview to render one entry from `src/data/events.js`. Reuse this
 * component rather than restyling a raw surface, so every event tile stays
 * visually and semantically consistent (project reuse-first rule).
 *
 * It is intentionally presentational (no data fetching, no local state, no
 * animation): the parent list is responsible for layout and any scroll-reveal
 * motion. Only a subtle `hover:-translate-y-1` lift is baked in as a
 * micro-interaction, which the shared base honours.
 *
 * Composition (never forks a second Button/Card/Badge):
 * - Root surface        → `ui/Card` rendered `as="article"` (self-contained
 *   landmark). `p-0` is merged LAST so it overrides Card's default `p-6`,
 *   letting the banner bleed to the rounded edges (`overflow-hidden`).
 * - Category label       → `ui/Badge variant="accent"` (green "free/positive"
 *   signal), the accessible source of `event.type`.
 * - Conversion CTA       → `ui/Button` rendered as a react-router `<Link>` via
 *   the polymorphic `to` prop. The default target is EVENT-AWARE —
 *   `/contact?event=<slug>` — so the event's identity survives the handoff to
 *   the Contact page (M22); admissions-first.
 *
 * Banner:
 * - When `event.image` is truthy an `<img>` is shown. It is treated as
 *   decorative (`alt=""` + `aria-hidden`) because the title, type and date
 *   already convey the event; it is lazy-loaded and async-decoded for
 *   Core Web Vitals.
 * - Otherwise a brand-gradient fallback (`from-secondary-700 → secondary-800`,
 *   chosen so the overlaid white label clears WCAG AA large-text contrast)
 *   fills the 16:9 (`aspect-video`) banner so image-less events (the current
 *   data set) still read as finished, premium cards rather than empty rectangles.
 * - A white "date badge" is overlaid top-left in both cases: the two-digit day
 *   over the short month, wrapped in a machine-readable `<time dateTime>`.
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens defined in
 * src/index.css) — every colour, spacing, radius and shadow resolves to a design
 * token or utility on the 8px scale, with no hardcoded values (the banner uses
 * the native `aspect-video` utility, not an arbitrary ratio). Colour tokens use
 * the project's scale-based names (`text-primary-600`, `text-muted`,
 * `from-secondary-700`), matching the shared `Card`/`Badge`/`Button` primitives.
 *
 * Accessibility (WCAG AA):
 * - Semantic `<article>` landmark, a single `<h3>` title, and `<time dateTime>`
 *   for both the badge and the full date.
 * - Banner image and meta icons are decorative and `aria-hidden`.
 * - The repeated "Register" CTA is disambiguated with a per-event `aria-label`.
 * - Text pairings use AA-compliant tokens on white (`foreground` ~17:1,
 *   `muted` ~7.5:1, `primary-600` ~4.6:1).
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
 * @param {object} [props] Any other props are forwarded to the Card root
 *   (`id`, `aria-*`, `data-*`, event handlers, …).
 * @returns {import('react').ReactElement|null} The rendered event card, or
 *   `null` when no `event` is supplied.
 */

// Date helpers delegate to the shared `formatCivilDate` (src/lib/dates.js),
// which parses a date-only 'YYYY-MM-DD' string as a CIVIL date — i.e. via
// `new Date(y, m-1, d)` in local time rather than `new Date(iso)`'s UTC-midnight
// parse. This eliminates the off-by-one day-shift the review observed under
// timezones west of UTC (M21). It returns '' for missing/invalid dates, so the
// card still degrades gracefully. The en-IN locale matches CIBLE's audience.

// Two-digit day for the overlaid date badge, e.g. '16'.
function getDay(iso) {
  return formatCivilDate(iso, { day: '2-digit' })
}

// Short month for the overlaid date badge, e.g. 'Aug'.
function getMonth(iso) {
  return formatCivilDate(iso, { month: 'short' })
}

// Full, human-readable date for the meta row, e.g. 'Sat, 16 Aug 2026'.
function formatFullDate(iso) {
  return formatCivilDate(iso, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function EventCard({ event, to, className, ...props }) {
  // Guard: nothing to render without an event record.
  if (!event) return null

  const { slug, title, date, time, type, description, location, image } = event

  // Combine the full date and display time into one meta string, dropping any
  // empty part so an invalid date never yields a stray leading separator.
  const schedule = [formatFullDate(date), time].filter(Boolean).join(' · ')

  // Event-aware Register target (M22): carry the event identity to the Contact
  // page via an allowlisted `?event=<slug>` query so the registration is
  // pre-scoped to THIS event (the Contact page validates the slug and pre-fills
  // the subject). An explicit `to` prop still overrides. Falls back to plain
  // `/contact` only when the event has no slug.
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
      {/* Banner — real image when supplied, brand-gradient fallback otherwise.
          Uses the native `aspect-video` (16:9) utility rather than an arbitrary
          bracket value, honouring the token-only design rule (M14). */}
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
            {/* Fallback banner label. The gradient uses the darker secondary-700
                → secondary-800 tokens so the large (text-2xl/bold) white label
                clears the WCAG AA large-text 3:1 minimum with margin (white on
                secondary-700 ≈ 5.18:1) — fixing the former ~2.08–2.80:1 gradient
                (M11). It stays aria-hidden because the same `type` is exposed
                accessibly by the <Badge> below (no duplicate announcement). */}
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

        {/* Date badge — day stacked over short month, machine-readable via <time>. */}
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

      {/* Body — category, title, description, meta rows, and admission CTA. */}
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

        {/* Register CTA → event-aware Contact link (registerTo). Uses the shared
            Button `size="sm"`, whose compact step is now ≥44px tall/wide
            (min-h-11 min-w-11), satisfying the touch-target guideline (M12). */}
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
