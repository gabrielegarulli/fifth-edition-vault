import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { mergeNoteFolders, type NoteFoldersSettings } from '../../../platform/model/folders'
import { MemoryVault } from '../../../platform/store/__fixtures__/memoryVault'
import { packSrdNotes, SRD_FOLDERS } from '../../../../scripts/srd-pack.mjs'
import { bodyHash, decideSrdWrite, inflateSrdArchive, seedSrdNotes, type SrdArchive } from './seed'

/**
 * The seeder (MYDND-185). The stamp is computed here with `node:crypto`, the
 * way the mcp-server's `noteGuard.ts` computes it, so the Web Crypto port is
 * checked against an implementation it does not share.
 */
const nodeHash = (body: string) =>
  `sha256-${crypto.createHash('sha256').update(body.replace(/\r\n/g, '\n').trimEnd()).digest('hex').slice(0, 12)}`

/** A note as the exporter writes one: frontmatter, its body's stamp, the body. */
function exported(title: string, body: string): string {
  return `---\ntitle: ${title}\nsource: SRD 5.2.1\nexport_hash: ${nodeHash(body)}\n---\n${body}`
}

const BARBARIAN_BODY = '\n# Barbarian\n\n- [[barbarian-path-of-the-berserker|Path of the Berserker]]\n'
const RAGE_BODY = '\n# Rage\n\nA feature of the [[classes/barbarian|Barbarian]].\n'

const base = (Name: string, folder: string) =>
  `filters:\n  and:\n    - file.ext == "md"\n    - file.inFolder("SRD 5.2.1/${folder}")\nviews:\n  - type: table\n    name: All ${Name}\n`

const ARCHIVE: SrdArchive = {
  notes: [
    { folder: 'classes', name: 'barbarian.md', text: exported('Barbarian', BARBARIAN_BODY) },
    { folder: 'variant-rules', name: 'rage.md', text: exported('Rage', RAGE_BODY) },
    { folder: 'spells', name: 'fireball.md', text: exported('Fireball', '\n# Fireball\n') },
  ],
  bases: [
    { folder: 'classes', name: 'Classes.base', text: base('Classes', 'classes') },
    { folder: 'spells', name: 'Spells.base', text: base('Spells', 'spells') },
  ],
}

const SRD: NoteFoldersSettings = mergeNoteFolders({ rulesRoot: 'SRD 5.2.1' })

describe('the stamp', () => {
  it('is noteGuard.ts’s hash, to the character', async () => {
    for (const body of [BARBARIAN_BODY, RAGE_BODY, 'a\r\nb  \r\n\r\n', '']) {
      expect(await bodyHash(body)).toBe(nodeHash(body))
    }
  })
})

describe('seedSrdNotes', () => {
  it('writes every note and base into SRD 5.2.1 on a fresh vault', async () => {
    const vault = new MemoryVault()
    const report = await seedSrdNotes(vault, ARCHIVE, SRD)

    expect(report).toEqual({ created: 5, updated: 0, unchanged: 0, preserved: [] })
    expect([...vault.files.keys()].sort()).toEqual([
      'SRD 5.2.1/Classes.base',
      'SRD 5.2.1/Spells.base',
      'SRD 5.2.1/classes/barbarian.md',
      'SRD 5.2.1/spells/fireball.md',
      'SRD 5.2.1/variant-rules/rage.md',
    ])
    // The default layout is the export's own: nothing is rewritten.
    expect(vault.files.get('SRD 5.2.1/variant-rules/rage.md')).toBe(ARCHIVE.notes[1].text)
    expect(vault.files.get('SRD 5.2.1/Classes.base')).toContain('file.inFolder("SRD 5.2.1/classes")')
  })

  it('puts each folder where its override says, and rewrites the bases and the class links to match', async () => {
    const folders = mergeNoteFolders({ rulesRoot: '', overrides: { classes: 'Rules/Character Classes', spells: 'Magic/Spells' } })
    const vault = new MemoryVault()
    await seedSrdNotes(vault, ARCHIVE, folders)

    expect(vault.files.has('Rules/Character Classes/barbarian.md')).toBe(true)
    expect(vault.files.has('Magic/Spells/fireball.md')).toBe(true)
    expect(vault.files.has('variant-rules/rage.md')).toBe(true)
    // No rules folder: the bases are at the top of the vault.
    expect(vault.files.get('Classes.base')).toContain('file.inFolder("Rules/Character Classes")')
    expect(vault.files.get('Spells.base')).toContain('file.inFolder("Magic/Spells")')

    const rage = vault.files.get('variant-rules/rage.md') ?? ''
    expect(rage).toContain('[[Rules/Character Classes/barbarian|Barbarian]]')
    expect(rage).not.toContain('[[classes/')
    // Restamped, so the plugin's own rewrite is not mistaken for an edit.
    const body = rage.slice(rage.indexOf('---\n', 4) + 4)
    expect(rage).toContain(`export_hash: ${nodeHash(body)}`)
    // A bare link names no folder and is left alone.
    expect(vault.files.get('Rules/Character Classes/barbarian.md')).toBe(ARCHIVE.notes[0].text)
  })

  it('leaves a class link alone when the classes folder still ends in classes', async () => {
    const vault = new MemoryVault()
    await seedSrdNotes(vault, ARCHIVE, mergeNoteFolders({ rulesRoot: 'D&D' }))
    expect(vault.files.get('D&D/variant-rules/rage.md')).toBe(ARCHIVE.notes[1].text)
  })

  it('writes nothing on a second run over the same vault, custom layout included', async () => {
    const folders = mergeNoteFolders({ overrides: { classes: 'Classes Elsewhere' } })
    const vault = new MemoryVault()
    await seedSrdNotes(vault, ARCHIVE, folders)
    const writes = vault.writes.length

    const again = await seedSrdNotes(vault, ARCHIVE, folders)
    expect(again).toEqual({ created: 0, updated: 0, unchanged: 5, preserved: [] })
    expect(vault.writes.length).toBe(writes)
  })

  it('never overwrites a note the user edited, nor one that is theirs', async () => {
    const vault = new MemoryVault()
    await seedSrdNotes(vault, ARCHIVE, SRD)
    const edited = `${vault.files.get('SRD 5.2.1/spells/fireball.md')}\nMy table rules it does 10d6.\n`
    vault.files.set('SRD 5.2.1/spells/fireball.md', edited)
    vault.files.set('SRD 5.2.1/classes/barbarian.md', '# My own barbarian\n')
    vault.files.set('SRD 5.2.1/Spells.base', 'views: []\n')

    const newer: SrdArchive = {
      ...ARCHIVE,
      notes: ARCHIVE.notes.map(n => ({ ...n, text: exported(n.name, `${split(n.text)}\nErrata.\n`) })),
    }
    const report = await seedSrdNotes(vault, newer, SRD)

    expect(report.preserved.sort()).toEqual([
      'SRD 5.2.1/Spells.base',
      'SRD 5.2.1/classes/barbarian.md',
      'SRD 5.2.1/spells/fireball.md',
    ])
    expect(vault.files.get('SRD 5.2.1/spells/fireball.md')).toBe(edited)
    expect(vault.files.get('SRD 5.2.1/classes/barbarian.md')).toBe('# My own barbarian\n')
    // The note nobody touched takes the errata.
    expect(report.updated).toBe(1)
    expect(vault.files.get('SRD 5.2.1/variant-rules/rage.md')).toContain('Errata.')
  })

  it('leaves an unedited note alone when only its frontmatter differs', async () => {
    const vault = new MemoryVault()
    await seedSrdNotes(vault, ARCHIVE, SRD)
    const path = 'SRD 5.2.1/spells/fireball.md'
    const retagged = (vault.files.get(path) ?? '').replace('source: SRD 5.2.1', 'source: "SRD 5.2.1"\ntags: [mine]')
    vault.files.set(path, retagged)

    const report = await seedSrdNotes(vault, ARCHIVE, SRD)
    expect(report.unchanged).toBe(5)
    expect(vault.files.get(path)).toBe(retagged)
  })

  it('writes over nothing that changed between the read and the write', async () => {
    const vault = new MemoryVault()
    const write = vault.write.bind(vault)
    vault.write = (p, transform) => {
      if (p.endsWith('fireball.md')) vault.files.set(p, 'typed in the meantime')
      return write(p, transform)
    }
    const report = await seedSrdNotes(vault, ARCHIVE, SRD)
    expect(report.preserved).toEqual(['SRD 5.2.1/spells/fireball.md'])
    expect(vault.files.get('SRD 5.2.1/spells/fireball.md')).toBe('typed in the meantime')
  })
})

describe('decideSrdWrite', () => {
  it('calls a note with frontmatter it cannot read the user’s', async () => {
    const outcome = await decideSrdWrite('---\n: [\n---\nbody\n', { path: 'x.md', text: ARCHIVE.notes[2].text, kind: 'note' })
    expect(outcome).toBe('preserved')
  })
})

describe('the archive', () => {
  it('round-trips through srd-pack.mjs and DecompressionStream', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'srd-pack-'))
    try {
      for (const folder of SRD_FOLDERS) {
        fs.mkdirSync(path.join(dir, folder))
        fs.writeFileSync(path.join(dir, folder, `${folder}-one.md`), exported(folder, `\n# ${folder} ✓ ō\n`))
        const Name = folder.replace(/(^|-)(.)/g, (_m, _d, c: string) => c.toUpperCase())
        fs.writeFileSync(path.join(dir, `${Name}.base`), base(Name, folder))
      }
      const packed = packSrdNotes(dir)
      expect(packed).toMatchObject({ notes: 12, bases: 12 })

      const archive = await inflateSrdArchive(packed.data)
      expect(archive.notes).toHaveLength(12)
      expect(archive.notes.find(n => n.folder === 'magic-items')?.text).toContain('# magic-items ✓ ō')
      expect(archive.bases.map(b => b.folder).sort()).toEqual([...SRD_FOLDERS].sort())
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('refuses an archive that is not the pack’s shape', async () => {
    const { deflateRawSync } = await import('node:zlib')
    const bad = deflateRawSync(Buffer.from(JSON.stringify({ notes: [{ folder: 'nope', name: 'a.md', text: '' }], bases: [] }))).toString('base64')
    await expect(inflateSrdArchive(bad)).rejects.toThrow(/not the shape/)
  })
})

/** A note's body: what follows its frontmatter. */
function split(text: string): string {
  return text.slice(text.indexOf('---\n', 4) + 4)
}
