---
title: Soldier
source: SRD 5.2.1
edition: SRD 5.2.1
origin_feat: Savage Attacker
abilities:
  - con
  - dex
  - str
skill_proficiencies:
  - athletics
  - intimidation
tags:
  - background
  - ability/con
  - ability/dex
  - ability/str
  - feat/savage-attacker
  - srd-5-2-1
aliases:
  - Soldier
export_hash: sha256-d808461e07fa
---

# Soldier

*Constitution/Dexterity/Strength · Savage Attacker | Source: SRD 5.2.1*

- **Ability Scores:** Strength, Dexterity, Constitution
- **Feat:** Savage Attacker
- **Skill Proficiencies:** Athletics, Intimidation
- **Tool Proficiency:** Choose one kind of Gaming Set
- **Equipment:** Choose A or B: (A) Spear, Shortbow, 20 Arrows, Gaming Set (same as above), Healer's Kit, Quiver, Traveler's Clothes, 14 GP; or (B) 50 GP

```vault-background
traits:
  - key: overview
    text: |-
      - **Ability Scores:** Strength, Dexterity, Constitution
      - **Feat:** Savage Attacker
      - **Skill Proficiencies:** Athletics, Intimidation
      - **Tool Proficiency:** Choose one kind of Gaming Set
      - **Equipment:** Choose A or B: (A) Spear, Shortbow, 20 Arrows, Gaming Set (same as above), Healer's Kit, Quiver, Traveler's Clothes, 14 GP; or (B) 50 GP
ability_options:
  - choose:
      weighted:
        from:
          - str
          - dex
          - con
        weights:
          - 2
          - 1
  - choose:
      weighted:
        from:
          - str
          - dex
          - con
        weights:
          - 1
          - 1
          - 1
skill_proficiencies:
  - athletics: true
    intimidation: true
tool_proficiencies:
  - anyGamingSet: 1
starting_equipment:
  - A:
      - item: spear|srd
      - item: shortbow|srd
      - item: arrows (20)|srd
      - equipmentType: setGaming
      - item: healer's kit|srd
      - item: quiver|srd
      - item: traveler's clothes|srd
      - value: 1400
    B:
      - value: 5000
```
