# Monsters

[Back to the index](index.md)

A monster note lists in the Bestiary, can be added to an encounter, and draws
its stat block wherever the plugin or Atlas VTT shows one. The stat block itself
is a ` ```statblock ` fence, in the format the Fantasy Statblocks plugin uses;
neither plugin has to be installed for the note to work. The Bestiary's card
reads a few numbers copied into frontmatter.

## The smallest monster that works

<!-- template: monster.minimal.md -->
````markdown
---
title: "Ember Moth"
source: "Homebrew"
cr: 1/4
type: "beast"
size: "Tiny"
tags:
  - "monster"
---

```statblock
name: "Ember Moth"
size: "Tiny"
type: "beast"
ac: 13
hp: 7
speed: "10 ft., Fly 40 ft."
stats: [3, 16, 10, 2, 12, 6]
cr: "1/4"
actions:
  - name: "Scorching Dust"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 5 (1d4 + 3) Fire damage."
```
````

- `cr`, `type` and `size` are what the Bestiary filters and sorts on. `cr` may
  be a fraction: `1/4` and `"1/4"` both read as a quarter.
- The fence's `stats` are the six ability scores in order: Strength, Dexterity,
  Constitution, Intelligence, Wisdom, Charisma.

This monster lists and its stat block opens, but its Bestiary card is blank:
the card does not read the fence.

## Every key the plugin reads

<!-- template: monster.full.md -->
````markdown
---
title: "Ember Moth"
source: "Homebrew"
edition: "5.5e"
statblock: "inline"
cr: 1/4
xp: 50
type: "beast"
size: "Tiny"
ac: 13
hp: 7
speed: 10
moves:
  - "fly"
tags:
  - "monster"
  - "beast"
  - "homebrew"
aliases:
  - "Ember Moth"
---

```statblock
layout: "5.5e Layout"
name: "Ember Moth"
size: "Tiny"
type: "beast"
alignment: "Unaligned"
ac: 13
hp: 7
hit_dice: "3d4"
speed: "10 ft., Fly 40 ft."
initiative: "+3 (13)"
stats: [3, 16, 10, 2, 12, 6]
immunities: "Fire"
senses: "Darkvision 60 ft."
passive: 11
languages: "—"
cr: "1/4"
traits:
  - name: "Glow"
    desc: "The moth sheds Dim Light in a 10-foot radius."
actions:
  - name: "Scorching Dust"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 5 (1d4 + 3) Fire damage."
```

Ember moths gather wherever a fire has burned out, and a lantern left unshuttered
draws them by the dozen.
````

The frontmatter's extra keys are **the card's copies of the stat block**:

| Key | What the card shows |
| --- | --- |
| `ac`, `hp` | Armor Class and hit points, as numbers |
| `speed` | walking speed in feet, as a number |
| `moves` | other movement modes it has: `"fly"`, `"swim"`, `"climb"`, `"burrow"` |
| `xp` | experience points, for building encounters |

Two more are read when they are true: `legendary: true` for a monster with
legendary actions, and `spellcasting: true` for one that casts spells. Both mark
the card. `image` is the path to its token art in your vault.

The fence takes everything a printed stat block has. The Bestiary shows
`hit_dice`, `initiative`, `saves`, `skillsaves`, `resistances`, `immunities`,
`vulnerabilities`, `condition_immunities`, `senses`, `passive` and
`languages`, and the lists `traits`, `actions`, `bonus_actions`, `reactions`
and `legendary_actions`, each item a `name` and a `desc`. For one you have not
written before, open a monster in your Bestiary folder that has it, and copy
its shape.

## Mistakes to avoid

- **The card and the stat block are two copies.** Change a monster's hit points
  in the fence and the card still shows the old number until you change `hp`
  too. Nothing keeps them in step but you.
- **Leave a number out rather than guess.** A card key that is missing is drawn
  as absent; a wrong one is drawn as fact.
- **Write `immunities`, not `damage_immunities`.** A stat block copied from
  elsewhere may use the `damage_` spellings; the Bestiary here does not show
  them. The same goes for `resistances` and `vulnerabilities`.
- **`statblock: "inline"`** in the full example is for the Fantasy Statblocks
  plugin, which reads it. The plugin here does not need it.
