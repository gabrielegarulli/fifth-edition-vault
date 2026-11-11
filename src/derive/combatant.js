// One combatant shape, shared by the Vault's encounter tracker and the Owlbear
// extension's initiative tracker.
//
// VAULT-4 asked whether a combatant is fundamentally a token, a character, or a
// third thing. It is the third thing, and the other two both fail on a case the
// apps already support:
//
//   * Not a token. A token belongs to one Owlbear scene and does not survive a
//     scene change, and plenty of combatants never have one — the Vault's
//     `AddCombatantBar` lets the GM type in a bare name.
//   * Not a character. Monsters are not characters, and neither are the ad-hoc
//     rows.
//
// So a combatant is its own row that *points at* whatever it happens to have:
// maybe a `characterId`, maybe a `monsterId`, maybe a `tokenId`, maybe none of
// them. Neither app loses a field it had before.
//
// Pure, like `initiative.js` next door: the rules live here, the storage and the
// subscription live in the apps.

export const COMBATANT_KINDS = ['pc', 'monster', 'other']

// The encounter's own shape. The Vault called the pointer `turnIndex` and the
// extension called it `activeIndex`; `turnIndex` wins because
// `initiative.js` — the pure rules both apps already share — speaks it.
export const EMPTY_ENCOUNTER = { combatants: [], turnIndex: 0, round: 1, started: false }

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toOptionalNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toId(value) {
  return value === null || value === undefined || value === '' ? null : String(value)
}

// Normalise anything either app builds — a party member, a bestiary row, a
// dragged token, a typed name — into the one shape.
//
// Every field is present on the result even when it is null, because this
// object is written to `campaign_encounter.combatants` as jsonb and read back by
// two apps: a key that is sometimes absent is a key both of them have to guard.
export function makeCombatant(input = {}) {
  const kind = COMBATANT_KINDS.includes(input.kind) ? input.kind : 'other'
  const maxHp = Math.max(0, toNumber(input.maxHp, 0))
  return {
    id: toId(input.id) ?? `c:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    name: String(input.name ?? '').trim() || 'Unnamed',
    kind,

    // What this combatant points at. All three are optional and independent —
    // a party member's token gets linked later, a monster may never have one.
    characterId: toId(input.characterId),
    monsterId: toId(input.monsterId),
    tokenId: toId(input.tokenId),

    initiative: toOptionalNumber(input.initiative),
    dexMod: toNumber(input.dexMod, 0),
    hp: Math.max(0, toNumber(input.hp, 0)),
    maxHp,
    tempHp: Math.max(0, toNumber(input.tempHp, 0)),
    ac: toOptionalNumber(input.ac),

    // The Vault carried `avatarUrl` (a portrait) and the extension carried
    // `tokenUrl` (the art on the map). One picture is all an initiative row
    // shows, so they collapse — and the token wins when both are known, because
    // what is on the table is what the order should look like.
    imageUrl: toId(input.tokenUrl) ?? toId(input.imageUrl) ?? toId(input.avatarUrl),
  }
}

// "Is this the same creature?" — the question both apps ask before adding.
//
// A token or a character is a *thing in the world*, so two rows pointing at one
// are a duplicate. A monster deliberately is not: four goblins off one bestiary
// row are four combatants, and deduplicating by `monsterId` would collapse the
// encounter to one of each.
export function combatantKey(combatant) {
  if (!combatant) return ''
  if (combatant.tokenId) return `token:${combatant.tokenId}`
  if (combatant.characterId) return `pc:${combatant.characterId}`
  return `id:${combatant.id}`
}

// Adding a list without creating duplicates, keeping the ones already there.
// The extension's context menu and the Vault's party chips both need this.
export function addCombatants(combatants, incoming) {
  const seen = new Set((combatants ?? []).map(combatantKey))
  const added = []
  for (const raw of incoming ?? []) {
    const combatant = makeCombatant(raw)
    const key = combatantKey(combatant)
    if (seen.has(key)) continue
    seen.add(key)
    added.push(combatant)
  }
  return added.length === 0 ? (combatants ?? []) : [...(combatants ?? []), ...added]
}

// How hurt something looks from across the table, without giving away the
// number. `unknown` is honest rather than a guess: an ad-hoc row and a token
// dragged in from the map both start with no maximum.
export function healthState(combatant) {
  const max = toNumber(combatant?.maxHp, 0)
  if (max <= 0) return 'unknown'
  const hp = toNumber(combatant?.hp, 0)
  if (hp <= 0) return 'down'
  if (hp * 2 <= max) return 'bloodied'
  if (hp < max) return 'hurt'
  return 'unharmed'
}

// The projection the players get.
//
// Exact hit points, AC and the initiative modifier are the GM's to give away, so
// a monster's are replaced by the coarse `health` above. A player character's
// are not secret — everyone at a real table calls their own hit points out — so
// those come through intact, and the players' own rows stay useful.
//
// This is a *display* choice, not a security boundary. There is no Supabase
// Auth here, so RLS cannot tell a GM from a player and the whole row is
// readable by anyone with the key. Nothing that must stay hidden belongs in an
// encounter, the same way it does not belong in a `campaign_note`.
export function publicCombatant(combatant) {
  const c = makeCombatant(combatant)
  const shared = {
    id: c.id,
    name: c.name,
    kind: c.kind,
    initiative: c.initiative,
    imageUrl: c.imageUrl,
    health: healthState(c),
  }
  if (c.kind !== 'pc') return shared
  return { ...shared, hp: c.hp, maxHp: c.maxHp, tempHp: c.tempHp, ac: c.ac }
}
