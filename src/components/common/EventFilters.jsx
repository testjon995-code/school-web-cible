import Button from '../ui/Button.jsx'
import Select from '../ui/Select.jsx'
import Input from '../ui/Input.jsx'
import { cn } from '../../lib/cn.js'
import { partitionEvents } from '../../lib/eventSchedule.js'
import { eventLifecycleState } from '../../lib/states.js'
import allEvents from '../../data/events.js'

/**
 * EventFilters — the single control surface for the CIBLE School of Language
 * events listing (AAP §0.9.1 Group 5, feature F8).
 *
 * Three axes, in descending prominence: the event **lifecycle** group (the
 * primary axis), the event **type**, and a free-text **keyword**. Together they
 * are what turns `/events` from a flat dump of every record into something a
 * visitor can actually narrow — and, with the lifecycle axis in particular, what
 * stops a concluded event being presented as upcoming (the listing half of
 * BUG 1, AAP §0.11.1).
 *
 * ## The lifecycle axis is a segmented `aria-pressed` control, NOT a Tabs widget
 *
 * This is a decision already taken in AAP §0.2.3 and §0.8.4, and §0.8.4 records
 * "no tabs primitive" as explicitly **not counted as a gap** — it is a chosen
 * pattern, not a missing capability. Two reasons, both about restraint:
 *
 * - The segmented pattern is already **proven in this codebase** by
 *   {@link module:components/common/CourseGrid} (its category chip row), so
 *   reusing it leaves the repository with ONE set of selection semantics rather
 *   than two. The shape here is deliberately the same shape: a wrapper carrying
 *   `role="group"` and a descriptive `aria-label`, and each option a real
 *   `<button>` rendered through the canonical {@link Button} primitive with
 *   `aria-pressed` reflecting selection.
 * - A Tabs widget would import a whole second vocabulary — `role="tablist"`,
 *   `role="tab"`, `aria-selected`, roving `tabIndex`, arrow-key traversal and an
 *   owned `role="tabpanel"` relationship — to express a choice that three
 *   toggle buttons already express correctly. AAP §0.3.3's finding that "no ARIA
 *   is better than bad ARIA" applies directly: the only ARIA in this file is the
 *   `role="group"` + `aria-label` on the segment wrapper and the `aria-pressed`
 *   on each segment. There is no `role="tab"`, no `role="tablist"` and no
 *   `aria-selected` anywhere in it, and none may be added.
 *
 * The two secondary axes need no ARIA at all: the type filter is a native
 * `<select>` through the {@link Select} primitive and the keyword filter a
 * native `<input>` through {@link Input}, so grouping, type-ahead, option
 * announcement and keyboard interaction all come from the platform. A combobox
 * is not warranted for a list of five values.
 *
 * ## This component is stateless — `src/pages/Events.jsx` owns the URL contract
 *
 * It holds no state, runs no hook and reads no query parameter. It receives the
 * current `values` and calls `onChange`; the page reads, normalises and writes
 * the URL. That is the same division of responsibility as
 * `CourseFilters`/`useCourseFilters` (AAP §0.5.2), and it exists so exactly one
 * module owns each parameter. The three names are fixed by AAP §0.5.2 and must
 * not be invented, renamed or extended:
 *
 * | Parameter | Meaning                | Accepted values                        |
 * | --------- | ---------------------- | -------------------------------------- |
 * | `when`    | the lifecycle group    | `'upcoming'` · `'past'` · `'undated'`  |
 * | `type`    | the event type         | any `events[].type` literal, or `''`   |
 * | `q`       | free-text keyword      | any string                             |
 *
 * `type` is safe as a name on this route because the pre-existing `event`
 * parameter belongs to `/contact`, a different route, and the two never appear
 * together.
 *
 * ## Four lifecycle states, three listing groups
 *
 * `lifecycleOf` returns FOUR ids — `upcoming`, `today`, `past`, `undated` — but
 * `?when=` takes only THREE, because **an event happening today belongs in the
 * upcoming group**: it has not happened yet, and `EVENT_LIFECYCLE` grants
 * `today` and `upcoming` the identical action set (both permit registration and
 * a calendar export). Grouping today's event with the past would withhold two
 * legitimate actions and bury the single most urgent record in the list. The
 * record still renders its own distinct "Happening today" badge, because the
 * group a record sits in and the state it displays are different questions.
 *
 * That mapping is not re-derived here. {@link partitionEvents} already owns it
 * and returns exactly the three groups this control offers, which is why the
 * segment ids and the partition keys are the same three strings.
 *
 * ## Labels and icons come from `src/lib/states.js`, never from this file
 *
 * Each segment's text and glyph are read from `EVENT_LIFECYCLE` through
 * {@link eventLifecycleState}. That is the mechanism by which BUG 1 stays fixed:
 * the selector, the event cards and the event detail pages resolve the same
 * state through the same entry, so they cannot come to describe it differently.
 * A lifecycle label authored inline in this file would be the second authority
 * that defect is made of.
 *
 * **The variant is the exception, and the reason is worth knowing.** A consumer
 * reads the variant key for its own primitive and never translates between
 * vocabularies (AAP §0.2.3) — a `Button` reads `buttonVariant`, never
 * `badgeVariant`. `EVENT_LIFECYCLE` populates `badgeVariant` (its states render
 * as a `Badge` on cards and detail routes) and deliberately leaves
 * `buttonVariant` off, so there is no button variant here to read. Nor could
 * `badgeVariant` stand in for one: `EVENT_LIFECYCLE.past.badgeVariant` is
 * `'neutral'`, which `Badge` accepts and `Button` does not, so crossing the two
 * vocabularies would silently fall back to the primary fill and paint the
 * unselected "Past event" segment as though it were selected. A segment's
 * variant therefore expresses its SELECTION state, not the lifecycle —
 * `primary` when pressed and `outline` when not, exactly as AAP §0.8.2 maps a
 * filter chip.
 *
 * ## Type options are derived from the records, never hardcoded
 *
 * The option set is built from the `events` actually passed in, in source order,
 * exactly as `CourseGrid` derives its category chips from the current `items`.
 * So a list holding no webinar never offers a Webinar filter, and adding a sixth
 * type to `src/data/events.js` needs no change here. `events[].type` is a PUBLIC
 * CONTRACT (the card's type badge and now the `?type=` value), so the literal
 * strings are used as authored — never slugified, re-cased or trimmed into a new
 * form. The field is optional on the record, so records without one simply
 * contribute no option.
 *
 * ## Unrecognised values are dropped, not rendered
 *
 * Following the discipline the two existing deep links already use
 * (`/admission?course=` validates against the catalogue, `/contact?event=`
 * against the events module), every incoming value is checked against an
 * allowlist before it reaches a control: `when` against the three group ids,
 * `type` against the derived option set, `q` against being a string at all. A
 * hand-edited URL therefore degrades to the default view instead of rendering a
 * filter that does not exist, and no segment is shown as pressed for a value
 * this control does not recognise. Normalising the address itself is the page's
 * job; not crashing on — or misrepresenting — a value it has not normalised yet
 * is this component's.
 *
 * **The consuming page must FILTER with the same value this control DISPLAYS**,
 * and the two come apart in one specific way that browser testing caught: a page
 * that validates only `when` and passes the raw `type` straight into its own
 * predicate will filter by `?type=Bootcamp` while this control — correctly —
 * shows "All types", leaving a visitor staring at an empty list with every
 * filter apparently cleared and nothing to clear. The defect is in the page, not
 * here, but it is invited by the split of responsibility, so it is named where
 * an implementer will read it. `onChange`'s third argument exists partly for
 * this reason: it hands back the fully validated set. On first render there has
 * been no `onChange`, so the page must apply the same two rules itself —
 * `when` against the three group ids, `type` against the types its own records
 * actually carry.
 *
 * ## Two behaviours that look like bugs and are not
 *
 * **The counts describe the lifecycle group, not the narrowed subset.** Each
 * segment reports how many records its own group holds, taken straight from
 * {@link partitionEvents}, and is unaffected by the active type or keyword. That
 * is what makes the count answer the question a visitor actually has before
 * switching — "is there anything over there?" — and what keeps it stable while
 * they refine the other two axes. It also means `events` should be the FULL
 * list: the page applies the type and keyword narrowing to what it renders,
 * after this control has reported the groups.
 *
 * **A segment with a count of zero stays selectable.** It is never `disabled`,
 * because every group owns a distinct empty state (AAP §0.11.3 — "No events are
 * awaiting a date; see upcoming events" for precisely this case), and a state
 * nobody can reach is a state nobody can read. The empty state itself belongs to
 * `Events.jsx`; making the group selectable is this component's part of it.
 *
 * ## Styling
 *
 * Token-driven throughout, composed only through {@link cn}: the panel is
 * `bg-surface` inside a `border-border` hairline at `rounded-2xl`, text is
 * `text-foreground`/`text-muted`, and spacing sits on the existing scale
 * (`gap-2`, `gap-3`, `gap-4`, `p-4`, `md:p-6`). Zero new design tokens and zero
 * new named utilities are introduced, so `src/index.css` carries no diff
 * (AAP §0.8.5), and there are no arbitrary bracket values. The 44px touch-target
 * floor and the single global `:focus-visible` ring are inherited from
 * {@link Button}'s base class and the global stylesheet respectively — neither is
 * re-declared. Colour is never the sole carrier of state: a pressed segment
 * changes variant AND sets `aria-pressed` AND carries its label and icon, and
 * every glyph is `aria-hidden`. No gradient, no glassmorphism, and no animation
 * beyond the 200ms colour transition `Button` already provides.
 *
 * @module components/common/EventFilters
 */

/**
 * A single CIBLE event record. Referenced as a type only.
 *
 * @typedef {import('../../data/events.js').CibleEvent} CibleEvent
 */

/**
 * The lifecycle groups a listing offers, in display order.
 *
 * @typedef {'upcoming'|'past'|'undated'} EventGroup
 */

/**
 * The three filter dimensions this control surfaces, as the page holds them.
 *
 * Every property is optional because the page's default view supplies none of
 * them, and each is validated here before it reaches a control.
 *
 * @typedef {object} EventFilterValues
 * @property {EventGroup} [when] The selected lifecycle group. Absent or
 *   unrecognised reads as the default group, `'upcoming'`.
 * @property {string} [type] The selected `events[].type` literal. Absent,
 *   empty, or not present in the current records reads as "all types".
 * @property {string} [q] The free-text keyword. A non-string reads as empty.
 */

/**
 * The lifecycle groups this control offers, in the order they are rendered.
 *
 * These are the three keys {@link partitionEvents} returns and the three values
 * `?when=` accepts — one list, so the control, the URL and the partition cannot
 * drift apart. `'today'` is deliberately absent: it is a lifecycle state a
 * record displays, not a group a listing offers, and it partitions into
 * `upcoming`.
 *
 * @type {EventGroup[]}
 */
const GROUP_IDS = ['upcoming', 'past', 'undated']

/**
 * The group shown when `?when=` is absent or unrecognised.
 *
 * Upcoming events are what a visitor arriving at `/events` came for, and this is
 * the same target `EVENT_LIFECYCLE.past.nextAction` links to
 * (`/events?when=upcoming`), so the default view and that recovery action agree.
 *
 * @type {EventGroup}
 */
const DEFAULT_GROUP = 'upcoming'

/**
 * The empty-value option label for the type select.
 *
 * Rendered as a real `<option value="">` through `children` rather than through
 * the `Select` primitive's `placeholder` prop — see {@link EventFilters}'s note
 * on that trap.
 */
const ALL_TYPES_LABEL = 'All types'

/**
 * Resolve an incoming `when` value to a group this control actually offers.
 *
 * Anything that is not one of the three ids — absent, misspelled, an array from
 * a repeated query key, an inherited `Object.prototype` member — resolves to the
 * default group, so the pressed segment always matches the group being rendered
 * and an unknown value never shows as selected.
 *
 * @param {unknown} value The candidate group id.
 * @returns {EventGroup} One of the three offered groups.
 */
function resolveGroup(value) {
  return GROUP_IDS.includes(/** @type {EventGroup} */ (value))
    ? /** @type {EventGroup} */ (value)
    : DEFAULT_GROUP
}

/**
 * Derive the selectable type options from the records themselves.
 *
 * Source order is preserved (it is the institute's authored order) and
 * duplicates are collapsed, mirroring how `CourseGrid` derives its category
 * chips from the current `items`. `type` is optional on the record, so a missing
 * or non-string value contributes nothing rather than an empty option; the
 * surviving strings are passed through exactly as authored, because they are the
 * public `?type=` contract.
 *
 * @param {CibleEvent[]|unknown} events The records to read. A non-array yields no options.
 * @returns {string[]} The distinct type literals present, in source order.
 */
function deriveTypeOptions(events) {
  const source = Array.isArray(events) ? events : []
  const present = source
    .map((event) => (event && typeof event === 'object' ? /** @type {{type?: unknown}} */ (event).type : null))
    .filter((type) => typeof type === 'string' && type.trim() !== '')
  return Array.from(new Set(/** @type {string[]} */ (present)))
}

/**
 * Read a group's size from a partition without trusting its shape.
 *
 * {@link partitionEvents} always returns all three keys as arrays, so this is
 * defence in depth rather than a live branch — but a count is rendered into an
 * accessible name, and `undefined.length` would cost the whole listing.
 *
 * @param {Record<string, unknown>} partition The partition to read.
 * @param {EventGroup} group The group whose size is wanted.
 * @returns {number} The number of records in that group, or 0.
 */
function countOf(partition, group) {
  const list = partition ? partition[group] : null
  return Array.isArray(list) ? list.length : 0
}

/**
 * The events control surface: a lifecycle segment group, a type select and a
 * keyword field.
 *
 * ## The `Select` trap this file is written to avoid
 *
 * **Do not add a `placeholder` prop to the type select below.** The {@link Select}
 * primitive renders `defaultValue={placeholder ? '' : undefined}`, so supplying a
 * `placeholder` alongside the controlled `value` this component passes would put
 * `defaultValue` AND `value` on the same `<select>`. React warns on exactly that
 * combination ("specify either the value prop, or the defaultValue prop, but not
 * both") and the control stops behaving as a controlled one — which is the worst
 * kind of defect, because the filter still appears to work: it only misbehaves
 * on first paint, so a shared `/events?type=Workshop` link silently opens
 * showing "All types" while the list beneath it is filtered. The primitive's
 * `placeholder` exists for the uncontrolled `register`-based form fields it was
 * built for, and is simply the wrong tool here.
 *
 * The empty-value option is therefore supplied through `children` — which
 * {@link Select} honours in preference to its `options` prop — leaving
 * `defaultValue` `undefined` and the control cleanly controlled.
 *
 * @param {object} props
 * @param {CibleEvent[]} [props.events=allEvents] The records the listing is working
 *   from, defaulting to the `src/data/events.js` single source of truth (the same
 *   convention `CourseGrid` uses for `items`). Pass the **full** list: the segment
 *   counts describe whole lifecycle groups, and the page applies the type and
 *   keyword narrowing to what it renders.
 * @param {EventFilterValues} [props.values] The currently applied filters, as the
 *   page holds them. Every value is validated here before it reaches a control, so
 *   an un-normalised or hand-edited value degrades to the default view rather than
 *   rendering a filter that does not exist.
 * @param {(dimension: 'when'|'type'|'q', next: string, nextValues: {when: EventGroup, type: string, q: string}) => void} [props.onChange]
 *   Called when the visitor changes one axis. The first two arguments mirror
 *   `useCourseFilters`' `setValue(dimension, next)` so the two filter surfaces read
 *   alike; the third is the complete, already-merged and already-validated next
 *   value set, so a consumer can express the change as one batched
 *   `setSearchParams` write (AAP §0.5.2 requires a single batched write, because
 *   react-router 7's functional updater does not queue within a tick). Omitting
 *   this prop renders a read-only panel rather than throwing.
 * @param {string|Date} [props.now] The instant the lifecycle groups are counted
 *   against, forwarded to {@link partitionEvents}; omitted means the real current
 *   instant. Injected rather than read here so a whole listing — this control, its
 *   cards and its detail routes — can be classified against one instant and never
 *   split across a midnight boundary.
 * @param {string} [props.className] Extra classes merged LAST via {@link cn}, so a
 *   caller can extend or override the panel's layout.
 * @param {object} [props] Any other props (`id`, `aria-*`, `data-*`, …) are
 *   forwarded to the root `<div>`.
 * @returns {import('react').ReactElement} The events filter panel.
 */
function EventFilters({ events = allEvents, values, onChange, now, className, ...props }) {
  // Derivations only — no state and no hooks, so there is no hook order to get
  // wrong (`react/rules-of-hooks` is an error) and nothing to memoise. At five
  // records this is microseconds, and AAP §0.12.6 is explicit that memoisation
  // belongs only where it is measurable.
  const partition = partitionEvents(events, now)
  const typeOptions = deriveTypeOptions(events)

  // Read the incoming values defensively: `values` may be absent on a first
  // render, and each field is validated against its own allowlist so an
  // unrecognised value is dropped rather than shown as an active filter.
  const source = values && typeof values === 'object' ? values : {}
  const activeGroup = resolveGroup(source.when)
  const activeType =
    typeof source.type === 'string' && typeOptions.includes(source.type) ? source.type : ''
  const query = typeof source.q === 'string' ? source.q : ''

  // A type select offering only "All types" would be a dead control, so it is
  // rendered only when the records actually carry a type — the same reasoning
  // that derives the options from the data in the first place.
  const showTypeFilter = typeOptions.length > 0

  /**
   * Report one axis changing, with the merged next value set alongside it.
   *
   * @param {'when'|'type'|'q'} dimension The axis that changed.
   * @param {string} next Its new value.
   * @returns {void}
   */
  const emit = (dimension, next) => {
    if (typeof onChange !== 'function') return
    onChange(dimension, next, {
      when: activeGroup,
      type: activeType,
      q: query,
      [dimension]: next,
    })
  }

  return (
    <div
      className={cn('flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 md:p-6', className)}
      {...props}
    >
      {/* PRIMARY AXIS. The same segmented shape as CourseGrid's category chips:
          a labelled role="group" of real <button>s carrying aria-pressed. NOT a
          tablist — see the module header. `flex-wrap` is what keeps three
          count-bearing segments inside 320px without horizontal overflow. */}
      <div role="group" aria-label="Filter events by when they happen" className="flex flex-wrap gap-2">
        {GROUP_IDS.map((group) => {
          // Label and icon come from the one state authority, so this selector
          // and the cards it filters can never describe a state differently.
          const state = eventLifecycleState(group)
          const Icon = state.icon
          const isActive = group === activeGroup
          const count = countOf(partition, group)

          return (
            <Button
              key={group}
              type="button"
              // The variant carries SELECTION, not lifecycle: EVENT_LIFECYCLE
              // populates `badgeVariant` (for Badge) and no `buttonVariant`, and
              // `past.badgeVariant` is 'neutral', which Button does not accept.
              variant={isActive ? 'primary' : 'outline'}
              size="sm"
              // State is never colour alone: aria-pressed carries it to assistive
              // technology, and the label and icon carry it visually.
              aria-pressed={isActive}
              // Never `disabled` on a zero count — every group owns a distinct
              // empty state (AAP §0.11.3), and an unreachable state is unreadable.
              onClick={() => emit('when', group)}
              // Relaxes `sm`'s fixed h-11 so a long label (e.g. "Date to be
              // announced") grows rather than clipping at a narrow width; the
              // 44px floor still comes from Button's own base `min-h-11`.
              className="h-auto py-2 text-center"
            >
              {Icon ? <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /> : null}
              <span>{state.label}</span>
              {/* Differentiated by size and weight, never by colour: the count
                  inherits the button's own text colour, because `text-muted` on
                  the pressed `primary-600` fill would fail WCAG AA. */}
              <span className="text-xs font-normal tabular-nums">{count}</span>
              <span className="sr-only">events</span>
            </Button>
          )
        })}
      </div>

      {/* SECONDARY AXES. Both are native controls through the shared field
          primitives, so labelling, keyboard interaction and option announcement
          come from the platform and no ARIA is added. */}
      <div className={cn('grid gap-4', showTypeFilter && 'sm:grid-cols-2')}>
        {showTypeFilter ? (
          <Select
            label="Event type"
            value={activeType}
            onChange={(event) => emit('type', event.target.value)}
          >
            {/* The empty-value option via `children`, NOT via `placeholder` —
                see this component's JSDoc. `children` takes precedence over the
                primitive's `options` prop. Types are rendered as authored,
                because the literal is the public `?type=` contract. */}
            <option value="">{ALL_TYPES_LABEL}</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        ) : null}

        <Input
          label="Search events"
          type="search"
          value={query}
          onChange={(event) => emit('q', event.target.value)}
          autoComplete="off"
        />
      </div>
    </div>
  )
}

export default EventFilters
