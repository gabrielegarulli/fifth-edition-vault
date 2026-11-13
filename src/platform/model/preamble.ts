/**
 * Trimming the exporter's preamble off a note's prose.
 *
 * Every exported note opens by restating its own frontmatter, because a note is
 * read on its own as well as through this plugin:
 *
 *     # Fireball
 *     *Level 3 Evocation (Sorcerer, Wizard) | Source: XPHB (5.5e)*
 *
 *     - **Casting Time:** 1 action
 *     - **Range:** 150 feet
 *     …
 *
 *     A bright streak flashes from you to a point you choose…
 *
 * A detail view has already drawn the name, the level, the school and every one
 * of those properties from frontmatter, so rendering the preamble as well shows
 * all of it twice. Stripping it in the *view* rather than asking the exporter to
 * stop writing it is the right side of that trade: the note must keep working as
 * a note, and an exported file is regenerated wholesale anyway.
 *
 * Three shapes are removed, in order, and the first line that is none of them
 * ends the preamble:
 *
 * 1. **A leading `# Heading`** — always the note's own title.
 * 2. **An image embed directly under that heading** — the note's art, which the
 *    detail pane already draws from frontmatter `image:` (MYDND-32). Only there:
 *    an embed anywhere else is the note's own content.
 * 3. **One wholly-italic line** — the exporter's summary line.
 * 4. **A run of `- **Key:** value` items** — the property list.
 *
 * Rule 4 turns on the **colon inside the bold**, which is what separates the
 * exporter's property list from prose that happens to start with a bold-led
 * bullet. A feat's benefits are written `- **Ability Score Increase.** Increase
 * your…` — a full stop, not a colon — and must survive.
 */

const H1 = /^#\s+\S/
const IMAGE_EMBED = /^!\[\[[^\]]+\.(?:webp|png|jpe?g|gif|avif|svg)(?:\|[^\]]*)?\]\]$/i
const WHOLLY_ITALIC = /^\*[^*].*\*$/
const PROPERTY_ITEM = /^[-*]\s+\*\*[^*]+:\*\*/

export function stripPreamble(prose: string): string {
  const lines = prose.split(/\r?\n/)
  let i = 0

  const skipBlank = () => {
    while (i < lines.length && lines[i].trim() === '') i += 1
  }

  skipBlank()
  const hadHeading = i < lines.length && H1.test(lines[i].trim())
  if (hadHeading) i += 1

  skipBlank()
  if (hadHeading && i < lines.length && IMAGE_EMBED.test(lines[i].trim())) i += 1

  skipBlank()
  if (i < lines.length && WHOLLY_ITALIC.test(lines[i].trim())) i += 1

  // The property run, with blank lines between items tolerated — but only while
  // items keep coming. A blank line followed by prose ends the preamble, and `i`
  // must not have advanced past that prose.
  let afterProperties = i
  skipBlank()
  while (i < lines.length && PROPERTY_ITEM.test(lines[i].trim())) {
    i += 1
    afterProperties = i
    skipBlank()
  }

  return lines.slice(afterProperties).join('\n').trim()
}
