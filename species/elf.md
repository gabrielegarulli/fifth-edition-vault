---
title: Elf
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
  - Elf
export_hash: sha256-67d47606b0f4
---

# Elf

*Medium, 30 ft. | Source: SRD 5.2.1*

**Darkvision.** You have Darkvision with a range of 60 feet.

**Elven Lineage.** You are part of a lineage that grants you supernatural abilities. Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage.

When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table. You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level.

Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage).

**Elven Lineages**
| Lineage | Level 1 | Level 3 | Level 5 |
| --- | --- | --- | --- |
| Drow | The range of your Darkvision increases to 120 feet. You also know the Dancing Lights cantrip. | Faerie Fire | Darkness |
| High Elf | You know the Prestidigitation cantrip. Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list. | Detect Magic | Misty Step |
| Wood Elf | Your Speed increases to 35 feet. You also know the Druidcraft cantrip. | Longstrider | Pass without Trace |

**Fey Ancestry.** You have Advantage on saving throws you make to avoid or end the [[Charmed]] condition.

**Keen Senses.** You have proficiency in the Insight, Perception, or Survival skill.

**Trance.** You don't need to sleep, and magic can't put you to sleep. You can finish a Long Rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness.

```vault-species
traits:
  - key: darkvision
    name: Darkvision
    text: You have Darkvision with a range of 60 feet.
  - key: elven_lineage
    name: Elven Lineage
    text: |-
      You are part of a lineage that grants you supernatural abilities. Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage.

      When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table. You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level.

      Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage).

      **Elven Lineages**
      | Lineage | Level 1 | Level 3 | Level 5 |
      | --- | --- | --- | --- |
      | Drow | The range of your Darkvision increases to 120 feet. You also know the Dancing Lights cantrip. | Faerie Fire | Darkness |
      | High Elf | You know the Prestidigitation cantrip. Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list. | Detect Magic | Misty Step |
      | Wood Elf | Your Speed increases to 35 feet. You also know the Druidcraft cantrip. | Longstrider | Pass without Trace |
  - key: fey_ancestry
    name: Fey Ancestry
    text: You have Advantage on saving throws you make to avoid or end the Charmed condition.
  - key: keen_senses
    name: Keen Senses
    text: You have proficiency in the Insight, Perception, or Survival skill.
  - key: trance
    name: Trance
    text: You don't need to sleep, and magic can't put you to sleep. You can finish a Long Rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness.
speciesSpellcasting:
  trait: Elven Lineage
  ability:
    choose:
      - int
      - wis
      - cha
  lineages:
    - name: Drow
      benefit: The range of your Darkvision increases to 120 feet. You also know the Dancing Lights cantrip.
      spells:
        - level: 1
          key: dancing lights
          cantrip: true
          kind: known
          id: dancing-lights
          name: Dancing Lights
        - level: 3
          key: faerie fire
          cantrip: false
          kind: innate
          uses: 1
          id: faerie-fire
          name: Faerie Fire
        - level: 5
          key: darkness
          cantrip: false
          kind: innate
          uses: 1
          id: darkness
          name: Darkness
    - name: High Elf
      benefit: You know the Prestidigitation cantrip. Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list.
      spells:
        - level: 1
          key: prestidigitation
          cantrip: true
          kind: known
          id: prestidigitation
          name: Prestidigitation
        - level: 3
          key: detect magic
          cantrip: false
          kind: innate
          uses: 1
          id: detect-magic
          name: Detect Magic
        - level: 5
          key: misty step
          cantrip: false
          kind: innate
          uses: 1
          id: misty-step
          name: Misty Step
      cantripChoice:
        spellList: Wizard
        level: 0
        count: 1
        replaces: Prestidigitation
    - name: Wood Elf
      benefit: Your Speed increases to 35 feet. You also know the Druidcraft cantrip.
      spells:
        - level: 1
          key: druidcraft
          cantrip: true
          kind: known
          id: druidcraft
          name: Druidcraft
        - level: 3
          key: longstrider
          cantrip: false
          kind: innate
          uses: 1
          id: longstrider
          name: Longstrider
        - level: 5
          key: pass without trace
          cantrip: false
          kind: innate
          uses: 1
          id: pass-without-trace
          name: Pass without Trace
```
