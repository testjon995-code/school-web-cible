import { FaPhone, FaWhatsapp } from 'react-icons/fa'
import { siteConfig } from '../../data/siteConfig.js'
import { cn } from '../../lib/cn.js'
import Button from '../ui/Button.jsx'

/**
 * StickyBottomCTA — the mobile-only sticky bottom action bar for the CIBLE School
 * of Language SPA. `src/components/layout/Layout.jsx` renders it once alongside the
 * FloatingWhatsApp and FloatingCall widgets. It pins a full-width bar to the bottom
 * of the viewport carrying the three highest-intent conversion actions — Call,
 * WhatsApp and Admission — so they stay reachable while a visitor scrolls on a
 * small screen, which is how the site meets its "every page includes clear
 * admission-focused CTAs" and "display WhatsApp and Call actions prominently on
 * mobile" rules where thumb reach matters most.
 *
 * Visibility: the bar is MOBILE-ONLY — it renders below the `lg` breakpoint and is
 * hidden from `lg` up, where the persistent floating action buttons alone carry the
 * contact channels. It is also the only one of the three widgets that offers
 * Admission.
 *
 * The vertical relationship with the two FABs is load-bearing, which is why the bar
 * cannot move: both FABs render at every width and their mobile offsets are derived
 * from THIS bar's height plus a clearance gap (see each widget's own positioning
 * contract). Raising the bar's height, or making it visible at `lg`, therefore
 * requires re-deriving both FAB offsets in lock-step. Page-content clearance for
 * the bar is reserved once, globally, by the `.shell-bottom-clearance` utility on
 * the layout shell (src/index.css).
 *
 * Reuse-first: all three actions are the single canonical `Button` primitive, never
 * a re-styled anchor. Because `Button` is polymorphic, each action renders the
 * right semantic element automatically — a `tel:` anchor that opens the dialer in
 * place, an external anchor for the chat link, and a client-side route link for
 * Admission — so react-router is used transitively through `Button` and never
 * imported here. Contact targets always come from `siteConfig`, so one data edit
 * updates every contact entry point in the app.
 *
 * Layout & sizing: a three-column grid gives the actions equal width, and each
 * Button keeps the shared 44px height while its padding and text size are trimmed
 * (merged last by `Button`'s own `cn`, so they win over the defaults) so three
 * labels fit without wrapping at the narrowest supported width. The bar sits at
 * `z-40`, the same layer as the FABs, which are offset above it and so never
 * overlap it.
 *
 * Accessibility (WCAG AA): every action carries a visible text label, which is its
 * accessible name, so the leading icons are decorative and `aria-hidden`. The
 * semantic elements and the focus ring come from the shared `Button`, and the
 * container is a neutral grouping whose children are each individually labelled, so
 * it needs no ARIA label of its own.
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens from src/index.css)
 * on the 8px scale, with no hardcoded or arbitrary bracket values. The elevation is
 * the shared floating tier (`--shadow-float`) — one step above the card hover
 * rather than a reuse of it — so all three persistent widgets read as one layer. The bar's bottom padding
 * comes from the shared `.cta-safe-bottom` class rather than a padding utility: it
 * keeps the base padding AND adds the device safe-area inset on top, so the actions
 * are intended to clear a home indicator where the platform reports one, and
 * rendering is unchanged where it reports none. That inset is the same shared design
 * variable the persistent shell uses for its bottom clearance, which keeps the bar
 * and the shell in lock-step.
 *
 * The component takes no props and renders identically everywhere it is mounted.
 *
 * @returns {import('react').ReactElement} The mobile-only sticky action bar.
 */
function StickyBottomCTA() {
  // A configured pre-filled enquiry message is appended as a URL-encoded query so
  // the chat opens with it pre-written; otherwise the bare link is used. The number
  // always comes from siteConfig, keeping data as the single source of truth.
  const whatsappHref = siteConfig.whatsappMessage
    ? `${siteConfig.whatsappHref}?text=${encodeURIComponent(siteConfig.whatsappMessage)}`
    : siteConfig.whatsappHref

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 lg:hidden',
        'grid grid-cols-3 gap-2 border-t border-border bg-white px-2 pt-2 shadow-float cta-safe-bottom',
      )}
    >
      {/* Icon sizing (do not drop `shrink-0`): `Button`'s base is an `inline-flex`
          row, so a glyph's default `flex-shrink: 1` lets it donate width whenever the
          label needs more than the third-of-viewport column has — and an SVG is a
          replaced element with an intrinsic aspect ratio, so it loses width instead of
          the text wrapping. Measured at 320px before this was pinned: the WhatsApp
          glyph, whose label is the longest of the three, computed 0.92×16 — present in
          the DOM but effectively invisible — and 14.25×16 at 360px, while the shorter
          "Call" label left its phone glyph untouched at 16×16. Since a project rule
          requires the WhatsApp and Call actions to be PROMINENT on mobile, a glyph
          that silently collapses at the narrowest phone width defeats the rule at
          exactly the width it matters most. This is the same convention the contact
          cards and the footer use for a leading icon inside a flex row. */}
      <Button href={siteConfig.phoneHref} variant="primary" size="md" className="w-full px-2 text-sm">
        <FaPhone aria-hidden="true" className="h-4 w-4 shrink-0" />
        Call
      </Button>

      <Button href={whatsappHref} variant="accent" size="md" className="w-full px-2 text-sm">
        <FaWhatsapp aria-hidden="true" className="h-4 w-4 shrink-0" />
        WhatsApp
      </Button>

      {/* Admission is the priority conversion action, so it takes the one variant
          the two contact channels do not: blue matches FloatingCall and green
          matches FloatingWhatsApp, leaving orange to mark this apart from both. */}
      <Button to="/admission" variant="secondary" size="md" className="w-full px-2 text-sm">
        Admission
      </Button>
    </div>
  )
}

export default StickyBottomCTA
