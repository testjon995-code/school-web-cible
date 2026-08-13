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
 * Data source: the embed URL and the human "open in Maps" link both come from
 * `siteConfig` (single source of truth) — `siteConfig.mapEmbedUrl` (the
 * `https://www.google.com/maps/embed?...`-style URL used as the `<iframe src>`)
 * and `siteConfig.mapLink` (the shareable Google Maps search link). No location
 * value is hardcoded here.
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
 * Graceful degradation: an address + "Open in Google Maps" link
 * (`siteConfig.mapLink`, opened in a new `noopener`-isolated tab) is ALWAYS
 * rendered as a layer BENEATH the iframe, so the location stays reachable in
 * every failure mode. When `siteConfig.mapEmbedUrl` is absent/empty no iframe is
 * rendered and the fallback is the sole content; when a network or privacy
 * blocker prevents Google from loading, the iframe paints nothing and the
 * fallback simply shows through. The embed therefore never degrades to an empty
 * box, and the fallback link doubles as a keyboard/AT-reachable text
 * alternative to the embedded frame.
 *
 * Accessibility (WCAG AA): the `<iframe>` always carries a descriptive `title`
 * (mandatory for assistive technology to announce the embedded frame); the
 * fallback exposes a real, focusable `<a>` link. The wrapper adds no interactive
 * semantics of its own.
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
      {/* Always-present fallback layer. Rendered BEFORE the iframe so it sits
          beneath it in the stacking order (both are `absolute inset-0`; the
          later sibling — the iframe — paints on top). It keeps the address and
          an "Open in Google Maps" link reachable in every failure mode: when no
          embed URL is configured (no iframe is rendered), and when a network or
          privacy blocker stops Google from loading (the iframe paints nothing
          and this layer shows through) — so the map never becomes an empty box. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted">
        <p>{siteConfig.address}</p>
        {siteConfig.mapLink ? (
          <a
            href={siteConfig.mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700"
          >
            Open in Google Maps
          </a>
        ) : null}
      </div>
      {siteConfig.mapEmbedUrl ? (
        <iframe
          src={siteConfig.mapEmbedUrl}
          title={title}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : null}
    </div>
  )
}
