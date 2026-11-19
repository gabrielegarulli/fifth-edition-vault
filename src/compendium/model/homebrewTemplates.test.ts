import { describe, expect, it } from 'vitest'

import { DEFAULT_NOTE_FOLDERS, mergeNoteFolders } from '../../platform/model/folders'
import { TITLE_PLACEHOLDER, asTemplate, planHomebrewTemplates, templateFolderProblem, templateFileName } from './homebrewTemplates'
import { NOTE_KINDS, noteTemplate, type TemplateDepth } from './noteTemplates'

/**
 * "Add homebrew templates" (MYDND-236): the templates as core Templates will
 * use them, and the folders they may not go in. That one filled in lists and
 * opens under its new name is `noteTemplates.test.ts`'s, beside the fixture
 * vault this file does not import, so the public repository carries this one.
 */

const titleOf = (text: string) => /^title: "(.*)"$/m.exec(text)?.[1] ?? ''

/** The lines that say what the note is called, rather than mention it. */
const NAME_LINES = /^(?:title: |name: |short_name: |# |[ \t]*- ").*$/gm

const PAIRS = NOTE_KINDS.flatMap(kind => (['minimal', 'full'] as TemplateDepth[]).map(depth => [kind, depth] as const))

describe.each(PAIRS)('the %s template (%s), as a template', (kind, depth) => {
  const original = noteTemplate(kind, depth)
  const name = titleOf(original)
  const template = asTemplate(original)

  it('is titled {{title}}, and names its example nowhere a name goes', () => {
    expect(titleOf(template)).toBe(TITLE_PLACEHOLDER)
    const named = (template.match(NAME_LINES) ?? []).filter(line => line.endsWith(name) || line.endsWith(`${name}"`))
    expect(named).toEqual([])
  })

  it('changes nothing but the name', () => {
    expect(template.split(TITLE_PLACEHOLDER).join(name)).toBe(original)
  })
})

describe('asTemplate', () => {
  it('turns the subclass alias that ends in its name, and leaves its class alone', () => {
    const template = asTemplate(noteTemplate('subclass', 'full'))
    expect(template).toContain(`  - "Fighter: ${TITLE_PLACEHOLDER}"`)
    expect(template).toContain('class: "Fighter"')
    expect(template).toContain(`short_name: "${TITLE_PLACEHOLDER}"`)
  })

  it("leaves another thing's name that only starts with it", () => {
    expect(asTemplate(noteTemplate('class', 'full'))).toContain('- name: "Lanternkeeper Subclass"')
  })

  it('refuses a file with no title line', () => {
    expect(() => asTemplate('---\nsource: "Homebrew"\n---\n')).toThrow(/no title/)
  })
})

describe('planHomebrewTemplates', () => {
  it('is all twenty-one, each at its own name in the folder', () => {
    const plan = planHomebrewTemplates('/GM\\Templates/')
    expect(plan).toHaveLength(21)
    expect(new Set(plan.map(f => f.path)).size).toBe(21)
    expect(plan.every(f => f.path.startsWith('GM/Templates/Homebrew '))).toBe(true)
    expect(plan.map(f => f.path)).toContain(`GM/Templates/${templateFileName('magic-item', 'full')}`)
    expect(templateFileName('magic-item', 'full')).toBe('Homebrew magic item (full).md')
  })

  it('carries no stamp, so no note made from one claims to be exported', () => {
    for (const f of planHomebrewTemplates('Templates')) expect(f.text).not.toContain('export_hash')
  })
})

describe('templateFolderProblem', () => {
  const folders = mergeNoteFolders({ rulesRoot: 'Rules', overrides: { spells: 'Magic/Spells' }, homebrew: 'GM/Homebrew' })

  it.each(['Templates', 'GM/Templates', 'GM/HomebrewTemplates', 'Rules', 'Rules/Templates', 'Magic', 'spellbook'])(
    'accepts %s',
    folder => {
      expect(templateFolderProblem(folder, folders)).toBeNull()
    },
  )

  it('refuses the top of the vault', () => {
    expect(templateFolderProblem(' / ', folders)).toMatch(/Name a folder/)
  })

  it.each(['GM/Homebrew', 'GM/Homebrew/Templates', '/GM\\Homebrew/x/'])('refuses %s, in the homebrew folder', folder => {
    expect(templateFolderProblem(folder, folders)).toMatch(/inside your homebrew folder, "GM\/Homebrew".*row called \{\{title\}\}/)
  })

  it.each([
    ['Rules/feats/Templates', 'Rules/feats'],
    ['Magic/Spells', 'Magic/Spells'],
    // `rulesSource` falls back to the top-level folder, so it is read too.
    ['classes/Templates', 'classes'],
    ['variant-rules', 'variant-rules'],
  ])('refuses %s, in the rules folder %s', (folder, rules) => {
    expect(templateFolderProblem(folder, folders)).toContain(`inside the rules folder "${rules}"`)
  })

  it('refuses the default homebrew folder when none is set', () => {
    expect(templateFolderProblem('Homebrew/Templates', DEFAULT_NOTE_FOLDERS)).toMatch(/homebrew folder, "Homebrew"/)
  })
})
