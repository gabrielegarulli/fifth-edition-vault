import { useCallback, useState } from 'react'
import { useLocation } from 'react-router-dom'

import {
  useElementWidth,
  useRouteLink,
  Icon,
  priorityFit,
  focusFirstButton,
  usePopup,
} from '../../platform/host'
import { ROW_ORDER } from '../../platform'

/** `gap-1`, the space `priorityFit` counts between two items. */
const GAP = 4

/**
 * The wide nav: one line, Characters first, and whatever does not fit under a
 * More button at its end (MYDND-122). It wrapped onto as many lines as the
 * pane needed before, which pushed every page down by a row or two.
 *
 * Each item's width is read off a hidden copy of the whole row, so the visible
 * row never has to be laid out and measured twice. The copy sits in a clipped,
 * invisible box behind it and is re-read when its own size changes, as it does
 * once a web font lands. Neither row's width depends on what it shows, so a
 * resize settles in one pass.
 *
 * Both builds draw it in a bar, between the name and the menu button: the web
 * build in `WebBar`, the plugin in `AppBar` (MYDND-131). `withHome={false}`
 * leaves Home out, because both bars' logos already go there.
 */
export function MainNav({ className = '', withHome = true }: { className?: string; withHome?: boolean }) {
  const order = withHome ? ROW_ORDER : ROW_ORDER.filter(d => d.path !== '/')
  const { pathname } = useLocation()
  const link = useRouteLink()
  const [rowRef, available] = useElementWidth<HTMLDivElement>()
  const [widths, setWidths] = useState<{ items: number[]; more: number } | null>(null)
  const { open, toggle, close, rootRef, triggerRef } = usePopup()

  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const read = () => {
      const all = [...el.children].map(c => c.getBoundingClientRect().width)
      setWidths({ items: all.slice(0, -1), more: all.at(-1) ?? 0 })
    }
    read()
    const observer = new ResizeObserver(read)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fitted = widths ? priorityFit(widths.items, widths.more, available, GAP) : order.length
  const shown = order.slice(0, fitted)
  const rest = order.slice(fitted)
  const menuOpen = open && rest.length > 0

  return (
    <nav aria-label="Pages" className={`relative flex min-w-0 items-center ${className}`}>
      <div ref={rowRef} data-nav-row="" className="flex min-w-0 flex-1 items-center gap-1">
        {shown.map(d => (
          <button
            key={d.path}
            type="button"
            {...link(d.path)}
            aria-current={pathname === d.path ? 'page' : undefined}
            className={`shrink-0 whitespace-nowrap ${pathname === d.path ? 'btn-ui-primary-active' : 'btn-ui-primary'}`}
          >
            {d.label}
          </button>
        ))}
        {rest.length > 0 && (
          <div ref={rootRef} className="relative shrink-0">
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={menuOpen}
              onClick={toggle}
              className={`flex items-center gap-1 whitespace-nowrap ${rest.some(d => d.path === pathname) ? 'btn-ui-primary-active' : 'btn-ui-primary'}`}
            >
              More
              <Icon name="chevron-down" className="flex" />
            </button>
            {menuOpen && (
              <div ref={focusFirstButton} role="group" aria-label="More sections" className="nav-more-menu">
                {rest.map(d => {
                  const { onClick, ...handlers } = link(d.path)
                  return (
                    <button
                      key={d.path}
                      type="button"
                      {...handlers}
                      onClick={evt => {
                        close()
                        onClick(evt)
                      }}
                      aria-current={pathname === d.path ? 'page' : undefined}
                      className={`menu-item ${pathname === d.path ? 'font-semibold' : ''}`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div aria-hidden="true" className="pointer-events-none invisible absolute inset-0 overflow-hidden">
        <div ref={measure} className="flex w-max gap-1">
          {order.map(d => (
            <span key={d.path} className="btn-ui-primary shrink-0 whitespace-nowrap">
              {d.label}
            </span>
          ))}
          <span className="btn-ui-primary flex shrink-0 items-center gap-1 whitespace-nowrap">
            More
            <Icon name="chevron-down" className="flex" />
          </span>
        </div>
      </div>
    </nav>
  )
}
