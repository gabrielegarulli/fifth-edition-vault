// The Fifth Edition Vault plugin repository, checked the way Obsidian's
// community directory checks a submission (MYDND-187).
//
//   node scripts/preflight.mjs [dir]                     # after npm run build
//   node scripts/preflight.mjs [dir] --release 1.2.3     # and the release's version
//
// The manifest's shape and its 250-character, no-"Obsidian" description,
// `package.json` and `versions.json` in step with it, the root files a
// submission needs, and a bundle that carries the SRD notes and holds no
// `eval`, `child_process`, source map or local path. `--release` adds what a
// GitHub Release needs: the tag is exactly the manifest's version, `x.y.z`, no
// `v` — Obsidian and BRAT both read the tag that way.
//
// It reads no list of what must stay out, so it can be published. This is one
// file in two places: the public repository's `scripts/preflight.mjs` is
// written from it by the export, and `preflight-srd.mjs` adds the leak scan to
// it in the private one.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { packSrdNotes } from './srd-pack.mjs'

/** What the directory checks of a description; `[]` when it passes. */
export function descriptionProblems(description) {
  const problems = []
  if (description.length > 250) problems.push(`is ${description.length} characters, over 250`)
  if (/obsidian/i.test(description)) problems.push('says "Obsidian"')
  if (!description.endsWith('.')) problems.push('does not end with a period')
  return problems
}

const MANIFEST_KEYS = ['id', 'name', 'version', 'minAppVersion', 'description', 'author', 'authorUrl', 'fundingUrl', 'isDesktopOnly', 'helpUrl']
const SEMVER = /^\d+\.\d+\.\d+$/

/**
 * Everything the directory would refuse in `dir`, and what it would only
 * remark on. `release` is the version a GitHub Release is about to be tagged.
 */
export function pluginChecks(dir, { release } = {}) {
  const errors = []
  const warnings = []
  const exists = f => fs.existsSync(path.join(dir, f))
  const read = f => fs.readFileSync(path.join(dir, f), 'utf8')
  const json = f => {
    try {
      return JSON.parse(read(f))
    } catch (e) {
      errors.push(`${f} is not valid JSON: ${e.message}`)
      return {}
    }
  }

  for (const f of ['README.md', 'LICENSE', 'manifest.json', 'versions.json', 'package.json', 'package-lock.json']) {
    if (!exists(f)) errors.push(`${f} is missing`)
  }
  if (!exists('manifest.json')) return { errors, warnings }

  const manifest = json('manifest.json')
  const pkg = exists('package.json') ? json('package.json') : {}

  for (const key of ['id', 'name', 'version', 'minAppVersion', 'description', 'author', 'isDesktopOnly']) {
    if (manifest[key] === undefined || manifest[key] === '') errors.push(`manifest.${key} is missing or empty`)
  }
  for (const key of Object.keys(manifest)) if (!MANIFEST_KEYS.includes(key)) errors.push(`manifest.${key} is not a manifest field`)
  if (manifest.id !== 'fifth-edition-vault') errors.push(`manifest.id is ${manifest.id}, not fifth-edition-vault`)
  if (/obsidian/i.test(manifest.id ?? '') || /plugin$/i.test(manifest.id ?? '')) errors.push('manifest.id must not contain "obsidian" or end with "plugin"')
  if (/obsidian/i.test(manifest.name ?? '')) errors.push('manifest.name must not contain "Obsidian"')
  if (!SEMVER.test(manifest.version ?? '')) errors.push('manifest.version must be x.y.z')
  if (!SEMVER.test(manifest.minAppVersion ?? '')) errors.push('manifest.minAppVersion must be x.y.z')
  for (const p of descriptionProblems(manifest.description ?? '')) errors.push(`manifest.description ${p}`)
  if (/\p{Extended_Pictographic}/u.test(manifest.description ?? '')) errors.push('manifest.description must not contain emoji')
  if (pkg.version !== manifest.version) errors.push(`package.json version ${pkg.version} != manifest version ${manifest.version}`)
  if (!pkg.scripts?.build) errors.push('package.json needs a "build" script')
  if (exists('versions.json')) {
    const versions = json('versions.json')
    if (versions[manifest.version] !== manifest.minAppVersion) errors.push('versions.json does not map the current version to minAppVersion')
  }
  // The directory review refuses an authorUrl that is the plugin's own
  // repository: it wants the author's profile (MYDND-187).
  const repoUrl = String(pkg.repository?.url ?? pkg.repository ?? '').replace(/^git\+/, '').replace(/\.git$/, '')
  const norm = u => String(u ?? '').toLowerCase().replace(/\/+$/, '')
  if (manifest.authorUrl && repoUrl && norm(manifest.authorUrl) === norm(repoUrl)) {
    errors.push("manifest.authorUrl is the plugin's own repository; use the author's profile")
  }
  // GitHub, and so the directory, recognise a licence only when LICENSE is the
  // licence's text and nothing else: one added paragraph made it "Other".
  if (exists('LICENSE')) {
    const license = read('LICENSE').replace(/\r\n/g, '\n').trim()
    if (/^MIT License\b/.test(license) && !license.endsWith('SOFTWARE.')) {
      errors.push('LICENSE has text after the MIT licence, so GitHub does not recognise it; move it elsewhere')
    }
  }
  if (exists('.obsidian')) errors.push('.obsidian/ is a vault folder; a plugin repository has none')

  if (release !== undefined) {
    if (!SEMVER.test(release)) errors.push(`release ${release} must be exactly x.y.z, with no "v"`)
    else if (release !== manifest.version) errors.push(`release ${release} != manifest version ${manifest.version}`)
  }

  if (!exists('dist/main.js')) {
    errors.push('dist/main.js is missing; run npm run build first')
    return { errors, warnings }
  }
  const bundle = read('dist/main.js')
  const blocking = {
    'shell execution (child_process)': /child_process/,
    'eval()': /[^.\w]eval\(/,
    'runtime script-element creation': /\.createElement\(\s*["']script["']/,
    'a source map': /sourceMappingURL=/,
    'an absolute local path': /\/Users\/|\/home\/runner\/|[A-Z]:\\\\Users\\\\|[A-Z]:[\\/]+DnD/,
  }
  for (const [label, re] of Object.entries(blocking)) if (re.test(bundle)) errors.push(`dist/main.js contains ${label}`)
  const scorecard = { 'new Function(': /new Function\(/, innerHTML: /\.innerHTML\s*=/, localStorage: /localStorage\./ }
  for (const [label, re] of Object.entries(scorecard)) if (re.test(bundle)) warnings.push(`dist/main.js contains ${label}`)
  if (Buffer.byteLength(bundle) > 5 * 1024 * 1024) errors.push('dist/main.js is larger than 5 MB')
  const hosts = [...new Set(bundle.match(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [])].filter(
    h => !/w3\.org|reactjs\.org|react\.dev|github\.com|mozilla\.org|fb\.me|example\.com|creativecommons\.org/.test(h),
  )
  if (hosts.length) warnings.push(`dist/main.js names hosts the README must disclose: ${hosts.join(', ')}`)
  for (const f of ['styles.css', 'manifest.json']) if (!exists(`dist/${f}`)) errors.push(`dist/${f} is missing`)
  if (exists('dist/manifest.json') && read('dist/manifest.json') !== read('manifest.json')) errors.push('dist/manifest.json differs from manifest.json')

  // The notes the plugin installs travel inside `main.js`: one built from an
  // empty or stale `SRD 5.2.1/` would install nothing, or the wrong thing.
  const notesDir = path.join(dir, 'SRD 5.2.1')
  if (!fs.existsSync(notesDir)) errors.push('SRD 5.2.1/ is missing')
  else {
    let archive = null
    try {
      archive = packSrdNotes(notesDir).data
    } catch (e) {
      errors.push(`SRD 5.2.1/ cannot be packed: ${e.message}`)
    }
    if (archive && !bundle.includes(archive)) errors.push('dist/main.js does not carry the SRD 5.2.1 notes in SRD 5.2.1/')
  }

  return { errors, warnings }
}

/** Prints the result the way both preflights do; the exit code. */
export function report(dir, { errors, warnings }, extra = '') {
  for (const w of warnings) console.warn(`warning  ${w}`)
  for (const e of errors.slice(0, 40)) console.error(`error    ${e}`)
  if (errors.length > 40) console.error(`… and ${errors.length - 40} more`)
  console.log(`[preflight] ${dir}: ${extra}${errors.length} error(s), ${warnings.length} warning(s)`)
  return errors.length ? 1 : 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  const at = args.indexOf('--release')
  const release = at >= 0 ? (args[at + 1] ?? '') : undefined
  const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--release')
  const dir = path.resolve(positional[0] ?? '.')
  process.exit(report(dir, pluginChecks(dir, { release })))
}
