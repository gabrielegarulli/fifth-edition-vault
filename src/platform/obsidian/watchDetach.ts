/**
 * Calls `onGone` once `el`, having been on a page, is no longer on one.
 *
 * For a block whose host never unloads it (MYDND-191): Atlas VTT renders a
 * template's markdown into a `new Component()` it never `load()`s, so a
 * `MarkdownRenderChild` added there gets neither `onload` nor `onunload`, and
 * a React root under it would live as long as Obsidian does.
 *
 * A `MutationObserver` on the element's own document, checked on every batch:
 * `isConnected` is one property read, so the callback stays cheap even though a
 * whole document's mutations reach it. **The element's own document**, re-read
 * on each batch, because a card can live in a pop-out window: a move between
 * documents lands in the new one before the batch is delivered, and the
 * observer follows it there.
 *
 * Not yet connected is not gone: Obsidian renders markdown into a detached
 * element as often as not, so the watch arms on the first connection. A block
 * that is rendered and dropped without ever being attached is never seen to
 * leave; that costs one idle observer, not a wrong answer.
 *
 * Returns a function that stops watching without calling `onGone`.
 */
export function watchDetach(el: HTMLElement, onGone: () => void): () => void {
  let seen = el.isConnected
  let watched: Document | null = null
  let observer: MutationObserver | null = null
  let stopped = false

  const stop = (): void => {
    if (stopped) return
    stopped = true
    observer?.disconnect()
    observer = null
  }

  const follow = (doc: Document): void => {
    if (doc === watched) return
    observer?.disconnect()
    // The window that owns the document, so a pop-out's observer is its own.
    const Observer = doc.defaultView?.MutationObserver ?? MutationObserver
    observer = new Observer(check)
    observer.observe(doc.body ?? doc.documentElement, { childList: true, subtree: true })
    watched = doc
  }

  function check(): void {
    if (stopped) return
    if (el.isConnected) {
      seen = true
      follow(el.ownerDocument)
    } else if (seen) {
      stop()
      onGone()
    }
  }

  follow(el.ownerDocument)
  return stop
}
