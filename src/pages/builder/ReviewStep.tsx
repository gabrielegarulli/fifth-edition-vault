import type { OpenChoice } from '../../builder/choices'
import { allProblems, type BuilderDraft, type StepContext } from '../../builder/draft'
import { CharacterSheet } from '../../ui/CharacterSheet'
import { FeatureList } from '../../ui/FeatureList'
import type { BuiltSheet } from '../../vaultCharacter/index'

export interface Preview {
  key: string
  built: BuiltSheet | null
  error: string | null
}

/**
 * The last step: what is still unanswered, what Create will hand over, anything
 * the bake could not find a note for, and the sheet as it will be saved.
 *
 * **The real sheet, not a summary** (MYDND-155): the fence's own `CharacterSheet`
 * and the Features tab's `FeatureList` over the preview, so a player checks here
 * what they will get. It draws no rolls: this character has no note yet, and a
 * roll would reach Atlas and the session log under a name nobody saved.
 */
export function ReviewStep({
  preview,
  draft,
  ctx,
  openChoices,
  overCap,
  kit,
}: {
  preview: Preview | null
  draft: BuilderDraft
  ctx: StepContext
  /** Questions still unanswered — saved as they stand, listed so they are not missed. */
  openChoices: OpenChoice[]
  /** Scores an increase took past 20 — a warning, saved as it stands like the rest. */
  overCap: string[]
  /** What Create will hand over, or null when nothing is. */
  kit: { key: string; items: Array<{ item: { name: string }; quantity: number }>; gold: number } | null
}) {
  const problems = allProblems(draft, ctx)
  const sheet = preview?.built?.sheet ?? null

  return (
    <>
      <h3 className="bst-bstep-title">Review</h3>
      {problems.length > 0 ? <p className="bst-note bst-note--warn">Still to answer: {problems.join(' · ')}</p> : null}
      {openChoices.length > 0 ? (
        <p className="bst-note">Not chosen yet — saved as it stands, finish them in Edit: {openChoices.map(c => c.text).join(' · ')}</p>
      ) : null}
      {overCap.length > 0 ? <p className="bst-note bst-note--warn">{overCap.join(' · ')}</p> : null}
      {kit ? (
        <p className="bst-note">
          Starting equipment, option {kit.key.toUpperCase()}:{' '}
          {[
            ...kit.items.map(({ item, quantity }) => (quantity > 1 ? `${quantity} × ${item.name}` : item.name)),
            ...(kit.gold > 0 ? [`${kit.gold} gp`] : []),
          ].join(', ')}{' '}
          — added to the inventory when this character is saved.
        </p>
      ) : null}
      {preview === null ? (
        <p className="bst-note">Working out the sheet…</p>
      ) : preview.error ? (
        <p className="bst-note bst-note--warn">Could not preview the sheet: {preview.error}</p>
      ) : sheet ? (
        <section aria-label="The sheet as it will be saved" className="bst-col bst-col--gap">
          <span className="bst-bsection-title">The sheet as it will be saved</span>
          {preview.built && preview.built.missing.length > 0 ? (
            <p className="bst-note bst-note--warn">
              No note found for {preview.built.missing.join(', ')} — the sheet is missing whatever those grant.
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

export function Stat({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="bst-class-stat">
      <dt className="bst-vital-label">{label}</dt>
      <dd className="bst-class-stat-value">{value ?? '—'}</dd>
    </div>
  )
}
