---
title: Boon of Combat Prowess
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
  - Boon of Combat Prowess
export_hash: sha256-b47dfd0ca0fd
---

# Boon of Combat Prowess

*epic boon · Level 19+ | Source: SRD 5.2.1*

You gain the following benefits.

**Peerless Aim.** When you miss with an attack roll, you can hit instead. Once you use this benefit, you can't use it again until the start of your next turn.

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
  - key: peerless_aim
    name: Peerless Aim
    text: When you miss with an attack roll, you can hit instead. Once you use this benefit, you can't use it again until the start of your next turn.
```
