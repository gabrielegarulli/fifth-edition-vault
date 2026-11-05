---
title: Swarm of Ravens
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1/4
xp: 50
type: beast
size: Medium
ac: 12
hp: 11
speed: 10
moves:
  - fly
tags:
  - monster
  - beast
  - cr1-4
  - srd-5-2-1
aliases:
  - Swarm of Ravens
export_hash: sha256-f9a7c9e27425
---

```statblock
columns: 2
forceColumns: true
name: Swarm of Ravens
source: SRD 5.2.1
size: Medium
type: beast
alignment: Unaligned
ac: 12
hp: 11
hit_dice: 2d8 + 2
speed: 10 ft., Fly 50 ft.
initiative: "+2 (12)"
stats: [6, 14, 12, 5, 12, 6]
skillsaves:
  - perception: 5
resistances: Bludgeoning, Piercing, Slashing
condition_immunities: Charmed, Frightened, Grappled, Paralyzed, Petrified, Prone, Restrained, Stunned
passive: 15
cr: "1/4"
traits:
  - name: "Swarm"
    desc: "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny raven. The swarm can't regain Hit Points or gain Temporary Hit Points."
actions:
  - name: "Beaks"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Piercing damage, or 2 (1d4) Piercing damage if the swarm is Bloodied."
  - name: "Cacophony (Recharge 6)"
    desc: "*Wisdom Saving Throw:* DC 10, one creature in the swarm's space. *Failure:* The target has the [[Deafened]] condition until the start of the swarm's next turn. While [[Deafened]], the target also has Disadvantage on ability checks and attack rolls."
```
