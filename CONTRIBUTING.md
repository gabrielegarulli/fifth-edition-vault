# Contributing

Thanks for testing Fifth Edition Vault.

## Reporting a problem

[Open an issue](../../issues/new/choose). Please include your Obsidian version,
the plugin's version (**Settings → Community plugins**), what you did and what
you expected. Screenshots help.

Text that isn't in the SRD 5.2.1 is worth reporting too: name the note and the
passage.

## Contributing code

**Pull requests are welcome**, against the source here: `src/`, `styles/`,
`postcss/`, the scripts and the configs. Open one against `main`, as you would
anywhere else. CI runs the checks below on it.

### How your change comes back

This repository is **exported** from a private one, the plugin's full edition,
and its source is replaced as a whole with each export. So a merged pull
request takes one more step before it is permanent:

1. The maintainer reviews and squash-merges it here.
2. A script ports the merged change into the private repository, with you
   credited as co-author, and a link back to your pull request. It merges your
   change into the full edition's copy of each file. Where your change touches
   something the export had removed, the maintainer resolves it by hand.
3. The next export brings it back here, and the script checks that it does so
   exactly.

You don't need to do anything for steps 2 and 3. Two kinds of change can't
come back on their own:

- **generated files**: `manifest.json`, `versions.json`, `package.json`, its
  lockfile and `scripts/domains.mjs`. Change these if your code needs it, and
  the maintainer makes the same change at the source;
- **the notes in `SRD 5.2.1/`**, which another tool generates. For a mistake
  in a note, an issue is the best route.

`README.md`, this file and `.github/` (apart from the two workflows) are
written by hand here, and a pull request against them is merged as it is.

### Before you start

- **For anything bigger than a fix, open an issue first**, so we can agree on
  the shape before you spend the time.
- **Keep to the SRD 5.2.1.** Text, names and data from other books can't be
  merged.
- **`npm run lint` enforces the folder order** in `scripts/domains.mjs`: a
  folder under `src/` imports only from the folders listed before it in
  `ORDER`, and only through their `index.ts` or `host.ts`.

## Building and checking

You need Node.js 22.

```bash
npm ci
npx tsc --noEmit    # typecheck
npm run lint        # ESLint
npm run build       # → dist/main.js, dist/styles.css, dist/manifest.json
npm test            # Vitest, after the build
npm run preflight   # what Obsidian's plugin directory checks
```

`npm run build` packs `SRD 5.2.1/` into `dist/main.js`, which is how the plugin
installs the notes without downloading them.

To try a build, copy `dist/main.js`, `dist/manifest.json` and `dist/styles.css`
into `.obsidian/plugins/fifth-edition-vault/` in a test vault and reload the
plugin.

**CI** (`plugin-ci.yml`) runs those six steps on every push to `main` and every
pull request, with no secrets.

## Releases

The maintainer runs **Actions → Prepare Plugin Release** with the version from
`manifest.json`. It checks that the version matches `manifest.json`,
`package.json` and `versions.json`, runs every check above, attests the build,
and creates a **draft** release tagged with the bare version (`0.1.0`, never
`v0.1.0`, as Obsidian and BRAT expect) carrying `main.js`, `manifest.json` and
`styles.css`. Publishing the draft is done by hand.

## Licensing your contribution

By contributing you agree that your contribution is licensed under this
repository's licenses: MIT for the plugin and CC-BY-4.0 for the notes.

## Security

See [SECURITY.md](SECURITY.md). Please don't report a vulnerability in a public
issue.
