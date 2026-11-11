/**
 * A stand-in for the `obsidian` module, for tests only.
 *
 * The real one has **no runtime entry** — it is `obsidian.d.ts` and nothing else,
 * because Obsidian injects the module at load time. So any file importing a
 * *value* from it is unloadable outside the app, which is why `src/content/`
 * routes every Obsidian call through one adapter and stays testable without this.
 *
 * The view layer cannot do the same. `MarkdownRenderer`, `Component` and
 * `setIcon` are the whole point of rendering a note, and they are values. So the
 * module is aliased to this file under Vitest (see `vitest.config.mts`), which
 * buys one specific thing: **the pages can be mounted.** A page that throws on
 * its first render is the likeliest defect in a UI nobody can run from a test, and
 * that is the class of bug this catches. It does not and cannot tell you whether
 * anything *looks* right.
 */

export type IconName = string

export class Component {
  private readonly cleanups: Array<() => unknown> = []
  load(): void {}
  /** Run on `unload`, as Obsidian's does — the hover popover's close path (MYDND-63). */
  register(cb: () => unknown): void {
    this.cleanups.push(cb)
  }
  unload(): void {
    for (const cb of this.cleanups.splice(0)) cb()
  }
}

/**
 * Obsidian's hover popover, minus the positioning and the timers: it appears at
 * once, attached to the body, and closes when `unload` is called — which is
 * what Obsidian does when the pointer leaves both the link and the card.
 * `HoverPopover.open` lists every one made, for a test to find and close.
 */
export class HoverPopover extends Component {
  static open: HoverPopover[] = []
  hoverEl: HTMLElement

  constructor(parent: { hoverPopover: unknown }, _targetEl: HTMLElement | null) {
    super()
    this.hoverEl = document.createElement('div')
    this.hoverEl.className = 'popover hover-popover'
    document.body.append(this.hoverEl)
    parent.hoverPopover = this
    HoverPopover.open.push(this)
    this.register(() => this.hoverEl.remove())
  }
}

export function setIcon(parent: HTMLElement, iconId: IconName): void {
  // The real one appends an inline SVG. A marker element is enough to prove the
  // call happened and to keep `el.empty()` meaningful.
  const svg = parent.ownerDocument.createElement('span')
  svg.dataset.icon = iconId
  parent.append(svg)
}

export const MarkdownRenderer = {
  /**
   * Renders nothing but the source text. Obsidian's real renderer produces its
   * whole markdown tree; reproducing any of that here would be testing a mock.
   */
  render(
    _app: unknown,
    markdown: string,
    el: HTMLElement,
    _sourcePath: string,
    _component: Component,
  ): Promise<void> {
    el.textContent = markdown
    return Promise.resolve()
  },
}

/** Desktop, so the spell window (MYDND-60) takes its popout path under test. */
export const Platform = { isDesktopApp: true, isMobile: false }

export function parseYaml(): unknown {
  throw new Error('parseYaml is not stubbed — tests inject the real `yaml` parser')
}

/**
 * Obsidian's toast. Recorded rather than shown, so a test can assert that a
 * page *said* something — "no Atlas scene is open" is a user-visible outcome
 * and the only evidence a roll went nowhere.
 *
 * `Notice.shown` is cleared by the setup file between tests.
 */
export class Notice {
  static shown: string[] = []

  constructor(message: string | DocumentFragment, _duration?: number) {
    Notice.shown.push(typeof message === 'string' ? message : (message.textContent ?? ''))
  }

  setMessage(message: string | DocumentFragment): this {
    Notice.shown.push(typeof message === 'string' ? message : (message.textContent ?? ''))
    return this
  }

  hide(): void {}
}

/**
 * `HTMLElement.empty()` and `createDiv()` are Obsidian's own additions to the
 * DOM prototype, not standard. Code under test calls them, so the harness has to
 * install them — in jsdom they are simply absent, and the failure is a
 * `TypeError` deep inside a component rather than anything legible.
 */
export function installObsidianDomExtensions(): void {
  const proto = globalThis.HTMLElement?.prototype as
    | (HTMLElement & { empty?: () => void; createDiv?: () => HTMLDivElement })
    | undefined
  if (!proto) return

  proto.empty ??= function empty(this: HTMLElement) {
    while (this.firstChild) this.removeChild(this.firstChild)
  }

  proto.createDiv ??= function createDiv(this: HTMLElement) {
    const div = this.ownerDocument.createElement('div')
    this.append(div)
    return div
  }
}
