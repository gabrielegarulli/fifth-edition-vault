// The Classes catalog page: the class shelves, a class's progression and
// features, and its subclasses.

import { useState } from 'react'

import {
  featuresByLevel,
  groupClasses,
  groupSubclasses,
  levelIn,
  readProgression,
  type SubclassGroupId,
  subclassesOf,
  type ClassRow,
  type SubclassRow,
} from '../../compendium'
import { matchAnyField, stripPreamble, BUILDER_NEW_PATH } from '../../platform'
import { useCompendium } from '../../compendium/host'
import { useCatalogPage } from './hooks/useCatalogPage'
import {
  useDetail,
  useDetails,
  useElementWidth,
  useCatalogRows,
  useRouteLink,
  Markdown,
} from '../../platform/host'
import { useRoster } from '../../characters/host'
import { Chevron } from './BestiaryCards'
import { ClassProgression } from './ClassProgression'
import { ClassTile, SubclassCard } from './ClassCards'
import { MAX_COMPARED, SubclassCompare } from './SubclassCompare'
import { SubclassDetail } from './SubclassDetail'

/**
 * Classes and their subclasses — boards A to C of the "Classes & Builder
 * Layout Proposal" canvas, as drawn (MYDND-86).
 *
 * - **A · Class** (`WIDE_WIDTH` and up): every class in a rail grouped by where
 *   it comes from; the open class with its stat tiles and its own level table,
 *   subclass levels tinted and a character's level marked; then the class's
 *   prose. Beside it (`SHELF_BESIDE_WIDTH`), or under it, the subclass shelf: the
 *   ones printed with the class as cards, the rest grouped by source.
 * - **B · Compare subclasses**: up to four side by side, level by level, from
 *   their fences (`catalogs/ui/SubclassCompare.tsx`).
 * - **C · Narrow**: the classes as grouped rows; an open class as Levels,
 *   Subclasses and Features tabs.
 *
 * **The class note's body is still the page's source.** Its level table is the
 * markdown table the exporter writes, read for display by `readProgression`, and
 * its features are its prose, rendered by Obsidian. Subclasses stay inside their
 * class rather than becoming a seventh catalog — 680 notes nobody browses
 * alphabetically.
 *
 * Departures from the canvas: the rail has three groups (core, other official,
 * third-party) rather than naming one third-party publisher; "Pick for Ilsa" is
 * not drawn, because choosing a subclass is the level-up's job and writes the
 * character; the narrow pane has no Compare (four columns do not fit 400px).
 */

export const WIDE_WIDTH = 820
/** Rail 220 + class ~640 + shelf 340: below this the shelf goes under the class. */
export const SHELF_BESIDE_WIDTH = 1200
/** The table shows levels up to this until "All levels". */
const LEVEL_PREVIEW = 10

type View = 'class' | 'compare'
type NarrowTab = 'levels' | 'subclasses' | 'features'

const ALL_SOURCES: ReadonlySet<SubclassGroupId> = new Set(['book', 'legacy', 'official', 'third'])

export default function ClassesPage() {
  const compendium = useCompendium()
  const link = useRouteLink()
  const rows = useCatalogRows(() => compendium.classes.list())
  const subclassRows = useCatalogRows(() => compendium.subclasses.list())
  const { entries: roster } = useRoster()

  const [view, setView] = useState<View>('class')
  const [subId, setSubId] = useState<string | null>(null)
  const [allLevels, setAllLevels] = useState(false)
  const [whoPath, setWhoPath] = useState<string | null>(null)
  const [narrowTab, setNarrowTab] = useState<NarrowTab>('levels')
  const [comparing, setComparing] = useState<{ classId: string; ids: string[] } | null>(null)
  const [sources, setSources] = useState<ReadonlySet<SubclassGroupId>>(() => new Set(['book']))

  const catalog = useCatalogPage<ClassRow>({
    rows,
    pageSize: Number.MAX_SAFE_INTEGER,
    match: matchAnyField<ClassRow>([r => r.name, r => r.primaryAbility, r => r.source]),
    facets: [],
  })

  const [paneRef, width] = useElementWidth<HTMLDivElement>()
  const wide = width === 0 || width >= WIDE_WIDTH
  const shelfBeside = width === 0 || width >= SHELF_BESIDE_WIDTH

  const groups = groupClasses(catalog.filtered)
  // Wide, a class is always open — the first core class until one is chosen —
  // because the page is the class. Narrow, nothing is until one is tapped.
  const fallback = wide ? (groups[0]?.rows[0] ?? null) : null
  const cls = rows.find(c => c.id === catalog.selectedId) ?? fallback
  const subs = cls ? subclassesOf(subclassRows, cls, rows) : []
  const subGroups = cls ? groupSubclasses(cls, subs) : []
  const openSub = subId ? (subs.find(s => s.id === subId) ?? null) : null

  const { detail, loading } = useDetail(compendium.classes, cls?.id ?? null)
  const prose = detail ? stripPreamble(detail.prose) : ''
  const progression = prose ? readProgression(prose) : null

  // Whose level to mark: anyone in the roster with a level in this class.
  const players = cls
    ? roster
        .map(e => ({ path: e.path, name: e.name, level: levelIn(e.sheet?.classes, cls.name) }))
        .filter((p): p is { path: string; name: string; level: number } => p.level !== null)
    : []
  const who = players.find(p => p.path === whoPath) ?? players[0] ?? null

  // The first cards' features, for their one line: one read each, the book's group only.
  const bookRows = subGroups.find(g => g.id === 'book')?.rows ?? []
  const cardIds = bookRows.slice(0, 6).map(s => s.id)
  const cardDetails = useDetails(compendium.subclasses, cardIds)
  const cardLine = (s: SubclassRow): string | null => {
    const fence = cardDetails.details.get(s.id)?.fence
    if (!fence) return null
    const first = [...featuresByLevel(s.name, fence.features ?? [])].sort((a, b) => a[0] - b[0])[0]
    return first ? `L${first[0]} · ${first[1].map(f => f.name).join(' · ')}` : null
  }

  const picked =
    cls && comparing?.classId === cls.id ? comparing.ids : bookRows.slice(0, MAX_COMPARED).map(s => s.id)
  const setPicked = (ids: string[]) => cls && setComparing({ classId: cls.id, ids })

  function selectClass(id: string | null) {
    setSubId(null)
    setAllLevels(false)
    setNarrowTab('levels')
    catalog.select(id)
  }

  function compareWith(id: string) {
    if (!cls) return
    const ids = picked.includes(id) ? picked : [id, ...picked].slice(0, MAX_COMPARED)
    setPicked(ids)
    setSubId(null)
    setView('compare')
  }

  const search = (
    <input
      type="search"
      aria-label="Search classes"
      value={catalog.searchInput}
      onChange={e => catalog.setSearchInput(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Escape') catalog.clearSearch()
      }}
      placeholder={wide ? 'Search a class or its book' : 'Search classes'}
      className="bst-search"
    />
  )
  const tabs = (
    <div role="group" aria-label="View" className="bst-tabs">
      <button type="button" aria-current={view === 'class' ? 'true' : undefined} className="bst-plain bst-tab" onClick={() => setView('class')}>
        Class
      </button>
      <button type="button" aria-current={view === 'compare' ? 'true' : undefined} className="bst-plain bst-tab" onClick={() => setView('compare')}>
        Compare subclasses
      </button>
    </div>
  )
  const empty =
    rows.length === 0 ? (
      <p className="bst-empty">
        <strong>No classes in this vault</strong>
        Classes are notes in a <code>{compendium.ruleFolder('classes')}/</code> folder. Run the class exporter, or open a vault that has them.
      </p>
    ) : groups.length === 0 ? (
      <p className="bst-empty">
        <strong>No classes match this search</strong>
      </p>
    ) : null

  const stats = cls ? (
    <dl className="bst-class-stats">
      <Stat label="HIT DIE" value={cls.hitDie} />
      <Stat label="PRIMARY" value={cls.primaryAbility} />
      <Stat label="SAVES" value={cls.savingThrows.join(' ') || null} />
      <Stat label="CASTS WITH" value={cls.spellcastingAbility} />
    </dl>
  ) : null

  const whoPicker =
    players.length > 1 ? (
      <select
        aria-label="Whose level to mark"
        className="bst-select bst-select--compact"
        value={who?.path ?? ''}
        onChange={e => setWhoPath(e.target.value)}
      >
        {players.map(p => (
          <option key={p.path} value={p.path}>
            {p.name} · {p.level}
          </option>
        ))}
      </select>
    ) : null

  const table = progression ? (
    <ClassProgression progression={progression} hereLevel={who?.level ?? null} limit={allLevels ? null : LEVEL_PREVIEW} />
  ) : loading ? (
    <p className="bst-note">Reading the note…</p>
  ) : (
    <p className="bst-note">This class note has no level table.</p>
  )

  const features = prose ? (
    <Markdown markdown={withoutFirstTable(prose)} sourcePath={cls!.path} className="bst-prose bst-entry-desc bst-spell-prose bst-class-prose" />
  ) : null

  const shelf = cls ? (
    <SubclassShelf
      cls={cls}
      total={subs.length}
      groups={subGroups}
      selectedId={subId}
      onOpen={setSubId}
      cardLine={cardLine}
    />
  ) : null

  const subPanel = openSub ? (
    <div className="bst-overlay">
      <div className="bst-detail">
        <SubclassDetail key={openSub.id} sub={openSub} onClose={() => setSubId(null)} onCompare={wide ? () => compareWith(openSub.id) : undefined} />
      </div>
    </div>
  ) : null

  if (!wide) {
    return (
      <div ref={paneRef} className="bst">
        {cls ? (
          <>
            <header className="bst-header bst-header--narrow">
              <div className="bst-titles bst-titles--center">
                <button type="button" aria-label="All classes" className="bst-plain bst-close bst-back" onClick={() => selectClass(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
                <h2 className="bst-title">{cls.name}</h2>
                <span className="bst-count">{cls.source}</span>
              </div>
              {stats}
              <div role="group" aria-label="Section" className="bst-toggle-grid bst-toggle-grid--3">
                {(['levels', 'subclasses', 'features'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    aria-current={narrowTab === t ? 'true' : undefined}
                    className="bst-plain bst-toggle bst-toggle--tab"
                    onClick={() => setNarrowTab(t)}
                  >
                    {t === 'levels' ? 'Levels' : t === 'subclasses' ? `Subclasses ${subs.length}` : 'Features'}
                  </button>
                ))}
              </div>
            </header>
            <div className="my-dnd-vault__scroll">
              {narrowTab === 'levels' ? (
                progression ? (
                  <NarrowLevels progression={progression} hereLevel={who?.level ?? null} hereName={who?.name ?? null} />
                ) : (
                  <div className="bst-pad">{table}</div>
                )
              ) : narrowTab === 'subclasses' ? (
                subGroups.map(g => (
                  <section key={g.id} aria-labelledby={`sg-${g.id}`}>
                    <h3 id={`sg-${g.id}`} className="bst-group-head">
                      {g.label}
                      <span className="bst-group-count">{g.rows.length}</span>
                    </h3>
                    {g.rows.map(s => (
                      <button key={s.id} type="button" className="bst-plain bst-row" onClick={() => setSubId(s.id)}>
                        <span className="bst-row-main">
                          <span className="bst-row-name">{s.name}</span>
                          <span className="bst-row-kind">{s.source}</span>
                        </span>
                        <Chevron />
                      </button>
                    ))}
                  </section>
                ))
              ) : (
                features
              )}
            </div>
          </>
        ) : (
          <>
            <header className="bst-header bst-header--narrow">
              <div className="bst-titles">
                <h2 className="bst-title">Classes</h2>
                <span className="bst-count">{rows.length}</span>
              </div>
              {search}
            </header>
            <div className="my-dnd-vault__scroll">
              {empty ??
                groups.map(g => (
                  <section key={g.id} aria-labelledby={`cg-${g.id}`}>
                    <h3 id={`cg-${g.id}`} className="bst-group-head">
                      {g.label}
                      <span className="bst-group-count">{g.rows.length}</span>
                    </h3>
                    {g.rows.map(c => (
                      <button key={c.id} type="button" className="bst-plain bst-row" onClick={() => selectClass(c.id)}>
                        <span className="bst-row-main">
                          <span className="bst-row-name">{c.name}</span>
                          <span className="bst-row-kind">
                            {[c.primaryAbility, `${subclassesOf(subclassRows, c, rows).length} subclasses`].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        <span className="bst-row-cr">
                          <span className="bst-row-crv">{c.hitDie}</span>
                        </span>
                        <Chevron />
                      </button>
                    ))}
                  </section>
                ))}
            </div>
          </>
        )}
        {subPanel}
      </div>
    )
  }

  return (
    <div ref={paneRef} className="bst">
      <header className="bst-header">
        <div className="bst-titles">
          <h2 className="bst-title">Classes</h2>
          <span className="bst-count">
            {rows.length} classes · {subclassRows.length.toLocaleString('en-US')} subclasses
          </span>
        </div>
        {tabs}
        <span className="bst-spacer" />
        {search}
        <button type="button" className="bst-plain bst-btn-primary bst-btn-head" {...link(BUILDER_NEW_PATH)}>
          New character
        </button>
      </header>

      <div className="bst-body">
        <nav aria-label="Classes" className="my-dnd-vault__scroll bst-rail bst-rail--classes">
          {empty ??
            groups.map(g => (
              <section key={g.id} className="bst-group bst-group--tight">
                <h3 className="bst-label bst-label--row">
                  <span>{g.label}</span>
                  <span className="bst-mono">{g.rows.length}</span>
                </h3>
                {g.rows.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    aria-current={c.id === cls?.id ? 'page' : undefined}
                    aria-pressed={c.id === cls?.id}
                    onClick={() => selectClass(c.id)}
                    className="bst-plain bst-tier bst-tier--class"
                  >
                    <span className="bst-spacer bst-tier-name">{c.name}</span>
                    <span className="bst-tier-count">{c.hitDie}</span>
                  </button>
                ))}
              </section>
            ))}
        </nav>

        {cls && view === 'compare' ? (
          <SubclassCompare
            cls={cls}
            subs={subs}
            picked={picked}
            sources={sources}
            onToggleSource={id =>
              setSources(prev => {
                const next = new Set(prev)
                if (!next.delete(id)) next.add(id)
                return next.size === 0 ? ALL_SOURCES : next
              })
            }
            onAdd={id => setPicked([...picked, id].slice(0, MAX_COMPARED))}
            onRemove={id => setPicked(picked.filter(p => p !== id))}
            onOpen={setSubId}
            hereLevel={who?.level ?? null}
          />
        ) : cls ? (
          <>
            <main className="my-dnd-vault__scroll bst-class-main">
              <div className="bst-class-head">
                <ClassTile size="lg" />
                <div className="bst-detail-names">
                  <h3 className="bst-class-name">{cls.name}</h3>
                  <span className="bst-detail-sub">{[cls.source, cls.edition].filter(Boolean).join(' · ')}</span>
                </div>
                {stats}
              </div>

              <div className="bst-class-legend">
                <h4 className="bst-label">Progression</h4>
                {progression?.rows.some(r => r.subclass) && (
                  <span className="bst-legend">
                    <span aria-hidden="true" className="bst-legend-swatch bst-legend-swatch--sub" />
                    subclass level
                  </span>
                )}
                {who && (
                  <span className="bst-legend">
                    <span aria-hidden="true" className="bst-legend-swatch bst-legend-swatch--here" />
                    {who.name} is here
                  </span>
                )}
                {whoPicker}
                <span className="bst-spacer" />
                {progression && progression.rows.length > LEVEL_PREVIEW && (
                  <button type="button" className="bst-plain bst-link" onClick={() => setAllLevels(a => !a)}>
                    {allLevels ? `Levels 1–${LEVEL_PREVIEW}` : `Levels ${LEVEL_PREVIEW + 1}–${progression.rows.length} →`}
                  </button>
                )}
              </div>
              {table}
              {features && (
                <section aria-label="Features" className="bst-class-features">
                  <h4 className="bst-label">Features</h4>
                  {features}
                </section>
              )}
              {!shelfBeside && shelf}
            </main>
            {shelfBeside && <aside aria-label={`${cls.name} subclasses`} className="my-dnd-vault__scroll bst-subshelf">{shelf}</aside>}
          </>
        ) : null}
      </div>
      {subPanel}
    </div>
  )
}

function SubclassShelf({
  cls,
  total,
  groups,
  selectedId,
  onOpen,
  cardLine,
}: {
  cls: ClassRow
  total: number
  groups: ReturnType<typeof groupSubclasses>
  selectedId: string | null
  onOpen(id: string): void
  cardLine(s: SubclassRow): string | null
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())
  const book = groups.find(g => g.id === 'book')
  const rest = groups.filter(g => g.id !== 'book')
  return (
    <div className="bst-subshelf-inner">
      <div className="bst-subshelf-head">
        <h3 className="bst-shelf-title">{subNoun(groups)}</h3>
        <span className="bst-mono bst-muted">{total}</span>
      </div>
      {total === 0 && <p className="bst-note">No subclass note names {cls.name}.</p>}
      {book?.rows.map(s => (
        <SubclassCard key={s.id} sub={s} line={cardLine(s)} selected={s.id === selectedId} onOpen={() => onOpen(s.id)} />
      ))}
      {rest.length > 0 && <h4 className="bst-label bst-subshelf-more">{book ? 'More, by source' : 'By source'}</h4>}
      {rest.map(g => {
        const isOpen = open.has(g.id)
        return (
          <section key={g.id} aria-label={g.label} className="bst-subgroup">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() =>
                setOpen(prev => {
                  const next = new Set(prev)
                  if (!next.delete(g.id)) next.add(g.id)
                  return next
                })
              }
              className="bst-plain bst-subgroup-head"
            >
              <span className="bst-subgroup-names">
                <span className="bst-subgroup-label">{g.label}</span>
                {g.sub && <span className="bst-subgroup-sub">{g.sub}</span>}
              </span>
              <span className="bst-mono bst-muted">{g.rows.length}</span>
              <Chevron down={isOpen} />
            </button>
            {isOpen &&
              g.rows.map(s => (
                <button key={s.id} type="button" aria-pressed={s.id === selectedId} className="bst-plain bst-subrow" onClick={() => onOpen(s.id)}>
                  <span className="bst-spacer">{s.name}</span>
                  <span className="bst-subcard-src">{s.source}</span>
                </button>
              ))}
          </section>
        )
      })}
    </div>
  )
}

function NarrowLevels({
  progression,
  hereLevel,
  hereName,
}: {
  progression: NonNullable<ReturnType<typeof readProgression>>
  hereLevel: number | null
  hereName: string | null
}) {
  return (
    <ol aria-label="Levels" className="bst-nlevels">
      {progression.rows.map(r => {
        const here = r.level === hereLevel
        const slots = r.slots.filter(n => n > 0).join('·')
        const extra = r.extra
          .filter(c => c.value && c.value !== '—')
          .map(c => `${c.value} ${c.header.toLowerCase()}`)
          .join(' · ')
        return (
          <li key={r.level} className={here ? 'bst-nlevel bst-nlevel--here' : 'bst-nlevel'}>
            <span className={r.subclass ? 'bst-nlevel-n bst-nlevel-n--sub' : here ? 'bst-nlevel-n bst-nlevel-n--here' : 'bst-nlevel-n'}>{r.level}</span>
            <span className="bst-row-main">
              <span className={r.subclass ? 'bst-row-name bst-nlevel-sub' : 'bst-row-name'}>{r.features || '—'}</span>
              <span className="bst-row-kind">{here && hereName ? `${hereName} is here${extra ? ` · ${extra}` : ''}` : extra}</span>
            </span>
            {slots && <span className="bst-nlevel-slots">{slots}</span>}
          </li>
        )
      })}
    </ol>
  )
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bst-class-stat">
      <dt className="bst-vital-label">{label}</dt>
      <dd className="bst-class-stat-value">{value ?? '—'}</dd>
    </div>
  )
}

/** "Archetypes" where the book has its own word for them — `subclass_title`. */
function subNoun(groups: ReturnType<typeof groupSubclasses>): string {
  const titles = new Set(groups.flatMap(g => g.rows).map(s => s.subclassTitle).filter(Boolean))
  const only = titles.size === 1 ? [...titles][0]! : null
  return only && !/subclass/i.test(only) ? `${only}s` : 'Subclasses'
}

/** The prose with the level table taken out, since the page draws it. */
export function withoutFirstTable(prose: string): string {
  const lines = prose.split(/\r?\n/)
  const start = lines.findIndex(l => l.trim().startsWith('|'))
  if (start < 0) return prose
  let end = start
  while (end < lines.length && lines[end].trim().startsWith('|')) end++
  return [...lines.slice(0, start), ...lines.slice(end)].join('\n')
}

