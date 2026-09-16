/**
 * CIBLE School of Language — Learner Goal Taxonomy
 * ------------------------------------------------
 * Single source of truth for the six learner goals a visitor can choose from.
 * A goal answers the question "what do you want to achieve?", and it is the one
 * attribute that connects a visitor's own intent to the course catalogue.
 *
 * Pure ESM data module: no React, no JSX, no imports — and it must stay that
 * way. Every value below is a plain string, because these values travel into
 * URLs and into user-visible recommendation reasons; per the serialisability
 * rule (AAP §0.7.3), no `react-icons` component reference belongs in here.
 *
 * ── ID CONTRACT — READ BEFORE EDITING ──────────────────────────────────────
 * Every `id` is a PUBLIC CONTRACT and MUST NEVER BE RENAMED. An id is not an
 * internal key: it is published in the address bar and is stored inside course
 * records, so renaming one breaks already-shared links and catalogue
 * cross-references at the same time, silently and without a build error.
 * Labels and descriptions may be reworded freely; ids may not.
 *
 * ── ORDER CONTRACT ─────────────────────────────────────────────────────────
 * The declaration order of `goals` is contractual, not cosmetic. URL-backed
 * filter state is normalised by sorting values into this module's own
 * declaration order (AAP §0.5.2), so that one view always resolves to exactly
 * one canonical URL instead of several spellings of the same view. Reordering
 * this array therefore changes canonical URLs for links already shared.
 *
 * ── CONSUMERS ──────────────────────────────────────────────────────────────
 *   - src/data/courses.js
 *       `courses[].goals` holds ids from this module, most courses carrying
 *       one or two. Every id below is carried by at least one course: a goal
 *       that no course carries would be a dead filter option and a dead
 *       questionnaire answer, since the filter could only ever return nothing.
 *   - src/hooks/useCourseFilters.js — the `?goal=` parameter on /courses
 *       A SINGLE-select dimension, read with `URLSearchParams.get` (never
 *       `getAll`) and validated against this module as an allowlist. An
 *       unrecognised value is dropped rather than rendered, so a hand-edited
 *       URL degrades to the default view instead of showing a filter that does
 *       not exist.
 *   - src/data/learningPaths.js
 *       Question one (`id: 'goal'`) draws its option values from here, and
 *       `learningPaths[].goals` references these same ids.
 *   - src/lib/recommend.js
 *       A chosen goal is the scorer's SINGLE HARD CONSTRAINT — a course is
 *       eligible only when
 *       `Array.isArray(course.goals) && course.goals.includes(answers.goal)`.
 *       A goal match adds +3 and renders the user-visible reason
 *       "Matches your goal: <label>", which is why `label` is written to read
 *       naturally after that prefix. The scoring is a plain deterministic sum:
 *       nothing here is predicted, inferred or personalised.
 *   - src/components/forms/AdmissionFormSteps.jsx
 *       Step one is a RadioGroup over these six options, with a `oneOfRule`
 *       allowlist built from the ids below.
 *
 * ── CONTENT NOTICE ─────────────────────────────────────────────────────────
 * Each `description` states what a learner wants to achieve and the kind of
 * teaching that serves it, in the institute's own terms. Per AAP §0.7.4 these
 * are aspirations and never promises: no result, rate, figure or timeline is
 * asserted here, and no institutional credential or third-party endorsement
 * of any kind is claimed. Hold any future edit to that same standard.
 *
 * @typedef {Object} LearnerGoal
 * @property {string} id           PUBLIC CONTRACT — appears as a URL parameter
 *                                 value (`?goal=<id>`) and inside
 *                                 `course.goals`. Kebab-case and URL-safe, so
 *                                 it never needs escaping. Never rename.
 * @property {string} label        Display label, shown on filter options,
 *                                 questionnaire answers and recommendation
 *                                 reasons.
 * @property {string} description  One sentence, used as the filter option hint
 *                                 and the questionnaire option hint. These
 *                                 render inside a `Select` option and a
 *                                 `RadioGroup` item, so keep them short.
 */

/**
 * The six learner goals, in contractual declaration order.
 *
 * @type {LearnerGoal[]}
 */
export const goals = [
  {
    id: 'improve-spoken-english',
    label: 'Improve Spoken English',
    description:
      'Speak English more confidently in everyday conversations, with clearer pronunciation and less hesitation.',
  },
  {
    id: 'career-development',
    label: 'Career Development',
    description:
      'Work towards a stronger professional profile, from workplace communication to choosing a clear career direction.',
  },
  {
    id: 'academic-support',
    label: 'School / Academic Support',
    description:
      'Study school science subjects with structured coaching alongside Class 11 and 12, including board exam practice.',
  },
  {
    id: 'computer-skills',
    label: 'Computer Skills',
    description:
      'Become comfortable using a computer for everyday work, study and online tasks.',
  },
  {
    id: 'interview-preparation',
    label: 'Interview Preparation',
    description:
      'Get ready for job interviews and selection rounds through resume practice, mock interviews and group discussions.',
  },
  {
    id: 'communication-skills',
    label: 'Communication Skills',
    description:
      'Express ideas clearly and hold attention when writing, presenting or speaking to a group.',
  },
]

export default goals
