// @ts-check
// Pure operations for the Level-Up flow. The Character Builder already knows
// how to resolve a class level's choices — this module is the narrow slice of
// that machinery a *finished* character needs: advance one class by one level,
// merge in the choices made for the new level, and carry the hit point gain
// across both columns that hold HP.
//
// Deliberately a merge rather than a rebuild. builderDraft.js's
// finalVaultJson() reconstructs the whole payload from the draft, which would
// discard anything written since the character was created: a feat added from
// the Features tab without an ability bonus lives in json.feats and in no
// featureChoices entry, so a rebuild would silently drop it. Level-up only ever
// *adds* — the earlier levels' choices are not editable here — so a union is
// both safer and simpler than a round trip through the draft shape.

import { vaultHp } from './vaultDerive.js'

/** @typedef {import('./effects.js').Effect} Effect */
/**
 * A character's json, as far as level-up reads it. Every function here that
 * hands one back spreads the one it was given, so the caller keeps its type.
 *
 * @typedef {{
 *   classes?: readonly { id?: unknown, level?: number | null }[] | null,
 *   featureChoices?: Readonly<Record<string, unknown>> | null,
 *   feats?: readonly { id?: unknown }[] | null,
 *   skillProficiencies?: readonly string[] | null,
 *   skillExpertise?: readonly string[] | null,
 * }} LevelJson
 */
/**
 * A level-up pick in `featureChoices`, as the readers below read it. A bare
 * array is a skill pick and is read apart.
 *
 * @typedef {{
 *   type?: string | null,
 *   featId?: string | null,
 *   featName?: string | null,
 *   featSource?: string | null,
 *   skills?: readonly string[] | null,
 * }} LevelChoice
 */
/** @typedef {{ id: string | null | undefined, name: string | null | undefined, source: string | null }} ChoiceFeat */

/**
 * @param {Readonly<Record<string, unknown>> | null | undefined} featureChoices
 * @returns {(LevelChoice | null | undefined)[]}
 */
const choicesOf = featureChoices => /** @type {(LevelChoice | null | undefined)[]} */ (Object.values(featureChoices ?? {}))

/**
 * @param {LevelJson | null | undefined} json
 * @returns {number}
 */
export function totalLevelOf(json) {
  return (json?.classes ?? []).reduce((sum, c) => sum + (c.level ?? 0), 0)
}

// A character is at the cap when its levels sum to 20, regardless of how they
// are split across classes.
/**
 * @param {LevelJson | null | undefined} json
 * @returns {boolean}
 */
export function atLevelCap(json) {
  return totalLevelOf(json) >= 20
}

// Advance one existing class row by a level. Returns a new classes array.
/**
 * @template {{ level?: number | null }} C
 * @param {readonly C[] | null | undefined} classes
 * @param {number} index
 * @returns {C[]}
 */
export function withClassAdvanced(classes, index) {
  return (classes ?? []).map((c, i) => (i === index ? { ...c, level: (c.level ?? 0) + 1 } : c))
}

// Take the first level of a class the character does not have yet. `cls` is a
// content_class row; hit_die and the spellcasting ability are copied onto the
// row because character.json is the authority for a finished character — the
// sheet derives HP from it without re-reading the catalog.
/**
 * @template C
 * @param {readonly C[] | null | undefined} classes
 * @param {{ id?: string | null, name?: string | null, source?: string | null, hit_die?: number | null, spellcasting_ability?: string | null }} cls a `content_class` row
 * @param {{ spellcastingAbility?: string | null }} [opts]
 * @returns {(C | { id: string | null | undefined, name: string | null | undefined, source: string | null, level: number, subclass: null, hit_die: number | null, spellcastingAbility: string | null })[]}
 */
export function withClassGained(classes, cls, { spellcastingAbility = null } = {}) {
  return [
    ...(classes ?? []),
    {
      id: cls.id,
      name: cls.name,
      source: cls.source ?? null,
      level: 1,
      subclass: null,
      hit_die: cls.hit_die ?? null,
      spellcastingAbility: cls.spellcasting_ability === 'flexible'
        ? spellcastingAbility
        : cls.spellcasting_ability ?? null,
    },
  ]
}

// True when the character already has a row for this class id.
/**
 * @param {LevelJson | null | undefined} json
 * @param {unknown} classId
 * @returns {boolean}
 */
export function hasClass(json, classId) {
  return (json?.classes ?? []).some(c => c.id === classId)
}

/**
 * @template {{ id?: unknown }} E
 * @template {{ id?: unknown }} A
 * @param {readonly E[] | null | undefined} existing
 * @param {readonly A[]} added
 * @returns {(E | A)[]}
 */
function unionById(existing, added) {
  /** @type {(E | A)[]} */
  const out = [...(existing ?? [])]
  for (const entry of added) {
    if (!entry?.id) continue
    if (out.some(e => e.id === entry.id)) continue
    out.push(entry)
  }
  return out
}

// Feats granted by the choices made during this level-up. Mirrors the shape
// builderDraft.baseJson() writes, so the two agree on what a feat entry is.
/**
 * @param {Readonly<Record<string, unknown>> | null | undefined} featureChoices
 * @returns {ChoiceFeat[]}
 */
export function featsFromChoices(featureChoices) {
  return choicesOf(featureChoices)
    .filter(c => c?.type === 'feat' || c?.type === 'boon')
    .map(c => ({ id: c?.featId, name: c?.featName, source: c?.featSource ?? null }))
    .filter(f => f.id)
}

// Bare-array featureChoices are skill picks (see builderDraft.baseJson).
/**
 * @param {Readonly<Record<string, unknown>> | null | undefined} featureChoices
 * @returns {string[]}
 */
export function skillsFromChoices(featureChoices) {
  // `Array.isArray` answers `any[]`; it is said as `unknown[]` before it leaves.
  return /** @type {string[]} */ (Object.values(featureChoices ?? {})
    .flatMap(c => (Array.isArray(c) ? /** @type {unknown[]} */ (c) : [])))
}

/**
 * @param {Readonly<Record<string, unknown>> | null | undefined} featureChoices
 * @returns {string[]}
 */
export function expertiseFromChoices(featureChoices) {
  return choicesOf(featureChoices)
    .filter(c => c?.type === 'expertise')
    .flatMap(c => c?.skills ?? [])
}

// The level-up patch. `classes` is the already-advanced array and
// `featureChoices` the full map (old entries plus the new level's), because the
// pickers in LevelProgressionAccordions are keyed by feature id and write into
// one map.
/**
 * @template {LevelJson} J
 * @template {readonly unknown[]} C
 * @param {J} json
 * @param {{ classes: C, featureChoices?: Readonly<Record<string, unknown>> | null }} patch
 */
export function levelUpJson(json, { classes, featureChoices }) {
  const choices = featureChoices ?? json?.featureChoices ?? {}
  return {
    ...json,
    classes,
    featureChoices: choices,
    feats: unionById(json?.feats, featsFromChoices(choices)),
    skillProficiencies: [...new Set([
      ...(json?.skillProficiencies ?? []),
      ...skillsFromChoices(choices),
    ])],
    skillExpertise: [...new Set([
      ...(json?.skillExpertise ?? []),
      ...expertiseFromChoices(choices),
    ])],
  }
}

// The hit points the level buys, measured the way the sheet measures them:
// vaultHp() is the same function deriveCharacterSheet calls, so a class with an
// odd hit die, a Tough feat's hp_bonus_per_level, and a Constitution bumped by
// this very level-up's ASI are all accounted for without restating the rules.
/**
 * @param {{ json?: { resolvedEffects?: readonly Effect[] | null } | null } | null | undefined} character
 * @param {{ resolvedEffects?: readonly Effect[] | null } | null | undefined} nextJson
 * @returns {number}
 */
export function hpGain(character, nextJson) {
  const before = vaultHp(character, character?.json?.resolvedEffects ?? []).max
  const after = vaultHp({ ...character, json: nextJson }, nextJson?.resolvedEffects ?? []).max
  return Math.max(0, after - before)
}

// PHB 2024: raising the hit point maximum raises current hit points by the same
// amount. json.hp is the pre-damage baseline; vault_state.hp.current overrides
// it once the character has taken a hit, so both have to move (see
// vaultState.gainMaxHp for the other half).
/**
 * @template {{ hp?: { max?: number | null, current?: number | null } | null }} J
 * @param {J} json
 * @param {number} gain
 */
export function withHpGain(json, gain) {
  if (!gain) return json
  const hp = json?.hp ?? {}
  return {
    ...json,
    hp: {
      ...hp,
      max: (hp.max ?? 0) + gain,
      current: (hp.current ?? 0) + gain,
    },
  }
}
