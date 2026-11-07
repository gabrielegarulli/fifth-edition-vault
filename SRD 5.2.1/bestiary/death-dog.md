---
title: Death Dog
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1
xp: 200
type: monstrosity
size: Medium
ac: 12
hp: 39
speed: 40
tags:
  - monster
  - monstrosity
  - cr1
  - srd-5-2-1
aliases:
  - Death Dog
export_hash: sha256-6a88ddf5bc3a
---

```statblock
columns: 2
forceColumns: true
name: Death Dog
source: SRD 5.2.1
size: Medium
type: monstrosity
alignment: Neutral Evil
ac: 12
hp: 39
hit_dice: 6d8 + 12
speed: 40 ft.
initiative: "+2 (12)"
stats: [15, 14, 14, 3, 13, 6]
skillsaves:
  - perception: 5
  - stealth: 4
condition_immunities: Blinded, Charmed, Deafened, Frightened, Stunned, Unconscious
senses: Darkvision 120 ft.
passive: 15
cr: "1"
actions:
  - name: "Multiattack"
    desc: "The death dog makes two Bite attacks."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 4 (1d4 + 2) Piercing damage. If the target is a creature, it is subjected to the following effect. *Constitution Saving Throw:* DC 12. 1 The target has the [[Poisoned]] condition. While [[Poisoned]], the target's Hit Point maximum doesn't return to normal when finishing a Long Rest, and it repeats the save every 24 hours that elapse, ending the effect on itself on a success. Subsequent Failures: The [[Poisoned]] target's Hit Point maximum decreases by 5 (1d10)."
```
