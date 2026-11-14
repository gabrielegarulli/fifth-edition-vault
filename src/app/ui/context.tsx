import { createContext, useContext, useMemo, type ReactNode } from 'react'

import type { Content } from '../model/content'
import type { State } from '../model/state'
import type { SrdNotesHost } from '../../catalogs/host'
import { CharactersProvider, type CharactersHost } from '../../characters/host'
import { CompendiumProvider } from '../../compendium/host'
import { GmProvider, useMonsterEncounter } from '../../gm/host'
import { CatalogsProvider } from '../../catalogs/host'
import { PlatformProvider } from '../../platform/host'

/**
 * Every domain's provider, nested once (MYDND-199).
 *
 * `ContentContext` and `StateContext` used to hand every page every reader and
 * every writer, so a spell detail pane depended on the shop, the harvest log
 * and the encounter. Each domain owns its provider and hook now, and this is
 * the one place that knows them all: the view and the ` ```vault-sheet ` fence
 * (through `HostProviders`), the web build, and the test harness compose the
 * same tree from the same props, so a page mounts the same way in all four.
 *
 * It takes the app's `Content` and `State` and hands each domain its part. The
 * nesting follows the domain order, bottom to top, only so the tree reads like
 * `docs/plans/contributor-ready.md`; no provider reads another's value.
 */
export function DomainProviders({
  content,
  state,
  initialCampaignId,
  onCampaignChange,
  subscribeCampaign,
  importCharacter,
  saveVaultCharacter,
  rebuildVaultCharacter,
  ddb,
  QuirkList,
  privateProviders,
  srdNotes,
  children,
}: {
  content: Content
  state: State
  initialCampaignId: string | null
  onCampaignChange: (id: string | null) => void
  subscribeCampaign?: (listener: (id: string | null) => void) => () => void
  importCharacter?: CharactersHost['importCharacter']
  saveVaultCharacter?: CharactersHost['saveVaultCharacter']
  rebuildVaultCharacter?: CharactersHost['rebuildVaultCharacter']
  /**
   * Slots `characters` draws but the private domains own (MYDND-200). Passed by
   * the host providers and the web build, behind `import.meta.env.SRD_ONLY`;
   * never here by default, so the harness the SRD export publishes imports
   * nothing private.
   */
  ddb?: NonNullable<CharactersHost['ddb']>
  QuirkList?: NonNullable<CharactersHost['QuirkList']>
  /**
   * The private domains' providers, crafting, harvesting and the D&D Beyond
   * conversion, wrapped around the pages (MYDND-200). Opaque on purpose: this
   * file names no private module, so the SRD edition, which never passes it,
   * drops those folders whole. The host providers build it behind
   * `import.meta.env.SRD_ONLY`, the web build always, and a private suite
   * passes its own.
   */
  privateProviders?: (children: ReactNode) => ReactNode
  /** The SRD edition only; see `useSrdNotes`. */
  srdNotes?: SrdNotesHost
  children: ReactNode
}) {
  // A new object per render would re-render every GM consumer on every render
  // of the frame; the stores themselves are stable for the life of `state`.
  const gm = useMemo(() => ({ encounters: state.encounters, shop: state.shop }), [state])

  return (
    <PlatformProvider
      campaigns={state.campaigns}
      activity={state.activity}
      initialCampaignId={initialCampaignId}
      onCampaignChange={onCampaignChange}
      subscribeCampaign={subscribeCampaign}
    >
      {/* The whole `Content` is a `Compendium` plus the roster; handing it over
          as it is keeps one object per mount, which `useCatalogRows` keys on. */}
      <CompendiumProvider compendium={content}>
        <CharactersProvider
          roster={content.characters}
          characters={state.characters}
          inventory={state.inventory}
          vitals={state.vitals}
          importCharacter={importCharacter}
          saveVaultCharacter={saveVaultCharacter}
          rebuildVaultCharacter={rebuildVaultCharacter}
          ddb={ddb}
          QuirkList={QuirkList}
        >
          <GmProvider gm={gm}>
            {/* The catalogs' one slot, filled with gm's hook (MYDND-200). gm is
                not private, so every mount gets it, the harness included. */}
            <CatalogsProvider useMonsterEncounter={useMonsterEncounter}>
              <SrdNotesContext.Provider value={srdNotes ?? null}>
                {privateProviders ? privateProviders(children) : children}
              </SrdNotesContext.Provider>
            </CatalogsProvider>
          </GmProvider>
        </CharactersProvider>
      </CompendiumProvider>
    </PlatformProvider>
  )
}

const SrdNotesContext = createContext<SrdNotesHost | null>(null)

/**
 * The SRD edition's notes, installed from the bundle (MYDND-185), for Home's
 * setup card. `null` in the full plugin, the web build and the harness. Home
 * is the app's own page, so this is the app's context rather than a domain's.
 */
export function useSrdNotes(): SrdNotesHost | null {
  return useContext(SrdNotesContext)
}
