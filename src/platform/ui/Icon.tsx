import { useEffect, useRef } from 'react'
import { setIcon } from 'obsidian'

/**
 * One of Obsidian's bundled Lucide icons.
 *
 * `setIcon` rather than an icon package: Obsidian ships the whole Lucide set and
 * styles it with `--icon-size` and `currentColor`, so an icon drawn this way
 * matches the ribbon and the file explorer for free — and adds nothing to
 * `main.js`. `the-vault` imports 40-odd `@mui/icons-material` modules; none of
 * them come across.
 *
 * It writes into the DOM imperatively, which is why this is the only component
 * with a ref and an effect for something a prop would normally do.
 */
export function Icon({ name, className }: { name: string; className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Cleared first: `setIcon` appends, so re-rendering with a new name would
    // otherwise stack both SVGs in the same span.
    el.empty()
    setIcon(el, name)
  }, [name])

  return <span ref={ref} className={className} aria-hidden="true" />
}
