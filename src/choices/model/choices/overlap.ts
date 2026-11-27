import { classToolGrants } from '@vault/derive/vaultDerive.js'
import { TOOL_SLUGS, toolName } from '@vault/derive/tools.js'

import { SKILL_NAME } from './skills'

import type { BuilderDraft } from '../draft'

// Proficiency Overlap (MYDND-275). One module of the builder's choices
// (MYDND-197); index.ts says what the folder is.
//
// The 2024 rules: "If you would gain the same proficiency from two different
// sources, you can choose a different proficiency of the same kind (skill or
// tool) instead." Before this the builder said nothing, and the json's
// `new Set` quietly kept one copy, so a Cleric picking Insight and taking
// Acolyte, or a Rogue taking Criminal, lost a proficiency for nothing.
//
// A doubled skill is a class pick the player can change, so the Class step
// refuses it and flags one already made. A doubled tool is fixed on both sides
// (the Rogue's and the Criminal's Thieves' Tools), so the Background step asks
// for the replacement, which is `draft.toolReplacements`.

/** The tools every class in the draft grants, as `tools.js` slugs: the first class's starting list, the others' multiclass lists. */
export function classTools(draft: BuilderDraft, fences: ReadonlyArray<{ data?: unknown } | null>): string[] {
  const out = new Set<string>()
  draft.classes.forEach((cls, i) => {
    if (!cls.id) return
    for (const slug of classToolGrants(fences[i]?.data ?? null, i === 0)) out.add(slug)
  })
  return [...out]
}

/** The background's fixed tools a class grants too: each is owed a replacement. */
export function doubledTools(
  draft: BuilderDraft,
  fences: ReadonlyArray<{ data?: unknown } | null>,
  background: { tools?: readonly string[] } | null | undefined,
): string[] {
  const fromClass = new Set(classTools(draft, fences))
  return [...new Set(background?.tools ?? [])].filter(slug => fromClass.has(slug))
}

/** The replacement for the `slot`th doubled tool. A blank slug clears it. */
export function withToolReplacement(draft: BuilderDraft, slot: number, slug: string): BuilderDraft {
  const next = [...(draft.toolReplacements ?? [])]
  next[slot] = slug
  // Holes become blanks, not `undefined`: the yaml writer would refuse one.
  return { ...draft, toolReplacements: Array.from(next, v => v ?? '') }
}

/**
 * The tools a replacement may be: any the character does not already have.
 * `slug` (the one held in this slot) stays offered, so the select shows it.
 */
export function replacementToolOptions(held: ReadonlySet<string>, slug: string | null): Array<{ value: string; label: string; disabled: boolean }> {
  return TOOL_SLUGS.map(t => ({ value: t, label: toolName(t), disabled: t !== slug && held.has(t) }))
}

/** The replacements the save keeps: one per doubled tool, answered, and none for a doubling that has gone. */
export function keptReplacements(draft: BuilderDraft, doubled: readonly string[]): string[] {
  return (draft.toolReplacements ?? []).slice(0, doubled.length).filter(Boolean)
}

/**
 * The class's skill picks that the background or species also grants, with
 * where else each comes from. `held` is `skillSourceMap` of the draft with no
 * class picks, so it names every source but the class.
 */
export function doubledClassSkills(picks: readonly string[], held: Readonly<Record<string, string>>): Array<{ slug: string; from: string }> {
  return picks.filter(Boolean).flatMap(slug => (held[slug] ? [{ slug, from: held[slug] }] : []))
}

/** "Insight also comes from Background: choose another skill". */
export function doubledSkillText({ slug, from }: { slug: string; from: string }): string {
  return `${SKILL_NAME[slug] ?? slug} also comes from ${from}: choose another skill`
}
