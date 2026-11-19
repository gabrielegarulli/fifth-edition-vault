# Subclasses

[Back to the index](index.md)

A subclass note joins an existing class: it is listed under that class on the
Classes page, offered in the Character Builder when a character reaches the
class's subclass level, and its features land on the character sheet level by
level. All of that comes from the ` ```vault-subclass ` fence. Without the
fence, the subclass lists and can be picked, and grants nothing.

## The smallest subclass that works

<!-- template: subclass.minimal.md -->
````markdown
---
title: "Hearthguard"
class: "Fighter"
source: "Homebrew"
tags:
  - "subclass"
---

# Hearthguard

```vault-subclass
name: "Hearthguard"
class_name: "Fighter"
class_source: "XPHB"
source: "Homebrew"
data: {}
features:
  - name: "Keeper of the Flame"
    level: 3
    description: "You gain proficiency in Wisdom saving throws."
    data:
      effects:
        - type: "saving_throw_proficiency"
          ability: "wis"
```
````

- `class` in frontmatter and `class_name` in the fence are the class it joins,
  **as the class's note titles it**: `"Fighter"`.
- `features` is a list. Each feature has a `name`, the `level` it arrives at
  and a `description`, and any `effects` under `data`.
- `data: {}` is the place for spells the subclass grants (below); empty, it
  must still be there.

## Every key the plugin reads

<!-- template: subclass.full.md -->
````markdown
---
title: "Hearthguard"
class: "Fighter"
source: "Homebrew"
subclass_title: "Fighter Subclass"
tags:
  - "subclass"
  - "subclass/fighter"
  - "homebrew"
aliases:
  - "Hearthguard"
  - "Fighter: Hearthguard"
---

# Hearthguard

*Subclass for [[fighter|Fighter]] | Source: Homebrew*

Hearthguards stand watch over the places people gather, and carry a little of
the hearth's fire into every fight.

## Level 3: Keeper of the Flame

You gain proficiency in Wisdom saving throws, and you know the *Light* cantrip.

## Level 3: Ward the Hearth

As a Bonus Action, you can give each ally within 10 feet of you Temporary Hit
Points equal to your Fighter level. You can use this feature a number of times
equal to your Proficiency Bonus, and you regain all expended uses when you
finish a Long Rest.

## Level 7: Watchful Eye

You gain proficiency in one of the following skills of your choice: Insight,
Perception or Survival.

## Level 10: Unbowed

You have Resistance to Fire damage.

```vault-subclass
name: "Hearthguard"
short_name: "Hearthguard"
class_name: "Fighter"
class_source: "XPHB"
source: "Homebrew"
data:
  additionalSpells:
    - known:
        3:
          - "light#c"
features:
  - name: "Keeper of the Flame"
    level: 3
    description: "You gain proficiency in Wisdom saving throws, and you know the *Light* cantrip."
    data:
      effects:
        - type: "saving_throw_proficiency"
          ability: "wis"
  - name: "Ward the Hearth"
    level: 3
    description: "As a Bonus Action, you can give each ally within 10 feet of you Temporary Hit Points equal to your Fighter level. You can use this feature a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest."
    data:
      effects:
        - type: "feature_resource"
          key: "hearthguard_ward_the_hearth"
          name: "Ward the Hearth"
          uses:
            kind: "proficiency_bonus"
          resets: "long_rest"
  - name: "Watchful Eye"
    level: 7
    description: "You gain proficiency in one of the following skills of your choice: Insight, Perception or Survival."
    choices:
      type: "skill"
      count: 1
      options:
        - "insight"
        - "perception"
        - "survival"
  - name: "Unbowed"
    level: 10
    description: "You have Resistance to Fire damage."
    data:
      effects:
        - type: "resistance"
          value: "fire"
```
````

What the full note adds:

- **`subclass_title`** is the class's name for its subclasses ("Fighter
  Subclass"), shown with the subclass on the Classes page.
- **`data.additionalSpells`** is the spells the subclass grants. `known` with
  a level and a list (`3: ["light#c"]`) gives the character those spells from
  that level. Write a spell **by its name, in lower case**; `#c` marks a cantrip.
  No book is needed after the name.
- **`choices`** on a feature makes the builder ask the player something when
  the feature arrives. Watchful Eye asks for one skill of three:
  `type: "skill"`, a `count`, and the `options`.
- **`feature_resource`** on Ward the Hearth gives the character a use counter.
  `uses: {kind: "proficiency_bonus"}` makes the count equal their Proficiency
  Bonus. See [Effects](effects.md).

The body above the fence, one heading per feature, is what a reader of the note
sees in Obsidian. The sheet shows each feature's `description` from the fence,
so write it in both places.

## Worked example: Hearthguard, from nothing to a character sheet

1. **Copy the minimal subclass** into your Homebrew folder as
   `Hearthguard.md`. Set `title` to the subclass's name, `class` to the class it
   joins as that class's note titles it (`"Fighter"`), and `class_name` in the
   fence to the same class. It lists on the Classes page under Fighter at once.
2. **Add a feature per level** to `features`. A feature that changes something
   on the sheet gets `effects` under `data`: Keeper of the Flame's
   `saving_throw_proficiency` with `ability: "wis"`. A feature that asks the
   player something gets a `choices` block: Watchful Eye's `skill`, one of
   three.
3. **Add the spells it grants** to `data.additionalSpells`:
   `known: {3: ["light#c"]}` gives the Light cantrip at level 3.
4. **Open the Character Builder.** A Fighter reaching level 3 is offered
   Hearthguard. At level 7 the builder asks Watchful Eye's question, and not
   before.
5. **Save the character and open the sheet.** It shows Hearthguard; Wisdom
   saving throws proficient; Light among the granted spells; Ward the Hearth's
   uses, as many as the Proficiency Bonus; and, from level 10, Resistance to
   Fire.

The full example above is that subclass, finished. Each of those five results
is checked by the plugin's own tests against this exact note.

## A subclass that casts

Some subclasses cast spells when their class does not, as a third-caster
Rogue or Fighter does. The class's note says nothing about spells, so the
subclass's fence carries all of it, under `data`. The Glyphcutter below is
a Rogue that casts from the Wizard list:

<!-- template: subclass.caster.md -->
````markdown
---
title: "Glyphcutter"
class: "Rogue"
source: "Homebrew"
subclass_title: "Rogue Subclass"
tags:
  - "subclass"
  - "subclass/rogue"
  - "homebrew"
aliases:
  - "Glyphcutter"
  - "Rogue: Glyphcutter"
---

# Glyphcutter

*Subclass for [[rogue|Rogue]] | Source: Homebrew*

Glyphcutters carve small arcane marks into locks, doorframes and shadows, and
learn a thief's handful of wizardry along the way.

## Level 3: Glyphcutter Spellcasting

You cast spells from the Wizard spell list, and Intelligence is your
spellcasting ability for them. You know the *Mage Hand* cantrip and two other
Wizard cantrips of your choice, and one more at Rogue level 10. The table below
shows your spell slots and how many level 1+ Wizard spells you prepare.

| Rogue Level | Cantrips | Prepared Spells | 1st | 2nd | 3rd | 4th |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 3 | 3 | 2 | — | — | — |
| 4 | 3 | 4 | 3 | — | — | — |
| 7 | 3 | 5 | 4 | 2 | — | — |
| 10 | 4 | 7 | 4 | 3 | — | — |
| 13 | 4 | 9 | 4 | 3 | 2 | — |
| 16 | 4 | 11 | 4 | 3 | 3 | — |
| 19 | 4 | 12 | 4 | 3 | 3 | 1 |
| 20 | 4 | 13 | 4 | 3 | 3 | 1 |

## Level 9: Etched Escape

When you cast a spell using a spell slot, you can take the Disengage action as
part of the same action.

```vault-subclass
name: "Glyphcutter"
class_name: "Rogue"
source: "Homebrew"
data:
  casterProgression: "1/3"
  spellcastingAbility: "int"
  spellList: "Wizard"
  cantripProgression: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
  preparedSpellsProgression: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13]
  additionalSpells:
    - known:
        3:
          - "mage hand#c"
features:
  - name: "Glyphcutter Spellcasting"
    level: 3
    description: "You cast spells from the Wizard spell list, and Intelligence is your spellcasting ability for them. You know the *Mage Hand* cantrip and two other Wizard cantrips of your choice, and one more at Rogue level 10."
  - name: "Etched Escape"
    level: 9
    description: "When you cast a spell using a spell slot, you can take the Disengage action as part of the same action."
```
````

The keys that make it cast, all under `data`:

- **`casterProgression`** is the spell-slot table, in quotes: `"1/3"` for a
  third-caster, `"1/2"` or `"1/2-2024"` for a half caster (no slots at level 1,
  or two), `"1"` for a full caster, `"pact"` for Pact Magic. A third-caster gets
  two first-level slots at level 3, rising to four, two second-level slots at 7,
  third-level slots at 13 and one fourth-level slot at 19. In a multiclass it
  counts a third of its levels, as the rules say.
- **`spellcastingAbility`** is the ability its spells use: `"int"`, `"wis"`,
  `"cha"`, or another of the six, written short.
- **`spellList`** is the class whose spell list it learns from: `"Wizard"`. The
  Spells step then offers that list. The Spells catalog still lists those spells
  under the Wizard, not the Rogue, which is right.
- **`cantripProgression`** and **`preparedSpellsProgression`** are how many
  cantrips it knows and how many spells it prepares: twenty numbers, one per
  class level, starting at level 1. Leave `cantripProgression` out for a
  subclass with no cantrips. A subclass that learns a fixed set of spells
  rather than preparing them writes `spellsKnownProgression` instead.
- **`additionalSpells`** gives the spells it always knows on top of those:
  *Mage Hand* here, which is why the table above counts one more cantrip than
  `cantripProgression` does.

**This is how you write the Arcane Trickster or the Eldritch Knight for
yourself.** Neither is in the SRD, so the plugin cannot ship them, but both
are third-casters on the Wizard list with Intelligence. Copy the Glyphcutter,
change its name, `class` and `class_name`, and write their features from your
own book.

## Mistakes to avoid

- **Skill options use underscores**: `"sleight_of_hand"`, never
  `"sleight of hand"`. A space grants nothing, and nothing says so.
- **Leave `edition` out** unless you mean it. When your vault holds two
  editions of a class, `edition` decides which one the subclass joins. Without
  it, the subclass joins the class of its name.
- **`class_source` and `short_name` are not read.** The examples carry them;
  you can drop both.
- **The sheet credits an effect to the feature**, not the subclass: "Unbowed",
  not "Hearthguard".
- **A caster progression is one of a few exact values**: `"1"`, `"1/2"`,
  `"1/2-2024"`, `"1/3"` or `"pact"`, in quotes. `"full"`, `"third"` or a bare
  `1` gives no spell slots. The open note says so, as it does for a subclass
  that casts with no spell list or ability.
- **A fence that is not valid YAML is no fence**: the subclass still lists and
  can be picked, and grants nothing. Check the indentation of `features` first.
