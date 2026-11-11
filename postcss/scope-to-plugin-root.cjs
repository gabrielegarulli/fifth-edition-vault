// postcss/scope-to-plugin-root.cjs — replaces v3's `important: '.my-dnd-vault'`
const ROOT = '.my-dnd-vault';

module.exports = {
  postcssPlugin: 'scope-to-plugin-root',
  OnceExit(root) {
    root.walkRules(rule => {
      rule.selectors = [...new Set(rule.selectors.map(sel => {
        if (sel === ':root' || sel === ':host') return ROOT;
        return sel.startsWith(ROOT) ? sel : `${ROOT} ${sel}`;
      }))];
    });
  },
};
