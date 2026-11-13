/**
 * Obsidian's `requestUrl`, as a contract (MYDND-200).
 *
 * The plugin holds the real one and injects it; the D&D Beyond fetch and Sync
 * take it injected, so both run in plain Node against a recording fake (see
 * `ddbImport/model/fetch.ts`). It was declared there until the SRD edition
 * dropped the private folders whole: `main.ts` types the one it holds by it,
 * and a type `main` names must be in the public tree.
 */

/** The slice of Obsidian's `requestUrl` contract the plugin uses. */
export interface RequestUrlOptions {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
  /** `false` to get a response object for a non-2xx rather than a thrown error. */
  throw?: boolean
}

export interface RequestUrlResult {
  status: number
  json?: unknown
}

export type RequestUrlFn = (options: RequestUrlOptions) => Promise<RequestUrlResult>
