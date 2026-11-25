import { describe, expect, it } from 'vitest'

import { MemoryVault } from '../../platform/store/__fixtures__/memoryVault'
import { nameClash, notePath, subfolderProblem, suggestName } from '../model/destination'
import { slugOf } from '../model/emit'
import { createHomebrewNote } from './create'

/**
 * The builders' one write (MYDND-233, ADR 0014): a new file, under the
 * homebrew folder, never over anything.
 */
describe('createHomebrewNote', () => {
  it('writes a new note in one write', async () => {
    const vault = new MemoryVault()
    await createHomebrewNote(vault, 'Homebrew/Feats/hearthbound-resolve.md', '---\ntitle: "Hearthbound Resolve"\n---\n')
    expect(vault.writes).toEqual(['Homebrew/Feats/hearthbound-resolve.md'])
    expect(vault.files.get('Homebrew/Feats/hearthbound-resolve.md')).toContain('Hearthbound Resolve')
  })

  it('refuses a taken name, and leaves the note there as it was', async () => {
    const vault = new MemoryVault({ 'Homebrew/Feats/alert.md': 'mine' })
    await expect(createHomebrewNote(vault, 'Homebrew/Feats/alert.md', 'new')).rejects.toThrow(
      /A file is already at Homebrew\/Feats\/alert\.md\. A builder never writes over a note/,
    )
    expect(vault.files.get('Homebrew/Feats/alert.md')).toBe('mine')
    expect(vault.writes).toEqual([])
  })

  it('refuses an empty file too: it is still a file', async () => {
    const vault = new MemoryVault({ 'Homebrew/x.md': '' })
    await expect(createHomebrewNote(vault, 'Homebrew/x.md', 'new')).rejects.toThrow(/already at/)
  })

  it('refuses a file that appears between the read and the write, and keeps it', async () => {
    const vault = new MemoryVault()
    const write = vault.write.bind(vault)
    vault.write = async (path, transform) => {
      vault.files.set(path, 'synced in meanwhile')
      return write(path, transform)
    }
    await expect(createHomebrewNote(vault, 'Homebrew/x.md', 'new')).rejects.toThrow(/already at/)
    expect(vault.files.get('Homebrew/x.md')).toBe('synced in meanwhile')
  })
})

describe('where the note goes', () => {
  it('is a subfolder of the homebrew folder, or the folder itself', () => {
    expect(notePath('Homebrew', 'Feats', 'a.md')).toBe('Homebrew/Feats/a.md')
    expect(notePath('My Stuff/', ' Feats/Origin/ ', 'a.md')).toBe('My Stuff/Feats/Origin/a.md')
    expect(notePath('Homebrew', '', 'a.md')).toBe('Homebrew/a.md')
  })

  it('never steps out of it', () => {
    expect(subfolderProblem('Feats')).toBeNull()
    expect(subfolderProblem('')).toBeNull()
    expect(subfolderProblem('../spells')).toMatch(/cannot step out/)
    expect(subfolderProblem('Feats/./x')).toMatch(/cannot step out/)
    expect(subfolderProblem('/spells')).toMatch(/without a leading slash/)
    expect(subfolderProblem('Feats?')).toMatch(/not a folder name/)
    expect(subfolderProblem('.hidden')).toMatch(/not a folder name/)
  })
})

describe('a name already in the catalog', () => {
  const rows = [
    { id: 'alert', name: 'Alert', path: 'feats/alert.md' },
    { id: 'tough', name: "Kitsune's Blessing", path: 'feats/kitsunes-blessing.md' },
  ]

  it('is found by slug, or by title with the quotes folded', () => {
    expect(nameClash(rows, 'alert', 'Alert')?.path).toBe('feats/alert.md')
    expect(nameClash(rows, 'kitsune-s-blessing', 'Kitsune’s Blessing')?.path).toBe('feats/kitsunes-blessing.md')
    expect(nameClash(rows, 'hearthbound-resolve', 'Hearthbound Resolve')).toBeNull()
  })

  it('has a free name offered instead', () => {
    expect(suggestName(rows, 'Alert', slugOf)).toBe('Alert (Homebrew)')
    expect(suggestName([...rows, { id: 'alert-homebrew', name: 'Alert (Homebrew)', path: 'x' }], 'Alert', slugOf)).toBe('Alert (Homebrew 2)')
  })
})
