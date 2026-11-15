import { ABILITY_KEYS, type BuilderDraft, type BuilderProblem, type StepKey } from '../../choices'
import { ErrorIcon, MessageIcon, WarningIcon } from '../../choices/host'
import { CharacterSheet, FeatureList } from '../../characters/host'
import type { BuiltSheet } from '../../characterModel'

export interface Preview {
  key: string
  built: BuiltSheet | null
  error: string | null
}

/**
 * The last step (MYDND-216): everything still open, wherever it is, then the
 * character, then the sheet it makes.
 *
 * - **A legend, then two lists**: *Needed to save*, the errors, above *Still to
 *   answer*, the warnings. Each row jumps to the step that answers it; the name's
 *   row focuses the name field, which is above every step.
 * - **A summary**: name, classes, background, species and the six scores.
 * - **The real sheet, not a second summary** (MYDND-155): the fence's own
 *   `CharacterSheet` and the Features tab's `FeatureList` over the preview, so
 *   a player checks here what they will get. It draws no rolls: this character
 *   has no note yet, and a roll would reach Atlas and the session log under a
 *   name nobody saved.
 */
export function ReviewStep({
  preview,
  draft,
  errors,
  warnings,
  stepLabel,
  onJump,
  kit,
}: {
  preview: Preview | null
  draft: BuilderDraft
  /** What stops the save. */
  errors: readonly BuilderProblem[]
  /** Questions still unanswered: saved as they stand, listed so they are not missed. */
  warnings: readonly BuilderProblem[]
  stepLabel: (key: StepKey) => string
  onJump: (step: BuilderProblem['step']) => void
  /** What Create will hand over, or null when nothing is. */
  kit: { key: string; items: Array<{ item: { name: string }; quantity: number }>; gold: number } | null
}) {
  const sheet = preview?.built?.sheet ?? null
  const scoreOf = (key: string) => sheet?.abilities.find(a => a.label.toLowerCase() === key)?.score

  return (
    <>
      <h3 className="bst-cb-h1">Review</h3>
      <p className="bst-cb-lede">
        Everything still open, wherever it is. Nothing here stops a save except a name, a species and a class.
      </p>
      <p className="bst-cb-legend">
        <span>
          <ErrorIcon />
          Error: blocks saving
        </span>
        <span>
          <WarningIcon />
          Warning: a choice still open, saving works
        </span>
      </p>

      {errors.length > 0 ? (
        <section aria-labelledby="bst-review-errors">
          <h4 id="bst-review-errors" className="bst-cb-sub">
            Needed to save
          </h4>
          <ProblemList kind="error" problems={errors} stepLabel={stepLabel} onJump={onJump} />
        </section>
      ) : null}
      <section aria-labelledby="bst-review-warnings">
        <h4 id="bst-review-warnings" className="bst-cb-sub">
          Still to answer
        </h4>
        {warnings.length > 0 ? (
          <ProblemList kind="warning" problems={warnings} stepLabel={stepLabel} onJump={onJump} />
        ) : (
          <p className="bst-cb-empty">Nothing. Every question is answered.</p>
        )}
      </section>

      <section aria-labelledby="bst-review-character">
        <h4 id="bst-review-character" className="bst-cb-sub">
          The character
        </h4>
        <dl className="bst-cb-sumlist">
          <dt>Name</dt>
          <dd>{draft.name.trim() || '—'}</dd>
          <dt>Classes</dt>
          <dd>{draft.classes.filter(c => c.id).map(c => `${c.name} ${c.level}`).join(' / ') || '—'}</dd>
          <dt>Background</dt>
          <dd>{draft.background?.name ?? '—'}</dd>
          <dt>Species</dt>
          <dd>{draft.race?.name ?? '—'}</dd>
          <dt>Abilities</dt>
          <dd>{ABILITY_KEYS.map(k => `${k.toUpperCase()} ${scoreOf(k) ?? '—'}`).join(' · ')}</dd>
        </dl>
      </section>

      {kit ? (
        <p className="bst-cb-note">
          Starting equipment, option {kit.key.toUpperCase()}:{' '}
          {[
            ...kit.items.map(({ item, quantity }) => (quantity > 1 ? `${quantity} × ${item.name}` : item.name)),
            ...(kit.gold > 0 ? [`${kit.gold} gp`] : []),
          ].join(', ')}{' '}
          — added to the inventory when this character is saved.
        </p>
      ) : null}
      {preview === null ? (
        <p className="bst-cb-note">Working out the sheet…</p>
      ) : preview.error ? (
        <p className="bst-msg bst-msg--warn">
          <WarningIcon />
          <span>Could not preview the sheet: {preview.error}</span>
        </p>
      ) : sheet ? (
        <section aria-label="The sheet as it will be saved" className="bst-col bst-col--gap">
          <h4 className="bst-cb-sub">The sheet as it will be saved</h4>
          {preview.built && preview.built.missing.length > 0 ? (
            <p className="bst-msg bst-msg--warn">
              <WarningIcon />
              <span>No note found for {preview.built.missing.join(', ')} — the sheet is missing whatever those grant.</span>
            </p>
          ) : null}
          <CharacterSheet sheet={sheet} rolls={false}>
            <FeatureList sheet={sheet} />
          </CharacterSheet>
        </section>
      ) : null}
    </>
  )
}

function ProblemList({
  kind,
  problems,
  stepLabel,
  onJump,
}: {
  kind: 'error' | 'warning'
  problems: readonly BuilderProblem[]
  stepLabel: (key: StepKey) => string
  onJump: (step: BuilderProblem['step']) => void
}) {
  return (
    <ul className="bst-cb-todo">
      {problems.map(p => (
        <li key={`${p.step}-${p.text}`}>
          <button type="button" className="bst-plain bst-cb-todo-row" onClick={() => onJump(p.step)}>
            <MessageIcon kind={kind} />
            <span className="bst-cb-todo-text">
              <span>{p.text}</span>
              <span className="bst-cb-todo-step">
                <span className="bst-cb-sr">, </span>
                {kind === 'error' ? 'Error' : 'Warning'} · {p.step === 'name' ? 'Name' : stepLabel(p.step)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function Stat({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="bst-class-stat">
      <dt className="bst-vital-label">{label}</dt>
      <dd className="bst-class-stat-value">{value ?? '—'}</dd>
    </div>
  )
}
