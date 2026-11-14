/**
 * What a cast at a token draws on the Atlas map, and where (MYDND-172, MYDND-211).
 *
 * Pure, so the arithmetic runs in plain Node. `bridge.ts` is the half that
 * touches Atlas.
 *
 * ## The bolt is one of Atlas' own areas
 *
 * Since Atlas VTT 0.15.0 a kept measurement can carry a look: Fire, Frost,
 * Lightning, Mist, Radiance or Shadow, drawn by Atlas' shaders in the area's own
 * colour, on the GM's map and the players' screens alike. A bolt is a `line` of
 * that kind from the caster's edge to the target, kept for `BOLT_SHOWN_MS` and
 * taken away again. Until MYDND-211 it was JB2A art played by the Atlas Spell
 * Effects plugin, which called itself a bridge until Atlas drew effects of its
 * own; the plugin is no longer needed.
 *
 * ## Which spells have a bolt
 *
 * The nine that had ranged art on JB2A's free pack, written out with the look
 * each takes, because no note says whether a spell is aimed at a creature: that
 * is prose. **The name has to match whole**, which is what keeps an area spell
 * out: Fireball is cast at a point, not a creature, and has no bolt.
 */

export interface Point {
  x: number
  y: number
}

export interface SceneScale {
  /** Pixels to a grid square. */
  cell: number
  feetPerCell: number
}

/** A token as Atlas stores it, as much of it as is read here. */
export interface RawToken {
  id?: unknown
  name?: unknown
  statblockName?: unknown
  notePath?: unknown
  statblockPath?: unknown
  isHidden?: unknown
  offMap?: unknown
  instanceNumber?: unknown
  /** Atlas' footprint: 1, 1.5, 2 for 1×1, 2×2, 3×3. */
  size?: unknown
  /** The floor it stands on, in a scene with floors. */
  level?: unknown
  /** Atlas' expendable resources by key; `hp` is `{ current, max }`. */
  resources?: Record<string, unknown>
  x?: unknown
  y?: unknown
}

export interface SceneTarget extends Point {
  id: string
  /** Unique on the scene: two goblins read as Atlas numbers them. */
  label: string
  /** Centre to centre, in feet. */
  feet: number
  hidden: boolean
}

/** One of Atlas 0.15.0's area looks (`MeasureEffect`), spelled as its files spell them. */
export type BoltLook = 'fire' | 'frost' | 'lightning' | 'mist' | 'radiance' | 'shadow'

/** How a spell's bolt is drawn: a look, in a colour. */
export interface Bolt {
  look: BoltLook
  /** `#rrggbb`, which is all Atlas reads as a colour. */
  color: string
}

/**
 * The kept measurement a bolt is, in Atlas' `MeasureInput` shape: what its
 * store's `addMeasure` takes. Its `width` is world pixels.
 */
export interface BoltLine {
  shape: 'line'
  points: [Point, Point]
  width: number
  color: string
  effect: BoltLook
  /** Drawn whole, as the dice say it reached: an area stops at walls unless told not to. */
  walls: false
  /** The caster's floor, in a scene with floors; otherwise Atlas places it on the floor shown. */
  level?: string
  /** Only the GM sees it, for a caster the players cannot see either. */
  hidden?: true
}

/**
 * How long a bolt stays on the map, in milliseconds. A hit lands as it goes:
 * the hit points and the push wait for it, so the token is not seen to jump
 * clear of a bolt still on its way (MYDND-179).
 */
export const BOLT_SHOWN_MS = 900

/** As a function, so the ui suite can set it to 0 without waiting out a real bolt. */
export const boltShownMs = (): number => BOLT_SHOWN_MS

/** A bolt's width, in grid squares. */
const BOLT_WIDTH_CELLS = 0.4

/** Atlas' own colours for each look, where a spell has no colour of its own. */
const FIRE = '#ec7500'
const FROST = '#8ad1f8'
const LIGHTNING = '#086ddd'
const RADIANCE = '#e0ac00'
/** Eldritch Blast and Magic Missile are force, which Atlas has no look for: a violet crackle. */
const FORCE = '#7852ee'

/** By compacted name. */
const BOLTS: Record<string, Bolt> = {
  chainlightning: { look: 'lightning', color: LIGHTNING },
  disintegrate: { look: 'radiance', color: '#22c55e' },
  eldritchblast: { look: 'lightning', color: FORCE },
  firebolt: { look: 'fire', color: FIRE },
  guidingbolt: { look: 'radiance', color: RADIANCE },
  magicmissile: { look: 'radiance', color: FORCE },
  rayoffrost: { look: 'frost', color: FROST },
  scorchingray: { look: 'fire', color: FIRE },
  witchbolt: { look: 'lightning', color: LIGHTNING },
}

export const compact = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '')

/** The bolt this spell is drawn as, or null for a spell that is not aimed at a creature. */
export function boltOf(spell: string): Bolt | null {
  return BOLTS[compact(spell)] ?? null
}

/**
 * The line a bolt is drawn as: from the edge of the caster's token, so it does
 * not start under the caster, to `to`. Null for two tokens on one spot, which
 * have no direction between them.
 */
export function boltLine({
  bolt,
  from,
  fromRadius,
  to,
  scale,
  level,
  hidden = false,
}: {
  bolt: Bolt
  from: Point
  /** How far the caster's token reaches from its centre, in pixels. */
  fromRadius: number
  to: Point
  scale: SceneScale
  level?: unknown
  hidden?: boolean
}): BoltLine | null {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  if (!(length > 0)) return null
  const lead = fromRadius > 0 && fromRadius < length ? fromRadius / length : 0
  const start = { x: from.x + (to.x - from.x) * lead, y: from.y + (to.y - from.y) * lead }
  return {
    shape: 'line',
    points: [start, { x: to.x, y: to.y }],
    width: scale.cell * BOLT_WIDTH_CELLS,
    color: bolt.color,
    effect: bolt.look,
    walls: false,
    ...(typeof level === 'string' && level !== '' && { level }),
    ...(hidden && { hidden: true as const }),
  }
}

export function distanceFeet(a: Point, b: Point, scale: SceneScale): number {
  return (Math.hypot(b.x - a.x, b.y - a.y) / scale.cell) * scale.feetPerCell
}

/** `120 feet` → 120. Touch, Self and anything else has no number to compare. */
export function rangeFeet(range: string | null | undefined): number | null {
  const match = /^(\d+)\s*(?:feet|foot|ft)\b/i.exec((range ?? '').trim())
  return match ? Number(match[1]) : null
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/** What the map calls a token, which is empty for a plain one. */
export function tokenName(token: RawToken): string {
  return text(token.name) || text(token.statblockName)
}

/**
 * Which of the scene's tokens is this character.
 *
 * By note first: that link survives a token being renamed. By name second, for a
 * token dragged out of Atlas' own library, which knows no note.
 */
export function casterId(
  tokens: Readonly<Record<string, RawToken>>,
  character: { name?: string; notePath?: string } | null | undefined,
): string | null {
  if (!character) return null
  const onMap = Object.entries(tokens).filter(([, token]) => token.offMap !== true)
  const path = character.notePath
  const name = compact(character.name ?? '')
  const linked = path ? onMap.find(([, t]) => t.notePath === path || t.statblockPath === path) : undefined
  const named = name ? onMap.find(([, t]) => compact(tokenName(t)) === name) : undefined
  return (linked ?? named)?.[0] ?? null
}

/**
 * Who could be aimed at, nearest first, leaving out the caster.
 *
 * Hidden tokens stay: the sheet sits with the GM, who can see them on the map.
 * Tokens sharing a name take Atlas' instance number, as the map's badges do.
 */
export function targetsFrom(
  tokens: Readonly<Record<string, RawToken>>,
  casterToken: string,
  from: Point,
  scale: SceneScale,
): SceneTarget[] {
  const entries = Object.entries(tokens).filter(
    ([id, t]) => id !== casterToken && t.offMap !== true && Number.isFinite(t.x) && Number.isFinite(t.y),
  )
  const seen = new Map<string, number>()
  for (const [, token] of entries) {
    const name = tokenName(token)
    seen.set(name, (seen.get(name) ?? 0) + 1)
  }
  return entries
    .map(([id, token]) => {
      const name = tokenName(token) || 'Unnamed token'
      const number = typeof token.instanceNumber === 'number' ? token.instanceNumber : null
      const shared = (seen.get(tokenName(token)) ?? 0) > 1
      const at = { x: token.x as number, y: token.y as number }
      return {
        id,
        ...at,
        label: shared && number !== null ? `${name} ${number}` : name,
        feet: distanceFeet(from, at, scale),
        hidden: token.isHidden === true,
      }
    })
    .sort((a, b) => a.feet - b.feet || a.label.localeCompare(b.label))
}

/**
 * Where a miss goes: past the target's shoulder, clear of its token.
 *
 * A miss is the same bolt aimed wide, the way Sequencer's `missed()` does it. `side` is +1 or -1.
 */
export function missPoint(from: Point, to: Point, radius: number, side: 1 | -1): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  if (!(length > 0)) return to
  const clear = radius * 1.5 * side
  return { x: to.x - ((to.y - from.y) / length) * clear, y: to.y + ((to.x - from.x) / length) * clear }
}
