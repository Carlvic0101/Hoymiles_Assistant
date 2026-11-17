# SDD 项目

本项目由 SDD Harness 管理。身份、项目类型和规范选择见 `.sdd/project.json`。

- `docs/PRD.md`：需求、业务规则和验收标准。
- `docs/tech-spec.md`：技术方案、接口与数据约定。
- `.sdd/tasks.json`：任务和运行状态，由编排器维护。
- `docs/ui-style.md`：有界面时的设计风格，由 UI Skill 生成并供实现、验收引用。
- `docs/prototypes/`：可选界面设计。
- `.sdd/`：阶段摘要、工作日志、经验与验证报告。

`specification` 为集合名称时按需读取该集合，为 `null` 时不加载规范集。核心工作规则位于 Harness 根目录；本项目 `AGENTS.md` 提供轻量入口。

交付时在本 README 补充实际环境、配置、启动方法和验证结果。

## 当前开发目录与接续（2026-11-10）

后续修改、提交和推送以此目录为准：

```text
C:\Users\Administrator\Documents\ChatGPT\禾迈Hoymiles_AI销售助手\Hoymiles_SalesAssistant
```

GitHub：<https://github.com/Carlvic0101/Hoymiles_Assistant>。UI/UX skill 的上游仓库不是本项目的推送目标。

当前电脑的仓库级 Git 配置使用原有 SSH 身份，通过 `ssh.github.com:443` 连接，并使用已信任的 `github.com` 主机密钥、保持严格校验。该连接配置仅写在本仓库，不改全局 SSH 设置，不将私钥上传到仓库。

本轮交付的是 `docs/prototypes/` 下的静态前端，包含选型、报价、标书、合同、诊断的执行过程、业务结果与归档交互。没有接入真实业务后端，也不代表正式 SDD 开发任务完成。

### 在线分享（2026-11-17 更新）

访问地址：<https://hoymiles-sales-assistant.earnedsheep1.chatgpt.site>，网页及站点名称为 **Hoymiles Assistant**。已通过 Sites 发布为持链接可访问，无需 ChatGPT 账号，也不依赖本机开机。进入页面后使用下方体验账号登录。

- 李航：`li.hang@hoymiles.local`；周宁：`zhou.ning@hoymiles.local`；口令均为 `demo123`。初次打开登录页时密码为空，体验者点击邮箱框选择账号后才自动填入密码，再点击登录即可，无须另行告知口令。手动修改邮箱、退出或刷新登录页后密码恢复为空；鼠标和键盘均可选择账号。页面登录仅体现当前前端角色交互，不是正式身份认证。
- 五类业务入口和 20 条问题沿用当前前端。会话、归档与评价仍在访问者自己的浏览器 sessionStorage 中，不会跨设备同步或汇总给项目负责人。材料、价格及结果为预置展示内容，不能作为正式业务依据。
- 线上不部署 ASR 服务；点击语音按钮会提示改用文字，不申请麦克风权限。没有上传后端、`.env`、开发文档或真实业务数据。
- 发布工作目录：`C:/Users/Administrator/Documents/ChatGPT/禾迈Hoymiles_AI销售助手/sites/hoymiles-sales-assistant`，`.openai/hosting.json` 保存 Site ID `appgprj_6af2b9a686a481919398dcc8060205fe`；版本 3 已发布，Sites 源码提交 `f796e07ba1929d4619d0e87fcb6a29103dd5e5de`。这是托管产物目录，应用源码仍以本仓库为准。
- 更新网站时，将本仓库 `docs/prototypes/` 的 `index.html`、`business-data.js`、`business-flow.js`、`business-view.js`、`ui-polish.css`、`login-bg.jpg`、`hoymiles-mark.png`、`hoymiles-logo.png` 同步到发布目录 `dist/`，复用现有 Site ID 发布，不要整库上传或重新建站。GitHub 推送与 Sites 发布是两个独立操作。
- 验证：匿名访问页面及全部静态资源返回 HTTP 200；线上登录、五类问题列表、问题只填入输入框、发送生成诊断结果、审核页面及语音降级提示已实测；34 项前端逻辑检查通过。

### 重启前端预览

在 PowerShell 中运行：

```powershell
Set-Location -LiteralPath 'C:\Users\Administrator\Documents\ChatGPT\禾迈Hoymiles_AI销售助手\Hoymiles_SalesAssistant'
python -m http.server 8766 --bind 127.0.0.1 --directory docs/prototypes
```

打开 <http://127.0.0.1:8766/index.html#/login>。这是纯页面预览，不启动后端；麦克风识别需要已有的语音转发服务。

如需原有语音功能，使用 `python docs/prototypes/asr_server.py`，打开 <http://127.0.0.1:8765/index.html#/login>；该服务依赖 Python 的 `websockets` 包与本机 `.env` 配置。不要将 `.env` 或其中的凭据提交到 GitHub。

本地账号：`li.hang@hoymiles.local`（李航）、`zhou.ning@hoymiles.local`（周宁）；口令均为 `demo123`。这些凭据仅用于本地原型。

### 明日继续前

1. 从上面的当前目录打开项目，读取 `AGENTS.md`、`.sdd/work-log.md`、`docs/ui-style.md` 和 `docs/prototypes/presentation-data.md`。
2. 用 `git status --short --branch` 检查本地未提交内容。`backend/`、`pycore/`、`pyproject.toml` 及 `.sdd/tasks.json` 的本地改动属于未完成的后端工作，本次前端提交不包含它们；不得清理、覆盖或顺手提交。
3. 若继续前端，以 `index.html`、`business-flow.js`、`business-view.js`、`business-data.js`、`ui-polish.css` 为主要入口。若转向后端，先检查已有任务状态和本地代码，再明确本次范围。
4. 浏览器对话、归档和评价保存在 `sessionStorage` 的 `hm-presentation-v1` 中；关闭浏览器或关机后不保证恢复，不能将其当作数据库备份。代码及资料文件已保存在磁盘，重启页面可重新生成结果。

验证命令：

```powershell
node --test docs/prototypes/tests/business-flow.test.cjs
git diff --check
```

当前版本 34 项逻辑检查通过；已实测五类入口、20 条业务场景问题的填入行为、追问续接、材料有效性、诊断新版本、归档、自审限制及窄屏布局。新增问题采用简短场景文案，点击后填入完整需求；方案对比保持两套配置独立，数量变更更新报价差异。界面验证不等于后端、权限或真实模型服务验收。
