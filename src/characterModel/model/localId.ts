/**
 * A Vault character's id (ADR 0007): `local:` and a random part, where a D&D
 * Beyond character's is its numeric id. Pure, and below everything that asks
 * which kind a character is; it was in `state/characters.ts` until MYDND-200.
 */

/** The prefix that marks a character as authored here rather than imported. */
export const LOCAL_ID_PREFIX = 'local:'

/** Whether an id names a Vault character — one D&D Beyond has no say over. */
export function isLocalId(id: unknown): boolean {
  return typeof id === 'string' && id.startsWith(LOCAL_ID_PREFIX)
}

/** A fresh `local:` id. Random, so two machines never mint the same one. */
export function mintLocalId(): string {
  return (
    LOCAL_ID_PREFIX +
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)
  )
}
