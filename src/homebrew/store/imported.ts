import type { FeatRow, ItemRow, MagicItemRow, SpellRow } from '../../compendium'
import type { StateVault } from '../../platform'
import { formProblems, noteCompendium, readBackProblems } from '../model/check'
import { nameClash, notePath, type NamedRow } from '../model/destination'
import { buildNote } from '../model/emit'
import { prefilledForm } from '../model/forms'
import { BUILDER_CATALOG } from '../model/kinds'
import { createHomebrewNote } from './create'

/**
 * The notes a D&D Beyond conversion found none for, written on its save
 * (MYDND-273, ADR 0014's amendment): a feat, spell, item or magic item each,
 * empty shells the GM fills in from the catalog page with Edit.
 *
 * Each goes through what a builder's Save goes through, and nothing less: the
 * form a builder would open with that prefill (`prefilledForm`, the kind's
 * remembered source), `buildNote`, `formProblems` and `readBackProblems`, then
 * `createHomebrewNote`, which writes a new file or refuses. **Only into
 * `<homebrew>/Imported from D&D Beyond/`**, with no folder asked.
 *
 * A note is never half-written: one that fails a check, or finds a file at its
 * path, is refused with the sentence why, and the others go on. A name the
 * catalog already holds (`nameClash`, the builder's warning) is not written at
 * all: the conversion matches the row that is there.
 */

export type ImportedKind = 'feat' | 'spell' | 'item' | 'magic-item'

export const IMPORTED_SUBFOLDER = 'Imported from D&D Beyond'

/** What a feat shell's one benefit says until the GM writes it: the builder refuses a feat with none. */
export const PLACEHOLDER_BENEFIT = 'Imported from D&D Beyond: write this benefit.'

export interface ImportedNoteRequest {
  kind: ImportedKind
  /** Form fields by name, as `noteBuilderPath`'s query carries them; `name` is always one. */
  prefill: Record<string, string>
}

interface RowOf {
  feat: FeatRow
  spell: SpellRow
  item: ItemRow
  'magic-item': MagicItemRow
}

export type ImportedOutcome = {
  [K in ImportedKind]:
    | { kind: K; name: string; outcome: 'created'; path: string; row: RowOf[K] }
    | { kind: K; name: string; outcome: 'matched'; row: NamedRow }
    | { kind: K; name: string; outcome: 'refused'; reason: string }
}[ImportedKind]

export interface ImportedNotesInput {
  /** The homebrew folder from the top of the vault. Empty refuses every note: there is nowhere they would list. */
  homebrewFolder: string
  /** The kind's remembered source, as its builder would offer it. */
  source(kind: ImportedKind): string
  /** The kind's catalog as it stands, for the name check. */
  rows(kind: ImportedKind): readonly NamedRow[]
}

export async function createImportedNotes(
  vault: StateVault,
  input: ImportedNotesInput,
  requests: readonly ImportedNoteRequest[],
): Promise<ImportedOutcome[]> {
  const out: ImportedOutcome[] = []
  for (const request of requests) out.push(await createOne(vault, input, request))
  return out
}

async function createOne(vault: StateVault, input: ImportedNotesInput, { kind, prefill }: ImportedNoteRequest): Promise<ImportedOutcome> {
  const form = prefilledForm(kind, input.source(kind), new URLSearchParams(prefill))
  const name = form.name.trim()
  const refused = (reason: string) => ({ kind, name, outcome: 'refused', reason }) as ImportedOutcome
  if (form.kind === 'feat') form.benefits = [{ name, text: PLACEHOLDER_BENEFIT, effects: [] }]

  const built = buildNote(form)
  const clash = nameClash(input.rows(kind), built.slug, name)
  if (clash) return { kind, name, outcome: 'matched', row: clash }

  const root = input.homebrewFolder
  if (!root) return refused('No homebrew folder is set, so a note written for it would not list.')
  const problems = [...formProblems(form), ...(await readBackProblems(built))]
  if (problems.length > 0) return refused(problems.join(' '))

  const path = notePath(root, IMPORTED_SUBFOLDER, built.fileName)
  try {
    await createHomebrewNote(vault, path, built.text)
  } catch (err) {
    return refused(err instanceof Error ? err.message : String(err))
  }
  // Read back where it really is, so the character's choice holds its path.
  const rows = noteCompendium(built.slug, built.text, { root, path })[BUILDER_CATALOG[kind]].list() as Array<{ id: string }>
  const row = rows.find(r => r.id === built.slug)
  if (!row) return refused(`It was written to ${path} but does not list there.`)
  return { kind, name, outcome: 'created', path, row } as ImportedOutcome
}
