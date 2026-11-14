// The builder's Class step: the class, its subclass and level.

import { useState } from 'react'

import { ABILITY_FULL } from '@vault/derive/speciesChoices.js'

import {
  SKILL_NAME,
  classSkillChoices,
  multiclassSkillChoices,
  multiclassSkillKey,
  prereqsMet,
  type FeatData,
  subclassLevel,
  totalLevelOf,
  withExtraClass,
  withFlexibleAbility,
  withLevel,
  withSubclass,
  withoutClass,
  withFeatureChoice,
  type BuilderDraft,
} from '../../choices'
import {
  subclassesOf,
  type ClassFence,
  type ClassRow,
  type SubclassRow,
  classGroupOf,
} from '../../compendium'
import { OptionSelect, SlotSelects, SourceSelect, type SetDraft } from '../../choices/host'

/**
 * The class's features up to `level`, from its fence, for the "What levels 1–5
 * give" chips (MYDND-87). An option of another feature (Protector under Divine
 * Order) is not a gain until chosen; Ability Score Improvements are marked.
 */
function gainsUpTo(fence: ClassFence | null, level: number): Array<{ name: string; level: number; asi: boolean }> {
  const seen = new Set<string>()
  return (fence?.features ?? [])
    .filter(f => f.level <= level && !f.data?.optionOf)
    .filter(f => {
      if (seen.has(f.name)) return false
      seen.add(f.name)
      return true
    })
    .map(f => ({ name: f.name, level: f.level, asi: /ability score improvement/i.test(f.name) }))
}

/**
 * Class, level and subclass (MYDND-24) — plus, since MYDND-29, the level-1
 * skill picks and a second (third…) class.
 *
 * **Multiclass** follows the web builder: a class row is added blank and
 * picked, the first class alone sets saves and skills, and a class whose
 * ability prerequisites the scores do not meet is *warned*, not refused —
 * `multiclassPrereqsMet` passes homebrew it does not know, and a table may wave
 * the rule. A class taken beyond the first offers its multiclass skill instead
 * (`multiclassSkillChoices`), stored under its own key so the first class's
 * picks survive — see `multiclassSkillKey`.
 */
export function ClassStep({
  draft,
  setDraft,
  rows,
  subclasses,
  fences,
  feats,
  onPick,
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  rows: readonly ClassRow[]
  subclasses: readonly SubclassRow[]
  /** By `draft.classes` index. */
  fences: ReadonlyArray<ClassFence | null>
  feats: readonly FeatData[]
  onPick: (index: number, row: ClassRow | null) => void
}) {
  const [active, setActive] = useState(0)
  const index = Math.min(active, draft.classes.length - 1)
  const cls = draft.classes[index]
  const classRow = rows.find(r => r.id === cls?.id) ?? null
  const fence = fences[index] ?? null
  const level = cls?.level ?? 1
  const unlocks = subclassLevel(fence)
  const flexible = fence?.spellcasting_ability === 'flexible'
  const total = totalLevelOf(draft)
  const offered = rows.filter(r => !draft.classes.some((c, i) => i !== index && c.id === r.id))
  const subs = classRow ? subclassesOf(subclasses, classRow, rows) : []
  // The core twelve as cards, as the canvas draws them; every class stays in the select below.
  const core = offered.filter(r => classGroupOf(r) === 'core')
  const others = offered.length - core.length
  const fixedAbility =
    !flexible && typeof fence?.spellcasting_ability === 'string' ? fence.spellcasting_ability.toLowerCase().slice(0, 3) : null
  const gains = classRow ? gainsUpTo(fence, level) : []
  const stepLevel = (by: number) => setDraft(d => withLevel(d, (d.classes[index]?.level ?? 1) + by, fence, index))

  return (
    <>
      {draft.classes.length > 1 ? (
        <div role="group" aria-label="Classes" className="bst-wrap-row">
          {draft.classes.map((c, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={i === index}
              className="bst-plain bst-pill bst-pill--lg"
              onClick={() => setActive(i)}
            >
              {c.name ? `${c.name} ${c.level}` : `Class ${i + 1}`}
            </button>
          ))}
        </div>
      ) : null}

      <section aria-label="Pick a class" className="bst-col bst-col--gap">
        {core.length > 0 && (
          <>
            <div className="bst-bstep-head">
              <h3 className="bst-bstep-title">{index === 0 ? 'Class' : `Class ${index + 1}`}</h3>
              {others > 0 && <span className="bst-note">Core {core.length} shown · {others} more in the list below</span>}
            </div>
            <div role="radiogroup" aria-label="Core classes" className="bst-bclass-grid">
              {core.map(r => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={r.id === cls?.id}
                  className="bst-plain bst-bclass"
                  onClick={() => onPick(index, r)}
                >
                  <span className="bst-bclass-name">{r.name}</span>
                  <span className="bst-bclass-meta">{[r.hitDie, r.primaryAbility].filter(Boolean).join(' · ')}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <SourceSelect
          label={index === 0 ? 'Class' : `Class ${index + 1}`}
          rows={offered}
          value={cls?.id ?? ''}
          empty="No classes exported"
          onChange={row => onPick(index, row)}
        />
      </section>
      {index > 0 && classRow && !prereqsMet(draft, classRow.name, feats) ? (
        <p className="bst-note bst-note--warn">
          The ability scores do not meet {classRow.name}'s multiclass prerequisites.
        </p>
      ) : null}

      <div className={classRow ? 'bst-bclass-panel bst-bclass-panel--on' : 'bst-bclass-panel'}>
        <div className="bst-field">
          <span className="bst-field-label">{classRow ? `${classRow.name} level` : 'Level'}</span>
          <span className="bst-stepper">
            <button
              type="button"
              aria-label="One level lower"
              disabled={!classRow || level <= 1}
              className="bst-plain bst-stepper-btn"
              onClick={() => stepLevel(-1)}
            >
              −
            </button>
            <input
              type="number"
              aria-label="Level"
              min={1}
              max={20}
              value={level}
              disabled={!classRow}
              onChange={e => {
                const next = parseInt(e.target.value, 10)
                if (Number.isFinite(next)) setDraft(d => withLevel(d, next, fence, index))
              }}
              className="bst-input bst-stepper-value"
            />
            <button
              type="button"
              aria-label="One level higher"
              disabled={!classRow || level >= 20 || total >= 20}
              className="bst-plain bst-stepper-btn"
              onClick={() => stepLevel(1)}
            >
              +
            </button>
          </span>
        </div>
        {classRow ? (
          level >= unlocks ? (
            <OptionSelect
              label={fence?.data?.subclassTitle ? String(fence.data.subclassTitle) : 'Subclass'}
              value={cls?.subclass?.id ?? ''}
              placeholder={subs.length === 0 ? 'No subclasses exported' : 'None yet'}
              options={subs.map(s => ({ value: s.id, label: s.source ? `${s.name} (${s.source})` : s.name }))}
              onChange={v => {
                const sub = subs.find(s => s.id === v) ?? null
                setDraft(d => withSubclass(d, sub, index))
              }}
            />
          ) : (
            <div className="bst-field">
              <span className="bst-field-label">Subclass</span>
              <span className="bst-note bst-note--faint">A subclass is chosen at level {unlocks}.</span>
            </div>
          )
        ) : null}
        {flexible ? (
          <OptionSelect
            label="Spellcasting ability"
            value={cls?.spellcastingAbility ?? ''}
            options={['int', 'wis', 'cha'].map(a => ({ value: a, label: (ABILITY_FULL as Record<string, string>)[a] }))}
            onChange={v => setDraft(d => withFlexibleAbility(d, v, index))}
          />
        ) : fixedAbility ? (
          <div className="bst-field">
            <span className="bst-field-label">Spellcasting</span>
            <span className="bst-fixed">
              {(ABILITY_FULL as Record<string, string>)[fixedAbility] ?? fixedAbility}
              <span className="bst-note">fixed by the class</span>
            </span>
          </div>
        ) : null}
      </div>

      {classRow ? <SkillPicks draft={draft} setDraft={setDraft} index={index} fence={fence} /> : null}

      {gains.length > 0 && (
        <section aria-label={`What levels 1–${level} give`} className="bst-col">
          <h4 className="bst-label">What levels 1–{level} give</h4>
          <span className="bst-wrap-row">
            {gains.map(g => (
              <span key={`${g.level}-${g.name}`} className={g.asi ? 'bst-gain bst-gain--asi' : 'bst-gain'}>
                {g.name}
              </span>
            ))}
          </span>
        </section>
      )}

      <div className="bst-wrap-row">
        <button
          type="button"
          className="bst-plain bst-addclass"
          disabled={total >= 20 || draft.classes.some(c => !c.id)}
          onClick={() => {
            setDraft(d => withExtraClass(d))
            setActive(draft.classes.length)
          }}
        >
          <span aria-hidden="true" className="bst-free-plus">
            +
          </span>
          <span className="bst-free-text">
            <span className="bst-free-title">Add a class</span>
            <span className="bst-free-sub">Multiclass — levels must add up to 20 or less</span>
          </span>
        </button>
        {index > 0 ? (
          <button
            type="button"
            className="bst-plain bst-btn-secondary"
            onClick={() => {
              setDraft(d => withoutClass(d, index))
              setActive(index - 1)
            }}
          >
            Remove {cls?.name ?? 'class'}
          </button>
        ) : null}
      </div>
    </>
  )
}

function SkillPicks({
  draft,
  setDraft,
  index,
  fence,
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  index: number
  fence: ClassFence | null
}) {
  const primary = index === 0
  const choices = primary ? classSkillChoices(fence) : multiclassSkillChoices(fence)
  if (!choices) return null
  const classId = draft.classes[index]?.id ?? ''
  const key = multiclassSkillKey(classId)
  const picks = primary
    ? draft.skillProficiencies
    : Array.isArray(draft.featureChoices[key])
      ? (draft.featureChoices[key] as string[])
      : []
  return (
    <div className="bst-bsection">
      <span className="bst-bsection-title">
        {primary ? 'Skill proficiencies' : 'Multiclass skill'} — choose {choices.count}
      </span>
      <SlotSelects
        count={choices.count}
        label={i => `Skill ${i + 1}`}
        picks={picks}
        options={choices.options.map(s => ({ value: s, label: SKILL_NAME[s] ?? s }))}
        placeholder="— Choose a skill"
        onChange={next =>
          setDraft(d =>
            primary
              ? { ...d, skillProficiencies: next }
              : withFeatureChoice(d, key, next),
          )
        }
      />
    </div>
  )
}
