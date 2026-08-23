/** Workspace-row editor launcher: direct default action plus an editor chooser. */
import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  IconChevronRightOutline14,
  IconRefreshOutline14,
  IconRightUpOutline16,
  Menu,
  type MenuItem,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  GlobalStandardProps,
  PropsLocale,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { EditorView } from '../types.ts'
import { EditorCatalogController, useEditorCatalog } from './catalog.ts'
import { fmt, type OpenWithKey } from './locales.ts'
import { EditorPreference, preferredEditor } from './preference.ts'

const REFRESH_ID = 'dsh-open-with:refresh'

/** Host-backed actions supplied to every row contribution. */
export interface OpenWithInjected {
  /** Shared browser-safe editor catalog and refresh controller. */
  catalog: EditorCatalogController
  /** Shared browser-local editor preference. */
  preference: EditorPreference
  /** Open a registered Workspace in one catalog editor. */
  open: (workspaceId: string, editorId: string) => Promise<void>
  /** Announce a launch failure outside the closing Workspace menu. */
  showError: (text: string) => void
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The workspace editor-launcher copy. */
    'open-with': OpenWithKey
  }
}

/** Owner props supplied by the native workspace row-menu slot. */
export interface WorkspaceRowOwnerProps {
  workspaceId: string | undefined
  label: string
  cwd: string | undefined
  onClose: () => void
}

/** Full native row props without assuming an unpublished SlotMap declaration. */
export type OpenWithRowProps =
  WorkspaceRowOwnerProps
  & GlobalStandardProps
  & PropsLocale<'open-with'>
  & OpenWithInjected
  & {
    /** Keep a host-owned hover menu alive while its legacy child portal is active. */
    keepParentOpen?: () => void
  }

/** Minimal presentation props shared by the native slot and legacy adapter. */
export interface OpenWithMenuRowProps extends OpenWithInjected {
  workspaceId: string | undefined
  label: string
  onClose: () => void
  t: OpenWithRowProps['t']
  /** Launch the primary action on pointerdown when the legacy menu unmounts before click. */
  eagerPointerActivation?: boolean
  /** Keep a host-owned hover menu alive while its legacy child portal is active. */
  keepParentOpen?: () => void
}

/** Render the locale-following editor launcher for one Workspace row. */
export function OpenWithMenuRow({
  workspaceId,
  label,
  onClose,
  catalog: catalogController,
  preference,
  open,
  showError,
  t,
  eagerPointerActivation = false,
  keepParentOpen,
}: OpenWithMenuRowProps) {
  const { catalog, loading, loadError } = useEditorCatalog(catalogController)
  const [chooserOpen, setChooserOpen] = useState(false)
  const preferredId = useSyncExternalStore(preference.subscribe, preference.getSnapshot, preference.getSnapshot)
  const activated = useRef(false)

  const preferred = catalog === undefined ? undefined : preferredEditor(catalog, preferredId)
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

  if (workspaceId === undefined) return null

  const launch = (editor: EditorView): void => {
    if (!editor.available || activated.current) return
    activated.current = true
    void open(workspaceId, editor.id).then(
      () => {
        setChooserOpen(false)
        preference.select(editor.id)
        onClose()
      },
      (error: unknown) => {
        activated.current = false
        const message = error instanceof Error ? error.message : String(error)
        showError(fmt(t('menu.openFailed'), { message }))
        console.error('[dsh-open-with] open failed:', error)
      },
    )
  }

  const refresh = (): void => {
    void catalogController.refresh().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      showError(fmt(t('menu.refreshFailed'), { message }))
      console.error('[dsh-open-with] editor refresh failed:', error)
    })
  }

  if (catalog === undefined) {
    const text = loadError ? t('menu.refresh') : t('menu.loading')
    return (
      <button
        type="button"
        role="menuitem"
        className="dsh-open-with-row"
        disabled={!loadError || loading}
        onClick={loadError ? refresh : undefined}
      >
        <span className="dsh-open-with-icon"><IconRightUpOutline16 /></span>
        <span className="dsh-open-with-label">{text}</span>
      </button>
    )
  }

  const primaryEditor = preferred
    ?? catalog.editors.find(editor => editor.id === catalog.defaultEditorId)
    ?? catalog.editors[0]
  if (primaryEditor === undefined) {
    return (
      <button type="button" role="menuitem" className="dsh-open-with-row" disabled>
        <span className="dsh-open-with-icon"><IconRightUpOutline16 /></span>
        <span className="dsh-open-with-label">{t('menu.catalogFailed')}</span>
      </button>
    )
  }

  const primary = (
    <div className="dsh-open-with-split">
      <button
        type="button"
        role="menuitem"
        className="dsh-open-with-primary"
        aria-label={primaryEditor.available
          ? fmt(t('menu.openInEditor.aria'), { name: label, editor: primaryEditor.label })
          : fmt(t('menu.openUnavailable.aria'), {
              name: label,
              editor: primaryEditor.label,
              hint: primaryEditor.hint ?? t('menu.unavailable'),
            })}
        disabled={!primaryEditor.available}
        title={primaryEditor.hint}
        onClick={() => { launch(primaryEditor) }}
        onPointerDown={(event) => {
          if (eagerPointerActivation && event.button === 0) launch(primaryEditor)
        }}
      >
        <span className="dsh-open-with-icon"><IconRightUpOutline16 /></span>
        <span className="dsh-open-with-label dsh-open-with-label-stack">
          <span>
            {fmt(t('menu.openInEditor'), { editor: primaryEditor.label })}
            {!primaryEditor.available && ` — ${t('menu.unavailable')}`}
          </span>
          {!primaryEditor.available && primaryEditor.hint !== undefined && (
            <span className="dsh-open-with-hint">{primaryEditor.hint}</span>
          )}
        </span>
      </button>
      <button
        type="button"
        className="dsh-open-with-chooser"
        aria-label={fmt(t('menu.openWith.aria'), { name: label })}
        aria-haspopup="menu"
        aria-expanded={chooserOpen}
        onClick={(event) => {
          event.stopPropagation()
          setChooserOpen(value => !value)
        }}
      >
        <IconChevronRightOutline14 />
      </button>
    </div>
  )

  return (
    <span
      className="dsh-open-with-event-bridge"
      onPointerOver={keepParentOpen}
      onPointerDown={chooserOpen ? (event) => { event.stopPropagation() } : undefined}
    >
      <Menu
        open={chooserOpen}
        anchor={primary}
        items={menuItems}
        selectedId={preferred?.id}
        onSelect={(editorId) => {
          if (editorId === REFRESH_ID) {
            refresh()
            return
          }
          const editor = catalog.editors.find(item => item.id === editorId)
          if (editor !== undefined) launch(editor)
        }}
        onClose={() => { setChooserOpen(false) }}
        side="right"
        portal
        compact
        className="dsh-open-with-menu"
        footer={[{
          id: REFRESH_ID,
          label: loading ? t('menu.refreshing') : t('menu.refresh'),
          icon: <IconRefreshOutline14 />,
          disabled: loading,
        }]}
      />
    </span>
  )
}

/** Native row-menu slot entry. */
export function OpenWithRow(props: OpenWithRowProps) {
  return <OpenWithMenuRow {...props} />
}
