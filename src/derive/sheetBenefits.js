// What a character's feats contribute to *this* sheet — VAULT-87.
//
// Two surfaces read this and they have to agree: the Feats list on the
// character sheet (view 4c) and the Active Benefits strip (view 4d). They ask
// different questions — "what is this feat giving me?" and "what can I switch
// on?" — but both answers come out of the same two inputs, and deriving them
// twice is how a strip comes to offer a toggle for a benefit the list above it
// says is ruled at the table.
//
// The two inputs are deliberately different things:
//
// - **`character.json.resolvedEffects[]`** is what the sheet actually computes.
//   It is the baked list, so an `ability_score_choice` has already become a
//   concrete `ability_score_bonus` carrying the player's pick — which is why
//   contributions are read from here and never from the catalog row. The sheet
//   must say "+1 Strength", not "+1 Strength or Dexterity".
// - **the `content_feat` rows** are what the feat *is*. `character.json.feats[]`
//   stores only `{ id, name, source }`, so provenance, the benefit names and
//   every benefit that models nothing exist nowhere else. Without them a feat
//   ruled at the table is indistinguishable from a feat nobody has read.
//
// See docs/design/feats-benefits-handoff.md (views 4c/4d) and
// docs/lessons/effects.md.

import { describeEffect, effectKey, isActivated, readEnvelope } from './effects.js'
import { benefitState, featBenefits } from './featBenefitState.js'

// ---------------------------------------------------------------------------
// Provenance — where a feat came from
// ---------------------------------------------------------------------------

// The order the groups are shown in, which is roughly the order a character
// acquires them. `content_feat.kind` is the only thing that answers this, and it
// has exactly four values — there is **no subclass kind**, so there is no
// Subclass group to render however much a character sheet might want one.
export const PROVENANCE_ORDER = Object.freeze(['origin', 'class', 'general', 'epic_boon'])

export const PROVENANCE_LABELS = Object.freeze({
  origin: 'Origin',
  class: 'Class',
  general: 'General',
  epic_boon: 'Epic boon',
})

// A Fighting Style is granted by a class feature, so it reads as Class on a
// sheet even though the catalog files it under its own kind. The other three
// are the same word in both vocabularies.
const KIND_TO_PROVENANCE = Object.freeze({
  origin: 'origin',
  fighting_style: 'class',
  general: 'general',
  epic_boon: 'epic_boon',
})

/**
 * Which group a feat belongs to.
 *
 * **The character's own origin feat wins over the catalog's kind.** `originFeat`
 * is the one the background granted, and that is a fact about this character
 * that the content row cannot know.
 *
 * An unmapped kind becomes its own group rather than falling into `general` —
 * a new kind is how a book announces something nobody has ruled on, and filing
 * it under the commonest group is how it would ship unnoticed.
 */
export function featProvenance(feat, originFeatId = null) {
  if (feat?.id && originFeatId && feat.id === originFeatId) return 'origin'
  const kind = feat?.kind
  if (!kind) return 'general'
  return KIND_TO_PROVENANCE[kind] ?? kind
}

export function provenanceLabel(provenance) {
  return PROVENANCE_LABELS[provenance] ?? String(provenance ?? '').replace(/_/g, ' ')
}

// ---------------------------------------------------------------------------
// What a contribution line says about itself
// ---------------------------------------------------------------------------

/**
 * The status vocabulary, lifted from the handoff's rejected 1F ledger variant
 * because 1E encodes the same three states in colour and weight alone, which is
 * too thin to carry them.
 *
 * - `computed`     the sheet is doing this arithmetic right now
 * - `activated`    it is doing it only while the benefit is switched on
 * - `reminder`     nothing is computed; the table rules it
 * - `needs_choice` modelled, but it resolved to nothing on this character
 */
export const BENEFIT_STATUSES = Object.freeze(['computed', 'activated', 'reminder', 'needs_choice'])

export const STATUS_LABELS = Object.freeze({
  computed: 'Computed',
  activated: 'When activated',
  reminder: 'Reminder only',
  needs_choice: 'Needs a choice',
})

/**
 * The same states again, phrased for the slot where a computed value would
 * otherwise sit. A benefit that models nothing has no value, so its status
 * stands in for one — and there it has to read as a *decision the table made*
 * rather than as a column header. "Reminder only" describes the row; "Ruled at
 * the table" tells the player what to do, which is the point of the surface.
 */
export const STATUS_VALUES = Object.freeze({
  computed: '—',
  activated: '—',
  reminder: 'Ruled at the table',
  needs_choice: 'Needs a choice',
})

// ---------------------------------------------------------------------------
// Shared plumbing
// ---------------------------------------------------------------------------

/**
 * The context `describeEffect` resolves amounts against.
 *
 * Without it `{ kind: 'proficiency_bonus' }` renders as the words "your
 * Proficiency Bonus"; with it the live number wins, which is the whole point of
 * a *sheet* — the catalog can say "your Proficiency Bonus" because it has no
 * character, and this surface has one.
 */
export function sheetAmountContext(sheet, character) {
  const abilityMods = {}
  for (const score of sheet?.abilityScores ?? []) {
    if (score?.key) abilityMods[score.key] = score.mod
  }
  const classLevels = {}
  for (const cls of character?.json?.classes ?? []) {
    if (cls?.name) classLevels[cls.name] = cls.level ?? 0
  }
  return { pb: sheet?.pb, abilityMods, classLevels }
}

/** `heavy_weapon_mastery` → `Heavy weapon mastery`, for a benefit whose row we lack. */
function unslug(key) {
  if (typeof key !== 'string' || !key) return null
  const words = key.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Index the fetched catalog rows by id, so both surfaces look a feat up the same way. */
export function indexFeatRows(featRows) {
  const byId = new Map()
  for (const row of featRows ?? []) {
    if (row?.id) byId.set(row.id, row)
  }
  return byId
}

// Every resolved effect a feat produced, bucketed by which benefit it came from.
// The bare `sourceFeatureId` bucket (key `null`) is where the flat `data.effects`
// array lands — Defense's hand-authored `ac_bonus` is the live example, and it
// carries no benefitKey by design.
function effectsByBenefit(resolvedEffects, featId) {
  const buckets = new Map()
  for (const effect of resolvedEffects ?? []) {
    const { sourceFeatureId, benefitKey } = readEnvelope(effect)
    if (sourceFeatureId !== featId) continue
    const bucket = buckets.get(benefitKey ?? null) ?? []
    bucket.push(effect)
    buckets.set(benefitKey ?? null, bucket)
  }
  return buckets
}

// ---------------------------------------------------------------------------
// View 4c — the feats list on the sheet
// ---------------------------------------------------------------------------

/**
 * One benefit's line on the sheet.
 *
 * **A ruled-prose benefit and an unseen one produce the same line**, and that is
 * VAULT-86's rule restated on a player surface: a player sees two states, not
 * three. Both are `reminder`, both read "— ruled at the table", and neither is
 * greyed into looking like a defect.
 */
function benefitContribution(benefit, bucket, ctx, { featName, featHasAnyEffects }) {
  // An unnamed benefit borrows the feat's name. 145 of the catalog's 734 carry
  // `name: null` because their prose had no `<strong>` marker, and for those the
  // benefit *is* the whole feat — labelling the row "Overview" would name it
  // after the generator's placeholder rather than after the thing it describes.
  const name = benefit.name ?? featName ?? unslug(benefit.key) ?? 'Benefit'
  const key = benefit.key ?? name
  const effects = bucket ?? []

  // **What reached this sheet decides the status, not what the catalog claims.**
  // Checked before `benefitState` for a reason: an unnamed benefit's effects can
  // arrive from the feat's flat `data.effects[]` array instead of its own, and
  // asking the catalog first would call Defense ruled-prose while the sheet was
  // visibly adding its +1 AC.
  if (effects.length > 0) {
    const envelope = effects.map(readEnvelope).find(e => e.duration || e.trigger) ?? {}
    return {
      key,
      name,
      status: effects.some(isActivated) ? 'activated' : 'computed',
      lines: effects.map(e => describeEffect(e, ctx)).filter(Boolean),
      duration: envelope.duration ?? null,
      trigger: envelope.trigger ?? null,
    }
  }

  // Modelled in the catalog, but nothing reached this sheet. The only way that
  // happens is an `ability_score_choice` the player has not answered —
  // `featToEffects` drops it and keeps everything else — so the line says so
  // rather than claiming the table rules a benefit the book plainly computes.
  //
  // Guarded on the feat having produced *something*, because a feat that
  // resolved to nothing at all is more likely a stale bake than four unanswered
  // choices, and "Re-sync Effects" is the fix for that rather than this label.
  if (benefitState(benefit) === 'modelled' && featHasAnyEffects) {
    return { key, name, status: 'needs_choice', lines: [] }
  }

  return { key, name, status: 'reminder', lines: [] }
}

/**
 * The character's feats, grouped by provenance, each carrying one line per
 * benefit — view 4c.
 *
 * Degrades in the two ways that matter. A feat whose catalog row has not
 * arrived (or has been deleted) still appears, with its name and nothing else,
 * because a feat vanishing from a character sheet while a fetch is in flight is
 * worse than a feat with no detail. And a group with no feats is dropped
 * entirely *except* Epic boon, which stays to say the slot exists — the absence
 * is information, and "Available at level 19" is the design's own copy.
 */
export function featContributionGroups({ character, sheet, featRows }) {
  const json = character?.json ?? {}
  const originFeatId = json.originFeat?.id ?? null
  const resolvedEffects = json.resolvedEffects ?? []
  const rowsById = indexFeatRows(featRows)
  const ctx = sheetAmountContext(sheet, character)

  const feats = sheet?.feats ?? []
  const byProvenance = new Map()
  let benefitsOnSheet = 0

  for (const feat of feats) {
    const row = rowsById.get(feat.id) ?? null
    const provenance = featProvenance(
      { id: feat.id, kind: row?.kind ?? null },
      originFeatId,
    )
    const buckets = effectsByBenefit(resolvedEffects, feat.id)
    const featHasAnyEffects = buckets.size > 0
    const benefits = featBenefits(row)

    // Effects from the flat `data.effects[]` array carry no `benefitKey`, so no
    // benefit claims them by itself.
    //
    // **A feat with exactly one unnamed benefit is a feat with no sub-parts, so
    // the two describe the same sentence and are merged.** Defense is the live
    // case: one `overview` benefit reading "you gain a +1 bonus to Armor Class"
    // and one hand-authored `ac_bonus` saying the same thing. Left unmerged it
    // renders twice and contradicts itself — "+1 AC while wearing armor" on one
    // row and "Ruled at the table" on the next.
    //
    // Where the benefits *are* named the attribution is unknowable, so the flat
    // effects stay a feat-level row rather than being guessed onto one of them.
    const unbenefited = buckets.get(null) ?? []
    const mergesFlat = benefits.length === 1 && !benefits[0].name

    const contributions = benefits.map((b, i) => benefitContribution(
      b,
      [...(buckets.get(b.key ?? null) ?? []), ...(mergesFlat && i === 0 ? unbenefited : [])],
      ctx,
      { featName: feat.name, featHasAnyEffects },
    ))

    if (!mergesFlat && unbenefited.length > 0) {
      contributions.unshift(benefitContribution(
        { key: '__feat__', name: feat.name },
        unbenefited,
        ctx,
        { featName: feat.name, featHasAnyEffects },
      ))
    }

    benefitsOnSheet += contributions.filter(c => c.lines.length > 0).length

    const group = byProvenance.get(provenance) ?? []
    group.push({ id: feat.id, name: feat.name, source: feat.source ?? null, contributions })
    byProvenance.set(provenance, group)
  }

  // Known provenances in their fixed order, then anything a new `kind`
  // introduced, alphabetically — never silently merged into General.
  const extras = [...byProvenance.keys()]
    .filter(p => !PROVENANCE_ORDER.includes(p))
    .sort()

  const groups = [...PROVENANCE_ORDER, ...extras]
    .map(provenance => ({
      provenance,
      label: provenanceLabel(provenance),
      feats: byProvenance.get(provenance) ?? [],
    }))
    .filter(g => g.feats.length > 0 || g.provenance === 'epic_boon')

  return { groups, featCount: feats.length, benefitsOnSheet }
}

/** `5 feats · 9 benefits on this sheet` — the list's header line. */
export function formatSheetBenefitSummary({ featCount, benefitsOnSheet }) {
  const feats = `${featCount} feat${featCount === 1 ? '' : 's'}`
  if (!benefitsOnSheet) return `${feats} · nothing computed`
  return `${feats} · ${benefitsOnSheet} benefit${benefitsOnSheet === 1 ? '' : 's'} on this sheet`
}

// ---------------------------------------------------------------------------
// View 4d — the Active Benefits strip
// ---------------------------------------------------------------------------

/**
 * Every benefit this character can switch on and off — view 4d.
 *
 * **Grouped by `effectKey`, which is what makes one component serve two very
 * different sources.** A feat benefit keys `feat:<uuid>:<benefitKey>`; a class
 * feature with no benefits at all keys on its bare id. Rage is the second case
 * and, as of 2026-08-22, it is the *only* activated thing in the entire content
 * schema — zero feat benefits carry `activation: 'activated'`. Treating the
 * bare-id case as a legacy fallback rather than a first-class one would leave
 * the only character who can use this screen looking at an empty box.
 *
 * The strip is built from `resolvedEffects` alone for that reason. `featRows`
 * only ever improves a *label*: it supplies the benefit's authored name where
 * one exists, and nothing here depends on it having arrived.
 *
 * Duration and trigger are prose on their way to a `<Typography>` and are never
 * detected or counted down (Ruling 8).
 */
export function activatableBenefits({ character, sheet, featRows }) {
  const resolvedEffects = character?.json?.resolvedEffects ?? []
  const rowsById = indexFeatRows(featRows)
  const ctx = sheetAmountContext(sheet, character)

  const active = new Set([
    ...(character?.vault_state?.activeEffects ?? []),
    ...(character?.vault_state?.activeFeatures ?? []),
  ])

  const byKey = new Map()
  for (const effect of resolvedEffects) {
    if (!isActivated(effect)) continue
    const key = effectKey(effect)
    // An activated effect naming no source can never be switched on. That is a
    // content bug, and offering a dead toggle for it would be worse than
    // leaving it out — `effectApplies` already refuses it.
    if (!key) continue
    const entry = byKey.get(key) ?? { key, effects: [] }
    entry.effects.push(effect)
    byKey.set(key, entry)
  }

  return [...byKey.values()].map(({ key, effects }) => {
    const envelope = readEnvelope(effects[0])
    const row = envelope.sourceFeatureId ? rowsById.get(envelope.sourceFeatureId) : null
    const benefit = envelope.benefitKey
      ? featBenefits(row).find(b => b.key === envelope.benefitKey)
      : null

    // A *named* benefit is titled for itself and sourced to its feat. Anything
    // else — a feature like Rage, or one of the 145 unnamed `overview` benefits
    // that are the whole feat — is titled for the feat and carries no source
    // line, because "Rage — Rage" says the same thing twice and "Overview"
    // names the generator's placeholder rather than the buff.
    const name = benefit?.name ?? envelope.source ?? unslug(envelope.benefitKey) ?? 'Benefit'
    const source = benefit?.name ? envelope.source : null

    return {
      key,
      name,
      source,
      lines: effects.map(e => describeEffect(e, ctx)).filter(Boolean),
      duration: effects.map(readEnvelope).find(e => e.duration)?.duration ?? null,
      trigger: effects.map(readEnvelope).find(e => e.trigger)?.trigger ?? null,
      isActive: active.has(key),
    }
  })
}

/** `none active` · `1 active` · `2 active` — the strip's header caption. */
export function formatActiveCount(benefits) {
  const count = (benefits ?? []).filter(b => b.isActive).length
  return count === 0 ? 'none active' : `${count} active`
}
