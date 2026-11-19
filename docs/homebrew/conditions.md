# Conditions

[Back to the index](index.md)

A condition note adds a condition the character sheet and the GM's party view
can put on a character, with your description beside it. A condition is prose:
the plugin shows what it says and applies nothing on its own, so the whole
note is a `title` and a body.

## The smallest condition that works

<!-- template: condition.minimal.md -->
````markdown
---
title: "Smouldering"
source: "Homebrew"
tags:
  - "condition"
---

# Smouldering

While Smouldering, you take 1d4 Fire damage at the start of each of your turns.
An action spent patting yourself down ends the condition.
````

## Every key the plugin reads

<!-- template: condition.full.md -->
````markdown
---
title: "Smouldering"
source: "Homebrew"
edition: "5.5e"
type: "condition"
tags:
  - "condition"
  - "homebrew"
aliases:
  - "Smouldering"
---

# Smouldering

While you have the Smouldering condition, you experience the following
effects.

**Embers.** You take 1d4 Fire damage at the start of each of your turns.

**Put It Out.** You or a creature within 5 feet of you can take an action to
end the condition. Entering water ends it too.
````

The full note adds only `edition` and `aliases`. Write the body the way the
rules write theirs: one bold-led paragraph per effect, so it reads well in the
small space the sheet gives it.

## Mistakes to avoid

- **No `title`, no condition.** The note is skipped, as a template would be.
- **Nothing in a condition is rolled or counted.** "You take 1d4 Fire damage"
  is for the table to apply; if a character needs a number on the sheet, it
  belongs in an [effect](effects.md) on whatever causes the condition.
