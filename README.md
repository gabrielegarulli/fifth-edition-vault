# Fifth Edition Vault

Fifth Edition Vault is a community extension. It is not made, endorsed or supported by Atlas VTT or Atlas Online. [Get support here](https://github.com/gabrielegarulli/fifth-edition-vault/issues).

An Obsidian vault holding the **System Reference Document 5.2.1** as linked
notes, with a plugin installed to browse it and build characters. Fifth edition
compatible.

This is an early release for testing. Please [report what you find](../../issues).

## Using it

1. Download this repository (**Code → Download ZIP**) or clone it.
2. In Obsidian: **Open folder as vault** and choose the folder.
3. Accept **Trust author and enable plugins**. The plugin is already listed in
   `.obsidian/community-plugins.json`.
4. Open it from the ribbon.

The plugin needs Obsidian 1.11.4 or later, on desktop.

Rolls go through the [Atlas VTT](https://atlas-vtt.dev) plugin when it is
installed. It isn't included here, and nothing else is needed to read the
catalogs or build a character.

Atlas VTT is a separate project with its own licence. This plugin contains none
of its code and only calls it inside Obsidian. If a roll goes wrong, please
[report it here](../../issues), not to Atlas VTT.

## What's in it

| Folder | Notes | | Folder | Notes |
| :--- | ---: | :--- | :--- | ---: |
| `spells` | 339 | | `feats` | 17 |
| `bestiary` | 336 | | `conditions` | 15 |
| `magic-items` | 339 | | `classes` / `subclasses` | 12 / 12 |
| `items` | 236 | | `species` / `backgrounds` | 9 / 4 |
| `variant-rules` | 119 | | `diseases` | 3 |

Each folder has a Bases view at the root (`Spells.base`, `Bestiary.base`, …).

**The notes are generated, not hand-written.** Where the SRD renames an entry,
the SRD's name is used (Arcane Hand, Handy Haversack, Instant Fortress). Each
note carries an `export_hash`, so a later export leaves a note you have edited
alone.

**The plugin never contacts a server.** Everything it shows comes from the notes
in this vault.

## How close to the SRD it is

The text was generated from the 5e.tools dataset, keeping only entries it marks
as SRD 5.2, and then corrected against the SRD 5.2.1 PDF. On 2026-11-05 every
sentence in the notes was compared with that PDF:

- About 94% of the 5,923 prose sentences match the SRD at 90% or better, and 97%
  of the stat block text does.
- The rest are mainly lines this vault generates ("You gain a feature from your
  Fighter Subclass"), one note per variant of a single SRD table entry, or small
  rewordings.
- A few short sentences state an SRD rule in other words, mostly on ammunition
  and holy symbols.

So this is **not a word-for-word copy of the SRD**. If you need the exact text,
use the [SRD itself](https://www.dndbeyond.com/srd). If you find a passage that
isn't in the SRD, please open an issue and it will be removed.

The tactical and referee guidance on condition pages is this project's own
writing.

## License

- **The notes** are under the [Creative Commons Attribution 4.0 International
  License](LICENSE), as the SRD is.
- **The plugin** in `.obsidian/plugins/fifth-edition-vault` is under the
  [MIT License](.obsidian/plugins/fifth-edition-vault/LICENSE), with
  [third-party notices](.obsidian/plugins/fifth-edition-vault/THIRD_PARTY_NOTICES.md).

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
