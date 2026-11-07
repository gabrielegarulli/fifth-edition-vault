---
title: Kraken
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 23
xp: 50000
xp_lair: 62000
type: monstrosity
subtype: titan
size: Gargantuan
ac: 18
hp: 481
speed: 30
moves:
  - swim
legendary: true
tags:
  - monster
  - monstrosity
  - titan
  - cr23
  - srd-5-2-1
aliases:
  - Kraken
export_hash: sha256-e975739d5f84
---

```statblock
columns: 2
forceColumns: true
name: Kraken
source: SRD 5.2.1
size: Gargantuan
type: monstrosity
subtype: titan
alignment: Chaotic Evil
ac: 18
hp: 481
hit_dice: 26d20 + 208
speed: 30 ft., Swim 120 ft.
initiative: "+14 (24)"
stats: [30, 11, 26, 22, 18, 20]
saves:
  - strength: 17
  - dexterity: 7
  - constitution: 15
  - wisdom: 11
skillsaves:
  - history: 13
  - perception: 11
immunities: Cold, Lightning
condition_immunities: Frightened, Grappled, Paralyzed, Restrained
senses: Truesight 120 ft.
passive: 21
languages: understands Abyssal, Celestial, Infernal, and Primordial but can't speak; telepathy 120 ft.
cr: "23"
traits:
  - name: "Amphibious"
    desc: "The kraken can breathe air and water."
  - name: "Legendary Resistance (4/Day, or 5/Day in Lair)"
    desc: "If the kraken fails a saving throw, it can choose to succeed instead."
  - name: "Siege Monster"
    desc: "The kraken deals double damage to objects and structures."
actions:
  - name: "Multiattack"
    desc: "The kraken makes two Tentacle attacks and uses Fling, Lightning Strike, or Swallow."
  - name: "Tentacle"
    desc: "*Melee Attack Roll:* +17, reach 30 ft. *Hit:* 24 (4d6 + 10) Bludgeoning damage. The target has the [[Grappled]] condition (escape DC 20) from one of ten tentacles, and it has the [[Restrained]] condition until the grapple ends."
  - name: "Fling"
    desc: "The kraken throws a Large or smaller creature [[Grappled]] by it to a space it can see within 60 feet of itself that isn't in the air. *Dexterity Saving Throw:* DC 25, the creature thrown and each creature in the destination space. *Failure:* 18 (4d8) Bludgeoning damage, and the target has the [[Prone]] condition. *Success:* Half damage only."
  - name: "Lightning Strike"
    desc: "*Dexterity Saving Throw:* DC 23, one creature the kraken can see within 120 feet. *Failure:* 33 (6d10) Lightning damage. *Success:* Half damage."
  - name: "Swallow"
    desc: "*Dexterity Saving Throw:* DC 25, one creature [[Grappled]] by the kraken (it can have up to four creatures swallowed at a time). *Failure:* 23 (3d8 + 10) Piercing damage. If the target is Large or smaller, it is swallowed and no longer [[Grappled]]. A swallowed creature has the [[Restrained]] condition, has Total Cover against attacks and other effects outside the kraken, and takes 24 (7d6) Acid damage at the start of each of its turns.\n\nIf the kraken takes 50 damage or more on a single turn from a creature inside it, the kraken must succeed on a DC 25 Constitution saving throw at the end of that turn or regurgitate all swallowed creatures, each of which falls in a space within 10 feet of the kraken with the [[Prone]] condition. If the kraken dies, any swallowed creature no longer has the [[Restrained]] condition and can escape from the corpse using 15 feet of movement, exiting [[Prone]]."
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the creature can expend a use to take one of the following actions. The creature regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Storm Bolt"
    desc: "The kraken uses Lightning Strike."
  - name: "Toxic Ink"
    desc: "*Constitution Saving Throw:* DC 23, each creature in a 15-foot Emanation originating from the kraken while it is underwater. *Failure:* The target has the [[Blinded]] and [[Poisoned]] conditions until the end of the kraken's next turn. The kraken then moves up to its Speed. The kraken can't take this action again until the start of its next turn."
```
