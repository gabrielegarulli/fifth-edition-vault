// The Atlas mirror: the frontmatter fields Atlas's character card reads,
// written beside a character's own.

import {
  readSheetFromNote,
  extractInventoryFromNote,
  type CharacterInventory,
  extractVitalsFromNote,
  type Vitals,
} from '../../characterModel'
import type { Sheet } from '../../characterModel'
import { fromYaml, parseNote, serialiseNote } from '../../platform'
import type { StateVault } from '../../platform'

/**
 * A character note drawn by an Atlas VTT statblock template (MYDND-190).
 *
 * Atlas draws a note with its own template when the frontmatter carries
 * `statblock: true` **and** `atlas-template: <id>`, and it reads each of the
 * template's fields from the frontmatter key of the same name
 * (`atlas-vtt/src/app/statblocks/notes/statblockSource.ts`). The fields here
 * are the community "5e (2024) Character Sheet" template's.
 *
 * **A read-only mirror.** The sheet, the `vault-vitals` overlay and the
 * inventory stay the only truth (ADR 0006). Every key below is recomputed from
 * them on every write to the note, so a counter clicked on the Atlas card lasts
 * until the next one. Two files that both believe they own a spent slot is
 * worse than one that does.
 *
 * **Nested frontmatter, on purpose.** The content layer's rule is "nothing
 * nested in frontmatter", because Obsidian's Properties panel rewrites it. That
 * rule is about notes the plugin *reads* from frontmatter; nothing here is read
 * back. Atlas's format is nested (`stats`, `actions`, the counters), and these
 * keys are output only.
 *
 * **What the plugin owns is marked.** `vc_atlas_mirror: true` says the keys in
 * `MIRRORED_KEYS` are ours to rewrite and to delete. A note somebody pointed at
 * a template by hand, in Atlas, has no mark, and nothing here touches it. The
 * template's player-written fields (appearance, personality, backstory, notes)
 * are never in the list, so they survive every rewrite.
 */

export const ATLAS_TEMPLATE_KEY = 'atlas-template'
export const MIRROR_MARK_KEY = 'vc_atlas_mirror'

/**
 * This plugin's own template (MYDND-191, `characters/obsidian/atlasTemplate.ts`). Its body
 * is the ` ```vault-sheet ` fence, which reads the note itself, so the mirror
 * writes only what the template's header reads that nothing else owns: the
 * class line. `name` and `hp` are already managed, and the art is the player's.
 */
export const VAULT_SHEET_TEMPLATE_ID = 'my-dnd-vault-character-mdv191'

/**
 * Atlas's grammar for a vault template's id (`model/templateIds.ts`, 0.14.0):
 * a slug, a hyphen, then exactly six base36 characters, as its own
 * `newTemplateId` makes them. Atlas refuses any other id and the card says
 * "Template not found"; `my-dnd-vault-character` was refused that way.
 */
export const ATLAS_TEMPLATE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{6}$/

/** The keys our own template's header reads, from the sheet. */
export function vaultSheetFields(sheet: Sheet): Record<string, unknown> {
  // The whole line, subclass and level included: the header hides `level`, so
  // nothing repeats it (MYDND-190's trouble was the community template's).
  const line = String(sheet.classes ?? '').trim()
  return line && line !== '—' ? { class: line } : {}
}

/** The template's skills, by its key, with the sheet's name for each. */
const SKILLS = [
  ['acrobatics', 'Acrobatics', 'DEX'],
  ['animal_handling', 'Animal Handling', 'WIS'],
  ['arcana', 'Arcana', 'INT'],
  ['athletics', 'Athletics', 'STR'],
  ['deception', 'Deception', 'CHA'],
  ['history', 'History', 'INT'],
  ['insight', 'Insight', 'WIS'],
  ['intimidation', 'Intimidation', 'CHA'],
  ['investigation', 'Investigation', 'INT'],
  ['medicine', 'Medicine', 'WIS'],
  ['nature', 'Nature', 'INT'],
  ['perception', 'Perception', 'WIS'],
  ['performance', 'Performance', 'CHA'],
  ['persuasion', 'Persuasion', 'CHA'],
  ['religion', 'Religion', 'INT'],
  ['sleight_of_hand', 'Sleight of Hand', 'DEX'],
  ['stealth', 'Stealth', 'DEX'],
  ['survival', 'Survival', 'WIS'],
] as const

const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const
const ABILITY_KEYS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const

/** The template's proficiency marks: none, half, proficient, expertise. */
export const PROFICIENCY_MARKS = ['◇', '⬖', '◆', '❖'] as const

/**
 * Every key the mirror may write, and so every key it deletes when it is turned
 * off. `name`, `ac` and `hp` are not here: `managedFrontmatter` and the loadout
 * already own them, with or without a template.
 */
export const MIRRORED_KEYS: readonly string[] = [
  'species', 'class', 'subclass', 'level', 'xp', 'heroic_inspiration',
  'initiative', 'speed', 'pb',
  'hit_dice', 'hit_dice_spent', 'hit_dice_pool', 'death_save_success', 'death_save_failure',
  'stats', 'saves',
  ...SKILLS.flatMap(([key]) => [`${key}_prof`, `${key}_override`]),
  'passive_perception', 'passive_investigation', 'passive_insight',
  'senses', 'languages',
  'damage_vulnerabilities', 'damage_resistances', 'damage_immunities', 'condition_immunities',
  'armor_training', 'weapon_proficiencies', 'tool_proficiencies',
  'class_resources', 'actions', 'bonus_actions', 'reactions',
  'spellcasting_ability', 'spell_save_dc', 'spell_attack_bonus', 'slots', 'spells',
  'equipment', 'currency',
]

const signed = (n: number): string => (n >= 0 ? `+${n}` : String(n))
const modOf = (score: number): number => Math.floor((score - 10) / 2)
const nonNegative = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0)
const joined = (xs: readonly (string | null | undefined)[] | undefined): string | undefined => {
  const kept = (xs ?? []).map(x => String(x ?? '').trim()).filter(Boolean)
  return kept.length > 0 ? kept.join(', ') : undefined
}

function ordinal(n: number): string {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

/** `INT` → `Int`, the template's choice spelling. */
function abilityChoice(ability: string | null | undefined): string | undefined {
  const a = String(ability ?? '').trim().slice(0, 3)
  return a ? a[0].toUpperCase() + a.slice(1).toLowerCase() : undefined
}

/**
 * The proficiency bonus the template's skill formulas assume:
 * `floor((level - 1) / 4) + 2`. A skill is written as an override only where
 * the sheet's total differs from what the template would work out itself.
 */
const templatePb = (level: number): number => Math.floor((Math.max(1, level) - 1) / 4) + 2

interface Counter {
  name: string
  max: number
  used: number
}

const counter = (name: string, max: number, used: number): Counter => ({ name, max, used: Math.min(max, nonNegative(used)) })

/** What one attack line looks like as a template entry. */
function attackEntry(a: Sheet['attacks'][number]): Record<string, unknown> {
  const entry: Record<string, unknown> = { name: a.name }
  const desc = joined(a.properties)
  if (desc) entry.desc = desc
  if (a.range) entry.range = a.range
  if (typeof a.attack === 'number' && Number.isFinite(a.attack)) entry.attack = `1d20${signed(a.attack)}`
  if (a.damage) entry.damage = a.damage
  if (a.damageType) entry.type = a.damageType
  return entry
}

/**
 * The class as the template's header wants it. The sheet's line names the
 * subclass and the level (`Warlock (Fiend Patron) 20`), and the header is
 * `Level {level} {species} {class}[ ({subclass})]`, so written whole it read
 * "Level 20 Human Warlock (Fiend Patron) 20 (Fiend Patron)". The subclass is
 * its own field; a single class drops its level, which `level` already says,
 * and a multiclass keeps each class's (`Fighter 5 / Wizard 3`).
 */
export function classLine(classes: string | null | undefined): string | undefined {
  const parts = String(classes ?? '')
    .split('/')
    .map(part => part.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim())
    .filter(part => part !== '' && part !== '—')
  if (parts.length === 0) return undefined
  return parts.length === 1 ? parts[0].replace(/\s+\d+$/, '') : parts.join(' / ')
}

/**
 * The template's fields for one character. Pure: the sheet as its fence holds
 * it, the vitals overlay and the inventory, all read from the same note.
 *
 * A key with nothing to say is left out rather than written empty, so the card
 * shows the template's own fallback (the computed proficiency bonus, `◇`).
 */
export function atlasMirrorFields(sheet: Sheet, vitals: Vitals, inventory: CharacterInventory): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const set = (key: string, value: unknown): void => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value) && value.length === 0) return
    out[key] = value
  }

  set('species', sheet.race)
  set('class', classLine(sheet.classes))
  set('subclass', joined(sheet.subclasses))
  set('level', sheet.level)
  if (typeof vitals.xp === 'number') set('xp', vitals.xp)
  set('heroic_inspiration', [counter('Inspiration', 1, vitals.heroicInspiration ? 0 : 1)])
  set('initiative', sheet.initiative)
  set('speed', sheet.speed)
  set('pb', sheet.proficiency_bonus)

  // Hit dice: the totals as one roll, what is spent, and a counter per line.
  const dice = (sheet.hit_dice ?? []).map(line => {
    const m = /^\s*(\d+)\s*d\s*(\d+)\s*$/i.exec(String(line.formula ?? ''))
    const total = m ? parseInt(m[1], 10) : 0
    return { label: line.label, formula: line.formula, sides: m ? m[2] : '', total, spent: Math.min(total, nonNegative(vitals.hitDiceSpent[line.label])) }
  })
  set('hit_dice', dice.map(d => d.formula).filter(Boolean).join(' + '))
  set('hit_dice_spent', dice.reduce((n, d) => n + d.spent, 0))
  set('hit_dice_pool', dice.filter(d => d.total > 0).map(d => counter(d.label ? `d${d.sides} (${d.label})` : `d${d.sides}`, d.total, d.spent)))
  set('death_save_success', [counter('Success', 3, vitals.deathSaves.successes)])
  set('death_save_failure', [counter('Failure', 3, vitals.deathSaves.failures)])

  // Abilities, in the template's slot order, and the saves by its slot keys.
  const score = new Map((sheet.abilities ?? []).map(a => [String(a.label).toUpperCase().slice(0, 3), a.score]))
  if (ABILITIES.every(a => typeof score.get(a) === 'number')) set('stats', ABILITIES.map(a => score.get(a)))
  const saves: Record<string, number> = {}
  for (const s of sheet.saves ?? []) {
    const at = ABILITIES.indexOf(String(s.label).toUpperCase().slice(0, 3) as (typeof ABILITIES)[number])
    if (at >= 0 && typeof s.total === 'number') saves[ABILITY_KEYS[at]] = s.total
  }
  if (Object.keys(saves).length > 0) set('saves', saves)

  // Skills: the mark, and an override only where the template would be wrong.
  const pb = templatePb(sheet.level)
  const skills = new Map((sheet.skills ?? []).map(s => [s.name.toLowerCase(), s]))
  for (const [key, name, ability] of SKILLS) {
    const skill = skills.get(name.toLowerCase())
    if (!skill) continue
    const abilityScore = score.get(ability)
    const mod = typeof abilityScore === 'number' ? modOf(abilityScore) : 0
    let mark: number = skill.expertise ? 3 : skill.proficient ? 2 : 0
    // Jack of All Trades and the like: half the bonus without proficiency.
    if (mark === 0 && skill.total === mod + Math.floor(pb / 2) && Math.floor(pb / 2) > 0) mark = 1
    const templateTotal = mod + [0, Math.floor(pb / 2), pb, 2 * pb][mark]
    set(`${key}_prof`, PROFICIENCY_MARKS[mark])
    if (typeof abilityScore !== 'number' || skill.total !== templateTotal) set(`${key}_override`, skill.total)
  }

  set('passive_perception', sheet.passives?.perception)
  set('passive_investigation', sheet.passives?.investigation)
  set('passive_insight', sheet.passives?.insight)
  set('senses', joined((sheet.senses ?? []).map(s => (s.range > 0 ? `${s.name} ${s.range} ft.` : s.name))))
  set('languages', joined(sheet.proficiencies?.languages))

  const defenses = (type: string): string | undefined =>
    joined((sheet.defenses ?? []).filter(d => d.type === type).map(d => d.value))
  set('damage_vulnerabilities', defenses('vulnerability'))
  set('damage_resistances', defenses('resistance'))
  set('damage_immunities', defenses('immunity'))
  set('condition_immunities', defenses('condition_immunity'))
  set('armor_training', joined(sheet.proficiencies?.armor))
  set('weapon_proficiencies', joined(sheet.proficiencies?.weapons))
  set('tool_proficiencies', joined(sheet.proficiencies?.tools))

  set(
    'class_resources',
    (sheet.class_resources ?? [])
      .filter(r => nonNegative(r.uses) > 0)
      .map(r => counter(r.name, nonNegative(r.uses), vitals.featureUsesUsed[r.key] ?? 0)),
  )

  // Attacks and rolled features, filed by what they cost.
  const byCost: Record<'actions' | 'bonus_actions' | 'reactions', Record<string, unknown>[]> = {
    actions: [],
    bonus_actions: [],
    reactions: [],
  }
  const costOf = (activation: string | null | undefined): keyof typeof byCost => {
    const a = String(activation ?? '').toLowerCase()
    return a.startsWith('bonus') ? 'bonus_actions' : a.startsWith('reaction') ? 'reactions' : 'actions'
  }
  for (const a of sheet.attacks ?? []) byCost[costOf(a.activation)].push(attackEntry(a))
  for (const f of sheet.feature_dice ?? []) {
    if (f.formula) byCost[costOf(f.activation)].push({ name: f.name, damage: f.formula })
  }
  for (const key of Object.keys(byCost) as (keyof typeof byCost)[]) set(key, byCost[key])

  // Spellcasting: the line, the slots, and the list in Fantasy Statblocks' shape.
  const casting = sheet.spellcasting
  if (casting) {
    set('spellcasting_ability', abilityChoice(casting.ability))
    set('spell_save_dc', casting.dc)
    set('spell_attack_bonus', casting.attack)
  }
  const slotMax = sheet.spell_slots ?? {}
  const ranks = Object.keys(slotMax).map(Number).filter(r => r > 0 && nonNegative(slotMax[String(r)]) > 0).sort((a, b) => a - b)
  set('slots', ranks.map(r => counter(`${ordinal(r)} level`, nonNegative(slotMax[String(r)]), vitals.spellSlotsUsed[String(r)] ?? 0)))
  const levels = (sheet.spells ?? []).filter(l => (l.spells ?? []).length > 0).sort((a, b) => a.level - b.level)
  if (levels.length > 0) {
    const lines: unknown[] = []
    if (casting) lines.push(`Spellcasting (${abilityChoice(casting.ability) ?? ''}, DC ${casting.dc}, ${signed(casting.attack)} to hit):`)
    for (const l of levels) {
      const slots = nonNegative(slotMax[String(l.level)])
      const head = l.level === 0 ? 'Cantrips (at will)' : `${ordinal(l.level)} level${slots ? ` (${slots} slot${slots === 1 ? '' : 's'})` : ''}`
      lines.push({ [head]: l.spells.join(', ') })
    }
    set('spells', lines)
  }

  // Equipment: the inventory, then what D&D Beyond says it carries.
  const equipment: Record<string, unknown>[] = []
  const describe = (qty: number, equipped?: boolean, attuned?: boolean): string | undefined =>
    joined([qty > 1 ? `×${qty}` : null, equipped ? 'equipped' : null, attuned ? 'attuned' : null])
  for (const item of inventory.items ?? []) {
    const name = String(item.custom_name || item.name || '').trim()
    if (!name) continue
    const desc = describe(nonNegative(item.quantity), item.equipped, item.attuned)
    equipment.push(desc ? { name, desc } : { name })
  }
  for (const item of sheet.ddb_items ?? []) {
    const desc = describe(nonNegative(item.quantity), item.equipped, item.attuned)
    equipment.push(desc ? { name: item.name, desc } : { name: item.name })
  }
  set('equipment', equipment)

  // The purse in the template's slot order: CP, SP, EP, GP, PP. D&D Beyond's
  // coins are shown beside the pouch on the sheet and never added to it; a
  // card has one purse, so it shows the sum.
  const c = inventory.currency
  const d = sheet.ddb_currency
  const coins = [
    nonNegative(c?.cp) + nonNegative(d?.cp),
    nonNegative(c?.sp) + nonNegative(d?.sp),
    nonNegative(d?.ep),
    nonNegative(c?.gp) + nonNegative(d?.gp),
    nonNegative(c?.pp) + nonNegative(d?.pp),
  ]
  if (coins.some(n => n > 0)) set('currency', coins)

  return out
}

/** Drop every key the mirror owns, its mark and the template it named. */
function withoutMirror(frontmatter: Record<string, unknown>): Record<string, unknown> {
  const fm = { ...frontmatter }
  for (const key of MIRRORED_KEYS) delete fm[key]
  delete fm[ATLAS_TEMPLATE_KEY]
  delete fm[MIRROR_MARK_KEY]
  return fm
}

/**
 * The note with its mirror brought up to date. Pure, so it can sit inside a
 * `StateVault.write` transform.
 *
 * - `templateId` a non-empty string: point the note at that template, mark it,
 *   and write the fields.
 * - `templateId` `''` or `null`: turn it off. A marked note loses every key
 *   the mirror owns; an unmarked one is left exactly as it is.
 * - `templateId` omitted: refresh a marked note, leave any other alone. This
 *   is what every vitals, inventory and sheet write runs.
 *
 * A note with no charsheet fence is left alone: there is nothing to mirror.
 */
export function withAtlasMirror(markdown: string, templateId?: string | null): string {
  // Cheap first: most writes in a vault are to notes that are not characters.
  if (templateId === undefined && !markdown.includes(MIRROR_MARK_KEY)) return markdown
  const { frontmatter, body } = parseNote(markdown)
  const marked = frontmatter[MIRROR_MARK_KEY] === true

  const id = typeof templateId === 'string' ? templateId.trim() : templateId
  if (id === undefined && !marked) return markdown
  // Atlas draws only a note marked as a statblock, so without the flag the
  // mirror is off too: "Expose characters to Atlas" turned off takes it along.
  const off = id === '' || id === null || frontmatter.statblock === undefined
  if (off) return marked ? serialiseNote({ frontmatter: withoutMirror(frontmatter), body }) : markdown

  const sheet = readSheetFromNote(markdown, fromYaml)
  if (!sheet) return markdown
  const template = id ?? frontmatter[ATLAS_TEMPLATE_KEY]
  if (typeof template !== 'string' || template.trim() === '') return markdown
  // Our own template draws the note itself; a copy of the sheet in frontmatter
  // would be read by nothing. `withoutMirror` below still clears the full set,
  // so a note switched from the community template is cleaned up.
  const fields =
    template.trim() === VAULT_SHEET_TEMPLATE_ID
      ? vaultSheetFields(sheet)
      : atlasMirrorFields(sheet, extractVitalsFromNote(markdown), extractInventoryFromNote(markdown))

  const next = { ...withoutMirror(frontmatter), [ATLAS_TEMPLATE_KEY]: template.trim(), [MIRROR_MARK_KEY]: true, ...fields }
  if (JSON.stringify(next) === JSON.stringify(frontmatter)) return markdown
  return serialiseNote({ frontmatter: next, body })
}

/**
 * The vault every character store writes through: each write's result has its
 * mirror refreshed in the same transform, so it is still one file write.
 *
 * One wrapper rather than a call in each writer, because the mirror reads three
 * fences that five modules write, and a writer that forgot the call would leave
 * the card a step behind with nothing to say so.
 */
export function mirroringVault(vault: StateVault): StateVault {
  return {
    notesIn: folder => vault.notesIn(folder),
    allNotes: () => vault.allNotes(),
    read: path => vault.read(path),
    write: (path, transform) => vault.write(path, markdown => withAtlasMirror(transform(markdown))),
  }
}
