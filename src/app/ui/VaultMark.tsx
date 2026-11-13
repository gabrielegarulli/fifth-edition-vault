/**
 * The project's mark (MYDND-122): a d20 seen from above with a keyhole on its
 * face — the dice and the vault. `web/public/favicon.svg` is its 16px cut,
 * which drops the facet lines that blur at that size.
 *
 * Here rather than in `web/` since MYDND-131, so the plugin's bar and the web
 * build's draw the same one. Its colours are literal on purpose: it is a logo,
 * not part of the theme.
 */
export function VaultMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#6f42e0" />
      <g fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
        <path d="M16 5 25.5 10.5V21.5L16 27 6.5 21.5V10.5Z" />
        <path d="M6.5 10.5H25.5M16 10 6.5 10.5M16 10 25.5 10.5M21 19 25.5 10.5M21 19 25.5 21.5M21 19 16 27M11 19 6.5 10.5M11 19 6.5 21.5M11 19 16 27" />
      </g>
      <circle cx="16" cy="14.8" r="2.2" fill="#fff" />
      <path d="M14.9 16.2h2.2l.7 2.9h-3.6z" fill="#fff" />
    </svg>
  )
}
