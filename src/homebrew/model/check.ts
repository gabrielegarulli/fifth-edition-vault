import { noteProblems } from '@vault/derive/noteProblems.js'

import { createCompendium } from '../../compendium'
import { fromYaml, type NoteRef, type VaultSource } from '../../platform'
import { effectFormProblems } from './effects'
import type { BuiltNote } from './emit'
import type { BuilderForm } from './forms'
import { BUILDER_CATALOG } from './kinds'

/**
 * The two checks before a builder may save (MYDND-233, ADR 0014).
 *
 * `formProblems` is the form's own: a name, a level, an effect half filled in.
 * `readBackProblems` is the reader's verdict on the note itself. The note is
 * put alone in a vault, **in the homebrew folder**, where it will be saved,
 * and read by its kind's own catalog: it must list (so its bare tag admits
 * it), read back every field the builder wrote as written, open with the fence
 * the builder wrote, and have nothing for `noteProblems` (MYDND-238) to say.
 *
 * A read-back failure is the builder's bug, not the GM's: the form was valid,
 * and the note it made is not. It refuses rather than writing a note that
 * looks right and is not, the state layer's rule for a writer.
 */

const whole = (s: string): number | null => (/^-?\d+$/.test(s.trim()) ? Number(s.trim()) : null)
const isDecimal = (s: string) => s.trim() === '' || /^\d+(\.\d+)?$/.test(s.trim())
const DICE = /^\d+d\d+( ?[+-] ?\d+)?$/i

/** What the GM must fix before saving, a sentence each. Empty means the form is complete. */
export function formProblems(form: BuilderForm): string[] {
  const out: string[] = []
  const name = form.name.trim()
  if (name === '') out.push('Give it a name.')
  else if (!/[a-z0-9]/i.test(name)) out.push('The name needs at least one letter or digit: it becomes the file name.')
  if (form.source.trim() === '') out.push('Give it a source: your own book, or Homebrew.')

  switch (form.kind) {
    case 'spell': {
      const level = whole(form.level)
      if (level === null || level < 0 || level > 9) out.push('The level must be 0 (a cantrip) to 9.')
      if (form.damageDice.trim() !== '' && !DICE.test(form.damageDice.trim())) out.push(`"${form.damageDice}" is not dice, e.g. 2d6.`)
      if (form.upcastDice.trim() !== '' && !DICE.test(form.upcastDice.trim())) out.push(`"${form.upcastDice}" is not dice, e.g. 1d6.`)
      const every = whole(form.upcastEvery)
      if (every === null || every < 1 || every > 9) out.push('"For every" must be 1 to 9 slot levels.')
      break
    }
    case 'item':
      if (!isDecimal(form.costGp)) out.push('The cost must be a number of gold pieces, e.g. 2 or 0.5.')
      if (!isDecimal(form.weight)) out.push('The weight must be a number of pounds.')
      if (form.damage.trim() !== '' && !DICE.test(form.damage.trim())) out.push(`"${form.damage}" is not dice, e.g. 1d8.`)
      if (form.versatileDamage.trim() !== '' && !DICE.test(form.versatileDamage.trim())) out.push(`"${form.versatileDamage}" is not dice, e.g. 1d10.`)
      if (form.ac.trim() !== '' && whole(form.ac) === null) out.push('Armor Class must be a whole number.')
      if (form.strength.trim() !== '' && whole(form.strength) === null) out.push('The Strength requirement must be a whole number.')
      break
    case 'magic-item':
      if (!isDecimal(form.weight)) out.push('The weight must be a number of pounds.')
      if (form.charges.trim() !== '' && whole(form.charges) === null && !DICE.test(form.charges.trim())) {
        out.push('Charges must be a whole number, or dice such as 1d6 + 1.')
      }
      form.effects.forEach((e, i) => out.push(...effectFormProblems(e).map(p => `Effect ${i + 1}: ${p}`)))
      break
    case 'feat': {
      const named = form.benefits.filter(b => b.name.trim() !== '' || b.text.trim() !== '' || b.effects.length > 0)
      if (named.length === 0) out.push('Add at least one benefit.')
      named.forEach((b, i) => {
        const label = b.name.trim() ? `"${b.name.trim()}"` : `Benefit ${i + 1}`
        if (b.name.trim() === '') out.push(`${label} needs a name.`)
        b.effects.forEach((e, j) => out.push(...effectFormProblems(e).map(p => `${label}, effect ${j + 1}: ${p}`)))
      })
      break
    }
    case 'condition':
      break
  }
  return out
}

/** Where the read-back puts the note: the homebrew folder, as the save will. */
const HOMEBREW = 'Homebrew'

const frontmatterOf = (text: string): Record<string, unknown> => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  const parsed = m ? fromYaml(m[1]) : null
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
}

/**
 * One note, under the homebrew folder, and nothing else: what the catalog will
 * find there. At `<root>/<slug>.md` unless `path` says where it really is.
 */
function soleNote(slug: string, text: string, root = HOMEBREW, path = `${root}/${slug}.md`): VaultSource {
  const ref: NoteRef = { path, slug, frontmatter: frontmatterOf(text) }
  return {
    notesIn: () => [],
    notesUnder: folder => (folder === root ? [ref] : []),
    homebrewFolder: () => root,
    readBody: async p => (p === path ? text : ''),
  }
}

/**
 * A compendium holding one note, `<slug>.md`, and nothing else, as the catalog
 * will read it from the homebrew folder. Edit reads a saved note through it
 * (MYDND-272), so the reader judges the note's shape there too. Given the
 * homebrew folder and the note's real path, its row carries that path: what a
 * conversion matches a note it has just written with (MYDND-273).
 */
export function noteCompendium(slug: string, text: string, at?: { root: string; path: string }) {
  return createCompendium(soleNote(slug, text, at?.root, at?.path), fromYaml)
}

/**
 * A compendium holding `built` and nothing else, as the catalog will read it
 * from the homebrew folder. The read-back's, and the preview's: the page mounts
 * the catalog's own detail pane over it, so the preview is what `/feats` will
 * draw, not a likeness of it.
 */
export function previewCompendium(built: BuiltNote) {
  return noteCompendium(built.slug, built.text)
}

/** The row field each frontmatter key the builders write is read into, and what an absent key reads as. */
const ROW_FIELDS: Record<BuiltNote['kind'], ReadonlyArray<[field: string, key: string, absent: unknown]>> = {
  spell: [
    ['level', 'level', -1],
    ['school', 'school', null],
    ['castingTime', 'casting_time', null],
    ['range', 'range', null],
    ['components', 'components', null],
    ['duration', 'duration', null],
    ['concentration', 'concentration', false],
    ['ritual', 'ritual', false],
    ['classes', 'classes', []],
    ['damageTypes', 'damage_types', []],
    ['damageDice', 'damage_dice', null],
    ['upcastDice', 'upcast_dice', null],
    ['upcastEvery', 'upcast_every', 1],
  ],
  condition: [],
  item: [
    ['itemType', 'item_type', null],
    ['costCp', 'cost_cp', null],
    ['weight', 'weight', null],
    ['weaponCategory', 'weapon_category', null],
    ['damage', 'damage', null],
    ['damageType', 'damage_type', null],
    ['versatileDamage', 'versatile_damage', null],
    ['range', 'range', null],
    ['properties', 'properties', []],
    ['mastery', 'mastery', null],
    ['ac', 'ac', null],
    ['strength', 'strength', null],
    ['stealthDisadvantage', 'stealth_disadvantage', false],
  ],
  'magic-item': [
    ['itemType', 'item_type', null],
    ['rarity', 'rarity', null],
    ['requiresAttunement', 'requires_attunement', false],
    ['attunementRestriction', 'attunement_restriction', null],
    ['cursed', 'cursed', false],
    ['wondrous', 'wondrous', false],
    ['weight', 'weight', null],
    ['charges', 'charges', null],
    ['recharge', 'recharge', null],
    ['rechargeAmount', 'recharge_amount', null],
    ['casts', 'casts', []],
  ],
  feat: [
    ['kind', 'kind', null],
    ['prerequisite', 'prerequisite', null],
    ['abilities', 'abilities', []],
    ['benefitCount', 'benefit_count', null],
    ['modelledCount', 'modelled_count', null],
  ],
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** The kinds `noteProblems` reads a fence of. */
const PROBLEM_KINDS = new Set(['feat', 'item', 'magic-item'])

/**
 * What the catalog's reader says is wrong with `built`, a sentence each. Empty
 * means it lists under its name, reads back every field as written, and opens
 * with its fence intact.
 */
export async function readBackProblems(built: BuiltNote): Promise<string[]> {
  const catalog = previewCompendium(built)[BUILDER_CATALOG[built.kind]]
  const rows = catalog.list() as unknown as Array<Record<string, unknown>>
  const row = rows.find(r => r.id === built.slug)
  if (!row) return [`It would not list: the ${BUILDER_CATALOG[built.kind]} catalog does not find it in the homebrew folder.`]

  const out: string[] = []
  const fm = built.frontmatter
  if (row.name !== fm.title) out.push(`It would list as "${String(row.name)}", not "${String(fm.title)}".`)
  if (row.source !== fm.source) out.push(`Its source would read as "${String(row.source)}", not "${String(fm.source)}".`)
  for (const [field, key, absent] of ROW_FIELDS[built.kind]) {
    const want = fm[key] === undefined ? absent : fm[key]
    if (!same(row[field], want)) out.push(`Its ${key} would read back as ${JSON.stringify(row[field])}, not ${JSON.stringify(want)}.`)
  }

  const detail = await catalog.detail(built.slug)
  if (!detail) out.push('It would list, but not open.')
  else if (built.fence) {
    if (!same(detail.fence, built.fence)) out.push(`Its ${built.fenceLang} block would not read back as written.`)
  }
  if (PROBLEM_KINDS.has(built.kind)) {
    out.push(...noteProblems(built.kind as 'feat' | 'item' | 'magic-item', detail?.fence ?? null, fm))
  }
  return out
}
