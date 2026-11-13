import { DEFAULT_RULES_ROOT } from './edition'

/**
 * Where each kind of note lives in the vault, as the user has set it (MYDND-184).
 *
 * People install the plugin into a vault they already have, and theirs is not
 * laid out like the author's. Before this, only the character folder could be
 * chosen: every catalog read a fixed top-level folder (or `SRD 5.2.1/<folder>`
 * in the SRD edition, MYDND-180), and `campaigns` and `sessions` were constants.
 *
 * **Pure TypeScript, no `obsidian` import**: the content and state layers both
 * read it, and both have to load in plain Node. So `normaliseFolder` is its own
 * and not Obsidian's `normalizePath`.
 *
 * A setting here says where the plugin *reads and writes*. Changing one never
 * moves a note.
 */

/**
 * Where the SRD edition's notes live inside the vault (MYDND-180).
 *
 * The SRD vault is given away, and people add it to a vault they already have.
 * Twelve top-level folders named `spells`, `items` and so on clash with theirs,
 * so an SRD export (`LORE_SCOPE=srd` in the mcp-server repo) puts them all under
 * this one folder. The full plugin reads the lore vault, which keeps its
 * folders at the top level, and has no rules folder by default.
 */
export const SRD_RULES_FOLDER = 'SRD 5.2.1'

/**
 * Every rules folder, by the name the exporters give it. The first ten are the
 * catalogs' `spec.folder`; `diseases` and `variant-rules` have no reader yet but
 * are in the SRD notes, so the seeder (MYDND-185) places them through the same
 * setting.
 */
export const RULE_FOLDER_KEYS = [
  'spells',
  'bestiary',
  'classes',
  'subclasses',
  'species',
  'backgrounds',
  'feats',
  'items',
  'magic-items',
  'conditions',
  'diseases',
  'variant-rules',
] as const

export type RuleFolderKey = (typeof RULE_FOLDER_KEYS)[number]

export interface NoteFoldersSettings {
  /** The folder every rules folder sits in. Empty is the top of the vault. */
  rulesRoot: string
  /** One rules folder's own path from the top of the vault, in place of `<rulesRoot>/<key>`. */
  overrides: Partial<Record<RuleFolderKey, string>>
  campaigns: string
  sessions: string
}

export const DEFAULT_CAMPAIGNS_FOLDER = 'campaigns'
export const DEFAULT_SESSIONS_FOLDER = 'sessions'

export const DEFAULT_NOTE_FOLDERS: NoteFoldersSettings = {
  rulesRoot: DEFAULT_RULES_ROOT,
  overrides: {},
  campaigns: DEFAULT_CAMPAIGNS_FOLDER,
  sessions: DEFAULT_SESSIONS_FOLDER,
}

/**
 * A folder path as typed, made into the one `notesIn` compares against:
 * forward slashes, no leading or trailing slash, no empty, `.` or `..` segment.
 * `..` is dropped rather than resolved, so no setting can name a folder outside
 * the vault.
 */
export function normaliseFolder(path: string | null | undefined): string {
  if (typeof path !== 'string') return ''
  return path
    .replace(/\\/g, '/')
    .split('/')
    .map(segment => segment.trim())
    .filter(segment => segment !== '' && segment !== '.' && segment !== '..')
    .join('/')
}

/**
 * The stored group merged over the defaults, so a `data.json` written before a
 * key existed gains its default. Anything that is not a string is dropped: the
 * file is the user's to edit by hand.
 */
export function mergeNoteFolders(stored: Partial<NoteFoldersSettings> | null | undefined): NoteFoldersSettings {
  const overrides: Partial<Record<RuleFolderKey, string>> = {}
  for (const key of RULE_FOLDER_KEYS) {
    const value = normaliseFolder(stored?.overrides?.[key])
    if (value) overrides[key] = value
  }
  return {
    rulesRoot: typeof stored?.rulesRoot === 'string' ? normaliseFolder(stored.rulesRoot) : DEFAULT_NOTE_FOLDERS.rulesRoot,
    overrides,
    campaigns: normaliseFolder(stored?.campaigns) || DEFAULT_CAMPAIGNS_FOLDER,
    sessions: normaliseFolder(stored?.sessions) || DEFAULT_SESSIONS_FOLDER,
  }
}

export const isRuleFolderKey = (folder: string): folder is RuleFolderKey =>
  (RULE_FOLDER_KEYS as readonly string[]).includes(folder)

/** A rules folder's own override, or `''` when it has none. */
export function ruleFolderOverride(key: string, folders: NoteFoldersSettings): string {
  return isRuleFolderKey(key) ? normaliseFolder(folders.overrides[key]) : ''
}

/**
 * Where a rules folder is, from the top of the vault: its override, else
 * `<rulesRoot>/<key>`, else `<key>`.
 *
 * This is the folder to *name* and to *write into*. Reading also falls back from
 * `<rulesRoot>/<key>` to a top-level `<key>` — see `rulesSource`.
 */
export function resolveRuleFolder(key: RuleFolderKey, folders: NoteFoldersSettings): string {
  const override = ruleFolderOverride(key, folders)
  if (override) return override
  const root = normaliseFolder(folders.rulesRoot)
  return root ? `${root}/${key}` : key
}

export const campaignsFolder = (folders: Pick<NoteFoldersSettings, 'campaigns'>): string =>
  normaliseFolder(folders.campaigns) || DEFAULT_CAMPAIGNS_FOLDER

export const sessionsFolder = (folders: Pick<NoteFoldersSettings, 'sessions'>): string =>
  normaliseFolder(folders.sessions) || DEFAULT_SESSIONS_FOLDER
