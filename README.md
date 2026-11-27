# Fifth Edition Vault

Fifth Edition Vault is a community extension. It is not made, endorsed or supported by Atlas VTT or Atlas Online. [Get support here](https://github.com/gabrielegarulli/fifth-edition-vault/issues).

https://github.com/user-attachments/assets/8324a97e-545c-4f63-bbf2-92d500a11b08

An Obsidian plugin for the **System Reference Document 5.2.1**. It writes the
SRD into your vault as linked notes, lets you browse them as catalogs and build
characters from them, and rolls those characters into an Atlas VTT scene. Fifth
edition compatible.

The rules notes are inside the plugin. You install them into your vault with
one click, in the folders you choose. Nothing is downloaded.

It is still young. Please [report what you find](../../issues).

## Installing

You need **Obsidian 1.11.4 or later on a computer** (Windows, macOS or Linux).
The plugin doesn't run on phones or tablets. To check your version, open
**Settings → General**; if it's older, click **Check for updates**.

### From Community plugins

Fifth Edition Vault is in Obsidian's **Community plugins** browser.

1. In Obsidian, open **Settings** (the gear at the bottom left) and choose
   **Community plugins**.
2. If you see **Exit Restricted mode**, click it. (Before Obsidian 1.15 the
   button was called **Turn on community plugins**.)
3. Click **Browse**, search for **Fifth Edition Vault**, then click **Install**
   and **Enable**.

Or open [its page in the plugin directory](https://community.obsidian.md/plugins/fifth-edition-vault)
and click **Add to Obsidian**.

Obsidian keeps it up to date from there, and the plugin tells you when a new
release is out (see [What it reads and writes](#what-it-reads-and-writes)).

**Installed it with BRAT before it was listed?** It keeps working, and BRAT
keeps updating it. To let Obsidian update it instead, remove it from BRAT's list
in **Settings → BRAT**. The plugin, its settings and your notes stay where they
are, and **Community plugins** offers its next update.

### From a GitHub release

For a computer that can't reach the plugin browser.

1. Open the [latest release](../../releases/latest) and download three files:
   `main.js`, `manifest.json` and `styles.css`.
2. In your vault folder, open the hidden `.obsidian` folder, then `plugins`
   (make it if it isn't there), and make a folder called exactly
   `fifth-edition-vault`.
   - Your computer hides names that start with a dot. **Windows 11:** File
     Explorer → **View → Show → Hidden items**. **macOS:** in Finder, press
     **Cmd + Shift + .** **Linux:** **Ctrl + H** in most file managers.
3. Put the three files in it. You should end up with
   `.obsidian/plugins/fifth-edition-vault/main.js`, with `manifest.json` and
   `styles.css` beside it.
4. In Obsidian, open **Settings → Community plugins**. If you see **Exit
   Restricted mode** (before Obsidian 1.15: **Turn on community plugins**),
   click it. Then click the circular-arrow icon to reload the list, and switch
   **Fifth Edition Vault** on.

To update, download the three files of the new release and replace the old
ones, then restart Obsidian. Your settings are kept: they live in a `data.json`
file beside them that a release never includes.

## First run: install the rules notes

Click the **die icon** in the ribbon on the left (hovering over it shows **Open
Fifth Edition Vault**), or run **Open Fifth Edition Vault** from the command
palette.

A new vault has no rules notes yet, so Home offers to install them. Click
**Install SRD 5.2.1 rules notes**. It writes 1,441 notes and 12 Bases views
into a folder called `SRD 5.2.1`, and every catalog fills. Nothing is
downloaded: the notes are inside the plugin.

The same button is in **Settings → Fifth Edition Vault → SRD 5.2.1 rules notes**
as **Install / Update notes**. Run it again after updating the plugin to get
corrected notes.

**Your edits are kept.** Every note the plugin writes carries an `export_hash`
property, a fingerprint of its text. When you install again, a note whose text
you have changed is left exactly as it is, and so is any note of your own at
the same path. Only notes you haven't touched are updated. Nothing is ever
deleted.

## Choosing where the notes go

Every kind of note can live where you like. Open **Settings → Fifth Edition
Vault → Note folders**:

- **Rules folder**: the folder that holds all the rules, one folder per kind.
  Blank means `SRD 5.2.1`.
- **Campaigns folder** and **Sessions folder**: where campaign and session notes
  are read from and created.
- **One folder at a time**: give a single kind its own path, such as
  `Compendium/Spells` for spells. A folder set here is the only place that kind
  of note is read from.

Set the folders **before** installing the notes, and they are written straight
there; each Bases view lists its own folder. Changing a folder later doesn't
move any notes: move them yourself in Obsidian, which keeps the links working.

## Writing your own rules notes

Homebrew works like the rest: a homebrew spell is on its class's list, a
homebrew subclass is offered in the Character Builder, and a homebrew feat's
benefits land on the character sheet.

- **Put them in your Homebrew folder**, `Homebrew` unless you change it under
  **Note folders → Homebrew folder**. Subfolders are fine. Every catalog and the
  builder read it.
- **Start from a template.** Run the command **Add homebrew templates** and
  choose a folder: it writes a short and a full template for every kind of note,
  including a subclass that casts spells. It never writes over a file.
- **Follow the tutorial**:
  [Writing your own rules notes](https://github.com/gabrielegarulli/fifth-edition-vault/blob/main/docs/homebrew/index.md).
  It has a page for each kind of note (species, classes, subclasses,
  backgrounds, feats, spells, items, magic items, monsters, conditions), each
  going from the smallest note that works to one with every key, and a short
  list of the effects you can give them.
- **The note tells you what's wrong.** An open note lists what in it the plugin
  can't use, such as a misspelled skill or an effect that doesn't exist. If two
  notes share a name, the catalog says which one it shows.

## Bringing a character from D&D Beyond

A character you play on D&D Beyond can become a character here, from its
link or from a file you save. What the plugin offers is the SRD; what you bring
in is yours.

**From its link.** On D&D Beyond, share the character: **Share → Anyone with
the link**. In the plugin, open **Characters**, choose **Import a character**,
paste the character's address (`https://www.dndbeyond.com/characters/12345678`)
or just its number, and press **Import**. The plugin then asks D&D Beyond's
character service for that one character; see
[What it reads and writes](#what-it-reads-and-writes).

**From a file**, when the link import can't reach D&D Beyond or you'd rather it
didn't:

1. On D&D Beyond, share the character: **Share → Anyone with the link**.
2. Note the number at the end of the character's address on D&D Beyond,
   after `/characters/`: `12345678`, say.
3. Open `https://character-service.dndbeyond.com/character/v5/character/12345678`
   in your browser, with your number at the end. It shows the character as
   text.
4. Save that page as a `.json` file: **Ctrl+S** (**Cmd+S** on macOS). Firefox's
   viewer also has a **Save** button.
5. In the plugin, open **Characters** and choose **Import from a file**.

Before anything is written, a review shows how the class, subclass, species,
background, feats, spells and items were matched to your rules notes, and lets
you correct them. A class or species with no note blocks the conversion; pick
one by hand or write the note first. A feat, spell or item with no note
converts without it, and the review offers **Create note** for each one, with
the name and what D&D Beyond states plainly (a spell's level and school, an
item's weight and cost) filled in. The description is yours to write.

Its items, coins and damage come across once. To bring new choices later,
choose **Re-convert** on the character's card, and import it again by its link
or a newly saved file. A character's portrait is never downloaded.

## What it reads and writes

**It reads only the folders it's set to use**, never a list of every file in
your vault:

- the rules folders under **Note folders**, for the catalogs (hand-written feats
  tagged `feat` count anywhere inside the feats folder, subfolders included),
  and the Homebrew folder;
- the campaign and session folders;
- the character folder and its subfolders, for your characters, and the
  character and portraits folders when you pick a portrait;
- a D&D Beyond character's file, when you pick one to import.

In those folders it reads the properties of the Markdown notes through
Obsidian's own index, and opens a note's text only when you open that entry. A
character or feat note moved outside its folder isn't found.

**It makes two requests: one you ask for, one you can switch off.**

When you import a character by its link, it asks D&D Beyond's character
service, `https://character-service.dndbeyond.com/character/v5/character/<number>`,
for that one character, once per import. The request carries the character's
number and nothing else: no account, no key, nothing about you or your vault.
It is never made unless you press **Import**, and never on a timer.

To tell you when a newer release is out, it reads this repository's
`manifest.json` from `raw.githubusercontent.com`, the same file Obsidian reads
to decide what to install: 15 seconds after Obsidian starts, then once an hour,
and only while you're online. The request carries nothing about you or your
vault. Switch it off under **Settings → Fifth Edition Vault → Updates → Check
for updates**, and the plugin makes no request unless you import a character
by its link. The release notes in **What's new** are inside the plugin, so
they're never downloaded.

It writes only when you ask it to:

- the rules notes and their Bases views, into the folders under **Note
  folders**, when you install or update them;
- a character's note, when you create, edit, level up or import a character;
- campaign and session notes, when you create them or play from them (the
  activity log, an encounter);
- its own settings, in `.obsidian/plugins/fifth-edition-vault/data.json`;
- on this device only, in Obsidian's local storage: the **Updates** switches,
  and the last release it told you about, so it never tells you twice.

It never deletes a note.

## Rolling dice in Atlas VTT

Rolls go through the [Atlas VTT](https://atlas-vtt.dev) plugin when it is
installed. It isn't included here, and nothing else is needed to read the
catalogs or build a character.

Atlas VTT is a separate project with its own licence. This plugin contains none
of its code and only calls it inside Obsidian. If a roll goes wrong, please
[report it here](../../issues), not to Atlas VTT.

## If something goes wrong

- **The plugin isn't in the list, or there's no die icon.** Check the folder is
  exactly `.obsidian/plugins/fifth-edition-vault/` with `main.js` directly
  inside it. Then reload the list or restart Obsidian.
- **"Failed to load plugin".** Your Obsidian is older than 1.11.4. Update it.
- **The catalogs are empty.** The notes aren't installed, or aren't where the
  settings say. Check **Settings → Fifth Edition Vault → Note folders**, then
  run **Install / Update notes**.
- **Anything else:** [open an issue](../../issues) and say what you did and
  what you saw. A screenshot helps.

**Used an earlier download of this repository as a vault?** That had the notes
already in it, in the same `SRD 5.2.1` folder the plugin installs into, so
nothing needs to move. Running **Install / Update notes** brings unedited notes
up to date and leaves edited ones alone.

## What's in it

The notes, in the rules folder:

| Folder | Notes | | Folder | Notes |
| :--- | ---: | :--- | :--- | ---: |
| `spells` | 339 | | `feats` | 17 |
| `bestiary` | 336 | | `conditions` | 15 |
| `magic-items` | 339 | | `classes` / `subclasses` | 12 / 12 |
| `items` | 236 | | `species` / `backgrounds` | 9 / 4 |
| `variant-rules` | 119 | | `diseases` | 3 |

Each folder has a Bases view beside it (`Spells.base`, `Bestiary.base`, …)
that lists only that folder's notes.

**The notes are generated, not hand-written.** Where the SRD renames an entry,
the SRD's name is used (Arcane Hand, Handy Haversack, Instant Fortress).

**Nothing is downloaded.** Everything it shows comes from the notes in your
vault.

## How close to the SRD it is

The text was generated from a third-party dataset, keeping only entries it marks
as SRD 5.2, and then corrected against the SRD 5.2.1 PDF. On 2026-11-05 every
sentence in the notes was compared with that PDF:

- About 94% of the 5,923 prose sentences match the SRD at 90% or better, and 97%
  of the stat block text does.
- The rest are mainly lines this project generates ("You gain a feature from
  your Fighter Subclass"), one note per variant of a single SRD table entry, or
  small rewordings.
- A few short sentences state an SRD rule in other words, mostly on ammunition
  and holy symbols.

So this is **not a word-for-word copy of the SRD**. If you need the exact text,
use the [SRD itself](https://www.dndbeyond.com/srd). If you find a passage that
isn't in the SRD, please open an issue and it will be removed.

The tactical and referee guidance on condition pages is this project's own
writing.

## Building it yourself

```bash
npm ci
npx tsc --noEmit
npm run lint
npm run build       # → dist/main.js, dist/styles.css, dist/manifest.json
npm test
npm run preflight   # what Obsidian's plugin directory checks
```

The build packs the notes in `SRD 5.2.1/` into `dist/main.js`. See
[CONTRIBUTING.md](CONTRIBUTING.md) for how this repository is made.

## Licenses

- **The plugin** is under the [MIT License](LICENSE).
- **The notes** in `SRD 5.2.1/`, and the copies the plugin writes into your
  vault, are under the Creative Commons Attribution 4.0 International License,
  as the SRD is. See [third-party notices](THIRD_PARTY_NOTICES.md) for the
  attribution and for the software the plugin bundles.

## Attribution

This work includes material from the System Reference Document 5.2.1 ("SRD
5.2.1") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.

The SRD's text has been changed here: it is split into one note per entry,
formatted as Markdown with links and properties, and some entries are divided
into variants.

This project is unofficial. It is not made, endorsed or supported by Wizards of
the Coast, Atlas VTT or Atlas Online.

Atlas VTT and Atlas Online are product names of Fabian Urbanek. They appear here
only to say what this plugin works with.
