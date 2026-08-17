import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn.js'

/**
 * Button — the single canonical, polymorphic button for the CIBLE School of
 * Language SPA. It is reused everywhere a control appears: the Navbar actions,
 * every page's CTASection, the Hero action row, cards, form submit controls and
 * the floating / sticky conversion widgets. There is exactly ONE button
 * implementation in the codebase — compose this component, never fork a second.
 *
 * Polymorphic rendering (precedence: `to` > `href` > native `<button>`):
 *   • `to`   → a react-router <Link> for internal SPA navigation (client-side).
 *   • `href` → a semantic <a>, gated by a strict protocol allowlist
 *              (`sanitizeHref`): only http(s), tel:, mailto: and scheme-less
 *              relative references are honoured. External http(s) URLs open in a
 *              new tab with rel="noopener noreferrer"; tel: and mailto: open in
 *              place so the device dialer / mail client launches directly. A
 *              disallowed scheme (javascript:, data:, …) is rejected and the
 *              control degrades to a real but non-navigating <button>.
 *   • otherwise → a semantic <button> with an explicit `type` (default 'button')
 *              and native `disabled` support.
 *
 * SECURITY CONTRACT: on the anchor branch, `href`, `className` and `target`/`rel`
 * are applied AFTER the caller's props, so a caller cannot override the
 * sanitized href or strip the new-tab hardening.
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens in src/index.css)
 * with no hardcoded values. Every fill under white text is locked to a shade that
 * clears AA for normal text; src/index.css holds the contrast ledger and is the
 * place to check a pairing before changing one here.
 *
 * Emphasis ladder — filled (`primary`/`secondary`/`accent`) > `outline` >
 * `tertiary`. Pick the LOWEST tier that still reads as actionable, so the
 * admission primary always stays dominant; `tertiary` is never the admission
 * action itself. `tertiary` drops the fill AND the border and keeps a PERSISTENT
 * underline, so its lower emphasis is a shape difference rather than a colour one
 * and survives without colour vision (WCAG "never colour alone") — the same
 * reasoning that makes `Card` signal hover by shadow.
 *
 * Interactive states: hover is declared per variant, keyboard focus is the ONE
 * shared `:focus-visible` ring on the base classes, and disabled is the base's
 * native-`disabled` treatment. Pressed feedback is inherent to the filled and
 * `outline` variants (a fill swap or a tint is already visible while the control
 * is held); `tertiary` rests with no fill and no border, so it carries an explicit
 * pressed treatment whose underline thickening keeps the press perceptible on
 * touch, where no hover phase exists.
 *
 * Sizes sit on the 8px scale and every size is at least 44px tall, with a minimum
 * width floor on the shared base, so all renderings — including icon-only — meet
 * the WCAG 2.5.5 / 2.5.8 touch-target guideline. `sm` is compact in padding and
 * text only, never in hit area.
 *
 * Accessibility: a semantic element is rendered for every usage (never a clickable
 * <div>), the focus ring is present on all three renderings, and arbitrary props
 * (`onClick`, `aria-*`, …) are forwarded to it. When a button contains only an
 * icon, the caller MUST pass an `aria-label` so the control has an accessible name.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'accent'|'outline'|'tertiary'} [props.variant='primary'] Visual style; an unknown value falls back to `primary`.
 * @param {'sm'|'md'|'lg'} [props.size='md'] Control height / padding on the 8px scale; an unknown value falls back to `md`.
 * @param {string} [props.to] Internal route path → renders a react-router <Link>.
 * @param {string} [props.href] URL → renders an <a>; external http(s) opens in a new tab.
 * @param {'button'|'submit'|'reset'} [props.type='button'] Native type (native <button> only).
 * @param {string} [props.className] Extra classes, merged LAST so callers can override.
 * @param {import('react').ReactNode} [props.children] Button content (label and/or icon).
 * @param {boolean} [props.disabled=false] Disables the native <button>.
 * @returns {import('react').ReactElement} A <Link>, <a>, or <button> styled per variant/size.
 */

// Shared, always-applied classes. The minimum height and width floors here are
// what guarantee a ≥44×44px hit area on EVERY rendering, including icon-only
// buttons and the compact size. Module-local so the file exports only Button.
const base =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

// Variant fills, keyed in emphasis-ladder order. Every fill under white text is
// locked to an AA-compliant shade; check the contrast ledger in src/index.css
// before substituting one, and never reach for a lighter step under white text.
//
// `tertiary` lowers emphasis by removing the fill and the border, NOT by
// lightening the label — its label is a DARKER primary than `outline`'s, the
// light-fill/dark-text direction `Badge` also uses. Because it rests with no fill
// and no border, its hover and pressed feedback is authored rather than inherited.
// When editing it: keep the underline unprefixed (a hover-only underline fails the
// non-colour-cue rule), keep a pressed cue that is not colour-only, and add no
// height, padding or leading utility, which would breach the ≥44px touch target
// the base classes guarantee — text-decoration and background are non-layout,
// which is why they are the safe choices.
const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700',
  secondary: 'bg-secondary-700 text-white hover:bg-secondary-800',
  accent: 'bg-accent-700 text-white hover:bg-accent-800',
  outline: 'border-2 border-primary-600 bg-transparent text-primary-600 hover:bg-primary-50',
  tertiary:
    'bg-transparent text-primary-700 underline underline-offset-4 hover:bg-primary-50 hover:text-primary-800 active:bg-primary-100 active:decoration-2',
}

// Size steps on the 8px scale. Every step is at least 44px tall, so `sm` is
// compact only in horizontal padding and text size, never in hit area.
const sizes = {
  sm: 'h-11 px-4 text-sm',
  md: 'h-11 px-6 text-base',
  lg: 'h-12 px-8 text-lg',
}

// Absolute URL schemes the button is allowed to link to. Everything else with a
// scheme (javascript:, data:, vbscript:, file:, …) is rejected.
const SAFE_ABSOLUTE_SCHEME = /^(https?:|tel:|mailto:)/i
// Detects a leading URL scheme ("name:") so we can distinguish "some-scheme:…"
// from a scheme-less relative reference (path / #hash / ?query).
const HAS_URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i
// http(s) or protocol-relative "//" → treated as an external, new-tab link.
const IS_EXTERNAL = /^(https?:)?\/\//i

/**
 * Validate and normalize an `href` against a strict protocol allowlist.
 *
 * Returns the trimmed href when it is safe to place on an anchor — an `http(s):`,
 * `tel:` or `mailto:` absolute URL, or any scheme-less relative reference
 * (`/courses`, `#section`, `?q=1`). Any other explicit scheme (`javascript:`,
 * `data:`, `vbscript:`, …) yields `null`, so a hostile or mistaken caller cannot
 * turn the canonical Button into a script or data-URI injection vector.
 *
 * @param {unknown} value - The candidate href.
 * @returns {string|null} The safe href, or `null` when the scheme is disallowed.
 */
function sanitizeHref(value) {
  if (typeof value !== 'string') return null
  const href = value.trim()
  if (!href) return null
  if (SAFE_ABSOLUTE_SCHEME.test(href)) return href
  if (HAS_URL_SCHEME.test(href)) return null
  return href
}

function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  type = 'button',
  className,
  children,
  disabled = false,
  ...props
}) {
  // The caller's className is merged LAST so it can override any preceding
  // utility; an unknown variant or size falls back to its default so the button
  // always renders a styled control.
  const classes = cn(base, variants[variant] || variants.primary, sizes[size] || sizes.md, className)

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    )
  }

  // A rejected href yields null here and falls through to the <button> branch, so
  // the control stays a real, focusable element that simply does not navigate.
  // The href, className and target/rel are spread AFTER the caller's props so
  // none of them can be overridden by a caller.
  const safeHref = sanitizeHref(href)
  if (safeHref) {
    const externalProps = IS_EXTERNAL.test(safeHref)
      ? { target: '_blank', rel: 'noopener noreferrer' }
      : {}
    return (
      <a {...props} href={safeHref} className={classes} {...externalProps}>
        {children}
      </a>
    )
  }

  // `type` and `disabled` apply to this branch only.
  return (
    <button type={type} disabled={disabled} className={classes} {...props}>
      {children}
    </button>
  )
}

export default Button
