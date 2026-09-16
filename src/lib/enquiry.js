/**
 * Outbound enquiry dispatch for the CIBLE School of Language website.
 *
 * This module is the single owner of the "how does an enquiry leave the
 * browser" path (AAP §0.2.3). It is the dispatch code lifted out of
 * `components/forms/AdmissionForm.jsx` with NO behavioural change, so that both
 * site forms — `AdmissionForm` and `ContactForm` — compose their handoff
 * through one implementation, and so that one module is what a future real
 * service replaces (AAP §0.6.2).
 *
 * The site is client-only: there is NO backend, no API and no database. A
 * dispatch therefore does not POST anywhere. It composes a labelled plain-text
 * body from already-validated field values and hands it to the visitor's own
 * app — a pre-filled WhatsApp deep link (primary) or a `mailto:` draft
 * (secondary). Nothing in this module performs a network call of any kind —
 * no fetch/XHR, no socket, no polling — and none may ever be added here
 * without a real service behind it.
 *
 * Truthful handoff (M04): opening a pre-filled draft is NOT a send. The honest
 * success status is therefore `'opened'` — the draft is ready for the visitor
 * to press Send — and never `'sent'`. `'sent'` exists in the
 * {@link DispatchResult} union purely so a future server implementation has a
 * value to return; no code path in this module produces it today, and no string
 * this module returns claims that an enquiry was sent, received or delivered.
 *
 * No manufactured latency (M05): every channel is opened SYNCHRONOUSLY, inside
 * the user gesture that triggered it. There is no artificial `setTimeout`, no
 * simulated pending phase and no timer to leak. {@link dispatchEnquiry} is
 * declared `async` so callers are written against a Promise from day one, but
 * its body contains no `await` at all — the window is opened in the first
 * synchronous run and the Promise merely resolves with the outcome. An `await`
 * placed before the open would hand the browser a microtask boundary and turn a
 * working deep link into an intermittently popup-blocked one.
 *
 * Bounded input (M06): two independent clamps are preserved, exactly as the
 * forms applied them. Each field value is clamped to its own maximum while the
 * body is assembled ({@link buildMessage}), and the ASSEMBLED body is then
 * clamped once more to {@link MAX_CHANNEL_TEXT} as the URL is composed, so the
 * outbound URL is hard-bounded and can never balloon into a
 * multi-thousand-character payload.
 *
 * Duplicate-submit protection deliberately does NOT live here: the calling
 * form owns its `submittingRef` guard and remains the single gate on reaching
 * this module (AAP §0.6.2). A module-level in-flight flag would be a second,
 * competing guard shared across every form instance on the page.
 *
 * Single source of truth for endpoints: this module imports no configuration.
 * Every endpoint (`whatsappHref`, `emailHref`) arrives as an argument, read by
 * the caller from the shared site configuration module, so the value still
 * originates there and nothing is hardcoded here. That also keeps this module a
 * one-import, side-effect-free seam that is safe to import anywhere.
 *
 * All values are exported by name; there is no default export.
 *
 * @module lib/enquiry
 */

import { truncate, MAX_LENGTHS } from './validators.js'

/**
 * Total-channel cap: the defensive clamp applied to the ASSEMBLED handoff body,
 * on top of the per-field caps, so the outbound WhatsApp / `mailto:` URL is
 * hard-bounded (M06).
 *
 * The value matches the cap both forms applied before this extraction, so the
 * composed URLs are byte-identical to the ones the site produced previously.
 *
 * @type {number}
 */
export const MAX_CHANNEL_TEXT = 1600

/**
 * One labelled value in an enquiry body.
 *
 * @typedef {Object} EnquiryField
 * @property {string} label - The line's label, rendered as `` `${label}: ` ``
 *   before the value (for example `'Name'`, `'Preferred Batch'`, `'Notes'`).
 *   Callers supply the exact spelling they want the institute to receive.
 * @property {string} value - The already-validated field value. A non-string
 *   (`undefined`, `null`, a number) is treated as empty by {@link truncate} and
 *   the line is dropped rather than rendering `undefined`.
 * @property {number} [max] - Per-field character cap. Defaults to
 *   `MAX_LENGTHS.message` when omitted. Callers pass the same
 *   {@link MAX_LENGTHS} key they used before this extraction — `name` for a
 *   name, `phone` for a phone, `email` for an email, `subject` for a course,
 *   batch or subject line, `message` for free text — which is what reproduces
 *   the previous output line for line. A single generic cap could not.
 */

/**
 * The complete, channel-independent description of one enquiry.
 *
 * Three members, because the two calling forms genuinely differ in exactly two
 * ways: the heading and label set they compose, and how they produce the email
 * subject line.
 *
 * @typedef {Object} EnquiryPayload
 * @property {string} heading - The body's first line, for example
 *   `'New Admission Inquiry — CIBLE School of Language'`.
 * @property {EnquiryField[]} fields - The ordered labelled values, rendered one
 *   per line after the heading.
 * @property {string} emailSubject - REQUIRED. The `mailto:` subject line.
 *   It is required — never derived and never defaulted — because the two forms
 *   compose it differently and neither form's subject can be reconstructed from
 *   `heading`: the admission form passes a fixed subject, while the contact form
 *   passes `` `CIBLE Website Contact: <subject>` `` built from its own subject
 *   field. A caller that omits it is a bug; the email channel would then compose
 *   a draft with an empty subject header. This module clamps the value it is
 *   given (see {@link emailDraftUrl}) but never invents one.
 */

/**
 * The outcome of one dispatch attempt.
 *
 * @typedef {Object} DispatchResult
 * @property {'whatsapp'|'email'|'service'} channel - The channel that handled
 *   the attempt. `'service'` is reserved for a future remote implementation and
 *   is never produced today. In the single defensive case of a request naming an
 *   unrecognised channel, the requested value is echoed back verbatim so the
 *   caller can log what was asked for; that is the one case where this property
 *   falls outside the union above.
 * @property {'opened'|'sent'|'blocked'|'error'} status - `'opened'` is the local
 *   channels' honest success: a pre-filled draft is open and awaiting the
 *   visitor's Send. `'blocked'` means the browser prevented the tab from opening
 *   and nothing was sent. `'error'` is a genuine failure. `'sent'` is reserved
 *   for a real service and is never produced by this module.
 * @property {string} [reason] - A short, honest explanation. Present only for
 *   `'blocked'` and `'error'`.
 * @property {string} [draftUrl] - The composed channel URL, returned for
 *   `'opened'` and `'blocked'`. Both forms hold this in state and render it as a
 *   real, clickable recovery link in their opened AND blocked panels, so the
 *   seam hands it back rather than forcing URL construction into each component.
 */

/**
 * Compose the human-readable enquiry body from a payload.
 *
 * Pure and deterministic: no side effects, no `window` access, no I/O. The
 * heading comes first, then one `` `${label}: ${value}` `` line per field, joined
 * with `'\n'` — the same separator the forms used, deliberately not `'\r\n'`,
 * because the body is URL-encoded into the channel link.
 *
 * Every value is clamped with {@link truncate} to the field's own `max` (falling
 * back to `MAX_LENGTHS.message`) even though the fields are already validated
 * and capped by the form (M06).
 *
 * A field whose value is EMPTY after truncation is dropped, which reproduces the
 * `filter(Boolean)` the admission form applied so the body never contains a
 * blank line for an omitted optional field (its preferred batch and notes). The
 * emptiness test is a length test, not a trim test, so a value of visible
 * whitespace is preserved exactly as it was before. For the contact form the
 * rule is inert rather than divergent: all five of its fields are required by
 * validation, so none of them can be empty at dispatch and every line is
 * rendered — the output is identical either way.
 *
 * The total-channel clamp is deliberately NOT applied here. It belongs to URL
 * composition, where it is applied exactly once immediately before encoding
 * (see {@link whatsAppDraftUrl} and {@link emailDraftUrl}), which keeps the
 * per-field and whole-body clamps visible and independently correct.
 *
 * @param {EnquiryPayload} payload - The enquiry to serialise. A malformed or
 *   missing payload yields `''` rather than throwing, so a caller error surfaces
 *   as an empty draft body instead of an exception inside a submit handler.
 * @returns {string} The plain-text body, newline separated.
 */
export function buildMessage(payload) {
  const source = payload && typeof payload === 'object' ? payload : {}
  const fields = Array.isArray(source.fields) ? source.fields : []

  const lines = [typeof source.heading === 'string' ? source.heading : '']

  for (const field of fields) {
    if (!field || typeof field !== 'object') continue
    const max = Number.isFinite(field.max) && field.max >= 0 ? field.max : MAX_LENGTHS.message
    const value = truncate(field.value, max)
    // Drop the line when the value is empty (the form's `filter(Boolean)`).
    if (value.length === 0) continue
    const label = typeof field.label === 'string' ? field.label : ''
    lines.push(`${label}: ${value}`)
  }

  // Filter after assembly so an empty heading cannot leave a leading blank line.
  return lines.filter((line) => line.length > 0).join('\n')
}

/**
 * Compose the pre-filled WhatsApp deep link for a body of text.
 *
 * Pure and deterministic, so the same arguments always yield the same URL. The
 * body is clamped ONCE to {@link MAX_CHANNEL_TEXT} and then URL-encoded, which
 * is the single point at which the total-channel cap is applied.
 *
 * Exported because the composed URL is itself product: both forms render it as a
 * clickable recovery link in their result panels. {@link dispatchEnquiry}
 * returns it as `draftUrl`; a caller using the synchronous
 * {@link openWhatsAppDraft} path obtains it from here.
 *
 * @param {object} args - Composition arguments.
 * @param {string} args.text - The assembled body, typically from
 *   {@link buildMessage}.
 * @param {string} args.whatsappHref - The WhatsApp endpoint, read by the caller
 *   from the shared site configuration (for example `https://wa.me/<number>`).
 * @returns {string} The fully pre-filled WhatsApp URL.
 */
export function whatsAppDraftUrl({ text, whatsappHref } = {}) {
  const base = typeof whatsappHref === 'string' ? whatsappHref : ''
  const body = truncate(text, MAX_CHANNEL_TEXT)
  return `${base}?text=${encodeURIComponent(body)}`
}

/**
 * Compose the pre-filled `mailto:` draft URL for a subject and body.
 *
 * Pure and deterministic. The parameter order is `?subject=…&body=…`, matching
 * the URL the forms produced before this extraction, and both values are
 * URL-encoded. The body is clamped ONCE to {@link MAX_CHANNEL_TEXT}.
 *
 * The subject is clamped to `MAX_LENGTHS.subject`, the defensive header bound
 * (M06). For a caller whose subject is a fixed short line the clamp is a no-op.
 * For the contact form, whose subject is `` `CIBLE Website Contact: <subject>` ``
 * over an input already validated to `MAX_LENGTHS.subject` characters, the clamp
 * engages only when that composed line exceeds the bound — it trims the mail
 * header, never the body, which carries the visitor's subject in full on its own
 * `Subject:` line.
 *
 * @param {object} args - Composition arguments.
 * @param {string} args.subject - The mail subject line, from
 *   `EnquiryPayload.emailSubject`.
 * @param {string} args.text - The assembled body, typically from
 *   {@link buildMessage}.
 * @param {string} args.emailHref - The `mailto:` endpoint, read by the caller
 *   from the shared site configuration.
 * @returns {string} The fully pre-filled `mailto:` URL.
 */
export function emailDraftUrl({ subject, text, emailHref } = {}) {
  const base = typeof emailHref === 'string' ? emailHref : ''
  const header = truncate(subject, MAX_LENGTHS.subject)
  const body = truncate(text, MAX_CHANNEL_TEXT)
  return `${base}?subject=${encodeURIComponent(header)}&body=${encodeURIComponent(body)}`
}

/**
 * Determine whether this module is running with a usable browser window.
 *
 * Module-local (NOT exported). The check exists so importing or calling this
 * module outside a browser — a build step, a Node script, a server render —
 * cannot throw a `ReferenceError`; it changes nothing about in-browser
 * behaviour, where `window` is always present.
 *
 * @returns {boolean} `true` when a `window` object is available.
 */
function hasWindow() {
  return typeof window !== 'undefined' && window !== null
}

/**
 * Open a URL in a new browser tab and report whether the browser allowed it.
 *
 * Module-local (NOT exported). This is the ONLY place the site opens a tab, so
 * the two protections below exist once rather than per caller:
 *
 * 1. `window.open` is called WITHOUT the `noopener` feature. That is deliberate
 *    and must not be "hardened": with `noopener` the return value is always
 *    `null`, which makes a popup block undetectable and would force the site to
 *    claim success it cannot verify. The opener reference is severed manually
 *    immediately afterwards instead, keeping the same security posture.
 * 2. A falsy return means the browser blocked the popup, which is reported as
 *    `'blocked'` — never as success.
 *
 * `win.opener = null` is intentionally not wrapped in its own `try`: on the rare
 * platform where the assignment throws, the exception propagates to the caller's
 * handler and surfaces as an error state, exactly as it did before this
 * extraction.
 *
 * @param {string} url - The URL to open. Must already be composed and encoded.
 * @returns {'opened'|'blocked'} `'opened'` when a window handle came back,
 *   `'blocked'` when the browser refused it or no window is available.
 */
function openInNewTab(url) {
  if (!hasWindow() || typeof window.open !== 'function') return 'blocked'
  const win = window.open(url, '_blank')
  if (!win) return 'blocked'
  win.opener = null
  return 'opened'
}

/**
 * Navigate the current tab to a URL.
 *
 * Module-local (NOT exported). Used for the `mailto:` channel, which hands off
 * to the visitor's mail client rather than opening a browser tab and therefore
 * has no popup-block equivalent to detect.
 *
 * @param {string} url - The URL to navigate to. Must already be composed and
 *   encoded.
 * @returns {void}
 */
function navigateSelf(url) {
  if (!hasWindow() || !window.location) return
  window.location.href = url
}

/**
 * Describe a thrown value as a short, honest failure reason.
 *
 * Module-local (NOT exported). The wording never implies that anything reached
 * the institute.
 *
 * @param {unknown} error - The value caught while opening a channel.
 * @returns {string} A human-readable reason for a `'error'` result.
 */
function describeFailure(error) {
  const detail = error instanceof Error && error.message ? error.message : String(error)
  return `The draft could not be opened (${detail}). Nothing has been sent.`
}

/**
 * Open a pre-filled WhatsApp draft for an already-assembled body.
 *
 * Synchronous by design, because opening a deep link is a synchronous act.
 *
 * CALLER OBLIGATION: call this SYNCHRONOUSLY inside the submit handler that the
 * user's click triggered. Deferring it — behind an `await`, a `setTimeout` or a
 * state update — costs the user gesture, and the browser then treats the tab as
 * programmatic and blocks it.
 *
 * The composed URL is not returned (this function reports status only); obtain
 * it from {@link whatsAppDraftUrl} with the same arguments, which is pure and
 * yields the identical string, or use {@link dispatchEnquiry}, which returns it
 * as `draftUrl`. Both forms need that URL for the recovery link they render in
 * their opened AND blocked panels.
 *
 * @param {object} args - Dispatch arguments.
 * @param {string} args.text - The assembled body, typically from
 *   {@link buildMessage}. Clamped to {@link MAX_CHANNEL_TEXT} during composition.
 * @param {string} args.whatsappHref - The WhatsApp endpoint, read by the caller
 *   from the shared site configuration.
 * @returns {'opened'|'blocked'} `'opened'` when the pre-filled draft opened and
 *   is awaiting the visitor's Send — which is not a send. `'blocked'` when the
 *   browser refused the tab, or when no browser window is available; in both
 *   cases nothing has been sent and the caller must offer the URL as a real,
 *   clickable link instead of claiming success.
 */
export function openWhatsAppDraft({ text, whatsappHref } = {}) {
  return openInNewTab(whatsAppDraftUrl({ text, whatsappHref }))
}

/**
 * Open a pre-filled `mailto:` draft for an already-assembled body.
 *
 * Synchronous by design, with the same caller obligation as
 * {@link openWhatsAppDraft}: open it inside the user gesture.
 *
 * The return union has a single member because navigating the current tab to a
 * `mailto:` URL exposes no success or failure signal to the page — unlike
 * `window.open`, there is nothing to inspect. On the defensive path where no
 * browser window exists the navigation is skipped and `'opened'` is still
 * returned, because the declared contract has no other value; a caller that
 * must distinguish that case should use {@link dispatchEnquiry}, which checks
 * first and resolves with an `'error'` result and a reason.
 *
 * @param {object} args - Dispatch arguments.
 * @param {string} args.subject - The mail subject line, from
 *   `EnquiryPayload.emailSubject`. Clamped during composition.
 * @param {string} args.text - The assembled body, typically from
 *   {@link buildMessage}. Clamped to {@link MAX_CHANNEL_TEXT} during composition.
 * @param {string} args.emailHref - The `mailto:` endpoint, read by the caller
 *   from the shared site configuration.
 * @returns {'opened'} The draft was handed to the visitor's mail client and is
 *   awaiting their Send — which is not a send.
 */
export function openEmailDraft({ subject, text, emailHref } = {}) {
  navigateSelf(emailDraftUrl({ subject, text, emailHref }))
  return 'opened'
}

/**
 * Dispatch one enquiry through the requested channel and report the outcome.
 *
 * This is the adapter interface both the local implementation and any future
 * remote implementation satisfy, and it is what the forms call. It is `async`
 * from the outset so a component is written against a Promise on day one, even
 * though the local channels resolve in the same tick.
 *
 * CRITICAL: the body contains no `await`. The URL is composed and the channel is
 * opened in the first synchronous run, inside the user gesture, and only then is
 * the outcome resolved. Introducing an `await` before the open would insert a
 * microtask boundary and turn a working deep link into an intermittent popup
 * block, so any future remote branch must be added AFTER the local ones rather
 * than in front of them.
 *
 * Adding a real service later costs exactly one more branch inside this module
 * plus a pending indicator in the form — a change of known and bounded size. It
 * is deliberately not implemented now: there is no backend, so `'service'` and
 * `'sent'` remain declared-but-unused values rather than a simulated integration.
 *
 * Failures are resolved, never thrown: an unknown channel, a missing endpoint,
 * an unavailable window or an exception while opening all resolve with
 * `status: 'error'` and a reason, so a submit handler never has to guard the
 * call site. A blocked popup resolves with `status: 'blocked'` and the
 * `draftUrl`, so the caller can present the pre-filled draft as a real link.
 *
 * @param {EnquiryPayload} payload - The enquiry to dispatch.
 * @param {object} options - Channel selection and endpoints. This widens the
 *   channel-only shape the architecture sketch showed, because this module
 *   composes the URL itself and imports no configuration, so the endpoint for
 *   the chosen channel must be passed in.
 * @param {'whatsapp'|'email'} options.channel - Which channel to open.
 * @param {string} [options.whatsappHref] - REQUIRED when `channel` is
 *   `'whatsapp'`; read by the caller from the shared site configuration.
 * @param {string} [options.emailHref] - REQUIRED when `channel` is `'email'`;
 *   read by the caller from the shared site configuration.
 * @returns {Promise<DispatchResult>} The single outcome of the attempt.
 */
export async function dispatchEnquiry(payload, options) {
  const settings = options && typeof options === 'object' ? options : {}
  const { channel, whatsappHref, emailHref } = settings
  const text = buildMessage(payload)

  if (channel === 'whatsapp') {
    if (typeof whatsappHref !== 'string' || whatsappHref.length === 0) {
      return {
        channel,
        status: 'error',
        reason: 'No WhatsApp address was supplied, so no draft could be opened. Nothing has been sent.',
      }
    }
    const draftUrl = whatsAppDraftUrl({ text, whatsappHref })
    if (!hasWindow() || typeof window.open !== 'function') {
      return {
        channel,
        status: 'error',
        reason: 'This environment cannot open a WhatsApp tab, so no draft could be opened. Nothing has been sent.',
      }
    }
    try {
      // Opened here, synchronously, before anything resolves — see CRITICAL above.
      if (openInNewTab(draftUrl) === 'blocked') {
        return {
          channel,
          status: 'blocked',
          reason: 'The browser blocked the WhatsApp tab, so nothing has been sent. Open the pre-filled draft directly to continue.',
          draftUrl,
        }
      }
      return { channel, status: 'opened', draftUrl }
    } catch (error) {
      return { channel, status: 'error', reason: describeFailure(error) }
    }
  }

  if (channel === 'email') {
    if (typeof emailHref !== 'string' || emailHref.length === 0) {
      return {
        channel,
        status: 'error',
        reason: 'No email address was supplied, so no draft could be opened. Nothing has been sent.',
      }
    }
    const subject = payload && typeof payload === 'object' ? payload.emailSubject : ''
    const draftUrl = emailDraftUrl({ subject, text, emailHref })
    if (!hasWindow() || !window.location) {
      return {
        channel,
        status: 'error',
        reason: 'This environment cannot open a mail draft, so nothing could be opened. Nothing has been sent.',
      }
    }
    try {
      // Navigated here, synchronously, before anything resolves.
      navigateSelf(draftUrl)
      return { channel, status: 'opened', draftUrl }
    } catch (error) {
      return { channel, status: 'error', reason: describeFailure(error) }
    }
  }

  // Defensive branch: an unrecognised channel is echoed back so the caller can
  // log what was requested, and nothing is opened or claimed.
  return {
    channel: typeof channel === 'string' ? channel : String(channel),
    status: 'error',
    reason: `"${String(channel)}" is not a supported enquiry channel, so no draft could be opened. Nothing has been sent.`,
  }
}
