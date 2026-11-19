---
title: "Hearthbound Resolve"
source: "Homebrew"
edition: "5.5e"
kind: "general"
prerequisite: "Level 4+"
abilities:
  - "con"
  - "wis"
benefit_count: 3
modelled_count: 3
tags:
  - "feat"
  - "feat/general"
  - "homebrew"
aliases:
  - "Hearthbound Resolve"
---

# Hearthbound Resolve

*General Feat (Prerequisite: Level 4+) | Source: Homebrew*

You carry the warmth of home with you. You gain the following benefits.

```vault-feat
benefits:
  - key: "overview"
    text: "You gain the following benefits."
  - key: "ability_score_increase"
    name: "Ability Score Increase"
    text: "Increase your Constitution or Wisdom score by 1, to a maximum of 20."
    effects:
      - type: "ability_score_choice"
        amount: 1
        max: 20
        options:
          - "con"
          - "wis"
  - key: "steady_flame"
    name: "Steady Flame"
    text: "You have Resistance to Fire damage."
    effects:
      - type: "resistance"
        value: "fire"
  - key: "hearth_rest"
    name: "Hearth's Rest"
    text: "When you finish a Short Rest, you can regain one spent Hit Point Die. Once you use this benefit, you can't use it again until you finish a Long Rest."
    effects:
      - type: "feature_resource"
        key: "hearthbound_resolve_hearth_rest"
        name: "Hearth's Rest"
        uses: 1
        resets: "long_rest"
```
