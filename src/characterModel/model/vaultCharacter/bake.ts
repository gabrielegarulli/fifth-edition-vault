// Baking a Vault character: resolving its choices and their feats' effects
// into the effects the sheet derives from.

import { effectSourceIds, flattenResolvedEffects, proficiencyBaseline } from '@vault/derive/effectBaking.js'
import { originFeatEffects } from '@vault/derive/originFeatChoices.js'

import type {
  ClassCatalog,
  ClassFence,
  FenceFeature,
  SubclassCatalog,
  SubclassFence,
  FeatCatalog,
  SpeciesCatalog,
  SpellCatalog,
} from '../../../compendium'
import { additionalSpellsEffects, additionalSpellsKey, additionalSpellsOf, spellLevelLookup } from './additionalSpells'
import type { VaultCharacterJson } from './fence'
import { abilityBonusSources, effectsToStore } from './finals'

/**
 * Baking a Vault character's effects from the catalogs (MYDND-23).
 *
 * The plugin's half of `the-vault`'s `lib/bakeEffects.js`: that file fetches
 * the content rows a character json refers to from Supabase and hands them to
 * the pure `flattenResolvedEffects`; this one reads the same rows out of the
 * vault's notes and hands them to the same function. The rules are not
 * reimplemented — only the fetching is.
 *
 * ## Vault characters only
 *
 * A D&D Beyond payload already has every feat, feature and species trait baked
 * into its numbers. Running this over one would add them a second time — the
 * `ability_score_choice` double-count of MYDND-15, but for every effect type at
 * once. The only caller is the Vault character path in `./index.ts`.
 *
 * ## Rows are rebuilt in `content_*` shape
 *
 * `flattenResolvedEffects` reads `content_class` / `content_feat` /
 * `content_race` rows: `{ id, name, data }`. The plugin's fences are those rows'
 * `data` (or very nearly), so each adapter below is a few lines that put the
 * note's identity back around its fence. `the-vault` owns the row contract;
 * these adapters only have to match it.
 *
 * ## Every bake goes through `effectsToStore` (MYDND-105)
 *
 * A character *converted* from D&D Beyond carries final ability scores that
 * already include its species, feat and feature bonuses, so its bake drops the
 * bonuses its conversion recorded as inside them (`./finals.ts`). A character
 * authored here has no D&D Beyond past and gets its effects untouched. Until
 * MYDND-105 converting was out of scope and this was deliberately not ported.
 */

/** The catalogs a bake reads. A subset of `Content`, so tests can fake it. */
export interface BakeCatalogs {
  feats: FeatCatalog
  species: SpeciesCatalog
  classes: ClassCatalog
  subclasses: SubclassCatalog
  /**
   * Read only for the level of a spell a class grants by name (MYDND-183):
   * Circle of the Land's `fire bolt|xphb` is a cantrip, and only its note says
   * so. Without it, a grant is a cantrip only when its entry is marked `#c`.
   */
  spells?: Pick<SpellCatalog, 'list'>
}

export interface BakeResult {
  /** Gated later, by `deriveCharacterSheet`; this is the whole list. */
  effects: Array<Record<string, unknown>>
  proficiencyBaseline: unknown
  /**
   * The sources of every `ability_score_bonus` the bake produced, **before**
   * `effectsToStore` stripped any. Only a conversion reads it, once, to record
   * which bonuses D&D Beyond's finals already contain (`./finals.ts`).
   */
  abilityBonusSources: Array<string | null>
  /**
   * Ids the json names that no note answers to, as `kind:id`.
   *
   * Reported rather than dropped, for the reason `resolveFeatEffects` gives: an
   * unexported catalog and a mistyped id look identical from here, and both are
   * fixable only if something says so.
   */
  missing: string[]
}

/**
 * The id a fence feature is known by.
 *
 * `content_class_feature` rows have uuids; a fence feature has only a name and
 * a level. The id is minted from **the owner's slug, the level and the name**,
 * and it has to be stable, not merely unique: it is stamped on every effect as
 * `sourceFeatureId`, so it is what an activation toggle (`feature:<id>:…`) and a
 * `featureChoices` key are addressed by. A counter or a position in the list
 * would re-address every saved toggle the day the exporter reordered a fence.
 *
 * Level is in it because a few features recur by name at different levels
 * (Ability Score Improvement at 4, 8, 12…), and each is a separate choice.
 */
export function featureId(ownerSlug: string, feature: Pick<FenceFeature, 'name' | 'level'>): string {
  const name = String(feature.name ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${ownerSlug}:${feature.level}:${name}`
}

/** A fence feature as a `content_*_feature` row. Effects ride in `data`. */
function featureRow(ownerSlug: string, feature: FenceFeature): Record<string, unknown> {
  const raw = feature as FenceFeature & { effects?: unknown }
  const data: Record<string, unknown> = { ...(feature.data ?? {}) }
  // `the-vault` keeps effects at `data.effects`, and since MYDND-26 so does the
  // exporter. The top-level fallback stays for a hand-written fence; reading
  // both costs one line.
  if (data.effects === undefined && Array.isArray(raw.effects)) data.effects = raw.effects
  return {
    id: featureId(ownerSlug, feature),
    name: feature.name,
    level: feature.level,
    description: feature.description ?? null,
    // `invocationEffects` reads a picked invocation's effects off the feature's
    // `choices.options`, by name; without it they came only from the copy saved
    // in the pick, and an effect authored after the pick was never baked
    // (MYDND-29).
    choices: feature.choices ?? null,
    data,
  }
}

/**
 * The answers of a feat taken anywhere but the origin slot (MYDND-175): at an
 * Ability Score Improvement, or through Lessons of the First Ones.
 *
 * `flattenResolvedEffects` resolves only the origin feat's, so a Magic Initiate
 * taken at level 4 kept its picks in the json and gave the sheet nothing. The same
 * `originFeatEffects` resolves them here, under the origin feat's envelope. A free
 * cast also gets its own `key`, because two copies of the feat would otherwise
 * share one `feat:<id>:<benefit>` and spend from the same use.
 *
 * Since MYDND-182 the feats taken at an Ability Score Improvement have picks of
 * their own, and two things the answer alone does not say: the ability the +1
 * went to (Fey Touched casts off it) and `skillProficiencies`, the skills held
 * from everything else (Keen Mind's pick is Expertise in one already held). A
 * feat with more than one free cast (Fey Touched: Misty Step and its chosen
 * spell) keys each by its spell, or both would spend one use; a single one keeps
 * the key it always had.
 */
export function heldFeatEffects(
  featureChoices: VaultCharacterJson['featureChoices'],
  feats: ReadonlyArray<Record<string, unknown>>,
  { skillProficiencies = [] }: { skillProficiencies?: readonly string[] } = {},
): Array<Record<string, unknown>> {
  const held: Array<{ owner: string; featId: unknown; choices: unknown; abilityBonus?: unknown }> = []
  for (const [key, answer] of Object.entries(featureChoices ?? {})) {
    const choice = answer as
      | { type?: string; featId?: unknown; choices?: unknown; invocations?: unknown; abilityBonus?: unknown }
      | null
    if (choice?.type === 'feat') {
      held.push({ owner: key, featId: choice.featId, choices: choice.choices, abilityBonus: choice.abilityBonus })
    }
    if (choice?.type === 'invocations' && Array.isArray(choice.invocations)) {
      ;(choice.invocations as Array<{ target?: { kind?: string; id?: string } | null; choices?: unknown }>).forEach((p, i) => {
        if (p?.target?.kind === 'origin_feat') held.push({ owner: `${key}#${i}`, featId: p.target.id, choices: p.choices })
      })
    }
  }
  return held.flatMap(({ owner, featId, choices, abilityBonus }) => {
    const feat = feats.find(f => f.id === featId)
    if (!feat) return []
    const effects = originFeatEffects(feat, choices as object | null, {
      abilityBonus: typeof abilityBonus === 'string' ? abilityBonus : null,
      skillProficiencies: [...skillProficiencies],
    }) as Array<Record<string, unknown>>
    const several = effects.filter(e => e.type === 'feature_resource').length > 1
    return effects.map(e => ({
      ...e,
      source: feat.name,
      sourceFeatureId: feat.id,
      sourceKind: 'feat',
      ...(e.type === 'feature_resource'
        ? { key: `feat:${String(feat.id)}:${String(e.benefitKey)}:${owner}${several ? `:${slug(String(e.name))}` : ''}` }
        : {}),
    }))
  })
}

const slug = (s: string) => s.toLowerCase().replace(/\s*\(free cast\)$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * The answers a pick that follows another one takes from it (MYDND-181).
 *
 * Storm Soul and Raging Storm are "based on the environment you chose for your
 * Storm Aura": the exporter writes them as `feature_option`s with `follows`, and
 * the builder does not ask them. Each takes the option of the same name as the
 * pick it follows, resolved here on every bake rather than stored, so changing
 * Storm Aura can never leave them behind. An answer the json already holds wins.
 *
 * `rows` is one owner's feature list, as the bake builds it.
 */
export function followedChoices(
  rows: ReadonlyArray<Record<string, unknown>>,
  featureChoices: VaultCharacterJson['featureChoices'],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const choicesOf = (r: Record<string, unknown>) => (r.choices ?? null) as { follows?: unknown } | null
  for (const row of rows) {
    const follows = choicesOf(row)?.follows
    if (typeof follows !== 'string' || featureChoices?.[row.id as string]) continue
    const led = rows
      .filter(r => r.name === follows && Number(r.level) <= Number(row.level))
      .map(r => featureChoices?.[r.id as string] as { optionName?: unknown } | undefined)
      .find(a => typeof a?.optionName === 'string')
    const option = rows.find(
      r =>
        (r.data as { optionOf?: unknown } | undefined)?.optionOf === row.name &&
        r.level === row.level &&
        r.name === led?.optionName,
    )
    if (!option) continue
    out[row.id as string] = {
      type: 'feature_option',
      label: row.name,
      optionId: option.id,
      optionName: option.name,
      optionDescription: option.description ?? null,
    }
  }
  return out
}

const upToLevel = (features: readonly FenceFeature[] | undefined, level: number): FenceFeature[] =>
  (features ?? []).filter(f => typeof f?.level === 'number' && f.level <= level)

/**
 * The content rows a json refers to, read from the vault, then baked.
 *
 * Reads are one per *referenced* note — a level-5 Fighter with two feats costs
 * a class, a species and two feats — never a walk of a catalog's bodies.
 */
export async function bakeVaultCharacter(json: VaultCharacterJson, catalogs: BakeCatalogs): Promise<BakeResult> {
  const missing: string[] = []
  const { featIds, raceId, classLevels } = effectSourceIds(json) as {
    featIds: string[]
    raceId: string | null
    classLevels: Array<{ classId: string; subclassId: string | null; level: number }>
  }

  const feats: Array<Record<string, unknown>> = []
  for (const id of new Set(featIds)) {
    const row = catalogs.feats.byId(id)
    const detail = row ? await catalogs.feats.detail(id) : null
    if (!row || !detail) {
      missing.push(`feat:${id}`)
      continue
    }
    feats.push({ id: row.id, name: row.name, data: detail.fence ?? {} })
  }

  let race: Record<string, unknown> | null = null
  if (raceId) {
    const row = catalogs.species.byId(raceId)
    const detail = row ? await catalogs.species.detail(raceId) : null
    if (!row) {
      missing.push(`species:${raceId}`)
    } else {
      const fence = detail?.fence ?? {}
      // A species' effects are authored per trait in the fence; `content_race`
      // keeps them as one list on `data.effects`, which is what the bake reads.
      const effects = (fence.traits ?? []).flatMap(t => (Array.isArray(t?.effects) ? t.effects : []))
      race = {
        id: row.id,
        name: row.name,
        data: { ...fence, effects, darkvision: row.darkvision, size: row.size },
      }
    }
  }

  // `classRows` keeps `json.classes` order with `null` holes — the index is what
  // decides first-class versus multiclass proficiencies, and a missing class
  // must still count as unknown in the baseline rather than vanish from it.
  const classRows: Array<Record<string, unknown> | null> = []
  const featureLists: Array<Array<Record<string, unknown>>> = []
  // What each class and subclass hands over outside the caps (MYDND-183).
  const granted: Array<Record<string, unknown>> = []
  let spellLevel: ((name: string, source: string | null) => number | null) | undefined
  const grant = (ownerId: string, ownerName: string, data: Record<string, unknown> | undefined, level: number, spellbook: boolean) => {
    if (additionalSpellsOf(data).length === 0) return
    // One walk of the spell rows per bake, and only for a character that has a grant.
    spellLevel ??= catalogs.spells ? spellLevelLookup(catalogs.spells.list()) : undefined
    granted.push(
      ...additionalSpellsEffects({
        ownerId,
        ownerName,
        data,
        classLevel: level,
        answer: json.featureChoices?.[additionalSpellsKey(ownerId)],
        spellbook,
        spellLevel,
      }),
    )
  }

  for (const { classId, subclassId, level } of classLevels) {
    const row = catalogs.classes.byId(classId)
    const fence: ClassFence | null = row ? ((await catalogs.classes.detail(classId))?.fence ?? null) : null
    if (!row || !fence) {
      missing.push(`class:${classId}`)
      classRows.push(null)
      featureLists.push([])
    } else {
      classRows.push({
        id: row.id,
        name: row.name,
        source: fence.source ?? row.source,
        hit_die: fence.hit_die ?? null,
        spellcasting_ability: fence.spellcasting_ability ?? null,
        data: fence.data ?? {},
      })
      featureLists.push(upToLevel(fence.features, level).map(f => featureRow(row.id, f)))
      grant(row.id, row.name, fence.data, level, Boolean(fence.data?.spellbook))
    }

    if (subclassId) {
      const sub = catalogs.subclasses.byId(subclassId)
      const subFence: SubclassFence | null = sub
        ? ((await catalogs.subclasses.detail(subclassId))?.fence ?? null)
        : null
      if (!sub || !subFence) {
        missing.push(`subclass:${subclassId}`)
        featureLists.push([])
      } else {
        featureLists.push(upToLevel(subFence.features, level).map(f => featureRow(sub.id, f)))
        grant(sub.id, sub.name, subFence.data, level, Boolean(fence?.data?.spellbook))
      }
    }
  }

  const featureChoices = {
    ...Object.assign({}, ...featureLists.map(rows => followedChoices(rows, json.featureChoices))),
    ...(json.featureChoices ?? {}),
  }

  const raw = flattenResolvedEffects({
    feats,
    race,
    featureLists,
    classRows,
    featureChoices,
    originFeat: json.originFeat,
    raceChoice: json.race,
    totalLevel: (json.classes ?? []).reduce((sum, c) => sum + (c?.level ?? 0), 0),
  }) as Array<Record<string, unknown>>

  return {
    effects: effectsToStore(json, [
      ...raw,
      ...granted,
      ...heldFeatEffects(json.featureChoices, feats, {
        skillProficiencies: [
          ...(json.skillProficiencies ?? []),
          ...raw.filter(e => e.type === 'skill_proficiency' && typeof e.skill === 'string').map(e => e.skill as string),
        ],
      }),
    ]),
    proficiencyBaseline: proficiencyBaseline({ classRows, featureLists }),
    abilityBonusSources: abilityBonusSources(raw),
    missing,
  }
}
