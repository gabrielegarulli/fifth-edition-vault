import { useId, useState, type ReactNode } from 'react'
import { optionChoicesComplete } from '@vault/derive/startingEquipment.js'

import {
  equipmentGrants,
  type EquipmentCatalogRow,
  type EquipmentOption,
  withBackgroundEquipmentOption,
  type BuilderDraft,
} from '../../choices'
import type { ItemRow } from '../../compendium'
import { Message, OptionSelect, type SetDraft, ItemPreview, ReadButton } from '../../choices/host'

/**
 * Starting equipment (MYDND-29, MYDND-174), as two cards in the column since
 * MYDND-216: the first class's kit and the background's, each a set of radio
 * options — *Option A* the kit, listed, *Option B* the gold — resolved against
 * the item notes by `@vault/derive/startingEquipment.js`, the web builder's own
 * resolver.
 *
 * **Nothing is written here.** The picks are part of the draft; the items and the
 * gold are handed over once, on a save, through the inventory and currency
 * writers (ADR 0005), and `equipment.granted` then stops a later save from
 * handing them over twice. An unchosen kit is a warning, never an error: a
 * player may start with nothing and buy their own. A kit with a line still open
 * is handed over only once that line is answered.
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

  const header = (
    <>
      <h3 className="bst-cb-h1">Starting equipment</h3>
      <p className="bst-cb-lede">Your class and your background each offer a kit, or gold instead. Both are handed over on the first save.</p>
    </>
  )
  if (equipment.granted) {
    return (
      <>
        {header}
        <p className="bst-cb-empty">This character&apos;s starting equipment has already been handed over. Change it from the inventory.</p>
      </>
    )
  }

  const pick = (key: string | null) =>
    setDraft(d => ({ ...d, equipment: { ...d.equipment, option: key, choices: key === d.equipment.option ? d.equipment.choices : {} } }))
  const pickBackground = (key: string | null) => {
    const picked = key ? (backgroundOptions.find(o => o.key === key) ?? null) : null
    setDraft(d => withBackgroundEquipmentOption(d, key, picked))
  }

  return (
    <>
      {header}
      {!draft.classes[0]?.id ? (
        <p className="bst-cb-empty">Choose a class first, and its kit appears here.</p>
      ) : options.length === 0 ? (
        <p className="bst-cb-empty">The class note lists no starting equipment.</p>
      ) : (
        <KitCard
          title={`${draft.classes[0]?.name ?? 'Class'} kit`}
          name="class"
          options={options}
          chosen={equipment.option}
          choices={equipment.choices}
          onPick={pick}
          onChoice={(index, row) =>
            setDraft(d => {
              const choices = { ...d.equipment.choices }
              if (row) choices[index] = row
              else delete choices[index]
              return { ...d, equipment: { ...d.equipment, choices } }
            })
          }
          items={items}
        />
      )}

      {!draft.background ? (
        <p className="bst-cb-empty">Choose a background first, and its kit appears here.</p>
      ) : backgroundOptions.length === 0 ? (
        <p className="bst-cb-empty">The background note lists no starting equipment.</p>
      ) : (
        <KitCard
          title={`${draft.background.name} kit`}
          name="background"
          options={backgroundOptions}
          chosen={equipment.backgroundOption ?? null}
          choices={equipment.backgroundChoices ?? {}}
          onPick={pickBackground}
          onChoice={(index, row) =>
            setDraft(d => {
              const backgroundChoices = { ...(d.equipment.backgroundChoices ?? {}) }
              if (row) backgroundChoices[index] = row
              else delete backgroundChoices[index]
              return { ...d, equipment: { ...d.equipment, backgroundChoices } }
            })
          }
          items={items}
        />
      )}
    </>
  )
}

/** One kit: its options as radios, the chosen one's open lines and notes under it. */
function KitCard({
  title,
  name,
  options,
  chosen,
  choices,
  onPick,
  onChoice,
  items,
}: {
  title: string
  name: string
  options: EquipmentOption[]
  chosen: string | null
  choices: Record<string, EquipmentCatalogRow>
  onPick: (key: string | null) => void
  onChoice: (index: string, row: EquipmentCatalogRow | undefined) => void
  items: readonly ItemRow[]
}) {
  const group = useId()
  const picked = options.find(o => o.key === chosen) ?? null
  const open = picked !== null && !optionChoicesComplete(picked, choices)
  return (
    <fieldset className="bst-cb-card bst-cb-kit">
      <legend className="bst-cb-sub">{title}</legend>
      <div className="bst-cb-opts">
        {options.map(o => (
          <label key={o.key} className={o.key === chosen ? 'bst-cb-opt bst-cb-opt--on' : 'bst-cb-opt'}>
            <input type="radio" name={`${group}-${name}`} checked={o.key === chosen} onChange={() => onPick(o.key)} />
            <span>
              <span className="bst-cb-opt-t">Option {o.key.toUpperCase()}</span>
              <span className="bst-cb-opt-d">
                <span className="bst-cb-sr">, </span>
                {summary(o)}
              </span>
            </span>
          </label>
        ))}
      </div>
      {chosen === null ? (
        <Message kind="warning">Choose the kit or its gold. Taking neither is allowed, too.</Message>
      ) : (
        <button type="button" className="bst-plain bst-cb-link" onClick={() => onPick(null)}>
          Take neither
        </button>
      )}
      {picked ? <KitLines option={picked} choices={choices} onChoice={onChoice} items={items} /> : null}
      {open ? <Message kind="warning">Choose every item the kit leaves open. It is handed over once they are.</Message> : null}
    </fieldset>
  )
}

/** A kit in one line: "Greataxe, 4 × Handaxe, Explorer's Pack and 15 gp". */
function summary(option: EquipmentOption): string {
  const parts = [
    ...option.entries.map(e => `${e.quantity > 1 ? `${e.quantity} × ` : ''}${e.item?.name ?? e.label ?? e.name}`),
    ...(option.gold > 0 ? [`${option.gold} gp`] : []),
  ]
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : (parts[0] ?? 'Nothing')
}

function KitLines({
  option,
  choices,
  onChoice,
  items,
}: {
  option: EquipmentOption
  choices: Record<string, EquipmentCatalogRow>
  onChoice: (index: string, row: EquipmentCatalogRow | undefined) => void
  items: readonly ItemRow[]
}) {
  const { unavailable } = equipmentGrants(option, { choices })
  const rowOf = (id: string | undefined) => items.find(r => r.id === id) ?? null
  return (
    <>
      <ul className="bst-plainlist">
        {option.entries.map((entry, i) => (
          <li key={i}>
            {entry.kind === 'choice' ? (
              <KitLine item={rowOf(choices[String(i)]?.id)}>
                <OptionSelect
                  label={`${entry.label}${entry.quantity > 1 ? ` ×${entry.quantity}` : ''}`}
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
      {unavailable.length > 0 ? (
        <Message kind="warning">
          No item note answers to {unavailable.join(', ')}, so {unavailable.length === 1 ? 'it' : 'they'} will not be handed over.
        </Message>
      ) : null}
    </>
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
