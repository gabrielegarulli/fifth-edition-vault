import type { App } from 'obsidian'

import { PLUGIN_TITLE } from '../../platform'
import { VAULT_SHEET_TEMPLATE_ID } from '../store/atlasMirror'
import { SHEET_FENCE } from './sheetFenceName'

/**
 * Atlas VTT's folder for new templates (`atlas-vtt`'s `TEMPLATE_FOLDER`). Its
 * library reads `.atlastemplate` files anywhere in the vault; this is where its
 * own editor puts them, so a GM finds ours beside theirs.
 */
export const ATLAS_TEMPLATE_FOLDER = 'atlas-vtt/statblock-templates'
// Named after the edition: the SRD build may not carry this plugin's name (check-srd-bundle).
export const ATLAS_TEMPLATE_PATH = `${ATLAS_TEMPLATE_FOLDER}/${PLUGIN_TITLE} character.atlastemplate`

/**
 * The template whose whole body is our ` ```vault-sheet ` fence (MYDND-191).
 *
 * The header keeps Atlas's name, token art, class line and hit points — what
 * a hover card shows before it is opened — and `maxColumns: 1` gives the one
 * text block the card's full width (666px of a 700px card, where the sheet
 * draws its wide layout; Atlas's default 22em column left it 325px).
 */
export function vaultSheetTemplate(): string {
  const template = {
    format: 'atlas-statblock-template',
    version: 1,
    id: VAULT_SHEET_TEMPLATE_ID,
    description:
      `${PLUGIN_TITLE}'s character sheet, drawn by the plugin inside the card: hit points, slots, uses and rests write to the note as on the plugin's own sheet.`,
    suits: ['Player character'],
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'image', label: 'Token art', type: 'image' },
      { key: 'class', label: 'Class', type: 'text', meaning: 'creature-type' },
      { key: 'hp', label: 'HP', type: 'number', meaning: 'hit-points' },
    ],
    // Atlas's own HP line would sit right above our hit-point panel. The
    // `hp` field stays, so a token still links its hit points.
    header: { hidden: ['level', 'hp', 'description'] },
    layout: {
      maxColumns: 1,
      blocks: [{ type: 'text', text: '```' + SHEET_FENCE + '\n```' }],
    },
  }
  return JSON.stringify(template, null, 2) + '\n'
}

/**
 * Writes the template into the vault, through the vault API so Atlas's
 * library hears the change. Only ever from the settings tab's button: nothing
 * on load writes to a GM's vault.
 */
export async function installVaultSheetTemplate(app: App): Promise<'created' | 'updated' | 'unchanged'> {
  const text = vaultSheetTemplate()
  // One level at a time: a vault without Atlas's data folder has neither.
  let folder = ''
  for (const part of ATLAS_TEMPLATE_FOLDER.split('/')) {
    folder = folder ? `${folder}/${part}` : part
    if (!app.vault.getFolderByPath(folder)) await app.vault.createFolder(folder)
  }
  const existing = app.vault.getFileByPath(ATLAS_TEMPLATE_PATH)
  if (!existing) {
    await app.vault.create(ATLAS_TEMPLATE_PATH, text)
    return 'created'
  }
  if ((await app.vault.read(existing)) === text) return 'unchanged'
  await app.vault.modify(existing, text)
  return 'updated'
}
