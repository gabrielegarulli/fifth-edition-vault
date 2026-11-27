// The builder's Background step: what the background grants, then the optional character details (MYDND-216).

import { useId, useState } from 'react'
import { backgroundBonusMode, backgroundBonusOptions, withBackgroundSelected } from '@vault/derive/builderDraft.js'
import { ABILITY_FULL } from '@vault/derive/speciesChoices.js'
import { toolName } from '@vault/derive/tools.js'
import { blankChoices, originFeatSpec } from '@vault/derive/originFeatChoices.js'

import {
  LANGUAGE_PICKS,
  ORIGIN_FEAT_OWNER,
  SKILL_NAME,
  STANDARD_LANGUAGES,
  TOOL_CHOICE_LABEL,
  spellListsTaken,
  toolPicksIn,
  classPickedTools,
  classTools,
  doubledTools,
  replacementToolOptions,
  withToolReplacement,
  toolSlugsOf,
  withLanguagePick,
  withToolPick,
  ABILITY_KEYS,
  withBackgroundEquipmentOption,
  withBackgroundToolsSynced,
  withBackgroundBonus,
  withBackgroundBonusMode,
  type BuilderDraft,
  type EquipmentOption,
  type OpenChoice,
} from '../../choices'
import { booksInPlay, shelvesBySource, type FeatRow, type BackgroundRow, type SpellRow } from '../../compendium'
import { LONG_DETAILS, SHORT_DETAILS, type CharacterDetails, type DetailKey } from '../../characterModel'
import type { CatalogRow } from '../../platform'
import {
  Message,
  NoteProblems,
  OptionSelect,
  withCurrent,
  type SetDraft,
  OriginFeatChoices,
  FeatPreview,
  TraitsPreview,
} from '../../choices/host'
import { useCompendium } from '../../compendium/host'
import { useSourcesOff } from '../../platform/host'
import { sourceLabel } from '../../compendium'
import { Chevron } from './ShelfList'

/**
 * The Background step, modelled on D&D Beyond's (MYDND-216): a select grouped
 * by book, then a card with what the background grants — its ability increase,
 * its Origin feat and that feat's own questions, its skills and tool, the
 * languages — and under it four optional sections of character details.
 *
 * Every open question shows its warning beside the control that answers it.
 * A missing background is a warning too, never an error: a character saves
 * without one. The details are never a gate either; they are written to the
 * note itself, not the fence (`characterModel/.../details.ts`).
 */
export function BackgroundStep({
  draft,
  setDraft,
  rows,
  background,
  originFeats,
  originFeatRow,
  pickOriginFeat,
  spellsFor,
  open,
  kitOption = null,
  classFences = [],
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  rows: readonly BackgroundRow[]
  background: BackgroundRow | null
  originFeats: readonly CatalogRow[]
  /** The picked origin feat's row. Not always in `originFeats`: a background names its own. */
  originFeatRow: FeatRow | null
  pickOriginFeat: (name: string | null) => CatalogRow | null
  spellsFor: (className: string) => SpellRow[]
  /** This step's open questions, each placed beside its control. */
  open: readonly OpenChoice[]
  /** The background kit option picked on the Equipment step, if any: its tool lines follow the picks here. */
  kitOption?: EquipmentOption | null
  /** Every class's fence, by `draft.classes` index: what a doubled tool is found against (MYDND-275). */
  classFences?: ReadonlyArray<{ data?: unknown } | null>
}) {
  const compendium = useCompendium()
  // The campaign's books turned off (MYDND-219); the background already chosen stays listed.
  const sourcesOff = useSourcesOff()
  const selectId = useId()
  // A background whose abilities the exporter could not name is unconstrained
  // rather than impossible — the same choice `backgroundAbilities.js` made in
  // the web app: offering too much is recoverable, offering nothing is a dead end.
  const eligible = (bg: BackgroundRow | null): string[] => (bg && bg.abilities.length > 0 ? bg.abilities : [...ABILITY_KEYS])
  const allowed = eligible(background)
  const mode = backgroundBonusMode(draft)
  const bonuses = draft.backgroundBonuses ?? {}
  const openText = (text: string) => open.some(o => o.text === text)
  // Proficiency Overlap (MYDND-275): a background tool the class grants too is
  // owed a replacement, which may be any tool not already held.
  const doubled = doubledTools(draft, classFences, background)
  const heldTools = new Set([
    ...classTools(draft, classFences),
    // And a class's tool picks (MYDND-280).
    ...classPickedTools(draft, classFences),
    ...(background?.tools ?? []),
    ...(draft.backgroundTools ?? []),
    ...(draft.toolReplacements ?? []),
  ])

  const setOriginFeat = (feat: CatalogRow | null, namedAs: string | null = null) =>
    setDraft(d => ({
      ...d,
      // A blank `choices` rather than the previous feat's — the sub-questions
      // differ per feat, so carrying them over would attach Magic Initiate's
      // cantrips to Crafter.
      originFeat: feat ? { id: feat.id, name: feat.name, source: feat.source, choices: originChoices(feat.name, namedAs) } : null,
    }))

  const pick = (row: BackgroundRow | null) => {
    setDraft(d => {
      const next = { ...withBackgroundSelected(d, row, eligible(row)), backgroundTools: [] }
      return row?.id === d.background?.id ? next : withBackgroundEquipmentOption(next, null)
    })
    // The background names its origin feat; it is preselected, and the
    // picker stays free because the 2024 rules let a table swap it.
    setOriginFeat(pickOriginFeat(row?.originFeat ?? null), row?.originFeat ?? null)
  }

  const featChoicesOpen = draft.originFeat ? openText(`${draft.originFeat.name} choices`) : false

  return (
    <>
      <h3 className="bst-cb-h1">Choose a background</h3>
      <p className="bst-cb-lede">Your background sets your ability increases, an Origin feat, two skills and a tool.</p>
      <div>
        <label className="bst-cb-label" htmlFor={selectId}>
          Background
        </label>
        <select
          id={selectId}
          className="bst-select"
          value={draft.background?.id ?? ''}
          aria-invalid={!draft.background || undefined}
          onChange={e => pick(rows.find(r => r.id === e.target.value) ?? null)}
        >
          <option value="">{rows.length === 0 ? 'No backgrounds exported' : '— Choose a background —'}</option>
          {shelvesBySource(booksInPlay(rows, sourcesOff, [draft.background?.id])).map(shelf => (
            <optgroup key={shelf.id} label={shelf.label}>
              {shelf.rows.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {!draft.background ? <Message kind="warning">Choose a background. A character saves without one.</Message> : null}
      </div>

      {background ? (
        <section aria-label={background.name} className="bst-cb-card bst-cb-kvcard">
          <div>
            <h4 className="bst-cb-card-title">{background.name}</h4>
            <p className="bst-cb-card-sub">{background.source ? sourceLabel(background.source) : 'No book named'}</p>
          </div>

          <NoteProblems kind="background" fence={null} frontmatter={{ skill_proficiencies: background.skillProficiencies }} />

          <div className="bst-cb-kv">
            <p className="bst-cb-kv-k">Ability scores · {allowed.map(k => ABILITY_FULL[k] ?? k).join(', ')}</p>
            <div role="group" aria-label="How to split the increase" className="bst-cb-seg">
              {(['two_one', 'three_ones'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  className="bst-plain bst-cb-seg-btn"
                  onClick={() => setDraft(d => withBackgroundBonusMode(d, m, allowed))}
                >
                  {m === 'two_one' ? '+2 and +1' : '+1 to all three'}
                </button>
              ))}
            </div>
            {mode === 'three_ones' ? (
              <p className="bst-cb-note">{allowed.map(k => `${ABILITY_FULL[k] ?? k} +1`).join(' · ')}</p>
            ) : (
              <div className="bst-cb-grid2">
                {(['primary', 'secondary'] as const).map(slot => {
                  const other = slot === 'primary' ? 'secondary' : 'primary'
                  return (
                    <div key={slot}>
                      <OptionSelect
                        label={slot === 'primary' ? '+2 to' : '+1 to'}
                        value={bonuses[slot] ?? ''}
                        placeholder="— Choose"
                        options={backgroundBonusOptions(draft, slot, allowed).map(k => ({
                          value: k,
                          label: ABILITY_FULL[k] ?? k,
                          disabled: bonuses[other] === k,
                        }))}
                        onChange={v => setDraft(d => withBackgroundBonus(d, slot, v))}
                      />
                      {!bonuses[slot] ? <Message kind="warning">Still to choose</Message> : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bst-cb-kv">
            <p className="bst-cb-kv-k">Origin feat</p>
            <OptionSelect
              label="Origin feat"
              value={draft.originFeat?.id ?? ''}
              placeholder={originFeats.length === 0 ? 'No origin feats exported' : 'None'}
              options={withCurrent(originFeats, draft.originFeat).map(f => ({ value: f.id, label: f.name }))}
              onChange={v => setOriginFeat(originFeats.find(f => f.id === v) ?? null)}
            />
            <FeatPreview feat={originFeatRow} />
            {background.originFeat && draft.originFeat === null ? (
              <p className="bst-cb-note">
                {background.name} names {background.originFeat}, but no feat note answers to that name.
              </p>
            ) : null}
            <OriginFeatChoices
              feat={draft.originFeat}
              spellsFor={spellsFor}
              takenLists={spellListsTaken(draft, ORIGIN_FEAT_OWNER)}
              onChange={choices => setDraft(d => (d.originFeat ? { ...d, originFeat: { ...d.originFeat, choices } } : d))}
            />
            {featChoicesOpen ? <Message kind="warning">{draft.originFeat?.name} still has a choice to make.</Message> : null}
          </div>

          {background.skillProficiencies.length > 0 ? (
            <div className="bst-cb-kv">
              <p className="bst-cb-kv-k">Skills</p>
              <div className="bst-cb-tags">
                {background.skillProficiencies.map(s => (
                  <span key={s} className="bst-cb-tag">
                    {SKILL_NAME[s] ?? s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {(background.tools ?? []).length > 0 || (background.toolChoices ?? []).length > 0 ? (
            <div className="bst-cb-kv">
              <p className="bst-cb-kv-k">Tool</p>
              {(background.tools ?? []).length > 0 ? (
                <div className="bst-cb-tags">
                  {(background.tools ?? []).map(t => (
                    <span key={t} className="bst-cb-tag">
                      {toolName(t)}
                    </span>
                  ))}
                </div>
              ) : null}
              {(background.toolChoices ?? []).flatMap(({ category, count }) => {
                const picks = toolPicksIn(draft, category)
                return Array.from({ length: count }, (_, slot) => (
                  <div key={`${category}-${slot}`}>
                    <OptionSelect
                      label={count > 1 ? `${TOOL_CHOICE_LABEL[category]} ${slot + 1}` : TOOL_CHOICE_LABEL[category]}
                      value={picks[slot] ?? ''}
                      placeholder="— Choose one"
                      options={toolSlugsOf(category).map(slug => ({
                        value: slug,
                        label: toolName(slug),
                        disabled: slug !== picks[slot] && picks.includes(slug),
                      }))}
                      onChange={v => setDraft(d => withBackgroundToolsSynced(d, withToolPick(d, category, slot, v), kitOption))}
                    />
                    {!picks[slot] ? <Message kind="warning">Still to choose</Message> : null}
                  </div>
                ))
              })}
              {doubled.map((slug, slot) => {
                const current = draft.toolReplacements?.[slot] ?? ''
                return (
                  <div key={`doubled-${slug}`}>
                    <OptionSelect
                      label={`In place of the second ${toolName(slug)}`}
                      value={current}
                      placeholder="— Choose a tool"
                      options={replacementToolOptions(heldTools, current || null)}
                      onChange={v => setDraft(d => withToolReplacement(d, slot, v))}
                    />
                    <p className="bst-cb-note">Your class gives {toolName(slug)} too, so you choose another tool instead.</p>
                    {!current ? <Message kind="warning">Still to choose</Message> : null}
                  </div>
                )
              })}
            </div>
          ) : null}

          <fieldset className="bst-cb-kv bst-cb-picks">
            <legend className="bst-cb-kv-k">Languages · Common and two more</legend>
            {Array.from({ length: LANGUAGE_PICKS }, (_, slot) => {
              const current = draft.languages?.[slot] ?? ''
              return (
                <OptionSelect
                  key={slot}
                  label={`Language ${slot + 1}`}
                  value={current}
                  placeholder="— Choose one"
                  options={STANDARD_LANGUAGES.map(language => ({
                    value: language,
                    label: language,
                    disabled: language !== current && (draft.languages ?? []).includes(language),
                  }))}
                  onChange={v => setDraft(d => withLanguagePick(d, slot, v))}
                />
              )
            })}
            {openText('Languages') ? <Message kind="warning">Choose two languages</Message> : null}
          </fieldset>

          <div className="bst-cb-kv">
            <p className="bst-cb-kv-k">Equipment</p>
            <p className="bst-cb-note">Its kit, or its gold instead, is chosen on the Equipment step.</p>
          </div>
          {/* The note's own words: all a background without structured data has to show. */}
          <TraitsPreview catalog={compendium.backgrounds} row={background} />
        </section>
      ) : null}

      <h4 className="bst-cb-sub">Character details · all optional</h4>
      <Details draft={draft} setDraft={setDraft} />
      <p className="bst-cb-note">
        The short ones are written to the note&apos;s frontmatter, the long ones as headings in its body. They never stop a save.
      </p>
    </>
  )
}

const ALIGNMENTS = [
  'Lawful Good',
  'Neutral Good',
  'Chaotic Good',
  'Lawful Neutral',
  'Neutral',
  'Chaotic Neutral',
  'Lawful Evil',
  'Neutral Evil',
  'Chaotic Evil',
  'Unaligned',
]
const LIFESTYLES = ['Wretched', 'Squalid', 'Poor', 'Modest', 'Comfortable', 'Wealthy', 'Aristocratic']

const label = (key: DetailKey) => [...SHORT_DETAILS, ...LONG_DETAILS].find(d => d.key === key)?.label ?? key

const GROUPS: Array<{ title: string; keys: DetailKey[]; long?: boolean }> = [
  { title: 'Character details', keys: ['alignment', 'faith', 'lifestyle'] },
  { title: 'Physical characteristics', keys: ['hair', 'skin', 'eyes', 'height', 'weight', 'age', 'gender'] },
  { title: 'Personal characteristics', keys: ['personalityTraits', 'ideals', 'bonds', 'flaws'], long: true },
  { title: 'Notes', keys: ['organizations', 'allies', 'enemies', 'backstory', 'other'], long: true },
]

/** The four collapsible sections of optional details. */
function Details({ draft, setDraft }: { draft: BuilderDraft; setDraft: SetDraft }) {
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(new Set())
  const details: CharacterDetails = draft.details ?? {}
  const set = (key: DetailKey, value: string) => setDraft(d => ({ ...d, details: { ...(d.details ?? {}), [key]: value } }))
  const baseId = useId()

  return GROUPS.map(group => {
    const isOpen = openGroups.has(group.title)
    const filled = group.keys.filter(k => details[k]?.trim()).length
    const panelId = `${baseId}-panel-${group.keys[0]}`
    return (
      <div key={group.title} className="bst-cb-acc">
        <h5 className="bst-cb-acc-hh">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={isOpen ? panelId : undefined}
            className="bst-plain bst-cb-acc-h"
            onClick={() =>
              setOpenGroups(s => {
                const next = new Set(s)
                if (next.has(group.title)) next.delete(group.title)
                else next.add(group.title)
                return next
              })
            }
          >
            <span className="bst-cb-acc-names">
              <span className="bst-cb-acc-name">{group.title}</span>
              <span className="bst-cb-acc-sub">
                <span className="bst-cb-sr">, </span>
                {filled > 0 ? `${filled} of ${group.keys.length} filled in` : group.keys.map(label).join(', ')}
              </span>
            </span>
            <Chevron open={isOpen} />
          </button>
        </h5>
        {isOpen ? (
          <div id={panelId} className={group.long ? 'bst-cb-acc-b' : 'bst-cb-acc-b bst-cb-grid2'}>
            {group.keys.map(key => {
              const value = details[key] ?? ''
              const id = `${baseId}-${key}`
              const options = key === 'alignment' ? ALIGNMENTS : key === 'lifestyle' ? LIFESTYLES : null
              return (
                <div key={key}>
                  <label className="bst-cb-label" htmlFor={id}>
                    {label(key)}
                  </label>
                  {options ? (
                    <select id={id} className="bst-select" value={value} onChange={e => set(key, e.target.value)}>
                      <option value="">—</option>
                      {(options.includes(value) || !value ? options : [value, ...options]).map(o => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : group.long ? (
                    <textarea id={id} className="bst-input bst-cb-textarea" rows={3} value={value} onChange={e => set(key, e.target.value)} />
                  ) : (
                    <input id={id} type="text" className="bst-input" value={value} onChange={e => set(key, e.target.value)} />
                  )}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    )
  })
}

/**
 * A just-picked origin feat's blank choices — with the spell list filled in
 * when the background named one. Acolyte grants "Magic Initiate (Cleric)", and
 * asking the player which list after the book has said so would be a question
 * with one right answer (MYDND-29).
 */
export function originChoices(featName: string, namedAs: string | null): unknown {
  const spec = originFeatSpec(featName)
  const blank = blankChoices(spec)
  const list = /\(([^()]+)\)\s*$/.exec(namedAs ?? '')?.[1]?.trim()
  if (blank && spec?.kind === 'spells' && list && spec.lists?.includes(list)) return { ...blank, spellList: list }
  return blank
}
