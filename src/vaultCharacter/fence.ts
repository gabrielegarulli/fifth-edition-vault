import { extractFence } from '../content/fence'
import { fromYaml } from '../state/note'

/**
 * The ` ```vault-character ` fence — a Vault character's authored choices
 * (MYDND-23, ADR 0007).
 *
 * It holds the web app's Vault character JSON, the `character.json` that
 * `the-vault`'s builder writes and `@vault/derive`'s vault adapter reads:
 * species, classes and their levels, background, ability scores, feats, the
 * feature choices. **Choices only.** Everything derived from them — the sheet's
 * numbers — is in the ` ```charsheet ` fence, which is rewritten from this one
 * on every save.
 *
 * ## The two baked keys are deliberately not stored
 *
 * The web app keeps `resolvedEffects` and `proficiencyBaseline` inside the json,
 * because a database row is the only place it has. Here they are recomputed from
 * the catalogs on every save and never written, so the fence answers one
 * question — *what did the player pick* — and the charsheet answers the other.
 * A stored copy would be a second answer to "what does this feat do" that could
 * disagree with the feat's note, and would go stale on the next content export.
 *
 * ## Player-owned
 *
 * Nothing re-syncs it. D&D Beyond has no say over a `local:` character, and
 * "Rebuild sheet from choices" reads it rather than writing it — so a hand-edit
 * here is how a player corrects a choice until the builder exists (MYDND-24).
 */

export const VAULT_CHARACTER_FENCE = 'vault-character'

/** Keys recomputed on every save, and therefore never persisted. */
export const BAKED_KEYS = ['resolvedEffects', 'proficiencyBaseline'] as const

/** One class entry, in the shape `builderDraft.resolveClasses` produces. */
export interface VaultClassEntry {
  /** The class note's slug. */
  id: string | null
  name: string | null
  source?: string | null
  level: number
  subclass?: { id: string; name: string } | null
  hit_die?: number | null
  spellcastingAbility?: string | null
}

/**
 * The web app's Vault character json.
 *
 * Typed for the keys this plugin reads and **open for the rest**:
 * `@vault/derive` is the reader and owns the contract, so a key the builder
 * writes that this type does not name must survive a round trip untouched.
 */
export interface VaultCharacterJson extends Record<string, unknown> {
  name: string
  race?: { id: string; name: string; [k: string]: unknown } | null
  classes?: VaultClassEntry[]
  background?: { id: string; name: string; [k: string]: unknown } | null
  originFeat?: { id: string; name: string; [k: string]: unknown } | null
  abilityScores?: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
  feats?: Array<{ id: string; name: string; [k: string]: unknown }>
  featureChoices?: Record<string, unknown>
  saveProficiencies?: string[]
  skillProficiencies?: string[]
  skillExpertise?: string[]
  /** The Weapon Mastery picks, by the base weapon's note. */
  masteredWeapons?: Array<{ id: string; name: string }>
  /** The languages picked beside Common. Common itself is the projection's. */
  languages?: string[]
  /** Tool slugs from the background, fixed and picked. */
  backgroundTools?: string[]
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * What is wrong with a json, as sentences. Empty when it is fit to write.
 *
 * Deliberately shallow: it checks only what the projection cannot do without
 * and what a hand-edit is likely to break. Everything else is
 * `@vault/derive`'s to interpret, and it already reads every key defensively.
 */
export function vaultCharacterProblems(json: unknown): string[] {
  if (!isRecord(json)) return ['the vault-character block is not a mapping']
  const problems: string[] = []

  if (typeof json.name !== 'string' || json.name.trim() === '') problems.push('it has no name')

  if (json.classes !== undefined) {
    if (!Array.isArray(json.classes)) {
      problems.push('`classes` is not a list')
    } else {
      json.classes.forEach((c, i) => {
        if (!isRecord(c)) {
          problems.push(`class ${i + 1} is not a mapping`)
          return
        }
        const level = c.level
        if (typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > 20) {
          problems.push(`class ${i + 1} has level ${String(level)}, not a whole number from 1 to 20`)
        }
      })
    }
  }

  if (json.abilityScores !== undefined) {
    if (!isRecord(json.abilityScores)) {
      problems.push('`abilityScores` is not a mapping')
    } else {
      for (const [key, score] of Object.entries(json.abilityScores)) {
        if (typeof score !== 'number' || !Number.isFinite(score)) {
          problems.push(`ability score \`${key}\` is ${String(score)}, not a number`)
        }
      }
    }
  }

  return problems
}

/**
 * Read a fence's text. **A reader degrades** (ADR 0003): anything that does not
 * parse, or parses to something unusable, is `null`. The writer is where the
 * refusal happens — see `readVaultCharacterOrThrow`.
 */
export function parseVaultCharacter(text: string | null | undefined): VaultCharacterJson | null {
  if (!text) return null
  let parsed: unknown
  try {
    parsed = fromYaml(text)
  } catch {
    return null
  }
  return vaultCharacterProblems(parsed).length === 0 ? (parsed as VaultCharacterJson) : null
}

export function readVaultCharacterFromNote(markdown: string | null | undefined): VaultCharacterJson | null {
  return parseVaultCharacter(extractFence(markdown ?? '', VAULT_CHARACTER_FENCE))
}

/**
 * Read a note's choices for a rebuild, refusing with the reason.
 *
 * A rebuild rewrites the charsheet *from* this fence, so a fence that is
 * missing or broken must stop it rather than degrade to an empty character —
 * which would replace a level-9 sheet with a blank one and look like success.
 */
export function readVaultCharacterOrThrow(markdown: string | null | undefined): VaultCharacterJson {
  const text = extractFence(markdown ?? '', VAULT_CHARACTER_FENCE)
  if (text === null) throw new Error('this note has no vault-character block, so there are no choices to rebuild from')
  let parsed: unknown
  try {
    parsed = fromYaml(text)
  } catch (error) {
    throw new Error(`the vault-character block is not valid YAML: ${(error as Error).message}`, { cause: error })
  }
  const problems = vaultCharacterProblems(parsed)
  if (problems.length > 0) throw new Error(`the vault-character block cannot be used: ${problems.join('; ')}`)
  return parsed as VaultCharacterJson
}

/** The json as it is written — without the keys that are recomputed on save. */
export function persistedVaultCharacter(json: VaultCharacterJson): VaultCharacterJson {
  const out: VaultCharacterJson = { ...json }
  for (const key of BAKED_KEYS) delete out[key]
  return out
}
