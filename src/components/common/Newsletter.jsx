import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
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
 * `submittingRef` guards a double-submit and is re-armed when the field changes.
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
  const [status, setStatus] = useState('idle') // 'idle' | 'opened' | 'error'
  // Unique-but-semantic field id. Keeps the readable `newsletter-email` intent
  // while guaranteeing uniqueness via useId(), so the form can be rendered more
  // than once on a single page (e.g. the persistent Footer AND a page section)
  // without producing duplicate ids / broken <label> association (WCAG AA).
  const generatedId = useId()
  const fieldId = `newsletter-email-${generatedId}`
  // Synchronous duplicate-submit guard (M05); re-armed on field change below.
  const submittingRef = useRef(false)
  // The status message, focused on a successful open so keyboard/AT users land
  // on the confirmation rather than the field (m14).
  const statusRef = useRef(null)

  useEffect(() => {
    if (status === 'opened' && statusRef.current) statusRef.current.focus()
  }, [status])

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
  // e.g. a corrected or different address) while RHF still tracks the value.
  const emailField = register('email', emailRules)

  return (
    <section className={cn('rounded-2xl bg-surface p-6 md:p-8', className)} {...props}>
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
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
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
            return emailField.onChange(event)
          }}
        />
        <Button type="submit" variant="primary">
          Subscribe
        </Button>
      </form>

      {/* Privacy disclosure at the point of handoff (M07). */}
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
