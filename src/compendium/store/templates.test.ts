import { describe, expect, it } from 'vitest'

import { DEFAULT_NOTE_FOLDERS } from '../../platform/model/folders'
import { MemoryVault } from '../../platform/store/__fixtures__/memoryVault'
import { planHomebrewTemplates } from '../model/homebrewTemplates'
import { describeTemplatesReport, writeHomebrewTemplates } from './templates'

/** The templates' writer (MYDND-236): created where missing, never over a file that is there. */

const SUBCLASS = 'Templates/Homebrew subclass (full).md'

describe('writeHomebrewTemplates', () => {
  it('writes all twenty-one into an empty folder, one write each', async () => {
    const vault = new MemoryVault()
    const report = await writeHomebrewTemplates(vault, 'Templates', DEFAULT_NOTE_FOLDERS)
    expect(report).toEqual({ folder: 'Templates', created: 21, unchanged: 0, preserved: [] })
    expect(vault.writes).toHaveLength(21)
    expect(vault.files.get(SUBCLASS)).toContain('title: "{{title}}"')
  })

  it('run again, touches nothing', async () => {
    const vault = new MemoryVault()
    await writeHomebrewTemplates(vault, 'Templates', DEFAULT_NOTE_FOLDERS)
    vault.writes.length = 0
    const report = await writeHomebrewTemplates(vault, 'Templates', DEFAULT_NOTE_FOLDERS)
    expect(report).toMatchObject({ created: 0, unchanged: 21, preserved: [] })
    expect(vault.writes).toEqual([])
  })

  it('counts a CRLF copy of the same text as unchanged', async () => {
    const plan = planHomebrewTemplates('Templates')
    const vault = new MemoryVault({ [plan[0].path]: plan[0].text.replace(/\n/g, '\r\n') })
    const report = await writeHomebrewTemplates(vault, 'Templates', DEFAULT_NOTE_FOLDERS)
    expect(report).toMatchObject({ created: 20, unchanged: 1 })
  })

  it("never writes over a file that is there: an edited template is the user's", async () => {
    const mine = '---\ntitle: "{{title}}"\n---\n\n# My own subclass shape\n'
    const vault = new MemoryVault({ [SUBCLASS]: mine })
    const report = await writeHomebrewTemplates(vault, 'Templates', DEFAULT_NOTE_FOLDERS)
    expect(report).toMatchObject({ created: 20, preserved: [SUBCLASS] })
    expect(vault.files.get(SUBCLASS)).toBe(mine)
    expect(vault.writes).not.toContain(SUBCLASS)
  })

  it('leaves a file that appears between the read and the write', async () => {
    const vault = new MemoryVault()
    const write = vault.write.bind(vault)
    vault.write = async (path, transform) => {
      if (path === SUBCLASS) vault.files.set(path, 'someone else\n')
      return write(path, transform)
    }
    const report = await writeHomebrewTemplates(vault, 'Templates', DEFAULT_NOTE_FOLDERS)
    expect(report.preserved).toEqual([SUBCLASS])
    expect(vault.files.get(SUBCLASS)).toBe('someone else\n')
  })

  it('refuses a folder a catalog reads, and writes nothing', async () => {
    const vault = new MemoryVault()
    await expect(writeHomebrewTemplates(vault, 'Homebrew/Templates', DEFAULT_NOTE_FOLDERS)).rejects.toThrow(/homebrew folder/)
    await expect(writeHomebrewTemplates(vault, 'spells', DEFAULT_NOTE_FOLDERS)).rejects.toThrow(/rules folder/)
    expect(vault.writes).toEqual([])
  })

  it('says what it did in one line', () => {
    expect(describeTemplatesReport({ folder: 'Templates', created: 19, unchanged: 0, preserved: ['x'] })).toBe(
      'Homebrew templates in "Templates": 19 created, 0 already there, 1 left alone because a different file is at that name.',
    )
  })
})
