/**
 * CIBLE School of Language — Teaching Faculty Roster
 * ---------------------------------------------------
 * Single source of truth for the faculty shown on the Faculty page, the Home
 * page faculty preview, and anywhere a `<FacultyCard />` is rendered.
 *
 * CLIENT-SUPPLIED CONTENT NOTICE (AAP §0.7.2):
 * The names, roles and biographies below are REPRESENTATIVE, production-quality
 * placeholders written to reflect the CIBLE program areas and the Madhubani,
 * Bihar context. They are NOT verified institute records. Real faculty
 * photographs and verified biographies are supplied by the client and swapped
 * in later. Nothing here should be presented as a verified credential — no
 * exact tenure, no degrees from named universities are asserted as fact.
 *
 * IMAGE CONTRACT:
 * Every `image` is intentionally `null`. `FacultyCard.jsx` renders a graceful
 * initials-avatar fallback (initials derived from `name`, on a brand-blue
 * background) whenever `image` is null, so there are NO broken images and NO
 * imports of asset files that do not exist yet. When the client provides a real
 * photo, drop it at the documented `/faculty/<slug>.jpg` path (served from
 * `public/`) and replace the corresponding `image: null` with that string.
 *
 * SLUG CONTRACT (AAP §0.6.4 / §0.7.3):
 * Every record carries an explicit, stable, kebab-case `slug`. Each value is
 * TRANSCRIBED from that record's documented `/faculty/<slug>.jpg` image path
 * above — it is deliberately NOT derived from `name` at runtime. A derived
 * name-normalisation was considered and rejected for two reasons: correcting a
 * name would silently change that person's anchor, and it would need a
 * collision rule for two members sharing a surname. An explicit field needs
 * neither, and there is therefore NO slugify helper in this module.
 * The slug is the URL-fragment target a faculty search result addresses:
 * `src/lib/search.js` emits `/faculty#faculty-<slug>` (faculty members have no
 * detail route of their own), and `src/pages/Faculty.jsx` resolves that
 * fragment to the matching card, scrolls it into view and moves focus to it.
 * Treat each value as a PUBLIC CONTRACT — once authored it is a URL other
 * modules point at, so it is never renamed — and keep it IDENTICAL to the
 * `/faculty/<slug>.jpg` path in the same record's TODO comment, otherwise the
 * photo a content owner drops in will never be found.
 *
 * SOCIALS CONTRACT (optional):
 * `socials` is an array — empty by default because no verified social profiles
 * exist yet (inventing URLs would violate the no-fabrication rule). When real
 * profiles are provided, add entries of the shape:
 *   { label: 'LinkedIn', href: 'https://www.linkedin.com/in/...', icon: FaLinkedinIn }
 * where `icon` is a `react-icons` COMPONENT REFERENCE (e.g. import
 * `{ FaLinkedinIn }` from 'react-icons/fa'), never a string. Consumers render it
 * as: `const Icon = s.icon; <Icon aria-hidden="true" />`. While all `socials`
 * arrays stay empty, this module needs no imports and stays dependency-free.
 *
 * @typedef {Object} FacultySocial
 * @property {string} label  Accessible label for the link (e.g. 'LinkedIn').
 * @property {string} href   Absolute profile URL.
 * @property {React.ComponentType} icon  A react-icons component reference.
 *
 * @typedef {Object} FacultyMember
 * @property {string} [slug]            PUBLIC CONTRACT — explicit kebab-case identifier,
 *                                      transcribed from the `/faculty/<slug>.jpg` image path
 *                                      (never derived from `name`) and never renamed. It is the
 *                                      `/faculty#faculty-<slug>` fragment target used by the
 *                                      search index. Optional: a record without a `slug` is
 *                                      indexed to `/faculty` with no fragment, so absence
 *                                      degrades gracefully and is not an error.
 * @property {string} name              Full name.
 * @property {string} role              Subject / title, aligned to the courses.
 * @property {string} bio               One or two encouraging, professional sentences.
 * @property {string|null} image        Photo URL, or null to use the initials avatar.
 * @property {FacultySocial[]} socials  Optional social links (empty until verified).
 */

/** @type {FacultyMember[]} */
export const faculty = [
  {
    slug: 'rajeev-ranjan-jha',
    name: 'Rajeev Ranjan Jha',
    role: 'Founder & Director',
    bio: 'Rajeev founded CIBLE on a simple belief: every learner in Madhubani deserves world-class English and career guidance close to home. He leads the academy\u2019s teaching vision and mentors students toward confident communication and clear goals.',
    // TODO(client): add real photo at /faculty/rajeev-ranjan-jha.jpg; FacultyCard shows an initials avatar while this is null
    image: null,
    socials: [],
  },
  {
    slug: 'anjali-mishra',
    name: 'Anjali Mishra',
    role: 'Spoken English & Personality Development Trainer',
    bio: 'Anjali helps hesitant speakers find their voice through daily conversation practice, structured feedback and plenty of encouragement. Her sessions blend spoken fluency with personality development so students carry that confidence well beyond the classroom.',
    // TODO(client): add real photo at /faculty/anjali-mishra.jpg; FacultyCard shows an initials avatar while this is null
    image: null,
    socials: [],
  },
  {
    slug: 'saurabh-kumar-choudhary',
    name: 'Saurabh Kumar Choudhary',
    role: 'English Communication & Public Speaking Trainer',
    bio: 'Saurabh coaches students in professional communication, public speaking and interview readiness using real-world scenarios and mock practice. He focuses on clarity, body language and the calm confidence that presentations and interviews demand.',
    // TODO(client): add real photo at /faculty/saurabh-kumar-choudhary.jpg; FacultyCard shows an initials avatar while this is null
    image: null,
    socials: [],
  },
  {
    slug: 'nidhi-thakur',
    name: 'Nidhi Thakur',
    role: 'PCM Faculty (Physics & Mathematics)',
    bio: 'Nidhi makes Physics and Mathematics approachable by breaking tough concepts into simple, logical steps and worked examples. She guides PCM aspirants with regular practice, patient doubt-clearing and steady exam preparation.',
    // TODO(client): add real photo at /faculty/nidhi-thakur.jpg; FacultyCard shows an initials avatar while this is null
    image: null,
    socials: [],
  },
  {
    slug: 'ravi-shankar-mandal',
    name: 'Ravi Shankar Mandal',
    role: 'PCB Faculty (Biology & Chemistry)',
    bio: 'Ravi brings Biology and Chemistry to life with clear diagrams, everyday examples and memory techniques that make revision easier. He supports PCB students with well-structured notes and consistent test practice for their medical-track goals.',
    // TODO(client): add real photo at /faculty/ravi-shankar-mandal.jpg; FacultyCard shows an initials avatar while this is null
    image: null,
    socials: [],
  },
  {
    slug: 'pooja-karn',
    name: 'Pooja Karn',
    role: 'Computer & Digital Literacy Instructor',
    bio: 'Pooja introduces students to computer fundamentals and everyday digital skills, from typing and office tools to safe, confident internet use. Her hands-on, patient approach helps first-time learners quickly become comfortable with technology.',
    // TODO(client): add real photo at /faculty/pooja-karn.jpg; FacultyCard shows an initials avatar while this is null
    image: null,
    socials: [],
  },
]

export default faculty
