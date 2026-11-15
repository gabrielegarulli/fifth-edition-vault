/**
 * Fifth Edition Vault's release notes, as pure logic (MYDND-215): the format
 * of a `changelog/<version>.md`, its parse, and when What's new opens.
 *
 * A release's notes are one file at the repository root, added by the release
 * commit, bundled into `main.js` (`releaseNotes.ts`) and exported to the public
 * repository beside the source. The format is deliberately small, so the modal
 * can draw it with no Markdown renderer and a test can hold every file to it:
 *
 * ```md
 * ---
 * version: 0.0.4
 * date: 2026-11-13
 * title: Your sheet on an Atlas card
 * ---
 *
 * ## New
 *
 * **A group, in bold**
 * - a bullet
 *
 * ## Fixed
 *
 * - a bullet straight under the heading
 * ```
 *
 * Only `##` headings, bold group lines and `- ` bullets, and blank lines
 * between them. Anything else is a problem `parseRelease` names.
 */
import { compareVersions, crossesFeatureRelease, isNewer, parseVersion } from './updates'

export interface ReleaseGroup {
  /** The bold line above the bullets, or `null` for bullets straight under the heading. */
  title: string | null
  items: string[]
}

export interface ReleaseSection {
  heading: string
  groups: ReleaseGroup[]
}

export interface ReleaseNotes {
  version: string
  /** `YYYY-MM-DD`. */
  date: string
  title: string
  sections: ReleaseSection[]
}

export interface ParsedRelease {
  release: ReleaseNotes | null
  problems: string[]
}

const FRONTMATTER_KEYS = ['version', 'date', 'title']

/**
 * One file's notes, and every way it breaks the format. `file` is its path,
 * whose name must be the version. A file with any problem has no `release`:
 * the plugin skips it rather than draw half of it, and the test fails on it.
 */
export function parseRelease(text: string, file: string): ParsedRelease {
  const problems: string[] = []
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  if (lines[0] !== '---') return { release: null, problems: [`${file}: does not open with frontmatter`] }
  const close = lines.indexOf('---', 1)
  if (close < 0) return { release: null, problems: [`${file}: its frontmatter never closes`] }

  const meta = new Map<string, string>()
  for (const [i, line] of lines.slice(1, close).entries()) {
    const m = /^([a-z]+):\s*(.*?)\s*$/.exec(line)
    if (!m) {
      problems.push(`${file}:${i + 2}: not a "key: value" line`)
      continue
    }
    const value = m[2].replace(/^"(.*)"$/, '$1')
    if (!FRONTMATTER_KEYS.includes(m[1])) problems.push(`${file}:${i + 2}: unknown key "${m[1]}"`)
    else if (meta.has(m[1])) problems.push(`${file}:${i + 2}: "${m[1]}" appears twice`)
    meta.set(m[1], value)
  }
  for (const key of FRONTMATTER_KEYS) if (!meta.get(key)) problems.push(`${file}: no ${key}`)
  const version = meta.get('version') ?? ''
  const date = meta.get('date') ?? ''
  if (version && !parseVersion(version)) problems.push(`${file}: version "${version}" is not x.y.z`)
  const name = file.replaceAll('\\', '/').split('/').pop()?.replace(/\.md$/, '')
  if (version && name !== version) problems.push(`${file}: is named ${name}, but its version is ${version}`)
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) problems.push(`${file}: date "${date}" is not YYYY-MM-DD`)

  const sections: ReleaseSection[] = []
  let group: ReleaseGroup | null = null
  for (let i = close + 1; i < lines.length; i++) {
    const line = lines[i].trimEnd()
    const at = `${file}:${i + 1}`
    const section = sections.at(-1)
    if (line === '') continue
    let m: RegExpExecArray | null
    if ((m = /^## (\S.*)$/.exec(line))) {
      sections.push({ heading: m[1], groups: [] })
      group = null
    } else if ((m = /^\*\*(\S(?:.*\S)?)\*\*$/.exec(line))) {
      if (!section) problems.push(`${at}: a group before any ## heading`)
      else section.groups.push((group = { title: m[1], items: [] }))
    } else if ((m = /^- (\S.*)$/.exec(line))) {
      if (!section) problems.push(`${at}: a bullet before any ## heading`)
      else {
        if (!group) section.groups.push((group = { title: null, items: [] }))
        group.items.push(m[1])
      }
    } else {
      problems.push(`${at}: only "## heading", "**group**" and "- bullet" lines are allowed`)
    }
  }
  if (sections.length === 0) problems.push(`${file}: no ## heading`)
  for (const s of sections) {
    if (s.groups.length === 0) problems.push(`${file}: "## ${s.heading}" has no bullets`)
    for (const g of s.groups) if (g.items.length === 0) problems.push(`${file}: "**${g.title ?? ''}**" has no bullets`)
  }

  if (problems.length) return { release: null, problems }
  return { release: { version, date, title: meta.get('title') ?? '', sections }, problems }
}

/** Every file's notes that parse, newest first. */
export function readReleases(files: Record<string, string>): ReleaseNotes[] {
  return Object.entries(files)
    .flatMap(([file, text]) => {
      const { release } = parseRelease(text, file)
      return release ? [release] : []
    })
    .sort((a, b) => compareVersions(b.version, a.version))
}

export interface ChangelogPrefs {
  /** **Show changelog after updates**. */
  showAfterUpdate: boolean
  /** **Feature updates only**: skip an update that crosses only patch releases. */
  featureOnly: boolean
}

export interface ChangelogDecision {
  /** Whether What's new opens now. */
  open: boolean
  /** The version to record as acknowledged, or `null` to leave the record alone. */
  acknowledge: string | null
}

/**
 * What happens on start, given the last version acknowledged on this device.
 *
 * - **A fresh install** (nothing acknowledged) records the installed version
 *   and shows nothing: What's new is about what changed, and nothing has.
 * - **The same version, or an older one** (a downgrade) changes nothing.
 * - **An update** records the installed version, and opens only when the
 *   setting is on, the update crosses a feature release if **Feature updates
 *   only** asks for one, and there are notes newer than what was acknowledged.
 */
export function changelogOnStart(
  acknowledged: string | null,
  installed: string,
  prefs: ChangelogPrefs,
  releases: readonly ReleaseNotes[],
): ChangelogDecision {
  if (!parseVersion(installed)) return { open: false, acknowledge: null }
  if (!acknowledged || !parseVersion(acknowledged)) return { open: false, acknowledge: installed }
  if (!isNewer(installed, acknowledged)) return { open: false, acknowledge: null }
  const open =
    prefs.showAfterUpdate &&
    (!prefs.featureOnly || crossesFeatureRelease(acknowledged, installed)) &&
    releases.some(r => isNewer(r.version, acknowledged) && !isNewer(r.version, installed))
  return { open, acknowledge: installed }
}

/** The releases a What's new opened by an update marks NEW: after `acknowledged`, up to `installed`. */
export function unseenVersions(releases: readonly ReleaseNotes[], acknowledged: string | null, installed: string): Set<string> {
  if (!acknowledged) return new Set()
  return new Set(releases.filter(r => isNewer(r.version, acknowledged) && !isNewer(r.version, installed)).map(r => r.version))
}
