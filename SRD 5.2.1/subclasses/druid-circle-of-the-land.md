---
title: Circle of the Land
class: Druid
source: SRD 5.2.1
edition: SRD 5.2.1
type: subclass
subclass_title: Druid Subclass
tags:
  - subclass
  - subclass/druid
  - srd-5-2-1
aliases:
  - Circle of the Land
  - "Druid: Circle of the Land"
  - Circle of the Land (Druid)
export_hash: sha256-ae3eef9deae5
---

# Circle of the Land
*Subclass for [[druid|Druid]] (Druid Subclass) | Source: SRD 5.2.1*

### 📜 Arid Land

| Character Level | Spells |
| :---: | :--- |
| **3rd** | blur, burning hands, fire bolt |
| **5th** | fireball |
| **7th** | blight |
| **9th** | wall of stone |

### 📜 Polar Land

| Character Level | Spells |
| :---: | :--- |
| **3rd** | fog cloud, hold person, ray of frost |
| **5th** | sleet storm |
| **7th** | ice storm |
| **9th** | cone of cold |

### 📜 Temperate Land

| Character Level | Spells |
| :---: | :--- |
| **3rd** | misty step, shocking grasp, sleep |
| **5th** | lightning bolt |
| **7th** | freedom of movement |
| **9th** | tree stride |

### 📜 Tropical Land

| Character Level | Spells |
| :---: | :--- |
| **3rd** | acid splash, ray of sickness, web |
| **5th** | stinking cloud |
| **7th** | polymorph |
| **9th** | insect plague |


### Archetype Feature Milestones

| Level | Features Unlocked |
| :---: | :--- |
| **3rd** | Circle of the Land, Circle of the Land Spells, Land's Aid |
| **6th** | Natural Recovery |
| **10th** | Nature's Ward |
| **14th** | Nature's Sanctuary |

## Subclass Features

### Level 3: Circle of the Land

*Celebrate Connection to the Natural World*

The Circle of the Land comprises mystics and sages who safeguard ancient knowledge and rites. These Druids meet within sacred circles of trees or standing stones to whisper primal secrets in Druidic. The circle's wisest members preside as the chief priests of their communities.

*See Subclass Feature: **Circle of the Land Spells***

*See Subclass Feature: **Land's Aid***

### Level 3: Circle of the Land Spells

Whenever you finish a Long Rest, choose one type of land: arid, polar, temperate, or tropical. Consult the table below that corresponds to the chosen type; you have the spells listed for your Druid level and lower prepared.

**Arid Land**

| Druid Level | Circle Spells |
| --- | --- |
| 3 | Blur, Burning Hands, Fire Bolt |
| 5 | Fireball |
| 7 | Blight |
| 9 | Wall of Stone |

**Polar Land**

| Druid Level | Circle Spells |
| --- | --- |
| 3 | Fog Cloud, Hold Person, Ray of Frost |
| 5 | Sleet Storm |
| 7 | Ice Storm |
| 9 | Cone of Cold |

**Temperate Land**

| Druid Level | Circle Spells |
| --- | --- |
| 3 | Misty Step, Shocking Grasp, Sleep |
| 5 | Lightning Bolt |
| 7 | Freedom of Movement |
| 9 | Tree Stride |

**Tropical Land**

| Druid Level | Circle Spells |
| --- | --- |
| 3 | Acid Splash, Ray of Sickness, Web |
| 5 | Stinking Cloud |
| 7 | Polymorph |
| 9 | Insect Plague |

### Level 3: Land's Aid

As a Magic action, you can expend a use of your Wild Shape and choose a point within 60 feet of yourself. Vitality-giving flowers and life-draining thorns appear for a moment in a 10-foot-radius Sphere centered on that point. Each creature of your choice in the Sphere must make a Constitution saving throw against your spell save DC, taking 2d6 Necrotic damage on a failed save or half as much damage on a successful one. One creature of your choice in that area regains 2d6 Hit Points.

The damage and healing increase by 1d6 when you reach Druid levels 10 (3d6) and 14 (4d6).

### Level 6: Natural Recovery

You can cast one of the level 1+ spells that you have prepared from your Circle Spells feature without expending a spell slot, and you must finish a Long Rest before you do so again.

In addition, when you finish a Short Rest, you can choose expended spell slots to recover. The spell slots can have a combined level that is equal to or less than half your Druid level (round up), and none of them can be level 6+. For example, if you're a level 6 Druid, you can recover up to three levels' worth of spell slots. You can recover a level 3 spell slot, a level 2 and a level 1 spell slot, or three level 1 spell slots. Once you recover spell slots with this feature, you can't do so again until you finish a Long Rest.

### Level 10: Nature's Ward

You are immune to the [[Poisoned]] condition, and you have Resistance to a damage type associated with your current land choice in the Circle Spells feature, as shown in the Nature's Ward table.

**Nature's Ward**

| Land Type | Resistance |
| --- | --- |
| Arid | Fire |
| Polar | Cold |
| Temperate | Lightning |
| Tropical | Poison |

### Level 14: Nature's Sanctuary

As a Magic action, you can expend a use of your Wild Shape and cause spectral trees and vines to appear in a 15-foot Cube on the ground within 120 feet of yourself. They last there for 1 minute or until you have the [[Incapacitated]] condition or die. You and your allies have Half Cover while in that area, and your allies gain the current Resistance of your Nature's Ward while there.

As a Bonus Action, you can move the Cube up to 60 feet to ground within 120 feet of yourself.

```vault-subclass
name: Circle of the Land
short_name: Land
class_name: Druid
class_source: SRD 5.2.1
source: SRD 5.2.1
data:
  additionalSpells:
    - name: Arid Land
      prepared:
        "3":
          - blur|srd
          - burning hands|srd
          - fire bolt|srd
        "5":
          - fireball|srd
        "7":
          - blight|srd
        "9":
          - wall of stone|srd
    - name: Polar Land
      prepared:
        "3":
          - fog cloud|srd
          - hold person|srd
          - ray of frost|srd
        "5":
          - sleet storm|srd
        "7":
          - ice storm|srd
        "9":
          - cone of cold|srd
    - name: Temperate Land
      prepared:
        "3":
          - misty step|srd
          - shocking grasp|srd
          - sleep|srd
        "5":
          - lightning bolt|srd
        "7":
          - freedom of movement|srd
        "9":
          - tree stride|srd
    - name: Tropical Land
      prepared:
        "3":
          - acid splash|srd
          - ray of sickness|srd
          - web|srd
        "5":
          - stinking cloud|srd
        "7":
          - polymorph|srd
        "9":
          - insect plague|srd
  subclassFeatures:
    - Circle of the Land|Druid|SRD|Land|SRD|3
    - Natural Recovery|Druid|SRD|Land|SRD|6
    - Nature's Ward|Druid|SRD|Land|SRD|10
    - Nature's Sanctuary|Druid|SRD|Land|SRD|14
features:
  - name: Circle of the Land
    level: 3
    description: |-
      *Celebrate Connection to the Natural World*

      The Circle of the Land comprises mystics and sages who safeguard ancient knowledge and rites. These Druids meet within sacred circles of trees or standing stones to whisper primal secrets in Druidic. The circle's wisest members preside as the chief priests of their communities.

      *See Subclass Feature: **Circle of the Land Spells***

      *See Subclass Feature: **Land's Aid***
  - name: Circle of the Land Spells
    level: 3
    description: |-
      Whenever you finish a Long Rest, choose one type of land: arid, polar, temperate, or tropical. Consult the table below that corresponds to the chosen type; you have the spells listed for your Druid level and lower prepared.

      **Arid Land**

      | Druid Level | Circle Spells |
      | --- | --- |
      | 3 | Blur, Burning Hands, Fire Bolt |
      | 5 | Fireball |
      | 7 | Blight |
      | 9 | Wall of Stone |

      **Polar Land**

      | Druid Level | Circle Spells |
      | --- | --- |
      | 3 | Fog Cloud, Hold Person, Ray of Frost |
      | 5 | Sleet Storm |
      | 7 | Ice Storm |
      | 9 | Cone of Cold |

      **Temperate Land**

      | Druid Level | Circle Spells |
      | --- | --- |
      | 3 | Misty Step, Shocking Grasp, Sleep |
      | 5 | Lightning Bolt |
      | 7 | Freedom of Movement |
      | 9 | Tree Stride |

      **Tropical Land**

      | Druid Level | Circle Spells |
      | --- | --- |
      | 3 | Acid Splash, Ray of Sickness, Web |
      | 5 | Stinking Cloud |
      | 7 | Polymorph |
      | 9 | Insect Plague |
  - name: Land's Aid
    level: 3
    description: |-
      As a Magic action, you can expend a use of your Wild Shape and choose a point within 60 feet of yourself. Vitality-giving flowers and life-draining thorns appear for a moment in a 10-foot-radius Sphere centered on that point. Each creature of your choice in the Sphere must make a Constitution saving throw against your spell save DC, taking 2d6 Necrotic damage on a failed save or half as much damage on a successful one. One creature of your choice in that area regains 2d6 Hit Points.

      The damage and healing increase by 1d6 when you reach Druid levels 10 (3d6) and 14 (4d6).
  - name: Natural Recovery
    level: 6
    description: |-
      You can cast one of the level 1+ spells that you have prepared from your Circle Spells feature without expending a spell slot, and you must finish a Long Rest before you do so again.

      In addition, when you finish a Short Rest, you can choose expended spell slots to recover. The spell slots can have a combined level that is equal to or less than half your Druid level (round up), and none of them can be level 6+. For example, if you're a level 6 Druid, you can recover up to three levels' worth of spell slots. You can recover a level 3 spell slot, a level 2 and a level 1 spell slot, or three level 1 spell slots. Once you recover spell slots with this feature, you can't do so again until you finish a Long Rest.
  - name: Nature's Ward
    level: 10
    description: |-
      You are immune to the Poisoned condition, and you have Resistance to a damage type associated with your current land choice in the Circle Spells feature, as shown in the Nature's Ward table.

      **Nature's Ward**

      | Land Type | Resistance |
      | --- | --- |
      | Arid | Fire |
      | Polar | Cold |
      | Temperate | Lightning |
      | Tropical | Poison |
  - name: Nature's Sanctuary
    level: 14
    description: |-
      As a Magic action, you can expend a use of your Wild Shape and cause spectral trees and vines to appear in a 15-foot Cube on the ground within 120 feet of yourself. They last there for 1 minute or until you have the Incapacitated condition or die. You and your allies have Half Cover while in that area, and your allies gain the current Resistance of your Nature's Ward while there.

      As a Bonus Action, you can move the Cube up to 60 feet to ground within 120 feet of yourself.
```
