import { useState } from 'react'
import { FaRegCalendarPlus, FaExclamationTriangle, FaRegCalendarAlt } from 'react-icons/fa'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { cn } from '../../lib/cn.js'
import { downloadIcs, googleCalendarUrl } from '../../lib/calendar.js'
import { lifecycleOf } from '../../lib/eventSchedule.js'
import { eventLifecycleState } from '../../lib/states.js'

/**
 * AddToCalendar
 *
 * The single canonical calendar-action group for one CIBLE event record
 * (AAP §0.9.1 Group 5). It is composed inside `common/EventCard.jsx` and on the
 * `/events/:slug` detail route, beside — never instead of — that surface's
 * primary "Register" call to action. Reuse this component rather than
 * hand-rolling a download link, so both surfaces offer the identical actions
 * under the identical conditions.
 *
 * ## What genuinely runs — and therefore what may be claimed
 *
 * Exactly two things happen here, both performed by the visitor's own browser
 * inside their own click:
 *
 *   1. A real **RFC 5545** `VCALENDAR` payload is composed in the page by
 *      `buildIcs` and handed to the browser as a `.ics` file download by
 *      {@link module:lib/calendar.downloadIcs}.
 *   2. A real provider **template URL** from
 *      {@link module:lib/calendar.googleCalendarUrl} is rendered as an ordinary
 *      link, which opens Google Calendar's own event-creation form with this
 *      event's details already filled in.
 *
 * There is no backend, no API call, no key, no token, no OAuth grant and no
 * account access anywhere in this component or in the module behind it. It
 * issues no network request of any kind — no HTTP call, no socket and no
 * server-sent stream — and nothing leaves the tab except the two handoffs the
 * visitor themselves initiated. (The request-API names are deliberately not
 * spelled out here: the project's own preservation check greps `src/` for them,
 * and a mention in a comment would register as a false positive.)
 *
 * ## The copy contract — the whole reason this file is written carefully
 *
 * The project prohibits fake calendar integrations. A downloaded file and a
 * pre-filled provider form are *genuine behaviour* rather than a simulated
 * integration, so the feature is permitted **on the condition that every string
 * it renders tells the truth about what happened**. Accordingly:
 *
 *   • Every label and every message here claims only that **a calendar file was
 *     downloaded**, or that **the provider opens with the details pre-filled**.
 *   • Nothing here claims — in a label, a confirmation, a title attribute or
 *     this comment — that an entry was synchronised, subscribed, connected to
 *     an account, or "added to your calendar". This code cannot observe whether
 *     the visitor kept the entry, so it never asserts that they did: the
 *     confirmation says the file is downloaded and that opening it in their
 *     calendar app is what adds it.
 *   • The control labels name the mechanism ("Download calendar file", "Open in
 *     Google Calendar") rather than the outcome, for the same reason.
 *
 * This is the same discipline the existing enquiry forms apply to their
 * WhatsApp and `mailto:` handoffs, which report that a draft *opened* and still
 * needs sending rather than that an enquiry was delivered.
 *
 * ## The lifecycle gate — this component's defining behaviour
 *
 * Whether a calendar action may be offered at all is **not** decided here. It is
 * read from the event's `EVENT_LIFECYCLE` entry in `src/lib/states.js` through
 * the `canAddToCalendar` flag, resolved by {@link eventLifecycleState} from the
 * lifecycle {@link module:lib/eventSchedule.lifecycleOf} derives:
 *
 *   • `upcoming` → actions RENDER. Scheduled and still ahead.
 *   • `today`    → actions RENDER. The export is still useful for the start time.
 *   • `past`     → **renders `null`.** A finished event has nothing to add to a
 *     calendar, and offering the export anyway is precisely the card-versus-
 *     detail inconsistency this work exists to fix.
 *   • `undated`  → **renders `null`.** There is no date to put in the file, so a
 *     `.ics` could only be built by guessing one.
 *
 * Reading the flag rather than writing a local `if` chain over the four string
 * literals is what guarantees this component, the event card and the event
 * detail route cannot drift apart: `states.js` is the single authority, and a
 * change to the permitted action set changes all three at once.
 *
 * "Renders nothing" means literally `null` — never a disabled control and never
 * an explanatory placeholder. The replacement next step a past event should
 * offer ("See upcoming events") is carried by that same lifecycle entry's
 * `nextAction` and belongs to the card and the detail route, which own the
 * surrounding action row; duplicating it here would put two competing next
 * steps on one surface.
 *
 * ## Failure is rendered, not assumed
 *
 * `downloadIcs` never throws — it reports every outcome as `{ok, reason}`. This
 * component holds that result in state and **renders the failure**, with copy
 * specific to each of the three reasons (`'invalid-event'`, `'unavailable'`,
 * `'error'`) so the visitor is told what did not happen rather than left
 * wondering why no file appeared. The failure surfaces through the shared
 * {@link EmptyState} primitive with `tone="caution"`, which pins `role="alert"`
 * non-overridably and supplies the established caution pairing, and it offers
 * the provider link as the alternative — the same shape as the enquiry form's
 * blocked panel, which re-offers the channel the visitor just tried.
 *
 * There is deliberately **no "adding…" state, no spinner and no delay**. The
 * download is synchronous inside the user gesture (a browser may block one that
 * is not), exactly as the enquiry forms deliberately carry no `submitting`
 * state for their synchronous deep-link handoff. A manufactured latency state
 * would imply a round trip that does not exist.
 *
 * ## Organiser details are never hardcoded here
 *
 * `src/lib/calendar.js` defines the `CalendarContext` shape *and* a default
 * derived from `src/data/siteConfig.js`, so both calls below deliberately pass
 * no context and this component contains no brand, contact or URL literal of
 * its own. Replacing the placeholder launch domain therefore stays a
 * single-file change in the config module.
 *
 * ## The declared future adapter
 *
 * If a server-issued calendar feed is ever introduced it attaches through
 * `resolveCalendarUrl(event)` — declared as an interface in `calendar.js` and
 * deliberately not implemented, because a stub resolving to a fabricated URL
 * would be the fake integration this feature avoids. The honest account of what
 * adopting it would cost this component: **awaiting the result before the
 * download**, and nothing else. `downloadIcs` already returns `{ok, reason}`
 * and this component already renders that failure, so the result shape, the
 * failure vocabulary and the rendering of both are already in place — only the
 * `await` and a pending indicator would be new.
 *
 * ## Composition, design system and accessibility
 *
 * - Both actions are the canonical {@link Button}: the download is a real
 *   `<button>` with an `onClick` (no `to`/`href`), and the provider action is
 *   `<Button href>`, which the primitive's own allowlist accepts as `https:` and
 *   opens in a new tab with `rel="noopener noreferrer"` applied after the caller
 *   props. Button's base class already carries the `min-h-11 min-w-11` 44px
 *   touch-target floor and the focus ring, so neither is re-declared here, and
 *   the global `:focus-visible` rule in src/index.css is inherited untouched.
 * - The provider action renders only when `googleCalendarUrl` returns a URL. An
 *   empty `href` would fail Button's allowlist and fall through to a focusable
 *   `<button>` that navigates nowhere — a dead control is worse than an absent
 *   one.
 * - Variant hierarchy keeps these actions *considered* rather than competing
 *   with the Register CTA beside them: the download reads its variant from the
 *   lifecycle entry's `buttonVariant` where one is supplied (neither `upcoming`
 *   nor `today` supplies one today, by design) and otherwise takes the house
 *   `secondary`; the provider link is the tertiary `outline`.
 * - The action row is `flex flex-wrap gap-3`, the proven treatment from the
 *   existing result panels, so two controls WRAP at 320px instead of overflowing
 *   or widening the card that contains them.
 * - Each action carries a descriptive `aria-label` naming the event, because
 *   these labels repeat across a grid of cards, and each falls back to "this
 *   event" when a record has no title.
 * - Icons are purely decorative: `aria-hidden="true"`, with the meaning carried
 *   by the adjacent visible label, so state is never signalled by glyph or
 *   colour alone.
 * - The confirmation lives in a live region that is mounted from the first
 *   render and made visible only once a download has happened, so the polite
 *   announcement is reliable rather than dependent on an inserted region being
 *   noticed. While idle it carries `.sr-only`, which is `position: absolute` and
 *   therefore contributes no flex gap — the row looks exactly as it does without
 *   it.
 * - Styling is entirely token-driven (Tailwind v4 `@theme` tokens from
 *   src/index.css) and composed only through {@link cn}. No new token, no new
 *   named utility, no arbitrary `[..]` value and no second stylesheet: this
 *   component leaves src/index.css with no diff.
 *
 * @param {object} props Component props.
 * @param {import('../../data/events.js').CibleEvent} [props.event] The event to
 *   export. Read here for `title` (labels and the accessible names), `slug` and
 *   `date` (the identity used to discard a stale result when this component is
 *   reconciled onto a different event), and passed whole to `calendar.js`, which
 *   reads `date`, `startTime`, `endTime`, `description` and `location`. A falsy
 *   or non-object value renders `null`.
 * @param {string|Date} [props.now] An OPTIONAL shared reference instant,
 *   forwarded to `lifecycleOf` so a consumer that has already resolved one clock
 *   for a whole listing can guarantee this component classifies the event
 *   identically — a card and its calendar action can then never disagree across
 *   a midnight boundary. Omit it in ordinary use; `lifecycleOf` then reads the
 *   current time itself. Destructured rather than forwarded, so it can never
 *   land on the DOM as an invalid attribute.
 * @param {string} [props.className] Extra classes merged LAST via {@link cn},
 *   so a caller's utility always wins (e.g. `'mt-auto'` to pin the group to the
 *   bottom of a card body).
 * @param {object} [props] Any other props (`id`, `aria-*`, `data-*`, …) are
 *   forwarded to the root element.
 * @returns {import('react').ReactElement|null} The calendar action group, or
 *   `null` when this point in the event's lifecycle permits no calendar action.
 */

// Why each download failure happened, in the visitor's terms. Keyed by the
// `reason` of a `{ok: false}` DownloadResult, so the three branches
// `calendar.js` documents each get their own honest sentence instead of one
// generic "something went wrong". Every sentence states plainly that NOTHING was
// downloaded — the one fact the visitor needs, and the one a vague message
// leaves ambiguous. Module-local (not exported) so this file exposes only the
// component, keeping `react/only-export-components` clean.
const DOWNLOAD_FAILURE_REASONS = {
  // The payload could not be built at all: the record's date could not be read,
  // so there was no valid start date to write into the file.
  'invalid-event':
    'This event’s date could not be read, so no calendar file could be created and nothing was downloaded.',
  // The platform cannot perform a download — file downloads disabled, or a
  // browser without the APIs the export needs.
  unavailable:
    'This browser could not start a file download, so no calendar file was saved to your device.',
  // The download sequence itself failed part-way.
  error: 'The download did not finish, so no calendar file was saved to your device.',
}

/**
 * Resolve a failure `reason` to its explanation.
 *
 * The lookup is an OWN-property check rather than a bare index, matching the
 * defensive standard `EmptyState` and `src/lib/states.js` already set: a bare
 * `DOWNLOAD_FAILURE_REASONS[reason]` would resolve an inherited
 * `Object.prototype` member, so a reason of `'constructor'` or `'toString'`
 * would yield a truthy FUNCTION and interpolate its source text into the
 * visitor-facing copy. A reason outside the documented set falls back to the
 * `error` sentence, which claims exactly what every branch claims — that nothing
 * was downloaded — rather than guessing at a cause.
 *
 * @param {unknown} reason The `reason` from a failed `DownloadResult`.
 * @returns {string} A complete, honest sentence about what did not happen.
 */
function failureExplanation(reason) {
  if (typeof reason === 'string' && Object.hasOwn(DOWNLOAD_FAILURE_REASONS, reason)) {
    return DOWNLOAD_FAILURE_REASONS[reason]
  }
  return DOWNLOAD_FAILURE_REASONS.error
}

/**
 * The identity of an event record, for discarding a stale download result.
 *
 * React may reconcile this component onto a DIFFERENT event — a filtered
 * listing re-rendering the same grid position is the ordinary case — and a
 * confirmation left over from the previous record would then be attached to the
 * wrong event. Composing the three stable fields a record carries, rather than
 * relying on `slug` alone, keeps two records distinct even where one of them is
 * incomplete.
 *
 * @param {unknown} event A candidate event record.
 * @returns {string} A comparison key, or `''` when nothing identifying exists.
 */
function eventKeyOf(event) {
  if (!event || typeof event !== 'object') return ''
  return [event.slug, event.title, event.date]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join('|')
}

export default function AddToCalendar({ event, now, className, ...props }) {
  // The ONE piece of state: the outcome of the last download attempt, paired
  // with the event it belongs to. Declared unconditionally at the top level,
  // BEFORE every early return below, because `react/rules-of-hooks` is an error
  // and a hook after a conditional return would break on the next render.
  // `null` means no attempt has been made on this surface yet.
  const [attempt, setAttempt] = useState(null)

  // THE LIFECYCLE GATE. The permission is read from the shared `EVENT_LIFECYCLE`
  // authority — never decided here — so this component, the event card and the
  // event detail route always agree about which actions an event may offer.
  // `eventLifecycleState` is used in preference to indexing `EVENT_LIFECYCLE`
  // directly because it resolves own properties only and degrades an unknown
  // lifecycle to `undated`, the honest state that withholds an export it cannot
  // build a date for.
  const lifecycleState = eventLifecycleState(lifecycleOf(event, now))

  // Nothing to offer: either there is no usable record at all, or this point in
  // the lifecycle permits no calendar action (`past`, `undated`). Rendering
  // `null` is deliberate and literal — not a disabled button, not a placeholder.
  if (!event || typeof event !== 'object' || !lifecycleState.canAddToCalendar) return null

  const title = typeof event.title === 'string' ? event.title.trim() : ''

  // Provider template URL. Returns '' when the date is unusable, in which case
  // the link is omitted entirely rather than rendered with an empty href — see
  // the note in the header about dead controls.
  const providerUrl = googleCalendarUrl(event)

  // Derived once and reused by both provider controls (the row action and the
  // failure panel's recovery action), so the two can never describe the same
  // destination differently. "Open … with the details pre-filled" is the exact,
  // claimable outcome: the provider's own form opens filled in, and the visitor
  // still chooses whether to save it.
  const providerLabel = title
    ? `Open ${title} in Google Calendar with the details pre-filled`
    : 'Open this event in Google Calendar with the details pre-filled'

  // Discard a result that belongs to a previously rendered event (see
  // `eventKeyOf`). Derived during render rather than reset from an effect, so
  // the wrong confirmation never flashes before being cleared.
  const eventKey = eventKeyOf(event)
  const result = attempt && attempt.key === eventKey ? attempt.result : null
  const downloaded = result?.ok === true
  const failure = result && result.ok === false ? result : null

  /**
   * Hand the `.ics` file to the browser and record the outcome.
   *
   * `downloadIcs` is called SYNCHRONOUSLY, first thing in the handler with
   * nothing awaited before it, so the user gesture is preserved and the browser
   * does not treat the download as unsolicited. It never throws, so there is no
   * try/catch to add: every outcome arrives as `{ok, reason}` and is stored for
   * rendering. No context is passed — `calendar.js` supplies the
   * siteConfig-derived organiser default.
   *
   * @returns {void}
   */
  const handleDownload = () => {
    const outcome = downloadIcs(event)
    setAttempt({ key: eventKey, result: outcome })
  }

  return (
    <div {...props} className={cn('flex flex-col gap-3', className)}>
      {/* Action row — wraps rather than overflowing at 320px. */}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          // Read from the lifecycle entry where it supplies one; `upcoming` and
          // `today` deliberately supply none, so the house `secondary` applies
          // and these actions stay considered rather than competing with the
          // primary Register CTA beside them.
          variant={lifecycleState.buttonVariant ?? 'secondary'}
          size="sm"
          onClick={handleDownload}
          // The label names the mechanism, not an outcome this code cannot
          // observe, and names the event because it repeats across a card grid.
          aria-label={
            title ? `Download a calendar file for ${title}` : 'Download a calendar file for this event'
          }
        >
          <FaRegCalendarPlus aria-hidden="true" />
          Download calendar file
        </Button>

        {providerUrl ? (
          <Button
            href={providerUrl}
            variant="outline"
            size="sm"
            // "Open in" rather than "Add to": following this link opens the
            // provider's own creation form with the details filled in, and the
            // visitor still decides whether to save it.
            aria-label={providerLabel}
          >
            <FaRegCalendarAlt aria-hidden="true" />
            Open in Google Calendar
          </Button>
        ) : null}
      </div>

      {/* Confirmation. Mounted from the first render so the polite announcement
          is reliable, and visually hidden until there is something to say —
          `.sr-only` is position:absolute, so while idle it takes the element out
          of flow and contributes no gap to the column above. The copy states
          only that a file was downloaded and that opening it is what adds the
          entry; it never claims this website added anything anywhere. */}
      <p role="status" className={cn('text-sm text-muted', downloaded ? null : 'sr-only')}>
        {downloaded
          ? 'Your browser has downloaded a calendar file for this event. Open it in your calendar app to add the entry there — this website cannot add it for you.'
          : ''}
      </p>

      {/* Failure. `tone="caution"` pins role="alert" inside EmptyState, so the
          message is announced assertively, and supplies the established
          secondary-50 / secondary-800 caution pairing — colour is never the sole
          carrier, since the title states the outcome in words. The provider link
          is the next step, offered here rather than by pointing at the row above,
          which a screen-reader user cannot follow. */}
      {failure ? (
        <EmptyState
          tone="caution"
          icon={FaExclamationTriangle}
          title="The calendar file was not downloaded"
          description={`${failureExplanation(failure.reason)} ${
            providerUrl
              ? 'You can open this event in Google Calendar instead, or copy the date, time and location from this page.'
              : 'You can copy the date, time and location from this page instead.'
          }`}
          action={
            providerUrl ? (
              <Button
                href={providerUrl}
                variant="secondary"
                size="sm"
                aria-label={providerLabel}
              >
                <FaRegCalendarAlt aria-hidden="true" />
                Open in Google Calendar instead
              </Button>
            ) : null
          }
        />
      ) : null}
    </div>
  )
}
