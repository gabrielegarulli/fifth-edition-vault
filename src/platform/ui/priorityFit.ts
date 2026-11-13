/**
 * How many of a row's items fit on one line, the rest going under More
 * (MYDND-122).
 *
 * `widths` are the items' own widths in order, `more` the More button's,
 * `available` the row's width and `gap` the space between two items. Every item
 * fits, and More is not drawn, when the whole row does. Otherwise items are
 * taken in order while they still leave room for More after them.
 *
 * An unmeasured row (`available` 0, as under jsdom or on the first frame)
 * shows everything, so nothing is hidden before it has been measured.
 */
export function priorityFit(widths: readonly number[], more: number, available: number, gap: number): number {
  if (available <= 0) return widths.length
  const whole = widths.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, widths.length - 1)
  if (whole <= available) return widths.length

  let used = more
  let fitted = 0
  while (fitted < widths.length && used + gap + widths[fitted] <= available) {
    used += gap + widths[fitted]
    fitted++
  }
  return fitted
}
