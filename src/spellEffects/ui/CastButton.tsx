// The Cast button: a spell's options at each slot level, aimed at an Atlas
// token.

import { useEffect, useRef, useState } from 'react'
import { Notice } from 'obsidian'

import type { SpellRow } from '../../compendium'
import type { RollContext } from '../../dice/host'
import { useRoll, useRollMode } from '../../dice/host'
import { useObsidian, MenuButton, MenuPanel, type MenuEntry, usePopup } from '../../platform/host'
import { spellRoll, type SpellRoll } from '../../characterModel'
import { attackCount, fireShots, volleySummary } from '../model/attack'
import { aimSpell, type ReadyAim } from '../obsidian/bridge'
import type { CastCost } from '../../characterModel'

/**
 * The verb a spell row was missing (MYDND-46).
 *
 * Before this, casting meant finding the slot pips in the rank's heading —
 * which had no label, hover or cursor saying they could be clicked — and
 * remembering separately that the spell needed concentration. Now the row
 * says Cast, and one click pays for it and starts concentrating.
 *
 * ## One click casts at the lowest rank that has a slot
 *
 * That is the cast a player means nine times in ten. The ▾ beside it opens the
 * other choices — every higher rank with a slot left, and a ritual cast where
 * the spell allows one — so upcasting is a deliberate second click, never a
 * menu in the way of the common case. A spell with no choice to make has no ▾.
 *
 * Any levelled spell may be cast with a higher slot, whether or not it gains
 * anything, so every rank with a slot is offered rather than guessing which
 * spells "upcast".
 *
 * ## It rolls what the rank rolls (MYDND-49)
 *
 * Each option carries the dice for its rank — Fireball's `9d6` at 4th — read
 * from the spell note's derived keys, and shown in the ▾ menu beside the slots
 * left. The cast pays first and rolls second, so a cast that could not be paid
 * for rolls nothing. A heal adds the spellcasting modifier where the spell says
 * so. A spell with no dice (Haste, or a note exported before the keys existed)
 * casts without a roll.
 *
 * ## It can ask who at, before anything is paid (MYDND-172)
 *
 * With an Atlas map open, the caster's token on it and a bolt for the spell
 * (`boltOf`), Cast asks who it is aimed at, then pays, draws the bolt from one
 * token to the other as one of Atlas' own effects (MYDND-211), and rolls.
 * Backing out of the question spends nothing. A spell that rolls to hit asks once per attack, and each one rolls
 * against its target's AC, with damage on a hit (`spellEffects/model/attack.ts`). Whenever
 * any of that is missing, Cast is the one click it
 * always was. See `spellEffects/obsidian/bridge.ts`.
 *
 * ## A hit can push (MYDND-179)
 *
 * With Repelling Blast on the spell, each judged hit pushes its target straight
 * away, last of all, after the damage. The rule says "can", so the list has a
 * switch for it, on until pressed: it stands for the whole cast, because asking
 * after every beam would stop the dice four times at 17th level. It happens as
 * the bolt strikes, not as it is thrown (`BOLT_SHOWN_MS`).
 */

export interface CastOption {
  label: string
  detail: string
  cost: CastCost
  /** What this rank rolls, or null. */
  roll: SpellRoll | null
  /** The rank it is cast at, 0 for a cantrip: Scorching Ray has a ray per rank. */
  rank: number
}

/** A cast waiting on its targets. Nothing has been paid while one exists. */
interface Aiming {
  option: CastOption
  aim: ReadyAim
  /** How many attacks this cast makes, or null for a spell that makes none. */
  attacks: number | null
  /** The tokens chosen so far, one per attack. */
  picks: string[]
  /** Whether a hit pushes, where this spell can. */
  pushing: boolean
}

const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

/**
 * The ways this spell can be cast right now, cheapest first.
 *
 * @param level the spell's level; 0 is a cantrip
 * @param max   slot maxima, index `rank - 1`
 * @param used  slots spent, keyed by rank
 * @param prepared false for a spellbook spell that is not prepared — it can
 *   still be cast as a ritual, and only that way
 * @param row the spell's note, for its dice; null rolls nothing
 * @param damageBonus a flat amount on its damage (Agonizing Blast, MYDND-178)
 */
export function castOptions({
  name,
  level,
  concentration,
  ritual,
  prepared = true,
  max,
  used,
  row = null,
  characterLevel = 1,
  spellMod = 0,
  damageBonus = 0,
}: {
  name: string
  level: number
  concentration: boolean
  ritual: boolean
  prepared?: boolean
  max: readonly number[]
  used: Readonly<Record<string, number>>
  row?: SpellRow | null
  characterLevel?: number
  spellMod?: number
  damageBonus?: number
}): CastOption[] {
  const conc = concentration ? name : null
  const rollAt = (rank: number): SpellRoll | null =>
    row ? spellRoll({ ...row, level }, { rank, characterLevel, spellMod, damageBonus }) : null
  const withDice = (detail: string, roll: SpellRoll | null): string => (roll ? `${detail} · ${roll.formula}` : detail)

  if (level <= 0) {
    const roll = rollAt(0)
    return [{ label: 'Cast', detail: withDice('at will', roll), cost: { concentration: conc }, roll, rank: 0 }]
  }

  const out: CastOption[] = []
  if (prepared) {
    for (let rank = level; rank <= max.length; rank += 1) {
      const left = (max[rank - 1] ?? 0) - (used[String(rank)] ?? 0)
      if (left <= 0) continue
      const roll = rollAt(rank)
      out.push({
        label: rank === level ? `Cast at ${ORDINAL[rank]}` : `Upcast to ${ORDINAL[rank]}`,
        detail: withDice(`${left} left`, roll),
        cost: { slot: { rank, max: max[rank - 1] }, concentration: conc },
        roll,
        rank,
      })
    }
  }
  // A ritual takes ten minutes longer and no slot (and, for a wizard, need not
  // be prepared). It is cast at the spell's own level.
  if (ritual) {
    const roll = rollAt(level)
    out.push({
      label: 'As a ritual',
      detail: withDice('+10 min, no slot', roll),
      cost: { concentration: conc },
      roll,
      rank: level,
    })
  }
  return out
}

export function CastButton({
  name,
  options,
  busy,
  onCast,
  noneLeft,
  character,
  range,
  attack,
  pushFeet = null,
}: {
  name: string
  options: readonly CastOption[]
  busy: boolean
  onCast: (cost: CastCost) => void
  /** Why there is nothing to cast with — the disabled button's tooltip. */
  noneLeft?: string
  /** Whose roll it is, for the log and the effects. */
  character?: RollContext | null
  /** The spell's range as its note writes it, to mark a target beyond it. */
  range?: string | null
  /** The caster's spell attack, without which a spell cannot roll to hit. */
  attack?: { bonus: number; characterLevel: number } | null
  /** How far a hit pushes (Repelling Blast), or null for a spell that does not. */
  pushFeet?: number | null
}) {
  const roll = useRoll()
  const app = useObsidian()
  const { open, toggle, close, rootRef, triggerRef } = usePopup<HTMLSpanElement>()
  const [aiming, setAiming] = useState<Aiming | null>(null)
  // Attacks are rolled one after another; a second cast must not start among them.
  const [firing, setFiring] = useState(false)
  const attackMode = useRollMode({ kind: 'attack' })?.mode ?? null

  // Answering from the list pays, and paying disables this button in the very
  // commit that closes the list, so `usePopup` cannot hand focus back: a disabled
  // button refuses it, and focus falls to <body>. It is handed back here instead,
  // once the write is done.
  const focusOwed = useRef(false)
  useEffect(() => {
    const el = triggerRef.current
    if (busy || firing || !focusOwed.current || !el) return
    focusOwed.current = false
    const { activeElement, body } = el.ownerDocument
    if (!activeElement || activeElement === body) el.focus()
  }, [busy, firing, triggerRef])

  const commit = (option: CastOption, play?: () => void): void => {
    onCast(option.cost)
    play?.()
    if (option.roll) {
      const r = option.roll
      void roll(
        r.formula,
        `${name} ${r.kind === 'heal' ? 'healing' : 'damage'}`,
        character,
        undefined,
        // A heal is not damage: a damage-scoped effect must not reach it.
        r.kind === 'damage' ? 'damage' : null,
        r.damageType,
      )
    } else {
      // Said, because a cast that rolls nothing and needs no concentration
      // changes nothing else on screen but a pip.
      new Notice(`${name}: ${option.label.toLowerCase()}${option.cost.slot ? ' — slot spent' : ''}`)
    }
  }

  const cast = (option: CastOption): void => {
    const aim = aimSpell(app, name, character, range)
    if (aim.kind === 'ready') {
      const attacks = attack ? attackCount(name, option.rank, attack.characterLevel) : null
      setAiming({ option, aim, attacks, picks: [], pushing: pushFeet !== null })
      if (!open) toggle()
      return
    }
    // Said, because the map staying still would otherwise read as a fault.
    if (aim.kind === 'no-caster') new Notice(`${character?.name ?? 'This character'} has no token on this map, so nothing plays there.`)
    if (aim.kind === 'no-targets') new Notice(`Nobody else is on this map for ${name} to hit.`)
    commit(option)
  }

  const play = (aim: ReadyAim, targetId: string, miss = false): Promise<void> | null => {
    const bolt = aim.play(targetId, miss)
    if (!bolt) new Notice(`${name} could not play: that token has left the map.`)
    return bolt
  }

  /** Draws one attack's bolt, settling once it has struck. A miss waits for nothing. */
  const beam = (aim: ReadyAim, targetId: string, miss: boolean): Promise<void> | void => {
    const bolt = play(aim, targetId, miss)
    return miss ? undefined : (bolt ?? undefined)
  }

  /** Every target is chosen: pay once, then play it, or fire its attacks. */
  const fire = ({ option, aim, attacks, pushing }: Aiming, picks: readonly string[]): void => {
    if (attacks === null || !attack) {
      commit(option, () => void play(aim, picks[0]))
      return
    }
    onCast(option.cost)
    setFiring(true)
    const modifiers = { shiftKey: attackMode === 'advantage', altKey: attackMode === 'disadvantage' }
    const damage = option.roll?.kind === 'damage' ? option.roll : null
    void fireShots({
      spell: name,
      shots: picks.map(id => ({
        id,
        label: aim.targets.find(t => t.id === id)?.label ?? 'the target',
        ac: aim.acOf(id),
      })),
      damageFormula: damage?.formula ?? null,
      attack: label => roll(attack.bonus, label, character, modifiers, 'attack', null),
      rollDamage: (formula, label) => roll(formula, label, character, undefined, 'damage', damage?.damageType),
      play: (id, miss) => beam(aim, id, miss),
      hurt: (id, amount) => aim.hurt(id, amount, damage?.damageType),
      push: pushing && pushFeet !== null ? id => aim.push(id, pushFeet) : undefined,
    })
      .then(volley => new Notice(volleySummary(name, volley)))
      .finally(() => setFiring(false))
  }

  /** One more target chosen: either the last one, or on to the next. */
  const choose = (current: Aiming, targetId: string): void => {
    const picks = [...current.picks, targetId]
    if (picks.length >= (current.attacks ?? 1)) fire(current, picks)
    else setAiming({ ...current, picks })
  }

  /**
   * Chooses on the map, one attack at a time. Escape drops the whole cast. The
   * prompt is a notice that stays until the pick ends, either way.
   */
  const pickOnMap = (current: Aiming): void => {
    const total = current.attacks ?? 1
    const which = total > 1 ? ` (${current.picks.length + 1} of ${total})` : ''
    const prompt = new Notice(`${name}: click the target on the map${which}. Esc to stop.`, 0)
    current.aim.pickOnMap(
      id => {
        prompt.hide()
        const picks = [...current.picks, id]
        if (picks.length >= total) fire(current, picks)
        else pickOnMap({ ...current, picks })
      },
      () => prompt.hide(),
    )
  }

  const targetEntries = (current: Aiming): MenuEntry[] => {
    const { aim, picks } = current
    const total = current.attacks ?? 1
    const left = total - picks.length
    const last = aim.targets.find(t => t.id === picks[picks.length - 1])
    return [
      ...(total > 1 ? [{ caption: `Attack ${picks.length + 1} of ${total}` }] : []),
      ...aim.targets.map<MenuEntry>(target => {
        const feet = `${Math.round(target.feet)} ft`
        const beyond = aim.range !== null && target.feet > aim.range
        const chosen = picks.filter(id => id === target.id).length
        return {
          label: target.label,
          detail: [chosen > 0 ? `× ${chosen}` : null, feet, target.hidden ? 'hidden' : null, beyond ? 'out of range' : null]
            .filter(Boolean)
            .join(' · '),
          keepOpen: left > 1,
          onSelect: () => {
            focusOwed.current = left === 1
            choose(current, target.id)
          },
        }
      }),
      ...(last && left > 1
        ? [
            {
              label: `The other ${left} at ${last.label}`,
              onSelect: () => {
                focusOwed.current = true
                fire(current, [...picks, ...Array.from({ length: left }, () => last.id)])
              },
            },
          ]
        : []),
      // No focus owed here: the GM's hand is on the map by the time this lands.
      { label: 'Click a token on the map', onSelect: () => pickOnMap(current) },
      // Only a spell that rolls to hit has a hit to push on.
      ...(pushFeet !== null && current.attacks !== null
        ? [
            {
              label: `Push ${pushFeet} ft on a hit`,
              detail: current.pushing ? 'on' : 'off',
              keepOpen: true,
              onSelect: () => setAiming({ ...current, pushing: !current.pushing }),
            },
          ]
        : []),
      ...(picks.length === 0
        ? [
            {
              label: 'Cast with no target',
              onSelect: () => {
                focusOwed.current = true
                commit(current.option)
              },
            },
          ]
        : []),
    ]
  }

  if (options.length === 0) {
    return (
      <button type="button" disabled title={noneLeft ?? 'Nothing left to cast it with'}>
        Cast
      </button>
    )
  }

  const [first, ...rest] = options
  return (
    <span ref={rootRef} className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        disabled={busy || firing}
        title={first.roll ? `${first.label} — rolls ${first.roll.formula}` : first.label}
        aria-label={`Cast ${name}`}
        aria-expanded={open}
        onClick={() => (open ? close() : cast(first))}
      >
        Cast
      </button>
      {rest.length > 0 ? (
        <MenuButton
          label={`Cast ${name} at another rank`}
          align="left"
          disabled={busy || firing}
          items={options.map<MenuEntry>(o => ({ label: o.label, detail: o.detail, onSelect: () => cast(o) }))}
        >
          ▾
        </MenuButton>
      ) : null}
      {open && aiming ? (
        <MenuPanel
          label={`Cast ${name} at`}
          items={targetEntries(aiming)}
          close={close}
          align="left"
        />
      ) : null}
    </span>
  )
}
