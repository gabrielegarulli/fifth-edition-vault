import { useRef, useState, type ReactNode } from 'react'
import {
  CAMPAIGN_VALUE_PERCENT_MAX,
  CAMPAIGN_VALUE_PERCENT_MIN,
} from '@vault/derive/campaignPricing.js'
import { rarityValueCp } from '@vault/derive/magicItemValue.js'

import { copperLabel } from '../../compendium'
import { PLUGIN_TITLE } from '../../platform'
import { useActiveCampaign, useCampaigns, useElementWidth, usePlatform, Empty } from '../../platform/host'
import type { Campaign } from '../../platform'

/**
 * Settings — the campaign's own rules, and, in the full plugin, the harvest
 * log's one-off import (`harvesting/ui/HarvestLogSection`).
 *
 * Pulled forward out of Phase 5, with only its campaign section: a setting with
 * no way to change it is an abstraction, and this phase's whole claim is that
 * the three rules a campaign plays by are now real and readable. The GM pages
 * (`/gm/*`), the player surfaces and everything else `the-vault`'s
 * `SettingsPage` carries stay in Phase 5.
 *
 * ## The board (MYDND-97)
 *
 * The "Settings · campaign, rules, import" board of the all-sections canvas, on
 * `.bst` like every other page — which retires the `setting-item` classes this
 * page borrowed from Obsidian. A section list on the left; each section names
 * the file it writes to; the campaigns are a radio group of cards with the
 * create form as the last card; the rules show what each rarity is worth at the
 * campaign's percentage. The D&D Beyond settings are **not** drawn as controls
 * here: they are `data.json`'s, edited in Obsidian's settings tab, and this
 * section says so.
 */
export default function SettingsPage() {
  const [paneRef, width] = useElementWidth<HTMLDivElement>()
  const narrow = width > 0 && width < WIDE_WIDTH
  const [current, setCurrent] = useState<SectionId>('campaign')
  const scroller = useRef<HTMLElement | null>(null)

  // The page owns its scroller, so a jump is a `scrollTop` on it — never
  // `scrollIntoView`, which also scrolls whatever Obsidian has around the pane.
  const jump = (id: SectionId): void => {
    setCurrent(id)
    const box = scroller.current
    const target = box?.querySelector<HTMLElement>(`[data-section="${id}"]`)
    if (box && target) box.scrollTop = target.offsetTop - box.offsetTop - 16
  }

  return (
    <div ref={paneRef} className="bst">
      <header className={narrow ? 'bst-header bst-header--narrow' : 'bst-header'}>
        <h2 className="bst-title">Settings</h2>
        <span className="bst-note">Each section says which file it writes to</span>
      </header>
      <div className="bst-body">
        {!narrow && (
          <nav aria-label="Settings sections" className="bst-st-nav">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                type="button"
                aria-current={current === s.id ? 'true' : undefined}
                className="bst-plain bst-st-navitem"
                onClick={() => jump(s.id)}
              >
                <span className="bst-st-navlabel">{s.label}</span>
                <span className="bst-st-navsub">{s.sub}</span>
              </button>
            ))}
          </nav>
        )}
        <main
          ref={scroller}
          className={narrow ? 'my-dnd-vault__scroll bst-st-main bst-st-main--narrow' : 'my-dnd-vault__scroll bst-st-main'}
        >
          <CampaignSections narrow={narrow} />
          <DdbSection narrow={narrow} />
          {/* The harvest log is private (MYDND-200): guarded in place, so the SRD
              edition, which has no harvesting, drops the section and its import. */}
          {null}
        </main>
      </div>
    </div>
  )
}

type SectionId = 'campaign' | 'rules' | 'ddb' | 'import'

const SECTIONS: readonly { id: SectionId; label: string; sub: string }[] = [
  { id: 'campaign', label: 'Campaign', sub: 'Which one is open' },
  { id: 'rules', label: 'Rules', sub: 'What this campaign plays by' },
  { id: 'ddb', label: 'D&D Beyond', sub: 'Where imports land' },
  ...([]),
]

/** Below this the section list goes and the sections stack (the narrow board). */
const WIDE_WIDTH = 720

/** The rarities the price strip shows, at the campaign's percentage. */
const BANDS: readonly { rarity: string; label: string; tone: string }[] = [
  { rarity: 'uncommon', label: 'Uncommon', tone: 'uncommon' },
  { rarity: 'rare', label: 'Rare', tone: 'rare' },
  { rarity: 'very rare', label: 'Very rare', tone: 'veryrare' },
  { rarity: 'legendary', label: 'Legendary', tone: 'legendary' },
]

// --- campaigns -------------------------------------------------------------

function CampaignSections({ narrow }: { narrow: boolean }) {
  const { campaigns: campaignsStore, activeCampaignId, setActiveCampaignId } = usePlatform()
  const campaigns = useCampaigns()
  const active = useActiveCampaign()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  /**
   * An optimistic overlay, because a write and the re-read are not the same
   * tick.
   *
   * `vault.process` resolves when the file is written; Obsidian then re-indexes
   * asynchronously and `useVaultGeneration` debounces the event by 250ms. Reading
   * the campaign back immediately gives the *old* frontmatter, so a toggle
   * without this snaps back under the GM's finger for a quarter of a second.
   *
   * It clears by comparing `campaigns` **by identity** rather than in an effect:
   * `useCatalogRows` memoises the array per vault generation, so a new array
   * *is* the signal that the re-read has happened. That is the "adjust during
   * render" shape the `react-hooks/set-state-in-effect` rule asks for, and it
   * needs no dependency array to get right.
   */
  const [overlay, setOverlay] = useState<Overlay>(() => ({ rows: campaigns, patch: {}, added: [] }))
  const { patch, added } = overlay.rows === campaigns ? overlay : EMPTY_OVERLAY

  // A campaign just created is not in `campaigns` yet either, for the same
  // reason a toggle's new value is not — so it is carried here until the re-read
  // catches up, and dropped as soon as the list contains it.
  const shown = [...campaigns, ...added.filter(a => !campaigns.some(c => c.id === a.id))]
    .map(c => ({ ...c, ...patch[c.id] }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const resolved = active ?? (added.length === 1 ? added[0] : null)
  const activeShown = shown.find(c => c.id === activeCampaignId) ?? (resolved ? { ...resolved, ...patch[resolved.id] } : null)

  const run = async (campaign: Campaign, change: Partial<Campaign>, write: () => Promise<void>) => {
    setError(null)
    setOverlay({ ...overlay, rows: campaigns, patch: { ...patch, [campaign.id]: { ...patch[campaign.id], ...change } } })
    try {
      await write()
    } catch (cause) {
      // Roll the overlay back, so the control shows what the note says rather
      // than what the GM asked for. `parseNote` refuses a note whose
      // frontmatter it cannot read, which is the error that actually turns up.
      setOverlay({ rows: campaigns, patch: {}, added })
      setError(message(cause))
    }
  }

  const create = async () => {
    setError(null)
    try {
      const created = await campaignsStore.create(name)
      setName('')
      setOverlay({ rows: campaigns, patch, added: [...added, created] })
      // Selected straight away — creating a campaign is choosing it.
      setActiveCampaignId(created.id)
    } catch (cause) {
      setError(message(cause))
    }
  }

  return (
    <>
      <Section id="campaign" title="Campaign" file={`${campaignsStore.folder()}/*.md`} narrow={narrow}>
        {error && <Problem>{error}</Problem>}

        {shown.length === 0 ? (
          <Empty title="No campaigns yet">
            Everything campaign-scoped — the magic economy, the equipment system, crafting costs — needs one. Name it
            below and it becomes a note you can open.
          </Empty>
        ) : null}

        <div
          role="radiogroup"
          aria-label="Active campaign"
          className={narrow ? 'bst-st-campaigns bst-st-campaigns--narrow' : 'bst-st-campaigns'}
        >
          {shown.map(campaign => {
            const isActive = activeShown?.id === campaign.id
            return (
              <label key={campaign.id} className={isActive ? 'bst-st-campaign bst-st-campaign--on' : 'bst-st-campaign'}>
                <input
                  type="radio"
                  name="my-dnd-vault-campaign"
                  className="bst-st-radio"
                  checked={isActive}
                  onChange={() => setActiveCampaignId(campaign.id)}
                />
                <span className="bst-st-campaign-names">
                  <strong>{campaign.name}</strong>
                  <span className="bst-note">
                    {[
                      `magic at ${campaign.magicItemValuePercent}%`,
                      campaign.loadoutSystem ? 'loadout slots' : 'attunement',
                      campaign.quirkCosts ? 'quirk costs on' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                {isActive ? <span className="bst-st-current">Current</span> : null}
              </label>
            )
          })}
          <form
            className="bst-st-create"
            onSubmit={e => {
              e.preventDefault()
              if (name.trim() !== '') void create()
            }}
          >
            <input
              type="text"
              value={name}
              placeholder="New campaign name"
              aria-label="New campaign name"
              className="bst-input"
              onChange={e => setName(e.target.value)}
              spellCheck={false}
            />
            <button type="submit" className="bst-plain bst-btn-primary bst-btn-sm" disabled={name.trim() === ''}>
              Create
            </button>
          </form>
        </div>
        <span className="bst-note">
          A campaign is its note. Renaming the note in Obsidian renames the campaign; which one is <em>open</em> is this
          machine&rsquo;s choice, kept in the plugin&rsquo;s own data.
        </span>
      </Section>

      {/* The three rules. Hidden rather than disabled when there is no campaign:
          a switch that cannot be switched is an invitation to try. */}
      {activeShown && (
        <Section
          id="rules"
          title="Rules this campaign plays by"
          file={`${campaignsStore.folder()}/${activeShown.id}.md`}
          narrow={narrow}
        >
          <SettingRow
            name="Magic item prices"
            description="What this campaign's magic economy runs at, as a whole percentage of the book's prices. It scales the rarity bands, never a price written on an item by hand. The shop sells at twice what it pays."
          >
            <span className="bst-st-percent">
              <input
                type="number"
                min={CAMPAIGN_VALUE_PERCENT_MIN}
                max={CAMPAIGN_VALUE_PERCENT_MAX}
                step={5}
                value={activeShown.magicItemValuePercent}
                aria-label="Magic item value percent"
                className="bst-input bst-st-number"
                onChange={e => {
                  const next = Number(e.target.value)
                  if (!Number.isFinite(next)) return
                  void run(activeShown, { magicItemValuePercent: next }, () =>
                    campaignsStore.setMagicItemValuePercent(activeShown, next),
                  )
                }}
              />
              <span className="bst-mono">%</span>
            </span>
          </SettingRow>
          <div className="bst-st-bands">
            <span className="bst-note">{`At ${activeShown.magicItemValuePercent}%:`}</span>
            {BANDS.map(b => (
              <span key={b.rarity} className="bst-st-band">
                <span aria-hidden="true" className={`bst-dot bst-dot--sm bst-dot--r-${b.tone}`} />
                {b.label}
                <span className="bst-mono">
                  {copperLabel(rarityValueCp(b.rarity, activeShown.magicItemValuePercent)) ?? '—'}
                </span>
              </span>
            ))}
          </div>

          <SettingRow
            name="Loadout system"
            description="Thirteen equipment slots and a Bearing budget, in place of attunement to three items. Both systems' data is kept either way, so switching back is free."
          >
            <Switch
              label="Loadout system"
              checked={activeShown.loadoutSystem}
              onChange={next =>
                void run(activeShown, { loadoutSystem: next }, () => campaignsStore.setLoadoutSystem(activeShown, next))
              }
            />
          </SettingRow>

          {/* Prices crafted quirks, so the SRD edition, with no crafting, has no use for it (MYDND-129). */}
          {null}
        </Section>
      )}
    </>
  )
}

interface Overlay {
  /** The rows this overlay was built against. Identity is the reset signal. */
  rows: Campaign[]
  patch: Record<string, Partial<Campaign>>
  added: Campaign[]
}

const EMPTY_OVERLAY: Overlay = { rows: [], patch: {}, added: [] }

// --- D&D Beyond --------------------------------------------------------------

/**
 * The D&D Beyond import's settings are in `data.json`, and they are set in
 * Obsidian's own settings tab — the surface for that file. This section says
 * so rather than drawing a second set of controls over the same values: two
 * editors for one setting is how they come to disagree (MYDND-97).
 */
function DdbSection({ narrow }: { narrow: boolean }) {
  return (
    <Section id="ddb" title="D&D Beyond import" file="plugin data.json" narrow={narrow}>
      <div className="bst-st-pointer">
        <strong>Set in Obsidian&rsquo;s settings</strong>
        <span className="bst-note">
          Character folder, portrait folder, linking tokens to Atlas, downloading portraits and the relay server are this
          machine&rsquo;s, not the campaign&rsquo;s — so they live with the plugin, under Settings → Community plugins →
          {PLUGIN_TITLE}.
        </span>
      </div>
    </Section>
  )
}

// --- furniture -------------------------------------------------------------

function Section({
  id,
  title,
  file,
  narrow,
  children,
}: {
  id: SectionId
  title: string
  /** Which file the section writes to — the board's promise, said per section. */
  file: string
  narrow: boolean
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      data-section={id}
      className={narrow ? 'bst-st-section bst-st-section--narrow' : 'bst-st-section'}
    >
      <div className="bst-st-head">
        <h3 className="bst-st-title">{title}</h3>
        <span className="bst-mono bst-st-filechip">{file}</span>
      </div>
      {children}
    </section>
  )
}

function SettingRow({ name, description, children }: { name: string; description: ReactNode; children: ReactNode }) {
  return (
    <div className="bst-st-row">
      <span className="bst-st-row-text">
        <strong>{name}</strong>
        <span className="bst-note">{description}</span>
      </span>
      <span className="bst-st-row-control">{children}</span>
    </div>
  )
}

/** A checkbox drawn as the board's switch — still a checkbox to a test and to a screen reader. */
function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange(next: boolean): void }) {
  return (
    <input
      type="checkbox"
      role="switch"
      aria-label={label}
      checked={checked}
      className="bst-switch"
      onChange={e => onChange(e.target.checked)}
    />
  )
}

/**
 * A failed write, said out loud.
 *
 * `the-vault`'s rule is that a DB error is never swallowed and its context is
 * user-visible — "a phrase, not a code path". The same applies with more force
 * here: the failure is a note on the GM's own disk, and the fix is in Obsidian.
 */
function Problem({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="bst-st-problem">
      {children}
    </p>
  )
}

const message = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause))
