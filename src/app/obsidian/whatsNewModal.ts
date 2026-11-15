import { Modal, setIcon, type App } from 'obsidian'

import type { ReleaseNotes } from '../model/changelog'
import { PUBLIC_REPO } from '../model/updates'
import type { UpdatePrefs } from './updates'

/**
 * What's new (MYDND-215): every release's notes, newest first, with the ones
 * this device has not seen marked NEW.
 *
 * Plain Obsidian DOM, not the React pane, so it carries its own
 * `.my-dnd-vault` root for the stylesheet's scope (`styles/index.css`,
 * "What's new"). Each release is a `<details>`, so it opens and closes from the
 * keyboard with nothing added; NEW is a word, not only a colour; the switches
 * are labelled checkboxes.
 */
export interface WhatsNewOptions {
  installed: string
  /** Newest first, none newer than `installed`. */
  releases: readonly ReleaseNotes[]
  /** Versions to mark NEW and open: empty when opened by hand. */
  unseen: ReadonlySet<string>
  prefs: Pick<UpdatePrefs, 'showAfterUpdate' | 'featureOnly'>
  setPrefs: (patch: Partial<Pick<UpdatePrefs, 'showAfterUpdate' | 'featureOnly'>>) => void
}

export class WhatsNewModal extends Modal {
  constructor(
    app: App,
    private readonly options: WhatsNewOptions,
  ) {
    super(app)
  }

  onOpen(): void {
    this.contentEl.empty()
    drawWhatsNew(this.contentEl, this.options, () => this.close())
  }

  onClose(): void {
    this.contentEl.empty()
  }
}

/** The modal's body, apart from the `Modal`, so a `ui` test can draw it into a plain element. */
export function drawWhatsNew(parent: HTMLElement, options: WhatsNewOptions, close: () => void): HTMLElement {
  const { installed, releases, unseen, prefs, setPrefs } = options
  const root = parent.createDiv({ cls: 'my-dnd-vault mdv-whats-new' })

  const header = root.createDiv({ cls: 'mdv-whats-new__header' })
  header.createEl('h2', { cls: 'mdv-whats-new__title', text: "What's new in Fifth Edition Vault" })
  const meta = header.createDiv({ cls: 'mdv-whats-new__meta' })
  meta.createSpan({ cls: 'mdv-whats-new__chip', text: `v${installed}`, attr: { title: 'The version installed' } })
  const github = meta.createEl('a', {
    cls: 'mdv-whats-new__github',
    href: `https://github.com/${PUBLIC_REPO}/releases`,
    attr: { target: '_blank', rel: 'noopener' },
  })
  setIcon(github.createSpan({ attr: { 'aria-hidden': 'true' } }), 'github')
  github.createSpan({ text: 'Releases on GitHub' })

  const list = root.createDiv({ cls: 'mdv-whats-new__list' })
  if (releases.length === 0) list.createEl('p', { text: 'No release notes yet.' })
  for (const [i, release] of releases.entries()) {
    const isNew = unseen.has(release.version)
    const entry = list.createEl('details', { cls: 'mdv-release' })
    // The unseen ones open; opened by hand, only the newest.
    entry.open = unseen.size ? isNew : i === 0
    const summary = entry.createEl('summary', { cls: 'mdv-release__summary' })
    summary.createSpan({ cls: 'mdv-release__version', text: release.version })
    if (isNew) summary.createSpan({ cls: 'mdv-release__new', text: 'New' })
    summary.createEl('time', { cls: 'mdv-release__date', text: release.date, attr: { datetime: release.date } })
    summary.createSpan({ cls: 'mdv-release__title', text: release.title })

    const body = entry.createDiv({ cls: 'mdv-release__body' })
    for (const section of release.sections) {
      body.createEl('h3', { cls: 'mdv-release__heading', text: section.heading })
      for (const group of section.groups) {
        if (group.title) body.createEl('p', { cls: 'mdv-release__group', text: group.title })
        const ul = body.createEl('ul', { cls: 'mdv-release__items' })
        for (const item of group.items) ul.createEl('li', { text: item })
      }
    }
  }

  const footer = root.createDiv({ cls: 'mdv-whats-new__footer' })
  const toggles = footer.createDiv({ cls: 'mdv-whats-new__toggles' })
  const toggle = (text: string, checked: boolean, onChange: (v: boolean) => void) => {
    const label = toggles.createEl('label', { cls: 'mdv-whats-new__toggle' })
    const input = label.createEl('input', { type: 'checkbox' })
    input.checked = checked
    input.addEventListener('change', () => onChange(input.checked))
    label.createSpan({ text })
  }
  toggle('Show changelog after updates', prefs.showAfterUpdate, v => setPrefs({ showAfterUpdate: v }))
  toggle('Feature updates only', prefs.featureOnly, v => setPrefs({ featureOnly: v }))
  const closeButton = footer.createEl('button', { cls: 'mod-cta', text: 'Close', attr: { type: 'button' } })
  closeButton.addEventListener('click', close)
  return root
}
