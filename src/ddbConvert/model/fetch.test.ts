import { describe, expect, it } from 'vitest'

import {
  DDB_CHARACTER_SERVICE,
  DdbBlockedError,
  describeDdbStatus,
  extractDdbId,
  fetchDdbDirect,
  fetchDdbPayload,
  isLocallyBlocked,
} from './fetch'
import type { RequestUrlFn, RequestUrlOptions } from '../../platform/model/http'

/**
 * The direct fetch, public since MYDND-295 so the SRD edition imports by a
 * link. Ported from `obsidian-vault-characters` (MYDND-7); the relay and the
 * probes are tested in `ddbImport/model/fetch.test.ts`.
 *
 * `requestUrl` is injected here rather than imported from `obsidian`, which is
 * what lets all of this run in plain Node — including the `Referer` guard,
 * which is the single most valuable test in the repository and had better not
 * be the one that needs Obsidian running.
 */

/** Records every request made, and answers from a script. */
function recorder(
  script: (options: RequestUrlOptions, n: number) => { status: number; json?: unknown } | Error,
): { fn: RequestUrlFn; calls: RequestUrlOptions[] } {
  const calls: RequestUrlOptions[] = []
  const fn: RequestUrlFn = async options => {
    calls.push(options)
    const answer = script(options, calls.length - 1)
    if (answer instanceof Error) throw answer
    return answer
  }
  return { fn, calls }
}

const character = { name: 'Gibbs', id: 147438576 }

describe('extractDdbId', () => {
  // The link a player pastes, on the site's own host. Not a request: the plugin
  // takes the number out of it and asks the character service.
  const link = (rest: string): string => `https://www.dndbeyond.com/characters/${rest}`

  it('takes the id out of a character URL', () => {
    expect(extractDdbId(link('131273842'))).toBe('131273842')
  })

  it('accepts a bare id', () => {
    expect(extractDdbId('131273842')).toBe('131273842')
  })

  it('ignores a trailing path', () => {
    expect(extractDdbId(link('42/builder'))).toBe('42')
  })

  it('is null for anything else', () => {
    expect(extractDdbId('not a character')).toBeNull()
    expect(extractDdbId('')).toBeNull()
    expect(extractDdbId(null)).toBeNull()
    expect(extractDdbId('https://example.com/characters/7')).toBeNull()
  })
})

describe('isLocallyBlocked', () => {
  it('recognises a request that never left this machine', () => {
    // No HTTP status is attached to any of these. They are the only class of
    // failure worth retrying through a relay.
    for (const detail of [
      'net::ERR_BLOCKED_BY_CLIENT',
      'net::ERR_NAME_NOT_RESOLVED',
      'net::ERR_CONNECTION_REFUSED',
      'net::ERR_PROXY_CONNECTION_FAILED',
      'net::ERR_FAILED',
      'net::ERR_NETWORK_CHANGED',
    ]) {
      expect(isLocallyBlocked(detail)).toBe(true)
    }
  })

  it('does not treat an answer from D&D Beyond as a block', () => {
    // A 403 would be refused identically on the way out, so a relay cannot help.
    expect(isLocallyBlocked('403 Forbidden')).toBe(false)
    expect(isLocallyBlocked('Request timed out')).toBe(false)
    expect(isLocallyBlocked('')).toBe(false)
    expect(isLocallyBlocked(undefined)).toBe(false)
  })
})

describe('describeDdbStatus', () => {
  it('explains how to share the sheet for the three refusals that mean that', () => {
    for (const status of [401, 403, 404]) {
      expect(describeDdbStatus(status)).toContain('Anyone with the link')
    }
  })

  it('just reports any other status, and does not blame sharing', () => {
    expect(describeDdbStatus(500)).toBe('D&D Beyond returned 500.')
    expect(describeDdbStatus(500)).not.toContain('Anyone with the link')
  })
})

/**
 * **The guard on the most expensive bug this code has had.**
 *
 * Setting a `Referer` header made every import fail with
 * `net::ERR_BLOCKED_BY_CLIENT`: it is a forbidden header name, and Chromium —
 * which is what Obsidian's `requestUrl` goes through — refuses the request
 * rather than sending it. No reply comes back, so there is no status, which is
 * why it read for a long time like a proxy, a DNS filter or an antivirus
 * product. It was none of those. `curl` to the identical URL always worked,
 * precisely because curl is not Chromium.
 */
describe('the forbidden-header rule', () => {
  const FORBIDDEN = ['referer', 'origin', 'host', 'cookie']

  it('never sends a Referer on the import request', async () => {
    const { fn, calls } = recorder(() => ({ status: 200, json: character }))
    await fetchDdbDirect(fn, '1')

    const sent = Object.keys(calls[0].headers ?? {}).map(h => h.toLowerCase())
    for (const header of FORBIDDEN) expect(sent).not.toContain(header)
  })

  it('asks for JSON and nothing else', async () => {
    const { fn, calls } = recorder(() => ({ status: 200, json: character }))
    await fetchDdbDirect(fn, '1')
    expect(calls[0].headers).toEqual({ Accept: 'application/json' })
  })
})

describe('fetchDdbDirect', () => {
  it('calls the character service once, with the custom-items query', async () => {
    const { fn, calls } = recorder(() => ({ status: 200, json: { data: character } }))
    const payload = await fetchDdbDirect(fn, '147438576')

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(
      'https://character-service.dndbeyond.com/character/v5/character/147438576?includeCustomItems=true',
    )
    expect(calls[0].method).toBe('GET')
    // `throw: false` so a non-200 comes back as a response to be described,
    // rather than an exception that loses the status.
    expect(calls[0].throw).toBe(false)
    expect(payload.name).toBe('Gibbs')
  })

  it('describes a non-200 rather than passing the number through raw', async () => {
    const { fn } = recorder(() => ({ status: 403 }))
    await expect(fetchDdbDirect(fn, '1')).rejects.toThrow(/Anyone with the link/)
  })

  it('raises a DdbBlockedError when the request never got out', async () => {
    const { fn } = recorder(() => new Error('net::ERR_BLOCKED_BY_CLIENT'))
    await expect(fetchDdbDirect(fn, '1')).rejects.toBeInstanceOf(DdbBlockedError)
  })

  it('does not call a refusal a block', async () => {
    const { fn } = recorder(() => new Error('Something else went wrong'))
    const err = await fetchDdbDirect(fn, '1').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(Error)
    expect(err).not.toBeInstanceOf(DdbBlockedError)
  })
})

/** The SRD edition's fetch: no relay to fall back on, no diagnostic to run. */
describe('fetchDdbPayload', () => {
  it('makes the one request, to the character service', async () => {
    const { fn, calls } = recorder(() => ({ status: 200, json: { data: character } }))
    expect((await fetchDdbPayload(fn, '1')).name).toBe('Gibbs')
    expect(calls).toHaveLength(1)
    expect(calls[0].url.startsWith(`${DDB_CHARACTER_SERVICE}/1?`)).toBe(true)
  })

  it('says a local block never left, and points at the saved file', async () => {
    const { fn, calls } = recorder(() => new Error('net::ERR_BLOCKED_BY_CLIENT'))
    const err = await fetchDdbPayload(fn, '1').catch((e: unknown) => e)
    const message = err instanceof Error ? err.message : String(err)
    expect(calls).toHaveLength(1)
    expect(message).toContain('ERR_BLOCKED_BY_CLIENT')
    expect(message).toContain('Stopped before it left Obsidian')
    expect(message).toContain('saved file')
    // Neither exists in the SRD edition.
    expect(message).not.toMatch(/relay|Diagnose/i)
  })

  it('passes a refusal through as D&D Beyond said it', async () => {
    const { fn } = recorder(() => ({ status: 403 }))
    await expect(fetchDdbPayload(fn, '1')).rejects.toThrow(/Anyone with the link/)
  })
})
