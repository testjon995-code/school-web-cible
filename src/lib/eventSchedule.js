/**
 * Event lifecycle derivation and grouping for the CIBLE School of Language
 * website.
 *
 * This module answers two questions about an event record and nothing else:
 * *where in its own lifecycle is this event right now* ({@link lifecycleOf}),
 * and *how does a list of events divide into the groups a listing renders*
 * ({@link partitionEvents}). It owns the derivation; it deliberately owns
 * neither the labels nor the actions that follow from it — those belong to
 * `EVENT_LIFECYCLE` in `src/lib/states.js`, which every consumer reads so a
 * card and a detail page can never describe the same state differently.
 *
 * **It EXTENDS `src/lib/dates.js` rather than replacing it** (AAP §0.2.3). The
 * single import is {@link parseCivilDate}, and that is the only date mechanism
 * used anywhere below: no second regex, no manual string split, no
 * `Date.parse`, no timezone library and no second normaliser. `dates.js` is the
 * repository's one owner of date semantics and is not modified by this work.
 * The pointer is published by the data module itself — the `CibleEvent.date`
 * typedef in `src/data/events.js` instructs callers to parse it "with
 * `module:lib/dates.parseCivilDate` to avoid the UTC day-shift" — so honouring
 * it is a contract, not a preference.
 *
 * **Why that parser and not `new Date(iso)`.** A bare `'YYYY-MM-DD'` string
 * handed to the native constructor is parsed as *UTC midnight*, so in any zone
 * west of UTC the calendar day shifts one day earlier — the off-by-one defect
 * confirmed in review for `EventCard` and `BlogCard`. `parseCivilDate` builds
 * the date from explicit year/month/day components, which the language spec
 * defines to use **local** time, so the intended calendar day never drifts. A
 * misclassified lifecycle is that same defect wearing different clothes: it
 * would hide an event from a visitor in one timezone and offer registration for
 * a finished one in another.
 *
 * **The defect this fixes — the lifecycle half of BUG 1** (AAP §0.11.1). Before
 * this module existed, `src/pages/Events.jsx` rendered `events.map(...)` with no
 * date comparison anywhere, beneath a visually hidden heading reading "Upcoming
 * events", and `EventCard` rendered its Register call to action
 * unconditionally — so a concluded event was presented as upcoming *and* still
 * invited registration. Correcting the heading alone would have left the second
 * half, which is why the lifecycle derived here is what gates the actions.
 *
 * The observable proof, stated so a reader does not mistake it for a bug: at
 * the time of writing (2026-09-16) three of the five authored records —
 * `2026-08-16`, `2026-08-30` and `2026-09-13` — are already past and two,
 * `2026-09-27` and `2026-10-18`, are still ahead. Before this module all five
 * appeared under the upcoming heading; after it, three group under Past with
 * neither a Register nor an Add-to-Calendar action, because
 * `EVENT_LIFECYCLE.past` withholds both and supplies "See upcoming events" in
 * their place.
 *
 * **Lifecycle is a DAY-level question, never an hour-level one.** The records
 * carry date-only values, so both sides of every comparison are normalised to
 * the start of their local day: an event scheduled for today reads `'today'`
 * for the whole of that day instead of flipping to `'past'` one second after
 * midnight. `event.startTime` and `event.endTime` are **not** consulted here
 * and must not be — they exist so the calendar export and the `Event`
 * structured-data `startDate` agree with the time the page displays, and
 * narrowing this comparison to the hour would make a morning workshop read as
 * finished while its attendees were still in the room.
 *
 * **The injected clock is architecture, not test scaffolding.** Both functions
 * accept `now`, defaulting to the real current instant. {@link partitionEvents}
 * resolves it exactly once and classifies every record against that single
 * instant, so a long list can never be split across a midnight boundary and
 * place one record in two groups at once. It also makes every branch here
 * deterministic and directly exercisable.
 *
 * **Nothing here mutates its arguments.** `src/data/events.js` exports one
 * module-level array that the event card, the events page, the dashboard and
 * the search index all read; sorting it in place would be a cross-module
 * corruption rather than a local bug. Every group returned is a new array
 * holding the caller's own record objects by reference.
 *
 * Every function is pure and side-effect free given `now`: no React, JSX or
 * hooks, no DOM access, no storage, no network. All values are exported by
 * name; there is no default export.
 *
 * @module lib/eventSchedule
 */

import { parseCivilDate } from './dates.js'

/**
 * A single CIBLE event record, as authored in `src/data/events.js`.
 *
 * Referenced as a type only — this is a JSDoc import inside a comment and adds
 * no runtime dependency, which is what keeps these helpers usable against any
 * list rather than welded to one dataset.
 *
 * @typedef {import('../data/events.js').CibleEvent} CibleEvent
 */

/**
 * The four points an event record can occupy.
 *
 * **These four strings are the exact key set of `EVENT_LIFECYCLE` in
 * `src/lib/states.js`, and the two must stay in lock step.** That module maps
 * each id to the label, icon, badge variant and — critically — the action
 * permissions (`canRegister`, `canAddToCalendar`, `nextAction`) that every card
 * and detail view renders. There is no type compiler in this project, so
 * renaming or adding an id here without the matching change there fails
 * *silently*: `eventLifecycleState` would fall back to the `undated` entry and
 * a genuine upcoming event would advertise itself as awaiting a date. Treat the
 * union as a published contract.
 *
 * @typedef {'upcoming'|'today'|'past'|'undated'} EventLifecycle
 */

/**
 * A list of events divided into the three groups a listing surface renders.
 *
 * All three keys are always present and always arrays, so a consumer never
 * guards against `undefined` before mapping or measuring length. Each group has
 * its own distinct empty state (AAP §0.11.3), including the "no events are
 * awaiting a date" case, which is why an empty group is a first-class result
 * rather than an omission.
 *
 * @typedef {Object} EventPartition
 * @property {CibleEvent[]} upcoming Events still ahead, **including those happening today**,
 *                                   ordered soonest first.
 * @property {CibleEvent[]} past     Concluded events, ordered most recent first.
 * @property {CibleEvent[]} undated  Events whose `date` is missing or unparseable, in source order.
 */

/**
 * Normalise a value to the start of its local calendar day.
 *
 * The input is resolved through {@link parseCivilDate} — the module's only date
 * mechanism — and the result is then rebuilt from its own year/month/day
 * components. That second step uses exactly the same local-time constructor
 * `parseCivilDate` uses internally, so it introduces no new date semantics; it
 * simply discards any time-of-day so two values can be compared as calendar
 * days. Rebuilding rather than mutating matters for a second reason:
 * `parseCivilDate` returns a `Date` argument *as-is*, so calling
 * `setHours(0, 0, 0, 0)` on the result would silently reset the caller's own
 * `now` object.
 *
 * @param {string|Date|null|undefined} value - A date-only string, ISO date-time, or `Date`.
 * @returns {Date|null} Local midnight of the value's calendar day, or `null` when unparseable.
 */
function startOfCivilDay(value) {
  const parsed = parseCivilDate(value)
  if (!parsed) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

/**
 * Resolve the reference day every comparison is made against.
 *
 * Never returns `null`. An omitted `now` uses the real current instant, and so
 * does an *unusable* one — a non-date, an `Invalid Date`, or a string that
 * cannot be parsed. Falling back to the real clock is the honest answer to "is
 * this event past?" when the supplied clock is unreadable; returning `'undated'`
 * instead would blame the record for the caller's bad argument, and throwing
 * would take down a listing over a cosmetic input.
 *
 * @param {string|Date|null|undefined} now - The instant to treat as "now".
 * @returns {Date} Local midnight of the reference calendar day.
 */
function resolveReferenceDay(now) {
  const supplied = startOfCivilDay(now)
  if (supplied) return supplied
  const fallback = new Date()
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate())
}

/**
 * Read an event record's scheduled calendar day, defensively.
 *
 * Returns `null` — which every caller reads as `'undated'` — for a falsy event,
 * a non-object event, a missing `date`, and a `date` that
 * {@link parseCivilDate} rejects, including the rollover case `'2026-13-40'`.
 * `date` is typed as a string but a `Date` is tolerated, because
 * `parseCivilDate` accepts one and rejecting it would be gratuitous.
 *
 * @param {CibleEvent|unknown} event - A candidate event record.
 * @returns {Date|null} Local midnight of the event's day, or `null` when it has no usable date.
 */
function eventCivilDay(event) {
  if (!event || typeof event !== 'object') return null
  return startOfCivilDay(/** @type {{date?: unknown}} */ (event).date)
}

/**
 * Derive an event's lifecycle from its date.
 *
 * The comparison is day-level: the event's civil day and the reference day are
 * both normalised to local midnight, so an event scheduled for today reads
 * `'today'` from 00:00 to 23:59 of that day rather than for an instant.
 * `startTime` and `endTime` are deliberately ignored — see the module header.
 *
 * The four branches:
 *
 * - `'undated'` — the record has no usable date. **A real branch, not an error
 *   path**: a record whose date will not parse must still render, so this never
 *   throws, never returns `null`, and never falls through to `'past'`. Event
 *   dates are client-confirmation-pending content (`src/data/events.js` records
 *   that the institute must confirm the exact dates and times before launch), so
 *   a record can legitimately lose or change its date. No authored record is
 *   undated today; the branch exists because one can be tomorrow.
 * - `'today'` — the event's civil day is the reference day.
 * - `'upcoming'` — the event's civil day is after the reference day.
 * - `'past'` — the event's civil day is before the reference day.
 *
 * @param {CibleEvent|unknown} event - The event record to classify.
 * @param {string|Date} [now=new Date()] - The instant to classify against; injected so a whole
 *                                         list can be classified against one instant, and so every
 *                                         branch is deterministic. An unusable value is treated as
 *                                         omitted.
 * @returns {EventLifecycle} One of the four ids that key `EVENT_LIFECYCLE` in `src/lib/states.js`.
 *
 * @example
 * lifecycleOf({ date: '2026-09-13' }, '2026-09-13') // → 'today'
 * lifecycleOf({ date: '2026-10-18' }, '2026-09-16') // → 'upcoming'
 * lifecycleOf({ date: '2026-08-16' }, '2026-09-16') // → 'past'
 * lifecycleOf({ date: '2026-13-40' })               // → 'undated'
 */
export function lifecycleOf(event, now = new Date()) {
  const day = eventCivilDay(event)
  if (!day) return 'undated'

  const reference = resolveReferenceDay(now)
  const eventTime = day.getTime()
  const referenceTime = reference.getTime()

  if (eventTime === referenceTime) return 'today'
  return eventTime > referenceTime ? 'upcoming' : 'past'
}

/**
 * Divide a list of events into the three groups a listing surface renders.
 *
 * **Four lifecycle states map onto three groups, and that asymmetry is the one
 * place in this module the two functions do not correspond one-to-one: a
 * `'today'` record belongs in `upcoming`.** An event happening today has not
 * happened yet, and `EVENT_LIFECYCLE` gives `today` and `upcoming` the same
 * action set — both permit registration and a calendar export — so grouping
 * today's event with the past would withhold two actions that are still
 * legitimate and bury the single most urgent record in the list. The record
 * keeps its own distinct `'today'` badge, because the group it sits in and the
 * state it displays are different questions; {@link lifecycleOf} answers the
 * second.
 *
 * **Classification is delegated to {@link lifecycleOf}, never reimplemented
 * here.** A second comparison written inline is precisely how a card's badge
 * and the heading above it come to disagree, which is the defect this module
 * exists to close. The clock is resolved once, before the loop, and the same
 * reference instant classifies every record — so a list can never be split
 * across a midnight boundary with one record answering to yesterday and the
 * next to today.
 *
 * **Ordering within each group**, each chosen for what the reader needs first:
 *
 * - `upcoming` — ascending, soonest first, because the next event is the one a
 *   visitor can still act on. `src/data/events.js` is authored chronologically,
 *   so this group looks untouched today; that is expected rather than a no-op —
 *   the guarantee holds for a client-supplied file in any order.
 * - `past` — descending, most recent first, for the same reason in reverse: the
 *   event that just concluded is the one still worth reading about.
 * - `undated` — source order, since there is no date to order by, and the
 *   authored sequence is the only meaningful one available.
 *
 * Records sharing a date are tie-broken on their source position, so the result
 * is reproducible rather than dependent on the engine's sort.
 *
 * **Defensive by contract.** A non-array argument coerces to an empty list
 * rather than throwing, mirroring the posture `src/components/common/FAQ.jsx`
 * already takes with its `items` prop, and a malformed entry lands in `undated`
 * instead of crashing the partition — so one bad record never costs the
 * visitor the other four. All three keys are always returned as arrays, even
 * when empty, because every group has its own empty state.
 *
 * **The caller's array is never mutated or reordered.** `src/data/events.js`
 * exports one module-level array shared by the card, the page, the dashboard
 * and the search index; sorting it in place would corrupt every other reader.
 * Each group is a fresh array holding the caller's own record objects by
 * reference, so identity comparisons against the source still hold.
 *
 * @param {CibleEvent[]|unknown} events - The records to divide. A non-array is treated as empty.
 * @param {string|Date} [now=new Date()] - The instant to classify against, resolved once and
 *                                         applied to every record. An unusable value is treated
 *                                         as omitted.
 * @returns {EventPartition} The three groups, always present and always arrays.
 *
 * @example
 * const { upcoming, past, undated } = partitionEvents(events, '2026-09-16')
 * upcoming.length // → 2  (2026-09-27, 2026-10-18 — soonest first)
 * past.length     // → 3  (2026-09-13, 2026-08-30, 2026-08-16 — most recent first)
 * undated.length  // → 0  (every authored record currently parses)
 */
export function partitionEvents(events, now = new Date()) {
  const source = Array.isArray(events) ? events : []
  // Resolved once, outside the loop: one instant for the whole list.
  const reference = resolveReferenceDay(now)

  /** @type {{event: CibleEvent, index: number, time: number}[]} */
  const upcoming = []
  /** @type {{event: CibleEvent, index: number, time: number}[]} */
  const past = []
  /** @type {CibleEvent[]} */
  const undated = []

  source.forEach((event, index) => {
    const lifecycle = lifecycleOf(event, reference)
    const day = eventCivilDay(event)

    // The two reads answer different needs — `lifecycle` decides the group,
    // `day` supplies the sort key — and they agree by construction, since
    // `lifecycleOf` returns 'undated' for exactly the records with no usable
    // day. Requiring both keeps the grouping and the ordering from ever
    // disagreeing about a record, however the record is malformed.
    if (lifecycle === 'undated' || !day) {
      undated.push(/** @type {CibleEvent} */ (event))
      return
    }

    const entry = { event: /** @type {CibleEvent} */ (event), index, time: day.getTime() }
    // 'today' joins 'upcoming': still ahead, and identically actionable.
    if (lifecycle === 'past') past.push(entry)
    else upcoming.push(entry)
  })

  upcoming.sort((a, b) => (a.time !== b.time ? a.time - b.time : a.index - b.index))
  past.sort((a, b) => (b.time !== a.time ? b.time - a.time : a.index - b.index))

  return {
    upcoming: upcoming.map((entry) => entry.event),
    past: past.map((entry) => entry.event),
    undated,
  }
}
