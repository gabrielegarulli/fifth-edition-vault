import type { CatalogKey, NoteKind } from '../../compendium'

/**
 * The kinds of rules note a builder writes (MYDND-233), in the order the card
 * ships them: the four flat notes, then the feat, the first with effects.
 * Species, subclass and class are their own cards; a monster is Fantasy
 * Statblocks' or Atlas VTT's editor, not ours.
 */
export const BUILDER_KINDS = ['spell', 'condition', 'item', 'magic-item', 'feat'] as const satisfies readonly NoteKind[]

export type BuilderKind = (typeof BUILDER_KINDS)[number]

export const isBuilderKind = (value: string): value is BuilderKind => (BUILDER_KINDS as readonly string[]).includes(value)

/** "New homebrew spell", "a magic item": the kind as a sentence says it. */
export const BUILDER_LABEL: Readonly<Record<BuilderKind, string>> = {
  spell: 'spell',
  condition: 'condition',
  item: 'item',
  'magic-item': 'magic item',
  feat: 'feat',
}

/** The catalog each kind lists in: where the read-back and the name check look. */
export const BUILDER_CATALOG: Readonly<Record<BuilderKind, CatalogKey>> = {
  spell: 'spells',
  condition: 'conditions',
  item: 'items',
  'magic-item': 'magicItems',
  feat: 'feats',
}

/**
 * The subfolder of the homebrew folder each kind is offered first, before the
 * GM has saved one: `Homebrew/Spells`. Only a default; any subfolder lists.
 */
export const DEFAULT_SUBFOLDER: Readonly<Record<BuilderKind, string>> = {
  spell: 'Spells',
  condition: 'Conditions',
  item: 'Items',
  'magic-item': 'Magic Items',
  feat: 'Feats',
}

/** The source a builder offers before the GM has saved one (MYDND-232's convention). */
export const DEFAULT_SOURCE = 'Homebrew'

/** What `data.json` remembers per kind (`homebrewBuilders`): where it was last saved, and as which book. */
export interface BuilderDefaults {
  /** The subfolder of the homebrew folder; `''` is the homebrew folder itself. */
  folder: string
  source: string
}

export type BuilderSettings = Partial<Record<BuilderKind, BuilderDefaults>>

/** The kind's remembered defaults, or the first-time ones. */
export function builderDefaults(settings: BuilderSettings | undefined, kind: BuilderKind): BuilderDefaults {
  const saved = settings?.[kind]
  return {
    folder: typeof saved?.folder === 'string' ? saved.folder : DEFAULT_SUBFOLDER[kind],
    source: typeof saved?.source === 'string' && saved.source.trim() !== '' ? saved.source : DEFAULT_SOURCE,
  }
}

/**
 * `homebrewBuilders` as `data.json` held it, cleaned: only builder kinds, only
 * string values. A hand-edited `data.json` degrades to the defaults; it never
 * throws on load.
 */
export function mergeBuilderSettings(stored: unknown): BuilderSettings {
  const out: BuilderSettings = {}
  if (!stored || typeof stored !== 'object') return out
  for (const [kind, value] of Object.entries(stored as Record<string, unknown>)) {
    if (!isBuilderKind(kind) || !value || typeof value !== 'object') continue
    const { folder, source } = value as Record<string, unknown>
    if (typeof folder === 'string' && typeof source === 'string') out[kind] = { folder, source }
  }
  return out
}
