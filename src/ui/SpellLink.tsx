import { useMemo } from 'react'

import { useOptionalContent } from '../ContentContext'
import { nameKey } from '../content/names'
import type { SpellRow } from '../content/spells'
import { useCatalogRows } from '../hooks/useVaultGeneration'
import { openSpellWindow } from '../obsidian/spellWindow'
import { openNote, useObsidian } from '../ObsidianContext'
import { useSpellHover } from './SpellHover'

/**
 * A spell name that opens the spell's note in `spells/` (MYDND-36).
 *
 * ## Resolved through the spell catalog, not through Obsidian's link resolver
 *
 * `[[Magic Missile]]` would not find `spells/magic-missile.md`: Obsidian
 * resolves a link by *filename*, and the exporter names files by slug while the
 * name lives in `title`. The catalog matches on the title, which is what a
 * D&D Beyond payload and a builder pick both carry — and a Vault character's
 * pick also carries the slug, which is tried first and is exact.
 *
 * A name with no note is plain text with a reason on hover, rather than a link
 * that opens nothing: an unexported book and a misspelling look identical from
 * here, and both are fixed somewhere else.
 *
 * ## Ctrl+click opens the spell, not the note (MYDND-60)
 *
 * A plain click hands over the note, properties block and all. Ctrl+click (Cmd
 * on macOS) opens a window showing only the spell — the same card `/spells`
 * draws — for reading at the table. See `obsidian/spellWindow.ts`.
 *
 * ## Ctrl+hover previews it (MYDND-63)
 *
 * The same card again, in Obsidian's hover popover — see `SpellHover.tsx`.
 */

export interface SpellIndex {
  find(name: string, id?: string | null): SpellRow | null
}

/**
 * Every spell, indexed by slug and by lowercased title — rebuilt when the vault
 * changes, never per render. `null` where no content layer is provided, which
 * is how a sheet drawn without one falls back to plain names.
 */
export function useSpellIndex(): SpellIndex | null {
  const content = useOptionalContent()
  const rows = useCatalogRows(() => (content ? content.spells.list() : []))
  return useMemo(() => {
    if (!content) return null
    const byId = new Map<string, SpellRow>()
    const byName = new Map<string, SpellRow>()
    for (const row of rows) {
      byId.set(row.id, row)
      const key = nameKey(row.name)
      // First wins: `list()` is ordered by level then name, so a duplicate
      // title resolves the same way every time.
      if (!byName.has(key)) byName.set(key, row)
    }
    return {
      find: (name, id) => (id ? byId.get(id) : undefined) ?? byName.get(nameKey(name)) ?? null,
    }
  }, [content, rows])
}

export function SpellLink({ name, row }: { name: string; row: SpellRow | null }) {
  const app = useObsidian()
  const content = useOptionalContent()
  const hover = useSpellHover(row)
  if (!row) {
    return (
      <span className="text-smaller text-normal" title={`No note in ${content?.ruleFolder('spells') ?? 'spells'}/ is titled "${name}"`}>
        {name}
      </span>
    )
  }
  return (
    <>
      <button
        type="button"
        // `.note-link`: it opens a note, so it reads as a link, not as a roll (MYDND-44).
        className="note-link"
        title={`Open ${row.path} · Ctrl+hover: preview · Ctrl+click: in a window`}
        onClick={e => {
          if (e.ctrlKey || e.metaKey) openSpellWindow(app, { id: row.id, name: row.name })
          else openNote(app, row.path)
        }}
        {...hover.handlers}
      >
        {name}
      </button>
      {hover.popover}
    </>
  )
}
