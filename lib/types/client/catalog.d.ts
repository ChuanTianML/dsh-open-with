import type { EditorCatalog } from '../types.ts';
/** Host calls used by the browser catalog controller. */
export interface EditorCatalogSource {
    /** Load the currently published Host catalog. */
    list(): Promise<EditorCatalog>;
    /** Re-detect Host editors and return the replacement catalog. */
    refresh(): Promise<EditorCatalog>;
}
/** Stable external-store value consumed by every Workspace/header launcher. */
export interface EditorCatalogSnapshot {
    catalog: EditorCatalog | undefined;
    loading: boolean;
}
/** Browser-owned catalog cache whose refresh replaces every mounted consumer. */
export declare class EditorCatalogController {
    private readonly source;
    private snapshot;
    private readonly listeners;
    private inFlight;
    private generation;
    /** @param source - strict Remote list and refresh calls. */
    constructor(source: EditorCatalogSource);
    /** Current stable external-store value. */
    readonly getSnapshot: () => EditorCatalogSnapshot;
    /** Subscribe one mounted launcher to catalog replacements. */
    readonly subscribe: (listener: () => void) => (() => void);
    private publish;
    /** Load once, sharing the request across every concurrently mounted launcher. */
    load(): Promise<EditorCatalog>;
    /** Force Host re-detection and replace the shared catalog on success. */
    refresh(): Promise<EditorCatalog>;
    private start;
    /** Stop future notifications when the plugin client fiber disposes. */
    dispose(): void;
}
/** React binding for the shared catalog plus initial-load failure state. */
export declare function useEditorCatalog(controller: EditorCatalogController): EditorCatalogSnapshot & {
    loadError: boolean;
};
