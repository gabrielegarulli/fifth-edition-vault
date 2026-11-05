---
title: Grappler
source: SRD 5.2.1
edition: SRD 5.2.1
kind: general
prerequisite: Level 4+, Strength 13+, Dexterity 13+
abilities:
  - dex
  - str
benefit_count: 4
modelled_count: 1
tags:
  - feat
  - feat/general
  - srd-5-2-1
aliases:
  - Grappler
export_hash: sha256-6c5c12f2a3c8
---

# Grappler

*general · Level 4+, Strength 13+, Dexterity 13+ | Source: SRD 5.2.1*

You gain the following benefits.

**Punch and Grab.** When you hit a creature with an Unarmed Strike as part of the Attack action on your turn, you can use both the Damage and the Grapple option. You can use this benefit only once per turn.

**Attack Advantage.** You have Advantage on attack rolls against a creature [[Grappled]] by you.

**Fast Wrestler.** You don't have to spend extra movement to move a creature [[Grappled]] by you if the creature is your size or smaller.

```vault-feat
benefits:
  - key: ability_score_increase
    name: Ability Score Increase
    text: Increase your Strength or Dexterity score by 1, to a maximum of 20.
    effects:
      - type: ability_score_choice
        options:
          - str
          - dex
        amount: 1
        max: 20
  - key: overview
    text: You gain the following benefits.
  - key: punch_and_grab
    name: Punch and Grab
    text: When you hit a creature with an Unarmed Strike as part of the Attack action on your turn, you can use both the Damage and the Grapple option. You can use this benefit only once per turn.
  - key: attack_advantage
    name: Attack Advantage
    text: You have Advantage on attack rolls against a creature Grappled by you.
  - key: fast_wrestler
    name: Fast Wrestler
    text: You don't have to spend extra movement to move a creature Grappled by you if the creature is your size or smaller.
```
