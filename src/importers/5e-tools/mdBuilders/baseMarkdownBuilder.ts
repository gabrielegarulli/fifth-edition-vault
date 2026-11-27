/**
 * Shared primitives consumed by every entity Markdown builder.
 */
import { bodyHash } from '../../../compendium'
import { serialiseNote, toYaml } from '../../../platform'

export { toYaml }

export interface EntityFrontmatterInput {
  title: string
  source: string
  extra?: Record<string, unknown>
  tags: string[]
  aliases: string[]
}

/**
 * The 5etools source codes of the books printed for the 2024 rules. The
 * mcp-server exporters' list (`SOURCES_55E` in `src/loaders/baseLoader.ts`)
 * holds these and a few third-party books; this holds the official ones.
 */
const SOURCES_2024: ReadonlySet<string> = new Set(['XPHB', 'XDMG', 'XMM', 'FRHOF', 'EFA', 'LFL', 'ABH'])

/**
 * The note's `edition`, as every other rules note spells it: `5.5e` for a
 * 2024 book, `5.0e` for the rest (MYDND-287). The class and species readers
 * compare it between notes, so a source code there matched nothing.
 *
 * @param source The record's 5etools source code, such as `XPHB`.
 * @returns `5.5e` or `5.0e`.
 */
export function editionOf(source: string): '5.5e' | '5.0e' {
  return SOURCES_2024.has(source.trim().toUpperCase()) ? '5.5e' : '5.0e'
}

/**
 * Builds the shared YAML frontmatter object common to every entity note.
 *
 * @param options Frontmatter fields.
 * @returns Plain frontmatter mapping ready for `renderEntityNote`.
 */
export function buildFrontmatter(options: EntityFrontmatterInput): Record<string, unknown> {
  const frontmatter: Record<string, unknown> = {
    title: options.title,
    source: options.source,
    edition: editionOf(options.source),
  }
  if (options.extra) {
    for (const [key, value] of Object.entries(options.extra)) {
      if (value !== undefined) frontmatter[key] = value
    }
  }
  frontmatter.tags = options.tags
  frontmatter.aliases = options.aliases
  return frontmatter
}

/**
 * Serializes a note's frontmatter and body using the repository's YAML writer,
 * stamping `export_hash` from the exact body written after `---`.
 *
 * @param frontmatter Plain frontmatter mapping.
 * @param body Markdown body excluding frontmatter.
 * @returns Complete Markdown note ending with a newline.
 */
export async function renderEntityNote(frontmatter: Record<string, unknown>, body: string): Promise<string> {
  const noteBody = `\n${body.trimEnd()}\n`
  return serialiseNote({
    frontmatter: { ...frontmatter, export_hash: await bodyHash(noteBody) },
    body: noteBody,
  })
}

/**
 * Renders the standard entity `# Name` heading and `*subtitle | Source: …*` line.
 *
 * @param name     Entity display name.
 * @param subtitle Text between the `*` wrappers (before ` | Source: …`).
 * @param source   Canonical source label.
 * @returns Two heading lines joined by a blank line.
 */
export function buildHeading(name: string, subtitle: string, source: string): string {
  return `# ${name}\n\n*${subtitle} | Source: ${source}*`
}
