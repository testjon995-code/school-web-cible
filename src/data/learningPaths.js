/**
 * learningPaths.js — The learning-path questionnaire, the shared six-stage
 * learner journey, and the curated-path layer for the CIBLE School of Language
 * website.
 *
 * Pure ESM data module: no React, no JSX, NO IMPORTS — and it must stay that
 * way. Every value below is a plain string or an array of plain strings,
 * because these values travel into URLs, into rendered copy and into the
 * deterministic recommender's inputs. Per the serialisability rule
 * (AAP §0.7.3) no `react-icons` component reference belongs in here, and none
 * is needed: `src/components/common/Timeline.jsx` renders the 1-based step
 * number whenever an item carries no `icon`, which is exactly what an ordered
 * journey wants.
 *
 * ── WHAT IS IN THIS FILE, AND THE THREE DIFFERENT RULES THAT GOVERN IT ─────
 *   1. `learningPathQuestions` — the four questions, in the wording they were
 *      specified in. Every option VALUE is drawn from an existing allowlist in
 *      another module; not one value is invented here.
 *   2. `learningJourney` — the six stages of a learner's journey, in the
 *      wording they were specified in, with copy that agrees with the only
 *      admission process the repository evidences.
 *   3. `learningPaths` — the curated-sequence layer, which ships EMPTY on
 *      purpose. Read the comment above it before adding anything; a suggested
 *      ordering of courses is a pedagogical claim and the repository holds no
 *      approved one (AAP §0.7.2).
 *
 * ── THIS IS A QUESTIONNAIRE, NOT A PREDICTION ──────────────────────────────
 * `src/lib/recommend.js` turns the four answers below into a plain additive
 * score over `src/data/courses.js` and shows the visitor which rules fired.
 * There is no model, no inference and no profile of any kind behind it, so no
 * copy in this file — question label, option label or stage body — may suggest
 * otherwise. Write plainly and let the scoring explain itself.
 *
 * ── `learningJourney` IS THE SINGLE DEFINITION OF THE SIX STAGES ───────────
 * The same exported array is rendered by every surface that shows the journey:
 * `src/components/common/CourseDetailView.jsx` on all ten `/courses/:slug`
 * routes, and the learning-path panel on `src/pages/Dashboard.jsx`. Both pass
 * it through `Timeline`, so a visitor reading a course page and a visitor
 * reading the dashboard see one definition rather than two copies that drift.
 * `src/data/studentDashboard.js` therefore deliberately holds NO stage labels
 * of its own and references this export instead — do not reintroduce a second
 * copy of these six stages anywhere.
 *
 * ── CONSUMERS ──────────────────────────────────────────────────────────────
 *   - src/components/common/LearningPathWizard.jsx
 *       Renders one `learningPathQuestions` entry per step as a `RadioGroup`,
 *       and the ranked results beneath the transparency sentence.
 *   - src/pages/LearningPath.jsx
 *       Holds the answers in the URL — `?goal=`, `?level=`, `?time=`, `?mode=`,
 *       one parameter per question `id` — so a recommendation is shareable and
 *       reproducible from the address alone.
 *   - src/lib/recommend.js
 *       `PathAnswers` keys ARE the four question ids, and each answer is
 *       validated against the allowlist named beside its question below.
 *   - src/components/common/CourseDetailView.jsx, src/pages/Dashboard.jsx
 *       Render `learningJourney` through `Timeline` (`label` → `title`,
 *       `body` → `description`, `href` → `href`).
 *
 * ── ALLOWLIST CONTRACT — WHERE EVERY OPTION VALUE COMES FROM ───────────────
 * A questionnaire answer is only useful if the recommender can match it against
 * the catalogue, so each question's option values are owned by another module
 * and merely echoed here:
 *   - `goal`  → `goals[].id` in src/data/goals.js
 *   - `level` → the `courses[].level` union in src/data/courses.js
 *   - `time`  → `DURATION_BANDS[].id` in src/lib/courseFilters.js
 *   - `mode`  → the `courses[].category` union in src/data/courses.js
 * This module stays import-free, so those values are restated rather than
 * imported. That is a deliberate trade: the cost is that a rename in the owning
 * module must be mirrored here, which is why every one of those ids is itself
 * documented as a never-rename public contract at its source.
 *
 * ── CONTENT NOTICE (AAP §0.7.4) ────────────────────────────────────────────
 * No accreditation, affiliation, ranking, award, partnership, placement figure,
 * completion figure, learner count or review appears in this file, and no stage
 * body promises a result or a timeframe: a body says what HAPPENS at a stage.
 * No phone number, email address or street address is restated here either —
 * those live only in `src/data/siteConfig.js` and are surfaced by components.
 * Hold any future edit to the same standard.
 *
 * @module data/learningPaths
 */

/**
 * One question in the learning-path questionnaire.
 *
 * @typedef {Object} PathQuestion
 * @property {'goal'|'level'|'time'|'mode'} id  PUBLIC CONTRACT — the URL
 *                                 parameter name on `/learning-path`
 *                                 (`?goal=`, `?level=`, `?time=`, `?mode=`) and
 *                                 the corresponding key of `PathAnswers` in
 *                                 `src/lib/recommend.js`. Never rename.
 * @property {string} label        The question as it is asked, verbatim,
 *                                 question mark included. Rendered as the
 *                                 `legend` of the step's `RadioGroup`.
 * @property {{value: string, label: string}[]} options
 *                                 The permitted answers. `value` is the
 *                                 machine id — drawn from the owning module
 *                                 named in the header's allowlist contract and
 *                                 never invented here — and `label` is what the
 *                                 visitor reads. Values are unique within a
 *                                 question.
 */

/**
 * The four questions, in the order they are asked.
 *
 * No question is marked optional and none may be: the wizard already handles a
 * partially answered set, and every `PathAnswers` key is optional at the
 * recommender's end, so optionality is behaviour rather than data. Do not add a
 * fifth question — four is the specified set, and each one maps to exactly one
 * scoring rule.
 *
 * @type {PathQuestion[]}
 */
export const learningPathQuestions = [
  {
    // Question one is the recommender's SINGLE HARD CONSTRAINT: a course is
    // eligible only when its `goals` array includes the chosen id, and a match
    // adds +3 — the only single rule that can reach the +3 relevance threshold
    // on its own. All six goals are offered because every one of them is
    // carried by at least one course; an unmatched goal would be a dead answer.
    // Values and labels are echoed from `goals[]` in src/data/goals.js, in that
    // module's own contractual declaration order, so the questionnaire and the
    // `?goal=` catalogue filter offer one identical set rather than two that
    // drift.
    id: 'goal',
    label: 'What is your main goal?',
    options: [
      { value: 'improve-spoken-english', label: 'Improve Spoken English' },
      { value: 'career-development', label: 'Career Development' },
      { value: 'academic-support', label: 'School / Academic Support' },
      { value: 'computer-skills', label: 'Computer Skills' },
      { value: 'interview-preparation', label: 'Interview Preparation' },
      { value: 'communication-skills', label: 'Communication Skills' },
    ],
  },
  {
    // Three options, not four. `'All levels'` is a legal `courses[].level`
    // value but is deliberately NOT offered as an answer: it is a statement
    // about a COURSE ("no particular starting point is required"), not
    // something a person can be, and this question asks for the learner's own
    // current level. Nothing is lost by excluding it — src/lib/recommend.js
    // awards +2 when `course.level` equals the chosen level OR is
    // `'All levels'`, so an all-levels course matches whichever of the three a
    // visitor picks. Do not add a fourth option such as "Not sure" either: it
    // would sit outside the `courses[].level` union and be dropped by the
    // route's allowlist validation, so it could never produce a result.
    // Level is also NOT a hard constraint in the scorer, precisely because
    // nine of the ten course records carry no level at all today.
    id: 'level',
    label: 'What is your current level?',
    options: [
      { value: 'Beginner', label: 'Beginner' },
      { value: 'Intermediate', label: 'Intermediate' },
      { value: 'Advanced', label: 'Advanced' },
    ],
  },
  {
    // The three duration bands declared by `DURATION_BANDS` in
    // src/lib/courseFilters.js, with their labels mirrored verbatim so one band
    // never displays two different strings across the questionnaire and the
    // catalogue filter.
    //
    // DO NOT REMOVE `upto-1-month`, EVEN THOUGH IT MATCHES ZERO COURSES.
    // The catalogue's `durationWeeks` values are 6, 8, 12 and 48, so the bands
    // currently hold 0, 8 and 2 courses. That empty band is load-bearing, not
    // an oversight: it is what lets a complete answer set legitimately return
    // NO recommendation, which is the only way the learning path's no-match
    // empty state is reachable and therefore verifiable. Widening the band or
    // dropping the option would quietly make an acceptance check impossible to
    // run. The band boundaries themselves are a published contract owned by
    // src/lib/courseFilters.js and are not restated here.
    id: 'time',
    label: 'How much time can you dedicate?',
    options: [
      { value: 'upto-1-month', label: 'Up to 1 month' },
      { value: '1-3-months', label: '1–3 months' },
      { value: '3-months-plus', label: '3 months or more' },
    ],
  },
  {
    // Each `value` is a `courses[].category` literal BYTE-FOR-BYTE, because
    // src/lib/recommend.js compares `course.category === answers.mode` and
    // because those four strings are a public contract beyond this file: they
    // key `CourseCard`'s route and image maps and drive the three subject-track
    // pages' filters (AAP §0.7.3). The LABELS are the friendlier track names
    // the site already uses on its own surfaces, so a visitor recognises them;
    // only the labels may be reworded, never the values.
    id: 'mode',
    label: 'What type of learning are you interested in?',
    options: [
      { value: 'English', label: 'English & Communication' },
      { value: 'Science', label: 'Science Coaching' },
      { value: 'Computer', label: 'Computer Courses' },
      { value: 'Career', label: 'Career Guidance' },
    ],
  },
]

/**
 * One stage of the learner journey.
 *
 * @typedef {Object} JourneyStage
 * @property {string} id      PUBLIC CONTRACT — stable stage id; the dashboard
 *                            and the course detail route both key on it.
 *                            Kebab-case, unique, and never a display value, so
 *                            it must never be renamed even when a label is
 *                            reworded.
 * @property {string} label   The stage name, verbatim. Maps onto `Timeline`'s
 *                            `title`, which is ALSO that component's React key
 *                            (`key={item.title}`) — so the six labels must stay
 *                            unique as well as the six ids.
 * @property {string} body    What happens at this stage, in the institute's
 *                            terms. Maps onto `Timeline`'s `description` and
 *                            renders as a short paragraph under the stage
 *                            heading, so it is supporting copy — never a
 *                            heading, never a promise.
 * @property {string} [href]  OPTIONAL in-app route that acts on this stage.
 *                            When present, `Timeline` renders the label as a
 *                            react-router `<Link>` inside the same `<h3>`; when
 *                            absent, the stage renders byte-identically to
 *                            every other `Timeline` step. Populated only where
 *                            a route genuinely acts on the stage — see the
 *                            policy above the array.
 */

/**
 * The six stages of the learner journey, in order:
 * Discover → Check Eligibility → Enquire → Enroll → Learn → Complete.
 *
 * ── `href` POLICY: THREE STAGES CARRY ONE, THREE DELIBERATELY DO NOT ───────
 * A stage gets an `href` only where a route on this site genuinely acts on it,
 * which is true of the first three and of none of the last three:
 *   - `discover`          → `/courses`, the catalogue, which is literally where
 *                           a visitor discovers what is offered.
 *   - `check-eligibility` → the FAQ question that answers who may join,
 *                           addressed by its `#faq-<id>` fragment; `faq[].id`
 *                           is a real fragment contract owned by
 *                           src/data/faq.js.
 *   - `enquire`           → `/admission`, the enquiry surface.
 * Confirming an enrolment, attending classes and completing a course all happen
 * at the institute, not on a route, so `enroll`, `learn` and `complete` carry
 * NO `href`. Do not point them at `/admission` or `/contact` merely to fill the
 * field: a stage whose link does not act on that stage is a worse experience
 * than a stage with no link, and an item without `href` is exactly what
 * `Timeline` has always rendered.
 *
 * ── WHERE THE COPY COMES FROM ──────────────────────────────────────────────
 * These six stages are a SUPERSET of the institute's only evidenced admission
 * process — the four-step timeline published on `/admission` (Submit Enquiry →
 * Free Counseling → Confirm Enrolment → Start Learning). Each body below is
 * written to agree with that process rather than to extend it: no fifth
 * institute step is invented, nothing contradicts those four, and no outcome,
 * rate or timeframe is promised. The `enquire` body in particular states the
 * mechanism truthfully — this site has no backend, so an enquiry opens a
 * pre-filled WhatsApp chat or email draft on the visitor's own device and
 * nothing is sent unless they press send. It must never say a form was
 * submitted, sent to us or received.
 *
 * No stage carries an `icon`, on purpose: `Timeline` then renders the 1-based
 * step number in each marker, which reads as an ordered journey and keeps this
 * module free of the `react-icons` reference the serialisability rule excludes.
 *
 * @type {JourneyStage[]}
 */
export const learningJourney = [
  {
    id: 'discover',
    label: 'Discover',
    body: 'Browse the course catalogue to see what CIBLE teaches, how long each course runs and what it covers. Filtering by goal, level, duration and prior knowledge narrows the list to the courses worth reading in full.',
    href: '/courses',
  },
  {
    id: 'check-eligibility',
    label: 'Check Eligibility',
    body: 'Find out who a course is for before you enquire. A course page states its eligibility and the prior knowledge it expects wherever the institute has confirmed them, and the FAQ answers which age groups and students can join CIBLE.',
    href: '/faq#faq-age-groups-and-eligibility',
  },
  {
    id: 'enquire',
    label: 'Enquire',
    body: 'Fill the admission form, or reach the institute on WhatsApp or by phone, to register your interest. The form opens a pre-filled WhatsApp chat or email draft on your own device, and nothing is sent unless you press send. A counselor then helps you choose the right course for your goals and your current level.',
    href: '/admission',
  },
  {
    id: 'enroll',
    label: 'Enroll',
    body: 'Complete a simple registration at the institute and choose a batch timing that suits you. Exact timings vary by course and season, so this is the point at which you confirm the current schedule with the institute.',
  },
  {
    id: 'learn',
    label: 'Learn',
    body: 'Begin your classes at the batch timing you chose, and put what each session covers into practice with your faculty and the rest of your batch.',
  },
  {
    id: 'complete',
    label: 'Complete',
    body: 'Work through to the end of the course you enrolled in. Ask the institute what completing your particular course includes — certificate details are course-specific and are covered in a counseling session — and which course, if any, follows on from it.',
  },
]

/**
 * A curated learning path: a NAMED, ORDERED sequence of courses that serves one
 * or more learner goals.
 *
 * The typedef is declared in full even though {@link learningPaths} ships
 * empty, because it is the contract a content owner populates later with no
 * code change at all — the wizard already groups its ranked results under a
 * matching path whenever one exists.
 *
 * @typedef {Object} LearningPath
 * @property {string} id            PUBLIC CONTRACT once authored — kebab-case,
 *                                  stable, and used to key the path panel's
 *                                  rendering. Never rename one after it ships.
 * @property {string} title         The path name the visitor reads.
 * @property {string} description   One or two sentences on who the sequence is
 *                                  for and what order it runs in. Must describe
 *                                  a progression the institute itself states —
 *                                  see the admissibility rule below.
 * @property {string[]} courseSlugs ORDERED `courses[].slug` values from
 *                                  `src/data/courses.js`. The order IS the
 *                                  pedagogical claim, which is exactly why it
 *                                  cannot be improvised. Validated at the point
 *                                  of use: an unresolvable slug is skipped
 *                                  rather than rendered as an empty row.
 * @property {string[]} goals       `goals[].id` values from
 *                                  `src/data/goals.js` that this path serves.
 *                                  The results view groups under a path only
 *                                  when the answered goal appears here.
 */

/**
 * The curated learning paths — **INTENTIONALLY EMPTY. DO NOT POPULATE FROM
 * IMAGINATION.**
 *
 * ── WHY IT IS EMPTY ───────────────────────────────────────────────────────
 * A suggested ordering of courses is a pedagogical claim, and the repository
 * holds no approved one (AAP §0.7.2). The rule is the same one that governs the
 * conditional course fields: this module ships with only those paths the
 * institute's existing content already supports, and ships EMPTY if that is
 * none. It is none. All three subject-track pages — `src/pages/SpokenEnglish.jsx`,
 * `src/pages/ScienceCoaching.jsx` and `src/pages/ComputerCourses.jsx` — simply
 * filter the catalogue by category and state no ordering whatsoever; the English
 * track's own copy tells a visitor to "choose the program that matches your
 * goals", which is a choice and not a sequence. The catalogue's order within a
 * category is declaration order, not an authored progression. The nearest thing
 * the repository says about where to start is the FAQ answer that a counseling
 * session will suggest a starting point — which defers the question to the
 * institute rather than answering it here.
 *
 * ── WHY THE EXPORT EXISTS AT ALL ──────────────────────────────────────────
 * It is part of the specified data architecture, and a future curated set needs
 * a defined home with a declared contract rather than a new module invented
 * under time pressure. {@link LearningPath} above is that contract, complete
 * and ready: dropping records in here needs no code change anywhere.
 *
 * ── WHAT MAKES A RECORD ADMISSIBLE ────────────────────────────────────────
 * A path is admissible ONLY when its ordered `courseSlugs` reflect a
 * progression the institute already describes — a track page's own stated
 * sequence, for example, or a written recommendation from the institute that a
 * particular course follows another. Inventing a ladder such as "Beginner to
 * Advanced English" out of three courses that happen to share a category is
 * explicitly NOT admissible: nothing in the repository says those three are
 * taken in that order, so the claim would be authored by the implementer rather
 * than by the institute.
 *
 * ── WHY SHIPPING EMPTY COSTS THE FEATURE NOTHING ──────────────────────────
 * `src/lib/recommend.js` returns ranked individual courses each with the rules
 * that matched, and that flat ranked list IS the complete, transparent
 * learning-path result. This layer only GROUPS those results under a named
 * sequence: when `learningPaths` is empty — or when no path's `goals` include
 * the answered goal — the results view renders the flat ranked list with its
 * per-course reasons, which is the honest and complete outcome. The grouping is
 * an enhancement over it, never a precondition for it, so an empty array here
 * degrades nothing and claims nothing.
 *
 * KNOWN LIMITATION, to be reported: zero curated paths ship; the
 * curated-sequence layer awaits content-owner input.
 *
 * @type {LearningPath[]}
 */
export const learningPaths = []

/**
 * Convenience default export bundling all three collections for single-import
 * consumption, e.g.
 * `import learningPathData from '../../data/learningPaths.js'`.
 *
 * Named imports remain the preferred form — a surface that renders only the
 * journey should import only `learningJourney` — and both forms address the same
 * arrays.
 */
export default { learningPathQuestions, learningPaths, learningJourney }
