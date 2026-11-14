import { ARMOR_TRAINING_TIERS, getCompanionScaling } from '@vault/derive/tamerScaling.js'

/**
 * A Tamer companion's improvements in the builder (MYDND-126) — the web
 * builder's `ImprovementPicker`, as pure functions over the familiar note's
 * ` ```vault-companion ` fence.
 *
 * The web app reads the list from `content_familiar_improvement`; here the
 * exporter writes it onto the familiar's own bestiary note (`export:monsters`,
 * `companionImprovements.ts` in the mcp-server), bespoke tree first, then the
 * six universal rows. The slugs are `the-vault`'s, because
 * `@vault/derive/tamerScaling.js` applies an improvement by its slug.
 *
 * **Three places this is not the web picker, each from the book's text:**
 *
 * - A **free** improvement ("Become a tamer's companion … it doesn't cost an
 *   improvement") is granted, never offered in a slot. The web app lists it in
 *   the slots, which a 1st-level Tamer does not have, so a Dragonling could not
 *   take the Growth I that every one of them starts with.
 * - **Slot *i* is the improvement gained at Tamer level *i* + 2**, and offers
 *   only what that level allows — "each companion gains one of the following
 *   improvements" whenever the Tamer gains a level. The web app gates every
 *   slot on the current level, so a 9th-level pick could fill the slot earned
 *   at 2nd.
 * - **Go for the Throat's cap** (once; twice at 5th; three times at 9th) is
 *   enforced; the web app's comment says the picker does and it does not.
 *
 * What is stored is the web app's shape — `{ slug, name, kind, target? }` per
 * improvement, the free ones first and marked `free` — in both
 * `featureChoices[featureId].improvements` and `familiars[].improvements`.
 * **Never an `id` key**: `tamerScaling`'s Growth test reads `id ?? name`, so an
 * id would hide a Growth's name from it.
 */

export interface ImprovementDef {
  slug: string
  name: string
  kind: 'bespoke' | 'universal'
  /** The Tamer level that unlocks it. */
  level: number
  type: string | null
  free: boolean
  repeatable: boolean
  /** Slugs any one of which must be taken first. */
  requires: string[]
  description: string
}

export type WarTraining = { kind: 'armor'; armor?: string | null } | { kind: 'weapons'; weapons?: Array<string | null> }

export interface ImprovementPick {
  slug: string
  name: string
  kind: 'bespoke' | 'universal'
  /** An ability key, a speed type, or War Training's choice. */
  target?: string | WarTraining | null
  free?: true
}

/** The improvement asks a follow-up: which ability, save, speed or proficiency. */
export const TARGETED: Record<string, 'ability' | 'save' | 'speed' | 'war'> = {
  'ability-boost': 'ability',
  'survival-instincts': 'save',
  'speed-training': 'speed',
  'war-training': 'war',
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * The fence's `improvements`, each coerced; an entry with no slug or name is
 * dropped. A reader degrades — a hand-broken entry costs one option, not the
 * picker.
 */
export function improvementDefs(fence: unknown): ImprovementDef[] {
  const raw = (fence as { improvements?: unknown } | null)?.improvements
  if (!Array.isArray(raw)) return []
  return raw.flatMap((e): ImprovementDef[] => {
    const r = (e ?? {}) as Record<string, unknown>
    const slug = str(r.slug)
    const name = str(r.name)
    if (!slug || !name) return []
    const level = Number(r.level)
    return [
      {
        slug,
        name,
        kind: r.kind === 'universal' ? 'universal' : 'bespoke',
        level: Number.isFinite(level) ? level : 1,
        type: str(r.type),
        free: r.free === true,
        repeatable: r.repeatable === true,
        requires: Array.isArray(r.requires) ? r.requires.flatMap(s => (str(s) ? [str(s)!] : [])) : [],
        description: typeof r.description === 'string' ? r.description : '',
      },
    ]
  })
}

/** The slots a companion has at this Tamer level — `BESPOKE_COMPANION_TABLE`. */
export function improvementSlots(tamerLevel: number): number {
  return (getCompanionScaling(tamerLevel) as { improvements: number }).improvements
}

/** The Tamer level a slot is earned at: one per level beyond 1st. */
export const slotLevel = (index: number): number => index + 2

/** How many Go for the Throat a companion may have at a Tamer level. */
export function throatCap(tamerLevel: number): number {
  return tamerLevel >= 9 ? 3 : tamerLevel >= 5 ? 2 : tamerLevel >= 2 ? 1 : 0
}

const pickOf = (d: ImprovementDef): ImprovementPick => ({ slug: d.slug, name: d.name, kind: d.kind })

/** The improvements granted on becoming a companion. */
export function freePicks(defs: readonly ImprovementDef[]): ImprovementPick[] {
  return defs.filter(d => d.free).map(d => ({ ...pickOf(d), free: true as const }))
}

/** The slotted picks out of a stored list — everything not marked free. */
export function slottedOf(stored: unknown): Array<ImprovementPick | null> {
  if (!Array.isArray(stored)) return []
  return stored
    .filter(p => !(p as ImprovementPick | null)?.free)
    .map(p => (p && typeof p === 'object' && str((p as ImprovementPick).slug) ? (p as ImprovementPick) : null))
}

/**
 * The list to store: the free picks, then the slots, an empty slot dropped and
 * any beyond the Tamer's count cut — a lowered level must not keep a pick the
 * companion no longer has.
 */
export function storedImprovements(
  defs: readonly ImprovementDef[],
  slots: ReadonlyArray<ImprovementPick | null>,
  tamerLevel: number,
): ImprovementPick[] {
  const kept = slots.slice(0, improvementSlots(tamerLevel)).filter((p): p is ImprovementPick => !!p)
  return [...freePicks(defs), ...kept]
}

/** What slot `index` may hold, given the other slots. */
export function slotOptions(
  defs: readonly ImprovementDef[],
  slots: ReadonlyArray<ImprovementPick | null>,
  index: number,
): ImprovementDef[] {
  const level = slotLevel(index)
  const before = new Set([...freePicks(defs), ...slots.slice(0, index).filter(Boolean)].map(p => p!.slug))
  const elsewhere = new Set(slots.filter((p, i) => i !== index && p).map(p => p!.slug))
  const throats = slots.slice(0, index).filter(p => p?.slug === 'go-for-the-throat').length
  return defs.filter(d => {
    if (d.free || d.level > level) return false
    if (!d.repeatable && elsewhere.has(d.slug)) return false
    if (d.requires.length > 0 && !d.requires.some(s => before.has(s))) return false
    if (d.slug === 'go-for-the-throat' && throats >= throatCap(level)) return false
    return true
  })
}

/** War Training's armour: the tier after the highest an earlier slot granted, or none. */
export function armorOptions(slots: ReadonlyArray<ImprovementPick | null>, index: number): string[] {
  const tiers = ARMOR_TRAINING_TIERS
  const highest = slots
    .slice(0, index)
    .map(p => (p?.slug === 'war-training' && typeof p.target === 'object' && p.target?.kind === 'armor' ? p.target.armor : null))
    .reduce((acc, a) => Math.max(acc, a ? tiers.indexOf(a) : -1), -1)
  return highest + 1 < tiers.length ? [tiers[highest + 1]] : []
}

/** A pick is answered once any follow-up it asks is. */
export function pickComplete(pick: ImprovementPick | null): boolean {
  if (!pick) return false
  const asks = TARGETED[pick.slug]
  if (!asks) return true
  const t = pick.target
  if (asks !== 'war') return typeof t === 'string' && t !== ''
  if (!t || typeof t !== 'object') return false
  if (t.kind === 'armor') return Boolean(t.armor)
  return (t.weapons ?? []).filter(Boolean).length === 2
}

/** Every slot the Tamer's level gives is filled and answered. */
export function improvementsComplete(stored: unknown, tamerLevel: number): boolean {
  const slots = slottedOf(stored)
  const count = improvementSlots(tamerLevel)
  return Array.from({ length: count }, (_, i) => slots[i] ?? null).every(pickComplete)
}
