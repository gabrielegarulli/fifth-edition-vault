---
title: "Lamplighter"
source: "Homebrew"
edition: "5.5e"
origin_feat: "Alert"
abilities:
  - "dex"
  - "wis"
  - "cha"
skill_proficiencies:
  - "perception"
  - "stealth"
tags:
  - "background"
  - "feat/alert"
  - "homebrew"
aliases:
  - "Lamplighter"
---

# Lamplighter

*Background | Source: Homebrew*

You walked the streets at dusk, lighting the lamps one by one, and learned
every alley, rooftop and back door of the city on the way.

```vault-background
traits:
  - key: "overview"
    text: |-
      - **Ability Scores:** Dexterity, Wisdom, Charisma
      - **Feat:** Alert
      - **Skill Proficiencies:** Perception, Stealth
      - **Tool Proficiency:** Tinker's Tools
      - **Equipment:** Choose A or B: (A) Tinker's Tools, Lamp, 2 Flasks of Oil, Traveler's Clothes, 12 GP; or (B) 50 GP
ability_options:
  - choose:
      weighted:
        from:
          - "dex"
          - "wis"
          - "cha"
        weights:
          - 2
          - 1
  - choose:
      weighted:
        from:
          - "dex"
          - "wis"
          - "cha"
        weights:
          - 1
          - 1
          - 1
skill_proficiencies:
  - perception: true
    stealth: true
tool_proficiencies:
  - "tinker's tools": true
starting_equipment:
  - A:
      - item: "tinker's tools"
      - item: "lamp"
      - item: "oil (flask)"
        quantity: 2
      - item: "traveler's clothes"
      - value: 1200
    B:
      - value: 5000
```
