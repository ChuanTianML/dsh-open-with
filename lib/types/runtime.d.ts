/**
 * The dsh-open-with host Remote service (`ctx.openWith`, wire
 * namespace `openWith`). Registered as a TypertRemoteService so the Host
 * Gateway's source-mode discovery exports its @Remote methods to the Web
 * client with zero generated artifacts; the
 * strict manifest (typert.ts) is what actually resolves and invokes the
 * endpoint in a profile-loaded bundle.
 */
import { type SpawnOptions } from 'node:child_process';
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { EditorCatalog, ResolvedEditor } from './types.ts';
/** Whether one environment variable carries credentials rather than desktop session state. */
export declare function isCredentialEnvironmentName(name: string): boolean;
/** Preserve the user's development/desktop environment while removing Host credentials. */
export declare function editorEnvironment(environment?: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
/** Platform-correct detached launch options shared by every allowlisted editor. */
export declare function editorSpawnOptions(platform?: NodeJS.Platform, environment?: NodeJS.ProcessEnv): SpawnOptions;
/** Resolve a fresh complete editor registry for an atomic refresh. */
export type ResolveEditorRegistry = () => Promise<readonly ResolvedEditor[]>;
/**
 * Spawn one resolved editor command on a Workspace directory and settle when the
 * process has launched (the child detaches and outlives the server).
 * @param command - executable resolved through PATH.
 * @param args - extra arguments before the directory path.
 * @param path - absolute directory to open.
 * @param signal - caller lifetime; an abort before launch rejects the open.
 * @returns fulfillment once the launch is accepted.
 */
export declare function launchEditor(command: string, args: readonly string[], path: string, signal?: AbortSignal, platform?: NodeJS.Platform, environment?: NodeJS.ProcessEnv): Promise<void>;
/** Host-side editor catalog and registered-Workspace launch service. */
export declare class OpenWithRuntime extends TypertRemoteService {
    private readonly configuredDefault;
    private readonly resolveRegistry;
    private editors;
    private catalog;
    private refreshInFlight;
    /**
     * Register the service under the `openWith` key (the wire namespace).
     * @param ctx - owning cordis context.
     * @param editors - resolved allowlisted launch targets.
     * @param configuredDefault - preferred editor id from Host configuration.
     * @param resolveRegistry - repeatable Host discovery and resolution pass.
     */
    constructor(ctx: Context, editors: readonly ResolvedEditor[], configuredDefault: string, resolveRegistry: ResolveEditorRegistry);
    /** Return browser-safe editor metadata without commands or arguments. */
    list(): EditorCatalog;
    /** Re-detect editors and atomically publish the new allowlisted catalog. */
    refresh(): Promise<EditorCatalog>;
    /**
     * Open one registered Workspace in one allowlisted editor.
     * @param workspaceId - stable Host Workspace id from the row owner share.
     * @param editorId - id from {@link list}; never a command.
     * @param signal - caller lifetime; an abort before launch cancels the open.
     * @returns the accepted launch.
     */
    open(workspaceId: string, editorId: string, signal?: AbortSignal): Promise<{
        opened: true;
    }>;
}
