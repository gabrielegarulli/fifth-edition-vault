/**
 * A stand-in for the `obsidian` module, for tests only.
 *
 * The real one has **no runtime entry** — it is `obsidian.d.ts` and nothing else,
 * because Obsidian injects the module at load time. So any file importing a
 * *value* from it is unloadable outside the app, which is why the readers
 * route every Obsidian call through one adapter (`platform/obsidian/source.ts`) and stays testable without this.
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
 * The three Obsidian classes the plugin subclasses for its own wiring: the
 * spell window (`ItemView`), the import and conflict dialogs (`Modal`), and
 * the two sheet fences (`MarkdownRenderChild`). A test never constructs one.
 * They are here because a domain's `host.ts` loads those files with the rest
 * of its surface (MYDND-201), and `class X extends undefined` throws the
 * moment the module is evaluated.
 */
export class MarkdownRenderChild extends Component {
  containerEl: HTMLElement
  constructor(containerEl: HTMLElement) {
    super()
    this.containerEl = containerEl
  }
}

export class ItemView extends Component {
  leaf: unknown
  constructor(leaf: unknown) {
    super()
    this.leaf = leaf
  }
}

export class Modal extends Component {
  /** Every modal opened, newest last (MYDND-215's What's new is asserted through it). */
  static opened: Modal[] = []
  app: unknown
  modalEl: HTMLElement = document.createElement('div')
  contentEl: HTMLElement = document.createElement('div')
  constructor(app: unknown) {
    super()
    this.app = app
    this.modalEl.append(this.contentEl)
  }
  onOpen(): void {}
  onClose(): void {}
  open(): void {
    Modal.opened.push(this)
    this.onOpen()
  }
  close(): void {
    Modal.opened = Modal.opened.filter(m => m !== this)
    this.onClose()
  }
}

/** The builder's portrait finder subclasses it (MYDND-216); a test injects its own picker instead. */
export class FuzzySuggestModal extends Modal {}

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
   *
   * **It writes late, as the real one does (MYDND-203).** The text lands on a
   * timer, never during the render that mounted `Markdown`. A test that reads
   * rendered prose without waiting for it (`getByText` where it needs
   * `findByText`) then fails every time, here, instead of passing locally and
   * failing CI at random, as MYDND-202's did. A 0 ms timer is enough: it broke
   * both of that card's synchronous reads in 5 runs out of 5, as 30 ms did,
   * and costs nothing measurable. `platform/ui/Markdown.test.tsx` holds it so.
   */
  render(
    _app: unknown,
    markdown: string,
    el: HTMLElement,
    _sourcePath: string,
    _component: Component,
  ): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        el.textContent = markdown
        resolve()
      }, 0)
    })
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
  /** Every notice made, for a test to click into (MYDND-215's update notice). Cleared with `shown`. */
  static made: Notice[] = []
  /** Holds the message, as Obsidian's does; never attached to the page. */
  containerEl: HTMLElement = document.createElement('div')
  hidden = false

  constructor(message: string | DocumentFragment, _duration?: number) {
    Notice.shown.push(typeof message === 'string' ? message : (message.textContent ?? ''))
    if (typeof message === 'string') this.containerEl.textContent = message
    else this.containerEl.append(message)
    Notice.made.push(this)
  }

  setMessage(message: string | DocumentFragment): this {
    Notice.shown.push(typeof message === 'string' ? message : (message.textContent ?? ''))
    return this
  }

  hide(): void {
    this.hidden = true
  }
}

/**
 * The plugin's own wiring: the plugin, its settings tab, the settings rows and
 * groups the tab and the dialogs build, the bar's menu, and `requestUrl`. A
 * test builds none of them; they are exported because every value `src/` imports from
 * `obsidian` must load here (MYDND-201, `src/obsidianStandIns.test.ts`).
 */
export class Plugin extends Component {}

export class PluginSettingTab {}

export class Setting {}

export class SettingGroup {}

export class Menu {}

export async function requestUrl(): Promise<never> {
  throw new Error('requestUrl: no network in a test')
}

/** The SRD edition's update check (MYDND-215). Every Obsidian a test pretends to be is new enough. */
export function requireApiVersion(): boolean {
  return true
}

export const Keymap = {
  isModEvent(): false {
    return false
  },
}

/** A vault file, by path. Only `instanceof` checks reach it in a test. */
export class TFile {
  path = ''
}

/** A vault folder. Only `instanceof` checks reach it in a test (MYDND-226). */
export class TFolder {
  path = ''
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '')
}

/**
 * `HTMLElement.empty()` and `createDiv()` are Obsidian's own additions to the
 * DOM prototype, not standard. Code under test calls them, so the harness has to
 * install them — in jsdom they are simply absent, and the failure is a
 * `TypeError` deep inside a component rather than anything legible.
 */
export function installObsidianDomExtensions(): void {
  type Info = { cls?: string; text?: string; attr?: Record<string, string>; href?: string; type?: string }
  // Its own shape, not `HTMLElement`'s: Obsidian's declarations already add
  // these to the DOM's types, with overloads a stand-in cannot match.
  type Extended = {
    empty?: (this: HTMLElement) => void
    createEl?: (this: Node & ParentNode, tag: string, o?: Info) => HTMLElement
    createDiv?: (this: Node & ParentNode, o?: Info) => HTMLElement
    createSpan?: (this: Node & ParentNode, o?: Info) => HTMLElement
    addClass?: (this: HTMLElement, ...cls: string[]) => void
  }
  const proto = globalThis.HTMLElement?.prototype as unknown as Extended | undefined
  if (!proto) return

  proto.empty ??= function empty(this: HTMLElement) {
    while (this.firstChild) this.removeChild(this.firstChild)
  }

  // `createEl` and its two shorthands, with the options the plugin passes
  // (MYDND-215's notice and What's new are drawn with them).
  const createEl = function createEl(this: Node & ParentNode, tag: string, o: Info = {}): HTMLElement {
    const el = (this.ownerDocument ?? document).createElement(tag)
    if (o.cls) el.className = o.cls
    if (o.text !== undefined) el.textContent = o.text
    if (o.href !== undefined) el.setAttribute('href', o.href)
    if (o.type !== undefined) el.setAttribute('type', o.type)
    for (const [k, v] of Object.entries(o.attr ?? {})) el.setAttribute(k, v)
    this.append(el)
    return el
  }
  proto.createEl ??= createEl
  proto.createDiv ??= function createDiv(this: Node & ParentNode, o?: Info) {
    return createEl.call(this, 'div', o)
  }
  proto.createSpan ??= function createSpan(this: Node & ParentNode, o?: Info) {
    return createEl.call(this, 'span', o)
  }
  proto.addClass ??= function addClass(this: HTMLElement, ...cls: string[]) {
    this.classList.add(...cls)
  }

  // A notice's message is a fragment built with the same helpers.
  const fragment = globalThis.DocumentFragment?.prototype as unknown as Extended | undefined
  if (fragment) {
    fragment.createEl ??= proto.createEl
    fragment.createDiv ??= proto.createDiv
    fragment.createSpan ??= proto.createSpan
  }
  const g = globalThis as { createFragment?: (cb?: (f: DocumentFragment) => void) => DocumentFragment }
  g.createFragment ??= cb => {
    const f = document.createDocumentFragment()
    cb?.(f)
    return f
  }
}
