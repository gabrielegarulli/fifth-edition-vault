import { effectApplies } from '@vault/derive/effects.js'

/**
 * Which rolls on the sheet are advantaged or disadvantaged right now, and by
 * what (MYDND-45).
 *
 * The web sheet draws an arrow on a row whose roll an *effect* changes —
 * `ability_check_advantage` and its kin — and pre-selects the mode in its roll
 * menu. This does the same off the plugin's resolved effects, and adds the one
 * thing the web sheet never did: the **conditions** a character is declared to
 * be under. A Poisoned rogue's Stealth is at disadvantage whether or not anyone
 * remembered, and the sheet is the place to remember.
 *
 * ## Only the unconditional part of a condition
 *
 * The 2024 rules' conditions, as they touch a d20 roll the *character* makes:
 *
 * | Condition  | Their rolls |
 * | ---------- | ----------- |
 * | Blinded    | disadvantage on attacks |
 * | Frightened | disadvantage on checks and attacks (while the source is in sight) |
 * | Invisible  | advantage on attacks |
 * | Poisoned   | disadvantage on checks and attacks |
 * | Prone      | disadvantage on attacks |
 * | Restrained | disadvantage on attacks and on Dexterity saves |
 *
 * What is left out is left out on purpose: Grappled is disadvantage only
 * against *other* targets; Exhaustion is a −2 per level, not a mode;
 * Paralyzed, Petrified, Stunned and Unconscious make Strength and Dexterity
 * saves *fail*, which is not a roll at all. "Declare, don't simulate" — those
 * are the table's to apply, and a marker claiming them would be wrong half the
 * time. Frightened is kept: "while the source is in sight" is nearly always
 * true in the fight where it was applied, and the marker names its source.
 *
 * ## Advantage and disadvantage cancel
 *
 * The book's rule: with at least one of each, the roll is neither. So a
 * Poisoned, Invisible character's attack is plain, and the marker says so
 * rather than picking a winner.
 */

/**
 * A save made to keep concentrating carries `concentration: true` (MYDND-118):
 * it is a Constitution save, so everything that reaches a Con save reaches it,
 * and War Caster's advantage reaches it and nothing else.
 */
export type RollTarget =
  | { kind: 'check'; ability: string }
  | { kind: 'save'; ability: string; concentration?: boolean }
  | { kind: 'attack' }

export type RollMode = 'advantage' | 'disadvantage'

export interface RollModeInfo {
  /** The roll's mode, or `null` when nothing changes it or both cancel. */
  mode: RollMode | null
  /** What grants advantage, by name. */
  advantage: string[]
  /** What imposes disadvantage, by name. */
  disadvantage: string[]
}

type Rule = { mode: RollMode; applies(target: RollTarget): boolean }

const ATTACKS = (t: RollTarget): boolean => t.kind === 'attack'
const CHECKS = (t: RollTarget): boolean => t.kind === 'check'

/** Keyed by the lowercased condition name, the way `vault-vitals` stores it. */
const CONDITION_RULES: Record<string, Rule[]> = {
  blinded: [{ mode: 'disadvantage', applies: ATTACKS }],
  frightened: [
    { mode: 'disadvantage', applies: ATTACKS },
    { mode: 'disadvantage', applies: CHECKS },
  ],
  invisible: [{ mode: 'advantage', applies: ATTACKS }],
  poisoned: [
    { mode: 'disadvantage', applies: ATTACKS },
    { mode: 'disadvantage', applies: CHECKS },
  ],
  prone: [{ mode: 'disadvantage', applies: ATTACKS }],
  restrained: [
    { mode: 'disadvantage', applies: ATTACKS },
    { mode: 'disadvantage', applies: t => t.kind === 'save' && t.ability === 'DEX' },
  ],
}

/** The conditions that change a roll, for a caller that wants to say which do. */
export const CONDITIONS_THAT_CHANGE_ROLLS = Object.keys(CONDITION_RULES)

/** `str` / `Strength` / `STR` → `STR`; anything else → null. */
function abilityCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim().slice(0, 3).toUpperCase()
  return ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].includes(v) ? v : null
}

/**
 * The `trigger` an effect carries when it holds only on a save to keep
 * concentrating. The exporter writes War Caster's Concentration benefit with
 * exactly this phrase (`localFeatEffects.ts` in `C:\DnD\5etools\mcp-server`,
 * MYDND-118); matched whole, never as a substring of some other prose.
 */
export const CONCENTRATION_TRIGGER = 'to maintain concentration'

/**
 * The effect types that set a mode, and the targets each reaches.
 *
 * An effect *narrowed* to part of a target is left out: a save advantage
 * `against being Frightened` is not advantage on Wisdom saves in general, and an
 * attack advantage limited to one weapon is not advantage on every attack.
 *
 * So is a **passive** effect with a `trigger`: the trigger is prose the sheet
 * cannot check (Ruling 8), and War Caster's "to maintain Concentration" is not
 * advantage on every Con save. An *activated* one is different — switching it on
 * is the player declaring the trigger holds, which is how Actor works. The one
 * trigger the sheet can see is concentration, because the concentration save
 * is its own roll (`PlayStrip`).
 */
function effectRule(effect: Record<string, unknown>): Rule | null {
  const ability = abilityCode(effect.ability)
  const trigger = typeof effect.trigger === 'string' ? effect.trigger.trim().toLowerCase() : ''
  const declared = !trigger || effect.activation === 'activated'
  const forAbility = (kind: 'check' | 'save') => (t: RollTarget) =>
    t.kind === kind && (ability === null || t.ability === ability)

  if (!declared) {
    if (trigger !== CONCENTRATION_TRIGGER) return null
    const onConcentration = (t: RollTarget) => t.kind === 'save' && !!t.concentration && forAbility('save')(t)
    switch (effect.type) {
      case 'saving_throw_advantage':
        return { mode: 'advantage', applies: onConcentration }
      case 'saving_throw_disadvantage':
        return { mode: 'disadvantage', applies: onConcentration }
      default:
        return null
    }
  }

  switch (effect.type) {
    case 'ability_check_advantage':
      return { mode: 'advantage', applies: forAbility('check') }
    case 'ability_check_disadvantage':
      return { mode: 'disadvantage', applies: forAbility('check') }
    case 'saving_throw_advantage':
      return effect.condition ? null : { mode: 'advantage', applies: forAbility('save') }
    case 'saving_throw_disadvantage':
      return effect.condition ? null : { mode: 'disadvantage', applies: forAbility('save') }
    case 'attack_roll_advantage':
      return effect.weapon ? null : { mode: 'advantage', applies: ATTACKS }
    case 'attack_roll_disadvantage':
      return effect.weapon ? null : { mode: 'disadvantage', applies: ATTACKS }
    default:
      return null
  }
}

/** Title-case a stored condition for display: `poisoned` → `Poisoned`. */
export function conditionLabel(name: string): string {
  const s = name.trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Build the resolver once per render of the sheet; ask it per roll.
 *
 * `effects` are the character's resolved effects (catalog and declared);
 * `activeKeys` the switched-on ones, which `effectApplies` gates an activated
 * effect on — Rage's advantage is not advantage until Rage is on.
 */
export function rollModes(
  effects: readonly Record<string, unknown>[],
  activeKeys: readonly string[],
  conditions: readonly string[],
): (target: RollTarget) => RollModeInfo {
  const active = new Set(activeKeys)
  const sourced: { rule: Rule; source: string }[] = []

  for (const effect of effects) {
    const rule = effectRule(effect)
    if (!rule || !effectApplies(effect, active)) continue
    const source = typeof effect.source === 'string' && effect.source ? effect.source : 'A feature'
    sourced.push({ rule, source })
  }
  for (const raw of conditions) {
    const key = raw.trim().toLowerCase()
    for (const rule of CONDITION_RULES[key] ?? []) sourced.push({ rule, source: conditionLabel(key) })
  }

  return target => {
    const advantage: string[] = []
    const disadvantage: string[] = []
    for (const { rule, source } of sourced) {
      if (!rule.applies(target)) continue
      const list = rule.mode === 'advantage' ? advantage : disadvantage
      if (!list.includes(source)) list.push(source)
    }
    const mode =
      advantage.length > 0 && disadvantage.length === 0
        ? 'advantage'
        : disadvantage.length > 0 && advantage.length === 0
          ? 'disadvantage'
          : null
    return { mode, advantage, disadvantage }
  }
}

/** The sentence a marker carries, so the arrow says where it came from. */
export function describeRollMode(info: RollModeInfo, what: string): string | null {
  if (info.mode === 'advantage') return `Advantage on ${what} — ${info.advantage.join(', ')}`
  if (info.mode === 'disadvantage') return `Disadvantage on ${what} — ${info.disadvantage.join(', ')}`
  if (info.advantage.length > 0 && info.disadvantage.length > 0) {
    return `Advantage and disadvantage cancel on ${what} — ${[...info.advantage, ...info.disadvantage].join(', ')}`
  }
  return null
}
