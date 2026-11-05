---
title: Warrior of the Open Hand
class: Monk
source: SRD 5.2.1
edition: SRD 5.2.1
type: subclass
subclass_title: Monk Subclass
tags:
  - subclass
  - subclass/monk
  - srd-5-2-1
aliases:
  - Warrior of the Open Hand
  - "Monk: Warrior of the Open Hand"
  - Warrior of the Open Hand (Monk)
export_hash: sha256-c14b3dfd65b7
---

# Warrior of the Open Hand
*Subclass for [[monk|Monk]] (Monk Subclass) | Source: SRD 5.2.1*

### Archetype Feature Milestones

| Level | Features Unlocked |
| :---: | :--- |
| **3rd** | Open Hand Technique, Warrior of the Open Hand |
| **6th** | Wholeness of Body |
| **11th** | Fleet Step |
| **17th** | Quivering Palm |

## Subclass Features

### Level 3: Open Hand Technique

Whenever you hit a creature with an attack granted by your Flurry of Blows, you can impose one of the following effects on that target.

**Addle.** The target can't make Opportunity Attacks until the start of its next turn.

**Push.** The target must succeed on a Strength saving throw or be pushed up to 15 feet away from you.

**Topple.** The target must succeed on a Dexterity saving throw or have the [[Prone]] condition.

### Level 3: Warrior of the Open Hand

*Master Unarmed Combat Techniques*

Warriors of the Open Hand are masters of unarmed combat. They learn techniques to push and trip their opponents and manipulate their own energy to protect themselves from harm.

*See Subclass Feature: **Open Hand Technique***

### Level 6: Wholeness of Body

You gain the ability to heal yourself. As a Bonus Action, you can roll your Martial Arts die. You regain a number of Hit Points equal to the number rolled plus your Wisdom modifier (minimum of 1 Hit Point regained).

You can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.

### Level 11: Fleet Step

When you take a Bonus Action other than Step of the Wind, you can also use Step of the Wind immediately after that Bonus Action.

### Level 17: Quivering Palm

You gain the ability to set up lethal vibrations in someone's body. When you hit a creature with an Unarmed Strike, you can expend 4 Focus Points to start these imperceptible vibrations, which last for a number of days equal to your Monk level. The vibrations are harmless unless you take an action to end them. Alternatively, when you take the Attack action on your turn, you can forgo one of the attacks to end the vibrations. To end them, you and the target must be on the same plane of existence. When you end them, the target must make a Constitution saving throw, taking 10d12 Force damage on a failed save or half as much damage on a successful one.

You can have only one creature under the effect of this feature at a time. You can end the vibrations harmlessly (no action required).

```vault-subclass
name: Warrior of the Open Hand
short_name: Open Hand
class_name: Monk
class_source: SRD 5.2.1
source: SRD 5.2.1
data:
  subclassFeatures:
    - Warrior of the Open Hand|Monk|SRD|Open Hand|SRD|3
    - Wholeness of Body|Monk|SRD|Open Hand|SRD|6
    - Fleet Step|Monk|SRD|Open Hand|SRD|11
    - Quivering Palm|Monk|SRD|Open Hand|SRD|17
features:
  - name: Open Hand Technique
    level: 3
    description: |-
      Whenever you hit a creature with an attack granted by your Flurry of Blows, you can impose one of the following effects on that target.

      **Addle.** The target can't make Opportunity Attacks until the start of its next turn.

      **Push.** The target must succeed on a Strength saving throw or be pushed up to 15 feet away from you.

      **Topple.** The target must succeed on a Dexterity saving throw or have the Prone condition.
  - name: Warrior of the Open Hand
    level: 3
    description: |-
      *Master Unarmed Combat Techniques*

      Warriors of the Open Hand are masters of unarmed combat. They learn techniques to push and trip their opponents and manipulate their own energy to protect themselves from harm.

      *See Subclass Feature: **Open Hand Technique***
  - name: Wholeness of Body
    level: 6
    description: |-
      You gain the ability to heal yourself. As a Bonus Action, you can roll your Martial Arts die. You regain a number of Hit Points equal to the number rolled plus your Wisdom modifier (minimum of 1 Hit Point regained).

      You can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.
  - name: Fleet Step
    level: 11
    description: When you take a Bonus Action other than Step of the Wind, you can also use Step of the Wind immediately after that Bonus Action.
  - name: Quivering Palm
    level: 17
    description: |-
      You gain the ability to set up lethal vibrations in someone's body. When you hit a creature with an Unarmed Strike, you can expend 4 Focus Points to start these imperceptible vibrations, which last for a number of days equal to your Monk level. The vibrations are harmless unless you take an action to end them. Alternatively, when you take the Attack action on your turn, you can forgo one of the attacks to end the vibrations. To end them, you and the target must be on the same plane of existence. When you end them, the target must make a Constitution saving throw, taking 10d12 Force damage on a failed save or half as much damage on a successful one.

      You can have only one creature under the effect of this feature at a time. You can end the vibrations harmlessly (no action required).
```
