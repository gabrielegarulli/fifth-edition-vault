import { createCharacters, itemDataSource } from '../../characterModel'
import { createCompendium } from '../../compendium'
import type { ParseYaml, VaultSource } from '../../platform'

/**
 * The content layer — what replaces `the-vault`'s 42 `lib/db/` modules.
 *
 * **This module imports nothing from `obsidian`, and must not start.** The
 * `obsidian` npm package is types-only: it ships `obsidian.d.ts` and no runtime
 * entry, because the real module is injected by the app. So importing a *value*
 * from it — `parseYaml`, a class — makes the importing file unloadable outside
 * Obsidian, and that propagates to everything that imports it.
 *
 * That is why the Obsidian wrapper lives in `../obsidian/vault` rather than
 * here: this file stays loadable in plain Node, so the whole content layer is
 * testable against a fixture vault with no stubs and no aliases.
 *
 * **The app's composition, not a domain (MYDND-199).** The readers are the
 * compendium's (`./compendium`); this adds the roster on top, and
 * `../ui/context.tsx` hands each half to its own domain's provider. Nothing
 * below `app` takes a `Content`: a page asks its domain's hook for what it
 * reads. It was `src/content/index.ts`, a barrel, until MYDND-200.
 *
 * `type`-only imports are fine anywhere; they vanish at compile time.
 */
export function createContent(source: VaultSource, parseYaml: ParseYaml) {
  const compendium = createCompendium(source, parseYaml)
  return {
    ...compendium,
    // **Not a catalog**, and deliberately absent from `CATALOG_KEYS`. A
    // character is any note carrying `vc_ddb_id`, not the contents of a folder,
    // so it has no `list()/detail()` pair and no row count to report alongside
    // "1,785 spells". The roster reads the worn items' notes through the
    // compendium's item readers (MYDND-57). See `./characters.ts` (MYDND-7).
    characters: createCharacters(source, parseYaml, itemDataSource(compendium)),
  }
}

export type Content = ReturnType<typeof createContent>

// Only the factory and its type, since MYDND-200. This file used to re-export
// every domain's readers and writers too, so a page could import anything
// through it, and every page depended on every domain. Import a name from the
// module that declares it.
