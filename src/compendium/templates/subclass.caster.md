---
title: "Glyphcutter"
class: "Rogue"
source: "Homebrew"
subclass_title: "Rogue Subclass"
tags:
  - "subclass"
  - "subclass/rogue"
  - "homebrew"
aliases:
  - "Glyphcutter"
  - "Rogue: Glyphcutter"
---

# Glyphcutter

*Subclass for [[rogue|Rogue]] | Source: Homebrew*

Glyphcutters carve small arcane marks into locks, doorframes and shadows, and
learn a thief's handful of wizardry along the way.

## Level 3: Glyphcutter Spellcasting

You cast spells from the Wizard spell list, and Intelligence is your
spellcasting ability for them. You know the *Mage Hand* cantrip and two other
Wizard cantrips of your choice, and one more at Rogue level 10. The table below
shows your spell slots and how many level 1+ Wizard spells you prepare.

| Rogue Level | Cantrips | Prepared Spells | 1st | 2nd | 3rd | 4th |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 3 | 3 | 2 | — | — | — |
| 4 | 3 | 4 | 3 | — | — | — |
| 7 | 3 | 5 | 4 | 2 | — | — |
| 10 | 4 | 7 | 4 | 3 | — | — |
| 13 | 4 | 9 | 4 | 3 | 2 | — |
| 16 | 4 | 11 | 4 | 3 | 3 | — |
| 19 | 4 | 12 | 4 | 3 | 3 | 1 |
| 20 | 4 | 13 | 4 | 3 | 3 | 1 |

## Level 9: Etched Escape

When you cast a spell using a spell slot, you can take the Disengage action as
part of the same action.

```vault-subclass
name: "Glyphcutter"
class_name: "Rogue"
source: "Homebrew"
data:
  casterProgression: "1/3"
  spellcastingAbility: "int"
  spellList: "Wizard"
  cantripProgression: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
  preparedSpellsProgression: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13]
  additionalSpells:
    - known:
        3:
          - "mage hand#c"
features:
  - name: "Glyphcutter Spellcasting"
    level: 3
    description: "You cast spells from the Wizard spell list, and Intelligence is your spellcasting ability for them. You know the *Mage Hand* cantrip and two other Wizard cantrips of your choice, and one more at Rogue level 10."
  - name: "Etched Escape"
    level: 9
    description: "When you cast a spell using a spell slot, you can take the Disengage action as part of the same action."
```
