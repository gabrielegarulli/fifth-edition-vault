// The SRD 5.2.1 notes, packed into the SRD edition's `main.js` (MYDND-185).
//
// Obsidian installs only `main.js`, `manifest.json` and `styles.css` from a
// release, so none of the 1,441 notes and 12 bases reach a user's vault, and the
// edition may not download them: it reaches no server (MYDND-133). So the build
// carries them. Every file is read, sorted, put in one JSON document and
// compressed with `deflate-raw`; the plugin inflates it with the Web API's
// `DecompressionStream` (`src/srd/seed.ts`), so nothing here runs in Obsidian.
//
// `srdNotesPlugin(enabled)` is the Vite side: the virtual module
// `virtual:srd-notes` is the pack in `--mode srd`, and `null` everywhere else, so
// the full plugin's `dist/main.js` carries none of it.
//
// Where the notes are read from, first that exists:
//   1. `SRD_NOTES_DIR`
//   2. `srd-content/SRD 5.2.1` and `SRD 5.2.1` in this repo (the exported plugin
//      repository, MYDND-186)
//   3. `../fifth-edition-vault/SRD 5.2.1`, the public repository beside this one
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

/** The rules folders, as `src/content/folders.ts`'s `RULE_FOLDER_KEYS` names them. */
export const SRD_FOLDERS = [
  'spells',
  'bestiary',
  'classes',
  'subclasses',
  'species',
  'backgrounds',
  'feats',
  'items',
  'magic-items',
  'conditions',
  'diseases',
  'variant-rules',
]

const VIRTUAL_ID = 'virtual:srd-notes'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

/** The SRD notes folder this build reads, or `null` when none of the candidates exists. */
export function findSrdNotesDir(root) {
  const candidates = process.env.SRD_NOTES_DIR
    ? [path.resolve(root, process.env.SRD_NOTES_DIR)]
    : [
        path.join(root, 'srd-content', 'SRD 5.2.1'),
        path.join(root, 'SRD 5.2.1'),
        path.join(root, '..', 'fifth-edition-vault', 'SRD 5.2.1'),
      ]
  return candidates.find(dir => fs.existsSync(dir) && fs.statSync(dir).isDirectory()) ?? null
}

/** A base's one `file.inFolder("…/<folder>")`, which the seeder rewrites to the folder the settings name. */
const IN_FOLDER = /file\.inFolder\("([^"]*)"\)/g

/**
 * Every note and base under `dir`, checked. Throws, failing the build, unless
 * there are the twelve folders, each with notes, and twelve bases that each
 * filter on exactly one of them.
 */
export function readSrdNotes(dir) {
  const notes = []
  for (const folder of SRD_FOLDERS) {
    const full = path.join(dir, folder)
    if (!fs.existsSync(full)) throw new Error(`[srd-pack] ${full} is missing`)
    const names = fs.readdirSync(full).filter(n => n.endsWith('.md')).sort()
    if (names.length === 0) throw new Error(`[srd-pack] ${full} has no notes`)
    for (const name of names) notes.push({ folder, name, text: fs.readFileSync(path.join(full, name), 'utf8') })
  }

  const bases = []
  for (const name of fs.readdirSync(dir).filter(n => n.endsWith('.base')).sort()) {
    const text = fs.readFileSync(path.join(dir, name), 'utf8')
    const filters = [...text.matchAll(IN_FOLDER)].map(m => m[1].split('/').pop())
    if (filters.length !== 1 || !SRD_FOLDERS.includes(filters[0])) {
      throw new Error(`[srd-pack] ${name} must filter on exactly one rules folder, found ${filters.join(', ') || 'none'}`)
    }
    bases.push({ folder: filters[0], name, text })
  }
  const covered = new Set(bases.map(b => b.folder))
  if (bases.length !== SRD_FOLDERS.length || covered.size !== SRD_FOLDERS.length) {
    throw new Error(`[srd-pack] expected ${SRD_FOLDERS.length} bases, one per folder; found ${bases.length} in ${dir}`)
  }
  return { notes, bases }
}

/** The pack as the virtual module carries it: counts, and the archive as base64. */
export function packSrdNotes(dir) {
  const pack = readSrdNotes(dir)
  const json = JSON.stringify(pack)
  const data = zlib.deflateRawSync(Buffer.from(json, 'utf8'), { level: 9 }).toString('base64')
  return { notes: pack.notes.length, bases: pack.bases.length, data }
}

/** Vite/Vitest plugin: `virtual:srd-notes` is the pack when `enabled`, else `null`. */
export function srdNotesPlugin(enabled, root) {
  return {
    name: 'srd-notes',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      if (!enabled) return 'export default null\n'
      const dir = findSrdNotesDir(root)
      if (!dir) {
        throw new Error(
          '[srd-pack] no SRD 5.2.1 notes folder. Set SRD_NOTES_DIR, or check out ' +
            'gabrielegarulli/fifth-edition-vault beside this repository.',
        )
      }
      const packed = packSrdNotes(dir)
      console.log(
        `[srd-pack] ${packed.notes} notes and ${packed.bases} bases from ${dir}: ${Math.round(packed.data.length / 1024)} kB of base64`,
      )
      return `export default ${JSON.stringify(packed)}\n`
    },
  }
}
