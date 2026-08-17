import { FaWhatsapp } from 'react-icons/fa'
import { siteConfig } from '../../data/siteConfig.js'
import { cn } from '../../lib/cn.js'

/**
 * FloatingWhatsApp — the persistent WhatsApp floating action button (FAB) for the
 * CIBLE School of Language SPA. It anchors a one-tap chat link to the bottom-right
 * corner of every page at every width, which is how the site meets its "display
 * WhatsApp and Call actions prominently on mobile" conversion rule.
 *
 * src/components/layout/Layout.jsx renders it alongside <FloatingCall /> and the
 * mobile <StickyBottomCTA /> bar. It takes no props.
 *
 * Behaviour — an icon-only semantic <a> that opens a WhatsApp conversation with the
 * institute. The number and the pre-filled message are read from siteConfig; the
 * number is never written in this component. External-link semantics
 * (`target="_blank"` + `rel="noopener noreferrer"`) mirror the shared Button
 * primitive's behaviour for http(s) URLs.
 *
 * VISIBLE AT EVERY WIDTH — never `hidden`. Below `lg` this FAB and the sticky
 * bottom bar are both on screen by design: the bar carries the three-up Call /
 * WhatsApp / Admission row in the thumb zone while the FABs keep the same two
 * channels reachable from the corner. Both read the same `siteConfig.whatsappHref`,
 * so they cannot disagree, and neither needs a scroll or resize observer to police
 * its position. If a fixed widget is found covering something, the fix belongs on
 * the OTHER surface: scrolling content moves out from under a viewport-anchored
 * control by itself, and the rows that cannot are the last rows of the document,
 * which the Footer reserves for on BOTH axes — `pb-20` (relaxing to `lg:pb-8`)
 * vertically for the mobile sticky bar, plus `sm:mr-20` on its legal-link group,
 * `sm:mx-20` on its representative-content notice and `pr-16 sm:pr-0` on its
 * copyright line horizontally for this FAB column. Hiding or relocating this FAB
 * would break the derived offsets below and the prominent-mobile-contact rule.
 *
 * Positioning / non-overlap contract (keep in sync with FloatingCall and
 * StickyBottomCTA):
 *   • This FAB is the BOTTOM-MOST of the two floating buttons.
 *   • Mobile (< lg): its bottom offset clears the sticky bottom bar, which is
 *     hidden from `lg` and pinned to the bottom edge, with margin to spare.
 *   • Desktop (≥ lg): the bar is gone, so the FAB drops to the normal corner
 *     offset, and the right gutter widens with it.
 *   • `z-40` keeps it above page content but below the nav drawer.
 *   • SIZING LOCK-STEP: this FAB is a 56px square and FloatingCall sits directly
 *     above it at an offset derived from that size. Changing the size REQUIRES
 *     re-deriving the sibling's offset to preserve the non-overlap gap.
 *
 * Accessibility (WCAG AA):
 *   • Icon-only control → `aria-label` supplies the accessible name; the glyph is
 *     decorative and marked `aria-hidden`.
 *   • The 56px touch target exceeds the 44px guideline comfortably.
 *   • Visible keyboard focus via an accent focus ring, which overrides the global
 *     primary outline so the indicator matches this green control.
 *   • Contrast rationale (documented so it is not "corrected"): the white glyph on
 *     the accent fill satisfies WCAG 1.4.11 Non-text Contrast (≥ 3:1), the correct
 *     bar for a graphical control — the stricter 4.5:1 rule governs normal TEXT,
 *     not icons — and the hover fill is darker still. The green comes from the
 *     brand accent token; the WhatsApp-brand hex is intentionally not used.
 *
 * Styling — every value resolves to a Tailwind v4 `@theme` token (src/index.css),
 * elevation included: the floating tier, deliberately not the card step. No
 * hardcoded or arbitrary values, and classes compose through `cn()` so the string
 * stays mergeable. `prefers-reduced-motion` is neutralised globally in
 * src/index.css, so the colour transition needs no extra handling here.
 *
 * Interaction states run rest → hover → pressed → focus, the same ladder the
 * canonical <Button> exposes, so this control acknowledges a tap like every other
 * action on the site. The pressed step walks one rung further down the same accent
 * ramp hover uses and stays past both contrast floors. It is deliberately
 * PAINT-ONLY — no transform, no size or position change — because this element is
 * `fixed` and its 56px box IS its touch target: scaling or nudging it on press
 * would move the target out from under the finger pressing it and would invalidate
 * the non-overlap arithmetic above. `:active` is a native state on a real anchor,
 * so it needs no script and no extra ARIA.
 *
 * @returns {import('react').ReactElement} A fixed-position WhatsApp deep-link anchor.
 */
function FloatingWhatsApp() {
  // Build the deep link from siteConfig. A configured pre-filled message is
  // appended as a URL-encoded query, which the punctuation and spaces in that
  // message require; the guard keeps the link working if the message is ever
  // removed, and the base always comes from siteConfig so the number is never
  // written literally.
  const href = siteConfig.whatsappMessage
    ? `${siteConfig.whatsappHref}?text=${encodeURIComponent(siteConfig.whatsappMessage)}`
    : siteConfig.whatsappHref

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with CIBLE on WhatsApp"
      className={cn(
        'fixed bottom-24 right-4 z-40 lg:bottom-6 lg:right-6',
        'flex h-14 w-14 items-center justify-center rounded-full',
        'bg-accent-600 text-white shadow-float transition-colors duration-200 hover:bg-accent-700 active:bg-accent-800',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2',
      )}
    >
      <FaWhatsapp aria-hidden="true" className="h-7 w-7" />
    </a>
  )
}

export default FloatingWhatsApp
