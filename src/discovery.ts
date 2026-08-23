/** Bounded Host discovery for Windows App Paths and JetBrains Toolbox. */
import { execFile } from 'node:child_process'
import { readdir, stat } from 'node:fs/promises'
import { win32 } from 'node:path'
import type { DiscoveredEditorLaunch } from './types.ts'

const APP_PATH_ROOTS = [
  'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths',
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths',
  'HKCU\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths',
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths',
] as const

const EXECUTABLE_IDS = new Map<string, string>([
  ['code.exe', 'vscode'],
  ['code - insiders.exe', 'vscode-insiders'],
  ['cursor.exe', 'cursor'],
  ['windsurf.exe', 'windsurf'],
  ['zed.exe', 'zed'],
  ['trae.exe', 'trae'],
  ['trae cn.exe', 'trae'],
  ['vscodium.exe', 'vscodium'],
  ['idea.exe', 'idea'],
  ['idea64.exe', 'idea'],
  ['webstorm.exe', 'webstorm'],
  ['webstorm64.exe', 'webstorm'],
  ['pycharm.exe', 'pycharm'],
  ['pycharm64.exe', 'pycharm'],
  ['goland.exe', 'goland'],
  ['goland64.exe', 'goland'],
  ['clion.exe', 'clion'],
  ['clion64.exe', 'clion'],
  ['rider.exe', 'rider'],
  ['rider64.exe', 'rider'],
  ['phpstorm.exe', 'phpstorm'],
  ['phpstorm64.exe', 'phpstorm'],
  ['rubymine.exe', 'rubymine'],
  ['rubymine64.exe', 'rubymine'],
  ['datagrip.exe', 'datagrip'],
  ['datagrip64.exe', 'datagrip'],
  ['rustrover.exe', 'rustrover'],
  ['rustrover64.exe', 'rustrover'],
  ['studio.exe', 'android-studio'],
  ['studio64.exe', 'android-studio'],
  ['subl.exe', 'sublime'],
])

interface ToolboxProduct {
  id: string
  directoryAliases: readonly string[]
  executables: readonly string[]
}

const TOOLBOX_PRODUCTS: readonly ToolboxProduct[] = [
  { id: 'idea', directoryAliases: ['idea-u', 'idea-c', 'intellijidea'], executables: ['idea64.exe', 'idea.exe'] },
  { id: 'webstorm', directoryAliases: ['webstorm'], executables: ['webstorm64.exe', 'webstorm.exe'] },
  { id: 'pycharm', directoryAliases: ['pycharm-p', 'pycharm-c', 'pycharm'], executables: ['pycharm64.exe', 'pycharm.exe'] },
  { id: 'goland', directoryAliases: ['goland'], executables: ['goland64.exe', 'goland.exe'] },
  { id: 'clion', directoryAliases: ['clion'], executables: ['clion64.exe', 'clion.exe'] },
  { id: 'rider', directoryAliases: ['rider'], executables: ['rider64.exe', 'rider.exe'] },
  { id: 'phpstorm', directoryAliases: ['phpstorm'], executables: ['phpstorm64.exe', 'phpstorm.exe'] },
  { id: 'rubymine', directoryAliases: ['rubymine'], executables: ['rubymine64.exe', 'rubymine.exe'] },
  { id: 'datagrip', directoryAliases: ['datagrip'], executables: ['datagrip64.exe', 'datagrip.exe'] },
  { id: 'rustrover', directoryAliases: ['rustrover'], executables: ['rustrover64.exe', 'rustrover.exe'] },
]

/** Injectable Windows discovery operations for deterministic non-Windows tests. */
export interface WindowsDiscoveryOperations {
  /** Query one App Paths registry root recursively. */
  queryAppPaths(root: string, signal?: AbortSignal): Promise<string>
  /** List direct child directory names. */
  listDirectories(path: string): Promise<readonly string[]>
  /** Whether one exact path is a regular file. */
  isFile(path: string): Promise<boolean>
}

/** Options for one bounded editor-discovery pass. */
export interface EditorDiscoveryOptions {
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
  signal?: AbortSignal
  operations?: WindowsDiscoveryOperations
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted === true) throw new Error('open-with: editor discovery was aborted')
}

function cleanRegistryPath(raw: string, env: NodeJS.ProcessEnv): string {
  const unquoted = raw.trim().replace(/^"|"$/gu, '').replace(/,\s*-?\d+$/u, '')
  return unquoted.replace(/%([^%]+)%/gu, (_match, name: string) => {
    const key = Object.keys(env).find(candidate => candidate.toLowerCase() === name.toLowerCase())
    return key === undefined ? `%${name}%` : env[key] ?? `%${name}%`
  })
}

/** Parse executable paths from locale-independent `reg query ... /s` output. */
export function parseAppPathOutput(output: string, env: NodeJS.ProcessEnv = process.env): DiscoveredEditorLaunch[] {
  const launches: DiscoveredEditorLaunch[] = []
  let keyExecutable: string | undefined
  for (const line of output.split(/\r?\n/u)) {
    const trimmed = line.trim()
    if (/^HKEY_/iu.test(trimmed)) {
      keyExecutable = win32.basename(trimmed).toLowerCase()
      continue
    }
    if (keyExecutable === undefined) continue
    const value = /^\s*.*?\s+REG_(?:SZ|EXPAND_SZ)\s+(.+?)\s*$/iu.exec(line)?.[1]
    if (value === undefined) continue
    const command = cleanRegistryPath(value, env)
    if (win32.basename(command).toLowerCase() !== keyExecutable) continue
    const id = EXECUTABLE_IDS.get(keyExecutable)
    if (id !== undefined) launches.push({ id, command, args: [] })
  }
  return launches
}

function defaultRegistryQuery(env: NodeJS.ProcessEnv): WindowsDiscoveryOperations['queryAppPaths'] {
  const systemRoot = env.SystemRoot ?? env.SYSTEMROOT ?? env.WINDIR
  const candidates = systemRoot === undefined
    ? ['reg.exe']
    : [win32.join(systemRoot, 'System32', 'reg.exe'), 'reg.exe']
  return async (root, signal) => {
    for (const command of candidates) {
      assertNotAborted(signal)
      const output = await new Promise<string | undefined>((resolve, reject) => {
        execFile(command, ['query', root, '/s'], {
          encoding: 'utf8', windowsHide: true, timeout: 5_000, maxBuffer: 2 * 1024 * 1024, signal,
        }, (error, stdout) => {
          if (signal?.aborted === true) {
            reject(new Error('open-with: editor discovery was aborted'))
            return
          }
          resolve(error === null ? stdout : undefined)
        })
      })
      if (output !== undefined) return output
    }
    return ''
  }
}

function defaultOperations(env: NodeJS.ProcessEnv): WindowsDiscoveryOperations {
  return {
    queryAppPaths: defaultRegistryQuery(env),
    listDirectories: async path => (await readdir(path, { withFileTypes: true }))
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name),
    isFile: async path => {
      try {
        return (await stat(path)).isFile()
      } catch {
        return false
      }
    },
  }
}

function toolboxProduct(directory: string): ToolboxProduct | undefined {
  const normalized = directory.toLowerCase().replace(/[^a-z0-9-]/gu, '')
  return TOOLBOX_PRODUCTS.find(product => product.directoryAliases.some(alias => normalized.startsWith(alias)))
}

async function findToolboxExecutable(
  root: string,
  product: ToolboxProduct,
  operations: WindowsDiscoveryOperations,
  signal: AbortSignal | undefined,
  depth: number,
): Promise<string | undefined> {
  assertNotAborted(signal)
  for (const executable of product.executables) {
    const candidate = win32.join(root, 'bin', executable)
    if (await operations.isFile(candidate)) return candidate
  }
  if (depth === 0) return undefined
  let children: readonly string[]
  try {
    children = await operations.listDirectories(root)
  } catch {
    return undefined
  }
  for (const child of [...children].sort().reverse()) {
    const found = await findToolboxExecutable(
      win32.join(root, child), product, operations, signal, depth - 1,
    )
    if (found !== undefined) return found
  }
  return undefined
}

async function discoverToolbox(
  env: NodeJS.ProcessEnv,
  operations: WindowsDiscoveryOperations,
  signal?: AbortSignal,
): Promise<DiscoveredEditorLaunch[]> {
  const localAppData = env.LOCALAPPDATA
    ?? (env.USERPROFILE === undefined ? undefined : win32.join(env.USERPROFILE, 'AppData', 'Local'))
  if (localAppData === undefined) return []
  const appsRoot = win32.join(localAppData, 'JetBrains', 'Toolbox', 'apps')
  let productDirectories: readonly string[]
  try {
    productDirectories = await operations.listDirectories(appsRoot)
  } catch {
    return []
  }
  const launches: DiscoveredEditorLaunch[] = []
  for (const directory of productDirectories) {
    const product = toolboxProduct(directory)
    if (product === undefined) continue
    const command = await findToolboxExecutable(
      win32.join(appsRoot, directory), product, operations, signal, 3,
    )
    if (command !== undefined) launches.push({ id: product.id, command, args: [] })
  }
  return launches
}

function deduplicate(launches: readonly DiscoveredEditorLaunch[]): DiscoveredEditorLaunch[] {
  const seen = new Set<string>()
  return launches.filter((launch) => {
    const key = `${launch.id}\0${launch.command.toLowerCase()}\0${launch.args.join('\0')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Discover platform-owned editor launch routes without scanning arbitrary user directories. */
export async function discoverEditorLaunches(
  options: EditorDiscoveryOptions = {},
): Promise<DiscoveredEditorLaunch[]> {
  const platform = options.platform ?? process.platform
  if (platform !== 'win32') return []
  const env = options.env ?? process.env
  const operations = options.operations ?? defaultOperations(env)
  assertNotAborted(options.signal)
  const registryOutputs = await Promise.all(APP_PATH_ROOTS.map(async (root) => {
    try {
      return await operations.queryAppPaths(root, options.signal)
    } catch (error) {
      assertNotAborted(options.signal)
      void error
      return ''
    }
  }))
  const appPaths = registryOutputs.flatMap(output => parseAppPathOutput(output, env))
  const toolbox = await discoverToolbox(env, operations, options.signal)
  return deduplicate([...appPaths, ...toolbox])
}
