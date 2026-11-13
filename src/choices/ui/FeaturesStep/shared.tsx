import { ABILITY_FULL } from '@vault/derive/speciesChoices.js'

import type { LevelItem } from '../../model/choices'
import { Markdown } from '../../../platform/host'

// What several pickers use: the ability names, a note's text, a choice's options.
// One file of the Features step (MYDND-197); index.ts says what the step is.

export const ABILITY = ABILITY_FULL as Record<string, string>

export function Prose({ text }: { text: string }) {
  return <p className="bst-note bst-note--pre">{text}</p>
}

/** Text out of a note, which is markdown: an option's `#### Repeatable` is a heading. */
export function NoteText({ text }: { text: string }) {
  return <Markdown markdown={text} sourcePath="" className="bst-entry-desc" />
}

export interface NamedOption {
  name: string
  description?: string
  minLevel?: number
  requires?: string
  repeatable?: boolean
  cost?: number
}

export const optionsOf = (item: LevelItem): NamedOption[] => {
  const raw = item.feature.choices?.options
  return Array.isArray(raw) ? (raw as NamedOption[]).filter(o => typeof o?.name === 'string') : []
}
