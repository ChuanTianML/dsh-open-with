/** Imperative feedback surface shared by native and compatibility menu rows. */
export interface OpenWithFeedback {
    showError: (text: string) => void;
    dispose: () => void;
}
/** Mount a transient Toast host directly under the document body. */
export declare function createOpenWithFeedback(document: Document): OpenWithFeedback;
