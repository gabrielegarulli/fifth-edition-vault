---
title: Alert
source: SRD 5.2.1
edition: SRD 5.2.1
kind: origin
benefit_count: 2
modelled_count: 1
tags:
  - feat
  - feat/origin
  - srd-5-2-1
aliases:
  - Alert
export_hash: sha256-0926a80f5072
---

# Alert

*origin | Source: SRD 5.2.1*

You gain the following benefits.

**Initiative Proficiency.** When you roll Initiative, you can add your Proficiency Bonus to the roll.

**Initiative Swap.** Immediately after you roll Initiative, you can swap your Initiative with the Initiative of one willing ally in the same combat. You can't make this swap if you or the ally has the [[Incapacitated]] condition.

```vault-feat
benefits:
  - key: overview
    text: You gain the following benefits.
  - key: initiative_proficiency
    name: Initiative Proficiency
    text: When you roll Initiative, you can add your Proficiency Bonus to the roll.
    effects:
      - type: initiative_bonus
        amount:
          kind: proficiency_bonus
  - key: initiative_swap
    name: Initiative Swap
    text: Immediately after you roll Initiative, you can swap your Initiative with the Initiative of one willing ally in the same combat. You can't make this swap if you or the ally has the Incapacitated condition.
```
