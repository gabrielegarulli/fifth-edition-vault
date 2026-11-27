// The sheet's Details tab: who the character is, read-only (MYDND-275).

import { LONG_DETAILS, SHORT_DETAILS, type CharacterDetails } from '../../characterModel'
import { Markdown } from '../../platform/host'
import { Block, LABEL } from './CharacterSheet'

/**
 * What the builder's Background step asks beside the rules (MYDND-216):
 * alignment, faith, lifestyle, appearance, and the long ones (traits, ideals,
 * bonds, flaws, backstory…). They live in the note itself, not the fence
 * (`characterModel/.../details.ts`), so before this the sheet never showed
 * them: a player had to open the raw note or the builder to read their own
 * backstory.
 *
 * Read-only on purpose. The note is where they are edited, in Obsidian or in
 * the builder; a second editor here would be a second writer of the same
 * region for no gain.
 */
export function DetailsTab({
  details,
  background,
  notePath,
}: {
  details: CharacterDetails
  background: string | null
  notePath: string
}) {
  const short = SHORT_DETAILS.filter(({ key }) => details[key])
  const long = LONG_DETAILS.filter(({ key }) => details[key])

  return (
    <>
      {background || short.length > 0 ? (
        <Block title="Character">
          <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
            {background ? (
              <div className="contents">
                <dt className={LABEL}>Background</dt>
                <dd className="m-0 text-smaller text-normal">{background}</dd>
              </div>
            ) : null}
            {short.map(({ key, label }) => (
              <div key={key} className="contents">
                <dt className={LABEL}>{label}</dt>
                <dd className="m-0 text-smaller text-normal">{details[key]}</dd>
              </div>
            ))}
          </dl>
        </Block>
      ) : null}

      {long.map(({ key, label }) => (
        <Block key={key} title={label}>
          <Markdown markdown={details[key] ?? ''} sourcePath={notePath} className="text-smaller text-normal" />
        </Block>
      ))}

      {short.length === 0 && long.length === 0 ? (
        <p className="m-0 text-smaller text-muted">
          No details yet. The builder&rsquo;s Background step asks for them, and they are written to the note, where you can edit
          them too.
        </p>
      ) : null}
    </>
  )
}
