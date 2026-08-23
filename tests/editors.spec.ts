import { describe, expect, it } from 'vitest'
import { editorCatalog, resolveEditors } from '../src/editors.ts'
import type { ResolvedConfig } from '../src/types.ts'

function config(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    autoDetect: true,
    editors: [],
    defaultEditor: 'vscode',
    ...overrides,
  }
}

describe('editor registry resolution', () => {
  it('adds only available macOS built-ins in stable order', () => {
    const installed = new Set([
      '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
      '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
      '/usr/bin/open',
    ])
    const editors = resolveEditors(config(), 'darwin', { PATH: '/usr/bin' }, path => installed.has(path))
    expect(editors.map(editor => [editor.id, editor.available])).toEqual([
      ['vscode', true],
      ['cursor', true],
      ['terminal', true],
      ['finder', true],
    ])
    expect(editors.find(editor => editor.id === 'cursor')).toMatchObject({
      command: '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
      args: [],
    })
  })

  it('retains missing configured editors with a fix hint and hides missing built-ins', () => {
    const editors = resolveEditors(config({
      editors: [{ id: 'fleet', label: 'Fleet', command: 'fleet', args: ['--wait'] }],
    }), 'linux', { PATH: '/usr/bin' }, () => false)
    expect(editors).toEqual([
      expect.objectContaining({ id: 'fleet', available: false, hint: expect.stringContaining('fleet') }),
    ])
  })

  it('honors custom arguments and disables automatic discovery', () => {
    const editors = resolveEditors(config({
      autoDetect: false,
      editors: [{ id: 'custom', label: 'Custom Editor', command: '/bin/custom', args: ['open'] }],
    }), 'linux', {}, path => path.startsWith('/bin/'))
    expect(editors).toEqual([
      expect.objectContaining({ id: 'custom', command: '/bin/custom', args: ['open'], available: true }),
    ])
  })

  it('fails load-time validation for duplicate or unsafe custom ids', () => {
    expect(() => resolveEditors(config({
      editors: [
        { id: 'custom', label: 'First', command: 'first', args: [] },
        { id: 'custom', label: 'Second', command: 'second', args: [] },
      ],
    }), 'linux', {}, () => true)).toThrow(/duplicate editor id/)
    expect(() => resolveEditors(config({
      editors: [{ id: '../escape', label: 'Unsafe', command: 'other', args: [] }],
    }), 'linux', {}, () => true)).toThrow(/invalid editor id/)
  })

  it('overrides a built-in profile and publishes no commands', () => {
    const editors = resolveEditors(config({
      defaultEditor: 'vscode',
      editors: [{ id: 'vscode', label: 'Code Insiders', command: '/bin/code-insiders', args: ['--reuse-window'] }],
    }), 'linux', {}, path => path === '/bin/code-insiders')
    const catalog = editorCatalog(editors, 'vscode')
    expect(editors[0]).toMatchObject({ id: 'vscode', command: '/bin/code-insiders', args: ['--reuse-window'] })
    expect(catalog.defaultEditorId).toBe('vscode')
    expect(catalog.editors).toEqual([
      { id: 'vscode', label: 'Code Insiders', available: true },
    ])
    expect(JSON.stringify(catalog)).not.toContain('/bin/')
  })

  it('uses Windows App Paths and Toolbox routes before fixed fallbacks', () => {
    const editors = resolveEditors(config(), 'win32', {
      PATH: 'C:\\Windows\\System32',
      ProgramFiles: 'C:\\Program Files',
      WINDIR: 'C:\\Windows',
    }, path => path === 'D:\\Apps\\Cursor\\Cursor.exe' || path === 'D:\\Toolbox\\GoLand\\bin\\goland64.exe', [
      { id: 'cursor', command: 'D:\\Apps\\Cursor\\Cursor.exe', args: [] },
      { id: 'goland', command: 'D:\\Toolbox\\GoLand\\bin\\goland64.exe', args: [] },
    ])
    expect(editors).toEqual([
      expect.objectContaining({ id: 'cursor', command: 'D:\\Apps\\Cursor\\Cursor.exe', available: true }),
      expect.objectContaining({ id: 'goland', command: 'D:\\Toolbox\\GoLand\\bin\\goland64.exe', available: true }),
    ])
  })

  it('fails clearly when discovery is disabled without configured editors', () => {
    expect(() => resolveEditors(config({ autoDetect: false }), 'linux', {}, () => false))
      .toThrow(/editor registry is empty/)
  })
})
