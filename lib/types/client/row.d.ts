import type { GlobalStandardProps, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { EditorCatalog } from '../types.ts';
import { type OpenWithKey } from './locales.ts';
/** Host-backed actions supplied to every row contribution. */
export interface OpenWithInjected {
    /** Load the browser-safe editor catalog. */
    listEditors: () => Promise<EditorCatalog>;
    /** Open a registered Workspace in one catalog editor. */
    open: (workspaceId: string, editorId: string) => Promise<void>;
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The workspace editor-launcher copy. */
        'open-with': OpenWithKey;
    }
}
/** Owner props supplied by the native workspace row-menu slot. */
export interface WorkspaceRowOwnerProps {
    workspaceId: string | undefined;
    label: string;
    cwd: string | undefined;
    onClose: () => void;
}
/** Full native row props without assuming an unpublished SlotMap declaration. */
export type OpenWithRowProps = WorkspaceRowOwnerProps & GlobalStandardProps & PropsLocale<'open-with'> & OpenWithInjected;
/** Minimal presentation props shared by the native slot and legacy adapter. */
export interface OpenWithMenuRowProps extends OpenWithInjected {
    workspaceId: string | undefined;
    label: string;
    onClose: () => void;
    t: OpenWithRowProps['t'];
    /** Launch the primary action on pointerdown when the legacy menu unmounts before click. */
    eagerPointerActivation?: boolean;
}
/** Render the locale-following editor launcher for one Workspace row. */
export declare function OpenWithMenuRow({ workspaceId, label, onClose, listEditors, open, t, eagerPointerActivation, }: OpenWithMenuRowProps): import("react").JSX.Element | null;
/** Native row-menu slot entry. */
export declare function OpenWithRow(props: OpenWithRowProps): import("react").JSX.Element;
