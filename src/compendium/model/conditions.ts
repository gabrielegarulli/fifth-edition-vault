import { createCatalog, str, strList, type Catalog, type CatalogRow } from '../../platform'
import type { ParseYaml, VaultSource } from '../../platform'

/**
 * Conditions. **Observed shape** — 23 real notes, e.g. `conditions/bleeding.md`.
 *
 * Worth noting that this type has **no counterpart in `the-vault`**: there is no
 * `content_condition` table, so the web app cannot answer "what does Bleeding
 * do". The notes exist because an exporter wrote them, and reading them is free.
 * The first thing the plugin can do that the web app cannot.
 *
 * All the substance is prose, so there is no fence and `detail()` returns
 * `fence: null` by design rather than by omission.
 */
export interface ConditionRow extends CatalogRow {
  edition: string | null
  tags: string[]
}

export type ConditionCatalog = Catalog<ConditionRow, never>

export function createConditions(source: VaultSource, parseYaml: ParseYaml): ConditionCatalog {
  return createCatalog<ConditionRow, never>(source, parseYaml, {
    folder: 'conditions',
    // Named for consistency; no condition note carries one, and none should.
    fence: 'vault-condition',
    row: note => {
      const fm = note.frontmatter
      const name = str(fm.title)
      if (!name) return null
      return {
        id: note.slug,
        path: note.path,
        name,
        source: str(fm.source),
        edition: str(fm.edition),
        tags: strList(fm.tags),
      }
    },
  })
}
