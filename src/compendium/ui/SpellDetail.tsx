import { schoolLabel, spellLevelLongLabel } from '../model/labels'
import { useCompendium } from './context'
import type { SpellRow } from '../model/spells'
import {
  useDetail,
  useCatalogRows,
  Empty,
  DetailLoading,
  DetailPane,
  Prose,
  PropRow,
  Section,
} from '../../platform/host'

/**
 * One spell, as the catalog draws it: its stat lines, then its prose with the
 * exporter's preamble stripped — never the note's frontmatter.
 *
 * Shared by the spell window (MYDND-60) and the sheet's hover (MYDND-63), so
 * the two cannot drift into showing a spell two different ways. Both live
 * beside the sheet, in Obsidian's theme. The `/spells` page draws its own
 * panel, `SpellCatalogDetail`, in the canvas's palette (MYDND-66).
 */
export function SpellDetail({ row, onClose }: { row: SpellRow; onClose?(): void }) {
  const compendium = useCompendium()
  const { detail, loading } = useDetail(compendium.spells, row.id)

  return (
    <DetailPane
      title={row.name}
      subtitle={`${spellLevelLongLabel(row.level)} · ${schoolLabel(row.school)}`}
      path={row.path}
      onClose={onClose}
    >
      <Section>
        <PropRow label="Casting time" value={row.castingTime} />
        <PropRow label="Range" value={row.range} />
        <PropRow label="Components" value={row.components} />
        <PropRow label="Duration" value={row.duration} />
        <PropRow label="Concentration" value={row.concentration ? 'Yes' : null} />
        <PropRow label="Ritual" value={row.ritual ? 'Yes' : null} />
        <PropRow label="Classes" value={row.classes.join(', ')} />
        <PropRow label="Source" value={row.source} />
      </Section>

      {loading ? (
        <DetailLoading />
      ) : detail ? (
        <Section>
          <Prose prose={detail.prose} path={row.path} />
        </Section>
      ) : null}
    </DetailPane>
  )
}

/**
 * The body of the spell window — Ctrl+click on a spell on the sheet (MYDND-60).
 *
 * Looked up by id in the catalog's rows rather than handed a row, because the
 * window outlives the click: Obsidian restores it on the next launch from its
 * saved view state, which can carry only the id. A note deleted or renamed
 * since then answers with an empty state, not a stale card.
 */
export function SpellWindow({ id }: { id: string | null }) {
  const compendium = useCompendium()
  const rows = useCatalogRows(() => compendium.spells.list())
  const row = id ? rows.find(r => r.id === id) : undefined
  if (!row) {
    return (
      <Empty title="No spell to show">
        {id ? `No note in ${compendium.ruleFolder('spells')}/ has the id "${id}" any more.` : null}
      </Empty>
    )
  }
  return <SpellDetail row={row} />
}
