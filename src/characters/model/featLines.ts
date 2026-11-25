import { featPickLabels } from '@vault/derive/originFeatChoices.js'
import { featContributionGroups, formatSheetBenefitSummary } from '@vault/derive/sheetBenefits.js'

import type { Sheet, VaultCharacterJson } from '../../characterModel'

/**
 * What the Features tab says about each feat beyond its prose (MYDND-274): what
 * the player picked for it, and what each of its benefits does on this sheet.
 *
 * Both answers already existed in `@vault/derive` and nothing on the sheet
 * read them. `featPickLabels` names Magic Initiate's spells and Skilled's
 * skills; `featContributionGroups` sorts a feat's benefits into what the sheet
 * computes, what a toggle switches on, and what the table rules. Without them a
 * feat was a closed row of book text, and the only line about effects was a
 * footer from the D&D Beyond era saying that only dice interventions were
 * wired, which a Vault character's baked effects make false.
 */

export type BenefitStatus = 'computed' | 'activated' | 'needs_choice' | 'reminder'

export interface BenefitLine {
  key: string
  name: string
  status: BenefitStatus
  /** What it does here, `+1 AC` and the like; empty for one the table rules. */
  lines: string[]
}

export interface FeatLines {
  picks: string[]
  /** Empty for a D&D Beyond character: its feats were never baked here. */
  benefits: BenefitLine[]
}

export interface FeatNote {
  id: string
  name: string
  kind?: string | null
  /** The note's ` ```vault-feat ` fence, `{ benefits }`; undefined while it loads. */
  fence?: unknown
}

/** What a feat was taken for, every copy of it, from the character's answers. */
function picksOf(json: VaultCharacterJson | null, feat: FeatNote, proficiencyBonus: number): string[] {
  if (!json) return []
  const answers: unknown[] = Object.values(json.featureChoices ?? {}).filter(
    a => (a as { featId?: unknown } | null)?.featId === feat.id,
  )
  const origin = (json as { originFeat?: { id?: string; choices?: unknown } | null }).originFeat
  if (origin?.id === feat.id) answers.unshift({ choices: origin.choices })
  return answers.flatMap(a =>
    featPickLabels(feat.name, (a as { choices?: unknown } | null)?.choices, { proficiencyBonus }),
  )
}

export function featLines(
  sheet: Sheet,
  json: VaultCharacterJson | null,
  feats: readonly FeatNote[],
): { byId: Map<string, FeatLines>; summary: string | null } {
  const pb = sheet.proficiency_bonus ?? 2
  const baked = sheet.vault_bake?.effects ?? null
  const byId = new Map<string, FeatLines>()
  for (const f of feats) byId.set(f.id, { picks: picksOf(json, f, pb), benefits: [] })
  if (!baked) return { byId, summary: null }

  const result = featContributionGroups({
    character: {
      json: {
        originFeat: (json as { originFeat?: { id?: string } | null } | null)?.originFeat ?? null,
        resolvedEffects: baked,
        classes: json?.classes ?? [],
      },
    },
    sheet: {
      feats: feats.map(f => ({ id: f.id, name: f.name })),
      abilityScores: (sheet.abilities ?? []).map(a => ({ key: a.label.toLowerCase(), mod: a.mod })),
      pb,
    },
    featRows: feats.map(f => ({ id: f.id, name: f.name, kind: f.kind ?? null, data: (f.fence ?? {}) as Record<string, unknown> })),
  })

  for (const group of result.groups) {
    for (const line of group.feats) {
      const entry = byId.get(line.id)
      if (!entry) continue
      entry.benefits = line.contributions.map(c => ({
        key: c.key,
        name: c.name,
        status: c.status as BenefitStatus,
        lines: c.lines,
      }))
    }
  }
  return { byId, summary: formatSheetBenefitSummary(result) }
}

/** A benefit's status, in the words the row shows. */
export function benefitStatusLabel(status: BenefitStatus): string {
  switch (status) {
    case 'computed':
      return 'on the sheet'
    case 'activated':
      return 'switched on in Combat'
    case 'needs_choice':
      return 'needs a choice'
    default:
      return 'at the table'
  }
}
