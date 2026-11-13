import { kindOf, kindShelf, proficiencyFor, type Proficiency } from '../../compendium'
import { ItemFacts, ItemNotes, useCompendium } from '../../compendium/host'
import { stripPreamble } from '../../platform'
import type { ItemRow } from '../../compendium'
import { useDetail, openNote, useObsidian, Markdown } from '../../platform/host'
import { useRoster } from '../../characters/host'
import { KindTile } from './ItemCards'

/**
 * One mundane item, opened from a shelf or the weapons table — design A's
 * right-hand panel (MYDND-85).
 *
 * Header: the kind's tile, the name, `Melee Weapon, martial · XPHB`, and three
 * tiles — Damage / Two hands / Cost · Wt for a weapon, AC / Strength / Cost · Wt
 * for armour, Cost / Weight / Type otherwise. Body: the mastery, the properties,
 * and who in the party can use it, then the note's prose. Footer: open the note.
 *
 * "Who can use it" is the sheets' own proficiency lists, nothing derived; a
 * character whose sheet carries none is left out rather than guessed at.
 */
export function ItemCatalogDetail({ item, onClose }: { item: ItemRow; onClose(): void }) {
  const app = useObsidian()
  const compendium = useCompendium()
  const { entries } = useRoster()
  const { detail, loading } = useDetail(compendium.items, item.id)
  const kind = kindOf(item)
  const shelf = kindShelf(kind)
  const prose = detail ? stripPreamble(detail.prose) : ''

  const party =
    kind === 'weapons' || kind === 'armor'
      ? entries
          .filter(e => e.sheet?.proficiencies)
          .map(e => ({ name: e.name, path: e.path, can: proficiencyFor(item, e.sheet!.proficiencies) }))
          .sort((a, b) => rank(a.can) - rank(b.can) || a.name.localeCompare(b.name))
      : []

  return (
    <>
      <div className="bst-detail-head">
        <div className="bst-detail-id">
          <KindTile shelf={shelf} size="lg" />
          <div className="bst-detail-names">
            <h3 className="bst-detail-name">{item.name}</h3>
            <span className="bst-detail-sub">
              {[[item.itemType, item.weaponCategory].filter(Boolean).join(', '), item.source].filter(Boolean).join(' · ')}
            </span>
          </div>
          <button type="button" aria-label="Close" className="bst-plain bst-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <ItemFacts item={item} />
      </div>

      <div className="my-dnd-vault__scroll bst-detail-scroll">
        <ItemNotes item={item} />

        {party.length > 0 && (
          <section aria-label="Who in the party can use it">
            <h4 className="bst-section-title bst-ladder-title">Who in the party can use it</h4>
            <ul className="bst-whocan">
              {party.map(p => (
                <li key={p.path} className="bst-whocan-row">
                  <span className="bst-whocan-name">{p.name}</span>
                  <span className={p.can === 'yes' ? 'bst-flag bst-flag--charges' : 'bst-flag bst-flag--neutral'}>
                    {p.can === 'yes' ? 'Proficient' : 'Not proficient'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {loading ? (
          <p className="bst-prose">Reading the note…</p>
        ) : prose ? (
          <Markdown markdown={prose} sourcePath={item.path} className="bst-prose bst-entry-desc bst-spell-prose" />
        ) : null}
      </div>

      <div className="bst-detail-foot">
        <div className="bst-foot-row">
          <button type="button" className="bst-plain bst-btn-secondary bst-grow" onClick={() => openNote(app, item.path)}>
            Open note
          </button>
        </div>
      </div>
    </>
  )
}

const rank = (p: Proficiency): number => (p === 'yes' ? 0 : p === 'no' ? 1 : 2)
