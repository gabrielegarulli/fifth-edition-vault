---
title: Sage
source: SRD 5.2.1
edition: SRD 5.2.1
origin_feat: Magic Initiate (Wizard)
abilities:
  - con
  - int
  - wis
skill_proficiencies:
  - arcana
  - history
tags:
  - background
  - ability/con
  - ability/int
  - ability/wis
  - feat/magic-initiate-wizard
  - srd-5-2-1
aliases:
  - Sage
export_hash: sha256-b041adc07875
---

# Sage

*Constitution/Intelligence/Wisdom · Magic Initiate (Wizard) | Source: SRD 5.2.1*

- **Ability Scores:** Constitution, Intelligence, Wisdom
- **Feat:** Magic Initiate (Wizard)
- **Skill Proficiencies:** Arcana, History
- **Tool Proficiency:** Calligrapher's Supplies
- **Equipment:** Choose A or B: (A) Quarterstaff, Calligrapher's Supplies, Book (history), Parchment (8 sheets), Robe, 8 GP; or (B) 50 GP

```vault-background
traits:
  - key: overview
    text: |-
      - **Ability Scores:** Constitution, Intelligence, Wisdom
      - **Feat:** Magic Initiate (Wizard)
      - **Skill Proficiencies:** Arcana, History
      - **Tool Proficiency:** Calligrapher's Supplies
      - **Equipment:** Choose A or B: (A) Quarterstaff, Calligrapher's Supplies, Book (history), Parchment (8 sheets), Robe, 8 GP; or (B) 50 GP
ability_options:
  - choose:
      weighted:
        from:
          - con
          - int
          - wis
        weights:
          - 2
          - 1
  - choose:
      weighted:
        from:
          - con
          - int
          - wis
        weights:
          - 1
          - 1
          - 1
skill_proficiencies:
  - arcana: true
    history: true
tool_proficiencies:
  - calligrapher's supplies: true
starting_equipment:
  - A:
      - item: quarterstaff|srd
      - item: calligrapher's supplies|srd
      - item: book|srd
      - item: parchment|srd
        quantity: 8
      - item: robe|srd
      - value: 800
    B:
      - value: 5000
```
