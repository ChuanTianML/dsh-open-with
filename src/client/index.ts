/**
 * dsh-open-with client plugin: the browser half of the workspace
 * overflow-menu editor launcher. Mounts the openWith Remote namespace
 * and registers the split action into the harness's
 * `sidebar.workspaces.row-menu` slot, with zh/en dictionaries. The row's
 * explicit click closes the menu and asks the Host to resolve both the
 * Workspace and the selected editor.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ui-workspace SlotMap merge (the row-menu owner share).
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
// Type-only: brings the ctx.locale Context merge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { OPEN_WITH_REMOTE } from './remote.ts'
import { NS, en, zh } from './locales.ts'
import { OpenWithRow, type OpenWithInjected } from './row.tsx'
import { installLegacyWorkspaceMenu } from './legacy-menu.tsx'
import { adoptStyles } from './styles.ts'
import type { EditorCatalog } from '../types.ts'

/** Required services: slots, the gateway Remote face, and locale. */
export const inject = ['slots', 'remote', 'locale', 'workspaces']

/** The mounted openWith namespace service's callable face. */
interface OpenWithNamespaceFace {
  list(): Promise<
    { ok: true; value: EditorCatalog } | { ok: false; error: { code: string; message: string; details: object } }
  >
  open(workspaceId: string, editorId: string, signal?: AbortSignal): Promise<
    { ok: true; value: { opened: true } } | { ok: false; error: { code: string; message: string; details: object } }
  >
}

interface WorkspaceRowMenuSlots {
  inject(name: string, mount: () => () => void): void
  register(
    options: { name: string; locale: typeof NS; inject: () => OpenWithInjected },
    component: typeof OpenWithRow,
  ): () => void
  spec(name: string): unknown
  subscribe(name: string, listener: () => void): () => void
}

/**
 * Compose the workspace overflow-menu row.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  adoptStyles()
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-open-with: dictionaries')

  // The mounted namespace handle resolves through the service store
  // (`ctx.reflect.get`), not through `ctx.remote.openWith`: the
  // generated-style dotted read walks the cordis fiber chain, which stops at
  // the Loader's runtime-less internal forks between a plugin entry and the
  // root fiber — the namespace service mounted under the gateway entry is
  // unreachable that way (the store path resolves it by isolation label).
  let openWith: OpenWithNamespaceFace | undefined
  let catalogPromise: Promise<EditorCatalog> | undefined
  ctx.effect(async () => {
    const dispose = await ctx.remote.$mount(OPEN_WITH_REMOTE)
    openWith = (ctx.reflect as unknown as { get(name: string): unknown })
      .get('remote.openWith') as OpenWithNamespaceFace | undefined
    if (openWith === undefined) {
      throw new Error('dsh-open-with: the openWith Remote namespace did not mount')
    }
    return () => {
      openWith = undefined
      catalogPromise = undefined
      void dispose()
    }
  }, 'dsh-open-with: remote')

  const listEditors = (): Promise<EditorCatalog> => {
    if (catalogPromise !== undefined) return catalogPromise
    catalogPromise = (async () => {
      if (openWith === undefined) {
        throw new Error('dsh-open-with: the openWith Remote is not mounted')
      }
      const result = await openWith.list()
      if (!result.ok) {
        throw new Error(`open-with: ${result.error.code}: ${result.error.message}`)
      }
      return result.value
    })().catch((error: unknown) => {
      catalogPromise = undefined
      throw error
    })
    return catalogPromise
  }

  const open = async (workspaceId: string, editorId: string): Promise<void> => {
    if (openWith === undefined) {
      throw new Error('dsh-open-with: the openWith Remote is not mounted')
    }
    const result = await openWith.open(workspaceId, editorId)
    if (!result.ok) {
      throw new Error(`open-with: ${result.error.code}: ${result.error.message}`)
    }
  }

  // The published Harness package does not yet carry this future slot's
  // declaration, so this narrow adapter keeps compile-time compatibility
  // without claiming ownership of the host SlotMap contract.
  const rowMenuSlots = ctx.slots as unknown as WorkspaceRowMenuSlots
  rowMenuSlots.inject('sidebar.workspaces.row-menu', () => rowMenuSlots.register({
    name: 'sidebar.workspaces.row-menu',
    locale: NS,
    inject: (): OpenWithInjected => ({ listEditors, open }),
  }, OpenWithRow))

  // The latest public npm build (0.1.0-rc.6) predates the Workspace row-menu
  // slot. Keep its DOM adapter live only while that declaration is absent;
  // a newer runtime declaring the slot immediately tears the adapter down.
  ctx.effect(() => {
    let disposeLegacy: (() => void) | undefined
    const reconcile = (): void => {
      const native = rowMenuSlots.spec('sidebar.workspaces.row-menu') !== undefined
      if (native) {
        disposeLegacy?.()
        disposeLegacy = undefined
      } else if (disposeLegacy === undefined) {
        disposeLegacy = installLegacyWorkspaceMenu({
          workspaces: ctx.workspaces.list,
          workspaceT: ctx.locale.bind('workspace'),
          rowT: ctx.locale.bind(NS),
          listEditors,
          open,
        })
      }
    }
    const unsubscribe = rowMenuSlots.subscribe('sidebar.workspaces.row-menu', reconcile)
    reconcile()
    return () => {
      unsubscribe()
      disposeLegacy?.()
    }
  }, 'dsh-open-with: rc.6 workspace-menu compatibility')
}
