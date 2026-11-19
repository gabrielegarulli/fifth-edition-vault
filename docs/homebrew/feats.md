# Feats

[Back to the index](index.md)

A feat note lists on the Feats page and is offered wherever the Character
Builder asks for a feat: at an Ability Score Improvement, by an origin
background, as an Epic Boon or a fighting style. Its benefits are a list in the
` ```vault-feat ` fence, and a benefit with [effects](effects.md) puts them on the
character sheet.

## The smallest feat that works

<!-- template: feat.minimal.md -->
````markdown
---
title: "Hearthbound Resolve"
source: "Homebrew"
kind: "general"
tags:
  - "feat"
---

# Hearthbound Resolve

```vault-feat
benefits:
  - key: "steady_flame"
    text: "You have Resistance to Fire damage."
    effects:
      - type: "resistance"
        value: "fire"
```
````

- `kind` is one of `"origin"`, `"general"`, `"epic_boon"` or
  `"fighting_style"`. It decides which pickers offer the feat (below).
- `benefits` is a list. Each benefit has a `key` (lower case, unique within the
  feat), the `text` the sheet shows, and any `effects` it applies.
- A feat is the one note that lists without a `title`: with the `feat` tag it
  takes its filename. Give it a `title` anyway.

## Every key the plugin reads

<!-- template: feat.full.md -->
````markdown
---
title: "Hearthbound Resolve"
source: "Homebrew"
edition: "5.5e"
kind: "general"
prerequisite: "Level 4+"
abilities:
  - "con"
  - "wis"
benefit_count: 3
modelled_count: 3
tags:
  - "feat"
  - "feat/general"
  - "homebrew"
aliases:
  - "Hearthbound Resolve"
---

# Hearthbound Resolve

*General Feat (Prerequisite: Level 4+) | Source: Homebrew*

You carry the warmth of home with you. You gain the following benefits.

```vault-feat
benefits:
  - key: "overview"
    text: "You gain the following benefits."
  - key: "ability_score_increase"
    name: "Ability Score Increase"
    text: "Increase your Constitution or Wisdom score by 1, to a maximum of 20."
    effects:
      - type: "ability_score_choice"
        amount: 1
        max: 20
        options:
          - "con"
          - "wis"
  - key: "steady_flame"
    name: "Steady Flame"
    text: "You have Resistance to Fire damage."
    effects:
      - type: "resistance"
        value: "fire"
  - key: "hearth_rest"
    name: "Hearth's Rest"
    text: "When you finish a Short Rest, you can regain one spent Hit Point Die. Once you use this benefit, you can't use it again until you finish a Long Rest."
    effects:
      - type: "feature_resource"
        key: "hearthbound_resolve_hearth_rest"
        name: "Hearth's Rest"
        uses: 1
        resets: "long_rest"
```
````

| Key | What it does |
| --- | --- |
| `prerequisite` | shown on the card and in the picker, as written |
| `prerequisite_class` | on a fighting style, the class it belongs to, such as `"Fighter"` |
| `abilities` | the abilities its benefits can raise, lower case; the Feats page filters on them |
| `benefit_count`, `modelled_count` | how many benefits it has, and how many of them do something on the sheet |
| `feat/general` | a tag for your own searches; `kind` is what the plugin reads |

A benefit's `name` is its heading on the sheet. The full example's first
benefit, `overview`, has no effects and no name: it is the sentence that
introduces the rest.

## Which picker offers it

| `kind` | Offered by |
| --- | --- |
| `origin` | a background's origin feat, and an Ability Score Improvement |
| `general` | an Ability Score Improvement |
| `fighting_style` | the Fighting Style feature only |
| `epic_boon` | the Epic Boon only |
| none | only an Ability Score Improvement, and the Feats page's kind chips skip it |

## Mistakes to avoid

- **`abilities`, `benefit_count` and `modelled_count` are yours to keep
  right.** Nothing counts them on a homebrew feat. Make them agree with the
  fence, or leave them out: a missing count shows as "unknown", a wrong one as
  fact. In the full example the introductory `overview` is not counted; the
  other three benefits are, and all three have effects, so both counts are 3.
- **A `feature_resource` needs its own `key`**, unique across everything a
  character has. Name it after the note and the benefit:
  `hearthbound_resolve_hearth_rest`. Without one, the resource is dropped.
- **A misspelt `kind`** is read as no kind at all, so the feat leaves every
  picker but the Ability Score Improvement. A fighting style with no `kind`
  turns up there, where it should not.
