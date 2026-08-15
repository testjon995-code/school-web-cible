import { cn } from '../../lib/cn.js'
import siteConfig from '../../data/siteConfig.js'

/**
 * GoogleMap
 *
 * THE single canonical map embed for the CIBLE School of Language SPA. It renders
 * the institute's location (State Highway 75 (SH75), Mukhiapatti, Saharghat,
 * Madhubani, Bihar) as a responsive, lazy-loaded Google Maps `<iframe>` so
 * prospective students and parents can find and visit the campus — a core
 * conversion action ("Visit the Institute"). The Contact page composes this
 * primitive; the Footer intentionally links out via `siteConfig.mapLink` rather
 * than embedding, so no third-party iframe loads on every route. Never
 * hand-roll a raw map `<iframe>` elsewhere so the source URL, accessibility,
 * and framing stay consistent.
 *
 * Data source: every location fact comes from `siteConfig` (single source of
 * truth) — `siteConfig.mapEmbedUrl` (the `https://www.google.com/maps/embed?...`
 * -style URL used as the `<iframe src>`) and `siteConfig.address` (the postal
 * address shown when no embed URL is configured). No location value is hardcoded
 * here. The shareable `siteConfig.mapLink` is deliberately NOT read in this file;
 * the graceful-degradation note below records which component owns that action.
 *
 * Styling (Tailwind v4 `@theme` tokens from src/index.css — zero hardcoded
 * values):
 * - `relative` + `aspect-video`   → a fixed 16:9 box that reserves its height at
 *   every width, so the map never triggers Cumulative Layout Shift while it loads.
 * - `w-full`                       → fills the parent column; combined with the
 *   `aspect-video` ratio the embed reflows on every breakpoint with no horizontal
 *   overflow.
 * - `overflow-hidden` + `rounded-2xl` (--radius-2xl) → clips the map to the brand
 *   card radius.
 * - `border border-border` (--color-border) → 1px hairline matching the `Card`
 *   surface so the map reads as part of the design system.
 * - `bg-surface` (--color-surface) → a subtle neutral fill shown behind the iframe
 *   while it loads and behind the graceful fallback.
 *
 * Performance: the iframe uses `loading="lazy"` so the (heavy, third-party) map is
 * only fetched when it scrolls near the viewport — protecting initial load and
 * Core Web Vitals.
 *
 * Privacy: the iframe requests Google with `referrerPolicy="strict-origin-when-
 * cross-origin"`, so the cross-origin request carries only this site's origin
 * (never the full page path or query) — a deliberately stricter policy than the
 * browser/legacy `no-referrer-when-downgrade` default.
 *
 * Graceful degradation: the fallback is the OTHER branch of the embed, not a
 * layer stacked beneath it. When `siteConfig.mapEmbedUrl` is absent/empty no
 * iframe is rendered and the institute address is centred in the same reserved
 * 16:9 box instead, so this surface never degrades to an empty panel.
 *
 * The fallback deliberately carries NO "open in Maps" control of its own. A
 * control rendered beneath a configured iframe is permanently covered yet stays
 * in the keyboard and accessibility order, which would give the composing page
 * two actions for one function — one of them unreachable by pointer. The single
 * interactive "open the location in Google Maps" affordance is therefore owned
 * once, in page content, by `src/pages/Contact.jsx` (a `Button` on the "Visit Us"
 * card, which supplies the 44px touch floor and reads `siteConfig.mapLink`), and
 * site-wide by the Footer's own link. This component owns the EMBED only.
 *
 * Accessibility (WCAG AA): the `<iframe>` always carries a descriptive `title`
 * (mandatory for assistive technology to announce the embedded frame), and that
 * title is its accessible name. This component contributes no link or button of
 * its own in either branch, so the page it composes into announces exactly one
 * map action; the wrapper adds no interactive semantics either.
 *
 * @param {object} props
 * @param {string} [props.title='CIBLE School of Language location on Google Maps']
 *   Accessible name announced for the embedded map frame. Always applied to the
 *   `<iframe>` and required for accessibility.
 * @param {string} [props.className] Extra classes merged LAST via `cn(...)` (clsx +
 *   tailwind-merge), so caller-supplied utilities always win over the base surface.
 * @param {object} [props] Any other props (`id`, `aria-*`, `data-*`, `style`, …)
 *   are forwarded to the rendered wrapper `<div>`.
 * @returns {import('react').ReactElement} The rendered responsive map surface.
 */
export default function GoogleMap({
  title = 'CIBLE School of Language location on Google Maps',
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        'relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-surface',
        className,
      )}
      {...props}
    >
      {siteConfig.mapEmbedUrl ? (
        <iframe
          src={siteConfig.mapEmbedUrl}
          title={title}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        /* No-embed fallback — the alternative branch, never a layer under the
           iframe, so nothing of this component is ever obscured-but-focusable.
           It states the address only: the interactive "open in Maps" action is
           owned once by the composing page (Contact's "Visit Us" card) and
           site-wide by the Footer, so duplicating it here would put two actions
           on one page for a single function. `absolute inset-0` fills the
           reserved 16:9 box, so the panel is never empty. */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted">
          <p>{siteConfig.address}</p>
        </div>
      )}
    </div>
  )
}
