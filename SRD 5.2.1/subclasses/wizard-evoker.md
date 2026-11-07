---
title: Evoker
class: Wizard
source: SRD 5.2.1
edition: SRD 5.2.1
type: subclass
subclass_title: Wizard Subclass
tags:
  - subclass
  - subclass/wizard
  - srd-5-2-1
aliases:
  - Evoker
  - "Wizard: Evoker"
  - Evoker (Wizard)
export_hash: sha256-1b3f09e109f0
---

# Evoker
*Subclass for [[wizard|Wizard]] (Wizard Subclass) | Source: SRD 5.2.1*

### 📜 Subclass Spells Known

| Character Level | Spells |
| :---: | :--- |
| **3rd** | Choice (level=0;1;2|class=Wizard|school=V), Choice (level=0;1;2|class=Wizard|school=V) |
| **5th** | Choice (level=0;1;2;3|class=Wizard|school=V) |
| **7th** | Choice (level=0;1;2;3;4|class=Wizard|school=V) |
| **9th** | Choice (level=0;1;2;3;4;5|class=Wizard|school=V) |
| **11th** | Choice (level=0;1;2;3;4;5;6|class=Wizard|school=V) |
| **13th** | Choice (level=0;1;2;3;4;5;6;7|class=Wizard|school=V) |
| **15th** | Choice (level=0;1;2;3;4;5;6;7;8|class=Wizard|school=V) |
| **17th** | Choice (level=0;1;2;3;4;5;6;7;8;9|class=Wizard|school=V) |


### Archetype Feature Milestones

| Level | Features Unlocked |
| :---: | :--- |
| **3rd** | Evoker, Evocation Savant, Potent Cantrip |
| **6th** | Sculpt Spells |
| **10th** | Empowered Evocation |
| **14th** | Overchannel |

## Subclass Features

### Level 3: Evoker

*Create Explosive Elemental Effects*

Your studies focus on magic that creates powerful elemental effects such as bitter cold, searing flame, rolling thunder, crackling lightning, and burning acid. Some Evokers find employment in military forces, serving as artillery to blast armies from afar. Others use their power to protect others, while some seek their own gain.

*See Subclass Feature: **Evocation Savant***

*See Subclass Feature: **Potent Cantrip***

### Level 3: Evocation Savant

Choose two Wizard spells from the Evocation school, each of which must be no higher than level 2, and add them to your spellbook for free.

In addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Evocation school to your spellbook for free. The chosen spell must be of a level for which you have spell slots.

### Level 3: Potent Cantrip

Your damaging cantrips affect even creatures that avoid the brunt of the effect. When you cast a cantrip at a creature and you miss with the attack roll or the target succeeds on a saving throw against the cantrip, the target takes half the cantrip's damage (if any) but suffers no additional effect from the cantrip.

### Level 6: Sculpt Spells

You can create pockets of relative safety within the effects of your evocations. When you cast an Evocation spell that affects other creatures that you can see, you can choose a number of them equal to 1 plus the spell's level. The chosen creatures automatically succeed on their saving throws against the spell, and they take no damage if they would normally take half damage on a successful save.

### Level 10: Empowered Evocation

Whenever you cast a Wizard spell from the Evocation school, you can add your Intelligence modifier to one damage roll of that spell.

### Level 14: Overchannel

You can increase the power of your spells. When you cast a Wizard spell with a spell slot of levels 1–5 that deals damage, you can deal maximum damage with that spell on the turn you cast it.

The first time you do so, you suffer no adverse effect. If you use this feature again before you finish a Long Rest, you take 2d12 Necrotic damage for each level of the spell slot immediately after you cast it. This damage ignores Resistance and Immunity.

Each time you use this feature again before finishing a Long Rest, the Necrotic damage per spell level increases by 1d12.

```vault-subclass
name: Evoker
short_name: Evoker
class_name: Wizard
class_source: SRD 5.2.1
source: SRD 5.2.1
data:
  additionalSpells:
    - known:
        "3":
          - choose: level=0;1;2|class=Wizard|school=V
          - choose: level=0;1;2|class=Wizard|school=V
        "5":
          - choose: level=0;1;2;3|class=Wizard|school=V
        "7":
          - choose: level=0;1;2;3;4|class=Wizard|school=V
        "9":
          - choose: level=0;1;2;3;4;5|class=Wizard|school=V
        "11":
          - choose: level=0;1;2;3;4;5;6|class=Wizard|school=V
        "13":
          - choose: level=0;1;2;3;4;5;6;7|class=Wizard|school=V
        "15":
          - choose: level=0;1;2;3;4;5;6;7;8|class=Wizard|school=V
        "17":
          - choose: level=0;1;2;3;4;5;6;7;8;9|class=Wizard|school=V
  subclassFeatures:
    - Evoker|Wizard|SRD|Evoker|SRD|3
    - Sculpt Spells|Wizard|SRD|Evoker|SRD|6
    - Empowered Evocation|Wizard|SRD|Evoker|SRD|10
    - Overchannel|Wizard|SRD|Evoker|SRD|14
features:
  - name: Evoker
    level: 3
    description: |-
      *Create Explosive Elemental Effects*

      Your studies focus on magic that creates powerful elemental effects such as bitter cold, searing flame, rolling thunder, crackling lightning, and burning acid. Some Evokers find employment in military forces, serving as artillery to blast armies from afar. Others use their power to protect others, while some seek their own gain.

      *See Subclass Feature: **Evocation Savant***

      *See Subclass Feature: **Potent Cantrip***
  - name: Evocation Savant
    level: 3
    description: |-
      Choose two Wizard spells from the Evocation school, each of which must be no higher than level 2, and add them to your spellbook for free.

      In addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Evocation school to your spellbook for free. The chosen spell must be of a level for which you have spell slots.
  - name: Potent Cantrip
    level: 3
    description: Your damaging cantrips affect even creatures that avoid the brunt of the effect. When you cast a cantrip at a creature and you miss with the attack roll or the target succeeds on a saving throw against the cantrip, the target takes half the cantrip's damage (if any) but suffers no additional effect from the cantrip.
  - name: Sculpt Spells
    level: 6
    description: You can create pockets of relative safety within the effects of your evocations. When you cast an Evocation spell that affects other creatures that you can see, you can choose a number of them equal to 1 plus the spell's level. The chosen creatures automatically succeed on their saving throws against the spell, and they take no damage if they would normally take half damage on a successful save.
  - name: Empowered Evocation
    level: 10
    description: Whenever you cast a Wizard spell from the Evocation school, you can add your Intelligence modifier to one damage roll of that spell.
  - name: Overchannel
    level: 14
    description: |-
      You can increase the power of your spells. When you cast a Wizard spell with a spell slot of levels 1–5 that deals damage, you can deal maximum damage with that spell on the turn you cast it.

      The first time you do so, you suffer no adverse effect. If you use this feature again before you finish a Long Rest, you take 2d12 Necrotic damage for each level of the spell slot immediately after you cast it. This damage ignores Resistance and Immunity.

      Each time you use this feature again before finishing a Long Rest, the Necrotic damage per spell level increases by 1d12.
```
