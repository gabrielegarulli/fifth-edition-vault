// A character's vitals, the `vault-vitals` fence: its types, parse and
// serialise, and the pure operations on it (damage, healing, death saves, hit
// dice, slots, uses). The store that writes it is
// `characters/store/vitals.ts`.

import { extractFence, fromYaml, parseNote, serialiseNote, setFence } from '../../platform'
import type { Sheet } from './sheet/sheet'

/**
 * A character's mutable state — the half of a sheet that play changes.
 *
 * ## Why this is not in the charsheet fence
 *
 * `renderNote` replaces **the whole managed region** on every re-sync, because
 * the charsheet fence's contract is "mirrors D&D Beyond". Hit points spent in a
 * fight, hit dice spent on a short rest, death saves and XP are the opposite of
 * that: nobody but the table authors them, and a Re-sync-all would silently
 * reset every one.
 *
 * So they live in their own ` ```vault-vitals ` fence, written *outside* the
 * managed markers. `setFence` appends when the fence is absent and replaces in
 * place when it is present, so it lands after the managed region and survives a
 * re-sync untouched.
 *
 * This is not a new pattern — MYDND-6's ` ```vault-inventory ` is there for the
 * identical reason. A third fence invented for a third reason would have been
 * the signal that the first two were wrong.
 *
 * ## It records damage taken, not current hit points
 *
 * **`damage`, not `current`.** Storing an absolute current HP against a maximum
 * that is about to change is how the two come to disagree: level up, the sheet's
 * max goes 50 → 58 on the next re-sync, and a stored `current: 43` has silently
 * cost the character eight points of headroom. In 5e a level-up raises current
 * and maximum together, so the *damage* is the durable quantity and
 * `current = max - damage` is the derivation.
 *
 * `hit_dice_spent` is the same shape against the sheet's `hit_dice` totals, and
 * for the same reason.
 *
 * ## Clamping happens on read, not on write
 *
 * A stored `damage` greater than the current maximum is not corrected in the
 * file. It is clamped when projected, so that lowering a maximum temporarily —
 * which a GM does — and raising it back does not destroy the number underneath.
 * The file holds what happened; the projection holds what it means now.
 *
 * ## `present` is the handover, and leaving it out loses the import
 *
 * D&D Beyond reports a *current* hit point total, and the charsheet fence
 * carries it. So until this plugin has written anything, **that number is the
 * truth** — and projecting `max - damage` over an absent fence would show a
 * character at full health who had walked out of a fight on 94 of 101. (Caught
 * by `characters.test.tsx`, which asserts the roster shows exactly that.)
 *
 * `present` is therefore a real tri-state and not a convenience: no fence means
 * the sheet governs, a fence means this does. The handover happens on the first
 * mutation, which **seeds `damage` from the sheet's own current** so nothing
 * jumps at the moment of transition.
 *
 * After the handover, a re-sync no longer moves hit points. That is deliberate:
 * two files that both believe they own current HP is worse than one that does,
 * and the one being played in should win.
 */

export const VITALS_FENCE = 'vault-vitals'

export interface DeathSaves {
  successes: number
  failures: number
}

export interface Vitals {
  /**
   * Whether a `vault-vitals` fence exists in the note.
   *
   * **The handover flag.** False means this plugin has never written to the
   * character and the charsheet fence's own `hp.current` governs; true means
   * these numbers do. See the note at the top of this file.
   */
  present: boolean
  /** Damage taken. `current = max - damage`, clamped on projection. */
  damage: number
  /** Temporary hit points. Not a pool that stacks — see `setTemp`. */
  temp: number
  /** Hit dice spent, keyed by the sheet's own die label (`d8`, `Rogue`). */
  hitDiceSpent: Record<string, number>
  /**
   * Spell slots spent, keyed by rank (MYDND-36). The maximum is the sheet's
   * `spell_slots`; this is the `damage` of slots, for the same reason — a level
   * up raises the maximum and must not cost the character a slot.
   */
  spellSlotsUsed: Record<string, number>
  /** Free casts spent, keyed by the sheet's `free_cast_spells[].key` — `vault_state.featureUsesUsed`. */
  featureUsesUsed: Record<string, number>
  deathSaves: DeathSaves
  /** Experience points. `null` when the table does not track XP. */
  xp: number | null
  /** Keys of activated effects currently switched on — `vault_state`'s own. */
  activeEffects: string[]
  /**
   * Feat names this character has.
   *
   * The catalog supplies the *effects*; this supplies the *names*. Either the
   * D&D Beyond payload reported them or the GM wrote them here, which is the
   * only option for a local character. See `compendium/model/featEffects.ts`.
   */
  feats: string[]
  /**
   * Effects declared on this character by hand.
   *
   * **The escape hatch.** Built when, measured 2026-10-07, **zero of 197
   * exported feat notes carried a `dice_intervention`** — the exporter then
   * translated only `ability_score_choice`, so without this the prompt was
   * unreachable code. Since MYDND-26 the catalog carries the three the-vault
   * models (Great Weapon Fighting, Piercer, Savage Attacker); this remains the
   * way to declare one the-vault has not modelled, such as Great Weapon
   * Master's Heavy Weapon Mastery.
   *
   * It is **not** catalog authoring, which MYDND-5 ruled out for good reasons
   * (5e.tools is canonical; authoring is an exporter change). It is a statement
   * about *this character* — the same kind of thing as `feats` and
   * `activeEffects` beside it — and it is why `conditions` is here too.
   *
   * Catalog effects and these are concatenated, catalog first, so a declared
   * one never displaces a published one.
   */
  effects: Record<string, unknown>[]
  /** Conditions in play. Declared, never simulated — the table owns durations. */
  conditions: string[]
  /**
   * Heroic Inspiration (MYDND-45) — the 2024 rules' one-reroll token. **Survives
   * both rests**, as on the web sheet: it is spent at the table, never
   * refreshed by resting, so neither rest touches it.
   */
  heroicInspiration: boolean
  /**
   * The spell this character is concentrating on, or null (MYDND-46). One at a
   * time — casting another concentration spell replaces it, which is the rule.
   * Ended by a long rest and by dropping to 0 hit points; a failed
   * Constitution save is the player's to report, by clearing it.
   */
  concentration: string | null
  /**
   * Defences the player has set by hand — the web sheet's `vault_state.defenses`
   * (MYDND-48). One entry per value; granted defences are not stored, they are
   * computed from the sheet and the effects at render.
   */
  defenses: StoredDefense[]
  /**
   * The beast form a Druid has taken, or null (MYDND-51) — the web sheet's
   * `vault_state.wildShape`. Its AC and walking speed replace the character's
   * on the sheet while it lasts; a long rest ends it.
   */
  wildShape: WildShapeForm | null
  /**
   * Damage each familiar has taken, by the familiar's `featureId` (MYDND-51).
   * Damage rather than current hit points, for `damage`'s own reason: the
   * maximum is the statblock's, and a stored current would drift from it.
   */
  familiarDamage: Record<string, number>
  updatedAt: string | null
}

export interface WildShapeForm {
  /** The bestiary note's slug. */
  id: string
  name: string
  cr: number | null
  ac: number | null
  walkSpeed: number | null
}

function wildShapeOf(raw: unknown): WildShapeForm | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null
  const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  return { id: r.id, name: r.name, cr: n(r.cr), ac: n(r.ac), walkSpeed: n(r.walk_speed) }
}

export type DefenseType = 'resistance' | 'immunity' | 'vulnerability' | 'condition_immunity'
export interface StoredDefense {
  type: DefenseType
  value: string
}
const DEFENSE_TYPES: readonly DefenseType[] = ['resistance', 'immunity', 'vulnerability', 'condition_immunity']

/** A hand-edited list read back as only the entries that mean something. */
function defenseList(raw: unknown): StoredDefense[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(d => {
    const type = (d as Record<string, unknown>)?.type
    const value = (d as Record<string, unknown>)?.value
    return typeof type === 'string' &&
      (DEFENSE_TYPES as readonly string[]).includes(type) &&
      typeof value === 'string' &&
      value.trim()
      ? [{ type: type as DefenseType, value: value.trim().toLowerCase() }]
      : []
  })
}

export const EMPTY_VITALS: Readonly<Vitals> = Object.freeze({
  present: false,
  damage: 0,
  temp: 0,
  hitDiceSpent: Object.freeze({}) as Record<string, number>,
  spellSlotsUsed: Object.freeze({}) as Record<string, number>,
  featureUsesUsed: Object.freeze({}) as Record<string, number>,
  deathSaves: Object.freeze({ successes: 0, failures: 0 }) as DeathSaves,
  xp: null,
  activeEffects: Object.freeze([]) as unknown as string[],
  feats: Object.freeze([]) as unknown as string[],
  effects: Object.freeze([]) as unknown as Record<string, unknown>[],
  conditions: Object.freeze([]) as unknown as string[],
  heroicInspiration: false,
  concentration: null,
  defenses: Object.freeze([]) as unknown as StoredDefense[],
  wildShape: null,
  familiarDamage: Object.freeze({}) as Record<string, number>,
  updatedAt: null,
})

/**
 * A fresh, mutable empty value. `EMPTY_VITALS` is frozen all the way down, and
 * spreading it shares those frozen maps — so every collection is new here.
 */
export function emptyVitals(): Vitals {
  return {
    ...EMPTY_VITALS,
    hitDiceSpent: {},
    spellSlotsUsed: {},
    featureUsesUsed: {},
    deathSaves: { successes: 0, failures: 0 },
    activeEffects: [],
    feats: [],
    effects: [],
    conditions: [],
    defenses: [],
    familiarDamage: {},
  }
}

const nonNegative = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

const stringList = (v: unknown): string[] => {
  if (!Array.isArray(v)) return []
  return v.map(x => String(x ?? '').trim()).filter(x => x !== '')
}

/**
 * Hand-declared effects, kept only when they are objects naming a `type`.
 *
 * Anything else is dropped rather than passed through: an effect with no type
 * reaches `interventions()` and is skipped there anyway, and a string in the
 * list would be a YAML mistake worth not propagating.
 */
const effectList = (v: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(v)) return []
  return v.filter(
    (e): e is Record<string, unknown> =>
      !!e && typeof e === 'object' && !Array.isArray(e) && typeof (e as { type?: unknown }).type === 'string',
  )
}

const countMap = (v: unknown): Record<string, number> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(v as Record<string, unknown>)) {
    const n = nonNegative(value)
    if (n > 0) out[key] = n
  }
  return out
}

/**
 * Read a vitals fence.
 *
 * **A reader degrades** (ADR 0003): malformed YAML here gives empty vitals, not
 * an exception, because a fence somebody broke by hand must not take out the
 * character sheet. The writer's refusal happens one layer up, in `parseNote`,
 * which throws on frontmatter it cannot read rather than writing `{}` back.
 */
export function parseVitals(text: string | null | undefined): Vitals {
  if (!text) return emptyVitals()

  let parsed: unknown
  try {
    parsed = fromYaml(text)
  } catch {
    return emptyVitals()
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return emptyVitals()
  }

  const raw = parsed as Record<string, unknown>
  const hp = (raw.hp && typeof raw.hp === 'object' ? raw.hp : {}) as Record<string, unknown>
  const saves = (raw.death_saves && typeof raw.death_saves === 'object' ? raw.death_saves : {}) as Record<
    string,
    unknown
  >
  const xpRaw = Number(raw.xp)

  return {
    // A fence that parsed is a fence that exists, so the overlay governs from
    // here. A fence that did *not* parse falls through to the empty value
    // above, which leaves the sheet governing — the safe direction, because
    // the alternative is reporting full health off a broken block.
    present: true,
    damage: nonNegative(hp.damage),
    temp: nonNegative(hp.temp),
    hitDiceSpent: countMap(raw.hit_dice_spent),
    spellSlotsUsed: countMap(raw.spell_slots_used),
    featureUsesUsed: countMap(raw.feature_uses_used),
    deathSaves: {
      // Three is the whole rule; a fourth success or failure is not a bigger
      // number, it is a character who stopped dying or stopped living.
      successes: Math.min(3, nonNegative(saves.successes)),
      failures: Math.min(3, nonNegative(saves.failures)),
    },
    xp: Number.isFinite(xpRaw) && raw.xp !== null && raw.xp !== undefined ? Math.max(0, Math.floor(xpRaw)) : null,
    activeEffects: stringList(raw.active_effects),
    feats: stringList(raw.feats),
    effects: effectList(raw.effects),
    conditions: stringList(raw.conditions),
    // Only a literal `true`: a hand-typed `heroic_inspiration: no` is the
    // string "no", and truthiness would hand out a reroll.
    heroicInspiration: raw.heroic_inspiration === true,
    concentration: typeof raw.concentration === 'string' && raw.concentration.trim() ? raw.concentration.trim() : null,
    defenses: defenseList(raw.defenses),
    wildShape: wildShapeOf(raw.wild_shape),
    familiarDamage: countMap(raw.familiar_damage),
    updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : null,
  }
}

/**
 * The fence body for some vitals.
 *
 * Empty collections and a null XP are **omitted**, so a character nobody has
 * damaged carries `hp: {damage: 0, temp: 0}` and not six empty keys. MYDND-4
 * learned this the other way round: a `saving_throws:` key emitted with nothing
 * under it parses back as `null`, not as an empty list.
 */
export function serialiseVitals(vitals: Vitals, updatedAt: string): Record<string, unknown> {
  const out: Record<string, unknown> = {
    hp: { damage: vitals.damage, temp: vitals.temp },
  }
  if (Object.keys(vitals.hitDiceSpent).length > 0) out.hit_dice_spent = { ...vitals.hitDiceSpent }
  if (Object.keys(vitals.spellSlotsUsed).length > 0) out.spell_slots_used = { ...vitals.spellSlotsUsed }
  if (Object.keys(vitals.featureUsesUsed).length > 0) out.feature_uses_used = { ...vitals.featureUsesUsed }
  if (vitals.deathSaves.successes > 0 || vitals.deathSaves.failures > 0) {
    out.death_saves = { successes: vitals.deathSaves.successes, failures: vitals.deathSaves.failures }
  }
  if (vitals.xp !== null) out.xp = vitals.xp
  if (vitals.activeEffects.length > 0) out.active_effects = [...vitals.activeEffects]
  if (vitals.feats.length > 0) out.feats = [...vitals.feats]
  if (vitals.effects.length > 0) out.effects = vitals.effects.map(e => ({ ...e }))
  if (vitals.conditions.length > 0) out.conditions = [...vitals.conditions]
  if (vitals.heroicInspiration) out.heroic_inspiration = true
  if (vitals.concentration) out.concentration = vitals.concentration
  if (vitals.defenses.length > 0) out.defenses = vitals.defenses.map(d => ({ type: d.type, value: d.value }))
  if (vitals.wildShape) {
    const f = vitals.wildShape
    out.wild_shape = { id: f.id, name: f.name, cr: f.cr, ac: f.ac, walk_speed: f.walkSpeed }
  }
  if (Object.keys(vitals.familiarDamage).length > 0) out.familiar_damage = { ...vitals.familiarDamage }
  out.updated_at = updatedAt
  return out
}

export function extractVitalsFromNote(markdown: string): Vitals {
  return parseVitals(extractFence(markdown, VITALS_FENCE))
}

export function writeVitalsToNote(markdown: string, vitals: Vitals, updatedAt: string): string {
  const { frontmatter, body } = parseNote(markdown)
  return serialiseNote({
    frontmatter,
    body: setFence(body, VITALS_FENCE, serialiseVitals(vitals, updatedAt)),
  })
}

// ---------------------------------------------------------------------------
// The rules. All pure, so every one is testable without a vault.
// ---------------------------------------------------------------------------

/** The maximum a sheet claims, or null when it does not claim one. */
export function maxHpOf(sheet: Sheet | null | undefined): number | null {
  const max = sheet?.hp?.max
  return typeof max === 'number' && Number.isFinite(max) && max > 0 ? Math.floor(max) : null
}

/**
 * The handover: vitals that have never been written, seeded from the sheet.
 *
 * Called once, on the first mutation, so a character imported on 94 of 101
 * starts the overlay at 7 damage rather than at full health. Without it the
 * first click of a `Damage 5` would read as 101 → 96, silently healing the
 * seven points the import knew about.
 *
 * Idempotent: vitals that already exist are returned untouched, so this can sit
 * unconditionally in front of every transform.
 */
export function seedFromSheet(vitals: Vitals, sheet: Sheet | null | undefined): Vitals {
  if (vitals.present) return vitals
  const max = maxHpOf(sheet)
  const current = sheet?.hp?.current
  const seeded: Vitals = { ...vitals, present: true }
  if (max !== null && typeof current === 'number' && Number.isFinite(current)) {
    seeded.damage = Math.max(0, Math.min(max, max - Math.floor(current)))
  }
  // Temp comes across too — it is on the sheet and it is still on the character.
  const temp = sheet?.hp?.temp
  if (typeof temp === 'number' && Number.isFinite(temp) && temp > 0) seeded.temp = Math.floor(temp)
  return seeded
}

/**
 * Apply damage: temporary hit points absorb first, and only the remainder
 * reaches the character.
 *
 * That order is the rule and it is not a detail — a character with 5 temp taking
 * 3 damage has taken *no* damage, and recording 3 against `damage` would make
 * the temp pool decorative. Overkill below zero is discarded rather than
 * accumulated: this is not tracking massive damage, and a stored `damage` of
 * 400 against a max of 40 would make every subsequent heal look like it did
 * nothing.
 */
export function takeDamage(vitals: Vitals, max: number | null, amount: number): Vitals {
  const incoming = nonNegative(amount)
  if (incoming === 0) return vitals

  const absorbed = Math.min(vitals.temp, incoming)
  const through = incoming - absorbed
  const ceiling = max ?? Number.MAX_SAFE_INTEGER

  const damage = Math.min(ceiling, vitals.damage + through)
  return {
    ...vitals,
    temp: vitals.temp - absorbed,
    damage,
    // At 0 hit points a character is Incapacitated, and that ends
    // concentration outright — no save (MYDND-46).
    concentration: max !== null && damage >= max ? null : vitals.concentration,
  }
}

/**
 * Heal. Capped at the maximum, which is what `damage` reaching 0 means.
 *
 * **Healing does not touch temporary hit points.** They are a separate pool with
 * their own duration, and a cure that topped them up would be inventing a rule.
 */
export function heal(vitals: Vitals, amount: number): Vitals {
  const n = nonNegative(amount)
  if (n === 0 || vitals.damage === 0) return vitals
  return { ...vitals, damage: Math.max(0, vitals.damage - n) }
}

/**
 * Set temporary hit points.
 *
 * **They do not stack — the higher pool wins.** Two castings of *false life* do
 * not make a bigger pool, and adding them would be the single most common way a
 * character ends up unkillable by accident. Setting a *lower* value is still
 * allowed when it is explicit (`replace`), because a GM reducing a pool is a
 * ruling and the app should not argue.
 */
export function setTemp(vitals: Vitals, amount: number, replace = false): Vitals {
  const n = nonNegative(amount)
  if (!replace && n <= vitals.temp) return vitals
  return { ...vitals, temp: n }
}

/** Record a death save. Three of either is the end of the count. */
export function recordDeathSave(vitals: Vitals, kind: 'success' | 'failure', count = 1): Vitals {
  const n = Math.max(1, nonNegative(count))
  const saves = { ...vitals.deathSaves }
  if (kind === 'success') saves.successes = Math.min(3, saves.successes + n)
  else saves.failures = Math.min(3, saves.failures + n)
  return { ...vitals, deathSaves: saves }
}

/**
 * Hit dice a character has left, per line of the sheet's `hit_dice`.
 *
 * The sheet states totals as `13d8`; this subtracts what has been spent. A line
 * whose formula cannot be read reports a total of 0 rather than guessing, which
 * makes it visibly unspendable instead of quietly infinite.
 */
export function hitDicePool(
  sheet: Sheet | null | undefined,
  vitals: Vitals,
): { label: string; sides: number; total: number; spent: number; remaining: number }[] {
  const lines = Array.isArray(sheet?.hit_dice) ? sheet.hit_dice : []
  return lines.map(line => {
    const m = /^\s*(\d+)\s*d\s*(\d+)\s*$/i.exec(String(line.formula ?? ''))
    const total = m ? parseInt(m[1], 10) : 0
    const sides = m ? parseInt(m[2], 10) : 0
    const spent = Math.min(total, nonNegative(vitals.hitDiceSpent[line.label]))
    return { label: line.label, sides, total, spent, remaining: Math.max(0, total - spent) }
  })
}

/**
 * Spend one hit die from a line, if any remain, and heal by what it rolled — one
 * transform, so one write (MYDND-155). With no die left it heals nothing either.
 *
 * `rolled` is the die plus Constitution, and **a spent die heals at least 1**
 * (XPHB, Short Rest: "minimum of 1 Hit Point"), which a low die and a negative
 * modifier would otherwise fall under.
 */
export function spendHitDie(vitals: Vitals, sheet: Sheet | null | undefined, label: string, rolled: number): Vitals {
  const line = hitDicePool(sheet, vitals).find(l => l.label === label)
  if (!line || line.remaining <= 0) return vitals
  return heal({ ...vitals, hitDiceSpent: { ...vitals.hitDiceSpent, [label]: line.spent + 1 } }, Math.max(1, rolled))
}

/**
 * Spend one spell slot of a rank, if one is left.
 *
 * `max` is passed in rather than read: the sheet states it, and a transform
 * that went looking for it would be a second reader of the charsheet fence.
 */
export function spendSlot(vitals: Vitals, rank: number, max: number): Vitals {
  const key = String(rank)
  const used = vitals.spellSlotsUsed[key] ?? 0
  if (used >= nonNegative(max)) return vitals
  return { ...vitals, spellSlotsUsed: { ...vitals.spellSlotsUsed, [key]: used + 1 } }
}

/** Give back one spent slot of a rank. Refunding is never blocked — it corrects a click. */
export function refundSlot(vitals: Vitals, rank: number): Vitals {
  return { ...vitals, spellSlotsUsed: decrement(vitals.spellSlotsUsed, String(rank)) }
}

/** Spend one use of a free cast, if one is left. */
export function spendUse(vitals: Vitals, key: string, max: number): Vitals {
  const used = vitals.featureUsesUsed[key] ?? 0
  if (used >= nonNegative(max)) return vitals
  return { ...vitals, featureUsesUsed: { ...vitals.featureUsesUsed, [key]: used + 1 } }
}

export function refundUse(vitals: Vitals, key: string): Vitals {
  return { ...vitals, featureUsesUsed: decrement(vitals.featureUsesUsed, key) }
}

/**
 * Spend several points of a pool at once — Lay on Hands (MYDND-47). Refuses an
 * amount larger than what is left rather than spending part of it: "heal 7" from
 * a pool of 5 is a mistake to correct, not 5 to take.
 */
export function spendPoints(vitals: Vitals, key: string, amount: number, max: number): Vitals {
  const n = Math.floor(nonNegative(amount))
  const used = vitals.featureUsesUsed[key] ?? 0
  if (n === 0 || used + n > nonNegative(max)) return vitals
  return { ...vitals, featureUsesUsed: { ...vitals.featureUsesUsed, [key]: used + n } }
}

/** Refill one pool — the web sheet's per-row restore. */
export function restoreUses(vitals: Vitals, key: string): Vitals {
  if (!(key in vitals.featureUsesUsed)) return vitals
  const featureUsesUsed = { ...vitals.featureUsesUsed }
  delete featureUsesUsed[key]
  return { ...vitals, featureUsesUsed }
}

/** One fewer, and the key gone at zero, so the fence does not carry `3: 0`. */
function decrement(counts: Record<string, number>, key: string): Record<string, number> {
  const used = counts[key] ?? 0
  if (used <= 0) return counts
  const next = { ...counts }
  if (used === 1) delete next[key]
  else next[key] = used - 1
  return next
}

/**
 * What a short rest gives back beyond the fixed clears below — worked out from
 * the sheet by `characterModel/model/spells/slots.ts`'s `shortRestPlan`, and passed in so this module
 * stays free of the slot rules.
 */
export interface ShortRestRecovery {
  /** Spell slot ranks to refill — a pact-only caster's. */
  slotRanks?: readonly number[]
  /** Free casts and class resources that recover on a short rest. */
  useKeys?: readonly string[]
  /** Uses handed back on a pool that otherwise waits for a long rest (MYDND-47). */
  regain?: Readonly<Record<string, number>>
}

/**
 * A short rest.
 *
 * **It heals nothing on its own**, which is the rule and is worth stating
 * because it is the first thing that looks like a bug. A short rest is an
 * *opportunity* to spend hit dice; spending them is a separate, per-die choice
 * because each one is a roll the player wants to see. So all this does is clear
 * what a short rest clears.
 *
 * Temporary hit points go: they last "until a long or short rest" in nearly
 * every source that grants them, and the exceptions say so explicitly.
 */
export function shortRest(vitals: Vitals, recovery: ShortRestRecovery = {}): Vitals {
  const spellSlotsUsed = { ...vitals.spellSlotsUsed }
  for (const rank of recovery.slotRanks ?? []) delete spellSlotsUsed[String(rank)]
  const featureUsesUsed = { ...vitals.featureUsesUsed }
  for (const key of recovery.useKeys ?? []) delete featureUsesUsed[key]
  for (const [key, n] of Object.entries(recovery.regain ?? {})) {
    const left = (featureUsesUsed[key] ?? 0) - nonNegative(n)
    if (left > 0) featureUsesUsed[key] = left
    else delete featureUsesUsed[key]
  }
  return { ...vitals, temp: 0, activeEffects: [], spellSlotsUsed, featureUsesUsed }
}

/**
 * A long rest: full hit points, temp gone, death saves cleared, every spell slot
 * back, and **every spent hit die back** ("all spent Hit Point Dice", XPHB).
 */
export function longRest(vitals: Vitals): Vitals {
  return {
    ...vitals,
    damage: 0,
    temp: 0,
    hitDiceSpent: {},
    // Every slot and every free cast: a long rest is the reset the rest are
    // measured against.
    spellSlotsUsed: {},
    featureUsesUsed: {},
    deathSaves: { successes: 0, failures: 0 },
    activeEffects: [],
    // Eight hours outlasts nearly every concentration spell, and nobody
    // concentrates through sleep.
    concentration: null,
    // Wild Shape lasts hours equal to half the Druid level; a long rest outlasts it.
    wildShape: null,
    // A familiar rests with its master.
    familiarDamage: {},
  }
}

/** Award or remove XP. A `null` XP becomes a number the first time it is set. */
export function addXp(vitals: Vitals, delta: number): Vitals {
  const n = Number(delta)
  if (!Number.isFinite(n) || n === 0) return vitals
  return { ...vitals, xp: Math.max(0, Math.floor((vitals.xp ?? 0) + n)) }
}

export function setXp(vitals: Vitals, value: number | null): Vitals {
  if (value === null) return { ...vitals, xp: null }
  const n = Number(value)
  if (!Number.isFinite(n)) return vitals
  return { ...vitals, xp: Math.max(0, Math.floor(n)) }
}

/** Switch an activated effect on or off. The gate `effectApplies` consumes. */
export function toggleEffect(vitals: Vitals, key: string, on?: boolean): Vitals {
  const want = on ?? !vitals.activeEffects.includes(key)
  const without = vitals.activeEffects.filter(k => k !== key)
  return { ...vitals, activeEffects: want ? [...without, key] : without }
}

/** What a cast costs (MYDND-46). Each part optional: a cantrip costs nothing. */
export interface CastCost {
  /** A spell slot of this rank, against the sheet's maximum for it. */
  slot?: { rank: number; max: number }
  /** A free cast — Mystic Arcanum and the like — by its `feature_uses_used` key. */
  use?: { key: string; max: number }
  /** The spell's name when it is a concentration spell. */
  concentration?: string | null
}

/**
 * Cast a spell: spend what it costs and, for a concentration spell, start
 * concentrating on it — **in one write**. Two actions would be two writes, and
 * the second is refused while the first is busy, so a cast that spent the slot
 * would silently not start concentrating.
 *
 * A slot or use with none left leaves the vitals unchanged and starts nothing:
 * a cast that could not be paid for did not happen.
 */
export function castSpell(vitals: Vitals, cost: CastCost): Vitals {
  let next = vitals
  if (cost.slot) {
    next = spendSlot(next, cost.slot.rank, cost.slot.max)
    if (next === vitals) return vitals
  }
  if (cost.use) {
    const before = next
    next = spendUse(next, cost.use.key, cost.use.max)
    if (next === before) return vitals
  }
  const name = cost.concentration?.trim()
  return name ? { ...next, concentration: name } : next
}

/** Stop concentrating — a failed save, or the player's choice. */
export function endConcentration(vitals: Vitals): Vitals {
  return vitals.concentration === null ? vitals : { ...vitals, concentration: null }
}

/**
 * The Constitution save to keep concentrating after taking damage: DC 10 or half
 * the damage, whichever is higher, to a maximum of 30 (2024).
 */
export function concentrationDc(damage: number): number {
  return Math.min(30, Math.max(10, Math.floor(nonNegative(damage) / 2)))
}

/**
 * Set a defence by hand, replacing whatever was stored for that value — one
 * answer per damage type, the web sheet's `setDefense` rule (MYDND-48).
 */
export function setDefense(vitals: Vitals, value: string, type: DefenseType): Vitals {
  const v = value.trim().toLowerCase()
  if (!v) return vitals
  return { ...vitals, defenses: [...vitals.defenses.filter(d => d.value !== v), { type, value: v }] }
}

/** Withdraw a hand-set defence. A grant on the same value is not stored, so it stays. */
export function clearDefense(vitals: Vitals, value: string): Vitals {
  const v = value.trim().toLowerCase()
  return { ...vitals, defenses: vitals.defenses.filter(d => d.value !== v) }
}

/**
 * Take a beast form (MYDND-51), in one write: the form, the temporary hit
 * points it grants (kept if already higher — they do not stack), and one use of
 * Wild Shape when the sheet counts them. With no uses left it refuses, as the
 * web sheet's `wildShapeInto` caps the counter.
 */
export function shapeInto(
  vitals: Vitals,
  form: WildShapeForm,
  { tempHp, uses, key = 'wild_shape' }: { tempHp: number; uses: number | null; key?: string },
): Vitals {
  let next = vitals
  if (uses !== null) {
    next = spendUse(vitals, key, uses)
    if (next === vitals) return vitals
  }
  return { ...next, wildShape: form, temp: Math.max(next.temp, nonNegative(tempHp)) }
}

/** Back to the Druid. The temporary hit points stay — they are the Druid's now. */
export function revertShape(vitals: Vitals): Vitals {
  return vitals.wildShape === null ? vitals : { ...vitals, wildShape: null }
}

/** Damage or heal a familiar, within its maximum. */
export function hurtFamiliar(vitals: Vitals, featureId: string, delta: number, max: number): Vitals {
  const now = vitals.familiarDamage[featureId] ?? 0
  const next = Math.max(0, Math.min(nonNegative(max), now + Math.trunc(delta)))
  const familiarDamage = { ...vitals.familiarDamage }
  if (next === 0) delete familiarDamage[featureId]
  else familiarDamage[featureId] = next
  return { ...vitals, familiarDamage }
}

/** Gain or spend Heroic Inspiration. Not a counter — you have it or you don't. */
export function setInspiration(vitals: Vitals, on: boolean): Vitals {
  return vitals.heroicInspiration === on ? vitals : { ...vitals, heroicInspiration: on }
}

/** Declare or clear a condition. Prose is the final state; see ADR 0003. */
export function toggleCondition(vitals: Vitals, condition: string, on?: boolean): Vitals {
  const name = String(condition ?? '').trim()
  if (name === '') return vitals
  const want = on ?? !vitals.conditions.includes(name)
  const without = vitals.conditions.filter(c => c !== name)
  return { ...vitals, conditions: want ? [...without, name] : without }
}
