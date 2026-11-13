/**
 * What a cast at a token draws: which file, and where (MYDND-172).
 *
 * Pure, so the arithmetic runs in plain Node. `bridge.ts` is the half that
 * touches the Atlas Spell Effects plugin.
 *
 * ## Which spells have a beam
 *
 * A spell gets one when the library has **ranged art made for it**: a video
 * named for the spell, sized in feet, like
 * `EldritchBlast_01_Regular_Purple_30ft_1600x400.webm`. Measured on JB2A's free
 * pack against the vault's spells, that is nine: Chain Lightning, Disintegrate,
 * Eldritch Blast, Fire Bolt, Guiding Bolt, Magic Missile, Ray of Frost, Scorching
 * Ray and Witch Bolt. **The name has to match whole.** `FireballBeam_…` is not
 * Fireball's art, and that is what keeps an area spell out: Fireball is cast at a
 * point, not a creature.
 *
 * ## The art is padded, and that sets the geometry
 *
 * JB2A draws ranged art at 40px to the foot with 200px, or 5ft, of empty space
 * at each end, so the 30ft file is 1600px wide rather than 1200. Stretching the
 * whole file between two tokens would stop the bolt short at both ends. So the
 * file is scaled by `distance / feet`, drawn `feet + 10` long at that scale, and
 * started 5ft (scaled) behind the caster. Checked frame by frame on a real scene.
 */

export interface Point {
  x: number
  y: number
}

/** A file in the plugin's index, as much of it as is read here. */
export interface EffectFile {
  path: string
  /** The file's name without its extension. */
  name: string
  /** The range it was drawn for, 0 for art with no range in its name. */
  feet: number
  video: boolean
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

/** The plugin's own effect shape, for a line that plays once. */
export interface BeamEffect {
  id: string
  map: string
  name: string
  shape: 'line'
  size: number
  width: number
  lasting: false
  started: number
  file: string
  at: Point
  dir: number
}

/** Empty space at each end of JB2A's ranged art. */
const ART_PADDING_FEET = 5
/** How tall the art is drawn, which is two lots of padding. */
const ART_HEIGHT_FEET = 2 * ART_PADDING_FEET

export const compact = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '')

/** `EldritchBlast_01_Regular_Purple_30ft_1600x400` → `EldritchBlast_01_Regular_Purple`. */
const variantOf = (file: EffectFile): string => file.name.replace(/_\d+ft(_.*)?$/i, '')

/**
 * The spell's ranged art, shortest first, or nothing.
 *
 * One variant only, the first by name, so a cast does not change colour with the
 * distance between two tokens. A spell's art in several colours is otherwise the
 * same set of files.
 */
export function beamArt(spell: string, files: readonly EffectFile[]): EffectFile[] {
  const want = compact(spell)
  if (!want) return []
  const own = files.filter(f => f.video && f.feet > 0 && compact(f.name.split('_')[0]) === want)
  const variant = own.map(variantOf).sort()[0]
  return own.filter(f => variantOf(f) === variant).sort((a, b) => a.feet - b.feet)
}

/** The shortest file that reaches `feet`, else the longest, which is then stretched. */
export function artFor(art: readonly EffectFile[], feet: number): EffectFile | null {
  return art.find(f => f.feet >= feet) ?? art[art.length - 1] ?? null
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
 * JB2A's free pack has no miss art, so a miss is the same beam aimed wide, the
 * way Sequencer's `missed()` does it. `side` is +1 or -1.
 */
export function missPoint(from: Point, to: Point, radius: number, side: 1 | -1): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  if (!(length > 0)) return to
  const clear = radius * 1.5 * side
  return { x: to.x - ((to.y - from.y) / length) * clear, y: to.y + ((to.x - from.x) / length) * clear }
}

/** A beam from one token's centre to another's, in the plugin's effect shape. */
export function beamEffect({
  id,
  map,
  name,
  art,
  from,
  to,
  scale,
  now,
}: {
  id: string
  map: string
  name: string
  art: readonly EffectFile[]
  from: Point
  to: Point
  scale: SceneScale
  now: number
}): BeamEffect | null {
  const feet = distanceFeet(from, to, scale)
  const file = artFor(art, feet)
  if (!file || !(feet > 0)) return null

  const stretch = feet / file.feet
  const dir = Math.atan2(to.y - from.y, to.x - from.x)
  const back = ((ART_PADDING_FEET * stretch) / scale.feetPerCell) * scale.cell
  return {
    id,
    map,
    name,
    shape: 'line',
    size: (file.feet + 2 * ART_PADDING_FEET) * stretch,
    width: ART_HEIGHT_FEET * stretch,
    lasting: false,
    started: now,
    file: file.path,
    at: { x: from.x - Math.cos(dir) * back, y: from.y - Math.sin(dir) * back },
    dir,
  }
}
