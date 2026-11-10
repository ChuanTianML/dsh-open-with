/* global console, setTimeout, clearTimeout */
/** Validate the real CLI-installed plugin with a harmless editor subprocess. */
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { chromium } from 'playwright'
import { seed } from '../integration/seed.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const work = await mkdtemp(join(tmpdir(), 'open-with-browser-'))
const cli = resolve(process.env.DSH_TEST_CLI ?? join(process.env.DSH_HARNESS_ROOT ?? join(root, '.sandbox/harness'), 'apps/cli/lib/bin.js'))
const env = { ...process.env, DSH_HOME: join(work, 'home'), DEEPSEEK_API_KEY: '', OPEN_WITH_TEST_SECRET: 'synthetic-secret' }
let server
let browser
let page
try {
  await seed(cli, env.DSH_HOME)
  const workspacePath = await realpath(join(env.DSH_HOME, 'workspace'))
  const packed = process.env.DSH_TEST_PACKAGE ? null : JSON.parse(execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--ignore-scripts', '--json', '--cache', join(work, 'cache'), '--pack-destination', work], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' }))
  const target = process.env.DSH_TEST_PACKAGE ?? join(work, packed[0].filename)
  execFileSync(process.execPath, [cli, 'plugin', '--profile', 'web', 'add', target], { env, stdio: 'pipe' })
  const marker = join(work, 'editor.log')
  const editor = join(work, 'editor.mjs')
  await writeFile(editor, `import { appendFileSync } from 'node:fs'\nappendFileSync(${JSON.stringify(marker)}, JSON.stringify({ editor: process.argv[2], cwd: process.argv[3], secret: process.env.OPEN_WITH_TEST_SECRET ?? null }) + '\\n')\n`)
  const fixture = join(work, 'workspace-fixture.mjs')
  await writeFile(fixture, `export const inject = ['workspaceRegistry']\nexport async function apply(ctx) {\n const workspace = await ctx.workspaceRegistry.create(${JSON.stringify(join(env.DSH_HOME, 'workspace'))})\n await workspace.attachSession('open-with-validation')\n}\n`)
  const patch = join(work, 'test.patch.yml')
  await writeFile(patch, [
    '- id: session-persistence-jsonl', '  config:', `    root: ${JSON.stringify(join(env.DSH_HOME, 'sessions'))}`, '    compression: none',
    '- id: open-with-fixture', `  name: ${JSON.stringify(fixture)}`,
    '- id: dsh-open-with', '  config:', '    autoDetect: false', '    defaultEditor: first', '    editors:',
    '      - id: first', '        label: Fixture editor', `        command: ${JSON.stringify(process.execPath)}`, `        args: ${JSON.stringify([editor, 'first'])}`,
    '      - id: second', '        label: Second fixture editor', `        command: ${JSON.stringify(process.execPath)}`, `        args: ${JSON.stringify([editor, 'second'])}`,
    '      - id: missing', '        label: Unavailable fixture editor', '        command: dsh-open-with-nonexistent-test-command', '',
  ].join('\n'))
  server = spawn(process.execPath, [cli, 'web', '--patch', patch, '--no-open', '--port', '0'], { env, cwd: work, stdio: ['ignore', 'pipe', 'pipe'] })
  const url = await new Promise((resolveUrl, reject) => {
    let output = ''
    const timer = setTimeout(() => reject(new Error('Harness startup timed out')), 60000)
    const receive = data => {
      output += data
      const match = output.match(/dsh web: (http:\/\/127[^\s]+)/u)
      if (match) { clearTimeout(timer); resolveUrl(match[1]) }
    }
    server.stdout.on('data', receive)
    server.stderr.on('data', receive)
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Harness exited ${code}: ${output.replace(/token=[^\s]+/gu, 'token=[omitted]')}`)) })
  })
  browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {})
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.setDefaultTimeout(20000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url)
  await page.addLocatorHandler(page.getByRole('button', { name: 'Continue', exact: true }), locator => locator.click())
  await page.addLocatorHandler(page.getByText('Get started', { exact: true }), () => page.keyboard.press('Escape'))
  await page.getByText('Workspaces', { exact: true }).waitFor()
  const workspace = page.locator('[data-row-key^="workspace:"]').first()
  const sessionRow = page.locator('[data-row-key="session:open-with-validation"]')
  await workspace.waitFor({ state: 'visible' })
  // Initial root-state hydration can replace the preview's expansion state.
  for (let attempt = 0; attempt < 4 && !await sessionRow.isVisible(); attempt++) {
    if (await workspace.getAttribute('aria-expanded') === 'false') await workspace.click()
    try { await sessionRow.waitFor({ state: 'visible', timeout: 3000 }) }
    catch (error) { if (error.name !== 'TimeoutError') throw error }
  }
  await sessionRow.click()
  const primary = page.locator('.dsh-open-with-header-primary')
  await primary.waitFor({ state: 'visible' })
  await primary.click()
  async function launches(count) {
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        const entries = (await readFile(marker, 'utf8')).trim().split('\n').map(line => JSON.parse(line))
        if (entries.length >= count) return entries
      } catch (error) { if (error.code !== 'ENOENT') throw error }
      await new Promise(resolveDelay => setTimeout(resolveDelay, 50))
    }
    throw new Error(`Expected ${count} editor launches`)
  }
  let entries = await launches(1)
  assert.equal(entries[0].editor, 'first')
  assert.equal(entries[0].cwd, workspacePath)
  assert.equal(entries[0].secret, null)
  await page.locator('.dsh-open-with-header-chooser').click()
  assert.equal(await page.getByRole('menuitem', { name: /Unavailable fixture editor/ }).isDisabled(), true)
  await page.getByRole('menuitem', { name: 'Second fixture editor', exact: true }).click()
  entries = await launches(2)
  assert.equal(entries[1].editor, 'second')
  assert.equal(entries[1].cwd, workspacePath)
  assert.equal(entries[1].secret, null)
  await page.reload()
  await primary.waitFor({ state: 'visible' })
  assert.match(await primary.getAttribute('aria-label'), /Second fixture editor/u)
  await page.locator('.dsh-open-with-header-chooser').click()
  await page.getByRole('menuitem', { name: 'Refresh editors', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Refresh editors', exact: true }).waitFor({ state: 'visible' })
  assert.equal(await page.getByRole('menuitem', { name: 'Refresh editors', exact: true }).isDisabled(), false)
  await page.screenshot({ path: join(work, 'open-with-desktop.png'), fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 700, height: 900 })
  await page.screenshot({ path: join(work, 'open-with-narrow.png'), fullPage: true, animations: 'disabled' })
  assert.deepEqual(errors, [])
  console.log('PASS: real CLI install, Remote registration, header default/chooser launches, preference reload, refresh, unavailable editor, credential filtering, no page errors')
  console.log(`Evidence: ${work}`)
} catch (error) {
  if (page) {
    console.error(await page.locator('body').innerText())
    await page.screenshot({ path: join(work, 'failure.png'), fullPage: true, animations: 'disabled' })
  }
  console.error(`Evidence: ${work}`)
  throw error
} finally {
  await browser?.close()
  server?.kill('SIGTERM')
}
