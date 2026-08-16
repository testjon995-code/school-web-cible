import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router-dom'
import Input from '../ui/Input.jsx'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'
import { emailRules, truncate, MAX_LENGTHS } from '../../lib/validators.js'
import siteConfig from '../../data/siteConfig.js'

/**
 * Newsletter — the single canonical newsletter subscribe form for the CIBLE
 * School of Language SPA (AAP §0.6.1 Group 7). It is a small, self-contained,
 * fully validated block that the Footer and marketing pages compose to capture
 * email sign-ups for admission updates, tips, and event invites.
 *
 * Reuse-first composition: it never hand-rolls raw form markup. It composes the
 * canonical UI primitives — `ui/Input` for the field and `ui/Button` for submit
 * — so styling, focus rings, and ARIA wiring stay consistent with the rest of
 * the site. It is intentionally independent of `components/forms/*`.
 *
 * Truthful handoff, no manufactured latency (M04 / M05): the site has no
 * backend, so a valid submission opens a pre-filled `mailto:` to the institute
 * (`siteConfig.emailHref`, or a mailto built from `siteConfig.email`). Opening a
 * draft is instantaneous and is NOT a subscription — the status message says so
 * explicitly ("we've opened your email app … press send") and never claims the
 * address was added to any list. The mailto is opened SYNCHRONOUSLY (no
 * artificial `setTimeout`, so there is no timer to leak across unmount), and the
 * entered email is NOT cleared afterwards, preserving recovery data. A
 * `submittingRef` guards a double-submit and is re-armed wherever the finished
 * submission is reset — on a field edit and on a route change (see below).
 *
 * Bounded input (M06): the email is validated and length-capped by the shared
 * `emailRules`, carries a native `maxLength`, and is defensively clamped with
 * `truncate` before being placed in the mailto body.
 *
 * Single, restrained live region + focus (m10 / m14): there is exactly ONE
 * status mechanism — a `role="status"` message shown only for a real outcome
 * (there is no spinner and no changing button label to double-announce). On a
 * successful open, focus is moved programmatically to that status message
 * (`tabIndex={-1}`) so keyboard users are taken to the confirmation rather than
 * left on the field.
 *
 * Status LIFECYCLE — a submission is retired as a WHOLE, and by two signals. The
 * outcome message describes one submission rather than the session, so `status`
 * returns to `'idle'` both when the field is edited and when the route changes.
 * Without those two resets the confirmation was permanent — it stayed on screen
 * while the visitor typed an invalid address and submitted again, so a stale
 * "we've opened your email app" panel and a live `role="alert"` validation error
 * were displayed and announced at the same time, and because the Footer lives in
 * the persistent `Layout` the panel (and the typed value) also followed the
 * visitor onto every other route for the rest of the session.
 *
 * The `submittingRef` duplicate-submit guard is the OTHER HALF of that same
 * submission's state, so both signals now clear both halves — never one without
 * the other. Retiring the message alone left the form looking ready while the
 * guard was still latched, and since this component never unmounts on a
 * client-side navigation nothing else would ever have released it: Subscribe on
 * the next page returned at the guard and did nothing, silently. Editing the
 * field re-arms both through one composed `onChange`; navigating re-arms both in
 * the `pathname` effect. Neither signal touches validation state — a pending
 * error keeps its own lifecycle in react-hook-form.
 *
 * Privacy (M07): a short disclosure beneath the form explains that subscribing
 * opens the visitor's email app with their address pre-filled and links to the
 * Privacy Policy.
 *
 * Accessibility (WCAG AA): `<form noValidate>` hands validation messaging to
 * react-hook-form / Input; success uses `role="status"` (polite) and a submit
 * failure uses `role="alert"` (assertive); colours resolve to AA-contrast brand
 * tokens. Styling is entirely token-driven on the 8px scale.
 *
 * @param {object} props
 * @param {string} [props.className] Extra classes merged LAST onto the root
 *   `<section>` so callers (e.g. the Footer) can override layout/background.
 * @param {string} [props.title='Stay in the loop'] Heading text.
 * @param {string} [props.subtitle='Get admission updates, tips, and event invites.']
 *   Supporting copy beneath the heading.
 * @param {object} props... Remaining props spread onto the root `<section>`.
 * @returns {import('react').ReactElement} The accessible newsletter subscribe form.
 */
export default function Newsletter({
  className,
  title = 'Stay in the loop',
  subtitle = 'Get admission updates, tips, and event invites.',
  ...props
}) {
  // All hooks are declared unconditionally at the top level of the component,
  // as required by the enforced `react/rules-of-hooks` lint rule.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ mode: 'onBlur', defaultValues: { email: '' } })
  // The committed route, read so a client-side navigation can retire a finished
  // submission (see the `pathname` effect below). The Footer mounts this form in
  // the persistent Layout, so it never unmounts to reset itself.
  const { pathname } = useLocation()
  const [status, setStatus] = useState('idle') // 'idle' | 'opened' | 'error'
  // Unique-but-semantic field id. Keeps the readable `newsletter-email` intent
  // while guaranteeing uniqueness via useId(), so the form can be rendered more
  // than once on a single page (e.g. the persistent Footer AND a page section)
  // without producing duplicate ids / broken <label> association (WCAG AA).
  const generatedId = useId()
  const fieldId = `newsletter-email-${generatedId}`
  // Synchronous duplicate-submit guard (M05); re-armed by BOTH signals that retire
  // a submission — a field edit (the composed `onChange` below) and a route change
  // (the `pathname` effect below) — so it is never left latched on a form the
  // visitor can still see and press.
  const submittingRef = useRef(false)
  // The status message, focused on a successful open so keyboard/AT users land
  // on the confirmation rather than the field (m14).
  const statusRef = useRef(null)

  useEffect(() => {
    if (status === 'opened' && statusRef.current) statusRef.current.focus()
  }, [status])

  // Retire a finished submission on navigation — BOTH halves of it. The outcome
  // message reports one submission, and carrying it across routes would assert a
  // completed handoff on pages the visitor never submitted from; but the
  // duplicate-submit guard is the other half of that same submission's state, so
  // clearing only the message left the form LOOKING ready while `submittingRef`
  // was still latched. Because the Footer lives in the persistent `Layout`, this
  // component never unmounts on a client-side navigation, so nothing else would
  // ever have released that latch: pressing Subscribe on the next page returned at
  // the guard and did nothing at all — silently, with no message and no error.
  // Editing the field re-arms both together for exactly the same reason (see the
  // composed `onChange` below); navigating is the second signal that the previous
  // submission is over, so it re-arms both as well.
  //
  // Re-arming here is safe rather than a licence to double-submit: the mailto is
  // opened SYNCHRONOUSLY inside `onSubmit`, so by the time any navigation can be
  // committed the handoff has already completed and the guard has no in-flight work
  // left to protect. A press after navigating is a genuine new attempt, which is
  // precisely what the guard is supposed to allow.
  //
  // `setStatus('idle')` on an already-idle state is a no-op React bails out of, and
  // writing `false` to an already-false ref costs nothing, so the initial render and
  // every navigation that follows a fresh form remain free.
  useEffect(() => {
    submittingRef.current = false
    setStatus('idle')
  }, [pathname])

  // Client-side-only submit: no backend exists, so a valid email opens a
  // pre-filled mailto: to the institute. Synchronous — no fake delay (M05).
  const onSubmit = (data) => {
    if (submittingRef.current) return // duplicate-submit guard (M05)
    submittingRef.current = true
    try {
      const subject = encodeURIComponent('Newsletter subscription — CIBLE')
      const email = truncate(data.email, MAX_LENGTHS.email)
      const body = encodeURIComponent(`Please subscribe this email to the CIBLE newsletter: ${email}`)
      const mailto = siteConfig.emailHref || `mailto:${siteConfig.email}`
      window.location.href = `${mailto}?subject=${subject}&body=${body}`
      setStatus('opened')
    } catch {
      submittingRef.current = false
      setStatus('error')
    }
  }

  // Compose our re-arm handler with react-hook-form's registered onChange so a
  // fresh edit clears the duplicate-submit guard (allowing a genuine re-submit,
  // e.g. a corrected or different address) while RHF still tracks the value. The
  // same edit also clears a finished outcome message, so the panel can never
  // describe an address the field no longer holds.
  const emailField = register('email', emailRules)

  return (
    // `@container` makes this card a query container so the form below can size
    // itself against the SPACE IT ACTUALLY HAS rather than the viewport. The
    // Footer renders this card in a 12-track grid cell (`lg:col-span-3`), which
    // is only 214–348px wide from 768px up, so a viewport-based `sm:flex-row`
    // put the field and the button side by side inside a column far too narrow
    // for either: the field's content box collapsed to 31–104px (against the
    // 144.25px its own `you@example.com` placeholder needs) and the Subscribe
    // label spilled outside its padding box at exactly 1024px.
    <section className={cn('@container rounded-2xl bg-surface p-6 md:p-8', className)} {...props}>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>

      {status === 'opened' ? (
        <p
          ref={statusRef}
          tabIndex={-1}
          role="status"
          className="mt-4 text-sm font-medium text-accent-700 focus-visible:outline-none"
        >
          We&rsquo;ve opened your email app with a subscription request pre-filled — just press send and
          we&rsquo;ll add you to the list. It is not subscribed until you send it. If nothing opened, email us at{' '}
          {siteConfig.email}.
        </p>
      ) : null}

      <form
        noValidate
        aria-label="Subscribe to the newsletter"
        onSubmit={handleSubmit(onSubmit)}
        // Stacked by default; side by side only once the CARD itself is at least
        // 24rem (384px) wide — enough for the 144.25px placeholder plus the 12px
        // gap and the button's intrinsic 126.39px. In the Footer's narrow cell
        // the container query never matches, so the field keeps its full width at
        // every viewport; a wide marketing section still gets the compact row.
        className="mt-4 flex flex-col gap-3 @sm:flex-row @sm:items-start"
      >
        <Input
          id={fieldId}
          type="email"
          label="Email address"
          required
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={MAX_LENGTHS.email}
          error={errors.email?.message}
          className="flex-1"
          {...emailField}
          onChange={(event) => {
            submittingRef.current = false
            setStatus('idle')
            return emailField.onChange(event)
          }}
        />
        {/* `shrink-0 whitespace-nowrap`: in the row layout the button must keep
            its intrinsic width and let the field absorb the remaining space, so
            the single-word label can never be squeezed out of its padding box
            (it previously overhung the fill by ~2.7px on each side at 1024px).
            Merged LAST by Button's own cn(), so it wins over the size defaults. */}
        <Button type="submit" variant="primary" className="shrink-0 whitespace-nowrap">
          Subscribe
        </Button>
      </form>

      {/* Privacy disclosure at the point of handoff (M07). The link carries the
          project's established 44px hit-area treatment — `inline-flex min-h-11
          items-center` — the same one the Footer's legal links and the Privacy
          Policy / Terms contact addresses use, so every in-prose link that has to
          clear the touch-target floor does it the one way (M12). `min-h-11` is a
          declared step on the 8px scale (11 × 0.25rem = 44px), so no arbitrary
          value is involved, and `items-center` re-centres the label inside the
          taller box. */}
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Subscribing opens your email app with your address pre-filled and is sent to us via your email provider
        under their terms. See our{' '}
        <Link to="/privacy-policy" className="inline-flex min-h-11 items-center font-medium text-primary-700 underline hover:text-primary-800">
          Privacy Policy
        </Link>
        .
      </p>

      {status === 'error' ? (
        <p role="alert" className="mt-2 text-sm text-secondary-700">
          Something went wrong. Please try again.
        </p>
      ) : null}
    </section>
  )
}
