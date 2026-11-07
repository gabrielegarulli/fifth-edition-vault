---
title: Champion
class: Fighter
source: SRD 5.2.1
edition: SRD 5.2.1
type: subclass
subclass_title: Fighter Subclass
tags:
  - subclass
  - subclass/fighter
  - srd-5-2-1
aliases:
  - Champion
  - "Fighter: Champion"
  - Champion (Fighter)
export_hash: sha256-235301712103
---

# Champion
*Subclass for [[fighter|Fighter]] (Fighter Subclass) | Source: SRD 5.2.1*

### Archetype Feature Milestones

| Level | Features Unlocked |
| :---: | :--- |
| **3rd** | Champion, Improved Critical, Remarkable Athlete |
| **7th** | Additional Fighting Style |
| **10th** | Heroic Warrior |
| **15th** | Superior Critical |
| **18th** | Survivor |

## Subclass Features

### Level 3: Champion

*Pursue Physical Excellence in Combat*

A Champion focuses on the development of martial prowess in a relentless pursuit of victory. Champions combine rigorous training with physical excellence to deal devastating blows, withstand peril, and garner glory. Whether in athletic contests or bloody battle, Champions strive for the crown of the victor.

*See Subclass Feature: **Improved Critical***

*See Subclass Feature: **Remarkable Athlete***

### Level 3: Improved Critical

Your attack rolls with weapons and Unarmed Strikes can score a Critical Hit on a roll of 19 or 20 on the d20.

### Level 3: Remarkable Athlete

Thanks to your athleticism, you have Advantage on Initiative rolls and Strength (Athletics) checks.

In addition, immediately after you score a Critical Hit, you can move up to half your Speed without provoking Opportunity Attacks.

### Level 7: Additional Fighting Style

You gain another Fighting Style feat of your choice.

### Level 10: Heroic Warrior

The thrill of battle drives you toward victory. During combat, you can give yourself Heroic Inspiration whenever you start your turn without it.

### Level 15: Superior Critical

Your attack rolls with weapons and Unarmed Strikes can now score a Critical Hit on a roll of 18–20 on the d20.

### Level 18: Survivor

You attain the pinnacle of resilience in battle, giving you these benefits.

**Defy Death.** You have Advantage on Death Saving Throws. Moreover, when you roll 18–20 on a Death Saving Throw, you gain the benefit of rolling a 20 on it.

**Heroic Rally.** At the start of each of your turns, you regain Hit Points equal to 5 plus your Constitution modifier if you are Bloodied and have at least 1 Hit Point.

```vault-subclass
name: Champion
short_name: Champion
class_name: Fighter
class_source: SRD 5.2.1
source: SRD 5.2.1
data:
  subclassFeatures:
    - Champion|Fighter|SRD|Champion|SRD|3
    - Additional Fighting Style|Fighter|SRD|Champion|SRD|7
    - Heroic Warrior|Fighter|SRD|Champion|SRD|10
    - Superior Critical|Fighter|SRD|Champion|SRD|15
    - Survivor|Fighter|SRD|Champion|SRD|18
features:
  - name: Champion
    level: 3
    description: |-
      *Pursue Physical Excellence in Combat*

      A Champion focuses on the development of martial prowess in a relentless pursuit of victory. Champions combine rigorous training with physical excellence to deal devastating blows, withstand peril, and garner glory. Whether in athletic contests or bloody battle, Champions strive for the crown of the victor.

      *See Subclass Feature: **Improved Critical***

      *See Subclass Feature: **Remarkable Athlete***
  - name: Improved Critical
    level: 3
    description: Your attack rolls with weapons and Unarmed Strikes can score a Critical Hit on a roll of 19 or 20 on the d20.
  - name: Remarkable Athlete
    level: 3
    description: |-
      Thanks to your athleticism, you have Advantage on Initiative rolls and Strength (Athletics) checks.

      In addition, immediately after you score a Critical Hit, you can move up to half your Speed without provoking Opportunity Attacks.
  - name: Additional Fighting Style
    level: 7
    description: You gain another Fighting Style feat of your choice.
  - name: Heroic Warrior
    level: 10
    description: The thrill of battle drives you toward victory. During combat, you can give yourself Heroic Inspiration whenever you start your turn without it.
  - name: Superior Critical
    level: 15
    description: Your attack rolls with weapons and Unarmed Strikes can now score a Critical Hit on a roll of 18–20 on the d20.
  - name: Survivor
    level: 18
    description: |-
      You attain the pinnacle of resilience in battle, giving you these benefits.

      **Defy Death.** You have Advantage on Death Saving Throws. Moreover, when you roll 18–20 on a Death Saving Throw, you gain the benefit of rolling a 20 on it.

      **Heroic Rally.** At the start of each of your turns, you regain Hit Points equal to 5 plus your Constitution modifier if you are Bloodied and have at least 1 Hit Point.
```
