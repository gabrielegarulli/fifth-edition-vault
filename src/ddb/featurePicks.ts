import type { DdbChoice, DdbPayload } from './payload'
import type { SheetFeaturePick } from './sheet'

/**
 * What the player picked at each class and subclass feature (MYDND-53).
 *
 * The Features tab's text comes from the class note, which can only say
 * "choose two spells" — so a D&D Beyond character's Magical Discoveries read as
 * undone though they were made long ago. The payload says what was picked, and
 * at which feature: every choice and every feat carries the `componentId` of
 * what it was made at. Two sources, both keyed that way:
 *
 * - **`choices.class`** — a skill for Expertise, a spell for Magical
 *   Discoveries. Its `optionValue` resolves against
 *   `choiceDefinitions["<componentTypeId>-<type>"]`; one that does not (the
 *   subclass choice, "Choose a Feat") is skipped rather than shown as a number.
 * - **`feats`** whose `componentId` is a class feature — the feat taken at an
 *   Ability Score Improvement — with that feat's own choices from
 *   `choices.feat` in brackets: `Lightly Armored (Dexterity)`.
 *
 * Kept at import because the plugin keeps no payload to read later.
 */
export function buildFeaturePicks(payload: DdbPayload): SheetFeaturePick[] {
  const options = new Map<string, Map<number, string>>()
  for (const def of payload?.choices?.choiceDefinitions ?? []) {
    if (!def?.id) continue
    const labels = new Map<number, string>()
    for (const o of def.options ?? []) if (typeof o?.id === 'number' && o.label) labels.set(o.id, o.label)
    options.set(def.id, labels)
  }
  const labelOf = (c: DdbChoice): string | null =>
    typeof c.optionValue === 'number' ? (options.get(`${c.componentTypeId}-${c.type}`)?.get(c.optionValue) ?? null) : null

  const answers = (list: readonly (DdbChoice | null)[] | null | undefined, componentId: number): string[] =>
    (list ?? []).flatMap(c => (c && c.componentId === componentId ? [labelOf(c)].filter((l): l is string => !!l) : []))

  const out: SheetFeaturePick[] = []
  for (const cls of payload?.classes ?? []) {
    const className = String(cls?.definition?.name || cls?.name || '')
    const level = typeof cls?.level === 'number' ? cls.level : 0
    for (const f of cls?.classFeatures ?? []) {
      const def = f?.definition
      if (typeof def?.id !== 'number' || !def.name) continue
      const required = typeof def.requiredLevel === 'number' ? def.requiredLevel : 0
      if (required > level) continue

      const picks = answers(payload.choices?.class, def.id)
      for (const feat of payload?.feats ?? []) {
        if (feat?.componentId !== def.id || !feat.definition?.name) continue
        const own = typeof feat.definition.id === 'number' ? answers(payload.choices?.feat, feat.definition.id) : []
        const detail = tally(own.map(s => s.replace(/ Score$/, '')))
        picks.push(detail ? `${feat.definition.name} (${detail})` : feat.definition.name)
      }
      if (picks.length === 0) continue
      out.push({ class: className, feature: def.name.replace(/^\d+:\s*/, ''), level: required, picks })
    }
  }
  return out
}

/** `Charisma, Charisma, Dexterity` → `Charisma ×2, Dexterity`. */
function tally(labels: string[]): string {
  const counts = new Map<string, number>()
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1)
  return [...counts].map(([l, n]) => (n > 1 ? `${l} ×${n}` : l)).join(', ')
}
