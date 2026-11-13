/**
 * What the app bar's account menu needs from whoever signs the GM in to the
 * web build (MYDND-131). The plugin's `Online` provides it; the web build has
 * its own bar; the SRD edition has neither, and the bar draws no menu.
 *
 * Here, below both, since MYDND-200: `AppBar` (app) draws it and `Online`
 * (the private online domain) implements it, and a type declared in either
 * would have the other import across or up the domain order.
 */
export interface AccountHost {
  /** The web sign-in's email, or `null`. */
  email(): string | null
  /** The Sync command: pull, push, then the conflicts window. */
  sync(): void
  /** Obsidian's settings tab, where the sign-in form lives. */
  openSettings(): void
  signOut(): void
}
