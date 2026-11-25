import { parseNote } from '../../platform'
import { noteCompendium } from './check'
import { ABILITIES, emptyEffect, EFFECT_LABEL, type Ability, type EffectForm, type EffectType } from './effects'
import { buildNote } from './emit'
import { emptyForm, type BenefitForm, type BuilderForm, type FeatForm } from './forms'
import { BUILDER_CATALOG, BUILDER_LABEL, type BuilderKind } from './kinds'

/**
 * A saved homebrew note, back into its builder's form (MYDND-272): the inverse
 * of `emit.ts`, so Edit can open the note it wrote.
 *
 * **The kind's own catalog reads the note first.** It must list from the
 * homebrew folder, and its fence is the reader's (MYDND-232: the reader judges
 * a note's shape). The form is filled from the frontmatter and that fence; the
 * description is the prose between the facts line and the fence.
 *
 * **Then the form is written again and compared with the note, as data**: the
 * frontmatter and the fence as values, the prose with line endings and
 * trailing spaces normalised. Obsidian re-quoting or reordering a property
 * changes nothing here. Anything else that differs (a key the form has no
 * field for, prose it cannot place, an effect the editor cannot hold) is
 * something a save would drop, so Edit refuses the note and names it. A hand
 * edit is never lost silently.
 */

export type LoadedNote = { ok: true; form: BuilderForm } | { ok: false; reasons: string[] }

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '')
const num = (v: unknown): string => (typeof v === 'number' && Number.isFinite(v) ? String(v) : typeof v === 'string' ? v : '')
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
const isAbility = (v: unknown): v is Ability => typeof v === 'string' && (ABILITIES as readonly string[]).includes(v)

/** A text's lines, whatever its line endings. */
const lineSplit = (text: string): string[] => text.split(/\r\n|\r|\n/)

/** The stem of a vault path: `Homebrew/Feats/steady-flame.md` → `steady-flame`. */
const stemOf = (path: string): string => (path.split('/').pop() ?? path).replace(/\.md$/i, '')

/**
 * The description: the prose after the `# ` heading and the italic facts line,
 * which `emit.ts` writes before it. Every fence is already gone (`proseOf`).
 */
export function descriptionOf(prose: string): string {
  const lines = lineSplit(prose)
  let i = 0
  const skipBlank = () => {
    while (i < lines.length && lines[i].trim() === '') i += 1
  }
  skipBlank()
  if (/^#\s/.test(lines[i] ?? '')) i += 1
  skipBlank()
  if (/^\*[^*].*\*$/.test((lines[i] ?? '').trim())) i += 1
  return lines.slice(i).join('\n').trim()
}

/** One stored effect as the editor holds it, or null for a type the builder does not offer. */
export function fenceToEffect(raw: unknown): EffectForm | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const type = e.type
  if (typeof type !== 'string' || !(type in EFFECT_LABEL)) return null
  const out = emptyEffect(type as EffectType)
  switch (out.type) {
    case 'ability_score_bonus':
      if (isAbility(e.ability)) out.ability = e.ability
      out.amount = num(e.amount)
      out.max = num(e.max)
      break
    case 'ability_score_choice':
      out.options = strings(e.options).filter(isAbility)
      out.amount = num(e.amount)
      out.max = num(e.max)
      break
    case 'skill_proficiency':
      out.skill = str(e.skill)
      break
    case 'saving_throw_proficiency':
      if (isAbility(e.ability)) out.ability = e.ability
      break
    case 'weapon_proficiency':
    case 'armor_training':
      out.category = str(e.category)
      break
    case 'resistance':
      out.damageType = str(e.value)
      break
    case 'sense':
      out.sense = str(e.sense)
      out.range = num(e.range)
      break
    case 'speed':
      out.mode = typeof e.mode === 'string' ? e.mode : 'walk'
      out.amount = num(e.amount)
      out.add = e.add === true
      break
    case 'feature_resource': {
      out.name = str(e.name)
      const uses = e.uses
      if (uses && typeof uses === 'object' && (uses as Record<string, unknown>).kind === 'proficiency_bonus') out.usesProficiency = true
      else out.uses = num(uses)
      out.resets = str(e.resets) || out.resets
      break
    }
    case 'ac_bonus':
    case 'spell_attack_bonus':
    case 'spell_save_dc_bonus':
      out.amount = num(e.amount)
      break
  }
  return out
}

const effectsOf = (list: unknown): EffectForm[] =>
  (Array.isArray(list) ? list : []).map(fenceToEffect).filter((e): e is EffectForm => e !== null)

/** The form a note fills, from its frontmatter, the reader's fence and its prose. */
export function formOf(kind: BuilderKind, fm: Record<string, unknown>, fence: unknown, prose: string): BuilderForm {
  const base = { name: str(fm.title), source: str(fm.source), description: descriptionOf(prose) }
  const f = fence && typeof fence === 'object' ? (fence as Record<string, unknown>) : {}
  switch (kind) {
    case 'spell': {
      const damageTypes = strings(fm.damage_types)
      return {
        ...emptyForm('spell', ''),
        ...base,
        level: num(fm.level),
        school: str(fm.school),
        castingTime: str(fm.casting_time),
        range: str(fm.range),
        components: str(fm.components),
        duration: str(fm.duration),
        concentration: fm.concentration === true,
        ritual: fm.ritual === true,
        classes: strings(fm.classes),
        damageDice: str(fm.damage_dice),
        damageType: damageTypes[0] ?? '',
        upcastDice: str(fm.upcast_dice),
        upcastEvery: fm.upcast_every === undefined ? '1' : num(fm.upcast_every),
      }
    }
    case 'condition':
      return { ...emptyForm('condition', ''), ...base }
    case 'item': {
      const blank = emptyForm('item', '')
      const cp = fm.cost_cp
      return {
        ...blank,
        ...base,
        itemType: str(fm.item_type),
        // `cost_cp` is written from gold pieces; 250 cp reads back as 2.5 gp.
        costGp: typeof cp === 'number' && Number.isFinite(cp) ? String(cp / 100) : str(cp),
        weight: num(fm.weight),
        weaponCategory: str(fm.weapon_category) || blank.weaponCategory,
        damage: str(fm.damage),
        damageType: str(fm.damage_type).toLowerCase() || blank.damageType,
        versatileDamage: str(fm.versatile_damage),
        range: str(fm.range),
        properties: strings(fm.properties),
        mastery: str(fm.mastery),
        ac: num(fm.ac),
        strength: num(fm.strength),
        stealthDisadvantage: fm.stealth_disadvantage === true,
      }
    }
    case 'magic-item':
      return {
        ...emptyForm('magic-item', ''),
        ...base,
        itemType: str(fm.item_type),
        rarity: str(fm.rarity),
        requiresAttunement: fm.requires_attunement === true,
        attunementRestriction: str(fm.attunement_restriction),
        cursed: fm.cursed === true,
        weight: num(fm.weight),
        charges: num(fm.charges),
        recharge: str(fm.recharge),
        rechargeAmount: num(fm.recharge_amount),
        casts: strings(fm.casts),
        effects: effectsOf(f.effects),
      }
    case 'feat': {
      const all = Array.isArray(f.benefits) ? (f.benefits as unknown[]) : []
      const records = all.filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
      const overview = records.find(b => b.key === 'overview')
      const benefits: BenefitForm[] = records
        .filter(b => b.key !== 'overview')
        .map(b => ({ name: str(b.name), text: str(b.text), effects: effectsOf(b.effects) }))
      // The feat's introduction is the overview benefit; the prose repeats it.
      return {
        ...emptyForm('feat', ''),
        ...base,
        description: overview ? str(overview.text) : '',
        featKind: str(fm.kind) as FeatForm['featKind'],
        prerequisite: str(fm.prerequisite),
        benefits: benefits.length > 0 ? benefits : [{ name: '', text: '', effects: [] }],
      }
    }
  }
}

/** A value with its keys sorted, so `{a, b}` and `{b, a}` compare equal. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map(k => [k, canonical((value as Record<string, unknown>)[k])]),
    )
  }
  return value
}

const same = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
const show = (v: unknown) => JSON.stringify(v)

/** Prose as compared: line endings and trailing spaces do not count. */
const normalised = (text: string) =>
  lineSplit(text)
    .map(l => l.replace(/\s+$/, ''))
    .join('\n')
    .trim()

/** How many fences a body holds: one is the kind's own, any other is the GM's. */
const fenceCount = (body: string) => lineSplit(body).filter(l => /^\s{0,3}(`{3,}|~{3,})/.test(l)).length

/**
 * What differs, as data, between the note on disk and the note the form would
 * write, a sentence each. Empty means a save would keep everything.
 */
export function differences(
  original: { frontmatter: Record<string, unknown>; body: string; fence: unknown; prose: string },
  rebuilt: { frontmatter: Record<string, unknown>; body: string; fence: unknown; prose: string },
): string[] {
  const out: string[] = []
  const keys = [...new Set([...Object.keys(original.frontmatter), ...Object.keys(rebuilt.frontmatter)])]
  for (const key of keys) {
    const was = original.frontmatter[key]
    const would = rebuilt.frontmatter[key]
    if (would === undefined) out.push(`The property "${key}" has no field in the form, so a save would drop it.`)
    else if (was === undefined) out.push(`The form would add the property "${key}" (${show(would)}), which the note does not have.`)
    else if (!same(was, would)) out.push(`The property "${key}" is ${show(was)} in the note; the form would write ${show(would)}.`)
  }
  if (!same(original.fence ?? null, rebuilt.fence ?? null)) out.push('The note’s block holds something the form cannot: a save would rewrite it.')
  if (fenceCount(original.body) !== fenceCount(rebuilt.body)) out.push('The note has a code block the form does not write.')
  if (normalised(original.prose) !== normalised(rebuilt.prose)) out.push('The note’s text has something the form cannot place: a heading, a facts line or prose edited by hand.')
  return out
}

/**
 * Open a saved note in its builder: the form, or why not (MYDND-272).
 *
 * Refused for good when it carries `export_hash` (an exported note stays
 * read-only, ADR 0014); refused while its frontmatter does not parse, while
 * its catalog does not list it, or while anything in it would not survive a
 * save. A refusal is a list of sentences, the page shows them all.
 */
export async function loadNote(kind: BuilderKind, path: string, text: string): Promise<LoadedNote> {
  let doc: ReturnType<typeof parseNote>
  try {
    doc = parseNote(text)
  } catch (e) {
    return { ok: false, reasons: [e instanceof Error ? e.message : String(e)] }
  }
  const fm = doc.frontmatter
  if (fm.export_hash !== undefined) {
    return { ok: false, reasons: ['This note was written by the exporter (it has export_hash). An exported note stays read-only here: copy it into a new homebrew note instead.'] }
  }

  const slug = stemOf(path)
  const catalogKey = BUILDER_CATALOG[kind]
  const catalog = noteCompendium(slug, text)[catalogKey]
  const listed = (catalog.list() as unknown as Array<{ id: string }>).some(r => r.id === slug)
  if (!listed) return { ok: false, reasons: [`The ${catalogKey} catalog does not read this note as a ${BUILDER_LABEL[kind]}, so its builder cannot open it.`] }
  const detail = await catalog.detail(slug)
  if (!detail) return { ok: false, reasons: ['The note lists, but does not open.'] }

  const form = formOf(kind, fm, detail.fence, detail.prose)
  const built = buildNote(form)
  const reasons: string[] = []
  if (built.slug !== slug) {
    reasons.push(`The file is named ${slug}.md, but its title "${str(fm.title)}" saves as ${built.fileName}. Rename the file or the title in Obsidian so they match.`)
  }
  const rebuiltDetail = await noteCompendium(built.slug || slug, built.text)[catalogKey].detail(built.slug || slug)
  const rebuilt = parseNote(built.text)
  reasons.push(
    ...differences(
      { frontmatter: fm, body: doc.body, fence: detail.fence, prose: detail.prose },
      { frontmatter: rebuilt.frontmatter, body: rebuilt.body, fence: rebuiltDetail?.fence ?? null, prose: rebuiltDetail?.prose ?? '' },
    ),
  )
  return reasons.length > 0 ? { ok: false, reasons } : { ok: true, form }
}
