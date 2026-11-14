// @ts-check
// The tool vocabulary — VAULT-176.
//
// Every tool a character can be proficient with under the 2024 PHB, keyed by the
// slug a `tool_proficiency` effect stores. Ruling 5 called this "a closed PHB
// tool vocabulary" from the day the type shipped, but until this module the
// field was free text: the editor took whatever was typed, Crafter stored
// `smiths-tools`, the fixtures said `Smith's Tools`, and `vaultToolProficiencies`
// would list both. A closed set is what lets two sources granting the same tool
// read as one proficiency, and what lets the crafting DC read the answer instead
// of asking for it.
//
// 37 entries, checked against the XPHB tool list in the 5e.tools data: 17
// Artisan's Tools, 10 Musical Instruments, 4 Gaming Sets, and 6 other kits.
// **No vehicles** — Land and Water Vehicles were 2014 proficiencies and the 2024
// book does not list them as tools.
//
// The slugs of the 19 tools `crafting/manufacturing.js` already knew are kept
// verbatim, `jewellers-tools` included: they are stored in
// `content_item.data.manufacturing`, so renaming one here would orphan catalog
// rows. Names use the repo's existing sentence case ("Smith's tools"), which the
// crafting dialogs and their tests already print.
//
// `content_item` is no help as a source — it holds the artisan's tools and the
// instruments and none of Thieves' Tools, the Gaming Sets or the other kits.

/** The four kinds of tool, in the order a picker lists them. */
/** @typedef {'artisan' | 'kit' | 'gaming' | 'instrument'} ToolCategory */
/** @typedef {{ name: string, category: ToolCategory }} Tool */

/** @type {readonly ToolCategory[]} */
export const TOOL_CATEGORIES = Object.freeze(['artisan', 'kit', 'gaming', 'instrument'])

/** @type {Readonly<Record<string, Tool>>} */
export const TOOLS = Object.freeze({
  // --- Artisan's Tools ---
  'alchemists-supplies': { name: "Alchemist's supplies", category: 'artisan' },
  'brewers-supplies': { name: "Brewer's supplies", category: 'artisan' },
  'calligraphers-supplies': { name: "Calligrapher's supplies", category: 'artisan' },
  'carpenters-tools': { name: "Carpenter's tools", category: 'artisan' },
  'cartographers-tools': { name: "Cartographer's tools", category: 'artisan' },
  'cobblers-tools': { name: "Cobbler's tools", category: 'artisan' },
  'cooks-utensils': { name: "Cook's utensils", category: 'artisan' },
  'glassblowers-tools': { name: "Glassblower's tools", category: 'artisan' },
  'jewellers-tools': { name: "Jeweller's tools", category: 'artisan' },
  'leatherworkers-tools': { name: "Leatherworker's tools", category: 'artisan' },
  'masons-tools': { name: "Mason's tools", category: 'artisan' },
  'painters-supplies': { name: "Painter's supplies", category: 'artisan' },
  'potters-tools': { name: "Potter's tools", category: 'artisan' },
  'smiths-tools': { name: "Smith's tools", category: 'artisan' },
  'tinkers-tools': { name: "Tinker's tools", category: 'artisan' },
  'weavers-tools': { name: "Weaver's tools", category: 'artisan' },
  'woodcarvers-tools': { name: "Woodcarver's tools", category: 'artisan' },

  // --- Other tools ---
  'disguise-kit': { name: 'Disguise kit', category: 'kit' },
  'forgery-kit': { name: 'Forgery kit', category: 'kit' },
  'herbalism-kit': { name: 'Herbalism kit', category: 'kit' },
  'navigators-tools': { name: "Navigator's tools", category: 'kit' },
  'poisoners-kit': { name: "Poisoner's kit", category: 'kit' },
  'thieves-tools': { name: "Thieves' tools", category: 'kit' },

  // --- Gaming Sets ---
  'dice-set': { name: 'Dice set', category: 'gaming' },
  'dragonchess-set': { name: 'Dragonchess set', category: 'gaming' },
  'playing-cards': { name: 'Playing cards', category: 'gaming' },
  'three-dragon-ante-set': { name: 'Three-Dragon Ante set', category: 'gaming' },

  // --- Musical Instruments ---
  bagpipes: { name: 'Bagpipes', category: 'instrument' },
  drum: { name: 'Drum', category: 'instrument' },
  dulcimer: { name: 'Dulcimer', category: 'instrument' },
  flute: { name: 'Flute', category: 'instrument' },
  horn: { name: 'Horn', category: 'instrument' },
  lute: { name: 'Lute', category: 'instrument' },
  lyre: { name: 'Lyre', category: 'instrument' },
  'pan-flute': { name: 'Pan flute', category: 'instrument' },
  shawm: { name: 'Shawm', category: 'instrument' },
  viol: { name: 'Viol', category: 'instrument' },
})

/** Every tool slug, sorted. */
export const TOOL_SLUGS = Object.freeze(Object.keys(TOOLS).sort())

/** The slugs of one category, sorted. */
/**
 * @param {string} category
 * @returns {string[]}
 */
export function toolSlugsIn(category) {
  return TOOL_SLUGS.filter(slug => TOOLS[slug].category === category)
}

const SLUG_BY_NAME = new Map(TOOL_SLUGS.map(slug => [TOOLS[slug].name.toLowerCase(), slug]))

/**
 * The slug a stored `tool` value means, or null when it names no tool.
 *
 * Accepts the slug itself or the tool's name in any case, because before
 * VAULT-176 both shapes were written — Crafter stored `smiths-tools` and the
 * fixtures `Smith's Tools` — and the two must read as one proficiency.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export function resolveToolSlug(value) {
  if (typeof value !== 'string') return null
  if (TOOLS[value]) return value
  return SLUG_BY_NAME.get(value.trim().toLowerCase()) ?? null
}

/**
 * A tool's display name. A value the vocabulary does not know comes back as it
 * was given rather than as nothing — an effect authored by hand in SQL still
 * reads on the sheet instead of silently vanishing.
 *
 * @template T
 * @param {T} value
 * @returns {string | T}
 */
export function toolName(value) {
  const slug = resolveToolSlug(value)
  return slug ? TOOLS[slug].name : value
}
