
/** The book the class data was transcribed from, so its rows win a tie. */
export const PREFERRED_SOURCE = "SRD 5.2.1"

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

function norm(value) {
  return String(value ?? '').trim().toLowerCase()
}

/**
 * The text inside a trailing parenthesis, and the text before it.
 *
 * `'arcane focus (crystal)'` → `{ head: 'arcane focus', inner: 'crystal' }`.
 * Null when there is no parenthetical at all.
 *
 * @param {string} name
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
 * @param {string} name
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
 * @param {string} name
 * @param {Array<object>} catalog  `content_item` rows
 * @returns {object|null}
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
 * @param {string} name
 * @param {Array<object>} catalog
 * @returns {{id: string, label: string, options: Array<object>}|null}
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
 * @param {object} item  a catalog row
 * @param {Array<object>} catalog
 * @returns {{contents: Array<{item: object, quantity: number}>, missing: string[]}|null}
 */
export function explodeBundle(item, catalog) {
  const manifest = item?.data?.packContents
  if (!Array.isArray(manifest) || manifest.length === 0) return null

  const contents = []
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
 * @param {{item: string, quantity?: number}} entry
 * @param {Array<object>} catalog
 * @returns {object}  one of the four kinds
 */
export function resolveEntry(entry, catalog) {
  const name = String(entry?.item ?? '').trim()
  const quantity = Number.isFinite(entry?.quantity) ? entry.quantity : 1

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
 * @param {string} key  `'a'`, `'b'`, …
 * @param {Array<object>} entries
 * @param {Array<object>} catalog
 * @returns {{key: string, entries: Array<object>, gold: number}}
 */
export function resolveEquipmentOption(key, entries, catalog) {
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
 * @param {object|null|undefined} startingEquipment  `content_class.data.startingEquipment`
 * @param {Array<object>} catalog
 * @returns {Array<{key: string, entries: Array<object>, gold: number}>}
 */
export function resolveStartingEquipment(startingEquipment, catalog) {
  if (!startingEquipment || typeof startingEquipment !== 'object') return []

  // A **single letter**, not merely any array-valued key. The Artificer's
  // payload is `{ entries: [...] }` — a raw 5e.tools prose array — and an
  // `Array.isArray` filter alone admits it as an option called "entries" that
  // renders with no items and no gold. That reads as a class which grants
  // nothing, which is a lie about the data rather than a gap in it.
  return Object.keys(startingEquipment)
    .filter((key) => /^[a-z]$/i.test(key) && Array.isArray(startingEquipment[key]))
    .sort()
    .map((key) => resolveEquipmentOption(key, startingEquipment[key], catalog))
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
 * @param {{entries: Array<object>, gold: number}|null} option
 * @param {Record<number, object>} [choices]
 * @returns {{items: Array<{item: object, quantity: number}>, gold: number, unavailable: string[]}}
 */
export function grantsFor(option, choices = {}) {
  const byId = new Map()
  const unavailable = []

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
 * @param {{entries: Array<object>}|null} option
 * @param {Record<number, object>} [choices]
 * @returns {boolean}
 */
export function optionChoicesComplete(option, choices = {}) {
  return (option?.entries ?? []).every(
    (entry, index) => entry.kind !== 'choice' || choices[index] != null,
  )
}
