import { highestSlot, type Progression } from '../catalog/classShelves'

/**
 * A class's level table as the canvas draws it (MYDND-86): LVL · PB · FEATURES,
 * the class's own columns (Cantrips, Prepared Spells, Rages…), and the spell
 * slots as a row of pips, one per slot level the table ever reaches. Subclass
 * levels are tinted; the chosen character's level is outlined.
 *
 * The table is the class note's own markdown table, read by
 * `readProgression`; nothing here is a rule.
 */
export function ClassProgression({
  progression,
  hereLevel,
  limit,
}: {
  progression: Progression
  /** The level to mark "is here"; null for none. */
  hereLevel: number | null
  /** Draw rows up to this level; null for all. */
  limit: number | null
}) {
  const rows = limit === null ? progression.rows : progression.rows.filter(r => r.level <= limit)
  // Only the slot levels the drawn rows reach: a wizard's first ten levels stop at 5th.
  const slots = highestSlot({ ...progression, rows })
  return (
    <table className="bst-ptable">
      <thead>
        <tr>
          <th scope="col">LVL</th>
          <th scope="col">PB</th>
          <th scope="col">FEATURES</th>
          {progression.extraHeaders.map(h => (
            <th key={h} scope="col" className="bst-ptable-num">
              {h.toUpperCase()}
            </th>
          ))}
          {slots > 0 && <th scope="col">SLOTS 1–{slots}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const here = r.level === hereLevel
          const cls = ['bst-ptable-row', r.subclass ? 'bst-ptable-row--sub' : '', here ? 'bst-ptable-row--here' : '']
            .filter(Boolean)
            .join(' ')
          return (
            <tr key={r.level} className={cls} aria-current={here ? 'true' : undefined}>
              <th scope="row" className="bst-mono">
                {r.level}
              </th>
              <td className="bst-mono bst-muted">{r.pb}</td>
              <td className="bst-ptable-features">{r.features || '—'}</td>
              {r.extra.map(c => (
                <td key={c.header} className="bst-mono bst-ptable-num">
                  {c.value}
                </td>
              ))}
              {slots > 0 && (
                <td>
                  <span className="bst-ptable-slots" aria-label={slotLabel(r.slots)}>
                    {Array.from({ length: slots }, (_, i) => {
                      const n = r.slots[i] ?? 0
                      return (
                        <span key={i} aria-hidden="true" className={n > 0 ? 'bst-ptable-slot bst-ptable-slot--on' : 'bst-ptable-slot'}>
                          {n > 0 ? n : '–'}
                        </span>
                      )
                    })}
                  </span>
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']
const slotLabel = (slots: number[]): string =>
  slots
    .map((n, i) => (n > 0 ? `${n} ${ORD[i]}` : null))
    .filter(Boolean)
    .join(', ') || 'no slots'
