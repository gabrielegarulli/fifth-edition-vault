---
title: Boon of Spell Recall
source: SRD 5.2.1
edition: SRD 5.2.1
kind: epic_boon
prerequisite: Level 19+, Spellcasting or Pact Magic feature
abilities:
  - cha
  - int
  - wis
benefit_count: 2
modelled_count: 1
tags:
  - feat
  - feat/epic-boon
  - srd-5-2-1
aliases:
  - Boon of Spell Recall
export_hash: sha256-b63e8a612477
---

# Boon of Spell Recall

*epic boon · Level 19+, Spellcasting or Pact Magic feature | Source: SRD 5.2.1*

You gain the following benefits.

**Free Casting.** Whenever you cast a spell with a level 1-4 spell slot, roll 1d4. If the number you roll is the same as the slot's level, the slot isn't expended.

```vault-feat
benefits:
  - key: ability_score_increase
    name: Ability Score Increase
    text: Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 30.
    effects:
      - type: ability_score_choice
        options:
          - int
          - wis
          - cha
        amount: 1
        max: 30
  - key: overview
    text: You gain the following benefits.
  - key: free_casting
    name: Free Casting
    text: Whenever you cast a spell with a level 1-4 spell slot, roll 1d4. If the number you roll is the same as the slot's level, the slot isn't expended.
```
