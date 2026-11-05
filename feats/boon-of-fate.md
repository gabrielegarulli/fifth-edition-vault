---
title: Boon of Fate
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
benefit_count: 2
modelled_count: 1
tags:
  - feat
  - feat/epic-boon
  - srd-5-2-1
aliases:
  - Boon of Fate
export_hash: sha256-f323f6247a08
---

# Boon of Fate

*epic boon · Level 19+ | Source: SRD 5.2.1*

You gain the following benefits.

**Improve Fate.** When you or another creature within 60 feet of you succeeds on or fails a D20 Test, you can roll 2d4 and apply the total rolled as a bonus or penalty to the d20 roll. Once you use this benefit, you can't use it again until you roll Initiative or finish a Short or Long Rest.

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
  - key: improve_fate
    name: Improve Fate
    text: When you or another creature within 60 feet of you succeeds on or fails a D20 Test, you can roll 2d4 and apply the total rolled as a bonus or penalty to the d20 roll. Once you use this benefit, you can't use it again until you roll Initiative or finish a Short or Long Rest.
```
