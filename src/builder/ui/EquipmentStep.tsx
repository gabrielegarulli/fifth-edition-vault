import { useState, type ReactNode } from 'react'

import {
  equipmentGrants,
  type EquipmentCatalogRow,
  type EquipmentOption,
  withBackgroundEquipmentOption,
  type BuilderDraft,
} from '../../choices'
import type { ItemRow } from '../../compendium'
import { OptionSelect, Section, type SetDraft, ItemPreview, ReadButton } from '../../choices/host'

/**
 * Starting equipment (MYDND-29, MYDND-174) — the first class's and the chosen
 * background's lettered options, resolved against the item notes by
 * `@vault/derive/startingEquipment.js`, the web builder's own resolver.
 *
 * **Nothing is written here.** The picks are part of the draft; the items and the
 * gold are handed over once, at Create, through the inventory and currency
 * writers (ADR 0005), and `equipment.granted` then stops a later Save from
 * handing them over twice.
 *
 * A line with an item note can be read before it is taken (MYDND-155): opened
 * one at a time, because a kit is a dozen notes and most are a rope.
 */
export function EquipmentStep({
  draft,
  setDraft,
  options,
  backgroundOptions = [],
  items,
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  options: EquipmentOption[]
  /** The chosen background's starting-equipment options, when it has any (MYDND-174). */
  backgroundOptions?: EquipmentOption[]
  /** Every item note's row, to find a kit line's. */
  items: readonly ItemRow[]
}) {
  const equipment = draft.equipment
  if (equipment.granted) {
    return (
      <p className="bst-note">
        This character's starting equipment has already been handed over — change it from the inventory.
      </p>
    )
  }
  if (!draft.classes[0]?.id) return <p className="bst-note">Choose a class first.</p>
  if (options.length === 0 && backgroundOptions.length === 0) {
    return <p className="bst-note">The class note lists no starting equipment.</p>
  }

  const pick = (key: string | null) =>
    setDraft(d => ({ ...d, equipment: { ...d.equipment, option: key, choices: key === d.equipment.option ? d.equipment.choices : {} } }))

  const pickBackground = (key: string | null) => {
    const picked = key ? (backgroundOptions.find(o => o.key === key) ?? null) : null
    setDraft(d => withBackgroundEquipmentOption(d, key, picked))
  }

  return (
    <>
      {options.length === 0 ? (
        <p className="bst-note">The class note lists no starting equipment.</p>
      ) : (
        <>
          {backgroundOptions.length > 0 ? (
            <span className="bst-bsection-title">{draft.classes[0]?.name ?? 'Class'} starting equipment</span>
          ) : null}
          <div role="group" aria-label="Starting equipment" className="bst-wrap-row">
            {options.map(o => (
              <button
                key={o.key}
                type="button"
                aria-pressed={equipment.option === o.key}
                className="bst-plain bst-pill bst-pill--lg"
                onClick={() => pick(equipment.option === o.key ? null : o.key)}
              >
                Option {o.key.toUpperCase()}
              </button>
            ))}
          </div>
          {options.map(o => (
            <OptionCard
              key={o.key}
              option={o}
              choices={equipment.choices}
              onChoice={(index, row) =>
                setDraft(d => {
                  const choices = { ...d.equipment.choices }
                  if (row) choices[index] = row
                  else delete choices[index]
                  return { ...d, equipment: { ...d.equipment, choices } }
                })
              }
              chosen={equipment.option === o.key}
              items={items}
            />
          ))}
        </>
      )}

      {backgroundOptions.length > 0 ? (
        <section aria-label={`${draft.background?.name ?? 'Background'} starting equipment`} className="bst-col bst-col--gap">
          <span className="bst-bsection-title">{draft.background?.name ?? 'Background'} starting equipment</span>
          <div role="group" aria-label="Background starting equipment" className="bst-wrap-row">
            {backgroundOptions.map(o => (
              <button
                key={o.key}
                type="button"
                aria-pressed={equipment.backgroundOption === o.key}
                className="bst-plain bst-pill bst-pill--lg"
                onClick={() => pickBackground(equipment.backgroundOption === o.key ? null : o.key)}
              >
                Option {o.key.toUpperCase()}
              </button>
            ))}
          </div>
          {backgroundOptions.map(o => (
            <OptionCard
              key={o.key}
              option={o}
              choices={equipment.backgroundChoices ?? {}}
              onChoice={(index, row) =>
                setDraft(d => {
                  const backgroundChoices = { ...(d.equipment.backgroundChoices ?? {}) }
                  if (row) backgroundChoices[index] = row
                  else delete backgroundChoices[index]
                  return { ...d, equipment: { ...d.equipment, backgroundChoices } }
                })
              }
              chosen={equipment.backgroundOption === o.key}
              items={items}
            />
          ))}
        </section>
      ) : null}

      <p className="bst-note bst-note--faint">Taking neither is allowed — start with nothing and buy your own.</p>
    </>
  )
}

function OptionCard({
  option,
  choices,
  onChoice,
  chosen,
  items,
}: {
  option: EquipmentOption
  choices: Record<string, EquipmentCatalogRow>
  onChoice(index: string, row: EquipmentCatalogRow | undefined): void
  chosen: boolean
  items: readonly ItemRow[]
}) {
  const { unavailable } = equipmentGrants(option, { choices })
  const rowOf = (id: string | undefined) => items.find(r => r.id === id) ?? null
  return (
    <Section title={`Option ${option.key.toUpperCase()}${chosen ? ' — taken' : ''}`} open={chosen}>
      <ul className="bst-plainlist">
        {option.entries.map((entry, i) => (
          <li key={i}>
            {entry.kind === 'choice' && chosen ? (
              <KitLine item={rowOf(choices[String(i)]?.id)}>
                <OptionSelect
                  label={`${entry.label ?? entry.name}${entry.quantity > 1 ? ` ×${entry.quantity}` : ''}`}
                  value={choices[String(i)]?.id ?? ''}
                  options={(entry.options ?? []).map(r => ({ value: r.id, label: r.name }))}
                  onChange={v => onChoice(String(i), entry.options?.find(r => r.id === v))}
                />
              </KitLine>
            ) : (
              <KitLine item={rowOf(entry.item?.id)}>
                <span>
                  {entry.quantity > 1 ? `${entry.quantity} × ` : ''}
                  {entry.item?.name ?? entry.label ?? entry.name}
                  {entry.kind === 'unavailable' ? <span className="bst-note--faint"> (no note)</span> : null}
                </span>
              </KitLine>
            )}
          </li>
        ))}
        {option.gold > 0 ? <li>{option.gold} gp</li> : null}
      </ul>
      {chosen && unavailable.length > 0 ? (
        <p className="bst-note bst-note--warn">
          No item note answers to {unavailable.join(', ')} — {unavailable.length === 1 ? 'it' : 'they'} will not be
          handed over.
        </p>
      ) : null}
    </Section>
  )
}

/** A kit's line, and its note under it once asked for. */
function KitLine({ item, children }: { item: ItemRow | null; children: ReactNode }) {
  const [reading, setReading] = useState(false)
  return (
    <div className="bst-col">
      <div className="bst-bread-row">
        <div className="bst-bread-main">{children}</div>
        {item ? <ReadButton name={item.name} open={reading} onToggle={() => setReading(r => !r)} /> : null}
      </div>
      {item && reading ? <ItemPreview item={item} /> : null}
    </div>
  )
}
