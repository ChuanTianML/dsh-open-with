# dsh-open-with design

## Product contract

`dsh-open-with` is a multi-editor Workspace launcher. Its name follows the familiar desktop “Open with…” interaction and deliberately avoids promising one specific editor.

The primary interaction is a compact split action in `conversation.session.header.utilities`. It is rendered only when the current session id occurs in one registered Workspace's `sessionIds`. The Workspace overflow menu exposes the same actions for compatibility.

- the primary side opens the Workspace with the Host-configured or browser-remembered editor;
- the chooser side lists every detected or configured launch target;
- choosing an available target launches it and stores that editor id in browser-local state;
- configured targets that cannot be resolved stay visible and disabled with a repair hint;
- unavailable automatic candidates are omitted.
- a refresh footer re-runs Host discovery and replaces every mounted launcher's catalog together.

## Architecture

The browser mounts the strict `openWith/list`, `openWith/open`, and `openWith/refresh` Typert descriptors shared with the Host manifest. `list` and `refresh` return only browser-safe catalog fields. `open` accepts a `workspaceId` and an `editorId`.

The Host owns every privileged resolution and process decision:

1. `workspaceId` resolves through `ctx.workspaceRegistry`; an unknown registration or missing directory is rejected.
2. `editorId` resolves through the plugin's load-time allowlist; an unknown or unavailable target is rejected.
3. The resolved command receives its fixed arguments followed by the authoritative Workspace path and starts as a detached process.
4. The child environment preserves desktop state while removing credential-bearing variables. Windows launches set `windowsHide: false` so the first editor window remains visible.

Paths, commands, and arguments never travel from the browser to the Host. A forged browser request therefore cannot select an arbitrary filesystem path or executable.

## Editor registry

`autoDetect: true` probes deterministic built-in profiles for the current Host platform. PATH is supported everywhere; macOS and Windows profiles also include known application locations where appropriate. Windows discovery additionally queries the four user/machine App Paths registry roots and descends only through known products under the JetBrains Toolbox apps directory. It never scans arbitrary drives or Workspace content.

The initial resolution and every `refresh()` use the same resolver. Concurrent refreshes share one detection pass. A successful pass builds both the command allowlist and browser catalog before publishing either; a failed pass preserves the last usable pair.

`editors` contains operator-trusted profiles with stable ids. A custom profile can replace a built-in by using the same id, or append a new profile with a new id. Custom profiles remain visible when their executable is missing so configuration failures are diagnosable.

`defaultEditor` selects the initial available id. If it is unavailable, the catalog falls back to the first available target and finally to the first configured missing target so the UI can still explain the failure.

## Compatibility

The native contribution uses the Harness-owned `sidebar.workspaces.row-menu` slot. Until that slot declaration is available in a client build, the plugin keeps the existing scoped DOM adapter. Both paths render the same component and call the same Host API.

There is intentionally no compatibility contract with `dsh-open-in-vscode`: this is a separately named plugin with a clean `openWith` service namespace and a `0.1.0` release line.

## Failure and lifecycle rules

- Catalog loading failures stay in the menu. Launch failures preserve the prior preference and appear in a persistent root-level Toast that outlives the Workspace menu.
- On compatibility clients, pressing Tab temporarily reveals the aria-matched Workspace action cluster so the hover-only Harness affordance is keyboard reachable.
- Browser preference storage is optional; denial does not block launch.
- One browser catalog controller and one preference controller feed every Header and Workspace-menu entry, so refreshes and successful selections are immediately consistent across the UI.
- Typert, locale, slot, legacy adapter, and process listeners are registered through disposable effects.
- A cancellation received before process spawn rejects the operation; after a detached process is accepted, DSH does not own its lifetime.

## Verification strategy

- platform-resolution tests cover built-ins, PATH, standard Windows locations, App Paths, bounded Toolbox discovery, overrides, missing targets, invalid ids, and an empty registry;
- strict-contract tests prove Host and client share the same descriptors and codecs;
- composition tests mount real Cordis and Typert services around a fixture executable and verify Workspace/editor rejection plus disposal;
- client tests cover Header-to-Workspace accounting, direct action, chooser selection, hot refresh, disabled targets, preference memory, locale copy, rc.6 adaptation, and error handling;
- process tests cover Windows window visibility and credential-environment isolation while preserving desktop variables;
- an isolated local Web profile uses fixture editor processes to verify the real menu-to-Host path without launching user applications.

## Non-goals

The plugin does not install editors, clone or synchronize repositories, read or write Workspace content, embed an editor, expose model tools, or accept arbitrary launch commands from browser input.
