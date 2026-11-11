import payload from 'virtual:srd-notes'

/**
 * The SRD 5.2.1 notes this build carries, or `null` (MYDND-185): how many
 * notes and bases, and the archive itself, `deflate-raw` and base64.
 *
 * Only `vite build --mode srd` fills it — `srdNotesPlugin` in
 * `scripts/srd-pack.mjs` — so the full plugin, the web build and every test
 * read `null`, and `dist/main.js` carries none of it.
 */
export type SrdPayload = { notes: number; bases: number; data: string }

export const SRD_PAYLOAD: SrdPayload | null = payload
