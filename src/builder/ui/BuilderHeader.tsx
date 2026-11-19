import { useId, useState } from 'react'

import type { Step, StepKey } from '../../choices'
import { ErrorIcon, Message, WarningIcon } from '../../choices/host'
import { resourceUrl, useObsidian } from '../../platform/host'

/** How a tab reads: the worse of its messages, ✓ with none, its number on Review. */
export type TabState = 'error' | 'warning' | 'done' | 'plain'

export interface TabInfo {
  step: Step
  state: TabState
}

const TAB_STATE_NAME: Record<TabState, string> = {
  error: ', error: needed to save',
  warning: ', warning: choices still open',
  done: ', done',
  plain: '',
}

/**
 * The builder's sticky header (MYDND-216), outside the page's scroller so it
 * never scrolls away (invariant 5), in two bands:
 *
 * - **the step tabs**, full width on their own band, centred, and scrolling
 *   sideways only when the pane is too narrow for them;
 * - **the name row**, on the page's background in the same 600px column as the
 *   step below it: the portrait and the name, with ‹ › outside the column.
 *
 * The tabs are a list of plain buttons, the current one `aria-current="step"`,
 * not ARIA tabs: `role="tab"` promises arrow keys and a tabpanel (frame.md,
 * MYDND-166).
 */
export function BuilderHeader({
  title,
  tabs,
  current,
  onStep,
  name,
  onName,
  nameMissing,
  portrait,
  pickPortrait,
  onPortrait,
}: {
  /** The page's heading, for assistive tech: "New character", "Edit Brakka". */
  title: string
  tabs: readonly TabInfo[]
  current: StepKey
  onStep: (key: StepKey) => void
  name: string
  onName: (name: string) => void
  nameMissing: boolean
  portrait: string | null
  /** The host's image picker; `null` where none can open (the web build). */
  pickPortrait: (() => Promise<string | null>) | null
  onPortrait: (path: string | null) => void
}) {
  const nameId = useId()
  const panelId = useId()
  const [portraitOpen, setPortraitOpen] = useState(false)
  const index = Math.max(0, tabs.findIndex(t => t.step.key === current))
  const prev = tabs[index - 1]?.step ?? null
  const next = tabs[index + 1]?.step ?? null

  return (
    <header className="bst-cb-hdr">
      <h2 className="bst-cb-sr">{title}</h2>
      <div className="bst-cb-tabbar">
        <nav aria-label="Builder steps">
          <ol className="bst-cb-tabs">
            {tabs.map(({ step, state }, i) => (
              <li key={step.key}>
                <button
                  type="button"
                  aria-current={step.key === current ? 'step' : undefined}
                  aria-label={`${i + 1}. ${step.label}${TAB_STATE_NAME[state]}`}
                  className={`bst-plain bst-cb-tab bst-cb-tab--${state}${step.key === current ? ' bst-cb-tab--current' : ''}`}
                  onClick={() => onStep(step.key)}
                >
                  {state === 'error' ? (
                    <ErrorIcon className="bst-cb-tab-ic" />
                  ) : state === 'warning' ? (
                    <WarningIcon className="bst-cb-tab-ic" />
                  ) : (
                    <span aria-hidden="true" className="bst-cb-tab-n">
                      {state === 'done' ? '✓' : i + 1}
                    </span>
                  )}
                  <span aria-hidden="true">{step.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <div className="bst-cb-id">
        <button
          type="button"
          aria-label={prev ? `Back to ${prev.label}` : 'Back'}
          disabled={!prev}
          className="bst-plain bst-cb-arrow bst-cb-arrow--prev"
          onClick={() => prev && onStep(prev.key)}
        >
          <Chevron d="M15 18l-6-6 6-6" />
        </button>
        <div className="bst-cb-id-mid">
          <div className="bst-cb-id-row">
            <Portrait
              path={portrait}
              initial={name.trim().charAt(0).toUpperCase()}
              tall={nameMissing}
              offered={pickPortrait !== null}
              open={portraitOpen}
              panelId={panelId}
              onToggle={() => setPortraitOpen(o => !o)}
            />
            <div className="bst-cb-namebox">
              <label className="bst-cb-label" htmlFor={nameId}>
                Character name
              </label>
              <input
                id={nameId}
                type="text"
                autoComplete="off"
                value={name}
                onChange={e => onName(e.target.value)}
                placeholder="e.g. Mira Thornwood"
                aria-invalid={nameMissing || undefined}
                aria-describedby={nameMissing ? `${nameId}-err` : undefined}
                className={nameMissing ? 'bst-input bst-input--err' : 'bst-input'}
                data-builder-name=""
              />
              {nameMissing ? (
                <Message kind="error" id={`${nameId}-err`}>
                  Name the character. It can&apos;t be saved without one.
                </Message>
              ) : null}
            </div>
          </div>
          {portraitOpen && pickPortrait ? (
            <PortraitPanel
              id={panelId}
              path={portrait}
              pick={pickPortrait}
              onChange={onPortrait}
              onClose={() => setPortraitOpen(false)}
            />
          ) : null}
        </div>
        <button
          type="button"
          aria-label={next ? `Next: ${next.label}` : 'Next'}
          disabled={!next}
          className="bst-plain bst-cb-arrow bst-cb-arrow--next"
          onClick={() => next && onStep(next.key)}
        >
          <Chevron d="M9 18l6-6-6-6" />
        </button>
      </div>
    </header>
  )
}

function Chevron({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

/**
 * The portrait tile: 64px square, 90px while the name's error shows so it
 * matches the name block's height, always 1:1. Empty, an image icon with a +.
 *
 * Pressing it opens a small panel under the name row rather than the picker at
 * once, so Remove has somewhere to live and the tile says what it does before
 * it does it. **Nothing is written here**: the path goes into the draft (ADR 0007).
 */
function Portrait({
  path,
  initial,
  tall,
  offered,
  open,
  panelId,
  onToggle,
}: {
  path: string | null
  initial: string
  tall: boolean
  /** Whether a picker can open; the web build shows the portrait without offering it. */
  offered: boolean
  open: boolean
  panelId: string
  onToggle: () => void
}) {
  const app = useObsidian()
  const url = resourceUrl(app, path)
  const cls = `bst-cb-portrait${tall ? ' bst-cb-portrait--tall' : ''}${path ? ' bst-cb-portrait--set' : ''}`
  const face = url ? (
    <img src={url} alt="" className="bst-cb-portrait-img" />
  ) : path ? (
    <span aria-hidden="true" className="bst-cb-portrait-ini">
      {initial || '?'}
    </span>
  ) : (
    <ImageIcon />
  )

  if (!offered) {
    return (
      <span role="img" aria-label={path ? 'Portrait' : 'No portrait'} className={cls}>
        {face}
      </span>
    )
  }
  return (
    <button
      type="button"
      aria-label={path ? 'Change the portrait' : 'Add a portrait'}
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      className={`bst-plain ${cls}`}
      onClick={onToggle}
    >
      {face}
      <span aria-hidden="true" className="bst-cb-portrait-plus">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
    </button>
  )
}

function PortraitPanel({
  id,
  path,
  pick,
  onChange,
  onClose,
}: {
  id: string
  path: string | null
  pick: () => Promise<string | null>
  onChange: (path: string | null) => void
  onClose: () => void
}) {
  return (
    <div id={id} role="group" aria-label="Portrait" className="bst-cb-portrait-pop">
      <p>
        Pick an image from the character folder or the portraits folder. It is written to the note&apos;s{' '}
        <code>portrait</code> on Save. Nothing is uploaded.
      </p>
      <button
        type="button"
        className="bst-plain bst-btn-secondary"
        onClick={() => {
          void pick().then(picked => {
            if (picked) onChange(picked)
            onClose()
          })
        }}
      >
        Choose image…
      </button>
      {path ? (
        <button
          type="button"
          className="bst-plain bst-cb-link"
          onClick={() => {
            onChange(null)
            onClose()
          }}
        >
          Remove
        </button>
      ) : null}
    </div>
  )
}

function ImageIcon() {
  return (
    <svg className="bst-cb-portrait-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="8.5" cy="8.5" r="1.75" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}
