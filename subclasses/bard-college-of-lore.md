---
title: College of Lore
class: Bard
source: SRD 5.2.1
edition: SRD 5.2.1
type: subclass
subclass_title: Bard Subclass
tags:
  - subclass
  - subclass/bard
  - srd-5-2-1
aliases:
  - College of Lore
  - "Bard: College of Lore"
  - College of Lore (Bard)
export_hash: sha256-d166a0a0e3ab
---

# College of Lore
*Subclass for [[bard|Bard]] (Bard Subclass) | Source: SRD 5.2.1*

### 📜 Always-Prepared Spells

| Character Level | Spells |
| :---: | :--- |
| **6th** | Choice (level=0;1;2;3|class=Cleric;Druid;Wizard), Choice (level=0;1;2;3|class=Cleric;Druid;Wizard) |


### Archetype Feature Milestones

| Level | Features Unlocked |
| :---: | :--- |
| **3rd** | College of Lore, Bonus Proficiencies, Cutting Words |
| **6th** | Magical Discoveries |
| **14th** | Peerless Skill |

## Subclass Features

### Level 3: College of Lore

*Plumb the Depths of Magical Knowledge*

Bards of the College of Lore collect spells and secrets from diverse sources, such as scholarly tomes, mystical rites, and peasant tales. The college's members gather in libraries and universities to share their lore with one another. They also meet at festivals or affairs of state, where they can expose corruption, unravel lies, and poke fun at self-important figures of authority.

*See Subclass Feature: **Bonus Proficiencies***

*See Subclass Feature: **Cutting Words***

### Level 3: Bonus Proficiencies

You gain proficiency with three skills of your choice.

### Level 3: Cutting Words

You learn to use your wit to supernaturally distract, confuse, and otherwise sap the confidence and competence of others. When a creature that you can see within 60 feet of yourself makes a damage roll or succeeds on an ability check or attack roll, you can take a Reaction to expend one use of your Bardic Inspiration; roll your Bardic Inspiration die, and subtract the number rolled from the creature's roll, reducing the damage or potentially turning the success into a failure.

### Level 6: Magical Discoveries

You learn two spells of your choice. These spells can come from the Cleric, Druid, or Wizard spell list or any combination thereof (see a class's section for its spell list). A spell you choose must be a cantrip or a spell for which you have spell slots, as shown in the Bard Features table.

You always have the chosen spells prepared, and whenever you gain a Bard level, you can replace one of the spells with another spell that meets these requirements.

### Level 14: Peerless Skill

When you make an ability check or attack roll and fail, you can expend one use of Bardic Inspiration; roll the Bardic Inspiration die, and add the number rolled to the d20, potentially turning a failure into a success. On a failure, the Bardic Inspiration isn't expended.

```vault-subclass
name: College of Lore
short_name: Lore
class_name: Bard
class_source: SRD 5.2.1
source: SRD 5.2.1
data:
  additionalSpells:
    - prepared:
        "6":
          - choose: level=0;1;2;3|class=Cleric;Druid;Wizard
          - choose: level=0;1;2;3|class=Cleric;Druid;Wizard
  subclassFeatures:
    - College of Lore|Bard|SRD|Lore|SRD|3
    - Magical Discoveries|Bard|SRD|Lore|SRD|6
    - Peerless Skill|Bard|SRD|Lore|SRD|14
features:
  - name: College of Lore
    level: 3
    description: |-
      *Plumb the Depths of Magical Knowledge*

      Bards of the College of Lore collect spells and secrets from diverse sources, such as scholarly tomes, mystical rites, and peasant tales. The college's members gather in libraries and universities to share their lore with one another. They also meet at festivals or affairs of state, where they can expose corruption, unravel lies, and poke fun at self-important figures of authority.

      *See Subclass Feature: **Bonus Proficiencies***

      *See Subclass Feature: **Cutting Words***
  - name: Bonus Proficiencies
    level: 3
    description: You gain proficiency with three skills of your choice.
    choices:
      type: skill
      count: 3
  - name: Cutting Words
    level: 3
    description: You learn to use your wit to supernaturally distract, confuse, and otherwise sap the confidence and competence of others. When a creature that you can see within 60 feet of yourself makes a damage roll or succeeds on an ability check or attack roll, you can take a Reaction to expend one use of your Bardic Inspiration; roll your Bardic Inspiration die, and subtract the number rolled from the creature's roll, reducing the damage or potentially turning the success into a failure.
  - name: Magical Discoveries
    level: 6
    description: |-
      You learn two spells of your choice. These spells can come from the Cleric, Druid, or Wizard spell list or any combination thereof (see a class's section for its spell list). A spell you choose must be a cantrip or a spell for which you have spell slots, as shown in the Bard Features table.

      You always have the chosen spells prepared, and whenever you gain a Bard level, you can replace one of the spells with another spell that meets these requirements.
  - name: Peerless Skill
    level: 14
    description: When you make an ability check or attack roll and fail, you can expend one use of Bardic Inspiration; roll the Bardic Inspiration die, and add the number rolled to the d20, potentially turning a failure into a success. On a failure, the Bardic Inspiration isn't expended.
```
