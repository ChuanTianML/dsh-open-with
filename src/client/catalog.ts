/** Shared browser catalog state with atomic refresh fan-out to every launcher. */
import { useEffect, useState, useSyncExternalStore } from 'react'
import type { EditorCatalog } from '../types.ts'

/** Host calls used by the browser catalog controller. */
export interface EditorCatalogSource {
  /** Load the currently published Host catalog. */
  list(): Promise<EditorCatalog>
  /** Re-detect Host editors and return the replacement catalog. */
  refresh(): Promise<EditorCatalog>
}

/** Stable external-store value consumed by every Workspace/header launcher. */
export interface EditorCatalogSnapshot {
  catalog: EditorCatalog | undefined
  loading: boolean
}

/** Browser-owned catalog cache whose refresh replaces every mounted consumer. */
export class EditorCatalogController {
  private snapshot: EditorCatalogSnapshot = { catalog: undefined, loading: false }
  private readonly listeners = new Set<() => void>()
  private inFlight: Promise<EditorCatalog> | undefined
  private generation = 0

  /** @param source - strict Remote list and refresh calls. */
  constructor(private readonly source: EditorCatalogSource) {}

  /** Current stable external-store value. */
  readonly getSnapshot = (): EditorCatalogSnapshot => this.snapshot

  /** Subscribe one mounted launcher to catalog replacements. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private publish(snapshot: EditorCatalogSnapshot): void {
    this.snapshot = snapshot
    for (const listener of this.listeners) listener()
  }

  /** Load once, sharing the request across every concurrently mounted launcher. */
  load(): Promise<EditorCatalog> {
    if (this.snapshot.catalog !== undefined) return Promise.resolve(this.snapshot.catalog)
    if (this.inFlight !== undefined) return this.inFlight
    return this.start(this.source.list, false)
  }

  /** Force Host re-detection and replace the shared catalog on success. */
  refresh(): Promise<EditorCatalog> {
    this.generation += 1
    return this.start(this.source.refresh, true)
  }

  private start(operation: () => Promise<EditorCatalog>, preserveCatalog: boolean): Promise<EditorCatalog> {
    const generation = this.generation
    this.publish({
      catalog: preserveCatalog ? this.snapshot.catalog : undefined,
      loading: true,
    })
    const pending = operation().then((catalog) => {
      if (generation === this.generation) this.publish({ catalog, loading: false })
      return catalog
    }, (error: unknown) => {
      if (generation === this.generation) {
        this.publish({ catalog: preserveCatalog ? this.snapshot.catalog : undefined, loading: false })
      }
      throw error
    }).finally(() => {
      if (this.inFlight === pending) this.inFlight = undefined
    })
    this.inFlight = pending
    return pending
  }

  /** Stop future notifications when the plugin client fiber disposes. */
  dispose(): void {
    this.generation += 1
    this.listeners.clear()
    this.inFlight = undefined
  }
}

/** React binding for the shared catalog plus initial-load failure state. */
export function useEditorCatalog(controller: EditorCatalogController): EditorCatalogSnapshot & { loadError: boolean } {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const [loadError, setLoadError] = useState(false)
  useEffect(() => {
    let live = true
    void controller.load().then(
      () => { if (live) setLoadError(false) },
      (error: unknown) => {
        console.error('[dsh-open-with] editor catalog failed:', error)
        if (live) setLoadError(true)
      },
    )
    return () => { live = false }
  }, [controller])
  return { ...snapshot, loadError }
}
