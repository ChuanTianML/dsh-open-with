/**
 * Wire-contract invariants: exactly three strict endpoints, one descriptor set
 * shared verbatim by the Host manifest and the client contribution, and
 * boundary codecs that parse and reject their values.
 */
import { describe, expect, it } from 'vitest'
import {
  OPEN_WITH_INVOCATIONS,
  editorCatalogSchema,
  editorIdSchema,
  openResultSchema,
  workspaceIdSchema,
} from '../src/contract.ts'
import { OPEN_WITH_REMOTE } from '../src/client/remote.ts'
import { TYPERT_MANIFEST } from '../src/typert.ts'

describe('the openWith wire contract', () => {
  it('declares the three strict endpoints shared by host and client', () => {
    expect(OPEN_WITH_INVOCATIONS).toHaveLength(3)
    const [list, open, refresh] = OPEN_WITH_INVOCATIONS
    expect(list).toMatchObject({
      id: 'dsh-open-with#openWith/list',
      method: 'list',
      parameters: [],
      result: { mode: 'strict', typeSymbol: 'dsh-open-with#EditorCatalog' },
    })
    expect(open).toMatchObject({
      id: 'dsh-open-with#openWith/open',
      service: 'openWith',
      namespace: 'openWith',
      method: 'open',
      invocation: { kind: 'direct' },
      cancellation: { parameter: 'signal' },
    })
    expect(open.parameters).toEqual([
      expect.objectContaining({ name: 'workspaceId', wire: 'workspaceId', source: 'json' }),
      expect.objectContaining({ name: 'editorId', wire: 'editorId', source: 'json' }),
    ])
    expect(open.result).toMatchObject({ mode: 'strict', typeSymbol: 'dsh-open-with#OpenResult' })
    expect(refresh).toMatchObject({
      id: 'dsh-open-with#openWith/refresh',
      service: 'openWith',
      namespace: 'openWith',
      method: 'refresh',
      parameters: [],
      result: { mode: 'strict', typeSymbol: 'dsh-open-with#EditorCatalog' },
    })
    // One source pins the wire: the manifest and the client contribution
    // reference the same descriptor array, never a copy.
    expect(TYPERT_MANIFEST.invocations).toBe(OPEN_WITH_INVOCATIONS)
    expect(OPEN_WITH_REMOTE.descriptors).toBe(OPEN_WITH_INVOCATIONS)
    expect(TYPERT_MANIFEST.package).toBe('dsh-open-with')
    expect(OPEN_WITH_REMOTE.package).toBe('dsh-open-with')
  })

  it('codecs parse and reject their boundary values', () => {
    expect(workspaceIdSchema.parse('workspace-1')).toBe('workspace-1')
    expect(editorIdSchema.parse('cursor')).toBe('cursor')
    expect(() => workspaceIdSchema.parse('')).toThrow()
    expect(() => editorIdSchema.parse('')).toThrow()
    expect(editorCatalogSchema.parse({
      editors: [{ id: 'cursor', label: 'Cursor', available: true }],
      defaultEditorId: 'cursor',
    })).toMatchObject({ defaultEditorId: 'cursor' })
    expect(() => editorCatalogSchema.parse({ editors: [], defaultEditorId: '' })).toThrow()
    expect(openResultSchema.parse({ opened: true })).toEqual({ opened: true })
    expect(() => openResultSchema.parse({ opened: false })).toThrow()
    const open = OPEN_WITH_INVOCATIONS[1]!
    expect(open.parameters[0]!.codec).toMatchObject({ mode: 'strict', typeSymbol: 'dsh-open-with#WorkspaceId' })
    expect(open.parameters[1]!.codec).toMatchObject({ mode: 'strict', typeSymbol: 'dsh-open-with#EditorId' })
    expect(open.result).toMatchObject({ mode: 'strict' })
  })
})
