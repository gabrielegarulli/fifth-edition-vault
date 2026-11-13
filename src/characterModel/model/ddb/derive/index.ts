/**
 * Deriving a sheet from a D&D Beyond payload.
 *
 * Ported from `obsidian-vault-characters`' section 1 (MYDND-7), where it was
 * itself a reimplementation of `the-vault`'s web derivation. **It is kept
 * rather than replaced by `@vault/derive/ddbDerive.js`**, which is in
 * `src/derive/` and does the same job: this code is what produced the two
 * character notes in the author's vault, every defensive read below is a bug
 * it has already been bitten by, and switching derivations would change
 * numbers on existing notes silently. Converging the two is its own card, with
 * its own verification against both characters.
 *
 * **The DDB schema is unofficial, so every reader here is defensive and most
 * have been wrong once.** The comments record which, and they are the reason
 * this file reads the long way round in places. Nothing here is defensive
 * out of habit.
 *
 * This module imports nothing from `obsidian` — deliberately, so it stays in
 * the `logic` Vitest project and is testable in plain Node.
 *
 * ## Known gaps, carried over with the code
 *
 * Each of these is a deliberate omission rather than an oversight, and each is
 * here because **nothing is invented to fill a gap** — a wrong label at the
 * table is worse than a blank one.
 *
 * - **A feature attack's damage type is omitted.** The payload gives only a
 *   `damageTypeId` (`11` for psychic) and carries no lookup — the string
 *   "Psychic" appears nowhere in the JSON. A guessed map could label fire damage
 *   as cold. Inventory weapons keep theirs, because DDB gives those as a string.
 * - **Spell slots are not read from the payload.** `spellSlots.available` reads
 *   0 at every level on a character who demonstrably has slots, so it cannot be
 *   trusted to mean what it looks like. Since MYDND-36 the maxima are worked out
 *   from the class levels instead, by `@vault/derive`'s slot rules — what the
 *   web app's DDB spell panel does — and since MYDND-139 a third caster's
 *   subclass counts too (`slotMapForDdbClasses`).
 * - **One spell save DC** is reported for a multiclassed caster — the first
 *   class that casts in its own right, else the first third caster, labelled
 *   with its ability. The rules give one per class.
 *
 * Closed by MYDND-139, against the 25 public Disposable Heroes payloads: weapon
 * proficiency is resolved rather than assumed, a Versatile weapon has its
 * two-handed line, and an Eldritch Knight or Arcane Trickster has slots. The
 * live coverage the inventory weapons lacked was 93 weapons on 21 characters.
 * - **Nothing here writes HP.** The sheet reads hit points; changing them is
 *   MYDND-6's mutable state.
 *
 * Since MYDND-197 it is a folder, a file per part of the sheet, with
 * `buildSheet.ts` calling them all. This file is the surface: the names other
 * files import, exactly as when it was one file. `abilityMod` and `fmtMod` now
 * live in `sheet/abilityMod.ts`, and are re-exported here so nothing moves.
 */

export { abilityMod, fmtMod } from '../../sheet/abilityMod'
export { getAbilityScore } from './shared'
export { getSaves, getSkills, getPassives } from './abilities'
export { getSpeed, deriveHp, deriveAc } from './combat'
export { buildSpellcasting, buildSpells } from './spellcasting'
export { buildAttacks, buildActionAttacks, buildFeatureDice } from './attacks'
export { resourceKey, buildClassResources, buildFeats } from './resources'
export { buildDdbItems, buildDdbCurrency } from './items'
export { buildSheet } from './buildSheet'
