
/** The book the class data was transcribed from, so its rows win a tie. */
export const PREFERRED_SOURCE = "SRD 5.2.1"

/**
 * A `content_item` row, as far as this module reads one.
 *
 * @typedef {{
 *   id?: string | null,
 *   name?: string | null,
 *   source_slug?: string | null,
 *   item_type?: string | null,
 *   data?: { scfType?: string | null, packContents?: unknown } | null,
 * }} CatalogItem
 */

/**
 * One `startingEquipment` entry, resolved, in one of four kinds. `T` is the
 * caller's catalog row, which comes back as it went in.
 *
 * Each kind spells the others' fields as absent, so a reader may ask any entry
 * for `item` or `options` and narrow on `kind` only when it needs to.
 *
 * @template {CatalogItem} T
 * @typedef {(
 *   | { kind: 'item', name: string, quantity: number, item: T, contents?: undefined, missing?: undefined, categoryId?: undefined, label?: undefined, options?: undefined }
 *   | { kind: 'bundle', name: string, quantity: number, item: T, contents: { item: T, quantity: number }[], missing: string[], categoryId?: undefined, label?: undefined, options?: undefined }
 *   | { kind: 'choice', name: string, quantity: number, categoryId: string, label: string, options: T[], item?: undefined, contents?: undefined, missing?: undefined }
 *   | { kind: 'unavailable', name: string, quantity: number, item?: undefined, contents?: undefined, missing?: undefined, categoryId?: undefined, label?: undefined, options?: undefined }
 * )} ResolvedEntry
 */

/**
 * One lettered option, resolved.
 *
 * @template {CatalogItem} T
 * @typedef {{ key: string, entries: ResolvedEntry<T>[], gold: number }} ResolvedOption
 */

/**
 * A category the class data names instead of an item.
 *
 * @typedef {{ id: string, test: (name: string) => boolean, label: string, match: (item: CatalogItem) => boolean }} Category
 */

/**
 * The categories the class data names instead of an item, and the catalog rows
 * each one offers.
 *
 * `scfType` is carried on the focus rows by VAULT-169's import and is what
 * makes the three focus categories answerable from data rather than from a
 * hardcoded list of names that would go stale the first time a book added one.
 *
 * Order matters: `test` runs in sequence and the first hit wins, so
 * `artisan's tools or musical instrument` must be tried before the bare
 * `musical instrument`.
 */
/** @type {readonly Category[]} */
const CATEGORIES = [
  {
    id: 'tool-or-instrument',
    test: (name) => /artisan'?s tools?\s+or\s+musical instrument/.test(name),
    label: 'Artisan’s tools or a musical instrument',
    match: (item) => item.item_type === "Artisan's Tools" || item.item_type === 'Instrument',
  },
  {
    id: 'instrument',
    test: (name) => /^musical instrument\b/.test(name),
    label: 'A musical instrument',
    match: (item) => item.item_type === 'Instrument',
  },
  {
    id: 'artisans-tools',
    test: (name) => /^artisan'?s tools?\b/.test(name),
    label: 'A set of artisan’s tools',
    match: (item) => item.item_type === "Artisan's Tools",
  },
  {
    id: 'holy-symbol',
    test: (name) => /^holy symbol\b/.test(name),
    label: 'A holy symbol',
    match: (item) => item.data?.scfType === 'holy',
  },
  {
    id: 'arcane-focus',
    test: (name) => /^arcane focus\b/.test(name),
    label: 'An arcane focus',
    match: (item) => item.data?.scfType === 'arcane',
  },
  {
    id: 'druidic-focus',
    test: (name) => /^druidic focus\b/.test(name),
    label: 'A druidic focus',
    match: (item) => item.data?.scfType === 'druid',
  },
]

/**
 * @param {unknown} value
 * @returns {string}
 */
function norm(value) {
  return String(value ?? '').trim().toLowerCase()
}

/**
 * The text inside a trailing parenthesis, and the text before it.
 *
 * `'arcane focus (crystal)'` → `{ head: 'arcane focus', inner: 'crystal' }`.
 * Null when there is no parenthetical at all.
 *
 * @param {string | null | undefined} name
 * @returns {{head: string, inner: string}|null}
 */
export function splitSpecifier(name) {
  const match = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(String(name ?? ''))
  if (!match) return null
  const head = match[1].trim()
  const inner = match[2].trim()
  if (!head || !inner) return null
  return { head, inner }
}

/**
 * A trailing plural dropped — `arrows` → `arrow`. Only the simple `s`, because
 * every plural in this data is one (`arrows`, `daggers`) and an `-ies`/`-ves`
 * rule would start guessing at names like `Supplies` that are already singular
 * in the catalog.
 *
 * @param {string | null | undefined} name
 * @returns {string|null}  null when the name is not a simple plural
 */
export function singular(name) {
  const value = String(name ?? '').trim()
  if (!/[^s]s$/i.test(value)) return null
  return value.slice(0, -1)
}

/**
 * The catalog row for one name, or null.
 *
 * Tries, in order: the name as written, its singular, the text inside a
 * trailing parenthesis, and the text before one. Within each attempt a
 * `PREFERRED_SOURCE` row beats any other.
 *
 * @template {CatalogItem} T
 * @param {string | null | undefined} name
 * @param {readonly T[] | null | undefined} catalog  `content_item` rows
 * @returns {T | null}
 */
export function resolveStartingItem(name, catalog) {
  const rows = catalog ?? []

  const attempts = [String(name ?? '').trim()]
  const plural = singular(name)
  if (plural) attempts.push(plural)
  const parts = splitSpecifier(name)
  if (parts) {
    attempts.push(parts.inner)
    const innerSingular = singular(parts.inner)
    if (innerSingular) attempts.push(innerSingular)
    attempts.push(parts.head)
  }

  for (const attempt of attempts) {
    const key = norm(attempt)
    if (!key) continue
    const hits = rows.filter((item) => norm(item?.name) === key)
    if (hits.length === 0) continue
    return hits.find((item) => item.source_slug === PREFERRED_SOURCE) ?? hits[0]
  }
  return null
}

/**
 * The category one name names, with the rows it offers — or null when the name
 * is not a category at all.
 *
 * A category with **no** rows behind it answers null rather than an empty
 * choice, so it falls through to `unavailable` and gets reported instead of
 * rendering as a Select with nothing in it.
 *
 * @template {CatalogItem} T
 * @param {string} name
 * @param {readonly T[] | null | undefined} catalog
 * @returns {{id: string, label: string, options: T[]}|null}
 */
export function resolveCategory(name, catalog) {
  const key = norm(name)
  const category = CATEGORIES.find((c) => c.test(key))
  if (!category) return null

  const options = (catalog ?? [])
    .filter((item) => category.match(item))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))

  if (options.length === 0) return null
  return { id: category.id, label: category.label, options }
}

/**
 * A bundle's contents as catalog rows — `Explorer's Pack` becoming the eight
 * things inside it.
 *
 * Anything the manifest names that the catalog cannot answer is dropped from
 * `contents` and listed in `missing`, so a half-resolvable pack still grants
 * what it can and still says what it could not.
 *
 * @template {CatalogItem} T
 * @param {CatalogItem | null | undefined} item  a catalog row
 * @param {readonly T[] | null | undefined} catalog
 * @returns {{contents: Array<{item: T, quantity: number}>, missing: string[]}|null}
 */
export function explodeBundle(item, catalog) {
  const packContents = item?.data?.packContents
  if (!Array.isArray(packContents) || packContents.length === 0) return null
  /** @type {readonly ({ name?: string | null, quantity?: number | null } | null | undefined)[]} */
  const manifest = packContents

  /** @type {{ item: T, quantity: number }[]} */
  const contents = []
  /** @type {string[]} */
  const missing = []
  for (const entry of manifest) {
    const row = resolveStartingItem(entry?.name, catalog)
    if (row) contents.push({ item: row, quantity: entry?.quantity ?? 1 })
    else missing.push(String(entry?.name ?? ''))
  }
  return { contents, missing }
}

/**
 * One `startingEquipment` entry, resolved.
 *
 * Gold is not an entry — a `{ value }` entry is folded into the option's purse
 * by `resolveEquipmentOption` and never reaches here.
 *
 * @template {CatalogItem} T
 * @param {{item?: unknown, quantity?: unknown} | null | undefined} entry
 * @param {readonly T[] | null | undefined} catalog
 * @returns {ResolvedEntry<T>}  one of the four kinds
 */
export function resolveEntry(entry, catalog) {
  const name = String(entry?.item ?? '').trim()
  const quantity = typeof entry?.quantity === 'number' && Number.isFinite(entry.quantity) ? entry.quantity : 1

  // A concrete row is tried **before** a category, and the order is the whole
  // point. `arcane focus (crystal)` matches the `/^arcane focus\b/` category
  // test perfectly well, but the book has already said which focus — asking
  // the player to choose one would be throwing away an answer the data gave.
  // A category only gets its turn when no row answers the name at all, which
  // is exactly the case for the bare `holy symbol` and for
  // `musical instrument (choice of one)`, whose parenthetical is a prompt
  // rather than a specifier.
  const item = resolveStartingItem(name, catalog)
  if (item) {
    const bundle = explodeBundle(item, catalog)
    if (bundle) {
      return { kind: 'bundle', name, quantity, item, contents: bundle.contents, missing: bundle.missing }
    }
    return { kind: 'item', name, quantity, item }
  }

  const category = resolveCategory(name, catalog)
  if (category) {
    return { kind: 'choice', name, quantity, categoryId: category.id, label: category.label, options: category.options }
  }

  return { kind: 'unavailable', name, quantity }
}

/**
 * One lettered option, resolved.
 *
 * @template {CatalogItem} T
 * @param {string} key  `'a'`, `'b'`, …
 * @param {readonly ({ item?: unknown, quantity?: unknown, value?: unknown } | null | undefined)[] | null | undefined} entries
 * @param {readonly T[] | null | undefined} catalog
 * @returns {ResolvedOption<T>}
 */
export function resolveEquipmentOption(key, entries, catalog) {
  /** @type {ResolvedEntry<T>[]} */
  const resolved = []
  let gold = 0

  for (const entry of entries ?? []) {
    if (entry && entry.value != null && entry.item == null) {
      const value = Number(entry.value)
      if (Number.isFinite(value)) gold += value
      continue
    }
    if (!entry?.item) continue
    resolved.push(resolveEntry(entry, catalog))
  }

  return { key, entries: resolved, gold }
}

/**
 * Every option a class offers, in the book's order.
 *
 * Returns `[]` for a class with no `startingEquipment` (15 of the 28 catalog
 * rows) and for the Artificer, whose payload is a raw 5e.tools `entries` array
 * of prose rather than the `{a, b, c}` shape — a different vocabulary, and
 * reading it as this one would produce an option with no entries that looked
 * like a class that grants nothing.
 *
 * @template {CatalogItem} T
 * @param {unknown} startingEquipment  `content_class.data.startingEquipment`
 * @param {readonly T[] | null | undefined} catalog
 * @returns {ResolvedOption<T>[]}
 */
export function resolveStartingEquipment(startingEquipment, catalog) {
  if (!startingEquipment || typeof startingEquipment !== 'object') return []
  const byKey = /** @type {Record<string, unknown>} */ (startingEquipment)

  // A **single letter**, not merely any array-valued key. The Artificer's
  // payload is `{ entries: [...] }` — a raw 5e.tools prose array — and an
  // `Array.isArray` filter alone admits it as an option called "entries" that
  // renders with no items and no gold. That reads as a class which grants
  // nothing, which is a lie about the data rather than a gap in it.
  return Object.keys(byKey)
    .filter((key) => /^[a-z]$/i.test(key) && Array.isArray(byKey[key]))
    .sort()
    .map((key) => resolveEquipmentOption(key, /** @type {{ item?: unknown, quantity?: unknown, value?: unknown }[]} */ (byKey[key]), catalog))
}

/**
 * What one chosen option actually grants, flattened to `(item, quantity)` pairs
 * ready for `add_equipment_to_inventory`.
 *
 * `choices` maps an entry's index to the catalog row the player picked; an
 * unanswered choice contributes nothing rather than defaulting to the first
 * option, because a silent default is a decision made on the player's behalf
 * that they can never see was made.
 *
 * Quantities are **merged by item id**, so a Ranger taking a pack that contains
 * rope alongside a separately granted rope arrives as one row of two rather
 * than two rows the RPC would stack anyway.
 *
 * @template {CatalogItem} T
 * @param {ResolvedOption<T> | null | undefined} option
 * @param {Readonly<Record<number, T | null | undefined>>} [choices]
 * @returns {{items: Array<{item: T, quantity: number}>, gold: number, unavailable: string[]}}
 */
export function grantsFor(option, choices = {}) {
  /** @type {Map<string, { item: T, quantity: number }>} */
  const byId = new Map()
  /** @type {string[]} */
  const unavailable = []

  /**
   * @param {T} item
   * @param {number} quantity
   */
  const add = (item, quantity) => {
    if (!item?.id) return
    const existing = byId.get(item.id)
    if (existing) existing.quantity += quantity
    else byId.set(item.id, { item, quantity })
  }

  option?.entries?.forEach((entry, index) => {
    if (entry.kind === 'item') {
      add(entry.item, entry.quantity)
    } else if (entry.kind === 'bundle') {
      for (const content of entry.contents) add(content.item, content.quantity * entry.quantity)
      for (const name of entry.missing) unavailable.push(name)
    } else if (entry.kind === 'choice') {
      const picked = choices[index]
      if (picked) add(picked, entry.quantity)
    } else if (entry.kind === 'unavailable') {
      unavailable.push(entry.name)
    }
  })

  return { items: [...byId.values()], gold: option?.gold ?? 0, unavailable }
}

/**
 * Whether every choice an option asks has been answered — what the step's
 * Create button waits for.
 *
 * @param {{ entries: readonly { kind: string }[] } | null | undefined} option
 * @param {Readonly<Record<number, unknown>>} [choices]
 * @returns {boolean}
 */
export function optionChoicesComplete(option, choices = {}) {
  return (option?.entries ?? []).every(
    (entry, index) => entry.kind !== 'choice' || choices[index] != null,
  )
}
