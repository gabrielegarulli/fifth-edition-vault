import { describe, expect, it } from 'vitest'

import { buildNote } from './emit'
import { emptyForm, type BuilderForm } from './forms'
import { BUILDER_KINDS, type BuilderKind } from './kinds'
import { descriptionOf, loadNote } from './parse'
import { FULL } from './__fixtures__/forms'

/**
 * Edit (MYDND-272): a saved homebrew note back into its form, and the refusal
 * of anything a save would lose. The round trip is the contract: emit → read
 * → form → emit gives the same bytes, for every kind, full and minimal.
 */

/** The kind's form with only a name: every optional field left empty. */
const minimal = (kind: BuilderKind): BuilderForm => {
  const form = emptyForm(kind, 'Homebrew')
  form.name = 'Plain Thing'
  if (form.kind === 'feat') form.benefits = [{ name: 'Only', text: '', effects: [] }]
  return form
}

async function roundTrip(form: BuilderForm) {
  const built = buildNote(form)
  const loaded = await loadNote(form.kind, `Homebrew/Somewhere/${built.fileName}`, built.text)
  return { built, loaded }
}

describe.each(BUILDER_KINDS)('the %s note, opened in its builder', kind => {
  it('fills the form as it was saved, and re-emits the same bytes (full form)', async () => {
    const { built, loaded } = await roundTrip(FULL[kind]())
    expect(loaded).toEqual({ ok: true, form: expect.anything() })
    if (!loaded.ok) return
    expect(loaded.form).toEqual(FULL[kind]())
    expect(buildNote(loaded.form).text).toBe(built.text)
  })

  it('round-trips a minimal form too: an empty field stays empty', async () => {
    const { built, loaded } = await roundTrip(minimal(kind))
    expect(loaded.ok ? buildNote(loaded.form).text : loaded.reasons).toBe(built.text)
  })

  it('is not fooled by Obsidian rewriting the frontmatter: CRLF, reordered keys, single quotes', async () => {
    const { built } = await roundTrip(FULL[kind]())
    const [, fm, body] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(built.text)!
    const lines = fm.split('\n')
    // The title moved last and re-quoted, as a Properties edit can leave it.
    const title = lines.findIndex(l => l.startsWith('title:'))
    const [titleLine] = lines.splice(title, 1)
    lines.push(titleLine.replace(/^title: "(.*)"$/, "title: '$1'"))
    const rewritten = `---\n${lines.join('\n')}\n---\n${body}`.replace(/\n/g, '\r\n')
    const loaded = await loadNote(kind, `Homebrew/Somewhere/${built.fileName}`, rewritten)
    expect(loaded.ok ? 'ok' : loaded.reasons).toBe('ok')
  })
})

describe('Edit refuses a note a save would change, and says what', () => {
  const spell = () => buildNote(FULL.spell())
  const at = (text: string) => loadNote('spell', 'Homebrew/Spells/ember-ward.md', text)
  const reasons = async (text: string) => {
    const loaded = await at(text)
    return loaded.ok ? [] : loaded.reasons
  }

  it('an extra property the form has no field for', async () => {
    const text = spell().text.replace('level: 1\n', 'level: 1\nmy_note: "keep me"\n')
    expect(await reasons(text)).toEqual(['The property "my_note" has no field in the form, so a save would drop it.'])
  })

  it('a property the form would write differently', async () => {
    const text = spell().text.replace('concentration: true', 'concentration: "yes"')
    expect(await reasons(text)).toEqual(['The property "concentration" is "yes" in the note; the form would write false.'])
  })

  it('prose the form cannot place: a second heading', async () => {
    const text = spell().text.replace(/\n$/, '\n\n## At Higher Levels\n\nMore embers.\n')
    expect(await reasons(text)).toEqual([])
    // A heading after the description is the description's: the form holds it.
    const added = spell().text.replace('# Ember Ward', '# Ember Ward\n\n> A quote above the facts')
    expect((await reasons(added)).join(' ')).toMatch(/text has something the form cannot place/)
  })

  it('a code block of the GM’s own', async () => {
    const text = spell().text.replace(/\n$/, '\n\n```dataview\nLIST\n```\n')
    expect((await reasons(text)).join(' ')).toMatch(/code block the form does not write/)
  })

  it('a fence the effect editor cannot hold', async () => {
    const text = buildNote(FULL['magic-item']()).text.replace('type: "ac_bonus"', 'type: "advantage"')
    const loaded = await loadNote('magic-item', 'Homebrew/Magic Items/cloak-of-kindled-embers.md', text)
    expect(loaded.ok ? [] : loaded.reasons.join(' ')).toMatch(/block holds something the form cannot/)
  })

  it('an exported note, for good', async () => {
    const text = spell().text.replace('level: 1\n', 'level: 1\nexport_hash: "abc"\n')
    expect((await reasons(text)).join(' ')).toMatch(/written by the exporter/)
  })

  it('a file whose name is not its title’s', async () => {
    const loaded = await loadNote('spell', 'Homebrew/Spells/old-name.md', spell().text)
    expect(loaded.ok ? [] : loaded.reasons.join(' ')).toMatch(/named old-name\.md, but its title "Ember Ward" saves as ember-ward\.md/)
  })

  it('frontmatter that does not parse', async () => {
    expect((await reasons('---\ntitle: [unclosed\n---\n# X\n')).join(' ')).toMatch(/not valid YAML/)
  })

  it('a note its catalog does not list as this kind', async () => {
    const loaded = await loadNote('feat', 'Homebrew/Spells/ember-ward.md', spell().text)
    expect(loaded.ok ? [] : loaded.reasons.join(' ')).toMatch(/feats catalog does not read this note as a feat/)
  })
})

describe('descriptionOf', () => {
  it('drops the heading and the facts line, keeps the rest as written', () => {
    expect(descriptionOf('# Name\n\n*Level 1 Evocation*\n\nFirst.\n\n**Bold.** Second.')).toBe('First.\n\n**Bold.** Second.')
    expect(descriptionOf('# Name')).toBe('')
  })
})
