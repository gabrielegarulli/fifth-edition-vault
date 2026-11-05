---
title: Giant Spider
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1
xp: 200
type: beast
size: Large
ac: 14
hp: 26
speed: 30
moves:
  - climb
tags:
  - monster
  - beast
  - cr1
  - srd-5-2-1
aliases:
  - Giant Spider
export_hash: sha256-2e02db45fc4b
---

```statblock
columns: 2
forceColumns: true
name: Giant Spider
source: SRD 5.2.1
size: Large
type: beast
alignment: Unaligned
ac: 14
hp: 26
hit_dice: 4d10 + 4
speed: 30 ft., Climb 30 ft.
initiative: "+3 (13)"
stats: [14, 16, 12, 2, 11, 4]
skillsaves:
  - perception: 4
  - stealth: 7
senses: Darkvision 60 ft.
passive: 14
cr: "1"
traits:
  - name: "Spider Climb"
    desc: "The spider can climb difficult surfaces, including along ceilings, without needing to make an ability check."
  - name: "Web Walker"
    desc: "The spider ignores movement restrictions caused by webs, and it knows the location of any other creature in contact with the same web."
actions:
  - name: "Bite"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 7 (1d8 + 3) Piercing damage plus 7 (2d6) Poison damage."
  - name: "Web (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 13, one creature the spider can see within 60 feet. *Failure:* The target has the [[Restrained]] condition until the web is destroyed (AC 10; HP 5; Vulnerability to Fire damage; Immunity to Poison and Psychic damage)."
```
