/**
 * Compatibility adapter for DSH 0.1.0-rc.6, whose published Workspace menu
 * predates `sidebar.workspaces.row-menu`. Newer runtimes use the native slot;
 * this adapter only mounts while that declaration is absent.
 */
import { createRoot, type Root } from 'react-dom/client'
import { OpenWithMenuRow, type OpenWithMenuRowProps } from './row.tsx'

interface WorkspaceItem {
  workspaceId: string
  title: string
  path: string
}

interface WorkspaceListSource {
  getSnapshot(): { items: readonly WorkspaceItem[] }
}

export interface LegacyWorkspaceMenuOptions {
  workspaces: WorkspaceListSource
  workspaceT: WorkspaceTranslate
  rowT: OpenWithMenuRowProps['t']
  catalog: OpenWithMenuRowProps['catalog']
  preference: OpenWithMenuRowProps['preference']
  open: OpenWithMenuRowProps['open']
  showError: OpenWithMenuRowProps['showError']
}

type WorkspaceTranslate = (
  key: 'actions.workspace.aria' | 'rename' | 'delete.workspace',
  params?: Record<string, unknown>,
) => string

interface ActiveMenu {
  workspace: WorkspaceItem
  anchor: HTMLElement
  menu?: HTMLElement
  mount?: HTMLElement
  root?: Root
}

const MOUNT_ATTR = 'data-dsh-open-with-legacy'
const KEYBOARD_ATTR = 'data-dsh-open-with-keyboard-actions'

function workspaceActionGroup(button: HTMLButtonElement): HTMLElement | undefined {
  let candidate = button.parentElement
  let rowChild: HTMLElement | undefined
  while (candidate !== null && candidate.getAttribute('role') !== 'treeitem') {
    rowChild = candidate
    if (getComputedStyle(candidate).display === 'none') return candidate
    candidate = candidate.parentElement
  }
  return candidate?.getAttribute('role') === 'treeitem' ? rowChild : undefined
}

function cancelPointerLeaveClose(anchor: HTMLElement): void {
  // rc.6's portaled Menu joins trigger and list through React's synthetic
  // event tree. Our compatibility row is a nested React root, so entering it
  // otherwise looks like leaving that tree and the menu closes after 200ms.
  anchor.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
}

function workspaceForButton(
  button: HTMLButtonElement,
  workspaces: WorkspaceListSource,
  t: WorkspaceTranslate,
): WorkspaceItem | undefined {
  const aria = button.getAttribute('aria-label')
  if (aria === null) return undefined
  const matches = workspaces.getSnapshot().items.filter(item => (
    t('actions.workspace.aria', { name: item.title }) === aria
  ))
  return matches.length === 1 ? matches[0] : undefined
}

/**
 * Make Harness's hover-only Workspace action cluster keyboard reachable.
 * Tab reveals only action groups whose aria-label resolves to one registered
 * Workspace; the next pointer interaction restores the owner stylesheet.
 */
export function installWorkspaceActionKeyboardAccess(
  workspaces: WorkspaceListSource,
  t: WorkspaceTranslate,
): () => void {
  const revealed = new Map<HTMLElement, string>()
  let keyboardMode = false

  const restore = (): void => {
    for (const [actions, display] of revealed) {
      actions.style.display = display
      actions.removeAttribute(KEYBOARD_ATTR)
    }
    revealed.clear()
  }
  const reveal = (): void => {
    for (const button of document.querySelectorAll<HTMLButtonElement>('button[aria-label]')) {
      if (workspaceForButton(button, workspaces, t) === undefined) continue
      // Harness's Menu wraps its anchor button. The wrapper itself is visible;
      // the owner rowActions ancestor is the element hidden by `display:none`.
      // Walk to that hidden ancestor instead of assuming the direct parent is
      // the action group; if CSS hover already reveals it, use the direct
      // treeitem child so keyboard mode keeps it visible after the pointer moves.
      const actions = workspaceActionGroup(button)
      if (actions === undefined || revealed.has(actions)) continue
      revealed.set(actions, actions.style.display)
      actions.style.display = 'inline-flex'
      actions.setAttribute(KEYBOARD_ATTR, '')
    }
  }
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return
    keyboardMode = true
    reveal()
  }
  const onPointerDown = (): void => {
    if (!keyboardMode) return
    keyboardMode = false
    queueMicrotask(restore)
  }
  const observer = new MutationObserver(() => { if (keyboardMode) reveal() })
  observer.observe(document.body, { childList: true, subtree: true })
  document.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('pointerdown', onPointerDown, true)

  return () => {
    observer.disconnect()
    document.removeEventListener('keydown', onKeyDown, true)
    document.removeEventListener('pointerdown', onPointerDown, true)
    restore()
  }
}

function isWorkspaceMenu(menu: HTMLElement, t: WorkspaceTranslate): boolean {
  const labels = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')]
    .map(item => item.textContent?.trim())
  return labels.includes(t('rename')) && labels.includes(t('delete.workspace'))
}

/**
 * Add the editor launcher to the published rc.6 Workspace menu.
 * @returns disposer removing listeners, observers, and any mounted row.
 */
export function installLegacyWorkspaceMenu(options: LegacyWorkspaceMenuOptions): () => void {
  let active: ActiveMenu | undefined

  const unmount = (): void => {
    active?.root?.unmount()
    active?.mount?.remove()
    active?.menu?.removeAttribute(MOUNT_ATTR)
    if (active !== undefined) {
      active.root = undefined
      active.mount = undefined
      active.menu = undefined
    }
  }

  const close = (): void => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  }

  const mountIntoOpenMenu = (): void => {
    if (active === undefined || active.root !== undefined) return
    const menus = [...document.querySelectorAll<HTMLElement>('[role="menu"]')]
      .filter(menu => isWorkspaceMenu(menu, options.workspaceT))
    const menu = menus.at(-1)
    if (menu === undefined || menu.hasAttribute(MOUNT_ATTR)) return
    const viewport = menu.querySelector<HTMLElement>(':scope > [role="presentation"]') ?? menu
    const mount = document.createElement('div')
    mount.setAttribute('role', 'presentation')
    mount.setAttribute(MOUNT_ATTR, '')
    mount.addEventListener('pointerover', () => {
      if (active !== undefined) cancelPointerLeaveClose(active.anchor)
    })
    viewport.appendChild(mount)
    menu.setAttribute(MOUNT_ATTR, '')
    const root = createRoot(mount)
    active.menu = menu
    active.mount = mount
    active.root = root
    root.render(
      <OpenWithMenuRow
        workspaceId={active.workspace.workspaceId}
        label={active.workspace.title}
        onClose={close}
        catalog={options.catalog}
        preference={options.preference}
        open={options.open}
        showError={options.showError}
        t={options.rowT}
        eagerPointerActivation
        keepParentOpen={() => {
          if (active !== undefined) cancelPointerLeaveClose(active.anchor)
        }}
      />,
    )
  }

  const observer = new MutationObserver(() => {
    if (active?.menu !== undefined && !active.menu.isConnected) unmount()
    mountIntoOpenMenu()
  })
  observer.observe(document.body, { childList: true, subtree: true })

  const onClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest<HTMLButtonElement>('button[aria-label]')
    if (button === null) return
    const workspace = workspaceForButton(button, options.workspaces, options.workspaceT)
    if (workspace === undefined) return
    unmount()
    active = { workspace, anchor: button.parentElement ?? button }
    queueMicrotask(mountIntoOpenMenu)
  }
  document.addEventListener('click', onClick, true)

  return () => {
    document.removeEventListener('click', onClick, true)
    observer.disconnect()
    unmount()
    active = undefined
  }
}
