/**
 * The client-side Typert Remote contribution for the dsh-open-with host
 * service: mounts the shared strict descriptors into `ctx.remote.openWith`.
 * The descriptors and codecs come from the shared contract module, so the
 * browser bundle and the host manifest stay on one wire definition.
 */
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import type { EditorCatalog } from '../types.ts';
/** The openWith Remote namespace's client contribution. */
export declare const OPEN_WITH_REMOTE: TypertRemoteContribution;
declare module '@deepseek-ai/dsh-typert-protocol' {
    /** The `openWith` namespace face mounted under `ctx.remote.openWith`. */
    interface TypertRemoteNamespace$6f70656e496e5673636f6465 {
        list: () => Promise<RemoteResult<EditorCatalog>>;
        open: (workspaceId: string, editorId: string, signal?: AbortSignal) => Promise<RemoteResult<{
            opened: true;
        }>>;
        refresh: () => Promise<RemoteResult<EditorCatalog>>;
    }
    interface TypertRemoteMap {
        'openWith/list': () => Promise<RemoteResult<EditorCatalog>>;
        'openWith/open': (workspaceId: string, editorId: string, signal?: AbortSignal) => Promise<RemoteResult<{
            opened: true;
        }>>;
        'openWith/refresh': () => Promise<RemoteResult<EditorCatalog>>;
    }
    interface TypertRemoteNamespaceMap {
        openWith: TypertRemoteNamespace$6f70656e496e5673636f6465;
    }
}
