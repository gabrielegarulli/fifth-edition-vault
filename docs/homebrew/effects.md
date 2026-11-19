# Effects, the short list

[Back to the index](index.md)

An **effect** is what turns a line of rules text into something on the
character sheet: a proficiency ticked, a resistance listed, a use counter to
spend. Effects go in a note's fence, in an `effects` list on the part that
grants them:

- a feat's benefit, a species' trait: `effects` directly on the item;
- a class or subclass feature: `effects` under its `data`;
- a magic item: `effects` at the top of its fence (see
  [Magic items](magic-items.md), which takes a different set).

```yaml
features:
  - name: "Unbowed"
    level: 10
    description: "You have Resistance to Fire damage."
    data:
      effects:
        - type: "resistance"
          value: "fire"
```

A feature with no effects is still shown on the sheet as text. Effects are
for what the sheet should *do*.

## The ten to learn

These cover most of what homebrew grants. Abilities are `str`, `dex`, `con`,
`int`, `wis`, `cha`; skills are lower case with underscores.

| Type | Keys | Grants |
| --- | --- | --- |
| `ability_score_bonus` | `ability`, `amount`, optional `max` | +`amount` to one ability, up to `max` (20 if left out) |
| `ability_score_choice` | `options`, `amount`, optional `max` | +`amount` to one of the `options`, the player's choice |
| `skill_proficiency` | `skill` | proficiency in a skill |
| `saving_throw_proficiency` | `ability` | proficiency in a saving throw |
| `weapon_proficiency` | `category`: `simple`, `martial` | proficiency with a category of weapons |
| `armor_training` | `category`: `light`, `medium`, `heavy`, `shield` | training with a category of armour |
| `resistance` | `value`: a damage type | Resistance to that damage |
| `sense` | `sense`, `range` | a sense, such as `darkvision` at `60` feet |
| `speed` | `amount`, optional `mode`, optional `add: true` | a speed: `mode` is `fly`, `swim`, `climb` or `burrow` (walking if left out); `add: true` adds to the speed instead of setting it |
| `feature_resource` | `key`, `name`, `uses`, `resets` | a use counter on the sheet |

```yaml
effects:
  - type: "ability_score_choice"
    amount: 1
    options:
      - "con"
      - "wis"
  - type: "sense"
    sense: "darkvision"
    range: 60
  - type: "speed"
    mode: "fly"
    amount: 30
```

### `feature_resource`, the one with rules of its own

- **`key` must be unique across everything a character has**, or the counter is
  dropped. Name it after the note and the feature: `hearthguard_ward_the_hearth`.
- **`uses`** is a number, or `{kind: "proficiency_bonus"}` for as many uses as
  the character's Proficiency Bonus.
- **`resets`** is `"short_rest"` or `"long_rest"`. A Short Rest reset also
  comes back on a Long Rest.

## Three things that are not effects

**Choices.** When the player picks (one skill of three, an Ability Score
Improvement), the feature carries a `choices` block instead, and the builder
asks the question: `type: "skill"` with a `count` and `options`, or
`type: "asi"`. See [Subclasses](subclasses.md) and [Classes](classes.md).

**Spells a subclass grants** go in its `data.additionalSpells`, not in an
effect. See [Subclasses](subclasses.md).

**Features as text.** A feature's `description` is on the sheet whether or
not it has effects, so a feature that only needs remembering needs no effect.

## Everything else: copy a block that works

There are many more effect types: advantage on a save, a bonus to initiative,
immunity to a condition, a bonus to Armor Class while wearing armour. Rather
than learn their keys from a list, **find a note in your rules folder that does
what you want, and copy its block.** A feat or a species trait that grants the
same thing is the usual place to look. The notes there are read by the same
code as yours, so a block that works in one works in the other.

## When an effect does nothing

Check, in this order:

1. **Is the fence valid YAML?** A broken fence is read as no fence. Look at the
   indentation of the lines above the effect.
2. **Is the spelling right?** `sleight_of_hand`, not `sleight of hand`; `wis`,
   not `Wisdom`; `fire`, not `Fire damage`.
3. **Is it on the right part of the note?** A class or subclass feature's
   effects go under `data`; a feat's and a species' do not.
4. **Can that kind of note carry it?** A magic item takes its own set of effect
   types, and a resistance is not one of them.

The plugin does not yet say when one of these has gone wrong.
