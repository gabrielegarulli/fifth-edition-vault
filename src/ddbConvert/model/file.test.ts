import { describe, expect, it } from 'vitest'

import { readDdbFile, unwrapDdbEnvelope } from './file'

const character = { name: 'Gibbs', id: 147438576, classes: [{ level: 3, definition: { name: 'Wizard' } }] }

describe('unwrapDdbEnvelope', () => {
  it('takes the character out of the {id, success, data} envelope', () => {
    expect(unwrapDdbEnvelope({ success: true, data: character }, 'D&D Beyond')).toEqual(character)
  })

  it('accepts a bare character', () => {
    expect(unwrapDdbEnvelope(character, 'D&D Beyond')).toEqual(character)
  })

  it('throws, naming the route, when there is no character in it', () => {
    expect(() => unwrapDdbEnvelope({ data: {} }, 'The relay')).toThrow(/The relay/)
    expect(() => unwrapDdbEnvelope(null, 'D&D Beyond')).toThrow(/D&D Beyond/)
  })
})

/** A saved file (MYDND-257): the service's answer as the browser keeps it. */
describe('readDdbFile', () => {
  it('reads the enveloped file the character service answers', () => {
    const file = readDdbFile(JSON.stringify({ id: 147438576, success: true, message: 'ok', data: character }))
    expect(file).toEqual({ payload: character, ddbId: '147438576' })
  })

  it('reads a bare character, and a byte-order mark in front of it', () => {
    expect(readDdbFile(String.fromCharCode(0xfeff) + JSON.stringify(character)).ddbId).toBe('147438576')
  })

  it('takes a string id as long as it is digits', () => {
    expect(readDdbFile(JSON.stringify({ ...character, id: '42' })).ddbId).toBe('42')
    expect(() => readDdbFile(JSON.stringify({ ...character, id: 'local:abc' }))).toThrow(/no D&D Beyond id/)
  })

  it('refuses what is not JSON, saying so', () => {
    expect(() => readDdbFile('<!doctype html><html>')).toThrow(/not JSON/)
  })

  it('refuses JSON that is not a character', () => {
    expect(() => readDdbFile('[]')).toThrow(/no character in it/)
    expect(() => readDdbFile(JSON.stringify({ name: 'Gibbs' }))).toThrow(/no D&D Beyond id/)
    expect(() => readDdbFile(JSON.stringify({ ...character, classes: [] }))).toThrow(/Gibbs, has no class/)
  })
})
