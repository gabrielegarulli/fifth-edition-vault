import { type App, FuzzySuggestModal, type TFile } from 'obsidian'

/** What Obsidian itself embeds as an image. */
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg'])

/**
 * Obsidian's own fuzzy finder over the vault's images (MYDND-216), for the
 * builder's portrait. Resolves to the picked file's vault path, or `null` when
 * the finder is closed without one.
 *
 * **Nothing is copied, uploaded or written**: the path goes into the draft, and
 * the note gets it as `portrait` only when the character is saved (ADR 0007),
 * the key a D&D Beyond conversion's download fills too.
 *
 * `onClose` runs before `onChooseItem` (Obsidian closes the modal first), so
 * the `null` is held a tick: otherwise every pick would resolve as nothing.
 */
export function pickVaultImage(app: App): Promise<string | null> {
  return new Promise(resolve => {
    let picked = false
    class ImageModal extends FuzzySuggestModal<TFile> {
      getItems(): TFile[] {
        return app.vault.getFiles().filter(f => IMAGE_EXTENSIONS.has(f.extension.toLowerCase()))
      }
      getItemText(file: TFile): string {
        return file.path
      }
      onChooseItem(file: TFile): void {
        picked = true
        resolve(file.path)
      }
      onClose(): void {
        window.setTimeout(() => {
          if (!picked) resolve(null)
        }, 0)
      }
    }
    const modal = new ImageModal(app)
    modal.setPlaceholder('Pick an image already in the vault')
    modal.open()
  })
}
