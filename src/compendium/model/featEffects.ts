import { effectKey } from '@vault/derive/effects.js'

import type { FeatBenefit, FeatCatalog, FeatFence } from './feats'

/**
 * A character's effects, assembled from the feats it names and the catalog's
 * own fences.
 *
 * ## Why this exists instead of porting the effects system
 *
 * `rollEngine.js`'s `interventions()` takes *gated effects*. `the-vault` produces
 * those with `lib/effectBaking.js` over a character's feats, features, species
 * traits and items, behind an activation gate in `vault_state` — eighteen
 * tickets of machinery (VAULT-82 → 118) and no part of it is in this plugin.
 *
 * It does not need to be, for this. **The feat catalog already is the
 * authority**: MYDND-4's exporter wrote every feat's `benefits[]` and their
 * effects into each note's ` ```vault-feat ` fence, and `/feats` already reads
 * them. So a character *names* its feats and the catalog supplies the effects.
 * One reader, no second copy of a feat's rules, and a feat corrected upstream
 * is corrected here by re-running the export.
 *
 * What is **not** claimed: this is feats only. Species traits, subclass
 * features and item effects all have effects in `the-vault` and none of them
 * reach here. `describeEffectCoverage` is what says so on screen, because a
 * sheet that silently models a quarter of a character is worse than one that
 * says which quarter.
 *
 * ## The envelope is the catalog's, and it is filled in here
 *
 * `readEnvelope` reads `source`, `sourceKind`, `sourceFeatureId` and
 * `benefitKey` off an effect. A catalog fence has no idea which character is
 * reading it, so the envelope is stamped on at resolution time — which is also
 * the only moment the feat's identity is known.
 *
 * **`sourceFeatureId` is not optional, and leaving it off is a silent
 * failure.** `effectKey` returns `null` without it, and `effectApplies` then
 * refuses every *activated* effect outright — "a content bug rather than a
 * state", which is the right direction but means an activated feat would have
 * been permanently switched off with nothing saying so. Caught by the
 * activation-gate test in `dice/model/interventions.test.ts`, which is the whole
 * reason that test asserts the positive case as well as the negative one.
 *
 * The id used is the feat's **note slug** — `CatalogRow.id`, which is stable and
 * addressable and deliberately not a uuid. So a toggle key is
 * `feat:<slug>:<benefitKey>`, and it survives being written into a vitals fence
 * and read back on another machine.
 */

/** An effect with its provenance attached. The shape `interventions()` takes. */
export interface ResolvedEffect extends Record<string, unknown> {
  type: string
  /** The feat it came from, for the prompt to name. */
  source: string
  sourceKind: 'feat'
  /**
   * The feat's note slug. **Load-bearing** — `effectKey` is `null` without it
   * and an activated effect then never applies. See the note above.
   */
  sourceFeatureId: string
  /** The benefit's own key — minted by the exporter, never re-derived. */
  benefitKey: string | null
  /** The benefit's display name, for a toggle's label. */
  benefitName: string | null
}

export interface FeatEffects {
  effects: ResolvedEffect[]
  /** Feat names that matched a catalog note. */
  resolved: string[]
  /**
   * Feat names with no note in `feats/`.
   *
   * Reported rather than dropped. An unexported catalog and a misspelled feat
   * look identical from here, and both are things the GM can fix — but only if
   * something says the name went nowhere.
   */
  unknown: string[]
}

/** Benefits whose effects are worth collecting. */
function effectsOfBenefit(benefit: FeatBenefit, featName: string, featId: string): ResolvedEffect[] {
  const out: ResolvedEffect[] = []
  for (const raw of benefit.effects ?? []) {
    const type = typeof raw?.type === 'string' ? raw.type : null
    if (!type) continue
    out.push({
      ...raw,
      type,
      source: featName,
      sourceKind: 'feat',
      sourceFeatureId: featId,
      benefitKey: typeof benefit.key === 'string' ? benefit.key : null,
      benefitName: typeof benefit.name === 'string' ? benefit.name : null,
    })
  }
  return out
}

/**
 * The key an activated effect is toggled by, as the vitals fence stores it.
 *
 * Re-exported through `effectKey` rather than rebuilt, so the plugin and the web
 * app address a toggle identically and there is one definition of the shape.
 */
export function toggleKeyOf(effect: ResolvedEffect): string | null {
  return (effectKey(effect) as string | null) ?? null
}

/**
 * Every effect from a list of feat names.
 *
 * Asynchronous because a fence is in a note body — one read per *named* feat,
 * not per catalog row, so a character with three feats costs three reads.
 * Matching is by name through `byName`, which normalises, because the name is
 * what both D&D Beyond and a hand-written list have.
 */
export async function resolveFeatEffects(
  feats: FeatCatalog,
  names: readonly string[],
): Promise<FeatEffects> {
  const effects: ResolvedEffect[] = []
  const resolved: string[] = []
  const unknown: string[] = []
  const seen = new Set<string>()

  for (const raw of names) {
    const name = String(raw ?? '').trim()
    if (name === '') continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const row = feats.byName(name)
    if (!row) {
      unknown.push(name)
      continue
    }

    const detail = await feats.detail(row.id)
    const fence: FeatFence | null = detail?.fence ?? null
    resolved.push(row.name)
    for (const benefit of fence?.benefits ?? []) {
      effects.push(...effectsOfBenefit(benefit, row.name, row.id))
    }
  }

  return { effects, resolved, unknown }
}

/**
 * How much of what was found is actually acted on.
 *
 * Only `dice_intervention` is wired. Everything else is read, counted and then
 * ignored, and saying so is the honest version of a sheet that models one effect
 * type out of 43.
 *
 * ## `ability_score_choice` is the conspicuous absence, and it is a ruling
 *
 * It is by far the commonest effect type in the exported catalog — 138 of 197
 * feat notes when this was written (2026-10-07), against none of the other 42.
 * (MYDND-26 and later brought eight more types in, a handful of notes each; see
 * the plan's "What is deliberately unfinished".) So it looks like the obvious
 * next thing to wire, and the one place a reasonable person would start. **It must not be wired, because D&D Beyond has already
 * applied it** (MYDND-15), by either of two routes:
 *
 * - **as a modifier in the `feat` bucket.** Measured on a real character:
 *   `+1 charisma-score` (componentId 1789092), `+1 dexterity-score` (1789159,
 *   Lightly Armored), `+1 charisma-score` (1789156), `+2 charisma-score` and
 *   `+1 dexterity-score` (1789210). `getAbilityScore` sums every `bonus` whose
 *   `subType` matches, across **all** buckets including `feat`.
 * - **or folded straight into `stats[]`.** A second real character names a feat
 *   called "Carouser Ability Score Improvements" and carries no ability-score
 *   modifier at all — the increase is simply part of the base score.
 *
 * The same character's catalog notes model `ability_score_choice` on Inspiring
 * Leader and Lightly Armored, both of which she has. Wiring it would add +1 CHA
 * and +1 DEX a *second* time, and the result would look like a plausible
 * character rather than like a bug — which is the kind of wrong this repo is
 * least able to notice.
 *
 * `abilitiesFromFence` reads the same effect for a different purpose and is
 * correct: it answers "which abilities can this feat raise" for the `/feats`
 * *filter*. Reading an effect to describe a catalog row is not the same as
 * applying it to a character.
 *
 * **What would make it wirable** is a locally-authored character — one whose
 * scores nobody else has already adjusted. That is a real future case and not
 * this one, and it would need the two to be distinguishable first.
 * `featEffects.test.ts` pins this with a test named for the double-count, so
 * widening the list is a deliberate edit against an assertion rather than an
 * afternoon's tidying.
 */
export const WIRED_EFFECT_TYPES: readonly string[] = ['dice_intervention']

export function describeEffectCoverage(effects: readonly ResolvedEffect[]): {
  total: number
  wired: number
  byType: { type: string; count: number; wired: boolean }[]
} {
  const counts = new Map<string, number>()
  for (const effect of effects) counts.set(effect.type, (counts.get(effect.type) ?? 0) + 1)

  const byType = [...counts.entries()]
    .map(([type, count]) => ({ type, count, wired: WIRED_EFFECT_TYPES.includes(type) }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))

  return {
    total: effects.length,
    wired: effects.filter(e => WIRED_EFFECT_TYPES.includes(e.type)).length,
    byType,
  }
}
