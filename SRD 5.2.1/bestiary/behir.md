---
title: Behir
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 11
xp: 7200
type: monstrosity
size: Huge
ac: 17
hp: 168
speed: 50
moves:
  - climb
tags:
  - monster
  - monstrosity
  - cr11
  - srd-5-2-1
aliases:
  - Behir
export_hash: sha256-743f9c946bea
---

```statblock
columns: 2
forceColumns: true
name: Behir
source: SRD 5.2.1
size: Huge
type: monstrosity
alignment: Neutral Evil
ac: 17
hp: 168
hit_dice: 16d12 + 64
speed: 50 ft., Climb 50 ft.
initiative: "+3 (13)"
stats: [23, 16, 18, 7, 14, 12]
skillsaves:
  - perception: 6
  - stealth: 7
immunities: Lightning
senses: Darkvision 90 ft.
passive: 16
languages: Draconic
cr: "11"
actions:
  - name: "Multiattack"
    desc: "The behir makes one Bite attack and uses Constrict."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +10, reach 10 ft. *Hit:* 19 (2d12 + 6) Piercing damage plus 11 (2d10) Lightning damage."
  - name: "Constrict"
    desc: "*Strength Saving Throw:* DC 18, one Large or smaller creature the behir can see within 5 feet. *Failure:* 28 (5d8 + 6) Bludgeoning damage. The target has the [[Grappled]] condition (escape DC 16), and it has the [[Restrained]] condition until the grapple ends."
  - name: "Lightning Breath (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 16, each creature in a 90-foot-long, 5-foot-wide Line. *Failure:* 66 (12d10) Lightning damage. *Success:* Half damage."
bonus_actions:
  - name: "Swallow"
    desc: "*Dexterity Saving Throw:* DC 18, one Large or smaller creature [[Grappled]] by the behir (the behir can have only one creature swallowed at a time). *Failure:* The behir swallows the target, which is no longer [[Grappled]]. While swallowed, a creature has the [[Blinded]] and [[Restrained]] conditions, has Total Cover against attacks and other effects outside the behir, and takes 21 (6d6) Acid damage at the start of each of the behir's turns.\n\nIf the behir takes 30 damage or more on a single turn from the swallowed creature, the behir must succeed on a DC 14 Constitution saving throw at the end of that turn or regurgitate the creature, which falls in a space within 10 feet of the behir and has the [[Prone]] condition. If the behir dies, a swallowed creature is no longer [[Restrained]] and can escape from the corpse by using 15 feet of movement, exiting [[Prone]]."
```
