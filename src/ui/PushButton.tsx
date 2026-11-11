import { useState } from 'react'
import { Notice } from 'obsidian'

import type { RollContext } from '../dice/atlas'
import { useObsidian } from '../ObsidianContext'
import { aimPush, canAim, type ReadyPush } from '../spellEffects/bridge'
import { pushLine } from '../spellEffects/push'
import { MenuPanel, type MenuEntry } from './MenuButton'
import { useRollsOff } from './Rollable'
import { usePopup } from './usePopup'

/**
 * The Push mastery, on a weapon's row (MYDND-179).
 *
 * A weapon's rolls are chips: they know nothing of tokens, so nothing here can
 * say the attack hit. The player rolls, the table sees the hit, and this is the
 * mastery's "you can push": press it, say who, and the token moves. So it is
 * also the choice the rule gives, not pressing it being the other half.
 *
 * It needs Atlas Spell Effects, the way to the map, but no art: `aimPush` asks
 * for the scene and nothing else. Without the plugin there is no button, which
 * covers the web build.
 */
export function PushButton({ weapon, feet, character }: { weapon: string; feet: number; character: RollContext }) {
  const app = useObsidian()
  const off = useRollsOff()
  const { open, toggle, close, rootRef, triggerRef } = usePopup<HTMLSpanElement>()
  const [aim, setAim] = useState<ReadyPush | null>(null)
  if (off || !canAim(app)) return null

  const press = (): void => {
    if (open) {
      close()
      return
    }
    const next = aimPush(app, character)
    if (next.kind === 'ready') {
      setAim(next)
      toggle()
    } else if (next.kind === 'no-caster') new Notice(`${character.name ?? 'This character'} has no token on this map.`)
    else if (next.kind === 'no-targets') new Notice('Nobody else is on this map to push.')
    else new Notice('Open an Atlas map to push a token.')
  }

  const shove = (ready: ReadyPush, targetId: string): void => {
    const label = ready.targets.find(t => t.id === targetId)?.label ?? 'That token'
    const pushed = ready.push(targetId, feet)
    new Notice(pushed ? pushLine(label, pushed) : `${label} could not be moved.`)
  }

  const entries = (ready: ReadyPush): MenuEntry[] => [
    ...ready.targets.map<MenuEntry>(target => ({
      label: target.label,
      detail: [`${Math.round(target.feet)} ft`, target.hidden ? 'hidden' : null].filter(Boolean).join(' · '),
      onSelect: () => shove(ready, target.id),
    })),
    {
      label: 'Click a token on the map',
      onSelect: () => ready.pickOnMap(`${weapon}: click the creature to push`, id => shove(ready, id)),
    },
  ]

  return (
    <span ref={rootRef} className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        title={`After a hit: push a Large or smaller creature ${feet} ft straight away`}
        aria-label={`Push with ${weapon}`}
        aria-expanded={open}
        onClick={press}
      >
        Push
      </button>
      {open && aim ? <MenuPanel label={`Push with ${weapon}`} items={entries(aim)} close={close} /> : null}
    </span>
  )
}
