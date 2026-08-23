import { describe, expect, it, vi } from 'vitest'
import {
  discoverEditorLaunches,
  parseAppPathOutput,
  type WindowsDiscoveryOperations,
} from '../src/discovery.ts'

describe('bounded Windows editor discovery', () => {
  it('parses known App Paths defaults without depending on localized value names', () => {
    const output = [
      'HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\Cursor.exe',
      '    (Default)    REG_SZ    "C:\\Users\\me\\Apps\\Cursor\\Cursor.exe"',
      '    Path    REG_SZ    C:\\Users\\me\\Apps\\Cursor',
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\Code.exe',
      '    (Default)    REG_EXPAND_SZ    %LOCALAPPDATA%\\Programs\\VS Code\\Code.exe',
      '',
    ].join('\r\n')
    expect(parseAppPathOutput(output, { LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' })).toEqual([
      { id: 'cursor', command: 'C:\\Users\\me\\Apps\\Cursor\\Cursor.exe', args: [] },
      {
        id: 'vscode',
        command: 'C:\\Users\\me\\AppData\\Local\\Programs\\VS Code\\Code.exe',
        args: [],
      },
    ])
  })

  it('combines App Paths with a bounded Toolbox lookup and deduplicates routes', async () => {
    const apps = 'C:\\Users\\me\\AppData\\Local\\JetBrains\\Toolbox\\apps'
    const executable = `${apps}\\GoLand\\ch-0\\241.1\\bin\\goland64.exe`
    const operations: WindowsDiscoveryOperations = {
      queryAppPaths: vi.fn(async () => [
        'HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\Cursor.exe',
        '    (Default)    REG_SZ    C:\\Apps\\Cursor.exe',
      ].join('\r\n')),
      listDirectories: vi.fn(async (path) => {
        if (path === apps) return ['GoLand', 'UnknownProduct']
        if (path === `${apps}\\GoLand`) return ['ch-0']
        if (path === `${apps}\\GoLand\\ch-0`) return ['241.1']
        return []
      }),
      isFile: vi.fn(async path => path === executable),
    }

    await expect(discoverEditorLaunches({
      platform: 'win32',
      env: { LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' },
      operations,
    })).resolves.toEqual([
      { id: 'cursor', command: 'C:\\Apps\\Cursor.exe', args: [] },
      { id: 'goland', command: executable, args: [] },
    ])
    expect(operations.queryAppPaths).toHaveBeenCalledTimes(4)
    expect(operations.listDirectories).not.toHaveBeenCalledWith(expect.stringContaining('UnknownProduct'))
  })

  it('does no Windows work on other platforms and honors cancellation', async () => {
    const operations: WindowsDiscoveryOperations = {
      queryAppPaths: vi.fn(async () => ''),
      listDirectories: vi.fn(async () => []),
      isFile: vi.fn(async () => false),
    }
    await expect(discoverEditorLaunches({ platform: 'darwin', operations })).resolves.toEqual([])
    expect(operations.queryAppPaths).not.toHaveBeenCalled()

    const aborted = new AbortController()
    aborted.abort()
    await expect(discoverEditorLaunches({ platform: 'win32', operations, signal: aborted.signal }))
      .rejects.toThrow(/aborted/u)
  })
})
