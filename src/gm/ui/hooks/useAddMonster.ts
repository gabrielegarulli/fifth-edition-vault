import { useCallback } from 'react'
import { fmtMod } from '@vault/derive/dnd5e.js'

import { initiativeMod } from '../../../catalogs'
import { useCompendium } from '../../../compendium/host'
import type { MonsterRow } from '../../../compendium'
import { useRoll } from '../../../dice/host'
import { addToEncounter, type EncounterState } from '../../store/encounter'
import type { MonsterEncounter } from '../../../catalogs/host'
import { usePlatform } from '../../../platform/host'
import { useEncounter } from './useGm'

/**
 * Put one monster in the encounter, the way `/gm/encounter` always has — now
 * also from the Bestiary's "Add to an encounter…" and its encounter lens
 * (MYDND-64), which is why it left `GmEncounterPage` for a hook. Two copies of
 * this would drift on exactly the parts that took a ticket each to get right.
 *
 * - **One detail read per monster**, because hit points and AC are written in
 *   the `statblock` fence. Frontmatter carries them too since MYDND-64, but a
 *   note exported before that does not, and the fence is the record either way.
 * - **Initiative is rolled in the scene** (MYDND-16), with the modifier taken
 *   off the fence's `"+7 (17)"` by `initiativeMod` — the bracketed number is the
 *   passive score and must not be mistaken for it. A monster used to arrive with
 *   none and sit at the bottom of the order until somebody typed one.
 *
 * `update` is `useEncounter().update`, passed in so a page that already holds
 * the encounter does not open a second read of it.
 */
export function useAddMonster(update: (transform: (s: EncounterState) => EncounterState) => void) {
  const { monsters } = useCompendium()
  const roll = useRoll()

  return useCallback(
    async (m: Pick<MonsterRow, 'id' | 'name' | 'path'>): Promise<void> => {
      const detail = await monsters.detail(m.id)
      const fence = detail?.fence ?? null
      const hp = Number(fence?.hp)
      const ac = Number(fence?.ac)
      const dexMod = initiativeMod(fence?.initiative) ?? 0
      const outcome = await roll(
        fmtMod(dexMod),
        `${m.name} — Initiative`,
        { name: m.name, notePath: m.path },
        undefined,
        'initiative',
      )
      update(s =>
        addToEncounter(s, [
          {
            monsterId: m.id,
            name: m.name,
            kind: 'monster',
            dexMod,
            // Null when there was no scene to roll in: "leave it for the GM",
            // which a 0 would be indistinguishable from.
            initiative: outcome ? outcome.total : null,
            hp: Number.isFinite(hp) ? hp : 0,
            maxHp: Number.isFinite(hp) ? hp : 0,
            ac: Number.isFinite(ac) ? ac : null,
          },
        ]),
      )
    },
    [monsters, roll, update],
  )
}

/**
 * The bestiary's "Add to an encounter" (MYDND-64), as the slot the catalogs
 * draw it through (`catalogs/ui/context.tsx`, MYDND-200). gm's, because it
 * reads and writes the encounter; `app` hands it to `CatalogsProvider`.
 *
 * `null` with no monster open, or no active campaign — an encounter lives in
 * one — which the detail pane says in so many words.
 */
export function useMonsterEncounter(monster: MonsterRow | null): MonsterEncounter | null {
  const { activeCampaignId } = usePlatform()
  const { encounter, busy, update } = useEncounter()
  const addMonster = useAddMonster(update)
  if (!monster || !activeCampaignId) return null
  const count = encounter.combatants.filter(c => c.kind === 'monster' && c.monsterId === monster.id).length
  return { add: () => addMonster(monster), count, busy }
}
