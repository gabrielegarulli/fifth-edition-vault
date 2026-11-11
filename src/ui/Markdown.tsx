import { useEffect, useRef } from 'react'
import { Component, MarkdownRenderer } from 'obsidian'

import { useObsidian } from '../ObsidianContext'

/**
 * A note's prose, rendered by Obsidian.
 *
 * **This is what replaces `components/SafeHtml.jsx`, and the plan expected it to
 * be kept verbatim.** It is not needed, because the thing it guards against is
 * not here. `SafeHtml` exists because `the-vault`'s catalog prose is *HTML*
 * written through a publishable key by anyone holding it, so it has to be
 * sanitised and may be rendered exactly one way (ADR 0020, VAULT-110). The host
 * vault's prose is **markdown in the user's own files** — not attacker-writable,
 * and not HTML — and handing it to `MarkdownRenderer` is both safer and better:
 *
 * - `[[wikilinks]]` become real, clickable links. `subclasses/*.md` link back to
 *   their parent class, which `lib/contentRefs.js` hand-rolled in the web app.
 * - Markdown tables render as tables. Every class note's level progression is
 *   one, and `progressionTable()` exists in the content layer only because
 *   nothing else could read it.
 * - Another plugin's fenced block renders as that plugin renders it.
 * - `.markdown-rendered` is Obsidian's own typography, so prose here reads
 *   exactly as it does in a note.
 *
 * **There is no `dangerouslySetInnerHTML` anywhere in this repo.** That is not
 * the same as "no HTML is rendered" — markdown admits inline HTML and Obsidian
 * renders it, here exactly as it does in a note. The trust model is the vault's
 * own: these files are the user's, and the renderer is the one already reading
 * them. What ADR 0020 forbids is a *second* way into the DOM, and there is none.
 */
export function Markdown({
  markdown,
  /** The note this text came from, so relative links resolve against it. */
  sourcePath,
  className,
}: {
  markdown: string
  sourcePath: string
  className?: string
}) {
  const app = useObsidian()
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = ref.current
    if (!host) return

    // Rendered into a fresh child rather than into `host` itself. `render` is
    // async and appends when it resolves, so clicking down a list faster than it
    // completes would otherwise interleave two notes' prose. Cleanup detaches
    // this child, and a late append then lands in a node nobody can see.
    const target = host.createDiv()
    const component = new Component()
    component.load()

    let cancelled = false
    void MarkdownRenderer.render(app, markdown, target, sourcePath, component).then(() => {
      if (cancelled) target.remove()
    })

    return () => {
      cancelled = true
      component.unload()
      target.remove()
    }
  }, [app, markdown, sourcePath])

  return <div ref={ref} className={`markdown-rendered ${className ?? ''}`} />
}
