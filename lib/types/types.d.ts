/** Host configuration and resolved editor-registry types. */
/** One operator-configured editor profile. */
export interface EditorConfig {
    /** Stable browser-visible id; commands never cross the wire. */
    id: string;
    /** Product label shown in the Open with menu. */
    label: string;
    /** Executable resolved through PATH or an absolute path. */
    command: string;
    /** Arguments placed before the workspace directory. */
    args: string[];
}
/** Configuration after schema defaults are applied. */
export interface ResolvedConfig {
    /** Add available built-in editor profiles for the current platform. */
    autoDetect: boolean;
    /** Additional or overriding operator-configured profiles. */
    editors: EditorConfig[];
    /** Preferred editor before the browser records a user choice. */
    defaultEditor: string;
}
/** One Host-discovered launch route attached to a built-in editor id. */
export interface DiscoveredEditorLaunch {
    /** Built-in editor id that owns this launch route. */
    id: string;
    /** Absolute executable path discovered from a platform-owned source. */
    command: string;
    /** Fixed arguments placed before the Workspace directory. */
    args: readonly string[];
}
/** One resolved Host launch target. */
export interface ResolvedEditor {
    id: string;
    label: string;
    command: string;
    args: readonly string[];
    available: boolean;
    hint?: string;
}
/** Browser-safe editor metadata. */
export interface EditorView {
    id: string;
    label: string;
    available: boolean;
    hint?: string;
}
/** Browser-safe editor list and Host-selected default. */
export interface EditorCatalog {
    editors: readonly EditorView[];
    defaultEditorId: string;
}
