import type { Point, RawToken, SceneScale } from './beam'

/**
 * Where a pushed token lands (MYDND-179).
 *
 * Pure, so a wall, a crowd and a diagonal run in plain Node. `bridge.ts` is the
 * half that reads the scene and writes the move.
 *
 * Repelling Blast and the Push mastery say the same thing: *up to* 10 feet,
 * *straight away* from you, *if it is Large or smaller*. "Up to" is what lets a
 * push stop early, so nothing here needs a ruling.
 *
 * ## It walks, one square at a time
 *
 * Moving straight to the far end would carry a token through a wall or onto
 * another creature. So the line is taken a square at a time, each step snapped
 * as a drag snaps, and the token stops on the last step that was clear.
 *
 * **On a square grid a step is one square, however it slants,** because a
 * diagonal costs 5 feet in the rules: 10 feet is two squares along a diagonal,
 * where measuring in a straight line would make it one and a half and snap to
 * one. Without squares (hexes, or snapping off) it is plain distance.
 *
 * ## What stops it
 *
 * Every wall but an open door, which is what stops a player's token in Atlas
 * (`movementWalls`): a window stops a body while it lets the light through.
 * Another token stops it too, on the same floor. Only the line through the
 * token's centre is tested against walls, so a Large token can clip a corner.
 */

/** A wall as Atlas stores it, as much of it as is read here. */
export interface RawWall {
  type?: unknown
  closed?: unknown
  p1?: Point
  p2?: Point
  level?: unknown
  levels?: unknown
}

export type PushStop = 'too-big' | 'wall' | 'token' | null

export interface Pushed {
  /** How far it went, which can be 0. */
  feet: number
  /** Why it went no further, or null where it went the whole way. */
  stop: PushStop
}

const isPoint = (p: Point | undefined): p is Point => Number.isFinite(p?.x) && Number.isFinite(p?.y)

/** An open door lets a body through, and so does a wall shrunk to a point. */
const stopsMovement = ({ type, closed, p1, p2 }: RawWall): boolean => {
  if (!isPoint(p1) || !isPoint(p2)) return false
  const door = type === 'door' || type === 'secret-door'
  return !(door && closed === false) && !(p1.x === p2.x && p1.y === p2.y)
}

/**
 * Whether an object stands on this floor. A scene with no floors has one, and
 * the first floor is where anything with no floor of its own stands.
 */
function onFloor(object: { level?: unknown; levels?: unknown }, floor: string | null, first: string | null): boolean {
  if (first === null || object.levels === 'all') return true
  if (Array.isArray(object.levels) && object.levels.length > 0) return object.levels.includes(floor)
  return (typeof object.level === 'string' ? object.level : first) === floor
}

/** Whether walking from `a` to `b` crosses the wall `p`–`q`. */
export function crosses(a: Point, b: Point, p: Point, q: Point): boolean {
  const rx = b.x - a.x
  const ry = b.y - a.y
  const sx = q.x - p.x
  const sy = q.y - p.y
  const across = rx * sy - ry * sx
  if (across === 0) return false
  const t = ((p.x - a.x) * sy - (p.y - a.y) * sx) / across
  const u = ((p.x - a.x) * ry - (p.y - a.y) * rx) / across
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

/** A token's width in squares: Atlas stores 1, 1.5, 2 for 1×1, 2×2, 3×3. */
const widthOf = (token: RawToken): number => {
  const size = typeof token.size === 'number' && token.size > 0 ? token.size : 1
  return Math.max(1, 2 * size - 1)
}

/** Whether two tokens' squares overlap, with `a` standing at `at`. Touching is not overlapping. */
function overlaps(at: Point, a: RawToken, b: RawToken, cell: number): boolean {
  if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) return false
  const reach = ((widthOf(a) + widthOf(b)) / 2) * cell - 1
  return Math.abs(at.x - (b.x as number)) < reach && Math.abs(at.y - (b.y as number)) < reach
}

/**
 * Whether a creature is beyond what can be pushed, which is Large.
 *
 * Its note says first: a Huge statblock on a token left at the default size is
 * still Huge. Failing that the token's own footprint decides, where 2 is 3×3.
 *
 * @param noteSize the note's `size`, which is `Medium` or `Small/Medium`
 */
export function tooBigToPush(noteSize: unknown, tokenSize: unknown): boolean {
  if (typeof noteSize === 'string' && noteSize.trim()) return /huge|gargantuan/i.test(noteSize)
  return typeof tokenSize === 'number' && tokenSize >= 2
}

/** Where a push from `from` takes the token, and why it stopped there. */
export function planPush({
  tokens,
  walls = {},
  floors = [],
  targetId,
  from,
  feet,
  scale,
  onSquares,
  snap,
}: {
  tokens: Readonly<Record<string, RawToken>>
  walls?: Readonly<Record<string, RawWall>>
  /** The scene's floors, bottom first; empty for a scene with one. */
  floors?: readonly { id?: unknown }[]
  targetId: string
  from: Point
  feet: number
  scale: SceneScale
  onSquares: boolean
  /** Where a drag would settle a token of this size. */
  snap(point: Point, size: number): Point
}): Pushed & { at: Point } {
  const token = tokens[targetId]
  const start = { x: token?.x as number, y: token?.y as number }
  const dx = start.x - from.x
  const dy = start.y - from.y
  const length = onSquares ? Math.max(Math.abs(dx), Math.abs(dy)) : Math.hypot(dx, dy)
  // Standing on the caster there is no "away".
  if (!token || !(length > 0)) return { at: start, feet: 0, stop: null }

  const first = typeof floors[0]?.id === 'string' ? floors[0].id : null
  const floor = typeof token.level === 'string' ? token.level : first
  const standing = Object.entries(tokens)
    .filter(([id, other]) => id !== targetId && other.offMap !== true && onFloor(other, floor, first))
    .map(([, other]) => other)
  const blocking = Object.values(walls).filter(wall => stopsMovement(wall) && onFloor(wall, floor, first))

  const size = typeof token.size === 'number' ? token.size : 1
  const cells = feet / scale.feetPerCell
  // Whole squares only on a grid, so 10 feet on a 15-foot square goes nowhere.
  const steps = onSquares ? Math.floor(cells) : Math.ceil(cells)

  let at = start
  let went = 0
  for (let step = 1; step <= steps; step += 1) {
    const along = (Math.min(step, cells) * scale.cell) / length
    const next = snap({ x: start.x + dx * along, y: start.y + dy * along }, size)
    if (next.x === at.x && next.y === at.y) continue
    if (blocking.some(wall => crosses(at, next, wall.p1 as Point, wall.p2 as Point))) {
      return { at, feet: went * scale.feetPerCell, stop: 'wall' }
    }
    if (standing.some(other => overlaps(next, token, other, scale.cell))) {
      return { at, feet: went * scale.feetPerCell, stop: 'token' }
    }
    at = next
    went = Math.min(step, cells)
  }
  return { at, feet: went * scale.feetPerCell, stop: null }
}

/** What a push did, in the words a Notice or a volley's summary ends on. */
export function pushLine(label: string, { feet, stop }: Pushed): string {
  if (stop === 'too-big') return `${label} is too big to push`
  const reason = stop === 'wall' ? 'a wall' : stop === 'token' ? 'another creature' : null
  if (feet > 0) return `${label} pushed ${Math.round(feet)} ft${reason ? `, stopped by ${reason}` : ''}`
  return reason ? `${label} cannot be pushed: ${reason} is in the way` : `${label} did not move`
}
