import { FaPhone } from 'react-icons/fa'
import { siteConfig } from '../../data/siteConfig.js'
import { cn } from '../../lib/cn.js'

/**
 * FloatingCall — the persistent, always-visible click-to-call floating action
 * button (FAB) for the CIBLE School of Language SPA (AAP §0.6.1 Group 8). It is
 * rendered once by the layout shell (src/components/layout/Layout.jsx) alongside
 * FloatingWhatsApp and the mobile StickyBottomCTA, keeping the phone dialer one
 * tap away on every route at EVERY width — directly serving the AAP conversion
 * rule "Display WhatsApp and Call actions prominently on mobile."
 *
 * Behaviour: an icon-only semantic anchor whose href is the `tel:` deep link
 * read from siteConfig (the siteConfig.phoneHref `tel:` deep link). The number
 * is NEVER hardcoded here — it flows from the single source of truth in
 * src/data/siteConfig.js so brand/contact changes propagate automatically.
 * Because a `tel:` scheme is NOT an http(s) URL, it is treated as in-place
 * navigation (the anchor opens no new tab and carries no rel) so the device
 * dialer opens directly — matching the non-external rule in the shared Button
 * primitive.
 *
 * Visibility — EVERY width. This is a FROZEN contract, not a styling preference:
 * the AAP declares this widget's geometry (§0.7.1.7 Group 7 and §0.10.1.8) and
 * confines any change here to the elevation token alone, because the offsets are
 * derived arithmetic that other files depend on (see the sizing lock-step below
 * and Footer's document-end reservation). A previous change made both FABs
 * `hidden lg:flex` to clear page content and was reverted as an AAP regression.
 *   • `flex` at every breakpoint — never `hidden`. Below `lg` this FAB and the
 *     `lg:hidden` StickyBottomCTA bar are BOTH on screen by design: the bar
 *     carries the three-up Call / WhatsApp / Admission row in the thumb zone and
 *     the FABs keep the same two channels reachable from the corner without a
 *     visitor having to find the bar. Both read the same `siteConfig.phoneHref`,
 *     so the two presentations can never disagree.
 *   • If a fixed widget is measured covering something, the fix belongs on the
 *     OTHER surface, never here. Content that scrolls simply scrolls out from
 *     under a viewport-anchored control; the one row that cannot is the LAST row
 *     of the document. The Footer reserves VERTICALLY for the mobile sticky bar
 *     there (`pb-20`, relaxing to `lg:pb-8`), but it carries no horizontal
 *     reservation for this FAB column: the footer shell is a reference-only
 *     authority, so the residual overlap of its bottom-row legal links between
 *     roughly 1024px and 1392px is a KNOWN, DISCLOSED limitation awaiting a
 *     decision, not something to absorb here. Hiding, shrinking or relocating
 *     this FAB instead would break the derived offsets above and the rule
 *     mandating prominent mobile Call/WhatsApp.
 *
 * Positioning & non-overlap contract (VALIDATION-CRITICAL — coordinated with
 * FloatingWhatsApp + StickyBottomCTA):
 *   • This FAB sits directly ABOVE FloatingWhatsApp so the two never overlap,
 *     and both clear the mobile StickyBottomCTA bar.
 *   • Mobile (< lg): bottom-44 (176px). FloatingWhatsApp is at bottom-24 (96px)
 *     and is h-14 (56px) tall, occupying 96→152px, so this button at 176px sits
 *     ~24px above it. Both clear the ~60–64px sticky bar.
 *   • Desktop (≥ lg): lg:bottom-28 (112px); FloatingWhatsApp drops to
 *     lg:bottom-6 (24px → 24→80px), leaving a ~32px gap. The right gutter
 *     (right-4 / lg:right-6) matches the WhatsApp FAB so they align vertically.
 *   • z-40 keeps the FAB above page content but below the z-50 nav drawer.
 *   • Sizing is h-14 w-14 (56px) and MUST stay identical to FloatingWhatsApp —
 *     the stacked bottom offsets above are derived from this height. If either
 *     FAB's size changes, both FABs' offsets must be re-derived together.
 *
 * Styling is fully token-driven (Tailwind v4 @theme tokens in src/index.css):
 * brand-blue fill bg-primary-600 → hover bg-primary-700 with white icon
 * (contrast ≈ 5.17:1, passing WCAG AA for non-text/UI), rounded-full, the
 * brand shadow-float elevation reserved for fixed/floating surfaces, and a
 * colour transition. No hardcoded or arbitrary values are used.
 *
 * Interaction states — rest → hover → PRESSED → focus, the same four-step ladder
 * the canonical <Button> and StickyBottomCTA expose, so this control acknowledges
 * a tap like every other action on the site. `active:bg-primary-800` is the pressed
 * step, continuing the ramp hover already walks (`primary-600` → `primary-700` →
 * `primary-800`) and matching <Button>'s own primary ladder exactly. It is
 * deliberately PAINT-ONLY — no transform, no size or position change — because this
 * element is `fixed` and its 56px box IS its touch target, so scaling or nudging it
 * on press would move the target out from under the finger pressing it and would
 * invalidate the stacked-offset arithmetic recorded above. Contrast holds: white on
 * `primary-800` (#1e40af) is ≈ 8.6:1. `:active` is a pointer/keys state on a real
 * anchor, so it needs no script and no extra ARIA.
 *
 * Accessibility (WCAG AA): the control is icon-only, so it carries an explicit
 * accessible name via aria-label="Call CIBLE"; the decorative FaPhone glyph is
 * hidden from assistive tech with aria-hidden="true"; a visible keyboard focus
 * ring is exposed via :focus-visible; and the 56px hit area exceeds the 44px
 * touch-target guideline.
 *
 * @returns {import('react').ReactElement} A fixed-position <a> click-to-call FAB.
 */
function FloatingCall() {
  return (
    <a
      href={siteConfig.phoneHref}
      aria-label="Call CIBLE"
      className={cn(
        'fixed bottom-44 right-4 z-40 lg:bottom-28 lg:right-6',
        'flex h-14 w-14 items-center justify-center rounded-full',
        'bg-primary-600 text-white shadow-float transition-colors duration-200 hover:bg-primary-700 active:bg-primary-800',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
      )}
    >
      <FaPhone aria-hidden="true" className="h-6 w-6" />
    </a>
  )
}

export default FloatingCall
