import { describe, expect, it, vi } from 'vitest'
import { EditorCatalogController } from '../src/client/catalog.ts'
import type { EditorCatalog } from '../src/types.ts'

const initial: EditorCatalog = {
  editors: [{ id: 'vscode', label: 'Visual Studio Code', available: true }],
  defaultEditorId: 'vscode',
}
const refreshed: EditorCatalog = {
  editors: [{ id: 'cursor', label: 'Cursor', available: true }],
  defaultEditorId: 'cursor',
}

describe('shared browser editor catalog', () => {
  it('coalesces initial loads and notifies every consumer on refresh', async () => {
    const list = vi.fn(async () => initial)
    const refresh = vi.fn(async () => refreshed)
    const controller = new EditorCatalogController({ list, refresh })
    const first = vi.fn()
    const second = vi.fn()
    controller.subscribe(first)
    controller.subscribe(second)

    await Promise.all([controller.load(), controller.load()])
    expect(list).toHaveBeenCalledOnce()
    expect(controller.getSnapshot()).toEqual({ catalog: initial, loading: false })

    await controller.refresh()
    expect(refresh).toHaveBeenCalledOnce()
    expect(controller.getSnapshot()).toEqual({ catalog: refreshed, loading: false })
    expect(first).toHaveBeenCalled()
    expect(second).toHaveBeenCalled()
  })

  it('preserves the last usable catalog when refresh fails', async () => {
    const controller = new EditorCatalogController({
      list: async () => initial,
      refresh: async () => { throw new Error('registry unavailable') },
    })
    await controller.load()
    await expect(controller.refresh()).rejects.toThrow(/registry unavailable/u)
    expect(controller.getSnapshot()).toEqual({ catalog: initial, loading: false })
  })
})
