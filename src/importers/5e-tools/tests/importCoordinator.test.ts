import { describe, expect, it, vi } from 'vitest'
import { FiveEToolsImportCoordinator, type ImportProgress } from '../importCoordinator'
import type { VaultAdapter } from '../fileHandler'
import type { WritableVault } from '../importers/entityImporter'

class Adapter implements VaultAdapter {
  async exists(path: string): Promise<boolean> {
    return path === 'spells.json'
  }
  async list(): Promise<{ files: string[]; folders: string[] }> {
    return { files: [], folders: [] }
  }
  async read(): Promise<string> {
    return '{"spell":[{"name":"Light","level":0}]}'
  }
}

class WritableAdapter extends Adapter implements WritableVault {
  readonly created: string[] = []
  async exists(path: string): Promise<boolean> {
    return path === 'spells.json'
  }
  async create(path: string): Promise<void> {
    this.created.push(path)
  }
}

describe('5etools import pipeline', () => {
  it('reads and counts records without writing files', async () => {
    const notices: string[] = []
    const report = await new FiveEToolsImportCoordinator(new Adapter(), message => notices.push(message)).import('spells.json', 'spells')

    expect(report).toEqual({ files: 1, records: 1, imported: 0, skipped: 0 })
    expect(notices).toEqual(['5etools import: 0 notes written, from 1 JSON file.'])
  })

  it('emits no progress updates for a read-only adapter', async () => {
    const progress: ImportProgress[] = []
    const notices: string[] = []
    await new FiveEToolsImportCoordinator(new Adapter(), message => notices.push(message)).import(
      'spells.json',
      'spells',
      p => progress.push(p),
    )

    expect(progress).toEqual([])
    expect(notices).toEqual(['5etools import: 0 notes written, from 1 JSON file.'])
  })

  it('emits per-file progress updates for a writable adapter and only overall notice at the end', async () => {
    const progress: ImportProgress[] = []
    const notices: string[] = []
    const adapter = new WritableAdapter()
    await new FiveEToolsImportCoordinator(adapter, message => notices.push(message)).import(
      'spells.json',
      'spells',
      p => progress.push(p),
    )

    expect(progress).toEqual([
      { file: 'spells.json', current: 0, total: 1 },
      { file: 'spells.json', current: 1, total: 1 },
    ])
    expect(notices).toEqual(['5etools import: 1 note written, from 1 JSON file.'])
  })

  it('reports what it wrote and what it skipped: an SRD 5.2.1 record, and a name whose note exists', async () => {
    const files: Record<string, string> = {
      'spells.json': JSON.stringify({
        spell: [
          { name: 'Light', level: 0, source: 'XPHB' },
          { name: 'Fire Bolt', level: 0, source: 'XPHB', srd52: true },
          { name: 'Mage Hand', level: 0, source: 'XPHB' },
        ],
      }),
      'Homebrew/5etools/spells/mage-hand.md': '',
    }
    const created: string[] = []
    const adapter: WritableVault = {
      exists: async path => path in files,
      list: async () => ({ files: [], folders: [] }),
      read: async path => files[path],
      create: async path => {
        created.push(path)
      },
    }
    const notices: string[] = []

    const report = await new FiveEToolsImportCoordinator(adapter, message => notices.push(message)).import('spells.json', 'spells')

    expect(report).toEqual({ files: 1, records: 3, imported: 1, skipped: 2 })
    expect(created).toEqual(['Homebrew/5etools/spells/light.md'])
    expect(notices).toEqual([
      '5etools import: 1 note written, 2 records skipped (in SRD 5.2.1, or a note of that name already exists), from 1 JSON file.',
    ])
  })

  it('reads each file only once during import and skips unrecognized folder JSON', async () => {
    const files: Record<string, string> = {
      'data/spells.json': '{"spell":[{"name":"Light","level":0}]}',
      'data/fluff.json': '{"fluff":[{"name":"Ignore"}]}',
    }
    const created: string[] = []
    const adapter: WritableVault = {
      exists: async path => path === 'data' || path in files,
      list: async () => ({ files: Object.keys(files), folders: [] }),
      read: async path => files[path],
      create: async path => {
        created.push(path)
      },
    }
    const readSpy = vi.spyOn(adapter, 'read')

    const report = await new FiveEToolsImportCoordinator(adapter).import('data')

    expect(report).toEqual({ files: 1, records: 1, imported: 1, skipped: 0 })
    expect(created).toEqual(['Homebrew/5etools/spells/light.md'])
    expect(readSpy).toHaveBeenCalledTimes(2)
    expect(readSpy).toHaveBeenNthCalledWith(1, 'data/spells.json')
    expect(readSpy).toHaveBeenNthCalledWith(2, 'data/fluff.json')
  })
})
