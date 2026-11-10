/** Create a synthetic current-format session through the official persistence API. */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export async function seed(cli, home) {
  const require = createRequire(cli)
  const load = name => import(pathToFileURL(require.resolve(name)).href)
  const { Context } = await load('@deepseek-ai/cordis')
  const { Session, SessionId } = await load('@deepseek-ai/dsh-session')
  const persistence = await load('@deepseek-ai/dsh-session-persistence-jsonl')
  const { createMessage } = await load('@deepseek-ai/dsh-llm')
  const workspace = join(home, 'workspace')
  await mkdir(workspace, { recursive: true })
  const session = Session.create(SessionId('open-with-validation'), [], {
    version: 4, id: SessionId('open-with-validation'), createdAt: Date.now(),
    isSeeded: false, delegationDepth: 0, cwd: workspace, agentPreset: 'standard',
  })
  session.append('session/title', { title: 'Open With validation', messageSeqs: [], source: { kind: 'user' } })
  for (let turn = 1; turn <= 2; turn++) {
    session.append('user/message', createMessage({ role: 'user', source: { kind: 'user' }, content: [
      { type: 'text', text: `Turn ${turn}: inspect this synthetic workspace` },
    ] }), { surfaceOp: 'append' })
    session.append('turn/start', { turn })
    session.append('step/start', { turn, step: 1 })
    session.append('assistant/message', { turn, step: 1, stream: [], message: createMessage({
      role: 'assistant', source: { kind: 'model', provider: 'fixture', model: 'fixture' },
      content: [{ type: 'text', text: `## Answer ${turn}\n\nSynthetic result.\n\n| Item | Result |\n| --- | --- |\n| Export | Success |` }],
    }) }, { surfaceOp: 'append' })
    session.append('step/end', { turn, step: 1 })
    session.append('turn/end', { turn, reason: { kind: 'completed' } })
  }
  const ctx = new Context()
  const fiber = ctx.plugin(persistence, { root: join(home, 'sessions'), compression: 'none' })
  await fiber
  try {
    const handle = await ctx.sessionPersistence.create(session.header)
    try { await handle.append(session.snapshotEvents()); await handle.flush() }
    finally { await handle.close() }
  } finally { await fiber.dispose() }
}
