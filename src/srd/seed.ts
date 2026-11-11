import { parse } from 'yaml'

import { isRuleFolderKey, normaliseFolder, resolveRuleFolder, type NoteFoldersSettings, type RuleFolderKey } from '../content/folders'
import type { StateVault } from '../state/vault'

/**
 * **The SRD edition writes its own notes into the vault** (MYDND-185).
 *
 * Obsidian installs `main.js`, `styles.css` and `manifest.json` from a plugin
 * and nothing else (ADR 0001, Decision 2), and the edition reaches no server
 * (MYDND-133). So the 1,441 SRD 5.2.1 notes and 12 bases ride in the bundle
 * (`scripts/srd-pack.mjs`), and this writes them where the settings put each
 * folder (MYDND-184).
 *
 * No `obsidian` import: it is handed a `StateVault`, so it is tested in plain
 * Node like the rest of the write layer, and each file is one `write`.
 *
 * **A note the user edited is never overwritten.** Every exported note carries
 * `export_hash`, the hash of its body: the contract of the mcp-server's
 * `scripts/lib/noteGuard.ts`, ported to the Web Crypto API. Only the body is
 * guarded, as there: Obsidian's Properties UI rewrites frontmatter just by
 * having the vault open.
 *
 * | at the target path                           | outcome     |
 * | -------------------------------------------- | ----------- |
 * | nothing                                      | `created`   |
 * | a note with no `export_hash`: a person's     | `preserved` |
 * | a body that no longer matches its own stamp  | `preserved` |
 * | the same body as the pack's                  | `unchanged`, not touched |
 * | an unedited note with an older body          | `updated`, frontmatter and all |
 *
 * A base carries no stamp, so a base is written only where there is none, or
 * left as it is: `unchanged` when it already says what the pack says,
 * `preserved` otherwise. Nothing is ever deleted.
 */

/** One file of the archive: its rules folder, its file name, its text. */
export interface SrdFile {
  folder: RuleFolderKey
  name: string
  text: string
}

/** What `scripts/srd-pack.mjs` packs: every note, and one base per folder. */
export interface SrdArchive {
  notes: SrdFile[]
  bases: SrdFile[]
}

export interface SeedReport {
  created: number
  updated: number
  unchanged: number
  /** Paths left alone because they are the user's, or were edited since the export. */
  preserved: string[]
}

/** A file as it will be written: where, and what. */
export interface PlannedFile {
  path: string
  text: string
  kind: 'note' | 'base'
}

// ---------------------------------------------------------------------------
// The archive
// ---------------------------------------------------------------------------

/**
 * The archive out of its base64, through `DecompressionStream('deflate-raw')`:
 * Chromium's own, so the bundle carries no `node:zlib`. Throws on anything that
 * is not the pack's shape — writing half an archive is worse than writing none.
 */
export async function inflateSrdArchive(base64: string): Promise<SrdArchive> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const parsed: unknown = JSON.parse(await new Response(stream).text())

  const files = (value: unknown): SrdFile[] => {
    if (!Array.isArray(value)) throw new Error('The SRD archive is not the shape this plugin packs.')
    return value.map(f => {
      const file = f as Partial<SrdFile>
      if (typeof file.folder !== 'string' || !isRuleFolderKey(file.folder) || typeof file.name !== 'string' || typeof file.text !== 'string') {
        throw new Error('The SRD archive is not the shape this plugin packs.')
      }
      return { folder: file.folder, name: file.name, text: file.text }
    })
  }
  const archive = parsed as Partial<SrdArchive> | null
  return { notes: files(archive?.notes), bases: files(archive?.bases) }
}

// ---------------------------------------------------------------------------
// The stamp — noteGuard.ts's, to the byte
// ---------------------------------------------------------------------------

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/
const STAMP_KEY = 'export_hash'

function split(text: string): { yaml: string | null; body: string } {
  const m = FRONTMATTER.exec(text)
  return m ? { yaml: m[1], body: text.slice(m[0].length) } : { yaml: null, body: text }
}

/** Line endings and trailing whitespace are not an edit. */
const normal = (text: string) => text.replace(/\r\n/g, '\n').trimEnd()

/** `sha256-` and the first twelve hex digits of the normalised body's SHA-256. */
export async function bodyHash(body: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normal(body)))
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
  return `sha256-${hex.slice(0, 12)}`
}

/** The note's recorded stamp, or `null` when it has none or its frontmatter cannot be read. */
function recordedStamp(yaml: string | null): string | null {
  if (yaml === null) return null
  try {
    const value = (parse(yaml) as Record<string, unknown> | null)?.[STAMP_KEY]
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}

/** The note with its stamp recomputed for the body it now has. */
async function restamp(text: string): Promise<string> {
  const { yaml, body } = split(text)
  if (yaml === null) return text
  const kept = yaml.split(/\r?\n/).filter(line => !line.startsWith(`${STAMP_KEY}:`))
  return `---\n${[...kept, `${STAMP_KEY}: ${await bodyHash(body)}`].join('\n')}\n---\n${body}`
}

// ---------------------------------------------------------------------------
// Where each file goes, and what it says there
// ---------------------------------------------------------------------------

const CLASS_LINK = /\[\[classes\//g
const IN_FOLDER = /file\.inFolder\("[^"]*"\)/g

/**
 * Every file of the archive at the path the settings give it.
 *
 * - A note goes in `resolveRuleFolder(folder)`.
 * - A base goes in the rules folder (the top of the vault when that is blank),
 *   and its `file.inFolder(...)` names the folder its notes went to.
 * - The exporter writes 879 class links as `[[classes/<slug>|…]]`, and those
 *   are the only links that name a folder. Obsidian resolves a link by the end
 *   of the path, so they still find `SRD 5.2.1/classes/<slug>` or any folder
 *   ending `/classes`. Anywhere else they are rewritten to the folder's full
 *   path, and the note is restamped: its body is now what the plugin wrote, and
 *   the next run must not call it an edit.
 */
export async function planSrdNotes(archive: SrdArchive, folders: NoteFoldersSettings): Promise<PlannedFile[]> {
  const classes = resolveRuleFolder('classes', folders)
  const rewriteClassLinks = classes !== 'classes' && !classes.endsWith('/classes')
  const out: PlannedFile[] = []

  for (const note of archive.notes) {
    let text = note.text
    if (rewriteClassLinks && text.includes('[[classes/')) {
      text = await restamp(text.replace(CLASS_LINK, () => `[[${classes}/`))
    }
    out.push({ path: `${resolveRuleFolder(note.folder, folders)}/${note.name}`, text, kind: 'note' })
  }

  const root = normaliseFolder(folders.rulesRoot)
  for (const base of archive.bases) {
    const target = JSON.stringify(resolveRuleFolder(base.folder, folders))
    out.push({
      path: root ? `${root}/${base.name}` : base.name,
      text: base.text.replace(IN_FOLDER, () => `file.inFolder(${target})`),
      kind: 'base',
    })
  }
  return out
}

type Outcome = 'created' | 'updated' | 'unchanged' | 'preserved'

/** What to do with one planned file, given what is at its path. Pure, for the tests. */
export async function decideSrdWrite(existing: string | null, file: PlannedFile): Promise<Outcome> {
  if (existing === null || existing === '') return 'created'
  if (file.kind === 'base') return normal(existing) === normal(file.text) ? 'unchanged' : 'preserved'

  const { yaml, body } = split(existing)
  const recorded = recordedStamp(yaml)
  if (recorded === null || recorded !== (await bodyHash(body))) return 'preserved'
  return normal(body) === normal(split(file.text).body) ? 'unchanged' : 'updated'
}

/**
 * Write the archive into the vault: create what is missing, update what the
 * user has not touched, and report the rest. One `write` per file created or
 * updated, and none for anything else, so a re-run that changes nothing moves
 * no file's mtime.
 *
 * The write's transform writes only over what was read. A file that changed
 * between the read and the write is left as it now is, and reported preserved.
 */
export async function seedSrdNotes(
  vault: StateVault,
  archive: SrdArchive,
  folders: NoteFoldersSettings,
  onProgress?: (done: number, total: number) => void,
): Promise<SeedReport> {
  const plan = await planSrdNotes(archive, folders)
  const report: SeedReport = { created: 0, updated: 0, unchanged: 0, preserved: [] }

  for (const [i, file] of plan.entries()) {
    const before = await vault.read(file.path)
    const outcome = await decideSrdWrite(before, file)
    if (outcome === 'created' || outcome === 'updated') {
      let raced = false
      await vault.write(file.path, current => {
        if (current === (before ?? '')) return file.text
        raced = true
        return current
      })
      if (raced) report.preserved.push(file.path)
      else report[outcome] += 1
    } else if (outcome === 'unchanged') {
      report.unchanged += 1
    } else {
      report.preserved.push(file.path)
    }
    onProgress?.(i + 1, plan.length)
  }
  return report
}

/** The report in one line, for a Notice and the settings tab. */
export function describeSeedReport(report: SeedReport): string {
  const parts = [
    `${report.created.toLocaleString()} created`,
    `${report.updated.toLocaleString()} updated`,
    `${report.unchanged.toLocaleString()} unchanged`,
    `${report.preserved.length.toLocaleString()} left alone because they were edited or are yours`,
  ]
  return `SRD 5.2.1 notes: ${parts.join(', ')}.`
}
