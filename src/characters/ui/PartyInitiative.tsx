import { Notice } from 'obsidian'

import { initiativeOrder, type RosterEntry, fmtMod } from '../../characterModel'
import { useRoll } from '../../dice/host'

/**
 * Rolls initiative for everyone into the scene and reports the turn order.
 *
 * **It went through the engine in MYDND-16.** It used to call `rollInScene`
 * directly — the documented reason being that it is "the one roll that needs
 * each *result* back", which `useRoll` could not then give it. That was true and
 * it cost the whole engine: no roll log, no advantage, no reveal wait, no
 * intervention, and no fallback when no scene was open (it refused instead).
 * `roll()` returns its outcome now, so the workaround has no reason to exist and
 * `rollInScene` has no caller outside `src/dice/`.
 *
 * What changed behaviourally: with no scene open this **rolls locally** and says
 * so, where before it declined. An initiative order the GM can use beats a
 * refusal, and the log marks every local roll.
 *
 * Shared by the roster and the party board since MYDND-90.
 */
export function PartyInitiativeButton({ entries }: { entries: RosterEntry[] }) {
  const roll = useRoll()

  const run = async (): Promise<void> => {
    const withInitiative = entries.filter(e => typeof e.sheet?.initiative === 'number')
    if (withInitiative.length === 0) {
      new Notice('No character has an initiative modifier to roll.')
      return
    }

    const results: { name: string; total: number; modifier: number }[] = []
    // Sequential: each roll throws physical dice into the scene, and six at
    // once is one unreadable pile.
    for (const entry of withInitiative) {
      const modifier = entry.sheet?.initiative as number
      const outcome = await roll(
        fmtMod(modifier),
        `${entry.name} — Initiative`,
        { name: entry.name, notePath: entry.path },
        undefined,
        'initiative',
      )
      if (outcome) results.push({ name: entry.name, total: outcome.total, modifier })
    }

    if (results.length === 0) {
      new Notice('Nothing rolled — check the dice bridge.')
      return
    }
    const order = initiativeOrder(results)
      .map((r, i) => `${i + 1}. ${r.name} ${r.total}`)
      .join('\n')
    new Notice(`Initiative\n${order}`, 15000)
  }

  return (
    <button type="button" className="bst-plain bst-btn-primary bst-btn-primary--orange" onClick={() => void run()}>
      Roll party initiative
    </button>
  )
}
