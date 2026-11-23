# dsh-plugins：思辨开关 + 白话润色

两个面向学术科研场景的 DeepSeek Harness（DSH）插件，一起发布到插件市场。

| 目录 | 插件 | 作用 |
| --- | --- | --- |
| `sibian-gate/` | 思辨开关 | 每条指令动手前先停一下，问清目的、依据和替代方案，并把决策写入台账 |
| `baihua-polish/` | 白话润色 | 对报告类输出做"去术语"润色：专业词汇首次出现时配上大白话解释，结构与结论不动 |

## 安装（推荐：插件市场）

1. 打开 DSH 的插件市场（插件管理器 → 市场），添加索引地址：

   ```
   https://raw.githubusercontent.com/YOUR-ACCOUNT/dsh-plugins/main/market-index.json
   ```

2. 在市场列表里找到「思辨开关」「白话润色」，点安装。
3. 安装后左侧边栏会出现两个面板图标；白话润色会在每条 AI 回答右下角的操作按钮里加一个「白话解释」。

> 索引地址指向本仓库 `main` 分支的 `market-index.json`，仓库更新后索引自动更新。

## 安装（手动方式）

```bash
# 思辨开关（状态存于 ~/.dsh/storages/sibian-gate/state.json）
pnpm add @local/dsh-sibian-gate@git+https://github.com/YOUR-ACCOUNT/dsh-plugins.git#main --config.pnpm.path=sibian-gate
```

或直接把 `sibian-gate/`、`baihua-polish/` 目录拷到本地后，用 DSH 的「安装本地包」指向对应目录。

## 使用

- **思辨开关**：侧边栏打开开关后，每次发指令都会先进入"复述 → 三问 → 台账"三步；回答"跳过/直接做/别问了"可跳过。
- **白话润色**：侧边栏面板里打开开关，然后在任意一条 AI 回答右下角点「白话解释」，弹窗里就是配了白话解释的版本，可一键复制。

## 配置

| 插件 | 环境变量 | 说明 |
| --- | --- | --- |
| 思辨开关 | `SIBIAN_GATE_STATE` | 状态文件路径，默认 `~/.dsh/storages/sibian-gate/state.json` |
| 白话润色 | `BAIHUA_POLISH_STATE` | 状态文件路径，默认 `~/.dsh/storages/baihua-polish/state.json` |
| 白话润色 | `BAIHUA_POLISH_PROVIDER` / `BAIHUA_POLISH_MODEL` | 指定润色用的模型路由，默认自动选 deepseek-official / deepseek-flash |

## 开发

- 两个插件都是 DSH bundle：Host 端 `index.js`（路由/逻辑）+ Web 客户端 `client.js`（面板/按钮），清单见各自 `package.json` 与 `cordis.patch.yml`。
- 思辨开关的设计讨论见 `docs/00-方案讨论.md`。

## 许可证

MIT，见 `LICENSE`。
