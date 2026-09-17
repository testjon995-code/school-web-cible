import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import AddToCalendar from './AddToCalendar.jsx'
import { cn } from '../../lib/cn.js'
import { formatCivilDate } from '../../lib/dates.js'
import { lifecycleOf } from '../../lib/eventSchedule.js'
import { EVENT_LIFECYCLE, eventLifecycleState } from '../../lib/states.js'
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
 * - Lifecycle indicator  → `ui/Badge` whose variant, label and icon ALL come
 *   from one `EVENT_LIFECYCLE` entry (see "Lifecycle" below).
 * - Conversion CTA       → `ui/Button` rendered as a react-router `<Link>` via
 *   the polymorphic `to` prop. The default target is EVENT-AWARE —
 *   `/contact?event=<slug>` — so the event's identity survives the handoff to
 *   the Contact page (M22); admissions-first.
 * - Detail link          → `ui/Button variant="outline"` to `/events/<slug>`,
 *   this event's own route, so the card reaches its OWN subject rather than a
 *   listing. Omitted entirely when the record has no slug, exactly as the
 *   Register target degrades, so a missing slug can never produce a broken
 *   `/events/undefined`.
 * - Calendar export      → `common/AddToCalendar`, composed rather than
 *   re-implemented: `src/lib/calendar.js` is never called from here, and the
 *   claim-safe copy ("a file downloaded", "opens pre-filled" — never "synced")
 *   lives in that component and is not overridden.
 *
 * Lifecycle (the state/UI consistency fix):
 * - The state is DERIVED, never assumed: `lifecycleOf(event, now)` from
 *   `src/lib/eventSchedule.js` returns `'upcoming' | 'today' | 'past' |
 *   'undated'` from a day-level civil-date comparison. `now` is INJECTED (see
 *   the `now` prop) so a whole listing can be classified against one instant
 *   and every branch is deterministic.
 * - The presentation and the PERMITTED ACTION SET are then read from a single
 *   `EVENT_LIFECYCLE` entry in `src/lib/states.js`, through that module's
 *   `eventLifecycleState()` accessor (own-property lookup; an unknown state
 *   degrades to the honest `undated`). This file authors NO lifecycle label,
 *   icon, variant or destination of its own, and it translates no variant
 *   vocabulary at the call site — the `Badge` reads `badgeVariant`, a `Button`
 *   reads `buttonVariant`. `src/pages/EventDetail.jsx` reads the SAME entry, so
 *   a card and its detail page cannot be authored separately and cannot drift.
 * - Before this, the Register CTA rendered UNCONDITIONALLY with no date
 *   comparison anywhere in the component, so a finished event still issued a
 *   live invitation to register. The fix therefore governs ACTIONS, not just
 *   text: a label-only change would have left that invitation in place.
 *
 * | Lifecycle  | Register | Add to Calendar | Replacement next action |
 * | ---------- | -------- | --------------- | ----------------------- |
 * | `upcoming` | shown    | shown           | —                       |
 * | `today`    | shown    | shown           | —                       |
 * | `past`     | NOT rendered | NOT rendered | "See upcoming events"  |
 * | `undated`  | shown    | NOT rendered    | —                       |
 *
 *   The reasons, because they are what keep the table from being re-litigated:
 *   a PAST event offers no registration because inviting registration to a
 *   finished event is the inconsistency itself, and no calendar export because
 *   exporting a concluded date is meaningless — withholding both would leave
 *   the card with no action at all, which is why `past` is the one state that
 *   supplies a replacement, and that replacement's label, route and variant all
 *   come from its entry. An UNDATED event keeps Register, because enquiring
 *   about an unscheduled event is legitimate, but loses the export, because
 *   there is no date to put in the file. A TODAY event keeps both, and its
 *   schedule row leads with that state's own label so the date reads as today.
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
 *   over the short month, wrapped in a machine-readable `<time dateTime>`. It
 *   renders only when the shared civil-date formatter yields both parts, so an
 *   `undated` record shows the honest "Date to be announced" badge instead of an
 *   empty white box — an unexplained empty container is the very thing the
 *   empty-state rule forbids. Every class and the `<time dateTime>` are
 *   unchanged for the records that do carry a date.
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
 * - The repeated "Register" CTA and the repeated detail link are each
 *   disambiguated with a per-event `aria-label`, because these names repeat
 *   across a grid of cards; both fall back to "this event" when a record has no
 *   title. The `past` state's replacement action is the one action deliberately
 *   NOT named per event: every past card points at the same listing, so naming
 *   the event would imply a per-event scoping that does not exist, and its
 *   entry declares its label to be both the visible text and the accessible
 *   name.
 * - The lifecycle indicator pairs a `badgeVariant` WITH the entry's label and
 *   its `aria-hidden` icon, so colour (and glyph) is never the sole carrier of
 *   state — the meaning is in the adjacent text for a screen-reader user and
 *   for a colour-blind visitor alike.
 * - Every action is the shared `ui/Button`, so the ≥44×44px touch target
 *   (`min-h-11 min-w-11`) and the focus ring come from the primitive and the
 *   global `:focus-visible` rule in src/index.css is inherited, never
 *   re-declared.
 * - The badge row WRAPS (`flex-wrap`) rather than compressing, so at 320px the
 *   type and lifecycle badges reflow onto a second line instead of pushing into
 *   the title; the action row wraps for the same reason.
 * - Text pairings use AA-compliant tokens on white (`foreground` ~17:1,
 *   `muted` ~7.5:1, `primary-600` ~4.6:1).
 *
 * @param {object} props
 * @param {import('../../data/events.js').CibleEvent} props.event Event record —
 *   `{ slug, title, date, time, type, description, location, image }`. `date` is
 *   an ISO 'YYYY-MM-DD' string parsed as a civil date and is what the lifecycle
 *   is derived from; `slug` is a PUBLIC CONTRACT that scopes both the
 *   event-aware Register link and the `/events/<slug>` detail route; `image` is
 *   a URL or `null` (→ gradient fallback). The record may also carry the
 *   additively-optional machine-readable companions `startTime`, `endTime`,
 *   `attendanceMode`, `onlineUrl` and `scheduleConfirmed`; this card displays
 *   NONE of them directly — `startTime`/`endTime` reach the calendar export via
 *   `AddToCalendar`, and the rest serve structured data and the detail route.
 *   Their ABSENCE changes nothing here: no displayed value depends on them, and
 *   the free-text `time` string remains what the schedule row shows. `location`
 *   is likewise displayed exactly as authored — it is prose (one record reads
 *   "Online via Google Meet (link shared after registration)"), so it is never
 *   parsed, and an attendance mode is never inferred from it or from `type`.
 *   If `event` is missing the component renders `null`.
 * @param {string} [props.to] Explicit route for the "Register" CTA. When omitted
 *   it defaults to the event-aware `/contact?event=<slug>` (or `/contact` when
 *   the event has no slug).
 * @param {string|Date} [props.now] An OPTIONAL shared reference instant,
 *   forwarded to `lifecycleOf` and on to `AddToCalendar` so a listing that has
 *   already resolved one clock for a whole grid classifies every card — and
 *   every card's calendar action — against that same instant, which is what
 *   stops two surfaces disagreeing across a midnight boundary. Omit it in
 *   ordinary use; `lifecycleOf` then reads the current time itself. Destructured
 *   rather than forwarded, so it can never land on the `<article>` as an invalid
 *   DOM attribute.
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

export default function EventCard({ event, to, now, className, ...props }) {
  // Guard: nothing to render without an event record. Safe as an early return
  // because this component is deliberately HOOK-FREE and presentational, which
  // is also what makes it safe to mount inside grids and carousels. A hook
  // introduced later would have to be declared ABOVE this line
  // (`react/rules-of-hooks` is an error, not a warning).
  if (!event) return null

  const { slug, title, date, time, type, description, location, image } = event

  // THE LIFECYCLE GATE. The state is derived from the record's own date — never
  // assumed — and everything that renders from it (label, icon, badge variant,
  // which actions are permitted, and the replacement action when both are
  // withheld) is read from ONE `EVENT_LIFECYCLE` entry. `eventLifecycleState`
  // is preferred over indexing `EVENT_LIFECYCLE` directly, as that module
  // documents: it resolves own properties only and degrades an unrecognised
  // state to `undated`, the honest neutral. Because `src/pages/EventDetail.jsx`
  // reads the same entry, this card and that page cannot disagree.
  const lifecycleState = eventLifecycleState(lifecycleOf(event, now))
  const { label: lifecycleLabel, icon: LifecycleIcon, nextAction } = lifecycleState

  // Combine the full date and display time into one meta string, dropping any
  // empty part so an invalid date never yields a stray leading separator.
  //
  // A same-day event leads with its own state label so the schedule row reads
  // as TODAY rather than as a bare calendar date. The phrase is read back from
  // the lifecycle entry rather than authored here — there is no second date
  // formatter and no hand-written "Today" string, so this row can never drift
  // from the badge above it or from the detail page. The `today` state is
  // identified by comparing the resolved entry with its frozen singleton in
  // `EVENT_LIFECYCLE`, which keeps a bare state literal out of this call site.
  const schedule = [
    lifecycleState === EVENT_LIFECYCLE.today ? lifecycleLabel : null,
    formatFullDate(date),
    time,
  ]
    .filter(Boolean)
    .join(' · ')

  // Event-aware Register target (M22): carry the event identity to the Contact
  // page via an allowlisted `?event=<slug>` query so the registration is
  // pre-scoped to THIS event (the Contact page validates the slug and pre-fills
  // the subject). An explicit `to` prop still overrides. Falls back to plain
  // `/contact` only when the event has no slug.
  const registerTo = to || (slug ? `/contact?event=${encodeURIComponent(slug)}` : '/contact')

  // This event's own detail route. Encoded for the same reason the query value
  // is: a slug carrying a '/' would otherwise invent a nested path. `null` when
  // the record has no slug, so the link is omitted rather than pointing at
  // `/events/undefined`.
  const detailTo = slug ? `/events/${encodeURIComponent(slug)}` : null

  // Overlaid date-badge parts. Both come from the shared civil-date formatter,
  // which returns '' for a missing or unparseable date, so these are empty
  // exactly when the lifecycle is `undated`.
  const badgeDay = getDay(date)
  const badgeMonth = getMonth(date)

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

        {/* Date badge — day stacked over short month, machine-readable via <time>.
            Rendered only when there is a date to show: an undated record would
            otherwise get an empty white box, and the lifecycle badge below
            already states "Date to be announced" in words. */}
        {badgeDay && badgeMonth ? (
          <div className="absolute left-4 top-4 flex flex-col items-center rounded-xl bg-white px-3 py-2 shadow-sm">
            <time dateTime={date} className="flex flex-col items-center">
              <span className="text-xl font-bold leading-none text-primary-600">
                {badgeDay}
              </span>
              <span className="text-xs font-medium uppercase text-muted">
                {badgeMonth}
              </span>
            </time>
          </div>
        ) : null}
      </div>

      {/* Body — type and lifecycle badges, title, description, meta rows, and
          the lifecycle-gated action area. */}
      <div className="flex flex-1 flex-col gap-3 p-6">
        {/* Badge row — the event type beside its lifecycle state. It WRAPS
            rather than compressing, which is what keeps the pair off the
            heading at 320px: the row reflows onto a second line and the title
            below is untouched. */}
        <div className="flex flex-wrap items-center gap-2">
          {type ? <Badge variant="accent">{type}</Badge> : null}

          {/* Lifecycle indicator. Variant, label and icon all come from the one
              entry resolved above — nothing here is authored locally, and a
              Badge reads `badgeVariant` only (its vocabulary includes the
              badge-only `neutral` that `past` uses). The icon is decorative;
              the label carries the meaning, so colour is never the sole
              signal. */}
          <Badge variant={lifecycleState.badgeVariant}>
            <LifecycleIcon aria-hidden="true" />
            {lifecycleLabel}
          </Badge>
        </div>

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

        {/* Action area — pinned to the bottom (`mt-auto`) so cards of differing
            content height align their actions. WHICH actions appear is decided
            entirely by the lifecycle entry's flags; there is no date arithmetic
            and no state literal in this block, which is precisely what stops a
            finished event from issuing a live invitation to register. */}
        <div className="mt-auto flex flex-col gap-3">
          {/* Wraps at 320px instead of overflowing the card. */}
          <div className="flex flex-wrap gap-3">
            {/* Register CTA → event-aware Contact link (registerTo). Uses the
                shared Button `size="sm"`, whose compact step is ≥44px tall/wide
                (min-h-11 min-w-11), satisfying the touch-target guideline
                (M12). Withheld for a past event. */}
            {lifecycleState.canRegister ? (
              <Button
                to={registerTo}
                variant="primary"
                size="sm"
                aria-label={title ? `Register for ${title}` : 'Register for this event'}
              >
                Register
              </Button>
            ) : null}

            {/* The replacement action, present only on the state that withholds
                both others, so the card is never left with nothing to offer.
                Its label, route and variant are all the entry's, so this card
                and the detail page offer the identical next step. No per-event
                aria-label: every past card points at the same listing, and the
                entry declares this label to be both the visible text and the
                accessible name. */}
            {nextAction ? (
              <Button to={nextAction.to} variant={nextAction.buttonVariant} size="sm">
                {nextAction.label}
              </Button>
            ) : null}

            {/* This event's own detail route — the card reaching its own
                subject. Tertiary `outline` so it stays beside the conversion
                action rather than competing with it. */}
            {detailTo ? (
              <Button
                to={detailTo}
                variant="outline"
                size="sm"
                aria-label={title ? `View details for ${title}` : 'View details for this event'}
              >
                View details
              </Button>
            ) : null}
          </div>

          {/* Calendar export. Gated on the same `canAddToCalendar` flag the
              component itself reads, so the two cannot diverge — this states
              the card's action set in one readable place while leaving the
              mechanism, and all of its copy, to `AddToCalendar`. `now` is
              forwarded so the card and its calendar action classify this event
              against one instant. */}
          {lifecycleState.canAddToCalendar ? <AddToCalendar event={event} now={now} /> : null}
        </div>
      </div>
    </Card>
  )
}
