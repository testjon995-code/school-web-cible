/**
 * Shared state presentation map for the CIBLE School of Language website.
 *
 * This module is the SINGLE authority that turns an application state into the
 * three things every surface needs to render it: one user-visible `label`, one
 * decorative `icon`, and the variant name appropriate to the primitive doing
 * the rendering. It exists to fix a specific defect class — the same underlying
 * state being described differently by a list card and by a detail view,
 * because each call site wrote its own label, picked its own colour, and (worse)
 * made its own decision about which actions to offer.
 *
 * The rule that makes it work: A CONSUMER READS THE KEY FOR ITS OWN PRIMITIVE
 * AND NEVER TRANSLATES BETWEEN VARIANT VOCABULARIES AT THE CALL SITE. The call
 * site is exactly where the inconsistency arises, so there is nothing to
 * translate there — a `Badge` reads `badgeVariant`, a `Button` reads
 * `buttonVariant`, an `EmptyState` reads `tone`, and all of them read the same
 * `label` and `icon`. A label cannot be written twice and a colour cannot be
 * chosen twice, so a card and its detail page cannot drift apart.
 *
 * Why there are three variant keys instead of one `variant`. The two canonical
 * primitives deliberately do NOT share a variant vocabulary, so a single field
 * would be illegal on one of them:
 *   • `Badge`  accepts `primary | secondary | accent | neutral` — light `-50`
 *     fill with dark `-700` text (src/components/ui/Badge.jsx). `neutral` is
 *     BADGE-ONLY.
 *   • `Button` accepts `primary | secondary | accent | outline` — solid
 *     AA-compliant fills plus one outline (src/components/ui/Button.jsx).
 *     `outline` is BUTTON-ONLY.
 * Every variant name written in this file is therefore one the target primitive
 * already accepts, which is what keeps the mapping from drifting away from the
 * design system. Both primitives silently fall back to `primary` on an unknown
 * value, so an invented name such as `'danger'` or `'warning'` would not throw —
 * it would quietly render the wrong colour and defeat the whole module. It also
 * means contrast safety holds BY CONSTRUCTION: because only the eight legal
 * names are ever emitted, no consumer can be steered into the known WCAG-AA
 * failure of white text on `secondary-600` (#ea580c, ~3.56:1); `Button`'s
 * `secondary` fill is already locked to `secondary-700` (#c2410c, ~5.18:1).
 *
 * Icons are render-only. Every `icon` is a `react-icons` COMPONENT FUNCTION
 * REFERENCE, which is NOT JSON-serialisable. An entry from this module must
 * never be handed to a structured-data builder in `src/lib/schema.js`, nor to
 * `JSON.stringify()`, nor placed on any object destined for a
 * `<script type="application/ld+json">` payload — the same contract that
 * already governs `courses[].icon` and `faculty[].socials[].icon`. Pass the
 * `label` (a plain string) if a machine-readable value is ever needed.
 *
 * Icons are also DECORATIVE. Consumers render them with `aria-hidden="true"`
 * and let the adjacent `label` carry the meaning, so that colour and glyph are
 * never the sole carrier of state for assistive technology or for a colour-blind
 * visitor. Every entry pairs a variant with a readable label for that reason.
 *
 * WHAT THIS MODULE DELIBERATELY DOES NOT COVER. This is a boundary, not an
 * omission: each of these states already has exactly one owner, and the correct
 * action is to REACH for that owner rather than re-implement it here. Extending
 * this file to cover them would create the second, competing status system the
 * project explicitly rules out.
 *   • Content loading → `ui/Spinner` is the sole representation. It renders
 *     from two places with DIFFERENT props by design: `App.jsx` uses the default
 *     `md` for the very first route resolution (before the shell exists), and
 *     `Layout.jsx` uses `size="lg"` inside a `min-h-screen` centring wrapper for
 *     in-shell route loads. That difference is contextual and intentional —
 *     leave it alone; do not "unify" it through this module.
 *   • Pending NAVIGATION → `layout/RouteProgress`, a genuinely distinct state
 *     from pending content. It is never merged with `Spinner`.
 *   • Render-time crash → `layout/ErrorBoundary` is the sole representation.
 *   • Empty, unavailable and failure views → `ui/EmptyState` owns them, which is
 *     precisely why `tone` appears here as a key on the few states that render
 *     into one, instead of as a fifth family.
 * Nor is there a family for course level, event type or FAQ category. Those are
 * CONTENT VALUES, not application states; they are rendered through `Badge`
 * directly from their own data module.
 *
 * Dependency direction: this module imports `react-icons` and nothing else.
 * `src/lib` never imports from `src/components`, `src/pages` or `src/hooks`, so
 * the variant names below are hardcoded STRINGS rather than values read back out
 * of `Badge.jsx` / `Button.jsx`. That decoupling is deliberate and is what lets
 * any layer consume this module without pulling in the component tree.
 *
 * Every family is a frozen plain object keyed by state id (matching the
 * `Object.freeze` precedent set by `MAX_LENGTHS` in `src/lib/validators.js`), so
 * no consumer can mutate shared presentation state at runtime. All values are
 * exported by name; there is no default export.
 *
 * @module lib/states
 */
import {
  FaRegCalendarCheck,
  FaRegClock,
  FaHistory,
  FaRegCalendar,
  FaRegBookmark,
  FaBookmark,
  FaRegSquare,
  FaCheckSquare,
  FaExclamationCircle,
  FaRegEdit,
  FaRegPaperPlane,
  FaExclamationTriangle,
  FaTimesCircle,
} from 'react-icons/fa'

/**
 * The presentation of one application state.
 *
 * `label` and `icon` are REQUIRED and are the single authority the consistency
 * fix depends on: one label and one icon per state, used by every surface that
 * renders it. The three variant keys are OPTIONAL and are populated only for the
 * primitives a given state family actually renders into — an unused key is left
 * off rather than filled in "for completeness", because a populated key invites
 * a consumer to render something the design never asked for.
 *
 * @typedef {object} StateEntry
 * @property {string} label The user-visible text for this state. On an
 *   interactive control this doubles as the accessible name, so it reads as the
 *   action or the state rather than as a bare adjective.
 * @property {import('react-icons').IconType} icon A `react-icons` component
 *   reference. Decorative: render it `aria-hidden="true"`. NOT serialisable —
 *   never pass it to a schema builder or `JSON.stringify()`.
 * @property {'primary'|'secondary'|'accent'|'neutral'} [badgeVariant] For
 *   `ui/Badge`. `neutral` is valid here and ONLY here.
 * @property {'primary'|'secondary'|'accent'|'outline'} [buttonVariant] For
 *   `ui/Button`. `outline` is valid here and ONLY here.
 * @property {'neutral'|'caution'} [tone] For `ui/EmptyState`. `caution` uses the
 *   established `secondary-50` / `secondary-700` pairing and adds
 *   `role="alert"`; `neutral` does not.
 */

/**
 * The replacement action offered in place of the actions a state withholds.
 *
 * Present only on `EVENT_LIFECYCLE.past`, where registering for a finished event
 * and exporting its date are both withheld, so the surface would otherwise offer
 * nothing at all. Declared here rather than at the call site so the card and the
 * detail page offer the identical next step.
 *
 * @typedef {object} NextAction
 * @property {string} label The action's visible text and accessible name.
 * @property {string} to An internal route for `Button`'s polymorphic `to` prop.
 * @property {'primary'|'secondary'|'accent'|'outline'} buttonVariant Variant for
 *   `ui/Button`.
 */

/**
 * The presentation AND the permitted action set for one point in an event's
 * lifecycle.
 *
 * The action flags are the substance of the consistency fix, not a convenience.
 * Before this module, the event card rendered its "Register" call to action
 * UNCONDITIONALLY with no date comparison anywhere in the component, so a
 * finished event still issued a live invitation to register — and three of the
 * five records in `src/data/events.js` are already in the past. A label-only fix
 * would have left that invitation in place. Consumers must therefore branch on
 * these flags rather than on their own date arithmetic or their own `if`, which
 * is what guarantees the event card, the event detail route and the
 * add-to-calendar control agree.
 *
 * @typedef {StateEntry & {canRegister: boolean, canAddToCalendar: boolean, nextAction: NextAction|null}} EventLifecycleEntry
 */

/**
 * Freeze a family and everything reachable inside it.
 *
 * `Object.freeze` is shallow, so freezing only the family would leave each entry
 * (and each `nextAction`) mutable. Module-local and not exported: callers need
 * the frozen families, not the freezing mechanism.
 *
 * @template {Record<string, StateEntry>} T
 * @param {T} family The family object to freeze in place.
 * @returns {Readonly<T>} The same object, deeply frozen.
 */
function freezeFamily(family) {
  for (const entry of Object.values(family)) {
    if (entry.nextAction) Object.freeze(entry.nextAction)
    Object.freeze(entry)
  }
  return Object.freeze(family)
}

/**
 * Resolve a state id against a family without ever returning a non-entry.
 *
 * A bare `family[id]` lookup is unsafe for two reasons: an unknown id yields
 * `undefined` and crashes the consumer on `.label`, and an id that collides with
 * an inherited `Object.prototype` member (`'constructor'`, `'toString'`) yields a
 * truthy FUNCTION that passes a naive guard and then crashes just as hard. Both
 * are reachable from a hand-edited URL parameter or a malformed record, so the
 * lookup is restricted to own properties and falls back deliberately.
 *
 * @template {Record<string, StateEntry>} T
 * @param {T} family The family to look in.
 * @param {unknown} id The candidate state id.
 * @param {T[keyof T]} fallback The entry to return when `id` is not an own key.
 * @returns {T[keyof T]} A real entry from `family`, never `undefined`.
 */
function resolveEntry(family, id, fallback) {
  if (typeof id === 'string' && Object.hasOwn(family, id)) return family[id]
  return fallback
}

/**
 * Event lifecycle — the four points an event record can occupy, matching the
 * return union of `lifecycleOf` in `src/lib/eventSchedule.js`.
 *
 * Every entry carries a `badgeVariant`, because both the event card and the
 * event detail route render a lifecycle `Badge`; the four states deliberately
 * use four different Badge variants so the distinction never rests on text
 * alone. `past` is the one state that needs `neutral` — a concluded event is
 * finished, not failed, and no other variant says that without implying an
 * error. `undated` uses `secondary` to read as "waiting on information", and its
 * label is the honest "Date to be announced" rather than an error.
 *
 * @type {Readonly<Record<'upcoming'|'today'|'past'|'undated', EventLifecycleEntry>>}
 */
export const EVENT_LIFECYCLE = freezeFamily({
  // Scheduled and still ahead: both conversion actions are available. The
  // register target itself stays with the consumer, which already composes the
  // event-aware `/contact?event=<slug>` link from the record's own slug; this
  // module decides only WHETHER that action renders.
  upcoming: {
    label: 'Upcoming',
    icon: FaRegCalendarCheck,
    badgeVariant: 'accent',
    canRegister: true,
    canAddToCalendar: true,
    nextAction: null,
  },
  // Happening today. Still fully actionable — a same-day registration enquiry is
  // legitimate, and the calendar export remains useful for the exact start time.
  today: {
    label: 'Happening today',
    icon: FaRegClock,
    badgeVariant: 'primary',
    canRegister: true,
    canAddToCalendar: true,
    nextAction: null,
  },
  // Finished. BOTH actions are withheld: inviting registration for a concluded
  // event is the defect itself, and exporting a past date to a calendar is
  // meaningless. Because withholding both would leave the surface with no action
  // at all, this is the one state that supplies a replacement.
  past: {
    label: 'Past event',
    icon: FaHistory,
    badgeVariant: 'neutral',
    canRegister: false,
    canAddToCalendar: false,
    nextAction: {
      label: 'See upcoming events',
      to: '/events?when=upcoming',
      buttonVariant: 'outline',
    },
  },
  // On the calendar of intent but without a usable date yet. Enquiring is
  // legitimate, so registration stays; the calendar export cannot, because there
  // is no date to put in the file.
  undated: {
    label: 'Date to be announced',
    icon: FaRegCalendar,
    badgeVariant: 'secondary',
    canRegister: true,
    canAddToCalendar: false,
    nextAction: null,
  },
})

/**
 * Saved-course state — whether the visitor has bookmarked a course on this
 * device.
 *
 * Both labels are written as the ACCESSIBLE NAME of a toggle, because that is
 * the only place this family renders: a 44px `aria-pressed` control on the
 * course card. Each states what activating the control will do, so a screen
 * reader user is never left with a bare adjective. Only `buttonVariant` is
 * populated — nothing renders a "saved" `Badge` — and the outline/filled icon
 * pair means the pressed state is never signalled by colour alone.
 *
 * @type {Readonly<Record<'unsaved'|'saved', StateEntry>>}
 */
export const SAVED_STATE = freezeFamily({
  unsaved: {
    label: 'Save this course',
    icon: FaRegBookmark,
    buttonVariant: 'outline',
  },
  saved: {
    label: 'Saved — remove from saved',
    icon: FaBookmark,
    buttonVariant: 'primary',
  },
})

/**
 * Course-comparison selection state, including the refusal raised when the
 * working set is already at its cap of three.
 *
 * `full` is a first-class state rather than a disabled control, because the cap
 * has to be ANNOUNCEABLE. A natively `disabled` button can be neither focused
 * nor activated, so a refusal attached to one could never be triggered or read —
 * feedback nobody can reach is not feedback. The fourth card's toggle therefore
 * stays focusable with `aria-disabled="true"`, and activating it changes no
 * state and instead announces this `label` in the page's polite live region.
 * The label names both the cap and the way out of it, and it is also suitable as
 * the toggle's accessible description so the limit is discoverable BEFORE the
 * attempt rather than only on refusal.
 *
 * `full` keeps the same `outline` variant as `unselected` deliberately: a
 * refusal is communicated in words, not by recolouring a control the visitor has
 * not successfully changed.
 *
 * No `tone` is populated here. The comparison route's own empty views — nothing
 * selected, or a shared link whose slugs are all unknown — are owned by that
 * page's `EmptyState` copy, not by a selection state.
 *
 * @type {Readonly<Record<'unselected'|'selected'|'full', StateEntry>>}
 */
export const COMPARE_STATE = freezeFamily({
  unselected: {
    label: 'Add to comparison',
    icon: FaRegSquare,
    buttonVariant: 'outline',
  },
  selected: {
    label: 'Selected for comparison — remove',
    icon: FaCheckSquare,
    buttonVariant: 'primary',
  },
  full: {
    label: 'You can compare up to 3 courses. Remove one to add another.',
    icon: FaExclamationCircle,
    buttonVariant: 'outline',
  },
})

/**
 * The presentation of one enquiry-dispatch state.
 *
 * Extends {@link StateEntry} with the second line the result panels already
 * render today. Both parts are carried here so the multi-step admission flow
 * consumes the existing wording instead of restating it — the whole point of
 * giving these four states one home is that the flow cannot fork the copy it
 * inherits.
 *
 * @typedef {StateEntry & {description: string}} DispatchEntry
 * @property {string} description The honest supporting sentence, matching the
 *   body copy of the panel that renders this state.
 */

/**
 * Enquiry-dispatch state — the outcome of handing an enquiry to the visitor's
 * own WhatsApp or email client.
 *
 * These four ids are a TRANSCRIPTION, not an invention: they already exist as a
 * documented enum in the admission form, which records them as "four honest
 * states" and records the absence of a fifth as deliberate. That absence is
 * preserved here. There is NO `submitting`, `sending`, `pending` or `success`
 * state, because there is no network round trip to be pending on and nothing
 * ever confirms that a message was delivered — the site has no backend. A
 * manufactured latency state would be a claim the implementation cannot honour.
 *
 * The labels are user-visible, so each is held to the same honesty standard as
 * the panel it describes:
 *   • `opened` reports that a DRAFT was opened in the visitor's own app and is
 *     still waiting for them to press Send. It does not claim the enquiry was
 *     delivered, and it is the wording the existing confirmation panel uses, so
 *     the multi-step flow's confirmation step reads exactly as it does today.
 *   • `blocked` states plainly that the browser prevented the tab from opening
 *     and that nothing has gone anywhere. It is a recoverable condition, not a
 *     failure of the enquiry, and it never implies success.
 *   • `error` reports the failure and points at the direct channels.
 * `blocked` and `error` carry `tone: 'caution'`, which is what makes their
 * panels render on the `secondary-50` / `secondary-700` pairing with
 * `role="alert"`. `idle` and `opened` carry no tone: `idle` is the form itself
 * and `opened` is a `role="status"` confirmation, so neither renders as a
 * caution state.
 *
 * `buttonVariant` names the variant of each state's PRIMARY recovery action, as
 * the existing panels render it: `accent` where a pre-filled draft can be
 * re-opened, and `secondary` for the direct-call fallback where there is no
 * draft to return to.
 *
 * @type {Readonly<Record<'idle'|'opened'|'blocked'|'error', DispatchEntry>>}
 */
export const DISPATCH_STATE = freezeFamily({
  idle: {
    label: 'No inquiry draft opened yet',
    description:
      'Your details stay on this page until you choose WhatsApp or email. Nothing is sent from this website.',
    icon: FaRegEdit,
  },
  opened: {
    label: 'Your inquiry is ready to send',
    description:
      'We have opened your messaging app with your details pre-filled. Please press Send there to complete your inquiry — it has not been sent automatically.',
    icon: FaRegPaperPlane,
    buttonVariant: 'accent',
  },
  blocked: {
    label: 'Your browser blocked the WhatsApp tab',
    description:
      'We could not open WhatsApp automatically, so your inquiry has NOT been sent yet. Open your pre-filled message and press send there, or contact us directly.',
    icon: FaExclamationTriangle,
    buttonVariant: 'accent',
    tone: 'caution',
  },
  error: {
    label: 'Something went wrong opening your messaging app',
    description: 'Please try again, or call or WhatsApp us directly.',
    icon: FaTimesCircle,
    buttonVariant: 'secondary',
    tone: 'caution',
  },
})

/**
 * Resolve an event lifecycle id to its presentation and permitted action set.
 *
 * Prefer this over indexing {@link EVENT_LIFECYCLE} directly: an unrecognised or
 * missing lifecycle degrades to `undated`, which is the honest neutral state —
 * it withholds the calendar export that cannot be built without a date while
 * still allowing an enquiry, and it never presents an unknown state as an error.
 *
 * @param {unknown} lifecycle A lifecycle id, normally from `lifecycleOf`.
 * @returns {EventLifecycleEntry} The matching entry, or the `undated` entry.
 */
export function eventLifecycleState(lifecycle) {
  return resolveEntry(EVENT_LIFECYCLE, lifecycle, EVENT_LIFECYCLE.undated)
}

/**
 * Resolve the saved-course toggle state from a boolean.
 *
 * @param {boolean} isSaved Whether this course is in the saved set.
 * @returns {StateEntry} The `saved` entry when saved, else `unsaved`.
 */
export function savedState(isSaved) {
  return isSaved ? SAVED_STATE.saved : SAVED_STATE.unsaved
}

/**
 * Resolve the comparison toggle state, applying the precedence every consumer
 * must share.
 *
 * SELECTION WINS OVER FULLNESS. A course already in the working set must stay
 * removable even once the set is at its cap — otherwise reaching the cap would
 * lock the visitor out of the only action that frees a slot, and the refusal
 * message would be advice they cannot follow. Encoding the precedence here is
 * what stops three call sites each getting it subtly wrong.
 *
 * @param {boolean} isSelected Whether this course is in the working set.
 * @param {boolean} [isFull] Whether the working set is at its cap of three.
 * @returns {StateEntry} `selected`, else `full` when the set is full, else
 *   `unselected`.
 */
export function compareState(isSelected, isFull = false) {
  if (isSelected) return COMPARE_STATE.selected
  if (isFull) return COMPARE_STATE.full
  return COMPARE_STATE.unselected
}

/**
 * Resolve an enquiry-dispatch status to its presentation.
 *
 * An unrecognised status degrades to `idle` — the state that claims nothing at
 * all — so a surface can never accidentally report a delivery it cannot
 * substantiate.
 *
 * @param {unknown} status One of `idle`, `opened`, `blocked` or `error`.
 * @returns {DispatchEntry} The matching entry, or the `idle` entry.
 */
export function dispatchState(status) {
  return resolveEntry(DISPATCH_STATE, status, DISPATCH_STATE.idle)
}
