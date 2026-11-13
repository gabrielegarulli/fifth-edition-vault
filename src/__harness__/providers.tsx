import { useState, type ComponentProps } from 'react'
import { parse } from 'yaml'

import { createContent } from '../app/model/content'
import type { VaultSource } from '../platform/model/source'
import { DomainProviders } from '../app/ui/context'
import { MemoryVault } from '../platform/store/__fixtures__/memoryVault'
import { createState } from '../app/model/state'

/**
 * Every domain's provider, as the view mounts them, for a `*.test.tsx`
 * (MYDND-199).
 *
 * The one place a test reaches the provider tree, so a domain that gains a
 * provider is added here once rather than in every suite's `mount`. It is
 * `DomainProviders` itself — the component the view, the ` ```vault-sheet `
 * fence and the web build mount — with the harness's defaults filled in:
 *
 * - **An empty vault** on whichever side a suite does not care about: a roll
 *   test needs no readers. A suite with no writers at all mounts
 *   `CompendiumProvider` alone, as the spell window does.
 * - **No active campaign**, and a persist callback that drops the choice.
 * - **Every injected action absent**, so each refuses rather than pretending
 *   to succeed (`CharactersProvider`'s defaults): a test that presses Import
 *   without passing one sees a failure, not a false pass.
 *
 * `ObsidianProvider`, `RollProvider` and the router stay in each suite's own
 * `mount`, because which of them a page needs is part of what it tests.
 */
/**
 * A vault with no notes in it. Not `FixtureVault({})`: the fixture is copied
 * from real notes and names their books, and the SRD export copies this
 * harness into the public repository (it refuses a file that names one).
 */
const NO_NOTES: VaultSource = {
  notesIn: () => [],
  allNotes: () => [],
  readBody: () => Promise.resolve(''),
}

export function TestProviders({
  content,
  state,
  initialCampaignId = null,
  onCampaignChange = () => {},
  ...rest
}: Omit<ComponentProps<typeof DomainProviders>, 'content' | 'state' | 'initialCampaignId' | 'onCampaignChange'> &
  Partial<Pick<ComponentProps<typeof DomainProviders>, 'content' | 'state' | 'initialCampaignId' | 'onCampaignChange'>>) {
  // Built once per mount, never per render: every provider's value — and the
  // effects keyed on a store, `useRoster`'s among them — would change on each
  // render otherwise, and an effect that sets state would loop.
  const [empty] = useState(() => ({
    content: createContent(NO_NOTES, parse),
    state: createState(new MemoryVault()),
  }))
  return (
    <DomainProviders
      content={content ?? empty.content}
      state={state ?? empty.state}
      initialCampaignId={initialCampaignId}
      onCampaignChange={onCampaignChange}
      {...rest}
    />
  )
}
