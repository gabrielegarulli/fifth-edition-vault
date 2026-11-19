import type { RuleFolderKey } from '../../platform'

/**
 * The hand-written rules notes, one minimal and one full per kind (MYDND-232).
 *
 * `src/compendium/templates/<kind>.<depth>.md` is **the one definition of each
 * kind's shape** a person writes by hand: the tutorial teaches from these files
 * and the note builders (MYDND-233) emit them. Each is a real note, not a
 * pattern with `{{title}}` in it, so a test can read every one through its
 * catalog's own reader: `noteTemplates.test.ts` here, and the builder and the
 * sheet in `choices/model/noteTemplates.test.ts`. A template no test reads
 * drifts the first time a reader changes.
 *
 * - **minimal** is the smallest note that lists in its catalog *and* does the
 *   one thing the kind is for: a spell is on a class list, a subclass joins its
 *   class and grants a feature, a feat applies a benefit.
 * - **full** carries every key the plugin reads for that kind.
 *
 * The examples are original, so the files can ship in the SRD edition too
 * (`docs/plans/homebrew-notes.md`). They name no exported note, and the test
 * checks none carries `export_hash`, the exporter's stamp.
 *
 * "Add homebrew templates" (`homebrewTemplates.ts`, MYDND-236) is what puts
 * them in both bundles: 21 KB each, measured on 2026-11-18.
 * The glob is Vite's (and Vitest's), as `app/model/releaseNotes.ts` uses it.
 */

/** Every kind of rules note, by the bare tag that says what a note is. */
export const NOTE_KINDS = [
  'class',
  'subclass',
  'spell',
  'feat',
  'species',
  'background',
  'item',
  'magic-item',
  'monster',
  'condition',
] as const

export type NoteKind = (typeof NOTE_KINDS)[number]

/**
 * `caster` is a third subclass template (MYDND-252): a subclass that casts
 * when its class does not, as the Eldritch Knight and the Arcane Trickster
 * do. Neither is in SRD 5.2.1, so without it an SRD user had no note to copy
 * the caster keys from.
 */
export type TemplateDepth = 'minimal' | 'full' | 'caster'

/** The templates each kind has: a minimal and a full, and a caster for a subclass. */
export function templateDepths(kind: NoteKind): readonly TemplateDepth[] {
  return kind === 'subclass' ? ['minimal', 'full', 'caster'] : ['minimal', 'full']
}

/**
 * The rules folder each kind's catalog reads. The kind is also the **bare tag**
 * every exported note of it already carries, 100% across all ten folders on
 * 2026-11-17: the marker a note in the homebrew folder is admitted by (each
 * catalog's `spec.tag`, MYDND-234).
 */
export const KIND_FOLDER: Readonly<Record<NoteKind, RuleFolderKey>> = {
  class: 'classes',
  subclass: 'subclasses',
  spell: 'spells',
  feat: 'feats',
  species: 'species',
  background: 'backgrounds',
  item: 'items',
  'magic-item': 'magic-items',
  monster: 'bestiary',
  condition: 'conditions',
}

/** Path → text, as the glob found them. */
export const TEMPLATE_FILES: Record<string, string> = import.meta.glob('../templates/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** One kind's template at one depth. Throws for a pair with no file, which a test pins. */
export function noteTemplate(kind: NoteKind, depth: TemplateDepth): string {
  const text = TEMPLATE_FILES[`../templates/${kind}.${depth}.md`]
  if (typeof text !== 'string') throw new Error(`No ${depth} template for ${kind}`)
  return text
}
