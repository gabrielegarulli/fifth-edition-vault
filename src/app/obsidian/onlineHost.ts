import type { TFile } from 'obsidian'

import type { DdbPayload } from '../../characterModel'
import type { ConvertInput } from '../../characters/host'
import type { AccountHost } from '../../platform/host'

/**
 * What the app reads of `online/obsidian/online.ts`'s `Online` (MYDND-200).
 *
 * `main.ts` builds `Online` behind `import.meta.env.SRD_ONLY`, and typed its
 * field by the class. After the SRD edition's fold the class was still named
 * in that type, so the export carried a typed stub of it. Typed by this
 * instead, the edition names nothing in `src/online/`, which it drops whole.
 * `Online` satisfies it as it is, checked where `main.ts` builds it; it cannot
 * say `implements`, because it sits below `app`.
 */
export interface OnlineHost {
  /** The bar's menu: the web sign-in and Sync (MYDND-131). */
  readonly account: AccountHost
  /** The ribbon icon and the commands, on load. */
  register(): void
  /** Resolves to `null` when the import was refused; the reason is on screen. */
  importDdbCharacter(ddbId: string, targetFile?: TFile | null): Promise<unknown>
  fetchDdbPayload(ddbId: string): Promise<DdbPayload>
  convertDdbCharacter(input: Omit<ConvertInput, 'savePortrait'>): Promise<string | null>
  /** The network half of the settings tab. */
  displaySettings(containerEl: HTMLElement, redisplay: () => void): void
}
