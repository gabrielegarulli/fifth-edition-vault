import { useMemo } from 'react'
import { familiarFromMonster, skillSourceMap, withFamiliarChoiceCleared, withFamiliarUpserted, withFeatureChoice } from '@vault/derive/builderDraft.js'

import {
  WEAPON_ITEM_TYPES,
  affinityPicks,
  casters as castersOf,
  uncappedScores,
  featureRows,
  invocationCountAt,
  levelItems,
  masteryCountFor,
  masteryOf,
  offeredByAffinity,
  type ClassContext,
  type FeatData,
} from '../../builder/choices'
import { freePicks, improvementDefs } from '../../builder/companion'
import { classData, raceData, type BuilderDraft, type ClassSource } from '../../builder/draft'
import { baseClassName, type ClassFence, type SubclassFence } from '../../content/classes'
import type { MonsterRow } from '../../content/monsters'
import { useContent } from '../../ContentContext'
import { backgroundToolsOf } from '../../content/lineage'
import { useDetail } from '../../hooks/useDetail'
import { useCompanions } from '../../hooks/useCompanions'
import { useDetails } from '../../hooks/useDetails'
import { useCatalogRows } from '../../hooks/useVaultGeneration'
import type { MasteryWeapon } from './FeaturesStep'
import type { SetDraft } from './fields'

/**
 * Everything the builder reads for a draft — its catalogs, its classes' and
 * feats' fences — and what the Features step's pickers are handed from it.
 *
 * Out of `CharacterBuilderPage` (MYDND-127) so the level-up panel can render the
 * same pickers over the same answers: two copies of `skillSources` or
 * `spellsFor` would disagree on what a picker offers, and only the builder's
 * would be tested. The page uses every field; the panel, the pickers' share.
 */
export function useBuilderSources(draft: BuilderDraft, setDraft: SetDraft) {
  const content = useContent()

  const species = useCatalogRows(() => content.species.list())
  const classes = useCatalogRows(() => content.classes.list())
  const subclasses = useCatalogRows(() => content.subclasses.list())
  const backgrounds = useCatalogRows(() => content.backgrounds.list())
  const feats = useCatalogRows(() => content.feats.list())
  const items = useCatalogRows(() => content.items.list())
  const spells = useCatalogRows(() => content.spells.list())
  const familiars = useCatalogRows(() => content.monsters.list().filter(m => m.isFamiliar))

  const speciesRow = species.find(s => s.id === draft.race?.id) ?? null
  const pickedBackground = backgrounds.find(b => b.id === draft.background?.id) ?? null
  const backgroundDetail = useDetail(content.backgrounds, pickedBackground?.id ?? null)
  // A background's tools and its starting kit (MYDND-174) are in its fence,
  // which a list row does not read.
  const backgroundFence = backgroundDetail.detail?.fence ?? null
  const backgroundRow = useMemo(
    () => (pickedBackground ? { ...pickedBackground, ...backgroundToolsOf(backgroundFence?.tool_proficiencies) } : null),
    [pickedBackground, backgroundFence],
  )
  const speciesDetail = useDetail(content.species, speciesRow?.id ?? null)
  const race = speciesRow ? raceData(speciesRow, speciesDetail.detail?.fence ?? null) : null

  // Every class's and subclass's fence, read together — the count changes as a
  // player multiclasses, which a hook per class could not follow.
  const classDetails = useDetails(content.classes, draft.classes.flatMap(c => (c.id ? [c.id] : [])))
  const subDetails = useDetails(content.subclasses, draft.classes.flatMap(c => (c.subclass?.id ? [c.subclass.id] : [])))
  const fences: Array<ClassFence | null> = draft.classes.map(c =>
    c.id ? (classDetails.details.get(c.id)?.fence ?? null) : null,
  )
  const classSources: Array<ClassSource | null> = draft.classes.map((c, i) => {
    const row = classes.find(r => r.id === c.id)
    return row ? { row, fence: fences[i] } : null
  })
  const contexts: ClassContext[] = draft.classes.map((c, i) => ({
    index: i,
    source: classSources[i],
    subclassId: c.subclass?.id ?? null,
    subclassFence: c.subclass?.id ? ((subDetails.details.get(c.subclass.id)?.fence as SubclassFence | null) ?? null) : null,
  }))
  const featureItems = levelItems(draft, contexts)

  // The picked feats, with their fences — a half-feat's +1 is on the fence, and
  // both the ability panel and "is this answered?" need it.
  const pickedFeatIds = Object.values(draft.featureChoices).flatMap(c => {
    const id = (c as { type?: string; featId?: string } | null)?.featId
    const type = (c as { type?: string } | null)?.type
    return (type === 'feat' || type === 'boon') && id ? [id] : []
  })
  const featDetails = useDetails(content.feats, pickedFeatIds)
  const featData: FeatData[] = pickedFeatIds.flatMap(id => {
    const row = feats.find(f => f.id === id)
    return row ? [{ ...row, data: (featDetails.details.get(id)?.fence ?? {}) as Record<string, unknown> }] : []
  })
  // What the increase pickers test their cap against, so uncapped (VAULT-262).
  const scores = uncappedScores(draft, featData)

  // Weapon masteries: the mastery is in each weapon's fence, so the weapon
  // notes are read — only once a feature actually asks for a mastery.
  const masteryCount = masteryCountFor(draft, contexts)
  const wantsMastery = featureItems.some(i => i.kind === 'mastery')
  const weaponRows = items.filter(i => WEAPON_ITEM_TYPES.includes(i.itemType ?? ''))
  const weaponDetails = useDetails(content.items, wantsMastery ? weaponRows.map(w => w.id) : [])
  const masteryWeapons: MasteryWeapon[] | null =
    wantsMastery && weaponDetails.loading
      ? null
      : weaponRows.flatMap(w => {
          const mastery = masteryOf(weaponDetails.details.get(w.id)?.fence)
          return mastery ? [{ id: w.id, name: w.name, mastery }] : []
        })

  const casterList = castersOf(draft, classSources, contexts.map(c => c.subclassFence))
  const spellsFor = (className: string) => {
    const want = className.trim().toLowerCase()
    // A Bender is offered only its chosen elements' lists (MYDND-124).
    const i = draft.classes.findIndex(c => baseClassName(c.name ?? '').trim().toLowerCase() === want)
    const picks = i >= 0 ? affinityPicks(draft, draft.classes[i]?.id ?? null, fences[i] ?? null) : null
    return spells.filter(s => s.classes.some(c => c.trim().toLowerCase() === want) && offeredByAffinity(s, picks))
  }
  const invocationCount = (n: number) => invocationCountAt(classSources[n] ?? null, draft.classes[n]?.level ?? 1)

  const skillSources = skillSourceMap(draft, {
    classData: classSources[0] ? classData(classSources[0]) : null,
    // The web app passes the `content_background` row; `skillSourceMap` reads
    // only its `data.skillProficiencies`, to mark those skills already held.
    backgroundData: backgroundRow ? { data: { skillProficiencies: backgroundRow.skillProficiencies } } : null,
    raceData: race,
    classFeatures: contexts.flatMap(c => (c.source ? featureRows(c.source.row.id, c.source.fence?.features) : [])),
    subclassFeatures: contexts.flatMap(c => (c.subclassId ? featureRows(c.subclassId, c.subclassFence?.features) : [])),
  }) as Record<string, string>

  // Each picked companion's improvement tree (MYDND-126), a second fence on its
  // note; War Training names any weapon note.
  const familiarIds = Object.values(draft.featureChoices).flatMap(c => {
    const f = c as { type?: string; monsterId?: string } | null
    return f?.type === 'familiar' && f.monsterId ? [f.monsterId] : []
  })
  const companionTrees = useCompanions(content.monsters, familiarIds)
  const weaponNames = weaponRows.map(w => w.name).sort((a, b) => a.localeCompare(b))

  const onFamiliar = (featureId: string, monster: MonsterRow | null) => {
    if (!monster) {
      setDraft(d => withFamiliarChoiceCleared(d, featureId) as unknown as BuilderDraft)
      return
    }
    const picked = { type: 'familiar', monsterId: monster.id, monsterName: monster.name, improvements: [] }
    setDraft(d => withFeatureChoice(d, featureId, picked) as unknown as BuilderDraft)
    // The familiar entry carries the creature's statblock, which is on its
    // fence — read now, as the web builder fetches the monster row on pick. Its
    // free improvements (MYDND-126) are granted with it: they cost no slot.
    async function run() {
      const fence = (await content.monsters.detail(monster!.id))?.fence ?? {}
      const defs = improvementDefs(await content.monsters.companion(monster!.id))
      const choice = { ...picked, improvements: freePicks(defs) }
      const entry = familiarFromMonster(featureId, choice, {
        cr: monster!.cr,
        size: monster!.size,
        creature_type: monster!.creatureType,
        data: fence,
      })
      setDraft(d => withFamiliarUpserted(withFeatureChoice(d, featureId, choice), entry) as unknown as BuilderDraft)
    }
    void run()
  }

  return {
    species,
    classes,
    subclasses,
    backgrounds,
    feats,
    items,
    familiars,
    /** Every spell note: what Fey Touched and Ritual Caster choose from (MYDND-182). */
    spells,
    speciesRow,
    backgroundRow,
    backgroundFence,
    race,
    fences,
    classSources,
    contexts,
    featureItems,
    featData,
    scores,
    masteryCount,
    masteryWeapons,
    casterList,
    spellsFor,
    invocationCount,
    skillSources,
    onFamiliar,
    /** Each picked familiar's improvement tree, by monster id; undefined while read. */
    companions: companionTrees.loading ? undefined : companionTrees.trees,
    weaponNames,
    loading:
      classDetails.loading ||
      subDetails.loading ||
      speciesDetail.loading ||
      (Boolean(draft.equipment.backgroundOption) && backgroundDetail.loading) ||
      featDetails.loading,
  }
}
