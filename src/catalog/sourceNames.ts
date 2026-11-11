const OFFICIAL: Readonly<Record<string, string>> = {}

const THIRD_PARTY: Readonly<Record<string, string>> = {}

const SOURCE_NAMES: Readonly<Record<string, string>> = { ...OFFICIAL, ...THIRD_PARTY }

export const sourceLabel = (source: string): string => (Object.hasOwn(SOURCE_NAMES, source) ? SOURCE_NAMES[source] : source)

const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .toLowerCase()

/** Whether a source answers a search, by every word of it, in its title or its key. */
export function sourceMatches(query: string, source: string): boolean {
  const title = fold(sourceLabel(source))
  const key = fold(source)
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every(word => title.includes(word) || key.includes(word))
}
