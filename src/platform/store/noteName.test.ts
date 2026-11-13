import { describe, expect, it } from 'vitest'

import { noteName } from './note'

describe('noteName', () => {
  it('drops leading dots, which would make the note a hidden file', () => {
    expect(noteName('.Hollow')).toBe('Hollow')
    expect(noteName('. . The Keep')).toBe('The Keep')
  })

  it('keeps a dot inside the name', () => {
    expect(noteName('St. Lucian')).toBe('St. Lucian')
  })

  it('falls back to Untitled when only dots are left', () => {
    expect(noteName('...')).toBe('Untitled')
  })
})
