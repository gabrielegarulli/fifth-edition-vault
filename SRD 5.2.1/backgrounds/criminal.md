---
title: Criminal
source: SRD 5.2.1
edition: SRD 5.2.1
origin_feat: Alert
abilities:
  - con
  - dex
  - int
skill_proficiencies:
  - sleight of hand
  - stealth
tags:
  - background
  - ability/con
  - ability/dex
  - ability/int
  - feat/alert
  - srd-5-2-1
aliases:
  - Criminal
export_hash: sha256-8cda0ea8ebe1
---

# Criminal

*Constitution/Dexterity/Intelligence · Alert | Source: SRD 5.2.1*

- **Ability Scores:** Dexterity, Constitution, Intelligence
- **Feat:** Alert
- **Skill Proficiencies:** Sleight of Hand, Stealth
- **Tool Proficiency:** Thieves' Tools
- **Equipment:** Choose A or B: (A) 2 Daggers, Thieves' Tools, Crowbar, 2 Pouches, Traveler's Clothes, 16 GP; or (B) 50 GP

```vault-background
traits:
  - key: overview
    text: |-
      - **Ability Scores:** Dexterity, Constitution, Intelligence
      - **Feat:** Alert
      - **Skill Proficiencies:** Sleight of Hand, Stealth
      - **Tool Proficiency:** Thieves' Tools
      - **Equipment:** Choose A or B: (A) 2 Daggers, Thieves' Tools, Crowbar, 2 Pouches, Traveler's Clothes, 16 GP; or (B) 50 GP
ability_options:
  - choose:
      weighted:
        from:
          - dex
          - con
          - int
        weights:
          - 2
          - 1
  - choose:
      weighted:
        from:
          - dex
          - con
          - int
        weights:
          - 1
          - 1
          - 1
skill_proficiencies:
  - sleight of hand: true
    stealth: true
tool_proficiencies:
  - thieves' tools: true
starting_equipment:
  - A:
      - item: dagger|srd
        quantity: 2
      - item: thieves' tools|srd
      - item: crowbar|srd
      - item: pouch|srd
        quantity: 2
      - item: traveler's clothes|srd
      - value: 1600
    B:
      - value: 5000
```
