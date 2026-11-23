# 发布与更新步骤（仓库所有者）

## 首次发布到 GitHub

1. 在 GitHub 新建**公开**仓库，建议名 `dsh-plugins`（名字随意，后面按实际改）。
2. 把本仓库里所有 `YOUR-ACCOUNT` 替换成你的 GitHub 用户名。涉及文件与位置：
   - `market-index.json`：6 处——两个插件的 `source.url`（2）、`repository.url`（2）、`homepage`（2）；
   - `README.md`：3 处——插件市场索引地址（1）、两条手动安装 spec（2）。
3. 在本目录执行：

   ```bash
   git remote add origin https://github.com/<你的用户名>/dsh-plugins.git
   git push -u origin main
   ```

4. 验证索引可读：浏览器打开
   `https://raw.githubusercontent.com/<你的用户名>/dsh-plugins/main/market-index.json`，
   能看到 JSON 即为发布成功。

5. 分享给同事：让他们在 DSH 插件市场添加上述索引地址，即可安装两个插件。

## 更新插件版本

1. 修改插件代码（`sibian-gate/`、`baihua-polish/` 内），提交。
2. 在 `market-index.json` 对应插件的 `versions` 列表**最前面**新增一条：
   - `version`：递增的新版本号（如 1.0.1）；
   - `publishTimestamp`：提交时间（Unix 秒，`git log -1 --format=%ct` 可得）；
   - `source.commit`：新提交的完整 SHA（`git rev-parse HEAD` 可得）；
   - `source.url`、`source.path` 不变。
3. 提交并推送。索引地址不变，同事在市场里会看到新版本。

> 注意：`versions` 必须按版本号降序排列；`source.url` 只能是干净的 https 地址（不带凭据）。
