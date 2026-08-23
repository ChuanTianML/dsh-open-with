/**
 * The open-with wire contract, shared verbatim by the host manifest
 * (`ctx.typert.register` in typert.ts) and the client contribution
 * (`ctx.remote.$mount` in client/remote.ts). The list endpoint publishes safe
 * editor metadata; refresh returns a newly detected safe catalog; the open
 * endpoint accepts only a registered Workspace id and an editor id from that
 * catalog.
 */
import { z } from 'zod'
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol'

/** Wire codec: a stable Host Workspace id. */
export const workspaceIdSchema = z.string().min(1)

/** Wire codec: an editor id from the Host-published catalog. */
export const editorIdSchema = z.string().min(1)

/** Wire codec: one browser-safe editor view. */
export const editorViewSchema = z.object({
  id: editorIdSchema,
  label: z.string().min(1),
  available: z.boolean(),
  hint: z.string().optional(),
}).readonly()

/** Wire codec: the Host editor catalog. */
export const editorCatalogSchema = z.object({
  editors: z.array(editorViewSchema),
  defaultEditorId: editorIdSchema,
}).readonly()

/** Wire codec: the open result — the editor launch was accepted. */
export const openResultSchema = z.object({ opened: z.literal(true) }).readonly()

/** The openWith Remote namespace's strict invocation descriptors. */
export const OPEN_WITH_INVOCATIONS: readonly InvocationDescriptor[] = [
  {
    id: 'dsh-open-with#openWith/list',
    service: 'openWith',
    namespace: 'openWith',
    method: 'list',
    invocation: { kind: 'direct' },
    parameters: [],
    result: {
      mode: 'strict',
      typeSymbol: 'dsh-open-with#EditorCatalog',
      schema: editorCatalogSchema,
    },
  },
  {
    id: 'dsh-open-with#openWith/open',
    service: 'openWith',
    namespace: 'openWith',
    method: 'open',
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'workspaceId',
        wire: 'workspaceId',
        source: 'json',
        codec: { mode: 'strict', typeSymbol: 'dsh-open-with#WorkspaceId', schema: workspaceIdSchema },
      },
      {
        name: 'editorId',
        wire: 'editorId',
        source: 'json',
        codec: { mode: 'strict', typeSymbol: 'dsh-open-with#EditorId', schema: editorIdSchema },
      },
    ],
    cancellation: { parameter: 'signal' },
    result: {
      mode: 'strict',
      typeSymbol: 'dsh-open-with#OpenResult',
      schema: openResultSchema,
    },
  },
  {
    id: 'dsh-open-with#openWith/refresh',
    service: 'openWith',
    namespace: 'openWith',
    method: 'refresh',
    invocation: { kind: 'direct' },
    parameters: [],
    result: {
      mode: 'strict',
      typeSymbol: 'dsh-open-with#EditorCatalog',
      schema: editorCatalogSchema,
    },
  },
]
