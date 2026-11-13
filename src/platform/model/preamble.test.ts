import { describe, expect, it } from 'vitest'

import { stripPreamble } from './preamble'

describe('stripPreamble', () => {
  // Verbatim from `lore/spells/fireball.md`, which is the shape 1785 notes share.
  it('removes the heading, the summary line and the property list', () => {
    const prose = [
      '# Fireball',
      '*Level 3 Evocation (Sorcerer, Wizard) | Source: XPHB (5.5e)*',
      '',
      '- **Casting Time:** 1 action',
      '- **Range:** 150 feet',
      '- **Components:** V, S, M (a ball of bat guano and sulfur)',
      '- **Duration:** Instantaneous',
      '- **Classes:** Sorcerer, Wizard',
      '',
      'A bright streak flashes from you to a point you choose within range.',
      '',
      'Flammable objects in the area start burning.',
    ].join('\n')

    expect(stripPreamble(prose)).toBe(
      'A bright streak flashes from you to a point you choose within range.\n\nFlammable objects in the area start burning.',
    )
  })

  // `lore/classes/bard.md`: the first real paragraph is bold-led, and bold is
  // not what the property rule keys on.
  it('keeps a bold-led paragraph that is prose, not a property', () => {
    const prose = ['# Bard', '*Hit Die: d8 | Source: XPHB (5.5e)*', '', '**Bard.** Invoking magic through music.'].join('\n')
    expect(stripPreamble(prose)).toBe('**Bard.** Invoking magic through music.')
  })

  /**
   * The rule that earns the colon-inside-the-bold test. A feat's benefits are
   * written `- **Name.** text` — a full stop — and stripping them would delete
   * the entire feat.
   */
  it('keeps a bullet list whose bold ends in a full stop', () => {
    const prose = [
      '# Chef',
      '',
      '- **Ability Score Increase.** Increase your Constitution or Wisdom by 1.',
      "- **Cook's Utensils.** You gain proficiency with Cook's Utensils.",
    ].join('\n')
    expect(stripPreamble(prose)).toBe(
      "- **Ability Score Increase.** Increase your Constitution or Wisdom by 1.\n- **Cook's Utensils.** You gain proficiency with Cook's Utensils.",
    )
  })

  it('stops at the first prose line, leaving later property-shaped lines alone', () => {
    const prose = ['# Thing', '', 'Opening prose.', '', '- **Note:** this one stays.'].join('\n')
    expect(stripPreamble(prose)).toBe('Opening prose.\n\n- **Note:** this one stays.')
  })

  it('leaves a heading that is not an H1', () => {
    expect(stripPreamble('## Archetype Features\n\nText.')).toBe('## Archetype Features\n\nText.')
  })

  it('removes a heading with no summary line after it', () => {
    expect(stripPreamble('# Bleeding\n\n> A condition.')).toBe('> A condition.')
  })

  it('keeps an italic line that is not directly under the heading', () => {
    const prose = ['# Thing', '', 'Prose.', '', '*An aside.*'].join('\n')
    expect(stripPreamble(prose)).toBe('Prose.\n\n*An aside.*')
  })

  // Italic-wholly means the whole line. A sentence that merely *contains*
  // emphasis is prose, and the subclass notes open several sections that way.
  it('keeps a line that only contains emphasis', () => {
    const prose = ['# Thing', 'Study of *delicate* alchemy.'].join('\n')
    expect(stripPreamble(prose)).toBe('Study of *delicate* alchemy.')
  })

  /**
   * MYDND-32's `export:items` puts the art between the heading and the summary
   * line. The detail pane draws that art from frontmatter, so the embed is
   * preamble too — and before this rule it *ended* the preamble, leaving both
   * the picture and the summary line in the prose of 723 magic items.
   */
  it('removes the art embed the exporter writes under the heading', () => {
    const prose = [
      '# Abyssal Bane',
      '',
      '![[magic-items/images/abyssal-bane.webp|200]]',
      '',
      '*Generic Variant, varies | Source: LALoTT*',
      '',
      'You gain a bonus to attack and damage rolls.',
    ].join('\n')
    expect(stripPreamble(prose)).toBe('You gain a bonus to attack and damage rolls.')
  })

  // Only directly under the heading. An embed further down is the note's own
  // content — a map, a handout — and must survive.
  it('keeps an embed that is not directly under the heading', () => {
    const prose = ['# Thing', '', 'Prose.', '', '![[maps/cave.webp]]'].join('\n')
    expect(stripPreamble(prose)).toBe('Prose.\n\n![[maps/cave.webp]]')
  })

  it('returns an empty string for a body that is nothing but preamble', () => {
    expect(stripPreamble('# Mystery Feat\n')).toBe('')
  })

  // `bestiary/*.md` is all fence and no prose, so `proseOf` hands this in 335
  // times and it must not throw.
  it('handles an empty body', () => {
    expect(stripPreamble('')).toBe('')
  })
})
