import { useMemo, type ReactNode } from 'react'

import { resolveDefenseGrants } from '@vault/derive/defenseGrants.js'
import { conditionSections, damageSections } from '@vault/derive/defenseSections.js'

import type { ResolvedEffect } from '../../compendium'
import type { Sheet, DefenseType, StoredDefense, Vitals } from '../../characterModel'
import { isLocalId } from '../../characterModel'
import { Block, LABEL } from './CharacterSheet'
import { Icon, MenuButton } from '../../platform/host'
import { STANDARD_CONDITIONS } from './SheetState'

/**
 * The Defences tab (MYDND-48) — the web sheet's right-hand `DefensesPanel`, as a
 * tab: what is true of the character that is not a number you roll.
 *
 * ## Two sources, one collapsing rule
 *
 * - **Granted** defences are computed, never stored: D&D Beyond's from its
 *   modifiers at import (`sheet.defenses`), and every effect's — a feat's, or a
 *   Vault character's Rage while it is switched on — through
 *   `resolveDefenseGrants`, the web sheet's own resolver. A granted chip says
 *   where it came from and has no ✕: the feature is the thing to change.
 * - **Hand-set** ones are `vault-vitals`' `defenses`, the web sheet's
 *   `vault_state.defenses`. Those have a ✕.
 *
 * Both go through `damageSections` / `conditionSections`, so a value appears in
 * exactly one section at its highest tier — resistance *and* immunity to fire is
 * immunity to fire. `+ Add` offers only what the column is not already saying.
 */

const DAMAGE_TYPES = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
]

const titled = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

interface Entry {
  value: string
  sources: string[]
  stored: boolean
}

export interface DefencesActions {
  setDefense(value: string, type: DefenseType): void
  clearDefense(value: string): void
  rebuild(): void
}

export function DefencesTab({
  sheet,
  vitals,
  effects,
  actions,
  busy,
}: {
  sheet: Sheet
  vitals: Vitals
  effects: readonly ResolvedEffect[]
  actions: DefencesActions
  busy: boolean
}) {
  const grants = useMemo(
    () => [
      ...(sheet.defenses ?? []).map(d => ({ type: d.type, value: d.value, source: d.source ?? undefined })),
      ...(resolveDefenseGrants({
        character: { source: 'vault' },
        sheet: { resolvedEffects: effects },
        vaultState: { activeEffects: vitals.activeEffects },
      }) as { type: string; value: string; source?: string }[]),
    ],
    [sheet, effects, vitals.activeEffects],
  )
  const stored: StoredDefense[] = vitals.defenses
  const damage = damageSections(stored, grants) as Record<'immunity' | 'resistance' | 'vulnerability', Entry[]>
  const conditions = conditionSections(stored, grants) as { immunity: Entry[] }

  const claimedDamage = new Set([...damage.immunity, ...damage.resistance, ...damage.vulnerability].map(e => e.value))
  const claimedConditions = new Set(conditions.immunity.map(e => e.value))
  // Absent, not empty: a note written before MYDND-48 carries no senses or
  // proficiencies, and "None" would be a claim about the character.
  const outdated = !sheet.proficiencies

  const chips = (entries: Entry[], vocabulary: readonly string[]) =>
    entries.length === 0 ? (
      <span className="text-faint">None</span>
    ) : (
      [...entries]
        .sort((a, b) => vocabulary.indexOf(a.value) - vocabulary.indexOf(b.value))
        .map(e => (
          <span
            key={e.value}
            className="inline-flex items-center gap-1 rounded-full border border-background-modifier-border px-2 py-0.5"
            title={e.sources.length > 0 ? `From ${e.sources.join(', ')}` : 'Set by hand'}
          >
            <span className="font-semibold text-normal">{titled(e.value)}</span>
            {e.sources.length > 0 ? <span className="text-smallest text-faint">{e.sources.join(', ')}</span> : null}
            {e.stored ? (
              <button
                type="button"
                className="clickable-icon"
                aria-label={`Remove ${titled(e.value)}`}
                disabled={busy}
                onClick={() => actions.clearDefense(e.value)}
              >
                <Icon name="x" />
              </button>
            ) : null}
          </span>
        ))
    )

  const add = (type: DefenseType, vocabulary: readonly string[], claimed: Set<string>, what: string) => (
    <MenuButton
      label={`Add ${what}`}
      align="left"
      disabled={busy}
      items={vocabulary
        .filter(v => !claimed.has(v))
        .map(v => ({ label: titled(v), onSelect: () => actions.setDefense(v, type) }))}
    >
      + Add
    </MenuButton>
  )

  const section = (title: string, body: ReactNode, control?: ReactNode) => (
    <div className="flex flex-col gap-1.5 border-b border-background-modifier-border pb-3 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className={LABEL}>{title}</span>
        <span className="flex-1" />
        {control}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">{body}</div>
    </div>
  )

  const speeds = Object.entries(sheet.speeds ?? (typeof sheet.speed === 'number' ? { walk: sheet.speed } : {})).filter(
    ([, v]) => v > 0,
  )
  const prof = sheet.proficiencies

  return (
    <div className="flex flex-col gap-3">
      {outdated ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-smaller text-warning">
            This sheet was {isLocalId(sheet.ddb_id) ? 'projected' : 'imported'} before it carried senses and
            proficiencies.
          </span>
          <button type="button" disabled={busy} onClick={actions.rebuild}>
            {isLocalId(sheet.ddb_id) ? 'Rebuild sheet' : 'Re-sync'}
          </button>
        </div>
      ) : null}

      <Block title="Damage">
        {section(
          'Resistances',
          chips(damage.resistance, DAMAGE_TYPES),
          add('resistance', DAMAGE_TYPES, claimedDamage, 'a resistance'),
        )}
        {section(
          'Immunities',
          chips(damage.immunity, DAMAGE_TYPES),
          add('immunity', DAMAGE_TYPES, claimedDamage, 'an immunity'),
        )}
        {section(
          'Vulnerabilities',
          chips(damage.vulnerability, DAMAGE_TYPES),
          add('vulnerability', DAMAGE_TYPES, claimedDamage, 'a vulnerability'),
        )}
        {section(
          'Condition immunities',
          chips(conditions.immunity, STANDARD_CONDITIONS),
          add('condition_immunity', STANDARD_CONDITIONS, claimedConditions, 'a condition immunity'),
        )}
      </Block>

      <Block title="Senses and movement">
        {section(
          'Senses',
          (sheet.senses ?? []).length === 0 ? (
            <span className="text-faint">None beyond sight</span>
          ) : (
            (sheet.senses ?? []).map(s => (
              <span key={s.name} title={s.source ? `From ${s.source}` : undefined} className="text-normal">
                {titled(s.name)} <span className="font-mono">{s.range} ft</span>
              </span>
            ))
          ),
        )}
        {section(
          'Speed',
          speeds.map(([mode, v]) => (
            <span key={mode} className="text-normal">
              {titled(mode)} <span className="font-mono">{v} ft</span>
            </span>
          )),
        )}
      </Block>

      {prof ? (
        <Block title="Proficiencies">
          {section('Armor', listOrNone(prof.armor))}
          {section('Weapons', listOrNone(prof.weapons))}
          {section('Tools', listOrNone(prof.tools))}
          {section('Languages', listOrNone(prof.languages))}
        </Block>
      ) : null}
    </div>
  )
}

function listOrNone(items: readonly string[]) {
  return items.length === 0 ? (
    <span className="text-faint">None</span>
  ) : (
    <span className="text-normal">{items.join(' · ')}</span>
  )
}
