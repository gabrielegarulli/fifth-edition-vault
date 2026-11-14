import { cantripTier } from '../../compendium'
import { compact } from './beam'
import { pushLine, type Pushed } from './push'

/**
 * A spell that attacks, one roll per beam (MYDND-172).
 *
 * Pure, with the rolls injected, so a hit, a miss and a critical run in plain
 * Node on dice the test chooses.
 *
 * ## The table is a table on purpose
 *
 * Spell notes carry no key for "makes an attack" or "how many beams": both are
 * prose, and the prose differs per spell. Only spells with a bolt reach this at
 * all (`boltOf` in `beam.ts`), which is nine, so the six that attack are written out. Magic Missile
 * never rolls to hit; Chain Lightning and Disintegrate are saving throws.
 */

const ONE = (): number => 1

/** By compacted name: how many attacks a cast makes. */
const ATTACK_SPELLS: Record<string, (rank: number, characterLevel: number) => number> = {
  // Two beams at level 5, three at 11, four at 17: the cantrip tiers, plus one.
  eldritchblast: (_, characterLevel) => cantripTier(characterLevel) + 1,
  // Three rays, and one more for each slot level above 2nd.
  scorchingray: rank => 3 + Math.max(0, rank - 2),
  firebolt: ONE,
  rayoffrost: ONE,
  guidingbolt: ONE,
  witchbolt: ONE,
}

/** How many attacks this cast makes, or null for a spell that makes none. */
export function attackCount(spell: string, rank: number, characterLevel: number): number | null {
  return ATTACK_SPELLS[compact(spell)]?.(rank, characterLevel) ?? null
}

/**
 * A note's `ac`, or null when there is no number to beat.
 *
 * Measured on the bestiary: 2,642 are a plain number, and the rest are formulas
 * like `13 + the spell's level`, for summons. Reading a formula's leading 13
 * would judge attacks against the wrong number, so a formula is no AC at all.
 */
export function acFrom(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null
  return Number(value)
}

export type Verdict = 'critical' | 'hit' | 'miss' | 'unjudged'

/**
 * A natural 20 always hits and a natural 1 always misses, whatever the total;
 * only then is the total held against the AC. With no AC, nobody can say.
 */
export function verdict(face: number, total: number, ac: number | null): Verdict {
  if (face === 20) return 'critical'
  if (face === 1) return 'miss'
  if (ac === null) return 'unjudged'
  return total >= ac ? 'hit' : 'miss'
}

/** A critical hit rolls the dice twice over; a flat bonus is added once. */
export function criticalFormula(formula: string): string {
  return formula.replace(/(\d+)d(\d+)/gi, (_, count: string, sides: string) => `${Number(count) * 2}d${sides}`)
}

/** As much of a roll's outcome as this reads. */
export interface RolledAttack {
  total: number
  modifier: number
}

export interface Shot {
  id: string
  label: string
  ac: number | null
}

/** A creature's damage defences, lower-cased. */
export interface Defences {
  immune: string[]
  resistant: string[]
  vulnerable: string[]
}

const NO_DEFENCES: Defences = { immune: [], resistant: [], vulnerable: [] }

const listOf = (text: string, key: string): string[] => {
  const line = new RegExp(`^${key}: *(.*)$`, 'im').exec(text)?.[1] ?? ''
  return line
    .replace(/^["']|["']$/g, '')
    .split(/[,;]/)
    .map(entry => entry.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * The defences in a statblock, which live in the note's fence and not its
 * frontmatter. Measured on the bestiary: `immunities`, `resistances` and
 * `vulnerabilities` on 563, 435 and 93 of 1,371 notes, as comma lists. A
 * conditional entry (`Thunder (Air Only)`) is left as text, so it never matches.
 */
export function defencesFrom(note: string): Defences {
  return {
    immune: listOf(note, 'immunities'),
    resistant: listOf(note, 'resistances'),
    vulnerable: listOf(note, 'vulnerabilities'),
  }
}

export type Defence = 'immune' | 'resistant' | 'vulnerable'

/** Immunity takes it all, resistance halves rounding down, vulnerability doubles. */
export function afterDefences(
  amount: number,
  damageType: string | null | undefined,
  defences: Defences = NO_DEFENCES,
): { dealt: number; defence: Defence | null } {
  const type = damageType?.trim().toLowerCase()
  if (!type) return { dealt: amount, defence: null }
  if (defences.immune.includes(type)) return { dealt: 0, defence: 'immune' }
  if (defences.resistant.includes(type)) return { dealt: Math.floor(amount / 2), defence: 'resistant' }
  if (defences.vulnerable.includes(type)) return { dealt: amount * 2, defence: 'vulnerable' }
  return { dealt: amount, defence: null }
}

/** What a hit did to a token's hit points. */
export interface Hurt {
  /** After defences, before stopping at 0. */
  dealt: number
  defence: Defence | null
  current: number
  max: number
}

export interface Volley {
  shots: number
  hits: number
  criticals: number
  misses: number
  /** Attacks with no AC to judge them by, whose damage was rolled regardless. */
  unjudged: number
  damage: number
  /** Where each target's hit points ended, by label. */
  wounds: Record<string, { current: number; max: number }>
  /** `Fire Elemental is immune`, once each. */
  defended: string[]
  /** How far each target was pushed, by label, and what stopped the last push. */
  pushes: Record<string, Pushed>
}

/**
 * Fires a cast's attacks in order: to hit, the beam, the damage, the hit points.
 *
 * **One at a time, never `Promise.all`:** each roll is physical dice in the
 * scene, and eight at once is one unreadable pile. The beam plays after the to-hit
 * lands, because a miss has to go wide. Damage with an unknown AC is rolled and
 * counted apart: the GM has the attack's total and decides, so **only a judged hit
 * touches the token**, and that goes for a push too. The push comes last, so the
 * next beam at the same target starts from where it landed.
 *
 * **Nothing happens to the target until the bolt has struck** (MYDND-179). The
 * token used to jump clear and the bolt then struck the empty square. The dice
 * roll while it is on the map; the hit points and the push wait for `play` to
 * settle, which is when the bolt is gone. A miss waits for nothing, because
 * nothing follows from it.
 */
export async function fireShots({
  spell,
  shots,
  damageFormula,
  attack,
  rollDamage,
  play,
  hurt,
  push,
}: {
  spell: string
  shots: readonly Shot[]
  /** Null for a spell with no dice on its note. */
  damageFormula: string | null
  attack: (label: string) => Promise<RolledAttack | null>
  rollDamage: (formula: string, label: string) => Promise<{ total: number } | null>
  /** Draws the bolt. What it returns settles once the bolt has struck and gone. */
  play: (targetId: string, miss: boolean) => Promise<void> | void
  /** Takes the damage off the token, or null where it has no hit points to take. */
  hurt: (targetId: string, amount: number) => Promise<Hurt | null>
  /** Repelling Blast's rider: moves the token, or null where it cannot be moved. */
  push?: (targetId: string) => Pushed | null
}): Promise<Volley> {
  const volley: Volley = {
    shots: shots.length,
    hits: 0,
    criticals: 0,
    misses: 0,
    unjudged: 0,
    damage: 0,
    wounds: {},
    defended: [],
    pushes: {},
  }

  for (const [index, shot] of shots.entries()) {
    const count = shots.length > 1 ? ` ${index + 1} of ${shots.length}` : ''
    const rolled = await attack(`${spell}${count} at ${shot.label}`)
    if (!rolled) continue

    const result = verdict(rolled.total - rolled.modifier, rolled.total, shot.ac)
    const landed = play(shot.id, result === 'miss')
    if (result === 'miss') {
      volley.misses += 1
      continue
    }
    if (result === 'unjudged') volley.unjudged += 1
    else volley.hits += 1
    if (result === 'critical') volley.criticals += 1

    const critical = result === 'critical'
    const damage = damageFormula
      ? await rollDamage(
          critical ? criticalFormula(damageFormula) : damageFormula,
          `${spell} ${critical ? 'critical damage' : 'damage'}`,
        )
      : null
    await landed

    if (damageFormula) {
      const rolledDamage = damage?.total ?? 0
      const wound = damage && result !== 'unjudged' ? await hurt(shot.id, rolledDamage) : null
      volley.damage += wound?.dealt ?? rolledDamage
      if (wound) {
        volley.wounds[shot.label] = { current: wound.current, max: wound.max }
        const note = wound.defence ? `${shot.label} is ${wound.defence}` : null
        if (note && !volley.defended.includes(note)) volley.defended.push(note)
      }
    }

    const pushed = result === 'unjudged' ? null : (push?.(shot.id) ?? null)
    if (pushed) {
      const feet = (volley.pushes[shot.label]?.feet ?? 0) + pushed.feet
      volley.pushes[shot.label] = { feet, stop: pushed.stop }
    }
  }
  return volley
}

/** The line a volley ends on, since the rolls alone leave the GM to add it up. */
export function volleySummary(spell: string, volley: Volley): string {
  const { shots, hits, criticals, unjudged, damage, wounds, defended, pushes } = volley
  const parts = [shots > 1 ? `${hits} of ${shots} hit` : hits > 0 ? 'hit' : unjudged > 0 ? 'rolled' : 'missed']
  if (criticals > 0) parts.push(criticals > 1 ? `${criticals} critical` : 'critical')
  if (damage > 0) parts.push(`${damage} damage`)
  const sentences = [`${spell}: ${parts.join(', ')}`, ...defended]
  for (const [label, { current, max }] of Object.entries(wounds)) {
    sentences.push(current > 0 ? `${label} ${current} of ${max} HP` : `${label} is at 0 HP`)
  }
  for (const [label, pushed] of Object.entries(pushes)) sentences.push(pushLine(label, pushed))
  if (unjudged > 0) {
    sentences.push(`No AC for ${unjudged > 1 ? `${unjudged} attacks` : 'that target'}, so check against the rolls and apply it by hand`)
  }
  return sentences.join('. ')
}
