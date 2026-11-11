/**
 * The D&D Beyond import's settings — the type and its defaults.
 *
 * Out of `main.ts` (MYDND-101) so the web build can take the defaults without
 * importing the plugin entry, which would pull `Plugin` and every view into the
 * page. `main.ts` re-exports the type, so nothing importing it from there moves.
 */
export interface DdbSettings {
  /**
   * Where imported character notes go when there is not already one.
   *
   * Only ever used for a *new* note: a character is identified by its
   * `vc_ddb_id` frontmatter, so one the player has moved elsewhere is re-synced
   * where it sits rather than being recreated here.
   */
  folder: string
  /** Where portraits land, for dropping into Atlas' asset manager as tokens. */
  tokenFolder: string
  /** Write `statblock: true`, which is what lets an Atlas token link here. */
  exposeToAtlas: boolean
  /** Pull the D&D Beyond portrait down on import. */
  downloadAvatar: boolean
  /**
   * Optional server to route the D&D Beyond call through when this machine
   * blocks the direct one. Empty means direct-only: the relay is never used
   * unless the direct call is stopped locally, so leaving this set costs
   * nothing on a machine where direct works.
   */
  relayUrl: string
}

export const DEFAULT_DDB_SETTINGS: DdbSettings = {
  folder: 'characters',
  tokenFolder: 'characters/portraits',
  exposeToAtlas: true,
  downloadAvatar: true,
  relayUrl: '',
}
