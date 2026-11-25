import { describe, expect, it } from 'vitest'

import { MemoryVault } from '../../platform/store/__fixtures__/memoryVault'
import type { NamedRow } from '../model/destination'
import { createImportedNotes, type ImportedNoteRequest, type ImportedNotesInput, PLACEHOLDER_BENEFIT } from './imported'

/**
 * A conversion's missing notes, written on its save (MYDND-273): each through
 * a builder's own checks and its one write, into `Imported from D&D Beyond`,
 * never half-written, and never over a name the catalog already has.
 */

const DIR = 'Homebrew/Imported from D&D Beyond'

const input = (over: Partial<ImportedNotesInput> = {}): ImportedNotesInput => ({
  homebrewFolder: 'Homebrew',
  source: kind => (kind === 'spell' ? 'My Spellbook' : 'Homebrew'),
  rows: () => [],
  ...over,
})

const requests: ImportedNoteRequest[] = [
  { kind: 'feat', prefill: { name: 'Lucky Streak' } },
  { kind: 'spell', prefill: { name: 'Witch Bolt', level: '1', school: 'evocation' } },
  { kind: 'item', prefill: { name: 'Fancy Hat', costGp: '5' } },
  { kind: 'magic-item', prefill: { name: 'Wand of Smiles', rarity: 'rare', requiresAttunement: 'true', weight: '1' } },
]

describe('createImportedNotes', () => {
  it('writes one note per request, read back at its real path', async () => {
    const vault = new MemoryVault()
    const out = await createImportedNotes(vault, input(), requests)

    expect(out.map(o => o.outcome)).toEqual(['created', 'created', 'created', 'created'])
    expect(vault.writes).toEqual([
      `${DIR}/lucky-streak.md`,
      `${DIR}/witch-bolt.md`,
      `${DIR}/fancy-hat.md`,
      `${DIR}/wand-of-smiles.md`,
    ])
    for (const o of out) {
      if (o.outcome !== 'created') throw new Error(o.outcome)
      expect(o.row.path).toBe(o.path)
      expect(o.row.name).toBe(o.name)
    }
    const spell = out[1]
    if (spell.outcome !== 'created' || spell.kind !== 'spell') throw new Error('spell')
    expect(spell.row.level).toBe(1)
    expect(spell.row.school).toBe('Evocation')
    expect(spell.row.source).toBe('My Spellbook')
    const wand = out[3]
    if (wand.outcome !== 'created' || wand.kind !== 'magic-item') throw new Error('wand')
    expect(wand.row.rarity).toBe('rare')
    expect(wand.row.requiresAttunement).toBe(true)
    expect(vault.files.get(`${DIR}/lucky-streak.md`)).not.toContain('export_hash')
  })

  it('gives a feat shell one placeholder benefit, which the builder needs', async () => {
    const vault = new MemoryVault()
    await createImportedNotes(vault, input(), [requests[0]])
    const text = vault.files.get(`${DIR}/lucky-streak.md`) ?? ''
    expect(text).toContain(PLACEHOLDER_BENEFIT)
  })

  it('refuses a note whose file is already there, leaves it, and writes the others', async () => {
    const vault = new MemoryVault({ [`${DIR}/witch-bolt.md`]: 'mine' })
    const out = await createImportedNotes(vault, input(), requests)

    expect(out[1]).toMatchObject({ outcome: 'refused', name: 'Witch Bolt', reason: expect.stringMatching(/A file is already at/) })
    expect(vault.files.get(`${DIR}/witch-bolt.md`)).toBe('mine')
    expect(out.filter(o => o.outcome === 'created')).toHaveLength(3)
  })

  it('writes nothing for a name the catalog has, and answers its row', async () => {
    const vault = new MemoryVault()
    const hat: NamedRow = { id: 'fancy-hat', name: 'Fancy hat', path: 'items/fancy-hat.md' }
    const byTitle: NamedRow = { id: 'smiles-wand', name: 'Wand of Smiles', path: 'magic-items/smiles-wand.md' }
    const out = await createImportedNotes(
      vault,
      input({ rows: kind => (kind === 'item' ? [hat] : kind === 'magic-item' ? [byTitle] : []) }),
      requests,
    )
    expect(out[2]).toEqual({ kind: 'item', name: 'Fancy Hat', outcome: 'matched', row: hat })
    expect(out[3]).toEqual({ kind: 'magic-item', name: 'Wand of Smiles', outcome: 'matched', row: byTitle })
    expect(vault.writes).toEqual([`${DIR}/lucky-streak.md`, `${DIR}/witch-bolt.md`])
  })

  it('refuses every note where no homebrew folder is set', async () => {
    const vault = new MemoryVault()
    const out = await createImportedNotes(vault, input({ homebrewFolder: '' }), requests)
    expect(out.every(o => o.outcome === 'refused')).toBe(true)
    expect(vault.writes).toEqual([])
  })

  it('refuses a note its form would refuse, and writes nothing for it', async () => {
    const vault = new MemoryVault()
    const out = await createImportedNotes(vault, input(), [{ kind: 'spell', prefill: { name: '!!!' } }])
    expect(out[0]).toMatchObject({ outcome: 'refused', reason: expect.stringMatching(/letter or digit/) })
    expect(vault.writes).toEqual([])
  })
})
