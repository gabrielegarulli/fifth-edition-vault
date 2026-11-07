---
title: Acolyte
source: SRD 5.2.1
edition: SRD 5.2.1
origin_feat: Magic Initiate (Cleric)
abilities:
  - cha
  - int
  - wis
skill_proficiencies:
  - insight
  - religion
tags:
  - background
  - ability/cha
  - ability/int
  - ability/wis
  - feat/magic-initiate-cleric
  - srd-5-2-1
aliases:
  - Acolyte
export_hash: sha256-e3ac69add65a
---

# Acolyte

*Charisma/Intelligence/Wisdom · Magic Initiate (Cleric) | Source: SRD 5.2.1*

- **Ability Scores:** Intelligence, Wisdom, Charisma
- **Feat:** Magic Initiate (Cleric)
- **Skill Proficiencies:** Insight, Religion
- **Tool Proficiency:** Calligrapher's Supplies
- **Equipment:** Choose A or B: (A) Calligrapher's Supplies, Book (prayers), Holy Symbol, Parchment (10 sheets), Robe, 8 GP; or (B) 50 GP

```vault-background
traits:
  - key: overview
    text: |-
      - **Ability Scores:** Intelligence, Wisdom, Charisma
      - **Feat:** Magic Initiate (Cleric)
      - **Skill Proficiencies:** Insight, Religion
      - **Tool Proficiency:** Calligrapher's Supplies
      - **Equipment:** Choose A or B: (A) Calligrapher's Supplies, Book (prayers), Holy Symbol, Parchment (10 sheets), Robe, 8 GP; or (B) 50 GP
ability_options:
  - choose:
      weighted:
        from:
          - int
          - wis
          - cha
        weights:
          - 2
          - 1
  - choose:
      weighted:
        from:
          - int
          - wis
          - cha
        weights:
          - 1
          - 1
          - 1
skill_proficiencies:
  - insight: true
    religion: true
tool_proficiencies:
  - calligrapher's supplies: true
starting_equipment:
  - A:
      - item: book|srd
        displayName: Book (Prayers)
      - item: calligrapher's supplies|srd
      - item: holy symbol|srd
      - item: parchment|srd
        quantity: 10
      - item: robe|srd
      - value: 800
    B:
      - value: 5000
```
