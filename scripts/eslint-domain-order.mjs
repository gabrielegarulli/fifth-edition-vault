// The domain rule (MYDND-201): one ESLint rule that keeps `src/` a stack of
// domains. Registered by `eslint.config.mjs` as `domains/order`.
//
// Every folder under `src/` is a domain, in the order of `scripts/domains.mjs`.
// A domain's public surface is two files at its root:
//
//   index.ts  everything outside `ui/` and `obsidian/`: pure TypeScript, no
//             React, no `obsidian`. Any test can load it in plain Node.
//   host.ts   what `ui/` and `obsidian/` export: React and the Obsidian edges.
//
// The rule reports, on every `import`, `export … from` and `import()`, type-only
// ones included:
//
//   upward  an import of a domain above this one in the order
//   deep    another domain reached past its index.ts or host.ts
//   pure    a file outside `ui/` and `obsidian/` importing React, `obsidian`,
//           its own domain's `ui/` or `obsidian/`, or another domain's host.ts.
//           This is what keeps index.ts loadable anywhere: everything it
//           reaches is pure too, all the way down.
//   self    a file importing its own domain's index.ts or host.ts: a cycle
//   split   index.ts re-exporting `ui/` or `obsidian/`, or host.ts the rest
//   unknown a file in a folder under `src/` that is not in the order
//
// `web/` sits above every domain. `src/main.ts` is `app`'s, as a host file.
// Specifiers are relative or `@vault/derive` (the bottom domain), so the path
// alone says where an import lands: no resolver is needed.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ORDER } from './domains.mjs'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const posix = p => p.replaceAll('\\', '/')
const tierOf = new Map(ORDER.flatMap((row, i) => row.map(d => [d, i])))
const TOP = ORDER.length
const HOST_LAYERS = new Set(['ui', 'obsidian'])
const ENTRIES = new Set(['index', 'host'])
const IMPURE = /^(react|react-dom|react-router(-dom)?|obsidian)(\/|$)/

/**
 * Where a file sits: its domain, and its layer — the first folder under the
 * domain, or `index` / `host` for the two entries. `null` outside `src/` and
 * `web/`, and for `src/`'s own test and harness folders.
 */
function place(abs) {
  const rel = posix(path.relative(repo, abs)).replace(/\.(tsx?|jsx?|mjs)$/, '')
  if (rel === 'src/main') return { domain: 'app', layer: 'host', file: rel }
  if (rel.startsWith('web/')) return { domain: 'web', layer: 'host', file: rel }
  const m = /^src\/([^/]+)(?:\/(.*))?$/.exec(rel)
  if (!m || m[1].startsWith('__')) return null
  const [, domain, rest = 'index'] = m
  const layer = rest.includes('/') ? rest.slice(0, rest.indexOf('/')) : rest
  return { domain, layer, entry: ENTRIES.has(rest) ? rest : null, file: rel }
}

const isPure = layer => !HOST_LAYERS.has(layer) && layer !== 'host'

/** @type {import('eslint').Rule.RuleModule} */
const order = {
  meta: {
    type: 'problem',
    docs: { description: 'Keep src/ a stack of domains: imports point down the order, through index.ts or host.ts' },
    schema: [],
    messages: {
      upward: '{{from}} may not import {{to}}: {{to}} sits above {{from}} in the domain order (scripts/domains.mjs). Move what both need down, or give {{from}} a slot that {{to}} fills.',
      deep: 'Reach {{to}} through src/{{to}}/{{entry}}.ts, not {{path}}. Export the name there if it is missing.',
      pureImport: 'A {{layer}}/ file is pure: it may not import \'{{spec}}\'. React and obsidian belong in ui/ or obsidian/.',
      pureHost: 'A {{layer}}/ file is pure: it reaches {{to}} only through src/{{to}}/index.ts, never host.ts.',
      pureOwn: 'A {{layer}}/ file is pure: it may not import this domain\'s {{target}}/ ({{path}}).',
      self: 'Import this domain\'s own files directly, not through its {{entry}}.ts: a domain that reads its own entry is a cycle.',
      splitIndex: 'index.ts holds what is outside ui/ and obsidian/. Export {{path}} from host.ts.',
      splitHost: 'host.ts holds what ui/ and obsidian/ export. Export {{path}} from index.ts.',
      unknown: 'src/{{domain}}/ is not a domain. Add it to ORDER in scripts/domains.mjs, or move the file into one.',
    },
  },
  create(context) {
    const from = place(context.filename)
    if (!from) return {}
    const known = from.domain === 'web' || tierOf.has(from.domain)
    const fromTier = from.domain === 'web' ? TOP : tierOf.get(from.domain)

    function check(node, spec) {
      if (typeof spec !== 'string') return
      if (!known) return
      if (!spec.startsWith('.')) {
        // `@vault/derive` is the bottom domain: anyone may read it.
        if (isPure(from.layer) && IMPURE.test(spec)) {
          context.report({ node, messageId: 'pureImport', data: { layer: from.layer, spec } })
        }
        return
      }
      const to = place(path.resolve(path.dirname(context.filename), spec))
      if (!to || to.domain === 'web') return
      if (to.domain === from.domain) {
        if (to.entry && !from.entry) {
          context.report({ node, messageId: 'self', data: { entry: to.entry } })
        } else if (from.entry === 'index' && !isPure(to.layer)) {
          context.report({ node, messageId: 'splitIndex', data: { path: to.file } })
        } else if (from.entry === 'host' && isPure(to.layer)) {
          context.report({ node, messageId: 'splitHost', data: { path: to.file } })
        } else if (isPure(from.layer) && !isPure(to.layer)) {
          context.report({ node, messageId: 'pureOwn', data: { layer: from.layer, target: to.layer, path: to.file } })
        }
        return
      }
      if (to.domain === 'derive') return
      const toTier = tierOf.get(to.domain)
      if (toTier === undefined) return // the target's own file reports it
      if (toTier > fromTier) {
        context.report({ node, messageId: 'upward', data: { from: from.domain, to: to.domain } })
        return
      }
      if (!to.entry) {
        context.report({ node, messageId: 'deep', data: { to: to.domain, entry: isPure(to.layer) ? 'index' : 'host', path: to.file } })
        return
      }
      if (to.entry === 'host' && isPure(from.layer)) {
        context.report({ node, messageId: 'pureHost', data: { layer: from.layer, to: to.domain } })
      }
    }

    const source = node => check(node.source, node.source?.value)
    return {
      Program(node) {
        if (!known) context.report({ node, loc: { line: 1, column: 0 }, messageId: 'unknown', data: { domain: from.domain } })
      },
      ImportDeclaration: source,
      ExportNamedDeclaration: node => node.source && source(node),
      ExportAllDeclaration: source,
      ImportExpression: node => node.source.type === 'Literal' && check(node.source, node.source.value),
    }
  },
}

export default { meta: { name: 'domains' }, rules: { order } }
