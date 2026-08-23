import { type OpenWithMenuRowProps } from './row.tsx';
interface WorkspaceItem {
    workspaceId: string;
    title: string;
    path: string;
}
interface WorkspaceListSource {
    getSnapshot(): {
        items: readonly WorkspaceItem[];
    };
}
export interface LegacyWorkspaceMenuOptions {
    workspaces: WorkspaceListSource;
    workspaceT: WorkspaceTranslate;
    rowT: OpenWithMenuRowProps['t'];
    catalog: OpenWithMenuRowProps['catalog'];
    preference: OpenWithMenuRowProps['preference'];
    open: OpenWithMenuRowProps['open'];
    showError: OpenWithMenuRowProps['showError'];
}
type WorkspaceTranslate = (key: 'actions.workspace.aria' | 'rename' | 'delete.workspace', params?: Record<string, unknown>) => string;
/**
 * Make Harness's hover-only Workspace action cluster keyboard reachable.
 * Tab reveals only action groups whose aria-label resolves to one registered
 * Workspace; the next pointer interaction restores the owner stylesheet.
 */
export declare function installWorkspaceActionKeyboardAccess(workspaces: WorkspaceListSource, t: WorkspaceTranslate): () => void;
/**
 * Add the editor launcher to the published rc.6 Workspace menu.
 * @returns disposer removing listeners, observers, and any mounted row.
 */
export declare function installLegacyWorkspaceMenu(options: LegacyWorkspaceMenuOptions): () => void;
export {};
