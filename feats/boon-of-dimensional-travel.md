---
title: Boon of Dimensional Travel
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
  - Boon of Dimensional Travel
export_hash: sha256-de6be02deb25
---

# Boon of Dimensional Travel

*epic boon · Level 19+ | Source: SRD 5.2.1*

You gain the following benefits.

**Blink Steps.** Immediately after you take the Attack action or the Magic action, you can teleport up to 30 feet to an unoccupied space you can see.

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
  - key: blink_steps
    name: Blink Steps
    text: Immediately after you take the Attack action or the Magic action, you can teleport up to 30 feet to an unoccupied space you can see.
```
