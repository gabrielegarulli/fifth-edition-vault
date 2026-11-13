// Reading an answer of unknown shape. For this folder only; index.ts does not export it.
// One module of the builder's choices (MYDND-197); index.ts says what the folder is.

export interface Answered {
  type?: string
  [k: string]: unknown
}

export const asRecord = (v: unknown): Answered | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Answered) : null
export const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
