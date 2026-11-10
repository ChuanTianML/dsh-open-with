/**
 * dsh-open-with host plugin: mounts the `openWith` Typert Remote
 * service (list, refresh, and open registered Workspace launch targets) and
 * registers its strict Typert manifest. The client half ships in the same
 * package (`./client`); the web server serves it under
 * /plugins/dsh-open-with/client.js, and it registers the split editor
 * launcher into the harness's Workspace overflow-menu slot.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Cordis plugin name (the Loader entry and client bundle id). */
export declare const name = "dsh-open-with";
/** Services required before load: Typert and the authoritative Workspace registry. */
export declare const inject: string[];
/** Deployment configuration: editor discovery, allowlist, and default choice. */
export interface Config {
    /** Discover available built-in editor profiles for this Host platform. */
    autoDetect?: boolean;
    /** Additional or overriding allowlisted editor profiles. */
    editors?: Array<{
        id: string;
        label: string;
        command: string;
        args?: string[];
    }>;
    /** Editor id selected before the browser remembers a user choice. */
    defaultEditor?: string;
}
/**
 * Configuration schema: deployment-varying choices stay tunable from
 * cordis.yml. The inferred schema type keeps the callable form accepting
 * partial input, so `Config({})` yields the defaults (what the Loader does
 * for cordis.yml compositions).
 */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    autoDetect: z<boolean, boolean, "defined">;
    editors: z<({
        id?: string | null | undefined;
        label?: string | null | undefined;
        command?: string | null | undefined;
        args?: string[] | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
        id: z<string, string, "plain">;
        label: z<string, string, "plain">;
        command: z<string, string, "plain">;
        args: z<string[], string[], "defined">;
    }>>[], "defined">;
    defaultEditor: z<string, string, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    autoDetect: z<boolean, boolean, "defined">;
    editors: z<({
        id?: string | null | undefined;
        label?: string | null | undefined;
        command?: string | null | undefined;
        args?: string[] | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
        id: z<string, string, "plain">;
        label: z<string, string, "plain">;
        command: z<string, string, "plain">;
        args: z<string[], string[], "defined">;
    }>>[], "defined">;
    defaultEditor: z<string, string, "defined">;
}>>, "plain">;
/**
 * Mount the open-in-editor service and its strict Typert manifest.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 * @returns completion after the initial editor discovery and service registration.
 */
export declare function apply(ctx: Context, config?: Config): Promise<void>;
