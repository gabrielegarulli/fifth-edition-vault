/**
 * The narrowest a box may be drawn, in px (MYDND-120).
 *
 * Under it a card's content lays out badly, so a grid of boxes drops a column
 * rather than squeeze one below it. **It is `--bst-box-min` in
 * `styles/index.css`**, which CSS-only grids (`.bst-fit`, the roster) read;
 * this is the same number for the grids whose column count JS needs, because a
 * closed shelf shows `previewCount(columns)` cards. `styles.test.ts` keeps the
 * two equal.
 */
export const BOX_MIN = 320

/** The gap between cards in a `.bst-cards` grid, in px. */
const CARD_GAP = 12

/**
 * Columns of boxes in a grid `width` px wide: as many as keep `BOX_MIN` each,
 * one to four, and three before the grid is measured (jsdom never measures).
 */
export function boxColumns(width: number): number {
  if (width <= 0) return 3
  return Math.min(4, Math.max(1, Math.floor((width + CARD_GAP) / (BOX_MIN + CARD_GAP))))
}
