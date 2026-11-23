/**
 * 思辨开关 / Sibian Switch — Host side.
 *
 * Three jobs:
 *   1. Persist one global on/off flag across restarts.
 *   2. Serve POST /api/sibian-gate/state and /toggle on the authenticated
 *      connection fetch channel (same origin as the Web UI).
 *   3. Before the first model step of a turn, prepend a short instruction to
 *      the human message of a root agent: stop, ask three logic questions,
 *      write a five-line decision card, then act.
 *
 * The gate is a nudge, not a hard block: the model can still ignore it. The
 * ledger is written by the model with its normal file tools, so the host does
 * not need to read or proxy the workspace.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

// The two POST routes need the connection service. Declaring it as a
// dependency makes Cordis apply this plugin only once the service exists,
// instead of silently skipping route registration when applied early.
export const inject = ['connection']

const STATE_FILE =
  process.env.SIBIAN_GATE_STATE ||
  join(homedir(), '.dsh', 'storages', 'sibian-gate', 'state.json')

const GATE_PREFIX = '【思辨开关】'

let armed = false

function readArmed() {
  try {
    const parsed = JSON.parse(readFileSync(STATE_FILE, 'utf8'))
    return parsed?.armed === true
  } catch {
    return false
  }
}

function persistArmed(next) {
  armed = next === true
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true })
    const temporary = `${STATE_FILE}.tmp`
    writeFileSync(temporary, `${JSON.stringify({ armed }, null, 2)}\n`, 'utf8')
    renameSync(temporary, STATE_FILE)
  } catch (error) {
    // The switch still works for this process if the state file is read-only.
    console.warn('[sibian-gate] could not persist state:', error)
  }
}

function json(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function gateText() {
  return `${GATE_PREFIX}已开启。动手前先停一下；在完成下面三步之前，除了 ask_user_question 不要调用其他工具。

1. 用一句话复述我的指令，并指出其中隐含的目的、前提和成功标准。
2. 调用 ask_user_question 一次提出 3 个问题，每题给 2–4 个具体选项；每题先在题干里写出你自己的一个反驳或质疑，不要只做中立复述：
   · 目的：这件事要解决的真实问题是什么？不做会怎样？
   · 依据：凭什么相信这样做有效、必要？依据是实测、文献、他人说法，还是习惯？
   · 替代：还有哪条更省力或更可靠的路？为什么当前这条更好？
3. 得到回答后，先把 5 行决策卡追加到当前工作区的 思辨台账.md（不存在就创建）：日期与指令摘要 / 确认后的真实目的 / 关键依据与来源等级（实测·文献·他人·AI·直觉）/ 被否决的替代方案及原因 / 下一步与可证伪的检查点。写完再执行原指令。

如果我回答“跳过 / 直接做 / 别问了”，只在台账追加一行“跳过：<指令摘要>”，然后执行，不要再问。`
}

function messageBlocks(message) {
  if (Array.isArray(message?.content)) return message.content
  if (typeof message?.content === 'string') return [{ type: 'text', text: message.content }]
  return []
}

function isHumanMessage(message) {
  if (!message || message.role !== 'user') return false
  const source = message.source
  return !source || source.kind === 'user'
}

function alreadyGated(message) {
  const first = messageBlocks(message)[0]
  return (
    first?.type === 'text' &&
    typeof first.text === 'string' &&
    first.text.startsWith(GATE_PREFIX)
  )
}

function gateMessage(message) {
  return {
    ...message,
    content: [{ type: 'text', text: gateText() }, ...messageBlocks(message)],
  }
}

function installRoutes(ctx) {
  const connection = ctx.get('connection')
  if (!connection?.fetch?.register) return

  const route = (path, fetch) =>
    ctx.effect(
      () =>
        connection.fetch.register({
          path,
          methods: ['POST'],
          requestBody: 'buffered',
          fetch,
        }),
      `sibian-gate: ${path}`,
    )

  route('/api/sibian-gate/state', async () => json({ ok: true, value: { armed } }))

  route('/api/sibian-gate/toggle', async () => {
    persistArmed(!armed)
    return json({ ok: true, value: { armed } })
  })
}

function installGate(ctx) {
  // One gate per turn. The session log can replay a step; this set keeps the
  // nudge from being injected twice into the same turn.
  const gatedTurns = new Set()

  ctx.on('agent/pre-step', async (payload, next) => {
    const decision = await next()
    if (!armed || decision.kind !== 'enter') return decision

    const agents = ctx.get('agents')
    if (agents?.roots) {
      const isRoot = agents.roots().some((agent) => agent.id === payload.agent.id)
      if (!isRoot) return decision
    }

    const turnKey = `${payload.agent.id}:${payload.turn}`
    if (gatedTurns.has(turnKey)) return decision

    const index = decision.messages.findIndex(isHumanMessage)
    if (index < 0) return decision

    const original = decision.messages[index]
    if (alreadyGated(original)) {
      gatedTurns.add(turnKey)
      return decision
    }

    const messages = decision.messages.slice()
    messages[index] = gateMessage(original)
    gatedTurns.add(turnKey)

    if (gatedTurns.size > 500) {
      gatedTurns.delete(gatedTurns.values().next().value)
    }

    return { ...decision, messages }
  })
}

export function apply(ctx) {
  armed = readArmed()
  installRoutes(ctx)
  installGate(ctx)
}
