/**
 * The dsh-open-with host Remote service (`ctx.openWith`, wire
 * namespace `openWith`). Registered as a TypertRemoteService so the Host
 * Gateway's source-mode discovery exports its @Remote methods to the Web
 * client with zero generated artifacts; the
 * strict manifest (typert.ts) is what actually resolves and invokes the
 * endpoint in a profile-loaded bundle.
 */
import { spawn, type SpawnOptions } from 'node:child_process'
import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { WorkspaceId } from '@deepseek-ai/dsh-workspace'
import { editorCatalog } from './editors.ts'
import type { EditorCatalog, ResolvedEditor } from './types.ts'

const SAFE_CREDENTIAL_NAMES = new Set(['SSH_AUTH_SOCK'])
const SENSITIVE_CREDENTIAL_NAMES = new Set([
  'ANTHROPIC_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AZURE_OPENAI_API_KEY',
  'COHERE_API_KEY',
  'DEEPSEEK_API_KEY',
  'GEMINI_API_KEY',
  'GH_TOKEN',
  'GITHUB_TOKEN',
  'GOOGLE_API_KEY',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GROQ_API_KEY',
  'HF_TOKEN',
  'HUGGING_FACE_HUB_TOKEN',
  'MISTRAL_API_KEY',
  'NPM_TOKEN',
  'OPENAI_API_KEY',
  'XAI_API_KEY',
])
const SENSITIVE_CREDENTIAL_SUFFIX = /(?:^|_)(?:ACCESS_KEY(?:_ID)?|ACCESS_TOKEN|API_?KEY|AUTH_TOKEN|BEARER_TOKEN|CLIENT_SECRET|CONNECTION_STRING|CREDENTIALS?|DATABASE_URL|PASSWORD|PRIVATE_KEY|SECRET(?:_KEY)?|SESSION_TOKEN|TOKEN)$/iu

/** Whether one environment variable carries credentials rather than desktop session state. */
export function isCredentialEnvironmentName(name: string): boolean {
  const normalized = name.toUpperCase()
  if (SAFE_CREDENTIAL_NAMES.has(normalized)) return false
  return SENSITIVE_CREDENTIAL_NAMES.has(normalized) || SENSITIVE_CREDENTIAL_SUFFIX.test(normalized)
}

/** Preserve the user's development/desktop environment while removing Host credentials. */
export function editorEnvironment(environment: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(environment).filter(([name]) => !isCredentialEnvironmentName(name)))
}

/** Platform-correct detached launch options shared by every allowlisted editor. */
export function editorSpawnOptions(
  platform: NodeJS.Platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env,
): SpawnOptions {
  return {
    detached: true,
    stdio: 'ignore',
    // Hiding an Electron child on Windows can also hide its first application
    // window. Other platforms ignore this flag.
    windowsHide: platform !== 'win32',
    env: editorEnvironment(environment),
  }
}

/** Resolve a fresh complete editor registry for an atomic refresh. */
export type ResolveEditorRegistry = () => Promise<readonly ResolvedEditor[]>

/**
 * Spawn one resolved editor command on a Workspace directory and settle when the
 * process has launched (the child detaches and outlives the server).
 * @param command - executable resolved through PATH.
 * @param args - extra arguments before the directory path.
 * @param path - absolute directory to open.
 * @param signal - caller lifetime; an abort before launch rejects the open.
 * @returns fulfillment once the launch is accepted.
 */
export function launchEditor(
  command: string,
  args: readonly string[],
  path: string,
  signal?: AbortSignal,
  platform: NodeJS.Platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(new Error('open-with: the open request was aborted'))
      return
    }
    const child = spawn(command, [...args, path], editorSpawnOptions(platform, environment))
    const abort = (): void => { child.kill() }
    signal?.addEventListener('abort', abort, { once: true })
    child.once('error', (error: NodeJS.ErrnoException) => {
      signal?.removeEventListener('abort', abort)
      const hint = error.code === 'ENOENT'
        ? `; the "${command}" executable is unavailable — install it or update the plugin editor configuration`
        : ''
      reject(new Error(`open-with: failed to launch "${command}": ${error.message}${hint}`))
    })
    child.once('spawn', () => {
      signal?.removeEventListener('abort', abort)
      child.unref()
      resolve()
    })
  })
}

/** Host-side editor catalog and registered-Workspace launch service. */
export class OpenWithRuntime extends TypertRemoteService {
  private editors: ReadonlyMap<string, ResolvedEditor>
  private catalog: EditorCatalog
  private refreshInFlight: Promise<EditorCatalog> | undefined

  /**
   * Register the service under the `openWith` key (the wire namespace).
   * @param ctx - owning cordis context.
   * @param editors - resolved allowlisted launch targets.
   * @param configuredDefault - preferred editor id from Host configuration.
   * @param resolveRegistry - repeatable Host discovery and resolution pass.
   */
  constructor(
    ctx: Context,
    editors: readonly ResolvedEditor[],
    private readonly configuredDefault: string,
    private readonly resolveRegistry: ResolveEditorRegistry,
  ) {
    super(ctx, 'openWith')
    this.editors = new Map(editors.map(editor => [editor.id, editor]))
    this.catalog = editorCatalog(editors, configuredDefault)
  }

  /** Return browser-safe editor metadata without commands or arguments. */
  @Remote
  list(): EditorCatalog {
    return this.catalog
  }

  /** Re-detect editors and atomically publish the new allowlisted catalog. */
  @Remote
  refresh(): Promise<EditorCatalog> {
    if (this.refreshInFlight !== undefined) return this.refreshInFlight
    const pending = this.resolveRegistry().then((editors) => {
      const catalog = editorCatalog(editors, this.configuredDefault)
      this.editors = new Map(editors.map(editor => [editor.id, editor]))
      this.catalog = catalog
      return catalog
    }).finally(() => {
      if (this.refreshInFlight === pending) this.refreshInFlight = undefined
    })
    this.refreshInFlight = pending
    return pending
  }

  /**
   * Open one registered Workspace in one allowlisted editor.
   * @param workspaceId - stable Host Workspace id from the row owner share.
   * @param editorId - id from {@link list}; never a command.
   * @param signal - caller lifetime; an abort before launch cancels the open.
   * @returns the accepted launch.
   */
  @Remote
  async open(workspaceId: string, editorId: string, signal?: AbortSignal): Promise<{ opened: true }> {
    const workspace = this.ctx.workspaceRegistry.get(WorkspaceId(workspaceId))
    if (workspace === undefined) {
      throw new Error(`open-with: unknown workspace "${workspaceId}"`)
    }
    if (await workspace.status() !== 'ok') {
      throw new Error(`open-with: workspace directory is missing for "${workspaceId}"`)
    }
    const editor = this.editors.get(editorId)
    if (editor === undefined) {
      throw new Error(`open-with: unknown editor "${editorId}"`)
    }
    if (!editor.available) {
      throw new Error(`open-with: editor "${editorId}" is unavailable${editor.hint === undefined ? '' : `; ${editor.hint}`}`)
    }
    await launchEditor(editor.command, editor.args, workspace.path, signal)
    return { opened: true }
  }
}
