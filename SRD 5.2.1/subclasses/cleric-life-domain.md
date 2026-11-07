---
title: Life Domain
class: Cleric
source: SRD 5.2.1
edition: SRD 5.2.1
type: subclass
subclass_title: Cleric Subclass
tags:
  - subclass
  - subclass/cleric
  - srd-5-2-1
aliases:
  - Life Domain
  - "Cleric: Life Domain"
  - Life Domain (Cleric)
export_hash: sha256-c06c3f78277b
---

# Life Domain
*Subclass for [[cleric|Cleric]] (Cleric Subclass) | Source: SRD 5.2.1*

### 📜 Always-Prepared Spells

| Character Level | Spells |
| :---: | :--- |
| **3rd** | aid, bless, cure wounds, lesser restoration |
| **5th** | mass healing word, revivify |
| **7th** | aura of life, death ward |
| **9th** | greater restoration, mass cure wounds |


### Archetype Feature Milestones

| Level | Features Unlocked |
| :---: | :--- |
| **3rd** | Life Domain, Disciple of Life, Life Domain Spells, Preserve Life |
| **6th** | Blessed Healer |
| **17th** | Supreme Healing |

## Subclass Features

### Level 3: Life Domain

*Soothe the Hurts of the World*

The Life Domain focuses on the positive energy that helps sustain all life in the multiverse. Clerics who tap into this domain are masters of healing, using that life force to cure many hurts.

Existence itself relies on the positive energy associated with this domain, so a Cleric of almost any religious tradition might choose it. This domain is particularly associated with agricultural deities, gods of healing or endurance, and gods of home and community. Religious orders of healing also seek the magic of this domain.

*See Subclass Feature: **Life Domain Spells***

*See Subclass Feature: **Disciple of Life***

*See Subclass Feature: **Preserve Life***

### Level 3: Disciple of Life

When a spell you cast with a spell slot restores Hit Points to a creature, that creature regains additional Hit Points on the turn you cast the spell. The additional Hit Points equal 2 plus the spell slot's level.

### Level 3: Life Domain Spells

Your connection to this divine domain ensures you always have certain spells ready. When you reach a Cleric level specified in the Life Domain Spells table, you thereafter always have the listed spells prepared.

**Life Domain Spells**

| Cleric Level | Prepared Spells |
| --- | --- |
| 3 | Aid, Bless, Cure Wounds, Lesser Restoration |
| 5 | Mass Healing Word, Revivify |
| 7 | Aura of Life, Death Ward |
| 9 | Greater Restoration, Mass Cure Wounds |

### Level 3: Preserve Life

As a Magic action, you present your Holy Symbol and expend a use of your Channel Divinity to evoke healing energy that can restore a number of Hit Points equal to five times your Cleric level. Choose Bloodied creatures within 30 feet of yourself (which can include you), and divide those Hit Points among them. This feature can restore a creature to no more than half its Hit Point maximum.

### Level 6: Blessed Healer

The healing spells you cast on others heal you as well. Immediately after you cast a spell with a spell slot that restores Hit Points to one or more creatures other than yourself, you regain Hit Points equal to 2 plus the spell slot's level.

### Level 17: Supreme Healing

When you would normally roll one or more dice to restore Hit Points to a creature with a spell or Channel Divinity, don't roll those dice for the healing; instead use the highest number possible for each die. For example, instead of restoring 2d6 Hit Points to a creature with a spell, you restore 12.

```vault-subclass
name: Life Domain
short_name: Life
class_name: Cleric
class_source: SRD 5.2.1
source: SRD 5.2.1
data:
  additionalSpells:
    - prepared:
        "3":
          - aid|srd
          - bless|srd
          - cure wounds|srd
          - lesser restoration|srd
        "5":
          - mass healing word|srd
          - revivify|srd
        "7":
          - aura of life|srd
          - death ward|srd
        "9":
          - greater restoration|srd
          - mass cure wounds|srd
  subclassFeatures:
    - Life Domain|Cleric|SRD|Life|SRD|3
    - Blessed Healer|Cleric|SRD|Life|SRD|6
    - Supreme Healing|Cleric|SRD|Life|SRD|17
features:
  - name: Life Domain
    level: 3
    description: |-
      *Soothe the Hurts of the World*

      The Life Domain focuses on the positive energy that helps sustain all life in the multiverse. Clerics who tap into this domain are masters of healing, using that life force to cure many hurts.

      Existence itself relies on the positive energy associated with this domain, so a Cleric of almost any religious tradition might choose it. This domain is particularly associated with agricultural deities, gods of healing or endurance, and gods of home and community. Religious orders of healing also seek the magic of this domain.

      *See Subclass Feature: **Life Domain Spells***

      *See Subclass Feature: **Disciple of Life***

      *See Subclass Feature: **Preserve Life***
  - name: Disciple of Life
    level: 3
    description: When a spell you cast with a spell slot restores Hit Points to a creature, that creature regains additional Hit Points on the turn you cast the spell. The additional Hit Points equal 2 plus the spell slot's level.
  - name: Life Domain Spells
    level: 3
    description: |-
      Your connection to this divine domain ensures you always have certain spells ready. When you reach a Cleric level specified in the Life Domain Spells table, you thereafter always have the listed spells prepared.

      **Life Domain Spells**

      | Cleric Level | Prepared Spells |
      | --- | --- |
      | 3 | Aid, Bless, Cure Wounds, Lesser Restoration |
      | 5 | Mass Healing Word, Revivify |
      | 7 | Aura of Life, Death Ward |
      | 9 | Greater Restoration, Mass Cure Wounds |
  - name: Preserve Life
    level: 3
    description: As a Magic action, you present your Holy Symbol and expend a use of your Channel Divinity to evoke healing energy that can restore a number of Hit Points equal to five times your Cleric level. Choose Bloodied creatures within 30 feet of yourself (which can include you), and divide those Hit Points among them. This feature can restore a creature to no more than half its Hit Point maximum.
  - name: Blessed Healer
    level: 6
    description: The healing spells you cast on others heal you as well. Immediately after you cast a spell with a spell slot that restores Hit Points to one or more creatures other than yourself, you regain Hit Points equal to 2 plus the spell slot's level.
  - name: Supreme Healing
    level: 17
    description: When you would normally roll one or more dice to restore Hit Points to a creature with a spell or Channel Divinity, don't roll those dice for the healing; instead use the highest number possible for each die. For example, instead of restoring 2d6 Hit Points to a creature with a spell, you restore 12.
```
