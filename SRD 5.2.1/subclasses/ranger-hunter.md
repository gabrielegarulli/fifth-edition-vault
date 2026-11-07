---
title: Hunter
class: Ranger
source: SRD 5.2.1
edition: SRD 5.2.1
type: subclass
subclass_title: Ranger Subclass
tags:
  - subclass
  - subclass/ranger
  - srd-5-2-1
aliases:
  - Hunter
  - "Ranger: Hunter"
  - Hunter (Ranger)
export_hash: sha256-e35559751de4
---

# Hunter
*Subclass for [[ranger|Ranger]] (Ranger Subclass) | Source: SRD 5.2.1*

### Archetype Feature Milestones

| Level | Features Unlocked |
| :---: | :--- |
| **3rd** | Hunter, Hunter's Lore, Hunter's Prey |
| **7th** | Defensive Tactics |
| **11th** | Superior Hunter's Prey |
| **15th** | Superior Hunter's Defense |

## Subclass Features

### Level 3: Hunter

*Protect Nature and People from Destruction*

You stalk prey in the wilds and elsewhere, using your abilities as a Hunter to protect nature and people everywhere from forces that would destroy them.

*See Subclass Feature: **Hunter's Prey***

*See Subclass Feature: **Hunter's Lore***

### Level 3: Hunter's Lore

You can call on the forces of nature to reveal certain strengths and weaknesses of your prey. While a creature is marked by your Hunter's Mark, you know whether that creature has any Immunities, Resistances, or Vulnerabilities, and if the creature has any, you know what they are.

### Level 3: Hunter's Prey

You gain one of the following feature options of your choice. Whenever you finish a Short or Long Rest, you can replace the chosen option with the other one.

#### Colossus Slayer

Your tenacity can wear down even the most resilient foes. When you hit a creature with a weapon, the weapon deals an extra 1d8 damage to the target if it's missing any of its Hit Points. You can deal this extra damage only once per turn.

#### Horde Breaker

Once on each of your turns when you make an attack with a weapon, you can make another attack with the same weapon against a different creature that is within 5 feet of the original target, that is within the weapon's range, and that you haven't attacked this turn.

### Level 7: Defensive Tactics

You gain one of the following feature options of your choice. Whenever you finish a Short or Long Rest, you can replace the chosen option with the other one.

#### Escape the Horde

Opportunity Attacks have Disadvantage against you.

#### Multiattack Defense

When a creature hits you with an attack roll, that creature has Disadvantage on all other attack rolls against you this turn.

### Level 11: Superior Hunter's Prey

Once per turn when you deal damage to a creature marked by your Hunter's Mark, you can also deal that spell's extra damage to a different creature that you can see within 30 feet of the first creature.

### Level 15: Superior Hunter's Defense

When you take damage, you can take a Reaction to give yourself Resistance to that damage and any other damage of the same type until the end of the current turn.

```vault-subclass
name: Hunter
short_name: Hunter
class_name: Ranger
class_source: SRD 5.2.1
source: SRD 5.2.1
data:
  subclassFeatures:
    - Hunter|Ranger|SRD|Hunter|SRD|3
    - Defensive Tactics|Ranger|SRD|Hunter|SRD|7
    - Superior Hunter's Prey|Ranger|SRD|Hunter|SRD|11
    - Superior Hunter's Defense|Ranger|SRD|Hunter|SRD|15
features:
  - name: Hunter
    level: 3
    description: |-
      *Protect Nature and People from Destruction*

      You stalk prey in the wilds and elsewhere, using your abilities as a Hunter to protect nature and people everywhere from forces that would destroy them.

      *See Subclass Feature: **Hunter's Prey***

      *See Subclass Feature: **Hunter's Lore***
  - name: Hunter's Lore
    level: 3
    description: You can call on the forces of nature to reveal certain strengths and weaknesses of your prey. While a creature is marked by your Hunter's Mark, you know whether that creature has any Immunities, Resistances, or Vulnerabilities, and if the creature has any, you know what they are.
  - name: Hunter's Prey
    level: 3
    description: |-
      You gain one of the following feature options of your choice. Whenever you finish a Short or Long Rest, you can replace the chosen option with the other one.

      #### Colossus Slayer

      Your tenacity can wear down even the most resilient foes. When you hit a creature with a weapon, the weapon deals an extra 1d8 damage to the target if it's missing any of its Hit Points. You can deal this extra damage only once per turn.

      #### Horde Breaker

      Once on each of your turns when you make an attack with a weapon, you can make another attack with the same weapon against a different creature that is within 5 feet of the original target, that is within the weapon's range, and that you haven't attacked this turn.
  - name: Defensive Tactics
    level: 7
    description: |-
      You gain one of the following feature options of your choice. Whenever you finish a Short or Long Rest, you can replace the chosen option with the other one.

      #### Escape the Horde

      Opportunity Attacks have Disadvantage against you.

      #### Multiattack Defense

      When a creature hits you with an attack roll, that creature has Disadvantage on all other attack rolls against you this turn.
  - name: Superior Hunter's Prey
    level: 11
    description: Once per turn when you deal damage to a creature marked by your Hunter's Mark, you can also deal that spell's extra damage to a different creature that you can see within 30 feet of the first creature.
  - name: Superior Hunter's Defense
    level: 15
    description: When you take damage, you can take a Reaction to give yourself Resistance to that damage and any other damage of the same type until the end of the current turn.
```
