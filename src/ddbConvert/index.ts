// The ddbConvert domain's pure surface (MYDND-257): what other domains import from
// outside ui/. A D&D Beyond character from a saved file, and what its conversion
// found no note for. Nothing here reaches React, obsidian or a server. Rules:
// scripts/eslint-domain-order.mjs.

export { type DdbFile, readDdbFile, unwrapDdbEnvelope } from './model/file'
export {
  NEW_NOTE_CATALOG,
  type NewNote,
  newNoteKey,
  type NewNoteKind,
  type NoteOutcome,
  notesToCreate,
  withCreatedNotes,
} from './model/missing'
