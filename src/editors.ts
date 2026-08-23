/** Build the allowlisted Host editor registry from built-ins and configuration. */
import { existsSync } from 'node:fs'
import { win32 } from 'node:path'
import type {
  DiscoveredEditorLaunch, EditorCatalog, EditorConfig, ResolvedConfig, ResolvedEditor,
} from './types.ts'
import { resolveExecutable } from './resolve.ts'

type Exists = (path: string) => boolean

interface LaunchCandidate {
  command: string
  args?: readonly string[]
}

interface EditorCandidate {
  id: string
  label: string
  launches: readonly LaunchCandidate[]
  configured?: boolean
}

const EDITOR_ID = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/u

function macCandidates(): EditorCandidate[] {
  return [
    { id: 'vscode', label: 'Visual Studio Code', launches: [
      { command: 'code' },
      { command: '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code' },
    ] },
    { id: 'vscode-insiders', label: 'Visual Studio Code Insiders', launches: [
      { command: 'code-insiders' },
      { command: '/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders' },
    ] },
    { id: 'cursor', label: 'Cursor', launches: [
      { command: 'cursor' },
      { command: '/Applications/Cursor.app/Contents/Resources/app/bin/cursor' },
    ] },
    { id: 'windsurf', label: 'Windsurf', launches: [
      { command: 'windsurf' },
      { command: '/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf' },
    ] },
    { id: 'zed', label: 'Zed', launches: [
      { command: 'zed' },
      { command: '/Applications/Zed.app/Contents/MacOS/zed' },
    ] },
    { id: 'trae', label: 'Trae', launches: [
      { command: 'trae' },
      { command: '/Applications/Trae.app/Contents/Resources/app/bin/trae' },
    ] },
    { id: 'vscodium', label: 'VSCodium', launches: [
      { command: 'codium' },
      { command: '/Applications/VSCodium.app/Contents/Resources/app/bin/codium' },
    ] },
    { id: 'idea', label: 'IntelliJ IDEA', launches: [
      { command: 'idea' },
      { command: '/Applications/IntelliJ IDEA.app/Contents/MacOS/idea' },
    ] },
    { id: 'webstorm', label: 'WebStorm', launches: [
      { command: 'webstorm' },
      { command: '/Applications/WebStorm.app/Contents/MacOS/webstorm' },
    ] },
    { id: 'pycharm', label: 'PyCharm', launches: [
      { command: 'pycharm' },
      { command: '/Applications/PyCharm.app/Contents/MacOS/pycharm' },
    ] },
    { id: 'goland', label: 'GoLand', launches: [
      { command: 'goland' },
      { command: '/Applications/GoLand.app/Contents/MacOS/goland' },
    ] },
    { id: 'clion', label: 'CLion', launches: [
      { command: 'clion' },
      { command: '/Applications/CLion.app/Contents/MacOS/clion' },
    ] },
    { id: 'rider', label: 'Rider', launches: [
      { command: 'rider' },
      { command: '/Applications/Rider.app/Contents/MacOS/rider' },
    ] },
    { id: 'phpstorm', label: 'PhpStorm', launches: [
      { command: 'phpstorm' },
      { command: '/Applications/PhpStorm.app/Contents/MacOS/phpstorm' },
    ] },
    { id: 'rubymine', label: 'RubyMine', launches: [
      { command: 'rubymine' },
      { command: '/Applications/RubyMine.app/Contents/MacOS/rubymine' },
    ] },
    { id: 'datagrip', label: 'DataGrip', launches: [
      { command: 'datagrip' },
      { command: '/Applications/DataGrip.app/Contents/MacOS/datagrip' },
    ] },
    { id: 'rustrover', label: 'RustRover', launches: [
      { command: 'rustrover' },
      { command: '/Applications/RustRover.app/Contents/MacOS/rustrover' },
    ] },
    { id: 'android-studio', label: 'Android Studio', launches: [
      { command: 'studio' },
      { command: '/Applications/Android Studio.app/Contents/MacOS/studio' },
    ] },
    { id: 'sublime', label: 'Sublime Text', launches: [
      { command: 'subl' },
      { command: '/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl' },
    ] },
    { id: 'terminal', label: 'Terminal', launches: [
      { command: '/usr/bin/open', args: ['-a', 'Terminal'] },
    ] },
    { id: 'finder', label: 'Finder', launches: [{ command: '/usr/bin/open' }] },
  ]
}

function windowsCandidates(env: NodeJS.ProcessEnv): EditorCandidate[] {
  const localPrograms = env.LOCALAPPDATA === undefined
    ? undefined
    : win32.join(env.LOCALAPPDATA, 'Programs')
  const windowsRoot = env.WINDIR ?? env.SystemRoot ?? 'C:\\Windows'
  const programFiles = env.ProgramFiles ?? 'C:\\Program Files'
  return [
    { id: 'vscode', label: 'Visual Studio Code', launches: [{ command: 'code' }] },
    { id: 'vscode-insiders', label: 'Visual Studio Code Insiders', launches: [
      { command: 'code-insiders' },
      ...(localPrograms === undefined ? [] : [
        { command: win32.join(localPrograms, 'Microsoft VS Code Insiders', 'Code - Insiders.exe') },
      ]),
    ] },
    { id: 'cursor', label: 'Cursor', launches: [
      { command: 'cursor' },
      ...(localPrograms === undefined ? [] : [
        { command: win32.join(localPrograms, 'cursor', 'Cursor.exe') },
        { command: win32.join(localPrograms, 'Cursor', 'Cursor.exe') },
      ]),
    ] },
    { id: 'windsurf', label: 'Windsurf', launches: [
      { command: 'windsurf' },
      ...(localPrograms === undefined ? [] : [
        { command: win32.join(localPrograms, 'Windsurf', 'Windsurf.exe') },
      ]),
    ] },
    { id: 'zed', label: 'Zed', launches: [{ command: 'zed' }] },
    { id: 'trae', label: 'Trae', launches: [
      { command: 'trae' },
      ...(localPrograms === undefined ? [] : [
        { command: win32.join(localPrograms, 'Trae', 'Trae.exe') },
        { command: win32.join(localPrograms, 'Trae CN', 'Trae CN.exe') },
      ]),
    ] },
    { id: 'vscodium', label: 'VSCodium', launches: [
      { command: 'codium' },
      ...(localPrograms === undefined ? [] : [
        { command: win32.join(localPrograms, 'VSCodium', 'VSCodium.exe') },
      ]),
    ] },
    { id: 'idea', label: 'IntelliJ IDEA', launches: [{ command: 'idea' }] },
    { id: 'webstorm', label: 'WebStorm', launches: [{ command: 'webstorm' }] },
    { id: 'pycharm', label: 'PyCharm', launches: [{ command: 'pycharm' }] },
    { id: 'goland', label: 'GoLand', launches: [{ command: 'goland' }] },
    { id: 'clion', label: 'CLion', launches: [{ command: 'clion' }] },
    { id: 'rider', label: 'Rider', launches: [{ command: 'rider' }] },
    { id: 'phpstorm', label: 'PhpStorm', launches: [{ command: 'phpstorm' }] },
    { id: 'rubymine', label: 'RubyMine', launches: [{ command: 'rubymine' }] },
    { id: 'datagrip', label: 'DataGrip', launches: [{ command: 'datagrip' }] },
    { id: 'rustrover', label: 'RustRover', launches: [{ command: 'rustrover' }] },
    { id: 'android-studio', label: 'Android Studio', launches: [
      { command: 'studio' },
      { command: win32.join(programFiles, 'Android', 'Android Studio', 'bin', 'studio64.exe') },
    ] },
    { id: 'sublime', label: 'Sublime Text', launches: [
      { command: 'subl' },
      { command: win32.join(programFiles, 'Sublime Text', 'subl.exe') },
    ] },
    { id: 'terminal', label: 'Windows Terminal', launches: [{ command: 'wt', args: ['-d'] }] },
    { id: 'explorer', label: 'File Explorer', launches: [
      { command: win32.join(windowsRoot, 'explorer.exe') },
      { command: 'explorer' },
    ] },
  ]
}

function linuxCandidates(): EditorCandidate[] {
  return [
    { id: 'vscode', label: 'Visual Studio Code', launches: [{ command: 'code' }] },
    { id: 'vscode-insiders', label: 'Visual Studio Code Insiders', launches: [{ command: 'code-insiders' }] },
    { id: 'cursor', label: 'Cursor', launches: [{ command: 'cursor' }] },
    { id: 'windsurf', label: 'Windsurf', launches: [{ command: 'windsurf' }] },
    { id: 'zed', label: 'Zed', launches: [{ command: 'zed' }] },
    { id: 'trae', label: 'Trae', launches: [{ command: 'trae' }] },
    { id: 'vscodium', label: 'VSCodium', launches: [{ command: 'codium' }] },
    { id: 'idea', label: 'IntelliJ IDEA', launches: [{ command: 'idea' }] },
    { id: 'webstorm', label: 'WebStorm', launches: [{ command: 'webstorm' }] },
    { id: 'pycharm', label: 'PyCharm', launches: [{ command: 'pycharm' }] },
    { id: 'goland', label: 'GoLand', launches: [{ command: 'goland' }] },
    { id: 'clion', label: 'CLion', launches: [{ command: 'clion' }] },
    { id: 'rider', label: 'Rider', launches: [{ command: 'rider' }] },
    { id: 'phpstorm', label: 'PhpStorm', launches: [{ command: 'phpstorm' }] },
    { id: 'rubymine', label: 'RubyMine', launches: [{ command: 'rubymine' }] },
    { id: 'datagrip', label: 'DataGrip', launches: [{ command: 'datagrip' }] },
    { id: 'rustrover', label: 'RustRover', launches: [{ command: 'rustrover' }] },
    { id: 'android-studio', label: 'Android Studio', launches: [{ command: 'studio' }] },
    { id: 'sublime', label: 'Sublime Text', launches: [{ command: 'subl' }] },
    { id: 'terminal', label: 'Terminal', launches: [
      { command: 'x-terminal-emulator', args: ['--working-directory'] },
    ] },
    { id: 'files', label: 'File Manager', launches: [{ command: 'xdg-open' }] },
  ]
}

function builtInCandidates(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): EditorCandidate[] {
  if (platform === 'darwin') return macCandidates()
  if (platform === 'win32') return windowsCandidates(env)
  return linuxCandidates()
}

function addDiscoveredLaunches(
  candidates: readonly EditorCandidate[],
  discovered: readonly DiscoveredEditorLaunch[],
): EditorCandidate[] {
  const byId = new Map<string, LaunchCandidate[]>()
  for (const launch of discovered) {
    const list = byId.get(launch.id) ?? []
    list.push({ command: launch.command, args: launch.args })
    byId.set(launch.id, list)
  }
  return candidates.map((candidate) => {
    const extra = byId.get(candidate.id) ?? []
    if (extra.length === 0) return candidate
    const [pathCommand, ...fallbacks] = candidate.launches
    const launches = pathCommand === undefined
      ? extra
      : [pathCommand, ...extra, ...fallbacks]
    const seen = new Set<string>()
    return {
      ...candidate,
      launches: launches.filter((launch) => {
        const key = `${launch.command.toLowerCase()}\0${(launch.args ?? []).join('\0')}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }),
    }
  })
}

function configuredCandidate(editor: EditorConfig): EditorCandidate {
  return {
    id: editor.id,
    label: editor.label,
    launches: [{ command: editor.command, args: editor.args }],
    configured: true,
  }
}

function resolveCandidate(
  candidate: EditorCandidate,
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  exists: Exists,
): ResolvedEditor {
  for (const launch of candidate.launches) {
    const command = resolveExecutable(launch.command, platform, env, exists)
    if (command !== undefined) {
      return {
        id: candidate.id,
        label: candidate.label,
        command,
        args: launch.args ?? [],
        available: true,
      }
    }
  }
  const first = candidate.launches[0]
  if (first === undefined) throw new Error(`open-with: editor "${candidate.id}" has no launch candidate`)
  return {
    id: candidate.id,
    label: candidate.label,
    command: first.command,
    args: first.args ?? [],
    available: false,
    hint: `Executable "${first.command}" was not found`,
  }
}

function validateCandidate(candidate: EditorCandidate, seen: Set<string>): void {
  if (!EDITOR_ID.test(candidate.id)) {
    throw new Error(`open-with: invalid editor id "${candidate.id}"`)
  }
  if (candidate.label.trim() === '') {
    throw new Error(`open-with: editor "${candidate.id}" has an empty label`)
  }
  if (seen.has(candidate.id)) {
    throw new Error(`open-with: duplicate editor id "${candidate.id}"`)
  }
  seen.add(candidate.id)
}

/** Resolve the complete allowlisted editor registry for one Host process. */
export function resolveEditors(
  config: ResolvedConfig,
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  exists: Exists = existsSync,
  discovered: readonly DiscoveredEditorLaunch[] = [],
): ResolvedEditor[] {
  const configured = config.editors.map(configuredCandidate)
  const seen = new Set<string>()
  for (const candidate of configured) validateCandidate(candidate, seen)

  const configuredById = new Map(configured.map(editor => [editor.id, editor]))
  const builtIns = config.autoDetect
    ? addDiscoveredLaunches(builtInCandidates(platform, env), discovered)
    : []
  const builtInIds = new Set(builtIns.map(editor => editor.id))
  const candidates = [
    ...builtIns.map(editor => configuredById.get(editor.id) ?? editor),
    ...configured.filter(editor => !builtInIds.has(editor.id)),
  ]
  const resolved = candidates
    .map(candidate => ({ resolved: resolveCandidate(candidate, platform, env, exists), configured: candidate.configured === true }))
    .filter(({ resolved, configured: required }) => required || resolved.available)
    .map(({ resolved }) => resolved)
  if (resolved.length === 0) {
    throw new Error('open-with: editor registry is empty; enable autoDetect or configure at least one editor')
  }
  return resolved
}

/** Convert the private registry into browser-safe metadata. */
export function editorCatalog(editors: readonly ResolvedEditor[], configuredDefault: string): EditorCatalog {
  if (editors.length === 0) throw new Error('open-with: the editor registry is empty')
  const available = editors.filter(editor => editor.available)
  const preferred = available.find(editor => editor.id === configuredDefault) ?? available[0] ?? editors[0]
  if (preferred === undefined) throw new Error('open-with: the editor registry is empty')
  return {
    editors: editors.map(({ id, label, available: isAvailable, hint }) => ({
      id,
      label,
      available: isAvailable,
      ...(hint === undefined ? {} : { hint }),
    })),
    defaultEditorId: preferred.id,
  }
}
