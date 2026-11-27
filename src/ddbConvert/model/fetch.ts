// Fetching a D&D Beyond character straight from its character service, for the
// review (MYDND-295). Public: both editions import by a link. The relay and the
// connection probes stay in the private ddbImport domain. The HTTP client is
// injected.

import type { DdbPayload } from '../../characterModel'
import type { RequestUrlFn, RequestUrlResult } from '../../platform'
import { unwrapDdbEnvelope } from './file'

/**
 * Fetching a character from D&D Beyond.
 *
 * `requestUrl` is Obsidian's own HTTP client and is not subject to CORS, so this
 * needs no proxy to satisfy a browser's same-origin rules.
 *
 * It is still Chromium underneath, and Chromium's rules apply: a request setting
 * a **forbidden header name** — `Referer` above all — is refused before it is
 * sent, with `net::ERR_BLOCKED_BY_CLIENT` and no status. See `fetchDdbDirect`;
 * that one header cost an entire debugging session.
 *
 * ## Why `requestUrl` is injected rather than imported
 *
 * Importing it from `obsidian` would put this module in the `ui` Vitest project
 * and behind a stub. Injected, the whole of it — including the test that asserts
 * **no request ever carries a `Referer`** — runs in plain Node against a
 * recording fake. That test is the guard on the most expensive bug this code has
 * had, so it had better not be the part that needs Obsidian running.
 *
 * **This is the one D&D Beyond address the SRD edition may carry**
 * (MYDND-295): `check-srd-bundle.mjs` and `preflight-srd.mjs` allow exactly it,
 * and the public README discloses it.
 */
export const DDB_CHARACTER_SERVICE = 'https://character-service.dndbeyond.com/character/v5/character'

/**
 * A failure that never left this machine.
 *
 * Carried as a distinct type rather than a flag on `Error` because the callers
 * branch on it: the full edition reaches for a relay, the SRD edition points at
 * the file import.
 */
export class DdbBlockedError extends Error {
  readonly blocked = true
}

/** The numeric character id out of a URL, or a bare id. */
export function extractDdbId(input: unknown): string | null {
  const s = String(input || '').trim()
  if (/^\d+$/.test(s)) return s
  const m = s.match(/dndbeyond\.com\/characters\/(\d+)/i)
  return m?.[1] || null
}

/**
 * Whether a failure means the request never left this machine.
 *
 * These are local-stack refusals, not answers from D&D Beyond: there is no HTTP
 * status attached to any of them. Only this class of failure is worth retrying
 * through a relay — an HTTP 403 would be refused identically on the way out.
 */
export function isLocallyBlocked(detail: unknown): boolean {
  return /BLOCKED_BY_CLIENT|ERR_FAILED|ERR_NETWORK|ERR_PROXY|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION/i.test(
    String(detail),
  )
}

/** Turns a non-200 into the most useful sentence available. */
export function describeDdbStatus(status: number): string {
  if (status === 401 || status === 403 || status === 404) {
    return 'D&D Beyond refused that character. Set the sheet to public (Share → Anyone with the link) and try again.'
  }
  return `D&D Beyond returned ${status}.`
}

export const messageOf = (err: unknown): string =>
  err instanceof Error && err.message ? err.message : String(err)

/**
 * Straight at D&D Beyond. Throws a `DdbBlockedError` when it never got out.
 *
 * **Never set a `Referer` header here.** Doing so made every import fail with
 * `net::ERR_BLOCKED_BY_CLIENT`: `Referer` is a forbidden header name in the
 * Fetch spec, and Chromium's network stack — which is what Obsidian's
 * `requestUrl` goes through — refuses the request rather than sending it. No
 * reply comes back, so there is no status, which is why it looked for a long
 * time like a proxy, a DNS filter or an antivirus product. It was none of those;
 * `curl` to the identical URL always worked precisely because curl is not
 * Chromium.
 *
 * The header was inherited from a server-side importer along with the belief
 * that "DDB's service rejects requests without a plausible referer". That belief
 * is false: the service answers 200 to this URL with **no headers at all**,
 * verified three ways. So it is gone, and a test asserts it never comes back.
 *
 * The same applies to `Origin`, `Host` and `Cookie`. All are forbidden header
 * names; none may be set here.
 */
export async function fetchDdbDirect(requestUrl: RequestUrlFn, ddbId: string): Promise<DdbPayload> {
  const url = `${DDB_CHARACTER_SERVICE}/${ddbId}?includeCustomItems=true`
  let res: RequestUrlResult
  try {
    res = await requestUrl({
      url,
      method: 'GET',
      headers: { Accept: 'application/json' },
      throw: false,
    })
  } catch (err) {
    const detail = messageOf(err)
    console.error('[my-dnd-vault] the direct request never completed', { url, detail })
    if (isLocallyBlocked(detail)) throw new DdbBlockedError(detail, { cause: err })
    throw new Error(detail, { cause: err })
  }

  if (res.status !== 200) throw new Error(describeDdbStatus(res.status))
  return unwrapDdbEnvelope(res.json, 'D&D Beyond')
}

/**
 * The review's fetch where there is no relay and no diagnostic: the SRD
 * edition (MYDND-295). A request stopped on this machine is said as such, and
 * the way round it is the file import, which needs no network at all.
 */
export async function fetchDdbPayload(requestUrl: RequestUrlFn, ddbId: string): Promise<DdbPayload> {
  try {
    return await fetchDdbDirect(requestUrl, ddbId)
  } catch (err) {
    if (!(err instanceof DdbBlockedError)) throw err
    throw new Error(
      `Stopped before it left Obsidian (${err.message}), so there is no reply from D&D Beyond to report. ` +
        'Something on this machine is blocking the request. Pick the character’s saved file instead.',
      { cause: err },
    )
  }
}
