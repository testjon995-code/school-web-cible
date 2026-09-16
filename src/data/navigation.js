/**
 * navigation.js — Header and footer navigation link sets for the CIBLE
 * School of Language website.
 *
 * Pure ESM data module: no React, no JSX, no imports. It is the single source
 * of truth for the site's navigation links and is consumed by:
 *   - src/components/layout/Navbar.jsx  (renders `primaryNav`)
 *   - src/components/layout/Footer.jsx  (renders `footerNav` columns)
 *
 * LOCK-STEP CONTRACT (AAP §0.5.1). This module is one half of an invariant
 * that `src/App.jsx` states from the route table's side: a mismatch between
 * the route table, these link sets and `public/sitemap.xml` breaks navigation
 * links or the sitemap. That invariant is NOT one rule but four independent
 * questions, and a registered route may answer them differently:
 *   1. Registration       — is the path, or a pattern matching it, in the
 *                           route table in src/App.jsx?
 *   2. Human reachability — which affordance takes a visitor there?
 *   3. Canonical URL      — does the page pass an explicit `canonical` to
 *                           <Seo>, which emits one only when supplied?
 *   4. Sitemap membership — does the URL appear in public/sitemap.xml?
 * Keeping those four separable matters: this header once answered them with a
 * single flat list of every route, and that shape goes stale the moment a
 * registered route answers them differently — as the routes in categories 1
 * and 3 below do.
 *
 * Registered routes fall into three categories:
 *
 *   1. ROUTE PATTERNS — `courses/:slug` and `events/:slug`. This module
 *      cannot list them, because neither has a single path: each is ONE
 *      route-table entry that resolves to one concrete URL per record in
 *      src/data/courses.js and src/data/events.js. Every one of those URLs
 *      IS in public/sitemap.xml, and each is reached by a course or event
 *      card, a search result or a comparison row rather than by a
 *      navigation link. This is also why the route table's entry count and
 *      the sitemap's URL count are not expected to match.
 *
 *   2. CONCRETE INDEXABLE URLS — every path listed in this module, and
 *      nothing else. Each one is registered in src/App.jsx, renders stable
 *      authored content at its bare URL, passes an explicit `canonical` to
 *      <Seo>, and appears in public/sitemap.xml. `/learning-path` belongs
 *      here — its questionnaire and explanation are authored content — and
 *      is listed in the "Courses" footer column below.
 *
 *   3. CONTROL-REACHABLE UTILITY ROUTES — `/compare`, `/search` and
 *      `/dashboard`, deliberately in NEITHER navigation surface NOR the
 *      sitemap. Each emits `noindex, follow` and supplies no canonical,
 *      because its content is entirely query-determined or is the visitor's
 *      own local state: `/compare` renders only an empty state at its bare
 *      URL, `/search` renders query-derived results, and `/dashboard`
 *      renders the visitor's own saved courses plus a demonstration label.
 *      Their absence from this module is intentional, not drift — each is
 *      reached by a control instead:
 *        - `/compare`   ← the "Compare selected" control on the catalogue,
 *                         shown once at least two courses are selected.
 *        - `/search`    ← the header's search trigger — in the bar from
 *                         `md` upward, in the navigation drawer below it,
 *                         so it is reachable at every width — and Enter in
 *                         the search combobox.
 *        - `/dashboard` ← the header's saved-courses affordance, placed the
 *                         same way, and the learning-path result panel.
 *
 * The invariant that actually holds, stated in both directions:
 *   - Every registered route has a human-reachable affordance: a navigation
 *     link for category 2, a card, search result or comparison row for
 *     category 1, and the named control above for category 3. No page is
 *     unreachable — this is the honest successor to the older "no page is
 *     orphaned" wording, which assumed navigation was the only affordance.
 *   - Every path THIS module lists is both registered in src/App.jsx and
 *     indexable: present in public/sitemap.xml and supplying a canonical.
 *     Check all three before adding a link here — a link to an unregistered
 *     path falls through to the catch-all and renders the 404.
 *
 * src/App.jsx carries the same three-category note beside its lock-step
 * requirement, so the two files are read together as co-authorities.
 * public/sitemap.xml holds one <loc> per category-2 path plus one per course
 * record and one per event record — 33 today: the 17 original pages,
 * `/learning-path`, ten course detail URLs and five event detail URLs. That
 * total follows the route patterns and the paths below; it is not a count
 * maintained by hand in this header.
 *
 * The `*` (NotFound) route is intentionally excluded from navigation. Note:
 * the FAQ URL is lowercase `/faq` even though its page component file is
 * `Faq.jsx`. Navbar additionally renders a standalone "Admission" CTA button
 * (path `/admission`); that button is owned by Navbar, not by this data
 * module.
 */

/**
 * Primary header navigation shown in the Navbar on desktop and inside the
 * mobile drawer — a concise, high-intent subset of the full site map.
 *
 * Deliberately capped at seven entries (AAP §0.5.1): the desktop link row
 * must not wrap once the header's other controls — the click-to-call
 * control, the search trigger, the saved-courses link and the standalone
 * "Admission" CTA — share the bar with it. New routes therefore reach the
 * visitor through `footerNav`, a card, a search result or a page control
 * rather than through an eighth header link.
 *
 * @type {{ label: string, path: string }[]}
 */
export const primaryNav = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Courses', path: '/courses' },
  { label: 'Faculty', path: '/faculty' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'Blog', path: '/blog' },
  { label: 'Contact', path: '/contact' },
]

/**
 * Footer navigation grouped into columns. Footer.jsx renders one column per
 * group, using `title` as the column heading and `links` as its items.
 *
 * @type {{ title: string, links: { label: string, path: string }[] }[]}
 */
export const footerNav = [
  {
    title: 'Quick Links',
    links: [
      { label: 'Home', path: '/' },
      { label: 'About Us', path: '/about' },
      { label: 'Faculty', path: '/faculty' },
      { label: 'Gallery', path: '/gallery' },
      { label: 'Success Stories', path: '/success-stories' },
      { label: 'Blog', path: '/blog' },
      { label: 'Events', path: '/events' },
      { label: 'Admission', path: '/admission' },
      { label: 'Career', path: '/career' },
      { label: 'FAQ', path: '/faq' },
      { label: 'Contact', path: '/contact' },
    ],
  },
  {
    title: 'Courses',
    links: [
      { label: 'All Courses', path: '/courses' },
      { label: 'Spoken English', path: '/spoken-english' },
      { label: 'Science Coaching', path: '/science-coaching' },
      { label: 'Computer Courses', path: '/computer-courses' },
      // Course-discovery entry point, listed last so the catalogue link
      // and the three subject tracks keep their established order above it.
      { label: 'Find Your Learning Path', path: '/learning-path' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', path: '/privacy-policy' },
      { label: 'Terms & Conditions', path: '/terms' },
    ],
  },
]

/**
 * Convenience default export bundling both navigation sets for single-import
 * consumption, e.g. `import navigation from '../../data/navigation.js'`.
 */
export default { primaryNav, footerNav }
