// The plugin's entry: settings, the view, ribbon icons, commands, the fences,
// and the services each edition builds.

import { Notice, Plugin, requestUrl } from 'obsidian'

import { resolveAtlasDice } from './dice/host'
import type { RequestUrlFn } from './platform'
import {
  renderCharsheetFence,
  installVaultSheetTemplate,
  rebuildVaultCharacter,
  saveVaultCharacter,
} from './characters/host'
import { renderSheetFence, SHEET_FENCE } from './app/obsidian/sheetFence'
import { VAULT_SHEET_TEMPLATE_ID, DDB_ID_KEY, createCharacterStores } from './characters'
import type { OnlineHost } from './app/obsidian/onlineHost'
import { SrdNotes, SpellItemView } from './catalogs/host'
import { SPELL_VIEW_TYPE, createVaultCompendium } from './compendium/host'
import { MyDndVaultSettingTab } from './app/obsidian/SettingTab'
import {
  DEFAULT_NOTE_FOLDERS,
  mergeNoteFolders,
  type NoteFoldersSettings,
  DESTINATIONS,
  PLUGIN_TITLE,
  type PaneTarget,
} from './platform'
import { bumpVaultGeneration, ObsidianStateVault } from './platform/host'
import { DEFAULT_DDB_SETTINGS, type DdbSettings, isLocalId } from './characterModel'
import type { VaultCharacterJson } from './characterModel'
import { VaultItemView, VIEW_TYPE } from './app/obsidian/view'
import '../styles/index.css'

export type { DdbSettings } from './characterModel'

/**
 * What belongs in `data.json`, and nothing more.
 *
 * The rule the project turns on is that **content and campaign data live in the
 * vault** — a release delivers only `main.js`, `styles.css` and `manifest.json`,
 * so anything here reaches no other machine and is invisible to search, links
 * and Bases (ADR 0001, Decision 2).
 *
 * `activeCampaignId` is the one thing that genuinely is *not* vault data: it is
 * which campaign this install is looking at, like which pane is open. Writing it
 * to a note would have two machines fighting over it. The campaign's own rules —
 * the loadout system, quirk costs, the magic economy — are in its note; see
 * `platform/store/campaigns.ts` for where that line is drawn.
 *
 * It holds a **slug**, because a note's name is its identity throughout this
 * plugin. A renamed or deleted campaign therefore stops resolving, which
 * `useActiveCampaign` answers with `null` rather than with the wrong campaign.
 */
export interface MyDndVaultSettings {
  activeCampaignId: string | null
  /**
   * The D&D Beyond import's settings, absorbed with the plugin that owned them
   * (MYDND-7).
   *
   * These stretch the rule above, and knowingly. `relayUrl` is unarguably an
   * install-level fact — it names something about *this machine's* egress. The
   * folders are more like a vault preference, and would be defensible in a
   * campaign note; they are here because that is where the plugin this
   * replaced kept them, and moving them would silently reset the folders of an
   * existing install for no gain. Revisit if a second machine ever shares one
   * vault.
   */
  ddb: DdbSettings
  /**
   * The Vault's own look (MYDND-143): the web app's chrome, the page as an inset
   * sheet, its blue accent. Off by default, so a pane follows the plugin's own
   * palette unless the user asks; ADR 0001 deferred this and did not reject it.
   * Here rather than in a campaign note because it is about this install's
   * screen, not about the campaign.
   */
  vaultLook: boolean
  /**
   * The fire behind every page (`app/ui/BlazeBackground.tsx`). Off by default: it is
   * a WebGL context per visible tab, which nobody should pay for unasked. Here
   * for the same reason as `vaultLook`.
   */
  embers: boolean
  /**
   * Where each kind of note lives in this vault (MYDND-184): the rules folder,
   * one folder per catalog where it differs, campaigns and sessions. Here for
   * the reason `ddb.folder` is: the plugin has to know the folders before it can
   * read a single note, so they cannot be in one. See `platform/model/folders.ts`.
   */
  folders: NoteFoldersSettings
}

const DEFAULT_SETTINGS: MyDndVaultSettings = {
  activeCampaignId: null,
  ddb: DEFAULT_DDB_SETTINGS,
  vaultLook: false,
  embers: false,
  folders: DEFAULT_NOTE_FOLDERS,
}

export default class MyDndVaultPlugin extends Plugin {
  settings: MyDndVaultSettings = { ...DEFAULT_SETTINGS }

  /**
   * Obsidian's HTTP client, exposed so the DDB modules can take it injected.
   *
   * `src/ddbImport/model/` imports nothing from `obsidian`, which is what lets the whole
   * fetch path — including the test asserting **no request ever carries a
   * `Referer`** — run in plain Node against a recording fake. Handing the real
   * one over here is the single place that seam is closed.
   */
  readonly requestUrl: RequestUrlFn = requestUrl

  /**
   * The D&D Beyond import and web Sync (MYDND-133), or `null` in the SRD
   * edition, which ships neither: no D&D Beyond address and no Supabase project
   * in a build handed to strangers. Read in place, so `vite build --mode srd`
   * drops the class and everything it imports (see `online/obsidian/online.ts`,
   * `edition.ts`). The view, the bar and the settings tab take `null` as "no
   * network", as the web build and the page tests already did. Typed by
   * `OnlineHost`, not the class, so the edition names nothing private (MYDND-200).
   */
  readonly online: OnlineHost | null = null

  /**
   * The SRD edition's own notes, installed from the bundle (MYDND-185), or
   * `null` in the full plugin, which reads the lore vault. Read in place for
   * the reason `online` is: the full build drops the class and the seeder.
   */
  readonly srdNotes: SrdNotes | null = (new SrdNotes(this))

  async onload(): Promise<void> {
    // Loaded before the view is registered: Obsidian restores a leaf from the
    // last session as soon as it is, and the view reads these on mount.
    const stored = (await this.loadData()) as Partial<MyDndVaultSettings> | null
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      // Nested, so a `data.json` written before a key existed gains its default
      // rather than `undefined`. A shallow merge would have replaced the whole
      // object and left every new setting unset.
      ddb: { ...DEFAULT_DDB_SETTINGS, ...stored?.ddb },
      folders: mergeNoteFolders(stored?.folders),
    }

    this.addSettingTab(new MyDndVaultSettingTab(this.app, this))

    this.registerView(VIEW_TYPE, leaf => new VaultItemView(leaf, this))
    // The window Ctrl+click on a sheet spell opens (MYDND-60).
    this.registerView(SPELL_VIEW_TYPE, leaf => new SpellItemView(leaf, this.noteFolders))

    this.addRibbonIcon('dice-6', `Open ${PLUGIN_TITLE}`, () => {
      void this.activateView()
    })

    // Sync's ribbon icon and the commands that reach a server (MYDND-133).
    this.online?.register()
    this.srdNotes?.register()

    this.addCommand({
      id: 'open-view',
      name: `Open ${PLUGIN_TITLE}`,
      callback: () => {
        void this.activateView()
      },
    })

    // One per section, now that each can be its own tab (MYDND-61): the palette
    // is the keyboard's way to the tab you want to pin. The id is derived from
    // the path, so it is stable for as long as the route is — which is what a
    // hotkey bound to it is keyed on.
    for (const d of DESTINATIONS) {
      this.addCommand({
        id: `open-section-${d.path === '/' ? 'home' : d.path.slice(1).replace(/\//g, '-')}`,
        name: `Open ${d.label}`,
        icon: d.icon,
        callback: () => {
          void this.openSection(d.path)
        },
      })
    }

    // The sheet renders wherever Obsidian renders the note, not only in our
    // pane — reading view, a split, an embed.
    const fenceCompendium = createVaultCompendium(this.app, this.noteFolders)
    this.registerMarkdownCodeBlockProcessor('charsheet', (source, el, ctx) => {
      renderCharsheetFence(this.app, fenceCompendium, source, el, ctx)
    })
    // The sheet of the note it is rendered *for*: our template's whole body,
    // so Atlas VTT's card draws this plugin's sheet (MYDND-191).
    this.registerMarkdownCodeBlockProcessor(SHEET_FENCE, (_source, el, ctx) => {
      renderSheetFence(this, el, ctx)
    })

    this.registerCharacterCommands()
  }

  /**
   * The commands absorbed with `obsidian-vault-characters` (MYDND-7) that work
   * offline. The ones that reach D&D Beyond are `Online.register`.
   *
   * The roster and the sheet are *routes* in the one pane now rather than a
   * second `ItemView`, so there is no "open the character roster" command —
   * opening the pane and going to Characters is the same journey.
   */
  private registerCharacterCommands(): void {
    // A Vault character's equivalent of D&D Beyond's re-sync — and it shows
    // only on one, so the two commands are never offered for the same note.
    this.addCommand({
      id: 'rebuild-vault-character',
      name: 'Rebuild this character’s sheet from its choices',
      checkCallback: checking => {
        const file = this.app.workspace.getActiveFile()
        if (!file) return false
        const id: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter?.[DDB_ID_KEY]
        if (!isLocalId(id)) return false
        if (!checking) void this.rebuildVaultCharacter(file.path)
        return true
      },
    })

    this.addCommand({
      id: 'check-atlas-bridge',
      name: 'Check the Atlas VTT dice bridge',
      callback: () => {
        const dice = resolveAtlasDice(this.app)
        if (!dice) {
          new Notice('No Atlas VTT scene found. Open a map in Atlas, then run this again.')
          return
        }
        const result = dice.rollDice('1d20', { type: 'statblock', abilityName: 'Bridge test' })
        new Notice(
          typeof result?.total === 'number'
            ? `Bridge is live — rolled 1d20 and got ${result.total}. Check the Atlas roll log.`
            : 'Found the dice tool but it returned nothing recognisable.',
        )
      },
    })
  }

  /**
   * Bake, project and write a Vault character (MYDND-23, ADR 0007).
   *
   * With no `targetPath` it is a new character and gets a fresh `local:` id;
   * with one, the note's own id is kept, so a rebuild rewrites the character in
   * place rather than minting a second identity for it. Content and state are
   * built per call, the way the view builds them per mount — both are stateless.
   *
   * Returns the note's path, or `null` when the write was refused; the reason
   * is always on screen.
   */
  async saveVaultCharacter(json: VaultCharacterJson, targetPath: string | null = null): Promise<string | null> {
    return saveVaultCharacter(this.app, this.settings.ddb, json, targetPath, this.noteFolders)
  }

  /** Re-project a Vault character's charsheet from its own vault-character fence. */
  rebuildVaultCharacter(path: string): Promise<boolean> {
    return rebuildVaultCharacter(this.app, this.settings.ddb, path, this.noteFolders)
  }

  /**
   * Bring every character note in step with the Atlas settings now (MYDND-190):
   * `statblock` and the template mirror. Answers how many notes changed.
   */
  async applyAtlasSettings(): Promise<number> {
    const { exposeToAtlas, atlasTemplateId } = this.settings.ddb
    const { characters } = createCharacterStores(new ObsidianStateVault(this.app))
    return characters.applyAtlasSettings({ exposeToAtlas, atlasTemplateId })
  }

  /**
   * Write our own Atlas template into the vault and choose it (MYDND-191).
   * Notes follow on the next write, or at once with `applyAtlasSettings`.
   */
  async useVaultSheetTemplate(): Promise<'created' | 'updated' | 'unchanged'> {
    const outcome = await installVaultSheetTemplate(this.app)
    await this.setDdbSettings({ atlasTemplateId: VAULT_SHEET_TEMPLATE_ID })
    return outcome
  }

  onunload(): void {
    // Obsidian detaches leaves of a deregistered view type itself. Doing it
    // here as well races with its own teardown.
  }

  /**
   * Persist one setting.
   *
   * `saveData` rewrites the whole file, so it takes the merged object rather
   * than a patch. Fire-and-forget from the view's point of view: the React
   * state has already changed, and a failed write means the choice is not
   * remembered next launch — not that the session is wrong.
   */
  /**
   * Choose the active campaign for every open tab (MYDND-61).
   *
   * Each tab mounts its own `StateProvider`, so the choice is told to all of
   * them — synchronously, before the write, so no tab spends the `saveData`
   * round trip on the old campaign. Arrow functions because the view hands
   * both straight to React as props.
   */
  readonly setActiveCampaign = (id: string | null): void => {
    for (const listener of this.campaignListeners) listener(id)
    void this.setSettings({ activeCampaignId: id })
  }

  readonly subscribeCampaign = (listener: (id: string | null) => void): (() => void) => {
    this.campaignListeners.add(listener)
    return () => {
      this.campaignListeners.delete(listener)
    }
  }

  private readonly campaignListeners = new Set<(id: string | null) => void>()

  async setSettings(patch: Partial<MyDndVaultSettings>): Promise<void> {
    this.settings = { ...this.settings, ...patch }
    await this.saveData(this.settings)
  }

  /** Turns the Vault look on or off, and repaints every open pane at once. */
  async setVaultLook(on: boolean): Promise<void> {
    await this.setSettings({ vaultLook: on })
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof VaultItemView) leaf.view.applyLook(on)
    }
  }

  /** Lights or puts out the fire behind every open pane, without reopening one. */
  async setEmbers(on: boolean): Promise<void> {
    await this.setSettings({ embers: on })
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof VaultItemView) leaf.view.refresh()
    }
  }

  /**
   * The folder settings as they are *now* (MYDND-184). Handed to every content
   * and state entry point as a getter, never a value: the readers ask on each
   * call, so a changed folder needs nothing rebuilt.
   */
  readonly noteFolders = (): NoteFoldersSettings => this.settings.folders

  /**
   * Changes where notes are read from, and re-reads every open pane at once. No
   * file moves, so no vault event would tell a pane its lists are stale; the
   * generation bump does. Normalised on the way in, so what is saved is what
   * `notesIn` compares against.
   */
  async setNoteFolders(patch: Partial<NoteFoldersSettings>): Promise<void> {
    await this.setSettings({ folders: mergeNoteFolders({ ...this.settings.folders, ...patch }) })
    bumpVaultGeneration()
  }

  /** `setSettings` for the nested D&D Beyond group, merged rather than replaced. */
  async setDdbSettings(patch: Partial<DdbSettings>): Promise<void> {
    await this.setSettings({ ddb: { ...this.settings.ddb, ...patch } })
  }

  /**
   * Reveals the existing view if one is open, rather than stacking a second
   * copy on every ribbon click. Opens in the main area, not a sidebar — the app
   * needs the width.
   */
  /**
   * Obsidian's settings, open on this plugin's tab. `setting` is not in
   * `obsidian.d.ts`, though every plugin that links to its own tab uses it;
   * optional-called, so if a release drops it the menu item does nothing
   * rather than throwing.
   */
  openSettingTab(): void {
    const setting = (this.app as typeof this.app & { setting?: { open(): void; openTabById(id: string): unknown } })
      .setting
    setting?.open()
    setting?.openTabById(this.manifest.id)
  }

  private async activateView(): Promise<void> {
    const { workspace } = this.app

    const existing = workspace.getLeavesOfType(VIEW_TYPE)
    if (existing.length > 0) {
      await workspace.revealLeaf(existing[0])
      return
    }

    const leaf = workspace.getLeaf('tab')
    await leaf.setViewState({ type: VIEW_TYPE, active: true })
    await workspace.revealLeaf(leaf)
  }

  /**
   * Open `path` in a new tab, split or window (MYDND-61) — what a modified
   * click, a middle-click, the right-click menu, or any click in a pinned tab
   * asks for. The route travels as the view's state, which is also how the
   * layout restores it.
   */
  async openRoute(path: string, target: PaneTarget): Promise<void> {
    const { workspace } = this.app
    // Two overloads, and a `PaneTarget` union matches neither on its own.
    const leaf = target === 'split' ? workspace.getLeaf('split', 'vertical') : workspace.getLeaf(target)
    await leaf.setViewState({ type: VIEW_TYPE, active: true, state: { path } })
    await workspace.revealLeaf(leaf)
  }

  /**
   * A section from the command palette: the tab already showing it if there is
   * one, else a new tab. Reusing is the difference between a palette that finds
   * your pinned Bestiary and one that stacks a second copy beside it.
   */
  private async openSection(path: string): Promise<void> {
    const open = this.app.workspace
      .getLeavesOfType(VIEW_TYPE)
      .find(leaf => leaf.view instanceof VaultItemView && leaf.view.route === path)
    if (open) {
      await this.app.workspace.revealLeaf(open)
      return
    }
    await this.openRoute(path, 'tab')
  }
}
