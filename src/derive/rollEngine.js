// Pure roll-resolution engine. Owns all dice *mechanics* — building the groups
// to roll, adding the extra d20 for advantage/disadvantage, applying the
// keep-highest/lowest rule, and totalling. It is deliberately ignorant of *how*
// the faces are produced: that is a roller adapter's job.
//
// A roller is `(groups) => results | Promise<results> | null`, where
// `groups` is `[{ qty, sides, damageType? }]` and `results` is aligned by index
// as `[{ results: number[] }]`. Returning `null`/throwing/wrong-length signals
// the engine to fall back. Two adapters exist today: `rngRoller` (here) and the
// browser-only `createDiceBoxRoller` in `diceBox.js`.

import { rollDice } from './diceUtils.js'
import { DICE_INTERVENTION_MODES, readEnvelope, effectKey } from './effects.js'
import { weaponMatches } from './weaponActions.js'

// Builds the physical groups to roll. For advantage/disadvantage, appends one
// extra d20 mirroring the first d20 group's damageType (so its 3D colour
// matches). `extraIndex` is the appended group's index, or -1 when no d20.
function buildGroups(dice, mode) {
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
function applyKeep(dice, mode, extra) {
  if (mode === 'normal' || extra == null) return
  const d20 = dice.find(d => d.sides === 20)
  if (!d20) return
  const a = d20.results[0], b = extra
  d20.results[0] = mode === 'advantage' ? Math.max(a, b) : Math.min(a, b)
  d20.dropped = [mode === 'advantage' ? Math.min(a, b) : Math.max(a, b)]
}

function isValid(rolled, groups) {
  return Array.isArray(rolled) && groups.every((g, i) => rolled[i]?.results?.length === g.qty)
}

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
export function rngRoller(groups) {
  return groups.map(g => ({ results: rollDice(g.qty, g.sides) }))
}

// Resolves a roll to its per-group results and total. Tries `roller`, falls back
// to `fallback` (default RNG) when the primary is unavailable or returns an
// invalid shape, so the recorded log always reflects the dice that were read —
// never a second, independent RNG draw that disagrees with the rendered dice.
export async function resolveRoll({ dice, mode = 'normal', modifier = 0 }, { roller, fallback = rngRoller } = {}) {
  const { groups, extraIndex } = buildGroups(dice, mode)

  let rolled = await tryRoller(roller, groups)
  if (!rolled) rolled = await tryRoller(fallback, groups)
  if (!rolled) rolled = rngRoller(groups)

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

export function totalOf(dice, modifier = 0) {
  return (dice ?? []).flatMap(d => d.results).reduce((a, b) => a + b, 0) + modifier
}

// How many dice one mode touches by default. `floor` fixes every qualifying die
// (Great Weapon Fighting), `reroll` takes one (Piercer), `twice` re-throws the
// whole bundle (Savage Attacker). An effect may narrow `floor` to `one`; it may
// not widen `reroll`, because "reroll one of the damage dice" is the book's own
// wording and a `dice: 'all'` reroll would be a different feat.
const DEFAULT_SCOPE_OF_DICE = Object.freeze({ floor: 'all', reroll: 'one', twice: 'bundle' })

// Every face in the bundle, addressed so an offer can name the ones it touches
// without the component having to re-walk the groups.
//
// `damageType` rides along per *die* rather than per roll, because a group is
// what carries one — a flame tongue's damage is 1d8 piercing and 1d6 fire in two
// groups, and Piercer may only touch the first. The offer already reported it
// (`damageType: dice[t.groupIndex]?.damageType`); now the predicate can read it.
function flatFaces(dice) {
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
function scopeAdmits(effect, rollType) {
  if (effect.scope == null) return true
  const scopes = Array.isArray(effect.scope) ? effect.scope : [effect.scope]
  if (scopes.length === 0) return true
  return rollType != null && scopes.includes(rollType)
}

// The `weapon` predicate, answered with `weaponActions.js`'s matcher rather than
// a second copy of it — the same argument that put `effectApplies` in one place.
// With no weapon in context a predicated effect is refused, never waved through.
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
function damageAdmits(effect, face) {
  if (effect.damageType == null) return true
  return face.damageType === effect.damageType
}

// Which faces this effect would act on. Empty means there is nothing to offer,
// which is the common case and is not a failure.
function targetsFor(effect, faces) {
  const scope = effect.dice ?? DEFAULT_SCOPE_OF_DICE[effect.mode]

  // `twice` re-throws the whole bundle — `applyTwice` replaces every group — so
  // a damage type **gates** the offer rather than narrowing it. Filtering the
  // targets here would promise a partial re-throw the applier cannot perform.
  if (effect.mode === 'twice') return faces.some(f => damageAdmits(effect, f)) ? faces : []

  // `on` names the faces that qualify. A `floor` with no `on` takes every face
  // below `to`, which is the same rule written the other way round; a `reroll`
  // with no `on` takes any face, because Piercer's is unconditional.
  const qualifies = (face) => {
    if (Array.isArray(effect.on) && effect.on.length > 0) return effect.on.includes(face)
    return effect.mode === 'floor' ? face < effect.to : true
  }

  // A floor never *lowers* a die. An `on: [1, 2]` with `to: 3` and a face of 5
  // is a content error rather than a downgrade, and refusing it here is cheaper
  // than explaining it on a character sheet.
  const eligible = faces.filter(f => damageAdmits(effect, f) && qualifies(f.face) && (effect.mode !== 'floor' || f.face < effect.to))
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
 * @param {Array} dice   the resolved groups from `resolveRoll`
 * @param {Array} effects gated effects — `applicableEffects()` has already run
 * @param {object} ctx
 * @param {string} [ctx.rollType]  'damage', 'attack', … — matched against `scope`
 * @param {object} [ctx.weapon]    the resolved weapon, for a `weapon` predicate
 * @param {boolean} [ctx.twoHanded] the grip, not the weapon — see `weaponMatches`
 * @param {boolean} [ctx.sole]     no other weapon equipped
 * @param {string} [ctx.ability]   the ability the attack actually used
 * @param {number} [ctx.modifier]  the roll's flat modifier, for `nextTotal`
 * @returns {Array} offers, most-preferred first
 */
export function interventions(dice, effects, ctx = {}) {
  const faces = flatFaces(dice)
  if (faces.length === 0) return []

  const modifier = ctx.modifier ?? 0
  const total = totalOf(dice, modifier)
  const offers = []

  for (const effect of effects ?? []) {
    if (effect?.type !== 'dice_intervention') continue
    if (!DICE_INTERVENTION_MODES.includes(effect.mode)) continue
    // A floor with no target is not a weaker floor, it is an unauthored one.
    if (effect.mode === 'floor' && typeof effect.to !== 'number') continue
    if (!scopeAdmits(effect, ctx.rollType ?? null)) continue
    if (!weaponAdmits(effect, ctx)) continue

    const targets = targetsFor(effect, faces)
    if (targets.length === 0) continue

    const envelope = readEnvelope(effect)
    const gain = effect.mode === 'floor'
      ? targets.reduce((sum, t) => sum + (effect.to - t.face), 0)
      : null

    offers.push({
      key: effectKey(effect),
      mode: effect.mode,
      source: envelope.source,
      benefitKey: envelope.benefitKey,
      // `frequency` is printed, never counted. The app does not know whose turn
      // it is and is not going to — "once per turn" is a reminder to the table,
      // exactly as `trigger` is under Ruling 8.
      frequency: effect.frequency ?? null,
      prompt: effect.prompt ?? null,
      to: effect.mode === 'floor' ? effect.to : null,
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
function rewrite(dice, changes) {
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
    const replaced = (group.replaced ?? []).slice()
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
 */
export function applyFloor({ dice, modifier = 0 }, offer) {
  const next = rewrite(dice, offer.targets.map(t => ({ ...t, to: offer.to })))
  return { dice: next, total: totalOf(next, modifier), modifier }
}

/**
 * Accept a `reroll` offer, given the faces a second visible throw produced.
 *
 * `newFaces` is aligned to `offer.targets`. A short array applies as far as it
 * goes rather than writing `undefined` into a die — a roller that half-answered
 * is the case `tryRoller` already guards, and losing the tail of a reroll is
 * better than logging a NaN.
 */
export function applyReroll({ dice, modifier = 0 }, offer, newFaces) {
  const changes = offer.targets
    .map((t, i) => ({ ...t, to: newFaces?.[i] }))
    .filter(c => typeof c.to === 'number')
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
 */
export function rerollDice(dice, offer) {
  return offer.targets.map(t => ({
    count: 1,
    sides: dice[t.groupIndex]?.sides ?? t.sides,
    damageType: dice[t.groupIndex]?.damageType ?? null,
  }))
}

/** The whole bundle again, for a `twice` offer. Same shape, same reason. */
export function rebundleDice(dice) {
  return (dice ?? []).map(d => ({ count: d.count, sides: d.sides, damageType: d.damageType ?? null }))
}
