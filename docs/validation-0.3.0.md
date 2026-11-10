# Open With 0.3.0 validation

## Runtime

This version requires Harness >=0.2.2-rc.1 and <0.3.0, with Node >=24.9.0.
Development uses the official dsh-v0.2.2-rc.1 tag; browser acceptance can use
an independently installed official npm CLI through DSH_TEST_CLI.

## Regression

Installing the unchanged 0.2.1 artifact in a fresh profile on official Harness
0.2.2-rc.1 fails Host registration with `result strict codec has no create()
factory`. The client also refers to removed client-runtime and sized icon
exports. Version 0.3.0 uses lazy codec factories and current client services.

Windows CI also exposed a PATH resolver mixing its explicit target platform
with the runner's path separator and join operation. The resolver now uses
POSIX or Windows path rules consistently; the existing cross-platform
executable-resolution scenario covers this behavior.

The retired invariant companion is excluded from this version's exports.
The default Host plugin, allowed-editor checks, credential filtering, and
Workspace identity lookup retain their responsibilities.

## Repeatable checks

- `pnpm run check`: source/test type checks, ESLint, unit and real Cordis/Typert
  composition tests, and Host/browser/type artifact builds.
- `pnpm run pack:check`: inspect the published file set without running scripts.
- `pnpm run test:browser`: install the packed plugin through the official CLI
  into a new temporary DSH_HOME, seed synthetic session data through official
  persistence APIs, create its registered Workspace, and start the Web app.

The browser scenario launches a harmless Node editor fixture for the primary
and alternate choices and the Workspace-menu entry, verifies the exact Workspace
directory and removal of a synthetic secret environment variable, reloads the saved preference, refreshes
the catalog, and checks unavailable editors and browser errors. Desktop and
narrow-viewport screenshots are retained under the printed evidence directory.
It does not invoke a model or open a user's editor or project.

`PLAYWRIGHT_EXECUTABLE_PATH` optionally selects an installed test Chromium.
`DSH_TEST_PACKAGE=dsh-open-with@0.3.0` repeats acceptance against npm instead of
the local tarball. CI repeats the checks on Linux and Windows with Node 24.15.0.
Chromium is the browser acceptance target; other browsers are not claimed tested.

## Local result — 2026-11-10

On macOS arm64 with Node 24.15.0 and official npm Harness 0.2.2-rc.1,
`pnpm run check` passed all 54 tests across 14 files, lint, type checks, and
artifact builds. The fresh-profile browser scenario passed against the
packed 0.3.0 artifact. Linux and Windows remain subject to CI results.

## Publication

After publication, compare registry integrity with the validated tarball and
repeat browser acceptance using DSH_TEST_PACKAGE. Verify that the Hub catalog
identifies ChuanTianML/dsh-open-with, maps to npm dsh-open-with, and reports the
published version and compatibility. Request a catalog correction if it differs;
an open request is pending synchronization, not confirmed market availability.
