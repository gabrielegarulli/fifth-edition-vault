import { featuresByLevel } from '../../compendium'
import { stripPreamble } from '../../platform'
import { useCompendium } from '../../compendium/host'
import type { SubclassRow } from '../../compendium'
import { useDetail, openNote, useObsidian, Markdown } from '../../platform/host'
import { ClassTile } from './ClassCards'

/**
 * One subclass, opened from the class's shelf (MYDND-86): its features level by
 * level, read from the ` ```vault-subclass ` fence, each with its first
 * sentence. A feature with more to say opens to its whole text (MYDND-123),
 * which is where a subclass's options are — maneuvers, arcane shots, runes.
 * A subclass with no fence shows its note's prose instead. The footer opens
 * the note, or puts it beside others in the comparison.
 */
export function SubclassDetail({
  sub,
  onClose,
  onCompare,
}: {
  sub: SubclassRow
  onClose(): void
  onCompare?: () => void
}) {
  const app = useObsidian()
  const compendium = useCompendium()
  const { detail, loading } = useDetail(compendium.subclasses, sub.id)
  const levels = detail?.fence ? [...featuresByLevel(sub.name, detail.fence.features ?? [])].sort((a, b) => a[0] - b[0]) : []
  const prose = detail ? stripPreamble(detail.prose) : ''

  return (
    <>
      <div className="bst-detail-head">
        <div className="bst-detail-id">
          <ClassTile size="lg" />
          <div className="bst-detail-names">
            <h3 className="bst-detail-name">{sub.name}</h3>
            <span className="bst-detail-sub">
              {[[sub.className, sub.subclassTitle?.toLowerCase() ?? 'subclass'].filter(Boolean).join(' '), sub.source]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
          <button type="button" aria-label="Close" className="bst-plain bst-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="my-dnd-vault__scroll bst-detail-scroll">
        {loading ? (
          <p className="bst-prose">Reading the note…</p>
        ) : levels.length > 0 ? (
          <ol aria-label="Features by level" className="bst-entries">
            {levels.map(([level, feats]) => (
              <li key={level} className="bst-entry">
                <span className="bst-entry-n">L{level}</span>
                <span className="bst-entry-body">
                  {feats.map(f =>
                    f.more ? (
                      // Closed it reads as the others do; open, the whole
                      // feature — the Battle Master's maneuvers among it.
                      <details key={f.name} className="bst-sub-feat bst-sub-more">
                        <summary className="bst-sub-summary">
                          <span className="bst-entry-name">{f.name}</span>
                          {f.gist && <span className="bst-entry-desc bst-sub-gist">{f.gist}</span>}
                        </summary>
                        <Markdown markdown={f.description} sourcePath={sub.path} className="bst-entry-desc bst-sub-full" />
                      </details>
                    ) : (
                      <span key={f.name} className="bst-sub-feat">
                        <span className="bst-entry-name">{f.name}</span>
                        {f.gist && <span className="bst-entry-desc">{f.gist}</span>}
                      </span>
                    ),
                  )}
                </span>
              </li>
            ))}
          </ol>
        ) : prose ? (
          <Markdown markdown={prose} sourcePath={sub.path} className="bst-prose bst-entry-desc bst-spell-prose" />
        ) : null}
      </div>

      <div className="bst-detail-foot">
        <div className="bst-foot-row">
          {onCompare && (
            <button type="button" className="bst-plain bst-btn-primary" onClick={onCompare}>
              Compare with others
            </button>
          )}
          <button
            type="button"
            className={onCompare ? 'bst-plain bst-btn-secondary' : 'bst-plain bst-btn-secondary bst-grow'}
            onClick={() => openNote(app, sub.path)}
          >
            Open note
          </button>
        </div>
      </div>
    </>
  )
}
