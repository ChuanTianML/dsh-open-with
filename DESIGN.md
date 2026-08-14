# dsh-open-with design

## Product contract

`dsh-open-with` is a multi-editor Workspace launcher. Its name follows the familiar desktop “Open with…” interaction and deliberately avoids promising one specific editor.

The Workspace overflow menu contains a split action:

- the primary side opens the Workspace with the Host-configured or browser-remembered editor;
- the chooser side lists every detected or configured launch target;
- choosing an available target launches it and stores that editor id in browser-local state;
- configured targets that cannot be resolved stay visible and disabled with a repair hint;
- unavailable automatic candidates are omitted.

## Architecture

The browser mounts the strict `openWith/list` and `openWith/open` Typert descriptors shared with the Host manifest. `list` returns only browser-safe catalog fields. `open` accepts a `workspaceId` and an `editorId`.

The Host owns both privileged resolutions:

1. `workspaceId` resolves through `ctx.workspaceRegistry`; an unknown registration or missing directory is rejected.
2. `editorId` resolves through the plugin's load-time allowlist; an unknown or unavailable target is rejected.
3. The resolved command receives its fixed arguments followed by the authoritative Workspace path and starts as a detached process.

Paths, commands, and arguments never travel from the browser to the Host. A forged browser request therefore cannot select an arbitrary filesystem path or executable.

## Editor registry

`autoDetect: true` probes deterministic built-in profiles for the current Host platform. PATH is supported everywhere; macOS and Windows profiles also include known application locations where appropriate.

`editors` contains operator-trusted profiles with stable ids. A custom profile can replace a built-in by using the same id, or append a new profile with a new id. Custom profiles remain visible when their executable is missing so configuration failures are diagnosable.

`defaultEditor` selects the initial available id. If it is unavailable, the catalog falls back to the first available target and finally to the first configured missing target so the UI can still explain the failure.

## Compatibility

The native contribution uses the Harness-owned `sidebar.workspaces.row-menu` slot. Until that slot declaration is available in a client build, the plugin keeps the existing scoped DOM adapter. Both paths render the same component and call the same Host API.

There is intentionally no compatibility contract with `dsh-open-in-vscode`: this is a separately named plugin with a clean `openWith` service namespace and a `0.1.0` release line.

## Failure and lifecycle rules

- Catalog loading and launch failures are logged without throwing through React event handlers.
- Browser preference storage is optional; denial does not block launch.
- Typert, locale, slot, legacy adapter, and process listeners are registered through disposable effects.
- A cancellation received before process spawn rejects the operation; after a detached process is accepted, DSH does not own its lifetime.

## Verification strategy

- platform-resolution tests cover built-ins, PATH, standard Windows locations, overrides, missing targets, invalid ids, and an empty registry;
- strict-contract tests prove Host and client share the same descriptors and codecs;
- composition tests mount real Cordis and Typert services around a fixture executable and verify Workspace/editor rejection plus disposal;
- client tests cover direct action, chooser selection, disabled targets, preference memory, locale copy, rc.6 adaptation, and error handling;
- an isolated local Web profile uses fixture editor processes to verify the real menu-to-Host path without launching user applications.

## Non-goals

The plugin does not install editors, clone or synchronize repositories, read or write Workspace content, embed an editor, expose model tools, or accept arbitrary launch commands from browser input.
