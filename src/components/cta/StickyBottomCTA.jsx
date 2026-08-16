import { FaPhone, FaWhatsapp } from 'react-icons/fa'
import { siteConfig } from '../../data/siteConfig.js'
import { cn } from '../../lib/cn.js'
import Button from '../ui/Button.jsx'

/**
 * StickyBottomCTA — the mobile-only sticky bottom action bar for the CIBLE
 * School of Language SPA (AAP §0.6.1 Group 8). Rendered once by
 * `src/components/layout/Layout.jsx` alongside the FloatingWhatsApp and
 * FloatingCall widgets, it pins a full-width bar to the bottom of the viewport
 * that surfaces the three highest-intent conversion actions — Call, WhatsApp
 * and Admission — so they stay reachable while a visitor scrolls on a small
 * screen. This directly satisfies the project rules "every page includes clear
 * admission-focused CTAs" and "display WhatsApp and Call actions prominently on
 * mobile".
 *
 * Visibility: the bar is MOBILE-ONLY. The root element carries `lg:hidden`, so
 * it renders below the `lg` breakpoint (phones / small tablets) and disappears
 * at `>= lg` (laptop / desktop), where the persistent floating action buttons
 * alone carry the CTAs.
 *
 * The vertical relationship with the two FABs is load-bearing and is why the bar
 * cannot move: FloatingWhatsApp and FloatingCall render at EVERY width (their
 * geometry is AAP-frozen — see each widget's own positioning contract), and their
 * mobile offsets `bottom-24` (96→152px) and `bottom-44` (176→232px) are derived
 * from THIS bar's ~60–64px height plus a clearance gap. The bar is the highest-
 * intent presentation on a phone — three labelled 44px targets in the thumb zone,
 * one of which is Admission, which the FABs do not offer — so it satisfies both
 * the "admission-focused CTA on every page" and the "prominent mobile WhatsApp
 * and Call" rules at the widths where thumb reach matters most. Raising this bar's
 * height, or dropping `lg:hidden`, therefore REQUIRES re-deriving both FAB offsets
 * in lock-step; page content clearance for the bar is reserved once, globally, by
 * the `.shell-bottom-clearance` utility on the layout shell (src/index.css).
 *
 * Reuse-first: all three actions are composed from the single canonical
 * `Button` primitive (../ui/Button.jsx) — never a raw, re-styled anchor or
 * link. `Button` is polymorphic, so each action renders the correct semantic
 * element automatically:
 *   • Call      → `<Button href={siteConfig.phoneHref}>` → `<a href="tel:…">`
 *                 (opens the device dialer in place; no target="_blank").
 *   • WhatsApp  → `<Button href={whatsappHref}>` → an external `<a>` that Button
 *                 decorates with target="_blank" + rel="noopener noreferrer"
 *                 (https scheme).
 *   • Admission → `<Button to="/admission">` → a react-router `<Link>` for
 *                 client-side navigation (no full page reload). react-router is
 *                 therefore used transitively through Button — never imported
 *                 here — honouring the reuse-first rule and avoiding an unused
 *                 import.
 *
 * Contact targets are ALWAYS read from `siteConfig` (phoneHref / whatsappHref /
 * whatsappMessage) — never hardcoded — so a single edit to the data module
 * updates every contact entry point across the app.
 *
 * Layout & sizing: a three-column grid (`grid-cols-3`) gives the actions equal
 * width; each Button is `w-full` and `size="md"` (h-11 = 44px) to meet the
 * WCAG touch-target guideline, with `px-2 text-sm` overrides (merged LAST by
 * Button's internal `cn`, so they win over the default `px-6 text-base`) so the
 * "WhatsApp" / "Admission" labels fit three-up without wrapping down to ~320px.
 * The bar sits at `z-40` — the same layer as the floating buttons, which are
 * deliberately offset above it (bottom-24 / bottom-44) and therefore never
 * overlap it.
 *
 * Accessibility (WCAG AA): every action carries a visible text label, which is
 * its accessible name, so the leading icons are purely decorative and marked
 * `aria-hidden="true"`. The semantic `<a>` / `<Link>` elements and the visible
 * :focus-visible ring are supplied by the shared `Button`; no clickable `<div>`
 * is used. The container is a neutral grouping whose interactive children are
 * each individually labelled, so it needs no additional ARIA label.
 *
 * Styling is entirely token-driven (Tailwind v4 @theme tokens defined in
 * src/index.css): every color, spacing, border and shadow resolves to a design
 * token or utility on the 8px scale — no hardcoded or arbitrary bracket values.
 * The elevation is the brand `shadow-float` step (--shadow-float) reserved for
 * fixed/floating surfaces — deliberately one step above the `shadow-md` card
 * hover rather than reusing it — and shared with FloatingWhatsApp and
 * FloatingCall so all three persistent conversion widgets read as one layer.
 * The bar's bottom padding is applied through the shared `.cta-safe-bottom`
 * design-system class (src/index.css) rather than a Tailwind `pb-*` utility: it
 * keeps the 8px (`p-2`-equivalent, 0.5rem) base padding AND adds the device
 * `env(safe-area-inset-bottom)` inset on top, so the actions clear the home
 * indicator on notched devices. The inset resolves to 0 where no safe area
 * exists, leaving rendering unchanged there. That offset is sourced from the
 * SAME shared design variable the persistent shell uses for its bottom
 * clearance, keeping the bar and the shell in lock-step (see `Layout`).
 *
 * The component takes no props and renders identically everywhere it is mounted.
 *
 * @returns {import('react').ReactElement} The mobile-only sticky action bar.
 */
function StickyBottomCTA() {
  // Build the WhatsApp deep link from siteConfig. When a pre-filled enquiry
  // message is configured, append it as a URL-encoded `?text=` query so the
  // chat opens with the message pre-written; otherwise use the bare wa.me link.
  // The number itself is never written here — it always comes from
  // siteConfig.whatsappHref, keeping data as the single source of truth.
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
      {/* Call — blue primary, matching FloatingCall. Opens the device dialer in place. */}
      <Button href={siteConfig.phoneHref} variant="primary" size="md" className="w-full px-2 text-sm">
        <FaPhone aria-hidden="true" className="h-4 w-4" />
        Call
      </Button>

      {/* WhatsApp — green accent, matching FloatingWhatsApp. Opens the chat in a new tab. */}
      <Button href={whatsappHref} variant="accent" size="md" className="w-full px-2 text-sm">
        <FaWhatsapp aria-hidden="true" className="h-4 w-4" />
        WhatsApp
      </Button>

      {/* Admission — orange secondary, the priority conversion action. Client-side SPA nav. */}
      <Button to="/admission" variant="secondary" size="md" className="w-full px-2 text-sm">
        Admission
      </Button>
    </div>
  )
}

export default StickyBottomCTA
