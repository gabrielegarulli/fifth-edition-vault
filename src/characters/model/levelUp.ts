// Levelling a Vault character up by one: what the level asks, class and
// species, and the json it writes.

import { subclassCasting } from '@vault/derive/builderSpellCaps.js'
import { atLevelCap, levelUpJson, totalLevelOf, withClassAdvanced } from '@vault/derive/levelUp.js'
import {
  levelChoicesDue,
  speciesTraitsAt,
  versionCantripChoice,
  versionCantripPick,
  withLevelChoice,
  type LevelChoice,
  type RaceData,
  type VersionCantrip,
} from '@vault/derive/speciesChoices.js'

import {
  casters,
  invocationCountAt,
  itemComplete,
  levelItems,
  masteryCountFor,
  spellsComplete,
  type ClassContext,
  type FeatData,
  type LevelItem,
  subclassLevel,
  type BuilderDraft,
  type ClassSource,
} from '../../choices'
import type { ClassFence, FenceFeature, SubclassFence } from '../../compendium'
import { featureId } from '../../characterModel'
import type { VaultCharacterJson } from '../../characterModel'

/**
 * Levelling a Vault character up by one (MYDND-25).
 *
 * The rules are `@vault/derive/levelUp.js` — the web `LevelUpModal`'s own pure
 * half — so the class is advanced by `withClassAdvanced` and the choices merged
 * by `levelUpJson`, unchanged. What lives here is only what the plugin decides
 * differently:
 *
 * - **The subclass level is the class fence's**, through the builder's
 *   `subclassLevel`, not the web app's assumed 3 — a 2014 Cleric picks at 1.
 * - **Choices are made here, with the builder's own pickers** (MYDND-127;
 *   MYDND-25 only named them). `levelItemsDue` picks, out of the Features
 *   step's `levelItems`, the questions this level brings, and the panel renders
 *   them with `FeaturesStep`'s pickers over a builder draft of the character.
 *   An unanswered one still never blocks the level — its hit points and
 *   subclass are right without it — and `pendingChoices` says which is open.
 * - **No hit point write.** `levelUp.js`'s `withHpGain`, and the web app's
 *   `gainMaxHp`, exist because the web app stores *current* hit points. The
 *   `vault-vitals` overlay stores damage taken (ADR 0006 §2), so a raised
 *   maximum raises current by the same amount on its own. Porting either would
 *   count the gain twice; neither is imported, and a test holds that.
 * - **A species' later choices are asked here too** (MYDND-246): the
 *   Opteran's Metamorphosis at 5, the Tatsumi's at 7 — `speciesChoicesDue`.
 *   The species step is creation only, so this is the one place they can be.
 * - **No multiclass.** Only an existing class row gains the level; taking a
 *   first level in a new class is the builder's "+ Add class" (MYDND-29).
 *
 * Nothing here imports `obsidian` or React, so it runs in the `logic` project.
 */

/** Why this character cannot level up here, in words. Empty when it can. */
export function levelUpProblems(json: VaultCharacterJson): string[] {
  if ((json.classes ?? []).length === 0) return ['It has no class to gain a level in']
  if (atLevelCap(json)) return ['It is level 20 — there is no level 21']
  return []
}

/** The character's total level after one more. */
export function nextTotalLevel(json: VaultCharacterJson): number {
  return totalLevelOf(json) + 1
}

/** The level `classes[index]` reaches by gaining this one. */
export function nextClassLevel(json: VaultCharacterJson, index: number): number {
  return (json.classes?.[index]?.level ?? 0) + 1
}

/**
 * Whether gaining this level asks for a subclass.
 *
 * At **or past** the class's subclass level, not only at it: a character saved
 * at its subclass level without one (the builder allows "None yet") is asked
 * again on the next level rather than never.
 */
export function subclassDue(json: VaultCharacterJson, index: number, fence: ClassFence | null): boolean {
  const cls = json.classes?.[index]
  if (!cls || cls.subclass) return false
  return nextClassLevel(json, index) >= subclassLevel(fence)
}

export interface LevelFeature {
  /** The `featureChoices` key a picker would answer it under. */
  id: string
  name: string
  /** The choice's type (`asi`, `expertise`…), or null for a feature that asks nothing. */
  choice: string | null
}

function featuresAt(owner: string, features: readonly FenceFeature[] | undefined, level: number): LevelFeature[] {
  return (features ?? [])
    .filter(f => f?.level === level && !f.data?.optionOf)
    .map(f => ({
      id: featureId(owner, f),
      name: f.name,
      choice: typeof f.choices?.type === 'string' ? f.choices.type : null,
    }))
}

/**
 * Every feature the class (and its subclass, when it has one) gains at the new
 * level — what the panel lists under "You gain".
 *
 * Options of another feature (`data.optionOf` — Protector under Divine Order)
 * are left out: they are answers, not features gained.
 */
export function featuresGained(
  json: VaultCharacterJson,
  index: number,
  { classId, classFence, subclassId, subclassFence }: {
    classId: string
    classFence: ClassFence | null
    subclassId?: string | null
    subclassFence?: SubclassFence | null
  },
): LevelFeature[] {
  const level = nextClassLevel(json, index)
  return [
    ...featuresAt(classId, classFence?.features, level),
    ...(subclassId && subclassFence ? featuresAt(subclassId, subclassFence.features, level) : []),
  ]
}

/**
 * The Features-step questions this level brings, for the panel to ask.
 *
 * `before` is the character as saved, as a builder draft; `after` is the same
 * draft with `classes[index]` one level up (and any subclass picked here). An
 * item is due when it is:
 *
 * - **gained at the new level** — an ASI, a fighting style, an Elemental
 *   Affinity;
 * - **of a subclass picked at this level** — every one up to it, since a
 *   subclass taken late ("None yet" at 3) brings its level-3 questions at 4;
 * - **an earlier answer the level leaves short** — a fifth invocation at
 *   Warlock 5, a third mastery at Fighter 4, a Tamer's companion's next
 *   improvement: complete at the old count and not at the new one.
 *
 * Judged on `before`'s answers throughout, so the list does not change while
 * the player answers. A question left open at an earlier level is not here:
 * that is Edit's, and asking it here would make a level up a full review.
 */
export function levelItemsDue(
  before: BuilderDraft,
  after: BuilderDraft,
  contexts: readonly ClassContext[],
  index: number,
  feats: readonly FeatData[],
): LevelItem[] {
  const level = after.classes[index]?.level ?? 0
  const subclassPicked = !before.classes[index]?.subclass && Boolean(after.classes[index]?.subclass)
  const counts = (draft: BuilderDraft) => ({
    feats,
    masteryCount: masteryCountFor(draft, contexts),
    invocationCount: invocationCountAt(contexts[index]?.source ?? null, draft.classes[index]?.level ?? 1),
    // A companion gains an improvement slot every level (MYDND-126).
    classLevel: draft.classes[index]?.level ?? 1,
  })
  const was = counts(before)
  const now = counts(after)
  return levelItems(after, contexts).filter(
    item =>
      item.classIndex === index &&
      (item.level === level ||
        (subclassPicked && item.isSubclass) ||
        (itemComplete(item, before, was) && !itemComplete(item, before, now))),
  )
}

/**
 * Whether `classes[index]`, one level up, has spells left to choose — a new
 * cantrip or spell the level's caps allow. The panel does not pick spells; it
 * sends the player to the builder's Spells step (`builderSpellsPath`).
 */
export function spellsShort(
  before: BuilderDraft,
  after: BuilderDraft,
  sources: ReadonlyArray<ClassSource | null>,
  index: number,
  subclassFences: ReadonlyArray<SubclassFence | null> = [],
): boolean {
  const caster = casters(after, sources, subclassFences).find(c => c.index === index)
  return caster !== undefined && !spellsComplete(before, caster.caps)
}

/**
 * The answers to save: the character's own, plus the panel's for the items
 * that are due — and only those.
 *
 * The pickers write into one draft, so an answer given before the player
 * switched class, or to a subclass they then swapped for another, is still in
 * it. Writing only what a due item asked keeps either from reaching the note.
 */
export function dueAnswers(before: BuilderDraft, answers: BuilderDraft, due: readonly LevelItem[]): LevelAnswers {
  const asked = new Set(due.map(i => i.feature.id))
  const isAsked = (entry: Record<string, unknown>) => asked.has(String(entry.featureId))
  return {
    featureChoices: {
      ...before.featureChoices,
      ...Object.fromEntries(Object.entries(answers.featureChoices).filter(([id]) => asked.has(id))),
    },
    masteredWeapons: due.some(i => i.kind === 'mastery') ? answers.masteredWeapons : before.masteredWeapons,
    familiars: [...before.familiars.filter(f => !isAsked(f)), ...answers.familiars.filter(isAsked)],
  }
}

/** The gained features that ask a question nobody has answered yet. */
export function pendingChoices(json: VaultCharacterJson, gained: readonly LevelFeature[]): LevelFeature[] {
  const answered = json.featureChoices ?? {}
  return gained.filter(f => f.choice !== null && answered[f.id] == null)
}

/** What the panel's pickers answered: the draft's keys a picker writes. */
export type LevelAnswers = Pick<BuilderDraft, 'featureChoices' | 'masteredWeapons' | 'familiars'>

/**
 * The json after the level: `classes[index]` one higher, a subclass set when
 * one was picked, the panel's answers merged, and everything else as it was.
 *
 * `levelUpJson` takes the whole `featureChoices` map — the old answers plus
 * the new level's — and unions the feats, skills and expertise they grant into
 * the json, the web `LevelUpModal`'s own merge. A merge, not `toVaultJson`'s
 * rebuild, for its reason: nothing written since the character was made is
 * re-derived away. `masteredWeapons` and `familiars` are not `levelUpJson`'s
 * (the web app keeps both in tables), so the answers' lists replace the json's,
 * written only when there is something to write. Keys this function does not
 * know about survive, because `levelUpJson` spreads the original.
 *
 * **A casting subclass picked here brings its ability** (MYDND-279), as
 * `toVaultJson`'s `resolveClasses` does at the builder: an Eldritch Knight's
 * Intelligence, read off `subclassFence`. Without it the slots arrived (they
 * come off the subclass's progression) and the sheet had no spell save DC or
 * attack until the player opened Edit and saved again. A class that casts on
 * its own keeps its ability.
 */
export function levelUpVaultJson(
  json: VaultCharacterJson,
  index: number,
  {
    subclass = null,
    subclassFence = null,
    answers = null,
  }: {
    subclass?: { id: string; name: string } | null
    /** The picked subclass's fence, for a casting subclass's ability. */
    subclassFence?: SubclassFence | null
    answers?: LevelAnswers | null
  } = {},
): VaultCharacterJson {
  const problems = levelUpProblems(json)
  if (problems.length > 0) throw new Error(problems[0])
  if (!json.classes?.[index]) throw new Error(`No class at position ${index}`)

  const ability = subclass ? subclassCasting(subclassFence)?.ability ?? null : null
  const advanced = withClassAdvanced(json.classes, index).map((c, i) => {
    if (i !== index || !subclass || c.subclass) return c
    const own = c.spellcastingAbility && c.spellcastingAbility !== 'none' ? c.spellcastingAbility : null
    return {
      ...c,
      subclass: { id: subclass.id, name: subclass.name },
      ...(!own && ability ? { spellcastingAbility: ability } : {}),
    }
  })
  const out = levelUpJson(json, {
    classes: advanced,
    featureChoices: answers?.featureChoices ?? json.featureChoices ?? {},
  })
  if (!answers) return out
  const list = (key: 'masteredWeapons' | 'familiars') =>
    answers[key].length > 0 || key in json ? { [key]: answers[key] } : {}
  return { ...out, ...list('masteredWeapons'), ...list('familiars') }
}

/**
 * The species' level choices the level brings (MYDND-246): the Opteran's
 * Metamorphosis at 5, the Nishikin Tatsumi's Draconic Metamorphosis at 7.
 * Asked at or past the choice's level while unanswered, as `levelChoicesDue`
 * says; `raceData` is the species note, `null` while it loads.
 */
export function speciesChoicesDue(json: VaultCharacterJson, raceData: RaceData | null): LevelChoice[] {
  return raceData ? levelChoicesDue(raceData, json.race ?? null, nextTotalLevel(json)) : []
}

/**
 * The species traits that arrive with the level — Celestial Revelation at 3,
 * Draconic Flight at 5 — by name, for "You gain". A level choice's traits are
 * not here: they come with its answer.
 */
export function speciesTraitsGained(json: VaultCharacterJson, raceData: RaceData | null): string[] {
  if (!raceData) return []
  const level = nextTotalLevel(json)
  const had = new Set(speciesTraitsAt(raceData, json.race ?? null, level - 1).map(t => t.key ?? t.name))
  return speciesTraitsAt(raceData, json.race ?? null, level)
    .filter(t => !had.has(t.key ?? t.name) && typeof t.level === 'number')
    .flatMap(t => (t.name ? [t.name] : []))
}

/**
 * The json with the panel's answers to the due species choices applied, and
 * only those: an answer to a choice not due is dropped, as `dueAnswers` drops
 * a picker's. An option naming a lineage moves `race.subrace` to it — the
 * Tatsumi becomes a Ryujin in the same single write as the level.
 */
export function withSpeciesAnswers(
  json: VaultCharacterJson,
  raceData: RaceData | null,
  due: readonly LevelChoice[],
  answers: Readonly<Record<string, string>>,
): VaultCharacterJson {
  if (!json.race || !raceData) return json
  let race = json.race
  for (const choice of due) {
    const name = answers[choice.key]
    if (name) race = withLevelChoice(raceData, race, choice.key, name)
  }
  return race === json.race ? json : { ...json, race }
}

/**
 * The cantrip the character's species version asks once this level is taken,
 * when none is picked yet (MYDND-260): a Red Tatsumi that becomes a Ryujin at
 * 7 is asked its Sorcerer cantrip. `next` is the json with the species answers
 * applied, so the lineage it reads is the one the level moves to; a Ryujin
 * made before this was asked is asked on its next level too.
 */
export function versionCantripDue(next: VaultCharacterJson, raceData: RaceData | null): VersionCantrip | null {
  if (!raceData || versionCantripPick(next.race ?? null)) return null
  return versionCantripChoice(raceData, next.race ?? null)
}

/** `next` with the panel's cantrip written, when one is due and picked. */
export function withVersionCantrip(
  next: VaultCharacterJson,
  raceData: RaceData | null,
  pick: { id: string; name: string; source: string | null; level: number } | null,
): VaultCharacterJson {
  if (!pick || !next.race || !versionCantripDue(next, raceData)) return next
  return { ...next, race: { ...next.race, versionCantrip: pick } }
}
