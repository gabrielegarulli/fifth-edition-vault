/**
 * A way to say "what the readers return has changed" when no file did (MYDND-184).
 *
 * `useVaultGeneration` memoises every list on the vault's own change events. A
 * folder setting changes which notes a reader returns without touching a file,
 * so no such event fires and an open pane would keep the old folder's rows until
 * something else in the vault changed. The plugin calls `bumpVaultGeneration`
 * instead.
 *
 * Module-level and host-free: the plugin, the web build and a test all reach it
 * the same way, and it is not debounced, because it fires once per edit rather
 * than once per file.
 */
const listeners = new Set<() => void>()

export function subscribeVaultGeneration(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function bumpVaultGeneration(): void {
  for (const listener of [...listeners]) listener()
}
