import { useState } from 'react'
import { fmtMod } from '@vault/derive/dnd5e.js'

import { budgets, encounterGroups, spentXp } from '../catalog/bestiary'
import { useContent } from '../ContentContext'
import type { MonsterRow } from '../content/monsters'
import { useRoll } from '../dice/useRoll'
import { useAddMonster } from '../hooks/useAddMonster'
import { useElementWidth } from '../hooks/useElementWidth'
import { useCatalogRows } from '../hooks/useVaultGeneration'
import { useEncounter } from '../hooks/useGm'
import { useRoster } from '../hooks/useRoster'
import { useRouteLink } from '../pane'
import { sheetPath } from '../routes'
import {
  addToEncounter,
  advanceTurn,
  endEncounter,
  removeFromEncounter,
  rewindTurn,
  setCombatantHp,
  setInitiative,
  startEncounter,
  type Combatant,
} from '../state/index'
import { useStateHost } from '../StateContext'
import { MonsterDetail } from '../ui/BestiaryDetail'
import { Icon } from '../ui/Icon'
import { NoCampaign } from '../ui/NoCampaign'
import { RollLog } from '../ui/RollLog'

/**
 * The initiative tracker, at `/gm/encounter` — the "Encounter · turn order and
 * the active statblock" board of the all-sections canvas, as drawn (MYDND-91).
 *
 * Every rule is `@vault/derive`'s — `sortCombatants`, `nextTurn`,
 * `removeCombatant`, `makeCombatant` — reached through the transforms in
 * `state/encounter.ts`. This page is the controls.
 *
 * **One note per campaign, overwritten.** An encounter is working state: a
 * pointer into a turn order, meaningless once the fight ends. A note per
 * encounter would be a folder of half-finished initiative lists, and what is
 * worth keeping about a fight goes in the activity log.
 *
 * The board: a round pill, how many are standing, what the fight costs against
 * the party's budget; the turn order as rows, the acting one in orange and the
 * downed dimmed; adding by name or from the bestiary at the foot; and beside
 * it the acting creature — a monster's whole statblock with its rolls (the
 * Bestiary's own `MonsterDetail`), a character's HP and AC — then who is up
 * next. Click a row to look at another without changing whose turn it is.
 *
 * ## Initiative is rolled in the scene (MYDND-16)
 *
 * It used to call `rollInitiative()` from `@vault/derive/initiative.js`, which
 * is a `Math.random` — so the party arrived in an order nobody had watched
 * being decided, on the one page whose entire purpose is a turn order the table
 * agrees on. Every initiative here now goes through the engine into Atlas.
 *
 * **Monsters get one too, which they previously did not get at all.** A monster
 * added from the bestiary arrived with `initiative: null` and sat at the bottom
 * of the list until the GM typed a number, and its modifier was never read —
 * `initiativeMod` takes it off the `statblock` fence's `"+7 (17)"`, where the
 * bracketed number is the passive score and must not be mistaken for it.
 */

/** Below this the statblock leaves and the rows go compact (the narrow board). */
const WIDE_WIDTH = 900

export default function GmEncounterPage() {
  const { activeCampaignId } = useStateHost()
  const { encounter, loading, busy, update } = useEncounter()
  const { entries } = useRoster()
  const content = useContent()
  const link = useRouteLink()
  const roll = useRoll()
  const monsters = useCatalogRows(() => content.monsters.list())
  const [name, setName] = useState('')
  const [monsterQuery, setMonsterQuery] = useState('')
  const [lookingAt, setLookingAt] = useState<string | null>(null)
  const addMonster = useAddMonster(update)
  const [paneRef, width] = useElementWidth<HTMLDivElement>()
  const narrow = width > 0 && width < WIDE_WIDTH

  /**
   * One combatant's initiative, rolled in the scene.
   *
   * Returns `null` when there is no host to roll with, and every caller treats
   * that as "leave it alone" rather than as a zero — an initiative of 0 is a
   * real value a GM might type, so writing one as a failure mode would be
   * indistinguishable from a decision.
   */
  const rollInit = async (who: string, modifier: number, notePath?: string): Promise<number | null> => {
    const outcome = await roll(fmtMod(modifier), `${who} — Initiative`, { name: who, notePath }, undefined, 'initiative')
    return outcome ? outcome.total : null
  }

  if (!activeCampaignId) return <NoCampaign what="an encounter" />

  const matches =
    monsterQuery.trim().length < 2
      ? []
      : monsters.filter(m => m.name.toLowerCase().includes(monsterQuery.trim().toLowerCase())).slice(0, 8)

  const addParty = async (): Promise<void> => {
    const party = entries.filter(e => e.sheet)
    // Sequential, not `Promise.all`: each roll is one `rollDice` into the scene
    // and the dice are physical objects there. Firing six at once throws six
    // sets of dice into one pile, which is unreadable — and the order they land
    // in is the order the table reads out.
    const rolled: (number | null)[] = []
    for (const e of party) {
      rolled.push(await rollInit(e.name, e.sheet?.initiative ?? 0, e.path))
    }

    update(s =>
      addToEncounter(
        s,
        party.map((e, i) => ({
          // Keyed by the note path, so `combatantKey` deduplicates a character
          // added twice — which `addCombatants` does for a `characterId` and
          // deliberately does not for a `monsterId`.
          characterId: e.path,
          name: e.name,
          kind: 'pc' as const,
          dexMod: e.sheet?.initiative ?? 0,
          hp: e.sheet?.hp?.current ?? 0,
          maxHp: e.sheet?.hp?.max ?? 0,
          tempHp: e.sheet?.hp?.temp ?? 0,
          ac: e.sheet?.ac ?? null,
          // Rolled so the party arrives in order. The GM can overwrite any of
          // them; what matters is that nobody starts at null and has to be
          // typed in one at a time.
          initiative: rolled[i],
        })),
      ),
    )
  }

  const combatants = encounter.combatants
  const acting = encounter.started ? (combatants[encounter.turnIndex] ?? null) : null
  const shown = combatants.find(c => c.id === lookingAt) ?? acting ?? combatants[0] ?? null
  const standing = combatants.filter(c => !(c.maxHp > 0 && c.hp <= 0)).length
  const levels = entries.map(e => e.sheet?.level).filter((l): l is number => typeof l === 'number' && l > 0)
  const xp = spentXp(encounterGroups(combatants, monsters))
  const b = budgets(levels)
  const priced =
    xp === 0 || levels.length === 0
      ? null
      : `${xp.toLocaleString('en-US')} XP · ${xp > b.high ? 'above High' : xp >= b.moderate ? 'Moderate–High' : xp >= b.low ? 'Low–Moderate' : 'below Low'}`
  const upNext = encounter.started
    ? [1, 2].map(k => combatants[(encounter.turnIndex + k) % Math.max(1, combatants.length)]).filter((c, i, all) => c && c !== acting && all.indexOf(c) === i)
    : []
  const nextName = encounter.started && combatants.length > 1 ? combatants[(encounter.turnIndex + 1) % combatants.length]?.name : null

  const controls = encounter.started ? (
    <>
      <button type="button" className="bst-plain bst-btn-secondary" disabled={busy} onClick={() => update(rewindTurn)}>
        <Icon name="chevron-left" /> Back
      </button>
      <button type="button" className="bst-plain bst-btn-primary bst-btn-primary--orange bst-enc-next" disabled={busy} onClick={() => update(advanceTurn)}>
        Next turn{nextName && !narrow ? ` → ${nextName}` : ''} <Icon name="chevron-right" />
      </button>
      <button type="button" className="bst-plain bst-btn-danger" disabled={busy} onClick={() => update(endEncounter)}>
        End
      </button>
    </>
  ) : (
    <button
      type="button"
      className="bst-plain bst-btn-primary bst-btn-primary--orange"
      disabled={busy || combatants.length === 0}
      onClick={() => update(startEncounter)}
    >
      <Icon name="swords" /> Roll for initiative
    </button>
  )

  const adders = (
    <div className={narrow ? 'bst-enc-add bst-enc-add--narrow' : 'bst-enc-add'}>
      <button type="button" className="bst-plain bst-btn-secondary" disabled={busy || entries.length === 0} onClick={() => void addParty()}>
        + Party
      </button>
      <input
        type="text"
        value={name}
        placeholder="Add by name…"
        aria-label="Combatant name"
        className="bst-input"
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key !== 'Enter' || name.trim() === '') return
          update(s => addToEncounter(s, [{ name: name.trim(), kind: 'other' }]))
          setName('')
        }}
      />
      <input
        type="search"
        value={monsterQuery}
        placeholder="Add from the bestiary… (rolls in Atlas)"
        aria-label="Bestiary search"
        className="bst-input"
        onChange={e => setMonsterQuery(e.target.value)}
      />
      {matches.length > 0 && (
        <div className="bst-enc-matches">
          {matches.map(m => (
            <button
              key={m.id}
              type="button"
              className="bst-plain bst-pill"
              disabled={busy}
              onClick={() => {
                // The fence read and the initiative roll are `useAddMonster`'s,
                // shared with the Bestiary since MYDND-64.
                void addMonster(m)
                setMonsterQuery('')
              }}
            >
              + {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div ref={paneRef} className="bst">
      <header className={narrow ? 'bst-header bst-header--narrow' : 'bst-header'}>
        <div className="bst-titles bst-titles--center">
          <h2 className="bst-title">Encounter</h2>
          {encounter.started && <span className="bst-roundpill">Round {encounter.round}</span>}
          {combatants.length > 0 && (
            <span className="bst-count">{`${standing} of ${combatants.length} standing${priced ? ` · ${priced}` : ''}`}</span>
          )}
        </div>
        {!narrow && <span className="bst-spacer" />}
        <div className={narrow ? 'bst-party-actions bst-party-actions--narrow' : 'bst-party-actions'}>{controls}</div>
      </header>

      <div className="bst-body">
        <main className={narrow ? 'my-dnd-vault__scroll bst-enc-main bst-enc-main--narrow' : 'my-dnd-vault__scroll bst-enc-main'}>
          {loading ? (
            <p className="bst-empty">Reading the encounter…</p>
          ) : combatants.length === 0 ? (
            <p className="bst-empty">
              <strong>Nothing in the encounter</strong>
              Add the party, search the bestiary, or type a name.
            </p>
          ) : (
            <>
              {!narrow && (
                <div aria-hidden="true" className="bst-enc-cols">
                  <span>INIT</span>
                  <span>COMBATANT</span>
                  <span>AC</span>
                  <span>HIT POINTS</span>
                  <span />
                </div>
              )}
              <ol aria-label="Turn order" className="bst-enc-list">
                {combatants.map((c, i) => (
                  <Row
                    key={c.id}
                    c={c}
                    acting={encounter.started && i === encounter.turnIndex}
                    looking={shown?.id === c.id}
                    narrow={narrow}
                    busy={busy}
                    onLook={() => setLookingAt(c.id === lookingAt ? null : c.id)}
                    onInit={value => update(s => setInitiative(s, c.id, value))}
                    onRoll={() =>
                      void rollInit(c.name, c.dexMod, c.characterId ?? undefined).then(total => {
                        if (total !== null) update(s => setInitiative(s, c.id, total))
                      })
                    }
                    onHp={hp => update(s => setCombatantHp(s, c.id, hp))}
                    onRemove={() => update(s => removeFromEncounter(s, c.id))}
                  />
                ))}
              </ol>
            </>
          )}
          {!narrow && adders}
          <div className="bst-party-log">
            <RollLog />
          </div>
        </main>

        {!narrow && shown && (
          <aside aria-label={shown.name} className="bst-detail bst-enc-aside">
            <span className={shown === acting ? 'bst-enc-now bst-enc-now--acting' : 'bst-enc-now'}>
              {shown === acting ? 'ACTING NOW' : encounter.started ? 'LOOKING AT' : 'FIRST IN THE ORDER'}
            </span>
            <Acting
              c={shown}
              onSheet={path => link(sheetPath(path))}
              onAddAnother={monster => addMonster(monster)}
              onClose={() => setLookingAt(null)}
              count={shown.monsterId ? combatants.filter(x => x.monsterId === shown.monsterId).length : 0}
              busy={busy}
            />
            {upNext.length > 0 && (
              <section aria-label="Up next" className="bst-enc-next-list">
                <h4 className="bst-section-title">Up next</h4>
                {upNext.map(c => (
                  <span key={c.id} className="bst-glance bst-enc-upnext">
                    <span>{c.name}</span>
                    <span className="bst-mono bst-muted">{c.maxHp > 0 ? `${c.hp}/${c.maxHp}` : ''}</span>
                  </span>
                ))}
              </section>
            )}
          </aside>
        )}
      </div>
      {narrow && <footer className="bst-bfoot">{adders}</footer>}
    </div>
  )
}

/** The aside's body: a monster's own statblock, or a character's numbers. */
function Acting({
  c,
  onSheet,
  onAddAnother,
  count,
  busy,
  onClose,
}: {
  c: Combatant
  onSheet(path: string): ReturnType<ReturnType<typeof useRouteLink>>
  /** The statblock's own "Add to an encounter…", here adding another of it. */
  onAddAnother(monster: MonsterRow): Promise<void>
  count: number
  busy: boolean
  /** Back to whoever is acting. */
  onClose(): void
}) {
  const content = useContent()
  const rows = useCatalogRows(() => content.monsters.list())
  const monster = c.monsterId ? (rows.find(r => r.id === c.monsterId) ?? null) : null
  if (monster) {
    return (
      <div className="bst-enc-monster">
        <MonsterDetail key={monster.id} monster={monster} onClose={onClose} encounter={{ add: () => onAddAnother(monster), count, busy }} />
      </div>
    )
  }
  return (
    <div className="bst-detail-head">
      <div className="bst-detail-id">
        <span aria-hidden="true" className="bst-token bst-roster-token bst-token--xl">
          {c.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="bst-detail-names">
          <h3 className="bst-detail-name">{c.name}</h3>
          <span className="bst-detail-sub">{c.kind === 'pc' ? 'Character' : 'Added by name'}</span>
        </div>
      </div>
      <div className="bst-vitals">
        <div className="bst-vital">
          <span className="bst-vital-label">AC</span>
          <span className="bst-vital-value">{c.ac ?? '—'}</span>
        </div>
        <div className="bst-vital">
          <span className="bst-vital-label">HP</span>
          <span className="bst-vital-value">{c.maxHp > 0 ? `${c.hp} / ${c.maxHp}` : '—'}</span>
        </div>
        <div className="bst-vital">
          <span className="bst-vital-label">INIT</span>
          <span className="bst-vital-value">{c.initiative ?? '—'}</span>
        </div>
      </div>
      {c.characterId && (
        <button type="button" className="bst-plain bst-btn-secondary" {...onSheet(c.characterId)}>
          Open sheet
        </button>
      )}
    </div>
  )
}

function Row({
  c,
  acting,
  looking,
  narrow,
  busy,
  onLook,
  onInit,
  onRoll,
  onHp,
  onRemove,
}: {
  c: Combatant
  acting: boolean
  looking: boolean
  narrow: boolean
  busy: boolean
  onLook(): void
  onInit(value: number | null): void
  onRoll(): void
  onHp(hp: number): void
  onRemove(): void
}) {
  const down = c.maxHp > 0 && c.hp <= 0
  const r = c.maxHp > 0 ? c.hp / c.maxHp : 1
  const tone = down ? 'down' : r <= 0.5 ? 'low' : r < 1 ? 'hurt' : 'full'
  const cls = ['bst-enc-row', acting ? 'bst-enc-row--acting' : '', looking && !acting ? 'bst-enc-row--looking' : '', down ? 'bst-enc-row--down' : '']
    .filter(Boolean)
    .join(' ')
  return (
    <li aria-current={acting ? 'step' : undefined} className={narrow ? `${cls} bst-enc-row--narrow` : cls}>
      <span className="bst-enc-init">
        <input
          type="number"
          value={c.initiative ?? ''}
          aria-label={`${c.name} initiative`}
          className="bst-input bst-enc-initbox"
          disabled={busy}
          onChange={e => onInit(e.target.value === '' ? null : Number(e.target.value))}
        />
        {/* Re-rolls one combatant in the scene and writes the result back,
            which is why it is a button rather than a `Rollable`: a `Rollable`
            throws dice and tells nobody, and an initiative that is not stored
            is not an initiative. Typing over it still works. */}
        <button
          type="button"
          className="bst-plain bst-enc-roll"
          disabled={busy}
          aria-label={`Roll ${c.name} initiative`}
          title={`Roll initiative (${fmtMod(c.dexMod)})`}
          onClick={onRoll}
        >
          <Icon name="dices" />
        </button>
      </span>
      <button type="button" className="bst-plain bst-enc-who" onClick={onLook} aria-pressed={looking}>
        <span aria-hidden="true" className={c.kind === 'pc' ? 'bst-enc-tile bst-enc-tile--pc' : 'bst-enc-tile'}>
          {c.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="bst-row-main">
          <span className="bst-row-name">{c.name}</span>
          <span className="bst-row-kind">{down ? 'down' : c.kind === 'pc' ? 'character' : c.kind === 'monster' ? 'bestiary' : 'added by name'}</span>
        </span>
      </button>
      {!narrow && <span className="bst-mono bst-enc-ac">{c.ac ?? '—'}</span>}
      {c.maxHp > 0 ? (
        <span className="bst-enc-hp">
          {!narrow && (
            <span className="bst-hp-bar">
              <span className={`bst-hp-fill bst-hp-fill--${tone === 'down' ? 'low' : tone}`} style={{ width: `${Math.max(0, Math.min(100, r * 100))}%` }} />
            </span>
          )}
          <input
            type="number"
            value={c.hp}
            aria-label={`${c.name} hit points`}
            className={`bst-input bst-enc-hpbox bst-hp-value--${tone === 'down' ? 'low' : tone}`}
            disabled={busy}
            onChange={e => onHp(Number(e.target.value))}
          />
          <span className="bst-mono bst-muted bst-enc-max">/ {c.maxHp}</span>
        </span>
      ) : (
        // `healthState` answers `unknown` for a combatant with no maximum,
        // which an ad-hoc row legitimately has. Showing a 0/0 bar would be a
        // lie about a creature nobody statted.
        <span className="bst-note">no HP tracked</span>
      )}
      <button type="button" className="bst-plain bst-close bst-close--sm" disabled={busy} onClick={onRemove} aria-label={`Remove ${c.name}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </li>
  )
}
