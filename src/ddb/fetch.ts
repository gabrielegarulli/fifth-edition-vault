/**
 * The character importer's HTTP contract, without the importer.
 *
 * Fifth Edition Vault never contacts a server, so it has no importer. The
 * plugin class still types the one `requestUrl` it holds by this contract.
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

/** No character can be imported, so no input names one. */
export function extractDdbId(input: unknown): string | null {
  void input
  return null
}
