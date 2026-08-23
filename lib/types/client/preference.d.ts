/** One shared browser-local preferred editor across row and Header launchers. */
import type { EditorCatalog, EditorView } from '../types.ts';
/** Browser preference store; persistence denial never blocks editor launch. */
export declare class EditorPreference {
    private readonly storage;
    private value;
    private readonly listeners;
    /** @param storage - browser-local storage, or undefined when unavailable. */
    constructor(storage?: Storage | undefined);
    /** Current preferred editor id. */
    readonly getSnapshot: () => string | undefined;
    /** Subscribe one mounted launcher to successful selections. */
    readonly subscribe: (listener: () => void) => (() => void);
    /** Record a successfully launched editor and notify every launcher. */
    select(editorId: string): void;
    /** Stop future notifications when the plugin client fiber disposes. */
    dispose(): void;
}
/** Resolve the available primary target from browser and Host preferences. */
export declare function preferredEditor(catalog: EditorCatalog, storedId: string | undefined): EditorView | undefined;
