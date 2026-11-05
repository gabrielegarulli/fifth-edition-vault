---
title: Hydra
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 8
xp: 3900
type: monstrosity
size: Huge
ac: 15
hp: 184
speed: 40
moves:
  - swim
tags:
  - monster
  - monstrosity
  - cr8
  - srd-5-2-1
aliases:
  - Hydra
export_hash: sha256-f7dd633896ca
---

```statblock
columns: 2
forceColumns: true
name: Hydra
source: SRD 5.2.1
size: Huge
type: monstrosity
alignment: Unaligned
ac: 15
hp: 184
hit_dice: 16d12 + 80
speed: 40 ft., Swim 40 ft.
initiative: "+4 (14)"
stats: [20, 12, 20, 2, 10, 7]
skillsaves:
  - perception: 6
condition_immunities: Blinded, Charmed, Deafened, Frightened, Stunned, Unconscious
senses: Darkvision 60 ft.
passive: 16
cr: "8"
traits:
  - name: "Hold Breath"
    desc: "The hydra can hold its breath for 1 hour."
  - name: "Multiple Heads"
    desc: "The hydra has five heads. Whenever the hydra takes 25 damage or more on a single turn, one of its heads dies. The hydra dies if all its heads are dead. At the end of each of its turns when it has at least one living head, the hydra grows two heads for each of its heads that died since its last turn, unless it has taken Fire damage since its last turn. The hydra regains 20 Hit Points when it grows new heads."
  - name: "Reactive Heads"
    desc: "For each head the hydra has beyond one, it gets an extra Reaction that can be used only for Opportunity Attacks."
actions:
  - name: "Multiattack"
    desc: "The hydra makes as many Bite attacks as it has heads."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +8, reach 10 ft. *Hit:* 10 (1d10 + 5) Piercing damage."
```
