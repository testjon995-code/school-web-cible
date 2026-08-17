import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router-dom'
import Input from '../ui/Input.jsx'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'
import { emailRules, truncate, MAX_LENGTHS } from '../../lib/validators.js'
import siteConfig from '../../data/siteConfig.js'

/**
 * Newsletter — the single canonical newsletter subscribe form for the CIBLE School of
 * Language SPA. It is a small, self-contained, fully validated block that captures
 * email sign-ups for admission updates, tips and event invites. The Footer composes it
 * today; it takes only presentational props, so any marketing section could.
 *
 * Reuse-first composition: it never hand-rolls raw form markup. It composes the
 * canonical UI primitives — `ui/Input` for the field and `ui/Button` for submit — so
 * styling, focus rings and ARIA wiring stay consistent with the rest of the site. It is
 * intentionally independent of `components/forms/*`.
 *
 * TRUTHFUL HANDOFF, NO MANUFACTURED LATENCY: the site has no backend, so a valid
 * submission ATTEMPTS TO OPEN a pre-filled `mailto:` draft addressed to the institute
 * (`siteConfig.emailHref`, or a mailto built from `siteConfig.email`). Initiating a
 * draft is not a subscription, and this component cannot observe whether a mail client
 * actually appeared — so the status message says what was attempted, tells the visitor
 * to press send, and offers the address to write to if nothing opened. It never claims
 * the address was added to any list. The navigation is triggered SYNCHRONOUSLY, so
 * there is no timer to leak across unmount, and the entered email is deliberately not
 * cleared afterwards ON THE SAME ROUTE, preserving recovery data if the mail client
 * never opened or the draft was closed. Moving to a different page DOES discard it —
 * see the privacy note on the `pathname` effect.
 *
 * Bounded input: the email is validated and length-capped by the shared `emailRules`,
 * carries a native `maxLength`, and is defensively clamped with `truncate` before being
 * placed in the mailto body.
 *
 * Single, restrained live region + focus: there is exactly ONE status mechanism — a
 * `role="status"` message shown only for a real outcome, with no spinner and no
 * changing button label to double-announce. On a successful attempt focus moves
 * programmatically to that message, so keyboard users are taken to the confirmation
 * rather than left on the field.
 *
 * SUBMISSION LIFECYCLE — a submission is retired as a WHOLE, by two signals: editing
 * the field and changing route. Both clear the outcome message AND re-arm the
 * duplicate-submit guard, because those are two halves of one submission's state.
 * Retiring only the message would leave the form looking ready while the guard stayed
 * latched, and since the Footer mounts this form inside the persistent `Layout` this
 * component never unmounts to release it. Re-arming on navigation cannot license a
 * double submit: the draft is opened synchronously inside `onSubmit`, so the handoff has
 * already completed by the time any navigation commits, and a later press is a genuine
 * new attempt. Neither signal touches validation state — a pending error keeps its own
 * lifecycle in react-hook-form.
 *
 * Privacy: a short disclosure beneath the form explains that subscribing opens the
 * visitor's email app with their address pre-filled, and links to the Privacy Policy.
 * A route change discards the entered address as well as the outcome message, so PII
 * does not follow the visitor onto pages they never typed it on.
 *
 * Accessibility (WCAG AA): `<form noValidate>` hands validation messaging to
 * react-hook-form and `Input`; a successful attempt uses `role="status"` (polite) and a
 * failure uses `role="alert"` (assertive); colours resolve to AA-contrast brand tokens.
 * Styling is entirely token-driven on the 8px scale.
 *
 * @param {object} props
 * @param {string} [props.className] Extra classes merged LAST onto the root `<section>`
 *   so a caller can override layout or background.
 * @param {string} [props.title='Stay in the loop'] Heading text.
 * @param {string} [props.subtitle='Get admission updates, tips, and event invites.']
 *   Supporting copy beneath the heading.
 * @returns {import('react').ReactElement} The accessible newsletter subscribe form.
 *
 * Any remaining props are spread onto the root `<section>`.
 */
export default function Newsletter({
  className,
  title = 'Stay in the loop',
  subtitle = 'Get admission updates, tips, and event invites.',
  ...props
}) {
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm({ mode: 'onBlur', defaultValues: { email: '' } })
  // The committed route, read so a client-side navigation can retire a finished
  // submission AND discard the address it was made with (see the `pathname` effect
  // below). The Footer mounts this form in the persistent Layout, so it never unmounts
  // to reset itself.
  const { pathname } = useLocation()
  const [status, setStatus] = useState('idle') // 'idle' | 'opened' | 'error'
  // A readable id made unique by `useId()`, so the form can be rendered more than once
  // on a page — the persistent Footer plus a page section — without duplicate ids or a
  // broken <label> association (WCAG AA).
  const generatedId = useId()
  const fieldId = `newsletter-email-${generatedId}`
  // Synchronous duplicate-submit guard, re-armed by both signals that retire a
  // submission (see SUBMISSION LIFECYCLE in the JSDoc), so it is never left latched on
  // a form the visitor can still see and press.
  const submittingRef = useRef(false)
  const statusRef = useRef(null)
  // The route the `pathname` effect last ran for. It exists so the effect can
  // tell a genuine NAVIGATION from its own initial run: the effect body also
  // fires once on mount, and clearing the field there would be wrong rather than
  // merely redundant, because the browser can satisfy `autoComplete="email"`
  // before the first effect flushes and wiping an autofilled address would break
  // the very convenience the attribute exists for.
  const lastPathnameRef = useRef(pathname)

  useEffect(() => {
    if (status === 'opened' && statusRef.current) statusRef.current.focus()
  }, [status])

  // Navigation is one of the two signals that retire a submission, and it clears BOTH
  // halves — the outcome message and the guard (see SUBMISSION LIFECYCLE in the JSDoc).
  // Carrying the message across routes would assert a completed handoff on a page the
  // visitor never submitted from, and clearing only the message left the form LOOKING
  // ready while `submittingRef` stayed latched: because the Footer lives in the
  // persistent `Layout` this component never unmounts, so nothing else would ever have
  // released it and Subscribe on the next page would return at the guard and do nothing
  // at all. Re-arming here cannot licence a double-submit — the mailto is opened
  // SYNCHRONOUSLY inside `onSubmit`, so by the time a navigation commits the handoff is
  // already over and a press afterwards is a genuine new attempt. Setting an
  // already-idle status is a no-op React bails out of, and writing `false` to an
  // already-false ref costs nothing, so a fresh form costs nothing on navigation.
  //
  // PRIVACY — a navigation retires the address itself as the third thing. With no
  // unmount to reset it, a typed email otherwise stayed populated in the field, and so
  // in the DOM, on every page the visitor opened next; on a shared or unattended device
  // that leaves one person's contact detail on the screen of a page they never typed it
  // on. `resetField` discards the value together with that field's validation state,
  // because an error describing a value the field no longer holds would be stale.
  // The `lastPathnameRef` comparison keeps this to genuine route changes: submitting on
  // the SAME route leaves the address in place for a second attempt, and the effect's
  // own mount-time run is excluded so a browser-autofilled address is never wiped.
  useEffect(() => {
    submittingRef.current = false
    setStatus('idle')

    if (lastPathnameRef.current !== pathname) {
      lastPathnameRef.current = pathname
      resetField('email')
    }
  }, [pathname, resetField])

  // Client-side-only submit: with no backend, a valid email initiates a pre-filled
  // mailto: draft to the institute, synchronously and with no manufactured delay.
  const onSubmit = (data) => {
    if (submittingRef.current) return
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

  // The re-arm handler is composed with react-hook-form's registered onChange, so an
  // edit clears both halves of a finished submission while RHF still tracks the value —
  // the second retirement signal, and what stops the panel describing an address the
  // field no longer holds.
  const emailField = register('email', emailRules)

  return (
    // `@container` makes this card a query container, so the form below sizes itself
    // against the SPACE IT ACTUALLY HAS rather than the viewport. The Footer renders
    // this card in a narrow grid cell, where a viewport-based breakpoint would put the
    // field and the button side by side in a column too narrow for either — collapsing
    // the field below its own placeholder width and pushing the submit label out of its
    // padding box.
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
        // Stacked by default; side by side only once the CARD is wide enough for the
        // placeholder, the gap and the button's intrinsic width together. In the
        // Footer's narrow cell that query never matches, so the field keeps its full
        // width at every viewport, while a wide section still gets the compact row.
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
        {/* In the row layout the button keeps its intrinsic width and lets the field
            absorb the remaining space, so the single-word label can never be squeezed
            out of its padding box. Merged LAST by Button's own cn(), so it wins over
            the size defaults. */}
        <Button type="submit" variant="primary" className="shrink-0 whitespace-nowrap">
          Subscribe
        </Button>
      </form>

      {/* Privacy disclosure at the point of handoff. The link carries the project's
          established 44px hit-area treatment — the same inline-flex minimum-height
          pattern the Footer's legal links and the legal pages' contact addresses use —
          so every in-prose link that has to clear the touch-target floor does it one
          way, with a declared step on the 8px scale rather than an arbitrary value, and
          the label re-centred inside the taller box.

          The `whitespace-nowrap` wrapper is REQUIRED, not decorative: `inline-flex`
          makes the anchor an ATOMIC inline-level box, and CSS allows a soft-wrap
          opportunity immediately after such a box, so the trailing full stop can break
          onto a line of its own. Binding the two in one nowrap context keeps them
          together, as they were when the label was plain inline text, and the space
          BEFORE the anchor stays outside the wrapper so the pair can still move to the
          next line together. Same pattern, same reason, as
          `src/pages/PrivacyPolicy.jsx` and `src/pages/Terms.jsx`. */}
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Subscribing opens your email app with your address pre-filled and is sent to us via your email provider
        under their terms. See our{' '}
        <span className="whitespace-nowrap">
          <Link to="/privacy-policy" className="inline-flex min-h-11 items-center font-medium text-primary-700 underline hover:text-primary-800">
            Privacy Policy
          </Link>
          .
        </span>
      </p>

      {status === 'error' ? (
        <p role="alert" className="mt-2 text-sm text-secondary-700">
          Something went wrong. Please try again.
        </p>
      ) : null}
    </section>
  )
}
