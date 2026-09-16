/**
 * AdmissionFormSteps — the per-step FIELD GROUPS of the six-step admission
 * enquiry flow for the CIBLE School of Language SPA (AAP §0.9.1 Group 3, F5).
 * ----------------------------------------------------------------------------
 * This module holds nothing but the field groups of each step. Every other
 * concern of the flow stays where it already lives, in `AdmissionForm.jsx`:
 * the current-step state, the `Stepper`, the per-step `trigger()` validation,
 * the focus move on each transition, the polite announcement region, the submit
 * controls, the privacy / under-18 disclosure, the outbound draft dispatch and
 * all four honest result states (`idle` | `opened` | `blocked` | `error`).
 * Keeping that boundary is what makes the extraction reviewable: no component
 * here owns step state, calls `trigger`, renders a Back/Next control, reads
 * `siteConfig`, or knows how the enquiry is dispatched.
 *
 * There is DELIBERATELY NO COMPONENT FOR STEP 6 (Confirmation). Step 6 *is* the
 * existing `opened` result panel in `AdmissionForm.jsx` — the panel that says a
 * pre-filled draft was opened and has not been sent yet. It is a stage of the
 * sequence rather than a field group, so it stays in that file with its focus
 * handling and its recovery links. Do not "complete the set" by adding a sixth
 * component here.
 *
 * ── EXPORT SHAPE — READ BEFORE EDITING ─────────────────────────────────────
 * This module exports COMPONENTS ONLY, as five NAMED exports, and NO default:
 *   GoalStep · CourseStep · DetailsStep · ContactMethodStep · ReviewStep
 * Every helper, option list and class constant below is module-local and must
 * stay unexported, so the enforced `react/only-export-components` lint rule
 * (a warning against a measured zero-finding baseline) stays green. The single
 * consumer is `src/components/forms/AdmissionForm.jsx`; nothing else may import
 * this module, which is why the extraction is invisible from
 * `src/pages/Admission.jsx` — that page still imports `AdmissionForm` and still
 * passes its `defaultCourse` prop, untouched.
 *
 * ── WHY `CourseStep` TAKES ITS OPTIONS AS PROPS ────────────────────────────
 * `courseOptions`, `courseTitles`, `batchOptions` and `batchValues` are derived
 * ONCE in `AdmissionForm.jsx` from `src/data/courses.js`, and they are
 * module-local and deliberately NOT exported there so that file keeps its
 * single default export. This module therefore cannot import them and must not
 * cause them to be exported: it receives them as props instead. `goals`, by
 * contrast, is a plain data module with a named export, so step one imports it
 * directly.
 *
 * ── THE FIELD CONTRACT IS INHERITED, NEVER RESTATED ────────────────────────
 * `Input`, `Select`, `Textarea` and `RadioGroup` each own their own `useId`
 * label association, `aria-invalid` (set only when an error exists, never to
 * `false`), `aria-describedby` (the error when present, the hint otherwise),
 * `role="alert"` error message and decorative required marker. Consequently
 * every field below does exactly two things — passes `error={errors.x?.message}`
 * and spreads `{...register('x', rules)}` (React 19 ref-as-prop carries RHF's
 * `ref`/`onChange`/`onBlur`/`name` through) — and writes NO `aria-invalid`, no
 * `aria-describedby`, no `role="alert"` and no error paragraph of its own. A
 * second field contract is precisely what must not exist.
 *
 * Validation rules come from `src/lib/validators.js` unchanged; the two
 * single-select steps are `oneOfRule` CALL SITES, not new rules. No network
 * call, no dispatch and no manufactured `submitting` state exists in this file.
 *
 * ── STRUCTURE AND ACCESSIBILITY ────────────────────────────────────────────
 * - Each of the four field steps is a real `<fieldset>` whose `<legend>` is the
 *   step heading: a step is a logical group of controls, and fieldset/legend is
 *   how the platform conveys that. `ReviewStep` collects nothing, so it uses an
 *   `<h3>` inside a plain wrapper rather than a fieldset grouping no controls.
 * - Every step exposes a `headingRef` focus target carrying `tabIndex={-1}`
 *   (the `<legend>`, or the `<h3>`), so `AdmissionForm.jsx` can move focus to
 *   the new step on every transition and never strand it on an unmounted
 *   Back/Next control. The target is not interactive, so — matching the result
 *   panels already in `AdmissionForm.jsx` — it suppresses the global focus ring
 *   with `focus-visible:outline-none` instead of painting a ring on a heading.
 * - Steps 1 and 4 nest `RadioGroup`'s own fieldset inside the step's fieldset,
 *   which is valid HTML and exactly the sub-grouping case nested fieldsets
 *   exist for. The two legends therefore carry DIFFERENT text — the outer names
 *   the stage, the inner asks the question — so nothing is announced twice.
 * - Heading depth: `src/pages/Admission.jsx` owns the page `<h1>` and the
 *   "Admission Form" `<h2>` above the form, so the review heading is an `<h3>`
 *   and its group titles are `<h4>`; no level is skipped and no `h1`/`h2` is
 *   emitted here. A `<legend>` carries group semantics rather than a heading
 *   level, so it contributes nothing to that outline.
 * - Single selection, arrow-key traversal and the group label come from native
 *   radios via `RadioGroup`; the two dropdowns are native `<select>`s. No ARIA
 *   role, no custom listbox and no key handler is introduced anywhere here.
 * - Every actionable target is the canonical `Button` (44px floor in its base
 *   class); the radio rows get their 44px hit area from `RadioGroup`.
 *
 * ── VERIFIED RUNTIME NOTE FOR THE PARENT (not a defect of this module) ─────
 * Measured in both dev and a production build: a field error renders in normal
 * flow inside the primitive's own field wrapper and occupies exactly 24px (a
 * 16px line plus the wrapper's 8px gap). Because a control row placed AFTER the
 * step inside the same flex column is a later sibling, that row translates by
 * those 24px the moment an error appears or clears — and a Next press that
 * itself clears the error (mousedown blurs the field, `onTouched` revalidates,
 * the error is removed) moves the button out from under the pointer, so that
 * first click retargets to the container and is lost. The step groups author no
 * error markup and own no control row, so the mitigation belongs to whoever
 * owns one of those two: reserve the error line's space in the field primitive,
 * or keep the control row out of the shifting flow.
 *
 * ── DESIGN SYSTEM ──────────────────────────────────────────────────────────
 * Classes compose through `cn()` only, from existing `@theme` tokens and stock
 * utilities — no arbitrary bracket value, no new token, no new utility, so
 * `src/index.css` needs no diff. Type steps are the established ones: step
 * headings `text-lg font-semibold`, body copy `text-sm leading-relaxed
 * text-muted`, meta rows `text-xs text-muted`. The field layout reuses the
 * form's own verified `grid gap-6 sm:grid-cols-2` pattern with the multi-line
 * field full width beneath, and no step sets a width of its own so the page's
 * `max-w-2xl` measure governs at every viewport.
 * ----------------------------------------------------------------------------
 */

import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import Textarea from '../ui/Textarea.jsx'
import RadioGroup from '../ui/RadioGroup.jsx'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'
import {
  nameRules,
  emailRules,
  phoneRules,
  messageRules,
  oneOfRule,
  MAX_LENGTHS,
} from '../../lib/validators.js'
import { goals } from '../../data/goals.js'

// ---------------------------------------------------------------------------
// Module-local constants. NONE of these is exported (see the export-shape note
// in the header): they are structural UI label sets and class recipes, not a
// content structure, and keeping them unexported is what keeps this module
// components-only.
// ---------------------------------------------------------------------------

// Step one's options, derived ONCE from the single source of truth. The `value`
// is the goal `id` — a public contract that appears in URLs and inside
// `course.goals`, so it is never invented, renamed or reordered here — while the
// visitor reads the `label`, and `description` becomes the option's own hint
// (RadioGroup associates it with that radio through its `aria-describedby`).
const GOAL_OPTIONS = goals.map((goal) => ({
  value: goal.id,
  label: goal.label,
  description: goal.description,
}))

// The allowlist handed to `oneOfRule`, so a tampered or stale <input value> can
// never be submitted.
const GOAL_IDS = goals.map((goal) => goal.id)

// id → label, so the review step can show "Improve Spoken English" rather than
// the internal `improve-spoken-english`.
const GOAL_LABEL_BY_ID = new Map(goals.map((goal) => [goal.id, goal.label]))

// Step four's two channels. These two VALUES are a contract with
// `AdmissionForm.jsx`, which passes the chosen one straight through as the
// dispatch channel, so they are spelled exactly `whatsapp` and `email`.
//
// The descriptions are deliberately honest about the handoff: choosing a
// channel opens a PRE-FILLED DRAFT in the visitor's own app for them to review
// and send. Nothing is transmitted by this website, and no copy here may imply
// otherwise — it mirrors the disclosure `AdmissionForm.jsx` already carries
// beside its submit controls.
const CHANNEL_OPTIONS = [
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    description: 'Opens WhatsApp with your enquiry pre-filled, ready for you to review and send.',
  },
  {
    value: 'email',
    label: 'Email',
    description: 'Opens your email app with your enquiry pre-filled, ready for you to review and send.',
  },
]

const CHANNEL_VALUES = CHANNEL_OPTIONS.map((option) => option.value)

const CHANNEL_LABEL_BY_VALUE = new Map(CHANNEL_OPTIONS.map((option) => [option.value, option.label]))

// Shared class recipes, so the four field steps cannot drift apart.
// `min-w-0` is not cosmetic: a `<fieldset>` carries a UA `min-width:
// min-content` that Tailwind's preflight does not reset, which would push the
// form wider than a 320px viewport around a long option label or course title.
// (Margin, padding and border need no reset — preflight already zeroes them
// through its universal selector, so no reset utility is added here.)
const STEP_ROOT = 'min-w-0'

// The step heading — the `<legend>` on the four field steps, the `<h3>` on the
// review step. It is also the programmatic focus target, hence the suppressed
// ring; see the accessibility note in the header.
const STEP_HEADING = 'text-lg font-semibold text-foreground focus-visible:outline-none'

// One short, honest sentence per step. No promise, no figure, no timeline.
const STEP_INTRO = 'mt-2 text-sm leading-relaxed text-muted'

// The form's own verified two-column field layout.
const FIELD_GRID = 'mt-6 grid gap-6 sm:grid-cols-2'

/**
 * Step 1 of 6 — the visitor's learning goal.
 *
 * The step's own `<fieldset>`/`<legend>` names the stage; the nested
 * `RadioGroup` asks the question in the user's own wording. Selection,
 * mutual exclusion and arrow-key traversal are native radio behaviour.
 *
 * @param {object} props
 * @param {(name: string, rules?: object) => object} props.register - react-hook-form's `register`, spread onto the group so its `name`/`onChange`/`onBlur`/`ref` reach every radio.
 * @param {Record<string, {message?: string}>} [props.errors] - react-hook-form's `formState.errors`; only `errors.goal` is read.
 * @param {import('react').Ref<HTMLLegendElement>} [props.headingRef] - Attached to the `<legend>` so the parent form can focus this step on entry.
 * @param {string} [props.className] - Extra classes for the step `<fieldset>`, merged LAST.
 * @returns {import('react').ReactElement} The learning-goal field group.
 */
export function GoalStep({ register, errors, headingRef, className }) {
  return (
    <fieldset className={cn(STEP_ROOT, className)}>
      <legend ref={headingRef} tabIndex={-1} className={STEP_HEADING}>
        Your learning goal
      </legend>
      <p className={STEP_INTRO}>
        Telling us what you want to achieve helps our team point you to the courses that fit your goal.
      </p>

      <RadioGroup
        className="mt-6"
        legend="What is your main goal?"
        required
        options={GOAL_OPTIONS}
        error={errors?.goal?.message}
        {...register('goal', oneOfRule(GOAL_IDS, 'Please choose your main goal'))}
      />
    </fieldset>
  )
}

/**
 * Step 2 of 6 — course and preferred batch.
 *
 * Batch sits with course because a preferred batch is part of choosing a
 * course. Both option lists and both allowlists arrive as props because they
 * are module-local and deliberately unexported in `AdmissionForm.jsx` (see the
 * header note) — this component must never reach for them by import.
 *
 * `Select`'s `placeholder` renders a disabled, empty-value first option, so an
 * untouched required course select submits `''` and fails validation; no extra
 * guard is added here.
 *
 * @param {object} props
 * @param {(name: string, rules?: object) => object} props.register - react-hook-form's `register`.
 * @param {Record<string, {message?: string}>} [props.errors] - `formState.errors`; `errors.course` and `errors.batch` are read.
 * @param {import('react').Ref<HTMLLegendElement>} [props.headingRef] - Focus target for this step.
 * @param {Array<{value: string, label: import('react').ReactNode}>} [props.courseOptions] - Course `<option>` data, derived in the parent from `src/data/courses.js`.
 * @param {string[]} [props.courseTitles] - Allowlist of valid course titles for `oneOfRule`.
 * @param {Array<{value: string, label: import('react').ReactNode}>} [props.batchOptions] - Preferred-batch `<option>` data from the parent.
 * @param {string[]} [props.batchValues] - Allowlist of valid batch values for `oneOfRule`.
 * @param {string} [props.className] - Extra classes for the step `<fieldset>`, merged LAST.
 * @returns {import('react').ReactElement} The course and batch field group.
 */
export function CourseStep({
  register,
  errors,
  headingRef,
  courseOptions,
  courseTitles,
  batchOptions,
  batchValues,
  className,
}) {
  return (
    <fieldset className={cn(STEP_ROOT, className)}>
      <legend ref={headingRef} tabIndex={-1} className={STEP_HEADING}>
        Course and batch
      </legend>
      <p className={STEP_INTRO}>
        Choose the course you are interested in, and the batch timing that suits you best. The batch is optional.
      </p>

      <div className={FIELD_GRID}>
        <Select
          label="Course of Interest"
          required
          placeholder="Select a course"
          options={courseOptions}
          error={errors?.course?.message}
          {...register('course', oneOfRule(courseTitles, 'Please select a course'))}
        />
        <Select
          label="Preferred Batch"
          placeholder="Select a batch (optional)"
          options={batchOptions}
          error={errors?.batch?.message}
          {...register('batch', oneOfRule(batchValues, 'Select a valid batch', { required: false }))}
        />
      </div>
    </fieldset>
  )
}

/**
 * Step 3 of 6 — the visitor's own details, plus the optional notes.
 *
 * The three identifying fields sit in the form's verified
 * `grid gap-6 sm:grid-cols-2` layout and the multi-line notes field spans the
 * full width beneath it, exactly as the single-step form rendered them.
 *
 * `message` is OPTIONAL and stays that way. It is not decoration: it is part of
 * the parent's `defaultValues` and its outbound draft emits it as `Notes:`,
 * dropped when empty — so removing it would shorten the enquiry the institute
 * receives. It belongs on this step because notes about yourself belong with
 * your details.
 *
 * @param {object} props
 * @param {(name: string, rules?: object) => object} props.register - react-hook-form's `register`.
 * @param {Record<string, {message?: string}>} [props.errors] - `formState.errors`; `fullName`, `phone`, `email` and `message` are read.
 * @param {import('react').Ref<HTMLLegendElement>} [props.headingRef] - Focus target for this step.
 * @param {string} [props.className] - Extra classes for the step `<fieldset>`, merged LAST.
 * @returns {import('react').ReactElement} The personal-details field group.
 */
export function DetailsStep({ register, errors, headingRef, className }) {
  return (
    <fieldset className={cn(STEP_ROOT, className)}>
      <legend ref={headingRef} tabIndex={-1} className={STEP_HEADING}>
        Your details
      </legend>
      <p className={STEP_INTRO}>
        These go into your enquiry draft so our team can reply to you. Notes are optional.
      </p>

      <div className={FIELD_GRID}>
        <Input
          label="Full Name"
          type="text"
          required
          autoComplete="name"
          maxLength={MAX_LENGTHS.name}
          error={errors?.fullName?.message}
          {...register('fullName', nameRules('Please enter your full name'))}
        />
        <Input
          label="Phone Number"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel"
          maxLength={MAX_LENGTHS.phone}
          error={errors?.phone?.message}
          {...register('phone', phoneRules)}
        />
        <Input
          label="Email Address"
          type="email"
          required
          autoComplete="email"
          maxLength={MAX_LENGTHS.email}
          error={errors?.email?.message}
          {...register('email', emailRules)}
        />
      </div>

      <Textarea
        className="mt-6"
        label="Message / Notes"
        rows={4}
        placeholder="Tell us anything else (optional)"
        maxLength={MAX_LENGTHS.message}
        error={errors?.message?.message}
        {...register('message', messageRules({ required: false }))}
      />
    </fieldset>
  )
}

/**
 * Step 4 of 6 — which app the pre-filled draft should open in.
 *
 * The outer legend names the stage and the nested `RadioGroup` legend asks the
 * question, so the two levels never repeat each other. The chosen value is what
 * `AdmissionForm.jsx` hands to its dispatch as the channel, so the allowlist is
 * exactly `whatsapp` and `email`.
 *
 * @param {object} props
 * @param {(name: string, rules?: object) => object} props.register - react-hook-form's `register`, spread onto the group.
 * @param {Record<string, {message?: string}>} [props.errors] - `formState.errors`; only `errors.channel` is read.
 * @param {import('react').Ref<HTMLLegendElement>} [props.headingRef] - Focus target for this step.
 * @param {string} [props.className] - Extra classes for the step `<fieldset>`, merged LAST.
 * @returns {import('react').ReactElement} The contact-channel field group.
 */
export function ContactMethodStep({ register, errors, headingRef, className }) {
  return (
    <fieldset className={cn(STEP_ROOT, className)}>
      <legend ref={headingRef} tabIndex={-1} className={STEP_HEADING}>
        How to send your enquiry
      </legend>
      <p className={STEP_INTRO}>
        Both options open a draft in your own app with your details filled in, so you can read it before sending.
        Nothing is sent from this website until you press send there.
      </p>

      <RadioGroup
        className="mt-6"
        legend="Preferred contact method"
        required
        options={CHANNEL_OPTIONS}
        error={errors?.channel?.message}
        {...register('channel', oneOfRule(CHANNEL_VALUES, 'Please choose how to send your enquiry'))}
      />
    </fieldset>
  )
}

// ---------------------------------------------------------------------------
// Review-step model. Module-local (NOT exported).
// ---------------------------------------------------------------------------

// Shown in place of a blank row when an optional field was left empty, so the
// review explains the gap instead of rendering an unexplained empty value.
const NOT_SPECIFIED = 'Not specified'

/**
 * Normalise a raw react-hook-form value into trimmed display text.
 *
 * A missing field must never reach the screen as the literal "undefined" or
 * "null", so anything absent collapses to an empty string, which the row then
 * renders as {@link NOT_SPECIFIED}.
 *
 * @param {unknown} value - Raw value read from the form state.
 * @returns {string} Trimmed text, or `''` when there is nothing to show.
 */
const asText = (value) => {
  if (typeof value === 'string') return value.trim()
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/**
 * The review groups, mirroring steps 1-4 in order. Each row resolves its own
 * display text from the form values, which is where a stored identifier becomes
 * a human label: `goal` and `channel` are looked up rather than printed, so a
 * visitor never sees an internal id such as `improve-spoken-english`. An
 * unrecognised id cannot pass its step's `oneOfRule` allowlist, so it can only
 * arise from tampering and resolves to `''` — rendered as "Not specified"
 * rather than as an internal string.
 *
 * `step` is the 1-BASED step number handed back to `onEditStep`, matching the
 * flow's stage numbering: 1 Goal · 2 Course · 3 Details · 4 Contact method
 * (5 Review · 6 Confirmation).
 *
 * @type {Array<{step: number, title: string, editLabel: string, rows: Array<{key: string, label: string, resolve: (values: Record<string, unknown>) => string}>}>}
 */
const REVIEW_GROUPS = [
  {
    step: 1,
    title: 'Your learning goal',
    editLabel: 'Change your learning goal',
    rows: [
      {
        key: 'goal',
        label: 'Main goal',
        resolve: (values) => GOAL_LABEL_BY_ID.get(asText(values.goal)) ?? '',
      },
    ],
  },
  {
    step: 2,
    title: 'Course and batch',
    editLabel: 'Change course and batch',
    rows: [
      { key: 'course', label: 'Course of Interest', resolve: (values) => asText(values.course) },
      { key: 'batch', label: 'Preferred Batch', resolve: (values) => asText(values.batch) },
    ],
  },
  {
    step: 3,
    title: 'Your details',
    editLabel: 'Change your details',
    rows: [
      { key: 'fullName', label: 'Full Name', resolve: (values) => asText(values.fullName) },
      { key: 'phone', label: 'Phone Number', resolve: (values) => asText(values.phone) },
      { key: 'email', label: 'Email Address', resolve: (values) => asText(values.email) },
      { key: 'message', label: 'Message / Notes', resolve: (values) => asText(values.message) },
    ],
  },
  {
    step: 4,
    title: 'How to send your enquiry',
    editLabel: 'Change how to send your enquiry',
    rows: [
      {
        key: 'channel',
        label: 'Preferred contact method',
        resolve: (values) => CHANNEL_LABEL_BY_VALUE.get(asText(values.channel)) ?? '',
      },
    ],
  },
]

/**
 * Step 5 of 6 — a read-only review of everything entered.
 *
 * This step collects nothing, so it renders NO form control and uses an `<h3>`
 * focus target instead of a `<fieldset>` that would group no fields. Each group
 * mirrors one earlier step and carries a "Change" control back to it: the
 * visible word stays short so it cannot wrap out of its 44px button at 320px,
 * while `aria-label` names the group, so a screen-reader user hears four
 * distinct controls ("Change your details", "Change course and batch", …)
 * rather than four identical ones. Moving focus to that step's first control
 * after the jump is `AdmissionForm.jsx`'s responsibility, not this component's.
 *
 * The privacy / under-18 disclosure and the submit controls deliberately live
 * in `AdmissionForm.jsx` beside the submit action and are NOT duplicated here.
 *
 * @param {object} props
 * @param {import('react').Ref<HTMLHeadingElement>} [props.headingRef] - Focus target for this step.
 * @param {Record<string, unknown>} [props.values] - The current form values (react-hook-form's `getValues()`); a missing object renders every row as "Not specified" rather than throwing.
 * @param {(step: number) => void} [props.onEditStep] - Called with the 1-BASED step number (1 Goal · 2 Course · 3 Details · 4 Contact method) when a "Change" control is activated.
 * @param {string} [props.className] - Extra classes for the wrapper, merged LAST.
 * @returns {import('react').ReactElement} The read-only review summary.
 */
export function ReviewStep({ headingRef, values, onEditStep, className }) {
  // Tolerate a missing/!object `values` instead of throwing inside render: each
  // row then resolves to '' and reads "Not specified", which is honest.
  const entered = values && typeof values === 'object' ? values : {}

  return (
    <div className={cn(STEP_ROOT, className)}>
      <h3 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>
        Review your enquiry
      </h3>
      <p className={STEP_INTRO}>
        Check your details before your draft opens. Use a change control to correct anything.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {REVIEW_GROUPS.map((group) => (
          <div key={group.step} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={group.editLabel}
                onClick={() => onEditStep?.(group.step)}
              >
                Change
              </Button>
            </div>

            <dl className="mt-3 flex flex-col divide-y divide-border">
              {group.rows.map((row) => {
                const text = row.resolve(entered)
                const provided = text !== ''

                return (
                  <div key={row.key} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                    <dt className="text-xs text-muted sm:w-40 sm:shrink-0">{row.label}</dt>
                    <dd className={cn('min-w-0 break-words text-sm', provided ? 'text-foreground' : 'text-muted')}>
                      {provided ? text : NOT_SPECIFIED}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}

