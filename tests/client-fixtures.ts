import { EditorCatalogController } from '../src/client/catalog.ts'
import { EditorPreference } from '../src/client/preference.ts'
import type { EditorCatalog } from '../src/types.ts'

/** Create an isolated catalog controller for one browser component test. */
export function testCatalog(
  list: () => Promise<EditorCatalog>,
  refresh: () => Promise<EditorCatalog> = list,
): EditorCatalogController {
  return new EditorCatalogController({ list, refresh })
}

/** Create a browser preference over the jsdom local-storage fixture. */
export function testPreference(): EditorPreference {
  return new EditorPreference(window.localStorage)
}
