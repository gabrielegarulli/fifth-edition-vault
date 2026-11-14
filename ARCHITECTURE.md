# Architecture

How the source is laid out, and the rules that hold it together. Read it before
your first change; it is short on purpose. The code is the detail, and each long
file opens with a line saying what it owns.

## In one paragraph

An Obsidian plugin with one view: React 19, built by Vite into one `main.js`,
styled with Tailwind 4. **The vault is the database.** Rules content (spells,
monsters, classes…) is read from the vault's own Markdown notes, and everything
the plugin keeps (characters, campaigns, the log) is written back as notes. The
plugin folder holds no content and no data besides its settings, and nothing is
fetched on load or on a timer.

## Where things live

| You want to change… | Look in |
| --- | --- |
| a choice the builder or level-up asks for (a feat, a skill, a spell…) | `src/choices/model/choices/<kind>.ts`; whether a level is complete is `completeness.ts`; its UI is `src/choices/ui/FeaturesStep/` |
| a step of the Character Builder | `src/builder/ui/<Name>Step.tsx`, and the draft it edits, `src/choices/model/draft.ts` |
| how a kind of rules note is read (spells, monsters, feats…) | `src/compendium/model/<kind>.ts`, assembled by `createCompendium` in `compendium.ts` |
| a catalog page | `src/catalogs/ui/<Name>Page.tsx`, over `CatalogShell.tsx` |
| anything written to the vault | the owning domain's `store/` folder, through `StateVault` (`src/platform/store/vault.ts`) |
| a rule or a number on the sheet | the rules library `src/derive/`, and `src/characterModel/model/` (`sheet/`, `vaultCharacter/project.ts`) |
| the character sheet | `src/characters/ui/CharacterSheetPage.tsx` and `CharacterSheet.tsx` |
| a character's HP, slots, rests | `src/characterModel/model/vitals.ts` (the rules) and `src/characters/store/vitals.ts` (the write) |
| a character's inventory | `src/characterModel/model/inventory.ts` and `src/characters/store/inventory.ts` |
| a roll | `src/dice/ui/RollContext.tsx` and `useRoll.ts`; the Atlas VTT bridge is `src/dice/obsidian/` |
| a fenced code block in a note (` ```charsheet `, ` ```vault-sheet `) | `src/characters/obsidian/charsheetFence.tsx`, `src/app/obsidian/sheetFence.tsx` |
| a GM page (party, encounter, shop, log, notes) | `src/gm/ui/` |
| a route, or what a page is called | `src/platform/model/routes.ts`; the dispatch is `src/app/ui/App.tsx` |
| a setting | `src/main.ts` (stored in `data.json`) and `src/app/ui/SettingsPage.tsx`; a campaign's rules live in the campaign's note |
| styling | `styles/index.css`, the only stylesheet |
| the plugin's entry point | `src/main.ts` |

## Domains

Every folder under `src/` is a **domain**: code grouped by what it is about,
not by what kind of code it is. The domains sit in a fixed order, bottom to top,
in [`scripts/domains.mjs`](scripts/domains.mjs), and **a domain imports only from
domains below it.**

`npm run lint` enforces this with one rule, `domains/order`
(`scripts/eslint-domain-order.mjs`). On every import, type-only ones included,
it reports:

- **upward**: an import from a domain higher in the order;
- **deep**: another domain reached past its `index.ts` or `host.ts`;
- **pure**: a file outside `ui/` and `obsidian/` that imports React,
  `obsidian`, its own domain's `ui/` or `obsidian/`, or another domain's
  `host.ts`;
- **self**: a file importing its own domain's entry, which would be a cycle;
- **split**: `index.ts` re-exporting `ui/` or `obsidian/`, or `host.ts` the
  rest;
- **unknown**: a folder under `src/` that is not in the order.

Tests, fixtures and `src/__harness__/` are exempt. Lint also warns on a source
file over 600 lines of code: split it before adding to it.

### Inside a domain

| Folder or file | Holds | May import |
| --- | --- | --- |
| `model/` | pure logic and types | no React, no `obsidian` |
| `store/` | the writes to the vault, through `StateVault` | no React, no `obsidian` |
| `ui/` | components, hooks, the domain's provider (`ui/context.tsx`) | React, `obsidian` |
| `obsidian/` | the edges that reach Obsidian's API or carry its `App` | React, `obsidian` |
| `index.ts` | re-exports `model/` and `store/`, by name | loadable anywhere, Node tests included |
| `host.ts` | re-exports `ui/` and `obsidian/`, by name | the `ui` tests and the plugin |

Not every domain has every folder. The entries re-export by name, never with
`export *`: if lint says a name is missing from one, add it there.

### The domains, bottom to top

**`derive`, the rules library.** All the 5e rules math: the derived sheet,
effects, loadout, spell slots, the roll engine. Plain JavaScript, pure, with its
own `*.test.js` suites. It imports nothing from the rest of `src/` and is
reached as `@vault/derive/<module>.js`.

**`platform`, the ground floor.** The two seams every other domain is built on:
`VaultSource`, which the readers take (`model/source.ts`), and `StateVault`,
the one atomic read-modify-write the stores take (`store/vault.ts`). Also the
frontmatter coercions (`model/catalog.ts`), fences (`model/fence.ts`), routes,
campaigns and the activity log, `ObsidianContext` (the one carrier of
Obsidian's `App`), and the shared UI kit: `DetailPane`, `Icon`, `Markdown`,
the controls. `model/edition.ts` holds the values that differ between the two
editions.

**`compendium`, the rules content.** The ten readers (spells, monsters,
classes, subclasses, conditions, feats, items, magic items, species,
backgrounds), assembled by `createCompendium`, plus the labels and shelves that
group them. `ui/` has the display pieces any domain may draw (`FeatBenefits`,
`ItemFacts`, `SpellFacts`, `SpellLink`), and `store/srd/` installs the SRD
notes on first run. Hook: `useCompendium()`.

**`dice`, every roll.** The formula parser, dice groups, interventions, roll
modes (advantage, disadvantage) and the roll log in `model/`; the provider and
`useRoll` in `ui/`; the Atlas VTT bridge in `obsidian/`. Nothing rolls except
through `useRoll`.

**`characterModel`, pure character logic.** Turning a character's stored
choices into a sheet: the ` ```vault-character ` fence, baking choices and feat
effects (`vaultCharacter/bake.ts`), projecting the sheet (`project.ts`), sheet
math, spells and slots, and the parse and pure operations of vitals and
inventory. All `model/`; it has only an `index.ts`.

**`choices`, what a character chooses.** The builder's draft (`model/draft.ts`)
and the choice model the builder and level-up share: one module per kind of
choice in `model/choices/`, with `completeness.ts` deciding when a level is
done. `ui/` has the pieces both draw: `FeaturesStep/`, `OriginFeatChoices`,
the previews.

**`spellEffects`, casting at a token.** The Cast and Push buttons and the
bridge that aims them at a token in Atlas VTT. It sits below `characters`
because the sheet draws its buttons.

**`characters`, the sheet and the roster.** The stores that write a character
note (`store/characters.ts`), its vitals and inventory, and the Atlas mirror;
the sheet, the roster, level-up and the ` ```charsheet ` fence. Hook:
`useCharacters()`. Its provider has three **slots**, which the full edition
fills: `importCharacter`, `ddb` (the roster's import half) and `QuirkList`.
Here they stay empty, and the roster and inventory draw nothing for them.

**`builder`, the Character Builder.** The page and its steps, over the
`choices` draft. Only `app` imports it.

**`catalogs`, the six catalog pages.** Spells, monsters, classes, feats, items
and magic items, over `CatalogShell`, with their cards and detail panes and
"Add to a character". Its provider has one slot, `useMonsterEncounter`, which
`gm` fills so a monster's stat block can add it to the encounter.

**`gm`, the GM pages.** Party, encounter, shop, log and session notes, with the
encounter and shop stores. Hook: `useGmStores()`.

**`app`, the composition root.** `src/main.ts` (the plugin), the view, `App`
(the frame and the route dispatch), Home, Settings, the bar, and
`DomainProviders` (`ui/context.tsx`), the one place that nests every domain's
provider and fills their slots. The factories that build every reader and
store (`model/content.ts`, `model/state.ts`, `obsidian/vault.ts`) are here too.

### Extension slots

A lower domain sometimes shows something a higher one implements: the roster
offers a re-import, the stat block offers "add to encounter". The lower domain
then declares the type in its provider, and `app` passes the implementation
in. So the lower domain imports nothing of the higher one, and a slot can stay
empty. Before you add one, check what the piece really imports: several were
just files filed in the wrong domain.

## Five frame invariants

Each of these fails **silently** when broken.

1. **The readers and stores import nothing from `obsidian`;
   `ObsidianContext` carries the real `App`.** That is what keeps the whole data
   layer testable in plain Node. Never reach for an `App` in a `model/` or
   `store/`. Where a module needs the host (an HTTP client, `parseYaml`), the
   host is injected.
2. **`MemoryRouter`, never `BrowserRouter`.** Obsidian's location is
   `app://obsidian.md/index.html`. Pushing to it is meaningless, and harmful.
3. **`.my-dnd-vault` on the view's root is load-bearing.** It is the selector
   every Tailwind utility is scoped to, by the post-pass in `postcss/`. Remove
   it and nothing applies, and the result looks like unstyled HTML, not an
   error.
4. **The pane is the viewport.** Nothing positions against the window, and
   `window.scrollTo` is always wrong. Measure the pane (`useElementWidth`)
   rather than using `sm:`/`md:` breakpoints, which read the window.
5. **The page owns its scroller, not the frame.** `.my-dnd-vault__main` clips;
   any region that scrolls carries `.my-dnd-vault__scroll`.

## The state layer: four rules

A wrong reader shows a wrong list. A wrong writer destroys a note nobody else
has a copy of. So the writes follow four rules:

1. **One mutation is one file write.** `StateVault` exposes a single atomic
   read-modify-write (`Vault.process`) and nothing else.
2. **A reader degrades; a writer refuses.** A malformed fence reads as absent.
   But a writer that cannot parse a note's frontmatter **throws**, because
   writing `{}` back would delete what the user typed.
3. **The writers use the `yaml` package**, both ways, and quote every string
   they write.
4. **A note's name is its identity; there are no uuids.** A campaign *is* its
   note's name. A renamed note is rebound, and a lookup that finds nothing is
   handled wherever it is called.

`data.json` holds the plugin's settings and nothing else. A campaign's rules
live in the campaign's note.

## The vault is the database: two tiers

Content and state are Markdown notes, in two tiers:

- **Flat, typed frontmatter** for anything a list filters or sorts on. It is
  read through Obsidian's metadata cache, so a catalog list costs no file
  reads. **Nothing nested goes in frontmatter**: Obsidian's Properties UI
  rewrites it.
- **A fenced YAML block in the body** for the deep structure, parsed only when a
  detail opens. The plugin's own fences are named `vault-*`: `vault-feat`,
  `vault-character`, `vault-vitals`, `vault-inventory`, `vault-encounter`,
  `vault-log` and the rest.

Three things bite here:

- **Never call a reader's `list()`, `byId()` or `byName()` in a render.** Each
  walks every note in the vault. Go through `useCatalogRows`, which memoises
  per vault generation, and find a row with `rows.find(...)`.
- **Frontmatter is not typed the way it looks.** `concentration: yes` is the
  string `"yes"`, and `cr: 1/4` is `"1/4"`, which `Number()` turns into `NaN`.
  Coerce through `platform/model/catalog.ts`'s helpers.
- **Content never goes in the plugin folder.** A release installs only
  `main.js`, `styles.css` and `manifest.json`.

Prose in a note is rendered with Obsidian's `MarkdownRenderer`. There is no
`dangerouslySetInnerHTML` anywhere.

## Tests

Vitest, two projects split by file extension:

| Project | Files | Environment | `obsidian` |
| --- | --- | --- | --- |
| `logic` | `src/**/*.test.ts` | Node | **unresolvable, on purpose** |
| `ui` | `src/**/*.test.tsx` | jsdom | the stub in `src/__harness__/obsidian.ts` |

The extension is a choice, not a formality. A `.test.ts` suite fails to load if
anything it reaches imports `obsidian`, and that is what holds invariant 1.
Mount a page through `TestProviders` (`src/__harness__/providers.tsx`), which is
`DomainProviders` over an empty vault. Break every new suite once on purpose,
and see it fail, before you trust it.

`src/styles.test.ts` and `src/bundle.test.ts` read the built `dist/`, so run
`npm run build` before `npm test`.
