# 白话润色（@local/dsh-baihua-polish）

把 AI 报告里的专业术语配上大白话解释，让每次输出都能看懂。

## 功能

- 侧边栏新增「白话润色」面板：一个总开关（状态保存在本机 `~/.dsh/storages/baihua-polish/state.json`）。
- 每条回答右下角新增「白话解释」按钮：点击后把该条消息正文交给 LLM 润色——
  专业术语第一次出现时用括号补大白话解释，结构与结论不变，数字、代码、编号原样保留。
- 结果在右下角浮窗显示，可复制、可关闭。

## 边界

- 只润色手动点击的那一条消息，聊天/代码/数据不会被自动改动。
- 润色路由默认 `deepseek-official / deepseek-flash`（运行时回退到首个可用路由），
  可用环境变量 `BAIHUA_POLISH_PROVIDER` / `BAIHUA_POLISH_MODEL` 覆盖。
- 单次润色上限 16000 字符，超长请分段。
