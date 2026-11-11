import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { srdNotesPlugin } from './scripts/srd-pack.mjs'

const root = import.meta.dirname

// Obsidian loads exactly three files from a plugin folder: `main.js`,
// `styles.css` and `manifest.json`. Vite has named the one stylesheet
// differently across versions, so rename whatever single stylesheet turns up,
// and put the manifest beside it.
function obsidianOutput(): Plugin {
  return {
    name: 'obsidian-output',
    writeBundle(options) {
      const outDir = options.dir ?? path.dirname(options.file ?? '')
      if (!outDir) return
      const wanted = path.join(outDir, 'styles.css')
      if (!fs.existsSync(wanted)) {
        const stray = fs.readdirSync(outDir).filter(f => f.endsWith('.css'))
        if (stray.length === 1) fs.renameSync(path.join(outDir, stray[0]), wanted)
        else if (stray.length > 1) throw new Error(`[obsidian-output] expected one stylesheet, found ${stray.join(', ')}`)
      }
      fs.copyFileSync(path.join(root, 'manifest.json'), path.join(outDir, 'manifest.json'))
    },
  }
}

export default defineConfig({
  // `srdNotesPlugin` packs the `SRD 5.2.1` folder into `main.js`, which is how
  // the plugin installs the notes without a network (`src/srd/`).
  plugins: [react(), obsidianOutput(), srdNotesPlugin(true, root)],
  define: {
    // The source reads this flag where the edition differs; here it is always on.
    'import.meta.env.SRD_ONLY': 'true',
    // Lib mode leaves `process.env.NODE_ENV` alone, and React picks its build
    // from it at runtime. Obsidian sets none, so it is production here.
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      '@vault/derive': path.resolve(root, 'src/derive'),
      '@': path.resolve(root, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // One file: a plugin cannot code-split.
    cssCodeSplit: false,
    sourcemap: false,
    lib: {
      entry: path.resolve(root, 'src/main.ts'),
      formats: ['cjs'],
      fileName: () => 'main.js',
      cssFileName: 'styles',
    },
    rollupOptions: {
      // Everything Obsidian provides at runtime, plus the CodeMirror packages
      // it already has loaded. Bundling these breaks the editor.
      external: [
        'obsidian',
        'electron',
        '@codemirror/autocomplete',
        '@codemirror/collab',
        '@codemirror/commands',
        '@codemirror/language',
        '@codemirror/lint',
        '@codemirror/search',
        '@codemirror/state',
        '@codemirror/view',
        '@lezer/common',
        '@lezer/highlight',
        '@lezer/lr',
        'node:fs',
        'node:path',
      ],
    },
  },
})
