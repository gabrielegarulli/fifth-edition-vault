import { useState, type ReactNode } from 'react'

import {
  formatRelativeTime,
  type RosterEntry,
  fmtMod,
  concentrationDc,
  type WildShapeForm,
  isLocalId,
} from '../../characterModel'
import type { ProjectedVitals, Sheet } from '../../characterModel'
import type { VitalsState } from './hooks/useVitals'
import {
  openNote,
  useObsidian,
  useGo,
  useRouteLink,
  Icon,
  MenuButton,
  type MenuEntry,
} from '../../platform/host'
import { useCharacters } from './context'
import { convertPath } from '../../platform'
import { ATTACK, Avatar, LABEL, PassiveLine, rollContextOf, StatGrid } from './CharacterSheet'
import { HpPanel } from './HpPanel'
import { Rollable, InterventionPrompt } from '../../dice/host'
import { XpAward } from './XpProgressBar'

/**
 * The top of the sheet page, pinned while the tabs scroll beneath it (MYDND-44).
 *
 * It holds what a player reads every turn whichever tab is open: who this is,
 * hit points, the six numbers, rests, and the state row (conditions arrive in
 * MYDND-45). Everything else is a tab.
 *
 * ## Compact everywhere but Combat
 *
 * At the 16px floor the full strip is about 300px tall, which in a short pane
 * is a lot to keep pinned over a spell list. So on every other tab it folds to
 * one line — name, hit points — and the two numbers a caster needs: save DC and
 * spell attack. Hit points are changed on Combat, where the controls are.
 *
 * ## GM and maintenance actions live behind ⋮
 *
 * Award XP, Re-sync, Open note. They are used once a session, and before this
 * the XP award row sat above the character's own name. Awarding opens its row
 * *here*, in the strip, so the total is visible while it is typed.
 *
 * The intervention prompt is here too: it answers a roll made from any tab,
 * and a prompt scrolled out of view is a prompt nobody accepts.
 */
export function PlayStrip({
  entry,
  sheet,
  vitals,
  actions,
  busy,
  compact,
  inCard = false,
  width,
  stateRow,
  concentration = null,
  form = null,
}: {
  entry: RosterEntry
  sheet: Sheet
  vitals: ProjectedVitals
  actions: VitalsState['actions']
  busy: boolean
  compact: boolean
  /** On an Atlas card (MYDND-191): its header already names and pictures the character. */
  inCard?: boolean
  width: number
  /** The left of the state row — MYDND-45's conditions. */
  stateRow?: ReactNode
  /** The spell being concentrated on, if any (MYDND-46). */
  concentration?: string | null
  /** A Wild Shape form in play (MYDND-51). */
  form?: WildShapeForm | null
}) {
  const link = useRouteLink()
  const go = useGo()
  const app = useObsidian()
  const { importCharacter, rebuildVaultCharacter } = useCharacters()
  const [awarding, setAwarding] = useState(false)
  const [check, setCheck] = useState<{ dc: number; spell: string } | null>(null)
  const character = rollContextOf(sheet)
  const local = isLocalId(entry.ddbId)

  // Damage while concentrating asks for a Constitution save (MYDND-46). The
  // prompt is the strip's, not the fence's: it answers the damage just typed,
  // and it goes away with the concentration — a drop to 0 ends it outright.
  const hpActions: VitalsState['actions'] = {
    ...actions,
    damage: (amount: number) => {
      actions.damage(amount)
      if (concentration) setCheck({ dc: concentrationDc(amount), spell: concentration })
    },
  }
  const conSave = (sheet.saves ?? []).find(s => s.label === 'CON')

  const menu: MenuEntry[] = [
    vitals.xp === null
      ? { label: 'Start tracking XP', onSelect: actions.startTrackingXp, disabled: busy }
      : { label: 'Award XP…', onSelect: () => setAwarding(true) },
    local
      ? { label: 'Rebuild sheet', onSelect: () => void rebuildVaultCharacter(entry.path) }
      : { label: 'Re-sync from D&D Beyond', onSelect: () => void importCharacter(entry.ddbId, entry.path) },
    // Both open the conversion review, which writes nothing until Convert (MYDND-105).
    ...(!local && entry.ddbId
      ? [{ label: 'Convert to a Vault character…', onSelect: () => go(convertPath(entry.ddbId, entry.path)) }]
      : []),
    ...(local && entry.ddbSource
      ? [{ label: 'Re-convert from D&D Beyond…', onSelect: () => go(convertPath(entry.ddbSource!, entry.path)) }]
      : []),
    { label: 'Open note', onSelect: () => openNote(app, entry.path) },
    { caption: local ? 'Vault character' : `Synced ${formatRelativeTime(entry.synced)}` },
  ]

  const sub = [sheet.race, sheet.classes].filter(Boolean).join(' · ')
  const { current, max, temp } = vitals.hp

  const menuButton = <MenuButton label="Character actions" items={menu} />
  // On a card's Combat tab the head row would hold only ⋮: Atlas's header has
  // the name and the art, and the HP panel below has the hit points. So the
  // row goes, and ⋮ ends the hit-point line instead (MYDND-191).
  const menuOnHpLine = inCard && !compact

  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-background-modifier-border bg-background-secondary px-3 py-2.5">
      {menuOnHpLine ? null : (
        <div className="flex items-center gap-2.5">
          {inCard ? (
            <span className="flex-1" />
          ) : (
            <>
              <button
                type="button"
                className="clickable-icon"
                aria-label="Back to characters"
                title="Characters"
                {...link('/characters')}
              >
                <Icon name="arrow-left" />
              </button>
              <Avatar sheet={sheet} size={compact ? 'h-7 w-7' : 'h-10 w-10'} />
              <div className="min-w-0 flex-1">
                <div className={`truncate font-bold text-normal ${compact ? '' : 'text-ui-medium'}`}>
                  {sheet.name || 'Unnamed'}
                </div>
                {!compact && sub ? <div className="truncate text-smaller text-muted">{sub}</div> : null}
              </div>
            </>
          )}
          {compact ? (
            <span className="flex items-baseline gap-1.5 font-mono font-bold tabular-nums text-normal" title="Hit points">
              {current}
              {max === null ? null : <span className="font-medium text-muted">/ {max}</span>}
              {temp > 0 ? <span className="font-semibold text-obs-blue">+{temp}</span> : null}
            </span>
          ) : null}
          {menuButton}
        </div>
      )}

      {awarding && vitals.xp !== null ? (
        <div className="flex flex-wrap items-center gap-2 rounded-obs-m border border-background-modifier-border bg-background-primary px-2.5 py-2">
          <span className={LABEL}>Award XP</span>
          <span className="font-mono tabular-nums text-muted">{vitals.xp.toLocaleString()} now</span>
          <XpAward onAward={actions.awardXp} busy={busy} />
          <button
            type="button"
            className="clickable-icon ml-auto"
            aria-label="Close"
            onClick={() => setAwarding(false)}
          >
            <Icon name="x" />
          </button>
        </div>
      ) : null}

      {compact ? null : (
        <>
          <HpPanel
            vitals={vitals}
            actions={hpActions}
            character={character}
            busy={busy}
            aside={menuOnHpLine ? menuButton : undefined}
          />
          <StatGrid sheet={sheet} width={width} form={form} />
        </>
      )}

      {check && concentration === check.spell ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-obs-m border border-obs-yellow/40 bg-obs-yellow/10 px-2.5 py-2"
        >
          <span className="text-normal">
            Keep concentrating on <b>{check.spell}</b>: Constitution save, DC{' '}
            <span className="font-mono font-semibold">{check.dc}</span>
          </span>
          {conSave ? (
            <Rollable
              value={fmtMod(conSave.total)}
              label="Concentration save"
              character={character}
              rollType="save"
              target={{ kind: 'save', ability: 'CON', concentration: true }}
              what="this concentration save"
            />
          ) : null}
          <span className="flex-1" />
          <button type="button" onClick={() => setCheck(null)}>
            Kept it
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setCheck(null)
              actions.endConcentration()
            }}
          >
            Lost it
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {stateRow}
        <span className="flex-1" />
        {compact ? (
          sheet.spellcasting ? (
            <span className="flex items-center gap-2">
              <span className={LABEL}>DC</span>
              <span className="font-mono font-semibold tabular-nums text-normal">{sheet.spellcasting.dc}</span>
              <span className={LABEL}>Atk</span>
              <Rollable
                value={fmtMod(sheet.spellcasting.attack)}
                label="Spell attack"
                character={character}
                rollType="attack"
                target={ATTACK}
                what="attack rolls"
              />
            </span>
          ) : null
        ) : (
          <PassiveLine sheet={sheet} />
        )}
      </div>

      <InterventionPrompt />
    </div>
  )
}
