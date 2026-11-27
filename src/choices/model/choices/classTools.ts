import { classToolChoices, classToolGrants, classToolPickGrants, classToolSlots, type ClassToolChoice } from '@vault/derive/vaultDerive.js'
import { toolName, toolSlugsIn } from '@vault/derive/tools.js'

import type { ToolChoice } from '../../../compendium'
import type { BuilderDraft } from '../draft'

import { TOOL_CHOICE_LABEL } from './languagesAndTools'

// A class's tool choices (MYDND-280): the Bard's three instruments, the Monk's
// "Artisan's Tools or Musical Instrument". One module of the builder's choices
// (MYDND-197); index.ts says what the folder is.
//
// The picks are each class's own, `draft.classes[i].toolPicks`, so they go with
// the class: a class swapped or removed takes its picks along. They are read
// through `classToolSlots`, as the bake reads them, so the step shows exactly
// what the sheet will grant.

type Fences = ReadonlyArray<{ data?: unknown } | null>

/** What the class at `index` asks: its starting list's choices if it is the first class, else its multiclass list's. */
export function classToolChoicesOf(fence: { data?: unknown } | null, index: number): ClassToolChoice[] {
  return classToolChoices(fence?.data ?? null, index === 0)
}

/** One select per pick the class's choices allow, each with the pick it holds or `''`. */
export function classToolSlotsOf(draft: BuilderDraft, fence: { data?: unknown } | null, index: number) {
  return classToolSlots(classToolChoicesOf(fence, index), draft.classes[index]?.toolPicks ?? [])
}

/** The `slot`th pick of the class at `index` set to `slug`; a blank clears it. */
export function withClassToolPick(
  draft: BuilderDraft,
  fence: { data?: unknown } | null,
  index: number,
  slot: number,
  slug: string,
): BuilderDraft {
  const cls = draft.classes[index]
  if (!cls) return draft
  const picks = classToolSlotsOf(draft, fence, index).map(s => s.pick)
  if (slot < 0 || slot >= picks.length) return draft
  picks[slot] = slug
  const toolPicks = picks.filter(Boolean)
  return { ...draft, classes: draft.classes.map((c, i) => (i === index ? { ...c, toolPicks } : c)) }
}

/** "Musical instrument", "Artisan's tools or musical instrument". */
export function classToolChoiceLabel(choice: ClassToolChoice): string {
  return choice.categories
    .map((c, i) => (i === 0 ? TOOL_CHOICE_LABEL[c] : TOOL_CHOICE_LABEL[c].toLowerCase()))
    .join(' or ')
}

export interface ClassToolOption {
  value: string
  label: string
  disabled: boolean
  /** The kind, when the choice allows two: one `<optgroup>` each. */
  group?: string
}

/**
 * What one class tool select offers. A tool held from elsewhere is offered as
 * taken, with where from, as the class's skills are (the Proficiency Overlap
 * rule lets the player pick another instead); the slot's own pick stays
 * selectable, so the select shows it and its warning.
 */
export function classToolOptions(
  choice: ClassToolChoice,
  held: Readonly<Record<string, string>>,
  current: string,
): ClassToolOption[] {
  const grouped = choice.categories.length > 1
  return choice.categories.flatMap(category =>
    toolSlugsIn(category)
      .map(slug => ({
        value: slug,
        label: held[slug] ? `${toolName(slug)} (${held[slug]})` : toolName(slug),
        disabled: Boolean(held[slug]) && slug !== current,
        ...(grouped ? { group: TOOL_CHOICE_LABEL[category] } : {}),
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  )
}

/**
 * Every tool the character holds other than the class at `index`'s own picks,
 * and from where: the background's (fixed, picked, replacements), every class's
 * fixed tools, and the other classes' picks. What that class's selects refuse.
 */
export function toolsHeldBesides(
  draft: BuilderDraft,
  fences: Fences,
  index: number,
  background: { name?: string | null; tools?: readonly string[] } | null | undefined,
): Record<string, string> {
  const held: Record<string, string> = {}
  const add = (slugs: readonly string[], from: string) => {
    for (const slug of slugs) if (slug && !held[slug]) held[slug] = from
  }
  const bg = background?.name ?? draft.background?.name ?? 'Background'
  add([...(background?.tools ?? []), ...(draft.backgroundTools ?? []), ...(draft.toolReplacements ?? [])], bg)
  draft.classes.forEach((cls, i) => {
    if (!cls.id) return
    const data = fences[i]?.data ?? null
    const who = cls.name ?? `Class ${i + 1}`
    add(classToolGrants(data, i === 0), who)
    if (i !== index) add(classToolPickGrants(data, i === 0, cls.toolPicks), who)
  })
  return held
}

/** Every class's tool picks, as the bake grants them: what a background replacement must not repeat. */
export function classPickedTools(draft: BuilderDraft, fences: Fences): string[] {
  return draft.classes.flatMap((cls, i) => (cls.id ? classToolPickGrants(fences[i]?.data ?? null, i === 0, cls.toolPicks) : []))
}

/** The class at `index`'s picks that are held from elsewhere too, and from where. */
export function doubledClassTools(held: Readonly<Record<string, string>>, picks: readonly string[]): Array<{ slug: string; from: string }> {
  return picks.filter(slug => held[slug]).map(slug => ({ slug, from: held[slug] }))
}

export function doubledToolText({ slug, from }: { slug: string; from: string }): string {
  return `${toolName(slug)} also comes from ${from}: choose a different tool.`
}

/**
 * What the Class step leaves open about tools: an unanswered pick, or one that
 * doubles a tool held elsewhere. One line per class.
 */
export function classToolOpenChoices(
  draft: BuilderDraft,
  fences: Fences,
  background: { name?: string | null; tools?: readonly string[]; toolChoices?: readonly ToolChoice[] } | null | undefined,
): string[] {
  return draft.classes.flatMap((cls, i) => {
    if (!cls.id) return []
    const slots = classToolSlotsOf(draft, fences[i] ?? null, i)
    if (slots.length === 0) return []
    const who = cls.name ?? `Class ${i + 1}`
    const picks = slots.map(s => s.pick).filter(Boolean)
    const doubled = doubledClassTools(toolsHeldBesides(draft, fences, i, background), picks)
    return [
      ...(picks.length < slots.length ? [`${who} tool proficiencies`] : []),
      ...doubled.map(doubledToolText),
    ]
  })
}
