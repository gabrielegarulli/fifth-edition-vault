import * as fs from 'node:fs'
import * as path from 'node:path'
import postcss, { type AtRule, type Node } from 'postcss'
import { describe, expect, it } from 'vitest'

import { BOX_MIN } from './catalogs/model/boxColumns'

const STYLES_PATH = path.resolve(__dirname, '../dist/styles.css')

/**
 * The built stylesheet, or a failure that says what to do about it.
 *
 * **These guards assert the built artefact on purpose** — both Tailwind 4
 * failure modes they catch (an unscoped selector, a self-referential variable)
 * are invisible in the source. The cost is a dependency on build order, and
 * reading the file directly paid it badly: in CI, where `npm test` ran before
 * `npm run build`, four assertions died with a bare
 * `ENOENT … open '/home/runner/work/…/dist/styles.css'` — while passing locally
 * off a stale `dist/` from an earlier build.
 *
 * CI now builds first. This message is the other half: a developer who runs
 * `npm test` on a clean checkout gets a sentence instead of a path.
 */
function builtStyles(): string {
  if (!fs.existsSync(STYLES_PATH)) {
    throw new Error(
      'dist/styles.css is missing — these guards assert the BUILT stylesheet, ' +
        'because an unscoped selector and a self-referential variable are both ' +
        'invisible in the source. Run `npm run build` first. (CI builds before it tests.)',
    )
  }
  return fs.readFileSync(STYLES_PATH, 'utf8')
}

/** The view's `.view-content`, unpadded by a class (MYDND-187). */
const HOST = '.my-dnd-vault-host.view-content'

describe('styles regression guards (MYDND-9)', () => {
  it('exists and is not empty', () => {
    expect(builtStyles().length).toBeGreaterThan(0)
  })

  it('has no unscoped selector: every rule starts with .my-dnd-vault', () => {
    const content = builtStyles()
    const root = postcss.parse(content)
    const unscoped: string[] = []

    root.walkRules(rule => {
      for (const sel of rule.selectors) {
        // `.my-dnd-vault`, its `__` parts or `--` modifiers, not a class that
        // only starts with it; the view's host is the one rule outside the
        // root, on purpose (MYDND-187).
        if (!/^\.my-dnd-vault(?:(?:__|--)[\w-]+)?(?![\w-])/.test(sel) && sel !== HOST) {
          unscoped.push(sel)
        }
      }
    })

    expect(unscoped).toEqual([])
  })

  it('unpads the view’s .view-content with a class, not an inline style', () => {
    const found: Record<string, string> = {}
    postcss.parse(builtStyles()).walkRules(rule => {
      if (rule.selectors.includes(HOST)) rule.walkDecls(d => void (found[d.prop] = d.value))
    })
    expect(found.padding).toBe('0')
  })

  it('has no self-referential custom property (--x: var(--x))', () => {
    const content = builtStyles()
    // Matches any declaration where property name equals the referenced variable name
    const selfReferential = content.match(/--([a-zA-Z0-9_-]+)\s*:\s*var\(--\1\)/g) ?? []
    expect(selfReferential).toEqual([])
  })

  it('has no bare element selector: preflight stayed out', () => {
    const content = builtStyles()
    const root = postcss.parse(content)
    const bareElementSelectors: string[] = []

    root.walkRules(rule => {
      for (const sel of rule.selectors) {
        // Any selector that does not begin with a class, ID, pseudo-class, or attribute
        // or that directly targets an element outside .my-dnd-vault
        if (!sel.startsWith('.')) {
          bareElementSelectors.push(sel)
        }
      }
    })

    expect(bareElementSelectors).toEqual([])
  })

  it('emits all consolidated component classes scoped to .my-dnd-vault', () => {
    const content = builtStyles()
    const expected = [
      '.btn-ui-primary',
      '.btn-ui-primary-active',
      '.btn-ui-link',
      '.panel-container',
      '.panel-row',
      '.chip-compact',
      '.cell-title',
      '.list-row',
      '.list-row-selected',
      '.badge',
      '.chip-filter',
      '.chip-filter-selected',
      // MYDND-44: the sheet's visual roles.
      '.roll-chip',
      '.note-link',
      '.pip',
      '.pip-spent',
      '.sheet-tab',
      '.sheet-tab-active',
      '.menu-item',
      // MYDND-122: the narrow nav.
      '.nav-tab',
      '.nav-tab-active',
      '.nav-scrim',
      '.nav-more-menu',
      // MYDND-131: the plugin's bar.
      '.app-bar',
      '.app-bar__home',
      '.app-menu',
      '.app-menu__item',
    ]

    for (const cls of expected) {
      expect(content).toContain(`.my-dnd-vault ${cls}`)
    }
  })

  /**
   * MYDND-19. Obsidian's `button` rules are unlayered, and unlayered CSS beats
   * layered CSS whatever the specificity — so a component class inside
   * `@layer components` loses to the stock grey button, and nothing in jsdom
   * notices. Every catalog row rendered as a button and no active state showed.
   */
  it('keeps the component classes out of every cascade layer', () => {
    const root = postcss.parse(builtStyles())
    const layered: string[] = []

    root.walkRules(rule => {
      if (!/\.(btn-ui|panel-|chip-|cell-title|list-row|badge|nav-)/.test(rule.selector)) return
      for (let node: Node | undefined = rule.parent; node; node = node.parent) {
        if (node.type === 'atrule' && (node as AtRule).name === 'layer') {
          layered.push(rule.selector)
          break
        }
      }
    })

    expect(layered).toEqual([])
  })
})

/**
 * MYDND-64: the Bestiary draws the canvas's own palette and IBM Plex. Each
 * guard below is a way that can break while the page still renders.
 */
describe('the Bestiary’s own look (MYDND-64)', () => {
  /**
   * The canvas loads IBM Plex from Google Fonts. The plugin makes no network
   * call but the D&D Beyond import (ADR 0001), so the woff2 files are inlined
   * by Vite's library mode. An `@font-face` pointing anywhere but `data:` is
   * either a request this plugin must not make or a file a release does not ship.
   */
  it('embeds every font face it declares, and fetches none', () => {
    const root = postcss.parse(builtStyles())
    const faces: string[] = []
    root.walkAtRules('font-face', at => {
      at.walkDecls('src', decl => {
        faces.push(decl.value)
      })
    })
    expect(faces.length).toBe(7)
    expect(faces.filter(src => !/^url\("?data:font\/woff2;base64,/.test(src))).toEqual([])
    expect(builtStyles()).not.toMatch(/fonts\.(googleapis|gstatic)\.com/)
  })

  /**
   * Obsidian marks the theme on `body`, outside the plugin's root. Written
   * `.theme-light .bst`, the scoping post-pass would make it
   * `.my-dnd-vault .theme-light .bst` and the light twin would never apply.
   */
  /**
   * MYDND-120. The 320px box floor lives twice: `--bst-box-min` for the grids
   * CSS lays out, `BOX_MIN` for the shelves whose column count JS needs. If
   * they drift, a catalog's cards and Home's panels wrap at different widths.
   */
  it('declares --bst-box-min as BOX_MIN', () => {
    expect(builtStyles()).toContain(`--bst-box-min:${BOX_MIN}px`)
  })

  it('keeps the light twin’s selector as written, so a light theme can reach it', () => {
    expect(builtStyles()).toContain('.my-dnd-vault:is(.theme-light *) .bst{')
  })

  /**
   * Obsidian's `button` rule centres a flex button's children, and a card is a
   * button. Without its own alignment a card's text sits in the middle
   * (MYDND-67, from a screenshot).
   */
  it('reads a card from the left, whatever Obsidian’s button rule says', () => {
    const declared = (selector: string, prop: string): string[] => {
      const values: string[] = []
      postcss.parse(builtStyles()).walkRules(rule => {
        if (!rule.selectors.some(s => s.trim() === selector)) return
        rule.walkDecls(prop, d => {
          values.push(d.value.replace(/\s*!important$/, ''))
        })
      })
      return values
    }
    for (const card of ['.my-dnd-vault .bst-card']) {
      expect(declared(card, 'align-items'), card).toContain('stretch')
      expect(declared(card, 'justify-content'), card).toContain('flex-start')
    }
  })

  /**
   * The card above was one class fixed by hand. Home's Library tiles, Settings'
   * nav and the Workshop went on being centred (MYDND-169), so the reset is on
   * every `.bst-plain` button now. Inside `:where`, so it stays under any class
   * that sets its own layout. `theme.css` has no such rule, so only Obsidian
   * ever showed it.
   */
  it('takes back the layout Obsidian’s button rule sets, under every class', () => {
    const reset: Record<string, string> = {}
    postcss.parse(builtStyles()).walkRules(rule => {
      if (!rule.selectors.some(s => s.trim() === '.my-dnd-vault :where(button.bst-plain)')) return
      rule.walkDecls(d => {
        reset[d.prop] = d.value
      })
    })
    expect(reset).toEqual({
      display: 'inline-block',
      'align-items': 'normal',
      'justify-content': 'normal',
      'white-space': 'normal',
    })
  })

  /**
   * Obsidian draws a checked checkbox's tick on `::after`, with a selector that
   * outranks `.bst-switch::after`. So a switch that was on lost its knob and
   * showed a tick (MYDND-169), and the web build, with no such rule, never did.
   */
  it('keeps a switch’s knob when it is on', () => {
    const declared: Record<string, string> = {}
    postcss.parse(builtStyles()).walkRules(rule => {
      if (!rule.selectors.some(s => s.trim().replace('::', ':') === '.my-dnd-vault .bst-switch:checked:after')) return
      rule.walkDecls(d => {
        declared[d.prop] = d.value
      })
    })
    expect(declared).toMatchObject({ mask: 'none', width: '22px', height: '22px', top: '3px', left: '3px' })
  })

  it('emits the page’s surfaces scoped, and outside every cascade layer', () => {
    const content = builtStyles()
    // Whole selectors, not substrings: `.bst-school` must be a rule of its own,
    // not merely a prefix of `.bst-school--sm` (MYDND-66's negative control
    // renamed the rule and a substring check still passed).
    const selectors = new Set<string>()
    postcss.parse(content).walkRules(rule => {
      for (const s of rule.selectors) selectors.add(s.trim())
    })
    const hasRule = (full: string) =>
      [...selectors].some(s => s === full || s.startsWith(`${full}:`) || s.startsWith(`${full}[`))
    for (const cls of [
      '.bst',
      '.bst-card',
      '.bst-detail',
      '.bst-roll',
      '.bst-row',
      '.bst-checkbox',
      // MYDND-65: the feats catalog, drawn in the same palette.
      '.bst-feat-pip',
      '.bst-meter-seg',
      '.bst-entry-tag--on',
      // MYDND-66: the spells catalog — school icons, V S M, the ladder, the lens bar.
      '.bst-school',
      '.bst-pip--comp',
      '.bst-comp--on',
      '.bst-rung--base',
      // MYDND-69: the spell card's ruled-off header.
      '.bst-card-head',
      // MYDND-162: a school's row in the spell rail, and its icon.
      '.bst-tier--school',
      '.bst-school--xs',
      '.bst-token--code.bst-token--xs',
      // MYDND-76: the magic-items catalog — rarity tiles and dots, flags,
      // charges, the lens's attunement and load, the free slot, what it casts.
      '.bst-itile',
      '.bst-itile--rare',
      '.bst-dot--r-rare',
      '.bst-flag--attune',
      '.bst-item-summary',
      '.bst-charge--on',
      '.bst-cast',
      '.bst-load-fill',
      // MYDND-85: the items catalog — the weapons table, mastery pills, who can use it.
      '.bst-wtable',
      '.bst-wtable-row--open',
      '.bst-mastery',
      '.bst-pill',
      '.bst-whocan-row',
      // MYDND-86: the classes page — the level table, the subclass shelf, the comparison.
      '.bst-ptable',
      '.bst-ptable-row--sub',
      '.bst-ptable-row--here',
      '.bst-ptable-slot--on',
      '.bst-subcard',
      '.bst-subgroup-head',
      '.bst-compare-cell',
      '.bst-nlevel-n--sub',
      // MYDND-87: the builder — the stepper, the live sheet, the class and ability steps.
      '.bst-bstep--current',
      '.bst-bprogress-seg--open',
      '.bst-bprogress-seg--current',
      '.bst-bsheet',
      '.bst-bclass',
      '.bst-stepper-btn',
      '.bst-abtile--raised',
      '.bst-bsection--open',
      // MYDND-88: the roster — the card, its HP bar and tiles, the broken card, the add card.
      '.bst-ccard',
      '.bst-ccard--broken',
      '.bst-hp-fill--low',
      '.bst-ctile',
      // MYDND-132: the card reworked — the banner, the AC shield, the pips, the icon actions.
      '.bst-ccard-banner--6',
      '.bst-ccard-ac',
      '.bst-ccard-pip--spent',
      '.bst-ccard-icon',
      '.bst-addcard',
      '.bst-crow',
      // MYDND-135: the party as rows on Home, and the switch between rows and cards.
      '.bst-cline',
      '.bst-cline--broken',
      '.bst-cline-ring-fill--low',
      '.bst-hm-viewbtn',
      // MYDND-90: the party board — the row, the HP controls, the budget.
      '.bst-prow',
      '.bst-hpctl-btn--dmg',
      '.bst-hp-fill--temp',
      '.bst-budget-now',
      '.bst-nprow',
      // MYDND-91: the encounter — the round pill, the acting and downed rows.
      '.bst-roundpill',
      '.bst-enc-row--acting',
      '.bst-enc-row--down',
      '.bst-enc-tile--pc',
      // MYDND-92: the log — the days, the kinds, the timeline.
      '.bst-log-day',
      '.bst-log-kind--none',
      '.bst-log-entry',
      '.bst-log-totals',
      // MYDND-93: session notes — the cards, the date tile, the preview's links.
      '.bst-notecard',
      '.bst-datetile',
      '.bst-notes-links',
      '.bst-hv-flow',
      '.bst-hv-quarry',
      '.bst-hv-board',
      '.bst-hv-grid',
      '.bst-hv-mark--yes',
      '.bst-hv-seat',
      '.bst-hv-total',
      '.bst-hv-loot',
      '.bst-btn-primary--teal',
      '.bst-cr-tabs',
      '.bst-cr-aside',
      '.bst-cr-phase',
      '.bst-cr-ruler',
      '.bst-cr-band--boon',
      '.bst-cr-band--hit',
      '.bst-cr-quirk--flaw',
      '.bst-cr-out',
      '.bst-sh-purse',
      '.bst-sh-board',
      '.bst-sh-row',
      '.bst-sh-row--till',
      '.bst-sh-till',
      '.bst-sh-chip',
      '.bst-sh-sides',
      '.bst-st-nav',
      '.bst-st-campaigns',
      '.bst-st-campaign--on',
      '.bst-st-row',
      '.bst-switch',
      '.bst-st-bands',
      '.bst-st-problem',
      '.bst-hm-board',
      '.bst-hm-lib',
      '.bst-hm-libcard',
      '.bst-hm-fight',
      '.bst-hm-party',
      '.bst-hm-panel',
      '.bst-hm-work',
      // MYDND-127: the builder's pickers in the level-up panel, without the page frame.
      '.bst.bst-embed',
    ]) {
      expect(hasRule(`.my-dnd-vault ${cls}`), cls).toBe(true)
    }
    const layered: string[] = []
    postcss.parse(content).walkRules(rule => {
      if (!/\.bst/.test(rule.selector)) return
      for (let node: Node | undefined = rule.parent; node; node = node.parent) {
        if (node.type === 'atrule' && (node as AtRule).name === 'layer') {
          layered.push(rule.selector)
          break
        }
      }
    })
    expect(layered).toEqual([])
  })
})

describe('the builder\'s buttons in the sidebar (MYDND-155)', () => {
  const declarations = (selector: string): Record<string, string> => {
    const found: Record<string, string> = {}
    postcss.parse(builtStyles()).walkRules(rule => {
      if (rule.selectors.includes(selector)) rule.walkDecls(d => void (found[d.prop] = d.value))
    })
    return found
  }

  it('wraps, because three buttons want more than the 340px sidebar has', () => {
    expect(declarations('.my-dnd-vault .bst-bnav')['flex-wrap']).toBe('wrap')
  })

  it('keeps Next on one line, sized by its label rather than its longest word', () => {
    const next = declarations('.my-dnd-vault .bst-bnav .bst-btn-primary')
    // `auto` is the build's spelling of `1 1 auto`.
    expect(next.flex).toBe('auto')
    expect(next['white-space']).toBe('nowrap')
  })
})

describe('the Library on Home (MYDND-163)', () => {
  const declarations = (selector: string): Record<string, string> => {
    const found: Record<string, string> = {}
    postcss.parse(builtStyles()).walkRules(rule => {
      if (rule.selectors.includes(selector)) rule.walkDecls(d => void (found[d.prop] = d.value))
    })
    return found
  }

  it('stacks the catalogs, one to a row', () => {
    expect(declarations('.my-dnd-vault .bst-hm-lib')['flex-direction']).toBe('column')
  })

  it('keeps the Library’s and the Workshop’s tiles at 44px', () => {
    for (const row of ['.bst-hm-libcard', '.bst-hm-work']) {
      const tile = declarations(`.my-dnd-vault ${row} .bst-hm-libtile`)
      expect(tile.width, row).toBe('44px')
      expect(tile.height, row).toBe('44px')
      expect(tile.flex, row).toBe('none')
    }
  })

  it('sizes the art in both, which has no size of its own', () => {
    for (const row of ['.bst-hm-libcard', '.bst-hm-work']) {
      expect(declarations(`.my-dnd-vault ${row} .bst-hm-libtile svg`).width, row).toBe('28px')
    }
  })

  it('dims a catalog with no page without opacity, which took its text under AA contrast', () => {
    expect(declarations('.my-dnd-vault .bst-hm-libcard--off').opacity).toBeUndefined()
  })

  it('holds a row’s text to 1rem and no less than 16px', () => {
    expect(declarations('.my-dnd-vault .bst-hm-libcard')['font-size']).toBe('max(1rem,16px)')
  })
})

describe('a rail’s filters (MYDND-163)', () => {
  const declarations = (selector: string): Record<string, string> => {
    const found: Record<string, string> = {}
    postcss.parse(builtStyles()).walkRules(rule => {
      if (rule.selectors.includes(selector)) rule.walkDecls(d => void (found[d.prop] = d.value))
    })
    return found
  }

  it('gives a catalog’s rail 320px, and its search all of that', () => {
    expect(declarations('.my-dnd-vault .bst-rail--filters').width).toBe('320px')
    expect(declarations('.my-dnd-vault .bst-rail--filters .bst-search').width).toBe('100%')
  })

  it('pads every catalog’s rail 1rem, with the scrollbar inside that, not added to it', () => {
    const rail = declarations('.my-dnd-vault .bst-rail--filters')
    expect(rail.padding).toBe('1rem calc(1rem - 8px) 1rem 1rem')
    expect(rail.gap).toBe('1rem')
    expect(rail['scrollbar-gutter']).toBe('stable')
    expect(declarations('.my-dnd-vault .bst-rail--filters::-webkit-scrollbar').width).toBe('8px')
  })

  it('has no second spacing for a page to fall back on', () => {
    expect(declarations('.my-dnd-vault .bst-rail--spells')).toEqual({})
    expect(declarations('.my-dnd-vault .bst-rail--loose')).toEqual({})
  })

  it('leaves a rail of links at 220px', () => {
    expect(declarations('.my-dnd-vault .bst-rail').width).toBe('220px')
  })

  it('draws Clear filters red, from the palette’s pair, which has a light twin', () => {
    const clear = declarations('.my-dnd-vault .bst-active-chip--clear')
    expect(clear.background).toContain('--bst-r-artifact-bg')
    expect(clear.color).toContain('--bst-r-artifact-fg')
  })

  it('hangs the source panel from the picker, never from the window', () => {
    expect(declarations('.my-dnd-vault .bst-picker').position).toBe('relative')
    expect(declarations('.my-dnd-vault .bst-picker-panel').position).toBe('absolute')
  })

  it('edges the source field for AA, and draws the keyboard’s row with more than a tint', () => {
    expect(declarations('.my-dnd-vault .bst-picker-input').border).toContain('--bst-muted')
    expect(declarations('.my-dnd-vault .bst-picker-opt--active').outline).toContain('--bst-accent')
  })

  it('keeps a selected filter’s chip a target AA accepts', () => {
    expect(parseInt(declarations('.my-dnd-vault .bst-active-chip')['min-height'], 10)).toBeGreaterThanOrEqual(24)
  })

  it('edges a checkbox in the muted colour, because a line colour is under AA’s 3:1', () => {
    expect(declarations('.my-dnd-vault .bst-checkbox').border).toContain('--bst-muted')
  })

  it('wraps a long label rather than cutting it off', () => {
    const label = declarations('.my-dnd-vault .bst-check-label')
    expect(label['overflow-wrap']).toBe('anywhere')
    expect(label['white-space']).toBeUndefined()
  })

  it('keeps a filter’s heading a target AA accepts', () => {
    expect(parseInt(declarations('.my-dnd-vault .bst-fold')['min-height'], 10)).toBeGreaterThanOrEqual(24)
  })
})

describe('the party rows in a docked pane (MYDND-144)', () => {
  // At 380px the wide grid's fixed columns, gaps and padding are the whole box,
  // and the name column gets 0px. Nothing overflows, so only this and a
  // screenshot notice: the narrow grid must leave the name its `1fr`.
  it('narrows the fixed columns under 520px, by a container query on the list', () => {
    const rule = /@container party-rows[^{]*\{\.my-dnd-vault \.bst-cline\{([^}]*)\}/.exec(builtStyles())?.[1] ?? ''
    const columns = /grid-template-columns:([^;]+)/.exec(rule)?.[1] ?? ''
    const fixed = columns
      .split(/\s+(?![^(]*\))/)
      .filter(c => /^\d+px$/.test(c))
      .reduce((sum, c) => sum + parseInt(c, 10), 0)
    const gap = parseInt(/column-gap:(\d+)px/.exec(rule)?.[1] ?? '99', 10)
    const pad = parseInt(/padding:(\d+)px/.exec(rule)?.[1] ?? '99', 10)
    // A 380px pane leaves the box about 346px; the name needs some of it.
    expect(columns).toContain('minmax(0,1fr)')
    expect(fixed + 4 * gap + 2 * pad).toBeLessThan(346 - 80)
  })
})

describe('the frame colour', () => {
  // `.bst` is transparent in the frame whether or not the embers are on, so the
  // root must paint the page colour without the canvas, or the page shows
  // whatever is behind the pane.
  it('hangs off `<main>`, which is always there, and not the opt-in canvas', () => {
    const css = builtStyles()
    expect(css).toContain('.my-dnd-vault:has(>.my-dnd-vault__main){background:#17171a}')
    expect(css).toContain('.my-dnd-vault:is(.theme-light *):has(>.my-dnd-vault__main){background:#f7f7f9}')
    expect(css).not.toContain(':has(>.my-dnd-vault__blaze)')
  })
})

describe('the Vault look (MYDND-143)', () => {
  // Opt-in: every rule keys off the class `view.tsx` puts on the root, and the
  // light twins must survive the post-pass as written, or a light vault would
  // get the dark chrome with nothing to say why.
  it('keeps each light twin as written', () => {
    const css = builtStyles()
    for (const tail of ['{', ' .my-dnd-vault__main{', ' .app-bar,', ' .my-dnd-vault__group-chips{', ' .bst{']) {
      expect(css).toContain(`.my-dnd-vault.my-dnd-vault--vault-look:is(.theme-light *)${tail}`)
    }
  })

  it('reaches nothing without the class: every rule of it names the class', () => {
    const css = builtStyles()
    const block = css.slice(css.indexOf('.my-dnd-vault.my-dnd-vault--vault-look{'))
    const selectors = [...block.matchAll(/(?:^|})([^{}@]+)\{/g)].map(m => m[1].trim()).filter(Boolean)
    expect(selectors.length).toBeGreaterThan(8)
    expect(selectors.filter(s => !s.startsWith('.my-dnd-vault.my-dnd-vault--vault-look'))).toEqual([])
  })

  it('drops the gutter in a docked pane, by a container query on the root', () => {
    const rule =
      /@container mydnd-pane[^{]*\{\.my-dnd-vault\.my-dnd-vault--vault-look \.my-dnd-vault__main\{([^}]*)\}/.exec(
        builtStyles(),
      )?.[1] ?? ''
    // The minifier orders the declarations as it likes.
    expect(rule.split(';').sort()).toEqual(['border-radius:0', 'margin:0'])
  })
})

describe('WCAG 2.2 AA (MYDND-165)', () => {
  const luminance = (hex: string): number => {
    const full = hex.length === 4 ? hex.replace(/[0-9a-f]/gi, c => c + c) : hex
    const [r, g, b] = [1, 3, 5]
      .map(i => parseInt(full.slice(i, i + 2), 16) / 255)
      .map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contrast = (a: string, b: string): number => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  /** A scheme's `--bst-*` hexes, from every block of exactly that selector. */
  const palette = (selector: string): Record<string, string> => {
    const css = builtStyles()
    const tokens: Record<string, string> = {}
    for (const block of css.split(`}${selector}{`).slice(1)) {
      for (const [, name, value] of block.slice(0, block.indexOf('}')).matchAll(/(--bst-[\w-]+):(#[0-9a-f]{3,6})\b/gi)) {
        tokens[name] = value
      }
    }
    return tokens
  }
  const SCHEMES = {
    dark: '.my-dnd-vault .bst',
    light: '.my-dnd-vault:is(.theme-light *) .bst',
  }
  const SURFACES = ['--bst-bg', '--bst-surface', '--bst-raised', '--bst-sunken', '--bst-selected']

  /** Every rule of `selector`, as one string of declarations. */
  const declarations = (selector: string): string =>
    builtStyles()
      .split(`}${selector}{`)
      .slice(1)
      .map(block => block.slice(0, block.indexOf('}')))
      .join(';')

  describe.each(Object.entries(SCHEMES))('the %s palette', (_scheme, selector) => {
    it('reads the canvas’s tokens, so the checks below have something to check', () => {
      expect(Object.keys(palette(selector)).length).toBeGreaterThan(40)
    })

    it.each(['--bst-text', '--bst-text-2', '--bst-muted', '--bst-dim', '--bst-faint', '--bst-teal', '--bst-orange', '--bst-gold', '--bst-rose'])(
      'keeps %s at 4.5:1 on every surface',
      token => {
        const tokens = palette(selector)
        for (const surface of SURFACES) {
          expect(contrast(tokens[token], tokens[surface]), `${token} on ${surface}`).toBeGreaterThanOrEqual(4.5)
        }
      },
    )

    it.each(['--bst-accent', '--bst-orange', '--bst-teal'])('keeps --bst-on-accent at 4.5:1 on a %s fill', fill => {
      const tokens = palette(selector)
      expect(contrast(tokens['--bst-on-accent'], tokens[fill])).toBeGreaterThanOrEqual(4.5)
    })

    // Declared twice, once as the rarity's colour, so one can move without the other.
    it.each([
      ['--bst-r-none', '--bst-faint'],
      ['--bst-r-uncommon', '--bst-teal'],
      ['--bst-r-legendary', '--bst-orange'],
      ['--bst-r-artifact', '--bst-rose'],
    ])('keeps %s the same colour as %s', (rarity, token) => {
      const tokens = palette(selector)
      expect(tokens[rarity]).toBe(tokens[token])
    })
  })

  it('rings every control with an outline, because Obsidian’s ring is a box-shadow `shadow-none` deletes', () => {
    const rule = /\.my-dnd-vault :is\(([^)]*)\):focus-visible,[^{]*\{([^}]*)\}/.exec(builtStyles())
    expect(rule?.[1]).toContain('button')
    expect(rule?.[1]).toContain('summary')
    expect(rule?.[2]).toContain('outline:2px solid var(--text-normal)')
  })

  it('keeps the ring outside every cascade layer, and ahead of the canvas’s own', () => {
    const css = builtStyles()
    const ring = css.indexOf('.my-dnd-vault :is(a,button,')
    expect(ring).toBeGreaterThan(-1)
    expect(ring).toBeLessThan(css.indexOf('.my-dnd-vault .bst-plain:focus-visible'))
    const unlayered = postcss.parse(css).nodes.filter(n => n.type === 'rule').map(n => n.selector)
    expect(unlayered.some(s => s.includes(':focus-visible') && s.includes(':is(a,button,'))).toBe(true)
  })

  it('reads --text-faint as muted, on the root, where --color-faint resolves', () => {
    expect(declarations('.my-dnd-vault')).toContain('--text-faint:var(--text-muted)')
  })

  it('chooses the text on the accent by its luminance, where black and white tie', () => {
    expect(declarations('.my-dnd-vault')).toMatch(/--text-on-accent:color\(from var\(--interactive-accent\) srgb-linear clamp\(0, calc\(\(\.179 - /)
  })

  // Opacity on a parent is invisible to a check of the text's own colour, and
  // all of these took text under AA. A disabled control is exempt, so this
  // names the rules rather than banning the property.
  it.each(['bst-tab-count', 'bst-pill-count', 'bst-log-kind-n', 'bst-cr-band-range', 'bst-enc-row--down', 'bst-sh-row--refused'])(
    'draws .%s at full strength',
    name => {
      const rules = declarations(`.my-dnd-vault .${name}`)
      expect(rules.length).toBeGreaterThan(0)
      expect(rules).not.toContain('opacity')
    },
  )
})

describe('a view switch lights on aria-current (MYDND-166)', () => {
  // `role="tab"` went, and `aria-selected` is not valid on a plain button. A
  // selector left on it matches nothing, and every switch just looks unselected.
  it.each(['bst-tab', 'bst-toggle--tab', 'bst-cr-tab', 'bst-sh-side'])('.%s', name => {
    expect(builtStyles()).toContain(`.${name}[aria-current=`)
    expect(builtStyles()).not.toContain(`.${name}[aria-selected=`)
  })
})

describe('a pip’s target box (MYDND-164)', () => {
  const declarations = (selector: string): Record<string, string> => {
    const found: Record<string, string> = {}
    postcss.parse(builtStyles()).walkRules(rule => {
      if (rule.selectors.includes(selector)) rule.walkDecls(d => void (found[d.prop] = d.value))
    })
    return found
  }

  // The visual dot is 14px, drawn on `::before`; the button itself is a 24px
  // target for WCAG 2.2 AA SC 2.5.8, and clears Obsidian's hover fill.
  it.each(['.my-dnd-vault .pip', '.my-dnd-vault .pip-spent'])(
    'gives %s at least a 24×24px button box',
    selector => {
      const box = declarations(selector)
      expect(parseInt(box.width, 10)).toBeGreaterThanOrEqual(24)
      expect(parseInt(box.height, 10)).toBeGreaterThanOrEqual(24)
      expect(parseInt(box['min-width'], 10)).toBeGreaterThanOrEqual(24)
      expect(parseInt(box['min-height'], 10)).toBeGreaterThanOrEqual(24)
    },
  )
})
