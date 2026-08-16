import { FaPhone } from 'react-icons/fa'
import { siteConfig } from '../../data/siteConfig.js'
import { cn } from '../../lib/cn.js'

/**
 * FloatingCall — the persistent click-to-call floating action button (FAB) for
 * the CIBLE School of Language SPA (AAP §0.6.1 Group 8). It is rendered once by
 * the layout shell (src/components/layout/Layout.jsx) alongside FloatingWhatsApp
 * and the mobile StickyBottomCTA, keeping the phone dialer one click away on
 * every route from the `lg` breakpoint upward — the widths at which the mobile
 * bar is hidden and these two FABs are the persistent conversion affordance.
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
 * Visibility — `lg` AND UP, complementary to the mobile bar (closes the measured
 * content-obstruction defect; keep this reasoning with the code):
 *   • `hidden lg:flex`. Below `lg` the `lg:hidden` StickyBottomCTA bar already
 *     surfaces Call, WhatsApp and Admission as three 44px targets in the thumb
 *     zone, so the project rule "display WhatsApp and Call actions prominently on
 *     mobile" is met there by ONE affordance instead of two.
 *   • Rendering both put a 56px circle inside the content column at phone widths
 *     — `Container`'s gutter is only 16px (`px-4`), so a `right-4` FAB occupied
 *     the column's own last 56px. Measured at 390px this button covered the hero
 *     "WhatsApp" CTA across that CTA's full 44px height (2464px²), and on
 *     /contact it sat entirely inside the consent paragraph (3136px²), truncating
 *     three words per line-end.
 *   • Nothing is withdrawn: the dialer stays one tap away at EVERY width — from
 *     the bar below `lg`, from this FAB at `lg` and above — and both read the same
 *     `siteConfig.phoneHref`. Being mutually exclusive by breakpoint is also what
 *     keeps this fix free of any scroll/resize observer.
 *
 * Positioning & non-overlap contract (VALIDATION-CRITICAL — coordinated with
 * FloatingWhatsApp + StickyBottomCTA):
 *   • This FAB sits directly ABOVE FloatingWhatsApp so the two never overlap.
 *   • bottom-28 (112px), occupying 112→168px. FloatingWhatsApp is at bottom-6
 *     (24px) and is h-14 (56px) tall, occupying 24→80px, so a 32px gap separates
 *     them. The sticky bar is not rendered at these widths, so there is no bar
 *     clearance to reserve.
 *   • The right gutter (right-6, 24px) matches the WhatsApp FAB so they align
 *     vertically.
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
        'fixed bottom-28 right-6 z-40',
        'hidden h-14 w-14 items-center justify-center rounded-full lg:flex',
        'bg-primary-600 text-white shadow-float transition-colors duration-200 hover:bg-primary-700',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
      )}
    >
      <FaPhone aria-hidden="true" className="h-6 w-6" />
    </a>
  )
}

export default FloatingCall
