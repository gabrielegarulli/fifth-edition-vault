import type { DdbPayload } from '../payload'
import { SHEET_VERSION, type Sheet } from '../../sheet/sheet'
import { buildDefenses, buildProficiencies, buildSenses, buildSpeeds } from '../defenses'
import { buildFeaturePicks } from '../featurePicks'
import { pactOnlyRanksForClassNames, slotMapForDdbClasses } from '../../spells/slots'

import { present, totalCharacterLevel, proficiencyBonus } from './shared'
import { getSaves, getSkills, getPassives, abilityBlock } from './abilities'
import { getSpeed, deriveHp, deriveAc, buildInitiative, buildHitDice } from './combat'
import { getRace, getClasses, slotClasses, formatClasses } from './classes'
import { buildSpellcasting, buildSpells } from './spellcasting'
import { buildAttacks, buildActionAttacks, buildFeatureDice } from './attacks'
import { buildClassResources, buildFeats } from './resources'
import { buildDdbItems, buildDdbCurrency } from './items'

// The sheet, from every part above.
// One file of the D&D Beyond derivation (MYDND-197); index.ts says what it is and why it is kept.

/**
 * The payload, reduced to the one object everything downstream reads.
 *
 * `ddbId` is passed in rather than read from the payload: it is the id the user
 * asked for, it is what goes into the note's frontmatter as identity, and a
 * payload that disagreed with it would be the more suspicious of the two.
 */
export function buildSheet(payload: DdbPayload, ddbId: string | number): Sheet {
  const hp = deriveHp(payload)
  const classes = getClasses(payload)
  return {
    version: SHEET_VERSION,
    name: payload?.name || 'Unknown',
    ddb_id: String(ddbId),
    race: getRace(payload),
    classes: formatClasses(payload),
    level: totalCharacterLevel(payload),
    proficiency_bonus: proficiencyBonus(payload),
    ac: deriveAc(payload),
    hp: { current: hp.current, max: hp.max, temp: hp.temp },
    speed: getSpeed(payload),
    initiative: buildInitiative(payload),
    hit_dice: buildHitDice(payload),
    abilities: abilityBlock(payload),
    saves: getSaves(payload),
    skills: getSkills(payload),
    passives: getPassives(payload),
    spellcasting: buildSpellcasting(payload),
    // Items first, then feature attacks — a weapon in hand is what a player
    // looks for, and a Soulknife has only the feature ones.
    attacks: [...buildAttacks(payload), ...buildActionAttacks(payload)],
    feature_dice: buildFeatureDice(payload),
    class_resources: buildClassResources(payload),
    defenses: buildDefenses(payload),
    senses: buildSenses(payload),
    speeds: buildSpeeds(payload, getSpeed(payload)),
    proficiencies: buildProficiencies(payload),
    spells: buildSpells(payload),
    avatar: payload?.decorations?.avatarUrl || null,
    subclasses: classes.map(c => c.subclass).filter(present),
    feats: buildFeats(payload),
    feature_picks: buildFeaturePicks(payload),
    spell_slots: slotMapForDdbClasses(slotClasses(payload)),
    short_rest_slot_ranks: pactOnlyRanksForClassNames(classes),
    ddb_items: buildDdbItems(payload),
    ddb_currency: buildDdbCurrency(payload),
  }
}
