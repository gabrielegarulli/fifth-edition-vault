import { type App, Keymap, Menu, Platform } from 'obsidian'
import type { ReactNode } from 'react'

import { DomainProviders } from '../ui/context'
import type { Content } from '../model/content'
import { RollProvider } from '../../dice/host'
import type MyDndVaultPlugin from '../../main'
import { ObsidianProvider } from '../../platform/host'
import type { PaneHost } from '../../platform/host'
import type { State } from '../model/state'

/**
 * The providers every mount of the app's pages needs, above the router: the
 * host `App`, every domain's provider with the plugin's callbacks
 * (`DomainProviders`, MYDND-199), and the roll log. One copy for the view and for the ` ```vault-sheet ` fence
 * (MYDND-191), so a sheet on an Atlas card writes exactly as the pane's does.
 *
 * The split between them is the architecture: the content and state layers
 * take a `VaultSource` / `StateVault` and are testable in plain Node;
 * `ObsidianProvider` carries the real `App`.
 */
export function HostProviders({
  app,
  plugin,
  content,
  state,
  children,
}: {
  app: App
  plugin: MyDndVaultPlugin
  content: Content
  state: State
  children: ReactNode
}) {
  // `null` in the SRD edition: no import, no convert, no Sync (MYDND-133).
  const { online, srdNotes } = plugin
  return (
    <ObsidianProvider app={app}>
      <DomainProviders
        content={content}
        state={state}
        initialCampaignId={plugin.settings.activeCampaignId}
        onCampaignChange={plugin.setActiveCampaign}
        subscribeCampaign={plugin.subscribeCampaign}
        importCharacter={
          online
            ? async (ddbId, targetPath) => {
                const file = targetPath ? app.vault.getFileByPath(targetPath) : null
                const outcome = await online.importDdbCharacter(ddbId, file)
                return outcome !== null
              }
            : undefined
        }
        saveVaultCharacter={(json, targetPath) => plugin.saveVaultCharacter(json, targetPath ?? null)}
        rebuildVaultCharacter={path => plugin.rebuildVaultCharacter(path)}
        // The sheet's two slots for the private domains (MYDND-200). Guarded in
        // place, so the SRD edition's fold drops both imports with the branch.
        ddb={undefined}
        QuirkList={undefined}
        // The private domains (MYDND-200). Guarded in place, so the SRD
        // edition's fold leaves `undefined` and drops `privateProvidersFor`,
        // its cache and their imports.
        privateProviders={undefined}
        // The SRD edition's own notes (MYDND-185); `null` in the full plugin.
        srdNotes={
          srdNotes
            ? {
                notes: srdNotes.notes,
                install: onProgress => srdNotes.install(onProgress),
                openSettings: () => plugin.openSettingTab(),
              }
            : undefined
        }
      >
        {/* Inside `ObsidianProvider` because it needs the host `App` for the
            Atlas walk, and outside the router because the roll log is per
            *session*, not per route: navigating away from the sheet and back
            must not empty it. It is per mount, though: a roll made in one tab
            (or card) is logged there, and in Atlas. */}
        <RollProvider>{children}</RollProvider>
      </DomainProviders>
    </ObsidianProvider>
  )
}

/**
 * How a click reaches another tab. `isPinned` is the host's answer: the view's
 * leaf, or always `true` for a card, which must never change what it shows —
 * so every link on a card opens the pane instead (`paneTarget`).
 */
export function paneHost(plugin: MyDndVaultPlugin, isPinned: () => boolean): PaneHost {
  const pane: PaneHost = {
    isPinned,
    modTarget: evt => Keymap.isModEvent(evt),
    open: (path, target) => {
      void plugin.openRoute(path, target)
    },
    menu: (path, evt) => {
      const menu = new Menu()
      menu.addItem(item => item.setTitle('Open in new tab').setIcon('file-plus').onClick(() => pane.open(path, 'tab')))
      menu.addItem(item =>
        item.setTitle('Open to the right').setIcon('separator-vertical').onClick(() => pane.open(path, 'split')),
      )
      // A popout window is desktop-only; on mobile Obsidian throws rather than
      // falling back, so the item is not offered there at all.
      if (Platform.isDesktopApp) {
        menu.addItem(item =>
          item.setTitle('Open in new window').setIcon('picture-in-picture-2').onClick(() => pane.open(path, 'window')),
        )
      }
      menu.showAtMouseEvent(evt)
    },
  }
  return pane
}
