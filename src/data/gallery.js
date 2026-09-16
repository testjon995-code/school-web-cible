/**
 * gallery.js — Gallery imagery for CIBLE School of Language.
 * ----------------------------------------------------------
 * Single source of truth for the imagery shown on the `/gallery` route. It is
 * consumed by `src/pages/Gallery.jsx`, which passes this collection straight
 * through to the shared gallery composite
 * (`src/components/common/Gallery.jsx`) as its `images` prop.
 *
 * Pure ESM data module — content only, no JSX and no React. The records used to
 * live inline in the page; they were lifted here (AAP §0.3.4, §0.9.1 Group 1)
 * so gallery content is editable without touching page markup, exactly like
 * every other collection in `src/data`.
 *
 * SHAPE CONTRACT:
 * The record shape MUST stay aligned with the composite's `images` prop —
 * `{ src, alt, caption }`, where `alt` is required and meaningful and `caption`
 * is optional. Adding or renaming a field here without updating that component
 * silently drops the value, because the composite reads these three keys only.
 *
 * REPRESENTATIVE IMAGERY (CLIENT-CONFIRM):
 * The current assets are BRAND SVG ILLUSTRATIONS (not photographs), so each
 * `alt` describes its subject as an "illustration representing …" rather than
 * asserting a real photograph — this keeps the page truthful, because the site
 * must not present illustrations as genuine institute photos. Authentic
 * institute photographs are client-supplied and swapped in before launch
 * (AAP §0.7.2); when they are, revert the `alt` copy to describe the real
 * scene. Until then the "Illustration representing …" opening is a convention,
 * not stylistic preference: do not "correct" it into a claim the asset cannot
 * support. Each `caption` is a concise subject label — never a marketing
 * statement, a facility claim or an achievement claim.
 *
 * ASSET-IMPORT EXCEPTION:
 * This is the one module in `src/data` that imports build-time assets from
 * `src/assets` — the exception moved here from the page along with the records.
 * Every other module in this folder is dependency-free or imports only
 * `react-icons` component references and sibling data modules (e.g.
 * `faq.js` → `siteConfig.js`, `stats.js` → `faculty.js`). Vite resolves each
 * `.svg` import to a URL string that is usable directly as an `<img src>`,
 * which is why `src` below holds a resolved identifier rather than a literal
 * path: the bundler fingerprints and rewrites the emitted URL, so a hardcoded
 * string would break in a production build.
 *
 * EMPTY-STATE OWNERSHIP:
 * This module deliberately performs no emptiness check and exports the records
 * plainly. The `/gallery` page owns the "no gallery images are available yet"
 * state (AAP §0.11.3), and the composite already renders `null` for an empty
 * array, so a guard here would only duplicate that decision.
 *
 * @typedef {Object} GalleryImage
 * @property {string} src      Vite-resolved asset URL for the image, used
 *                             directly as the `<img src>` value.
 * @property {string} alt      Meaningful description for screen-reader users
 *                             (WCAG AA). Currently worded as an illustration,
 *                             per the representative-imagery note above.
 * @property {string} caption  Concise subject label rendered beneath the slide.
 */

import heroImg from '../assets/hero.svg'
import courseEnglish from '../assets/course-english.svg'
import coursePersonality from '../assets/course-personality.svg'
import courseScience from '../assets/course-science.svg'
import courseComputer from '../assets/course-computer.svg'
import courseCareer from '../assets/course-career.svg'

/** @type {GalleryImage[]} */
export const galleryImages = [
  { src: heroImg, alt: 'Illustration representing the CIBLE School of Language campus', caption: 'Our Campus' },
  { src: courseEnglish, alt: 'Illustration representing a spoken English class', caption: 'Spoken English' },
  { src: coursePersonality, alt: 'Illustration representing a personality development workshop', caption: 'Personality Development' },
  { src: courseScience, alt: 'Illustration representing a science coaching class', caption: 'Science Coaching' },
  { src: courseComputer, alt: 'Illustration representing computer lab training', caption: 'Computer Lab' },
  { src: courseCareer, alt: 'Illustration representing a career guidance session', caption: 'Career Guidance' },
]

export default galleryImages
