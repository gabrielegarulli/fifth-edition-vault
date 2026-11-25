import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import type { App as ObsidianApp } from 'obsidian'

import { App } from '../../app/ui/App'
import { createContent } from '../../app/model/content'
import { RollProvider } from '../../dice/ui/RollContext'
import { ObsidianProvider } from '../../platform/obsidian/ObsidianContext'
import type { VaultSource } from '../../platform/model/source'
import { MemoryVault } from '../../platform/store/__fixtures__/memoryVault'
import { TestProviders } from '../../test-support/providers.stub.test'
import { buildNote } from '../model/emit'
import { builderDefaults, type BuilderDefaults, type BuilderKind, type BuilderSettings } from '../model/kinds'
import { hearthbound } from '../model/__fixtures__/forms'
import { createHomebrewNote } from '../store/create'
import { replaceHomebrewNote } from '../store/replace'
import { HomebrewProvider, type HomebrewHost } from './context'
import { NoteBuilderPage } from './NoteBuilderPage'

/**
 * A note builder, mounted as the plugin mounts it (MYDND-233): through `App`
 * and the `noteBuilder` slot, over a `MemoryVault` the host writes to. What
 * this proves is the journey, a form to one new file, and the refusals on the
 * way; how it looks is for Obsidian (`testing.md`).
 */

function fakeApp(): ObsidianApp {
  const events = { on: () => ({}), offref: () => {} }
  return {
    workspace: { ...events, openLinkText: () => Promise.resolve(), getLeavesOfType: () => [] },
    vault: { ...events, getFileByPath: () => null, getResourcePath: () => '' },
    metadataCache: { ...events, getFileCache: () => null },
  } as unknown as ObsidianApp
}

/** One exported feat, Alert, so a name can clash. */
const ALERT = `---
title: "Alert"
source: "Homebrew Test"
kind: "origin"
tags:
  - "feat"
---

# Alert
`

/** A feat the builder saved (MYDND-272): what Edit opens. */
const HEARTH_PATH = 'Homebrew/Feats/hearthbound-resolve.md'
const HEARTH = buildNote(hearthbound()).text

const content = (): VaultSource => {
  const files: Record<string, string> = { 'feats/alert.md': ALERT, [HEARTH_PATH]: HEARTH }
  const fm = (text: string) => parse(text.split('---')[1]) as Record<string, unknown>
  return {
    notesIn: folder => (folder === 'feats' ? [{ path: 'feats/alert.md', slug: 'alert', frontmatter: fm(ALERT) }] : []),
    notesUnder: folder => (folder === 'Homebrew' ? [{ path: HEARTH_PATH, slug: 'hearthbound-resolve', frontmatter: fm(HEARTH) }] : []),
    homebrewFolder: () => 'Homebrew',
    readBody: p => Promise.resolve(files[p] ?? ''),
  }
}

function host(vault: MemoryVault, remembered: Array<[BuilderKind, BuilderDefaults]>, settings: BuilderSettings = {}): HomebrewHost {
  return {
    homebrewFolder: () => 'Homebrew',
    defaults: kind => builderDefaults(settings, kind),
    remember: async (kind, d) => {
      remembered.push([kind, d])
    },
    exists: async path => vault.files.has(path),
    create: (path, text) => createHomebrewNote(vault, path, text),
    read: path => vault.read(path),
    replace: (path, loaded, text) => replaceHomebrewNote(vault, path, loaded, text),
    openNote: () => {},
    subfolders: () => ['Feats', 'Spells'],
  }
}

function mount(path: string, { vault = new MemoryVault(), builders = true, remembered = [] as Array<[BuilderKind, BuilderDefaults]> } = {}) {
  const h = host(vault, remembered)
  return render(
    <ObsidianProvider app={fakeApp()}>
      <TestProviders
        content={createContent(content(), parse)}
        noteBuilder={
          builders
            ? () => (
                <HomebrewProvider host={h}>
                  <NoteBuilderPage />
                </HomebrewProvider>
              )
            : undefined
        }
      >
        <RollProvider>
          <MemoryRouter initialEntries={[path]}>
            <App />
          </MemoryRouter>
        </RollProvider>
      </TestProviders>
    </ObsidianProvider>,
  )
}

const saveButton = () => screen.getByRole('button', { name: 'Save…' })

describe('the way in', () => {
  it('a catalog page offers "New homebrew feat" where the host has builders, and not where it does not', () => {
    const { unmount } = mount('/feats')
    expect(screen.getByRole('button', { name: 'New homebrew feat' })).toBeTruthy()
    unmount()
    mount('/feats', { builders: false })
    expect(screen.queryByRole('button', { name: 'New homebrew feat' })).toBeNull()
  })

  it("a builder's route where the host has none says so (the web build, ADR 0014)", () => {
    mount('/homebrew/new/spell', { builders: false })
    expect(screen.getByRole('heading', { name: 'Only in Obsidian' })).toBeTruthy()
  })
})

describe('a new spell, from the form to one file', () => {
  it('cannot be saved until it has a name and reads back, then writes one new note and remembers where', async () => {
    const vault = new MemoryVault()
    const remembered: Array<[BuilderKind, BuilderDefaults]> = []
    mount('/homebrew/new/spell', { vault, remembered })

    expect(screen.getByRole('heading', { name: 'New homebrew spell' })).toBeTruthy()
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Give it a name.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ember Ward' } })
    await screen.findByText(/Reads back every field as written/)
    expect((saveButton() as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(saveButton())
    const dialog = screen.getByRole('dialog', { name: /Save “Ember Ward”/ })
    expect((within(dialog).getByLabelText('Folder, inside your homebrew folder') as HTMLInputElement).value).toBe('Spells')
    await within(dialog).findByText('✓ A new file: nothing is there')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create note' }))

    await screen.findByText('Homebrew/Spells/ember-ward.md')
    expect(vault.writes).toEqual(['Homebrew/Spells/ember-ward.md'])
    expect(vault.files.get('Homebrew/Spells/ember-ward.md')).toMatch(/^---\ntitle: "Ember Ward"\nsource: "Homebrew"\nlevel: 1\n/)
    expect(remembered).toEqual([['spell', { folder: 'Spells', source: 'Homebrew' }]])
  })

  it('refuses a folder that steps out of the homebrew folder', async () => {
    mount('/homebrew/new/condition')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Smouldering' } })
    await screen.findByText(/Reads back every field as written/)
    fireEvent.click(saveButton())
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Folder, inside your homebrew folder'), { target: { value: '../conditions' } })
    expect(within(dialog).getByRole('alert').textContent).toMatch(/cannot step out of your homebrew folder/)
    expect((within(dialog).getByRole('button', { name: 'Create note' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('a name that is taken', () => {
  it('a file already at the path is said, and Create is off', async () => {
    const vault = new MemoryVault({ 'Homebrew/Conditions/smouldering.md': 'mine' })
    mount('/homebrew/new/condition', { vault })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Smouldering' } })
    await screen.findByText(/Reads back every field as written/)
    fireEvent.click(saveButton())
    const dialog = screen.getByRole('dialog')
    await within(dialog).findByText(/A file is already at Homebrew\/Conditions\/smouldering\.md/)
    expect((within(dialog).getByRole('button', { name: 'Create note' }) as HTMLButtonElement).disabled).toBe(true)
    expect(vault.files.get('Homebrew/Conditions/smouldering.md')).toBe('mine')
  })

  it("a name already in the catalog is a warning with another name to take, not a refusal", async () => {
    mount('/homebrew/new/feat')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alert' } })
    fireEvent.change(screen.getByLabelText('Benefit name'), { target: { value: 'Quick' } })
    expect(screen.getByText(/“Alert” is already a feat \(feats\/alert\.md\)/)).toBeTruthy()
    await screen.findByText(/Reads back every field as written/)
    fireEvent.click(saveButton())
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Create anyway' })).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rename to “Alert (Homebrew)”' }))
    await waitFor(() => expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Alert (Homebrew)'))
  })
})

describe('Edit: a saved homebrew note in its builder (MYDND-272)', () => {
  const editPath = (path: string) => `/homebrew/edit/feat?${new URLSearchParams({ path })}`
  const editButton = () => screen.queryByRole('button', { name: 'Edit this feat in its builder' })

  it('a homebrew feat’s detail pane offers Edit; an exported one, and the web build, do not', async () => {
    const { unmount } = mount('/feats')
    fireEvent.click(screen.getByRole('button', { name: /^Hearthbound Resolve/ }))
    await screen.findByRole('button', { name: 'Open note' })
    expect(editButton()).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Alert/ }))
    await waitFor(() => expect(editButton()).toBeNull())
    unmount()

    mount('/feats', { builders: false })
    fireEvent.click(screen.getByRole('button', { name: /^Hearthbound Resolve/ }))
    await screen.findByRole('button', { name: 'Open note' })
    expect(editButton()).toBeNull()
  })

  it('opens the note as saved, name locked, and Save replaces that one file', async () => {
    const vault = new MemoryVault({ [HEARTH_PATH]: HEARTH })
    mount(editPath(HEARTH_PATH), { vault })

    expect(await screen.findByRole('heading', { name: 'Edit homebrew feat' })).toBeTruthy()
    const name = screen.getByLabelText('Name') as HTMLInputElement
    expect(name.value).toBe('Hearthbound Resolve')
    expect(name.readOnly).toBe(true)
    const save = () => screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement
    expect(save().disabled).toBe(true)
    expect(screen.getByText('No changes')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Introduction'), { target: { value: 'Warmth goes with you. You gain the following benefits.' } })
    await screen.findByText(/Reads back every field as written/)
    await waitFor(() => expect(save().disabled).toBe(false))
    fireEvent.click(save())

    await screen.findByText(HEARTH_PATH)
    expect(vault.writes).toEqual([HEARTH_PATH])
    expect(vault.files.get(HEARTH_PATH)).toContain('Warmth goes with you.')
    expect(vault.files.get(HEARTH_PATH)).toContain('title: "Hearthbound Resolve"')
    expect([...vault.files.keys()]).toEqual([HEARTH_PATH])
  })

  it('opens a note Obsidian re-quoted as unchanged: nothing to save', async () => {
    const vault = new MemoryVault({ [HEARTH_PATH]: HEARTH.replace('title: "Hearthbound Resolve"', "title: 'Hearthbound Resolve'") })
    mount(editPath(HEARTH_PATH), { vault })
    await screen.findByRole('heading', { name: 'Edit homebrew feat' })
    expect(screen.getByText('No changes')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('refuses a save when the note changed underneath, and leaves the change', async () => {
    const vault = new MemoryVault({ [HEARTH_PATH]: HEARTH })
    mount(editPath(HEARTH_PATH), { vault })
    await screen.findByRole('heading', { name: 'Edit homebrew feat' })
    vault.files.set(HEARTH_PATH, HEARTH + '\nAdded in Obsidian.\n')

    fireEvent.change(screen.getByLabelText('Introduction'), { target: { value: 'Changed here.' } })
    await screen.findByText(/Reads back every field as written/)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/changed after it was opened here\. Nothing was saved/)
    expect(vault.files.get(HEARTH_PATH)).toContain('Added in Obsidian.')
    expect(vault.writes).toEqual([])
  })

  it('refuses a hand-edited note and names what a save would drop; the form never opens', async () => {
    const vault = new MemoryVault({ [HEARTH_PATH]: HEARTH.replace('kind: "general"', 'kind: "general"\nmy_note: "keep me"') })
    mount(editPath(HEARTH_PATH), { vault })
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/The property "my_note" has no field in the form/)
    expect(screen.queryByLabelText('Name')).toBeNull()
    expect(vault.writes).toEqual([])
  })

  it('refuses a note outside the homebrew folder: an exported note stays read-only', async () => {
    mount(editPath('feats/alert.md'), { vault: new MemoryVault({ 'feats/alert.md': ALERT }) })
    expect((await screen.findByRole('alert')).textContent).toMatch(/is not under your homebrew folder/)
    expect(screen.queryByLabelText('Name')).toBeNull()
  })
})
