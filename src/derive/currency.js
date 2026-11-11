// Character Gold lives in vault_state.currency as independent per-denomination
// counts: { pp, gp, sp, cp }. Legacy rows store a single vault_state.gold_cp
// total-copper integer instead; every reader must honor that fallback.

const EMPTY = { pp: 0, gp: 0, sp: 0, cp: 0 }

export function charCurrency(char) {
  const cur = char?.vault_state?.currency
  if (cur && typeof cur === 'object') {
    return { pp: cur.pp ?? 0, gp: cur.gp ?? 0, sp: cur.sp ?? 0, cp: cur.cp ?? 0 }
  }
  const total = char?.vault_state?.gold_cp ?? 0
  return { pp: 0, gp: Math.floor(total / 100), sp: Math.floor((total % 100) / 10), cp: total % 10 }
}

export function currencyToCp(currency) {
  if (!currency) return 0
  return (currency.pp ?? 0) * 1000 + (currency.gp ?? 0) * 100 + (currency.sp ?? 0) * 10 + (currency.cp ?? 0)
}

export function charGoldCp(char) {
  return currencyToCp(charCurrency(char))
}

export function sumCurrencies(chars) {
  return (chars ?? []).reduce((acc, c) => {
    const cur = charCurrency(c)
    return { pp: acc.pp + cur.pp, gp: acc.gp + cur.gp, sp: acc.sp + cur.sp, cp: acc.cp + cur.cp }
  }, { ...EMPTY })
}

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
