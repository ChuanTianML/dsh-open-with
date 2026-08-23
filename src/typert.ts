/**
 * The hand-written host Typert manifest for the openWith Remote.
 * Registered through `ctx.typert.register` in the plugin body, it claims the
 * wire endpoint through the strict registry — the same path generated
 * `./typert` artifacts use — so the Host Gateway resolves and invokes
 * `openWith/open` without consulting the `@Remote` marker table. That
 * marker independence matters in the harness's source-launch development
 * environment, where the tsx-loaded gateway and a profile-loaded plugin
 * bundle can hold separate copies of the decorator module state.
 */
import type { TypertContribution } from '@deepseek-ai/dsh-typert-registry/types'
import { OPEN_WITH_INVOCATIONS } from './contract.ts'

/** The openWith namespace's host manifest (strict codecs shared with the client). */
export const TYPERT_MANIFEST: TypertContribution = {
  package: 'dsh-open-with',
  face: 'host',
  schemas: [],
  model: {
    services: [
      {
        key: 'openWith',
        exportName: 'OpenWithRuntime',
        description: 'List available local editors and open registered Workspaces in a selected editor.',
        tags: [],
        members: [
          {
            kind: 'method',
            name: 'list',
            signature: 'list(): EditorCatalog',
          },
          {
            kind: 'method',
            name: 'open',
            signature: 'open(workspaceId: string, editorId: string, signal?: AbortSignal): Promise<{ opened: true }>',
          },
          {
            kind: 'method',
            name: 'refresh',
            signature: 'refresh(): Promise<EditorCatalog>',
          },
        ],
        types: [],
      },
    ],
    events: [],
    objects: [],
  },
  invocations: OPEN_WITH_INVOCATIONS,
}
