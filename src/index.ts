/**
 * dsh-open-with host plugin: mounts the `openWith` Typert Remote
 * service (list, refresh, and open registered Workspace launch targets) and
 * registers its strict Typert manifest. The client half ships in the same
 * package (`./client`); the web server serves it under
 * /plugins/dsh-open-with/client.js, and it registers the split editor
 * launcher into the harness's Workspace overflow-menu slot.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
// Type-only: brings the `ctx.typert` Context merge into this program.
import type {} from '@deepseek-ai/dsh-typert-registry'
// Type-only: brings the `ctx.workspaceRegistry` Context merge into this program.
import type {} from '@deepseek-ai/dsh-workspace'
import { discoverEditorLaunches } from './discovery.ts'
import { resolveEditors } from './editors.ts'
import { OpenWithRuntime } from './runtime.ts'
import { TYPERT_MANIFEST } from './typert.ts'
import type { ResolvedConfig } from './types.ts'

/** Cordis plugin name (the Loader entry and client bundle id). */
export const name = 'dsh-open-with'

/** Services required before load: Typert and the authoritative Workspace registry. */
export const inject = ['typert', 'workspaceRegistry']

/** Deployment configuration: editor discovery, allowlist, and default choice. */
export interface Config {
  /** Discover available built-in editor profiles for this Host platform. */
  autoDetect?: boolean
  /** Additional or overriding allowlisted editor profiles. */
  editors?: Array<{ id: string; label: string; command: string; args?: string[] }>
  /** Editor id selected before the browser remembers a user choice. */
  defaultEditor?: string
}

/**
 * Configuration schema: deployment-varying choices stay tunable from
 * cordis.yml. The inferred schema type keeps the callable form accepting
 * partial input, so `Config({})` yields the defaults (what the Loader does
 * for cordis.yml compositions).
 */
export const Config = z.object({
  autoDetect: z.boolean().default(true),
  editors: z.array(z.object({
    id: z.string(),
    label: z.string(),
    command: z.string(),
    args: z.array(z.string()).default([]),
  })).default([]),
  defaultEditor: z.string().default('vscode'),
})

/**
 * Mount the open-in-editor service and its strict Typert manifest.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 * @returns completion after the initial editor discovery and service registration.
 */
export async function apply(ctx: Context, config?: Config): Promise<void> {
  const resolved: ResolvedConfig = Config(config ?? {})
  const resolveRegistry = async () => {
    const discovered = resolved.autoDetect ? await discoverEditorLaunches() : []
    return resolveEditors(resolved, process.platform, process.env, undefined, discovered)
  }
  const editors = await resolveRegistry()
  new OpenWithRuntime(ctx, editors, resolved.defaultEditor, resolveRegistry)
  // Strict endpoint registration: the gateway resolves list/open/refresh from this
  // manifest, independent of decorator marker state.
  ctx.effect(() => {
    const dispose = ctx.typert.register(TYPERT_MANIFEST)
    return () => { void dispose() }
  }, 'dsh-open-with: typert manifest')
}
