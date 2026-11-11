import type { TFile } from 'obsidian'

import type { DdbPayload } from '../ddb/payload'
import type { AccountHost } from '../ui/AppBar'
import type { ConvertInput } from './vaultCharacterActions'

/**
 * Everything that would reach a server, as a type only.
 *
 * Fifth Edition Vault reaches none, so the plugin's `online` is always `null`
 * and this class is never constructed. It exists so the code that checks for
 * `online` still type-checks.
 */
export class Online {
  declare readonly account: AccountHost

  private constructor() {
    throw new Error('Fifth Edition Vault makes no network calls.')
  }

  register(): void {}

  importDdbCharacter(ddbId: string, targetFile?: TFile | null): Promise<unknown> {
    void ddbId
    void targetFile
    return Promise.reject(new Error('unavailable'))
  }

  fetchDdbPayload(ddbId: string): Promise<DdbPayload> {
    void ddbId
    return Promise.reject(new Error('unavailable'))
  }

  convertDdbCharacter(input: Omit<ConvertInput, 'savePortrait'>): Promise<string | null> {
    void input
    return Promise.reject(new Error('unavailable'))
  }

  displaySettings(containerEl: HTMLElement, redisplay: () => void): void {
    void containerEl
    void redisplay
  }
}
