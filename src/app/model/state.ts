import {
  createActivity,
  createCampaigns,
  campaignsFolder,
  DEFAULT_NOTE_FOLDERS,
  sessionsFolder,
  type NoteFoldersSettings,
} from '../../platform'
import { createEncounters, createShop } from '../../gm'
import { createCharacterStores } from '../../characters'
import type { StateVault } from '../../platform'

/**
 * The state layer — what replaces `vault_state`, `campaign_codes` and the
 * 17 plpgsql RPCs.
 *
 * **This module imports nothing from `obsidian`, and must not start**, for the
 * same reason `./content.ts` must not: the `obsidian` package ships
 * `obsidian.d.ts` and no runtime entry, so importing a *value* from it makes the
 * importing file unloadable outside Obsidian and propagates to everything above.
 * That resolution failure is the guard which keeps this testable in plain Node —
 * and the stakes are higher here than for the readers, because this layer
 * rewrites the user's files and nothing in the lore vault is in any repository.
 *
 * The Obsidian wrapper is `createVaultState` in `../obsidian/vault`.
 *
 * **The app's composition, not a domain (MYDND-199).** Each store belongs to a
 * domain — campaigns and the log to `platform`, the three character stores to
 * `characters` (`./characterStores`), the encounter and the shop to `gm` — and
 * `../ui/context.tsx` hands each to its own domain's provider. Nothing below
 * `app` takes a `State`. It was `src/state/index.ts`, a barrel, until MYDND-200.
 *
 * Phase 3 ships campaigns, the harvest log (MYDND-5), and characters,
 * inventory and currency (MYDND-6). Phase 4 adds `vitals` — the mutable half of
 * a sheet (MYDND-10), in its own fence because the charsheet one is replaced
 * wholesale by a re-sync. Phase 5 adds the activity log and session notes, the
 * encounter, and the shop (MYDND-11), and crafting (MYDND-13).
 *
 * **Only the public stores, since MYDND-200.** The harvest log and crafting
 * belong to private domains, which the SRD edition drops whole, so a `State`
 * that named them kept their types in the public tree. The hosts build them
 * with their own factories (`createHarvests`, `createCrafting`) and hand them
 * to `DomainProviders`' `privateProviders`.
 */
export function createState(
  vault: StateVault,
  // The plugin's live settings, read on every call (MYDND-184). Only the two
  // folders the user's own notes are created in; the log and the encounters
  // keep their fixed folders.
  folders: () => Pick<NoteFoldersSettings, 'campaigns' | 'sessions'> = () => DEFAULT_NOTE_FOLDERS,
) {
  // The three stores that write a character note, all through the Atlas
  // mirror (MYDND-190); one wiring of them, shared with the characters domain.
  const characterStores = createCharacterStores(vault)
  const { inventory } = characterStores
  const campaigns = () => campaignsFolder(folders())
  return {
    ...characterStores,
    activity: createActivity(vault, undefined, () => sessionsFolder(folders())),
    campaigns: createCampaigns(vault, campaigns),
    encounters: createEncounters(vault),
    // Built over the inventory store rather than the vault: every price and
    // every rule comes from `@vault/derive`, and every write goes through the
    // one inventory API, so it has no business reaching a note directly.
    shop: createShop(inventory),
  }
}

export type State = ReturnType<typeof createState>

// Only the factory and its type, since MYDND-200. This file used to re-export
// every domain's readers and writers too, so a page could import anything
// through it, and every page depended on every domain. Import a name from the
// module that declares it.
