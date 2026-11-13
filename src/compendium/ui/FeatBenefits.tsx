import { splitBenefits, type FeatBenefit, type FeatFence, type FeatRow } from '../model/feats'
import type { Detail } from '../../platform'
import { stripPreamble } from '../../platform'
import { Markdown } from '../../platform/host'

/**
 * What a feat does: its benefits, numbered and marked, or the note's prose when
 * it has none. Apart from the panel so the builder can show it under a pick
 * (MYDND-155), where the panel's header and footer have no place. Here rather
 * than beside `catalogs/ui/FeatDetail.tsx` because the builder sits below the catalogs,
 * and this half reads nothing of a character's (MYDND-200).
 */
export function FeatBenefits({
  feat,
  detail,
  loading,
}: {
  feat: FeatRow
  detail: Detail<FeatFence> | null
  loading: boolean
}) {
  const { intro, listed } = splitBenefits(detail?.fence?.benefits)
  if (loading) return <p className="bst-prose">Reading the note…</p>
  if (listed.length > 0) {
    return (
      <>
        {intro.map((b, i) =>
          b.text ? (
            <Markdown key={`intro-${i}`} markdown={b.text} sourcePath={feat.path} className="bst-prose bst-entry-desc" />
          ) : null,
        )}
        <ol className="bst-entries bst-entries--feat">
          {listed.map((benefit, i) => (
            <BenefitItem key={benefit.key ?? benefit.name ?? i} benefit={benefit} n={i + 1} path={feat.path} />
          ))}
        </ol>
      </>
    )
  }
  // No fence, or a fence with no benefits: the note's own prose is all there is.
  const prose = detail ? stripPreamble(detail.prose) : ''
  return prose ? <Markdown markdown={prose} sourcePath={feat.path} className="bst-prose bst-entry-desc" /> : null
}

function BenefitItem({ benefit, n, path }: { benefit: FeatBenefit; n: number; path: string }) {
  const effects = benefit.effects?.length ?? 0
  return (
    <li className="bst-entry">
      <span className="bst-entry-n">{n}</span>
      <div className="bst-entry-body">
        <div className="bst-entry-head">
          <strong className="bst-entry-name">{benefit.name ?? 'Benefit'}</strong>
          {effects > 0 ? (
            <span className="bst-entry-tag bst-entry-tag--on">On sheet</span>
          ) : (
            <span className="bst-entry-tag">Prose only</span>
          )}
        </div>
        {benefit.text && <Markdown markdown={benefit.text} sourcePath={path} className="bst-entry-desc" />}
        {effects > 0 && (
          <p className="bst-note">
            {effects === 1 ? '1 modelled effect' : `${effects} modelled effects`}
            {benefit.adjudication ? ` · ${benefit.adjudication}` : ''}
          </p>
        )}
      </div>
    </li>
  )
}
