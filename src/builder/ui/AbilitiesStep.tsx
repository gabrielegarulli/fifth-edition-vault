// The builder's Abilities step: the method, then a block per ability with every part of its total (MYDND-216).

import { useId } from 'react'
import { canIncrementScore, effectiveScore, pointsRemaining } from '@vault/derive/builderDraft.js'
import { POINT_BUY_BUDGET } from '@vault/derive/dnd5e.js'
import { ABILITY_FULL } from '@vault/derive/speciesChoices.js'

import type { FeatData, OpenChoice } from '../../choices'
import {
  ABILITY_KEYS,
  MANUAL_MAX,
  MANUAL_MIN,
  standardOptions,
  withAbilityMethod,
  withAdjustment,
  withAdjustmentAdded,
  withAdjustmentRemoved,
  withOverride,
  withScore,
  type AbilityKey,
  type AbilityMethod,
  type BuilderDraft,
} from '../../choices'
import type { BackgroundRow } from '../../compendium'
import { ADJUSTMENT_CAP, OVERRIDE_MAX, OVERRIDE_MIN, fmtMod } from '../../characterModel'
import { Message, type SetDraft } from '../../choices/host'

const METHODS: Array<{ value: AbilityMethod; label: string }> = [
  { value: 'standard', label: 'Standard array' },
  { value: 'manual', label: 'Manual / rolled' },
  { value: 'pointbuy', label: 'Point buy' },
]

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`)

/**
 * The Abilities step, modelled on D&D Beyond's (MYDND-216): the method as a
 * select, the point-buy budget beside it, then one block per ability with its
 * **total and modifier**, a line that names every part of the total, and each
 * part on its own row — the base (the method's control), the background's
 * bonus, the stacking bonus from feats and increases, a score an effect sets,
 * the player's **other modifiers** (each a signed amount with a reason), and an
 * **override** that replaces the total.
 *
 * The total here is worked out from the draft, as the sheet's bake works it
 * out: the base and the background, feats and increases (each capped at 20),
 * the modifier lines (capped at 30), the floor an effect sets, then the
 * override. The six blocks sit in an auto-fill grid, three across in the 600px
 * column and one on a phone, without measuring the pane.
 */
export function AbilitiesStep({
  draft,
  setDraft,
  feats,
  background,
  overCap,
  problems,
  open,
  sets,
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  /** Picked feats with fences, so a half-feat's +1 shows in the total (VAULT-185). */
  feats: readonly FeatData[]
  /** Named on a block's background row, so "+2 Soldier" says where the 2 came from. */
  background: BackgroundRow | null
  /** Scores an increase took past 20. Said here, where the base scores are set. */
  overCap: readonly string[]
  /** `stepProblems('abilities')`: the method's own warnings. */
  problems: readonly string[]
  /** This step's open questions (points left, a modifier without a reason). */
  open: readonly OpenChoice[]
  /** Each ability an effect sets, from the preview's bake. */
  sets: Readonly<Record<string, number>>
}) {
  const methodId = useId()
  const method = draft.abilityMethod
  const left = pointsRemaining(draft)
  const spent = POINT_BUY_BUDGET - left
  const pointsLeft = open.find(o => / left to spend$/.test(o.text))

  return (
    <>
      <h3 className="bst-cb-h1">Ability scores</h3>
      <p className="bst-cb-lede">Each score is its base, plus the background&apos;s increase, plus anything else that applies, and each part is named.</p>
      <div className="bst-cb-method">
        <div>
          <label className="bst-cb-label" htmlFor={methodId}>
            Generation method
          </label>
          <select id={methodId} className="bst-select" value={method} onChange={e => setDraft(d => withAbilityMethod(d, e.target.value as AbilityMethod))}>
            {METHODS.map(m => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {method === 'pointbuy' ? (
          <div className="bst-cb-points" role="img" aria-label={`${spent} of ${POINT_BUY_BUDGET} points spent`}>
            <div className="bst-cb-points-h">
              <span>Points spent</span>
              <span>
                {spent} / {POINT_BUY_BUDGET}
              </span>
            </div>
            <div className="bst-cb-bar">
              <span
                className={left < 0 ? 'bst-cb-bar-fill bst-cb-bar-fill--over' : 'bst-cb-bar-fill'}
                style={{ width: `${Math.min(100, Math.round((spent / POINT_BUY_BUDGET) * 100))}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
      {[...problems, ...(pointsLeft ? [pointsLeft.text] : []), ...overCap].map(text => (
        <Message key={text} kind="warning">
          {text}
        </Message>
      ))}

      <div className="bst-cb-abgrid">
        {ABILITY_KEYS.map(key => (
          <AbilityBlock key={key} ability={key} draft={draft} setDraft={setDraft} feats={feats} background={background} set={sets[key] ?? null} />
        ))}
      </div>
      <p className="bst-cb-note">
        An override replaces the total outright. A modifier line always needs a reason, so the sheet can say where every point came from.
      </p>
    </>
  )
}

function AbilityBlock({
  ability,
  draft,
  setDraft,
  feats,
  background,
  set,
}: {
  ability: AbilityKey
  draft: BuilderDraft
  setDraft: SetDraft
  feats: readonly FeatData[]
  background: BackgroundRow | null
  set: number | null
}) {
  const overrideId = useId()
  const name = ABILITY_FULL[ability] ?? ability
  const method = draft.abilityMethod
  const base = draft.abilityScores[ability]
  const withFeats = effectiveScore(draft, ability, [...feats])
  const bg = backgroundBonusFor(draft, ability)
  const stacking = withFeats - base - bg
  const lines = (draft.abilityAdjustments ?? []).map((a, index) => ({ ...a, index })).filter(a => a.ability === ability)

  let total = withFeats
  for (const l of lines) if (l.value < 0) total += l.value
  for (const l of lines) if (l.value > 0) total = Math.max(total, Math.min(total + l.value, ADJUSTMENT_CAP))
  if (set !== null) total = Math.max(total, set)
  const override = draft.abilityOverrides?.[ability] ?? null
  if (override !== null) total = override
  const assigned = base > 0

  const why =
    override !== null
      ? `Overridden to ${override}`
      : [
          `${assigned ? base : '—'} base`,
          bg ? `${signed(bg)} ${background?.name ?? 'background'}` : null,
          stacking ? `${signed(stacking)} feats and increases` : null,
          ...lines.map(l => `${signed(l.value)} ${l.reason.trim() || 'unnamed'}`),
          set !== null ? `at least ${set}, set by an effect` : null,
        ]
          .filter(Boolean)
          .join(' · ')

  return (
    <section aria-label={name} className="bst-cb-ab">
      <h4 className="bst-cb-ab-h">{name}</h4>
      <div className="bst-cb-ab-tot">
        <div>
          <span>Total score</span>
          <b>{assigned || override !== null ? total : '—'}</b>
        </div>
        <div>
          <span>Modifier</span>
          <b>{assigned || override !== null ? fmtMod(Math.floor((total - 10) / 2)) : '—'}</b>
        </div>
      </div>
      <p className="bst-cb-ab-why">{why}</p>
      <dl className="bst-cb-ab-rows">
        <div className="bst-cb-ab-row">
          <dt>Base score</dt>
          <dd>
            {method === 'pointbuy' ? (
              <span className="bst-cb-stepper">
                <button
                  type="button"
                  aria-label={`Lower ${name}`}
                  disabled={base <= 8}
                  className="bst-plain"
                  onClick={() => setDraft(d => withScore(d, ability, d.abilityScores[ability] - 1))}
                >
                  <Minus />
                </button>
                <output aria-live="polite">{base}</output>
                <button
                  type="button"
                  aria-label={`Raise ${name}`}
                  disabled={!canIncrementScore(draft, ability)}
                  className="bst-plain"
                  onClick={() => setDraft(d => withScore(d, ability, d.abilityScores[ability] + 1))}
                >
                  <Plus />
                </button>
              </span>
            ) : method === 'standard' ? (
              <select
                className="bst-select bst-select--compact"
                aria-label={`${name} base score`}
                value={assigned ? String(base) : ''}
                onChange={e => setDraft(d => withScore(d, ability, parseInt(e.target.value, 10) || 0))}
              >
                <option value="">—</option>
                {standardOptions(draft, ability).map((v, i) => (
                  <option key={`${v}-${i}`} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                aria-label={`${name} base score`}
                min={MANUAL_MIN}
                max={MANUAL_MAX}
                value={base}
                onChange={e => {
                  const v = parseInt(e.target.value, 10)
                  setDraft(d => withScore(d, ability, Number.isFinite(v) ? v : 0))
                }}
                className="bst-input bst-cb-ab-in"
              />
            )}
          </dd>
        </div>
        <div className="bst-cb-ab-row">
          <dt>Background bonus</dt>
          <dd>{bg ? `${signed(bg)} ${background?.name ?? ''}`.trim() : '—'}</dd>
        </div>
        <div className="bst-cb-ab-row">
          <dt>Stacking bonus</dt>
          <dd>{stacking ? signed(stacking) : '—'}</dd>
        </div>
        <div className="bst-cb-ab-row">
          <dt>Set score</dt>
          <dd>{set ?? '—'}</dd>
        </div>
      </dl>

      <div className="bst-cb-others">
        <div className="bst-cb-others-h">
          <span>Other modifiers</span>
          <button type="button" aria-label={`Add a ${name} modifier`} className="bst-plain bst-cb-link" onClick={() => setDraft(d => withAdjustmentAdded(d, ability))}>
            + Add
          </button>
        </div>
        {lines.map(line => (
          <div key={line.index} className="bst-cb-adj">
            <span className="bst-cb-stepper">
              <button
                type="button"
                aria-label={`Lower this ${name} modifier`}
                className="bst-plain"
                onClick={() => setDraft(d => withAdjustment(d, line.index, { value: line.value - 1 }))}
              >
                <Minus />
              </button>
              <output aria-live="polite">{signed(line.value)}</output>
              <button
                type="button"
                aria-label={`Raise this ${name} modifier`}
                className="bst-plain"
                onClick={() => setDraft(d => withAdjustment(d, line.index, { value: line.value + 1 }))}
              >
                <Plus />
              </button>
            </span>
            <button
              type="button"
              aria-label={`Remove this ${name} modifier`}
              className="bst-plain bst-cb-adj-x"
              onClick={() => setDraft(d => withAdjustmentRemoved(d, line.index))}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <input
              type="text"
              aria-label={`Reason for this ${name} modifier`}
              placeholder="Reason, e.g. a magic item"
              value={line.reason}
              onChange={e => {
                const reason = e.target.value
                setDraft(d => withAdjustment(d, line.index, { reason }))
              }}
              aria-invalid={!line.reason.trim() || undefined}
              className={line.reason.trim() ? 'bst-input bst-cb-adj-in' : 'bst-input bst-cb-adj-in bst-cb-adj-in--warn'}
            />
            {!line.reason.trim() ? <Message kind="warning">Say where it comes from.</Message> : null}
          </div>
        ))}
      </div>

      <div className="bst-cb-ab-row bst-cb-ab-over">
        <label htmlFor={overrideId}>Override score</label>
        <input
          id={overrideId}
          type="number"
          min={OVERRIDE_MIN}
          max={OVERRIDE_MAX}
          placeholder="—"
          value={override ?? ''}
          onChange={e => {
            const v = parseInt(e.target.value, 10)
            setDraft(d => withOverride(d, ability, Number.isFinite(v) && v >= OVERRIDE_MIN && v <= OVERRIDE_MAX ? v : null))
          }}
          className="bst-input bst-cb-ab-in"
        />
      </div>
    </section>
  )
}

/** What the background's increase gives one ability, in either mode. */
function backgroundBonusFor(draft: BuilderDraft, key: AbilityKey): number {
  const b = draft.backgroundBonuses ?? {}
  if (b.mode === 'three_ones') return [b.first, b.second, b.third].filter(k => k === key).length
  return (b.primary === key ? 2 : 0) + (b.secondary === key ? 1 : 0)
}

function Minus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  )
}

function Plus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
