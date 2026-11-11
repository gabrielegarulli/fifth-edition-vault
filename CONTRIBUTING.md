# Contributing

Thanks for testing Fifth Edition Vault.

## Reporting a problem

[Open an issue](../../issues/new/choose). Please include your Obsidian version,
the plugin's version (**Settings → Community plugins**), what you did and what
you expected. Screenshots help.

Text that isn't in the SRD 5.2.1 is worth reporting too: name the note and the
passage.

## How this repository is made

The plugin's source here is **generated** from a private repository and
replaced as a whole with each export. That covers:

- `src/`, `scripts/`, `styles/` and `postcss/`;
- the root files: `manifest.json`, `versions.json`, `package.json`, the
  `tsconfig`, Vite, Vitest and ESLint configs, `LICENSE` and
  `THIRD_PARTY_NOTICES.md`;
- `.github/workflows/plugin-ci.yml` and `plugin-release.yml`.

The notes in `SRD 5.2.1/` are generated too. A direct edit to any of those
would be overwritten, so **an issue is usually the best way to propose a
change**. This README, this file and the rest of `.github/` are written by hand
here, and a pull request against them is welcome.

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
