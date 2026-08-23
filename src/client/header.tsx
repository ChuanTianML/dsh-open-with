/** Current-session Header split button backed by the registered Workspace. */
import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  IconChevronDownOutline14,
  IconRefreshOutline14,
  IconRightUpOutline16,
  Menu,
  type MenuItem,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useEditorCatalog } from './catalog.ts'
import { fmt, NS } from './locales.ts'
import { preferredEditor } from './preference.ts'
import type { OpenWithInjected } from './row.tsx'

const REFRESH_ID = 'dsh-open-with:refresh'

/** Full props supplied to the Session Header utility contribution. */
export type OpenWithHeaderProps =
  PropsRuntime<'conversation.session.header.utilities'>
  & PropsLocale<typeof NS>
  & OpenWithInjected

/** Render the current registered Workspace's compact Open split button. */
export function OpenWithHeader({
  sessionId, useWorkspaces, catalog: catalogController, preference, open, showError, t,
}: OpenWithHeaderProps) {
  const workspace = useWorkspaces(state => state.items.find(item => item.sessionIds.includes(sessionId)))
  const { catalog, loading, loadError } = useEditorCatalog(catalogController)
  const preferredId = useSyncExternalStore(preference.subscribe, preference.getSnapshot, preference.getSnapshot)
  const [menuOpen, setMenuOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const preferred = catalog === undefined ? undefined : preferredEditor(catalog, preferredId)
  const primary = preferred
    ?? catalog?.editors.find(editor => editor.id === catalog.defaultEditorId)
    ?? catalog?.editors[0]
  const menuItems = useMemo<readonly MenuItem[]>(() => catalog?.editors.map(editor => ({
    id: editor.id,
    label: editor.available
      ? editor.label
      : (
          <span className="dsh-open-with-label-stack">
            <span>{editor.label} — {t('menu.unavailable')}</span>
            {editor.hint !== undefined && <span className="dsh-open-with-hint">{editor.hint}</span>}
          </span>
        ),
    disabled: !editor.available,
  })) ?? [], [catalog, t])

  if (workspace === undefined) return null

  const launch = (editorId: string): void => {
    if (running || workspace === undefined) return
    const editor = catalog?.editors.find(candidate => candidate.id === editorId)
    if (editor?.available !== true) return
    setRunning(true)
    void open(String(workspace.workspaceId), editor.id).then(() => {
      preference.select(editor.id)
      setMenuOpen(false)
    }, (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      showError(fmt(t('menu.openFailed'), { message }))
      console.error('[dsh-open-with] open failed:', error)
    }).finally(() => { setRunning(false) })
  }

  const refresh = (): void => {
    void catalogController.refresh().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      showError(fmt(t('menu.refreshFailed'), { message }))
      console.error('[dsh-open-with] editor refresh failed:', error)
    })
  }

  const label = primary === undefined
    ? loadError ? t('menu.catalogFailed') : t('menu.loading')
    : primary.available
      ? fmt(t('menu.openInEditor.aria'), { name: workspace.title, editor: primary.label })
      : fmt(t('menu.openUnavailable.aria'), {
          name: workspace.title,
          editor: primary.label,
          hint: primary.hint ?? t('menu.unavailable'),
        })
  const anchor = (
    <span className="dsh-open-with-header-split">
      <button
        type="button"
        className="dsh-open-with-header-primary"
        disabled={primary?.available !== true || running}
        aria-label={label}
        aria-busy={running || undefined}
        title={primary?.hint ?? primary?.label}
        onClick={() => { if (primary !== undefined) launch(primary.id) }}
      >
        <span>{t('header.open')}</span>
        <IconRightUpOutline16 size={12} />
      </button>
      <button
        type="button"
        className="dsh-open-with-header-chooser"
        disabled={running || (catalog === undefined && !loadError)}
        aria-label={fmt(t('menu.openWith.aria'), { name: workspace.title })}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => { setMenuOpen(value => !value) }}
      >
        <IconChevronDownOutline14 size={12} />
      </button>
    </span>
  )

  return (
    <Menu
      open={menuOpen}
      anchor={anchor}
      items={menuItems}
      selectedId={preferred?.id}
      onSelect={(id) => {
        if (id === REFRESH_ID) refresh()
        else launch(id)
      }}
      onClose={() => { setMenuOpen(false) }}
      align="end"
      portal
      compact
      footer={[{
        id: REFRESH_ID,
        label: loading ? t('menu.refreshing') : t('menu.refresh'),
        icon: <IconRefreshOutline14 />,
        disabled: loading,
      }]}
    />
  )
}
