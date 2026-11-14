// @ts-check
// Fighting Styles: the Fighter's level 1 choice (and Paladin/Ranger's level 2
// one). In PHB 2024 a Fighting Style is a *feat*, so unlike Feature Options the
// candidates are not sibling class-feature rows — they are `content_feat` rows.
//
// Two shapes exist:
//   the nineteen general styles, `kind = 'fighting_style'` with no tag
//        — everyone with the feature can take them.
//   the two replacements, `tags @> {replacement}`
//        — one per class that gets a bespoke alternative (Paladin's Blessed
//          Warrior, Ranger's Druidic Warrior), offered only to that class.
//
// **Both used to be read off `data.category`** with a regex over strings like
// `"Fighting Style Replacement (Ranger) (Prerequisite: …)"`. VAULT-83 retired
// that column, so the kind comes from `kind` and the owning class from the
// `prerequisite` predicate tree — the only two rows in the catalog with one
// authored, and the reason it is authored at all: without it a Paladin would be
// offered the Ranger's style and the list would look entirely correct.
//
// The pick is stored with the ASI picker's `{type:'feat', featId, …}` shape, so
// it flows into json.feats and effect baking with no extra plumbing.

export const FIGHTING_STYLE_TYPE = 'fighting_style'

const REPLACEMENT_TAG = 'replacement'

/**
 * The part of a `content_feat` row these rules read.
 *
 * @typedef {{
 *   name?: string | null,
 *   kind?: string | null,
 *   tags?: readonly string[] | null,
 *   prerequisite?: { all?: readonly ({ class?: string | null } | null)[] | null, any?: readonly ({ class?: string | null } | null)[] | null } | null,
 * }} StyleFeat
 */

// True for both shapes — used to keep Fighting Styles out of lists they can
// never legally appear in (the ASI feat picker, most importantly: their
// prerequisite is the Fighting Style feature, not a level).
/** @param {Pick<StyleFeat, 'kind'> | null | undefined} feat */
export function isFightingStyleFeat(feat) {
  return feat?.kind === FIGHTING_STYLE_TYPE
}

/**
 * The class a replacement style belongs to.
 *
 * Reads the `prerequisite` predicate tree rather than a category string. Only a
 * `class` predicate answers this; every other kind Ruling 10 names is about the
 * character, not about who may be offered the feat.
 *
 * Returns `null` for a replacement whose owning class was never authored, and
 * the caller must treat that as *nobody* rather than everybody. It is the whole
 * failure mode retiring `data.category` could have introduced: a tagged row
 * with no predicate reading as a general style, offered to every class, and
 * looking entirely correct while doing it.
 *
 * @param {StyleFeat} feat
 * @returns {string | null}
 */
function replacementOwner(feat) {
  const predicates = feat.prerequisite?.all ?? feat.prerequisite?.any ?? []
  return predicates.find(p => p?.class)?.class ?? null
}

/** @param {StyleFeat | null | undefined} feat */
function isReplacement(feat) {
  return !!feat?.tags?.includes(REPLACEMENT_TAG)
}

// The feats one class may pick: every general Fighting Style, plus that class's
// own replacement if it has one. A missing className yields the general list.
/**
 * @template {StyleFeat} T
 * @param {readonly T[] | null | undefined} feats
 * @param {string | null | undefined} className
 * @returns {T[]}
 */
export function fightingStyleOptions(feats, className) {
  return (feats ?? [])
    .filter(f => {
      if (!isFightingStyleFeat(f)) return false
      if (!isReplacement(f)) return true
      const owner = replacementOwner(f)
      return !!owner && !!className && owner === className
    })
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
}

// Feats minus the Fighting Styles — what a generic feat picker should offer.
/**
 * Reads only `kind`, so it takes this plugin's `FeatRow` as it is.
 *
 * @template {Pick<StyleFeat, 'kind'>} T
 * @param {readonly T[] | null | undefined} feats
 * @returns {T[]}
 */
export function withoutFightingStyleFeats(feats) {
  return (feats ?? []).filter(f => !isFightingStyleFeat(f))
}
