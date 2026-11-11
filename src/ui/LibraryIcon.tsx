import { LIBRARY_ART, type LibraryIconName } from './libraryIcons.generated'

/**
 * One of Home's icons from `the-vault` (MYDND-163): the Library's and the
 * Workshop's, filled by `currentColor` so the tile's tone colours it. `Icon` is Obsidian's Lucide set; these are drawings of
 * the web app's own, which Lucide has no match for.
 */
export function LibraryIcon({ name }: { name: LibraryIconName }) {
  const { viewBox, paths } = LIBRARY_ART[name]
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} fill="currentColor" aria-hidden="true" data-library-icon={name}>
      {paths.map(d => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
