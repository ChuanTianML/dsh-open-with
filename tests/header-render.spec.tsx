// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenWithHeader, type OpenWithHeaderProps } from '../src/client/header.tsx'
import { en, fmt } from '../src/client/locales.ts'
import { adoptStyles } from '../src/client/styles.ts'
import type { EditorCatalog } from '../src/types.ts'
import { testCatalog, testPreference } from './client-fixtures.ts'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  document.getElementById('dsh-open-with-styles')?.remove()
})

const initial: EditorCatalog = {
  editors: [{ id: 'vscode', label: 'Visual Studio Code', available: true }],
  defaultEditorId: 'vscode',
}
const refreshed: EditorCatalog = {
  editors: [
    { id: 'vscode', label: 'Visual Studio Code', available: true },
    { id: 'cursor', label: 'Cursor', available: true },
  ],
  defaultEditorId: 'cursor',
}

const t = ((key: string, params?: Record<string, string>) => {
  const template = (en as Record<string, string>)[key] ?? key
  return params === undefined ? template : fmt(template, params)
}) as OpenWithHeaderProps['t']

function props(overrides: Partial<OpenWithHeaderProps> = {}): OpenWithHeaderProps {
  const workspace = {
    workspaceId: 'workspace-1',
    title: 'Project',
    path: '/work/project',
    sessionIds: ['session-1'],
    createdAt: '2026-08-23T00:00:00.000Z',
    updatedAt: '2026-08-23T00:00:00.000Z',
  }
  const useWorkspaces = ((selector: (state: unknown) => unknown) => selector({ items: [workspace] }))
  return {
    sessionId: 'session-1',
    useSession: (() => undefined),
    useProjection: (() => undefined),
    useSessions: (() => undefined),
    useWorkspaces,
    catalog: testCatalog(async () => initial),
    preference: testPreference(),
    open: vi.fn(async () => {}),
    showError: vi.fn(),
    t,
    ...overrides,
  } as unknown as OpenWithHeaderProps
}

describe('Session Header Open split button', () => {
  it('uses the native Harness Header capsule geometry and semantic tokens', () => {
    adoptStyles()
    const css = document.getElementById('dsh-open-with-styles')?.textContent
    expect(css).toContain('height: 32px')
    expect(css).toContain('border: 1px solid var(--dsw-alias-border-l2)')
    expect(css).toContain('border-radius: 18px')
    expect(css).toContain('font-family: var(--dsw-font-family)')
    expect(css).not.toContain('--dsw-alias-line-border-secondary')
  })

  it('maps the current session through Workspace accounting and opens only by id', async () => {
    const open = vi.fn(async () => {})
    render(<OpenWithHeader {...props({ open })} />)
    const primary = await screen.findByRole('button', { name: 'Open Project in Visual Studio Code' })
    expect(primary.textContent).toContain('Open')
    fireEvent.click(primary)
    await waitFor(() => { expect(open).toHaveBeenCalledWith('workspace-1', 'vscode') })
  })

  it('renders nothing when the session is not accounted by a registered Workspace', () => {
    const useWorkspaces = ((selector: (state: unknown) => unknown) => selector({ items: [] }))
    const { container } = render(<OpenWithHeader {...props({
      useWorkspaces: useWorkspaces as OpenWithHeaderProps['useWorkspaces'],
    })} />)
    expect(container.firstChild).toBeNull()
  })

  it('refreshes the shared catalog and launches a newly detected editor', async () => {
    const refresh = vi.fn(async () => refreshed)
    const catalog = testCatalog(async () => initial, refresh)
    const open = vi.fn(async () => {})
    render(<OpenWithHeader {...props({ catalog, open })} />)
    await screen.findByRole('button', { name: 'Open Project in Visual Studio Code' })
    fireEvent.click(screen.getByRole('button', { name: 'Choose how to open Project' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Refresh editors' }))
    await waitFor(() => { expect(refresh).toHaveBeenCalledOnce() })

    fireEvent.click(await screen.findByRole('button', { name: 'Open Project in Cursor' }))
    await waitFor(() => { expect(open).toHaveBeenCalledWith('workspace-1', 'cursor') })
  })
})
