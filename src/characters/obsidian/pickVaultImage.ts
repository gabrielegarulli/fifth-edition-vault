import { type App, FuzzySuggestModal, TFile, TFolder } from 'obsidian'

/** What Obsidian itself embeds as an image. */
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg'])

/**
 * Obsidian's own fuzzy finder over the images under `folders()` (MYDND-216),
 * for the builder's portrait: the character folder and the portraits folder.
 * Resolves to the picked file's vault path, or `null` when the finder is closed
 * without one.
 *
 * **Not the whole vault (MYDND-226).** It listed `vault.getFiles()` until the
 * directory's review reported it as "Vault Enumeration"; now it walks each
 * folder's `children`, and an empty folder name (the vault's root) is skipped,
 * so no setting turns it back into a walk of the vault (ADR 0013).
 *
 * **Nothing is copied, uploaded or written**: the path goes into the draft, and
 * the note gets it as `portrait` only when the character is saved (ADR 0007),
 * the key a D&D Beyond conversion's download fills too.
 *
 * `onClose` runs before `onChooseItem` (Obsidian closes the modal first), so
 * the `null` is held a tick: otherwise every pick would resolve as nothing.
 */
export function pickVaultImage(app: App, folders: () => readonly string[]): Promise<string | null> {
  return new Promise(resolve => {
    let picked = false
    class ImageModal extends FuzzySuggestModal<TFile> {
      getItems(): TFile[] {
        return imagesUnder(app, folders())
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
    modal.setPlaceholder('Pick an image from the character or portraits folder')
    modal.open()
  })
}

/** Every image under the named folders, at any depth, each once; the vault's root is no folder here. */
function imagesUnder(app: App, folders: readonly string[]): TFile[] {
  const found = new Map<string, TFile>()
  const walk = (children: readonly unknown[]): void => {
    for (const child of children) {
      if (child instanceof TFile && IMAGE_EXTENSIONS.has(child.extension.toLowerCase())) found.set(child.path, child)
      else if (child instanceof TFolder) walk(child.children)
    }
  }
  for (const folder of folders) {
    const path = folder.replace(/^\/+|\/+$/g, '')
    if (path) walk(app.vault.getFolderByPath(path)?.children ?? [])
  }
  return [...found.values()].sort((a, b) => a.path.localeCompare(b.path))
}
