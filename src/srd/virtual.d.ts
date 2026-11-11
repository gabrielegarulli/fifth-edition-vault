/**
 * `srdNotesPlugin` in `scripts/srd-pack.mjs`: the packed SRD notes in
 * `--mode srd`, `null` in every other build and in every test (MYDND-185).
 */
declare module 'virtual:srd-notes' {
  const payload: { notes: number; bases: number; data: string } | null
  export default payload
}
