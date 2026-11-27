import { useState } from 'react'

import { useCompendium } from '../../compendium/host'
import { fmtMod, subclassCompanionView, summonerOf } from '../../characterModel'
import type { Sheet, SubclassCompanion, Vitals } from '../../characterModel'
import { DamageValue, Rollable, type RollContext } from '../../dice/host'
import { Markdown, openNote, useCatalogRows, useDetail, useObsidian } from '../../platform/host'
import { Block, LABEL } from './CharacterSheet'
import { HurtControls } from './FamiliarsTab'

/**
 * A subclass's companion on the Familiars tab (MYDND-284): the Beast Master's
 * primal beast, the Battle Smith's Steel Defender, the Wildfire Spirit and the
 * Drakewarden's drake.
 *
 * The creature is its bestiary note. Its AC, hit points and Hit Dice are the
 * note's formulas worked out for this summoner (`subclassCompanionView`), and
 * each attack in its actions gets a roll where its bonus and damage read.
 * Damage is `vault-vitals`' `familiar_damage`, under the companion's
 * `subclass:<key>`, as a familiar's is.
 *
 * A Beast Master whose choices name no stat block is shown the default, Beast
 * of the Land, with a choice of the three. That choice is the card's own: the
 * subclass lets the Ranger change it at every Long Rest, and the pick in the
 * builder is the record.
 */

const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

export function SubclassCompanionCard({
  companion,
  sheet,
  vitals,
  busy,
  onHurt,
  notePath,
}: {
  companion: SubclassCompanion
  sheet: Sheet
  vitals: Vitals
  busy: boolean
  onHurt: (featureId: string, delta: number, max: number) => void
  notePath: string
}) {
  const app = useObsidian()
  const compendium = useCompendium()
  const rows = useCatalogRows(() => compendium.monsters.list())
  const [chosen, setChosen] = useState<string | null>(null)
  const id = chosen ?? companion.picked ?? companion.monsters[0] ?? null
  const row = rows.find(r => r.id === id) ?? null
  const { detail, loading } = useDetail(compendium.monsters, row ? row.id : null)

  const name = row?.name ?? 'Companion'
  const choices = companion.monsters.filter(m => rows.some(r => r.id === m))
  const picker =
    companion.monsters.length > 1 && choices.length > 1 ? (
      <select aria-label={`${companion.subclass} stat block`} value={id ?? ''} onChange={e => setChosen(e.target.value)}>
        {choices.map(m => (
          <option key={m} value={m}>
            {rows.find(r => r.id === m)?.name ?? m}
          </option>
        ))}
      </select>
    ) : null

  if (!row) {
    return (
      <Block title={companion.subclass} hint="companion">
        <span className="text-smaller text-faint">
          No bestiary note for <code>{id}</code> — run <code>npm run export:lore</code>.
        </span>
      </Block>
    )
  }

  const summoner = summonerOf(sheet, companion.level)
  const view = subclassCompanionView(detail?.fence ?? null, summoner)
  const max = view.maxHp
  const damage = vitals.familiarDamage[companion.featureId] ?? 0
  const current = max === null ? null : Math.max(0, max - damage)
  const character: RollContext = { name, notePath }
  const fence = detail?.fence ?? {}
  const entries = [...(fence.traits ?? []), ...(fence.actions ?? [])]

  return (
    <Block title={name} hint={`${companion.subclass} · ${titleCase(companion.className)} ${companion.level}`}>
      <div className="flex flex-col gap-2 rounded-obs-m border border-background-modifier-border bg-background-secondary p-2.5">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className={LABEL}>HP</span>
          <span className="font-mono text-ui-medium font-bold tabular-nums text-normal">
            {current === null || max === null ? (loading ? '…' : '—') : `${current} / ${max}`}
          </span>
          {view.hitDice ? (
            <span className="text-smaller text-muted">
              {view.hitDice.total}d{view.hitDice.die}
            </span>
          ) : null}
          {view.ac !== null ? (
            <>
              <span className={LABEL}>AC</span>
              <span className="font-mono font-semibold text-normal">{view.ac}</span>
            </>
          ) : null}
          {view.speed ? <span className="text-muted">{view.speed}</span> : null}
          <button type="button" className="note-link ml-auto" onClick={() => openNote(app, row.path)}>
            Statblock
          </button>
        </div>

        {picker}

        {max !== null ? <HurtControls name={name} busy={busy} onApply={delta => onHurt(companion.featureId, delta, max)} /> : null}

        {view.stats.length === 6 ? (
          <div className="grid grid-cols-6 gap-1">
            {view.stats.map((score, i) => (
              <div key={ABILITIES[i]} className="flex flex-col items-center gap-1">
                <span className={LABEL}>{ABILITIES[i]}</span>
                <Rollable
                  value={fmtMod(Math.floor((score - 10) / 2) + view.checkBonus)}
                  label={`${name} ${ABILITIES[i]} check`}
                  character={character}
                  rollType="check"
                />
              </div>
            ))}
          </div>
        ) : null}

        {view.attacks.map(a => (
          <div key={a.name} className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-normal">{a.name}</span>
            {a.toHit !== null ? (
              <span className="flex items-center gap-1">
                <span className={LABEL}>hit</span>
                <Rollable value={fmtMod(a.toHit)} label={`${name} ${a.name} attack`} character={character} rollType="attack" />
              </span>
            ) : null}
            {a.damage ? (
              <span className="flex items-center gap-1">
                <span className={LABEL}>dmg</span>
                <DamageValue damage={a.damage} label={`${name} ${a.name}`} character={character} />
              </span>
            ) : null}
          </div>
        ))}

        {typeof fence.senses === 'string' || typeof fence.languages === 'string' ? (
          <span className="text-smaller text-muted">{[fence.senses, fence.languages].filter(Boolean).join(' · ')}</span>
        ) : null}

        {entries.map((t, i) => (
          <details key={`${t.name}-${i}`} className="[&_summary]:cursor-pointer">
            <summary className="font-medium text-normal">{t.name ?? 'Feature'}</summary>
            <div className="pt-1 text-muted">
              <Markdown markdown={t.desc ?? ''} sourcePath={row.path} />
            </div>
          </details>
        ))}
      </div>
    </Block>
  )
}

const titleCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
