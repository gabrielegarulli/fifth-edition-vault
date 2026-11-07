---
title: Dragonborn
source: SRD 5.2.1
edition: SRD 5.2.1
size: Medium
speed: 30 ft.
creature_type: humanoid
darkvision: 60
tags:
  - species
  - size/medium
  - srd-5-2-1
aliases:
  - Dragonborn
export_hash: sha256-b27e16cc2435
---

# Dragonborn

*Medium, 30 ft. | Source: SRD 5.2.1*

**Draconic Ancestry.** Your lineage stems from a dragon progenitor. Choose the kind of dragon from the Draconic Ancestors table. Your choice affects your Breath Weapon and Damage Resistance traits as well as your appearance.

**Draconic Ancestors**

| Dragon | Damage Type |
| --- | --- |
| Black | Acid |
| Blue | Lightning |
| Brass | Fire |
| Bronze | Lightning |
| Copper | Acid |
| Gold | Fire |
| Green | Poison |
| Red | Fire |
| Silver | Cold |
| White | Cold |

**Breath Weapon.** When you take the Attack action on your turn, you can replace one of your attacks with an exhalation of magical energy in either a 15-foot Cone or a 30-foot Line that is 5 feet wide (choose the shape each time). Each creature in that area must make a Dexterity saving throw (DC 8 plus your Constitution modifier and Proficiency Bonus). On a failed save, a creature takes 1d10 damage of the type determined by your Draconic Ancestry trait. On a successful save, a creature takes half as much damage. This damage increases by 1d10 when you reach character levels 5 (2d10), 11 (3d10), and 17 (4d10).

You can use this Breath Weapon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

**Damage Resistance.** You have Resistance to the damage type determined by your Draconic Ancestry trait.

**Darkvision.** You have Darkvision with a range of 60 feet.

**Draconic Flight.** When you reach character level 5, you can channel draconic magic to give yourself temporary flight. As a Bonus Action, you sprout spectral wings on your back that last for 10 minutes or until you retract the wings (no action required) or have the [[Incapacitated]] condition. During that time, you have a Fly Speed equal to your Speed. Your wings appear to be made of the same energy as your Breath Weapon. Once you use this trait, you can't use it again until you finish a Long Rest.

```vault-species
traits:
  - key: draconic_ancestry
    name: Draconic Ancestry
    text: |-
      Your lineage stems from a dragon progenitor. Choose the kind of dragon from the Draconic Ancestors table. Your choice affects your Breath Weapon and Damage Resistance traits as well as your appearance.

      **Draconic Ancestors**

      | Dragon | Damage Type |
      | --- | --- |
      | Black | Acid |
      | Blue | Lightning |
      | Brass | Fire |
      | Bronze | Lightning |
      | Copper | Acid |
      | Gold | Fire |
      | Green | Poison |
      | Red | Fire |
      | Silver | Cold |
      | White | Cold |
  - key: breath_weapon
    name: Breath Weapon
    text: |-
      When you take the Attack action on your turn, you can replace one of your attacks with an exhalation of magical energy in either a 15-foot Cone or a 30-foot Line that is 5 feet wide (choose the shape each time). Each creature in that area must make a Dexterity saving throw (DC 8 plus your Constitution modifier and Proficiency Bonus). On a failed save, a creature takes 1d10 damage of the type determined by your Draconic Ancestry trait. On a successful save, a creature takes half as much damage. This damage increases by 1d10 when you reach character levels 5 (2d10), 11 (3d10), and 17 (4d10).

      You can use this Breath Weapon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.
  - key: damage_resistance
    name: Damage Resistance
    text: You have Resistance to the damage type determined by your Draconic Ancestry trait.
  - key: darkvision
    name: Darkvision
    text: You have Darkvision with a range of 60 feet.
  - key: draconic_flight
    name: Draconic Flight
    text: When you reach character level 5, you can channel draconic magic to give yourself temporary flight. As a Bonus Action, you sprout spectral wings on your back that last for 10 minutes or until you retract the wings (no action required) or have the Incapacitated condition. During that time, you have a Fly Speed equal to your Speed. Your wings appear to be made of the same energy as your Breath Weapon. Once you use this trait, you can't use it again until you finish a Long Rest.
```
