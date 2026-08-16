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
 * is declared on EVERY variant, because hover does not exist on touch and a tap
 * with no acknowledgement reads as a dead control: each filled variant steps one
 * rung further down its own ramp than its hover, `outline` deepens its wash AND
 * its label together (the wash alone would drop its primary-600 text below AA),
 * and `tertiary` — which rests with no fill and no border to deepen — pairs its
 * primary-100 wash with a thickened underline, so its press stays perceptible
 * without color vision. All pressed treatments are paint-only, so none of them
 * moves the box.
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
// text — measured: primary-700 on primary-100 = 5.49:1, primary-800 on
// primary-100 = 7.15:1.
// When editing it: keep `underline` unprefixed (a hover-only underline fails the
// non-color-cue rule), keep an `active:` cue that is not color-only, and add no
// height/padding/leading utility (that would breach the ≥44px touch target `base`
// guarantees — `decoration-*` and `bg-*` are non-layout, which is why they are
// the safe choices here).
//
// Pressed feedback is declared on EVERY variant, not just `tertiary`. Hover is
// unavailable on touch, so without an `active:` step a tap produces no visual
// acknowledgement at all until the navigation completes — which on a slow route
// chunk reads as a dead control and invites a second tap. Each filled variant
// therefore steps ONE rung further down its own ramp than its hover
// (primary 600→700→800, secondary 700→800→900, accent 700→800→900), and
// `outline` deepens its wash from primary-50 to primary-100. Every pressed
// pairing is AA for normal text — measured in-browser, not estimated: white on
// primary-800 = 8.72:1, on secondary-900 = 9.37:1, on accent-900 = 9.11:1, and
// every pressed ratio is HIGHER than its resting one, so the press deepens the
// surface and legibility improves rather than degrades. `outline` is the one
// case where the wash alone
// is NOT enough — primary-600 on primary-100 measures 4.24:1 and FAILS the
// 4.5:1 floor — so it deepens the label to primary-700 in the same step
// (5.49:1). Never pair `outline`'s resting primary-600 label with a
// primary-100 or darker fill.
// Scope note: `active:` is a TRANSIENT press acknowledgement, not a persistent
// state, so a colour-only cue is appropriate here; the states this design system
// treats as information — active route, disabled, and the emphasis tier itself —
// each keep their non-colour channel (underline, opacity, fill-vs-border).
// When editing: use only `bg-*`/`text-*` steps from the @theme ramps (both are
// paint-only), never a transform, size, border-width or shadow utility — those
// would move the box and breach the ≥44px target and the zero-CLS guarantee.
const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
  secondary: 'bg-secondary-700 text-white hover:bg-secondary-800 active:bg-secondary-900',
  accent: 'bg-accent-700 text-white hover:bg-accent-800 active:bg-accent-900',
  outline:
    'border-2 border-primary-600 bg-transparent text-primary-600 hover:bg-primary-50 active:bg-primary-100 active:text-primary-700',
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
// Characters the URL parser silently DISCARDS from anywhere inside a URL: ASCII
// tab (U+0009), LF (U+000A) and CR (U+000D). They are removed before any scheme
// test so the allowlist below inspects the string the browser will actually act
// on: "java\tscript:alert(1)" reaches the parser as javascript:alert(1), yet it
// matches neither SAFE_ABSOLUTE_SCHEME nor HAS_URL_SCHEME while the tab is still
// in place, and would therefore have been waved through as a scheme-less
// relative reference (m03 hardening).
const URL_IGNORED_CHARS = /[\t\n\r]/g
/**
 * Report whether a candidate href still carries a control character after the
 * parser-ignored ones have been stripped.
 *
 * A leading NUL is the classic scheme-hiding trick, and no control character is
 * ever legitimate in an href this application authors — the draft `mailto:` /
 * `wa.me` URLs are percent-encoded at the call site, so a real newline arrives
 * as `%0A`. Such a candidate is therefore rejected outright rather than
 * normalized into something that merely looks safe.
 *
 * Written as code-point arithmetic rather than a regex character class on
 * purpose: a literal control-character class is exactly the pattern
 * `no-control-regex` (correctly) treats as a likely mistake, and naming the
 * numeric ranges makes the intent unambiguous — C0 is 0x00–0x1F, DEL is 0x7F,
 * and C1 is 0x80–0x9F. Iterating with `for…of` walks code points, so a surrogate
 * pair is never mistaken for two lone units.
 *
 * @param {string} value - A candidate href, already stripped of tab/LF/CR.
 * @returns {boolean} `true` when any C0, DEL or C1 character remains.
 */
function hasControlChar(value) {
  for (const char of value) {
    const code = char.codePointAt(0)
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true
  }
  return false
}

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
 * Obfuscated schemes are normalized BEFORE the allowlist runs, so the check sees
 * the URL the browser will act on rather than the literal the caller passed:
 * the three characters the URL parser discards are stripped (`java\tscript:` →
 * `javascript:` → rejected), and any remaining C0/C1 control character rejects
 * the value outright. Without that step React 19 would be the only thing left
 * standing between such a value and the DOM — and it now *throws* on a
 * `javascript:` href, so an obfuscated value would take the whole route down
 * instead of degrading. Here it degrades: the control renders as a real,
 * focusable `<button>` that simply does not navigate.
 *
 * @param {unknown} value - The candidate href.
 * @returns {string|null} The safe, parser-normalized href, or `null` when the
 *   value carries a disallowed scheme or a control character.
 */
function sanitizeHref(value) {
  if (typeof value !== 'string') return null
  // Strip the parser-ignored characters FIRST, then trim: doing it in this order
  // also collapses values that pad a scheme with a mixture of tabs, newlines and
  // spaces (" \t javascript:…"), which trimming alone would leave intact.
  const href = value.replace(URL_IGNORED_CHARS, '').trim()
  if (!href) return null
  if (hasControlChar(href)) return null // a surviving control character → unsafe
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
