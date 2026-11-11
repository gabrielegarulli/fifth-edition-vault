/**
 * The rolls hiding in a stat block's prose.
 *
 * **No `obsidian` import and no React**, so every pattern below is exercised in
 * plain Node — which matters more here than almost anywhere else in the repo,
 * because this file reads *prose* and a regex over prose is the kind of thing
 * that looks right and is wrong on the 40th note.
 *
 * ## Why parse prose at all
 *
 * The bestiary notes' ` ```statblock ` fence carries attack bonuses and damage
 * dice **only inside `desc` strings** — there is no `attack_bonus` field and no
 * `damage` field to read. The exporter does not write them and neither does
 * Fantasy Statblocks' schema. So the choice was a parse or a `/monsters` detail
 * view with nothing clickable on it, which is what MYDND-15 left behind and what
 * makes the GM's most-used surface in a fight the one surface with no dice.
 *
 * ## Measured, not guessed (MYDND-16, against `C:\DnD\lore\bestiary`, 422 notes)
 *
 * Every pattern here comes from counting the corpus rather than from reading one
 * note and extrapolating:
 *
 * - **Attack-roll labels: exactly three spellings.** `*Melee Attack Roll:*`
 *   (359 notes), `*Ranged Attack Roll:*` (48), and
 *   `*Melee Attack Roll or Ranged Attack Roll:*` (21). 328 of 422 notes carry at
 *   least one. The third is why the label pattern allows letters *and spaces*
 *   before `Attack Roll:` — a `\*Melee Attack Roll:\*` literal misses 21 notes.
 * - **Parenthesised dice: 1,078 occurrences in five shapes.** `(2d6 + 5)` (534),
 *   `(2d6)` (526), `(2d8 \n+ 4)` (12), `(2d8 + \n4)` (4), `(1d6 - 1)` (2). The 16
 *   with a literal newline *inside the parentheses* are the trap: they are what
 *   a `\(\d+d\d+( ?[+-] ?\d+)?\)` pattern silently drops, and dropping them
 *   loses a damage die rather than failing visibly.
 * - **Damage types are a closed vocabulary**, and `damage` is not always
 *   preceded by one: four occurrences read `) from its …`. So the type is
 *   matched against the thirteen real types and is `null` otherwise, rather
 *   than being "whatever word sits before the word damage".
 *
 * A saving throw the monster *imposes* (`*Dexterity Saving Throw:* DC 15`) is
 * deliberately **not** rollable. Nobody rolls a DC — the same rule the character
 * sheet follows, where every number a player rolls is a `Rollable` and a DC is
 * text.
 */

/** The thirteen. Lower-cased on both sides, because the corpus mixes case. */
const DAMAGE_TYPES = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
] as const

/**
 * `*Melee Attack Roll:* +9` → `9`.
 *
 * `[A-Za-z ]*` rather than an alternation of the three measured spellings: all
 * three are letters and spaces followed by the literal `Attack Roll:`, and the
 * colon in `… or Ranged Attack Roll:` is the delimiter that stops it running on.
 */
const ATTACK = /\*[A-Za-z ]*Attack Roll:\*\s*([+-]\s*\d+)/

/**
 * One parenthesised dice expression, plus whatever follows its closing bracket.
 *
 * `[^)]` matches a newline in JavaScript, which is what admits the 16
 * `(2d8 \n+ 4)` cases without an `s` flag. The trailing capture is deliberately
 * short and is only ever consulted against `DAMAGE_TYPES`.
 */
const DICE = /\((\d+\s*d\s*\d+(?:\s*[+-]\s*\d+)?)\)\s*([A-Za-z]+)?/g

/** One damage expression off an action, with its type when it has a real one. */
export interface DamageRoll {
  /** `2d6 + 5`, whitespace as written. `parseFormula` strips it. */
  formula: string
  /** Canonical lower-case type, or `null` — never an invented word. */
  damageType: string | null
}

export interface ActionRolls {
  /** The attack bonus as a number, so the caller formats it. `null` if none. */
  attack: number | null
  /** **Every** damage expression, in the order the prose states them. */
  damage: DamageRoll[]
}

/**
 * What is rollable in one action's `desc`.
 *
 * Returns every damage expression rather than the first, because the corpus
 * states secondary damage inline — "7 (2d6) Piercing damage plus 3 (1d6) Poison
 * damage" is one action with two dice, and offering only the Piercing would
 * quietly understate the monster.
 */
export function actionRolls(desc: string | null | undefined): ActionRolls {
  const text = String(desc ?? '')
  if (text === '') return { attack: null, damage: [] }

  const attackMatch = ATTACK.exec(text)
  // `replace` on the capture: the corpus writes `+9`, but a signed number split
  // across a newline is a shape this file has already been surprised by once.
  const attack = attackMatch ? Number(attackMatch[1].replace(/\s+/g, '')) : null

  const damage: DamageRoll[] = []
  // `lastIndex` is state on a module-level regex, so a fresh exec loop has to
  // reset it or the second call to this function starts mid-string.
  DICE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = DICE.exec(text)) !== null) {
    const word = (m[2] ?? '').toLowerCase()
    damage.push({
      formula: m[1],
      damageType: (DAMAGE_TYPES as readonly string[]).includes(word) ? word : null,
    })
  }

  return { attack: Number.isFinite(attack) ? attack : null, damage }
}

/**
 * `"+7 (17)"` → `7`. The modifier out of the fence's initiative string.
 *
 * All 422 notes write it as a signed modifier followed by the passive score in
 * brackets — 391 `"+N (N)"`, 31 `"-N (N)"` — so the bracketed number is the one
 * that must **not** be read: it is the passive initiative, and rolling `1d20+17`
 * for a creature with a +7 modifier is a plausible-looking ten-point error.
 */
export function initiativeMod(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const m = /^\s*([+-]?\s*\d+)/.exec(String(value ?? ''))
  if (!m) return null
  const n = Number(m[1].replace(/\s+/g, ''))
  return Number.isFinite(n) ? n : null
}
