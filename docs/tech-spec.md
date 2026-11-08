# 禾迈电力电子销售助手
status: Draft
specification: default

本方案继承项目 `.sdd/project.json` 的规范集 `default`。D-001～D-003 已确认。D-004 已被 D-005 替代：所有模型调用使用 DeepSeek OpenAI 兼容 HTTP（httpx，默认 `deepseek-flash`），不再用百炼或 `qwen-plus`；无 Key 或未授权付费时仍本地假调用。default 规范示例以百炼为 LLM，本次为用户明确改选的服务商偏差，不改 harness 规范文件；httpx、`trust_env=False`、禁止官方 SDK、密钥只写字段名仍遵守。2026-11-04 曾确认整份方案。2026-11-08 因 PRD 增量修订改变验收和可见性，本文件恢复 Draft，只同步受影响接口，未重写无关章节。待确认项见文末，不把建议写成已定事实。

## 一、用户要完成什么

引用 PRD：`docs/PRD.md` 的 REQ-001～REQ-005、AC-001～AC-064。2026-11-04 基线仍有效。2026-11-08 增量里标为待确认的业务批准、项目工作台、文件导出、标书归档和合同起草，不在本方案里实现。

完整数据链路：登录（API-001）→ Dashboard 与助手入口分开 → 用五个插件或自然语言发起（API-007 / 各资源 POST）→ 可选上传作为本次任务输入（API-008）→ 后端按业务规则生成记录并投影可见字段 → 客户看进度或允许立刻看到的选型/缺口/紧急指引 → 有权限且非代发起人的员工审核、商务确认、发布或正式报修 → 客户看到客户版结果。AI 不批准、不签章、不自动正式报修。

思考过程是业务步骤，随员工投影返回，不随客户或经销商投影返回。步骤包含任务识别、客户与项目绑定、输入、检查结果、依据和缺口、状态原因、明确未执行的批准/发布/签章/正式报修；诊断另含已用轮次和调用次数。不开启 DeepSeek thinking 扩展，因此没有另一份隐藏推理原文可展示。公司内人员看到全部步骤，不改变归属，也不放开自审。客户投影仍去掉成本、利润、内部意见和这些步骤。

2026-11-08 用户确认展示时机：执行中返回「处理中」和当前步骤；执行结束或遇到阻塞后，再按顺序一次返回已经发生的步骤、检查结果、依据、缺口和未执行项。演示预设步骤必须带演示标记，不能当成真实模型或工具已经执行。建立业务记录前必须已经确定客户，以及项目或用户明确选择的「未分项目」；不能默认客户。「记住本次客户和项目」只保存供下次引用的客户和项目，不创建记录，也不回写已有 `owner_customer_id`。用户要求不要送审或确认后再发布时，已生成的报价保持「处理中」，员工投影含报价内容，客户投影不含，不自动改为待审核。标书在关键要求缺失，或必需材料缺失、过期、不适用且无有效替代时返回补齐提示并不送审；非必需缺口或可人工判断的偏离可以进入待审核，但必须带明确标注。

页面入口：`/login`、`/` Dashboard、`/assistant` 业务对话、`/review` 员工审核与发布工作台。经销商与终端客户同一套页面。视觉与原型见 `docs/ui-style.md`、`docs/prototypes/index.html`。

业务规则以 PRD 为准，此处不重写权限矩阵。

## 二、前后端怎么分工，接口怎么拆

- 前端：React + TypeScript + Vite + React Router，Axios 单例，`baseURL` 为 `/api`。负责登录态、插件入口、对话、进度轮询、客户/员工两套投影展示。不在浏览器保留成本、利润、内部意见。
- 后端：Python 3.11+、FastAPI、PyCore（`PYTHONPATH` 引入，不 pip 安装）。Router → PluginRegistry → Plugin → Service → Repository。负责鉴权、隔离、Agent 工具循环、状态机、可见性投影。
- 外部：语言模型走 DeepSeek OpenAI 兼容 HTTP（D-005 已确认；无 Key 或未授权付费时假调用）；产品/价表/资质/故障来自仓库种子文件（D-001 已确认）；正式工单由本系统工单表发号（D-002 已确认）。
- 基础 URL：浏览器只请求 `/api`；开发代理到 `http://localhost:8099`。Agent 端口前端 5199 / 后端 8099；用户门禁前端 5175 / 后端 8003。
- 认证：除 API-001 外均带 `Authorization: Bearer <access_token>`。权限在 `api/deps.py` 依赖中检查，不用全局 Auth 中间件。
- 长任务：创建后立即落库为 `processing`，接口同步跑完当前轮或在超时后仍保持服务端状态；前端对 `processing` / `ticket_submit_unknown` 按 `poll_interval_ms` 拉取详情。不使用 WebSocket。同一会话内串行处理新消息；不同会话可并行。
- 统一 JSON 信封：`success`、`data`、`error`、`error_code`、`message`、`timestamp`、`request_id`、`metadata`。分页另含 `pagination`。

### 接口索引

| 编号 | Method / URL | 用途 |
| --- | --- | --- |
| API-001 | POST /api/sessions | 登录 |
| API-002 | DELETE /api/sessions/current | 退出 |
| API-003 | GET /api/users/me | 当前用户与权限 |
| API-004 | POST /api/conversations | 建会话，可指定代发起客户 |
| API-005 | GET /api/conversations | 会话列表 |
| API-006 | GET /api/conversations/{conversation_id} | 会话详情与消息 |
| API-007 | POST /api/conversations/{conversation_id}/messages | 自然语言或点插件后的对话轮次（含澄清） |
| API-008 | POST /api/uploads | 任务附件上传与解析 |
| API-009 | POST /api/selections | 提交选型 |
| API-010 | GET /api/selections | 选型列表 |
| API-011 | GET /api/selections/{selection_id} | 选型详情（按角色投影） |
| API-012 | POST /api/selections/{selection_id}/tech-confirmations | 技术确认 |
| API-013 | POST /api/quotes | 提交报价 |
| API-014 | GET /api/quotes | 报价列表 |
| API-015 | GET /api/quotes/{quote_id} | 报价详情 |
| API-016 | POST /api/quotes/{quote_id}/reviews | 报价审核 |
| API-017 | POST /api/quotes/{quote_id}/commerce-confirmations | 商务确认价表 |
| API-018 | POST /api/quotes/{quote_id}/discount-approvals | 折扣审批 |
| API-019 | POST /api/quotes/{quote_id}/publications | 发布客户版 |
| API-020 | POST /api/quotes/{quote_id}/resubmissions | 内部修改后重提 |
| API-021 | POST /api/tenders | 发起标书 |
| API-022 | GET /api/tenders | 标书列表 |
| API-023 | GET /api/tenders/{tender_id} | 标书详情 |
| API-024 | POST /api/tenders/{tender_id}/reviews | 标书审核 |
| API-025 | POST /api/tenders/{tender_id}/resubmissions | 标书内部重提 |
| API-026 | POST /api/contracts | 发起合同检查 |
| API-027 | GET /api/contracts | 合同列表 |
| API-028 | GET /api/contracts/{contract_id} | 合同详情 |
| API-029 | POST /api/contracts/{contract_id}/reviews | 合同审核 |
| API-030 | POST /api/contracts/{contract_id}/resubmissions | 合同内部重提 |
| API-031 | POST /api/diagnoses | 提交诊断 |
| API-032 | GET /api/diagnoses | 诊断列表 |
| API-033 | GET /api/diagnoses/{diagnosis_id} | 诊断详情 |
| API-034 | POST /api/diagnoses/{diagnosis_id}/reviews | 诊断审核 |
| API-035 | POST /api/diagnoses/{diagnosis_id}/resubmissions | 诊断内部重提 |
| API-036 | POST /api/diagnoses/{diagnosis_id}/ticket-submissions | 正式报修 |
| API-037 | GET /api/tickets/{ticket_id} | 工单详情 |

### API-001 登录

| 项目 | 内容 |
| --- | --- |
| 关联需求 | 跨条目隔离与权限；拟增 AC-032、AC-033。D-003 已确认本地账号。 |
| Method / URL | POST /api/sessions |
| 请求 | `application/json`。`email` string 必填；`password` string 必填。 |
| 成功响应 | 200。`data.access_token` string；`data.token_type` 固定 `bearer`；`data.user` 为 `UserPublic`。 |
| 失败响应 | 401 `UNAUTHORIZED` 邮箱或口令错误，不透露哪一项。400 `VALIDATION_ERROR`。 |

请求示例：

```json
{ "email": "customer-a@example.com", "password": "********" }
```

成功示例：

```json
{
  "success": true,
  "data": {
    "access_token": "<opaque>",
    "token_type": "bearer",
    "user": {
      "id": "usr_001",
      "email": "customer-a@example.com",
      "display_name": "客户甲",
      "account_kind": "end_customer",
      "customer_id": "cus_001",
      "roles": ["customer"],
      "permissions": ["record.read_own"]
    }
  },
  "error": null,
  "error_code": null,
  "message": "ok"
}
```

失败示例：`success=false`，`error_code=UNAUTHORIZED`，`error=邮箱或口令不正确`。

**处理步骤「登录」**：校验字段 → 按邮箱查用户 → bcrypt 核对口令 → 签发 JWT（`sub=user.id`，过期读配置）→ 返回 token 与 `UserPublic`。不把 `hashed_password`、成本类权限写进响应。

**模型**：无。

| 技术选择与触发场景 | 用户可见结果或代价 | 当前处理与依据 | 验收或验证 |
| --- | --- | --- | --- |
| 本地口令登录（企微延期） | 需记一套演示账号；与企业目录不同步 | D-003 已确认方案 A | AC-032、AC-033 |

### API-002 退出

| 项目 | 内容 |
| --- | --- |
| 关联需求 | 会话结束；配合 AC-019。 |
| Method / URL | DELETE /api/sessions/current |
| 请求 | 无 body。需要 Bearer。 |
| 成功响应 | 200。`data.logged_out` true。首版 JWT 无服务端黑名单，客户端丢弃 token 即退出。 |
| 失败响应 | 401。 |

**处理步骤**：校验 token 有效后返回成功。前端清除本地 token 并跳转 `/login`。

**模型**：无。无新增重要取舍。

### API-003 当前用户

| 项目 | 内容 |
| --- | --- |
| 关联需求 | AC-019、AC-030、AC-031。 |
| Method / URL | GET /api/users/me |
| 请求 | 无 body。 |
| 成功响应 | 200。`data` 为 `UserPublic`，含 `account_kind`：`end_customer` / `dealer` / `staff`；经销商 `permissions` 与终端客户相同，无经销商专属码。 |
| 失败响应 | 401。 |

**处理步骤**：解析 token → 读用户与角色配置映射的权限列表 → 返回。`dealer` 不增加额外菜单码。

**模型**：无。无新增重要取舍。

### API-004 创建会话

| 项目 | 内容 |
| --- | --- |
| 关联需求 | AC-030；REQ-001～005 的归属前置。 |
| Method / URL | POST /api/conversations |
| 请求 | `owner_customer_id` string，客户登录时必须等于自己的 `customer_id`，省略则用自己；员工代发起时必填指定客户。 |
| 成功响应 | 200。`data` 为 `ConversationPublic`：`id`、`owner_customer_id`、`initiator_user_id`、`created_at`。 |
| 失败响应 | 403 员工未带指定客户或客户冒充他人；404 客户不存在。 |

**处理步骤「创建会话」**：确定归属客户 → 写入 `initiator_user_id=当前用户` → 归属永远是 `owner_customer_id`，不因代发起而改到员工。

**模型**：无。

| 技术选择与触发场景 | 用户可见结果或代价 | 当前处理与依据 | 验收或验证 |
| --- | --- | --- | --- |
| 代发起写归属客户 | 记录出现在客户侧，不出现在员工「我的客户身份」名下 | 已确认 AC-030 | AC-030 |

### API-005 会话列表

| 项目 | 内容 |
| --- | --- |
| 关联需求 | 历史会话不是插件，但是入口外的列表。 |
| Method / URL | GET /api/conversations |
| 请求 | Query：`page` int 默认 1；`page_size` int 默认 20，最大 100。 |
| 成功响应 | 200 分页信封。客户只看到本客户会话；员工看到有项目权限的会话。 |
| 失败响应 | 401。 |

**处理步骤**：按可见范围过滤。无模型。无新增重要取舍。

### API-006 会话详情

| 项目 | 内容 |
| --- | --- |
| 关联需求 | 对话中的进度与客户版展开规则。 |
| Method / URL | GET /api/conversations/{conversation_id} |
| 请求 | 路径 `conversation_id`。 |
| 成功响应 | 200。`data.conversation`；`data.messages[]` 每条已按角色投影（报价未发布只有进度文案，无金额）。 |
| 失败响应 | 404 对当前用户不可见时一律 NOT_FOUND，不暴露存在性。403 仅用于已定位资源但动作越权。 |

**处理步骤**：加载会话 → 可见性检查 → 投影消息。无模型。无新增重要取舍。

### API-007 发送对话消息

| 项目 | 内容 |
| --- | --- |
| 关联需求 | REQ-001～005；AC-020、AC-034～AC-042；各业务 AC 的发起入口。 |
| Method / URL | POST /api/conversations/{conversation_id}/messages |
| 请求 | `content` string 可空（点插件且后续走表单时允许空，但自然语言必填其一）；`plugin_code` 可选 `selection` / `quote` / `tender` / `contract` / `diagnosis`；`upload_ids` string[] 可选。 |
| 成功响应 | 200。`data.message` 助手回复（客户投影）；`data.intent`：`clarifying` / `lookup` / `need_fields` / `selection` / `quote` / `tender` / `contract` / `diagnosis`；`data.record` 可空；`data.needs_clarification` bool；`data.held_followup` 可空，用于保留「校验后再报价」的后半句。 |
| 失败响应 | 400 无内容且无插件；404 会话不可见；409 同一会话上一轮仍在 `processing`。 |

**处理步骤「会话消息处理」**：

1. 读取与校验：会话归属、串行锁、上传文件属于本会话。
2. 落库用户消息。
3. 先看当前句。冒烟、焦糊、异常发热优先于已选插件，立即停止普通业务。插件只作候选，用户当前句可以纠正或切换。否定和「不要送审」「确认后再发布」不得下发审核或发布；报价已生成时状态保持 `processing`，不自动进入待审核。若无 `plugin_code`：调用模型（提示词「意图识别」）区分资料查询、目标明确但缺字段、意图不明，以及五类业务。识别为标书或合同不得拒绝。五类业务在读取客户专属资料和建记录前必须已有 `owner_customer_id`，以及项目或用户明确选择的「未分项目」。资料查询和意图澄清可以没有项目，且不建业务记录。标书缺少关键要求，或必需材料缺失、过期、不适用且没有有效替代时，不送审。
4. 资料查询返回授权范围内的种子结果，或说明首版不支持，不创建业务记录（AC-035）。意图不明时列出可选插件，不创建记录（AC-034）。目标明确但缺字段时保留任务类型并追问（AC-036）。「上一版」「这套配置」有多个已授权候选时先确认（AC-037）。
5. 用户纠正后进入对应业务的创建步骤（与 API-009/013/021/026/031 相同）。「先校验再报价」先走选型校验，报价写入 `held_followup`，校验未通过不创建正式报价（AC-039）。上传内容里的指令不当成执行授权（AC-041）。
6. Agent 循环：把用户输入与允许的工具规格发给模型 → 解析 `tool_calls` → PluginRegistry 执行真实工具 → 把 `PluginResult` 作为 tool 观察回写 → 再问模型，直到无工具调用、达到 `llm_max_tool_rounds`，或诊断达到 `diagnosis_max_rounds`。单次计划后固定执行不算完成本循环。
7. 按业务规则更新记录状态 → 按角色投影 → 写入助手消息（客户消息不含内部字段）→ 返回。

**模型**：DeepSeek Chat Completions（OpenAI 兼容，httpx 直调）。默认模型名 `deepseek-flash`，来源 https://api-docs.deepseek.com/ （2026-11-04 已读：现由 DeepSeek-V4.1-Flash-1017 提供；官方要求使用该名称，不把 Pro 或其他别名并列成默认）。能力：非流式 chat + tools（官方定价页写明 Tool Calls）。HTTP：`httpx.AsyncClient(trust_env=False)` POST `{llm_base_url}/chat/completions`，即默认 `https://api.deepseek.com/chat/completions`，`Authorization: Bearer {llm_api_key}`。禁止 DeepSeek/OpenAI 官方 SDK（与 default 对 LLM 的 httpx 纪律一致，避免 SDK 隐藏结构并继承环境）。不开启 thinking 扩展字段，以免拉长本轮等待。提示词：§四「意图识别」+ 当前业务段。`llm_use_mock=true` 时走本地假调用，不访问网络。相对 default 规范中的百炼示例，服务商偏差见 D-005。

| 配置字段 | 类型 | 默认值 | 用途 |
| --- | --- | --- | --- |
| llm_provider | string | deepseek_compatible | 选出哪类接入 |
| llm_base_url | string | https://api.deepseek.com | 接入地址，不含密钥 |
| llm_api_key | string | 空 | 密钥字段名，只存在 `.env` |
| llm_model | string | deepseek-flash | 模型名 |
| llm_temperature | float | 0.2 | 生成随机度 |
| llm_timeout_seconds | float | 60 | 单次 HTTP 超时 |
| llm_max_retries | int | 2 | 超时或 5xx 重试次数 |
| llm_retry_interval_seconds | float | 1.0 | 重试间隔 |
| llm_use_mock | bool | true | 是否本地假调用 |
| llm_max_tool_rounds | int | 8 | 工具循环上限 |
| diagnosis_max_rounds | int | 3 | 诊断 Plan→Execute→Reflect 轮次，含首轮，对应 AC-054 |
| diagnosis_max_calls | int | 12 | 诊断调用累计上限，失败和重试计入 |
| diagnosis_read_retry | int | 1 | 同一只读请求的自动重试次数 |
| selection_max_adjust_rounds | int | 2 | 选型初次生成后的自动调整上限，对应 AC-049 |

| 技术选择与触发场景 | 用户可见结果或代价 | 当前处理与依据 | 验收或验证 |
| --- | --- | --- | --- |
| 意图不清先澄清 | 不产生一条错业务的待审核记录 | 已确认用户目标；拟增 AC-034 | AC-020、AC-034 |
| 同步跑完本轮 Agent，前端再拉详情 | 本轮结束前输入区等待；可同时看 Dashboard | 普通实现；不引入 WS | 处理中可离开再回来 |
| 模型假调用默认开 | 无 Key 或未授权付费时仍能走通页面，质量是样例 | D-005 已确认：接口按 DeepSeek，无授权时假调用 | 外部服务清单 |

### API-008 上传文件

| 项目 | 内容 |
| --- | --- |
| 关联需求 | AC-015、AC-041。 |
| Method / URL | POST /api/uploads |
| 请求 | `multipart/form-data`。`conversation_id` 必填；`file` 必填。可选 `record_type`、`record_id`。 |
| 成功响应 | 200。`data.upload_id`、`file_name`、`parse_status`：`parsed` / `failed`；`parse_error` 可空；不返回文件二进制。 |
| 失败响应 | 400 类型或大小超限；解析失败仍 200 且 `parse_status=failed`（业务失败不是传输失败）。 |

**处理步骤「上传解析」**：检查会话权限 → 存到 `backend/data/uploads/` → 按扩展名解析文本（pdf/docx/txt/xlsx 以配置白名单为准）→ 失败则记录原因，保留任务已输入内容和解析前结果，不删除会话消息。解析出的文字只作为资料，不解析成送审、发布或正式报修动作。

**模型**：无（首版不做识图 OCR，扫描件解析失败走 AC-015）。

| 技术选择与触发场景 | 用户可见结果或代价 | 当前处理与依据 | 验收或验证 |
| --- | --- | --- | --- |
| 解析失败保留原文 | 可删文件、重试或改用文字 | 已确认 AC-015 | AC-015 |
| 不自动 OCR | 扫描件可能失败 | 识图延期 | AC-015 |

大小默认 `upload_max_bytes=20971520`（20MB），PRD 未写上限，属实现约定。

### API-009 提交选型

| 项目 | 内容 |
| --- | --- |
| 关联需求 | REQ-001；AC-001、AC-002、AC-011、AC-021、AC-043～AC-049。 |
| Method / URL | POST /api/selections |
| 请求 | `conversation_id` 必填；`owner_customer_id` 规则同 API-004；`conditions` object 必填（`site_type`、`power_kw`、`grid`、`environment`、`notes` 等，未提供的键视为未执行检查项）；`upload_ids` 可选。 |
| 成功响应 | 200。`data` 为投影后的 `SelectionView`：客户可见推荐型号、理由、依据、配套校验、未执行检查、失败条件、待确认项、`version_id`、`quote_eligible`；无价格。状态 `candidate` / `check_passed` / `check_failed` / `unmatched` / `pending_tech_confirm`。`quote_eligible=true` 只表示可用于报价，不表示业务批准。 |
| 失败响应 | 400 条件空；404 会话。 |

**处理步骤「选型生成」**：校验归属和项目候选，多个候选先返回确认（AC-037）→ 关键硬约束缺失则 `need_fields`，不假设（AC-043）→ 建记录 `processing` 并绑定 `version_id` → Agent 循环调用 `search_product_catalog`、`check_compatibility`。无候选则 `unmatched`。校验明确失败则 `check_failed` 且 `quote_eligible=false`。缺兼容依据、工具失败、依据冲突或过期则保留已知结果，状态 `pending_tech_confirm` 或带限制说明，`quote_eligible=false`。必需检查未执行写入 `unchecked_items`，禁止只写「方案可行」。配套通过才 `check_passed` 且 `quote_eligible=true`。初次生成后的自动调整最多 `selection_max_adjust_rounds=2`，暂停恢复不清零；达到上限后停止并给出人工路径（AC-049）。修改已确认版本时复制新版本，旧版保留，并重新执行受影响检查（AC-046、AC-048）。客户投影去掉任何价格字段。业务批准门未确认前不增加。

**模型**：同 API-007 配置。提示词「产品选型」。

体验：选型结果直接给客户看。可用于报价不等于业务批准。待技术确认、校验失败和未执行的必需检查不能被正式报价引用。已发布报价被新版本引用时，旧发布内容保留。

### API-010 / API-011 选型列表与详情

GET `/api/selections` 与 GET `/api/selections/{selection_id}`。Query 分页同 API-005。详情按角色投影。不可见 → 404。无模型。

**处理步骤「可见性投影」**：加载记录 → 若请求者不是归属客户且无项目查看权限则 404 → 客户与经销商使用 `*CustomerView`；有内部权限的员工使用 `*StaffView`（选型仍无价格）。其他客户 404。

### API-012 技术确认

| 项目 | 内容 |
| --- | --- |
| 关联需求 | REQ-001 技术确认；AC-011；AC-030 自审隔离。 |
| Method / URL | POST /api/selections/{selection_id}/tech-confirmations |
| 请求 | `action`：`confirm_eligible` / `reject`；`comment` 可选。 |
| 成功响应 | 200。更新后的 `SelectionStaffView`。`confirm_eligible` 后 `quote_eligible=true`，状态 `given`。 |
| 失败响应 | 403 无技术确认权限，或 `initiator_user_id==当前用户`（SELF_REVIEW_FORBIDDEN）；409 状态不是 `pending_tech_confirm`。 |

**处理步骤「自审隔离」**：确认角色在配置的 `role_tech_confirmer` 中 → 拒绝代发起人 → 写审计日志 → 更新状态。无模型。

### API-013 提交报价

| 项目 | 内容 |
| --- | --- |
| 关联需求 | REQ-002；AC-003、AC-006、AC-012、AC-013、AC-047、AC-050。 |
| Method / URL | POST /api/quotes |
| 请求 | `conversation_id`；`owner_customer_id`；`selection_id` 与 `product_code` 至少一项；`discount_rate` number 可选，默认 0。 |
| 成功响应 | 200。客户投影只有 `id`、`status`、`progress_label`，无金额。可能状态：`cannot_quote`（未进待审核）、`pending_commerce`、`pending_discount_approval`、`pending_review`、`processing`。 |
| 失败响应 | 400；引用了 `quote_eligible=false` 的选型视为无法报价，成功体内 `status=cannot_quote` 并提示先完成选型或指定产品。 |

**处理步骤「报价测算」**：单一产品且种子存在、不涉及组合时可以不先走选型（AC-047）。组合配置或 `quote_eligible=false` → `cannot_quote`。无产品且无可用配置版本 → `cannot_quote`，不进待审核。否则 Agent 调 `search_price_table`、`calculate_quote`。价表缺失或多版 → `pending_commerce`，不发布价格。种子没有的费用行不编造。折扣大于 `discount_limit_for_role` → `pending_discount_approval`，AI 不得写 `approved`。测算成功 → 内部明细入库，状态 `pending_review`，并写入 `version_id`。已发布版本若配置、数量、价格或商务条件变化，新建版本，原 `published` 内容保留（AC-050）。客户响应走投影。首版不生成下载文件。

**模型**：同 API-007。提示词「方案报价」。

| 技术选择与触发场景 | 用户可见结果或代价 | 当前处理与依据 | 验收或验证 |
| --- | --- | --- | --- |
| 未发布前客户只看进度 | 客户不知道金额 | 已确认 AC-003、AC-004 | 同上 |
| 超限折扣进审批 | 页面无已批准价格 | 已确认 AC-013 | AC-013 |

### API-014 / API-015 报价列表与详情

GET 列表与详情。客户在 `pending_review` / `pending_commerce` / `pending_discount_approval` / `pending_publish` / `rejected` 只得进度字段；`published` 得 `QuoteCustomerView`（产品或配置版本、费用明细、适用条件、有效期、金额）；永不返回 `cost`、`profit`、`internal_comment`、无权日志。员工审核人得 StaffView。另一客户 404。覆盖 AC-003、AC-005、AC-014。处理步骤同「可见性投影」。

### API-016 报价审核

| 项目 | 内容 |
| --- | --- |
| 关联需求 | AC-004、AC-005。 |
| Method / URL | POST /api/quotes/{quote_id}/reviews |
| 请求 | `action`：`approve` / `reject`；`comment` 内部意见，客户不可见。 |
| 成功响应 | 200。`approve` → `pending_publish`，不创建客户版快照。`reject` → `rejected`。 |
| 失败响应 | 403 自审或无 `quote_review` 权限；409 状态不允许。 |

**处理步骤「审核」**：自审隔离 → 校验状态 `pending_review` → 通过不发布 → 拒绝后客户端不提供就地编辑字段（接口也不接受客户 PATCH）。无模型。

### API-017 商务确认

POST `/api/quotes/{quote_id}/commerce-confirmations`。请求：`price_version_id` 必填（客户不可调此接口）。权限 `commerce_confirm`。成功后进入 `pending_review` 或配置允许时直接待审。覆盖 AC-012。步骤同「审核」，禁止把选择权交给客户。

### API-018 折扣审批

POST `/api/quotes/{quote_id}/discount-approvals`。请求：`action` `approve` / `reject`。权限 `discount_approve`。AI 不得调用本接口。覆盖 AC-013。

### API-019 发布客户版

POST `/api/quotes/{quote_id}/publications`。无 body。权限 `quote_publish`，且非代发起人。仅 `pending_publish` 可发布。成功：生成客户版快照，状态 `published`。覆盖 AC-022、AC-014。发布不是第二次批准。

### API-020 报价内部重提

POST `/api/quotes/{quote_id}/resubmissions`。请求：`patch` object（内部明细修改）。仅内部人员。`rejected` → 修改后 `pending_review`。`resubmitted_by` 记为当前用户，其不能再审这一条。客户调用 403。覆盖 AC-024。处理步骤「内部重提」。

客户另发新请求走 API-013 新 id，旧记录保持 `rejected`。覆盖 AC-023。

### API-021～API-025 标书

POST `/api/tenders`：`conversation_id`、`bid_requirements` string 或上传 id。缺招标要求 → `insufficient`，不进待审核（AC-027）。足够则 Agent 调 `search_qualifications`、`draft_tender_sections`、`diff_against_commitments`，状态 `pending_review`。无效或过期材料 `usable=false`，不得写成已齐备。AI 不签章。

GET 列表/详情：审核前客户仅进度；通过后 `TenderCustomerView`（响应、依据、满足状态、材料有效期与适用范围），无内部意见（AC-026）。

POST `.../reviews`、`.../resubmissions`：步骤同「审核」「内部重提」。标书通过即客户可见客户版，无另行发布。

**模型**：同 API-007。提示词「标书管理」。

### API-026～API-030 合同

POST `/api/contracts`：缺少 `contract_text` 且没有合同上传时返回说明，要求提供正文，不生成检查结果（AC-058）。`intent=draft` 时不生成草稿，返回首版只做检查和履约提取（AC-059）。有正文时，`quote_id` 或 `selection_id` 用于核对对象。只有配置、没有价格依据时，金额字段为 `unverifiable`。版本不明 → `pending_clarify`。请求中 `request_sign=true` 或要求盖章批准 → 200 且 `status=cannot_sign`，不生成已签署结果（AC-029）。引用的配置或报价版本变化时，详情标 `needs_rereview`（AC-051）。

否则 Agent 调 `diff_contract`，状态 `pending_review`。系统不签署、不盖章。

GET：审核前客户仅进度；通过后差异、偏离、履约事项（交付、验收、付款、质保），无内部谈判意见（AC-028）。

审核与重提同报价模式，无发布步。

**模型**：同 API-007。提示词「合同管理」。

### API-031 提交诊断

| 项目 | 内容 |
| --- | --- |
| 关联需求 | REQ-003；AC-007、AC-010、AC-016、AC-017、AC-054、AC-055。 |
| Method / URL | POST /api/diagnoses |
| 请求 | `conversation_id`；`symptom` string 必填；`upload_ids` 可选。 |
| 成功响应 | 200。紧急：`status=emergency`，客户可见 `safety_guidance`、`handoff`，不等待审核。资料不足：`status=need_more`，`missing_items[]`，保留 `symptom`，无草稿。形成完整或部分报告：`status=pending_review`，生成草稿；客户只见处理状态、补资料提示和下一步，不见报告正文。员工可见报告与 `ticket_draft`。原因未确定时不得标 `confirmed`。结果另给 `task_delivered`、`cause_confirmed`、`recovery_verified`、`ticket_submitted`、`accepted`，互不代替。 |

**处理步骤「诊断生成」**：命中紧急关键词配置（默认含冒烟、异味、异常发热）→ 停止普通排查并立即返回指引。否则按 Plan→Execute→Reflect 计数，首轮计入，最多 `diagnosis_max_rounds=3`。诊断调用原子预占，累计最多 `diagnosis_max_calls=12`，失败和重试计入；同一只读请求最多自动重试一次。补资料、暂停恢复和计划版本变化不清零。第三轮后再收到的资料只保存，不自动开新一轮。报告、草稿和交接步骤不再发起取证。不足形成报告 → `need_more`，不建草稿。知识工具失败或轮次用尽 → 部分报告 + 草稿，客户投影仍不含正文。形成报告 → 同时插入 `tickets` 行 `kind=draft`，`official_number` 空。`accepted=true` 仅在有接单回执时写入。

**模型**：同 API-007。提示词「故障诊断」。`diagnosis_max_rounds` 默认 3，`diagnosis_max_calls` 默认 12。

| 技术选择与触发场景 | 用户可见结果或代价 | 当前处理与依据 | 验收或验证 |
| --- | --- | --- | --- |
| 紧急不走普通审核 | 立刻看到安全指引 | 已确认 AC-017 | AC-017 |
| 报告通过不自动报修 | 无正式号直到授权 | 已确认决策 5 | AC-008、AC-025 |

### API-032 / API-033 诊断列表与详情

可见性：审核前客户无完整或部分报告正文、无草稿正文、无正式号，只见状态、补资料提示和下一步（AC-007、AC-016）。通过后客户见允许披露的事实、疑似原因、证据、缺口和下一步，仍无正式号（AC-008）。拒绝后无正文且无客户 PATCH（AC-009）。另一客户 404。代发起人有查看权限时可见员工投影中其权限允许的字段，但通过和发布接口仍拒绝（AC-030）。

### API-034 / API-035 诊断审核与重提

同「审核」「内部重提」。通过不调用正式报修。覆盖 AC-008、AC-009、AC-024。

### API-036 正式报修

| 项目 | 内容 |
| --- | --- |
| 关联需求 | AC-018、AC-025。D-002 已确认本系统发号。 |
| Method / URL | POST /api/diagnoses/{diagnosis_id}/ticket-submissions |
| 请求 | 无业务 body。服务端使用稳定幂等键 `ticket:{diagnosis_id}`。 |
| 成功响应 | 200。创建成功：`official_number` 非空，客户可见该号。超时未知：`status=ticket_submit_unknown`，`official_number` 仍空。核实未创建：`submit_result=not_created`，不新建第二张。 |
| 失败响应 | 403 无正式报修授权或自审隔离；409 诊断未通过审核或已有成功号。 |

**处理步骤「正式报修」**：权限与自审隔离 → 诊断须 `approved` 且存在草稿 → 若已有 `official_number` 直接返回 → 若已有未知提交则只核实、禁止新 POST 副作用 → 按 `ticket_provider` 创建（已确认为 `local` 本地发号；超时由 `ticket_create_timeout_seconds` 控制）→ 写结果。报告通过本身不进入本步骤。

**模型**：无。

| 技术选择与触发场景 | 用户可见结果或代价 | 当前处理与依据 | 验收或验证 |
| --- | --- | --- | --- |
| 幂等键 + 先核实 | 超时不会出现两个工单号 | 已确认 AC-018 | AC-018 |
| 本系统工单表发号 | 号码只在本助手内有效，不派工；预留切到外部系统 | D-002 已确认方案 A | AC-025 |

### API-037 工单详情

GET `/api/tickets/{ticket_id}`。客户仅当 `official_number` 已成功才看得到号；草稿正文仅员工。404 对无权限者。覆盖权限矩阵工单行。无模型。

## 三、接口请求数据的类型选型

- 普通接口：JSON UTF-8。上传：multipart。无 SSE、无文件下载接口（客户版字段在 JSON 内）。
- 字段一律 snake_case，前后端同名。
- 金额：`string` 十进制（避免浮点），币种 `CNY`。折扣 `discount_rate` 为 0～1 的小数。
- 时间：ISO-8601 UTC。
- 标识：`sel_` / `quo_` / `tnd_` / `con_` / `dia_` / `tkt_` / `cnv_` / `upl_` / `usr_` / `cus_` 前缀字符串。
- 上传：白名单 `pdf,docx,doc,txt,xlsx,csv`；`upload_max_bytes` 默认 20971520。
- 跨请求：业务对象用持久 id；上传 id 绑定会话，会话删除不在首版提供，文件随项目 `backend/data/uploads/` 保留。JWT 过期后需重新登录。
- 存储：SQLite `backend/data/Hoymiles_SalesAssistant.db`。核心实体：
  - `users`：id、email 唯一、hashed_password、account_kind、customer_id 可空、roles JSON。
  - `customers`：id、name。客户间记录隔离以 `owner_customer_id` 为准。
  - `conversations`、`messages`（content_projected 按角色可拆表或读时投影）。
  - `uploads`：parse_status、parse_error、storage_path。
  - `selections`：conditions JSON、status、quote_eligible、initiator_user_id、owner_customer_id、result JSON。
  - `quotes`：status、selection_id、product_code、staff_payload JSON、customer_snapshot JSON 可空、discount_rate、initiator_user_id、resubmitted_by。
  - `tenders`、`contracts`、`diagnoses`：同上模式。
  - `tickets`：diagnosis_id、kind `draft|official`、official_number 可空、idempotency_key 唯一、submit_status `not_submitted|unknown|created|not_created`。
  - `audit_logs`：actor_id、action、record_type、record_id；客户无权列表接口。
- 约束：代发起人 id 必须保留。客户版快照一旦发布不随内部意见回写而改，除非新的发布（首版不提供二次发布）。
- 种子资料（D-001 已确认）：`backend/data/knowledge/products.json`、`prices.json`、`qualifications.json`、`faults.md`、`standard_clauses.md`。无知识库后台。

共享枚举：`RecordStatus` = `processing` / `given` / `unmatched` / `pending_tech_confirm` / `cannot_quote` / `pending_commerce` / `pending_discount_approval` / `pending_review` / `pending_publish` / `published` / `approved` / `rejected` / `insufficient` / `pending_clarify` / `cannot_sign` / `need_more` / `emergency` / `ticket_submit_unknown`。不是每条记录出现全部值。

## 四、提示词与输出约束

模型选型见 API-007，本节不重复。文件位置：`backend/src/prompts/`。

| 文件 | 使用接口 | 约束 |
| --- | --- | --- |
| `intent.txt` | API-007 | 只输出 JSON：`{"intent":"selection\|quote\|tender\|contract\|diagnosis\|clarifying","confidence":0-1}`。禁止把标书/合同判为不支持。 |
| `selection.txt` | API-007、API-009 | 必须引用工具返回的产品条目 id；禁止编造型号与价格；输出 JSON：型号、理由、依据、校验、未执行项、`quote_eligible`。 |
| `quote.txt` | API-007、API-013 | 禁止批准超限折扣；价格必须来自 `search_price_table`。 |
| `tender.txt` | API-007、API-021 | 过期材料 usable=false；禁止签章语句。 |
| `contract.txt` | API-007、API-026 | 禁止输出已签署/已盖章；版本不明只问澄清。 |
| `diagnosis.txt` | API-007、API-031 | 区分已核实/疑似/证据/缺口/下一步；紧急则只输出指引；不足则只列缺失。 |

解析：先取 `choices[0].message.content`；若存在 `tool_calls` 则先执行工具。JSON 用严格解析，失败则按格式错误重试至多 `llm_max_retries` 次，仍失败则业务状态保持已有部分结果并记技术失败。禁止把模型散文当已确认价格或已确诊原因。

工具（Plugin `name` 与 OpenAI tools 对齐），权限边界：只读种子资料或已授权工单提供者；不能写审核通过、不能发正式工单（正式工单仅 API-036 的 Service 调用）。

| 工具名 | 参数 | 观察 |
| --- | --- | --- |
| search_product_catalog | query, constraints | 产品列表，无价格 |
| check_compatibility | product_codes, conditions | 每项 pass/missing_evidence/not_run |
| search_price_table | product_code, conditions | 0、1 或多条价格版本 |
| calculate_quote | price_version_id, discount_rate | 内部费用；超限标记 |
| search_qualifications | requirement_text | 材料、有效期、范围 |
| draft_tender_sections | requirements, qualification_hits | 章节草稿 |
| diff_against_commitments | tender_or_contract, quote_id | 差异列表 |
| diff_contract | contract_text, quote_id, selection_id | 差异与偏离条款 |
| search_fault_knowledge | symptom | 条目或接口失败 |
| create_ticket_draft | diagnosis_id | 草稿 id，无正式号 |

用户原话作为运行时 `user` 消息，不写死演示问题。

## 六、接口失败异常设计

共享错误结构（各 JSON 接口）：

```json
{
  "success": false,
  "data": null,
  "error": "面向用户的中文说明",
  "error_code": "FORBIDDEN",
  "message": null
}
```

| error_code | HTTP | 使用接口 | 用户侧 |
| --- | --- | --- | --- |
| VALIDATION_ERROR | 400 | 全部写接口 | 按字段改输入 |
| UNAUTHORIZED | 401 | 全部 | 回登录 |
| FORBIDDEN | 403 | 审核/发布/报修/重提 | 权限不足，不露正文（AC-019） |
| SELF_REVIEW_FORBIDDEN | 403 | 审核类 | 说明不能审自己发起或自己重提的一条 |
| NOT_FOUND | 404 | 详情 | 与无权同一表现 |
| CONFLICT | 409 | 状态不允许、会话忙 | 保持原记录 |
| INTERNAL_ERROR | 500 | 未分类 | 可重试；已落库进度保留 |

分类：参数校验 → 400；业务规则（无法匹配、不能代签、缺招标要求）→ 200 + 业务 status，不是 500；外部依赖（模型、知识、工单）→ 记录技术失败或 `ticket_submit_unknown`，保留输入与失败前结果；系统内部 → 500 + 日志，日志不含密钥和完整证件。

超时与重试：模型按 API-007 配置，付费调用禁止无限重试。工单只核实不新建。客户端断开后服务端若已进入审核前落库，刷新可经 GET 找回。前端 axios timeout 建议 120000ms（Agent 轮次可能较长），超时后引导去详情轮询，不自动再 POST 一遍创建。

关键 AC：AC-015 解析失败；AC-016 知识不可用；AC-018 工单未知；AC-019 无权；AC-023/024 拒绝后路径。

## 七、项目本地层级设计

```text
Hoymiles_SalesAssistant/
├── pycore/                          # 框架，PYTHONPATH 引入
├── backend/
│   ├── .env / .env.example
│   ├── requirements.txt
│   ├── src/
│   │   ├── main.py
│   │   ├── api/deps.py
│   │   ├── api/routes/              # sessions, users, conversations, uploads,
│   │   │                            # selections, quotes, tenders, contracts,
│   │   │                            # diagnoses, tickets
│   │   ├── db/models.py, session.py
│   │   ├── models/                  # Pydantic
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── plugins/                 # 上表工具
│   │   ├── prompts/
│   │   └── core/security.py         # bcrypt，禁止 passlib
│   ├── tests/
│   ├── data/
│   │   ├── Hoymiles_SalesAssistant.db
│   │   ├── uploads/
│   │   └── knowledge/               # D-001 已确认的种子资料
│   └── scripts/
├── frontend/
│   ├── .env / .env.example
│   └── src/
│       ├── pages/                   # LoginPage, DashboardPage, AssistantPage, ReviewPage
│       ├── components/
│       ├── services/
│       ├── stores/
│       ├── hooks/
│       ├── router/
│       ├── types/
│       ├── mocks/
│       └── utils/
├── docs/                            # PRD, tech-spec, decisions；确认后 ui-style
└── pyproject.toml                   # ruff/mypy/pytest，范围 backend/src 与 backend/tests
```

运行：

- 后端：`cd backend && PYTHONPATH=.. <python3.11+> -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8099`
- 前端：`cd frontend && npm run dev -- --host 127.0.0.1 --port 5199`
- 测试：`pytest backend/tests --timeout=120`（需 pytest-timeout）
- CORS：5199 与 5175 的 localhost 与 127.0.0.1
- 配置禁止读进程环境，由 PyCore ConfigManager 读 `backend/.env`

### 配置表（仅字段名）

| 字段名 | 类型 | 默认值 | 用途 | 敏感 |
| --- | --- | --- | --- | --- |
| secret_key | string | 无默认，必填 | JWT 签名 | 是 |
| database_path | string | data/Hoymiles_SalesAssistant.db | SQLite | 否 |
| host / port | string / int | 127.0.0.1 / 8099 | 监听 | 否 |
| cors_origins | list | 规范四地址 | CORS | 否 |
| llm_* | 见 API-007 | 见 API-007 | 模型 | llm_api_key 是 |
| upload_dir | string | data/uploads | 上传 | 否 |
| upload_max_bytes | int | 20971520 | 大小 | 否 |
| poll_interval_ms | int | 2000 | 前端轮询建议，经 GET 配置或写死前端常量来自该配置的公开接口不强制 | 否 |
| discount_limit_default | float | 0.05 | 超限进审批 | 否 |
| ticket_provider | string | local | 已确认默认 local；预留 external 以便以后切换 | 否 |
| ticket_create_timeout_seconds | float | 10 | 正式报修超时 | 否 |
| emergency_keywords | list | ["冒烟","异味","异常发热"] | AC-017 | 否 |
| role_*_codes | list | 见下 | 岗位到权限，岗位显示名待配置 | 否 |
| VITE_API_BASE_URL | string | /api | 前端 | 否 |
| VITE_BACKEND_PROXY_TARGET | string | http://localhost:8099 | 代理 | 否 |
| VITE_USE_MOCK | bool | false | 前端 Mock 开关 | 否 |

角色配置字段：`role_tech_confirmer`、`role_quote_reviewer`、`role_commerce_confirmer`、`role_discount_approver`、`role_publisher`、`role_tender_reviewer`、`role_contract_reviewer`、`role_diagnosis_reviewer`、`role_ticket_authorizer`、`role_proxy_initiator`。具体岗位名称 PRD 仍待配置，用角色码承接，不编造组织职称。

临时数据：`backend/data/*.db`、`uploads/`、`.venv/`、`.env` 忽略提交。测试库与业务库隔离。

### 外部服务清单

| 名称 | 用途 | 依赖 API | 配置状态 | Mock/真实 | 真实验证条件 |
| --- | --- | --- | --- | --- | --- |
| DeepSeek Chat | 意图与各业务生成 | API-007、API-009、API-013、API-021、API-026、API-031 | 字段已列，密钥未提供 | 无 Key 或未授权付费时 `llm_use_mock=true` | 真实调用需 DeepSeek Key 与付费授权。未授权时 AC-001、AC-011、AC-021、AC-026、AC-007、AC-016、AC-034 只能按假调用边界验收，不得报真实模型通过 |
| 种子知识文件 | 产品/价表/资质/故障 | 工具插件 | D-001 已确认 | 文件即资料 | 放入覆盖 AC 的最少条目 |
| 本系统工单表 | 正式号 | API-036 | D-002 已确认 `ticket_provider=local` | 本地发号 | 切到 external 前不验真实外部工单 |

缺少真实凭据不阻塞权限、状态机、投影和本地假调用开发；不得把 Mock 写成真实模型或真实工单验收通过。

### REQ / AC 覆盖

| 编号 | 路径 |
| --- | --- |
| AC-001、002、011、021、043～049 | API-009、011、012 |
| AC-003、004、005、006、012、013、014、022、047、050、051 | API-013～020；引用复核在标书和合同详情 |
| AC-007、008、009、010、016、017、018、025、054～056 | API-031～037 |
| AC-026、027、057 | API-021～025。补遗和提交归档无接口 |
| AC-028、029、058、059 | API-026～030。起草、版本比较、履约更新和签署归档无接口 |
| AC-015、041 | API-008 |
| AC-019、060、061、062 | 全部 GET/动作的权限与投影；审计字段在员工详情；种子缺失走业务状态；模拟不报真实模型通过 |
| AC-020、034～040、042 | API-007 |
| AC-023 | 各资源新建 POST |
| AC-024 | 各 resubmissions |
| AC-030 | API-004 及各 POST 的 owner/initiator |
| AC-031 | API-003 权限码与前端同一套插件 |
| AC-032、033 | API-001、003 |

### 仍影响开发的待确认事项

D-001～D-003 与 D-005 已确认；D-004 已替代。岗位显示名不改变接口。2026-11-08 起本文件为 Draft。

尚未实现、等待产品决定的是：正式报价前的业务批准门、项目工作台、已发布文件下载、标书补遗与提交归档、合同起草与签署归档。无 Key 或未授权付费时，生成类 AC 只走假调用，不得写成真实模型通过。工单号只在本系统表内有效。
