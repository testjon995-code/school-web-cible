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
 * native-`disabled` treatment. Pressed feedback is declared on EVERY variant,
 * because hover does not exist on touch and a tap with no acknowledgement reads as
 * a dead control: each filled variant steps one rung further down its own ramp
 * than its hover, `outline` deepens its wash AND its label together (the wash
 * alone would drop its primary-600 text below AA), and `tertiary` — which rests
 * with no fill and no border to deepen — pairs its wash with a thickened
 * underline, so its press stays perceptible without colour vision. Every pressed
 * treatment is paint-only, so none of them moves the box.
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
// and no border, its hover and pressed steps must LAY DOWN a wash and a shape cue
// rather than deepen one that is already there, which is why it is the one variant
// whose pressed step also thickens its underline.
// When editing it: keep the underline unprefixed (a hover-only underline fails the
// non-colour-cue rule), keep a pressed cue that is not colour-only, and add no
// height, padding or leading utility, which would breach the ≥44px touch target
// the base classes guarantee — text-decoration and background are non-layout,
// which is why they are the safe choices.
//
// Pressed feedback is declared on EVERY variant, not only `tertiary`. Hover does
// not exist on touch, so without an `active:` step a tap produces no visual
// acknowledgement at all until the navigation completes — which on a slow route
// chunk reads as a dead control and invites a second tap. Each filled variant
// therefore steps ONE rung further down its own ramp than its hover
// (primary 600→700→800, secondary 700→800→900, accent 700→800→900), and `outline`
// deepens its wash from primary-50 to primary-100. Every pressed pairing clears AA
// for normal text — measured, not estimated: white on primary-800 = 8.72:1, on
// secondary-900 = 9.37:1, on accent-900 = 9.11:1, so each press deepens the surface
// and legibility improves rather than degrades. `outline` is the one case where the
// wash alone is NOT enough — primary-600 on primary-100 is 4.24:1 and FAILS the
// 4.5:1 floor — so it deepens its label to primary-700 in the same step (5.49:1).
// Never pair `outline`'s resting primary-600 label with a primary-100 or darker fill.
// Scope note: `active:` is a TRANSIENT press acknowledgement, not a persistent
// state, so a colour-only cue is appropriate here; the states this design system
// treats as information — active route, disabled, and the emphasis tier itself —
// each keep their own non-colour channel (underline, opacity, fill-vs-border).
// Use only `bg-*`/`text-*` steps from the @theme ramps, which are paint-only; never
// a transform, size, border-width or shadow utility, which would move the box and
// breach both the ≥44px target and the zero-layout-shift guarantee.
const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
  secondary: 'bg-secondary-700 text-white hover:bg-secondary-800 active:bg-secondary-900',
  accent: 'bg-accent-700 text-white hover:bg-accent-800 active:bg-accent-900',
  outline:
    'border-2 border-primary-600 bg-transparent text-primary-600 hover:bg-primary-50 active:bg-primary-100 active:text-primary-700',
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
// Characters the URL parser silently DISCARDS from anywhere inside a URL: ASCII
// tab (U+0009), LF (U+000A) and CR (U+000D). They are stripped before any scheme
// test so the allowlist below inspects the string the browser will actually act
// on: "java\tscript:alert(1)" reaches the parser as javascript:alert(1), yet with
// the tab still in place it matches NEITHER SAFE_ABSOLUTE_SCHEME nor
// HAS_URL_SCHEME — both anchor a scheme of only [a-z0-9+.-] at index 0 — so it
// would otherwise fall through the final `return href` and be waved past as a
// scheme-less relative reference.
const URL_IGNORED_CHARS = /[\t\n\r]/g

/**
 * Report whether a candidate href still carries a control character after the
 * parser-ignored ones have been stripped.
 *
 * A leading NUL is the classic scheme-hiding trick, and no control character is
 * ever legitimate in an href this application authors — the draft `mailto:` and
 * `wa.me` URLs are percent-encoded at their call sites, so a real newline arrives
 * as `%0A`. Such a candidate is therefore rejected outright rather than
 * normalized into something that merely looks safe.
 *
 * Written as code-point arithmetic rather than a regex character class on
 * purpose: a literal control-character class is exactly the pattern
 * `no-control-regex` (correctly) treats as a likely mistake, and naming the
 * numeric ranges makes the intent unambiguous — C0 is 0x00–0x1F, DEL is 0x7F and
 * C1 is 0x80–0x9F. Iterating with `for…of` walks code points, so a surrogate pair
 * is never mistaken for two lone units.
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
 * Returns the normalized href when it is safe to place on an anchor — an
 * `http(s):`, `tel:` or `mailto:` absolute URL, or any scheme-less relative
 * reference (`/courses`, `#section`, `?q=1`). Any other explicit scheme
 * (`javascript:`, `data:`, `vbscript:`, …) yields `null`, so a hostile or mistaken
 * caller cannot turn the canonical Button into a script or data-URI injection
 * vector.
 *
 * Obfuscated schemes are normalized BEFORE the allowlist runs, so the check sees
 * the URL the browser will act on rather than the literal the caller passed: the
 * three characters the URL parser discards are stripped (`java\tscript:` →
 * `javascript:` → rejected), and any surviving C0/DEL/C1 control character
 * rejects the value outright. Without that step React 19 would be the last thing
 * standing between such a value and the DOM — and it *throws* on a `javascript:`
 * href, so an obfuscated value would take the whole route down instead of
 * degrading. Here it degrades: the control renders as a real, focusable
 * `<button>` that simply does not navigate.
 *
 * @param {unknown} value - The candidate href.
 * @returns {string|null} The safe, parser-normalized href, or `null` when the
 *   value carries a disallowed scheme or a control character.
 */
function sanitizeHref(value) {
  if (typeof value !== 'string') return null
  // Strip the parser-ignored characters FIRST, then trim: in this order a value
  // that pads its scheme with a mixture of tabs, newlines and spaces
  // (" \t javascript:…") also collapses, which trimming alone would leave intact.
  const href = value.replace(URL_IGNORED_CHARS, '').trim()
  if (!href) return null
  if (hasControlChar(href)) return null // a surviving control character → unsafe
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
