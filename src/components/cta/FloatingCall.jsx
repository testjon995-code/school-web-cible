import { FaPhone } from 'react-icons/fa'
import { siteConfig } from '../../data/siteConfig.js'
import { cn } from '../../lib/cn.js'

/**
 * FloatingCall — the persistent click-to-call floating action button (FAB) for the
 * CIBLE School of Language SPA. The layout shell
 * (src/components/layout/Layout.jsx) renders it once alongside FloatingWhatsApp
 * and the mobile StickyBottomCTA, keeping the phone dialer one tap away on every
 * route at every width, which is how the site meets its "display WhatsApp and Call
 * actions prominently on mobile" conversion rule.
 *
 * Behaviour: an icon-only semantic anchor whose href is the `tel:` deep link read
 * from `siteConfig.phoneHref`. The number is never written here — it flows from the
 * single source of truth in src/data/siteConfig.js, so a contact change propagates
 * everywhere at once. A `tel:` scheme is not an http(s) URL, so it navigates in
 * place (no new tab, no rel) and the device dialer opens directly, matching the
 * non-external rule in the shared Button primitive.
 *
 * VISIBLE AT EVERY WIDTH — never `hidden`. Below `lg` this FAB and the sticky
 * bottom bar are both on screen by design: the bar carries the three-up Call /
 * WhatsApp / Admission row in the thumb zone while the FABs keep the same two
 * channels reachable from the corner. Both read the same `siteConfig.phoneHref`, so
 * the two presentations cannot disagree. If a fixed widget is found covering
 * something, the fix belongs on the OTHER surface: content that scrolls moves out
 * from under a viewport-anchored control, and the rows that cannot are the last
 * rows of the document, which the Footer reserves for on BOTH axes — `pb-20`
 * (relaxing to `lg:pb-8`) vertically for the mobile sticky bar, plus `sm:mr-20` on
 * its legal-link group, `sm:mx-20` on its representative-content notice and
 * `pr-16 sm:pr-0` on its copyright line horizontally for this FAB column. Hiding,
 * shrinking or relocating this FAB would break the derived offsets below and the
 * prominent-mobile-contact rule.
 *
 * Positioning & non-overlap contract (coordinated with FloatingWhatsApp and
 * StickyBottomCTA — change these three together):
 *   • This FAB sits directly ABOVE FloatingWhatsApp so the two never overlap, and
 *     both clear the mobile sticky bar.
 *   • Mobile (< lg): its bottom offset is one 56px FAB height plus a gap above
 *     FloatingWhatsApp's own offset; both clear the sticky bar's height.
 *   • Desktop (≥ lg): both FABs drop to their desktop offsets, keeping a
 *     comparable gap. The right gutter matches FloatingWhatsApp so the two align
 *     in one column.
 *   • `z-40` keeps the FAB above page content and below the nav drawer.
 *   • The 56px square size MUST stay identical to FloatingWhatsApp, because the
 *     stacked bottom offsets are derived from it. If either FAB's size changes,
 *     both sets of offsets must be re-derived together.
 *
 * Styling is fully token-driven (Tailwind v4 `@theme` tokens in src/index.css):
 * a brand-blue fill with a white icon that clears WCAG AA, a circular shape, the
 * floating-tier elevation token reserved for fixed surfaces, and a colour
 * transition. No hardcoded or arbitrary values.
 *
 * Interaction states run rest → hover → pressed → focus, the same ladder the
 * canonical <Button> exposes, so this control acknowledges a tap like every other
 * action on the site. The pressed step continues the same fill ramp hover walks and
 * is deliberately PAINT-ONLY — no transform, no size or position change — because
 * this element is `fixed` and its 56px box IS its touch target: scaling or nudging
 * it on press would move the target out from under the finger pressing it and would
 * invalidate the stacked-offset arithmetic above. `:active` is a native state on a
 * real anchor, so it needs no script and no extra ARIA.
 *
 * Accessibility (WCAG AA): the control is icon-only, so it carries an explicit
 * `aria-label`; the decorative glyph is hidden from assistive technology; the
 * global keyboard focus ring applies; and the 56px hit area exceeds the 44px
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
