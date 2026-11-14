// @ts-check
// Pure roll-resolution engine. Owns all dice *mechanics* — building the groups
// to roll, adding the extra d20 for advantage/disadvantage, applying the
// keep-highest/lowest rule, and totalling. It is deliberately ignorant of *how*
// the faces are produced: that is a roller adapter's job.
//
// A roller is `(groups) => results | Promise<results> | null`, where
// `groups` is `[{ qty, sides, damageType? }]` and `results` is aligned by index
// as `[{ results: number[] }]`. Returning `null`/throwing/wrong-length signals
// the engine to fall back. `rngRoller` (here) is one; the other is the plugin's
// Atlas VTT bridge, `src/dice/obsidian/atlas.ts`.

import { rollDice } from './diceUtils.js'
import { DICE_INTERVENTION_MODES, readEnvelope, effectKey } from './effects.js'
import { weaponMatches } from './weaponActions.js'

/** @typedef {import('./effects.js').Effect} Effect */
/** @typedef {import('./weaponActions.js').Weapon} Weapon */
/** @typedef {import('./weaponActions.js').SwingContext} SwingContext */
/** @typedef {'normal' | 'advantage' | 'disadvantage'} RollMode */
/** @typedef {{ count: number, sides: number, damageType?: string | null }} DiceSpec */
/** @typedef {{ qty: number, sides: number, damageType: string | null }} RollGroup */
/** @typedef {{ results: number[] }} RolledGroup */
/**
 * A roller adapter: the faces for each group, aligned by index, or null.
 *
 * @typedef {(groups: RollGroup[]) => RolledGroup[] | null | Promise<RolledGroup[] | null>} Roller
 */
/** @typedef {{ index: number, from: number, to: number }} Replacement */
/**
 * One group of a resolved roll: what was asked for, the faces it shows, and
 * what advantage discarded or an intervention replaced.
 *
 * @typedef {DiceSpec & { results: number[], dropped?: number[], replaced?: Replacement[] }} RolledDie
 */
/** @typedef {{ dice: RolledDie[], total: number, modifier: number }} ResolvedRoll */
/** @typedef {{ groupIndex: number, dieIndex: number, face: number, sides: number, damageType: string | null }} Face */
/**
 * A `dice_intervention` effect: the envelope and the payload Ruling 12 names.
 *
 * @typedef {Effect & { scope?: string | readonly string[] | null, dice?: string | null, frequency?: string | null, prompt?: string | null }} InterventionEffect
 */
/**
 * @typedef {{
 *   key: string | null,
 *   mode: InterventionMode,
 *   source: string | null,
 *   benefitKey: string | null,
 *   frequency: string | null,
 *   prompt: string | null,
 *   to: number | null,
 *   faces: Face[],
 *   targets: Face[],
 *   total: number,
 *   nextTotal: number | null,
 * }} InterventionOffer
 */
/** @typedef {SwingContext & { rollType?: string | null, weapon?: Weapon | null, modifier?: number }} InterventionContext */
/** @typedef {'floor' | 'reroll' | 'twice'} InterventionMode */

// Builds the physical groups to roll. For advantage/disadvantage, appends one
// extra d20 mirroring the first d20 group's damageType (so its 3D colour
// matches). `extraIndex` is the appended group's index, or -1 when no d20.
/**
 * @param {readonly DiceSpec[]} dice
 * @param {RollMode} mode
 * @returns {{ groups: RollGroup[], extraIndex: number }}
 */
function buildGroups(dice, mode) {
  /** @type {RollGroup[]} */
  const groups = dice.map(d => ({ qty: d.count, sides: d.sides, damageType: d.damageType ?? null }))
  let extraIndex = -1
  if (mode === 'advantage' || mode === 'disadvantage') {
    const i = groups.findIndex(g => g.sides === 20)
    if (i !== -1) {
      extraIndex = groups.length
      groups.push({ qty: 1, sides: 20, damageType: groups[i].damageType })
    }
  }
  return { groups, extraIndex }
}

// Applies advantage/disadvantage to the first d20 group in place, keeping the
// max (advantage) or min (disadvantage) of its rolled face and the extra die,
// and recording the discarded value under `dropped`.
/**
 * @param {{ sides: number, results: number[], dropped?: number[] }[]} dice
 * @param {RollMode} mode
 * @param {number | null | undefined} extra
 * @returns {void}
 */
function applyKeep(dice, mode, extra) {
  if (mode === 'normal' || extra == null) return
  const d20 = dice.find(d => d.sides === 20)
  if (!d20) return
  const a = d20.results[0], b = extra
  d20.results[0] = mode === 'advantage' ? Math.max(a, b) : Math.min(a, b)
  d20.dropped = [mode === 'advantage' ? Math.min(a, b) : Math.max(a, b)]
}

/**
 * @param {unknown} rolled
 * @param {readonly RollGroup[]} groups
 * @returns {rolled is RolledGroup[]}
 */
function isValid(rolled, groups) {
  if (!Array.isArray(rolled)) return false
  const list = /** @type {readonly ({ results?: readonly unknown[] } | null | undefined)[]} */ (rolled)
  return groups.every((g, i) => list[i]?.results?.length === g.qty)
}

/**
 * @param {Roller | null | undefined} roller
 * @param {RollGroup[]} groups
 * @returns {Promise<RolledGroup[] | null>}
 */
async function tryRoller(roller, groups) {
  if (!roller) return null
  try {
    const rolled = await roller(groups)
    return isValid(rolled, groups) ? rolled : null
  } catch {
    return null
  }
}

// The plain-RNG roller — pure and always succeeds. Used as the default fallback.
/**
 * @param {readonly RollGroup[]} groups
 * @returns {RolledGroup[]}
 */
export function rngRoller(groups) {
  return groups.map(g => ({ results: rollDice(g.qty, g.sides) }))
}

// Resolves a roll to its per-group results and total. Tries `roller`, falls back
// to `fallback` (default RNG) when the primary is unavailable or returns an
// invalid shape, so the recorded log always reflects the dice that were read —
// never a second, independent RNG draw that disagrees with the rendered dice.
/**
 * @template {DiceSpec} D
 * @param {{ dice: readonly D[], mode?: RollMode, modifier?: number }} roll
 * @param {{ roller?: Roller | null, fallback?: Roller | null }} [adapters]
 * @returns {Promise<{ dice: (D & { results: number[], dropped?: number[] })[], total: number, modifier: number }>}
 */
export async function resolveRoll({ dice, mode = 'normal', modifier = 0 }, { roller, fallback = rngRoller } = {}) {
  const { groups, extraIndex } = buildGroups(dice, mode)

  let rolled = await tryRoller(roller, groups)
  if (!rolled) rolled = await tryRoller(fallback, groups)
  rolled ??= rngRoller(groups)

  /** @type {(D & { results: number[], dropped?: number[] })[]} */
  const out = dice.map((d, i) => ({ ...d, results: rolled[i].results.slice() }))
  applyKeep(out, mode, extraIndex !== -1 ? rolled[extraIndex].results[0] : null)

  // `modifier` rides back out so an intervention can re-total the same roll
  // without the caller having to remember what it passed in.
  return { dice: out, total: totalOf(out, modifier), modifier }
}

// ---------------------------------------------------------------------------
// Dice interventions — Ruling 12 / VAULT-85
// ---------------------------------------------------------------------------
//
// A `dice_intervention` effect **rewrites a die face on the roll being made**.
// Anything that adds a roll, or changes advantage state, is a granted Reaction
// and never reaches here — `applyKeep` above already owns advantage, and a
// second path to it would let two mechanisms disagree about one roll.
//
// Everything in this section is pure. The prompt, the second visible throw and
// the log entry are `DiceRollerProvider`'s job; deciding *what may be offered*
// and *what the result becomes* is this file's, so both are testable without a
// 3D roller and without React.
//
// **The offer is never applied on its own.** Every book case is "you can", so
// the pure half hands back a description of a choice and nothing else.

/**
 * @param {readonly { results: readonly number[] }[] | null | undefined} dice
 * @param {number} [modifier]
 * @returns {number}
 */
export function totalOf(dice, modifier = 0) {
  return (dice ?? []).flatMap(d => d.results).reduce((a, b) => a + b, 0) + modifier
}

// How many dice one mode touches by default. `floor` fixes every qualifying die
// (Great Weapon Fighting), `reroll` takes one (Piercer), `twice` re-throws the
// whole bundle (Savage Attacker). An effect may narrow `floor` to `one`; it may
// not widen `reroll`, because "reroll one of the damage dice" is the book's own
// wording and a `dice: 'all'` reroll would be a different feat.
/**
 * @type {Readonly<Record<string, string>>}
 */
const DEFAULT_SCOPE_OF_DICE = Object.freeze({ floor: 'all', reroll: 'one', twice: 'bundle' })

// Every face in the bundle, addressed so an offer can name the ones it touches
// without the component having to re-walk the groups.
//
// `damageType` rides along per *die* rather than per roll, because a group is
// what carries one — a flame tongue's damage is 1d8 piercing and 1d6 fire in two
// groups, and Piercer may only touch the first. The offer already reported it
// (`damageType: dice[t.groupIndex]?.damageType`); now the predicate can read it.
/**
 * @param {readonly RolledDie[] | null | undefined} dice
 * @returns {Face[]}
 */
function flatFaces(dice) {
  /** @type {Face[]} */
  const faces = []
  const groups = dice ?? []
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const results = groups[groupIndex].results ?? []
    for (let dieIndex = 0; dieIndex < results.length; dieIndex += 1) {
      faces.push({
        groupIndex,
        dieIndex,
        face: results[dieIndex],
        sides: groups[groupIndex].sides,
        damageType: groups[groupIndex].damageType ?? null,
      })
    }
  }
  return faces
}

// Whether an effect's `scope` admits this roll.
//
// **A scope that cannot be evaluated does not fire.** An effect scoped to damage
// rolls, asked about a roll whose type nobody recorded, is a question with no
// answer — and offering it anyway would put Great Weapon Fighting on an
// Intelligence check. Same direction as the weapon predicate below, and as
// VAULT-83's orphaned fighting-style replacement resolving to nobody.
/**
 * @param {InterventionEffect} effect
 * @param {string | null} rollType
 * @returns {boolean}
 */
function scopeAdmits(effect, rollType) {
  if (effect.scope == null) return true
  /** @type {readonly unknown[]} */
  const scopes = Array.isArray(effect.scope) ? effect.scope : [effect.scope]
  if (scopes.length === 0) return true
  return rollType != null && scopes.includes(rollType)
}

// The `weapon` predicate, answered with `weaponActions.js`'s matcher rather than
// a second copy of it — the same argument that put `effectApplies` in one place.
// With no weapon in context a predicated effect is refused, never waved through.
/**
 * @param {InterventionEffect} effect
 * @param {InterventionContext} ctx
 * @returns {boolean}
 */
function weaponAdmits(effect, ctx) {
  if (!effect.weapon) return true
  if (!ctx.weapon) return false
  return weaponMatches(effect.weapon, ctx.weapon, ctx)
}

// The `damageType` predicate — Piercer's "an attack that deals Piercing damage",
// asked of one die.
//
// It narrows *dice* rather than weapons, which is why it is not a key on the
// `weapon` predicate: the same greatsword swing can roll piercing and fire dice
// together, and a weapon-level answer could only be right about the whole bundle.
//
// **A die whose type nobody recorded is refused**, the same direction as
// `scopeAdmits` and `weaponAdmits`. An unrecorded damage type is a question with
// no answer, and waving it through would offer Piercer on a club.
/**
 * @param {InterventionEffect} effect
 * @param {Face} face
 * @returns {boolean}
 */
function damageAdmits(effect, face) {
  if (effect.damageType == null) return true
  return face.damageType === effect.damageType
}

// Which faces this effect would act on. Empty means there is nothing to offer,
// which is the common case and is not a failure.
/**
 * @param {InterventionEffect} effect
 * @param {Face[]} faces
 * @returns {Face[]}
 */
function targetsFor(effect, faces) {
  const scope = effect.dice ?? DEFAULT_SCOPE_OF_DICE[effect.mode ?? '']

  // `twice` re-throws the whole bundle — `applyTwice` replaces every group — so
  // a damage type **gates** the offer rather than narrowing it. Filtering the
  // targets here would promise a partial re-throw the applier cannot perform.
  if (effect.mode === 'twice') return faces.some(f => damageAdmits(effect, f)) ? faces : []

  // `on` names the faces that qualify. A `floor` with no `on` takes every face
  // below `to`, which is the same rule written the other way round; a `reroll`
  // with no `on` takes any face, because Piercer's is unconditional.
  /** @param {number} face */
  const qualifies = (face) => {
    if (Array.isArray(effect.on) && effect.on.length > 0) return effect.on.includes(face)
    return effect.mode === 'floor' ? face < /** @type {number} */ (effect.to) : true
  }

  // A floor never *lowers* a die. An `on: [1, 2]` with `to: 3` and a face of 5
  // is a content error rather than a downgrade, and refusing it here is cheaper
  // than explaining it on a character sheet.
  // `interventions` only lets a floor through with a numeric `to`.
  const to = /** @type {number} */ (effect.to)
  const eligible = faces.filter(f => damageAdmits(effect, f) && qualifies(f.face) && (effect.mode !== 'floor' || f.face < to))
  if (eligible.length === 0) return []
  if (scope !== 'one') return eligible

  // One die, and it is the worst one — the die a player would pick anyway, and
  // the only choice that needs no second prompt.
  return [eligible.reduce((worst, f) => (f.face < worst.face ? f : worst))]
}

/**
 * The interventions on offer for a roll that has already been read.
 *
 * Pure, so all three modes are unit-testable without the 3D roller. It decides
 * *what may be offered* and never applies anything: every book case is "you
 * can", so declining has to remain possible right up to the component.
 *
 * **The head of the list is the one prompted.** The ticket's constraint is that
 * an intervention fires at most once per roll, and the order is the order the
 * effects arrived in — which is the bake order, so it is stable. Ranking them by
 * how much each would gain was the alternative and it is worse: it would be the
 * app choosing which of a player's feats they use. The rest are returned rather
 * than dropped so a caller can say how many it did not show.
 *
 * @param {readonly RolledDie[] | null | undefined} dice   the resolved groups from `resolveRoll`
 * @param {readonly unknown[] | null | undefined} effects gated effects — `applicableEffects()` has already run
 * @param {InterventionContext} [ctx] `rollType` ('damage', 'attack', …) is matched against `scope`; `weapon` is the resolved weapon, for a `weapon` predicate; `twoHanded` is the grip, not the weapon (see `weaponMatches`); `sole` means no other weapon equipped; `ability` is the ability the attack actually used; `modifier` is the roll's flat modifier, for `nextTotal`
 * @returns {InterventionOffer[]} offers, most-preferred first
 */
export function interventions(dice, effects, ctx = {}) {
  const faces = flatFaces(dice)
  if (faces.length === 0) return []

  const modifier = ctx.modifier ?? 0
  const total = totalOf(dice, modifier)
  /** @type {InterventionOffer[]} */
  const offers = []

  for (const raw of effects ?? []) {
    // Read as an intervention effect, as before; `type` decides whether it is one.
    const effect = /** @type {InterventionEffect | null | undefined} */ (raw)
    if (effect?.type !== 'dice_intervention') continue
    if (!DICE_INTERVENTION_MODES.includes(effect.mode ?? '')) continue
    const mode = /** @type {InterventionMode} */ (effect.mode)
    // A floor with no target is not a weaker floor, it is an unauthored one.
    if (mode === 'floor' && typeof effect.to !== 'number') continue
    if (!scopeAdmits(effect, ctx.rollType ?? null)) continue
    if (!weaponAdmits(effect, ctx)) continue

    const targets = targetsFor(effect, faces)
    if (targets.length === 0) continue

    const envelope = readEnvelope(effect)
    const floorTo = typeof effect.to === 'number' ? effect.to : 0
    const gain = mode === 'floor'
      ? targets.reduce((sum, t) => sum + (floorTo - t.face), 0)
      : null

    offers.push({
      key: effectKey(effect),
      mode,
      source: envelope.source,
      benefitKey: envelope.benefitKey,
      // `frequency` is printed, never counted. The app does not know whose turn
      // it is and is not going to — "once per turn" is a reminder to the table,
      // exactly as `trigger` is under Ruling 8.
      frequency: effect.frequency ?? null,
      prompt: effect.prompt ?? null,
      to: mode === 'floor' ? floorTo : null,
      faces,
      targets,
      total,
      nextTotal: gain === null ? null : total + gain,
    })
  }

  return offers
}

// Replaces one group's faces, keeping what they were. `replaced` is deliberately
// **not** `dropped`: an advantage discard is a die that stopped counting and the
// log strikes it through, whereas an intervened die is one whose face changed
// and whose original must stay legible at full contrast (view 4e's honesty
// rule). Two meanings under one key is how the log would come to lie.
/**
 * @template {RolledDie} D
 * @param {readonly D[]} dice
 * @param {readonly { groupIndex: number, dieIndex: number, to: number }[]} changes
 * @returns {D[]}
 */
function rewrite(dice, changes) {
  /** @type {Map<number, { dieIndex: number, to: number }[]>} */
  const byGroup = new Map()
  for (const { groupIndex, dieIndex, to } of changes) {
    const group = byGroup.get(groupIndex) ?? []
    group.push({ dieIndex, to })
    byGroup.set(groupIndex, group)
  }
  return dice.map((group, groupIndex) => {
    const changed = byGroup.get(groupIndex)
    if (!changed) return { ...group, results: group.results.slice() }
    const results = group.results.slice()
    /** @type {Replacement[]} */
    const replaced = [...(group.replaced ?? [])]
    for (const { dieIndex, to } of changed) {
      replaced.push({ index: dieIndex, from: results[dieIndex], to })
      results[dieIndex] = to
    }
    return { ...group, results, replaced }
  })
}

/**
 * Accept a `floor` offer. No new dice are rolled — Great Weapon Fighting's whole
 * point — so this is the one mode that resolves without touching a roller.
 *
 * @template {RolledDie} D
 * @param {{ dice: readonly D[], modifier?: number }} roll
 * @param {Pick<InterventionOffer, 'targets' | 'to'>} offer
 * @returns {{ dice: D[], total: number, modifier: number }}
 */
export function applyFloor({ dice, modifier = 0 }, offer) {
  // A floor offer always carries its `to`.
  const next = rewrite(dice, offer.targets.map(t => ({ ...t, to: /** @type {number} */ (offer.to) })))
  return { dice: next, total: totalOf(next, modifier), modifier }
}

/**
 * Accept a `reroll` offer, given the faces a second visible throw produced.
 *
 * `newFaces` is aligned to `offer.targets`. A short array applies as far as it
 * goes rather than writing `undefined` into a die — a roller that half-answered
 * is the case `tryRoller` already guards, and losing the tail of a reroll is
 * better than logging a NaN.
 *
 * @template {RolledDie} D
 * @param {{ dice: readonly D[], modifier?: number }} roll
 * @param {Pick<InterventionOffer, 'targets'>} offer
 * @param {readonly number[] | null | undefined} newFaces
 * @returns {{ dice: D[], total: number, modifier: number }}
 */
export function applyReroll({ dice, modifier = 0 }, offer, newFaces) {
  const changes = offer.targets
    .map((t, i) => ({ ...t, to: newFaces?.[i] }))
    .filter(/** @returns {c is Face & { to: number }} */ c => typeof c.to === 'number')
  const next = rewrite(dice, changes)
  return { dice: next, total: totalOf(next, modifier), modifier }
}

/**
 * Accept a `twice` offer — keep the second bundle. Savage Attacker rolls the
 * whole thing again and the player picks, so both totals are real and declining
 * is simply keeping the first, which needs no applier at all.
 *
 * The originals ride along under `replaced` so the log still shows what the
 * first bundle was; the design keeps both sets visible until the choice is made
 * and there is no reason for the record to forget one afterwards.
 *
 * @template {RolledDie} D
 * @param {{ dice?: readonly RolledDie[] | null, modifier?: number }} roll
 * @param {readonly D[] | null | undefined} secondDice
 * @returns {{ dice: (D & { replaced: Replacement[] })[], total: number, modifier: number }}
 */
export function applyTwice({ dice, modifier = 0 }, secondDice) {
  const next = (secondDice ?? []).map((group, i) => {
    const before = dice?.[i]?.results ?? []
    return {
      ...group,
      results: group.results.slice(),
      replaced: group.results.map((to, index) => ({ index, from: before[index], to })),
    }
  })
  return { dice: next, total: totalOf(next, modifier), modifier }
}

/**
 * The dice to re-throw for a `reroll` offer — one die per target, in
 * `resolveRoll`'s own input shape so the second throw goes through the *same*
 * roller and is therefore genuinely visible, colour and all.
 *
 * @param {readonly DiceSpec[]} dice
 * @param {Pick<InterventionOffer, 'targets'>} offer
 * @returns {DiceSpec[]}
 */
export function rerollDice(dice, offer) {
  return offer.targets.map(t => ({
    count: 1,
    sides: dice[t.groupIndex]?.sides ?? t.sides,
    damageType: dice[t.groupIndex]?.damageType ?? null,
  }))
}

/**
 * The whole bundle again, for a `twice` offer. Same shape, same reason.
 *
 * @param {readonly DiceSpec[] | null | undefined} dice
 * @returns {DiceSpec[]}
 */
export function rebundleDice(dice) {
  return (dice ?? []).map(d => ({ count: d.count, sides: d.sides, damageType: d.damageType ?? null }))
}
