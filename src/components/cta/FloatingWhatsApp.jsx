import { FaWhatsapp } from 'react-icons/fa'
import { siteConfig } from '../../data/siteConfig.js'
import { cn } from '../../lib/cn.js'

/**
 * FloatingWhatsApp — the persistent, always-visible WhatsApp floating action
 * button (FAB) for the CIBLE School of Language SPA (AAP §0.6.1 Group 8;
 * folder-requirement C, file #1). It fulfils the AAP conversion rule "Display
 * WhatsApp and Call actions prominently on mobile" by anchoring a one-tap
 * WhatsApp chat link to the bottom-right corner of every page at every width.
 *
 * It is rendered by src/components/layout/Layout.jsx alongside <FloatingCall />
 * and the mobile <StickyBottomCTA /> bar. It takes NO props and renders with no
 * required configuration (Layout imports it as the default export).
 *
 * Behaviour — an icon-only semantic <a> that opens a WhatsApp conversation with
 * the institute. The number and the pre-filled message are read from siteConfig;
 * the phone / WhatsApp number is NEVER hardcoded in this component. External-link
 * semantics (target="_blank" + rel="noopener noreferrer") mirror the shared
 * Button primitive's behaviour for http(s) URLs.
 *
 * Visibility — EVERY width. This is a FROZEN contract, not a styling preference:
 * the AAP declares this widget's geometry (§0.7.1.7 Group 7 and §0.10.1.8) and
 * confines any change here to the elevation token alone, because the offsets are
 * derived arithmetic that the sibling FAB depends on. A
 * previous change made both FABs `hidden lg:flex` to clear page content at phone
 * widths and was reverted as an AAP regression.
 *   • `flex` at every breakpoint — never `hidden`. Below `lg` this FAB and the
 *     `lg:hidden` StickyBottomCTA bar are BOTH on screen by design: the bar
 *     carries the three-up Call / WhatsApp / Admission row in the thumb zone and
 *     the FABs keep the same two channels reachable from the corner. Both read the
 *     same `siteConfig.whatsappHref` target, so they can never disagree, and
 *     neither needs a scroll or resize observer to police its position.
 *   • If a fixed widget is measured covering something, the fix belongs on the
 *     OTHER surface, never here. Scrolling content moves out from under a
 *     viewport-anchored control by itself; the one row that cannot is the LAST row
 *     of the document. The Footer reserves VERTICALLY for the mobile sticky bar
 *     there (`pb-20`, relaxing to `lg:pb-8`), but it carries no horizontal
 *     reservation for this FAB column: the footer shell is a reference-only
 *     authority, so the residual overlap of its bottom-row legal links between
 *     roughly 1024px and 1392px is a KNOWN, DISCLOSED limitation awaiting a
 *     decision, not something to absorb here. Hiding or relocating this FAB
 *     instead would break the derived offsets below and the rule mandating
 *     prominent mobile Call/WhatsApp.
 *
 * Positioning / non-overlap contract (VALIDATION-CRITICAL — must stay in sync
 * with FloatingCall and StickyBottomCTA):
 *   • This FAB is the BOTTOM-MOST of the two floating buttons.
 *   • Mobile (< lg): `bottom-24` (96px) clears the ~60–64px-tall StickyBottomCTA
 *     bar (which is `lg:hidden` and pinned to `bottom-0`) with margin to spare.
 *   • Desktop (≥ lg): `lg:bottom-6` (24px) — the sticky bar is hidden at `lg`,
 *     so the FAB drops to the normal corner offset.
 *   • Right gutter: `right-4` (16px) mobile / `lg:right-6` (24px) desktop.
 *   • `z-40` keeps it above page content but below a typical `z-50` nav drawer.
 *   • SIZING LOCK-STEP: this FAB is `h-14 w-14` (56px). The sibling FloatingCall
 *     sits directly above at `bottom-44` (mobile) / `lg:bottom-28` (desktop) and
 *     shares the same 56px size. Changing this size REQUIRES updating the
 *     sibling's offset (see FloatingCall.jsx) to preserve the non-overlap gap.
 *
 * Accessibility (WCAG AA):
 *   • Icon-only control → `aria-label` supplies the accessible name; the
 *     FaWhatsapp glyph is decorative and marked `aria-hidden`.
 *   • The 56px touch target exceeds the 44px guideline comfortably.
 *   • Visible keyboard focus via a `focus-visible` accent ring (overrides the
 *     global primary outline so the indicator matches this green control).
 *   • Contrast rationale (documented so reviewers do NOT "fix" it): the white
 *     glyph on `bg-accent-600` (#16a34a) is ≈ 3.3:1, which satisfies WCAG 1.4.11
 *     Non-text Contrast (≥ 3:1) — the correct bar for a graphical / icon control
 *     (the stricter 4.5:1 rule applies to normal *text*, not icons). Hover
 *     `accent-700` (#15803d) is ≈ 5:1. The accent (green) token is used per the
 *     folder requirement; the WhatsApp-brand hex is intentionally NOT used.
 *
 * Styling — every value resolves to a Tailwind v4 `@theme` token (src/index.css),
 * elevation included (`shadow-float`, the fixed/floating tier — deliberately not
 * the `shadow-md` card step); there are no hardcoded or arbitrary (`[..]`) values.
 * Classes are composed through the canonical `cn()` helper so the string stays
 * mergeable. `prefers-reduced-motion` is neutralised globally in src/index.css,
 * so the `transition-colors` hover micro-interaction needs no extra handling.
 *
 * Interaction states — rest → hover → PRESSED → focus, the same four-step ladder
 * the canonical <Button> and StickyBottomCTA expose, so this control acknowledges
 * a tap like every other action on the site. `active:bg-accent-800` is the pressed
 * step: it walks one rung further down the accent ramp that hover already uses
 * (`accent-600` → `accent-700` → `accent-800`), mirroring <Button>'s own accent
 * ladder shape. It is deliberately PAINT-ONLY — no transform, no size or position
 * change — because this element is `fixed` and 56px is also its touch target, so
 * scaling or nudging it on press would move the target out from under the finger
 * that is pressing it and would invalidate the non-overlap arithmetic recorded
 * above. Contrast holds: white on `accent-800` (#166534) is ≈ 7.4:1, comfortably
 * past the 3:1 non-text floor and past 4.5:1 as well. `:active` is a pointer/keys
 * state on a real anchor, so it needs no script and no extra ARIA.
 *
 * @returns {import('react').ReactElement} A fixed-position WhatsApp deep-link anchor.
 */
function FloatingWhatsApp() {
  // Build the wa.me deep link from siteConfig. When a pre-filled message is
  // configured, append it as a URL-encoded `?text=` query — the message
  // contains a comma, an apostrophe and spaces, so encodeURIComponent is
  // required. The guard keeps the link functional if the message is ever
  // removed, and the base ALWAYS comes from siteConfig.whatsappHref so the
  // number is never written literally. This is a plain expression (not a hook),
  // so no useMemo is needed.
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
