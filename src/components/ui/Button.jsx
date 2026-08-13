import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn.js'

/**
 * Button — the single canonical, polymorphic button for the CIBLE School of
 * Language SPA (AAP §0.6.1 Group 6). It is reused everywhere: the Navbar
 * "Admission" CTA and click-to-call action, every page's CTASection, the Hero
 * dual CTAs, cards, form submit controls, and the floating / sticky conversion
 * widgets. There must be exactly ONE button implementation in the codebase —
 * always compose this component, never fork a second one.
 *
 * Polymorphic rendering (precedence: `to` > `href` > native `<button>`):
 *   • `to`   → a react-router <Link> for internal SPA navigation (client-side).
 *   • `href` → a semantic <a>, gated by a strict protocol allowlist
 *              (sanitizeHref): only http(s), tel:, mailto:, and scheme-less
 *              relative references are honoured. External http(s) URLs
 *              (including the WhatsApp deep link https://wa.me/919899315093)
 *              open in a new tab with rel="noopener noreferrer"; tel:
 *              (+919899315093) and mailto: open in place so the device dialer /
 *              mail client launches directly. A disallowed scheme
 *              (javascript:, data:, …) is rejected and the control degrades to
 *              a non-navigating <button>. href and the security props are
 *              enforced AFTER caller props, so they cannot be overridden.
 *   • otherwise → a semantic <button> with an explicit `type` (default
 *              'button') and native `disabled` support.
 *
 * Styling is entirely token-driven (Tailwind v4 @theme tokens defined in
 * src/index.css) — every color, radius, spacing and size resolves to a design
 * token or utility, with no hardcoded values. The blue / orange / green fills
 * are locked to WCAG-AA-compliant shades: white text is used ONLY on
 * primary-600, secondary-700 (hover -800) and accent-700 (hover -800); the
 * `outline` variant renders primary-600 text on a transparent surface with a
 * primary-50 hover tint. (secondary-600 = #ea580c is only ~3.56:1 under white
 * text and fails AA, so the secondary fill starts at -700 = #c2410c ≈ 5.18:1.)
 *
 * Emphasis ladder — filled (`primary`/`secondary`/`accent`) > `outline` >
 * `tertiary`. Pick the LOWEST tier that still reads as actionable, so the
 * admission primary always stays dominant; `tertiary` is never the admission
 * action itself. `tertiary` drops the fill AND the border and keeps a
 * PERSISTENT underline, so its lower emphasis is a shape difference rather than
 * a color difference and survives without color vision (WCAG "never color
 * alone") — the same reasoning that makes `Card` signal hover by shadow.
 *
 * Interactive states: hover is declared per variant, keyboard focus is the ONE
 * shared :focus-visible ring in `base`, and disabled is `base`'s native-`disabled`
 * treatment (`disabled:pointer-events-none disabled:opacity-50`). Pressed feedback
 * is declared where a variant has nothing to borrow it from: the filled variants
 * and `outline` each swap a fill or lay down a tint, which is already a visible
 * change while the control is held, whereas `tertiary` rests with no fill and no
 * border at all. It therefore carries an explicit `active:` treatment — a deeper
 * primary-100 wash plus a thickened underline — and the thickening is what keeps
 * the press perceptible on touch and without color vision.
 *
 * Sizes sit on the 8px scale and EVERY size is at least 44px tall — sm/md
 * (44px) and lg (48px) — plus a `min-w-11` floor on the shared base, so all
 * renderings (including icon-only) meet the WCAG 2.5.5/2.5.8 touch-target
 * guideline. `sm` is "compact" only in padding/text, never in hit area.
 *
 * Accessibility: a semantic element is rendered for every usage (never a
 * clickable <div>); a visible :focus-visible ring is exposed on all three
 * renderings via the shared base classes; and arbitrary props (onClick,
 * aria-*, etc.) are forwarded. When a button contains only an icon, the caller
 * MUST pass an `aria-label` (forwarded via `...props`) so the control has an
 * accessible name.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'accent'|'outline'|'tertiary'} [props.variant='primary'] Visual style.
 * @param {'sm'|'md'|'lg'} [props.size='md'] Control height / padding on the 8px scale.
 * @param {string} [props.to] Internal route path → renders a react-router <Link>.
 * @param {string} [props.href] URL → renders an <a>; external http(s) opens in a new tab.
 * @param {'button'|'submit'|'reset'} [props.type='button'] Native type (native <button> only).
 * @param {string} [props.className] Extra classes, merged LAST so callers can override.
 * @param {import('react').ReactNode} [props.children] Button content (label and/or icon).
 * @param {boolean} [props.disabled=false] Disables the native <button>.
 * @returns {import('react').ReactElement} A <Link>, <a>, or <button> styled per variant/size.
 */

// Shared, always-applied classes: layout, shape, typography, motion, the
// keyboard focus ring, and the disabled treatment. Module-local (not exported)
// so the file exposes only the Button component (react/only-export-components).
// `min-h-11 min-w-11` guarantees a ≥44×44px hit area on EVERY rendering
// (including icon-only buttons and the compact `sm` size), satisfying the WCAG
// 2.5.5 / 2.5.8 touch-target guideline for the canonical control.
const base =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

// Variant fills — locked to AA-compliant shades (see the WCAG note above and
// the guidance block in src/index.css). Do NOT substitute lighter shades
// (secondary-500 / secondary-600 / accent-600) under white text; they fail AA
// for normal text (secondary-600 = #ea580c is only ~3.56:1, secondary-700 =
// #c2410c ≈ 5.18:1). Keys are ordered as the emphasis ladder (see JSDoc above).
// `tertiary` lowers emphasis by removing the fill and border, NOT by lightening
// the label: primary-700 is darker than `outline`'s primary-600 and measures
// ≈ 6.7:1 on white, ≈ 6.4:1 on `surface` and ≈ 6.2:1 on the CTASection tint —
// the light-fill/dark-text direction `Badge` also uses. Because it starts with no
// fill and no border, its hover and pressed feedback has to be authored
// explicitly rather than inherited: `hover:` deepens the label and lays down a
// primary-50 wash, and `active:` steps that wash to primary-100 AND thickens the
// underline (`decoration-2`), so the pressed state is legible as a SHAPE change
// on touch, where no hover phase exists. Both pressed pairings stay AA for normal
// text — primary-700 on primary-100 ≈ 6.0:1, primary-800 on primary-100 ≈ 7.8:1.
// When editing it: keep `underline` unprefixed (a hover-only underline fails the
// non-color-cue rule), keep an `active:` cue that is not color-only, and add no
// height/padding/leading utility (that would breach the ≥44px touch target `base`
// guarantees — `decoration-*` and `bg-*` are non-layout, which is why they are
// the safe choices here).
const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700',
  secondary: 'bg-secondary-700 text-white hover:bg-secondary-800',
  accent: 'bg-accent-700 text-white hover:bg-accent-800',
  outline: 'border-2 border-primary-600 bg-transparent text-primary-600 hover:bg-primary-50',
  tertiary:
    'bg-transparent text-primary-700 underline underline-offset-4 hover:bg-primary-50 hover:text-primary-800 active:bg-primary-100 active:decoration-2',
}

// Size steps on the 8px scale. ALL sizes are ≥44px tall (h-11 = 44px, h-12 =
// 48px) so every size meets the WCAG touch-target guideline; `sm` is the
// "compact" step — same 44px height but tighter horizontal padding and smaller
// text for dense contexts (e.g. inline card actions), NOT a smaller hit area.
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
 * Returns the trimmed href when it is safe to place on an anchor — namely an
 * `http(s):`, `tel:`, or `mailto:` absolute URL, or any scheme-less relative
 * reference (`/courses`, `#section`, `?q=1`). Any other explicit scheme
 * (`javascript:`, `data:`, `vbscript:`, …) is rejected and yields `null`, so a
 * hostile or mistaken caller can never turn the canonical Button into a script
 * or data-URI injection vector (m03).
 *
 * @param {unknown} value - The candidate href.
 * @returns {string|null} The safe href, or `null` when the scheme is disallowed.
 */
function sanitizeHref(value) {
  if (typeof value !== 'string') return null
  const href = value.trim()
  if (!href) return null
  if (SAFE_ABSOLUTE_SCHEME.test(href)) return href
  if (HAS_URL_SCHEME.test(href)) return null // an explicit, non-allowlisted scheme → unsafe
  return href // scheme-less relative reference → safe
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
  // Compose base + variant + size, then merge the caller's className LAST so it
  // can override any preceding utility. Unknown variant/size fall back to the
  // primary / md defaults so the button always renders a styled control.
  const classes = cn(base, variants[variant] || variants.primary, sizes[size] || sizes.md, className)

  // Internal SPA navigation takes precedence: render a client-side <Link>.
  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    )
  }

  // External / protocol links render a semantic <a>, but ONLY after the href
  // passes the protocol allowlist (sanitizeHref). http(s) and protocol-relative
  // URLs are "external" and open in a new tab with rel="noopener noreferrer";
  // tel:/mailto: open in place so the native handler (dialer, mail client)
  // launches directly. An href with a disallowed scheme (javascript:, data:, …)
  // yields safeHref=null and falls through to the <button> branch below, so the
  // control stays a real, focusable element that simply does not navigate.
  //
  // Security props are applied AFTER the caller's {...props} so href, the merged
  // className, and target/rel cannot be overridden by a future caller (m03).
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

  // Default: a real <button>. `type` and `disabled` apply only here.
  return (
    <button type={type} disabled={disabled} className={classes} {...props}>
      {children}
    </button>
  )
}

export default Button
