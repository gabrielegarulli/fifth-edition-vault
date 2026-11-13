import { copperLabel } from '../model/labels'
import { armorLine, kindOf, kindShelf, poundsLabel, propertiesCell } from '../model/itemKinds'
import type { ItemRow } from '../model/items'
import { openNote, useObsidian } from '../../platform/host'

/**
 * The note the canvas's "Mastery · Sap" paragraph comes from, when the vault has
 * it. Linked by the exporter's filename: Obsidian resolves a link path by file
 * name, not by `title`, so the title would find nothing.
 */
const MASTERY_NOTE = 'Weapon Mastery Properties'
const MASTERY_LINK = 'weapon-mastery-properties'

/**
 * An item's three tiles. Apart from the panel (`catalogs/ui/ItemCatalogDetail.tsx`),
 * like `ItemNotes`, so the builder can show them beside a kit's line
 * (MYDND-155). Here because the builder sits below the catalogs, and this half
 * reads nothing of a character's (MYDND-200).
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

function Tile({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bst-vital">
      <span className="bst-vital-label">{label}</span>
      <span className="bst-vital-value bst-vital-value--spell">{value ?? '—'}</span>
    </div>
  )
}
