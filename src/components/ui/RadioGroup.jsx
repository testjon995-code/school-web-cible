import { useId } from 'react'
import { cn } from '../../lib/cn.js'

/**
 * RadioGroup — the canonical SINGLE-SELECT question group for the CIBLE School
 * of Language SPA.
 * ----------------------------------------------------------------------------
 * A real `<fieldset>` + `<legend>` over real `<input type="radio">` controls
 * that all share one `name`. It is the primitive for every "choose exactly one"
 * question: the learning-path questionnaire's four questions (goal / level /
 * time commitment / learning type) and the admission flow's single-select steps
 * (learner goal, preferred contact channel). There must be exactly ONE radio
 * group implementation in the codebase — always compose this component.
 *
 * Why native radios, and NOT `role="radiogroup"` / `role="radio"` / a row of
 * `aria-pressed` buttons:
 * - A question with mutually exclusive answers needs four things — group
 *   semantics, a group label, single selection, and arrow-key traversal that
 *   MOVES AND SELECTS. The platform supplies all four for free from
 *   `fieldset` / `legend` / same-named radios; `aria-pressed` buttons supply
 *   none of them and a hand-rolled ARIA widget has to re-implement (and can
 *   silently break) every one.
 * - Consequently this file adds NO ARIA role and NO key handler: Tab enters the
 *   group once (native roving tabindex), Arrow keys move and select, Space
 *   selects. The only ARIA used is the error/invalid wiring below, which no
 *   native attribute can express. "ARIA only where a native element cannot
 *   carry the semantics."
 * - A `Checkbox` is deliberately not a substitute: checkboxes are independent
 *   booleans with no grouping, no mutual exclusion and no arrow traversal.
 *
 * react-hook-form integration — REGISTER-based, never `Controller`:
 * - `src/lib/validators.js` exposes plain rule objects (`oneOfRule`,
 *   `requiredRule`, …), which is exactly the shape `register(name, rules)`
 *   consumes, so a caller wires a question up with one spread:
 *
 *     import { oneOfRule } from '../../lib/validators.js'
 *     import { goals } from '../../data/goals.js'
 *
 *     const goalIds = goals.map((g) => g.id)
 *
 *     <RadioGroup
 *       legend="What is your main goal?"
 *       required
 *       options={goals.map((g) => ({
 *         value: g.id,
 *         label: g.label,
 *         description: g.description,
 *       }))}
 *       error={errors.goal?.message}
 *       {...register('goal', oneOfRule(goalIds, 'Choose a goal'))}
 *     />
 *
 * - `register()` returns `{ name, onChange, onBlur, ref }`, and ALL FOUR must
 *   reach EVERY radio in the group: the shared `name` is what makes the group
 *   mutually exclusive and lets react-hook-form read the checked option's
 *   value, and `onBlur` is what keeps a form's `mode: 'onTouched'` working.
 *   That is why the remaining props are spread onto each `<input>` rather than
 *   onto the `<fieldset>`.
 * - `ref` is attached to EVERY input, which is intended and is the mechanism
 *   react-hook-form expects, NOT a bug to "fix": its `register` ref callback
 *   detects radio/checkbox inputs and collects each node into the field's
 *   internal `refs` array (rather than a single `ref`), then focuses `refs[0]`
 *   — the FIRST option — when `trigger()` or `handleSubmit()` focuses an
 *   invalid field. (A plain object ref, by contrast, simply ends up holding the
 *   last rendered input, which is still a focusable node for the field.)
 * - React 19 accepts `ref` as an ordinary prop for function components, so — as
 *   in `Input`, `Select` and `Textarea` — it is destructured and attached
 *   directly, with no `React.forwardRef` wrapper.
 * - `react-hook-form` is deliberately NOT imported here: the component only
 *   forwards what it is given, so it stays form-library-agnostic and adds no
 *   dependency or coupling.
 *
 * Prop routing (the one rule worth knowing before reading the code):
 * - `name` is a destructured prop, so a spread `register()` result supplies it
 *   directly and there is never a second, competing value. If a caller passes
 *   both, ordinary JSX prop order decides — put the spread LAST for `register`
 *   to win (`<RadioGroup name="x" {...register('goal')} />` → `goal`).
 * - The three GROUP-describing ARIA attributes — `aria-describedby`,
 *   `aria-label` and `aria-labelledby` — are routed to the `<fieldset>`,
 *   because the group is the thing being named and described. Spreading them
 *   onto the inputs would instead give all six radios the same accessible name
 *   and clobber their per-option descriptions.
 * - `id`, `type`, `name`, `value`, `required`, `disabled` and the per-option
 *   `aria-describedby` are applied AFTER the spread so a stray caller prop can
 *   never collapse the group (e.g. one `value` on every radio, or one duplicate
 *   `id`); everything else — `onChange`, `onBlur`, `autoFocus`, `data-*` — is
 *   forwarded untouched.
 *
 * Accessibility (WCAG AA):
 * - `<legend>` is the group's accessible name, announced with each option. When
 *   `legend` is omitted the caller MUST supply `aria-label` / `aria-labelledby`
 *   (both of which land on the `<fieldset>`), or the group has no name.
 * - The error message renders EXACTLY ONCE, directly beneath the `<legend>`, as
 *   a `role="alert"` live region, and the `<fieldset>` points at it with
 *   `aria-describedby` — matching the `Input` / `Select` error contract instead
 *   of repeating the message on every option, which would make a screen reader
 *   announce it once per radio.
 * - `aria-invalid` is set to `true` ONLY while an `error` is present (omitted —
 *   never `false` — otherwise) and sits on the `<fieldset>`, since the GROUP is
 *   what is invalid. Support for `aria-invalid` on a `fieldset` is weaker than
 *   on an `input`, which is why it is a supplement here: the information is
 *   actually carried by the `role="alert"` message and its `aria-describedby`
 *   association.
 * - `aria-describedby` points at the error when invalid, at the hint when
 *   valid, and is omitted entirely when neither exists (plus any caller-supplied
 *   value, since the attribute takes a space-separated id list).
 * - A per-option `description` is associated with ITS OWN radio through that
 *   input's `aria-describedby`, so the option's hint is announced with the
 *   option rather than with the group.
 * - Every option row is a `<label htmlFor>` wrapping its radio, so the whole
 *   row (label text and description included) is a click target, and it is at
 *   least 44px tall (`min-h-11`) for WCAG 2.5.5 / 2.5.8.
 * - Keyboard focus is INHERITED from the single global `:focus-visible` rule in
 *   `src/index.css` (never re-declared here) and reinforced with the field
 *   primitives' brand ring so the small native control is unmistakable.
 * - Selection is never carried by colour alone: the native radio's own checked
 *   state is the indicator, and the row tint is only a supplement.
 * - The required marker `*` is decorative (`aria-hidden`); requiredness is
 *   conveyed programmatically by the native `required` attribute, which on a
 *   radio applies to the whole group.
 *
 * Error colour rationale:
 * - The brand palette (blue / orange / green) intentionally has NO red/danger
 *   token, so error affordances standardise on the SECONDARY (orange) scale:
 *   message `text-secondary-700` (#c2410c ≈ 5.18:1, AA on white), row border
 *   `border-secondary-600`, and the required `*` in `text-secondary-600`. No
 *   red, no hex and no arbitrary value is introduced.
 *
 * Design system: every class resolves to an `@theme` token or a stock Tailwind
 * utility — no arbitrary bracket values — so `src/index.css` needs no new token
 * and no new utility. Hover uses `transition-colors duration-200` (Tailwind v4
 * scopes `hover:` to `@media (hover: hover)`, so it cannot stick on touch), and
 * the global `prefers-reduced-motion` block already flattens the duration.
 * ----------------------------------------------------------------------------
 */

/**
 * An option is renderable only when it is a plain object carrying a primitive
 * `value` (the string the DOM will submit). Anything else — `null`, a string,
 * an array, an object with no value — is dropped rather than crashing the map
 * or emitting a valueless radio, mirroring the defensive input validation the
 * shared `FAQ` component applies to its items.
 *
 * Module-local and NOT exported, so this file's only export stays the component
 * (`react/only-export-components`).
 *
 * @param {unknown} option - Candidate entry from the `options` array.
 * @returns {boolean} `true` when the entry can be rendered as a radio.
 */
const isRenderableOption = (option) =>
  Boolean(option) &&
  typeof option === 'object' &&
  !Array.isArray(option) &&
  (typeof option.value === 'string' || typeof option.value === 'number')

// Always-applied option-row classes: the field surface (matching the Input /
// Select / Textarea vocabulary), the 44px hit area, and the hover + checked
// treatments. `has-checked:` styles the row from its own radio's native checked
// state, so no JavaScript selection state is duplicated in this component.
const optionRowBase =
  'flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border bg-white px-4 py-3 shadow-sm transition-colors duration-200 hover:border-primary-600 has-checked:border-primary-600 has-checked:bg-primary-50'

/**
 * @param {object} props
 * @param {string} [props.id] - Explicit group id, applied to the `<fieldset>`; falls back to a generated `useId`. Also seeds the hint, error and per-option ids.
 * @param {import('react').ReactNode} [props.legend] - The question / group label, rendered as the `<legend>`. Required for an accessible group name unless `aria-label` / `aria-labelledby` is supplied.
 * @param {string} [props.name] - Shared radio group name. Normally supplied by the spread `register()` result.
 * @param {Array<{ value: string|number, label?: import('react').ReactNode, description?: import('react').ReactNode, disabled?: boolean }>} [props.options=[]] - The mutually exclusive choices, in display order. `value` must be unique within a group (the DOM submits it as a string, so allowlists passed to `oneOfRule` should be strings); `label` falls back to `value` when omitted.
 * @param {import('react').ReactNode} [props.hint] - Group helper text, shown only when there is no error.
 * @param {import('react').ReactNode} [props.error] - Group error message; when truthy it renders once as a `role="alert"` beneath the legend, marks the group invalid and switches the rows to the orange error border.
 * @param {boolean} [props.required=false] - Adds the native `required` attribute to every radio (requiring one selection in the group) and a decorative `*` on the legend.
 * @param {boolean} [props.disabled=false] - Disables every radio in the group and dims the rows.
 * @param {string} [props.className] - Extra classes for the `<fieldset>`, merged LAST so callers can override.
 * @param {string} [props.optionClassName] - Extra classes for every option row `<label>`, merged last.
 * @param {import('react').Ref<HTMLInputElement>} [props.ref] - Attached to EVERY radio (react-hook-form collects them and focuses the first on validation error).
 * @param {string} [props['aria-describedby']] - Extra description ids for the GROUP; merged with the hint/error id onto the `<fieldset>`.
 * @param {string} [props['aria-label']] - Accessible name for the GROUP; use when no visible `legend` is rendered.
 * @param {string} [props['aria-labelledby']] - Id of an existing element naming the GROUP.
 * @param {object} props... - Remaining props (`onChange`, `onBlur`, `autoFocus`, `data-*`, …) spread onto EVERY radio input.
 * @returns {import('react').ReactElement | null} The fieldset group, or `null` when there is no renderable option.
 */
function RadioGroup({
  id,
  legend,
  name,
  options = [],
  hint,
  error,
  required = false,
  disabled = false,
  className,
  optionClassName,
  ref,
  'aria-describedby': ariaDescribedBy,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}) {
  // Hooks must run unconditionally at the top level (react/rules-of-hooks), so
  // the id triple is computed before any guard can return.
  const autoId = useId()
  const fieldId = id || autoId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  // Point `aria-describedby` at whichever group helper is actually rendered —
  // the error when present, otherwise the hint — and append any caller-supplied
  // ids, since the attribute accepts a space-separated list. `cn` drops falsy
  // branches and yields '' when none apply, normalised to `undefined` so the
  // attribute is omitted entirely rather than emitted empty.
  const describedBy = cn(error && errorId, hint && !error && hintId, ariaDescribedBy) || undefined

  // Tolerate a malformed `options` value (a non-array, or entries without a
  // usable value) instead of throwing inside render.
  const renderableOptions = (Array.isArray(options) ? options : []).filter(isRenderableOption)

  // Nothing selectable to render — guard AFTER the hook so hook order stays
  // stable across renders. An empty group is rendered as nothing rather than as
  // an orphaned legend with no controls beneath it.
  if (!renderableOptions.length) return null

  return (
    <fieldset
      // The group id goes on the group: unlike `Input`, a radio group has no
      // single control to own it, and an addressable `<fieldset>` is what lets
      // a step-level error summary link to (or a wizard scroll to) the question.
      id={fieldId}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      // `m-0 border-0 p-0` strips the UA fieldset chrome through utilities (so
      // the global stylesheet needs no rule), and `min-w-0` defeats the
      // fieldset's UA `min-width: min-content`, which would otherwise force
      // horizontal overflow around a long option label on a 320px viewport.
      className={cn('m-0 min-w-0 border-0 p-0', className)}
    >
      {legend ? (
        <legend className="p-0 text-sm font-medium text-foreground">
          {legend}
          {required ? (
            <span className="ml-1 text-secondary-600" aria-hidden="true">
              *
            </span>
          ) : null}
        </legend>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-secondary-700">
          {error}
        </p>
      ) : null}

      {hint && !error ? (
        <p id={hintId} className="mt-2 text-xs text-muted">
          {hint}
        </p>
      ) : null}

      <div className="mt-2 flex flex-col gap-2">
        {renderableOptions.map((option, index) => {
          // Ids come from the `useId` prefix plus the option's INDEX, never its
          // value: values are content (course titles contain spaces, which are
          // invalid in an id) and are not guaranteed unique, whereas the index
          // is always a collision-free suffix — and the `useId` prefix keeps two
          // groups on one page apart. Same derivation as `Accordion`.
          const optionId = `${fieldId}-option-${index}`
          const descriptionId = `${optionId}-description`
          const hasDescription = option.description !== undefined && option.description !== null && option.description !== ''
          const isDisabled = disabled || option.disabled === true

          return (
            <label
              key={optionId}
              htmlFor={optionId}
              className={cn(
                optionRowBase,
                // Keep the error border on hover too, so hovering an invalid
                // group cannot momentarily hide its error affordance. twMerge
                // resolves these against the base's border utilities.
                error && 'border-secondary-600 hover:border-secondary-600',
                isDisabled && 'cursor-not-allowed opacity-50 hover:border-border',
                optionClassName,
              )}
            >
              {/* A line-height-tall box centres the 16px control on the FIRST
                  line of the label, so a wrapped label or description keeps the
                  radio aligned to its text instead of floating mid-block. */}
              <span className="flex h-5 shrink-0 items-center">
                <input
                  {...props}
                  id={optionId}
                  ref={ref}
                  type="radio"
                  name={name}
                  value={option.value}
                  required={required}
                  disabled={isDisabled}
                  aria-describedby={hasDescription ? descriptionId : undefined}
                  className="h-4 w-4 accent-primary-600 focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1"
                />
              </span>

              <span className="flex min-w-0 flex-col gap-1 break-words">
                <span className="text-sm font-medium text-foreground">{option.label ?? String(option.value)}</span>
                {hasDescription ? (
                  <span id={descriptionId} className="text-xs text-muted">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default RadioGroup
