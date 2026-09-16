import { cn } from '../../lib/cn.js'

/**
 * Stepper — THE canonical multi-step progress indicator for the CIBLE School of
 * Language SPA (AAP §0.8.4 gap: the repository has no stepper or progress
 * primitive). It is a read-only STATUS DISPLAY, not a control set: it reports
 * where the visitor is in an ordered sequence and nothing in it is focusable or
 * clickable. Two surfaces consume it — the six-step admission flow
 * (`forms/AdmissionForm.jsx`: Goal → Course → Personal details → Preferred
 * contact method → Review → Confirmation) and the four-question learning-path
 * wizard (`common/LearningPathWizard.jsx`) — so it must render correctly for
 * any step count, and there must be exactly ONE stepper implementation in the
 * codebase: always compose this component, never fork a second one.
 *
 * ---------------------------------------------------------------------------
 * TWO PRESENTATIONS FROM ONE STRUCTURE — and the arithmetic that forces it
 * ---------------------------------------------------------------------------
 * Six labelled steps cannot render as a horizontal row of labels at 320px
 * (AAP §0.8.4): `Container` supplies `px-4` gutters at mobile widths, so
 * 320 − 32 = 288px of content, and 288 ÷ 6 ≈ 48px per label — which clips every
 * one of them. The component therefore has two PRESENTATIONS:
 *
 *   • Below `md` — the textual form. A "Step 3 of 6" counter with the current
 *     step's own label on the line beneath it, above a rail of N small
 *     connector segments filled to the current position. The segments are
 *     decoration (`aria-hidden`) because the textual form already carries the
 *     meaning.
 *   • From `md` up — the full horizontal `<ol>`, every label visible beneath its
 *     own connector segment.
 *
 * Both presentations are the SAME `<ol>` with the SAME `<li>` elements and the
 * SAME text content: the labels of non-current steps are VISUALLY hidden below
 * `md` (the global `.sr-only` class from src/index.css, lifted again from `md`
 * with `md:not-sr-only`) rather than removed from the DOM, so the accessible
 * name and structure do NOT change with width. That is deliberate and
 * load-bearing — it is what keeps the announcement consistent across widths.
 * Consequently this component renders ONE tree, never two; it does not apply
 * `hidden` to a step label, and it does not branch on a JavaScript width check,
 * which would make the accessible structure width-dependent and would need a
 * resize listener this primitive has no reason to own.
 *
 * MAINTENANCE CONSTRAINT on the label span, verified in a browser against the
 * production stylesheet: `md:not-sr-only` resets `clip-path` but NOT the legacy
 * `clip` property, and the project's base-layer `.sr-only` sets
 * `clip: rect(0, 0, 0, 0)`. That leftover `clip` is inert ONLY because
 * `not-sr-only` also sets `position: static`, and `clip` applies exclusively to
 * absolutely/fixed-positioned elements. So the label span must never be given
 * its own positioning at or above `md` — doing so would silently re-activate
 * the inherited clip and blank every revealed label with no other visible
 * cause. Position the `<li>`, never the label.
 *
 * The connectors are rendered as ONE segment inside each `<li>` rather than as
 * separate elements between the items, because an `<ol>` may only contain `<li>`
 * children — the equal-width segments abut across the row (separated by the
 * list's own gap) and so read as a single rail filled up to the current step.
 *
 * Nothing about the layout can overflow horizontally, at any width or step
 * count: the `<ol>` is a flex row whose items are `flex-1 min-w-0` (i.e.
 * `flex: 1 1 0%` with no min-content floor), so the segments always divide the
 * available measure and long labels wrap (`break-words`) instead of pushing the
 * row wider than its container. At 320px with six steps that is 288 − (5 × 8px
 * gap) = 248px shared six ways ≈ 41px per segment.
 *
 * ---------------------------------------------------------------------------
 * ACCESSIBILITY (WCAG AA)
 * ---------------------------------------------------------------------------
 * - A real `<ol>`/`<li>` conveys the ordered sequence natively, so no `role`
 *   is added (matching `ui/Breadcrumbs.jsx` and `common/Timeline.jsx`).
 * - The active item carries `aria-current="step"`, AND every completed/current
 *   item additionally carries a visually hidden "Completed: " / "Current: "
 *   prefix. BOTH mechanisms are present on purpose, not one: an ordered list
 *   with hidden state text is the universally supported technique, while
 *   support for `aria-current` on a non-focusable `<li>` is not uniform
 *   (AAP §0.3.3 / §0.8.4). The hidden text is also why state survives even if a
 *   browser strips list semantics from an unstyled list.
 * - The step COUNT is conveyed programmatically, not only visually: the
 *   "Step n of N" counter is a real, non-`aria-hidden` paragraph rendered at
 *   EVERY width, so assistive technology always receives the position and the
 *   total. From `md` it is visually redundant with the visible labels, and it is
 *   deliberately kept anyway — redundant reassurance costs nothing, whereas
 *   hiding it would make the a11y tree width-dependent. Only the compact
 *   duplicate of the current label is suppressed from `md` (`md:hidden`); it is
 *   `aria-hidden="true"` at every width, so the authoritative announcement of
 *   the label always comes from the `<li>` itself and is never doubled.
 * - The HTML `<progress>` element is deliberately NOT used: some platforms
 *   animate it, which conflicts with WCAG 2.2.2 unless overridden with
 *   vendor-prefixed CSS this repository has no reason to add (AAP §0.3.3).
 * - This primitive does NOT announce the step change: there is no `aria-live`
 *   region here. Announcement belongs to the consuming form's own page-local
 *   polite region (AAP §0.8.4), which keeps the shell's title-mirroring
 *   announcer in `layout/Layout.jsx` with its single existing meaning
 *   (AAP §0.5.1).
 * - Colour is never the sole carrier of state: completed / current / upcoming
 *   are distinguished by the hidden state text and `aria-current` first, and by
 *   the segment fill and label weight only as reinforcement.
 * - Decorative connector segments are `aria-hidden="true"`; nothing receives
 *   `tabIndex` or a handler, so there is no tab-order or keyboard-trap concern.
 *
 * ---------------------------------------------------------------------------
 * STYLING
 * ---------------------------------------------------------------------------
 * Every class resolves to a Tailwind v4 `@theme` token from src/index.css or to
 * a native utility — there are no hardcoded or arbitrary bracket values, and
 * this component adds NO token and NO utility (src/index.css carries no diff).
 * The counter uses the meta step `text-xs text-muted` (~7.5:1 on white), the
 * current label `text-sm font-medium text-foreground` (~17:1), a filled segment
 * `bg-primary-600` and an unfilled one `bg-border`. Spacing stays on the shared
 * scale (`gap-2`, `md:gap-3`, `mb-2`, `mt-1`). The only motion is the existing
 * `transition-colors duration-200` vocabulary, under the site-wide
 * `<MotionConfig reducedMotion="user">` in src/App.jsx and the global
 * `prefers-reduced-motion` reset in src/index.css. `className` is merged LAST
 * through `cn()`, so a caller's utility deterministically wins.
 *
 * @param {object} props
 * @param {Array<string|{label?: string, title?: string}>} [props.steps=[]]
 *   The ordered step list. The canonical form is an array of LABEL STRINGS
 *   (`['Goal', 'Course', …]`); an array of objects is also accepted and read
 *   from `label` first, then `title`, so a caller that already models steps as
 *   records does not have to reshape them. An entry with no usable label keeps
 *   its position and falls back to "Step n", because positions are what
 *   `current` indexes — entries are never dropped or reordered.
 * @param {number} [props.current=0] Zero-based index of the active step. It is
 *   clamped into range (and non-finite / non-integer input is floored to a valid
 *   index), so a caller bug can never crash the flow it is reporting on.
 * @param {string} [props.className] Extra classes merged LAST onto the root
 *   element (via `cn`, so caller overrides win deterministically).
 * @param {object} [props] Any other props (`id`, `aria-label`, `data-*`, …) are
 *   forwarded to the root element.
 * @returns {import('react').ReactElement|null} The progress indicator, or
 *   `null` when `steps` is empty, absent or not an array (nothing to report).
 */

// Per-state presentation. Module-local (NOT exported) so the module exposes only
// the Stepper component and stays clean under the enforced
// `react/only-export-components` lint rule — the same convention as
// `ui/Button.jsx` and `ui/Badge.jsx`.
//
// Segment fill: every segment up to and including the current one is filled, so
// the rail reads as "filled to the current position"; the remainder is the
// neutral hairline token.
const segmentState = {
  complete: 'bg-primary-600',
  current: 'bg-primary-600',
  upcoming: 'bg-border',
}

// Label emphasis. The current step is the only one promoted to the brand colour
// and a heavier weight; completed steps stay muted but semibold-adjacent
// (`font-medium`) so the three states differ by WEIGHT as well as colour.
const labelState = {
  complete: 'font-medium text-muted',
  current: 'font-semibold text-primary-600',
  upcoming: 'text-muted',
}

// Visually hidden state text — the primary, universally supported carrier of
// each step's state (see the accessibility note above). Upcoming steps get no
// prefix: their label alone is the correct announcement.
const statePrefix = {
  complete: 'Completed: ',
  current: 'Current: ',
  upcoming: '',
}

/**
 * Resolve one `steps` entry to a display label.
 *
 * Accepts a plain string or a `{ label }` / `{ title }` record and returns the
 * trimmed label, or an empty string when the entry carries no usable text (the
 * caller then substitutes a positional fallback rather than dropping the step).
 *
 * @param {unknown} step - One entry of the `steps` array.
 * @returns {string} The trimmed label, or `''` when none is usable.
 */
function toLabel(step) {
  if (typeof step === 'string') return step.trim()
  if (step && typeof step === 'object') {
    const { label, title } = step
    if (typeof label === 'string' && label.trim()) return label.trim()
    if (typeof title === 'string' && title.trim()) return title.trim()
  }
  return ''
}

function Stepper({ steps = [], current = 0, className, ...props }) {
  // Nothing to report for an absent, non-array or empty step list. No hooks are
  // used anywhere in this component, so this guard cannot affect hook order
  // (`react/rules-of-hooks`).
  if (!Array.isArray(steps) || steps.length === 0) return null

  // Normalize labels WITHOUT changing positions: `current` is an index into the
  // caller's array, so an unusable entry keeps its slot with a positional
  // fallback instead of being filtered out.
  const labels = steps.map((step, index) => toLabel(step) || `Step ${index + 1}`)
  const total = labels.length

  // Clamp `current` into range. Non-finite / fractional input is floored to a
  // whole index and out-of-range input saturates at the first/last step, so a
  // caller bug degrades to a valid view rather than an exception or a rail with
  // no filled segment.
  const requested = typeof current === 'number' && Number.isFinite(current) ? Math.trunc(current) : 0
  const active = Math.min(Math.max(requested, 0), total - 1)

  return (
    <div className={cn('w-full', className)} {...props}>
      <div className="mb-2">
        {/* Real (not aria-hidden) at every width: this is how the step count
            reaches assistive technology regardless of viewport. */}
        <p className="text-xs font-medium text-muted">
          Step {active + 1} of {total}
        </p>
        {/* The compact presentation's "line beneath": the current step's label,
            shown only below `md` where the in-list labels are visually hidden.
            It is aria-hidden at every width, so the label is announced exactly
            once — from its own <li>. */}
        <p aria-hidden="true" className="mt-1 text-sm font-medium text-foreground md:hidden">
          {labels[active]}
        </p>
      </div>

      {/* ONE ordered list serves both presentations. `list-none m-0 p-0` states
          the reset explicitly at the component level rather than relying on a
          global stylesheet. `items-start` keeps every segment on the same top
          line when labels wrap to different heights from `md`. */}
      <ol className="m-0 flex list-none items-start gap-2 p-0 md:gap-3">
        {labels.map((label, index) => {
          const state = index === active ? 'current' : index < active ? 'complete' : 'upcoming'
          const prefix = statePrefix[state]
          return (
            <li
              // Labels are not guaranteed unique, and the sequence is a fixed,
              // positional list, so position is part of the identity.
              key={`step-${index}-${label}`}
              aria-current={state === 'current' ? 'step' : undefined}
              // `flex-1 min-w-0` is the no-overflow guarantee (see the JSDoc
              // arithmetic); `gap-2` separates a segment from its label from
              // `md`, and contributes nothing below `md` where the label is
              // taken out of flow by `.sr-only`.
              className="flex min-w-0 flex-1 flex-col gap-2"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'h-1 w-full rounded-full transition-colors duration-200',
                  segmentState[state],
                )}
              />
              {prefix ? <span className="sr-only">{prefix}</span> : null}
              <span
                // `sr-only` below `md`, revealed from `md` by `md:not-sr-only`:
                // the label is ALWAYS in the DOM and in the accessibility tree,
                // only its visibility changes with width.
                className={cn(
                  'sr-only break-words text-xs md:not-sr-only md:text-center',
                  labelState[state],
                )}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default Stepper
