import {
  RULE_FOLDER_KEYS,
  homebrewFolder,
  normaliseFolder,
  resolveRuleFolder,
  type NoteFoldersSettings,
} from '../../platform'
import { NOTE_KINDS, noteTemplate, templateDepths, type NoteKind, type TemplateDepth } from './noteTemplates'

/**
 * "Add homebrew templates" (MYDND-236): the twenty-one `src/compendium/templates/`
 * files, made into templates for Obsidian's core Templates plugin, and where
 * they may go. The write itself is `store/templates.ts`.
 *
 * - **The example's own name becomes `{{title}}`**, which core Templates fills
 *   with the new note's name: the `title:` key, the `# ` heading, an alias that
 *   is the name (or ends `: <name>`, as a subclass's `Fighter: Hearthguard`
 *   does), and the fence's `name:` and `short_name:`. Prose that mentions the
 *   name ("Hearthguards stand watch…") and other things' names (`class:
 *   "Fighter"`, a feature called "Lanternkeeper Subclass") are left: they are
 *   text to rewrite, not the identity of the note.
 * - **The folder must be outside every folder a catalog reads.** A template in
 *   the homebrew folder carries its kind's bare tag, so its catalog would list a
 *   row called `{{title}}`; the same in a rules folder or its subfolders.
 */

/** How each kind reads in a file name: `Homebrew magic item (full).md`. */
const KIND_LABEL: Readonly<Record<NoteKind, string>> = {
  class: 'class',
  subclass: 'subclass',
  spell: 'spell',
  feat: 'feat',
  species: 'species',
  background: 'background',
  item: 'item',
  'magic-item': 'magic item',
  monster: 'monster',
  condition: 'condition',
}

/** What core Templates replaces with the new note's name. */
export const TITLE_PLACEHOLDER = '{{title}}'

/** Where core Templates keeps its templates when its folder is not set. */
export const DEFAULT_TEMPLATES_FOLDER = 'Templates'

const TITLE_LINE = /^title: "(.*)"[ \t]*$/m

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The template with its example's own name replaced by `{{title}}`. Throws for
 * a file with no `title: "…"` line: every template has one, and a test pins it.
 */
export function asTemplate(text: string): string {
  const name = TITLE_LINE.exec(text)?.[1]
  if (!name) throw new Error('A template has no title line to replace.')
  const n = escape(name)
  return text
    .replace(new RegExp(`^(title|name|short_name): "${n}"([ \\t]*)$`, 'gm'), `$1: "${TITLE_PLACEHOLDER}"$2`)
    .replace(new RegExp(`^# ${n}([ \\t]*)$`, 'gm'), `# ${TITLE_PLACEHOLDER}$1`)
    .replace(new RegExp(`^([ \\t]*- "(?:[^"\\n]*: )?)${n}"([ \\t]*)$`, 'gm'), `$1${TITLE_PLACEHOLDER}"$2`)
}

/** `Homebrew subclass (minimal).md`. */
export const templateFileName = (kind: NoteKind, depth: TemplateDepth): string =>
  `Homebrew ${KIND_LABEL[kind]} (${depth}).md`

/** `inner` is `outer` or a folder under it. */
const within = (inner: string, outer: string) => outer !== '' && (inner === outer || inner.startsWith(`${outer}/`))

/**
 * Why `folder` cannot hold the templates, in a sentence for the dialog, or
 * `null` when it can. The folders refused are the ones a catalog reads: the
 * homebrew folder, and each rules folder where the settings put it *and* at the
 * top of the vault, which `rulesSource` falls back to.
 */
export function templateFolderProblem(folder: string, folders: NoteFoldersSettings): string | null {
  const target = normaliseFolder(folder)
  if (!target) return 'Name a folder: the templates are not written to the top of the vault.'

  const homebrew = homebrewFolder(folders)
  if (within(target, homebrew)) {
    return `"${target}" is inside your homebrew folder, "${homebrew}". Every catalog lists the notes there, so each template would show up as a row called ${TITLE_PLACEHOLDER}. Choose a folder outside it.`
  }
  for (const key of RULE_FOLDER_KEYS) {
    for (const rules of new Set([resolveRuleFolder(key, folders), key])) {
      if (within(target, rules)) {
        return `"${target}" is inside the rules folder "${rules}". Its catalog reads the notes there, so a template would show up as a row called ${TITLE_PLACEHOLDER}. Choose a folder outside it.`
      }
    }
  }
  return null
}

/** One template as it will be written. */
export interface TemplateFile {
  path: string
  text: string
}

/** All twenty-one, at their paths in `folder`. Call `templateFolderProblem` first. */
export function planHomebrewTemplates(folder: string): TemplateFile[] {
  const target = normaliseFolder(folder)
  return NOTE_KINDS.flatMap(kind =>
    templateDepths(kind).map(depth => ({ path: `${target}/${templateFileName(kind, depth)}`, text: asTemplate(noteTemplate(kind, depth)) })),
  )
}
