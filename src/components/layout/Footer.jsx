import { Link } from 'react-router-dom'
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa'
import Container from '../ui/Container.jsx'
import Newsletter from '../common/Newsletter.jsx'
import { cn } from '../../lib/cn.js'
import { footerNav } from '../../data/navigation.js'
import siteConfig from '../../data/siteConfig.js'
import logoWhite from '../../assets/logo-white.svg'

/**
 * Footer — the site-wide footer for the CIBLE School of Language SPA
 * (AAP §0.6.1 Group 5 / §0.6.3 "Layout shell"). It is rendered once at the
 * bottom of the persistent `<Layout>` shell, beneath every one of the 17 pages
 * plus the 404 view, and reinforces the conversion-first goal: brand + tagline,
 * grouped navigation (Quick Links / Courses / Legal), a click-to-contact block
 * (phone, email, address, map), the reusable newsletter subscribe form, social
 * profiles (shown only once client-verified — see below), and a copyright bar.
 *
 * Trust & transparency (M02 / M03): social links are gated behind
 * `siteConfig.socialVerified` so unverified handles are never published as
 * official, and a slim `siteConfig.representativeContent` disclosure band
 * visibly marks the site as a non-production demo on every page while it runs
 * on representative sample content. Both disappear automatically once the
 * client supplies verified accounts/content and clears the flags.
 *
 * Reuse-first composition (AAP rule: never duplicate primitives): it composes
 * the canonical `ui/Container` for width/gutters and the canonical
 * `common/Newsletter` for the subscribe form rather than re-implementing them,
 * and merges classes through the shared `cn()` helper. ALL brand, contact and
 * link content is read from `src/data/*` (`siteConfig`, `footerNav`) — nothing
 * is hardcoded here, so a single edit to the data modules updates the footer.
 *
 * Landmark coordination (IMPORTANT): `Layout` owns the `<footer>`
 * `contentinfo` landmark (it renders `<footer><Footer/></footer>`). To avoid a
 * nested / duplicated `contentinfo`, this component's root is a plain `<div>`,
 * NOT another `<footer>`. Inner semantics still carry the meaning: each link
 * column is a labelled `<nav aria-label={group.title}>`, the contact block is
 * an `<address class="not-italic">`, and each column title is a real `<h2>`.
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens from
 * src/index.css) on the project's 8px spacing scale — every colour, radius and
 * spacing resolves to a design token/utility, with no hardcoded or arbitrary
 * `[..]` values. The footer sits on the dark brand surface `bg-primary-900`
 * (`#1e3a8a`); on it, `text-white` carries primary text/links-on-hover and the
 * solid `text-primary-100` (`#dbeafe`) carries secondary/muted copy — both
 * exceed WCAG AA contrast on `primary-900` (low-opacity white is deliberately
 * avoided for small text so contrast never drops below AA).
 *
 * Accessibility (WCAG AA):
 * - Root `<div>` (Layout provides the landmark); labelled `<nav>` per column;
 *   `<address class="not-italic">` for contact.
 * - Contact actions are real deep-links (`tel:` / `mailto:` from siteConfig);
 *   the map and social links open in a new tab with `rel="noopener noreferrer"`.
 * - Social links (when shown) expose a descriptive `aria-label` (from the data
 *   `label`) and their glyphs are `aria-hidden`; the logo `<img>` has a
 *   meaningful `alt`.
 * - Every interactive control (contact deep-links, column nav links, social
 *   icons, footer legal links) meets the 44×44px minimum touch target (M12).
 * - The global `:focus-visible` ring (src/index.css) is left intact.
 *
 * Fixed-widget clearance: the bottom bar is the LAST row of the document, so it
 * is the one row that cannot be scrolled out from under a fixed overlay, and it
 * reserves space for both of them on the axis each encroaches from. `pb-20`
 * (80px) relaxing to `lg:pb-8` (32px) keeps the copyright clear of the
 * mobile-only `StickyBottomCTA` bar; `lg:pr-22` relaxing to `2xl:pr-6` keeps the
 * legal links clear of the desktop-only floating Call/WhatsApp column, which
 * appears at exactly the breakpoint that bar disappears. See the bottom-bar
 * comment below for the measured arithmetic behind both numbers, and note that
 * `pr-*` replaces the base `px-6` gutter rather than adding to it — which is why
 * the release step is `pr-6`, not `pr-0`.
 *
 * @param {object} [props]
 * @param {string} [props.className] Extra classes merged LAST via {@link cn}
 *   onto the root `<div>` so a caller could extend it. `Layout` renders this
 *   component with no `className`.
 * @returns {import('react').ReactElement} The site-wide footer content.
 */
function Footer({ className }) {
  return (
    <div className={cn('bg-primary-900 text-white', className)}>
      {/* Main grid — brand + contact, grouped navigation, and newsletter.
          One column on mobile, two at `md`, and a 12-track grid at `lg` so the
          three regions align to the 8px layout scale.
          Track allocation is 3 + 5 + 4 at `lg` and 4 + 5 + 3 from `xl`: between
          1024px and 1279px a 12-track row is at its narrowest (44.67px per
          track), and at three tracks the newsletter cell measured 214px — after
          its own 32px padding and the field's own 16px padding that left the
          email input a 116px content box, too narrow for the 144.25px its
          `you@example.com` placeholder needs, so the placeholder rendered as
          "you@example.". Handing the newsletter a fourth track there (298.67px →
          a 200.67px input content box) fixes it without touching the navigation
          columns, whose labels ("Science Coaching", "Terms & Conditions") need
          the width more than the brand block does — the brand block is logo plus
          wrapping prose and reflows cleanly at 214px. From `xl` the row is wide
          enough for the original allocation, so it is restored unchanged. */}
      <Container className="grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-12">
        {/* Brand + contact */}
        <div className="flex flex-col gap-4 lg:col-span-3 xl:col-span-4">
          {/* `self-start` cancels the flex-column cross-axis stretch so the
              logo renders at its natural width (h-10 w-auto) and stays
              left-aligned with the tagline — matching the Navbar treatment. */}
          <img
            src={logoWhite}
            alt={siteConfig.name}
            className="h-10 w-auto self-start"
            width="300"
            height="72"
          />
          <p className="text-sm text-primary-100">{siteConfig.tagline}</p>

          <address className="not-italic flex flex-col gap-2 text-sm text-primary-100">
            {/* Contact deep-links carry a 44px min hit area (M12); the address
                span is not interactive so it keeps its natural height. */}
            <a
              href={siteConfig.phoneHref}
              className="inline-flex min-h-11 items-center gap-2 hover:text-white"
            >
              <FaPhoneAlt aria-hidden="true" className="h-4 w-4 shrink-0" />
              {siteConfig.phone}
            </a>
            <a
              href={siteConfig.emailHref}
              className="inline-flex min-h-11 items-center gap-2 hover:text-white"
            >
              <FaEnvelope aria-hidden="true" className="h-4 w-4 shrink-0" />
              {siteConfig.email}
            </a>
            <span className="inline-flex items-start gap-2">
              <FaMapMarkerAlt aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
              {siteConfig.address}
            </span>
            <a
              href={siteConfig.mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 font-medium text-white underline-offset-4 hover:underline"
            >
              View on Google Maps
            </a>
          </address>

          {/* Social profiles (M02): rendered ONLY when the accounts have been
              client-verified (`siteConfig.socialVerified`). The scaffold ships
              representative, unverified handles, so this "fails closed" — the
              links stay hidden until real, owned profiles are confirmed, rather
              than publishing unverified URLs as official links. Each control is a
              44×44 touch target (M12) with a descriptive aria-label; the glyph
              is decorative (`aria-hidden`). */}
          {siteConfig.socialVerified ? (
            <ul className="flex items-center gap-2 pt-2">
              {siteConfig.social.map((s) => {
                const Icon = s.icon
                return (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                    >
                      {Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}
                    </a>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>

        {/* Grouped navigation — one labelled <nav> per footerNav column */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
          {footerNav.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                {group.title}
              </h2>
              <ul className="mt-4 flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="inline-flex min-h-11 items-center text-sm text-primary-100 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Newsletter — reused primitive; only a layout className is passed so
            its intentional light `bg-surface` card is preserved (its internal
            text uses dark foreground tokens for AA on that light surface). */}
        <Newsletter className="lg:col-span-4 xl:col-span-3" />
      </Container>

      {/* Representative-content disclosure (M02 / M03, AAP §0.7.2): while the
          site runs on representative sample content — faculty, testimonials,
          success stories, statistics, events, blog posts and opening hours
          authored for demonstration rather than supplied and verified by the
          institute — it
          is visibly gated as a non-production demo on every page (the footer is
          part of the persistent Layout). Driven by the single
          `siteConfig.representativeContent` flag so it disappears the moment
          real, client-approved content is provided and the flag is cleared.
          Deliberately restrained (a slim muted band) to disclose honestly
          without breaking the premium feel. */}
      {siteConfig.representativeContent ? (
        <div className="border-t border-white/10 bg-black/20">
          <Container className="py-4">
            <p className="text-center text-xs leading-relaxed text-primary-100">
              <span className="font-semibold text-white">Demo content notice:</span>{' '}
              Faculty profiles, testimonials, success stories, statistics, events,
              blog posts and opening hours shown here are representative samples
              for demonstration and will be replaced with verified, client-approved
              information before launch.
            </p>
          </Container>
        </div>
      ) : null}

      {/* Bottom bar — copyright + inline legal links. This row reserves space for
          BOTH fixed conversion affordances, on the axis each one actually
          encroaches from, because it is the LAST row of the document and so is
          the one row that cannot be scrolled out from under either of them.
            • Vertically, `pb-20 lg:pb-8` keeps the copy clear of the mobile-only
              StickyBottomCTA bar, and drops at `lg` where that bar is hidden.
            • Horizontally, `lg:pr-22 2xl:pr-6` keeps the legal links clear of the
              desktop-only floating Call/WhatsApp column, which appears at exactly
              the breakpoint the bar disappears. The arithmetic is bounded and
              worth recording, INCLUDING the trap it hides: the widgets are
              viewport-anchored at `right-6` (24px) and 56px wide, so their left
              edge is at `vw - 80`, while Container's content box ends at
              `vw - 24` up to 1280px and at `(vw + 1280)/2 - 24` beyond it — a
              constant 56px of intrusion through 1280px, tapering to zero at
              1392px. The trap: `pr-*` REPLACES the base `px-6` padding-right, it
              does not add to it, so the reservation must cover the 24px gutter
              too. It therefore needs 80px to graze the widget and `pr-22` (88px)
              to clear it with 8px to spare; `pr-16` (64px) was measured leaving
              16px of the link still covered. For the same reason the wide-screen
              release is `2xl:pr-6` (restoring the base 24px gutter, flush with
              the columns above) and NOT `pr-0`, which was measured overhanging
              every other footer row by 24px. `2xl` (1536px) is the nearest stock
              breakpoint above 1392, so between 1392 and 1535 the reservation is
              redundant and this row reads 64px narrower than the rows above it —
              a deliberate trade, because the only earlier stop, `xl` (1280px),
              is a width that still needs the full reservation. Measured before this reservation
              existed: at 1024 and 1280 the WhatsApp widget covered 100% of the
              "Terms" link on every route, leaving only 6-7% of its area
              pointer-hittable and its CENTRE not hittable at all (elementFromPoint
              returned the widget's svg) — keyboard reach was unaffected, but a
              mouse or touch user could not activate it. Do not remove either
              reservation, and do not raise this row's z-index to win instead: the
              stacking ledger (skip link 1000 > header/modals 50 > conversion
              widgets 40) is deliberate. */}
      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-4 py-6 pb-20 text-sm text-primary-100 sm:flex-row lg:pr-22 lg:pb-8 2xl:pr-6">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              to="/privacy-policy"
              className="inline-flex min-h-11 items-center hover:text-white"
            >
              Privacy Policy
            </Link>
            <Link to="/terms" className="inline-flex min-h-11 items-center hover:text-white">
              Terms
            </Link>
          </div>
        </Container>
      </div>
    </div>
  )
}

export default Footer
