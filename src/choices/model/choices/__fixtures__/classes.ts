import type { ClassFence, ClassRow } from '../../../../compendium/model/classes'
import type { ClassContext } from '../types'
import { withClass, withLevel, type BuilderDraft } from '../../draft'

/**
 * The builder's choices (MYDND-29). As in `builder.test.ts`, the rules are
 * `@vault/derive`'s and tested in `the-vault`; these pin what the plugin adds —
 * which question each fence feature asks, whether it is answered, the id a
 * choice is saved under, and the draft operations multiclassing needs.
 *
 * The fences are trimmed from the real notes (`classes/warlock.md`,
 * `classes/cleric.md`, `classes/fighter.md`, `classes/rogue.md`): the shapes
 * are observed, the trimming is ours.
 */

export const row = (id: string, name: string): ClassRow => ({
  id,
  name,
  source: 'XPHB',
  path: `classes/${id}.md`,
  hitDie: null,
  primaryAbility: null,
  savingThrows: [],
  spellcastingAbility: null,
  edition: '5.5e',
  tags: [],
  aliases: [],
})

export const WARLOCK: ClassFence = {
  name: 'Warlock',
  source: 'XPHB',
  hit_die: 8,
  spellcasting_ability: 'cha',
  data: {
    saveProficiencies: ['wis', 'cha'],
    classTableGroups: [
      {
        colLabels: ['{@filter Invocations|optionalfeatures|feature type=ei}', 'Spell Slots'],
        rows: [[1, 1], [3, 2], [3, 2], [3, 2], [5, 2]],
      },
    ],
  },
  features: [
    {
      name: 'Eldritch Invocations',
      level: 1,
      choices: {
        type: 'invocations',
        options: [
          { name: 'Pact of the Blade' },
          { name: 'Agonizing Blast', minLevel: 2, repeatable: true },
          { name: 'Thirsting Blade', minLevel: 5, requires: 'Pact of the Blade' },
        ],
      },
    },
    { name: 'Magical Cunning', level: 2 },
    { name: 'Ability Score Improvement', level: 4, choices: { type: 'asi' } },
    { name: 'Mystic Arcanum', level: 11, choices: { type: 'spell_choice', spellLevels: [6] } },
  ],
}

export const CLERIC: ClassFence = {
  name: 'Cleric',
  source: 'XPHB',
  hit_die: 8,
  spellcasting_ability: 'wis',
  data: {},
  features: [
    { name: 'Divine Order', level: 1, choices: { type: 'feature_option' } },
    { name: 'Protector', level: 1, data: { optionOf: 'Divine Order' } },
    // An option that itself carries a question must still not list as a grant
    // of its own — it is answered by picking it, inside its parent.
    { name: 'Thaumaturge', level: 1, choices: { type: 'skill', count: 1 }, data: { optionOf: 'Divine Order' } },
  ],
}

export const FIGHTER: ClassFence = {
  name: 'Fighter',
  source: 'XPHB',
  hit_die: 10,
  data: {
    weaponMasteryProgression: [3, 3, 3, 4, 4],
    startingEquipment: {
      a: [{ item: 'Longsword' }, { item: "Artisan's Tools" }, { value: 4 }],
      b: [{ value: 155 }],
    },
  },
  features: [
    { name: 'Fighting Style', level: 1, choices: { type: 'fighting_style' } },
    { name: 'Weapon Mastery', level: 1 },
  ],
}

export const ROGUE: ClassFence = {
  name: 'Rogue',
  source: 'XPHB',
  hit_die: 8,
  data: { multiclassProficiencies: { skills: { count: 1, options: ['stealth', 'acrobatics'] } } },
  features: [{ name: 'Expertise', level: 1, choices: { type: 'expertise', count: 2 } }],
}

export const ctx = (index: number, id: string, fence: ClassFence): ClassContext => ({
  index,
  source: { row: row(id, fence.name), fence },
  subclassId: null,
  subclassFence: null,
})

export function pickClass(draft: BuilderDraft, index: number, id: string, fence: ClassFence, level: number): BuilderDraft {
  return withLevel(withClass(draft, { row: row(id, fence.name), fence }, index), level, fence, index)
}
