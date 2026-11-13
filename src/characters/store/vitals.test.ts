import { describe, expect, it } from 'vitest'

import type { Sheet } from '../../characterModel/model/sheet/sheet'
import { addXp, heal, takeDamage } from '../../characterModel/model/vitals'
import { projectVitals } from '../../characterModel/model/vitalsProjection'
import { MemoryVault } from '../../platform/store/__fixtures__/memoryVault'
import { createVitals } from './vitals'

// The store's half of the vitals suite; the pure half, every transform it
// applies, is `characterModel/model/vitals.test.ts` (MYDND-200).

const sheet = (over: Partial<Sheet> = {}): Sheet =>
  ({
    version: 1,
    name: 'Gibbs',
    ddb_id: '1',
    race: null,
    classes: 'Rogue 5',
    level: 5,
    proficiency_bonus: 3,
    ac: 15,
    hp: { current: 40, max: 40, temp: 0 },
    speed: 30,
    initiative: 4,
    hit_dice: [{ label: 'Rogue', formula: '5d8' }],
    abilities: [],
    saves: [],
    skills: [],
    passives: { perception: 10, insight: 10, investigation: 10 },
    spellcasting: null,
    attacks: [],
    feature_dice: [],
    spells: [],
    avatar: null,
    subclasses: [],
    ...over,
  }) as Sheet

describe('the handover from the imported sheet, through the store', () => {
  const imported = sheet({ hp: { current: 94, max: 101, temp: 3 } })

  it('seeds through the store, so the first damage does not silently heal', async () => {
    const note = [
      '```charsheet',
      'name: Gibbs',
      'hp:',
      '  current: 94',
      '  max: 101',
      '  temp: 0',
      '```',
    ].join('\n')
    const vault = new MemoryVault({ 'characters/Gibbs.md': note })
    const store = createVitals(vault, () => imported, () => new Date('2026-10-07T00:00:00.000Z'))

    const after = await store.mutate('characters/Gibbs.md', (v, s) => takeDamage(v, s?.hp?.max ?? null, 5))

    // Seeded at 7 damage and 3 temp, so 5 incoming spends the temp and 2 gets
    // through: 9 damage, 92 of 101, temp gone. **Not** 101 → 96, which is what
    // an unseeded overlay would have reported — it would have healed the seven
    // points the import knew about and kept the temp it had just spent.
    expect(after.damage).toBe(9)
    expect(after.temp).toBe(0)
    expect(projectVitals(imported, after).hp).toEqual({ current: 92, max: 101, temp: 0 })
  })
})

describe('createVitals', () => {
  it('spends one file write per mutation', async () => {
    const vault = new MemoryVault({ 'characters/Gibbs.md': '' })
    const store = createVitals(vault, () => sheet(), () => new Date('2026-10-07T00:00:00.000Z'))

    await store.mutate('characters/Gibbs.md', v => takeDamage(v, 40, 6))
    expect(vault.writes).toEqual(['characters/Gibbs.md'])

    await store.mutate('characters/Gibbs.md', v => heal(v, 2))
    expect(vault.writes).toHaveLength(2)
    expect((await store.read('characters/Gibbs.md')).damage).toBe(4)
  })

  it('hands the transform the sheet out of the same note', async () => {
    const vault = new MemoryVault({ 'characters/Gibbs.md': '' })
    const store = createVitals(vault, () => sheet(), () => new Date('2026-10-07T00:00:00.000Z'))
    const seen: (string | null)[] = []
    await store.mutate('characters/Gibbs.md', (v, s) => {
      seen.push(s?.name ?? null)
      return v
    })
    expect(seen).toEqual(['Gibbs'])
  })

  it('stamps one timestamp, taken outside the transform', async () => {
    // `Vault.process` re-runs the transform if the file changed underneath, so a
    // clock read inside would write a different value than the one reported.
    let calls = 0
    const vault = new MemoryVault({ 'characters/Gibbs.md': '' })
    const store = createVitals(vault, () => sheet(), () => {
      calls += 1
      return new Date('2026-10-07T00:00:00.000Z')
    })
    const result = await store.mutate('characters/Gibbs.md', v => takeDamage(v, 40, 1))
    expect(calls).toBe(1)
    expect(result.updatedAt).toBe('2026-10-07T00:00:00.000Z')
  })

  it('creates the fence in a note that has none', async () => {
    const vault = new MemoryVault()
    const store = createVitals(vault, () => null)
    await store.mutate('characters/New.md', v => addXp(v, 300))
    expect(vault.files.get('characters/New.md')).toContain('```vault-vitals')
    expect((await store.read('characters/New.md')).xp).toBe(300)
  })
})
