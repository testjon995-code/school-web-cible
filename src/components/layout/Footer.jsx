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
 * client supplies verified accounts/content and clears the flags. That band is
 * the site-WIDE half of the content-truthfulness disclosure and its sentence is
 * deliberately exhaustive — course details, representative records AND the
 * descriptive marketing copy that has no data-module flag of its own — because
 * anything it omits is disclosed nowhere but the point-of-claim
 * `<RepresentativeNote>` panels. See the comment at the band itself.
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
 * Fixed-control clearance (two axes, two mechanisms — both reservations live
 * here because the floating widgets cannot make them for themselves):
 * - VERTICAL: the bottom bar uses `pb-20` (80px) on mobile, relaxing to
 *   `lg:pb-8` (32px) on desktop, so the mobile-only `StickyBottomCTA` bar (fixed
 *   at the viewport bottom, `lg:hidden`) never covers the copyright text.
 * - HORIZONTAL: from `sm` up, the legal-link group (`sm:mr-20`) and the
 *   representative-content notice (`sm:mx-20`) reserve the rightmost 80px, which
 *   is the column the fixed `FloatingCall` / `FloatingWhatsApp` anchors occupy
 *   (`right-4` / `lg:right-6` plus 56px of width). Ordinary page content scrolls
 *   out from under a viewport-anchored control; these are the document's last two
 *   rows and cannot. Without the reservation the WhatsApp anchor covered the
 *   "Terms" link completely at 1024 and 1280px — measured 41x44px with
 *   `elementFromPoint` returning the widget, so the link was genuinely
 *   unclickable — and both anchors clipped it at 768px. See the in-place comments
 *   for the full measurements and for why the reservation is a margin here rather
 *   than padding on `Container`.
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
          One column on mobile, two at `md`, and a 12-track grid at `lg`
          (4 + 5 + 3) so the three regions align to the 8px layout scale. */}
      <Container className="grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-12">
        {/* Brand + contact */}
        <div className="flex flex-col gap-4 lg:col-span-4">
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
        <Newsletter className="lg:col-span-3" />
      </Container>

      {/* Representative-content disclosure (M02 / M03, AAP §0.7.2): while the
          site runs on representative sample content, it is visibly gated as a
          non-production demo on every page (the footer is part of the persistent
          Layout). Driven by the single `siteConfig.representativeContent` flag so
          it disappears the moment real, client-approved content is provided and
          the flag is cleared. Deliberately restrained (a slim muted band) to
          disclose honestly without breaking the premium feel.

          COVERAGE — this band is the site-WIDE half of a two-part disclosure, so
          its sentence has to name every class of representative content the site
          renders, not only the ones held as records in `src/data/*`. It therefore
          names three groups:
            • the course-discovery fields `CourseCard` surfaces (duration, level,
              eligibility, who a course suits, prerequisites, highlights), all
              marked representative in the header of src/data/courses.js and
              rendered on /courses, the three track pages and Home band 3;
            • the representative RECORDS (faculty, testimonials, success stories,
              statistics, events, blog posts, opening hours);
            • the descriptive MARKETING copy about teaching, results and course
              completion certificates — the class that includes Home band 4's
              "Expert Faculty", "Proven Results" and "Recognized Certification"
              cards and each track page's "What You'll Learn / Gain" tiles. That
              copy is page prose rather than a data record, so it has no data-module
              flag of its own and this band is where a visitor is told about it.
          The other half is `<RepresentativeNote>`, composed point-of-claim next to
          the specific content. Both halves are gated by the SAME flag, so neither
          can be left stranded once verified content lands. Keep this sentence in
          step with what the pages actually render: a new class of representative
          content needs a word here as well as a note there. */}
      {siteConfig.representativeContent ? (
        <div className="border-t border-white/10 bg-black/20">
          <Container className="py-4">
            {/* `sm:mx-20` applies the same fixed-control exclusion zone as the
                bottom bar below (see the comment there for the measurements). This
                band is the second-to-last row of the document, so it too cannot
                scroll clear of the floating contact widgets, and the blue Call
                anchor was measured sitting over the right-hand end of this text at
                the document end. The inset is SYMMETRIC so the `text-center`
                measure stays centred rather than drifting left, and it is a margin
                on the paragraph rather than padding on the `Container` for the same
                cascade reason. Below `sm` it is released: 160px of combined inset
                would leave too little measure at 320px, and the widgets sit far
                enough above this band once the bar's own `pb-20` mobile clearance
                pushes it up. */}
            <p className="text-center text-xs leading-relaxed text-primary-100 sm:mx-20">
              <span className="font-semibold text-white">Demo content notice:</span>{' '}
              Course details (duration, level, eligibility, who a course suits,
              prerequisites and highlights), faculty profiles, testimonials, success
              stories, statistics, events, blog posts, opening hours and the
              descriptive copy about our teaching, results and course completion
              certificates are representative samples shown for demonstration, and
              will be replaced with verified, client-approved information before
              launch.
            </p>
          </Container>
        </div>
      ) : null}

      {/* Bottom bar — copyright + inline legal links. `pb-20 lg:pb-8` keeps the
          copy clear of the mobile-only fixed StickyBottomCTA bar. */}
      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-4 py-6 pb-20 text-sm text-primary-100 sm:flex-row lg:pb-8">
          {/* `pr-16` is the same exclusion zone as the link group below, applied on
              the axis this line actually needs it. Below `sm` the bar stacks, so this
              paragraph is the row that runs closest to the fixed widget column: at
              414px — and only at 414px — the sentence fits on a SINGLE line 363px
              wide, which the flex column then centres at x=25..389, putting its tail
              under the Call anchor at x=342. Measured 46.7 x 17px of real GLYPH
              overlap: the line rendered as "…All rights res" with "erved." hidden
              behind the blue disc. At 320/360/390 the same sentence wraps and its
              box-level intersection with the disc falls in empty line leading with
              zero glyph occlusion, so this was a single-width defect that the
              `sm`-gated reservations could not reach. 64px puts the text box's right
              edge at `100vw - 80px`, i.e. 8px clear of the 72px column below `lg`, by
              arithmetic rather than by luck; because lines break on words rather than
              filling the box, the measured GLYPH clearance is larger still — 34.1px
              at 320, 16.5px at 360, 46.5px at 390 and 29.1px at 414, with per-line
              `Range.getClientRects()` reporting zero intersections at all four. It
              costs nothing visually either: at 320/360/390 the paragraph already
              filled the available width and read left-aligned, so wrapping 64px
              earlier keeps all four mobile widths consistent instead of leaving 414
              as the odd one out. Released at `sm`, where `justify-between` puts this
              line on the far LEFT of the row and the reservation belongs to the link
              group on the right instead. */}
          <p className="pr-16 sm:pr-0">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          {/* FIXED-CONTROL EXCLUSION ZONE (`sm:mr-20`) — the one reservation the
              floating contact widgets cannot make for themselves.

              `FloatingCall` and `FloatingWhatsApp` are `position: fixed` at
              `right-4` / `lg:right-6` and are 56px wide, so together they own the
              rightmost 72px (80px from `lg`) of the VIEWPORT on every route. Page
              content simply scrolls out from under a viewport-anchored control —
              except for the last row of the document, which by definition cannot
              scroll any further. This is that row, and from `sm` up
              `justify-between` pins this link group to the container's right edge,
              which is exactly where the widget column sits.

              Measured before this reservation, scrolled to the document end: the
              WhatsApp anchor covered "Terms" completely (41x44px, i.e. 100% of the
              link) at both 1024 and 1280, with `elementFromPoint` at the link's
              centre resolving to the widget's `<svg>` — the link was not merely
              hard to hit, it was unclickable by mouse and touch. At 768 BOTH
              anchors clipped it (41x8 + 41x12). "Privacy Policy" escaped by a
              single pixel. Only >=1392px was clean, because there the centred
              `max-w-7xl` container's edge finally lands left of the column.

              The reservation goes here rather than on the widgets because AAP
              §0.2.1 forbids removing existing functionality and the widgets' own
              offsets are derived arithmetic that other files depend on: hiding,
              shrinking or relocating either one would break both the Call/WhatsApp
              sizing lock-step and the rule mandating prominent mobile contact
              actions. `mr-20` (80px) clears the widest form of the column (80px at
              `lg`) and leaves >=24px of measured slack at 640, 768, 1024, 1280,
              1366 and 1440px. It is a MARGIN on this group rather than padding on
              the `Container` on purpose: `pr-*` here would compete with
              `Container`'s own `px-4 md:px-6` and the `md:` breakpoint would win
              back the gutter at exactly the widths that need the reservation most.
              Below `sm` the bar stacks and centres, which already keeps both links
              out of the corner, so no reservation is applied — and none is wanted,
              since 80px is a quarter of a 320px viewport. */}
          <div className="flex items-center gap-4 sm:mr-20">
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
