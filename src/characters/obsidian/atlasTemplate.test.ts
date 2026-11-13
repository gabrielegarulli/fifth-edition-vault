import type { App } from 'obsidian'
import { describe, expect, it } from 'vitest'

import { ATLAS_TEMPLATE_ID, VAULT_SHEET_TEMPLATE_ID } from '../store/atlasMirror'
import { ATLAS_TEMPLATE_PATH, installVaultSheetTemplate, vaultSheetTemplate } from './atlasTemplate'
import { SHEET_FENCE } from './sheetFenceName'

/** Just the vault calls the installer makes, over a map of path → text. */
function fakeApp(files: Record<string, string> = {}, folders: string[] = []) {
  const file = new Map(Object.entries(files))
  const folder = new Set(folders)
  const calls: string[] = []
  const vault = {
    getFolderByPath: (p: string) => (folder.has(p) ? { path: p } : null),
    createFolder: async (p: string) => {
      calls.push(`mkdir ${p}`)
      folder.add(p)
    },
    getFileByPath: (p: string) => (file.has(p) ? { path: p } : null),
    create: async (p: string, text: string) => {
      calls.push(`create ${p}`)
      file.set(p, text)
    },
    read: async (f: { path: string }) => file.get(f.path) ?? '',
    modify: async (f: { path: string }, text: string) => {
      calls.push(`modify ${f.path}`)
      file.set(f.path, text)
    },
  }
  return { app: { vault } as unknown as App, file, calls }
}

describe('the vault-sheet template', () => {
  it('is one full-width text block holding our fence, under our fixed id', () => {
    const t = JSON.parse(vaultSheetTemplate()) as {
      format: string
      id: string
      header: { hidden: string[] }
      layout: { maxColumns: number; blocks: { type: string; text: string; field?: string }[] }
    }
    expect(t.format).toBe('atlas-statblock-template')
    expect(t.id).toBe(VAULT_SHEET_TEMPLATE_ID)
    // Atlas refuses an id outside its grammar, and the card says "Template not found".
    expect(t.id).toMatch(ATLAS_TEMPLATE_ID)
    expect(t.layout.maxColumns).toBe(1)
    // Our hit-point panel sits right under the header, so Atlas's HP line is hidden.
    expect(t.header.hidden).toEqual(['level', 'hp', 'description'])
    // No `field`: Atlas draws the block's own text, not a frontmatter key.
    expect(t.layout.blocks).toEqual([{ type: 'text', text: '```' + SHEET_FENCE + '\n```' }])
  })

  it('creates the folders and the file in a vault without Atlas data', async () => {
    const { app, file, calls } = fakeApp()
    expect(await installVaultSheetTemplate(app)).toBe('created')
    expect(calls).toEqual(['mkdir atlas-vtt', 'mkdir atlas-vtt/statblock-templates', `create ${ATLAS_TEMPLATE_PATH}`])
    expect(file.get(ATLAS_TEMPLATE_PATH)).toBe(vaultSheetTemplate())
  })

  it('writes nothing when the file is already current, and updates a stale one', async () => {
    const folders = ['atlas-vtt', 'atlas-vtt/statblock-templates']
    const current = fakeApp({ [ATLAS_TEMPLATE_PATH]: vaultSheetTemplate() }, folders)
    expect(await installVaultSheetTemplate(current.app)).toBe('unchanged')
    expect(current.calls).toEqual([])

    const stale = fakeApp({ [ATLAS_TEMPLATE_PATH]: '{}' }, folders)
    expect(await installVaultSheetTemplate(stale.app)).toBe('updated')
    expect(stale.calls).toEqual([`modify ${ATLAS_TEMPLATE_PATH}`])
  })
})
