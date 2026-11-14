## What this changes

<!-- What it does, and why. Link the issue it closes: "Closes #123". -->

## How you checked it

- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` and `npm test` pass
- [ ] Tried in a test vault (CONTRIBUTING.md, "Running it in a test vault"): light and dark theme, narrow and wide pane
- [ ] A new test suite was broken once on purpose, and failed

<!-- Anything you couldn't check, say so here. -->

## Before you open it

- [ ] Only SRD 5.2.1 text, names and data
- [ ] Imports follow the folder order in `scripts/domains.mjs` (ARCHITECTURE.md explains it)
- [ ] No change to generated files (`manifest.json`, `versions.json`, `package.json`, the lockfile, `scripts/domains.mjs`) unless the code needs it

Merged pull requests are ported into the private source repository and come back with the next export. You're credited as co-author. CONTRIBUTING.md has the details.
