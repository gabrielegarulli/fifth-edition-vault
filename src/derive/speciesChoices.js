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
 * @typedef {{ data?: { size?: unknown, subraces?: unknown, speciesSpellcasting?: unknown, versions?: unknown, [field: string]: unknown } | null }} RaceData
 */
/**
 * The draft's `race`: the answers given so far. `version` is the answer to the
 * species' `versions` question — "Red", "Fire Giant Ancestry" (MYDND-242).
 *
 * `proficiencies` holds the picks a species' `proficiencies` choices ask, by
 * each choice's `key` (MYDND-243): `{ skill: ['perception'] }`.
 *
 * `levelChoices` holds the answers to the species' `levelChoices`, by key — a
 * Metamorphosis made at level 5 (MYDND-246). Answered on level-up, never here.
 *
 * `traitChoices` holds the picks of the species' `traitChoices`, by key, one
 * option name per slot — a Lotol's `{ adaptations: ['Gecko Cling', 'Shocking
 * Skin'] }` (MYDND-259).
 *
 * @typedef {{ size?: string | null, subrace?: string | null, spellcastingAbility?: string | null, cantrip?: unknown, version?: string | null, proficiencies?: Readonly<Record<string, unknown>> | null, levelChoices?: Readonly<Record<string, unknown>> | null, traitChoices?: Readonly<Record<string, unknown>> | null, versionCantrip?: unknown }} DraftRace
 */
/** @typedef {{ key?: string, name?: string, text?: string, [k: string]: unknown }} SpeciesTrait */
/**
 * One answer to a species' `versions` question, as the exporter writes it:
 * the traits it rewrites (by key), the keys it removes, its effects, and the
 * cantrips it asks for (MYDND-260).
 *
 * @typedef {{ name: string, traits: SpeciesTrait[], removes: string[], effects: Record<string, unknown>[], cantrips: VersionCantrip[] }} SpeciesVersion
 */
/**
 * A cantrip a version asks for, from `spellList`, cast with `ability`, by a
 * character of `lineage` (any lineage when null): a Red Ryujin's Innate Magic
 * is a Sorcerer cantrip cast with Strength (MYDND-260).
 *
 * @typedef {{ lineage: string | null, spellList: string, level: number, ability: string | null }} VersionCantrip
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
 * `effects` is what the lineage's 5e.tools version states as data (MYDND-245):
 * a Tiefling legacy's resistance, a Drow's Darkvision. `[]` for a homebrew
 * subrace, which carries traits instead.
 *
 * @typedef {{ name: string, benefit: string, spells: SpeciesSpell[], cantripChoice: CantripChoice | null, traits: unknown[], effects: Record<string, unknown>[] }} Lineage
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
 * What the ability question is called. A species that casts nothing still asks
 * one when a trait's save DC uses it: the 2014 Eladrin's Fey Step, "your
 * Intelligence, Wisdom, or Charisma modifier (choose when you select this
 * race)" (MYDND-254). The exporter writes that as a spellcasting block with no
 * spells, so "spellcasting ability" would name something it does not have.
 *
 * @param {RaceData | null | undefined} raceData
 * @returns {{ label: string, problem: string }}
 */
export function abilityQuestion(raceData) {
  const b = block(raceData)
  const casts = listOf(b?.spells).length > 0 || listOf(b?.lineages).length > 0
  return casts
    ? { label: 'Species spellcasting ability', problem: 'Choose a spellcasting ability' }
    : { label: 'Species save DC ability', problem: 'Choose a save DC ability' }
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
    /** @type {{ name: string, benefit?: string | null, spells?: unknown, cantripChoice?: CantripChoice | null, effects?: unknown }[]} */
    const fromSpells = lineages
    return fromSpells.map((l) => ({
      name: l.name,
      benefit: l.benefit ?? '',
      spells: Array.isArray(l.spells) ? /** @type {SpeciesSpell[]} */ (l.spells) : [],
      cantripChoice: l.cantripChoice ?? null,
      traits: [],
      effects: /** @type {Record<string, unknown>[]} */ (listOf(l.effects).filter((e) => e && typeof e === 'object')),
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
    effects: [],
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

// ## Versions: the choices that are not spell lineages (MYDND-242)
//
// A Goliath's Giant Ancestry and a Dragonborn's Draconic Ancestry are neither a
// size, a lineage nor an ability, so until MYDND-242 the builder never asked
// them. The exporter writes them from 5e.tools' `_versions` as one shape:
//
//   versions: { question: 'Draconic Ancestry', options: [{ name: 'Red',
//     traits: [{ key: 'breath_weapon', … }], removes: ['draconic_ancestry'],
//     effects: [{ type: 'resistance', value: 'fire' }, …] }] }
//
// The answer is `race.version`, a field of its own rather than `subrace`:
// `subrace` names a lineage, which the spell table and the roll log read, and a
// Red Dragonborn is not a lineage of anything.

/**
 * @param {RaceData | null | undefined} raceData
 * @returns {{ question?: unknown, options?: unknown } | null}
 */
const versionsBlock = (raceData) => {
  const v = data(raceData).versions
  return v && typeof v === 'object' ? /** @type {{ question?: unknown, options?: unknown }} */ (v) : null
}

/** @param {unknown} v @returns {unknown[]} */
const listOf = (v) => (Array.isArray(v) ? v : [])

/**
 * The question a species' versions answer — "Giant Ancestry" — or null.
 *
 * @param {RaceData | null | undefined} raceData
 * @returns {string | null}
 */
export function versionQuestion(raceData) {
  if (versionOptions(raceData).length === 0) return null
  const q = versionsBlock(raceData)?.question
  return typeof q === 'string' && q ? q : 'Variant'
}

/**
 * The answers a species' versions offer. An option without a name is dropped:
 * it could be stored but never shown.
 *
 * @param {RaceData | null | undefined} raceData
 * @returns {SpeciesVersion[]}
 */
export function versionOptions(raceData) {
  return listOf(versionsBlock(raceData)?.options).flatMap((raw) => {
    const o = /** @type {Record<string, unknown> | null} */ (raw && typeof raw === 'object' ? raw : null)
    if (!o || typeof o.name !== 'string' || !o.name) return []
    return [{
      name: o.name,
      traits: /** @type {SpeciesTrait[]} */ (listOf(o.traits).filter((t) => t && typeof t === 'object')),
      removes: listOf(o.removes).filter(/** @returns {k is string} */ (k) => typeof k === 'string'),
      effects: /** @type {Record<string, unknown>[]} */ (listOf(o.effects).filter((e) => e && typeof e === 'object')),
      cantrips: listOf(o.cantrips).flatMap((raw) => {
        const c = recordOf(raw)
        if (!c || typeof c.spellList !== 'string' || !c.spellList) return []
        return [{
          lineage: typeof c.lineage === 'string' && c.lineage ? c.lineage : null,
          spellList: c.spellList,
          level: typeof c.level === 'number' && Number.isInteger(c.level) && c.level >= 0 ? c.level : 0,
          ability: typeof c.ability === 'string' && c.ability ? c.ability : null,
        }]
      }),
    }]
  })
}

/**
 * The chosen version, or null.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {string | null | undefined} name
 * @returns {SpeciesVersion | null}
 */
export function selectedVersion(raceData, name) {
  if (!name) return null
  return versionOptions(raceData).find((o) => o.name === name) ?? null
}

/**
 * The species' traits as the chosen version has them: the removed ones gone, a
 * rewritten one in its place (by key), a new one at the end. With no version
 * chosen they are the species' own.
 *
 * @template {SpeciesTrait} T
 * @param {readonly T[] | null | undefined} traits the fence's `traits`
 * @param {SpeciesVersion | null | undefined} version
 * @returns {(T | SpeciesTrait)[]}
 */
export function versionTraits(traits, version) {
  const base = [...(traits ?? [])]
  if (!version) return base
  const removed = new Set(version.removes)
  const byKey = new Map(version.traits.filter((t) => t.key).map((t) => [t.key, t]))
  /** @type {(T | SpeciesTrait)[]} */
  const out = []
  for (const t of base) {
    if (t.key && removed.has(t.key)) continue
    const swap = t.key ? byKey.get(t.key) : undefined
    if (swap) {
      // A rewritten trait keeps the species' own effects (Dwarven Toughness
      // style) — the version's effects are baked from the version itself.
      out.push({ ...t, ...swap })
      byKey.delete(t.key)
    } else {
      out.push(t)
    }
  }
  return [...out, ...byKey.values()]
}

/**
 * The warning shown until the version question is answered — "Choose your
 * Giant Ancestry". One function so the step and the problem list agree.
 *
 * @param {RaceData | null | undefined} raceData
 * @returns {string | null}
 */
export function versionProblem(raceData) {
  const q = versionQuestion(raceData)
  return q ? `Choose your ${q}` : null
}

// ## A version's cantrip (MYDND-260)
//
// The Ryujin's Innate Magic is "one cantrip of your choice from the spell list
// of the class associated with your primary colouration", cast with that
// colour's ability. The exporter writes it on the colour's option, scoped to
// the lineage: `cantrips: [{ lineage: 'Ryujin Tatsumi', spellList: 'Sorcerer',
// level: 0, ability: 'str' }]`. So it is asked only once the character is a
// Ryujin, which for a Tatsumi is level 7 (Draconic Metamorphosis).
//
// The answer is `race.versionCantrip`, a field of its own: `race.cantrip` is
// the High Elf's swap of a lineage cantrip, which this is not.

/**
 * The cantrip this character's version asks for, or null: none without a
 * version, or when it asks one of another lineage.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {unknown} race `character.json.race`, or the draft's
 * @returns {VersionCantrip | null}
 */
export function versionCantripChoice(raceData, race) {
  const r = recordOf(race)
  const version = selectedVersion(raceData, typeof r?.version === 'string' ? r.version : null)
  const subrace = typeof r?.subrace === 'string' ? r.subrace : null
  return version?.cantrips.find((c) => c.lineage === null || c.lineage === subrace) ?? null
}

/**
 * The cantrip picked for it, as the spell pickers store one, or null.
 *
 * @param {unknown} race `character.json.race`
 * @returns {{ name: string, id: string | null, source: string | null } | null}
 */
export function versionCantripPick(race) {
  const p = recordOf(recordOf(race)?.versionCantrip)
  if (!p || typeof p.name !== 'string' || !p.name) return null
  return {
    name: p.name,
    id: typeof p.id === 'string' && p.id ? p.id : null,
    source: typeof p.source === 'string' && p.source ? p.source : null,
  }
}

/**
 * "Choose your Sorcerer cantrip" while one is asked and none is picked. Said,
 * never a gate, as an unpicked class cantrip is.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {unknown} race
 * @returns {string | null}
 */
export function versionCantripProblem(raceData, race) {
  const choice = versionCantripChoice(raceData, race)
  return choice && !versionCantripPick(race) ? `Choose your ${choice.spellList} cantrip` : null
}

// ## After level 1: gated traits and level choices (MYDND-246)
//
// The species step is creation only, and two kinds of species rule arrive
// later. The exporter writes both:
//
// - **A trait's `level`**: the Aasimar's Celestial Revelation "when you reach
//   character level 3". Nothing is chosen then, so the trait is simply not the
//   character's below it (`speciesTraitsAt`).
// - **`levelChoices`**: a question asked at a level, answered on level-up — the
//   Opteran's Metamorphosis at 5, the Nishikin Tatsumi's Draconic
//   Metamorphosis at 7:
//
//     levelChoices: [{ key: 'metamorphosis', level: 5, question: 'Metamorphosis',
//       automatic: { level: 6, option: 'Adult' },
//       options: [{ name: 'Adult', traits: [...] }, { name: 'Larval' }] }]
//
// The answer is `race.levelChoices[key]`, the option's name. An option that
// names a `subrace` moves the character to that lineage when it is answered
// (`withLevelChoice`): the Tatsumi's change is one-way, so `race.subrace` is
// rewritten rather than read through the answer, and every reader of the
// lineage (its spells, its traits, the roll log) sees the Ryujin unchanged.

/**
 * One answer to a level choice. `subrace` is the lineage it moves the
 * character to, or null.
 *
 * @typedef {{ name: string, traits: SpeciesTrait[], subrace: string | null }} LevelChoiceOption
 */
/**
 * A question a species asks at a character level. `lineage` scopes it to a
 * character of that lineage; `automatic` is the answer from a level on,
 * asked or not (the Opteran is an adult from 6).
 *
 * @typedef {{ key: string, level: number, question: string, lineage: string | null, automatic: { level: number, option: string } | null, options: LevelChoiceOption[] }} LevelChoice
 */

/** @param {unknown} v @returns {number | null} */
const levelOf = (v) => (typeof v === 'number' && Number.isInteger(v) && v >= 1 ? v : null)

/**
 * The level choices a species asks. One without a key, a level, or an option
 * with a name is dropped: it could be neither stored nor shown.
 *
 * @param {RaceData | null | undefined} raceData
 * @returns {LevelChoice[]}
 */
export function levelChoices(raceData) {
  return listOf(data(raceData).levelChoices).flatMap((raw) => {
    const c = recordOf(raw)
    const level = levelOf(c?.level)
    if (!c || typeof c.key !== 'string' || !c.key || level === null) return []
    const options = listOf(c.options).flatMap((o) => {
      const opt = recordOf(o)
      if (!opt || typeof opt.name !== 'string' || !opt.name) return []
      return [{
        name: opt.name,
        traits: /** @type {SpeciesTrait[]} */ (listOf(opt.traits).filter((t) => t && typeof t === 'object')),
        subrace: typeof opt.subrace === 'string' && opt.subrace ? opt.subrace : null,
      }]
    })
    if (options.length === 0) return []
    const auto = recordOf(c.automatic)
    const autoLevel = levelOf(auto?.level)
    const autoOption = typeof auto?.option === 'string' ? auto.option : null
    return [{
      key: c.key,
      level,
      question: typeof c.question === 'string' && c.question ? c.question : c.key,
      lineage: typeof c.lineage === 'string' && c.lineage ? c.lineage : null,
      automatic: autoLevel !== null && autoOption && options.some((o) => o.name === autoOption)
        ? { level: autoLevel, option: autoOption }
        : null,
      options,
    }]
  })
}

/**
 * The stored answers, `race.levelChoices`, by key. Only strings count.
 *
 * @param {unknown} race
 * @returns {Record<string, string>}
 */
export function levelChoiceAnswers(race) {
  const stored = recordOf(recordOf(race)?.levelChoices)
  if (!stored) return {}
  /** @type {Record<string, string>} */
  const out = {}
  for (const [k, v] of Object.entries(stored)) if (typeof v === 'string' && v) out[k] = v
  return out
}

/**
 * The option a character at `totalLevel` has for this choice, or null: none
 * below its level; the automatic one from its level on, whatever was answered
 * (an Opteran that stayed larval at 5 is an adult at 6); else the stored one.
 *
 * @param {LevelChoice} choice
 * @param {unknown} race `character.json.race`
 * @param {number} totalLevel
 * @returns {LevelChoiceOption | null}
 */
export function levelChoiceAnswer(choice, race, totalLevel) {
  if (totalLevel < choice.level) return null
  const name = choice.automatic && totalLevel >= choice.automatic.level
    ? choice.automatic.option
    : levelChoiceAnswers(race)[choice.key]
  return choice.options.find((o) => o.name === name) ?? null
}

/**
 * The level choices a character reaching `totalLevel` is asked: at **or past**
 * the choice's level and still unanswered, as a subclass left at "None yet" is
 * asked again on the next level; of its lineage, when the choice names one; and
 * not once its automatic answer has taken over.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {unknown} race `character.json.race`, before the level
 * @param {number} totalLevel the level being reached
 * @returns {LevelChoice[]}
 */
export function levelChoicesDue(raceData, race, totalLevel) {
  const answers = levelChoiceAnswers(race)
  const subrace = recordOf(race)?.subrace ?? null
  return levelChoices(raceData).filter(
    (c) =>
      totalLevel >= c.level &&
      !(c.key in answers) &&
      (c.lineage === null || c.lineage === subrace) &&
      !(c.automatic && totalLevel >= c.automatic.level),
  )
}

/**
 * `race` with a level choice answered: the name stored under the choice's key,
 * and the lineage moved when the option names one. `null` clears the answer
 * (and moves nothing back: an answer is applied once, at the save).
 *
 * @template {Record<string, unknown>} R
 * @param {RaceData | null | undefined} raceData
 * @param {R} race
 * @param {string} key
 * @param {string | null} name
 * @returns {R}
 */
export function withLevelChoice(raceData, race, key, name) {
  const rest = Object.fromEntries(Object.entries(levelChoiceAnswers(race)).filter(([k]) => k !== key))
  if (name === null) return { ...race, levelChoices: rest }
  const option = levelChoices(raceData).find((c) => c.key === key)?.options.find((o) => o.name === name) ?? null
  if (!option) return race
  return {
    ...race,
    levelChoices: { ...rest, [key]: name },
    ...(option.subrace ? { subrace: option.subrace } : {}),
  }
}

/** @param {Record<string, unknown> | null | undefined} s @returns {SpeciesTrait[]} */
const traitsOf = (s) => /** @type {SpeciesTrait[]} */ (listOf(s?.traits).filter((t) => t && typeof t === 'object'))

/**
 * The species' own traits and its homebrew lineage's, before any version, and
 * every other lineage's trait keys.
 *
 * The lineage is read off `subraces` by name, not through `selectedLineage`:
 * a carapacean has spell lineages *and* subraces of the same names, and
 * `lineageOptions` answers the spell ones, which carry no traits.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {unknown} race
 * @returns {{ base: SpeciesTrait[], elsewhere: Set<string | undefined> }}
 */
function speciesAndLineageTraits(raceData, race) {
  const r = recordOf(race)
  const subraces = listOf(data(raceData).subraces).map(recordOf)
  const subrace = typeof r?.subrace === 'string' ? r.subrace : null
  const lineage = subrace ? subraces.find((s) => s?.name === subrace) : null
  return {
    base: [...traitsOf(data(raceData)), ...traitsOf(lineage)],
    elsewhere: new Set(subraces.filter((s) => s !== lineage).flatMap((s) => traitsOf(s).map((t) => t.key))),
  }
}

/**
 * The chosen version's rewrites this character has. A version rewrites the
 * lineage's traits as well as the species': the Tatsumi's colour is asked of
 * the species and rewrites the Nishikin's Slumbering Dragon and the Ryujin's
 * breath (MYDND-260). A rewrite of another lineage's trait is not this
 * character's, so it is dropped rather than added: a Red Nishikin has no
 * Heartening Breath.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {unknown} race `character.json.race`, or the draft's
 * @returns {SpeciesTrait[]}
 */
export function ownVersionTraits(raceData, race) {
  const r = recordOf(race)
  const version = selectedVersion(raceData, typeof r?.version === 'string' ? r.version : null)
  if (!version) return []
  const { base, elsewhere } = speciesAndLineageTraits(raceData, race)
  const present = new Set(base.map((t) => t.key))
  return version.traits.filter((t) => present.has(t.key) || !elsewhere.has(t.key))
}

/**
 * Every species trait a character has at `totalLevel`: the species' own as its
 * version rewrites them, its homebrew lineage's (a carapacean's Decoration, a
 * Ryujin's breath), and its level choices' answers (an adult Opteran's Flight)
 * — less any trait whose `level` it has not reached.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {unknown} race `character.json.race`
 * @param {number} totalLevel
 * @returns {SpeciesTrait[]}
 */
export function speciesTraitsAt(raceData, race, totalLevel) {
  const r = recordOf(race)
  const version = selectedVersion(raceData, typeof r?.version === 'string' ? r.version : null)
  const { base } = speciesAndLineageTraits(raceData, race)
  const rewritten = versionTraits(base, version && { ...version, traits: ownVersionTraits(raceData, race) })
  const answered = levelChoices(raceData).flatMap((c) => levelChoiceAnswer(c, race, totalLevel)?.traits ?? [])
  const picked = traitChoices(raceData).flatMap((c) => distinctOptions(traitChoicePicks(race, c)).flatMap((o) => o.traits))
  return [...rewritten, ...answered, ...picked].filter((t) => (levelOf(t.level) ?? 1) <= totalLevel)
}

// ## N of M: trait choices (MYDND-259)
//
// The Lotol's Adaptive Polymorphism and the Mycelian's Symbiotic Assimilation
// are "choose two of the following adaptations": neither a version (one
// answer) nor a level choice (one answer, later). The exporter writes them as
//
//   traitChoices: [{ key: 'adaptations', question: 'Adaptations', count: 2,
//     trait: 'adaptive_polymorphism', options: [{ name: 'Shocking Skin',
//     traits: [...], effects: [...] }, { name: 'Muscle Memory (Any)',
//     repeatable: true, proficiencies: [...] }] }]
//
// The answer is `race.traitChoices[key]`, **one option name per slot**, so the
// step asks "Adaptation 1" and "Adaptation 2" and a repeatable option is the
// same name in both. An option's traits join the species' (`speciesTraitsAt`),
// its proficiencies its choices (`proficiencyEntries`, one per time picked),
// and its effects are baked as a version's are (`speciesTraitChoiceEffects`).
// An unanswered slot grants nothing: no option is guessed.

/**
 * One answer to a trait choice. `repeatable` may fill more than one slot.
 *
 * @typedef {{ name: string, traits: SpeciesTrait[], effects: Record<string, unknown>[], proficiencies: Record<string, unknown>[], repeatable: boolean }} TraitChoiceOption
 */
/**
 * A question of `count` picks from `options`. `trait` is the key of the trait
 * that asks it, or null.
 *
 * @typedef {{ key: string, question: string, count: number, trait: string | null, options: TraitChoiceOption[] }} TraitChoice
 */

/**
 * The trait choices a species asks. One without a key, a whole count, or an
 * option with a name is dropped: it could be neither stored nor shown. The
 * count is capped at what the options can fill.
 *
 * @param {RaceData | null | undefined} raceData
 * @returns {TraitChoice[]}
 */
export function traitChoices(raceData) {
  return listOf(data(raceData).traitChoices).flatMap((raw) => {
    const c = recordOf(raw)
    const count = c?.count
    if (!c || typeof c.key !== 'string' || !c.key) return []
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) return []
    const options = listOf(c.options).flatMap((o) => {
      const opt = recordOf(o)
      if (!opt || typeof opt.name !== 'string' || !opt.name) return []
      return [{
        name: opt.name,
        traits: /** @type {SpeciesTrait[]} */ (listOf(opt.traits).filter((t) => t && typeof t === 'object')),
        effects: /** @type {Record<string, unknown>[]} */ (listOf(opt.effects).filter((e) => e && typeof e === 'object')),
        proficiencies: listOf(opt.proficiencies).map(recordOf).filter(/** @returns {p is Record<string, unknown>} */ (p) => p != null),
        repeatable: opt.repeatable === true,
      }]
    })
    if (options.length === 0) return []
    const fillable = options.some((o) => o.repeatable) ? count : Math.min(count, options.length)
    return [{
      key: c.key,
      question: typeof c.question === 'string' && c.question ? c.question : c.key,
      count: fillable,
      trait: typeof c.trait === 'string' && c.trait ? c.trait : null,
      options,
    }]
  })
}

/**
 * The stored slots of one choice, `race.traitChoices[key]`, as `count` entries:
 * the option name, or null for an empty slot. Anything else stored is null.
 *
 * @param {unknown} race
 * @param {TraitChoice} choice
 * @returns {(string | null)[]}
 */
export function traitChoiceSlots(race, choice) {
  const stored = listOf(recordOf(recordOf(race)?.traitChoices)?.[choice.key])
  return Array.from({ length: choice.count }, (_, i) => {
    const v = stored[i]
    return typeof v === 'string' && v ? v : null
  })
}

/**
 * The options a character has picked for one choice, slot by slot: an option
 * the species does not offer is dropped, and so is a second pick of an option
 * that is not repeatable, so a stale answer neither satisfies the step nor
 * reaches the sheet.
 *
 * @param {unknown} race `character.json.race`
 * @param {TraitChoice} choice
 * @returns {TraitChoiceOption[]}
 */
export function traitChoicePicks(race, choice) {
  /** @type {TraitChoiceOption[]} */
  const out = []
  for (const name of traitChoiceSlots(race, choice)) {
    const option = choice.options.find((o) => o.name === name)
    if (!option) continue
    if (!option.repeatable && out.includes(option)) continue
    out.push(option)
  }
  return out
}

/**
 * Each picked option once, in pick order: a trait is had once however many
 * times its option was taken.
 *
 * @param {readonly TraitChoiceOption[]} picks
 * @returns {TraitChoiceOption[]}
 */
const distinctOptions = (picks) => [...new Set(picks)]

/**
 * `race` with one slot of a trait choice set, or cleared with `null`. A slot
 * past the choice's count changes nothing.
 *
 * @template {Record<string, unknown>} R
 * @param {RaceData | null | undefined} raceData
 * @param {R} race
 * @param {string} key
 * @param {number} slot
 * @param {string | null} name
 * @returns {R}
 */
export function withTraitChoice(raceData, race, key, slot, name) {
  const choice = traitChoices(raceData).find((c) => c.key === key)
  if (!choice || !Number.isInteger(slot) || slot < 0 || slot >= choice.count) return race
  const slots = traitChoiceSlots(race, choice)
  slots[slot] = name && choice.options.some((o) => o.name === name) ? name : null
  return {
    ...race,
    traitChoices: { ...(recordOf(race.traitChoices) ?? {}), [key]: slots },
  }
}

/**
 * The options a slot may offer: every option, less a non-repeatable one picked
 * in another slot.
 *
 * @param {unknown} race
 * @param {TraitChoice} choice
 * @param {number} slot
 * @returns {TraitChoiceOption[]}
 */
export function traitChoiceOffered(race, choice, slot) {
  const others = new Set(traitChoiceSlots(race, choice).filter((_, i) => i !== slot))
  return choice.options.filter((o) => o.repeatable || !others.has(o.name))
}

/**
 * The warning shown until every slot is filled: "Choose 2 adaptations". One
 * function, so the step and the problem list agree.
 *
 * @param {TraitChoice} choice
 * @returns {string}
 */
export function traitChoiceProblem(choice) {
  const noun = choice.question.toLowerCase()
  return choice.count === 1 ? `Choose one of the ${noun}` : `Choose ${choice.count} ${noun}`
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
  const versionAsk = versionProblem(raceData)
  if (versionAsk && !selectedVersion(raceData, race?.version ?? null)) {
    problems.push(versionAsk)
  }
  // A Ryujin's Innate Magic cantrip, once the colour is chosen (MYDND-260).
  const cantripAsk = versionCantripProblem(raceData, race)
  if (cantripAsk) problems.push(cantripAsk)
  // Only worth asking once a lineage is settled, because that is when the
  // rules ask it, and asking earlier reads as a second unrelated question.
  if (needsAbilityChoice(raceData) && !speciesSpellcastingAbility(raceData, race)) {
    problems.push(abilityQuestion(raceData).problem)
  }
  // Two of N adaptations (MYDND-259), before the proficiencies a pick opens.
  for (const choice of traitChoices(raceData)) {
    if (traitChoicePicks(race, choice).length < choice.count) problems.push(traitChoiceProblem(choice))
  }
  // Skills, tools, languages, weapons (MYDND-243): one warning per short choice.
  for (const choice of proficiencyChoices(raceData, race)) {
    if (proficiencyPicks(race, choice).length < choice.count) problems.push(proficiencyProblem(choice))
  }
  return problems
}

// ## Proficiencies: skills, tools, languages and weapons (MYDND-243)
//
// 5e.tools states a species' proficiencies as structure, and the exporter
// writes them as one list on the fence. The species' own sit beside its chosen
// lineage's (`subraces[].proficiencies`) and its chosen version's
// (`versions.options[].proficiencies`, Custom Lineage's skill):
//
//   proficiencies:
//     - { kind: skill, fixed: [stealth] }
//     - { kind: skill, key: skill, count: 1, from: [insight, perception, survival] }
//     - { kind: tool, key: tool, count: 1, category: artisan }
//
// A fixed entry is simply had. A choice is asked, and its answer stored on
// `race.proficiencies[key]`. It is never guessed, so an unanswered Elf has no
// Keen Senses skill rather than the first of three. The values are already the
// plugin's vocabulary: a skill slug, a `tools.js` slug, a language or weapon
// by name.

/** @typedef {'skill' | 'tool' | 'language' | 'weapon'} ProficiencyKind */
/**
 * One choice a species' proficiencies ask. `from` null is any of the kind,
 * narrowed by `category` where there is one (`artisan`, `standard`).
 *
 * @typedef {{ kind: ProficiencyKind, key: string, count: number, from: string[] | null, category: string | null }} ProficiencyChoice
 */

/** @type {readonly ProficiencyKind[]} */
export const PROFICIENCY_KINDS = Object.freeze(/** @type {ProficiencyKind[]} */ (['skill', 'tool', 'language', 'weapon']))

/** @param {unknown} v @returns {v is ProficiencyKind} */
const isKind = (v) => typeof v === 'string' && /** @type {readonly string[]} */ (PROFICIENCY_KINDS).includes(v)

/** @param {unknown} v @returns {string[]} */
const strings = (v) => listOf(v).filter(/** @returns {s is string} */ (s) => typeof s === 'string' && s.length > 0)

/** @param {unknown} v @returns {Record<string, unknown> | null} */
const recordOf = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : null)

/**
 * Every `proficiencies` entry that applies: the species' own, then its chosen
 * lineage's, then its chosen version's.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {DraftRace | null | undefined} race
 * @returns {Record<string, unknown>[]}
 */
function proficiencyEntries(raceData, race) {
  const named = (/** @type {unknown} */ list, /** @type {string | null | undefined} */ name) =>
    name ? listOf(list).map(recordOf).find((r) => r?.name === name) ?? null : null
  const lineage = named(data(raceData).subraces, race?.subrace)
  const version = named(versionsBlock(raceData)?.options, race?.version)
  // A picked trait choice's, once per time it was picked (MYDND-259): a
  // Mycelian with Muscle Memory twice has two skills to choose.
  const picked = traitChoices(raceData).flatMap((c) => {
    const picks = traitChoicePicks(race, c)
    return distinctOptions(picks).flatMap((o) => {
      const times = picks.filter((p) => p === o).length
      return o.proficiencies.map((p) => (typeof p.count === 'number' ? { ...p, count: p.count * times } : p))
    })
  })
  return [data(raceData).proficiencies, lineage?.proficiencies, version?.proficiencies, picked]
    .flatMap(listOf)
    .map(recordOf)
    .filter(/** @returns {e is Record<string, unknown>} */ (e) => e != null)
}

/**
 * What the species simply has, of one kind.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {DraftRace | null | undefined} race
 * @param {ProficiencyKind} kind
 * @returns {string[]}
 */
export function fixedProficiencies(raceData, race, kind) {
  const out = proficiencyEntries(raceData, race)
    .filter((e) => e.kind === kind && !e.key)
    .flatMap((e) => strings(e.fixed))
  return [...new Set(out)]
}

/**
 * The choices the species asks. One with no key or no whole count is dropped:
 * it could be shown, but its answer could never be stored.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {DraftRace | null | undefined} race
 * @returns {ProficiencyChoice[]}
 */
export function proficiencyChoices(raceData, race) {
  return proficiencyEntries(raceData, race).flatMap((e) => {
    const count = e.count
    if (!isKind(e.kind) || typeof e.key !== 'string' || !e.key) return []
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) return []
    const from = strings(e.from)
    return [{
      kind: e.kind,
      key: e.key,
      count,
      from: from.length > 0 ? from : null,
      category: typeof e.category === 'string' && e.category ? e.category : null,
    }]
  })
}

/**
 * The answers given to one choice: distinct strings, at most `count`, and
 * inside `from` where it has one. A stale answer outside the list is not
 * counted, so it neither satisfies the step nor reaches the sheet.
 *
 * @param {DraftRace | null | undefined} race
 * @param {ProficiencyChoice} choice
 * @returns {string[]}
 */
export function proficiencyPicks(race, choice) {
  const from = choice.from
  const raw = strings(race?.proficiencies?.[choice.key])
  const allowed = from ? raw.filter((p) => from.includes(p)) : raw
  return [...new Set(allowed)].slice(0, choice.count)
}

/** @type {Record<ProficiencyKind, [string, string]>} */
const NOUN = {
  skill: ['skill', 'skills'],
  tool: ['tool', 'tools'],
  language: ['language', 'languages'],
  weapon: ['weapon', 'weapons'],
}

/**
 * The question as the step labels it: "Skill", "2 skills".
 *
 * @param {ProficiencyChoice} choice
 * @returns {string}
 */
export function proficiencyLabel(choice) {
  const [one, many] = NOUN[choice.kind]
  const text = choice.count === 1 ? one : `${choice.count} ${many}`
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * The warning shown until a choice is answered: "Choose a skill", "Choose 2
 * skills". One function, so the step and the problem list agree.
 *
 * @param {ProficiencyChoice} choice
 * @returns {string}
 */
export function proficiencyProblem(choice) {
  const [one, many] = NOUN[choice.kind]
  return choice.count === 1 ? `Choose a ${one}` : `Choose ${choice.count} ${many}`
}

/**
 * Everything the species grants of one kind: fixed, then picked.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {DraftRace | null | undefined} race
 * @param {ProficiencyKind} kind
 * @returns {string[]}
 */
export function speciesProficiencies(raceData, race, kind) {
  const picked = proficiencyChoices(raceData, race)
    .filter((c) => c.kind === kind)
    .flatMap((c) => proficiencyPicks(race, c))
  return [...new Set([...fixedProficiencies(raceData, race, kind), ...picked])]
}

// ## A feat of the player's choice (MYDND-244)
//
// The 2024 Human's Versatile grants "an Origin feat of your choice", and Custom
// Lineage "one feat of your choice for which you qualify". The exporter writes
// it on the fence, the species' own or a lineage's (Variant Human):
//
//   feat:
//     count: 1
//     kinds: [origin]    # absent: any feat
//
// The answer is **not** stored on `race`. It is a `featureChoices` entry under
// `SPECIES_FEAT_KEY`, in the shape a feat taken at an Ability Score Improvement
// has (`{ type: 'feat', featId, featName, featSource, abilityBonus, choices }`),
// because that shape is what every reader of a held feat already reads: the
// json's `feats`, `featToEffects` and its `abilityBonus`, `heldFeatEffects` for
// Magic Initiate's spells, the builder's score arithmetic. A second `originFeat`
// would have needed a branch in each.

/** Where the species' feat is answered in `featureChoices`; `species:feat_2` for a second. */
export const SPECIES_FEAT_KEY = 'species:feat'

/**
 * The kinds "any feat" offers at creation: not an Epic Boon (level 19) nor a
 * Fighting Style (taken through the Fighting Style feature).
 *
 * @type {readonly string[]}
 */
export const ANY_SPECIES_FEAT_KINDS = Object.freeze(['origin', 'general'])

/**
 * A feat the species grants a choice of: how many, and of which kinds. `kinds`
 * null is any feat.
 *
 * @typedef {{ count: number, kinds: string[] | null }} SpeciesFeatGrant
 */

/**
 * The species' feat grant, its own or its chosen lineage's, or null.
 *
 * @param {RaceData | null | undefined} raceData
 * @param {DraftRace | null | undefined} race
 * @returns {SpeciesFeatGrant | null}
 */
export function speciesFeatGrant(raceData, race) {
  const lineage = race?.subrace
    ? listOf(data(raceData).subraces).map(recordOf).find((r) => r?.name === race.subrace) ?? null
    : null
  const raw = recordOf(data(raceData).feat) ?? recordOf(lineage?.feat)
  const count = raw?.count
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) return null
  const kinds = strings(raw?.kinds)
  return { count, kinds: kinds.length > 0 ? kinds : null }
}

/**
 * The `featureChoices` keys a grant's picks are stored under, one per feat.
 *
 * @param {SpeciesFeatGrant | null | undefined} grant
 * @returns {string[]}
 */
export function speciesFeatKeys(grant) {
  return Array.from({ length: grant?.count ?? 0 }, (_, i) => (i === 0 ? SPECIES_FEAT_KEY : `${SPECIES_FEAT_KEY}_${i + 1}`))
}

/**
 * Whether a `featureChoices` key is a species feat's, whichever number.
 *
 * @param {string} key
 * @returns {boolean}
 */
export function isSpeciesFeatKey(key) {
  return key === SPECIES_FEAT_KEY || key.startsWith(`${SPECIES_FEAT_KEY}_`)
}

/**
 * Whether a feat note may answer the grant: its kind is one the grant names,
 * or, for "any feat", an Origin or a General feat.
 *
 * @param {SpeciesFeatGrant | null | undefined} grant
 * @param {{ kind?: string | null } | null | undefined} feat
 * @returns {boolean}
 */
export function speciesFeatAllowed(grant, feat) {
  if (!grant || !feat?.kind) return false
  return (grant.kinds ?? ANY_SPECIES_FEAT_KINDS).includes(feat.kind)
}

/**
 * The question as the step labels it, and the warning until it is answered:
 * "Origin feat" / "Choose an Origin feat", "Feat" / "Choose a feat".
 *
 * @param {SpeciesFeatGrant} grant
 * @returns {{ label: string, problem: string }}
 */
export function speciesFeatText(grant) {
  const origin = grant.kinds?.length === 1 && grant.kinds[0] === 'origin'
  return origin
    ? { label: 'Origin feat', problem: 'Choose an Origin feat' }
    : { label: 'Feat', problem: 'Choose a feat' }
}
