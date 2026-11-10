/** Link development packages from an explicitly selected, isolated Harness checkout. */
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, symlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { URL, fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const harness = resolve(process.env.DSH_HARNESS_ROOT ?? join(root, '.sandbox/harness'))
if (!existsSync(join(harness, 'package.json'))) throw new Error(`Harness checkout not found: ${harness}`)
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const wanted = new Set([...Object.keys(manifest.peerDependencies), '@deepseek-ai/schemastery'].filter(name => name.startsWith('@deepseek-ai/')))
const targets = new Map()
function visit(directory, depth) {
  const file = join(directory, 'package.json')
  if (existsSync(file)) {
    const pkg = JSON.parse(readFileSync(file, 'utf8'))
    if (wanted.has(pkg.name)) targets.set(pkg.name, directory)
    return
  }
  if (depth === 0) return
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== 'node_modules') visit(join(directory, entry.name), depth - 1)
  }
}
visit(join(harness, 'packages'), 3)
visit(join(harness, 'vendor'), 2)
for (const name of wanted) {
  const target = targets.get(name)
  if (!target) throw new Error(`Harness package not found: ${name}`)
  const link = join(root, 'node_modules', ...name.split('/'))
  mkdirSync(dirname(link), { recursive: true })
  if (existsSync(link)) {
    if (lstatSync(link).isSymbolicLink() && realpathSync(link) === realpathSync(target)) continue
    throw new Error(`Refusing to replace existing dependency: ${link}`)
  }
  symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir')
}
