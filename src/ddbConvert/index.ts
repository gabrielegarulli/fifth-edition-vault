// The ddbConvert domain's pure surface (MYDND-257): what other domains import from
// outside ui/. A D&D Beyond character from a saved file or its link, and what
// its conversion found no note for. Nothing here reaches React or obsidian; the
// fetch reaches D&D Beyond only through the injected client (MYDND-295). Rules:
// scripts/eslint-domain-order.mjs.

export {
  DDB_CHARACTER_SERVICE,
  DdbBlockedError,
  describeDdbStatus,
  extractDdbId,
  fetchDdbDirect,
  fetchDdbPayload,
  isLocallyBlocked,
  messageOf,
} from './model/fetch'
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
