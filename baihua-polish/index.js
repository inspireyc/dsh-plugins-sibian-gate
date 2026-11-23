import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const inject = ['connection'];

const STATE_FILE =
  process.env.BAIHUA_POLISH_STATE ||
  join(homedir(), '.dsh', 'storages', 'baihua-polish', 'state.json');
const MAX_INPUT_CHARS = 16000;

const SYSTEM_PROMPT = [
  '你是「白话润色」编辑：你的任务不是改写观点，而是让读者能看懂 AI 写的报告。',
  '规则：',
  '1. 原文的专业术语第一次出现时，紧跟其后用括号补一句大白话解释。例：「功效与设计未冻结」→「功效与设计未冻结（关键指标要做到多少、方案具体怎么定，还没最后拍板）」；「判据的收口」→「判据的收口（验收标准要最终定死）」。',
  '2. 保持原文的结构、段落、语气和结论完全不变，不增删任何观点。',
  '3. 所有数字、单位、编号（如 V3-01）、文件名、代码块、表格一律原样保留，一个字都不许改。',
  '4. 不要输出任何解释、前言或总结，直接输出润色后的全文。',
].join('\n');

let armed = true;

async function readArmed() {
  try {
    const raw = await readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.armed !== false;
  } catch {
    return true;
  }
}

async function persistArmed(next) {
  await mkdir(dirname(STATE_FILE), { recursive: true });
  const tmp = STATE_FILE + '.tmp';
  await writeFile(tmp, JSON.stringify({ armed: next }));
  await rename(tmp, STATE_FILE);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function resolveRoute(llm) {
  const envProvider = process.env.BAIHUA_POLISH_PROVIDER;
  const envModel = process.env.BAIHUA_POLISH_MODEL;
  if (envProvider && envModel) return { provider: envProvider, model: envModel };
  try {
    const providers = llm.listProviders();
    const list = providers || [];
    const preferred = list.find((p) => p.id === 'deepseek-official') || list[0];
    if (!preferred) return null;
    const models = await llm.listModels(preferred.id);
    if (!models || models.length === 0) return null;
    const model = models.find((m) => m.id === 'deepseek-flash') || models[0];
    return { provider: preferred.id, model: model.id };
  } catch {
    return null;
  }
}

async function handlePolish(ctx, request) {
  if (!armed) {
    return json(
      { ok: false, error: '白话润色开关未打开：请先在左侧边栏「白话润色」面板打开开关。' },
      403
    );
  }
  const llm = ctx.get('llm');
  if (!llm) {
    return json({ ok: false, error: 'LLM 服务不可用，暂时无法润色。' }, 503);
  }
  const body = await readBody(request);
  if (!body || typeof body.text !== 'string' || !body.text.trim()) {
    return json({ ok: false, error: '没有收到要润色的文本。' }, 400);
  }
  const text = body.text.trim();
  if (text.length > MAX_INPUT_CHARS) {
    return json(
      {
        ok: false,
        error:
          '这段文字太长（' +
          text.length +
          ' 字符，上限 ' +
          MAX_INPUT_CHARS +
          '），请选中部分内容再润色。',
      },
      400
    );
  }
  const route = await resolveRoute(llm);
  if (!route) {
    return json({ ok: false, error: '没有可用的模型路由，请检查 LLM 配置。' }, 503);
  }
  try {
    let out = '';
    const stream = llm.stream({
      provider: route.provider,
      model: route.model,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [{ type: 'text', text }] }],
      temperature: 0.3,
      maxTokens: 8192,
    });
    for await (const chunk of stream) {
      if (chunk.type === 'text-delta' && chunk.text) out += chunk.text;
      else if (chunk.type === 'finish' && chunk.reason && chunk.reason.kind !== 'stop') {
        return json(
          { ok: false, error: '模型中断：' + chunk.reason.kind + '，请重试。' },
          502
        );
      }
    }
    if (!out.trim()) return json({ ok: false, error: '模型没有返回内容，请重试。' }, 502);
    return json({ ok: true, text: out.trim() });
  } catch (err) {
    return json(
      { ok: false, error: '润色失败：' + String((err && err.message) || err) },
      502
    );
  }
}

export function apply(ctx) {
  const connection = ctx.get('connection');
  const register = (path, fetch) =>
    ctx.effect(
      () =>
        connection.fetch.register({
          path,
          methods: ['POST'],
          requestBody: 'buffered',
          fetch,
        }),
      'baihua-polish: ' + path
    );

  register('/api/baihua-polish/state', async () => json({ ok: true, value: { armed } }));
  register('/api/baihua-polish/toggle', async () => {
    armed = !armed;
    await persistArmed(armed);
    return json({ ok: true, value: { armed } });
  });
  register('/api/baihua-polish/polish', (request) => handlePolish(ctx, request));

  readArmed().then((value) => {
    armed = value;
  });
}
