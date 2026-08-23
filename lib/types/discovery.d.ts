import type { DiscoveredEditorLaunch } from './types.ts';
/** Injectable Windows discovery operations for deterministic non-Windows tests. */
export interface WindowsDiscoveryOperations {
    /** Query one App Paths registry root recursively. */
    queryAppPaths(root: string, signal?: AbortSignal): Promise<string>;
    /** List direct child directory names. */
    listDirectories(path: string): Promise<readonly string[]>;
    /** Whether one exact path is a regular file. */
    isFile(path: string): Promise<boolean>;
}
/** Options for one bounded editor-discovery pass. */
export interface EditorDiscoveryOptions {
    platform?: NodeJS.Platform;
    env?: NodeJS.ProcessEnv;
    signal?: AbortSignal;
    operations?: WindowsDiscoveryOperations;
}
/** Parse executable paths from locale-independent `reg query ... /s` output. */
export declare function parseAppPathOutput(output: string, env?: NodeJS.ProcessEnv): DiscoveredEditorLaunch[];
/** Discover platform-owned editor launch routes without scanning arbitrary user directories. */
export declare function discoverEditorLaunches(options?: EditorDiscoveryOptions): Promise<DiscoveredEditorLaunch[]>;
