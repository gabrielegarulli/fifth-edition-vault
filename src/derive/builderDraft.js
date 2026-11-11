// Pure operations on the Character Builder draft. Mirrors the ops-module
// pattern of vaultState.js / characterJson.js: functions take a draft and
// return a new draft (or a derived value) — no IO, no React.

import { backgroundAbilityBonus, pointsSpent } from './vaultDerive.js'
import { POINT_COST, POINT_BUY_BUDGET } from '@vault/derive/dnd5e.js'

import { featAbilityChoice } from './featAbilities.js'
import { withIncreases } from './abilityIncreases.js'
import { resolvedSize } from './speciesChoices.js'
import { subclassCasting } from './builderSpellCaps.js'

// PHB 2024 multiclass ability score prerequisites. Each entry is a list of
// requirement groups; each group is a list of {ability, score} pairs that must
// ALL be met — the class qualifies if ANY group is met. Classes absent from
// this table (homebrew) skip prereq validation.
const MULTICLASS_PREREQS = {
  Barbarian: [[{ ability: 'str', score: 13 }]],
  Bard: [[{ ability: 'cha', score: 13 }]],
  Cleric: [[{ ability: 'wis', score: 13 }]],
  Druid: [[{ ability: 'wis', score: 13 }]],
  Fighter: [[{ ability: 'str', score: 13 }], [{ ability: 'dex', score: 13 }]],
  Monk: [[{ ability: 'dex', score: 13 }, { ability: 'wis', score: 13 }]],
  Paladin: [[{ ability: 'str', score: 13 }, { ability: 'cha', score: 13 }]],
  Ranger: [[{ ability: 'dex', score: 13 }, { ability: 'wis', score: 13 }]],
  Rogue: [[{ ability: 'dex', score: 13 }]],
  Sorcerer: [[{ ability: 'cha', score: 13 }]],
  Warlock: [[{ ability: 'cha', score: 13 }]],
  Wizard: [[{ ability: 'int', score: 13 }]],
}

export const INITIAL_DRAFT = {
  step: 0,
  name: '',
  avatarUrl: '',
  playerId: null,
  newPlayerName: '',
  race: null,
  classes: [{ id: null, name: null, source: null, level: 1, subclass: null, spellcastingAbility: null }],
  background: null,
  originFeat: null,
  backgroundBonuses: { mode: 'two_one', primary: null, secondary: null },
  abilityMethod: 'pointbuy',
  abilityScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
  saveProficiencies: [],
  skillProficiencies: [],
  masteredWeapons: [],
  featureChoices: {},
  familiars: [],
  spells: { cantrips: [], known: [] },
  equipment: { option: null, choices: {}, granted: false },
}

export function normalizeSpells(raw) {
  if (Array.isArray(raw)) return { cantrips: [], known: [] }
  if (!raw || typeof raw !== 'object') return { cantrips: [], known: [] }
  const out = {
    cantrips: Array.isArray(raw.cantrips) ? raw.cantrips : [],
    known: Array.isArray(raw.known) ? raw.known : [],
  }
  if (Array.isArray(raw.prepared)) {
    out.prepared = raw.prepared
  }
  return out
}

// The Equipment step's draft state — VAULT-169.
//
//   option   the lettered option the player took ('a', 'b', 'c'), or null
//   choices  entry index → the catalog row picked, for the entries the book
//            left open ("holy symbol", "musical instrument")
//   granted  whether the kit has already been written to `inventory`
//
// **`granted` is the whole reason this is stored rather than recomputed.**
// `add_equipment_to_inventory` *stacks* — it adds to an existing row's quantity
// rather than replacing it — so a player who presses Save Character a second
// time on a finished character would silently receive their starting kit twice.
// The flag is set when the grant succeeds and is never cleared, which makes
// re-saving a no-op rather than a duplicate.
//
// `equipment` existed as an empty array before this and was written into
// `character.json` by `baseJson` while being read by nothing at all. A saved
// draft can therefore carry `[]` here, which this normalises rather than
// letting `draft.equipment.option` throw on an array.
export function normalizeEquipment(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...INITIAL_DRAFT.equipment }
  }
  return {
    option: typeof raw.option === 'string' ? raw.option : null,
    choices: raw.choices && typeof raw.choices === 'object' && !Array.isArray(raw.choices)
      ? raw.choices
      : {},
    granted: raw.granted === true,
  }
}

export function draftFromCharacter(char) {
  const j = char.json ?? {}
  return {
    ...INITIAL_DRAFT,
    step: char.builder_step ?? 0,
    name: char.name ?? j.name ?? '',
    avatarUrl: j.avatarUrl ?? '',
    playerId: char.player_id ?? null,
    race: j.race ?? null,
    classes: j.classes ?? INITIAL_DRAFT.classes,
    background: j.background ?? null,
    originFeat: j.originFeat ?? null,
    // A saved character predating VAULT-165 has no `mode`, which reads as
    // 'two_one' everywhere. It is left absent rather than filled in, so
    // re-opening an old draft is not a silent rewrite of its bonuses.
    backgroundBonuses: j.backgroundBonuses ?? { ...INITIAL_DRAFT.backgroundBonuses },
    abilityMethod: j.abilityMethod ?? 'pointbuy',
    abilityScores: j.abilityScores ?? INITIAL_DRAFT.abilityScores,
    saveProficiencies: j.saveProficiencies ?? [],
    skillProficiencies: j.skillProficiencies ?? [],
    masteredWeapons: j.masteredWeapons ?? [],
    featureChoices: j.featureChoices ?? {},
    familiars: j.familiars ?? [],
    spells: normalizeSpells(j.spells),
    equipment: normalizeEquipment(j.equipment),
  }
}

// --- Ability scores ---------------------------------------------------------

export function asiScoreBonus(draft, key) {
  return Object.values(draft.featureChoices ?? {})
    .filter(c => c?.type === 'score')
    .reduce((sum, c) => sum + (c.first === key ? 1 : 0) + (c.second === key ? 1 : 0), 0)
}

// The half-feat increases a draft's feat and boon picks have resolved —
// VAULT-166.
//
// Separate from `asiScoreBonus` because it cannot be answered by the draft
// alone: a feat offering one option stores no `abilityBonus` at all (that is the
// contract `featToEffects` and CONTEXT.md share), so the catalog row is the only
// place the ability is written down. `feats` is therefore required to get a
// complete answer and optional to call — a caller without the rows in hand gets
// the pre-VAULT-166 number rather than a crash.
//
// This is the builder's *display* arithmetic, deliberately mirroring what
// `effectBaking.js` bakes rather than replacing it. The saved character's scores
// still come from the effects pipeline; this exists so the ability panel and the
// picker's own cap check agree with what the character will become.
export function featScoreBonus(draft, key, feats = []) {
  return featScoreIncreases(draft, key, feats).reduce((sum, i) => sum + i.amount, 0)
}

// The same increases one by one, each with the cap its feat names (an Epic
// Boon's 30) — what `effectiveScore` needs to hold them to it (VAULT-262).
export function featScoreIncreases(draft, key, feats = []) {
  const byId = new Map((feats ?? []).filter(Boolean).map(f => [f.id, f]))
  return Object.values(draft.featureChoices ?? {})
    .filter(c => (c?.type === 'feat' || c?.type === 'boon') && c.featId)
    .flatMap(c => {
      const choice = featAbilityChoice(byId.get(c.featId))
      if (!choice) return []
      // The single-option case resolves itself, exactly as `featToEffects` does;
      // anything else counts only once the player has answered.
      const ability = choice.options.length === 1 ? choice.options[0] : c.abilityBonus
      return ability === key ? [{ amount: choice.amount, max: choice.max }] : []
    })
}

// Every increase `key` takes in a draft, before any cap: the background's, each
// ASI's +1, each feat's. `effectiveScore` holds them to their maximum; a caller
// that wants to say what the cap swallowed passes them to `increasesLost`.
export function scoreIncreases(draft, key, feats = []) {
  const asis = Object.values(draft.featureChoices ?? {})
    .filter(c => c?.type === 'score')
    .flatMap(c => [c.first, c.second].filter(k => k === key).map(() => ({ amount: 1 })))
  return [
    { amount: backgroundAbilityBonus(draft.backgroundBonuses, key) },
    ...asis,
    ...featScoreIncreases(draft, key, feats),
  ]
}

// The score the draft will have: its base, raised by every increase but never
// past that increase's own maximum (VAULT-262). It agrees with
// `vaultAbilityScores`, which is what the saved character is baked by.
export function effectiveScore(draft, key, feats = []) {
  return withIncreases(draft.abilityScores[key] ?? 8, scoreIncreases(draft, key, feats))
}

// The plain sum, before any cap — what an increase picker's "at 20" test reads.
// A picker subtracts its own pick and asks whether the rest already reaches the
// cap; against the capped score that undercounts (20 with its own +1 inside reads
// as 19) and would offer an ability the +1 cannot raise (VAULT-262).
export function uncappedScore(draft, key, feats = []) {
  return scoreIncreases(draft, key, feats).reduce((sum, i) => sum + i.amount, draft.abilityScores[key] ?? 8)
}

export function pointsRemaining(draft) {
  return POINT_BUY_BUDGET - pointsSpent(draft.abilityScores)
}

export function canIncrementScore(draft, key) {
  const s = draft.abilityScores[key]
  if (s >= 15) return false
  const cost = (POINT_COST[s + 1] ?? Infinity) - (POINT_COST[s] ?? 0)
  return pointsRemaining(draft) >= cost
}

export function totalLevel(draft) {
  return draft.classes.reduce((sum, c) => sum + (c.level ?? 0), 0)
}

// --- Background ability increases (VAULT-165) --------------------------------

// The two allocation modes a 2024 background offers. `two_one` is the default
// and the shape every pre-VAULT-165 character is stored in, so an absent `mode`
// is read as this one rather than being treated as unset.
export const BACKGROUND_BONUS_MODES = ['two_one', 'three_ones']

const TWO_ONE_SLOTS = ['primary', 'secondary']
const THREE_ONES_SLOTS = ['first', 'second', 'third']

export function backgroundBonusMode(draft) {
  return draft.backgroundBonuses?.mode === 'three_ones' ? 'three_ones' : 'two_one'
}

// `three_ones` has nothing to choose — it raises all three eligible abilities —
// so switching into it fills the slots outright. Switching back to `two_one`
// keeps whatever +2/+1 was picked before, because the two modes' fields do not
// overlap: a player toggling to see the other option and back loses nothing.
export function withBackgroundBonusMode(draft, mode, eligible) {
  if (!BACKGROUND_BONUS_MODES.includes(mode)) return draft
  const bonuses = draft.backgroundBonuses ?? {}
  if (mode === 'two_one') return { ...draft, backgroundBonuses: { ...bonuses, mode } }
  const [first = null, second = null, third = null] = eligible ?? []
  return { ...draft, backgroundBonuses: { ...bonuses, mode, first, second, third } }
}

// Picking the same ability for both the +2 and the +1 is not a legal spread, so
// choosing one for a slot clears the other slot if it already held it. The
// Selects also disable the taken option, but that only stops a *forward* pick —
// an old draft can arrive with both slots already equal.
export function withBackgroundBonus(draft, slot, ability) {
  if (!TWO_ONE_SLOTS.includes(slot)) return draft
  const bonuses = draft.backgroundBonuses ?? {}
  const other = slot === 'primary' ? 'secondary' : 'primary'
  return {
    ...draft,
    backgroundBonuses: {
      ...bonuses,
      mode: 'two_one',
      [slot]: ability || null,
      ...(ability && bonuses[other] === ability ? { [other]: null } : {}),
    },
  }
}

// Swapping Acolyte (INT/WIS/CHA) for Soldier (STR/DEX/CON) has to drop a +2 in
// Intelligence — the new background does not offer it. Without this the draft
// keeps a bonus no background grants, and because `vaultAbilityScores` reads the
// stored slots rather than re-checking the catalog, that bonus survives all the
// way onto the finished sheet.
export function withBackgroundSelected(draft, bg, eligible) {
  const background = bg ? { id: bg.id, name: bg.name, source: bg.source } : null
  const allowed = new Set(eligible ?? [])
  const bonuses = draft.backgroundBonuses ?? {}
  const kept = {}
  for (const slot of [...TWO_ONE_SLOTS, ...THREE_ONES_SLOTS]) {
    kept[slot] = allowed.has(bonuses[slot]) ? bonuses[slot] : null
  }
  const next = { ...bonuses, ...kept }
  // `three_ones` raises all three or it is not that mode at all; if any slot was
  // just cleared, refill from the new background rather than leaving a partial
  // spread that silently grants less than +1/+1/+1.
  if (backgroundBonusMode(draft) === 'three_ones') {
    const [first = null, second = null, third = null] = eligible ?? []
    return { ...draft, background, backgroundBonuses: { ...next, first, second, third } }
  }
  return { ...draft, background, backgroundBonuses: next }
}

// The slugs a Select must offer for `slot`: the background's eligible three,
// plus whatever the draft already holds there. A character built before this
// constraint existed can carry a pick outside the three, and an option a Select
// cannot find renders as an empty box — so the stale value is listed rather
// than dropped, and stays visible until the player changes it.
export function backgroundBonusOptions(draft, slot, eligible) {
  const current = draft.backgroundBonuses?.[slot]
  const options = eligible ?? []
  return current && !options.includes(current) ? [...options, current] : options
}

// --- Class selection --------------------------------------------------------

function blankClass() {
  return { id: null, name: null, source: null, level: 1, subclass: null, spellcastingAbility: null }
}

function classRow(cls) {
  return {
    id: cls?.id ?? null,
    name: cls?.name ?? null,
    source: cls?.source ?? null,
    level: 1,
    subclass: null,
    spellcastingAbility: null,
  }
}

// Selecting a class at index 0 also resets shared draft fields (save/skill
// proficiencies, weapon masteries, feature choices) because the primary class
// determines them. At index > 0, only the class row is replaced — per 5.5e
// multiclass rules, saves and starting skill picks come from the first class
// only.
export function withClassSelected(draft, cls, index = 0) {
  const nextClasses = draft.classes.map((c, i) => (i === index ? classRow(cls) : c))
  if (index === 0) {
    return {
      ...draft,
      classes: nextClasses,
      saveProficiencies: cls?.data?.saveProficiencies ?? [],
      skillProficiencies: [],
      masteredWeapons: [],
      featureChoices: {},
      spells: { cantrips: [], known: [] },
    }
  }
  return withoutMulticlassSkills({ ...draft, classes: nextClasses }, draft.classes[index]?.id)
}

// Subclasses unlock at level 3, so dropping below 3 clears the pick.
export function withClassLevel(draft, level, index = 0) {
  const lvl = Math.min(20, Math.max(1, level))
  return {
    ...draft,
    classes: draft.classes.map((c, i) => (
      i === index ? { ...c, level: lvl, ...(lvl < 3 ? { subclass: null } : {}) } : c
    )),
  }
}

// Append a blank class row. Callers set it via withClassSelected(draft, cls, newIndex).
export function withClassAdded(draft) {
  return { ...draft, classes: [...draft.classes, blankClass()] }
}

// Remove the class at index; the first class is protected — at least one
// class row must remain. Removing a class that's a source of an ASI feat
// choice may leave orphaned entries in featureChoices; those are cleaned by
// finalization if the feature id no longer resolves.
export function withClassRemoved(draft, index) {
  if (index === 0 || index >= draft.classes.length) return draft
  return withoutMulticlassSkills(
    { ...draft, classes: draft.classes.filter((_, i) => i !== index) },
    draft.classes[index]?.id,
  )
}

// A Bard, Ranger or Rogue taken beyond the first class grants one skill pick.
// It cannot share `skillProficiencies` with the first class's level-1 picks —
// writing it there replaced them (VAULT-243) — so it is a bare array in
// featureChoices under its own key, which baseJson already flattens into the
// character's skills. The key is the Obsidian plugin's spelling (MYDND-29).
export function multiclassSkillKey(classId) {
  return `${classId}:multiclass:skills`
}

export function multiclassSkills(draft, classId) {
  const picks = draft.featureChoices?.[multiclassSkillKey(classId)]
  return Array.isArray(picks) ? picks : []
}

export function withMulticlassSkills(draft, classId, skills) {
  return withFeatureChoice(draft, multiclassSkillKey(classId), skills)
}

// A bare array in featureChoices is flattened into skills whether or not the
// class that granted it is still on the draft, so a replaced or removed
// class's pick has to go with it.
function withoutMulticlassSkills(draft, classId) {
  const key = multiclassSkillKey(classId)
  if (classId == null || !(key in (draft.featureChoices ?? {}))) return draft
  const rest = { ...draft.featureChoices }
  delete rest[key]
  return { ...draft, featureChoices: rest }
}

// PHB 2024 multiclass prerequisite check. Returns true for classes without
// prereqs in the hardcoded table (homebrew) — enforcement is intentionally
// permissive for content the app doesn't recognize.
export function multiclassPrereqsMet(effectiveScores, className) {
  const groups = MULTICLASS_PREREQS[className]
  if (!groups) return true
  return groups.some(group => group.every(({ ability, score }) => (effectiveScores?.[ability] ?? 0) >= score))
}

// --- Feature choices & familiars --------------------------------------------

export function withFeatureChoice(draft, featureId, choice) {
  return { ...draft, featureChoices: { ...draft.featureChoices, [featureId]: choice } }
}

export function withFamiliarChoiceCleared(draft, featureId) {
  return {
    ...draft,
    featureChoices: { ...draft.featureChoices, [featureId]: null },
    familiars: draft.familiars.filter(f => f.featureId !== featureId),
  }
}

export function withFamiliarImprovements(draft, featureId, choice) {
  return {
    ...draft,
    featureChoices: { ...draft.featureChoices, [featureId]: choice },
    familiars: draft.familiars.map(f =>
      f.featureId === featureId ? { ...f, improvements: choice.improvements ?? [] } : f
    ),
  }
}

export function familiarFromMonster(featureId, choice, monster) {
  return {
    featureId,
    monsterId: choice.monsterId,
    monsterName: choice.monsterName,
    cr: monster.cr,
    size: monster.size,
    creatureType: monster.creature_type,
    tokenUrl: monster.token_url ?? null,
    imageUrl: monster.image_url ?? null,
    nickname: null,
    data: monster.data,
    currentHp: monster.data?.hp?.average ?? 0,
    improvements: choice.improvements ?? [],
  }
}

export function withFamiliarUpserted(draft, entry) {
  const idx = draft.familiars.findIndex(f => f.featureId === entry.featureId)
  const familiars = idx >= 0
    ? draft.familiars.map((f, i) => (i === idx ? entry : f))
    : [...draft.familiars, entry]
  return { ...draft, familiars }
}

// --- Expertise ---------------------------------------------------------------

// Expertise picks live in featureChoices under a tagged object so they stay
// distinguishable from plain skill-choice features (which are bare arrays and
// get flattened into skillProficiencies).
export function expertiseSkills(draft) {
  return [...new Set(
    Object.values(draft.featureChoices ?? {})
      .filter(c => c?.type === 'expertise')
      .flatMap(c => c.skills ?? [])
  )]
}

// Slugs already given Expertise by a feature *other* than featureId — used to
// stop a second Expertise grant (e.g. Rogue level 6) re-picking the same skill.
export function expertiseTakenElsewhere(draft, featureId) {
  return new Set(
    Object.entries(draft.featureChoices ?? {})
      .filter(([id, c]) => id !== featureId && c?.type === 'expertise')
      .flatMap(([, c]) => c.skills ?? [])
  )
}

// --- Skill provenance --------------------------------------------------------

// `subclassFeatures` is separate from `classFeatures` only because the catalog
// keeps them in two tables; a skill granted by College of Lore's Bonus
// Proficiencies has to name itself the same way a class feature's does, so both
// pools are searched.
export function skillSourceMap(draft, { classData, backgroundData, raceData, classFeatures, subclassFeatures }) {
  const map = {}
  for (const slug of draft.skillProficiencies) {
    map[slug] = `Core ${classData?.name ?? 'Class'} Traits`
  }
  for (const slug of backgroundSkills(backgroundData)) {
    if (!map[slug]) map[slug] = 'Background'
  }
  for (const slug of raceData?.data?.skillProficiencies ?? []) {
    if (!map[slug]) map[slug] = 'Species'
  }
  const namedFeatures = [...(classFeatures ?? []), ...(subclassFeatures ?? [])]
  const multiclassNames = new Map(
    (draft.classes ?? []).slice(1).map(c => [multiclassSkillKey(c.id), `Multiclass ${c.name ?? 'Class'} Traits`])
  )
  for (const [featureId, slugs] of Object.entries(draft.featureChoices ?? {})) {
    if (!Array.isArray(slugs)) continue
    const feature = namedFeatures.find(f => f.id === featureId)
    const featureName = feature?.name ?? multiclassNames.get(featureId) ?? 'Feature'
    for (const slug of slugs) {
      if (!map[slug]) map[slug] = featureName
    }
  }
  return map
}

// The two skills a background grants, as character skill slugs. The catalog
// spells two of them with a space (`animal handling`, `sleight of hand`) where
// every character slug uses an underscore — the same split
// 20260728000001_normalize_skill_choice_slugs.sql fixed for class skill options.
export function backgroundSkills(backgroundData) {
  return (backgroundData?.data?.skillProficiencies ?? [])
    .filter(s => typeof s === 'string')
    .map(s => s.trim().toLowerCase().replace(/\s+/g, '_'))
}

// --- Persistence shapes -------------------------------------------------------

function baseJson(draft) {
  return {
    name: draft.name.trim(),
    avatarUrl: draft.avatarUrl.trim() || null,
    race: draft.race,
    classes: draft.classes,
    background: draft.background,
    originFeat: draft.originFeat,
    backgroundBonuses: draft.backgroundBonuses,
    abilityMethod: draft.abilityMethod,
    abilityScores: draft.abilityScores,
    saveProficiencies: draft.saveProficiencies,
    skillProficiencies: [...new Set([
      ...draft.skillProficiencies,
      ...Object.values(draft.featureChoices ?? {}).filter(Array.isArray).flat(),
    ])],
    skillExpertise: expertiseSkills(draft),
    feats: Object.values(draft.featureChoices ?? {})
      .filter(c => c?.type === 'feat' || c?.type === 'boon')
      .map(c => ({ id: c.featId, name: c.featName, source: c.featSource ?? null })),
    featureChoices: draft.featureChoices,
    familiars: draft.familiars,
    spells: draft.spells,
    equipment: draft.equipment,
  }
}

// In-progress autosave shape (character.json while builder_step is set).
export function draftJson(draft) {
  return { ...baseJson(draft), masteredWeapons: draft.masteredWeapons }
}

// `catalogSubclasses` (VAULT-263): a class that does not cast takes its chosen
// subclass's ability — the Eldritch Knight's and the Arcane Trickster's
// Intelligence. Without it they were saved with none, and every reader that
// decides "is this a caster" by the ability skipped them.
export function resolveClasses(draftClasses, catalogClasses, catalogSubclasses = []) {
  return draftClasses.map(c => {
    const cd = catalogClasses.find(cl => cl.id === c.id)
    const own = cd?.spellcasting_ability === 'flexible'
      ? c.spellcastingAbility
      : cd?.spellcasting_ability ?? null
    const sub = c.subclass?.id ? (catalogSubclasses ?? []).find(s => s?.id === c.subclass.id) : null
    return {
      ...c,
      hit_die: cd?.hit_die ?? null,
      spellcastingAbility: own && own !== 'none' ? own : subclassCasting(sub)?.ability ?? own,
    }
  })
}

// Completed Vault Character shape. masteredWeapons is deliberately absent —
// it lives in the weapon_masteries table, not character.json.
// classData is the primary (first) class — its saves seed saveProficiencies per
// 5.5e multiclass rules.
//
// **HP is deliberately not derived here** — VAULT-185. This module is pure and
// sees only the draft, and the draft cannot answer the question: a half-feat's
// +1 Constitution lives on the catalog row, Tough's `hp_bonus_per_level` lives
// in the baked effects, and a converted D&D Beyond character's scores are finals
// that already contain their feat bonus. Three different rules, one of which
// inverts the others.
//
// So the key is emitted null and `characterJson.withDerivedHp` fills it in from
// `vaultHp` once the caller has baked — the same function the sheet renders
// from, over the same effects it will store. Null is the honest placeholder
// rather than a computed number that would be wrong for a third of callers.
// `backgroundData` is the background's catalog row. Its skills are baked into
// `skillProficiencies` here, at completion, because the sheet reads skills from
// the character alone (VAULT-244: before this, a background's two skills were
// shown in the builder and never reached the sheet).
//
// **Re-opened, the saved array comes back whole** (VAULT-250). It is the class's
// picks, then every feature's skill pick, then the background's, and
// `draftFromCharacter` reads all of it back as `draft.skillProficiencies`. So a
// background changed on edit kept the old one's skills, and so did a changed
// feature pick. The class step shows and edits exactly the first
// `skillChoices.count` entries (`CoreTraitsPanel`'s slot selects, the plugin's
// `SlotSelects`), so only those are the class's picks: the rest is rebuilt below
// from the answers as they stand now.
export function finalVaultJson(draft, { classData, catalogClasses, catalogSubclasses = [], raceData, backgroundData = null }) {
  const resolved = resolveClasses(draft.classes, catalogClasses, catalogSubclasses)
  const count = Number(classData?.data?.skillChoices?.count)
  const classPicks = Number.isFinite(count) && count > 0
    ? (draft.skillProficiencies ?? []).slice(0, count)
    : draft.skillProficiencies
  const base = baseJson({ ...draft, skillProficiencies: classPicks })
  return {
    ...base,
    skillProficiencies: [...new Set([...base.skillProficiencies, ...backgroundSkills(backgroundData)])],
    classes: resolved,
    saveProficiencies: classData?.data?.saveProficiencies ?? draft.saveProficiencies,
    hp: { max: null, current: null },
    speed: raceData?.data?.speed?.walk ?? 30,
    // Resolved rather than copied from the draft: a species with one size never
    // asked, so the answer is the species' own. Null only when the row stores
    // free prose ("Depends on your lineage") and no array to resolve against.
    size: resolvedSize(raceData, draft.race?.size ?? null),
  }
}
