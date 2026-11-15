// The builder's Class step: the classes by book, a confirm dialog, then a card
// per class with its features and their questions under it (MYDND-216).

import { useState, type ReactNode } from 'react'

import { ABILITY_FULL } from '@vault/derive/speciesChoices.js'

import {
  SKILL_NAME,
  classSkillChoices,
  featureRows,
  featureTitle,
  itemComplete,
  multiclassSkillChoices,
  multiclassSkillKey,
  prereqsMet,
  subclassLevel,
  totalLevelOf,
  withClass,
  withExtraClass,
  withFeatureChoice,
  withFlexibleAbility,
  withLevel,
  withSubclass,
  withoutClass,
  type BuilderDraft,
  type ClassContext,
  type FeatData,
  type FeatureRow,
  type LevelItem,
} from '../../choices'
import { sourceLabel, subclassesOf, type ClassFence, type ClassRow, type SubclassRow } from '../../compendium'
import { useCompendium } from '../../compendium/host'
import { Markdown, useDetail } from '../../platform/host'
import {
  Banner,
  FeatureQuestion,
  Message,
  OptionSelect,
  SlotSelects,
  WarningIcon,
  type FeaturesStepProps,
  type SetDraft,
} from '../../choices/host'
import { stripPreamble } from '../../platform'
import { ConfirmDialog, firstParagraph, firstSentence } from './ConfirmDialog'
import { Chevron, Initial, ShelfList } from './ShelfList'

/** "1st", "2nd", "11th". */
export function ordinal(n: number): string {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

/**
 * The Class step, as D&D Beyond draws it (MYDND-216).
 *
 * - **No class yet, or "Add another class"**: every class on shelves by book
 *   (`ShelfList`), and a row opens a confirm dialog — its facts and its level-1
 *   features — before the class is added.
 * - **Then a card per class**: its name, a Level select and a remove ✕, and
 *   under it one section per feature up to that level, the feature's question
 *   inside it. These are the questions the Features step asked until MYDND-216.
 *   An unanswered one shows the warning icon, an amber border, and opens by
 *   default. The class's skills and its subclass are sections too.
 *
 * **Multiclass** follows the web builder: the first class alone sets saves and
 * skills, and a class whose ability prerequisites the scores do not meet is
 * *warned*, not refused — `multiclassPrereqsMet` passes homebrew it does not
 * know, and a table may wave the rule.
 */
export function ClassStep({
  draft,
  setDraft,
  rows,
  subclasses,
  fences,
  contexts,
  feats,
  features,
  summary,
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  rows: readonly ClassRow[]
  subclasses: readonly SubclassRow[]
  /** By `draft.classes` index. */
  fences: ReadonlyArray<ClassFence | null>
  contexts: readonly ClassContext[]
  feats: readonly FeatData[]
  /** What each feature's question is drawn with: the Features step's props. */
  features: FeaturesStepProps
  /** Character level, Max HP and Hit Dice, above the cards. */
  summary: ReactNode
}) {
  const compendium = useCompendium()
  const [adding, setAdding] = useState(false)
  const [pending, setPending] = useState<{ row: ClassRow; from: HTMLElement } | null>(null)
  const { detail } = useDetail(compendium.classes, pending?.row.id ?? null)
  const picked = draft.classes.filter(c => c.id)
  const listing = picked.length === 0 || adding
  const total = totalLevelOf(draft)
  const offered = rows.filter(r => !draft.classes.some(c => c.id === r.id))

  const add = (row: ClassRow) => {
    const blank = draft.classes.findIndex(c => !c.id)
    const index = blank >= 0 ? blank : draft.classes.length
    // The class's fence is not loaded yet; nothing the pick does needs it. The
    // saves and the hit die come from the fence in `toVaultJson`, at save time.
    setDraft(d => {
      const withRow = blank >= 0 ? d : withExtraClass(d)
      return withClass(withRow, { row, fence: null }, index)
    })
    setAdding(false)
    setPending(null)
  }

  return (
    <>
      {listing ? (
        <>
          <h3 className="bst-cb-h1">{picked.length > 0 ? 'Add another class' : 'Choose a class'}</h3>
          <p className="bst-cb-lede">Grouped by where each class comes from. Picking one shows it before it is added.</p>
          {picked.length === 0 ? <Banner kind="error">A class is needed before the character can be saved.</Banner> : null}
          {adding ? (
            <p className="bst-cb-back">
              <button type="button" className="bst-plain bst-cb-link" onClick={() => setAdding(false)}>
                ‹ Back to your classes
              </button>
            </p>
          ) : null}
          <ShelfList noun="class" rows={offered} onOpen={(row, from) => setPending({ row, from })} />
        </>
      ) : (
        <>
          {summary}
          {draft.classes.map((c, i) =>
            c.id ? (
              <ClassCard
                key={`${c.id}-${i}`}
                index={i}
                draft={draft}
                setDraft={setDraft}
                row={rows.find(r => r.id === c.id) ?? null}
                rows={rows}
                subclasses={subclasses}
                fence={fences[i] ?? null}
                context={contexts[i] ?? null}
                feats={feats}
                features={features}
                removable={picked.length === 1 || i > 0}
              />
            ) : null,
          )}
          <button type="button" className="bst-plain bst-cb-addclass" disabled={total >= 20} onClick={() => setAdding(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add another class
          </button>
          {total >= 20 ? <p className="bst-cb-note">The levels already add up to 20.</p> : null}
        </>
      )}

      {pending ? (
        <ConfirmDialog
          title="Add class"
          name={pending.row.name}
          book={pending.row.source ? sourceLabel(pending.row.source) : 'No book named'}
          pitch={detail ? firstSentence(stripPreamble(detail.prose)) : null}
          facts={[
            ...(pending.row.primaryAbility ? [{ label: 'Primary ability', value: pending.row.primaryAbility }] : []),
            ...(pending.row.hitDie || detail?.fence?.hit_die
              ? [{ label: 'Hit Point Die', value: pending.row.hitDie ?? `d${detail?.fence?.hit_die}` }]
              : []),
            ...(pending.row.savingThrows.length > 0 ? [{ label: 'Saves', value: pending.row.savingThrows.join(' & ') }] : []),
          ]}
          listTitle="Level 1 features"
          confirmText="Add class"
          onConfirm={() => add(pending.row)}
          onClose={() => setPending(null)}
          returnTo={pending.from}
        >
          {picked.length > 0 && !prereqsMet(draft, pending.row.name, feats) ? (
            <Message kind="warning">The ability scores do not meet {pending.row.name}&apos;s multiclass prerequisites.</Message>
          ) : null}
          {detail === null ? (
            <p className="bst-cb-note">Reading the note…</p>
          ) : (
            <ul className="bst-cb-dlg-feats">
              {visibleFeatures(featureRows(pending.row.id, detail.fence?.features), 1).map(f => (
                <li key={f.id}>
                  <span className="bst-cb-dlg-fn">{f.name}</span>
                  {f.description ? (
                    <Markdown markdown={firstParagraph(f.description)} sourcePath={pending.row.path} className="bst-cb-dlg-ft" />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </ConfirmDialog>
      ) : null}
    </>
  )
}

/** A class's own features up to `level`, once each, without the options of another feature. */
function visibleFeatures(rows: readonly FeatureRow[], level: number): FeatureRow[] {
  const seen = new Set<string>()
  return rows.filter(f => {
    if (f.level > level || f.data?.optionOf) return false
    const key = `${f.level}:${f.name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

interface Section {
  id: string
  name: string
  level: number
  /** An open question: the warning icon, an amber border, open by default. */
  needs: boolean
  /** Whether it asks anything at all, answered or not. */
  asks: boolean
  sub?: string
  body: ReactNode
}

function ClassCard({
  index,
  draft,
  setDraft,
  row,
  rows,
  subclasses,
  fence,
  context,
  feats,
  features,
  removable,
}: {
  index: number
  draft: BuilderDraft
  setDraft: SetDraft
  row: ClassRow | null
  rows: readonly ClassRow[]
  subclasses: readonly SubclassRow[]
  fence: ClassFence | null
  context: ClassContext | null
  feats: readonly FeatData[]
  features: FeaturesStepProps
  removable: boolean
}) {
  const cls = draft.classes[index]
  const name = cls?.name ?? row?.name ?? 'Class'
  const level = cls?.level ?? 1
  const total = totalLevelOf(draft)
  const unlocks = subclassLevel(fence)
  const subs = row ? subclassesOf(subclasses, row, rows) : []
  const flexible = fence?.spellcasting_ability === 'flexible'
  const fixedAbility =
    !flexible && typeof fence?.spellcasting_ability === 'string' ? fence.spellcasting_ability.toLowerCase().slice(0, 3) : null
  const items = features.items.filter(i => i.classIndex === index)

  const classRows = row ? featureRows(row.id, fence?.features) : []
  const subRows = cls?.subclass && context?.subclassFence ? featureRows(cls.subclass.id, context.subclassFence.features) : []
  const shown = [...visibleFeatures(classRows, level), ...visibleFeatures(subRows, level)]
  const higher = new Set(classRows.filter(f => f.level > level && !f.data?.optionOf).map(f => `${f.level}:${f.name}`)).size

  const complete = (item: LevelItem) =>
    itemComplete(item, draft, {
      feats: features.featData,
      masteryCount: features.masteryCount,
      invocationCount: features.invocationCount(item.classIndex),
    })

  const skillChoices = index === 0 ? classSkillChoices(fence) : multiclassSkillChoices(fence)
  const skillPicks = index === 0 ? draft.skillProficiencies : asList(draft.featureChoices[multiclassSkillKey(cls?.id ?? '')])
  const skillsOpen = Boolean(skillChoices) && skillPicks.filter(Boolean).length < (skillChoices?.count ?? 0)
  const abilityOpen = flexible && !cls?.spellcastingAbility

  const sections: Section[] = [
    {
      id: `core:${cls?.id}`,
      name: `Core ${name} traits`,
      level: 1,
      needs: skillsOpen || abilityOpen,
      asks: Boolean(skillChoices) || flexible,
      sub: skillsOpen ? `Choose ${(skillChoices?.count ?? 0) - skillPicks.filter(Boolean).length} more · 1st level` : undefined,
      body: (
        <>
          <p className="bst-cb-note">
            {[
              fence?.hit_die ? `Hit Point Die d${fence.hit_die}` : row?.hitDie ? `Hit Point Die ${row.hitDie}` : null,
              index === 0 && row?.savingThrows.length ? `${row.savingThrows.join(' and ')} saves` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {skillChoices ? <SkillPicks draft={draft} setDraft={setDraft} index={index} fence={fence} /> : null}
          {flexible ? (
            <OptionSelect
              label="Spellcasting ability"
              value={cls?.spellcastingAbility ?? ''}
              options={['int', 'wis', 'cha'].map(a => ({ value: a, label: ABILITY_FULL[a] }))}
              onChange={v => setDraft(d => withFlexibleAbility(d, v, index))}
            />
          ) : fixedAbility ? (
            <p className="bst-cb-note">Casts with {ABILITY_FULL[fixedAbility] ?? fixedAbility}, fixed by the class.</p>
          ) : null}
        </>
      ),
    },
    ...(level >= unlocks && subs.length > 0
      ? [
          {
            id: `subclass:${cls?.id}`,
            name: fence?.data?.subclassTitle ? String(fence.data.subclassTitle) : `${name} subclass`,
            level: unlocks,
            needs: !cls?.subclass,
            asks: true,
            body: (
              <OptionSelect
                label="Subclass"
                value={cls?.subclass?.id ?? ''}
                placeholder="— Choose one"
                options={subs.map(s => ({ value: s.id, label: s.source ? `${s.name} (${sourceLabel(s.source)})` : s.name }))}
                onChange={v => {
                  const sub = subs.find(s => s.id === v) ?? null
                  setDraft(d => withSubclass(d, sub, index))
                }}
              />
            ),
          },
        ]
      : []),
    ...shown.map((f): Section => {
      const item = items.find(i => i.feature.id === f.id) ?? null
      return {
        id: f.id,
        name: item ? featureTitle(item, draft) : f.name,
        level: f.level,
        needs: item !== null && !complete(item),
        asks: item !== null,
        body: (
          <>
            {f.description ? <Markdown markdown={f.description} sourcePath={row?.path ?? ''} className="bst-cb-acc-text" /> : null}
            {item ? <FeatureQuestion {...features} item={item} /> : null}
          </>
        ),
      }
    }),
    // Questions with no feature row of their own, e.g. a subclass's extra spells.
    ...items
      .filter(i => !shown.some(f => f.id === i.feature.id))
      .map(
        (item): Section => ({
          id: item.feature.id,
          name: featureTitle(item, draft),
          level: item.level,
          needs: !complete(item),
          asks: true,
          body: <FeatureQuestion {...features} item={item} />,
        }),
      ),
  ].sort((a, b) => a.level - b.level)

  const maxLevel = 20 - (total - level)

  return (
    <section aria-label={name} className="bst-cb-card bst-cb-classcard">
      <div className="bst-cb-card-h">
        <Initial name={name} />
        <div className="bst-cb-card-names">
          <h3 className="bst-cb-card-title">{name}</h3>
          <p className="bst-cb-card-sub">{row?.source ? sourceLabel(row.source) : ' '}</p>
        </div>
        <span className="bst-spacer" />
        <label className="bst-cb-lvl">
          Level
          <select
            className="bst-select bst-select--compact"
            aria-label={`${name} level`}
            value={level}
            onChange={e => {
              const next = parseInt(e.target.value, 10)
              if (Number.isFinite(next)) setDraft(d => withLevel(d, next, fence, index))
            }}
          >
            {Array.from({ length: Math.max(level, maxLevel) }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {removable ? (
          <button
            type="button"
            aria-label={`Remove ${name}`}
            className="bst-plain bst-cb-iconbtn"
            onClick={() => setDraft(d => (index === 0 ? withClass(d, null, 0) : withoutClass(d, index)))}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        ) : null}
      </div>
      {index > 0 && row && !prereqsMet(draft, row.name, feats) ? (
        <Message kind="warning">The ability scores do not meet {row.name}&apos;s multiclass prerequisites.</Message>
      ) : null}

      <h4 className="bst-cb-sub">Class features</h4>
      {sections.map(s => (
        <FeatureSection key={s.id} section={s} />
      ))}
      {higher > 0 ? (
        <p className="bst-cb-higher">
          Available at higher levels ({higher}) <span className="bst-cb-note">· raise the level to see them</span>
        </p>
      ) : null}
    </section>
  )
}

/** One feature: a heading button that opens it, the text and the question inside. */
function FeatureSection({ section }: { section: Section }) {
  const [open, setOpen] = useState<boolean | null>(null)
  // Open while it has needed an answer, until the player closes it: a section
  // that shut on the last pick would hide the answer just given. Sticky rather
  // than set once, because a class's fence (and so its questions) lands a
  // render after the card.
  const [asked, setAsked] = useState(section.needs)
  if (section.needs && !asked) setAsked(true)
  const isOpen = open ?? asked
  const sub =
    section.sub ??
    (section.needs ? `To choose · ${ordinal(section.level)} level` : section.asks ? `Answered · ${ordinal(section.level)} level` : `${ordinal(section.level)} level`)
  return (
    <div className={section.needs ? 'bst-cb-acc bst-cb-acc--need' : 'bst-cb-acc'}>
      <h5 className="bst-cb-acc-hh">
        <button type="button" aria-expanded={isOpen} className="bst-plain bst-cb-acc-h" onClick={() => setOpen(!isOpen)}>
          {section.needs ? <WarningIcon /> : null}
          <span className="bst-cb-acc-names">
            <span className="bst-cb-acc-name">
              {section.name}
              {section.needs ? <span className="bst-cb-sr">, warning: still to choose</span> : null}
            </span>
            <span className="bst-cb-acc-sub">
              <span className="bst-cb-sr">, </span>
              {sub}
            </span>
          </span>
          <Chevron open={isOpen} />
        </button>
      </h5>
      {isOpen ? <div className="bst-cb-acc-b">{section.body}</div> : null}
    </div>
  )
}

function asList(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : []
}

function SkillPicks({
  draft,
  setDraft,
  index,
  fence,
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  index: number
  fence: ClassFence | null
}) {
  const primary = index === 0
  const choices = primary ? classSkillChoices(fence) : multiclassSkillChoices(fence)
  if (!choices) return null
  const key = multiclassSkillKey(draft.classes[index]?.id ?? '')
  const picks = primary ? draft.skillProficiencies : asList(draft.featureChoices[key])
  return (
    <fieldset className="bst-cb-picks">
      <legend>
        {primary ? 'Skill proficiencies' : 'Multiclass skill'} · choose {choices.count}
      </legend>
      <SlotSelects
        count={choices.count}
        label={i => `Skill ${i + 1}`}
        picks={picks}
        options={choices.options.map(s => ({ value: s, label: SKILL_NAME[s] ?? s }))}
        placeholder="— Choose a skill"
        onChange={next => setDraft(d => (primary ? { ...d, skillProficiencies: next } : withFeatureChoice(d, key, next)))}
      />
    </fieldset>
  )
}
