import { Helmet } from 'react-helmet-async'
import { siteConfig } from '../../data/siteConfig.js'

/**
 * Resolve a path to an absolute URL against `siteConfig.siteUrl`. An absolute
 * `http(s)` value is returned unchanged; a falsy value yields the site root.
 * @param {string} [path] A relative path (`/courses`) or absolute URL.
 * @returns {string} The absolute URL.
 */
const absoluteUrl = (path) => {
  if (!path) return siteConfig.siteUrl
  if (path.startsWith('http')) return path
  return `${siteConfig.siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Seo — the single per-page head manager for the CIBLE School of Language SPA
 * (AAP §0.6.1 Group 10). Rendered by every page, it is the SOLE source of the
 * route-specific SEO head via `react-helmet-async`: `index.html` deliberately
 * carries NO route-specific SEO tags, so each field below is emitted exactly
 * ONCE with no static duplicate to conflict with (M01).
 *
 * Emits: `<title>` (page title, or the brand name alone on the home/untitled
 * page), a `description`, the Open Graph block (type, site_name, title,
 * description, url*, image + 1200×630 dimensions, locale) and the Twitter
 * summary-large-image block.
 *
 * Canonical safety (M01): a canonical `<link>` and `og:url` are emitted ONLY
 * when the page supplies an explicit `canonical`. The catch-all 404 NotFound
 * route passes none — so it self-canonicalises to NOTHING rather than wrongly
 * pointing every unknown URL at the homepage (the previously reported bug).
 *
 * Indexability (`noindex`): this optional prop is the SINGLE noindex mechanism
 * for the whole codebase — without it, every route needing one would hand-roll
 * its own sibling `<Helmet>` block (the one the 404 carries today, plus one each
 * for `/compare`, `/search` and `/dashboard`). Its callers are exactly the
 * routes whose content is query-determined or device-local and therefore not
 * crawler-meaningful: `/compare`, `/search`, `/dashboard` and the catch-all 404.
 * Each of those passes `noindex` and deliberately passes NO `canonical`, so it
 * emits `noindex, follow` and neither a canonical link nor an `og:url`. It
 * defaults to `false` and the tag is emitted ONLY when truthy, which keeps the
 * head byte-identical for every indexable page and matters because
 * `react-helmet-async` v3 on React 19 appends rather than replaces.
 *
 * @param {object} props
 * @param {string} [props.title] Page title; combined as `"<title> | <brand>"`.
 * @param {string} [props.description] Meta/OG/Twitter description; falls back to `siteConfig.description`.
 * @param {string} [props.canonical] Canonical path/URL; when omitted NO canonical/og:url is emitted.
 * @param {string} [props.image] OG/Twitter image; falls back to `siteConfig.ogImage`.
 * @param {'website'|'article'} [props.type='website'] Open Graph `og:type`.
 * @param {boolean} [props.noindex=false] When true, emits `<meta name="robots" content="noindex, follow">`; omitted entirely when false.
 * @returns {import('react').ReactElement} A Helmet fragment of head tags.
 */
function Seo({ title, description, canonical, image, type = 'website', noindex = false }) {
  const pageTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name
  const metaDescription = description || siteConfig.description
  // Only compute a canonical/og:url when the page explicitly supplies one.
  // Pages that have no single stable URL — chiefly the catch-all 404 NotFound
  // route, which can render under ANY unmatched path — must NOT emit a canonical
  // link; previously an absent `canonical` fell back to the site root, so every
  // unknown URL wrongly self-canonicalised to the homepage (QA Issue 12).
  const canonicalUrl = canonical ? absoluteUrl(canonical) : null
  const ogImage = absoluteUrl(image || siteConfig.ogImage)

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={metaDescription} />
      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
      {noindex ? <meta name="robots" content="noindex, follow" /> : null}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteConfig.name} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={metaDescription} />
      {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
      <meta property="og:image" content={ogImage} />
      {/* Standard 1.91:1 share-image dimensions. Emitted here (not statically in
          index.html) so the whole OG block stays single-sourced in Helmet and
          never duplicates/conflicts across routes (M01). */}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_IN" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  )
}

export default Seo
