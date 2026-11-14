import { useEffect, useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { App as ObsidianApp } from 'obsidian'

import { extractFence } from '../../platform/model/fence'
import type { ResolvedEffect } from '../../compendium/model/featEffects'
import { ObsidianProvider } from '../../platform/obsidian/ObsidianContext'
import { MemoryVault } from '../../platform/store/__fixtures__/memoryVault'
import { LOG_FENCE, parseEntries, type ActivityEntry } from '../../platform/store/activity'
import { createState } from '../../app/model/state'
import { RollProvider, useRollHost, type RollOutcome } from './RollContext'
import { rollActivity, logEntry } from '../model/rollLog'
import { TestProviders } from '../../__harness__/providers'

/**
 * Rolls persist to `/gm/log` (MYDND-27).
 *
 * Through the real provider, the real state layer and a `MemoryVault`, so every
 * assertion is on YAML that was serialised and parsed back — the fence a GM
 * opens is the thing under test, not an object beside it.
 *
 * The rule pinned hardest is **one write per roll**: an intervention changes the
 * roll after it first lands, and writing at first landing would cost a second
 * write and leave two lines that disagree about one attack.
 */

function fakeApp({ atlas = true, faces = [] as number[] } = {}): ObsidianApp {
  const events = { on: () => ({}), offref: () => {} }
  let cursor = 0
  const diceTool = {
    rollDice: (formula: string) => {
      // Atlas' own shape: each die in `rolls`, constants in `modifiers`, and a
      // total that adds both — which is what its popup shows (MYDND-75).
      const rolls: { die: string; value: number }[] = []
      let modifiers = 0
      for (const m of formula.matchAll(/([+-]?)(\d*)d(\d+)|([+-]?\d+)/g)) {
        if (m[3] === undefined) {
          modifiers += parseInt(m[4], 10)
          continue
        }
        for (let i = 0; i < (m[2] ? parseInt(m[2], 10) : 1); i += 1) {
          rolls.push({ die: `d${m[3]}`, value: faces[cursor] ?? 10 })
          cursor += 1
        }
      }
      return { rolls, modifiers, total: rolls.reduce((a, r) => a + r.value, 0) + modifiers }
    },
  }
  const leaf = {
    view: { serviceManager: { getToolController: () => ({ getDiceTool: () => diceTool }) } },
  }
  return {
    workspace: { ...events, openLinkText: () => Promise.resolve(), getLeavesOfType: () => (atlas ? [leaf] : []) },
    vault: { ...events, getFileByPath: () => null, getResourcePath: () => '' },
    metadataCache: { ...events, getFileCache: () => null },
  } as unknown as ObsidianApp
}

/** A Great Weapon Fighting–shaped floor: any 1 or 2 on a damage die counts as 3. */
const FLOOR: ResolvedEffect = {
  type: 'dice_intervention',
  mode: 'floor',
  to: 3,
  source: 'Great Weapon Fighting',
  sourceKind: 'feat',
  sourceFeatureId: 'great-weapon-fighting',
  benefitKey: 'gwf',
  benefitName: 'Great Weapon Fighting',
}

function Probe({
  expr,
  rollType = 'check',
  modifiers,
  effects = [],
}: {
  expr: string
  rollType?: string
  modifiers?: { shiftKey?: boolean; altKey?: boolean }
  effects?: ResolvedEffect[]
}) {
  const host = useRollHost()
  const [outcome, setOutcome] = useState<RollOutcome | null | 'pending'>('pending')

  const { setEffects } = host
  useEffect(() => setEffects(effects, []), [setEffects, effects])

  return (
    <>
      <button
        type="button"
        onClick={() =>
          void host
            .roll({ expr, label: 'Probe', character: { name: 'Thokk' }, modifiers, rollType })
            .then(setOutcome)
        }
      >
        go
      </button>
      {host.pending ? (
        <>
          <button type="button" onClick={host.pending.accept}>
            accept
          </button>
          <button type="button" onClick={host.pending.decline}>
            decline
          </button>
        </>
      ) : null}
      <pre data-testid="outcome">{outcome === 'pending' ? '' : JSON.stringify(outcome)}</pre>
    </>
  )
}

function mount(
  ui: React.ReactElement,
  opts: { atlas?: boolean; faces?: number[]; campaign?: string | null } = {},
): MemoryVault {
  // The campaign's note is seeded so the choice resolves: a choice naming a
  // campaign that does not exist answers like no choice (MYDND-204). Seeding
  // is not a write, so `vault.writes` still counts only the rolls. With
  // `campaign: null` the vault has none at all, since its only campaign would
  // be in play unchosen.
  const campaign = opts.campaign === undefined ? 'emberfall' : opts.campaign
  const vault = new MemoryVault(campaign ? { [`campaigns/${campaign}.md`]: `---\ntitle: ${campaign}\n---\n` } : {})
  render(
    <ObsidianProvider app={fakeApp(opts)}>
      <TestProviders
        state={createState(vault)}
        initialCampaignId={campaign}
      >
        <RollProvider>{ui}</RollProvider>
      </TestProviders>
    </ObsidianProvider>,
  )
  return vault
}

async function settled(): Promise<RollOutcome> {
  await waitFor(() => expect(screen.getByTestId('outcome').textContent).not.toBe(''))
  return JSON.parse(screen.getByTestId('outcome').textContent ?? 'null') as RollOutcome
}

/** Every entry written to the campaign's log, across whatever days exist. */
async function logged(vault: MemoryVault, campaign = 'emberfall'): Promise<ActivityEntry[]> {
  // The append is fire-and-forget from the roll's point of view, so wait for
  // the write to land rather than assuming it has.
  await waitFor(() => expect(vault.writes.length).toBeGreaterThan(0))
  const out: ActivityEntry[] = []
  for (const [path, markdown] of vault.files) {
    if (path.startsWith(`log/${campaign}/`)) out.push(...parseEntries(extractFence(markdown, LOG_FENCE)))
  }
  return out
}

describe('a roll is written to /gm/log', () => {
  it('writes one roll line, once, into the active campaign\'s day', async () => {
    const vault = mount(<Probe expr="+7" />, { faces: [12] })
    screen.getByText('go').click()
    await settled()

    const entries = await logged(vault)
    expect(entries).toHaveLength(1)
    expect(vault.writes).toHaveLength(1)
    expect(vault.writes[0]).toMatch(/^log\/emberfall\/\d{4}-\d{2}-\d{2}\.md$/)

    const [line] = entries
    expect(line.kind).toBe('roll')
    expect(line.character).toBe('Thokk')
    expect(line.text).toBe('Probe: 12 + 7 = 19')
    expect(line.detail).toMatchObject({ formula: '1d20+7', mode: 'normal', modifier: 7, total: 19 })
    expect(line.detail?.dice).toEqual([{ face: 12, sides: 20 }])
    // A real throw carries no `simulated: false` — it is noise in a note.
    expect(line.detail).not.toHaveProperty('simulated')
  })

  it('records the advantage discard as dropped, and nothing as replaced', async () => {
    const vault = mount(<Probe expr="+2" modifiers={{ shiftKey: true }} />, { faces: [5, 18] })
    screen.getByText('go').click()
    await settled()

    const [line] = await logged(vault)
    expect(line.detail?.mode).toBe('advantage')
    expect(line.detail?.dice).toEqual([
      { face: 18, sides: 20 },
      { face: 5, sides: 20, dropped: true },
    ])
    expect(JSON.stringify(line.detail)).not.toContain('"from"')
  })

  it('writes an accepted intervention as one line carrying from, never two', async () => {
    const vault = mount(<Probe expr="2d6+3" rollType="damage" effects={[FLOOR]} />, { faces: [1, 5] })
    screen.getByText('go').click()

    // Nothing is written while the prompt is open — the roll is not settled.
    await waitFor(() => screen.getByText('accept'))
    expect(vault.writes).toHaveLength(0)

    screen.getByText('accept').click()
    const outcome = await settled()
    expect(outcome.total).toBe(11)

    const entries = await logged(vault)
    expect(entries).toHaveLength(1)
    expect(vault.writes).toHaveLength(1)
    expect(entries[0].detail?.total).toBe(11)
    expect(entries[0].detail?.dice).toEqual([
      { face: 3, sides: 6, from: 1 },
      { face: 5, sides: 6 },
    ])
    // Replaced, not dropped: the 1 was changed, not set aside.
    expect(JSON.stringify(entries[0].detail?.dice)).not.toContain('dropped')
    expect(entries[0].detail?.intervention).toMatchObject({ mode: 'floor', source: 'Great Weapon Fighting' })
  })

  it('writes a declined intervention as the roll was thrown', async () => {
    const vault = mount(<Probe expr="2d6+3" rollType="damage" effects={[FLOOR]} />, { faces: [1, 5] })
    screen.getByText('go').click()
    await waitFor(() => screen.getByText('decline'))
    screen.getByText('decline').click()
    await settled()

    const entries = await logged(vault)
    expect(entries).toHaveLength(1)
    expect(entries[0].detail?.total).toBe(9)
    expect(entries[0].detail?.dice).toEqual([
      { face: 1, sides: 6 },
      { face: 5, sides: 6 },
    ])
    expect(entries[0].detail).not.toHaveProperty('intervention')
  })

  it('marks a roll with no scene as simulated', async () => {
    const vault = mount(<Probe expr="+3" />, { atlas: false })
    screen.getByText('go').click()
    await settled()

    const [line] = await logged(vault)
    expect(line.detail?.simulated).toBe(true)
  })

  it('writes nothing when no campaign is active, and the roll still happens', async () => {
    const vault = mount(<Probe expr="+3" />, { faces: [10], campaign: null })
    screen.getByText('go').click()
    const outcome = await settled()

    expect(outcome.total).toBe(13)
    // Give a stray write the chance to land before asserting there was none.
    await new Promise(r => setTimeout(r, 20))
    expect(vault.writes).toEqual([])
  })

  it('still rolls with no state provider at all', async () => {
    // `RollProvider` is useful without the state layer — the catalog pages and
    // `rollOutcome.test.tsx` mount it alone — so the log is the extra, never a
    // precondition.
    render(
      <ObsidianProvider app={fakeApp({ faces: [4] })}>
        <RollProvider>
          <Probe expr="+1" />
        </RollProvider>
      </ObsidianProvider>,
    )
    screen.getByText('go').click()
    expect((await settled()).total).toBe(5)
  })
})

describe('rollActivity', () => {
  it('stamps the time the dice landed, not the time of the write', () => {
    const entry = logEntry({
      id: 'r1',
      label: 'Stealth',
      dice: [{ count: 1, sides: 20, results: [14] }],
      modifier: 7,
      total: 21,
      mode: 'normal',
      at: Date.UTC(2026, 9, 8, 20, 0, 0),
    })
    expect(rollActivity(entry).at).toBe('2026-10-08T20:00:00.000Z')
  })
})
