import { useState } from 'react'

import { useRouteLink } from '../pane'
import { PLUGIN_TITLE } from '../routes'
import { Icon } from './Icon'
import { MainNav } from './MainNav'
import { focusFirstButton, usePopup } from './usePopup'
import { VaultMark } from './VaultMark'

/**
 * What the bar's menu can do about the web build (MYDND-131). The plugin
 * supplies it from its `WebSyncAccount`; a host without one — the page tests —
 * gets a bar with no menu button.
 *
 * `email` is read when the menu opens, never on a timer: it comes out of
 * `SecretStorage`, so reading it costs no request (ADR 0009).
 */
export interface AccountHost {
  /** The web sign-in's email, or `null`. */
  email(): string | null
  /** The Sync command: pull, push, then the conflicts window. */
  sync(): void
  /** Obsidian's settings tab, where the sign-in form lives. */
  openSettings(): void
  signOut(): void
}

/**
 * The plugin's bar (MYDND-131): the web build's (`web/WebBar.tsx`) brought into
 * the pane. The mark and the name are one link to Home, the nav sits between
 * them and the menu over `NARROW_NAV_WIDTH`, and the menu holds the plugin's
 * side of web sync — who is signed in, Sync, Settings, Sign out.
 *
 * It is not `WebBar`, and the two share only the mark. `WebBar` lives outside
 * `.my-dnd-vault`, is styled by `theme.css` and counts the change log, which
 * the plugin does not have. This one is inside the root, so its look is
 * `styles/index.css`'s `.app-bar` block, which copies `theme.css`'s numbers.
 *
 * `narrow` comes from the frame, which measures `<main>`: the bar spans the
 * same width, so the two agree on which side of the line they are.
 */
export function AppBar({ narrow, account }: { narrow: boolean; account?: AccountHost }) {
  const link = useRouteLink()
  const [email, setEmail] = useState<string | null>(null)
  const { open, toggle, close, rootRef, triggerRef } = usePopup()

  const onMenuButton = () => {
    // Read here rather than in an effect: a sign-in in the settings tab shows
    // the next time the menu opens.
    if (!open) setEmail(account?.email() ?? null)
    toggle()
  }

  const act = (run: () => void) => () => {
    close()
    run()
  }

  return (
    <header className="app-bar">
      <button type="button" className="app-bar__home" {...link('/')}>
        <VaultMark className="app-bar__mark" />
        <span className="app-bar__name">{PLUGIN_TITLE}</span>
      </button>
      <div className="app-bar__nav">{!narrow && <MainNav withHome={false} />}</div>

      {account && (
        <div ref={rootRef} className="app-bar__menu-slot">
          <button
            ref={triggerRef}
            type="button"
            className="app-bar__button"
            aria-expanded={open}
            aria-label="Web sync and account"
            onClick={onMenuButton}
          >
            <Icon name="cloud" className="app-bar__icon" />
          </button>

          {open && (
            <div ref={focusFirstButton} role="group" aria-label="Web sync and account" className="app-menu">
              <div className="app-menu__who">
                {email ? (
                  <>
                    <span>Signed in to the web as</span>
                    <span>{email}</span>
                  </>
                ) : (
                  <>
                    <span>Not signed in to the web</span>
                    <span>Sign in under Settings to sync.</span>
                  </>
                )}
              </div>
              <hr />
              {email && (
                <button type="button" className="app-menu__item" onClick={act(account.sync)}>
                  <Icon name="refresh-cw" className="app-bar__icon" />
                  Sync with the web
                </button>
              )}
              <button type="button" className="app-menu__item" onClick={act(account.openSettings)}>
                <Icon name="settings" className="app-bar__icon" />
                Settings
              </button>
              {email && (
                <>
                  <hr />
                  <button
                    type="button"
                    className="app-menu__item app-menu__item--danger"
                    onClick={act(account.signOut)}
                  >
                    <Icon name="log-out" className="app-bar__icon" />
                    Sign out
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  )
}
