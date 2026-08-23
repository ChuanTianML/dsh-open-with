/** One shared browser-local preferred editor across row and Header launchers. */
import type { EditorCatalog, EditorView } from '../types.ts'

const PREFERRED_EDITOR_KEY = 'dsh-open-with.preferred-editor'

function browserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

/** Browser preference store; persistence denial never blocks editor launch. */
export class EditorPreference {
  private value: string | undefined
  private readonly listeners = new Set<() => void>()

  /** @param storage - browser-local storage, or undefined when unavailable. */
  constructor(private readonly storage: Storage | undefined = browserStorage()) {
    try {
      this.value = storage?.getItem(PREFERRED_EDITOR_KEY) ?? undefined
    } catch {
      this.value = undefined
    }
  }

  /** Current preferred editor id. */
  readonly getSnapshot = (): string | undefined => this.value

  /** Subscribe one mounted launcher to successful selections. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Record a successfully launched editor and notify every launcher. */
  select(editorId: string): void {
    this.value = editorId
    try {
      this.storage?.setItem(PREFERRED_EDITOR_KEY, editorId)
    } catch {
      // Opening the editor must not depend on browser storage availability.
    }
    for (const listener of this.listeners) listener()
  }

  /** Stop future notifications when the plugin client fiber disposes. */
  dispose(): void {
    this.listeners.clear()
  }
}

/** Resolve the available primary target from browser and Host preferences. */
export function preferredEditor(catalog: EditorCatalog, storedId: string | undefined): EditorView | undefined {
  const available = catalog.editors.filter(editor => editor.available)
  return available.find(editor => editor.id === storedId)
    ?? available.find(editor => editor.id === catalog.defaultEditorId)
    ?? available[0]
}
