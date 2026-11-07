---
title: Boon of the Night Spirit
source: SRD 5.2.1
edition: SRD 5.2.1
kind: epic_boon
prerequisite: Level 19+
abilities:
  - cha
  - con
  - dex
  - int
  - str
  - wis
benefit_count: 3
modelled_count: 1
tags:
  - feat
  - feat/epic-boon
  - srd-5-2-1
aliases:
  - Boon of the Night Spirit
export_hash: sha256-f9553887b93b
---

# Boon of the Night Spirit

*epic boon · Level 19+ | Source: SRD 5.2.1*

You gain the following benefits.

**Merge with Shadows.** While within Dim Light or Darkness, you can give yourself the [[Invisible]] condition as a Bonus Action. The condition ends on you immediately after you take an action, a Bonus Action, or a Reaction.

**Shadowy Form.** While within Dim Light or Darkness, you have Resistance to all damage except Psychic and Radiant.

```vault-feat
benefits:
  - key: ability_score_increase
    name: Ability Score Increase
    text: Increase one ability score of your choice by 1, to a maximum of 30.
    effects:
      - type: ability_score_choice
        options:
          - str
          - dex
          - con
          - int
          - wis
          - cha
        amount: 1
        max: 30
  - key: overview
    text: You gain the following benefits.
  - key: merge_with_shadows
    name: Merge with Shadows
    text: While within Dim Light or Darkness, you can give yourself the Invisible condition as a Bonus Action. The condition ends on you immediately after you take an action, a Bonus Action, or a Reaction.
  - key: shadowy_form
    name: Shadowy Form
    text: While within Dim Light or Darkness, you have Resistance to all damage except Psychic and Radiant.
```
