// @ts-check
// The sub-choices an Origin Feat asks for at creation time, and what those
// picks resolve to — VAULT-167.
//
// Four 2024 origin feats are useless without a follow-up question. Magic
// Initiate grants two cantrips and a level 1 spell "of your choice"; Skilled
// grants three skills or tools "of your choice"; Crafter grants three of the
// Fast Crafting table's artisan's tools; Musician three instruments (added by VAULT-176). Until this file, the builder asked none of them, so an Acolyte reached
// the character sheet with Magic Initiate named on it and no Sacred Flame.
//
// ## Why the spec is here and not on the catalog row
//
// `content_feat.data.benefits[]` for all three carries prose and **no
// `effects[]` at all** — the mechanics were never authored. Saying "this feat
// asks for two cantrips" in the catalog would need `*_choice` effect types that
// do not exist, so it would be a widening of the closed vocabulary in
// `effects.js` plus a migration, to describe three rows.
//
// This is the smaller shape: a table keyed by feat name, in `apps/vault/src/lib`
// for `featEffectSchema.js`'s reason — it is a description of a **form**, not of
// the rules, and the derivation layer must never consult it. The cost is stated
// plainly: a homebrew feat cannot declare sub-choices, and a GM who renames
// "Magic Initiate" loses its picker. Both are recoverable; a half-migrated
// vocabulary is not.
//
// ## What the picks become
//
// Concrete effects in the existing vocabulary, resolved the same way
// `ability_score_choice` + the player's `abilityBonus` already resolve inside
// `featToEffects`. Nothing downstream learns a new shape: `vaultGrantedSpells`
// already renders a `spell_grant` and already carries a per-spell `ability`,
// `vaultToolProficiencies` already lists a `tool_proficiency`, and the sheet
// already scores a `skill_proficiency`.

import { TOOL_SLUGS, toolName, toolSlugsIn } from './tools.js'
import { VAULT_SKILLS } from './vaultDerive.js'

export { toolName }

/** @typedef {import('./effects.js').Effect} Effect */
/**
 * What one feat asks for, by `kind`. Each kind has its own fields, and every
 * reader below branches on `kind` before it reads them.
 *
 * @typedef {{ kind: 'spells', lists: readonly string[], abilities: readonly string[], cantripCount: number, spellCount: number, spellLevel: number, cantripBenefitKey: string, spellBenefitKey: string }} SpellsSpec
 * @typedef {{ kind: 'proficiencies', count: number, allowsSkills: boolean, toolSlugs: readonly string[], slotLabel: string, benefitKey: string }} ProficienciesSpec
 * @typedef {{ kind: 'chosen_spells', count: number | 'proficiency_bonus', spellLevel: number, schools: readonly string[] | null, ritual: boolean, fixedSpells: readonly string[], freeCast: boolean, abilityFromIncrease: boolean, benefitKey: string }} ChosenSpellsSpec
 * @typedef {{ kind: 'damage_type', options: readonly string[], benefitKey: string }} DamageTypeSpec
 * @typedef {{ label: string, grant: 'proficiency' | 'expertise' | 'proficiency_or_expertise', from: readonly string[] | null, benefitKey: string }} SkillSlot
 * @typedef {{ kind: 'skills', slots: readonly SkillSlot[] }} SkillsSpec
 * @typedef {SpellsSpec | ProficienciesSpec | ChosenSpellsSpec | DamageTypeSpec | SkillsSpec} OriginFeatSpec
 */
/** @typedef {{ spellId?: string | null, spellName?: string | null }} SpellPick */
/** @typedef {{ kind?: string | null, slug?: string | null }} ProficiencyPick */
/**
 * What the player picked, as `blankChoices` shapes it. Which fields are there
 * depends on the spec's kind.
 *
 * @typedef {{
 *   spellList?: string | null,
 *   ability?: string | null,
 *   cantrips?: readonly (SpellPick | null | undefined)[] | null,
 *   spells?: readonly (SpellPick | null | undefined)[] | null,
 *   damageType?: string | null,
 *   skills?: readonly (string | null | undefined)[] | null,
 *   picks?: readonly (ProficiencyPick | null | undefined)[] | null,
 * }} FeatChoices
 */
/** @typedef {{ abilityBonus?: string | null, skillProficiencies?: readonly string[] | null, proficiencyBonus?: number | null }} FeatContext */

/**
 * Whether `value` is one of `list`'s strings. `includes` would ask for a
 * string; a stored answer may be anything, and is simply not one of them.
 *
 * @param {readonly string[]} list
 * @param {unknown} value
 * @returns {value is string}
 */
const listHas = (list, value) => typeof value === 'string' && list.includes(value)

/**
 * Stored answers, read as the shape `blankChoices` writes. They come off a
 * note, so they are taken on trust, as they always were.
 *
 * @param {unknown} stored
 * @returns {FeatChoices | null | undefined}
 */
const asChoices = stored => /** @type {FeatChoices | null | undefined} */ (stored)

/** The three lists Magic Initiate may draw from, in the feat's own order. */
export const MAGIC_INITIATE_LISTS = Object.freeze(['Cleric', 'Druid', 'Wizard'])

/** The three abilities Magic Initiate may cast off. */
export const MAGIC_INITIATE_ABILITIES = Object.freeze(['int', 'wis', 'cha'])

// The eight tools Crafter picks from — VAULT-240. The feat reads "three different
// Artisan's Tools of your choice from the Fast Crafting table", and that table
// names only these. Until then Crafter offered all 17 artisan's tools
// (`toolSlugsIn('artisan')`), so Calligrapher's Supplies was a legal pick it is
// not. Hand-listed rather than a `tools.js` category because the table is this
// feat's rule, not a kind of tool; the test pins each slug to an artisan entry.
export const FAST_CRAFTING_TOOL_SLUGS = Object.freeze([
  'carpenters-tools',
  'leatherworkers-tools',
  'masons-tools',
  'potters-tools',
  'smiths-tools',
  'tinkers-tools',
  'weavers-tools',
  'woodcarvers-tools',
])

// The tools Skilled may pick: every tool, since "three skills or tools of your
// choice" names no category. Until VAULT-176 this was the 19 crafting tools,
// knowingly short of the feat — no Thieves' Tools, Gaming Sets or kits.
export const SKILLED_TOOL_SLUGS = TOOL_SLUGS

/** The ten Musical Instruments of the 2024 PHB, which Musician picks from. */
export const INSTRUMENT_SLUGS = Object.freeze(toolSlugsIn('instrument'))

/**
 * A skill slug's display name, or the slug when it names nothing.
 *
 * @param {string} slug
 * @returns {string}
 */
export function skillName(slug) {
  return VAULT_SKILLS.find(s => s.slug === slug)?.name ?? slug
}

// Keyed by the feat's name, lower-cased and whitespace-collapsed, because that
// is the only stable identifier a catalog row and a hardcoded table share — the
// uuid differs per environment and the source string is editable.
//
// `benefitKey` on each group is the `data.benefits[].key` the grant belongs to,
// so the effect addresses itself as `feat:<id>:<key>` exactly the way an
// authored one would and the sheet files the cantrips under "Two Cantrips"
// rather than under the feat as a whole.
/** @type {Readonly<Record<string, OriginFeatSpec>>} */
const SPECS = Object.freeze({
  'magic initiate': {
    kind: 'spells',
    lists: MAGIC_INITIATE_LISTS,
    abilities: MAGIC_INITIATE_ABILITIES,
    cantripCount: 2,
    spellCount: 1,
    spellLevel: 1,
    cantripBenefitKey: 'two_cantrips',
    spellBenefitKey: 'level_1_spell',
  },
  skilled: {
    kind: 'proficiencies',
    count: 3,
    allowsSkills: true,
    toolSlugs: SKILLED_TOOL_SLUGS,
    slotLabel: 'Skill or tool',
    benefitKey: 'overview',
  },
  crafter: {
    kind: 'proficiencies',
    count: 3,
    allowsSkills: false,
    toolSlugs: FAST_CRAFTING_TOOL_SLUGS,
    slotLabel: "Artisan's tools",
    benefitKey: 'tool_proficiency',
  },
  // VAULT-176. Left out of VAULT-167 because no list of instruments existed.
  musician: {
    kind: 'proficiencies',
    count: 3,
    allowsSkills: false,
    toolSlugs: INSTRUMENT_SLUGS,
    slotLabel: 'Instrument',
    benefitKey: 'instrument_training',
  },

  // --- VAULT-263: the general feats and the two replacement styles ----------
  //
  // None of these is an origin feat, so the web builder's origin slot never
  // offers them. They are here because the same question is asked wherever a
  // feat is taken (the plugin's Ability Score Improvement and Fighting Style
  // pickers), and `originFeatEffects` is already what bakes a held feat's picks.

  // Two Cleric (Druid) cantrips that count as Paladin (Ranger) spells, cast off
  // Charisma (Wisdom). The `spells` shape with one list and one ability:
  // `blankChoices` answers both, so only the cantrips are asked.
  'blessed warrior': {
    kind: 'spells',
    lists: Object.freeze(['Cleric']),
    abilities: Object.freeze(['cha']),
    cantripCount: 2,
    spellCount: 0,
    spellLevel: 1,
    cantripBenefitKey: 'overview',
    spellBenefitKey: 'overview',
  },
  'druidic warrior': {
    kind: 'spells',
    lists: Object.freeze(['Druid']),
    abilities: Object.freeze(['wis']),
    cantripCount: 2,
    spellCount: 0,
    spellLevel: 1,
    cantripBenefitKey: 'overview',
    spellBenefitKey: 'overview',
  },

  // "Choose one level 1 spell from the Divination or Enchantment school of
  // magic. You always have that spell and the Misty Step spell prepared", each
  // once per Long Rest without a slot, off the ability the feat increased.
  'fey touched': {
    kind: 'chosen_spells',
    count: 1,
    spellLevel: 1,
    schools: Object.freeze(['Divination', 'Enchantment']),
    ritual: false,
    fixedSpells: Object.freeze(['Misty Step']),
    freeCast: true,
    abilityFromIncrease: true,
    benefitKey: 'fey_magic',
  },
  'shadow touched': {
    kind: 'chosen_spells',
    count: 1,
    spellLevel: 1,
    schools: Object.freeze(['Illusion', 'Necromancy']),
    ritual: false,
    fixedSpells: Object.freeze(['Invisibility']),
    freeCast: true,
    abilityFromIncrease: true,
    benefitKey: 'shadow_magic',
  },
  // "A number of level 1 spells equal to your Proficiency Bonus that have the
  // Ritual tag", so the count grows with the character: `count` is a rule, read
  // through `chosenSpellCount` with the caller's Proficiency Bonus.
  'ritual caster': {
    kind: 'chosen_spells',
    count: 'proficiency_bonus',
    spellLevel: 1,
    schools: null,
    ritual: true,
    fixedSpells: Object.freeze([]),
    freeCast: false,
    abilityFromIncrease: true,
    benefitKey: 'ritual_spells',
  },

  // "Choose one of the following damage types". Stored, never baked: what it
  // does (spells ignore Resistance, a 1 on a spell's damage die reads as 2) has
  // no effect type, and a `dice_intervention` keyed on the damage type alone
  // would fire on a fire-damage *weapon* too. The sheet names the pick.
  'elemental adept': {
    kind: 'damage_type',
    options: Object.freeze(['acid', 'cold', 'fire', 'lightning', 'thunder']),
    benefitKey: 'energy_mastery',
  },

  // Skill picks, each with what it grants. `proficiency_or_expertise` is Keen
  // Mind's and Observant's "if you lack proficiency in the chosen skill, you gain
  // proficiency in it, and if you already have proficiency in it, you gain
  // Expertise" — decided at bake time from `context.skillProficiencies`, so a
  // background changed afterwards is never left behind.
  'skill expert': {
    kind: 'skills',
    slots: /** @type {readonly SkillSlot[]} */ (Object.freeze([
      { label: 'Skill proficiency', grant: 'proficiency', from: null, benefitKey: 'skill_proficiency' },
      { label: 'Expertise', grant: 'expertise', from: null, benefitKey: 'expertise' },
    ])),
  },
  'keen mind': {
    kind: 'skills',
    slots: /** @type {readonly SkillSlot[]} */ (Object.freeze([
      {
        label: 'Lore Knowledge',
        grant: 'proficiency_or_expertise',
        from: Object.freeze(['arcana', 'history', 'investigation', 'nature', 'religion']),
        benefitKey: 'lore_knowledge',
      },
    ])),
  },
  observant: {
    kind: 'skills',
    slots: /** @type {readonly SkillSlot[]} */ (Object.freeze([
      {
        label: 'Keen Observer',
        grant: 'proficiency_or_expertise',
        from: Object.freeze(['insight', 'investigation', 'perception']),
        benefitKey: 'keen_observer',
      },
    ])),
  },
})

// A hyphen reads as a space: the 2024 book prints "Fey-Touched" and
// "Shadow-Touched", the 2020 one "Fey Touched" (VAULT-263).
/**
 * @param {unknown} featName
 * @returns {string}
 */
function specKey(featName) {
  return String(featName ?? '').trim().toLowerCase().replace(/[\s-]+/g, ' ')
}

/**
 * The sub-choices this feat asks for, or null when it asks for none.
 *
 * Null is the common answer and is not an error — most origin feats (Savage Attacker,
 * Lucky, Tough, Alert) grant what they grant with nothing to decide.
 *
 * @param {unknown} featName
 * @returns {OriginFeatSpec | null}
 */
export function originFeatSpec(featName) {
  return SPECS[specKey(featName)] ?? null
}

/**
 * The Proficiency Bonus at a total character level — the one table every feat count reads.
 *
 * @param {unknown} level
 * @returns {number}
 */
export function proficiencyBonusAt(level) {
  const n = Math.max(1, Math.min(20, Number(level) || 1))
  return Math.floor((n - 1) / 4) + 2
}

/**
 * How many spells a `chosen_spells` spec asks for. A number is itself; Ritual
 * Caster's `'proficiency_bonus'` is the caller's bonus, or 2 (the bonus at the
 * level a general feat is first taken) when none is given.
 *
 * @param {OriginFeatSpec | null | undefined} spec
 * @param {FeatContext} [context]
 * @returns {number}
 */
export function chosenSpellCount(spec, { proficiencyBonus } = {}) {
  if (spec?.kind !== 'chosen_spells') return 0
  if (spec.count === 'proficiency_bonus') {
    const pb = Number(proficiencyBonus)
    return Number.isFinite(pb) && pb > 0 ? pb : 2
  }
  return Number(spec.count) || 0
}

/**
 * A blank choices object shaped for `spec`, for a feat just selected.
 *
 * A `spells` spec with a single list or a single ability answers that question
 * itself (Blessed Warrior casts Cleric cantrips off Charisma, and nothing else).
 * `context.proficiencyBonus` sizes Ritual Caster's list.
 *
 * @param {OriginFeatSpec | null | undefined} spec
 * @param {FeatContext} [context]
 */
export function blankChoices(spec, context = {}) {
  if (!spec) return null
  if (spec.kind === 'spells') {
    return {
      spellList: spec.lists.length === 1 ? spec.lists[0] : null,
      ability: spec.abilities.length === 1 ? spec.abilities[0] : null,
      cantrips: Array.from({ length: spec.cantripCount }, () => null),
      spells: Array.from({ length: spec.spellCount }, () => null),
    }
  }
  if (spec.kind === 'chosen_spells') {
    return { spells: Array.from({ length: chosenSpellCount(spec, context) }, () => null) }
  }
  if (spec.kind === 'damage_type') return { damageType: null }
  if (spec.kind === 'skills') return { skills: spec.slots.map(() => null) }
  return { picks: Array.from({ length: spec.count }, () => null) }
}

/**
 * Whether every question `spec` asks has an answer.
 *
 * Drives the incomplete-field outline, not a hard gate — a half-finished pick is
 * saved as it stands, the way every other builder choice is, because a player
 * who leaves the step and comes back should find their two cantrips still there.
 *
 * `context.proficiencyBonus` is Ritual Caster's count; a level that raises it
 * leaves the feat short again, as a new invocation slot does.
 *
 * @param {OriginFeatSpec | null | undefined} spec
 * @param {unknown} stored the stored answers, read as `FeatChoices`
 * @param {FeatContext} [context]
 * @returns {boolean}
 */
export function choicesComplete(spec, stored, context = {}) {
  const choices = asChoices(stored)
  if (!spec) return true
  if (!choices) return false
  if (spec.kind === 'spells') {
    if (!choices.spellList || !choices.ability) return false
    const cantrips = choices.cantrips ?? []
    const spells = choices.spells ?? []
    return cantrips.filter(Boolean).length === spec.cantripCount
      && spells.filter(Boolean).length === spec.spellCount
  }
  if (spec.kind === 'chosen_spells') {
    return (choices.spells ?? []).filter(p => p?.spellName).length >= chosenSpellCount(spec, context)
  }
  if (spec.kind === 'damage_type') return listHas(spec.options, choices.damageType)
  if (spec.kind === 'skills') {
    const skills = choices.skills ?? []
    return spec.slots.every((slot, i) => Boolean(skills[i]) && (!slot.from || listHas(slot.from, skills[i])))
  }
  return (choices.picks ?? []).filter(Boolean).length === spec.count
}

/**
 * Whether a spell note may fill a `chosen_spells` slot: its level, its school
 * when the feat names schools, its Ritual tag when the feat wants one.
 *
 * `spell` is `{ level, school, ritual }`; a school is compared by name, ignoring
 * case, because the notes write `Divination` and 5e.tools writes `D`.
 *
 * @param {OriginFeatSpec | null | undefined} spec
 * @param {{ level?: unknown, school?: unknown, ritual?: unknown } | null | undefined} spell
 * @returns {boolean}
 */
export function chosenSpellAllowed(spec, spell) {
  if (spec?.kind !== 'chosen_spells' || !spell) return false
  if (Number(spell.level) !== spec.spellLevel) return false
  if (spec.ritual && !spell.ritual) return false
  if (spec.schools) {
    const school = String(spell.school ?? '').trim().toLowerCase()
    if (!spec.schools.some(s => s.toLowerCase() === school)) return false
  }
  return true
}

// A pick is stored as `{ spellId, spellName }` rather than as a bare id because
// the derivation layer reads `character.json` alone and cannot look a spell back
// up — the same reason `SpellChoicePicker` stores full entries. `spell_grant`
// takes a name and treats `spellId` as optional (Ruling 2), so a spell later
// deleted from the catalog still reads correctly on the sheet.
/**
 * @param {SpellPick} pick
 * @param {string} mode
 * @param {string | null | undefined} ability
 * @param {string} benefitKey
 * @returns {Effect}
 */
function spellGrant(pick, mode, ability, benefitKey) {
  return {
    type: 'spell_grant',
    mode,
    spell: pick.spellName,
    ...(pick.spellId ? { spellId: pick.spellId } : {}),
    ...(ability ? { ability } : {}),
    benefitKey,
  }
}

// Magic Initiate's level 1 spell is *also* castable once per long rest without a
// slot. Under Ruling 2 that free cast is a resource riding the same benefit
// rather than a second `spell_grant` — `vaultGrantedSpells` deliberately ignores
// `mode: 'free_cast'` for exactly this reason.
//
// No `key`: baking adds the feat envelope, and `vaultFeatureResources` derives
// `feat:<id>:<benefitKey>` from it — the same key this used to spell out.
/**
 * @param {SpellPick} pick
 * @param {string} benefitKey
 * @returns {Effect}
 */
function freeCastResource(pick, benefitKey) {
  return {
    type: 'feature_resource',
    name: `${pick.spellName} (free cast)`,
    uses: 1,
    resets: 'long_rest',
    benefitKey,
  }
}

/**
 * The effects a feat's stored sub-choices resolve to.
 *
 * Pure, and free of the Supabase client on purpose — `effectBaking.js` calls it,
 * and that module has to stay importable by the E2E character seeder under plain
 * Node. The envelope (`source`, `sourceFeatureId`, `sourceKind`) is the caller's
 * job, exactly as it is for `featToEffects`.
 *
 * An unanswered question contributes nothing rather than a half-effect: a
 * `spell_grant` with no spell is skipped by `describeEffect` and by
 * `vaultGrantedSpells` in turn, which is an invisible failure, so it is never
 * built in the first place.
 *
 * `context` carries what a feat taken at an Ability Score Improvement needs and
 * the json alone does not hold in one place (VAULT-263): `abilityBonus`, the
 * ability the feat increased, which Fey Touched casts off; and
 * `skillProficiencies`, the skills held from everything else, which decide
 * whether Keen Mind's pick is proficiency or Expertise. Both are optional, and
 * the four origin feats read neither.
 *
 * @param {{ name?: string | null } | null | undefined} feat a `content_feat` row
 * @param {unknown} stored what the player picked, read as `FeatChoices`
 * @param {FeatContext} [context]
 * @returns {Effect[]} effects, without the envelope
 */
export function originFeatEffects(feat, stored, context = {}) {
  const choices = asChoices(stored)
  const spec = originFeatSpec(feat?.name)
  if (!spec) return []

  // Misty Step is Fey Touched's whatever the player chose, so it is granted
  // before (and without) an answer.
  if (spec.kind === 'chosen_spells') return chosenSpellEffects(spec, choices, context)
  if (!choices) return []

  if (spec.kind === 'damage_type' || spec.kind === 'skills') {
    return spec.kind === 'skills' ? skillEffects(spec, choices, context) : []
  }

  if (spec.kind === 'spells') {
    const ability = listHas(MAGIC_INITIATE_ABILITIES, choices.ability) ? choices.ability : null
    /** @type {Effect[]} */
    const out = []
    for (const pick of choices.cantrips ?? []) {
      if (pick?.spellName) out.push(spellGrant(pick, 'cantrip', ability, spec.cantripBenefitKey))
    }
    for (const pick of choices.spells ?? []) {
      if (!pick?.spellName) continue
      out.push(spellGrant(pick, 'prepared', ability, spec.spellBenefitKey))
      out.push(freeCastResource(pick, spec.spellBenefitKey))
    }
    return out
  }

  /** @type {Effect[]} */
  const out = []
  for (const pick of choices.picks ?? []) {
    if (!pick?.slug) continue
    if (pick.kind === 'skill') {
      out.push({ type: 'skill_proficiency', skill: pick.slug, benefitKey: spec.benefitKey })
    } else if (pick.kind === 'tool') {
      out.push({ type: 'tool_proficiency', tool: pick.slug, benefitKey: spec.benefitKey })
    }
  }
  return out
}

const ABILITIES = Object.freeze(['str', 'dex', 'con', 'int', 'wis', 'cha'])

// Fey Touched, Shadow Touched, Ritual Caster (VAULT-263). Each chosen spell, and
// each fixed one, is always prepared; Fey and Shadow Touched may also cast each
// once per Long Rest without a slot, keyed per spell so two spells are two uses.
// The ability is the one the feat's +1 went to, so a feat whose +1 is not yet
// named grants its spells with no ability rather than a guessed one.
/**
 * @param {ChosenSpellsSpec} spec
 * @param {FeatChoices | null | undefined} choices
 * @param {FeatContext} [context]
 * @returns {Effect[]}
 */
function chosenSpellEffects(spec, choices, { abilityBonus } = {}) {
  const ability = spec.abilityFromIncrease && listHas(ABILITIES, abilityBonus) ? abilityBonus : null
  /** @type {SpellPick[]} */
  const picks = [
    ...spec.fixedSpells.map(name => ({ spellName: name })),
    ...(choices?.spells ?? []).flatMap(p => (p?.spellName ? [p] : [])),
  ]
  /** @type {Effect[]} */
  const out = []
  for (const pick of picks) {
    out.push(spellGrant(pick, 'prepared', ability, spec.benefitKey))
    if (spec.freeCast) out.push(freeCastResource(pick, spec.benefitKey))
  }
  return out
}

// Skill Expert, Keen Mind, Observant (VAULT-263). A `proficiency_or_expertise`
// pick is Expertise only when the skill is already held from elsewhere —
// "if you lack proficiency in the chosen skill, you gain proficiency in it".
/**
 * @param {SkillsSpec} spec
 * @param {FeatChoices} choices
 * @param {FeatContext} [context]
 * @returns {{ type: 'expertise' | 'skill_proficiency', skill: string, benefitKey: string }[]}
 */
function skillEffects(spec, choices, { skillProficiencies = [] } = {}) {
  const held = new Set(skillProficiencies ?? [])
  /** @type {{ type: 'expertise' | 'skill_proficiency', skill: string, benefitKey: string }[]} */
  const out = []
  spec.slots.forEach((slot, i) => {
    const skill = choices.skills?.[i]
    if (!skill || (slot.from && !slot.from.includes(skill))) return
    const expertise = slot.grant === 'expertise' || (slot.grant === 'proficiency_or_expertise' && held.has(skill))
    out.push({ type: expertise ? 'expertise' : 'skill_proficiency', skill, benefitKey: slot.benefitKey })
  })
  return out
}

/**
 * What a feat's picks read as, one line each, for a sheet that lists them —
 * "Fire", "Arcana (Expertise)", "Detect Thoughts". Empty when nothing is chosen.
 * The sheet's feat row reads it, so Elemental Adept, which bakes nothing, still
 * shows what it was taken for.
 *
 * @param {unknown} featName
 * @param {unknown} stored the stored answers, read as `FeatChoices`
 * @param {FeatContext} [context]
 * @returns {string[]}
 */
export function featPickLabels(featName, stored, context = {}) {
  const choices = asChoices(stored)
  const spec = originFeatSpec(featName)
  if (!spec || !choices) return []
  if (spec.kind === 'damage_type') {
    return listHas(spec.options, choices.damageType) ? [capitalizeWord(choices.damageType)] : []
  }
  if (spec.kind === 'skills') {
    return skillEffects(spec, choices, context).map(e =>
      e.type === 'expertise' ? `${skillName(e.skill)} (Expertise)` : skillName(e.skill),
    )
  }
  if (spec.kind === 'chosen_spells') return (choices.spells ?? []).flatMap(p => (p?.spellName ? [p.spellName] : []))
  if (spec.kind === 'spells') {
    return [...(choices.cantrips ?? []), ...(choices.spells ?? [])].flatMap(p => (p?.spellName ? [p.spellName] : []))
  }
  return (choices.picks ?? []).flatMap(p => (p?.slug ? [p.kind === 'skill' ? skillName(p.slug) : toolName(p.slug)] : []))
}

/**
 * @param {string} s
 * @returns {string}
 */
function capitalizeWord(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
