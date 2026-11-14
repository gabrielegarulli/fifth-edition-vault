import { extractFence } from '../../../platform'
import type { Sheet } from '../sheet/sheet'

/**
 * Reading a sheet back out of a note.
 *
 * Shared by the roster reader and by the writer, which needs the *previous*
 * sheet to say what a re-sync is about to take away. One implementation,
 * because two would be two chances to disagree about what counts as a readable
 * fence — and the answer to that question decides whether a character silently
 * disappears from the roster.
 */

/** The fence info string. A published format; see `sheet.ts`. */
export const CHARSHEET_FENCE = 'charsheet'

/**
 * The sheet YAML out of a note's fence, or `null` when it has none.
 *
 * Goes through the content layer's `extractFence` rather than its own regex, on
 * `fence.ts`'s own argument that two fence implementations are two chances to
 * get the boundaries wrong. That narrows two things the original regex allowed
 * and nothing in practice uses: a `~~~` fence, and an indented opener. Notes
 * this plugin writes are always backticks at column 0.
 */
export function extractSheetFence(content: string | null | undefined): string | null {
  return extractFence(String(content ?? ''), CHARSHEET_FENCE)
}

/** YAML parser, injected — the same seam the content readers use. */
export type ParseYaml = (text: string) => unknown

/**
 * The sheet already in a note, or `null` when it has no readable one.
 *
 * **Degrades rather than throwing**, and that asymmetry with the frontmatter
 * reader is deliberate. A malformed fence is a sheet that needs re-syncing, and
 * the roster's job is to *show* it with that reason attached. Malformed
 * frontmatter is different: writing back over it would destroy what the player
 * typed, so `parseNote` throws on that instead.
 */
export function readSheetFromNote(content: string | null | undefined, parseYaml: ParseYaml): Sheet | null {
  const fence = extractSheetFence(content)
  if (fence == null) return null
  try {
    const parsed = parseYaml(fence)
    return parsed && typeof parsed === 'object' ? (parsed as Sheet) : null
  } catch {
    return null
  }
}

/**
 * Why a note that is a character has no usable sheet, for the roster to show:
 * `'no charsheet block'`, `'the charsheet block is empty'`, or the parse error.
 */
export type SheetProblem = string

/**
 * A sheet, or the reason there is not one — the roster's whole contract.
 *
 * Returned as a pair rather than as `Sheet | null` because **nothing is hidden
 * because it is broken**: a note with an unreadable fence is listed with the
 * reason and a way to fix it, and collapsing the reason into `null` is what
 * would make the thing needing attention invisible.
 */
export interface SheetRead {
  sheet: Sheet | null
  error: SheetProblem | null
}

/** `readSheetFromNote`, but saying *why* when it fails. */
export function readSheetWithReason(content: string, parseYaml: ParseYaml): SheetRead {
  const fence = extractSheetFence(content)
  if (fence == null) return { sheet: null, error: 'no charsheet block' }
  try {
    const parsed = parseYaml(fence)
    if (parsed && typeof parsed === 'object') return { sheet: parsed as Sheet, error: null }
    return { sheet: null, error: 'the charsheet block is empty' }
  } catch (err) {
    return { sheet: null, error: err instanceof Error && err.message ? err.message : String(err) }
  }
}
