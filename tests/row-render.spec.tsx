// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { fmt, zh } from '../src/client/locales.ts'
import { OpenWithRow, type OpenWithRowProps } from '../src/client/row.tsx'
import type { EditorCatalog } from '../src/types.ts'
import { testCatalog, testPreference } from './client-fixtures.ts'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

const singleCatalog: EditorCatalog = {
  editors: [{ id: 'vscode', label: 'Visual Studio Code', available: true }],
  defaultEditorId: 'vscode',
}

const multiCatalog: EditorCatalog = {
  editors: [
    { id: 'vscode', label: 'Visual Studio Code', available: true },
    { id: 'cursor', label: 'Cursor', available: true },
    { id: 'fleet', label: 'Fleet', available: false, hint: 'Executable "fleet" was not found' },
  ],
  defaultEditorId: 'vscode',
}

const unavailableCatalog: EditorCatalog = {
  editors: [
    { id: 'vscode', label: 'Visual Studio Code', available: false, hint: 'Executable "code" was not found' },
    { id: 'fleet', label: 'Fleet', available: false, hint: 'Executable "fleet" was not found' },
  ],
  defaultEditorId: 'vscode',
}

const singleUnavailableCatalog: EditorCatalog = {
  editors: [
    { id: 'fleet', label: 'Fleet', available: false, hint: 'Executable "fleet" was not found' },
  ],
  defaultEditorId: 'fleet',
}

const t = ((key: string, params?: Record<string, string>) => {
  const template = (zh as Record<string, string>)[key] ?? key
  return params === undefined ? template : fmt(template, params)
}) as OpenWithRowProps['t']

const useSessions = (() => undefined) as unknown as OpenWithRowProps['useSessions']
const useWorkspaces = (() => undefined) as unknown as OpenWithRowProps['useWorkspaces']

function props(overrides: Partial<OpenWithRowProps> = {}): OpenWithRowProps {
  return {
    workspaceId: 'workspace-1',
    label: 'Project',
    cwd: '/projects/project',
    onClose: vi.fn(),
    catalog: testCatalog(vi.fn(async () => singleCatalog)),
    preference: testPreference(),
    open: vi.fn(async () => {}),
    showError: vi.fn(),
    t,
    useSessions,
    useWorkspaces,
    ...overrides,
  }
}

describe('OpenWithRow', () => {
  it('renders one available editor as a direct action', async () => {
    const open = vi.fn(async () => {})
    const view = render(<OpenWithRow {...props({ open })} />)
    const row = await screen.findByRole('menuitem', { name: '在 Visual Studio Code 中打开 Project' })
    expect(row.textContent).toBe('在 Visual Studio Code 中打开')
    expect(row.querySelector('svg')).not.toBeNull()
    fireEvent.click(row)
    expect(open).toHaveBeenCalledWith('workspace-1', 'vscode')
    expect(renderToString(<OpenWithRow {...props()} />)).toContain('正在检测打开方式')
    expect(view).toBeTruthy()
  })

  it('opens the chooser, launches a selected editor, and remembers it', async () => {
    const onClose = vi.fn()
    const open = vi.fn(async () => {})
    const first = render(<OpenWithRow {...props({
      onClose,
      open,
      catalog: testCatalog(vi.fn(async () => multiCatalog)),
    })} />)
    await screen.findByRole('menuitem', { name: '在 Visual Studio Code 中打开 Project' })
    fireEvent.click(screen.getByRole('button', { name: '选择打开 Project 的方式' }))
    const chooserMenu = screen.getByRole('menu')
    expect(chooserMenu.parentElement).toBe(document.body)
    expect(first.container.contains(chooserMenu)).toBe(false)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cursor' }))
    expect(open).toHaveBeenCalledWith('workspace-1', 'cursor')
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce()
      expect(window.localStorage.getItem('dsh-open-with.preferred-editor')).toBe('cursor')
    })

    first.unmount()
    render(<OpenWithRow {...props({ catalog: testCatalog(vi.fn(async () => multiCatalog)) })} />)
    await screen.findByRole('menuitem', { name: '在 Cursor 中打开 Project' })
  })

  it('bridges pointer activity from the portaled chooser to a legacy host menu', async () => {
    const keepParentOpen = vi.fn()
    render(<OpenWithRow {...props({
      keepParentOpen,
      catalog: testCatalog(vi.fn(async () => multiCatalog)),
    })} />)
    await screen.findByRole('menuitem', { name: '在 Visual Studio Code 中打开 Project' })
    fireEvent.click(screen.getByRole('button', { name: '选择打开 Project 的方式' }))
    const cursor = screen.getByRole('menuitem', { name: 'Cursor' })
    fireEvent.pointerOver(cursor)
    expect(keepParentOpen).toHaveBeenCalled()

    const parentPointerDown = vi.fn()
    document.addEventListener('pointerdown', parentPointerDown)
    try {
      fireEvent.pointerDown(cursor)
      expect(parentPointerDown).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener('pointerdown', parentPointerDown)
    }
  })

  it('shows missing configured editors as disabled chooser entries', async () => {
    render(<OpenWithRow {...props({ catalog: testCatalog(vi.fn(async () => multiCatalog)) })} />)
    await screen.findByRole('menuitem', { name: '在 Visual Studio Code 中打开 Project' })
    fireEvent.click(screen.getByRole('button', { name: '选择打开 Project 的方式' }))
    const missing = screen.getByRole('menuitem', { name: /Fleet — 不可用/u })
    expect(missing.hasAttribute('disabled')).toBe(true)
    expect(missing.textContent).toContain('Executable "fleet" was not found')
  })

  it('keeps unavailable configured editors inspectable when none can launch', async () => {
    render(<OpenWithRow {...props({ catalog: testCatalog(vi.fn(async () => unavailableCatalog)) })} />)
    const primary = await screen.findByRole('menuitem', { name: /Visual Studio Code 无法用于打开 Project/u })
    expect(primary.hasAttribute('disabled')).toBe(true)
    expect(primary.textContent).toContain('不可用')
    expect(primary.textContent).toContain('Executable "code" was not found')

    fireEvent.click(screen.getByRole('button', { name: '选择打开 Project 的方式' }))
    expect(screen.getByRole('menuitem', { name: /Fleet — 不可用/u }).hasAttribute('disabled')).toBe(true)
  })

  it('shows the reason inline when the only configured target is unavailable', async () => {
    render(<OpenWithRow {...props({ catalog: testCatalog(vi.fn(async () => singleUnavailableCatalog)) })} />)
    const primary = await screen.findByRole('menuitem', { name: /Fleet 无法用于打开 Project/u })
    expect(primary.hasAttribute('disabled')).toBe(true)
    expect(primary.textContent).toContain('在 Fleet 中打开 — 不可用')
    expect(primary.textContent).toContain('Executable "fleet" was not found')
    expect(screen.getByRole('button', { name: '选择打开 Project 的方式' })).toBeTruthy()
  })

  it('reports catalog and launch failures without throwing through the row', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const failed = render(<OpenWithRow {...props({
        catalog: testCatalog(vi.fn(async () => { throw new Error('offline') })),
      })} />)
      await waitFor(() => { expect(screen.getByRole('menuitem').textContent).toContain('重新检测编辑器') })
      expect(consoleError).toHaveBeenCalledWith(
        '[dsh-open-with] editor catalog failed:',
        expect.any(Error),
      )
      failed.unmount()

      const open = vi.fn(async () => { throw new Error('launch failed') })
      const onClose = vi.fn()
      const showError = vi.fn()
      render(<OpenWithRow {...props({ onClose, open, showError })} />)
      fireEvent.click(await screen.findByRole('menuitem', { name: '在 Visual Studio Code 中打开 Project' }))
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('[dsh-open-with] open failed:', expect.any(Error))
        expect(showError).toHaveBeenCalledWith('打开失败：launch failed')
      })
      expect(onClose).not.toHaveBeenCalled()
      expect(window.localStorage.getItem('dsh-open-with.preferred-editor')).toBeNull()
    } finally {
      consoleError.mockRestore()
    }
  })

  it('renders nothing for a row without a Workspace id', () => {
    const { container } = render(<OpenWithRow {...props({ workspaceId: undefined })} />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole('menuitem')).toBeNull()
  })
})
