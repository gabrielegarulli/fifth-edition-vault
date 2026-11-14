import { useState } from 'react'

import { useCompendium } from '../../compendium/host'
import type { StatblockFence } from '../../compendium'
import { fmtMod, companionView } from '../../characterModel'
import type { RollContext } from '../../dice/host'
import { useCatalogRows, openNote, useObsidian, Markdown } from '../../platform/host'
import type { Vitals } from '../../characterModel'
import { Block, LABEL } from './CharacterSheet'
import { Rollable } from '../../dice/host'

/**
 * The Familiars tab (MYDND-51) — the web sheet's `FamiliarPanel`, for a Vault
 * character whose builder choices include a familiar (the Tamer's Bond).
 *
 * The familiar is the builder's record in the ` ```vault-character ` fence: the
 * creature, its nickname, and its statblock as it was picked. Its hit points are
 * tracked in `vault-vitals` (`familiar_damage`), damage rather than current, for
 * the reason the character's are.
 *
 * **The Tamer's level and the chosen improvements apply** (MYDND-59), through
 * `companionView` over `@vault/derive/tamerScaling.js`: Hit Dice by level,
 * Toughen Up and Growth, Ability Boost, Speed Training, Survival Instincts, the
 * AC and sense grants. MYDND-51 left them out, believing they needed the
 * `content_familiar_improvement` table; only *choosing* one does.
 */

export interface Familiar {
  featureId: string
  monsterId?: string
  monsterName?: string
  nickname?: string | null
  cr?: number | string | null
  size?: string | null
  creatureType?: string | null
  data?: StatblockFence | null
  improvements?: unknown[]
}

const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

/** The familiar list from a Vault character's fence, keeping only entries with an id. */
export function familiarsOf(json: object | null): Familiar[] {
  const raw = (json as { familiars?: unknown } | null)?.familiars
  if (!Array.isArray(raw)) return []
  return raw.filter((f): f is Familiar => !!f && typeof (f as Familiar).featureId === 'string')
}

export function FamiliarsTab({
  familiars,
  vitals,
  busy,
  onHurt,
  notePath,
  tamerLevel = 0,
  pb = 2,
}: {
  familiars: readonly Familiar[]
  vitals: Vitals
  busy: boolean
  onHurt: (featureId: string, delta: number, max: number) => void
  notePath: string
  /** The class level the companion scales with (MYDND-59). */
  tamerLevel?: number
  /** The Tamer's proficiency bonus, for a save Survival Instincts grants. */
  pb?: number
}) {
  return (
    <>
      {familiars.map(f => (
        <FamiliarCard
          key={f.featureId}
          familiar={f}
          damage={vitals.familiarDamage[f.featureId] ?? 0}
          busy={busy}
          onHurt={onHurt}
          notePath={notePath}
          tamerLevel={tamerLevel}
          pb={pb}
        />
      ))}
    </>
  )
}

function FamiliarCard({
  familiar: f,
  damage,
  busy,
  onHurt,
  notePath,
  tamerLevel,
  pb,
}: {
  familiar: Familiar
  damage: number
  busy: boolean
  onHurt: (featureId: string, delta: number, max: number) => void
  notePath: string
  tamerLevel: number
  pb: number
}) {
  const app = useObsidian()
  const compendium = useCompendium()
  const rows = useCatalogRows(() => compendium.monsters.list())
  const [amount, setAmount] = useState('')

  const d = f.data ?? {}
  const name = f.nickname || f.monsterName || 'Familiar'
  const row = f.monsterId ? rows.find(r => r.id === f.monsterId) : undefined
  const view = companionView(d, f.improvements, tamerLevel, pb)
  const max = view.maxHp
  const current = Math.max(0, max - damage)
  const n = Math.max(0, Math.floor(Number(amount) || 0))
  const character: RollContext = { name, notePath }
  const stats = view.stats
  const extras = [
    ...view.saves.map(s => `Save ${s.ability.toUpperCase()} ${fmtMod(s.bonus)}`),
    ...(view.attackBonus ? [`+${view.attackBonus} natural weapon attack and damage`] : []),
    ...view.senses,
    ...view.resistances.map(r => `Resists ${r}`),
    ...view.immunities.map(r => `Immune to ${r}`),
    ...view.conditionImmunities.map(c => `Cannot be ${c}`),
  ]

  const apply = (sign: 1 | -1): void => {
    if (n <= 0) return
    onHurt(f.featureId, sign * n, max)
    setAmount('')
  }

  return (
    <Block
      title={name}
      hint={[f.monsterName !== name ? f.monsterName : null, view.size ?? f.size, f.creatureType, f.cr != null ? `CR ${f.cr}` : null]
        .filter(Boolean)
        .join(' · ')}
    >
      <div className="flex flex-col gap-2 rounded-obs-m border border-background-modifier-border bg-background-secondary p-2.5">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className={LABEL}>HP</span>
          <span className="font-mono text-ui-medium font-bold tabular-nums text-normal">
            {current} / {max}
          </span>
          {view.hitDice ? (
            <span className="text-smaller text-muted" title={view.dieUpgraded ? 'Growth raised the Hit Die' : undefined}>
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
          {row ? (
            <button type="button" className="note-link ml-auto" onClick={() => openNote(app, row.path)}>
              Statblock
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="number"
            min={0}
            value={amount}
            placeholder="0"
            aria-label={`${name} amount`}
            className="w-16"
            disabled={busy}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') apply(1)
            }}
          />
          <button type="button" disabled={busy || n <= 0} onClick={() => apply(1)}>
            Damage
          </button>
          <button type="button" disabled={busy || n <= 0} onClick={() => apply(-1)}>
            Heal
          </button>
        </div>

        {stats.length === 6 ? (
          <div className="grid grid-cols-6 gap-1">
            {stats.map((score, i) => {
              const mod = Math.floor((Number(score) - 10) / 2)
              return (
                <div key={ABILITIES[i]} className="flex flex-col items-center gap-1">
                  <span className={LABEL}>{ABILITIES[i]}</span>
                  <Rollable
                    value={fmtMod(mod)}
                    label={`${name} ${ABILITIES[i]} check`}
                    character={character}
                    rollType="check"
                  />
                </div>
              )
            })}
          </div>
        ) : null}

        {d.senses || d.languages ? (
          <span className="text-smaller text-muted">{[d.senses, d.languages].filter(Boolean).join(' · ')}</span>
        ) : null}
        {extras.length > 0 ? <span className="text-smaller text-normal">{extras.join(' · ')}</span> : null}

        {[...(d.traits ?? []), ...(d.actions ?? [])].map((t, i) => (
          <details key={`${t.name}-${i}`} className="[&_summary]:cursor-pointer">
            <summary className="font-medium text-normal">{t.name ?? 'Feature'}</summary>
            <div className="pt-1 text-muted">
              <Markdown markdown={t.desc ?? ''} sourcePath={row?.path ?? notePath} />
            </div>
          </details>
        ))}

        {view.improvements.length > 0 ? (
          <span className="text-smaller text-muted">
            Tamer {tamerLevel} · {view.improvements.join(', ')}
          </span>
        ) : null}
      </div>
    </Block>
  )
}
