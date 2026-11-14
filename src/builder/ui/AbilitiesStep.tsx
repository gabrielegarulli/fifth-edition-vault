import { canIncrementScore, effectiveScore, pointsRemaining } from '@vault/derive/builderDraft.js'
import { POINT_BUY_BUDGET, POINT_COST } from '@vault/derive/dnd5e.js'
import { ABILITY_FULL } from '@vault/derive/speciesChoices.js'

import type { FeatData } from '../../choices'
import {
  ABILITY_KEYS,
  MANUAL_MAX,
  MANUAL_MIN,
  standardOptions,
  withAbilityMethod,
  withScore,
  type AbilityKey,
  type AbilityMethod,
  type BuilderDraft,
} from '../../choices'
import type { BackgroundRow } from '../../compendium'
import { fmtMod } from '../../characterModel'
import type { SetDraft } from '../../choices/host'

const ABILITY_SHORT: Record<AbilityKey, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
}

export function AbilitiesStep({
  draft,
  setDraft,
  narrow,
  feats,
  background,
  overCap,
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  narrow: boolean
  /** Picked feats with fences, so a half-feat's +1 shows in the total (VAULT-185). */
  feats: readonly FeatData[]
  /** Named on a tile's bonus line, so "+2 Sage" says where the 2 came from. */
  background: BackgroundRow | null
  /** Scores an increase took past 20. Said here, where the base scores are set. */
  overCap: readonly string[]
}) {
  const method = draft.abilityMethod
  const left = pointsRemaining(draft)
  const spent = POINT_BUY_BUDGET - left
  const methods: Array<{ value: AbilityMethod; label: string }> = [
    { value: 'standard', label: 'Standard array' },
    { value: 'pointbuy', label: 'Point buy' },
    { value: 'manual', label: 'Manual' },
  ]
  const costs = POINT_COST as Record<number, number>

  return (
    <>
      <div className="bst-bstep-head">
        <h3 className="bst-bstep-title">Abilities</h3>
        <div role="group" aria-label="Ability score method" className="bst-tabs">
          {methods.map(m => (
            <button
              key={m.value}
              type="button"
              aria-pressed={method === m.value}
              className="bst-plain bst-tab bst-tab--pressable"
              onClick={() => setDraft(d => withAbilityMethod(d, m.value))}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="bst-spacer" />
        {method === 'pointbuy' ? (
          <div role="img" aria-label={`${spent} of ${POINT_BUY_BUDGET} points spent`} className="bst-load bst-points">
            <span className="bst-load-head">
              <span>POINTS</span>
              <span className={left < 0 ? 'bst-points-over' : left === 0 ? 'bst-points-done' : undefined}>
                {spent} / {POINT_BUY_BUDGET} points spent ({left} left)
              </span>
            </span>
            <span className="bst-load-bar">
              <span
                className={left < 0 ? 'bst-load-fill bst-load-fill--over' : 'bst-load-fill'}
                style={{ width: `${Math.min(100, Math.round((spent / POINT_BUY_BUDGET) * 100))}%` }}
              />
            </span>
          </div>
        ) : null}
      </div>

      {overCap.length > 0 ? (
        <p role="status" className="bst-note bst-note--warn">
          {overCap.join(' · ')}. Lower the score, or take that increase elsewhere; this does not stop a save.
        </p>
      ) : null}

      <div className={narrow ? 'bst-abtiles bst-abtiles--narrow' : 'bst-abtiles'}>
        {ABILITY_KEYS.map(key => {
          const base = draft.abilityScores[key]
          const total = effectiveScore(draft, key, [...feats])
          const bonus = total - base
          const raised = bonus > 0
          return (
            <section key={key} aria-label={ABILITY_FULL[key]} className={raised ? 'bst-abtile bst-abtile--raised' : 'bst-abtile'}>
              <span className="bst-abtile-key">{ABILITY_SHORT[key]}</span>
              <span className="bst-abtile-total">{base > 0 ? total : '—'}</span>
              <span className="bst-abtile-mod">{base > 0 ? fmtMod(Math.floor((total - 10) / 2)) : 'unassigned'}</span>
              {method === 'pointbuy' ? (
                <span className="bst-stepper">
                  <button
                    type="button"
                    aria-label={`Lower ${ABILITY_SHORT[key]}`}
                    disabled={base <= 8}
                    className="bst-plain bst-stepper-btn"
                    onClick={() => setDraft(d => withScore(d, key, d.abilityScores[key] - 1))}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    aria-label={`Raise ${ABILITY_SHORT[key]}`}
                    disabled={!canIncrementScore(draft, key)}
                    className="bst-plain bst-stepper-btn"
                    onClick={() => setDraft(d => withScore(d, key, d.abilityScores[key] + 1))}
                  >
                    +
                  </button>
                </span>
              ) : method === 'standard' ? (
                <select
                  className="bst-select bst-select--compact"
                  aria-label={ABILITY_SHORT[key]}
                  value={base > 0 ? String(base) : ''}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10) || 0
                    setDraft(d => withScore(d, key, v))
                  }}
                >
                  <option value="">—</option>
                  {standardOptions(draft, key).map((v, i) => (
                    <option key={`${v}-${i}`} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  aria-label={ABILITY_SHORT[key]}
                  min={MANUAL_MIN}
                  max={MANUAL_MAX}
                  value={base}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10)
                    setDraft(d => withScore(d, key, Number.isFinite(v) ? v : 0))
                  }}
                  className="bst-input bst-abtile-input"
                />
              )}
              <span className="bst-abtile-foot">
                <span>
                  base {base > 0 ? base : '—'}
                  {method === 'pointbuy' && costs[base] !== undefined ? ` · ${costs[base]} pt` : ''}
                </span>
                <span className={raised ? 'bst-abtile-bonus' : 'bst-abtile-bonus bst-abtile-bonus--none'}>
                  {raised ? `+${bonus}${background ? ` ${background.name}` : ''}` : '—'}
                </span>
              </span>
            </section>
          )
        })}
      </div>

      {method === 'pointbuy' ? (
        <section aria-label="Point costs" className="bst-col">
          <h4 className="bst-label">Point costs</h4>
          <div className="bst-costs">
            {Object.entries(costs).map(([score, cost]) => (
              <span key={score} className="bst-cost">
                <span>{score}</span>
                <span className="bst-cost-pt">{cost} pt</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}
      <p className="bst-note">The background&apos;s increases are set on the Background step and show here as they land.</p>
    </>
  )
}
