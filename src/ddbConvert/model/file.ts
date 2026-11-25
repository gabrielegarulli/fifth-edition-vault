import type { DdbPayload } from '../../characterModel'

/**
 * A D&D Beyond character read from a file the player saved (MYDND-257).
 *
 * The file is what D&D Beyond's character service answers for a public sheet,
 * saved from the browser: the `{id, success, message, data}` envelope, or the
 * character on its own, which is what other tools (Foundry's importer among
 * them) keep. Either is the payload a fetch returns, so the same plan, review
 * and write follow, and nothing here reaches a server.
 */

/** The character out of D&D Beyond's `{id, success, message, data}` envelope, or the bare character. */
export function unwrapDdbEnvelope(body: unknown, via: string): DdbPayload {
  const envelope = body as { data?: unknown } | null
  const payload = envelope && envelope.data ? envelope.data : body
  if (!payload || typeof payload !== 'object' || !(payload as DdbPayload).name) {
    throw new Error(`${via} returned a payload with no character in it.`)
  }
  return payload
}

/** A byte-order mark, which some editors put in front of a saved file. */
const BOM = new RegExp('^' + String.fromCharCode(0xfeff))

export interface DdbFile {
  payload: DdbPayload
  /** D&D Beyond's own id for the character: what `vc_ddb_source` records. */
  ddbId: string
}

/**
 * Parses a saved file, or throws with a sentence a player can act on. A file
 * that parses but is not a character (a spell list, the page's HTML) is
 * refused here, before the review: a review of nothing would look like a
 * character with every field missing.
 */
export function readDdbFile(text: string): DdbFile {
  let body: unknown
  try {
    body = JSON.parse(text.replace(BOM, ''))
  } catch {
    throw new Error('That file is not JSON. Save the character’s JSON as it is, not the page around it.')
  }
  const payload = unwrapDdbEnvelope(body, 'That file')
  const id = (payload as { id?: unknown }).id
  const ddbId = typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id)) ? String(id) : null
  if (!ddbId) throw new Error('That file has a character with no D&D Beyond id in it.')
  if (!Array.isArray(payload.classes) || payload.classes.length === 0) {
    throw new Error(`That file’s character, ${payload.name}, has no class in it.`)
  }
  return { payload, ddbId }
}
