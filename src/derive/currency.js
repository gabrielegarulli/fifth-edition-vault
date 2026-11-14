// @ts-check
// Character Gold lives in vault_state.currency as independent per-denomination
// counts: { pp, gp, sp, cp }. Legacy rows store a single vault_state.gold_cp
// total-copper integer instead; every reader must honor that fallback.

/** @typedef {{ pp: number, gp: number, sp: number, cp: number }} Currency */
/**
 * A character as these read it: per-denomination counts, or the legacy total.
 *
 * @typedef {{ vault_state?: { currency?: Partial<Currency> | null, gold_cp?: number | null } | null }} CurrencyHolder
 */

const EMPTY = { pp: 0, gp: 0, sp: 0, cp: 0 }

/**
 * @param {CurrencyHolder | null | undefined} char
 * @returns {Currency}
 */
export function charCurrency(char) {
  const cur = char?.vault_state?.currency
  if (cur && typeof cur === 'object') {
    return { pp: cur.pp ?? 0, gp: cur.gp ?? 0, sp: cur.sp ?? 0, cp: cur.cp ?? 0 }
  }
  const total = char?.vault_state?.gold_cp ?? 0
  return { pp: 0, gp: Math.floor(total / 100), sp: Math.floor((total % 100) / 10), cp: total % 10 }
}

/**
 * @param {Partial<Currency> | null | undefined} currency
 * @returns {number}
 */
export function currencyToCp(currency) {
  if (!currency) return 0
  return (currency.pp ?? 0) * 1000 + (currency.gp ?? 0) * 100 + (currency.sp ?? 0) * 10 + (currency.cp ?? 0)
}

/** @param {CurrencyHolder | null | undefined} char */
export function charGoldCp(char) {
  return currencyToCp(charCurrency(char))
}

/**
 * @param {readonly (CurrencyHolder | null | undefined)[] | null | undefined} chars
 * @returns {Currency}
 */
export function sumCurrencies(chars) {
  return (chars ?? []).reduce((acc, c) => {
    const cur = charCurrency(c)
    return { pp: acc.pp + cur.pp, gp: acc.gp + cur.gp, sp: acc.sp + cur.sp, cp: acc.cp + cur.cp }
  }, { ...EMPTY })
}

/**
 * @param {number | null | undefined} cp
 * @returns {string}
 */
export function formatCp(cp) {
  if (cp == null) return '—'
  const gp = Math.floor(cp / 100)
  const sp = Math.floor((cp % 100) / 10)
  const c = cp % 10
  const parts = []
  if (gp) parts.push(`${gp} gp`)
  if (sp) parts.push(`${sp} sp`)
  if (c) parts.push(`${c} cp`)
  return parts.length ? parts.join(' ') : '0 cp'
}
