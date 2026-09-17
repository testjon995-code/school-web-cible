/**
 * AdmissionForm — the primary admission-inquiry conversion surface for the CIBLE
 * School of Language SPA, rendered as a SIX-STEP guided flow (AAP §0.9.3, F5):
 * 1 Goal · 2 Course · 3 Personal details · 4 Preferred contact method ·
 * 5 Review · 6 Confirmation.
 *
 * A single functional component (DEFAULT export) that owns the FLOW and nothing
 * else: the current step, the `Stepper`, the per-step `trigger()` validation,
 * the focus move on every transition, the polite step announcement, the control
 * row, the privacy disclosure, the outbound dispatch and the four honest result
 * states. Three collaborators own the rest, so nothing here is duplicated:
 *   • `./AdmissionFormSteps.jsx` — the per-step FIELD GROUPS (`GoalStep`,
 *     `CourseStep`, `DetailsStep`, `ContactMethodStep`, `ReviewStep`), each a
 *     real `<fieldset>`/`<legend>` composing the canonical `ui/*` primitives.
 *     Its option lists arrive as PROPS from this file, because the allowlists
 *     below are module-local and deliberately unexported (see the note there).
 *   • `../../lib/enquiry.js` — composing the draft body, clamping it, encoding
 *     it and opening the channel. This file stays the reader of `siteConfig`
 *     and passes the endpoints in; that module imports no configuration.
 *   • `../../lib/states.js` — the ONE authority for each dispatch state's
 *     label, icon and target-specific variant, consumed through
 *     `dispatchState(status)`. There is deliberately no second mapping here.
 * Step 6 is NOT a field group: the confirmation IS the `opened` result panel
 * below, so it is a stage of the sequence rather than something bolted outside
 * it. Accordingly `step` only ever holds 1–5; step 6 is `status === 'opened'`.
 *
 * ONE FORM INSTANCE, SIX STEPS. All stages sit on the single `useForm` call
 * below, and `shouldUnregister: false` is what makes that possible without a
 * second state container: values stay in the react-hook-form store when a step
 * unmounts, so moving back from step 5 to step 2 and forward again retains
 * every entry, and the result panels can still read them. Do not remove it.
 *
 * Because the site is client-only with NO backend (AAP §0.6.1), a submission
 * does not POST anywhere: it opens a PRE-FILLED WhatsApp deep link or a
 * `mailto:` draft — whichever the visitor chose at step 4 — composed from the
 * field values. Every contact endpoint is read from `siteConfig`; nothing is
 * hardcoded, and there is no fetch, XHR, socket, session or payment path.
 *
 * Truthful handoff (M04): opening a pre-filled draft is NOT a send. The flow
 * therefore never claims the inquiry was received. After the draft opens it
 * shows a "ready to send" confirmation that tells the visitor to press Send in
 * their messaging app, keeps their typed values (no `reset()`, so recovery data
 * survives), and offers a directly clickable link to re-open the same
 * pre-filled draft. If the browser blocks the WhatsApp tab, a `role="alert"`
 * recovery panel surfaces that pre-filled link, the same enquiry as an email
 * draft, and the direct phone number instead of a false success.
 *
 * No manufactured latency (M05): `dispatchEnquiry` is AWAITED but it is CALLED
 * synchronously inside the submit handler — it composes the URL and opens the
 * channel in that first synchronous run, inside the user gesture, so the tab is
 * not popup-blocked; only the outcome handling is deferred to a microtask.
 * Deferring the call itself (a timer, a `.then()` chain, an `await` in front of
 * it) would cost the gesture. There is no artificial delay, no network call and
 * deliberately NO `submitting` state — the site cannot be pending on anything.
 * A `submittingRef` guards against a double-submit dispatching two drafts and
 * remains the single gate on reaching the dispatch module.
 *
 * Bounded, allow-listed input (M06): field values are trimmed, character- and
 * length-constrained by the shared rules in `lib/validators.js` (name pattern,
 * email/phone validation, goal/course/batch/channel allowlists) and carry
 * native `maxLength` caps inside the step groups. Each payload field carries its
 * own `MAX_LENGTHS` cap so the shared per-field clamp in `lib/enquiry.js`
 * reproduces the previous body line for line, and that module applies the
 * total-channel clamp once as it composes the URL.
 *
 * Privacy at the point of handoff (M07): the disclosure explaining that the
 * entered details are passed to WhatsApp/Meta or the visitor's email provider
 * under their terms, that CIBLE only receives them when the visitor presses
 * Send, and asking under-18 visitors to involve a parent/guardian, sits on the
 * REVIEW step — which is where the submit control now lives — and still links
 * to the Privacy Policy.
 *
 * Course sync (M24): when the `defaultCourse` prop changes (e.g. navigating
 * from `/admission?course=X` to `/admission`), the "Course of Interest" value
 * is reset to the new validated course (or cleared), so a stale selection can
 * never be submitted for the wrong course.
 *
 * Accessibility (WCAG AA): every field has a programmatic `<label>` and every
 * step a real `<legend>` (both owned by the collaborators above); invalid
 * fields expose `aria-invalid` + a `role="alert"` message, and a failed step
 * moves focus to the first invalid control (react-hook-form's `shouldFocus`)
 * while a visible step summary names everything outstanding. Every transition
 * moves focus deliberately — to the new step's heading, or to the step's first
 * control when the visitor jumped there from the review — so focus is never
 * stranded on an unmounted control, and no focus is stolen on first paint. The
 * step position is announced by this form's own polite region (never by the
 * shell's title announcer) on top of the `Stepper`'s `aria-current` and its
 * visually hidden state text. Result panels programmatically receive focus.
 * Icons are `aria-hidden` because the adjacent text conveys the meaning.
 *
 * @param {object} [props] Component props.
 * @param {string} [props.className] Extra classes merged LAST onto the root
 *   element so pages can place the form in different layouts.
 * @param {string} [props.defaultCourse] Optional course TITLE used to preselect
 *   the “Course of Interest” select (e.g. when opened from a course page). It is
 *   validated against the known course list; an unknown value is ignored.
 * @returns {import('react').ReactElement} The six-step admission inquiry flow,
 *   or the "ready to send" confirmation once a pre-filled draft has been opened.
 */
import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { FaWhatsapp, FaEnvelope } from 'react-icons/fa'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import Stepper from '../ui/Stepper.jsx'
import {
  GoalStep,
  CourseStep,
  DetailsStep,
  ContactMethodStep,
  ReviewStep,
} from './AdmissionFormSteps.jsx'
import { cn } from '../../lib/cn.js'
import { buildMessage, dispatchEnquiry, emailDraftUrl } from '../../lib/enquiry.js'
import { dispatchState } from '../../lib/states.js'
import { MAX_LENGTHS } from '../../lib/validators.js'
import { siteConfig } from '../../data/siteConfig.js'
import { courses } from '../../data/courses.js'
import { goals } from '../../data/goals.js'

// Preferred-batch options. Module-local (NOT exported) so the module exposes
// only the default component export and stays clean under the enforced
// `react/only-export-components` lint rule. `CourseStep` receives this — and the
// three derived lists below — as props precisely because they are unexported.
const batchOptions = [
  { value: 'Morning', label: 'Morning' },
  { value: 'Afternoon', label: 'Afternoon' },
  { value: 'Evening', label: 'Evening' },
  { value: 'Weekend', label: 'Weekend' },
]

// Allowlists derived ONCE from the single sources of truth so `oneOfRule` can
// reject a tampered/stale <option> (M06) and the M24 course-sync effect can
// validate `defaultCourse`. Module-local (NOT exported); stable across renders.
const courseTitles = courses.map((c) => c.title)
const courseOptions = courseTitles.map((title) => ({ value: title, label: title }))
const batchValues = batchOptions.map((o) => o.value)

// Subject line for the mailto: channel. Module-local (NOT exported). It is a
// REQUIRED member of the enquiry payload rather than something the dispatch
// module derives, because the two forms compose their subjects differently and
// neither can be reconstructed from the body heading.
const EMAIL_SUBJECT = 'Admission Inquiry — CIBLE School of Language'

// The six stages, in the user's order and wording, as the `Stepper` consumes
// them (an array of label strings). This is UI structure — the same kind of
// module-local constant as `batchOptions` — not a content structure, so it does
// not belong in `src/data/`. Module-local (NOT exported).
const STEP_LABELS = [
  'Goal',
  'Course',
  'Personal details',
  'Preferred contact method',
  'Review',
  'Confirmation',
]
const TOTAL_STEPS = STEP_LABELS.length
const FIRST_STEP = 1
// The last NAVIGABLE step: `step` never holds 6, because the confirmation is
// the `opened` result panel rather than a step the visitor walks into.
const REVIEW_STEP = 5
const CONFIRMATION_STEP = 6

// The fields each stage collects, indexed by `step - 1`. This drives three
// things from one declaration: which names `trigger()` validates before the
// flow advances, which messages the step summary lists, and which control
// receives focus when the visitor jumps back from the review. Step 5 collects
// nothing. Module-local (NOT exported).
const FIELDS_BY_STEP = [
  ['goal'], //                                  1 · Goal
  ['course', 'batch'], //                       2 · Course (batch is optional)
  ['fullName', 'phone', 'email', 'message'], // 3 · Personal details (notes optional)
  ['channel'], //                               4 · Preferred contact method
  [], //                                        5 · Review collects nothing
]

// The steps that own at least one field, for the defensive whole-form
// validation path (see `handleInvalidSubmit`).
const FIELD_STEPS = [1, 2, 3, 4]

/**
 * The field names collected by a given 1-based step.
 *
 * @param {number} step - A 1-based step number.
 * @returns {string[]} The step's field names, or `[]` for a step that collects
 *   nothing (or an out-of-range value).
 */
const fieldsForStep = (step) => FIELDS_BY_STEP[step - 1] ?? []

/**
 * Compose the channel-independent enquiry payload from the validated values.
 *
 * The first six entries keep the exact labels and the exact order the
 * single-step form emitted, and each carries its own `MAX_LENGTHS` cap so the
 * shared per-field clamp reproduces the previous body line for line (M06);
 * `buildMessage` renders `` `${label}: ${value}` `` and DROPS a line whose value
 * is empty, which is what preserved the old `filter(Boolean)` behaviour for the
 * optional batch and notes. The goal is APPENDED last — a strict addition, so a
 * prefix comparison against the previous body still holds — because a question
 * the flow asks whose answer never reaches the institute would be a mockup
 * rather than a feature. Its stored value is a kebab-case id, so it is resolved
 * to the goal's display label: a human reads this message.
 *
 * @param {Record<string, string>} data - Validated react-hook-form values.
 * @returns {import('../../lib/enquiry.js').EnquiryPayload} The enquiry payload.
 */
const buildPayload = (data) => ({
  heading: 'New Admission Inquiry — CIBLE School of Language',
  fields: [
    { label: 'Name', value: data.fullName, max: MAX_LENGTHS.name },
    { label: 'Phone', value: data.phone, max: MAX_LENGTHS.phone },
    { label: 'Email', value: data.email, max: MAX_LENGTHS.email },
    { label: 'Course', value: data.course, max: MAX_LENGTHS.subject },
    { label: 'Preferred Batch', value: data.batch, max: MAX_LENGTHS.subject },
    { label: 'Notes', value: data.message, max: MAX_LENGTHS.message },
    {
      label: 'Goal',
      value: goals.find((goal) => goal.id === data.goal)?.label ?? '',
      max: MAX_LENGTHS.subject,
    },
  ],
  emailSubject: EMAIL_SUBJECT,
})

function AdmissionForm({ className, defaultCourse } = {}) {
  // --- Hooks: ALL declared at the top level, before anything conditional, so
  // react/rules-of-hooks holds. The form instance is the SAME one the
  // single-step form used; only the destructure is wider.
  const {
    register,
    handleSubmit,
    setValue,
    // `trigger` validates one step at a time; `setFocus` lands focus on a
    // step's first control after a jump from the review; `getValues` feeds the
    // read-only review and the blocked panel's recovery link; `watch` keeps the
    // submit control's label honest about which app is about to open.
    trigger,
    setFocus,
    getValues,
    watch,
    formState: { errors },
  } = useForm({
    mode: 'onTouched',
    // Keep field values in the RHF store when inputs unmount — which now
    // happens on EVERY step change, not just when a result panel replaces the
    // form — so moving back and forward preserves every entry (M04).
    shouldUnregister: false,
    defaultValues: {
      goal: '',
      course: courseTitles.includes(defaultCourse) ? defaultCourse : '',
      batch: '',
      fullName: '',
      phone: '',
      email: '',
      message: '',
      // Deliberately EMPTY rather than pre-selecting WhatsApp: this choice
      // decides which of the visitor's own apps their details are handed to, so
      // it is theirs to make. It also keeps step four's required `oneOfRule`
      // reachable instead of permanently satisfied by a default.
      channel: '',
    },
  })

  // The visitor's position in the flow, 1..5 (see REVIEW_STEP).
  const [step, setStep] = useState(FIRST_STEP)
  // What this form's own polite region announces. Empty on first paint, so
  // nothing is announced before the visitor has moved.
  const [announcement, setAnnouncement] = useState('')
  // Whether the current step's outstanding answers are listed. Set only by a
  // FAILED advance, so the summary is a response to an attempt rather than
  // something that appears while the visitor is still typing.
  const [showStepSummary, setShowStepSummary] = useState(false)

  // Four honest states: 'idle'(the flow) | 'opened'(draft opened, awaiting the
  // user's Send — step 6) | 'blocked'(browser blocked the WhatsApp tab —
  // recoverable) | 'error'. There is deliberately NO 'submitting' state (M05).
  const [status, setStatus] = useState('idle')
  // The fully pre-filled deep link we last opened, stashed so both the 'opened'
  // and 'blocked' panels can offer a directly clickable link to (re-)open it.
  const [draftUrl, setDraftUrl] = useState('')
  const [draftChannel, setDraftChannel] = useState('whatsapp')

  const panelRef = useRef(null)
  const stepHeadingRef = useRef(null)
  // Synchronous duplicate-submit guard (M05): prevents a rapid double click from
  // dispatching two drafts. Reset only on a genuine failure, or when the user
  // returns to the flow.
  const submittingRef = useRef(false)
  // Which target the next transition should focus: the step's first control
  // (after a "Change" jump from the review) or its heading (everything else).
  const focusFirstFieldRef = useRef(false)
  // Proof that a submit CONTROL was activated, rather than the form being
  // submitted by something else. See `handleFormSubmit` for the measured defect
  // this closes; it is a ref and not state because it must be readable within
  // the same event dispatch that sets it.
  const submitIntentRef = useRef(false)
  // Guards the very first run of the transition effect, so mounting the page
  // never steals focus from wherever the visitor already is.
  const initialFocusSkippedRef = useRef(false)

  // Move keyboard focus to whichever result panel is shown ('opened' OR
  // 'blocked') so screen-reader and keyboard users are taken straight to the
  // outcome and its next-step actions.
  useEffect(() => {
    if ((status === 'opened' || status === 'blocked') && panelRef.current) {
      panelRef.current.focus()
    }
  }, [status])

  // Focus on every transition. A step change that left focus on a now-unmounted
  // Next control would strand both keyboard and screen-reader users, so focus
  // moves to the new step's heading — or to its first control when the visitor
  // arrived from a review "Change" action, since that is the control they came
  // to correct. The result panels own their own focus, so this effect stands
  // aside while one is showing and takes over again on the way back.
  useEffect(() => {
    if (!initialFocusSkippedRef.current) {
      initialFocusSkippedRef.current = true
      return
    }
    if (status !== 'idle') return

    const wantsFirstField = focusFirstFieldRef.current
    focusFirstFieldRef.current = false
    if (wantsFirstField) {
      const [firstField] = fieldsForStep(step)
      if (firstField) {
        setFocus(firstField)
        return
      }
    }
    stepHeadingRef.current?.focus()
  }, [step, status, setFocus])

  // Course sync (M24): when the validated `defaultCourse` prop changes — e.g.
  // in-place navigation from `/admission?course=X` to plain `/admission` — set
  // the field to the new validated course (or clear it), so a stale RHF value
  // can never be submitted for the wrong course. Runs only when `defaultCourse`
  // changes; a user's manual selection is untouched otherwise.
  useEffect(() => {
    setValue('course', courseTitles.includes(defaultCourse) ? defaultCourse : '')
  }, [defaultCourse, setValue])

  // Return to the flow (from the confirmation or the blocked panel) and re-arm
  // the duplicate-submit guard. Field values are NOT cleared here (no
  // `reset()`), preserving recovery data (M04); the transition effect then moves
  // focus to the review heading rather than leaving it on an unmounted button.
  const returnToForm = () => {
    submittingRef.current = false
    setStatus('idle')
  }

  /**
   * Move to a step, announcing the new position.
   *
   * @param {number} next - Requested 1-based step; clamped into 1..REVIEW_STEP.
   * @param {boolean} [focusFirstField] - Focus the step's first control instead
   *   of its heading (used by the review's "Change" controls).
   * @returns {void}
   */
  const goToStep = (next, focusFirstField = false) => {
    const target = Math.min(Math.max(next, FIRST_STEP), REVIEW_STEP)
    focusFirstFieldRef.current = focusFirstField
    setShowStepSummary(false)
    // A stale dispatch error must not follow the visitor to another step. The
    // flow is only mounted in 'idle' and 'error', so this is a no-op in 'idle'.
    setStatus('idle')
    setStep(target)
    setAnnouncement(`Step ${target} of ${TOTAL_STEPS}: ${STEP_LABELS[target - 1]}`)
  }

  // Advance only when this step's own fields pass. `shouldFocus` lets
  // react-hook-form move focus to the first invalid control itself, so the
  // message its field primitive already renders as `role="alert"` is read out
  // where the visitor now is; the visible summary then names everything
  // outstanding in one place. Nothing entered is ever cleared.
  const goNext = async () => {
    const fields = fieldsForStep(step)
    if (fields.length > 0) {
      const valid = await trigger(fields, { shouldFocus: true })
      if (!valid) {
        setShowStepSummary(true)
        setAnnouncement(`Step ${step} of ${TOTAL_STEPS} needs your attention before you can continue.`)
        return
      }
    }
    goToStep(step + 1)
  }

  // Going back never validates and never discards anything.
  const goBack = () => {
    goToStep(step - 1)
  }

  // While a step summary is on screen, re-validate that step on every field
  // interaction so the summary and the per-field error clear TOGETHER the moment
  // the visitor answers.
  //
  // MEASURED BEHAVIOUR THIS CORRECTS: `mode: 'onTouched'` revalidates on change
  // only AFTER a field's first blur, and the `trigger()` from a failed advance
  // does not mark a field as touched — so choosing the answer to a question that
  // was just reported as missing left both its error and this summary on screen
  // until the next blur. Revalidating here cannot introduce a NEW error: the
  // summary only shows after every field of the step has already been validated,
  // so this pass can only refresh or clear what is already displayed. React's
  // change event bubbles, so one listener on the form covers every field of
  // every step and the step groups own nothing.
  const handleFieldChange = async () => {
    if (!showStepSummary) return
    const fields = fieldsForStep(step)
    if (fields.length === 0) return
    const valid = await trigger(fields)
    // Release the polite region once nothing on this step is outstanding. Two
    // reasons, both measured: the region would otherwise keep reading as
    // "needs your attention" after the visitor has answered, and — because a
    // live region only announces a CHANGE — a second failed advance on the same
    // step would set the identical sentence and be announced not at all.
    // Clearing to an empty string announces nothing by itself, so the only
    // effect is that the next failure is a real change and is spoken again.
    if (valid) setAnnouncement('')
  }

  // MEASURED DEFECT THIS PREVENTS — do not remove. A field error occupies 24px
  // in normal flow inside its own field wrapper, so the control row below the
  // step content moves the moment an error appears or clears. Pressing Back or
  // Next with a field still focused is exactly that moment: the default
  // mousedown behaviour blurs the field, `mode: 'onTouched'` revalidates, the
  // error appears or disappears, the button slides out from under the pointer
  // and the click is lost to the container. Suppressing the default keeps the
  // focus — and therefore the layout — still for the duration of the press; the
  // click still fires, and focus is moved deliberately afterwards by the
  // transition effect (or by `trigger`'s `shouldFocus` on failure), so nothing
  // is ever left stranded. Keyboard activation never reaches this handler.
  const holdFocusDuringPress = (event) => {
    event.preventDefault()
  }

  // The outbound dispatch. `handleSubmit` validates the WHOLE form first and
  // only calls this with `data` when every field passes, so a tampered or
  // stale value can never reach a channel.
  //
  // CRITICAL: `dispatchEnquiry` is called SYNCHRONOUSLY from here. It composes
  // the URL and opens the channel in this first synchronous run, inside the user
  // gesture; only the outcome handling below is deferred to a microtask.
  // Deferring the call itself — behind a timer, a `.then()`, or an `await`
  // placed in front of it — would cost that gesture and turn the WhatsApp tab
  // into an intermittently blocked popup. There is still no fake latency, no
  // network call and no `submitting` state (M05).
  const sendInquiry = async (data) => {
    if (submittingRef.current) return // duplicate-submit guard (M05)
    submittingRef.current = true
    try {
      const result = await dispatchEnquiry(buildPayload(data), {
        channel: data.channel,
        whatsappHref: siteConfig.whatsappHref,
        emailHref: siteConfig.emailHref,
      })
      // Stash the composed deep link the seam hands back so both the 'opened'
      // and 'blocked' panels can offer a directly clickable link to (re-)open it.
      if (result.draftUrl) setDraftUrl(result.draftUrl)
      setDraftChannel(result.channel)
      if (result.status === 'error') {
        submittingRef.current = false // re-arm so the visitor can retry
        setStatus('error')
        return
      }
      // 'opened' (a draft is ready for the visitor to press Send — never a send,
      // and the flow's step 6) or 'blocked' (the browser refused the tab). Both
      // leave the guard armed; only `returnToForm` re-arms it.
      setStatus(result.status)
    } catch {
      // `dispatchEnquiry` reports failure through `result.status` rather than by
      // throwing, but a thrown value must still land in the honest 'error' state
      // rather than escaping to the shell's ErrorBoundary.
      submittingRef.current = false
      setStatus('error')
    }
  }

  // Defensive path: every field has already passed its own step, so the
  // whole-form validation `handleSubmit` runs before dispatch can only fail if a
  // value was changed after its step or tampered with. Rather than blocking the
  // submit silently — the failure would otherwise be invisible, because the
  // offending field is not even mounted on the review step — send the visitor to
  // the first step that still has a problem, with its summary showing.
  const handleInvalidSubmit = (submitErrors) => {
    const target =
      FIELD_STEPS.find((candidate) =>
        fieldsForStep(candidate).some((name) => submitErrors?.[name]),
      ) ?? FIRST_STEP
    goToStep(target, true)
    // Queued after `goToStep`'s reset, so the summary the visitor is being sent
    // to stays visible rather than being cleared by the navigation itself.
    setShowStepSummary(true)
    setAnnouncement(`Step ${target} of ${TOTAL_STEPS} needs your attention before your draft can open.`)
  }

  const submitReview = handleSubmit(sendInquiry, handleInvalidSubmit)

  // Every submit control records the visitor's intent before the browser gets
  // to the form: a `<button type="submit">` dispatches its click (and therefore
  // this handler) BEFORE its activation behaviour submits the form.
  const markSubmitIntent = () => {
    submitIntentRef.current = true
  }

  // The form has ONE `onSubmit`, and it dispatches ONLY when a submit control
  // was actually activated on the review step. BOTH conditions are load-bearing.
  //
  // MEASURED DEFECT THIS CLOSES — do not weaken to a step check alone. The step
  // number is NOT sufficient evidence, because it can already have advanced by
  // the time a submit event arrives: `goNext` awaits `trigger()`, so `setStep`
  // flushes in the microtask checkpoint after the click listener returns but
  // BEFORE the browser performs that click's activation behaviour. Rendering
  // Next and the submit control from one ternary therefore let React mutate a
  // single reused <button> node from `type="button"` to `type="submit"` inside
  // that window — and one press on step four both advanced to the review and
  // dispatched the enquiry, skipping the review, its "Change" controls and the
  // privacy disclosure entirely. The control row below now renders the two
  // controls in separate, explicitly keyed slots so the node can never be
  // reused, and this intent gate makes the dispatch impossible without a
  // genuine activation of a submit control whatever the DOM does.
  //
  // A submit event that arrives with no intent recorded — implicit submission,
  // or a reused node as above — must never open a draft from half-collected
  // details. On a field step it is answered by advancing, exactly as the Next
  // control does. Measured in Chrome, real Enter keypresses on steps 1-4 do not
  // reach here at all: the form carries no submit button until the review, and
  // implicit submission is skipped when a form has no default button and more
  // than one field that blocks it (step three has three). So this branch is a
  // guard first and an advance second — Enter is not this flow's way forward,
  // and the Next control is.
  const handleFormSubmit = (event) => {
    const intended = submitIntentRef.current
    submitIntentRef.current = false

    if (!intended || step !== REVIEW_STEP) {
      event.preventDefault()
      if (step !== REVIEW_STEP) goNext()
      return
    }
    submitReview(event)
  }

  // One entry resolves this state's heading, glyph and the variant of its
  // primary recovery action, from `lib/states.js`. No status → label/icon/
  // variant mapping is declared in this file: that duplication is precisely the
  // card/detail inconsistency the shared module exists to prevent.
  const dispatchEntry = dispatchState(status)
  // `Stepper`'s `current` is a ZERO-BASED index. The confirmation is step 6;
  // 'blocked' and 'error' never reached it, so they stay reported at the review.
  const stepperIndex = (status === 'opened' ? CONFIRMATION_STEP : step) - 1
  const isEmailChannel = watch('channel') === 'email'

  // The outstanding answers on this step, read fresh from `formState.errors` so
  // the list shrinks as the visitor fixes them.
  const stepIssues = showStepSummary
    ? fieldsForStep(step)
        .map((name) => ({ name, message: errors[name]?.message }))
        .filter((issue) => Boolean(issue.message))
    : []

  // The blocked panel's alternative channel, composed as a REAL link rather
  // than a second dispatch: a genuine click is never popup-blocked, and it needs
  // no re-arming of the duplicate-submit guard. The values are still in the RHF
  // store (`shouldUnregister: false`), so nothing has to be re-entered, and both
  // the body and the URL come from the shared seam — this file composes neither.
  const alternateDraftUrl =
    status === 'blocked'
      ? emailDraftUrl({
          subject: EMAIL_SUBJECT,
          text: buildMessage(buildPayload(getValues())),
          emailHref: siteConfig.emailHref,
        })
      : ''

  // ONE root for all four states, so the progress indicator and the polite
  // region are never unmounted and remounted underneath a screen reader; only
  // the body below them swaps.
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Stepper steps={STEP_LABELS} current={stepperIndex} />

      {/* This form's OWN polite region. The shell's title-mirroring announcer in
          layout/Layout.jsx keeps its single existing meaning (route changes) and
          is never repurposed here. `Stepper` deliberately owns no live region. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {status === 'opened' ? (
        /* --- STEP 6 · CONFIRMATION: the pre-filled draft was opened in WhatsApp
           or the mail app. We do NOT claim it was sent (M04) — we tell the
           visitor to press Send, keep their data, and offer a link to re-open
           the same pre-filled draft. */
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-accent-50 p-6">
          <div ref={panelRef} tabIndex={-1} role="status" className="focus-visible:outline-none">
            <h3 className="text-xl font-bold text-accent-800">{dispatchEntry.label}</h3>
            <p className="mt-2 text-muted">
              We&rsquo;ve opened {draftChannel === 'email' ? 'your email app' : 'WhatsApp'} with your details pre-filled.{' '}
              <strong className="font-semibold text-foreground">Please press Send there to complete your inquiry</strong> —
              it has not been sent automatically. Your details are kept here in case you need them again.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {draftUrl ? (
              <Button href={draftUrl} variant={dispatchEntry.buttonVariant} size="sm">
                {draftChannel === 'email' ? <FaEnvelope aria-hidden="true" /> : <FaWhatsapp aria-hidden="true" />}
                {draftChannel === 'email' ? 'Re-open email draft' : 'Re-open WhatsApp draft'}
              </Button>
            ) : null}
            <Button href={siteConfig.phoneHref} variant="secondary" size="sm">
              Call Now
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={returnToForm}>
              Edit my details
            </Button>
          </div>
        </div>
      ) : status === 'blocked' ? (
        /* --- BLOCKED: the browser prevented the WhatsApp tab from opening. We
           never pretend the inquiry was sent; instead we present the fully
           pre-filled recovery link (a real <a>, so a genuine click is not
           popup-blocked), the SAME enquiry as an email draft, the direct number
           and a way back. The caution tone pins `role="alert"`. */
        <EmptyState
          ref={panelRef}
          tabIndex={-1}
          className="focus-visible:outline-none"
          tone={dispatchEntry.tone}
          icon={dispatchEntry.icon}
          title={dispatchEntry.label}
          description={
            <>
              We couldn&rsquo;t open WhatsApp automatically, so your inquiry has NOT been sent yet. Tap the
              button below to open your pre-filled message and press send — or contact us directly.
            </>
          }
          action={
            <>
              <Button href={draftUrl} variant={dispatchEntry.buttonVariant} size="sm">
                <FaWhatsapp aria-hidden="true" />
                Open WhatsApp
              </Button>
              <Button href={alternateDraftUrl} variant="secondary" size="sm">
                <FaEnvelope aria-hidden="true" />
                Open email draft instead
              </Button>
              <Button href={siteConfig.phoneHref} variant="secondary" size="sm">
                Call Now
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={returnToForm}>
                Back to the form
              </Button>
            </>
          }
        />
      ) : (
        /* --- STEPS 1-5 (and the 'error' state, which keeps the flow mounted so
           nothing entered is lost). `noValidate` hands validation messaging
           entirely to react-hook-form's accessible output rather than the
           browser's native bubbles. */
        <form
          noValidate
          onSubmit={handleFormSubmit}
          onChange={handleFieldChange}
          className="flex flex-col gap-6"
        >
          {step === 1 ? (
            <GoalStep register={register} errors={errors} headingRef={stepHeadingRef} />
          ) : null}

          {step === 2 ? (
            <CourseStep
              register={register}
              errors={errors}
              headingRef={stepHeadingRef}
              courseOptions={courseOptions}
              courseTitles={courseTitles}
              batchOptions={batchOptions}
              batchValues={batchValues}
            />
          ) : null}

          {step === 3 ? (
            <DetailsStep register={register} errors={errors} headingRef={stepHeadingRef} />
          ) : null}

          {step === 4 ? (
            <ContactMethodStep register={register} errors={errors} headingRef={stepHeadingRef} />
          ) : null}

          {step === REVIEW_STEP ? (
            <>
              <ReviewStep
                headingRef={stepHeadingRef}
                values={getValues()}
                onEditStep={(target) => goToStep(target, true)}
              />

              {/* Privacy disclosure at the point of handoff (M07): it sits with
                  the submit control, which is on this step. */}
              <p className="text-xs leading-relaxed text-muted">
                Submitting opens WhatsApp or your email app with your name, phone, email and course pre-filled so you
                can review and press Send. Those details are then handled by WhatsApp/Meta or your email provider under
                their own terms; CIBLE only receives them once you press Send. If you are under 18, please ask a parent
                or guardian to help. See our{' '}
                <Link to="/privacy-policy" className="font-medium text-primary-700 underline hover:text-primary-800">
                  Privacy Policy
                </Link>
                .
              </p>
            </>
          ) : null}

          {/* Step-level summary of a failed advance. It carries no live role on
              purpose: each message is already announced assertively by its own
              field primitive, and focus has been moved to the first invalid
              control, so a third announcement of the same sentences would be
              noise. This is the one place the visitor can see everything that is
              still outstanding. */}
          {stepIssues.length > 0 ? (
            <div className="rounded-lg border border-border bg-secondary-50 p-4">
              <p className="text-sm font-semibold text-secondary-800">
                {stepIssues.length === 1
                  ? 'One answer still needs your attention:'
                  : `${stepIssues.length} answers still need your attention:`}
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {stepIssues.map((issue) => (
                  <li key={issue.name} className="text-sm text-muted">
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Three INDEPENDENT, explicitly keyed slots — deliberately not two
              branches of one ternary. A ternary put Next and the submit control
              at the same child position, so React reused one <button> node and
              only flipped its `type`, which is the defect documented on
              `handleFormSubmit`. Separate slots mean the Next node is unmounted
              and a fresh submit node is mounted, and the distinct keys make that
              true even if the slots ever collapse to one index. */}
          <div className="flex flex-wrap gap-3">
            {step > FIRST_STEP ? (
              <Button
                key="back"
                type="button"
                variant="outline"
                size="lg"
                onMouseDown={holdFocusDuringPress}
                onClick={goBack}
              >
                Back
              </Button>
            ) : null}

            {step < REVIEW_STEP ? (
              <Button
                key="next"
                type="button"
                variant="primary"
                size="lg"
                onMouseDown={holdFocusDuringPress}
                onClick={goNext}
              >
                Next
              </Button>
            ) : null}

            {step === REVIEW_STEP ? (
              /* The submit control names what is about to happen rather than
                 saying "Submit", because the visitor is handed to their own app
                 and nothing is sent from this website. */
              <Button
                key="submit"
                type="submit"
                variant="accent"
                size="lg"
                onClick={markSubmitIntent}
              >
                {isEmailChannel ? <FaEnvelope aria-hidden="true" /> : <FaWhatsapp aria-hidden="true" />}
                {isEmailChannel ? 'Open email draft' : 'Open WhatsApp draft'}
              </Button>
            ) : null}
          </div>

          {/* --- ERROR: rendered inline, with the flow still mounted, so the
              visitor's entries and the retry path both survive. The guard was
              re-armed on failure, which is what makes "Try again" work. */}
          {status === 'error' ? (
            <EmptyState
              tone={dispatchEntry.tone}
              icon={dispatchEntry.icon}
              title={dispatchEntry.label}
              description="Please call or WhatsApp us directly."
              action={
                <>
                  <Button type="submit" variant="outline" size="sm" onClick={markSubmitIntent}>
                    Try again
                  </Button>
                  <Button href={siteConfig.phoneHref} variant={dispatchEntry.buttonVariant} size="sm">
                    Call {siteConfig.phone}
                  </Button>
                </>
              }
            />
          ) : null}
        </form>
      )}
    </div>
  )
}

export default AdmissionForm
