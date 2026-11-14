// Home, at /: the library, the table (encounter, party, log, notes) and the
// workshop.

import { useState, type ReactNode } from 'react'

import { CATALOG_KEYS, catalogCounts, type CatalogKey } from '../../compendium'
import { useCompendium } from '../../compendium/host'
import { atlasAvailable } from '../../dice/host'
import {
  useActiveCampaign,
  useElementWidth,
  openNote,
  useObsidian,
  useRouteLink,
  usePlatform,
  Icon,
  LibraryIcon,
} from '../../platform/host'
import { useActivityLog, useEncounter, useSessions } from '../../gm/host'
import { useRoster, useCharacters, CharacterCard, CharacterLines } from '../../characters/host'
import { PLUGIN_TITLE, destinationFor, dayKey } from '../../platform'
import { useSrdNotes } from './context'
import { SrdSetupCard } from '../../catalogs/host'
import type { LibraryIconName } from '../../platform/host'
import { logTone } from '../../gm'

/**
 * Home, at `/` — the campaign desk (MYDND-98).
 *
 * The "Home · the campaign desk" board of the all-sections canvas: the
 * **library** (every catalog, counted, each a way in), **at the table** (the
 * encounter if one is running, the party as rows or as the roster's cards,
 * today's log, the latest session note) and the **workshop** (harvesting, crafting, the
 * shop, and the campaign's rules). Everything on it is read through the hooks
 * the pages it links to already use, so the desk never says something its page
 * would not.
 *
 * It writes nothing of its own. The party's cards carry the roster's actions
 * (Re-sync, Rebuild), which write exactly as they do on `/characters`. "New
 * session note" goes to `/gm/notes`, which owns the write, rather than creating
 * a note from here.
 */
export default function HomePage() {
  const app = useObsidian()
  const compendium = useCompendium()
  const link = useRouteLink()
  const { activeCampaignId } = usePlatform()
  const { importCharacter } = useCharacters()
  const srdNotes = useSrdNotes()
  const campaign = useActiveCampaign()
  const { entries, loading } = useRoster()
  const { encounter } = useEncounter()
  const { entries: logEntries, today } = useActivityLog(1)
  const { sessions } = useSessions()
  const [paneRef, width] = useElementWidth<HTMLDivElement>()
  const narrow = width > 0 && width < WIDE_WIDTH
  // Rows unless asked for cards (MYDND-135): a party of six as cards is most
  // of a screen. Not remembered — like the lens's party, it is tonight's view.
  const [party, setParty] = useState<'rows' | 'cards'>('rows')

  const counts = catalogCounts(compendium)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  // --- the library ----------------------------------------------------------

  const library = (
    <section aria-label="Library" className="bst-hm-col">
      <div className="bst-hm-head">
        <h3 className="bst-hm-h">Library</h3>
        <span className="bst-mono bst-muted">{`${total.toLocaleString()} notes`}</span>
      </div>
      {/* The SRD edition's first run: Obsidian installs none of the notes (MYDND-185). */}
      {srdNotes ? <SrdSetupCard srd={srdNotes} total={total} /> : null}
      <div className="bst-hm-lib">
        {CATALOG_KEYS.filter(k => k !== 'subclasses').map(key => {
          const { label, path, note, icon, tone } = CATALOGS[key]
          const sub = key === 'classes' ? `${counts.subclasses.toLocaleString()} subclasses` : note
          const body = (
            <>
              <span aria-hidden="true" className={`bst-hm-libtile bst-hm-libtile--${path ? tone : 'none'}`}>
                {icon}
              </span>
              {/* The spaces draw nothing in a flex row. They are the button's name: "Spells (1,157)", not "Spells(1,157)". */}
              <span className="bst-hm-liblabel">{label}</span>{' '}
              <span className="bst-hm-libcount">{`(${counts[key].toLocaleString()})`}</span>{' '}
              {sub ? <span className="bst-hm-libnote">{sub}</span> : null}
            </>
          )
          return path ? (
            <button key={key} type="button" {...link(path)} className="bst-plain bst-hm-libcard">
              {body}
            </button>
          ) : (
            <div key={key} className="bst-hm-libcard bst-hm-libcard--off">
              {body}
            </div>
          )
        })}
      </div>
      <Provenance total={total} />
    </section>
  )

  // --- at the table ---------------------------------------------------------

  const combatants = encounter.combatants
  const acting = encounter.started ? (combatants[encounter.turnIndex] ?? null) : null
  const next = encounter.started && combatants.length > 1 ? combatants[(encounter.turnIndex + 1) % combatants.length] : null
  const standing = combatants.filter(c => !(c.maxHp > 0 && c.hp <= 0)).length
  const latest = sessions[0] ?? null
  // Bucketed by the local day, as `/gm/log` buckets them: `at` is UTC.
  const todays = logEntries.filter(e => dayKey(new Date(e.at)) === today).slice(-6).reverse()

  const table = (
    <section aria-label="At the table" className="bst-hm-col bst-hm-col--table">
      <div className="bst-hm-head">
        <h3 className="bst-hm-h">At the table</h3>
        <span className="bst-note">
          {[
            campaign?.name ?? 'No campaign open',
            latest?.session != null ? `session ${latest.session}` : null,
            new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {entries.length > 0 ? (
          <span role="group" aria-label="Show the party as" className="bst-hm-view">
            <button type="button" aria-label="Cards" title="Cards" aria-pressed={party === 'cards'} onClick={() => setParty('cards')} className="bst-plain bst-hm-viewbtn">
              <Icon name="layout-grid" />
            </button>
            <button type="button" aria-label="Rows" title="Rows" aria-pressed={party === 'rows'} onClick={() => setParty('rows')} className="bst-plain bst-hm-viewbtn">
              <Icon name="list" />
            </button>
          </span>
        ) : null}
      </div>

      {encounter.started ? (
        <button type="button" {...link('/gm/encounter')} className="bst-plain bst-hm-fight">
          <span aria-hidden="true" className="bst-hm-fight-tile">
            <Icon name="swords" />
          </span>
          <span className="bst-hm-fight-text">
            <strong>{`Encounter in progress · Round ${encounter.round}`}</strong>
            <span className="bst-hm-fight-sub">
              {[
                acting ? `${acting.name}’s turn` : null,
                next ? `next: ${next.name}` : null,
                `${standing} of ${combatants.length} standing`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
          <span className="bst-hm-fight-go">Resume</span>
        </button>
      ) : null}

      {entries.length > 0 && party === 'rows' ? (
        <CharacterLines entries={entries} onImport={importCharacter} />
      ) : entries.length > 0 ? (
        // The roster's own card (MYDND-132), so the desk and /characters
        // cannot draw a character differently.
        <div className="bst-hm-party">
          {entries.map(e => (
            <CharacterCard key={e.path} entry={e} onImport={importCharacter} />
          ))}
        </div>
      ) : loading ? (
        <p className="bst-note">Reading the party…</p>
      ) : (
        <p className="bst-note">
          No characters yet —{' '}
          <button type="button" {...link('/characters')} className="bst-plain bst-link">
            import or build one
          </button>
          .
        </p>
      )}

      <div className="bst-fit bst-hm-pair">
        <section aria-label="Today's log" className="bst-hm-panel">
          <div className="bst-hm-panelhead">
            <h4 className="bst-label">Today&rsquo;s log</h4>
            <span className="bst-spacer" />
            <button type="button" {...link('/gm/log')} className="bst-plain bst-link">
              Open log →
            </button>
          </div>
          {!activeCampaignId ? (
            <p className="bst-note">Open a campaign in Settings and its log shows here.</p>
          ) : todays.length === 0 ? (
            <p className="bst-note">Nothing logged today.</p>
          ) : (
            <ol className="bst-hm-log">
              {todays.map((e, i) => (
                <li key={`${e.at}-${i}`} className="bst-hm-logrow">
                  <span className="bst-mono bst-hm-logtime">{new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className={`bst-log-chip bst-chip--${logTone(e.kind)}`}>{e.kind}</span>
                  <span className="bst-hm-logtext">{e.text}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-label="Session notes" className="bst-hm-panel">
          <div className="bst-hm-panelhead">
            <h4 className="bst-label">Session notes</h4>
            <span className="bst-spacer" />
            <button type="button" {...link('/gm/notes')} className="bst-plain bst-link">
              All notes →
            </button>
          </div>
          {latest ? (
            <button type="button" className="bst-plain bst-hm-session" onClick={() => openNote(app, latest.path)}>
              <strong>{latest.session != null ? `Session ${latest.session} — ${latest.title}` : latest.title}</strong>
              <span className="bst-note">{latest.date ?? 'Undated'}</span>
            </button>
          ) : (
            <p className="bst-note">No session notes yet.</p>
          )}
          <button type="button" {...link('/gm/notes')} className="bst-plain bst-hm-dashed">
            New session note
          </button>
        </section>
      </div>
    </section>
  )

  // --- the workshop ---------------------------------------------------------

  const workshop = (
    <section aria-label="Workshop" className="bst-hm-col">
      <div className="bst-hm-head">
        <h3 className="bst-hm-h">Workshop</h3>
      </div>
      {WORKSHOP.filter(w => destinationFor(w.path)).map(w => (
        <button key={w.path} type="button" {...link(w.path)} className="bst-plain bst-hm-work">
          <span aria-hidden="true" className={`bst-hm-libtile bst-hm-libtile--${w.tone}`}>
            <LibraryIcon name={w.icon} />
          </span>
          <span className="bst-hm-work-text">
            <strong>{w.label}</strong>
            <span className="bst-note">
              {/* The harvest log is private (MYDND-200): guarded in place, so the
                  SRD edition's fold drops the line's import with the branch. */}
              {(
                w.line
              )}
            </span>
          </span>
        </button>
      ))}
      <div className="bst-hm-panel bst-hm-rules">
        <h4 className="bst-label">Campaign rules</h4>
        {campaign ? (
          <>
            <span className="bst-hm-rule">
              <span>Magic item prices</span>
              <span className="bst-mono">{`${campaign.magicItemValuePercent}%`}</span>
            </span>
            <span className="bst-hm-rule">
              <span>Equipment</span>
              <span>{campaign.loadoutSystem ? 'loadout slots' : 'attunement'}</span>
            </span>
            {null}
          </>
        ) : (
          <span className="bst-note">No campaign open.</span>
        )}
        <span className="bst-hm-rule">
          <span>Dice land in</span>
          <span className={atlasAvailable(app) ? 'bst-hm-atlas' : 'bst-muted'}>
            {atlasAvailable(app) ? 'Atlas VTT' : 'this pane — Atlas is not open'}
          </span>
        </span>
        <button type="button" {...link('/settings')} className="bst-plain bst-link">
          Settings →
        </button>
      </div>
    </section>
  )

  return (
    <div ref={paneRef} className="bst">
      <header className={narrow ? 'bst-header bst-header--narrow' : 'bst-header'}>
        <h2 className="bst-title">{PLUGIN_TITLE}</h2>
        <span className="bst-hm-campaign">
          <span className="bst-mono bst-muted">CAMPAIGN</span>
          <strong>{campaign?.name ?? 'none open'}</strong>
        </span>
      </header>
      {narrow ? (
        <div className="my-dnd-vault__scroll bst-hm-narrow">
          {table}
          {workshop}
          {library}
        </div>
      ) : (
        <div className="bst-hm-board">
          <div className="my-dnd-vault__scroll">{library}</div>
          <div className="my-dnd-vault__scroll">{table}</div>
          <div className="my-dnd-vault__scroll">{workshop}</div>
        </div>
      )}
    </div>
  )
}

/** Below this the three columns stack, the table first (the narrow board). */
const WIDE_WIDTH = 1000

/**
 * Each catalog's name, its page if it has one, and what to say instead if it does
 * not. The `note` is spelled out per catalog rather than inferred from the count,
 * because the ones without a page are without one for different reasons and
 * guessing gets at least one of them wrong.
 *
 * The icons are the web app's (MYDND-163). It has none for conditions, so that
 * one stays Lucide's.
 */
const CATALOGS: Record<CatalogKey, { label: string; path: string | null; note?: string; icon: ReactNode; tone: string }> = {
  spells: { label: 'Spells', path: '/spells', icon: <LibraryIcon name="spells" />, tone: 'veryrare' },
  monsters: { label: 'Bestiary', path: '/monsters', icon: <LibraryIcon name="monsters" />, tone: 'legendary' },
  magicItems: { label: 'Magic items', path: '/magic-items', icon: <LibraryIcon name="magicItems" />, tone: 'rare' },
  items: { label: 'Items', path: '/items', icon: <LibraryIcon name="items" />, tone: 'uncommon' },
  feats: { label: 'Feats', path: '/feats', icon: <LibraryIcon name="feats" />, tone: 'artifact' },
  classes: { label: 'Classes', path: '/classes', icon: <LibraryIcon name="classes" />, tone: 'common' },
  subclasses: { label: 'Subclasses', path: null, note: 'inside Classes', icon: <LibraryIcon name="classes" />, tone: 'none' },
  species: { label: 'Species', path: null, note: 'no page yet', icon: <LibraryIcon name="species" />, tone: 'none' },
  backgrounds: { label: 'Backgrounds', path: null, note: 'no page yet', icon: <LibraryIcon name="backgrounds" />, tone: 'none' },
  conditions: { label: 'Conditions', path: null, note: 'no page yet', icon: <Icon name="eye" />, tone: 'none' },
}

const WORKSHOP: readonly { path: string; label: string; line: string; icon: LibraryIconName; tone: string }[] = [
  { path: '/harvesting', label: 'Harvesting', line: 'Nothing harvested yet — quarry, order, crew, checks.', icon: 'harvesting', tone: 'uncommon' },
  { path: '/crafting', label: 'Crafting', line: 'Forge, enchant and cook — the totals are typed in.', icon: 'crafting', tone: 'rare' },
  { path: '/gm/shop', label: 'Shop', line: 'The whole catalog is the shelf; a till settles in one go.', icon: 'shop', tone: 'legendary' },
]

/**
 * Where the library's counts come from. Until MYDND-188 this line also carried
 * Phase 0's smoke test (MYDND-1), "`@vault/derive` is wired — `rollDice(4, 20)` →
 * …", which proved the submodule resolved inside Obsidian. Every sheet and roll
 * proves that now, and it read as a developer's line on a player's first run.
 */
function Provenance({ total }: { total: number }) {
  return (
    <p className="bst-note bst-hm-provenance">
      {`Read from this vault's ${total.toLocaleString()} notes, with no network and no database. A zero names the folder it wants.`}
    </p>
  )
}
