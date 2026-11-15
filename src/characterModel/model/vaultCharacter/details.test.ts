import { describe, expect, it } from 'vitest'

import { parseNote } from '../../../platform'
import { DETAILS_BEGIN, readCharacterDetails, writeCharacterDetails } from './details'

const NOTE = `---
name: "Brakka"
vc_ddb_id: "local:brakka"
---

<!-- vault-characters:begin — managed, replaced on re-sync -->
\`\`\`charsheet
name: Brakka
\`\`\`
<!-- vault-characters:end -->

## Notes

\`\`\`vault-character
name: Brakka
\`\`\`
`

describe('a character’s details (MYDND-216)', () => {
  it('writes the short ones as flat frontmatter and the long ones as headings after the charsheet', () => {
    const text = writeCharacterDetails(NOTE, { alignment: 'Lawful Good', age: '112', backstory: 'Raised in the hold.', bonds: 'My clan.' })
    const { frontmatter, body } = parseNote(text)
    expect(frontmatter).toMatchObject({ name: 'Brakka', alignment: 'Lawful Good', age: '112' })
    // Right after the managed region, ahead of the player's own Notes.
    expect(body.indexOf(DETAILS_BEGIN)).toBeGreaterThan(body.indexOf('vault-characters:end'))
    expect(body.indexOf(DETAILS_BEGIN)).toBeLessThan(body.indexOf('## Notes'))
    // In the book's order, not the order given.
    expect(body.indexOf('## Bonds')).toBeLessThan(body.indexOf('## Backstory'))
    expect(text).toContain('```vault-character')
  })

  it('reads back exactly what it wrote', () => {
    const details = { faith: 'Moradin', personalityTraits: 'Blunt.\n\nLoyal to a fault.', other: 'Owes the tavern 3 gp.' }
    expect(readCharacterDetails(writeCharacterDetails(NOTE, details))).toEqual(details)
  })

  it('never swallows a fence appended after the details', () => {
    // The inventory and vitals fences are appended at the end of the note.
    const once = writeCharacterDetails(NOTE, { other: 'A last word.' })
    const withFence = `${once}\n\`\`\`vault-inventory\nitems: []\n\`\`\`\n`
    expect(readCharacterDetails(withFence).other).toBe('A last word.')
    const again = writeCharacterDetails(withFence, { other: 'Changed.' })
    expect(again).toContain('```vault-inventory')
    expect(readCharacterDetails(again).other).toBe('Changed.')
  })

  it('replaces the region rather than adding a second, and removes what is cleared', () => {
    const once = writeCharacterDetails(NOTE, { hair: 'Red', backstory: 'First.' })
    const twice = writeCharacterDetails(once, { backstory: 'Second.' })
    expect(twice.split(DETAILS_BEGIN)).toHaveLength(2)
    expect(parseNote(twice).frontmatter.hair).toBeUndefined()
    expect(readCharacterDetails(twice)).toEqual({ backstory: 'Second.' })
    const none = writeCharacterDetails(twice, {})
    expect(none).not.toContain(DETAILS_BEGIN)
    expect(none).toContain('## Notes')
  })

  it('keeps a hand edit inside the region, read back as the new text', () => {
    const once = writeCharacterDetails(NOTE, { ideals: 'Honour.' })
    const edited = once.replace('Honour.', 'Honour, above all.')
    expect(readCharacterDetails(edited).ideals).toBe('Honour, above all.')
  })

  it('refuses frontmatter it cannot read, as every writer does', () => {
    expect(() => writeCharacterDetails('---\nname: [unclosed\n---\nbody', { age: '3' })).toThrow()
  })
})
