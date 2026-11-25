import { createContext, useContext, useMemo, type ComponentProps, type ReactNode } from 'react'

import type { Content } from '../model/content'
import type { State } from '../model/state'
import type { SrdNotesHost } from '../../catalogs/host'
import { CharactersProvider, type CharactersHost } from '../../characters/host'
import { CompendiumProvider } from '../../compendium/host'
import { DdbConvertProvider, FileImport } from '../../ddbConvert/host'
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
  campaignsReadOnly,
  importCharacter,
  saveVaultCharacter,
  rebuildVaultCharacter,
  ddb,
  QuirkList,
  pickPortrait,
  ddbConvert,
  privateProviders,
  srdNotes,
  noteBuilder,
  children,
}: {
  content: Content
  state: State
  initialCampaignId: string | null
  onCampaignChange: (id: string | null) => void
  subscribeCampaign?: (listener: (id: string | null) => void) => () => void
  /** A player on the web build reads the campaign's rules and cannot change them (MYDND-223). */
  campaignsReadOnly?: boolean
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
  /** The builder's portrait picker (MYDND-216); the plugin's only, never the web build's. */
  pickPortrait?: NonNullable<CharactersHost['pickPortrait']>
  /**
   * The D&D Beyond conversion (MYDND-105, public since MYDND-257): the write,
   * and the fetch where D&D Beyond can be reached. Passed by the host providers
   * in both editions, the fetch only outside the SRD; never by the web build.
   * With it the roster offers "Import from a file"; without it the review says
   * it runs in the plugin.
   */
  ddbConvert?: Omit<ComponentProps<typeof DdbConvertProvider>, 'children'>
  /**
   * The private domains' providers, crafting and harvesting, wrapped around
   * the pages (MYDND-200). Opaque on purpose: this
   * file names no private module, so the SRD edition, which never passes it,
   * drops those folders whole. The host providers build it behind
   * `import.meta.env.SRD_ONLY`, the web build always, and a private suite
   * passes its own.
   */
  privateProviders?: (children: ReactNode) => ReactNode
  /** The SRD edition only; see `useSrdNotes`. */
  srdNotes?: SrdNotesHost
  /**
   * Draws the note builders' page (MYDND-233), its host already around it. The
   * plugin's only: `HostProviders` passes it and the web build never does, so
   * this file, and `App`, import nothing of `src/homebrew/` (ADR 0014). A
   * render function rather than a component, so the page's own type is static
   * and a re-render never remounts the form.
   */
  noteBuilder?: () => ReactNode
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
      campaignsReadOnly={campaignsReadOnly}
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
          FileImport={ddbConvert?.convertDdbCharacter ? FileImport : undefined}
          QuirkList={QuirkList}
          pickPortrait={pickPortrait}
        >
          <GmProvider gm={gm}>
            {/* The catalogs' one slot, filled with gm's hook (MYDND-200). gm is
                not private, so every mount gets it, the harness included. */}
            <CatalogsProvider useMonsterEncounter={useMonsterEncounter} noteBuilders={noteBuilder !== undefined}>
              <SrdNotesContext.Provider value={srdNotes ?? null}>
                <NoteBuilderContext.Provider value={noteBuilder ?? null}>
                  <DdbConvertProvider
                    fetchDdbPayload={ddbConvert?.fetchDdbPayload}
                    convertDdbCharacter={ddbConvert?.convertDdbCharacter}
                    createNotes={ddbConvert?.createNotes}
                  >
                    {privateProviders ? privateProviders(children) : children}
                  </DdbConvertProvider>
                </NoteBuilderContext.Provider>
              </SrdNotesContext.Provider>
            </CatalogsProvider>
          </GmProvider>
        </CharactersProvider>
      </CompendiumProvider>
    </PlatformProvider>
  )
}

const SrdNotesContext = createContext<SrdNotesHost | null>(null)

const NoteBuilderContext = createContext<(() => ReactNode) | null>(null)

/** Draws the note builders' page, or `null` where the host has none: the web build and the harness (MYDND-233). */
export function useNoteBuilder(): (() => ReactNode) | null {
  return useContext(NoteBuilderContext)
}

/**
 * The SRD edition's notes, installed from the bundle (MYDND-185), for Home's
 * setup card. `null` in the full plugin, the web build and the harness. Home
 * is the app's own page, so this is the app's context rather than a domain's.
 */
export function useSrdNotes(): SrdNotesHost | null {
  return useContext(SrdNotesContext)
}
