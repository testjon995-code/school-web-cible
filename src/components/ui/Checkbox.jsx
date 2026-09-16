import { useId } from 'react'
import { cn } from '../../lib/cn.js'

/**
 * Checkbox — the canonical boolean / multi-select form field for the CIBLE
 * School of Language SPA.
 *
 * This is NOT a new field design: it is the existing `Input` / `Select` /
 * `Textarea` field contract adapted to a checkbox's inline layout. The label /
 * hint / error / `required` props, the id derivation, the ARIA wiring and the
 * error affordances are IDENTICAL to those three primitives, so the four
 * compose interchangeably inside forms and filter panels and there is exactly
 * ONE field contract in the codebase. The only intentional divergence is
 * geometry: a checkbox sits BESIDE its label rather than beneath it, so the
 * wrapper lays the control and label out in a row (with the hint and error
 * beneath) instead of stacking them.
 *
 * It is consumed by the course-discovery filter panel for the multi-select
 * dimensions (`level`, `duration`, `prereq`), where several boxes in a group
 * widen the result set, and it is available to any form needing a single
 * boolean (e.g. a consent acknowledgement).
 *
 * Native by design: the browser's own `<input type="checkbox">` is rendered —
 * never a custom `<div role="checkbox">` — exactly as the `Select` primitive
 * renders a native `<select>`. Checked / unchecked / indeterminate state,
 * Space-to-toggle, the accessibility tree and the platform's own high-contrast
 * and forced-colours rendering therefore all come from the platform for free,
 * with no ARIA re-implementation to drift out of sync. The brand tint is
 * applied through the `accent-color` utility, so the control is styled rather
 * than replaced and state is never carried by colour alone (the native checked
 * semantics are what assistive technology reports).
 *
 * One consequence of staying native is worth knowing before restyling this
 * control: while `appearance: auto` is in force the user agent paints the box
 * and DISCARDS author `border`, `border-radius` and `background-color` on it
 * (measured in Chrome: computed border-width 0px). `box-shadow` is still
 * painted, so the shared `shadow-sm` elevation and every `ring-*` utility do
 * take effect — which is why this component expresses its resting elevation and
 * its error edge with `shadow-sm` / `ring-*` rather than repeating the sibling
 * fields' `border-*` classes, which would be dead CSS here. A caller that wants
 * a fully custom box can pass `inputClassName="appearance-none …"` along with
 * its own border and background utilities.
 *
 * Controlled vs react-hook-form usage — both are supported through `...props`,
 * which is spread onto the native input:
 * - Controlled (the filter panel): pass `checked` and `onChange` and own the
 *   value in the caller, e.g.
 *   `<Checkbox label="Beginner" checked={on} onChange={handleToggle} />`.
 * - react-hook-form: spread `register()` directly, e.g.
 *   `<Checkbox label="Beginner" value="Beginner" {...register('level')} />`.
 *   `register()` returns `{ name, onChange, onBlur, ref }`; `name`, `onChange`
 *   and `onBlur` arrive via `...props`, and `ref` is attached to the native
 *   input so RHF can read the value and `trigger` can focus the control on a
 *   validation failure. React 19 accepts `ref` as an ordinary prop on function
 *   components, so no `React.forwardRef` wrapper is required — matching the
 *   convention already used by `Input`, `Select` and `Textarea`.
 *
 * Accessibility (WCAG AA):
 * - Programmatic label/field association via `htmlFor`/`id` (explicit
 *   association, as in the sibling primitives — the input is a SIBLING of the
 *   label, not nested inside it), so clicking or tapping the label text toggles
 *   the box natively. An explicit `id` is honoured; otherwise a stable,
 *   collision-free id is generated with `useId()`.
 * - When `label` is omitted, callers MUST supply an accessible name via
 *   `aria-label` (or `aria-labelledby`) through `...props`.
 * - `aria-invalid` is set to `true` ONLY while an `error` is present (it is
 *   omitted — never `false` — otherwise). `aria-describedby` points at the
 *   error message when invalid, or at the hint when valid, and is `undefined`
 *   when neither exists so the attribute is omitted rather than emitted empty.
 *   The error message uses `role="alert"` so assistive technology announces it
 *   as it appears.
 * - The required marker `*` is decorative (`aria-hidden`); the requirement is
 *   conveyed programmatically by the native `required` attribute.
 * - A visible keyboard focus ring is applied via `focus-visible` (brand primary
 *   in the rest state, brand secondary/orange in the error state), on top of
 *   the global `:focus-visible` outline defined in `src/index.css` — which this
 *   component inherits and never re-declares. Unlike the sibling text fields it
 *   deliberately does NOT add `focus-visible:outline-none`: keeping the
 *   inherited 2px primary-600 outline gives the small 20px box a more prominent
 *   indicator (a ~3px painted band, verified in Chrome) than the ring alone,
 *   and honours the design system's "focus is inherited, never re-declared"
 *   rule. In the rest state the outline and the ring share one colour and read
 *   as a single band; in the error state the blue outline marks focus while the
 *   orange ring keeps carrying the field's state.
 * - Touch target: the painted box sits on the spacing scale (`h-5 w-5` = 20px)
 *   while the INTERACTIVE region — the box plus its associated label — is held
 *   to at least 44px tall by `min-h-11` on both the row and the label, matching
 *   the floor `Button` bakes into its base class and satisfying the WCAG
 *   2.5.5 / 2.5.8 touch-target guideline. The label also fills the remaining
 *   row width, so a long option label (e.g. "Basic English reading and
 *   writing") wraps beside the box at 320px rather than clipping or
 *   overflowing.
 *
 * Error colour rationale:
 * - The brand palette (blue / orange / green) intentionally has NO red/danger
 *   token, so error affordances standardise on the SECONDARY (orange) scale:
 *   `ring-secondary-600` for the box edge — the painting-safe equivalent of the
 *   sibling fields' `border-secondary-600`, and the same #ea580c at the same
 *   1px width — focus `ring-secondary-600`, the checked tint
 *   `accent-secondary-700` (AA-safe against its white checkmark, unlike
 *   secondary-600) and the message `text-secondary-700` (AA on white), with the
 *   required `*` in `text-secondary-600`. No red, no hex and no arbitrary
 *   values are introduced, and no new token or utility is needed.
 *
 * @param {object} props
 * @param {string} [props.id] Explicit input id; auto-generated via useId when omitted.
 * @param {import('react').ReactNode} [props.label] Visible label text (strongly recommended for a11y).
 * @param {import('react').ReactNode} [props.error] Error message; when truthy enables error styling + ARIA wiring.
 * @param {import('react').ReactNode} [props.hint] Helper text shown only when there is no error.
 * @param {boolean} [props.required=false] Sets the native `required` attribute and renders a visual `*`.
 * @param {string} [props.className] Extra classes for the wrapping <div> (merged last).
 * @param {string} [props.inputClassName] Extra classes for the <input> element itself.
 * @param {import('react').Ref<HTMLInputElement>} [props.ref] Forwarded to the native <input> (react-hook-form).
 * @param {boolean} [props.checked] Controlled checked state, forwarded via `...props` (pair with `onChange`).
 * @param {(event: import('react').ChangeEvent<HTMLInputElement>) => void} [props.onChange] Change handler, forwarded via `...props`.
 * @param {boolean} [props.disabled] Disables the control and dims the label, forwarded via `...props`.
 * @param {object} props... Remaining props spread onto the <input> (name/onBlur/value/aria-label/data attributes/...).
 * @returns {import('react').ReactElement} The labelled, accessible checkbox field.
 */
function Checkbox({ id, label, error, hint, required = false, className, inputClassName, ref, ...props }) {
  // Hooks must run unconditionally at the top level (react/rules-of-hooks).
  const autoId = useId()
  const fieldId = id || autoId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  // Point `aria-describedby` at whichever helper is actually rendered: the error
  // when present, otherwise the hint. `cn` drops the falsy branch and yields ''
  // when neither applies, which we normalise to `undefined` so the attribute is
  // omitted entirely rather than emitted empty.
  const describedBy = cn(error && errorId, hint && !error && hintId) || undefined

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Inline row — the checkbox's one divergence from the stacked field
          layout. `min-h-11` here (and on the label below) guarantees a ≥44px
          interactive band around the 20px painted box. */}
      <div className="flex min-h-11 items-center gap-3">
        <input
          id={fieldId}
          ref={ref}
          type="checkbox"
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            // The control is the PLATFORM widget, tinted with a brand token through
            // `accent-color`. The sibling fields' `rounded-md border border-border
            // bg-white` is deliberately NOT repeated here: with `appearance: auto`
            // the user agent paints the checkbox itself and discards author
            // `border`, `border-radius` and `background-color` on it (measured in
            // Chrome: computed border-width 0px, border-radius 0px), so those
            // classes would be dead CSS on this element. `shadow-sm` IS honoured —
            // box-shadow still paints on a native checkbox — so the field family's
            // resting elevation carries over.
            'peer h-5 w-5 shrink-0 cursor-pointer shadow-sm accent-primary-600',
            'focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Error affordance, for the same reason: a Tailwind `ring` is a
            // box-shadow, which the user agent DOES paint on a native checkbox, so
            // `ring-1 ring-secondary-600` delivers the very same 1px orange edge the
            // sibling fields get from `border-secondary-600` (and it thickens to the
            // 2px ring on focus) instead of silently having no effect.
            error && 'ring-1 ring-secondary-600 accent-secondary-700 focus-visible:ring-secondary-600',
            inputClassName,
          )}
          {...props}
        />
        {label ? (
          <label
            htmlFor={fieldId}
            className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center break-words text-sm font-medium text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
          >
            {label}
            {required ? <span className="ml-1 text-secondary-600" aria-hidden="true">*</span> : null}
          </label>
        ) : null}
      </div>
      {hint && !error ? <p id={hintId} className="text-xs text-muted">{hint}</p> : null}
      {error ? <p id={errorId} role="alert" className="text-xs font-medium text-secondary-700">{error}</p> : null}
    </div>
  )
}

export default Checkbox
