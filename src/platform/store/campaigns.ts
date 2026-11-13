import {
  CAMPAIGN_VALUE_PERCENT_DEFAULT,
  campaignValuePercent,
} from '@vault/derive/campaignPricing.js'

import { bool, str } from '../model/catalog'
import { PLUGIN_TITLE, QUIRK_COSTS_NOTE_LINE } from '../model/edition'
import { DEFAULT_CAMPAIGNS_FOLDER } from '../model/folders'
import { noteName, parseNote, serialiseNote, uniqueName } from './note'
import type { StateVault } from './vault'


/** The default campaigns folder. The one in use is `Campaigns.folder()` (MYDND-184). */
export const CAMPAIGNS_FOLDER = DEFAULT_CAMPAIGNS_FOLDER

export interface Campaign {
  /** The note's slug. The identity — see the note about `campaign_id` above. */
  id: string
  path: string
  name: string
  /** Thirteen slots and Bearing, in place of attunement-to-three. */
  loadoutSystem: boolean
  quirkCosts: boolean
  /** What this campaign's magic economy runs at, as a whole percent of book. */
  magicItemValuePercent: number
}

export interface Campaigns {
  /** Where campaign notes are read from and created, as the settings have it (MYDND-184). */
  folder(): string
  list(): Campaign[]
  byId(id: string | null | undefined): Campaign | null
  create(name: string): Promise<Campaign>
  setLoadoutSystem(campaign: Campaign, enabled: boolean): Promise<void>
  setQuirkCosts(campaign: Campaign, enabled: boolean): Promise<void>
  setMagicItemValuePercent(campaign: Campaign, percent: number): Promise<void>
}

/**
 * Frontmatter keys, spelled as the web app's columns are.
 *
 * Deliberately not renamed to camelCase or shortened: `docs/lessons/loadout.md`,
 * the plpgsql RPCs and fifteen tickets of reasoning all talk about
 * `loadout_system` and `magic_item_value_percent`, and a GM reading the note
 * beside that documentation should see the same words.
 */
const KEY = {
  loadoutSystem: 'loadout_system',
  quirkCosts: 'quirk_costs',
  valuePercent: 'magic_item_value_percent',
} as const

export function createCampaigns(vault: StateVault, folder: () => string = () => CAMPAIGNS_FOLDER): Campaigns {
  const rows = (): Campaign[] =>
    vault.notesIn(folder()).map(note => ({
      id: note.slug,
      path: note.path,
      name: str(note.frontmatter.title) ?? note.slug,
      loadoutSystem: bool(note.frontmatter[KEY.loadoutSystem]),
      quirkCosts: bool(note.frontmatter[KEY.quirkCosts]),
      // Through derive rather than `num()`: `campaignPricing.js` is canonical
      // for this one number and already handles every shape that reaches it,
      // including the `Number(null) === 0` trap that would price a whole
      // campaign at nothing.
      magicItemValuePercent: campaignValuePercent({
        magic_item_value_percent: note.frontmatter[KEY.valuePercent],
      }) as number,
    }))

  /** One field, one atomic write. */
  const setKey = (campaign: Campaign, key: string, value: unknown): Promise<void> =>
    vault.write(campaign.path, markdown => {
      const doc = parseNote(markdown)
      return serialiseNote({ ...doc, frontmatter: { ...doc.frontmatter, [key]: value } })
    })

  return {
    folder,

    list: () => rows().sort((a, b) => a.name.localeCompare(b.name)),

    byId: id => (id == null ? null : (rows().find(c => c.id === id) ?? null)),

    create: async name => {
      const title = name.trim() === '' ? 'New campaign' : name.trim()
      const taken = new Set(vault.notesIn(folder()).map(n => n.slug))
      const slug = uniqueName(noteName(title), taken)
      const path = `${folder()}/${slug}.md`

      await vault.write(path, () =>
        serialiseNote({
          frontmatter: {
            title,
            tags: ['campaign'],
            [KEY.loadoutSystem]: false,
            [KEY.quirkCosts]: false,
            [KEY.valuePercent]: CAMPAIGN_VALUE_PERCENT_DEFAULT,
          },
          body: BODY(title),
        }),
      )

      return {
        id: slug,
        path,
        name: title,
        loadoutSystem: false,
        quirkCosts: false,
        magicItemValuePercent: CAMPAIGN_VALUE_PERCENT_DEFAULT as number,
      }
    },

    setLoadoutSystem: (campaign, enabled) => setKey(campaign, KEY.loadoutSystem, enabled),
    setQuirkCosts: (campaign, enabled) => setKey(campaign, KEY.quirkCosts, enabled),

    setMagicItemValuePercent: (campaign, percent) =>
      // Clamped here, where the web app clamps it in a CHECK constraint and in
      // the RPCs. There is no database to refuse a bad value, so the writer is
      // the only place left that can.
      setKey(campaign, KEY.valuePercent, campaignValuePercent({
        magic_item_value_percent: percent,
      })),
  }
}

/**
 * What a new campaign note says.
 *
 * Prose rather than an empty file, because the note is going to be read by a
 * human in Obsidian long before anything else reads it, and "where did this
 * come from and may I edit it" is the first question it should answer. The
 * three settings are editable in Properties — they are authored scalars, not
 * derived keys, so unlike a generated frontmatter key there is nothing here to
 * clobber on a regeneration.
 */
const BODY = (title: string) => `
# ${title}

Campaign settings for ${PLUGIN_TITLE}. Edit the properties above here or in the
plugin's Settings page — they are the same values.

- **Loadout system** — thirteen equipment slots and a Bearing budget, in place
  of attunement to three items. Both systems' data is kept either way, so
  switching back is free.
${QUIRK_COSTS_NOTE_LINE}- **Magic item value percent** — what this campaign's magic economy runs at, as
  a whole percentage of the book's prices. It scales the rarity bands and never
  a price written on an item by hand. 100 is the book.
`.trimStart()
