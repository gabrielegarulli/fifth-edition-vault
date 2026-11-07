---
title: Clay Golem
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 9
xp: 5000
type: construct
size: Large
ac: 14
hp: 123
speed: 20
tags:
  - monster
  - construct
  - cr9
  - srd-5-2-1
aliases:
  - Clay Golem
export_hash: sha256-be81634cc0ed
---

```statblock
columns: 2
forceColumns: true
name: Clay Golem
source: SRD 5.2.1
size: Large
type: construct
alignment: Unaligned
ac: 14
hp: 123
hit_dice: 13d10 + 52
speed: 20 ft.
initiative: "+3 (13)"
stats: [20, 9, 18, 3, 8, 1]
resistances: Bludgeoning, Piercing, Slashing
immunities: Acid, Poison, Psychic
condition_immunities: Charmed, Exhaustion, Frightened, Paralyzed, Petrified, Poisoned
senses: Darkvision 60 ft.
passive: 9
languages: Common plus one other language
cr: "9"
traits:
  - name: "Acid Absorption"
    desc: "Whenever the golem is subjected to Acid damage, it takes no damage and instead regains a number of Hit Points equal to the Acid damage dealt."
  - name: "Berserk"
    desc: "Whenever the golem starts its turn Bloodied, roll 1d6. On a 6, the golem goes berserk. On each of its turns while berserk, the golem attacks the nearest creature it can see. If no creature is near enough to move to and attack, the golem attacks an object. Once the golem goes berserk, it continues to be berserk until it is destroyed or it is no longer Bloodied."
  - name: "Immutable Form"
    desc: "The golem can't shape-shift."
  - name: "Magic Resistance"
    desc: "The golem has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The golem makes two Slam attacks, or it makes three Slam attacks if it used Hasten this turn."
  - name: "Slam"
    desc: "*Melee Attack Roll:* +9, reach 5 ft. *Hit:* 10 (1d10 + 5) Bludgeoning damage plus 6 (1d12) Acid damage, and the target's Hit Point maximum decreases by an amount equal to the Acid damage taken."
bonus_actions:
  - name: "Hasten (Recharge 5–6)"
    desc: "The golem takes the Dash and Disengage actions."
```
