---
title: Flesh Golem
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: construct
size: Medium
ac: 9
hp: 127
speed: 30
tags:
  - monster
  - construct
  - cr5
  - srd-5-2-1
aliases:
  - Flesh Golem
export_hash: sha256-c885447615c2
---

```statblock
columns: 2
forceColumns: true
name: Flesh Golem
source: SRD 5.2.1
size: Medium
type: construct
alignment: Neutral
ac: 9
hp: 127
hit_dice: 15d8 + 60
speed: 30 ft.
initiative: "-1 (9)"
stats: [19, 9, 18, 6, 10, 5]
immunities: Lightning, Poison
condition_immunities: Charmed, Exhaustion, Frightened, Paralyzed, Petrified, Poisoned
senses: Darkvision 60 ft.
passive: 10
languages: understands Common plus one other language but can't speak
cr: "5"
traits:
  - name: "Aversion to Fire"
    desc: "If the golem takes Fire damage, it has Disadvantage on attack rolls and ability checks until the end of its next turn."
  - name: "Berserk"
    desc: "Whenever the golem starts its turn Bloodied, roll 1d6. On a 6, the golem goes berserk. On each of its turns while berserk, the golem attacks the nearest creature it can see. If no creature is near enough to move to and attack, the golem attacks an object. Once the golem goes berserk, it remains so until it is destroyed or it is no longer Bloodied.\n\nThe golem's creator, if within 60 feet of the berserk golem, can try to calm it by taking an action to make a DC 15 Charisma (Persuasion) check; the golem must be able to hear its creator. If this check succeeds, the golem ceases being berserk until the start of its next turn, at which point it resumes rolling for the Berserk trait again if it is still Bloodied."
  - name: "Immutable Form"
    desc: "The golem can't shape-shift."
  - name: "Lightning Absorption"
    desc: "Whenever the golem is subjected to Lightning damage, it regains a number of Hit Points equal to the Lightning damage dealt."
  - name: "Magic Resistance"
    desc: "The golem has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The golem makes two Slam attacks."
  - name: "Slam"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 13 (2d8 + 4) Bludgeoning damage plus 4 (1d8) Lightning damage."
```
