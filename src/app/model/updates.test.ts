import { describe, expect, it } from 'vitest'

import type { RequestUrlOptions, RequestUrlResult } from '../../platform'
import {
  PUBLISHED_MANIFEST_URL,
  compareVersions,
  crossesFeatureRelease,
  parseVersion,
  pluginPageUrl,
  readPublishedVersion,
  releasePageUrl,
  versionToAnnounce,
} from './updates'

const ID = 'fifth-edition-vault'
const manifest = (over: Record<string, unknown> = {}) => JSON.stringify({ id: ID, version: '0.0.6', minAppVersion: '1.11.4', ...over })

/** A recording fake of `requestUrl`: one canned answer, every call kept. */
function fake(answer: RequestUrlResult | Error) {
  const calls: RequestUrlOptions[] = []
  const request = async (options: RequestUrlOptions): Promise<RequestUrlResult> => {
    calls.push(options)
    if (answer instanceof Error) throw answer
    return answer
  }
  return { request, calls }
}

const check = { id: ID, apiSupports: () => true }

describe('parseVersion', () => {
  it('reads x.y.z and nothing else', () => {
    expect(parseVersion('0.0.4')).toEqual([0, 0, 4])
    expect(parseVersion('12.3.40')).toEqual([12, 3, 40])
    for (const bad of ['v0.0.4', '0.0', '0.0.4-beta.1', '0.0.4+1', '01.0.0', ' 0.0.4', '', 4, null]) {
      expect(parseVersion(bad), String(bad)).toBeNull()
    }
  })
})

describe('compareVersions', () => {
  it('compares numerically, not as text', () => {
    expect(compareVersions('0.0.10', '0.0.9')).toBeGreaterThan(0)
    expect(compareVersions('0.1.0', '0.0.99')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('0.0.1', '0.0.2')).toBeLessThan(0)
  })

  it('sorts an unparseable version oldest', () => {
    expect(compareVersions('nope', '0.0.1')).toBeLessThan(0)
  })
})

describe('crossesFeatureRelease', () => {
  it('is true when the major or minor number moves up', () => {
    expect(crossesFeatureRelease('0.0.4', '0.1.0')).toBe(true)
    expect(crossesFeatureRelease('0.9.3', '1.0.0')).toBe(true)
    expect(crossesFeatureRelease('0.1.0', '0.2.5')).toBe(true)
  })

  it('is false for patches, the same version, a downgrade or garbage', () => {
    expect(crossesFeatureRelease('0.0.4', '0.0.5')).toBe(false)
    expect(crossesFeatureRelease('0.1.0', '0.1.0')).toBe(false)
    expect(crossesFeatureRelease('0.2.0', '0.1.0')).toBe(false)
    expect(crossesFeatureRelease('x', '0.1.0')).toBe(false)
  })
})

describe('readPublishedVersion', () => {
  it("asks for main's manifest.json once, without throwing on a status", async () => {
    const { request, calls } = fake({ status: 200, text: manifest() })
    await expect(readPublishedVersion(request, check)).resolves.toBe('0.0.6')
    expect(calls).toEqual([{ url: PUBLISHED_MANIFEST_URL, method: 'GET', throw: false }])
    expect(PUBLISHED_MANIFEST_URL).toBe('https://raw.githubusercontent.com/gabrielegarulli/fifth-edition-vault/main/manifest.json')
  })

  it('sends no header at all: nothing about the user or the vault', async () => {
    const { request, calls } = fake({ status: 200, text: manifest() })
    await readPublishedVersion(request, check)
    expect(calls[0].headers).toBeUndefined()
    expect(calls[0].body).toBeUndefined()
  })

  it.each([
    ['a 404', { status: 404, text: 'Not Found' }],
    ['a 500', { status: 500, text: manifest() }],
    ['no body', { status: 200 }],
    ['a body that is not JSON', { status: 200, text: '<html>' }],
    ['JSON that is not an object', { status: 200, text: '"0.0.6"' }],
    ['another plugin', { status: 200, text: manifest({ id: 'atlas-vtt' }) }],
    ['a pre-release', { status: 200, text: manifest({ version: '0.0.6-beta.1' }) }],
    ['a tag with a v', { status: 200, text: manifest({ version: 'v0.0.6' }) }],
    ['no minAppVersion', { status: 200, text: manifest({ minAppVersion: undefined }) }],
    ['a body over 64 KB', { status: 200, text: manifest({ padding: 'x'.repeat(64 * 1024) }) }],
  ])('answers null for %s', async (_, answer) => {
    await expect(readPublishedVersion(fake(answer as RequestUrlResult).request, check)).resolves.toBeNull()
  })

  it('answers null when the request throws (offline, DNS, TLS)', async () => {
    await expect(readPublishedVersion(fake(new Error('net::ERR_INTERNET_DISCONNECTED')).request, check)).resolves.toBeNull()
  })

  it('answers null for a release this Obsidian cannot run', async () => {
    const asked: string[] = []
    const apiSupports = (v: string) => (asked.push(v), false)
    const { request } = fake({ status: 200, text: manifest({ minAppVersion: '9.0.0' }) })
    await expect(readPublishedVersion(request, { id: ID, apiSupports })).resolves.toBeNull()
    expect(asked).toEqual(['9.0.0'])
  })
})

describe('versionToAnnounce', () => {
  it('announces a newer release', () => {
    expect(versionToAnnounce('0.0.6', '0.0.5', null)).toBe('0.0.6')
  })

  it('stays quiet with no news, the same version or an older one', () => {
    expect(versionToAnnounce(null, '0.0.5', null)).toBeNull()
    expect(versionToAnnounce('0.0.5', '0.0.5', null)).toBeNull()
    expect(versionToAnnounce('0.0.4', '0.0.5', null)).toBeNull()
  })

  it('never announces a release twice, and announces the next one', () => {
    expect(versionToAnnounce('0.0.6', '0.0.5', '0.0.6')).toBeNull()
    expect(versionToAnnounce('0.0.7', '0.0.5', '0.0.6')).toBe('0.0.7')
  })
})

describe('the links', () => {
  it("open the plugin's page in Obsidian and the release on GitHub", () => {
    expect(pluginPageUrl(ID)).toBe('obsidian://show-plugin?id=fifth-edition-vault')
    expect(releasePageUrl('0.0.6')).toBe('https://github.com/gabrielegarulli/fifth-edition-vault/releases/tag/0.0.6')
  })
})
