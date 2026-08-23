/**
 * dsh-open-with client plugin: the browser half of the workspace
 * editor launcher. Mounts the openWith Remote namespace, contributes a
 * Session Header split button, and keeps the Workspace overflow-menu action
 * for compatibility. Both entry points ask the Host to resolve the registered
 * Workspace and allowlisted editor.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** Required services: slots, the gateway Remote face, and locale. */
export declare const inject: string[];
/**
 * Compose the workspace overflow-menu row.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
