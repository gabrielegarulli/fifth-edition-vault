/**
 * Fifth Edition Vault's update check, as pure logic (MYDND-215): which release
 * the public repository has published, and whether to say so.
 *
 * The one request is the default branch's `manifest.json`, the file Obsidian's
 * community directory itself reads to decide what to install. So a draft
 * release, whose manifest is not on `main` yet, cannot announce itself early.
 * The request is injected (`platform/model/http.ts`), so all of this runs under
 * Node against a recording fake. Obsidian's side (the timer, the notice, local
 * storage) is `app/obsidian/updates.ts`.
 */
import { PUBLIC_REPO, type RequestUrlFn } from '../../platform'

export { PUBLIC_REPO }

export const PUBLISHED_MANIFEST_URL = `https://raw.githubusercontent.com/${PUBLIC_REPO}/main/manifest.json`

/** A release's notes on GitHub, which the notice's What's new opens. */
export const releasePageUrl = (version: string): string => `https://github.com/${PUBLIC_REPO}/releases/tag/${version}`

/** The plugin's page in Community plugins; Obsidian does the install. */
export const pluginPageUrl = (id: string): string => `obsidian://show-plugin?id=${encodeURIComponent(id)}`

/** A manifest is about 600 bytes; anything this big is not one. */
export const MAX_MANIFEST_BYTES = 64 * 1024

/** First check after the layout is ready, then every hour. */
export const FIRST_CHECK_MS = 15_000
export const CHECK_EVERY_MS = 60 * 60 * 1000

type Version = readonly [number, number, number]

/**
 * `x.y.z` and nothing else: no `v`, no pre-release, no build. That is the only
 * shape a release of this plugin is tagged with (the release workflow refuses
 * any other), so anything else on `main` is not a release to announce.
 */
export function parseVersion(text: unknown): Version | null {
  if (typeof text !== 'string') return null
  const m = /^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})$/.exec(text)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

/** Negative, zero or positive, as `a` is older than, the same as or newer than `b`. Unparseable sorts oldest. */
export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a)
  const vb = parseVersion(b)
  if (!va || !vb) return (va ? 1 : 0) - (vb ? 1 : 0)
  for (let i = 0; i < 3; i++) if (va[i] !== vb[i]) return va[i] - vb[i]
  return 0
}

export const isNewer = (a: string, b: string): boolean => parseVersion(a) !== null && compareVersions(a, b) > 0

/**
 * Whether going from `from` to `to` crosses a feature release: the major or
 * minor number changed. **Feature updates only** skips the rest, the patch
 * releases. On 0.0.x every release is a patch, so the switch is off by default.
 */
export function crossesFeatureRelease(from: string, to: string): boolean {
  const a = parseVersion(from)
  const b = parseVersion(to)
  if (!a || !b) return false
  return compareVersions(to, from) > 0 && (a[0] !== b[0] || a[1] !== b[1])
}

export interface PublishedCheck {
  /** This plugin's id: a manifest for another plugin is not ours to announce. */
  id: string
  /** Obsidian's `requireApiVersion`: false for a release this Obsidian cannot run. */
  apiSupports: (minAppVersion: string) => boolean
}

/**
 * The version `main`'s manifest names, or `null` for anything short of a clean
 * answer: a request that failed or threw, a status other than 200, a body
 * over 64 KB or not JSON, another plugin's id, a version that is not a release,
 * or a `minAppVersion` this Obsidian does not meet. **It never throws**: a
 * check is a background courtesy, and a failure is the same as no news.
 */
export async function readPublishedVersion(request: RequestUrlFn, check: PublishedCheck): Promise<string | null> {
  try {
    const res = await request({ url: PUBLISHED_MANIFEST_URL, method: 'GET', throw: false })
    if (res.status !== 200 || typeof res.text !== 'string') return null
    if (new TextEncoder().encode(res.text).byteLength > MAX_MANIFEST_BYTES) return null
    const manifest: unknown = JSON.parse(res.text)
    if (!manifest || typeof manifest !== 'object') return null
    const { id, version, minAppVersion } = manifest as Record<string, unknown>
    if (id !== check.id || parseVersion(version) === null) return null
    if (typeof minAppVersion !== 'string' || !check.apiSupports(minAppVersion)) return null
    return version as string
  } catch {
    return null
  }
}

/**
 * The release to announce, or `null`: `published` when it is newer than what
 * is installed **and** than the newest release already acted on, so a notice
 * is never shown twice for one release.
 */
export function versionToAnnounce(published: string | null, installed: string, actedOn: string | null): string | null {
  if (!published || !isNewer(published, installed)) return null
  if (actedOn && !isNewer(published, actedOn)) return null
  return published
}
