import type { DdbItemDefinition, DdbPayload } from '../../characterModel'
import type { ItemRow, MagicItemRow } from '../../compendium'
import type { ConversionCatalog, ConversionPlan } from '../../choices'

/**
 * What a conversion found no note for and a note builder can write
 * (MYDND-257): a feat, a spell, an item or a magic item. Class, species,
 * subclass and background have no builder, so they keep the review's picker.
 *
 * Each carries the fields D&D Beyond states plainly, for the builder's form,
 * and never the description: that is the GM's to write, and D&D Beyond's text
 * of a book the vault does not hold is not ours to copy into a note.
 */
export type NewNoteKind = 'feat' | 'spell' | 'item' | 'magic-item'

export interface NewNote {
  kind: NewNoteKind
  name: string
  /** Form fields by name, as `noteBuilderPath`'s query carries them. `name` is always one. */
  prefill: Record<string, string>
}

const spellDefinitions = (payload: DdbPayload) => {
  const lists = [
    ...(payload.classSpells ?? []).map(c => c?.spells),
    ...Object.values(payload.spells ?? {}),
  ]
  const byName = new Map<string, { school?: string | null }>()
  for (const list of lists) {
    for (const entry of list ?? []) {
      const def = entry?.definition
      if (def?.name && !byName.has(def.name.toLowerCase())) byName.set(def.name.toLowerCase(), def)
    }
  }
  return byName
}

const itemDefinitions = (payload: DdbPayload) => {
  const byName = new Map<string, DdbItemDefinition>()
  for (const item of payload.inventory ?? []) {
    const def = item?.definition
    if (def?.name && !byName.has(def.name.toLowerCase())) byName.set(def.name.toLowerCase(), def)
  }
  return byName
}

/** A positive number as a form holds it, or nothing. */
const amount = (n: number | null | undefined): Record<string, string> | null =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 ? { v: String(n) } : null

export function notesToCreate(plan: ConversionPlan, payload: DdbPayload): NewNote[] {
  const out: NewNote[] = []
  const seen = new Set<string>()
  const add = (note: NewNote) => {
    const key = newNoteKey(note.kind, note.name)
    if (!note.name || seen.has(key)) return
    seen.add(key)
    out.push(note)
  }

  for (const f of plan.feats) {
    if (!f.chosen && f.ddbName) add({ kind: 'feat', name: f.ddbName, prefill: { name: f.ddbName } })
  }

  const spells = spellDefinitions(payload)
  for (const s of plan.spells) {
    if (s.chosen || !s.ddbName) continue
    const school = spells.get(s.ddbName.toLowerCase())?.school
    add({
      kind: 'spell',
      name: s.ddbName,
      prefill: { name: s.ddbName, level: String(s.ddbLevel), ...(school ? { school } : {}) },
    })
  }

  const items = itemDefinitions(payload)
  for (const i of plan.items) {
    if (i.item || i.magicItem) continue
    const def = items.get(i.ddbName.toLowerCase())
    const weight = amount(def?.weight)
    const common = { name: i.ddbName, ...(weight ? { weight: weight.v } : {}) }
    if (i.magic) {
      add({
        kind: 'magic-item',
        name: i.ddbName,
        prefill: {
          ...common,
          ...(def?.rarity ? { rarity: def.rarity.toLowerCase() } : {}),
          ...(def?.canAttune ? { requiresAttunement: 'true' } : {}),
        },
      })
    } else {
      const cost = amount(def?.cost)
      add({ kind: 'item', name: i.ddbName, prefill: { ...common, ...(cost ? { costGp: cost.v } : {}) } })
    }
  }
  return out
}

/** The catalog each kind of new note lists in. */
export const NEW_NOTE_CATALOG = {
  feat: 'feats',
  spell: 'spells',
  item: 'items',
  'magic-item': 'magicItems',
} as const satisfies Record<NewNoteKind, keyof ConversionCatalog>

type RowOf<K extends NewNoteKind> = ConversionCatalog[(typeof NEW_NOTE_CATALOG)[K]][number]

/**
 * What became of a note the save was asked to create (MYDND-273), as the
 * plugin's host answers: written (its row, read back at its real path), not
 * written because the catalog already has the name (the row it has), or
 * refused, with the sentence why. The shape `homebrew`'s `createImportedNotes`
 * returns; restated here because the web build reaches this page and must not
 * reach `src/homebrew/` (ADR 0014), not even for a type.
 */
export type NoteOutcome = {
  [K in NewNoteKind]:
    | { kind: K; name: string; outcome: 'created'; path: string; row: RowOf<K> }
    | { kind: K; name: string; outcome: 'matched'; row: { id: string; name: string; path: string } }
    | { kind: K; name: string; outcome: 'refused'; reason: string }
}[NewNoteKind]

/** One key per note, as `notesToCreate` dedupes: the kind and the name, any case. */
export const newNoteKey = (kind: NewNoteKind, name: string): string => `${kind}:${name.trim().toLowerCase()}`

/**
 * `plan` with every feat, spell and item it lacked matched to the note the save
 * just created for it, or to the row the catalog already had under that name.
 * Only what is still unmatched is touched, so a pick the GM made stays theirs,
 * as `withNewMatches` keeps it. A name match in the catalog the plan's own
 * matching missed (a slug, a spelling) is filled here too, which a re-proposal
 * against the catalog would not do.
 */
export function withCreatedNotes(plan: ConversionPlan, outcomes: readonly NoteOutcome[], catalog: ConversionCatalog): ConversionPlan {
  const rows = new Map<string, unknown>()
  for (const o of outcomes) {
    if (o.outcome === 'created') rows.set(newNoteKey(o.kind, o.name), o.row)
    else if (o.outcome === 'matched') {
      const list = catalog[NEW_NOTE_CATALOG[o.kind]] as ReadonlyArray<{ id: string }>
      const row = list.find(r => r.id === o.row.id)
      if (row) rows.set(newNoteKey(o.kind, o.name), row)
    }
  }
  const find = <R>(kind: NewNoteKind, name: string | null): R | null =>
    name ? ((rows.get(newNoteKey(kind, name)) as R | undefined) ?? null) : null
  const fill = <M extends { ddbName: string | null; chosen: unknown; how: unknown }>(m: M, kind: NewNoteKind): M => {
    if (m.chosen) return m
    const row = find(kind, m.ddbName)
    return row ? { ...m, chosen: row, how: 'exact' } : m
  }
  return {
    ...plan,
    feats: plan.feats.map(f => fill(f, 'feat')),
    spells: plan.spells.map(s => fill(s, 'spell')),
    items: plan.items.map(i => {
      if (i.item || i.magicItem) return i
      if (i.magic) {
        const magicItem = find<MagicItemRow>('magic-item', i.ddbName)
        return magicItem ? { ...i, magicItem } : i
      }
      const item = find<ItemRow>('item', i.ddbName)
      return item ? { ...i, item } : i
    }),
  }
}
