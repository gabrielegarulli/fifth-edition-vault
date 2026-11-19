// @ts-check
import { subclassCasting } from './builderSpellCaps.js'
import { CASTER_PROGRESSIONS } from './casterProgression.js'
import { isKnownEffectType } from './effects.js'
import { PROFICIENCY_KINDS } from './speciesChoices.js'
import { TOOLS } from './tools.js'
import { VAULT_SKILLS } from './vaultDerive.js'

// What a hand-written rules note gets wrong without a sound (MYDND-238).
//
// Since MYDND-234 every catalog admits a note from the homebrew folder, so
// people other than the exporter write these fences. Two mistakes there grant
// nothing and say nothing:
//
// - **A skill key with a space.** `vaultDerive` matches a skill by its slug
//   (`e.skill === slug`), so `sleight of hand` in a `skill_proficiency` effect,
//   or in a list of skill options, is a skill no character can have.
// - **An effect type that does not exist.** `EFFECT_TYPES` is closed, and every
//   consumer skips a type it does not know, so `resistence` is read by nothing.
//
// The card asked for a third: an item effect outside `ITEM_EFFECT_TYPES`. That
// list is the item *builder's* vocabulary, not what the sheet reads. A worn
// item's `skill_bonus` reaches the skill lines (measured), so reporting it would
// call a working note broken. An item's `resistance` is lost for another reason:
// the Defences tab is never handed the worn items (MYDND-239).
//
// This only reads the paths the plugin reads. The bake takes no effects from a
// background, so only its skill list is checked; and a background fence's own
// `skill_proficiencies` is 5e.tools' shape (`sleight of hand: true`, spaces and
// all) and nothing reads it, so it is not checked: every exported background
// would be reported. The frontmatter list is the one the builder reads.
//
// It reports, it never repairs. A reader that quietly mapped `sleight of hand`
// to `sleight_of_hand` would make the note work here and nowhere else.

/** @typedef {'class' | 'subclass' | 'feat' | 'species' | 'background' | 'item' | 'magic-item'} ProblemKind */

const SKILL_SLUGS = new Set(VAULT_SKILLS.map(s => s.slug))

/** @type {ReadonlyMap<string, string>} the slug, by its slug and its name squashed to letters */
const SKILL_BY_LETTERS = new Map(
  VAULT_SKILLS.flatMap(s => [
    [letters(s.slug), s.slug],
    [letters(s.name), s.slug],
  ]),
)

/** The effect types whose `skill` names a skill. */
const SKILL_EFFECT_TYPES = new Set(['skill_proficiency', 'expertise', 'skill_bonus', 'passive_bonus'])

/** The feature choices whose options are skills. */
const SKILL_CHOICE_TYPES = new Set(['skill', 'expertise'])

/** @param {string} s */
function letters(s) {
  return s.toLowerCase().replace(/[^a-z]/g, '')
}

/**
 * The problem with one skill key, or null when it is a skill.
 *
 * @param {unknown} key
 * @returns {string | null}
 */
export function skillKeyProblem(key) {
  if (typeof key !== 'string') return `${JSON.stringify(key) ?? String(key)} is not a skill key.`
  if (SKILL_SLUGS.has(key)) return null
  const meant = SKILL_BY_LETTERS.get(letters(key))
  return meant
    ? `"${key}" is not a skill key; did you mean ${meant}?`
    : `"${key}" is not a skill key. Skill keys are snake_case, e.g. sleight_of_hand.`
}

/**
 * @param {unknown} list
 * @returns {readonly unknown[]}
 */
function listOf(list) {
  return Array.isArray(list) ? /** @type {unknown[]} */ (list) : []
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown> | null}
 */
function recordOf(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : null
}

/**
 * @param {string} where
 * @param {string} problem
 */
function at(where, problem) {
  return where ? `${where}: ${problem}` : problem
}

/**
 * What is wrong with a species' `proficiencies` list (MYDND-243): a kind the
 * builder does not know, a choice it cannot store, and a skill or tool that is
 * not a slug, each of which grants nothing and says nothing. A language and a
 * weapon are names, so any string is one.
 *
 * @param {unknown} list
 * @param {string} where
 * @returns {string[]}
 */
function proficiencyProblems(list, where) {
  /** @type {string[]} */
  const out = []
  for (const raw of listOf(list)) {
    const entry = recordOf(raw)
    if (!entry) continue
    const kind = entry.kind
    if (typeof kind !== 'string' || !(/** @type {readonly string[]} */ (PROFICIENCY_KINDS)).includes(kind)) {
      out.push(at(where, `"${String(kind ?? '')}" is not a proficiency kind; use skill, tool, language or weapon.`))
      continue
    }
    if (entry.key != null) {
      const count = entry.count
      if (typeof entry.key !== 'string' || !entry.key || typeof count !== 'number' || !Number.isInteger(count) || count < 1) {
        out.push(at(where, `a ${kind} choice needs a key and a whole count of at least 1, or it is never asked.`))
      }
    }
    const values = [...listOf(entry.fixed), ...listOf(entry.from)]
    if (kind === 'skill') out.push(...skillOptionProblems(values, where))
    if (kind === 'tool') {
      for (const v of values) {
        if (typeof v !== 'string' || !Object.hasOwn(TOOLS, v)) {
          out.push(at(where, `"${String(v)}" is not a tool key. Tool keys are kebab-case, e.g. smiths-tools.`))
        }
      }
    }
  }
  return out
}

/** The feat kinds a species' `feat` may name: the feat notes' own `kind`. */
const FEAT_KINDS = Object.freeze(['origin', 'general', 'epic_boon', 'fighting_style'])

/**
 * What is wrong with a species' `feat` (MYDND-244): a count the builder cannot
 * ask, or a kind no feat note has, which offers an empty list and says nothing.
 *
 * @param {unknown} raw
 * @param {string} where
 * @returns {string[]}
 */
function speciesFeatProblems(raw, where) {
  if (raw == null) return []
  const feat = recordOf(raw)
  const count = feat?.count
  if (!feat || typeof count !== 'number' || !Number.isInteger(count) || count < 1) {
    return [at(where, 'needs a whole count of at least 1, or it is never asked.')]
  }
  return listOf(feat.kinds)
    .filter((k) => typeof k !== 'string' || !FEAT_KINDS.includes(k))
    .map((k) => at(where, `"${String(k)}" is not a feat kind; use origin, general, epic_boon or fighting_style.`))
}

/**
 * What is wrong with a list of effects.
 *
 * @param {unknown} effects
 * @param {string} where who carries them, for the sentence ("Feature \"Steady Hands\"")
 * @returns {string[]}
 */
export function effectListProblems(effects, where) {
  /** @type {string[]} */
  const out = []
  for (const raw of listOf(effects)) {
    const effect = recordOf(raw)
    if (!effect) continue
    const type = effect.type
    if (!isKnownEffectType(type)) {
      out.push(at(where, `"${String(type ?? '')}" is not an effect type, so it does nothing.`))
      continue
    }
    // `skill` is optional on a bonus ("+1 to skill checks"), so only a present one is checked.
    if (SKILL_EFFECT_TYPES.has(type) && effect.skill != null) {
      const problem = skillKeyProblem(effect.skill)
      if (problem) out.push(at(where, problem))
    }
  }
  return out
}

/**
 * @param {unknown} options
 * @param {string} where
 * @returns {string[]}
 */
function skillOptionProblems(options, where) {
  return listOf(options)
    .map(skillKeyProblem)
    .filter(/** @returns {p is string} */ p => p != null)
    .map(p => at(where, p))
}

/**
 * @param {unknown} features
 * @returns {string[]}
 */
function featureProblems(features) {
  /** @type {string[]} */
  const out = []
  for (const raw of listOf(features)) {
    const feature = recordOf(raw)
    if (!feature) continue
    const where = `Feature "${String(feature.name ?? '')}"`
    // Either spelling: the bake reads `data.effects` and a top-level `effects` both.
    out.push(...effectListProblems(feature.effects, where))
    out.push(...effectListProblems(recordOf(feature.data)?.effects, where))
    const choices = recordOf(feature.choices)
    if (choices && typeof choices.type === 'string' && SKILL_CHOICE_TYPES.has(choices.type)) {
      out.push(...skillOptionProblems(choices.options, where))
    }
  }
  return out
}

const ABILITIES = new Set(['str', 'dex', 'con', 'int', 'wis', 'cha'])

/**
 * What a casting class or subclass gets wrong without a sound (MYDND-252).
 *
 * - **A progression the slot tables do not know**: `full`, `third`, `1/3 caster`.
 *   It gives no slots, and the Spells step offers first-level spells at every
 *   level. A bare `1` in YAML is a number, not the string `"1"`, and a subclass
 *   whose progression is not a string does not cast at all.
 * - For a subclass that casts, **no spell list**, **no ability** or **no
 *   spell counts**. With no list it learns from its own class's list, which
 *   for a Rogue is nothing; with no ability it has no save DC; with no prepared
 *   or known counts the builder caps nothing. No `cantripProgression` is not
 *   reported: a casting subclass with no cantrips is a real design (three
 *   exported ones), and the builder then offers none, which is right.
 *
 * @param {'class' | 'subclass'} kind
 * @param {Readonly<Record<string, unknown>> | null} fence
 * @returns {string[]}
 */
function castingProblems(kind, fence) {
  const data = recordOf(fence?.data)
  const progression = data?.casterProgression
  if (progression === undefined || progression === null || progression === '') return []
  const known = CASTER_PROGRESSIONS.map(p => `"${p}"`).join(', ')
  if (typeof progression !== 'string') {
    return [`Caster progression ${String(progression)} must be in quotes, one of ${known}`]
  }
  if (!CASTER_PROGRESSIONS.includes(progression)) {
    return [`Caster progression "${progression}" is not one of ${known}, so it gives no spell slots`]
  }
  if (kind !== 'subclass') return []
  const casting = subclassCasting(fence)
  /** @type {string[]} */
  const out = []
  if (!casting?.list) out.push('A subclass that casts needs a spell list (spellList under data), or it learns from its own class\'s list')
  const ability = casting?.ability
  if (!ability || !ABILITIES.has(ability)) {
    out.push('A subclass that casts needs a spellcasting ability (spellcastingAbility under data): str, dex, con, int, wis or cha')
  }
  if (!Array.isArray(data?.preparedSpellsProgression) && !Array.isArray(data?.spellsKnownProgression)) {
    out.push('A subclass that casts needs preparedSpellsProgression, or the builder does not cap its spells')
  }
  return out
}

/**
 * What a rules note gets wrong without a sound: unknown skill keys, and effect
 * types that do not exist. Each entry is a sentence naming where it is. Empty
 * when there is nothing to say, which is every exported note
 * (`src/__verify__/realVault.test.ts`).
 *
 * @param {ProblemKind} kind
 * @param {unknown} fence the note's parsed fence, or null
 * @param {unknown} [frontmatter] the note's frontmatter, for a background's `skill_proficiencies`
 * @returns {string[]}
 */
export function noteProblems(kind, fence, frontmatter) {
  const f = recordOf(fence)
  /** @type {string[]} */
  const out = []
  switch (kind) {
    case 'class':
      out.push(...skillOptionProblems(recordOf(recordOf(f?.data)?.skillChoices)?.options, 'Skill choices'))
      out.push(...featureProblems(f?.features))
      out.push(...castingProblems('class', f))
      break
    case 'subclass':
      out.push(...featureProblems(f?.features))
      out.push(...castingProblems('subclass', f))
      break
    case 'feat':
      for (const raw of listOf(f?.benefits)) {
        const benefit = recordOf(raw)
        if (!benefit) continue
        const name = typeof benefit.name === 'string' && benefit.name ? `Benefit "${benefit.name}"` : 'A benefit'
        out.push(...effectListProblems(benefit.effects, name))
      }
      break
    case 'species':
      for (const raw of listOf(f?.traits)) {
        const trait = recordOf(raw)
        if (!trait) continue
        out.push(...effectListProblems(trait.effects, `Trait "${String(trait.name ?? trait.key ?? '')}"`))
      }
      // A version's effects are baked when it is chosen (MYDND-242).
      for (const raw of listOf(recordOf(f?.versions)?.options)) {
        const option = recordOf(raw)
        if (!option) continue
        out.push(...effectListProblems(option.effects, `Option "${String(option.name ?? '')}"`))
        out.push(...proficiencyProblems(option.proficiencies, `Option "${String(option.name ?? '')}"`))
      }
      // Skills, tools, languages and weapons (MYDND-243), the species' and each lineage's.
      out.push(...proficiencyProblems(f?.proficiencies, 'Proficiencies'))
      // A feat of the player's choice (MYDND-244), the species' and each lineage's.
      out.push(...speciesFeatProblems(f?.feat, 'Feat'))
      for (const raw of listOf(f?.subraces)) {
        const lineage = recordOf(raw)
        if (!lineage) continue
        out.push(...proficiencyProblems(lineage.proficiencies, `Lineage "${String(lineage.name ?? '')}"`))
        out.push(...speciesFeatProblems(lineage.feat, `Lineage "${String(lineage.name ?? '')}" feat`))
      }
      break
    case 'background': {
      // The bake reads no effects from a background, only this list, and
      // `backgroundSkills` folds it to slugs first: "Sleight of Hand" works
      // here (15 exported backgrounds spell it so), "Lockpicking" does not.
      const listed = listOf(recordOf(frontmatter)?.skill_proficiencies)
        .map(s => (typeof s === 'string' ? s.trim().toLowerCase().replace(/\s+/g, '_') : s))
      out.push(...skillOptionProblems(listed, 'Skill proficiencies'))
      break
    }
    case 'item':
    case 'magic-item':
      out.push(...effectListProblems(f?.effects, ''))
      break
  }
  return out
}
