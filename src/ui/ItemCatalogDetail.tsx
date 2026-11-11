import { copperLabel } from '../catalog/labels'
import { armorLine, kindOf, kindShelf, poundsLabel, proficiencyFor, propertiesCell, type Proficiency } from '../catalog/itemKinds'
import { stripPreamble } from '../catalog/preamble'
import { useContent } from '../ContentContext'
import type { ItemRow } from '../content/items'
import { useDetail } from '../hooks/useDetail'
import { useRoster } from '../hooks/useRoster'
import { openNote, useObsidian } from '../ObsidianContext'
import { KindTile } from './ItemCards'
import { Markdown } from './Markdown'

/**
 * The note the canvas's "Mastery · Sap" paragraph comes from, when the vault has
 * it. Linked by the exporter's filename: Obsidian resolves a link path by file
 * name, not by `title`, so the title would find nothing.
 */
const MASTERY_NOTE = 'Weapon Mastery Properties'
const MASTERY_LINK = 'weapon-mastery-properties'

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
  const content = useContent()
  const { entries } = useRoster()
  const { detail, loading } = useDetail(content.items, item.id)
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

/**
 * An item's three tiles. Apart from the panel, like `ItemNotes`, so the builder
 * can show them beside a kit's line (MYDND-155).
 */
export function ItemFacts({ item }: { item: ItemRow }) {
  const kind = kindOf(item)
  const shelf = kindShelf(kind)
  const cost = copperLabel(item.costCp)
  const weight = poundsLabel(item.weight)
  return (
    <div className="bst-vitals">
      {kind === 'weapons' ? (
        <>
          <Tile label="DAMAGE" value={item.damage ? `${item.damage}${item.damageType ? ` ${item.damageType.charAt(0)}` : ''}` : null} />
          {item.versatileDamage ? (
            <Tile label="TWO HANDS" value={item.versatileDamage} />
          ) : (
            <Tile label="RANGE" value={item.range ? `${item.range} ft` : 'melee'} />
          )}
        </>
      ) : kind === 'armor' ? (
        <>
          <Tile label="AC" value={item.ac !== null ? (item.itemType?.toLowerCase() === 'shield' ? `+${item.ac}` : String(item.ac)) : null} />
          <Tile label="STRENGTH" value={item.strength !== null ? String(item.strength) : '—'} />
        </>
      ) : (
        <>
          <Tile label="COST" value={cost} />
          <Tile label="WEIGHT" value={weight} />
        </>
      )}
      {kind === 'weapons' || kind === 'armor' ? (
        <Tile label="COST · WT" value={[cost, item.weight !== null ? String(item.weight) : null].filter(Boolean).join(' · ') || null} />
      ) : (
        <Tile label="KIND" value={shelf.chipLabel} />
      )}
    </div>
  )
}

/** A weapon's mastery and properties, or what wearing the armour costs. */
export function ItemNotes({ item }: { item: ItemRow }) {
  const app = useObsidian()
  const kind = kindOf(item)
  const props = propertiesCell(item)
  // `getFirstLinkpathDest` is how Obsidian resolves a wikilink; a vault without
  // the rules note gets no link rather than a click that creates an empty note.
  const masteryNote = item.mastery ? (app.metadataCache.getFirstLinkpathDest?.(MASTERY_LINK, item.path) ?? null) : null

  return (
    <>
      {item.mastery && (
        <section aria-label="Mastery">
          <h4 className="bst-section-title bst-ladder-title">Mastery · {item.mastery}</h4>
          {masteryNote ? (
            <p className="bst-ladder-note bst-ladder-note--top">
              <button type="button" className="bst-plain bst-link" onClick={() => openNote(app, masteryNote.path)}>
                What {item.mastery} does — {MASTERY_NOTE} ↗
              </button>
            </p>
          ) : null}
        </section>
      )}

      {kind === 'weapons' && props && (
        <section aria-label="Properties">
          <h4 className="bst-section-title bst-ladder-title">Properties</h4>
          <p className="bst-ladder-note bst-ladder-note--top">{props}</p>
        </section>
      )}

      {kind === 'armor' && armorLine(item) && (
        <section aria-label="Wearing it">
          <h4 className="bst-section-title bst-ladder-title">Wearing it</h4>
          <p className="bst-ladder-note bst-ladder-note--top">{armorLine(item)}</p>
        </section>
      )}
    </>
  )
}

const rank = (p: Proficiency): number => (p === 'yes' ? 0 : p === 'no' ? 1 : 2)

function Tile({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bst-vital">
      <span className="bst-vital-label">{label}</span>
      <span className="bst-vital-value bst-vital-value--spell">{value ?? '—'}</span>
    </div>
  )
}
