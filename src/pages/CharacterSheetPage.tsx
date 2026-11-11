import { useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { describeEffectCoverage } from '../content/featEffects'
import { rollModes } from '../sheet/rollModes'
import { RollModeProvider } from '../ui/RollModeContext'
import { ActiveBenefits, StateRow, useActivatableBenefits } from '../ui/SheetState'
import { useElementWidth } from '../hooks/useElementWidth'
import { useRoster } from '../hooks/useRoster'
import { useVaultGeneration } from '../hooks/useVaultGeneration'
import { useVitals } from '../hooks/useVitals'
import { useStateHost } from '../StateContext'
import { useContent } from '../ContentContext'
import { AbilityCards, ActionList, Block, RollHint, SkillList } from '../ui/CharacterSheet'
import { HitDiceRows } from '../ui/HpPanel'
import { resourceFor, ResourceRows, resourcesMissing, UseButton } from '../ui/Resources'
import { DefencesTab } from '../ui/DefencesTab'
import { FeatureList } from '../ui/FeatureList'
import { FamiliarsTab, familiarsOf } from '../ui/FamiliarsTab'
import { WildShapePanel } from '../ui/WildShapePanel'
import { useVaultCharacterJson } from '../hooks/useVaultCharacterJson'
import { isLocalId } from '../state/characters'
import { CharacterInventory } from '../ui/inventory/CharacterInventory'
import { LevelUp } from '../ui/LevelUpPanel'
import { PlayStrip } from '../ui/PlayStrip'
import { RollLog } from '../ui/RollLog'
import { hasSpellPanel, SpellPanel } from '../ui/SpellPanel'
import { XpProgressBar } from '../ui/XpProgressBar'
import { tamerLevelOf } from '../sheet/companion'
import { CHARACTER_SHEET_PREFIX } from '../routes'
import { useRouteLink } from '../pane'

export type SheetTab = 'combat' | 'spells' | 'features' | 'inventory' | 'defences' | 'familiars'

const TAB_LABEL: Record<SheetTab, string> = {
  combat: 'Combat',
  spells: 'Spells',
  features: 'Features',
  inventory: 'Inventory',
  defences: 'Defences',
  familiars: 'Familiars',
}

/**
 * One character's sheet, at `/characters/:path`.
 *
 * The parameter is the note's **vault path**, url-encoded, not a slug. A
 * character is identified by its `vc_ddb_id` frontmatter and may live anywhere
 * in the vault (see `content/characters.ts`), so there is no folder to make a
 * slug unique against — two notes called `Gibbs.md` in different folders are
 * two different characters, and a slug would collapse them.
 *
 * It reads from the roster rather than loading the note itself, so arriving
 * here from the party page costs nothing: the sheet is already in hand. The
 * *vitals* are read separately (`useVitals`), because they are the half of the
 * sheet that writes — and after a write the vault's change event is what brings
 * them back, not React state.
 *
 * The path comes from `useLocation`, not `useParams`. `App.tsx` dispatches on a
 * pathname cascade rather than `<Routes>`/`<Route>` — the decision ported from
 * `apps/vault/src/App.jsx` — and `useParams` is only populated by a matched
 * `<Route>`. Reading the pathname directly keeps the cascade intact instead of
 * introducing a second routing mechanism for one page.
 *
 * ## A pinned strip over tabs (MYDND-44)
 *
 * It was one long scroll — vitals, XP, the sheet, spells, inventory, the log —
 * with every section the same weight. Now `PlayStrip` stays put and the rest is
 * the web sheet's tab card: Combat, Spells, Features, Inventory.
 *
 * **Every tab keeps its own scroll position.** Each panel is its own
 * `.my-dnd-vault__scroll` and stays mounted, hidden with the `hidden`
 * attribute, so switching away from a long spell list and back does not lose
 * the place. The `hidden` element carries no display utility on purpose: a
 * utility is compiled `!important` and would beat the attribute's
 * `display: none`, so the panel's layout is on a child.
 */
export default function CharacterSheetPage() {
  const { pathname } = useLocation()
  const notePath = pathname.startsWith(CHARACTER_SHEET_PREFIX)
    ? decodeURIComponent(pathname.slice(CHARACTER_SHEET_PREFIX.length))
    : null
  const { entries, loading } = useRoster()
  const link = useRouteLink()
  const generation = useVaultGeneration()
  const { importCharacter, rebuildVaultCharacter } = useStateHost()
  const content = useContent()
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [tab, setTab] = useState<SheetTab>('combat')

  const entry = entries.find(e => e.path === notePath) ?? null
  const { vitals, projected, effects, actions, busy } = useVitals(notePath, entry?.sheet ?? null, generation)
  const coverage = describeEffectCoverage(effects.effects)
  // A Vault character's own fence, for its familiars (MYDND-51).
  const vaultJson = useVaultCharacterJson(notePath ?? '', !!entry && isLocalId(entry.ddbId), generation)
  const familiars = familiarsOf(vaultJson)
  const benefits = useActivatableBenefits(entry?.sheet ?? null, effects.effects, vitals.activeEffects)
  // What each roll is advantaged or disadvantaged by right now (MYDND-45).
  const modes = useMemo(
    () => rollModes(effects.effects, vitals.activeEffects, vitals.conditions),
    [effects.effects, vitals.activeEffects, vitals.conditions],
  )

  // The root carries the width ref on every path. The two roots are different
  // elements — the loaded one sits inside `RollModeProvider` — which is fine
  // because `useElementWidth`'s ref follows whichever is attached (MYDND-53).
  if (!entry?.sheet) {
    return (
      <div ref={ref} className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-background-modifier-border px-4 py-2">
          <button type="button" {...link('/characters')} className="btn-ui-link">
            ← Characters
          </button>
        </div>
        <div className="my-dnd-vault__scroll flex flex-col gap-4 p-4">
          {entry ? (
            // Listed rather than hidden, with the reason and a way out — the same
            // rule the roster follows. A character that needs fixing must not be
            // invisible.
            <p className="text-smaller text-error">
              This note has no readable sheet ({entry.error}). Re-sync it, or fix the charsheet block in the note.
            </p>
          ) : loading ? (
            <p className="text-smaller text-muted">Reading the vault…</p>
          ) : (
            <p className="text-smaller text-muted">
              No character note at <code>{notePath}</code>.
            </p>
          )}
        </div>
      </div>
    )
  }

  const sheet = entry.sheet
  const character = { name: sheet.name, notePath: entry.path }
  const resources = Array.isArray(sheet.class_resources) ? sheet.class_resources : []
  const missing = resourcesMissing(sheet)
  const tabs: SheetTab[] = [
    'combat',
    ...(hasSpellPanel(sheet) ? (['spells'] as const) : []),
    'features',
    'inventory',
    'defences',
    // Only a character with one, as the web sheet shows the tab (MYDND-51).
    ...(familiars.length > 0 ? (['familiars'] as const) : []),
  ]
  // A tab that stopped existing (a re-sync that removed the last spell) falls
  // back to Combat rather than showing nothing.
  const active = tabs.includes(tab) ? tab : 'combat'

  return (
    <RollModeProvider value={modes}>
      <div ref={ref} className="flex min-h-0 flex-1 flex-col">
        <PlayStrip
          entry={entry}
          sheet={sheet}
          vitals={projected}
          actions={actions}
          busy={busy}
          compact={active !== 'combat'}
          width={width}
          stateRow={<StateRow vitals={vitals} benefits={benefits} actions={actions} busy={busy} />}
          concentration={vitals.concentration}
          form={vitals.wildShape}
        />

        <div
          role="group"
          aria-label="Sheet sections"
          className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-background-modifier-border bg-background-secondary px-2"
        >
          {tabs.map(t => (
            <button
              key={t}
              type="button"
              aria-current={active === t ? 'true' : undefined}
              aria-controls={`sheet-panel-${t}`}
              className={active === t ? 'sheet-tab-active' : 'sheet-tab'}
              onClick={() => setTab(t)}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        <TabPanel id="combat" active={active}>
          <ActiveBenefits benefits={benefits} onToggle={actions.toggle} busy={busy} />
          {resources.length > 0 || projected.hitDice.length > 0 || missing ? (
            <Block title="Resources" hint="click a pip to spend">
              {missing ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-smaller text-warning">
                    This sheet was {missing === 'resync' ? 'imported' : 'projected'} before it counted class resources.
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void (missing === 'resync'
                        ? importCharacter(entry.ddbId, entry.path)
                        : rebuildVaultCharacter(entry.path))
                    }
                  >
                    {missing === 'resync' ? 'Re-sync' : 'Rebuild sheet'}
                  </button>
                </div>
              ) : null}
              <div className="panel-container bg-background-secondary">
                <ResourceRows
                  resources={resources}
                  used={vitals.featureUsesUsed}
                  actions={actions}
                  character={character}
                  busy={busy}
                />
                <HitDiceRows
                  vitals={projected}
                  actions={actions}
                  character={character}
                  busy={busy}
                  conMod={conModOf(sheet)}
                />
              </div>
            </Block>
          ) : null}
          <ActionList
            sheet={sheet}
            extra={({ name, formula, rollType, damageType }) => {
              const r = resourceFor(resources, name)
              return r ? (
                <UseButton
                  resource={r}
                  used={vitals.featureUsesUsed[r.key] ?? 0}
                  formula={formula}
                  label={name}
                  character={character}
                  busy={busy}
                  onSpend={() => actions.spendUse(r.key, r.uses)}
                  rollType={rollType}
                  damageType={damageType}
                />
              ) : null
            }}
          />
          <Block title="Abilities" hint="mod rolls the check, save the save">
            <AbilityCards sheet={sheet} width={width} />
          </Block>
          <Block title="Skills" hint="proficient in bold">
            <SkillList sheet={sheet} width={width} />
          </Block>
          <RollHint />
          <RollLog />
        </TabPanel>

        {tabs.includes('spells') ? (
          <TabPanel id="spells" active={active}>
            <SpellPanel
              sheet={sheet}
              notePath={entry.path}
              vitals={vitals}
              actions={actions}
              busy={busy}
              generation={generation}
            />
          </TabPanel>
        ) : null}

        <TabPanel id="features" active={active}>
          <Block title="Level">
            <XpProgressBar
              xp={projected.xp}
              level={sheet.level}
              onAward={actions.awardXp}
              onStart={actions.startTrackingXp}
              busy={busy}
              showAward={false}
            />
            <LevelUp notePath={entry.path} ddbId={entry.ddbId} xp={projected.xp} level={sheet.level} />
          </Block>

          <WildShapePanel
            sheet={sheet}
            vitals={vitals}
            busy={busy}
            onShape={actions.shapeInto}
            onRevert={actions.revertShape}
          />

          <FeatureList
            sheet={sheet}
            extraFeats={vitals.feats}
            vault={vaultJson && notePath ? { json: vaultJson, notePath } : null}
          />

          {effects.resolved.length > 0 || effects.unknown.length > 0 ? (
            <Block title="Feat effects">
              {effects.resolved.length > 0 ? (
                <span className="text-smaller text-muted">
                  {effects.resolved.join(', ')} — {coverage.wired} of {coverage.total} effects are acted on.
                  {coverage.wired < coverage.total
                    ? ' The rest are read and displayed only; only dice interventions are wired.'
                    : ''}
                </span>
              ) : null}
              {/* Reported rather than dropped: a misspelled feat and an
                unexported catalog look identical from here, and both are
                things the GM can fix once something says the name went
                nowhere. */}
              {effects.unknown.length > 0 ? (
                <span className="text-smaller text-warning">
                  No note in <code>{content.ruleFolder('feats')}/</code> for {effects.unknown.join(', ')} — run <code>npm run export:lore</code>
                  , or correct the name in the <code>vault-vitals</code> block.
                </span>
              ) : null}
            </Block>
          ) : null}
        </TabPanel>

        <TabPanel id="inventory" active={active}>
          <CharacterInventory entry={entry} roster={entries} />
        </TabPanel>

        {familiars.length > 0 ? (
          <TabPanel id="familiars" active={active}>
            <FamiliarsTab
              familiars={familiars}
              vitals={vitals}
              busy={busy}
              onHurt={actions.hurtFamiliar}
              notePath={entry.path}
              tamerLevel={tamerLevelOf(vaultJson)}
              pb={sheet.proficiency_bonus ?? 2}
            />
          </TabPanel>
        ) : null}

        <TabPanel id="defences" active={active}>
          <DefencesTab
            sheet={sheet}
            vitals={vitals}
            effects={effects.effects}
            busy={busy}
            actions={{
              setDefense: actions.setDefense,
              clearDefense: actions.clearDefense,
              rebuild: () =>
                void (isLocalId(entry.ddbId)
                  ? rebuildVaultCharacter(entry.path)
                  : importCharacter(entry.ddbId, entry.path)),
            }}
          />
        </TabPanel>
      </div>
    </RollModeProvider>
  )
}

/**
 * One tab's scroller. Always mounted, so it keeps its scroll position; hidden
 * by the attribute, with the layout on a child because a display utility would
 * override `hidden` (see the page's note).
 */
function TabPanel({ id, active, children }: { id: SheetTab; active: SheetTab; children: ReactNode }) {
  return (
    <div
      id={`sheet-panel-${id}`}
      hidden={active !== id}
      className="my-dnd-vault__scroll"
    >
      <div className="flex flex-col gap-5 p-3">{children}</div>
    </div>
  )
}

/** The sheet's Constitution modifier, which every spent hit die adds (MYDND-75). */
function conModOf(sheet: { abilities?: readonly { label: string; mod: number }[] | null }): number {
  const con = Array.isArray(sheet.abilities) ? sheet.abilities.find(a => a.label === 'CON') : undefined
  return typeof con?.mod === 'number' && Number.isFinite(con.mod) ? con.mod : 0
}
