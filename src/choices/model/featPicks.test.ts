import { describe, expect, it } from 'vitest'

import { heldFeatEffects } from '../../characterModel/model/vaultCharacter/bake'
import { choicePicks, featContext, itemComplete, type LevelItem } from './choices'
import { blankDraft, type BuilderDraft } from './draft'

/**
 * The picks of a feat taken at an Ability Score Improvement or as a Fighting
 * Style (MYDND-182): what the bake makes of them, when the builder calls them
 * answered, and what the sheet's feature list says. The specs themselves are
 * `@vault/derive`'s (VAULT-263) and tested there.
 */

const feat = (id: string, name: string) => ({ id, name, data: {} })
const FEATS = [feat('fey-touched', 'Fey Touched'), feat('keen-mind', 'Keen Mind'), feat('elemental-adept', 'Elemental Adept')]
const pick = (spellName: string) => ({ spellId: spellName.toLowerCase(), spellName })

describe('the bake', () => {
  it("grants Fey Touched's spells off the ability its +1 went to, each with its own free cast", () => {
    const answer = { type: 'feat', featId: 'fey-touched', abilityBonus: 'cha', choices: { spells: [pick('Command')] } }
    const effects = heldFeatEffects({ 'fighter:4:asi': answer }, FEATS)
    expect(effects.filter(e => e.type === 'spell_grant').map(e => [e.spell, e.ability])).toEqual([
      ['Misty Step', 'cha'],
      ['Command', 'cha'],
    ])
    const keys = effects.filter(e => e.type === 'feature_resource').map(e => e.key)
    expect(keys).toEqual([
      'feat:fey-touched:fey_magic:fighter:4:asi:misty-step',
      'feat:fey-touched:fey_magic:fighter:4:asi:command',
    ])
  })

  it('makes Keen Mind Expertise in a skill held elsewhere, and proficiency otherwise', () => {
    const answer = { type: 'feat', featId: 'keen-mind', choices: { skills: ['history'] } }
    expect(heldFeatEffects({ a: answer }, FEATS).map(e => e.type)).toEqual(['skill_proficiency'])
    expect(heldFeatEffects({ a: answer }, FEATS, { skillProficiencies: ['history'] }).map(e => e.type)).toEqual(['expertise'])
  })
})

describe('when the builder calls a feat answered', () => {
  const draftAt = (level: number, answer: unknown): BuilderDraft => ({
    ...blankDraft(),
    classes: [{ id: 'wizard', name: 'Wizard', source: 'XPHB', level, subclass: null, spellcastingAbility: 'int' }],
    featureChoices: { 'wizard:4:asi': answer },
  })
  const asi: LevelItem = {
    classIndex: 0,
    className: 'Wizard',
    level: 4,
    isSubclass: false,
    feature: { id: 'wizard:4:asi', name: 'Ability Score Improvement', level: 4, description: null, choices: { type: 'asi' }, data: {} },
    kind: 'asi',
    options: [],
  }
  const opts = { feats: [], masteryCount: 0, invocationCount: 0 }
  const ritual = (n: number) => ({
    type: 'feat',
    featId: 'ritual-caster',
    featName: 'Ritual Caster',
    choices: { spells: ['Alarm', 'Detect Magic', 'Find Familiar'].slice(0, n).map(pick) },
  })

  it('counts Ritual Caster by the Proficiency Bonus, so a level that raises it re-opens the feat', () => {
    expect(featContext(draftAt(4, null))).toEqual({ proficiencyBonus: 2 })
    expect(itemComplete(asi, draftAt(4, ritual(2)), opts)).toBe(true)
    expect(itemComplete(asi, draftAt(5, ritual(2)), opts)).toBe(false)
    expect(itemComplete(asi, draftAt(5, ritual(3)), opts)).toBe(true)
    // Judged at a level up's new level.
    expect(itemComplete(asi, draftAt(4, ritual(2)), { ...opts, classLevel: 5 })).toBe(false)
  })

  it('leaves a Fighting Style that asks cantrips open until they are chosen', () => {
    const style: LevelItem = { ...asi, className: 'Paladin', level: 2, kind: 'fighting_style' }
    const blessed = (cantrips: unknown[]) => ({
      type: 'feat',
      featId: 'blessed-warrior',
      featName: 'Blessed Warrior',
      choices: { spellList: 'Cleric', ability: 'cha', cantrips, spells: [] },
    })
    expect(itemComplete(style, draftAt(2, blessed([pick('Guidance'), null])), opts)).toBe(false)
    expect(itemComplete(style, draftAt(2, blessed([pick('Guidance'), pick('Sacred Flame')])), opts)).toBe(true)
    // A style that asks nothing is answered by being picked.
    expect(itemComplete(style, draftAt(2, { type: 'feat', featId: 'defense', featName: 'Defense' }), opts)).toBe(true)
  })
})

describe("the sheet's feature list", () => {
  it('names what a feat was taken for', () => {
    expect(choicePicks({ type: 'feat', featName: 'Elemental Adept', choices: { damageType: 'fire' } })).toEqual(['Elemental Adept (Fire)'])
    expect(choicePicks({ type: 'feat', featName: 'Fey Touched', choices: { spells: [pick('Command')] } })).toEqual(['Fey Touched (Command)'])
    expect(choicePicks({ type: 'feat', featName: 'Tough' })).toEqual(['Tough'])
  })
})
