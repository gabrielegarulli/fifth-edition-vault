/**
 * The sheet's spells: slots, the spell list, and — for a Vault character —
 * adding, removing and preparing (MYDND-36).
 *
 * Ported in *intent* from `the-vault`'s `SpellPanel.jsx` and `DdbSpellPanel.jsx`,
 * the way `HpPanel` was: the rules are `@vault/derive`'s, the layout is a strip
 * in a pane that is sometimes 380px wide.
 *
 * ## Three files, three owners
 *
 * - **Slot maxima** are the charsheet fence's (`spell_slots`), projected from the
 *   classes. A number of the sheet, like max hit points.
 * - **Slots spent** are `vault-vitals`' (`spell_slots_used`): play state, which a
 *   re-sync must not reset — the reason that fence exists.
 * - **The spell list** of a Vault character is its `vault-character` fence. An
 *   edit reads the note, changes `spells`, and goes through
 *   `saveVaultCharacter`, which re-projects the charsheet in the same write —
 *   so the list is never edited in the charsheet, where a rebuild would erase it.
 *
 * ## A D&D Beyond character's list is D&D Beyond's
 *
 * It gets slots and links, and no editing: a re-sync replaces the charsheet's
 * spell list wholesale, so an edit made here would be silently undone. Exactly
 * the web app's `DdbSpellPanel`, which has no add or remove either.
 *
 * ## What it does not do
 *
 * - **One DC for every spell.** The sheet carries one spellcasting line (ADR 0007,
 *   decision 5); a Cleric/Wizard's second DC is a gap, not a wrong number.
 * - **No armour-proficiency block on casting** (`VAULT-154`) — the sheet does not
 *   carry the armour penalty that would drive it.
 *
 * Since MYDND-197 it is a folder: a file per list (a D&D Beyond character's
 * spells, a Vault character's own, the ones features grant, free casts), the
 * line and cast buttons they share, and `SpellPanel.tsx`, which stacks them.
 * This file is the surface, the six names other files import, as when it was one file.
 */

export { type SpellPanelProps } from './types'
export { hasSpellPanel, SpellPanel } from './SpellPanel'
export { Pips } from './slots'
export { shortCastingTime, shortRange } from './spellLine'
