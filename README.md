# Fifth Edition Vault

Fifth Edition Vault is a community extension. It is not made, endorsed or supported by Atlas VTT or Atlas Online. [Get support here](https://github.com/gabrielegarulli/fifth-edition-vault/issues).

https://github.com/user-attachments/assets/8324a97e-545c-4f63-bbf2-92d500a11b08

An Obsidian plugin for the **System Reference Document 5.2.1**. It writes the
SRD into your vault as linked notes, lets you browse them as catalogs and build
characters from them, and rolls those characters into an Atlas VTT scene. Fifth
edition compatible.

The rules notes are inside the plugin. You install them into your vault with
one click, in the folders you choose. The plugin never contacts a server.

This is an early release for testing. Please [report what you find](../../issues).

## Installing

You need **Obsidian 1.11.4 or later on a computer** (Windows, macOS or Linux).
The plugin doesn't run on phones or tablets. To check your version, open
**Settings → General**; if it's older, click **Check for updates**.

Fifth Edition Vault isn't in Obsidian's **Community plugins** browser yet. Until
it is, install it with BRAT or from a GitHub release.

### With BRAT (recommended)

[BRAT](https://github.com/TfTHacker/obsidian42-brat) installs plugins from
GitHub and keeps them up to date.

1. In Obsidian, open **Settings → Community plugins**. If you see **Turn on
   community plugins**, click it.
2. Click **Browse**, search for **BRAT**, install it and enable it.
3. Open the command palette (**Ctrl + P**, or **Cmd + P** on a Mac) and run
   **BRAT: Add a beta plugin for testing**.
4. Paste `gabrielegarulli/fifth-edition-vault`, pick the latest version and
   click **Add plugin**.
5. Back in **Settings → Community plugins**, make sure **Fifth Edition Vault**
   is switched on.

BRAT checks for new releases when Obsidian starts.

### From a GitHub release

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
4. In Obsidian, open **Settings → Community plugins**, click the
   circular-arrow icon to reload the list, and switch **Fifth Edition Vault**
   on.

To update, download the three files of the new release and replace the old
ones, then restart Obsidian. Your settings are kept: they live in a `data.json`
file beside them that a release never includes.

### From Community plugins

Once the plugin is listed, search for **Fifth Edition Vault** in **Settings →
Community plugins → Browse**, then install and enable it. This README will say
so when it is.

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

**The plugin never contacts a server.** Everything it shows comes from the notes
in your vault.

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
