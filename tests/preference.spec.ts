// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { EditorPreference, preferredEditor } from '../src/client/preference.ts'
import type { EditorCatalog } from '../src/types.ts'

const catalog: EditorCatalog = {
  editors: [
    { id: 'vscode', label: 'Visual Studio Code', available: false },
    { id: 'cursor', label: 'Cursor', available: true },
  ],
  defaultEditorId: 'vscode',
}

describe('browser editor preference', () => {
  it('notifies consumers even when storage access is denied', () => {
    const storage = {
      getItem: vi.fn(() => { throw new Error('denied') }),
      setItem: vi.fn(() => { throw new Error('denied') }),
    } as unknown as Storage
    const preference = new EditorPreference(storage)
    const listener = vi.fn()
    preference.subscribe(listener)
    preference.select('cursor')
    expect(preference.getSnapshot()).toBe('cursor')
    expect(listener).toHaveBeenCalledOnce()
  })

  it('falls back to the first available editor when stored and Host defaults are unavailable', () => {
    expect(preferredEditor(catalog, 'missing')).toMatchObject({ id: 'cursor' })
  })
})
