// The feats reader: feat notes' frontmatter rows and their `vault-feat`
// fence.

import {
  createCatalog,
  num,
  str,
  strList,
  type Catalog,
  type CatalogRow,
  nameKey,
  noteSlugs,
} from '../../platform'
import type { ParseYaml, VaultSource } from '../../platform'

/**
 * Feats. **Designed here first, then written to** — `export-feats-to-lore.ts` in
 * `C:\DnD\5etools\mcp-server` emits these notes, and was written against this
 * reader rather than the other way round (MYDND-4).
 *
 * Frontmatter was modelled on `content_feat`'s columns — `(name, source_slug,
 * kind, tags[], prerequisite jsonb, data jsonb)` — and the exporter satisfies it:
 *
 *   title, source, edition, kind, prerequisite, tags[]       ← frontmatter
 *   abilities[], benefit_count, modelled_count               ← …and derived
 *   ```vault-feat  benefits[] ...                            ← the fence
 *
 * **`abilities` is the canonical derived key.** `/feats` filters the *list* by
 * ability score, and `the-vault` answers that through `lib/featAbilities.js`,
 * which reads each feat's `ability_score_choice` **effect** — data four levels
 * deep inside `benefits[]`. Parsing 291 fences to draw one list is exactly what
 * the two-tier design exists to avoid, so the exporter must flatten it into
 * frontmatter. Regenerated, never hand-edited.
 *
 * `kind` replaced the `is_origin_feat` / `is_epic_boon` booleans in VAULT-83,
 * which also dropped `granted_abilities`. Do not reintroduce any of the three.
 */

/** `content_feat.kind`. */
export type FeatKind = 'origin' | 'general' | 'epic_boon' | 'fighting_style'

const KINDS: readonly string[] = ['origin', 'general', 'epic_boon', 'fighting_style']

export interface FeatRow extends CatalogRow {
  kind: FeatKind | null
  /** Human-readable, e.g. `Lvl 4`. The web app's `prerequisite` is jsonb; the
   *  note keeps the display string flat and the structure in the fence. */
  prerequisite: string | null
  /**
   * The class a **replacement** fighting style is offered to — `Paladin` for
   * Blessed Warrior, `Ranger` for Druidic Warrior. The web app keeps it as a
   * `{ class }` predicate in `prerequisite`; the note keeps it flat, because
   * frontmatter cannot hold an object (MYDND-31). Null on every other feat.
   */
  prerequisiteClass: string | null
  /** Derived from the `ability_score_choice` effects. Ability keys, lowercase. */
  abilities: string[]
  /**
   * How many benefits the feat has, and how many of them carry at least one
   * effect the app can act on. Both **derived** from the fence.
   *
   * This is the column `FeatsPage.jsx` ends its row with — "2 benefits · 1 on
   * your sheet" (VAULT-86) — and it says how much of a feat is actually modelled
   * before you open it. Deep data in a list, so it has to be flattened up here;
   * `null` until the exporter emits the keys, which is honestly different from
   * `0`, a feat whose benefits are all prose.
   */
  benefitCount: number | null
  modelledCount: number | null
  tags: string[]
  /**
   * The note's `aliases`, which Obsidian itself uses for link resolution.
   *
   * Read here because **D&D Beyond does not spell a feat the way the catalog
   * does**: the exporter writes `Magic Initiate` plus the aliases `Magic Initiate
   * (2024)` and `Magic Initiate 5.5e`, while a payload says `Magic Initiate
   * (Wizard)`. Matching the aliases costs nothing and is what the key already
   * exists for.
   */
  aliases: string[]
}

/** The ```vault-feat fence — `content_feat.data`, minus what frontmatter holds. */
export interface FeatFence {
  benefits?: FeatBenefit[]
  description?: string
  [k: string]: unknown
}

export interface FeatBenefit {
  /**
   * Minted once and never re-derived from a rename, because it addresses a
   * character's saved toggle (VAULT-85). A renamed benefit keeps its key.
   */
  key?: string
  name?: string
  text?: string
  effects?: Array<Record<string, unknown>>
  reviewed?: boolean
  adjudication?: string
}

export type FeatCatalog = Catalog<FeatRow, FeatFence> & {
  ofKind(kind: FeatKind): FeatRow[]
  /** Feats that can raise a given ability, by lowercase key (`con`, `wis`). */
  grantingAbility(ability: string): FeatRow[]
}

/**
 * The tag that makes a note a feat wherever it lives (MYDND-15).
 *
 * The exporter already writes `tags: [feat, feat/general, 5-5e, xphb]`, so all
 * **197** published notes satisfy this untouched. The tag was not invented here;
 * it was already the thing saying what the note was. Measured: 197 of 197 notes
 * in `feats/` carry it, and 0 notes outside do, so turning it on admits nothing
 * today. It is the mechanism by which a GM's own feat *can* be admitted.
 *
 * ## It must be the BARE tag, and a nested `feat/...` must not count
 *
 * This read `tag === 'feat' || tag.startsWith('feat/')` first, and
 * `realVault.test.ts` failed on a feat called **"Artisan"** with a null
 * `benefit_count`. Artisan is a *background*. All **34** background notes carry a
 * tag like `feat/crafter`, and the `feat/` namespace means two different things
 * depending on what follows the slash:
 *
 * - `feat/general`, `feat/origin` -- the second segment is a **kind**: this note
 *   *is* a feat of that kind.
 * - `feat/crafter`, `feat/magic-initiate` -- the second segment is a **feat
 *   name**: this note *grants* that feat. A cross-reference, not a claim.
 *
 * Nothing distinguishes the two except knowing the vocabulary, so the prefix is
 * unusable and the bare tag is the whole test. Since every published feat carries
 * it, nothing is lost.
 */
export const FEAT_TAG = 'feat'

function isFeatTagged(fm: Record<string, unknown>): boolean {
  // Exactly `feat`. See above: `feat/crafter` on a background means it *grants*
  // Crafter, and a prefix match admitted all 34 backgrounds as feats.
  return strList(fm.tags).some(t => t.replace(/^#/, '').trim().toLowerCase() === FEAT_TAG)
}

// Quotes folded, so D&D Beyond's `’` meets the exporter's `'` (MYDND-40).
const norm = nameKey

/**
 * A feat name as a character spells it, resolved to a catalog row.
 *
 * **The whole mechanism is "match the name against the note".** A character does
 * not store a feat's rules, it stores its name; this is the function that turns
 * that name into the `.md` file. Four passes, in strictly this order, each one
 * looser than the last:
 *
 * 1. **the title**, exactly -- what the exporter writes.
 * 2. **an alias**, exactly -- `Magic Initiate (2024)`, `Lightly Armored 5.5e`.
 *    The exporter writes three per note, and Obsidian uses the same key for its
 *    own link resolution.
 * 3. **the filename**, slugified from both sides -- so `Dark Bargain` finds
 *    `dark-bargain.md` whatever its `title` says, and naming a file after the
 *    feat is enough on its own. This is the pass that makes hand-authoring work
 *    the way you would expect it to.
 * 4. **and only then** the name with a trailing parenthetical dropped, retried
 *    through all three above -- so a payload's `Magic Initiate (Wizard)` reaches
 *    `Magic Initiate`, which is what D&D Beyond actually sends.
 *
 * **Pass 4 is a fallback and must never be a rule.** MYDND-3 paid for this: not
 * every parenthetical is an edition suffix. `Bender (Air)`, `(Earth)`, `(Fire)`
 * and `(Water)` are four *different* classes, and stripping any trailing `(...)`
 * gave each of them all sixteen of the others' subclasses. The three exact passes
 * win first precisely so a feat genuinely named `Something (Air)` is found as
 * itself, and the strip only ever runs on a name nothing else claimed.
 *
 * Deliberately not fuzzy beyond that -- no edit distance, no partial match. A
 * misspelling should be *reported* as unknown so somebody fixes the spelling,
 * because a wrong feat silently applied is worse than a missing one named.
 */
export function byFeatName(rows: readonly FeatRow[], name: string): FeatRow | undefined {
  const attempt = (want: string): FeatRow | undefined => {
    if (want === '') return undefined
    const byTitle = rows.find(r => norm(r.name) === want)
    if (byTitle) return byTitle
    const byAlias = rows.find(r => r.aliases.some(a => norm(a) === want))
    if (byAlias) return byAlias
    // Both readings of an apostrophe — the exporter deletes it, a hand-named
    // file may hyphenate it. See `names.ts`.
    const slugs = noteSlugs(want)
    return slugs.length === 0 ? undefined : rows.find(r => noteSlugs(r.id).some(s => slugs.includes(s)))
  }

  const want = norm(name)
  const direct = attempt(want)
  if (direct) return direct

  const stripped = norm(want.replace(/\s*\([^()]*\)\s*$/, ''))
  return stripped === want ? undefined : attempt(stripped)
}

export function createFeats(source: VaultSource, parseYaml: ParseYaml): FeatCatalog {
  const base = createCatalog<FeatRow, FeatFence>(source, parseYaml, {
    folder: 'feats',
    fence: 'vault-feat',
    // A feat is a note in `feats/` **or** any note that says it is one. The
    // second half is what lets a GM write the homebrew feats their characters
    // actually have: measured on two real characters, 0 of Gibbs' 4 feats and 2
    // of Gabriela's 6 have no exported note, because they come from books
    // 5e.tools does not carry. Before this they were unresolvable by
    // construction, and the only fix was an exporter that cannot know about them.
    admits: note => isFeatTagged(note.frontmatter),
    row: note => {
      const fm = note.frontmatter
      // `title` is what the exporter writes and stays the authority. The slug is
      // the fallback **only for a tagged note**, so hand-authoring a feat is
      // "name the file, add the tag" -- while a template or stray file inside
      // `feats/` is still skipped for having no title, which is the behaviour the
      // comment on `row` describes and is worth keeping.
      const name = str(fm.title) ?? (isFeatTagged(fm) ? str(note.slug) : null)
      if (!name) return null

      const rawKind = str(fm.kind)?.toLowerCase() ?? null
      return {
        id: note.slug,
        path: note.path,
        name,
        source: str(fm.source),
        // An unrecognised kind becomes null rather than being passed through.
        // The filter chips are a closed vocabulary, and a typo'd kind that
        // reaches the UI renders as a chip nobody can ever match.
        kind: rawKind && KINDS.includes(rawKind) ? (rawKind as FeatKind) : null,
        prerequisite: str(fm.prerequisite),
        prerequisiteClass: str(fm.prerequisite_class),
        abilities: strList(fm.abilities).map(a => a.toLowerCase()),
        benefitCount: num(fm.benefit_count),
        modelledCount: num(fm.modelled_count),
        tags: strList(fm.tags),
        aliases: strList(fm.aliases),
      }
    },
  })

  return {
    ...base,
    byName: name => byFeatName(base.list(), name),
    byNames: names => {
      const out: FeatRow[] = []
      const seen = new Set<string>()
      const rows = base.list()
      for (const name of names) {
        const hit = byFeatName(rows, name)
        if (hit && !seen.has(hit.id)) {
          seen.add(hit.id)
          out.push(hit)
        }
      }
      return out.sort((a, b) => a.name.localeCompare(b.name))
    },
    ofKind: kind => base.list().filter(f => f.kind === kind),
    grantingAbility: ability => {
      const want = ability.trim().toLowerCase()
      return base.list().filter(f => f.abilities.includes(want))
    },
  }
}

/**
 * The ability keys a feat's benefits can raise, read from the fence.
 *
 * This is the *source* of the `abilities` derived key — the exporter runs this
 * logic and writes the result to frontmatter. It lives here so there is exactly
 * one definition of what the derived key means, and so a reader can recompute it
 * to check an export rather than trusting it.
 */
/**
 * `benefit_count` and `modelled_count`, recomputed from the fence.
 *
 * Same contract as `abilitiesFromFence`: one definition of what the derived key
 * means, on the side that consumes it, so a reader can check an export rather
 * than trust it. `src/__verify__/realVault.test.ts` asserts the frontmatter and
 * the fence agree on a sample of real notes — which is the only check there is
 * that the exporter in `C:\DnD\5etools\mcp-server` did its arithmetic, since no
 * CI can run it.
 */
export function countsFromFence(fence: FeatFence | null): { benefits: number; modelled: number } {
  const { listed } = splitBenefits(fence?.benefits)
  return {
    benefits: listed.length,
    modelled: listed.filter(b => (b.effects?.length ?? 0) > 0).length,
  }
}

/**
 * A feat's benefits as a reader counts them, apart from its introduction
 * (MYDND-62).
 *
 * **Every exported fence carries one unnamed `overview` entry** — 196 of 196 on
 * 2026-10-16 — and beside named benefits it is only the lead sentence: "You
 * gain the following benefits." Counted as a benefit it made Great Weapon
 * Master "4 benefits" where the book has three, and since an intro never
 * carries an effect, only 4 of 196 feats could ever read as fully modelled.
 *
 * **Alone, an unnamed entry *is* the feat**, so it stays listed: a feat with no
 * sub-parts, like Defense, is one sentence, and `sheetBenefits.js` in
 * `@vault/derive` merges on the same test (`benefits.length === 1 && !name`).
 *
 * The exporter in `C:\DnD\5etools\mcp-server` must count the same way; notes
 * exported before it did carry one more than this returns, and the real-vault
 * suite says so.
 */
export function splitBenefits(benefits: FeatBenefit[] | undefined): { intro: FeatBenefit[]; listed: FeatBenefit[] } {
  const all = Array.isArray(benefits) ? benefits : []
  const named = all.filter(b => typeof b.name === 'string' && b.name.trim() !== '')
  if (named.length === 0) return { intro: [], listed: all }
  return { intro: all.filter(b => !named.includes(b)), listed: named }
}

export function abilitiesFromFence(fence: FeatFence | null): string[] {
  const out = new Set<string>()
  for (const benefit of fence?.benefits ?? []) {
    for (const effect of benefit.effects ?? []) {
      if (effect?.type !== 'ability_score_choice') continue
      for (const opt of Array.isArray(effect.options) ? effect.options : []) {
        if (typeof opt === 'string' && opt.trim()) out.add(opt.trim().toLowerCase())
      }
    }
  }
  return [...out].sort()
}
