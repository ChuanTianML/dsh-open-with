/**
 * dsh-open-with client plugin: the browser half of the workspace
 * editor launcher. Mounts the openWith Remote namespace, contributes a
 * Session Header split button, and keeps the Workspace overflow-menu action
 * for compatibility. Both entry points ask the Host to resolve the registered
 * Workspace and allowlisted editor.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ui-workspace SlotMap merge (the row-menu owner share).
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
// Type-only: pulls the Session Header slot declarations and runtime props.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: brings the ctx.locale Context merge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { OPEN_WITH_REMOTE } from './remote.ts'
import { EditorCatalogController } from './catalog.ts'
import { createOpenWithFeedback } from './feedback.tsx'
import { OpenWithHeader } from './header.tsx'
import { NS, en, zh } from './locales.ts'
import { OpenWithRow, type OpenWithInjected } from './row.tsx'
import { EditorPreference } from './preference.ts'
import { installLegacyWorkspaceMenu, installWorkspaceActionKeyboardAccess } from './legacy-menu.tsx'
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
  refresh(): Promise<
    { ok: true; value: EditorCatalog } | { ok: false; error: { code: string; message: string; details: object } }
  >
}

interface MountedOpenWith {
  face: OpenWithNamespaceFace
  dispose: () => void | Promise<void>
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
  const feedback = createOpenWithFeedback(document)
  ctx.effect(() => feedback.dispose, 'dsh-open-with: feedback')
  const preference = new EditorPreference()
  ctx.effect(() => () => { preference.dispose() }, 'dsh-open-with: preference')

  // The mounted namespace handle resolves through the service store
  // (`ctx.reflect.get`), not through `ctx.remote.openWith`: the
  // generated-style dotted read walks the cordis fiber chain, which stops at
  // the Loader's runtime-less internal forks between a plugin entry and the
  // root fiber — the namespace service mounted under the gateway entry is
  // unreachable that way (the store path resolves it by isolation label).
  let mountedRemote: Promise<MountedOpenWith> | undefined
  ctx.effect(async () => {
    mountedRemote = (async () => {
      const dispose = await ctx.remote.$mount(OPEN_WITH_REMOTE)
      const face = (ctx.reflect as unknown as { get(name: string): unknown })
        .get('remote.openWith') as OpenWithNamespaceFace | undefined
      if (face === undefined) {
        void dispose()
        throw new Error('dsh-open-with: the openWith Remote namespace did not mount')
      }
      return { face, dispose }
    })()
    const mounted = await mountedRemote
    return () => {
      mountedRemote = undefined
      void mounted.dispose()
    }
  }, 'dsh-open-with: remote')

  const requireOpenWith = async (): Promise<OpenWithNamespaceFace> => {
    if (mountedRemote === undefined) {
      throw new Error('dsh-open-with: the openWith Remote is not mounted')
    }
    return (await mountedRemote).face
  }
  const unwrapCatalog = async (
    operation: 'list' | 'refresh',
  ): Promise<EditorCatalog> => {
    const result = await (await requireOpenWith())[operation]()
    if (!result.ok) {
      throw new Error(`open-with: ${result.error.code}: ${result.error.message}`)
    }
    return result.value
  }
  const catalog = new EditorCatalogController({
    list: () => unwrapCatalog('list'),
    refresh: () => unwrapCatalog('refresh'),
  })
  ctx.effect(() => () => { catalog.dispose() }, 'dsh-open-with: catalog')

  const open = async (workspaceId: string, editorId: string): Promise<void> => {
    const result = await (await requireOpenWith()).open(workspaceId, editorId)
    if (!result.ok) {
      throw new Error(`open-with: ${result.error.code}: ${result.error.message}`)
    }
  }

  // The published Harness package does not yet carry this future slot's
  // declaration, so this narrow adapter keeps compile-time compatibility
  // without claiming ownership of the host SlotMap contract.
  const rowMenuSlots = ctx.slots as unknown as WorkspaceRowMenuSlots
  const face = (): OpenWithInjected => ({ catalog, preference, open, showError: feedback.showError })
  rowMenuSlots.inject('sidebar.workspaces.row-menu', () => rowMenuSlots.register({
    name: 'sidebar.workspaces.row-menu',
    locale: NS,
    inject: face,
  }, OpenWithRow))
  ctx.slots.inject(
    'conversation.session.header.utilities',
    () => ctx.slots.register({
      name: 'conversation.session.header.utilities',
      id: 'dsh-open-with',
      order: 40,
      locale: NS,
      inject: face,
    }, OpenWithHeader),
  )

  ctx.effect(() => installWorkspaceActionKeyboardAccess(
    ctx.workspaces.list,
    ctx.locale.bind('workspace'),
  ), 'dsh-open-with: keyboard workspace actions')

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
          catalog,
          preference,
          open,
          showError: feedback.showError,
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
