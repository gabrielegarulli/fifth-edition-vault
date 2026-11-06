---
title: Draconic Sorcery
class: Sorcerer
source: SRD 5.2.1
edition: SRD 5.2.1
type: subclass
subclass_title: Sorcerer Subclass
tags:
  - subclass
  - subclass/sorcerer
  - srd-5-2-1
aliases:
  - Draconic Sorcery
  - "Sorcerer: Draconic Sorcery"
  - Draconic Sorcery (Sorcerer)
export_hash: sha256-a62a4a592486
---

# Draconic Sorcery
*Subclass for [[sorcerer|Sorcerer]] (Sorcerer Subclass) | Source: SRD 5.2.1*

### 📜 Always-Prepared Spells

| Character Level | Spells |
| :---: | :--- |
| **3rd** | alter self, chromatic orb, command, dragon's breath |
| **5th** | fear, fly |
| **7th** | arcane eye, charm monster |
| **9th** | legend lore, summon dragon |


### Archetype Feature Milestones

| Level | Features Unlocked |
| :---: | :--- |
| **3rd** | Draconic Sorcery, Draconic Spells, Draconic Resilience |
| **6th** | Elemental Affinity |
| **14th** | Dragon Wings |
| **18th** | Dragon Companion |

## Subclass Features

### Level 3: Draconic Sorcery

*Breathe the Magic of Dragons*

Your innate magic comes from the gift of a dragon. Perhaps an ancient dragon facing death bequeathed some of its magical power to you or your ancestor. You might have absorbed magic from a site infused with dragons' power. Or perhaps you handled a treasure taken from a dragon's hoard that was steeped in draconic power. Or you might have a dragon for an ancestor.

*See Subclass Feature: **Draconic Resilience***

*See Subclass Feature: **Draconic Spells***

### Level 3: Draconic Spells

When you reach a Sorcerer level specified in the Draconic Spells table, you thereafter always have the listed spells prepared.

**Draconic Spells**

| Sorcerer Level | Spells |
| --- | --- |
| 3 | Alter Self, Chromatic Orb, Command, Dragon's Breath |
| 5 | Fear, Fly |
| 7 | Arcane Eye, Charm Monster |
| 9 | Legend Lore, Summon Dragon |

### Level 3: Draconic Resilience

The magic in your body manifests physical traits of your draconic gift. Your Hit Point maximum increases by 3, and it increases by 1 whenever you gain another Sorcerer level.

Parts of you are also covered by dragon-like scales. While you aren't wearing armor, your base Armor Class equals 10 plus your Dexterity and Charisma modifiers.

### Level 6: Elemental Affinity

Your draconic magic has an affinity with a damage type associated with dragons. Choose one of those types: Acid, Cold, Fire, Lightning, or Poison.

You have Resistance to that damage type, and when you cast a spell that deals damage of that type, you can add your Charisma modifier to one damage roll of that spell.

### Level 14: Dragon Wings

As a Bonus Action, you can cause draconic wings to appear on your back. The wings last for 1 hour or until you dismiss them (no action required). For the duration, you have a Fly Speed of 60 feet.

Once you use this feature, you can't use it again until you finish a Long Rest unless you spend 3 Sorcery Points (no action required) to restore your use of it.

### Level 18: Dragon Companion

You can cast Summon Dragon without a Material component. You can also cast it once without a spell slot, and you regain the ability to cast it in this way when you finish a Long Rest.

Whenever you start casting the spell, you can modify it so that it doesn't require Concentration. If you do so, the spell's duration becomes 1 minute for that casting.

```vault-subclass
name: Draconic Sorcery
short_name: Draconic
class_name: Sorcerer
class_source: SRD 5.2.1
source: SRD 5.2.1
data:
  additionalSpells:
    - prepared:
        "3":
          - alter self|srd
          - chromatic orb|srd
          - command|srd
          - dragon's breath|srd
        "5":
          - fear|srd
          - fly|srd
        "7":
          - arcane eye|srd
          - charm monster|srd
        "9":
          - legend lore|srd
          - summon dragon|srd
  subclassFeatures:
    - Draconic Sorcery|Sorcerer|SRD|Draconic|SRD|3
    - Elemental Affinity|Sorcerer|SRD|Draconic|SRD|6
    - Dragon Wings|Sorcerer|SRD|Draconic|SRD|14
    - Dragon Companion|Sorcerer|SRD|Draconic|SRD|18
features:
  - name: Draconic Sorcery
    level: 3
    description: |-
      *Breathe the Magic of Dragons*

      Your innate magic comes from the gift of a dragon. Perhaps an ancient dragon facing death bequeathed some of its magical power to you or your ancestor. You might have absorbed magic from a site infused with dragons' power. Or perhaps you handled a treasure taken from a dragon's hoard that was steeped in draconic power. Or you might have a dragon for an ancestor.

      *See Subclass Feature: **Draconic Resilience***

      *See Subclass Feature: **Draconic Spells***
  - name: Draconic Spells
    level: 3
    description: |-
      When you reach a Sorcerer level specified in the Draconic Spells table, you thereafter always have the listed spells prepared.

      **Draconic Spells**

      | Sorcerer Level | Spells |
      | --- | --- |
      | 3 | Alter Self, Chromatic Orb, Command, Dragon's Breath |
      | 5 | Fear, Fly |
      | 7 | Arcane Eye, Charm Monster |
      | 9 | Legend Lore, Summon Dragon |
  - name: Draconic Resilience
    level: 3
    description: |-
      The magic in your body manifests physical traits of your draconic gift. Your Hit Point maximum increases by 3, and it increases by 1 whenever you gain another Sorcerer level.

      Parts of you are also covered by dragon-like scales. While you aren't wearing armor, your base Armor Class equals 10 plus your Dexterity and Charisma modifiers.
  - name: Elemental Affinity
    level: 6
    description: |-
      Your draconic magic has an affinity with a damage type associated with dragons. Choose one of those types: Acid, Cold, Fire, Lightning, or Poison.

      You have Resistance to that damage type, and when you cast a spell that deals damage of that type, you can add your Charisma modifier to one damage roll of that spell.
  - name: Dragon Wings
    level: 14
    description: |-
      As a Bonus Action, you can cause draconic wings to appear on your back. The wings last for 1 hour or until you dismiss them (no action required). For the duration, you have a Fly Speed of 60 feet.

      Once you use this feature, you can't use it again until you finish a Long Rest unless you spend 3 Sorcery Points (no action required) to restore your use of it.
  - name: Dragon Companion
    level: 18
    description: |-
      You can cast Summon Dragon without a Material component. You can also cast it once without a spell slot, and you regain the ability to cast it in this way when you finish a Long Rest.

      Whenever you start casting the spell, you can modify it so that it doesn't require Concentration. If you do so, the spell's duration becomes 1 minute for that casting.
```
