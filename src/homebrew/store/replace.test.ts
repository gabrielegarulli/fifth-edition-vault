import { describe, expect, it } from 'vitest'

import { isUnderFolder } from '../../platform'
import { MemoryVault } from '../../platform/store/__fixtures__/memoryVault'
import { replaceHomebrewNote } from './replace'

/**
 * Edit's one write (MYDND-272, ADR 0014 as amended): the note over itself, in
 * one write, only while it is still the note Edit opened.
 */
const PATH = 'Homebrew/Spells/ember-ward.md'

describe('replaceHomebrewNote', () => {
  it('replaces the note in one write', async () => {
    const vault = new MemoryVault({ [PATH]: 'as opened' })
    await replaceHomebrewNote(vault, PATH, 'as opened', 'as edited')
    expect(vault.files.get(PATH)).toBe('as edited')
    expect(vault.writes).toEqual([PATH])
  })

  it('refuses a note changed since it was opened, and leaves the change', async () => {
    const vault = new MemoryVault({ [PATH]: 'changed in Obsidian' })
    await expect(replaceHomebrewNote(vault, PATH, 'as opened', 'as edited')).rejects.toThrow(/changed after it was opened here\. Nothing was saved/)
    expect(vault.files.get(PATH)).toBe('changed in Obsidian')
    expect(vault.writes).toEqual([])
  })

  it('refuses a note changed between the read and the write, and keeps it', async () => {
    const vault = new MemoryVault({ [PATH]: 'as opened' })
    const write = vault.write.bind(vault)
    vault.write = async (path, transform) => {
      vault.files.set(path, 'synced in meanwhile')
      return write(path, transform)
    }
    await expect(replaceHomebrewNote(vault, PATH, 'as opened', 'as edited')).rejects.toThrow(/changed after it was opened/)
    expect(vault.files.get(PATH)).toBe('synced in meanwhile')
  })

  it('refuses a note deleted since, rather than writing it again', async () => {
    const vault = new MemoryVault()
    await expect(replaceHomebrewNote(vault, PATH, 'as opened', 'as edited')).rejects.toThrow(/no longer there\. Nothing was saved/)
    expect(vault.files.has(PATH)).toBe(false)
  })
})

describe('isUnderFolder: where a save may write', () => {
  it('is a note at any depth under the folder, and nothing else', () => {
    expect(isUnderFolder('Homebrew', 'Homebrew/x.md')).toBe(true)
    expect(isUnderFolder('Homebrew/', 'Homebrew/Feats/x.md')).toBe(true)
    expect(isUnderFolder('Homebrew', 'Homebrewery/x.md')).toBe(false)
    expect(isUnderFolder('Homebrew', 'feats/alert.md')).toBe(false)
    expect(isUnderFolder('Homebrew', 'Homebrew/../feats/alert.md')).toBe(false)
    expect(isUnderFolder('', 'Homebrew/x.md')).toBe(false)
  })
})
