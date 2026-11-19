# Backgrounds

[Back to the index](index.md)

A background note is offered in the Character Builder's background step. The
builder takes its origin feat, the abilities it can raise and its skills from
the frontmatter; its tools, its starting equipment and the exact ability
increases come from the ` ```vault-background ` fence.

## The smallest background that works

<!-- template: background.minimal.md -->
````markdown
---
title: "Lamplighter"
source: "Homebrew"
origin_feat: "Alert"
abilities:
  - "dex"
  - "wis"
  - "cha"
skill_proficiencies:
  - "perception"
  - "stealth"
tags:
  - "background"
---

# Lamplighter

You walked the streets at dusk, lighting the lamps one by one.
````

- `origin_feat` is the feat it grants, **as the feat's note titles it**. The
  builder offers that feat; if no feat note has the name, there is nothing to
  offer.
- `abilities` are the three abilities it can raise, lower case.
- `skill_proficiencies` are the skills it grants. **Here, and only here, two-word
  skills are written as words**: `"animal handling"`, `"sleight of hand"`.

This background works in the builder: the player picks it, gets Alert, raises
two of its three abilities and is proficient in both skills. It grants no tools
and no starting equipment.

## Every key the plugin reads

<!-- template: background.full.md -->
````markdown
---
title: "Lamplighter"
source: "Homebrew"
edition: "5.5e"
origin_feat: "Alert"
abilities:
  - "dex"
  - "wis"
  - "cha"
skill_proficiencies:
  - "perception"
  - "stealth"
tags:
  - "background"
  - "feat/alert"
  - "homebrew"
aliases:
  - "Lamplighter"
---

# Lamplighter

*Background | Source: Homebrew*

You walked the streets at dusk, lighting the lamps one by one, and learned
every alley, rooftop and back door of the city on the way.

```vault-background
traits:
  - key: "overview"
    text: |-
      - **Ability Scores:** Dexterity, Wisdom, Charisma
      - **Feat:** Alert
      - **Skill Proficiencies:** Perception, Stealth
      - **Tool Proficiency:** Tinker's Tools
      - **Equipment:** Choose A or B: (A) Tinker's Tools, Lamp, 2 Flasks of Oil, Traveler's Clothes, 12 GP; or (B) 50 GP
ability_options:
  - choose:
      weighted:
        from:
          - "dex"
          - "wis"
          - "cha"
        weights:
          - 2
          - 1
  - choose:
      weighted:
        from:
          - "dex"
          - "wis"
          - "cha"
        weights:
          - 1
          - 1
          - 1
skill_proficiencies:
  - perception: true
    stealth: true
tool_proficiencies:
  - "tinker's tools": true
starting_equipment:
  - A:
      - item: "tinker's tools"
      - item: "lamp"
      - item: "oil (flask)"
        quantity: 2
      - item: "traveler's clothes"
      - value: 1200
    B:
      - value: 5000
```
````

The fence's parts:

- **`ability_options`** is how the scores can rise. Each item is one way to
  split them: `weights: [2, 1]` is +2 to one of the abilities and +1 to another;
  `weights: [1, 1, 1]` is +1 to each of the three. Offer both, as the example
  does, and the player chooses.
- **`skill_proficiencies`** repeats the skills as a map, each `true`.
- **`tool_proficiencies`** is the tools it grants, by name, each `true`. To let
  the player pick a tool instead, write `anyArtisansTool: 1`,
  `anyGamingSet: 1` or `anyMusicalInstrument: 1`.
- **`starting_equipment`** is the "choose A or B" kit. Each option is a list;
  an entry is an `item` by name (with a `quantity` if more than one) or a
  `value` **in copper pieces**: `1200` is 12 GP, `5000` is 50 GP.
- **`traits`** with the `overview` key is the summary the builder shows.

The `feat/alert` tag says the background grants Alert, for your own searches.

## Mistakes to avoid

- **Item names must match notes in your Items folder**, as those notes title
  them: `"tinker's tools"`, `"traveler's clothes"`, `"oil (flask)"`. An item
  with no note of that name shows in the kit as unavailable, and the character
  does not get it.
- **`value` is copper.** A kit with `value: 50` gives the character five silver.
- **Keep the frontmatter and the fence in agreement.** The skills are in both
  places; write the same ones.
