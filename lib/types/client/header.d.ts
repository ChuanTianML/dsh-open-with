import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
import type { OpenWithInjected } from './row.tsx';
/** Full props supplied to the Session Header utility contribution. */
export type OpenWithHeaderProps = PropsRuntime<'conversation.session.header.utilities'> & PropsLocale<typeof NS> & OpenWithInjected;
/** Render the current registered Workspace's compact Open split button. */
export declare function OpenWithHeader({ sessionId, useWorkspaces, catalog: catalogController, preference, open, showError, t, }: OpenWithHeaderProps): import("react").JSX.Element | null;
