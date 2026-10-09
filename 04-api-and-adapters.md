# 服务地图接口与适配器设计

版本：1.0　日期：2026-10-08　状态：开发基线草案

本文定义首版前后端联调契约和远端管理器适配边界。接口以本地台账和最新事实快照为中心；扫描、日志和重启是明确的远端请求。界面查询不会隐式扫描整台机器，浏览器不能提交任意命令或管理器原始资源 ID。

实体、约束和恢复机制见 [架构与数据设计](03-architecture-and-data.md)。以下命令表达适配器语义，不是可直接接受用户输入的 shell API；实施时使用固定可执行路径、严格校验和安全引用，或已登记受限 wrapper。

## 1 通用 HTTP 契约

基础路径 `/api/v1`，JSON 使用 snake_case、UTF-8。成功返回 `{"data": ..., "request_id": "..."}`；列表增加 `page`、`page_size`、`total`。默认每页 50，最大 200，排序字段只接受白名单。时间统一 UTC RFC 3339，枚举使用英文值，前端负责中文显示。

非公开端点要求单管理员会话 cookie，所有写请求包括登录后的测试、扫描、日志会话和重启提交都要求 CSRF token。cookie 使用 HttpOnly、Secure 和适当 SameSite；HTTPS 与会话生命周期由部署配置确定。请求正文和响应包含秘密时不得记录全文。接口不返回 private_key、password、passphrase、凭据密文、nonce 或主密钥。

可编辑对象返回 `version`，PATCH/关系更新提交 `expected_version`；服务器并发更新则 409。若需建立新关系，`expected_version=0` 表示必须不存在。后台状态变化不会修改管理员 metadata 的 version；Service generation 独立维护实际绑定变化。所有字段有长度上限：建议名称 100 字符、别名各 100 字符且最多 20 个、用途备注 2000 字符、标签最多 20 个；字数以 Unicode 字符计。

GET 不执行远端写动作；POST 远端只读任务仍做限流与审计。创建普通资源返回 201，异步任务返回 202 并带 Location。日志 SSE 是事件流，导出是文件流，均不套 JSON envelope。请求超过长度、无效枚举、非法路径或未知字段返回明确校验错误。

统一错误示例：

```json
{
  "error": {
    "code": "TARGET_CHANGED",
    "message": "该服务的运行实例已变化，请重新查看并预览",
    "details": {"current_generation": 8},
    "safe_retry": "new_preview"
  },
  "request_id": "req_01"
}
```

`safe_retry` 取 `never/read_only/idempotent_same_key/new_preview`，描述可接受的后续行为，不能让浏览器按网络错误直接重发动作。HTTP 接受成功与远端操作成功必须分开。

## 2 接口清单与需求对应

下表路径省略 `/api/v1`。PATCH 只允许该资源的管理员可编辑字段；运行事实只由采集或核验更新。

| 方法与路径 | 请求或查询要点 | 返回与行为 | 需求 |
|---|---|---|---|
| POST `/auth/login` | login_name、password | 建立 cookie 会话，返回管理员与 CSRF token；失败不透露账号是否存在 | F-01 |
| GET `/auth/session`；POST `/auth/logout` | 当前会话 | 会话摘要；注销撤销会话并关闭它的日志流 | F-01 |
| POST `/auth/password-changes` | current_password、new_password；会话与 CSRF | 成功更新密码、撤销所有会话和跟随流，要求重新登录；失败不改变密码 | F-01 |
| GET/POST `/credentials`；PATCH `/credentials/{id}` | 写入 kind、秘密字段；更新带 expected_version | 只写秘密，返回元数据；更换后重新测试关联连接 | F-02、F-14 |
| GET/POST `/servers`；GET/PATCH `/servers/{id}` | 地址、SSH 配置、credential_id、周期、上下文 | 服务器元数据、连接状态、身份与覆盖摘要 | F-02、F-14 |
| POST `/servers/{id}/connection-tests` | 空正文 | 短时连接测试，返回指纹挑战或明确连接结果，不执行部署动作 | F-02 |
| POST `/servers/{id}/host-key-confirmations` | challenge_id、fingerprint、replaces_existing | 保存确认指纹；已有指纹替换必须明确声明并审计 | F-02 |
| POST `/servers/{id}/identity-confirmations` | evidence_id、expected_version、确认新主机或引用现有主机 | 确认 physical_host_key；确证重复时拒绝新 Server | F-02、F-14 |
| POST `/servers/{id}/scans`；GET `/scans/{id}` | 可选 scope，默认全量 | 202 返回扫描 ID；同机已有同类扫描则复用；查询分来源结果 | F-03、F-12 |
| GET `/servers/{id}/capabilities` | 无 | 版本、支持能力、权限缺口与具体原因 | F-03 |
| GET/POST `/products`；GET/PATCH `/products/{id}` | 名称、描述、环境；列表可筛选归档 | 产品及关联服务概况 | F-04 |
| PUT `/products/{product_id}/services/{service_id}` | role=owned/shared、expected_version | 确认关系；owned 冲突需先调整已有归属 | F-04 |
| POST `/products/{product_id}/services/{service_id}/unlink` | expected_version | 仅解除台账关系，不修改服务器 | F-04 |
| POST `/product-service-batches` | changes 数组；每项 upsert/unlink、product_id、service_id、role、expected_version | 单事务全部成功或全部拒绝；返回每项最新关系与统一 request_id | F-04 |
| GET `/services` | server_id、product_id、kind、unassigned、freshness、runtime_state | 本地快照列表；unassigned=true 返回未有人工关系的服务，含未知监听只读 stub 及其入口线索 | F-04、F-07 |
| POST `/services`；GET/PATCH `/services/{id}` | 手工创建仅 site/unmanaged；更新名称、别名、备注、标签 | 服务详情含实例、入口、来源状态与能力 | F-04、F-07 |
| POST `/services/{id}/binding-adoptions` | candidate_binding_id、expected_generation、双方 version | 同主机同类型人工确认续接；无活动动作才可迁移绑定 | F-04、F-12 |
| GET `/search` | q、server_id、kind、protocol、scope | 返回匹配位置、服务器、归属与证据；数字 q 精确匹配端口 | F-05 |
| GET/POST `/services/{id}/endpoints`；PATCH `/endpoints/{id}` | 人工 URL/路径/协议、已登记关联引用 | 返回入口及 listener/published 区别；自动事实不能由 PATCH 改写 | F-06 |
| POST `/endpoint-links`；PATCH `/endpoint-links/{id}` | 两个已登记端点、relation、expected_version | 建立人工确认的 via/routes_to/publishes 关系 | F-06 |
| GET/POST `/services/{id}/log-sources`；PATCH `/log-sources/{id}` | 文件来源的绝对路径、名称、运行用户、enabled | 返回来源可用性；路径校验失败不保存启用状态 | F-08 |
| POST `/log-sources/{id}/reads` | tail 默认 200，范围 1–2000 | 有限历史行、截断/空日志信息；不会创建持续跟随 | F-08 |
| POST `/log-sources/{id}/sessions` | tail、expected_generation | 201 返回 stream_id 和 events_url；显式创建远端跟随会话 | F-08 |
| GET `/log-sessions/{id}/events`；DELETE `/log-sessions/{id}` | Last-Event-ID；删除需 CSRF | SSE 跟随或结束会话；仅所属管理员会话可访问 | F-08 |
| GET/PUT `/services/{id}/action-profile` | 固定管理器配置、探针、expected_version | 配置检查结果与禁用原因，不执行重启 | F-09 |
| POST `/services/{id}/operation-previews` | action=restart、target_binding_id、expected_generation | 返回固定目标、管理方式、影响、版本和时效 | F-09 |
| POST `/services/{id}/operations` | 预览引用、版本与目标；Idempotency-Key | 202 创建 queued 操作；重复键返回原记录 | F-10 |
| GET `/operations`；GET `/operations/{id}` | server_id、service_id、state、时间范围 | 操作状态、实例范围、证据、核验范围与输出摘要 | F-10、F-11 |
| POST `/operations/{id}/cancel` | expected_version | 只允许 queued；其他状态返回冲突 | F-10 |
| POST `/operations/{id}/reconciliations` | expected_version | 发起或复用只读核验，禁止重发管理命令 | F-10、F-11 |
| POST `/operations/{id}/acknowledgements` | expected_version、acknowledge_unknown=true、note | 仅 unknown，解除锁但历史状态仍 unknown | F-10、F-11 |
| GET `/observations`；GET `/audit-events` | 服务器/对象、事件类别、时间范围 | 变化摘要与脱敏审计，分页 | F-11、F-12 |
| GET `/exports/catalog` | format=json/csv | 只导出台账、归属和入口；不含凭据或完整数据库 | F-13 |
| GET/PATCH `/settings`；GET `/system/status` | expected_version 与允许配置 | 本地配置、维护模式、readiness/degraded 原因 | F-14 |

归档采用相应 PATCH 的 `archived=true`，服务器须无活动操作，产品/服务归档不会停止远端程序；归档服务保留历史和绑定以防重复发现。Server enabled=false 仅暂停，archived=true 另设置 archived_at 并隐藏。恢复服务器 archived=false 后仍 enabled=false，connection_status=unknown，须在当前配置版本下重新测试连接并确认信任/身份，再提交 enabled=true；否则返回 SERVER_RETEST_REQUIRED。恢复归档显式操作，不能由扫描悄悄恢复。`binding-adoptions` 不改写历史绑定归属，而是结束候选当前绑定、在被确认的目标服务上建立续接绑定；空候选台账归档，来源变更留痕。双方须无活动操作，相关 ActionProfile 失效并要求重新配置，避免旧脚本自动接管新资源。

未知监听由扫描创建只读 unmanaged service stub，Endpoint.service_id 必填，不另设 endpoint 认领接口。待整理页按 Service 统一查询和认领；没有准确进程身份的 stub 没有运行绑定和重启能力。确认产品归属只写关系及 provenance，不能改监听事实，也不能令 stub 可重启。容量口径为 1000 条非 published_port 入口加 5000 条 published_port 映射，即最多 6000 条 Endpoint。

批量接口 changes 建议最多 200 项，每项 action=upsert/unlink；upsert 提供 role，unlink 不提供 role。先校验全部 ID、版本、请求内重复关系及变更后“至多一个 owned”的约束，再用同一个数据库事务应用关系和审计；任一项失败则回滚全部。成功统一返回全部结果；失败返回 errors 数组，标明 item_index/code，不返回部分成功。关系移动可以在同批次解除旧 owned 并添加新 owned，校验最终结果而不是请求顺序；不触发任何远端命令。

密码变更先验证当前密码和配置的密码策略，再事务更新 password_hash/password_changed_at、撤销全部 AdminSession 并写脱敏审计。成功返回 200 `relogin_required=true`，清除当前 cookie，终止全部管理员跟随流；已接受远端操作仍按持久化状态完成记录。当前密码错误或新密码不合规时不改变密码和会话，不记录正文中的秘密。

F-13 完整备份和恢复只通过管理端 CLI：一致性备份、校验、恢复到维护模式、按迁移规则处理历史任务。首版没有网页数据库下载、主密钥下载或上传备份恢复端点。CSV/JSON 导出只用于便携台账，不能宣传为可恢复的完整备份。

## 3 关键资源的请求与响应

### 3.1 服务器接入与指纹流程

```json
{
  "name": "主服务器",
  "host": "192.0.2.10",
  "ssh_port": 22,
  "ssh_user": "atlas",
  "credential_id": "cred_01",
  "scan_interval_seconds": 30,
  "pm2_contexts": [
    {"user": "app", "pm2_home": "/home/app/.pm2", "executable": "/usr/local/bin/pm2"}
  ]
}
```

创建后 connection_status=unknown、coverage=never、identity_status=unverified。第一次测试取得主机公钥并中止到需要确认的边界，返回 challenge_id、算法、SHA256 指纹、有效期和 `host_key_status=confirmation_required`；尚未受信任时不运行采集命令。管理员核对后提交确认，再次测试才可正常认证和能力探测。挑战绑定服务器地址和配置版本，建议有效 5 分钟；地址、用户或凭据变化后旧挑战失效。

已登记主机出现新密钥时返回 `host_key_mismatch`，原指纹不变，暂停该主机远端任务。替换确认须引用本次真实挑战，不能让客户端直接写入任意指纹。连接测试得到 auth_failed/unreachable 作为明确业务状态返回，不转换为“服务器空清单”。秘密只在服务端内存短时解密。

同一物理主机只有一条 Server；SSH 用户通过主配置及 PM2/systemd 上下文区分。身份确认结合已采集机器证据，发现别名确证指向现有机器时返回 `DUPLICATE_SERVER` 并提供 existing_server_id；不依据相同 host key 自动合并克隆机器。未确认身份不派发写动作，即使 SSH 已在线。

### 3.2 服务详情

```json
{
  "data": {
    "id": "svc_01",
    "server_id": "srv_01",
    "kind": "systemd",
    "display_name": "知识库 API",
    "version": 3,
    "generation": 7,
    "runtime": {
      "state": "running",
      "observed_at": "2026-10-08T02:00:00Z",
      "freshness": "fresh",
      "source_scope": "systemd:system"
    },
    "health": {"state": "not_configured", "observed_at": null},
    "bindings": [{"id": "binding_01", "generation": 7, "active": true, "label": "knowledge-api.service"}],
    "products": [{"id": "prod_01", "name": "知识库", "role": "owned"}],
    "capabilities": {
      "read_logs": {"enabled": true, "reason_codes": []},
      "restart": {"enabled": true, "reason_codes": [], "scope": "single_binding"}
    },
    "coverage": {"latest_scan": "partial", "missing_scopes": ["nginx:default"]}
  },
  "request_id": "req_02"
}
```

详情另含 endpoints、log_sources、action_profile 摘要与最近操作；大型日志不内嵌。`runtime` 新鲜不意味着 nginx 路由也新鲜，入口各自返回 observed_at/freshness。缺主密钥时可正常返回缓存详情，capabilities 的远端项目为 disabled 并注明 `MASTER_KEY_UNAVAILABLE`。

搜索 `q=8080` 返回每台机器的监听或映射类型、协议、地址、网络范围、关联产品和匹配字段。`192.0.2.10:8080/tcp`、`[::]:8080/tcp` 与容器 `8080/tcp` 分项显示；无绑定地址的查询也不能删除这些上下文。

### 3.3 预览与幂等提交

预览请求：

```json
{"action":"restart","target_binding_id":"binding_01","expected_generation":7}
```

预览返回以下必需字段：`preview_id`、`expires_at`、`service_id`、`target_binding_id`、`expected_generation`、`profile_version`、`can_execute`、`blocked_reasons`、`action_label`、`execution_user`、`instance_scope`、`known_impacted_products`、`verification_scope`。默认时效 60 秒；预览存受限进程内 TTL 缓存并绑定当前会话，控制台重启则旧预览失效，已接受 Operation 的固定快照不依赖此缓存。预览仅输出脱敏后的固定动作说明，不回传可执行 shell 字符串。未配置探针时 verification_scope 明确为 runtime_only；多实例应用则显示“仅重启选中实例，其他实例不在本次范围内”。

提交请求使用 `Idempotency-Key: <本次意图的 UUID>`：

```json
{
  "action": "restart",
  "target_binding_id": "binding_01",
  "expected_generation": 7,
  "profile_version": 2,
  "preview_id": "preview_01",
  "reason": "排查接口响应异常"
}
```

202 响应返回 operation.id、state=queued、version、轮询地址及 `active_lock=true`。浏览器保存 key，只有同一提交意图的网络重试才复用它。后端首先查询 key：请求一致返回原操作，即使预览后来过期；负载不同返回 `IDEMPOTENCY_CONFLICT`。新意图要求新预览和新 key，不能借 key 绕过目标校验。

派发前再次检查主机信任、身份、权限、配置 version、Service generation、目标实例和脚本摘要。任何目标变化都先记录 failed 与 `TARGET_CHANGED/PROFILE_CHANGED`，不会自动改目标。service 互斥和 resource_lock_key 互斥都在事务内检查，避免重复台账操作同一资源。

Operation 响应必须包含：

| 字段 | 用途 |
|---|---|
| state、version、created_at、started_at、finished_at | 前端轮询与并发校验 |
| target_snapshot、instance_scope | 确认操作哪台机器、哪一个实例 |
| command_result.exit_code / error_code / output_summary | 命令明确返回还是连接结果未知 |
| verification.state / scope / checks / observed_at | 运行、监听、应用探针分别的结论 |
| verification.execution_evidence | exit 0 或可归因本次 operation_id 的回执；代次变化只作为当前事实 |
| active_lock、resolution、allowed_next_actions | 可取消、只读核验、未知确认等准确按钮能力 |

前端执行中建议每 2 秒轮询本地 Operation，完成后停止。unknown 不能出现“自动重试”按钮；提供“核验当前状态”和“确认结果未知并解除锁”。明确 exit 0 已是命令执行证据，仍须检查管理器运行状态和探针；unknown 的自动核验必须证明动作可归因本次 Operation，普通代次变化或健康只显示当前恢复，状态仍 unknown。确认解除锁后停止旧操作自动收敛，后续重启不能回填它为 succeeded。

## 4 日志 SSE 契约

### 4.1 创建与资源限制

来源和运行实例在创建时固定。初始 200 行，最多 2000 行；单流 1 MiB 内存环形缓冲，单行超过 64 KiB 按 UTF-8 边界截断并标记。每管理员最多 2 个跟随流、每机最多 2 流；达到限制返回 429 与 limit/current，界面提示关闭已有来源。日志源没有日志返回空结果，不等同于读取失败。

POST sessions 返回相对 `events_url`，GET 通过现有 cookie 访问，不在 URL 放凭据或长效 token。响应为 `text/event-stream`、`Cache-Control: no-store`，部署反向代理关闭此路径缓冲并配置流超时。流 ID 属于会话，退出登录、会话过期、显式关闭、服务器暂停、指纹变化和控制台维护模式都终止流。

### 4.2 事件 schema

事件 ID 为 `stream_id:sequence`，sequence 单调增长；事件 JSON 字段见表。服务端每 15 秒发送注释心跳，心跳不代表远端产生日志。

| event | 必需内容 | 前端行为 |
|---|---|---|
| `opened` | stream_id、source_id、binding_id、generation、mode=history_then_follow | 显示已连接来源和实例 |
| `log` | sequence、text、received_at、source_timestamp 可空、channel=stdout/stderr/raw、truncated | 按事件 ID 去重；纯文本展示，保留 stderr 区别 |
| `gap` | after_sequence、reason=buffer_overflow/cursor_expired、dropped_count 可空 | 插入可见缺口标识，不能声称日志连续完整 |
| `source_changed` | reason=rotation/binding_changed、旧/新代次信息 | 文件轮转继续合法来源；binding 改变时结束原流，要求重新选择 |
| `stream_error` | code、message、safe_retry | 显示读取失败和明确原因；不自动操作服务 |
| `closed` | reason=user/session_expired/source_ended/server_disabled/host_key_mismatch | 关闭 EventSource 与跟随状态 |

```text
id: stream_01:12
event: log
data: {"sequence":12,"text":"request completed","received_at":"2026-10-08T02:00:01Z","source_timestamp":null,"channel":"raw","truncated":false}

```

日志中的 ANSI 控制码、HTML、链接和不可见控制字符按纯文本清理/展示，不能执行，也不把文本自动变成操作指令。received_at 是控制台收到时间；无法解析的源时间保持 null，不能伪造服务端日志时刻。

### 4.3 重连与背压

浏览器断开时远端会话最多保留 15 秒等待同会话重连，之后关闭远端 channel 并释放配额。Last-Event-ID 在内存缓冲内则重放后续事件；已溢出则先发 gap，再发当前缓冲。未知 stream 或控制台重启后返回 404/410，界面显示跟随已结束，需要显式重新创建；不承诺跨控制台重启续传。

慢浏览器不会阻塞无限远端读取：stdout/stderr 及时读取，缓冲有界，丢弃最旧行并统计缺口。SSH 断链后终止当前会话；允许重新打开只读日志，但必须重新核验来源与代次，不能接到同名的新容器而不告知。文件轮转重开时重新执行 realpath、常规文件和允许目录校验。

## 5 稳定错误码

| HTTP | code | 典型触发与后续 |
|---|---|---|
| 400 | VALIDATION_ERROR | 非法字段、端口、枚举、路径格式；返回 fields |
| 401 | SESSION_REQUIRED / LOGIN_FAILED | 登录或重新登录；不返回密码校验细节 |
| 403 | CSRF_FAILED / ACCESS_DENIED | 当前会话与权限校验失败 |
| 403 | CURRENT_PASSWORD_INVALID | 修改密码时当前密码不正确；原密码、会话不变 |
| 404 | RESOURCE_NOT_FOUND | 不存在或不可见对象；日志结束用 STREAM_NOT_FOUND |
| 409 | VERSION_CONFLICT | 管理员编辑冲突，刷新再编辑 |
| 409 | TARGET_CHANGED / PROFILE_CHANGED / PREVIEW_EXPIRED | 重建、配置变化或预览过期；重新预览 |
| 409 | IDEMPOTENCY_CONFLICT | 同键不同负载；禁止自动换 key 重发 |
| 409 | SERVICE_BUSY / RESOURCE_BUSY / HOST_WRITE_BLOCKED | 服务、底层资源或未知整机写操作持锁 |
| 409 | HOST_KEY_MISMATCH / HOST_KEY_UNCONFIRMED | 指纹阻断；不得跳过校验连接 |
| 409 | DUPLICATE_SERVER / HOST_IDENTITY_UNCONFIRMED | 同物理主机别名或身份未确认；使用已有 Server 或完成确认 |
| 409 | SERVER_RETEST_REQUIRED | 恢复归档后或连接配置变化后未完成当前版本连接测试 |
| 409 | OPERATION_NOT_CANCELABLE / STATE_CONFLICT | 动作已派发或未知确认时状态变化 |
| 422 | CAPABILITY_UNAVAILABLE / MANAGEMENT_NOT_CONFIGURED | 缺管理器、权限、上下文或固定配置；保持只读 |
| 422 | IDENTITY_AMBIGUOUS / LOG_SOURCE_INVALID / PROBE_TARGET_REJECTED | 目标歧义、文件或探针不在允许范围 |
| 422 | PASSWORD_POLICY_FAILED | 新密码不符合配置策略；密码和会话均不变 |
| 429 | LOG_STREAM_LIMIT / RATE_LIMITED | 配额或接口限流；只读请求可在 Retry-After 后重试 |
| 502 | REMOTE_READ_FAILED | 有限日志读取/连接测试失败；详细 reason 不含秘密 |
| 503 | MAINTENANCE_MODE / EXECUTOR_UNAVAILABLE / MASTER_KEY_UNAVAILABLE | 本地管理条件不可用；缓存 GET 仍可服务 |
| 504 | READ_TIMEOUT | 直接远端读取超时；只读可重新请求 |

异步 scan/operation 已被接受后，远端失败写入资源的 error_code，不让轮询 GET 返回 502。动作未知使用 Operation state=unknown 与如 `SSH_DISCONNECTED/EXECUTION_TIMEOUT/EXECUTOR_RESTARTED` 的 reason，不用 HTTP 504 暗示命令可以重试。源解析错误、输出截断和权限不足采用 `PARSE_FAILED/OUTPUT_TRUNCATED/PERMISSION_DENIED` 记录在 scope 中。

## 6 统一适配器契约

适配器只负责管理器事实和固定管理动作，台账归属、身份续接、幂等和审计由共享层负责。远端输出是非可信输入，解析器有字节/条数/耗时限制。

| 能力 | 输入 | 输出与保证 |
|---|---|---|
| ProbeCapabilities | Server、已声明上下文、只读权限 | discover/read_logs/restart/verify 的 supported、reason、版本；不能启动管理器 |
| Discover | scope、截止时间、输出预算 | coverage、items、endpoints、evidence、truncated、error；失败不能返回空 complete |
| ReadRuntime | 具体 binding 与期望代次 | 管理器状态、身份摘要、观察时间；不存在返回明确 missing |
| DescribeLogSources | Service 与准确实例 | 结构化日志来源及可用性；不扫描任意磁盘目录 |
| ValidateAction | Profile 与 binding | 固定动作描述、执行身份、真实目标、验证条件和禁用原因；无远端变更 |
| Restart | 持久化 Operation 的固定 target_snapshot | 明确退出码或 unknown outcome；不自行重试、不扩大目标、不回退 kill |
| Verify | 原目标、执行前证据、固定探针 | 运行与健康分别的结果、执行证据、验证范围；只读 |

输出标准 item 至少有 adapter、manager_context、external_id、stable_identity_candidate、identity_confidence、runtime_state、observed_at、runtime_attrs 和 evidence。实例型字段不能用显示名称替代。共享层按 [合并规则](03-architecture-and-data.md#6-采集与合并规则) 决定新增、续接和缺失。

## 7 各部署方式的适配细则

### 7.1 Docker

发现使用明确 Docker 上下文的完整容器清单及结构化 inspect，包含 stopped 容器。必须过滤到白名单字段；不把 inspect 的 Env、认证配置或全部 labels 原样存入数据库。Inspect 提供具体容器详情，便于以完整容器 ID 绑定当前实例。[Docker inspect 文档](https://docs.docker.com/reference/cli/docker/container/inspect/)

Compose project/service 标签可构成稳定逻辑单元，多容器时保留多个 RuntimeBinding。普通容器重建先按已确认身份续接，名称相似仅提出建议。`EXPOSE` 是容器端口声明，PortBindings 是发布配置，`ss` 是宿主监听事实，三者分别存储。host network 容器标明使用宿主网络，不能虚构 `host_port → container_port` 映射；没有发布端口的内部服务仍可登记。

日志针对固定 container ID 使用管理器日志能力；现有日志驱动不支持读取时，返回 unavailable 或提供管理员登记的替代来源，不能把空输出当日志驱动正常。[Docker 日志说明](https://docs.docker.com/engine/logging/)

重启调用具体容器 ID 的 restart，停止等待时间受配置控制并在预览中显示；不执行 compose up、pull、重建或整个项目重启。Docker 的停止等待超时可能最终强制停止容器，因此预览不能承诺始终无中断或优雅退出。[Docker restart 文档](https://docs.docker.com/reference/cli/docker/container/restart/)

运行映射只有正常 Running 且未 Paused/Restarting 时为 running；exited/created/dead 等非运行状态为 stopped，paused/restarting 等特殊或过渡状态为 unknown 并保留原生细节。重启后 inspect 确认相同容器仍存在且正常运行；有 Docker HEALTHCHECK 则按已配置验证，状态 starting 在核验时限内等待。若外部部署工具重建了容器，则原 target 变化，记录事实并保持未知或明确目标变化，不能对新容器补发 restart。Docker 操作权限接近主机管理权限，能力摘要需清楚显示执行上下文。

### 7.2 systemd

首版自动发现系统级 service：明确 system scope，结合当前 units、已登记 unit 和必要的 installed service 清单获取状态。使用 `systemctl show` 的指定属性读取结构化键值，不解析人类可读 status 屏幕；读取规范 unit ID、LoadState、ActiveState、SubState、MainPID、InvocationID、启动时间、FragmentPath、User、WorkingDirectory 与必要 cgroup 摘要。不存在的属性标 unsupported，不能制造默认事实。

systemctl 的 list-units 与 list-unit-files 范围不同，未实例化的 template 也不能当已运行服务；发现器须标明范围。[systemd 官方 systemctl 手册源](https://github.com/systemd/systemd/blob/main/man/systemctl.xml)

状态映射保留原生 detail：active/running 显示 running；inactive/failed 显示 stopped 并保留失败原因；activating/deactivating/reloading 等过渡状态显示 unknown 加原生状态。active/exited 的 oneshot 不能显示持续进程运行，也不能仅凭 exit 0 假定网站健康。系统基础 unit 默认隐藏到系统服务筛选，仍可搜索，不自动授予写权限。

日志使用 journal 的固定 unit 过滤，有限读取及跟随；若现有服务日志写文件，则登记文件源。重启针对明确 canonical unit 和 system scope，由固定 `sudo -n` 允许项执行，拒绝 glob、all、模板未实例化目标和危险系统基础 unit。停止的服务执行 restart 可能被启动，预览需展示这一结果。

用户级 unit 首版可手工登记上下文，但自动发现放后续；只有用户 manager、总线和运行环境明确时才启用能力。核验使用明确运行状态及固定探针；InvocationID/启动时间变化可以展示当前实例已更新，不能单独把 unknown 转成功。

### 7.3 PM2

每个上下文固定运行用户、绝对 PM2_HOME、PM2 可执行路径及已有 daemon。PM2 支持通过不同 PM2_HOME 运行多个实例，不能把机器上所有 PM2 应用当作 root 用户的一个列表。[PM2 多实例说明](https://pm2.keymetrics.io/docs/usage/specifics/#multiple-pm2-on-the-same-server)

发现只通过不会自启动 daemon 的现有连接路径读取结构化列表；不得遍历所有 home 后执行 PM2 CLI。PID/socket 存在检查不足以排除竞态，实施时需验证接入版本的只连接能力，必要时采用管理员预放的受限 RPC/wrapper；无法保证则报告 `CAPABILITY_UNAVAILABLE` 并只展示进程线索。dump.pm2 是持久化配置线索，不能当当前 live 状态。

事实提取 name、namespace、pm_id、脚本路径、cwd、exec_mode、启动时间、restart counter、状态和日志文件；Env 等秘密不存储。相同 PM2 name 不唯一，pm_id 可能被复用，重启前再次检查上下文、脚本与启动代次。只有明确 cluster/应用关系才聚合，默认重启选中 pm_id 对应实例，禁止 name/all 模糊目标和 `--update-env` 改环境。

PM2 online 显示 running，stopped/errored 显示 stopped，launching/stopping 等显示 unknown 并保留细节。重启遵循当前用户现有配置；reload、start、delete、save、resurrect 和批量重启不在首版。PM2 现有 restart 能力可用于固定管理单元，但本产品刻意缩小执行范围。[PM2 进程管理文档](https://pm2.keymetrics.io/docs/usage/process-management/)

日志按实际 out/error 文件或明确实例日志源提供，cluster 合并日志标明共享来源、无法区分实例；文件读取仍受 realpath 与目录限制。[PM2 日志文档](https://pm2.keymetrics.io/docs/usage/log-management/)

### 7.4 Nginx 与静态站点

按管理员声明的 Nginx 实例、配置路径和 prefix 读取配置；允许使用既有实例的 `-T` 获取展开内容，但它同时执行配置检查并尝试打开引用文件，失败须区分权限/配置问题。只在内存解析必需的静态指令，不保存完整配置内容中的秘密。[Nginx 命令参数说明](https://nginx.org/en/docs/switches.html)

首版解析 listen、静态 server_name、location、root/alias、静态 proxy_pass 与明确 upstream 列表，保留 source file/配置块证据。变量、正则 location、rewrite、map、复杂 include 或动态 upstream 超出已验证解析能力时，该路由标 partial/inferred 并请求人工登记；不能自行猜测实际访问 URL。

宿主 443 listener 属于 Nginx 运行单元，站点 URL 单独建 Service/Endpoint，via 关系连接共享监听；proxy_pass 关联可证明的目标入口，多上游建立多个边。同域名共享监听或按路径代理符合 Nginx 的请求分派机制。[Nginx 请求处理说明](https://nginx.org/en/docs/http/request_processing.html)

静态站点没有独立 restart；共享 Nginx 首版只读，不暴露 reload/restart。站点日志按各自 access/error 配置登记；共用日志显式显示“共享日志，包含其他站点请求”。仅配置存在不代表进程运行，也不代表域名可达。

### 7.5 nohup 与手动启动

发现按可读取的进程摘要、cwd、程序路径及 sockets 给出候选，默认只读。nohup 不提供持久服务标识或统一重启契约，不能推导所有日志都在某个 nohup.out，也不能把 ps 命令行直接保存成启动命令。

启用管理须由管理员在远端准备固定绝对路径 restart 脚本，登记运行用户、cwd、日志、准确状态识别方式和探针。脚本负责自己管理该服务的启动/停止及单实例约束；控制台只调用固定脚本，不附带任意客户端参数，不通过 kill 或端口反查自动停止进程。

配置时检查脚本 realpath、允许目录、普通可执行文件、属主/权限、hash；执行前重复校验。脚本改变后返回 PROFILE_CHANGED，重新验证后才可预览。状态脚本同样固定和受限，不是任意命令输入框。手工服务缺状态识别或探针时保持 read-only。

脚本 exit 0 是动作执行证据，仍须状态验证与探针通过；断链后脚本可能已经运行，若没有可信且关联本次 operation_id 的完成证据，只读核验即使健康或启动代次改变也保留 unknown，待管理员确认结果未知。首版不强制安装关联回执组件；控制台不自动修复脚本或迁移到 systemd，迁移建议可在备注中单独记录。

## 8 联调与适配器完成条件

前端可先用本地 fixtures 开发：包含新鲜服务、局部扫描失败、服务器失联、共享 443、多机重复端口、容器重建、PM2 多用户、不可管理手工服务和 unknown 操作。后端先实现这些稳定 JSON schema 与错误映射，再接远端适配器。

每个适配器必须提供一个受控 Linux fixture 和已脱敏输出样本，覆盖命令缺失、权限不足、输出截断、空清单、停止状态、实例代次改变和日志断流。特别验证：没有 PM2 daemon 时发现不会创建它；Docker NAT 映射不依赖 `ss`；partial 不删除旧路由；相同 key 不重复执行；执行后断链不会自动再重启。

联调成功以 API、台账和审计一致为准：每次 UI 重启都能定位一条持久化 Operation，每次 unknown 都保留可解释的证据和后续选项，每次采集缺口都能看到具体来源和时间。完整测试清单与验收阈值由交付文档统一维护。
