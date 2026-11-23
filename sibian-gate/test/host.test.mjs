import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const directory = mkdtempSync(join(tmpdir(), 'sibian-gate-'))
const stateFile = join(directory, 'state.json')
process.env.SIBIAN_GATE_STATE = stateFile
writeFileSync(stateFile, JSON.stringify({ armed: true }))

const { apply } = await import('../index.js')

function makeContext({ roots = ['root'], withConnection = false } = {}) {
  const handlers = {}
  const routes = {}
  const ctx = {
    get(key) {
      if (key === 'agents') return { roots: () => roots.map((id) => ({ id })) }
      if (key === 'connection' && withConnection) {
        return {
          fetch: {
            register(route) {
              routes[route.path] = route
              return async () => {}
            },
          },
        }
      }
      return undefined
    },
    on(name, handler) {
      handlers[name] = handler
    },
    effect(fn) {
      fn()
    },
  }
  return { ctx, handlers, routes }
}

const human = (text) => ({
  role: 'user',
  id: 'm1',
  source: { kind: 'user' },
  content: [{ type: 'text', text }],
})

async function run(handlers, { agent = 'root', turn = 1, messages }) {
  return handlers['agent/pre-step'](
    { agent: { id: agent }, turn, step: 1, messages },
    async () => ({ kind: 'enter', messages, startsRequestSeries: true }),
  )
}

test('prepends the gate to the first human message of a turn', async () => {
  const { ctx, handlers } = makeContext()
  apply(ctx)
  const message = human('帮我把这段仿真跑一下')
  const decision = await run(handlers, { messages: [message] })
  assert.equal(decision.kind, 'enter')
  assert.equal(decision.startsRequestSeries, true)
  assert.equal(decision.messages.length, 1)
  assert.match(decision.messages[0].content[0].text, /^【思辨开关】/)
  assert.equal(decision.messages[0].content[1].text, '帮我把这段仿真跑一下')
  assert.equal(message.content.length, 1, 'original message should not be mutated')
})

test('gates a turn only once', async () => {
  const { ctx, handlers } = makeContext()
  apply(ctx)
  const message = human('继续')
  await run(handlers, { turn: 2, messages: [message] })
  const second = await run(handlers, { turn: 2, messages: [message] })
  assert.equal(second.messages[0].content.length, 1)
})

test('skips non-root agents', async () => {
  const { ctx, handlers } = makeContext({ roots: ['someone-else'] })
  apply(ctx)
  const message = human('子任务')
  const decision = await run(handlers, { agent: 'child', messages: [message] })
  assert.equal(decision.messages[0].content.length, 1)
})

test('skips runtime-context messages', async () => {
  const { ctx, handlers } = makeContext()
  apply(ctx)
  const message = { ...human('runtime'), source: { kind: 'runtime-context' } }
  const decision = await run(handlers, { messages: [message] })
  assert.equal(decision.messages[0].content.length, 1)
})

test('does not double-gate an already gated message', async () => {
  const { ctx, handlers } = makeContext()
  apply(ctx)
  const message = human('原始')
  const first = await run(handlers, { turn: 3, messages: [message] })
  const again = await run(handlers, { turn: 4, messages: [first.messages[0]] })
  assert.equal(again.messages[0].content.length, 2)
})

test('serves state and toggle over the connection route', async () => {
  const { ctx, routes } = makeContext({ withConnection: true })
  apply(ctx)
  const state = await routes['/api/sibian-gate/state'].fetch(
    new Request('http://localhost/api/sibian-gate/state', {
      method: 'POST',
      body: '{}',
    }),
  )
  assert.deepEqual(await state.json(), { ok: true, value: { armed: true } })

  const toggled = await routes['/api/sibian-gate/toggle'].fetch(
    new Request('http://localhost/api/sibian-gate/toggle', {
      method: 'POST',
      body: '{}',
    }),
  )
  assert.deepEqual(await toggled.json(), { ok: true, value: { armed: false } })
  assert.deepEqual(JSON.parse(readFileSync(stateFile, 'utf8')), { armed: false })
})

test('leaves messages untouched while disarmed', async () => {
  const { ctx, handlers } = makeContext()
  apply(ctx)
  const message = human('不要拦我')
  const decision = await run(handlers, { messages: [message] })
  assert.equal(decision.messages[0].content.length, 1)
})
