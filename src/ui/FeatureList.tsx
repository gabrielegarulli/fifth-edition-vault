import { useMemo } from 'react'

import { useContent } from '../ContentContext'
import type { FenceFeature, SubclassRow } from '../content/classes'
import { byFeatName } from '../content/feats'
import type { Sheet } from '../ddb/sheet'
import { useDetails } from '../hooks/useDetails'
import { useCatalogRows } from '../hooks/useVaultGeneration'
import { featureSources, picksAt } from '../sheet/features'
import { choicePicks } from '../builder/choices'
import { featureId, followedChoices } from '../vaultCharacter/bake'
import type { VaultCharacterJson } from '../vaultCharacter/fence'
import { Block } from './CharacterSheet'
import { FeatEditor } from './FeatEditor'
import { Markdown } from './Markdown'

/**
 * The Features tab's list (MYDND-50): every class, subclass, species and feat
 * feature the character has, with its text — the web sheet's `FeaturesTab`.
 *
 * Before this the pane said one line under the inventory: "Feat effects — N of
 * M are acted on". The text was in the vault all along, in the notes the plugin
 * already reads for the builder and the catalogs; `sheet/features.ts` says
 * which notes, and this reads them.
 *
 * Each feature is a native `<details>`: closed by default, because a level-13
 * Bard has forty of them and the list is for finding one, not for reading all.
 */

const ROW =
  'border-b border-background-modifier-border px-2.5 py-1.5 last:border-b-0 [&_summary]:cursor-pointer [&_summary]:text-normal'

function FeatureRow({
  title,
  meta,
  picks = [],
  markdown,
  sourcePath,
}: {
  title: string
  meta?: string
  /**
   * What the player picked here (MYDND-53). On the summary line, so it reads
   * with the row closed: the note's text only says "choose".
   */
  picks?: readonly string[]
  markdown: string
  sourcePath: string
}) {
  return (
    <details className={ROW}>
      <summary>
        <span className="font-medium">{title}</span>
        {meta ? <span className="text-smallest text-faint"> · {meta}</span> : null}
        {picks.length > 0 ? (
          <span className="text-smaller text-accent" title="Chosen for this character">
            {' '}
            — {picks.join(', ')}
          </span>
        ) : null}
      </summary>
      <div className="pt-1.5 text-muted">
        {markdown.trim() ? (
          <Markdown markdown={markdown} sourcePath={sourcePath} />
        ) : (
          <span className="text-faint">No text in the note.</span>
        )}
      </div>
    </details>
  )
}

/** Every answer one class or subclass note's features hold, followers included. */
function vaultAnswers(
  ownerId: string,
  fence: { features?: FenceFeature[] } | null,
  json: VaultCharacterJson,
): Record<string, unknown> {
  const rows = (fence?.features ?? []).map(f => ({ ...f, id: featureId(ownerId, f) }) as Record<string, unknown>)
  return { ...followedChoices(rows, json.featureChoices), ...(json.featureChoices ?? {}) }
}

/** One empty list, so the default does not change identity on every render. */
const NO_FEATS: readonly string[] = []

export function FeatureList({
  sheet,
  extraFeats = NO_FEATS,
  vault = null,
}: {
  sheet: Sheet
  extraFeats?: readonly string[]
  /** A Vault character's choices and note — feats can be added and removed (MYDND-58). */
  vault?: { json: VaultCharacterJson; notePath: string } | null
}) {
  const content = useContent()
  const classRows = useCatalogRows(() => content.classes.list())
  const subclassRows = useCatalogRows(() => content.subclasses.list())
  const speciesRows = useCatalogRows(() => content.species.list())
  const featRows = useCatalogRows(() => content.feats.list())

  const sources = useMemo(
    () =>
      featureSources(
        sheet,
        {
          classes: classRows,
          subclasses: subclassRows,
          species: speciesRows,
          // The catalog's own name rule (title, alias, filename), over the rows
          // in hand — `content.feats.byName` would walk the folder per name.
          feats: { byName: name => byFeatName(featRows, name) },
        },
        extraFeats,
      ),
    [sheet, classRows, subclassRows, speciesRows, featRows, extraFeats],
  )

  const classIds = sources.classes.filter(s => s.kind === 'class').map(s => s.id)
  const subclassIds = sources.classes.filter(s => s.kind === 'subclass').map(s => s.id)
  const { details: classDetails } = useDetails(content.classes, classIds)
  const { details: subclassDetails } = useDetails(content.subclasses, subclassIds)
  const { details: speciesDetails } = useDetails(content.species, sources.species ? [sources.species.id] : [])
  const { details: featDetails } = useDetails(
    content.feats,
    sources.feats.map(f => f.id),
  )

  const nothing = sources.classes.length === 0 && !sources.species && sources.feats.length === 0
  if (nothing && sources.missing.length === 0) return null

  return (
    <>
      {sources.classes.map(src => {
        const detail = src.kind === 'class' ? classDetails.get(src.id) : subclassDetails.get(src.id)
        const row =
          src.kind === 'class' ? classRows.find(r => r.id === src.id) : subclassRows.find(r => r.id === src.id)
        const features = ((detail?.fence as { features?: FenceFeature[] } | null)?.features ?? [])
          // An option of another feature (an invocation, a fighting style) is
          // a choice the character made or did not; it is not a feature they have.
          .filter(f => !f.data?.optionOf && f.level <= src.level)
          .sort((a, b) => a.level - b.level)
        // D&D Beyond files a subclass's picks under its class (MYDND-53).
        const owner = src.kind === 'class' ? src.name : ((row as SubclassRow | undefined)?.className ?? '')
        // A Vault character's picks are its own answers, keyed as the builder keys
        // them, with the ones that follow another pick resolved as the bake does
        // (MYDND-181). Before this the list showed none of them.
        const answers = vault ? vaultAnswers(src.id, detail?.fence as { features?: FenceFeature[] } | null, vault.json) : null
        return (
          <Block key={`${src.kind}-${src.id}`} title={src.kind === 'class' ? `${src.name} ${src.level}` : src.name}>
            <div className="panel-container bg-background-secondary">
              {features.length === 0 ? (
                <div className="px-2.5 py-1.5 text-faint">
                  {detail === undefined ? 'Reading…' : 'No features in the note.'}
                </div>
              ) : (
                features.map((f, i) => (
                  <FeatureRow
                    key={`${f.name}-${f.level}-${i}`}
                    title={f.name}
                    meta={`level ${f.level}`}
                    picks={answers ? choicePicks(answers[featureId(src.id, f)]) : picksAt(sheet, owner, f.name, f.level)}
                    markdown={f.description ?? ''}
                    sourcePath={row?.path ?? ''}
                  />
                ))
              )}
            </div>
          </Block>
        )
      })}

      {sources.species ? (
        <Block title={sources.species.name}>
          <div className="panel-container bg-background-secondary">
            {(speciesDetails.get(sources.species.id)?.fence?.traits ?? []).map((t, i) => (
              <FeatureRow
                key={`${t.name}-${i}`}
                title={t.name ?? 'Trait'}
                markdown={t.text ?? ''}
                sourcePath={sources.species?.path ?? ''}
              />
            ))}
          </div>
        </Block>
      ) : null}

      {sources.feats.length > 0 || vault ? (
        <Block title="Feats">
          {sources.feats.length > 0 ? (
            <div className="panel-container bg-background-secondary">
              {sources.feats.map(f => (
                <FeatureRow key={f.id} title={f.name} markdown={featDetails.get(f.id)?.prose ?? ''} sourcePath={f.path} />
              ))}
            </div>
          ) : null}
          {vault ? <FeatEditor json={vault.json} notePath={vault.notePath} sheet={sheet} /> : null}
        </Block>
      ) : null}

      {sources.missing.length > 0 ? (
        <p className="text-smaller text-warning">
          No note for {sources.missing.join(', ')} — run <code>npm run export:lore</code>, or correct the name.
        </p>
      ) : null}
    </>
  )
}
