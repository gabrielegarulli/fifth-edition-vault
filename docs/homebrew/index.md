# Writing your own rules notes

Every spell, monster, feat and class the plugin lists is a note in your vault.
You can write your own the same way, and they work like the rest: a homebrew
spell is on its class's list, a homebrew subclass is offered in the Character
Builder, and a homebrew feat's benefits land on the character sheet.

This tutorial is a page per kind of note. Each page starts from the smallest
note that works, then shows a fuller one with every key the plugin reads, and
ends with the mistakes that kind invites. The examples are ready to copy.

## Before you start

### Your Homebrew folder

Put your notes in **your Homebrew folder**. It is called `Homebrew` unless you
change it: Settings, the plugin's tab, **Note folders**, **Homebrew folder**.
Subfolders inside it are fine, as deep as you like, so a Homebrew folder with a
folder for each campaign or each book works.

**Keep homebrew out of your rules folder** (your Spells folder, your Feats
folder and the rest). The notes there belong to whatever wrote them, and an
update can replace a note whose name matches one of its own.

### Start from a template

Run **Add homebrew templates** from the command palette and name a folder:
the plugin writes the examples on these pages into it, a minimal and a full
one per kind, twenty in all, with the example's name replaced by `{{title}}`.
Point Obsidian's **Templates** plugin at that folder, and **Insert template**
in a new note in your Homebrew folder fills in the note's own name. The
dialog starts with the Templates plugin's folder when you have set one.

- **The folder must be outside your Homebrew folder and your rules folders.**
  A template carries its kind's tag, so in either place every catalog would
  list it as a row called `{{title}}`. The dialog refuses one and says why.
- **Nothing is overwritten.** A file already at a template's name is left as
  it is, so running the command again is safe. To get a newer template after
  an update, delete the old file first.
- `{{title}}` is the core Templates plugin's syntax. Templater does not read
  it: swap in `<% tp.file.title %>` if you use Templater.

### The tag says what the note is

The plugin does not guess a note's kind from its folder. A note in your
Homebrew folder is listed because of its **bare kind tag**:

| Kind | Tag | Its rules folder | Page |
| --- | --- | --- | --- |
| Spell | `spell` | your Spells folder | [Spells](spells.md) |
| Condition | `condition` | your Conditions folder | [Conditions](conditions.md) |
| Item | `item` | your Items folder | [Items](items.md) |
| Magic item | `magic-item` | your Magic items folder | [Magic items](magic-items.md) |
| Monster | `monster` | your Bestiary folder | [Monsters](monsters.md) |
| Feat | `feat` | your Feats folder | [Feats](feats.md) |
| Background | `background` | your Backgrounds folder | [Backgrounds](backgrounds.md) |
| Species | `species` | your Species folder | [Species](species.md) |
| Subclass | `subclass` | your Subclasses folder | [Subclasses](subclasses.md) |
| Class | `class` | your Classes folder | [Classes](classes.md) |

**Bare** means the tag on its own: `spell` counts, `spell/level-1` does not.
Tags with a slash are fine to add for your own searches, and some mean
something of their own (`feat/alert` on a background says it *grants* Alert),
but none of them says what the note is.

```yaml
tags:
  - "spell"
```

### `source`: which book it is

Give every note a `source`. `source: "Homebrew"` is the convention, or the
name of your own book. A source the plugin does not know is shelved as **a book
of its own, labelled as you wrote it**, so **Books in play** in the campaign's
settings can take your homebrew classes, species and backgrounds out of the
Character Builder like any other book's. Spell it the same way in every note,
or you get two books.

### The name is the note's identity

A note's **filename** is what everything points at. Its id is the filename
without `.md`, exactly as written (`Ember Ward.md` is `Ember Ward`), and a
character who picks your spell, feat or subclass is tied to it.

- **Pick a filename nothing in your rules folder already uses.** The notes
  there are named in lower case with hyphens (`fireball.md`). When two notes of
  one kind share a filename, the one in the rules folder wins and **yours is
  hidden**: it is not listed, and a character who picked it gets the other
  note's rules. That kind's page (Spells, Feats, Items, Magic Items, Bestiary,
  Classes) then says so at its top, naming your note and the one it is hidden
  behind; each opens with a click. Species, backgrounds and conditions have no
  page, so a clash there says nothing. Naming your notes as you would title them
  (`Fireball, Hearth-Bound.md`) keeps them clear.
- **Do not rename a note once a character uses it.** The character still points
  at the old name and loses what the note gave them. Fix `title` instead: it is
  what lists show, and changing it orphans nothing.
- **A note with no `title` is skipped** (the plugin reads it as a template or a
  stray file). A feat is the one exception: with the `feat` tag it falls back to
  its filename.

### Frontmatter, and the fence

A rules note keeps what it says in two places, and they are not
interchangeable.

**Frontmatter** is the Properties block at the top: flat keys, one value or a
list of plain values each. It is what the lists filter and sort on: a spell's
`level`, an item's `rarity`, a monster's `cr`.

**The fence** is a fenced code block in the note's body, named for the kind
(` ```vault-subclass `, ` ```vault-feat `, ` ```statblock `). It holds the deep
structure: a class's features, a feat's benefits, the effects that put numbers
on a character sheet.

Four rules:

1. **Nothing nested in frontmatter.** Obsidian's Properties editor rewrites a
   nested value it does not understand. Anything with structure goes in the
   fence, which Properties never touches.
2. **Quote every string**, as the examples do. YAML reads `cr: 1/4` and
   `concentration: yes` as text, and the plugin copes with both, but a quoted
   value always means what it says.
3. **The fence is YAML, so indentation counts.** Use spaces, never tabs, and
   keep each list item's keys lined up. **A fence that is not valid YAML is read
   as no fence at all**: the note still lists and opens, and grants nothing.
   Nothing warns you. If a feature you wrote does not reach the sheet, check the
   indentation first.
4. **Keys are spelled the plugin's way.** Abilities are three lower-case
   letters: `str`, `dex`, `wis`. Skills are lower case with underscores for
   spaces, `sleight_of_hand`, `animal_handling`, everywhere but one place: a
   background's skill lists, which spell them as words (`animal handling`), as
   the [Backgrounds](backgrounds.md) page shows. A key spelled any other way
   does nothing, silently.

## The pages

Start with whichever kind you need; each page stands on its own. In order of
how much each kind asks of you:

1. [Spells](spells.md)
2. [Conditions](conditions.md)
3. [Items](items.md)
4. [Magic items](magic-items.md)
5. [Monsters](monsters.md)
6. [Feats](feats.md)
7. [Backgrounds](backgrounds.md)
8. [Species](species.md)
9. [Subclasses](subclasses.md), with a homebrew subclass built end to end
10. [Classes](classes.md)
11. [Effects, the short list](effects.md): the part of the fence that puts
    numbers on a character sheet
