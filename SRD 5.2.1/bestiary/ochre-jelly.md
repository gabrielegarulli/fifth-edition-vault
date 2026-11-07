---
title: Ochre Jelly
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 2
xp: 450
type: ooze
size: Large
ac: 8
hp: 52
speed: 20
moves:
  - climb
tags:
  - monster
  - ooze
  - cr2
  - srd-5-2-1
aliases:
  - Ochre Jelly
export_hash: sha256-bf2478d22046
---

```statblock
columns: 2
forceColumns: true
name: Ochre Jelly
source: SRD 5.2.1
size: Large
type: ooze
alignment: Unaligned
ac: 8
hp: 52
hit_dice: 7d10 + 14
speed: 20 ft., Climb 20 ft.
initiative: "-2 (8)"
stats: [15, 6, 14, 2, 6, 1]
resistances: Acid
immunities: Lightning, Slashing
condition_immunities: Charmed, Deafened, Exhaustion, Frightened, Grappled, Prone, Restrained
senses: Blindsight 60 ft.
passive: 8
cr: "2"
traits:
  - name: "Amorphous"
    desc: "The jelly can move through a space as narrow as 1 inch without expending extra movement to do so."
  - name: "Spider Climb"
    desc: "The jelly can climb difficult surfaces, including along ceilings, without needing to make an ability check."
actions:
  - name: "Pseudopod"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 12 (3d6 + 2) Acid damage."
reactions:
  - name: "Split"
    desc: "*Trigger:* While the jelly is Large or Medium and has 10+ Hit Points, it becomes Bloodied or is subjected to Lightning or Slashing damage. *Response:* The jelly splits into two new Ochre Jellies. Each new jelly is one size smaller than the original jelly and acts on its Initiative. The original jelly's Hit Points are divided evenly between the new jellies (round down)."
```
