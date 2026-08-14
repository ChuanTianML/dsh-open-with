/**
 * The client-side Typert Remote contribution for the dsh-open-with host
 * service: mounts the shared strict descriptors into `ctx.remote.openWith`.
 * The descriptors and codecs come from the shared contract module, so the
 * browser bundle and the host manifest stay on one wire definition.
 */
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import { OPEN_WITH_INVOCATIONS } from '../contract.ts'
import type { EditorCatalog } from '../types.ts'

/** The openWith Remote namespace's client contribution. */
export const OPEN_WITH_REMOTE: TypertRemoteContribution = {
  package: 'dsh-open-with',
  descriptors: OPEN_WITH_INVOCATIONS,
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  // Typed face of the mounted namespace. Note: the runtime access is NOT the
  // dotted `ctx.remote.openWith` read — that path walks the cordis fiber
  // chain and stops at the Loader's runtime-less internal forks between a
  // plugin entry and the root fiber. The plugin resolves the namespace
  // service through `ctx.reflect.get('remote.openWith')` instead (see
  // client/index.ts).
  /** The `openWith` namespace face mounted under `ctx.remote.openWith`. */
  interface TypertRemoteNamespace$6f70656e496e5673636f6465 {
    list: () => Promise<RemoteResult<EditorCatalog>>
    open: (workspaceId: string, editorId: string, signal?: AbortSignal) => Promise<RemoteResult<{ opened: true }>>
  }
  interface TypertRemoteMap {
    'openWith/list': () => Promise<RemoteResult<EditorCatalog>>
    'openWith/open': (workspaceId: string, editorId: string, signal?: AbortSignal) => Promise<RemoteResult<{ opened: true }>>
  }
  interface TypertRemoteNamespaceMap {
    openWith: TypertRemoteNamespace$6f70656e496e5673636f6465
  }
}
