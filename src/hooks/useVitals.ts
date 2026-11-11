import { useCallback, useEffect, useMemo, useState } from 'react'
import { Notice } from 'obsidian'

import { useContent } from '../ContentContext'
import { resolveFeatEffects, type FeatEffects, type ResolvedEffect } from '../content/featEffects'
import { projectVitals, type ProjectedVitals } from '../content/vitalsProjection'
import { useRollHost } from '../dice/RollContext'
import type { Sheet } from '../ddb/sheet'
import { shortRestPlan } from '../spells/slots'
import { useStateHost } from '../StateContext'
import {
  addXp,
  castSpell,
  clearDefense,
  emptyVitals,
  endConcentration,
  heal as healVitals,
  hurtFamiliar,
  longRest as longRestVitals,
  recordDeathSave,
  refundSlot,
  refundUse,
  restoreUses,
  revertShape,
  setDefense,
  setInspiration,
  setTemp as setTempVitals,
  setXp,
  shapeInto,
  shortRest as shortRestVitals,
  spendHitDie as spendHitDieVitals,
  spendPoints,
  spendSlot,
  spendUse,
  takeDamage,
  toggleCondition,
  toggleEffect,
  type CastCost,
  type DefenseType,
  type Vitals,
  type WildShapeForm,
} from '../state/vitals'
import type { HpPanelActions } from '../ui/HpPanel'

/**
 * One character's mutable vitals, its feat effects, and the actions that change
 * them.
 *
 * ## Loading is derived, not a boolean
 *
 * Same shape as `useDetail` and `useRoster`, and for the same reason: a separate
 * `loading` flag has to be set true, set false and reset on every path out, and
 * the path somebody forgets leaves a spinner up forever. "The response in hand
 * belongs to an older generation" and "still loading" are one statement.
 *
 * ## The write is the signal
 *
 * Nothing is kept in React after a mutation. Every action writes the note and
 * returns; the vault's own change event bumps `useVaultGeneration`, this
 * re-reads, and the sheet redraws. So there is no second copy of a character's
 * hit points that could disagree with the file — which is the whole argument of
 * ADR 0003, applied to a component.
 *
 * `busy` exists only to stop a double-click issuing two writes for one intent.
 */

export interface VitalsState {
  vitals: Vitals
  projected: ProjectedVitals
  effects: FeatEffects
  actions: HpPanelActions & {
    awardXp(delta: number): void
    startTrackingXp(): void
    toggle(key: string): void
    /** Declare or clear a condition (MYDND-45). */
    toggleCondition(name: string): void
    /** Gain or spend Heroic Inspiration (MYDND-45). */
    setInspiration(on: boolean): void
  } & SpellSlotActions
  loading: boolean
  busy: boolean
}

/** The spell panel's writes (MYDND-36). Each is one write to `vault-vitals`. */
export interface SpellSlotActions {
  spendSlot(rank: number, max: number): void
  refundSlot(rank: number): void
  spendUse(key: string, max: number): void
  refundUse(key: string): void
  /** Spend what a cast costs and start concentrating, in one write (MYDND-46). */
  cast(cost: CastCost): void
  endConcentration(): void
  /** Spend several points of a pool (MYDND-47). */
  spendPoints(key: string, amount: number, max: number): void
  /** Refill one pool. */
  restoreUses(key: string): void
  /** Set or withdraw a hand-set defence (MYDND-48). */
  setDefense(value: string, type: DefenseType): void
  clearDefense(value: string): void
  /** Take a beast form, spending a use of Wild Shape when the sheet counts them (MYDND-51). */
  shapeInto(form: WildShapeForm, tempHp: number, uses: number | null): void
  revertShape(): void
  /** Damage (positive) or heal (negative) a familiar, within its maximum. */
  hurtFamiliar(featureId: string, delta: number, max: number): void
}

const emptyEffects: FeatEffects = { effects: [], resolved: [], unknown: [] }

/**
 * Hand-declared effects, given the envelope the gate needs.
 *
 * `sourceKind`/`sourceFeatureId` are stamped the same way `featEffects.ts`
 * stamps a catalog one, because `effectKey` is `null` without them and an
 * activated effect then never applies. A declared effect may name its own
 * `source` and `benefitKey`; what it may not do is go without an id.
 */
function declaredEffects(raw: readonly Record<string, unknown>[]): ResolvedEffect[] {
  return raw.map((effect, i) => ({
    ...effect,
    type: String(effect.type),
    source: typeof effect.source === 'string' ? effect.source : 'Declared',
    sourceKind: 'feat' as const,
    sourceFeatureId:
      typeof effect.sourceFeatureId === 'string' ? effect.sourceFeatureId : `declared-${i}`,
    benefitKey: typeof effect.benefitKey === 'string' ? effect.benefitKey : null,
    benefitName: typeof effect.benefitName === 'string' ? effect.benefitName : null,
  }))
}

export function useVitals(notePath: string | null, sheet: Sheet | null, generation: number): VitalsState {
  const content = useContent()
  const { state } = useStateHost()
  const { setEffects } = useRollHost()

  const [loaded, setLoaded] = useState<{ key: string; vitals: Vitals; effects: FeatEffects } | null>(null)
  const [busy, setBusy] = useState(false)

  // The feat list is in the vitals fence, and the sheet also carries one from
  // D&D Beyond. Both are read; the fence wins on duplicates because it is where
  // a GM corrects a name DDB spelled differently.
  //
  // **The sheet half did nothing until MYDND-15.** `Sheet` had no `feats` key and
  // `src/ddb/` never read `payload.feats`, so this was defensive about a field
  // nothing wrote: `fromSheet` was permanently `[]`, and the only feats that ever
  // reached the catalog were hand-typed into a vitals fence. `buildFeats` fills it
  // now, which is what makes `resolveFeatEffects` reachable on an imported
  // character at all. The coercion stays — a fence is editable, so `feats:` may
  // be anything by the time it is read back.
  const featNames = useMemo(() => {
    const raw = sheet?.feats
    if (!Array.isArray(raw)) return []
    return raw.map(f => String(f ?? '').trim()).filter(Boolean)
  }, [sheet])

  // A Vault character's baked class and species effects that switch on and off
  // or grant a defence (MYDND-48) — Rage among them. Already enveloped by the
  // bake, so they go in as they are.
  const featureEffects = useMemo(
    () => (Array.isArray(sheet?.feature_effects) ? (sheet.feature_effects as ResolvedEffect[]) : []),
    [sheet],
  )

  const key = `${notePath ?? ''}:${generation}`

  useEffect(() => {
    // No note is not a load — it is the absence of one, so the effect does
    // nothing and `ready` below *derives* that case. Setting empty state here
    // instead is what trips `react-hooks/set-state-in-effect`, and the rule is
    // right: it would be a render to say what the props already say.
    if (!notePath) return
    const path = notePath
    let cancelled = false
    // A local async function rather than an async effect: an effect must return
    // its cleanup, and an async one returns a promise React cannot call.
    async function run() {
      const vitals = await state.vitals.read(path)
      const names = [...new Set([...vitals.feats, ...featNames])]
      const fromCatalog = names.length === 0 ? emptyEffects : await resolveFeatEffects(content.feats, names)
      // Catalog first, then declared, so a hand-written effect never displaces
      // a published one — and `interventions()` prompts the head of the list.
      // Declared ones cover what the catalog does not model — since MYDND-26 it
      // carries three interventions, not all. See the note on `Vitals.effects`.
      const effects: FeatEffects = {
        ...fromCatalog,
        effects: [...fromCatalog.effects, ...featureEffects, ...declaredEffects(vitals.effects)],
      }
      if (!cancelled) setLoaded({ key, vitals, effects })
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [notePath, key, state, content, featNames, featureEffects])

  // Three statements in one: no note means ready with nothing, and otherwise
  // "the response in hand belongs to an older generation" *is* "still loading".
  const ready = notePath === null || loaded?.key === key
  const vitals = (notePath === null ? null : loaded?.vitals) ?? emptyVitals()
  const effects = (notePath === null ? null : loaded?.effects) ?? emptyEffects

  // The provider holds the effects in a ref so a click reads them fresh. Pushed
  // from an effect rather than during render, because this writes to another
  // component's store and `set-state-in-effect` is about *this* component's.
  useEffect(() => {
    setEffects(effects.effects, vitals.activeEffects)
  }, [setEffects, effects, vitals.activeEffects])

  const mutate = useCallback(
    (transform: (v: Vitals, s: Sheet | null) => Vitals) => {
      if (!notePath || busy) return
      setBusy(true)
      void (async () => {
        try {
          await state.vitals.mutate(notePath, transform)
        } catch (error) {
          // Surfaced, never swallowed: `parseNote` throws on frontmatter it
          // refuses to overwrite, and that is exactly the case a GM must see
          // rather than have silently skipped.
          new Notice(`Could not update ${notePath}: ${(error as Error).message}`)
        } finally {
          setBusy(false)
        }
      })()
    },
    [notePath, busy, state],
  )

  const actions = useMemo(
    () => ({
      damage: (amount: number) => mutate((v, s) => takeDamage(v, s?.hp?.max ?? null, amount)),
      heal: (amount: number) => mutate(v => healVitals(v, amount)),
      setTemp: (amount: number) => mutate(v => setTempVitals(v, amount)),
      // The sheet decides what comes back — a pact-only caster's slots, a
      // short-rest free cast — so the plan is worked out inside the write,
      // against the sheet in the same file.
      shortRest: () => mutate((v, s) => shortRestVitals(v, shortRestPlan(s))),
      longRest: () => mutate(v => longRestVitals(v)),
      spendHitDie: (label: string, rolled: number) => mutate((v, s) => spendHitDieVitals(v, s, label, rolled)),
      deathSave: (kind: 'success' | 'failure') => mutate(v => recordDeathSave(v, kind)),
      clearDeathSaves: () => mutate(v => ({ ...v, deathSaves: { successes: 0, failures: 0 } })),
      awardXp: (delta: number) => mutate(v => addXp(v, delta)),
      startTrackingXp: () => mutate(v => setXp(v, 0)),
      toggle: (k: string) => mutate(v => toggleEffect(v, k)),
      toggleCondition: (name: string) => mutate(v => toggleCondition(v, name)),
      setInspiration: (on: boolean) => mutate(v => setInspiration(v, on)),
      spendSlot: (rank: number, max: number) => mutate(v => spendSlot(v, rank, max)),
      refundSlot: (rank: number) => mutate(v => refundSlot(v, rank)),
      spendUse: (key: string, max: number) => mutate(v => spendUse(v, key, max)),
      refundUse: (key: string) => mutate(v => refundUse(v, key)),
      cast: (cost: CastCost) => mutate(v => castSpell(v, cost)),
      endConcentration: () => mutate(v => endConcentration(v)),
      spendPoints: (key: string, amount: number, max: number) => mutate(v => spendPoints(v, key, amount, max)),
      restoreUses: (key: string) => mutate(v => restoreUses(v, key)),
      setDefense: (value: string, type: DefenseType) => mutate(v => setDefense(v, value, type)),
      clearDefense: (value: string) => mutate(v => clearDefense(v, value)),
      shapeInto: (form: WildShapeForm, tempHp: number, uses: number | null) =>
        mutate(v => shapeInto(v, form, { tempHp, uses })),
      revertShape: () => mutate(v => revertShape(v)),
      hurtFamiliar: (featureId: string, delta: number, max: number) =>
        mutate(v => hurtFamiliar(v, featureId, delta, max)),
    }),
    [mutate],
  )

  return {
    vitals,
    projected: projectVitals(sheet, vitals),
    effects,
    actions,
    loading: !ready,
    busy,
  }
}
