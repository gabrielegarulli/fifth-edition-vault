// @ts-check
// The choices a species makes the player make at creation, and what they grant
// (VAULT-170).
//
// 2024 species ask up to four questions that the builder previously never put:
//
// - **Size**, for the ten species offering Small *or* Medium. Size is not
//   cosmetic — carrying capacity, grappling and the heavy-weapon rule all read
//   it — and it can only be asked at creation.
// - **Lineage**, where a species has one (Elven Lineages, Fiendish Legacies,
//   Gnomish Lineage).
// - **The spellcasting ability** for the species' own spells, which 2024 leaves
//   to the player as Intelligence, Wisdom *or* Charisma.
// - **A cantrip**, for the High Elf, whose Prestidigitation may be swapped for
//   any Wizard cantrip on a Long Rest.
//
// All four read `content_race.data`, which
// `scripts/enrich_species_from_5etools.mjs` populates from 5e.tools. Before that
// script, **0 of 38 rows carried any of it**.
//
// ## Two shapes, one question
//
// A lineage is stored in `race.subrace` — the field the panel has always
// written — whether it came from the new `speciesSpellcasting.lineages` or from
// the older homebrew `data.subraces`. They are the same question asked of
// different data, and a second field naming the same choice would drift out of
// step with the first.
//
// ## Size is an array or it is not a choice
//
// `data.size` is `['S','M']` for a real choice and a single-entry array
// otherwise. Sixteen homebrew rows once stored free prose there — "Depends on
// your lineage", "Small (larval) / Medium (adult)" — which is why nothing here
// parses a string. Where 5e.tools knew better the import replaced the prose with
// an array and kept the original as `sizeNote`, which is display-only.

/**
 * A species as the builder hands it over: `content_race.data`, read off a
 * lineage fence, so every field in it is whatever the note says.
 *
 * @typedef {{ data?: { size?: unknown, subraces?: unknown, speciesSpellcasting?: unknown } | null }} RaceData
 */
/**
 * The draft's `race`: the answers given so far.
 *
 * @typedef {{ size?: string | null, subrace?: string | null, spellcastingAbility?: string | null, cantrip?: unknown }} DraftRace
 */
/** @typedef {{ spellList: string, level: number, count: number, replaces: string | null }} CantripChoice */
/** @typedef {{ name?: string, level?: number | null, [key: string]: unknown }} SpeciesSpell */
/**
 * `speciesSpellcasting`, as the enrichment script writes it.
 *
 * @typedef {{
 *   ability?: unknown,
 *   spells?: SpeciesSpell[] | null,
 *   lineages?: unknown,
 * }} SpeciesSpellcasting
 */
/**
 * @typedef {{ name: string, benefit: string, spells: SpeciesSpell[], cantripChoice: CantripChoice | null, traits: unknown[] }} Lineage
 */

/** @type {Record<string, string>} */
export const SIZE_FULL = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan' }

/** @type {Record<string, string>} */
export const ABILITY_FULL = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
}

/** @param {RaceData | null | undefined} raceData */
const data = (raceData) => raceData?.data ?? {}
/**
 * @param {RaceData | null | undefined} raceData
 * @returns {SpeciesSpellcasting | null}
 */
const block = (raceData) => /** @type {SpeciesSpellcasting | null} */ (data(raceData).speciesSpellcasting ?? null)

/**
 * `ability.choose`, where `ability` is an object. A fixed ability is a string,
 * and a string has no `choose`.
 *
 * @param {unknown} ability
 * @returns {unknown}
 */
const chooseOf = (ability) => (ability && typeof ability === 'object' ? /** @type {{ choose?: unknown }} */ (ability).choose : undefined)

/**
 * The size codes a species may be, from the array form only.
 *
 * @param {RaceData | null | undefined} raceData
 * @returns {string[]} `[]` when the row stores prose rather than an array
 */
export function sizeOptions(raceData) {
  const size = data(raceData).size
  return Array.isArray(size) ? size.filter(/** @returns {s is string} */ (s) => typeof s === 'string') : []
}

/**
 * Does this species make the player choose a size?
 *
 * @param {RaceData | null | undefined} raceData
 */
export function needsSizeChoice(raceData) {
  return sizeOptions(raceData).length > 1
}

/**
 * The size the character actually is: the choice when there is one, the single
 * option when there is not, and null when the row only has prose.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {string | null | undefined} chosen
 * @returns {string|null}
 */
export function resolvedSize(raceData, chosen) {
  const options = sizeOptions(raceData)
  if (options.length === 0) return null
  if (options.length === 1) return options[0]
  return chosen != null && options.includes(chosen) ? chosen : null
}

/**
 * The abilities a species lets the player pick between for its own spells.
 *
 * A species with a *fixed* ability (the XPHB Aasimar's Charisma) returns `[]` —
 * there is nothing to ask.
 *
 * @param {RaceData | null | undefined} raceData
 * @returns {string[]}
 */
export function abilityOptions(raceData) {
  const choose = chooseOf(block(raceData)?.ability)
  return Array.isArray(choose) ? /** @type {string[]} */ (choose) : []
}

/**
 * Does this species make the player choose a spellcasting ability?
 *
 * @param {RaceData | null | undefined} raceData
 */
export function needsAbilityChoice(raceData) {
  return abilityOptions(raceData).length > 0
}

/**
 * The lineages a species offers, from either shape.
 *
 * The newer `speciesSpellcasting.lineages` wins where both exist, because it
 * carries the spells; `data.subraces` is the older homebrew shape and has only
 * traits.
 *
 * @param {RaceData | null | undefined} raceData
 * @returns {Lineage[]}
 */
export function lineageOptions(raceData) {
  const lineages = block(raceData)?.lineages
  if (Array.isArray(lineages) && lineages.length > 0) {
    /** @type {{ name: string, benefit?: string | null, spells?: unknown, cantripChoice?: CantripChoice | null }[]} */
    const fromSpells = lineages
    return fromSpells.map((l) => ({
      name: l.name,
      benefit: l.benefit ?? '',
      spells: Array.isArray(l.spells) ? /** @type {SpeciesSpell[]} */ (l.spells) : [],
      cantripChoice: l.cantripChoice ?? null,
      traits: [],
    }))
  }
  const raw = data(raceData).subraces
  if (!Array.isArray(raw)) return []
  /** @type {{ name: string, traits?: unknown }[]} */
  const subraces = raw
  return subraces.map((s) => ({
    name: s.name,
    benefit: '',
    spells: [],
    cantripChoice: null,
    traits: Array.isArray(s.traits) ? /** @type {unknown[]} */ (s.traits) : [],
  }))
}

/**
 * The chosen lineage, or null.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {string | null | undefined} name
 * @returns {Lineage | null}
 */
export function selectedLineage(raceData, name) {
  if (!name) return null
  return lineageOptions(raceData).find((l) => l.name === name) ?? null
}

/**
 * The cantrip choice the chosen lineage opens, if any.
 *
 * Only the High Elf has one: it starts with Prestidigitation and may replace it
 * with any Wizard cantrip after a Long Rest, so the pick is real but optional —
 * leaving it unset means keeping Prestidigitation.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {string | null | undefined} lineageName
 * @returns {CantripChoice | null}
 */
export function cantripChoiceFor(raceData, lineageName) {
  return selectedLineage(raceData, lineageName)?.cantripChoice ?? null
}

/**
 * The ability the species casts with: the player's pick where there is a
 * choice, the fixed one where there is not, and null where it casts nothing.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {DraftRace | null | undefined} race the draft's `race` object
 * @returns {string|null}
 */
export function speciesSpellcastingAbility(raceData, race) {
  const ability = block(raceData)?.ability
  if (typeof ability === 'string') return ability
  const choose = chooseOf(ability)
  if (!Array.isArray(choose)) return null
  const picked = race?.spellcastingAbility
  return picked != null && choose.includes(picked) ? picked : null
}

/**
 * Every spell the species grants at this character level.
 *
 * `level` on a spell is the character level it arrives at — 1, 3 or 5 — so a
 * level-4 Drow has Dancing Lights and Faerie Fire but not yet Darkness.
 * Lineage spells are included only once a lineage is chosen.
 *
 * A chosen High Elf cantrip *replaces* the lineage's default rather than
 * adding to it, which is what "you can replace that cantrip" means.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {{ race?: DraftRace | null, totalLevel?: number }} [opts]
 * @returns {SpeciesSpell[]}
 */
export function speciesSpells(raceData, { race = null, totalLevel = 1 } = {}) {
  const b = block(raceData)
  if (!b) return []
  const lineage = selectedLineage(raceData, race?.subrace ?? null)
  const all = [...(b.spells ?? []), ...(lineage?.spells ?? [])]

  const swap = /** @type {Record<string, unknown> | null} */ (race?.cantrip ?? null)
  const replaces = lineage?.cantripChoice?.replaces ?? null
  const withSwap = swap && replaces
    ? all.map((s) => (s.name === replaces ? { ...swap, level: s.level, cantrip: true, kind: 'known' } : s))
    : all

  return withSwap.filter((s) => (s.level ?? 1) <= totalLevel)
}

/**
 * What the player still has to answer before the species is complete.
 *
 * Returned as prose because it is shown to the player, not matched on.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {DraftRace | null | undefined} race
 * @returns {string[]}
 */
export function speciesChoiceProblems(raceData, race) {
  if (!raceData) return []
  /** @type {string[]} */
  const problems = []
  if (needsSizeChoice(raceData) && !resolvedSize(raceData, race?.size ?? null)) {
    problems.push('Choose a size')
  }
  if (lineageOptions(raceData).length > 0 && !race?.subrace) {
    problems.push('Choose a lineage')
  }
  // Only worth asking once a lineage is settled, because that is when the
  // rules ask it, and asking earlier reads as a second unrelated question.
  if (needsAbilityChoice(raceData) && !speciesSpellcastingAbility(raceData, race)) {
    problems.push('Choose a spellcasting ability')
  }
  return problems
}
