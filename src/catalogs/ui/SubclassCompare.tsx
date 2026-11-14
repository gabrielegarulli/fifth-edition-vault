import { featuresByLevel, groupSubclasses, type FeatureCell, type SubclassGroupId } from '../../compendium'
import { useCompendium } from '../../compendium/host'
import type { ClassRow, SubclassRow } from '../../compendium'
import { useDetails } from '../../platform/host'

/** Four columns are what the canvas draws, and what a 1280px pane reads. */
export const MAX_COMPARED = 4

/**
 * Board B, "Subclasses compared level by level" (MYDND-86): up to four of a
 * class's subclasses side by side, one row per level any of them grants a
 * feature at, each cell the features' names and first sentences — all read
 * from the subclasses' fences, which is one note read per column.
 *
 * The source pills say which groups the "Add a subclass" list offers; the
 * columns stay whatever was picked.
 */
export function SubclassCompare({
  cls,
  subs,
  picked,
  sources,
  onToggleSource,
  onAdd,
  onRemove,
  onOpen,
  hereLevel,
}: {
  cls: ClassRow
  subs: SubclassRow[]
  picked: string[]
  sources: ReadonlySet<SubclassGroupId>
  onToggleSource: (id: SubclassGroupId) => void
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  onOpen: (id: string) => void
  /** The chosen character's level in the class, marked on its row; null for none. */
  hereLevel: number | null
}) {
  const compendium = useCompendium()
  const { details, loading } = useDetails(compendium.subclasses, picked)
  const groups = groupSubclasses(cls, subs)
  const columns = picked.map(id => subs.find(s => s.id === id)).filter((s): s is SubclassRow => !!s)
  const byColumn = columns.map(s => featuresByLevel(s.name, details.get(s.id)?.fence?.features ?? []))
  const levels = [...new Set(byColumn.flatMap(m => [...m.keys()]))].sort((a, b) => a - b)
  const offered = groups.filter(g => sources.has(g.id)).flatMap(g => g.rows).filter(s => !picked.includes(s.id))
  const full = picked.length >= MAX_COMPARED

  return (
    <div className="bst-compare-wrap">
      <div className="bst-lens-bar bst-compare-bar">
        <div role="group" aria-label="Sources" className="bst-compare-sources">
          {groups.map(g => (
            <button
              key={g.id}
              type="button"
              aria-pressed={sources.has(g.id)}
              title={g.sub || g.label}
              onClick={() => onToggleSource(g.id)}
              className="bst-plain bst-pill bst-pill--lg"
            >
              {shortLabel(g.id)} <span className="bst-mono bst-pill-count">{g.rows.length}</span>
            </button>
          ))}
        </div>
        <span className="bst-spacer" />
        <label className="bst-compare-add">
          <span className="bst-muted">{full ? `Comparing ${MAX_COMPARED} of ${MAX_COMPARED} · drop one to add another` : 'Add'}</span>
          <select
            aria-label={`Add a ${cls.name} subclass`}
            className="bst-select bst-select--compact"
            value=""
            disabled={full || offered.length === 0}
            onChange={e => e.target.value && onAdd(e.target.value)}
          >
            <option value="">{`Add a ${cls.name} subclass…`}</option>
            {offered.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.source})
              </option>
            ))}
          </select>
        </label>
      </div>

      {columns.length === 0 ? (
        <p className="bst-empty">
          <strong>Nothing to compare yet</strong>
          Add a subclass above, or open one from the class and choose “Compare with others”.
        </p>
      ) : (
        <div className="my-dnd-vault__scroll bst-compare" style={{ gridTemplateColumns: `72px repeat(${columns.length}, minmax(0, 1fr))` }}>
          <div />
          {columns.map(s => (
            <div key={s.id} className="bst-compare-head">
              <span className="bst-compare-headrow">
                <button type="button" className="bst-plain bst-compare-name" onClick={() => onOpen(s.id)}>
                  {s.name}
                </button>
                <button type="button" aria-label={`Stop comparing ${s.name}`} className="bst-plain bst-close bst-close--sm" onClick={() => onRemove(s.id)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </span>
              <span className="bst-muted bst-compare-src">{s.source}</span>
            </div>
          ))}

          {loading && levels.length === 0 ? (
            <p className="bst-note bst-compare-loading">Reading the subclasses…</p>
          ) : (
            levels.map(level => (
              <Row key={level} level={level} here={level === hereLevel} cells={byColumn.map(m => m.get(level) ?? [])} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function Row({ level, here, cells }: { level: number; here: boolean; cells: FeatureCell[][] }) {
  return (
    <>
      <div className="bst-compare-level">
        <span className="bst-vital-label">LEVEL</span>
        <span className="bst-compare-n">{level}</span>
        {here && <span className="bst-compare-here">here</span>}
      </div>
      {cells.map((feats, i) => (
        <div key={i} className={feats.length > 0 ? 'bst-compare-cell' : 'bst-compare-cell bst-compare-cell--none'}>
          {feats.length === 0 ? (
            <span className="bst-muted">—</span>
          ) : (
            feats.map(f => (
              <span key={f.name} className="bst-sub-feat">
                <strong className="bst-entry-name">{f.name}</strong>
                {f.gist && <span className="bst-entry-desc">{f.gist}</span>}
              </span>
            ))
          )}
        </div>
      ))}
    </>
  )
}

const shortLabel = (id: SubclassGroupId): string =>
  id === 'book' ? 'Same book' : id === 'legacy' ? 'Legacy' : id === 'official' ? 'Official' : 'Third-party'
