---
title: Fiend Patron
class: Warlock
source: SRD 5.2.1
edition: SRD 5.2.1
type: subclass
subclass_title: Warlock Subclass
tags:
  - subclass
  - subclass/warlock
  - srd-5-2-1
aliases:
  - Fiend Patron
  - "Warlock: Fiend Patron"
  - Fiend Patron (Warlock)
export_hash: sha256-9cd820641c02
---

# Fiend Patron
*Subclass for [[warlock|Warlock]] (Warlock Subclass) | Source: SRD 5.2.1*

### 📜 Always-Prepared Spells

| Character Level | Spells |
| :---: | :--- |
| **3rd** | burning hands, command, scorching ray, suggestion |
| **5th** | fireball, stinking cloud |
| **7th** | fire shield, wall of fire |
| **9th** | geas, insect plague |


### Archetype Feature Milestones

| Level | Features Unlocked |
| :---: | :--- |
| **3rd** | Fiend Patron, Dark One's Blessing, Fiend Spells |
| **6th** | Dark One's Own Luck |
| **10th** | Fiendish Resilience |
| **14th** | Hurl Through Hell |

## Subclass Features

### Level 3: Fiend Patron

*Make a Deal with the Lower Planes*

Your pact draws on the Lower Planes, the realms of perdition. You might forge a bargain with a demon lord, an archdevil, or another fiend that is especially mighty. That patron's aims are evil—the corruption or destruction of all things, ultimately including you—and your path is defined by the extent to which you strive against those aims.

*See Subclass Feature: **Fiend Spells***

*See Subclass Feature: **Dark One's Blessing***

### Level 3: Dark One's Blessing

When you reduce an enemy to 0 Hit Points, you gain Temporary Hit Points equal to your Charisma modifier plus your Warlock level (minimum of 1 Temporary Hit Point). You also gain this benefit if someone else reduces an enemy within 10 feet of you to 0 Hit Points.

### Level 3: Fiend Spells

The magic of your patron ensures you always have certain spells ready; when you reach a Warlock level specified in the Fiend Spells table, you thereafter always have the listed spells prepared.

**Fiend Spells**
| Warlock Level | Spells |
| --- | --- |
| 3 | Burning Hands, Command, Scorching Ray, Suggestion |
| 5 | Fireball, Stinking Cloud |
| 7 | Fire Shield, Wall of Fire |
| 9 | Geas, Insect Plague |

### Level 6: Dark One's Own Luck

You can call on your fiendish patron to alter fate in your favor. When you make an ability check or a saving throw, you can use this feature to add 1d10 to your roll. You can do so after seeing the roll but before any of the roll's effects occur.

You can use this feature a number of times equal to your Charisma modifier (minimum of once), but you can use it no more than once per roll. You regain all expended uses when you finish a Long Rest.

### Level 10: Fiendish Resilience

Choose one damage type, other than Force, whenever you finish a Short or Long Rest. You have Resistance to that damage type until you choose a different one with this feature.

### Level 14: Hurl Through Hell

Once per turn when you hit a creature with an attack roll, you can try to instantly transport the target through the Lower Planes. The target must succeed on a Charisma saving throw against your spell save DC, or the target disappears and hurtles through a nightmare landscape. The target takes 8d10 Psychic damage if it isn't a Fiend, and it has the [[Incapacitated]] condition until the end of your next turn, when it returns to the space it previously occupied or the nearest unoccupied space.

Once you use this feature, you can't use it again until you finish a Long Rest unless you expend a Pact Magic spell slot (no action required) to restore your use of it.

```vault-subclass
name: Fiend Patron
short_name: Fiend
class_name: Warlock
class_source: SRD 5.2.1
source: SRD 5.2.1
data:
  additionalSpells:
    - prepared:
        "3":
          - burning hands|srd
          - command|srd
          - scorching ray|srd
          - suggestion|srd
        "5":
          - fireball|srd
          - stinking cloud|srd
        "7":
          - fire shield|srd
          - wall of fire|srd
        "9":
          - geas|srd
          - insect plague|srd
  subclassFeatures:
    - Fiend Patron|Warlock|SRD|Fiend|SRD|3
    - Dark One's Own Luck|Warlock|SRD|Fiend|SRD|6
    - Fiendish Resilience|Warlock|SRD|Fiend|SRD|10
    - Hurl Through Hell|Warlock|SRD|Fiend|SRD|14
features:
  - name: Fiend Patron
    level: 3
    description: |-
      *Make a Deal with the Lower Planes*

      Your pact draws on the Lower Planes, the realms of perdition. You might forge a bargain with a demon lord, an archdevil, or another fiend that is especially mighty. That patron's aims are evil—the corruption or destruction of all things, ultimately including you—and your path is defined by the extent to which you strive against those aims.

      *See Subclass Feature: **Fiend Spells***

      *See Subclass Feature: **Dark One's Blessing***
  - name: Dark One's Blessing
    level: 3
    description: When you reduce an enemy to 0 Hit Points, you gain Temporary Hit Points equal to your Charisma modifier plus your Warlock level (minimum of 1 Temporary Hit Point). You also gain this benefit if someone else reduces an enemy within 10 feet of you to 0 Hit Points.
  - name: Fiend Spells
    level: 3
    description: |-
      The magic of your patron ensures you always have certain spells ready; when you reach a Warlock level specified in the Fiend Spells table, you thereafter always have the listed spells prepared.

      **Fiend Spells**
      | Warlock Level | Spells |
      | --- | --- |
      | 3 | Burning Hands, Command, Scorching Ray, Suggestion |
      | 5 | Fireball, Stinking Cloud |
      | 7 | Fire Shield, Wall of Fire |
      | 9 | Geas, Insect Plague |
  - name: Dark One's Own Luck
    level: 6
    description: |-
      You can call on your fiendish patron to alter fate in your favor. When you make an ability check or a saving throw, you can use this feature to add 1d10 to your roll. You can do so after seeing the roll but before any of the roll's effects occur.

      You can use this feature a number of times equal to your Charisma modifier (minimum of once), but you can use it no more than once per roll. You regain all expended uses when you finish a Long Rest.
  - name: Fiendish Resilience
    level: 10
    description: Choose one damage type, other than Force, whenever you finish a Short or Long Rest. You have Resistance to that damage type until you choose a different one with this feature.
  - name: Hurl Through Hell
    level: 14
    description: |-
      Once per turn when you hit a creature with an attack roll, you can try to instantly transport the target through the Lower Planes. The target must succeed on a Charisma saving throw against your spell save DC, or the target disappears and hurtles through a nightmare landscape. The target takes 8d10 Psychic damage if it isn't a Fiend, and it has the Incapacitated condition until the end of your next turn, when it returns to the space it previously occupied or the nearest unoccupied space.

      Once you use this feature, you can't use it again until you finish a Long Rest unless you expend a Pact Magic spell slot (no action required) to restore your use of it.
```
