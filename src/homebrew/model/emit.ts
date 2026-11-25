import { abilitiesFromFence, countsFromFence } from '../../compendium'
import { exporterSlug, serialiseNote, setFence } from '../../platform'
import { effectToFence, keyPart } from './effects'
import { isArmorType, isWeaponType, type BuilderForm, type ConditionForm, type FeatForm, type ItemForm, type MagicItemForm, type SpellForm } from './forms'
import type { BuilderKind } from './kinds'

/**
 * A builder's form as the note it writes (MYDND-233), in the shape of
 * `src/compendium/templates/<kind>.full.md`: flat frontmatter, then a `# `
 * heading, a line of facts, the prose, and the kind's fence where it has one.
 *
 * - **Only what was filled in is written.** An empty optional field is left
 *   out rather than written as `""`, which a reader would take as a value.
 * - **No `export_hash`, ever** (ADR 0014): that is the exporter's stamp.
 * - **The bare kind tag and `homebrew`** on every note: the first is what
 *   admits it from the homebrew folder (MYDND-234).
 * - **The title is an alias**, so `[[Hearthbound Resolve]]` finds
 *   `hearthbound-resolve.md`, as it finds an exported note.
 *
 * The writing is `platform/store/note.ts`'s: the `yaml` package, every string
 * double-quoted (ADR 0003).
 */

export interface BuiltNote {
  kind: BuilderKind
  /** The filename's stem, which is the row's `id`: the title's exporter slug. */
  slug: string
  fileName: string
  text: string
  /** What was written, for the read-back to compare against. */
  frontmatter: Record<string, unknown>
  fence: Record<string, unknown> | null
  fenceLang: string | null
}

const trim = (s: string) => s.trim()
const has = (s: string) => s.trim() !== ''
const whole = (s: string): number | null => (/^-?\d+$/.test(s.trim()) ? Number(s.trim()) : null)
const decimal = (s: string): number | null => (/^\d+(\.\d+)?$/.test(s.trim()) ? Number(s.trim()) : null)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Keys whose value is `undefined` are dropped, so an empty field writes nothing. */
function compact(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined))
}

/** The filename's stem for `name`: `Hearthbound Resolve` → `hearthbound-resolve`. Empty for a name with no letters. */
export const slugOf = (name: string): string => exporterSlug(name)

function note(form: BuilderForm, fm: Record<string, unknown>, facts: string, fence: Record<string, unknown> | null, lang: string | null): BuiltNote {
  const name = trim(form.name)
  const slug = slugOf(name)
  const frontmatter = compact({
    ...fm,
    tags: [...((fm.tags as string[] | undefined) ?? []), 'homebrew'],
    aliases: [name],
  })
  const parts = [`# ${name}`, facts ? `*${facts}*` : '', form.description.trim()].filter(Boolean)
  let body = `\n${parts.join('\n\n')}\n`
  if (fence && lang) body = setFence(body, lang, fence)
  return { kind: form.kind, slug, fileName: `${slug}.md`, text: serialiseNote({ frontmatter, body }), frontmatter, fence, fenceLang: lang }
}

function spellNote(f: SpellForm): BuiltNote {
  const level = whole(f.level) ?? 0
  const every = whole(f.upcastEvery) ?? 1
  const fm = {
    title: trim(f.name),
    source: trim(f.source),
    level,
    school: f.school,
    casting_time: has(f.castingTime) ? trim(f.castingTime) : undefined,
    range: has(f.range) ? trim(f.range) : undefined,
    components: has(f.components) ? trim(f.components) : undefined,
    duration: has(f.duration) ? trim(f.duration) : undefined,
    concentration: f.concentration,
    ritual: f.ritual,
    classes: f.classes.length > 0 ? f.classes : undefined,
    damage_types: has(f.damageDice) && has(f.damageType) ? [f.damageType] : undefined,
    damage_dice: has(f.damageDice) ? trim(f.damageDice) : undefined,
    upcast_dice: level > 0 && has(f.damageDice) && has(f.upcastDice) ? trim(f.upcastDice) : undefined,
    upcast_every: level > 0 && has(f.damageDice) && has(f.upcastDice) && every > 1 ? every : undefined,
    tags: ['spell', `spell/level-${level}`],
  }
  const facts = level === 0 ? `${f.school} Cantrip` : `Level ${level} ${f.school}`
  return note(f, fm, facts, null, null)
}

function conditionNote(f: ConditionForm): BuiltNote {
  return note(f, { title: trim(f.name), source: trim(f.source), type: 'condition', tags: ['condition'] }, '', null, null)
}

function itemNote(f: ItemForm): BuiltNote {
  const weapon = isWeaponType(f.itemType)
  const armor = isArmorType(f.itemType)
  const gp = decimal(f.costGp)
  const weight = decimal(f.weight) ?? undefined
  const damageType = has(f.damageType) ? cap(f.damageType) : undefined
  const w = weapon
    ? {
        weapon_category: f.weaponCategory,
        damage: has(f.damage) ? trim(f.damage) : undefined,
        damage_type: has(f.damage) ? damageType : undefined,
        versatile_damage: has(f.versatileDamage) ? trim(f.versatileDamage) : undefined,
        range: has(f.range) ? trim(f.range) : undefined,
        properties: f.properties.length > 0 ? f.properties : undefined,
        mastery: has(f.mastery) ? f.mastery : undefined,
      }
    : {}
  const a = armor
    ? {
        ac: whole(f.ac) ?? undefined,
        strength: whole(f.strength) ?? undefined,
        stealth_disadvantage: f.stealthDisadvantage || undefined,
      }
    : {}
  const fm = {
    title: trim(f.name),
    source: trim(f.source),
    item_type: f.itemType,
    cost_cp: gp === null ? undefined : Math.round(gp * 100),
    weight,
    ...w,
    ...a,
    tags: ['item', ...(weapon ? [`weapon/${f.weaponCategory}`] : [])],
  }
  // The sheet reads a weapon's and an armour's numbers from the fence
  // (`itemDataFromFence`); the frontmatter copies are for the list.
  const fence = weapon || armor ? compact({ ...w, ...a, weight }) : null
  delete fence?.weapon_category
  const facts = [f.itemType, weapon ? f.weaponCategory : ''].filter(Boolean).join(', ') + ` | Source: ${trim(f.source)}`
  return note(f, fm, facts, fence && Object.keys(fence).length > 0 ? fence : null, 'vault-item')
}

function magicItemNote(f: MagicItemForm): BuiltNote {
  const slug = keyPart(f.name)
  const effects = f.effects.map(e => effectToFence(e, `${slug}_${keyPart(e.name) || 'uses'}`))
  const charges = whole(f.charges) ?? (has(f.charges) ? trim(f.charges) : undefined)
  const fm = {
    title: trim(f.name),
    source: trim(f.source),
    item_type: f.itemType,
    wondrous: f.itemType === 'Wondrous Item' || undefined,
    rarity: f.rarity,
    requires_attunement: f.requiresAttunement,
    attunement_restriction: f.requiresAttunement && has(f.attunementRestriction) ? trim(f.attunementRestriction) : undefined,
    cursed: f.cursed || undefined,
    weight: decimal(f.weight) ?? undefined,
    charges,
    recharge: charges !== undefined && has(f.recharge) ? f.recharge : undefined,
    recharge_amount: charges !== undefined && has(f.recharge) && has(f.rechargeAmount) ? trim(f.rechargeAmount) : undefined,
    casts: f.casts.length > 0 ? f.casts : undefined,
    tags: ['magic-item', `rarity/${f.rarity.replace(/\s+/g, '-')}`, ...(f.requiresAttunement ? ['attunement'] : [])],
  }
  const attune = f.requiresAttunement ? ` (requires attunement${has(f.attunementRestriction) ? ` by ${trim(f.attunementRestriction)}` : ''})` : ''
  const facts = `${f.itemType}, ${f.rarity}${attune} | Source: ${trim(f.source)}`
  return note(f, fm, facts, effects.length > 0 ? { effects } : null, 'vault-magic-item')
}

const KIND_WORD: Record<FeatForm['featKind'], string> = {
  origin: 'Origin Feat',
  general: 'General Feat',
  fighting_style: 'Fighting Style Feat',
  epic_boon: 'Epic Boon Feat',
}

function featNote(f: FeatForm): BuiltNote {
  const noteKey = keyPart(f.name)
  const taken = new Set<string>(['overview'])
  const benefits: Array<Record<string, unknown>> = []
  if (has(f.description)) benefits.push({ key: 'overview', text: trim(f.description) })
  for (const b of f.benefits) {
    if (!has(b.name) && !has(b.text) && b.effects.length === 0) continue
    // Minted once, from the name, and unique in the note: a character's saved
    // toggle addresses it (VAULT-85).
    const base = keyPart(b.name) || 'benefit'
    let key = base
    for (let n = 2; taken.has(key); n += 1) key = `${base}_${n}`
    taken.add(key)
    benefits.push(
      compact({
        key,
        name: has(b.name) ? trim(b.name) : undefined,
        text: has(b.text) ? trim(b.text) : undefined,
        effects: b.effects.length > 0 ? b.effects.map(e => effectToFence(e, `${noteKey}_${key}`)) : undefined,
      }),
    )
  }
  const fence = { benefits }
  const counts = countsFromFence(fence)
  const abilities = abilitiesFromFence(fence)
  const fm = {
    title: trim(f.name),
    source: trim(f.source),
    kind: f.featKind,
    prerequisite: has(f.prerequisite) ? trim(f.prerequisite) : undefined,
    // Derived keys: on a homebrew feat nothing else computes them, so the
    // builder writes them from the fence it writes (`docs/plans/homebrew-notes.md`, gotcha 4).
    abilities: abilities.length > 0 ? abilities : undefined,
    benefit_count: counts.benefits,
    modelled_count: counts.modelled,
    tags: ['feat', `feat/${f.featKind.replace(/_/g, '-')}`],
  }
  const prereq = has(f.prerequisite) ? ` (Prerequisite: ${trim(f.prerequisite)})` : ''
  // The intro is in the fence as the overview; the prose is the same sentence,
  // as an exported feat's is.
  return note(f, fm, `${KIND_WORD[f.featKind]}${prereq} | Source: ${trim(f.source)}`, fence, 'vault-feat')
}

/** The note `form` writes. Pure: call it on every keystroke for the preview. */
export function buildNote(form: BuilderForm): BuiltNote {
  switch (form.kind) {
    case 'spell':
      return spellNote(form)
    case 'condition':
      return conditionNote(form)
    case 'item':
      return itemNote(form)
    case 'magic-item':
      return magicItemNote(form)
    case 'feat':
      return featNote(form)
  }
}
