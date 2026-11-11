import { useState } from 'react'

import { filterRoster, formatRelativeTime, type RosterEntry } from '../content/index'
import { useAtlasReady } from '../dice/useRoll'
import { useElementWidth } from '../hooks/useElementWidth'
import { useRoster } from '../hooks/useRoster'
import { isLocalId } from '../state/characters'
import { useStateHost } from '../StateContext'
import { CardActions, CharacterCard, hpTone, Portrait, type ImportFn } from '../ui/CharacterCard'
import { PartyInitiativeButton } from '../ui/PartyInitiative'
import { BUILDER_NEW_PATH, sheetPath } from '../routes'
import { useGo, useRouteLink } from '../pane'

/**
 * The party roster — every character in the vault as a card.
 *
 * Ported from `obsidian-vault-characters`' section 8 (MYDND-7), where it was a
 * second `ItemView` drawing plain DOM. It is a route in the one pane now, which
 * is the whole point of the absorption: one plugin, one pane, one set of
 * navigation.
 *
 * Three things survive verbatim because they are decisions:
 *
 * - **A note with an unreadable sheet is still listed**, with the reason and a
 *   Re-sync button. Hiding it would make the character that needs fixing
 *   invisible (invariant 4).
 * - **Party initiative is one click**, and every roll is its own labelled entry
 *   in Atlas' log, so the table sees the same numbers the GM does.
 * - **Re-sync all goes one at a time**, so D&D Beyond is not hit in parallel.
 *
 * What is gone is the hand-managed focus bug the original had to work around:
 * it rebuilt the whole view on every keystroke and had to keep the search box
 * out of the rebuild to avoid dropping the caret. React keeps the input
 * mounted, so the filter is just state.
 */
export default function CharactersPage() {
  const { entries, loading } = useRoster()
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<Source>('all')
  const go = useGo()
  const { importCharacter } = useStateHost()
  const atlasReady = useAtlasReady()
  const [paneRef, width] = useElementWidth<HTMLDivElement>()
  const narrow = width > 0 && width < WIDE_WIDTH

  const ddbCount = entries.filter(e => !isLocalId(e.ddbId)).length
  const vaultCount = entries.length - ddbCount
  const shown = filterRoster(entries, query).filter(e =>
    source === 'all' ? true : source === 'vault' ? isLocalId(e.ddbId) : !isLocalId(e.ddbId),
  )
  const filtered = query !== '' || source !== 'all'

  const filter =
    entries.length > 0 ? (
      <input
        type="search"
        aria-label="Filter characters"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Filter by name, species or class…"
        className={narrow ? 'bst-search' : 'bst-search bst-search--roster'}
      />
    ) : null

  return (
    <div ref={paneRef} className="bst">
      <header className={narrow ? 'bst-header bst-header--narrow' : 'bst-header'}>
        <div className="bst-titles">
          <h2 className="bst-title">Characters</h2>
          <span className="bst-count">
            {entries.length > 0
              ? `${entries.length} character${entries.length === 1 ? '' : 's'} in the party.`
              : loading
                ? 'Reading the vault…'
                : 'Gather your party.'}
          </span>
        </div>
        {entries.length > 0 && ddbCount > 0 && vaultCount > 0 && (
          <div role="group" aria-label="Source" className="bst-tabs">
            {(
              [
                ['all', 'All', null],
                ['ddb', 'D&D Beyond', ddbCount],
                ['vault', 'Vault', vaultCount],
              ] as const
            ).map(([id, label, n]) => (
              <button key={id} type="button" aria-pressed={source === id} className="bst-plain bst-tab bst-tab--pressable" onClick={() => setSource(id)}>
                {label}
                {n !== null && <span className="bst-tab-count">{n}</span>}
              </button>
            ))}
          </div>
        )}
        {!narrow && <span className="bst-spacer" />}
        {!narrow && filter}
        {entries.length > 0 ? (
          <div className={narrow ? 'bst-roster-actions bst-roster-actions--narrow' : 'bst-roster-actions'}>
            {null}
            <PartyInitiativeButton entries={entries} />
          </div>
        ) : null}
        {narrow && filter}
        {filtered && entries.length > 0 ? (
          <span className="bst-count">
            {shown.length} of {entries.length}
          </span>
        ) : null}
      </header>

      <div className={narrow ? 'my-dnd-vault__scroll' : 'my-dnd-vault__scroll bst-roster'}>
        {entries.length === 0 && !loading ? (
          <EmptyState onNewCharacter={() => go(BUILDER_NEW_PATH)} />
        ) : (
          <>
            {entries.length > 0 && <AddCard narrow={narrow} onNewCharacter={() => go(BUILDER_NEW_PATH)} />}
            {shown.length === 0 && entries.length > 0 ? (
              <p className="bst-empty bst-roster-full">
                <strong>No character matches “{query}”.</strong>
              </p>
            ) : null}
            {shown.map(entry =>
              narrow ? (
                <CharacterRow key={entry.path} entry={entry} onImport={importCharacter} />
              ) : (
                <CharacterCard key={entry.path} entry={entry} onImport={importCharacter} />
              ),
            )}
          </>
        )}

        <p className={atlasReady ? 'bst-note bst-roster-full bst-roster-foot' : 'bst-note bst-note--warn bst-roster-full bst-roster-foot'}>
          {atlasReady
            ? 'Click a number to roll it in the open Atlas scene. Shift = advantage, Alt = disadvantage.'
            : 'No Atlas VTT scene open — open a map and rolls will land there.'}
        </p>
      </div>
    </div>
  )
}

/** Below this the cards become rows (the canvas's narrow board). */
const WIDE_WIDTH = 640

type Source = 'all' | 'ddb' | 'vault'

function EmptyState({ onNewCharacter }: { onNewCharacter: () => void }) {
  return (
    <section aria-label="No characters yet" className="bst-addcard bst-roster-full">
      <strong className="bst-addcard-title">No characters yet</strong>
      <span className="bst-note">
        {'Create a character in the vault to see it here.'}
      </span>
      <ImportButton />
      <button type="button" className="bst-plain bst-btn-primary" onClick={onNewCharacter}>
        + New character
      </button>
    </section>
  )
}

/** The roster's first card: import a D&D Beyond character, or build one in the vault. */
function AddCard({ narrow, onNewCharacter }: { narrow: boolean; onNewCharacter: () => void }) {
  return (
    <section aria-label="Add a character" className={narrow ? 'bst-addcard bst-addcard--narrow' : 'bst-addcard'}>
      <strong className="bst-addcard-title">Add a character</strong>
      <span className="bst-note">
        {'Build a character in the vault.'}
      </span>
      <ImportButton />
      <button type="button" className="bst-plain bst-btn-primary" onClick={onNewCharacter}>
        + New character
      </button>
    </section>
  )
}

/**
 * Asks for a URL or id inline rather than opening Obsidian's modal.
 *
 * The command still opens the modal — that is the right shape when the pane is
 * not even open. Here the pane *is* open and a field in it is one less layer.
 *
 * Since MYDND-105 it opens the conversion review rather than importing: the
 * character arrives as a Vault character, and nothing is written until the
 * review's Convert.
 */
function ImportButton() {
  // The SRD edition reaches no server, so it has no import (MYDND-133).
  return null
}


/** The narrow pane's row: portrait, name and line, AC and source, the HP bar under them. */
function CharacterRow({ entry, onImport }: { entry: RosterEntry; onImport: ImportFn }) {
  const link = useRouteLink()
  const sheet = entry.sheet
  const local = isLocalId(entry.ddbId)
  const hp = sheet?.hp
  const tone = hp ? hpTone(hp.current, hp.max) : 'full'
  return (
    <article aria-label={entry.name} className={sheet ? 'bst-crow' : 'bst-crow bst-crow--broken'}>
      <button type="button" {...link(sheetPath(entry.path))} className="bst-plain bst-crow-open">
        <Portrait entry={entry} size="md" />
        <span className="bst-row-main">
          <span className="bst-row-name">{entry.name}</span>
          <span className="bst-row-kind">{sheet ? [sheet.race, sheet.classes].filter(Boolean).join(' · ') : `synced ${formatRelativeTime(entry.synced)}`}</span>
        </span>
        <span className="bst-row-cr">
          <span className="bst-row-crv">{sheet && typeof sheet.ac === 'number' ? `AC ${sheet.ac}` : ''}</span>
          <span className="bst-row-moves">{local ? 'VAULT' : 'DDB'}</span>
        </span>
      </button>
      {hp ? (
        <span className="bst-crow-hp">
          <span className="bst-hp-bar">
            <span className={`bst-hp-fill bst-hp-fill--${tone}`} style={{ width: `${Math.max(0, Math.min(100, (hp.current / Math.max(1, hp.max)) * 100))}%` }} />
          </span>
          <span className={`bst-hp-value bst-hp-value--${tone}`}>{`${hp.current}/${hp.max}`}</span>
        </span>
      ) : (
        <span className="bst-crow-broken">
          Sheet unreadable ({entry.error}).
          <CardActions entry={entry} onImport={onImport} compact />
        </span>
      )}
    </article>
  )
}
