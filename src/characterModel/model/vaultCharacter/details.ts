import { parseNote, serialiseNote } from '../../../platform'

/**
 * A character's optional details (MYDND-216): who they are rather than what
 * they chose. **Not in the `vault-character` fence** — they are not choices,
 * and baking ignores them — but in the note itself, where a player reads and
 * edits them in Obsidian:
 *
 * - **the short ones as flat frontmatter** (`alignment`, `faith`, `hair`…), so a
 *   Base can list and filter the party by them (the two tiers, ARCHITECTURE.md);
 * - **the long ones as headings in the body** (`## Backstory`, `## Bonds`…),
 *   inside one marked region placed right after the managed charsheet, never at
 *   the end of the note: the inventory and vitals fences are appended at the
 *   end, and a heading's text read "to the next heading" would swallow one, and
 *   a rewrite of it delete one.
 *
 * The builder carries them on the json as `characterDetails`, a key that is
 * **never written to the fence** (`NOT_PERSISTED_KEYS`): the store writes them
 * here, in the same one file write as the fences (ADR 0003), and reads them
 * back when the builder opens the note for an edit. An absent
 * `characterDetails` leaves the note's details alone.
 */

export const DETAILS_KEY = 'characterDetails'

export const SHORT_DETAILS = [
  { key: 'alignment', label: 'Alignment' },
  { key: 'faith', label: 'Faith' },
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'hair', label: 'Hair' },
  { key: 'skin', label: 'Skin' },
  { key: 'eyes', label: 'Eyes' },
  { key: 'height', label: 'Height' },
  { key: 'weight', label: 'Weight' },
  { key: 'age', label: 'Age' },
  { key: 'gender', label: 'Gender' },
] as const

export const LONG_DETAILS = [
  { key: 'personalityTraits', label: 'Personality traits' },
  { key: 'ideals', label: 'Ideals' },
  { key: 'bonds', label: 'Bonds' },
  { key: 'flaws', label: 'Flaws' },
  { key: 'organizations', label: 'Organizations' },
  { key: 'allies', label: 'Allies' },
  { key: 'enemies', label: 'Enemies' },
  { key: 'backstory', label: 'Backstory' },
  { key: 'other', label: 'Other' },
] as const

export type DetailKey = (typeof SHORT_DETAILS)[number]['key'] | (typeof LONG_DETAILS)[number]['key']

export type CharacterDetails = Partial<Record<DetailKey, string>>

export const DETAILS_BEGIN = '<!-- vault-characters:details — the builder writes these headings; edit them freely -->'
export const DETAILS_END = '<!-- vault-characters:details-end -->'
/** Where a new region goes: right after the managed charsheet region. */
const MANAGED_END = '<!-- vault-characters:end -->'

/** The details a note holds: its frontmatter's short ones, its region's headings. */
export function readCharacterDetails(markdown: string): CharacterDetails {
  const { frontmatter, body } = parseNote(markdown)
  const out: CharacterDetails = {}
  for (const { key } of SHORT_DETAILS) {
    const v = frontmatter[key]
    if (typeof v === 'string' || typeof v === 'number') {
      const text = String(v).trim()
      if (text) out[key] = text
    }
  }
  const region = regionOf(body)
  if (region) {
    const inner = body.slice(region.start + DETAILS_BEGIN.length, region.end)
    for (const { key, label } of LONG_DETAILS) {
      const text = headingText(inner, label)
      if (text) out[key] = text
    }
  }
  return out
}

/**
 * The note with `details` written: each short one set in the frontmatter or,
 * cleared, removed from it; the long ones as the region's headings, replaced
 * where the region is and placed after the charsheet where it is not. A region
 * with nothing to hold is removed. Pure: a `Vault.process` transform.
 *
 * @throws when the frontmatter cannot be read, as every writer does (ADR 0003).
 */
export function writeCharacterDetails(markdown: string, details: CharacterDetails): string {
  const { frontmatter, body } = parseNote(markdown)
  const fm: Record<string, unknown> = { ...frontmatter }
  for (const { key } of SHORT_DETAILS) {
    const text = details[key]?.trim()
    if (text) fm[key] = text
    else delete fm[key]
  }

  const sections = LONG_DETAILS.flatMap(({ key, label }) => {
    const text = details[key]?.trim()
    return text ? [`## ${label}\n\n${text}`] : []
  })
  const region = sections.length > 0 ? [DETAILS_BEGIN, ...sections, DETAILS_END].join('\n\n') : ''

  let next = body
  const at = regionOf(body)
  if (at) {
    const before = body.slice(0, at.start).replace(/\n+$/, '')
    const after = body.slice(at.end + DETAILS_END.length).replace(/^\n+/, '')
    next = region ? `${before}\n\n${region}\n\n${after}` : `${before}\n\n${after}`
  } else if (region) {
    const managed = body.indexOf(MANAGED_END)
    if (managed >= 0) {
      const cut = managed + MANAGED_END.length
      next = `${body.slice(0, cut)}\n\n${region}\n\n${body.slice(cut).replace(/^\n+/, '')}`
    } else {
      next = `${body.replace(/\n+$/, '')}\n\n${region}\n`
    }
  }
  return serialiseNote({ frontmatter: fm, body: next })
}

function regionOf(body: string): { start: number; end: number } | null {
  const start = body.indexOf(DETAILS_BEGIN)
  const end = body.indexOf(DETAILS_END)
  return start >= 0 && end > start ? { start, end } : null
}

/** A `## label` heading's text, up to the next heading of the same level or above. */
function headingText(region: string, label: string): string {
  const lines = region.split('\n')
  const at = lines.findIndex(l => l.trim().toLowerCase() === `## ${label.toLowerCase()}`)
  if (at < 0) return ''
  const rest = lines.slice(at + 1)
  const stop = rest.findIndex(l => /^#{1,2}\s/.test(l))
  return (stop >= 0 ? rest.slice(0, stop) : rest).join('\n').trim()
}
