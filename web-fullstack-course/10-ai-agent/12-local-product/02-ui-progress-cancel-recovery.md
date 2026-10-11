# 本地 UI：进度、取消、刷新恢复与未知结果

## 任务卡

- **任务**：用同源页面查询真实任务，展示审批预览，刷新恢复任务 ID。
- **产出**：`labs/ag12b/ui.html`、`ui.mjs`、`ui.test.mjs`。
- **证据**：2 项纯状态测试；浏览器实际联调由 Capstone 承担。
- **边界**：原生 DOM、无 CDN、无图片、无 localStorage 正文缓存；不是 React 生产界面。
- **唯一 ID**：`AG-12B`。

## 1. 任务背景

点击批准后网络响应丢失，UI 不知道 DB 是否提交。应显示“结果未知，刷新查询”，
不能宣称失败后让用户重复创建新任务。任务 ID 写入 URL fragment，刷新用同 ID 查询；
正文不落浏览器持久缓存。旧请求迟到时不能覆盖新任务状态。

## 2. 学习目标

构建语义表单与 live region；解析响应；使用 textContent；
控制按钮状态；中止旧 fetch、丢弃迟到结果；刷新恢复并明确未知结果。

## 3. 预备知识

依赖[Loopback API](./01-loopback-api-task-lifecycle.md)。
浏览器不能直接 import Node 版 Zod，本例实现有限状态响应 parser，完整项目可用本地 bundler
共享 schema，但不为这一页加入依赖和云资源。

<a id="ag-12b-s4"></a>
## 4. 核心理论

### 4.1 服务端状态是权威

页面只根据 Snapshot 渲染审批与终态；cancel 先调用服务，不只停轮询。
已 committed 的 cancel 仍显示 committed，删除是新的明确操作，不修改既有历史事实。
刷新保留 ID，可查询 checkpoint 与任务表；浏览器关闭不意味着服务器取消。

### 4.2 迟到响应不能倒退状态

每次 request 增加 generation，旧请求 abort；结果只有 generation 相同才渲染。
AbortController 停止等待不保证服务端没执行，因此写请求失败后保留 ID 并允许刷新。
创建响应丢失且没有 ID 是尚未解决的边界，不能自动重发 POST；应停止并从本地任务清单恢复。
本课程不声称自动消除所有“创建结果未知”情形。

### 4.3 内容展示不能执行来源代码

answer 与 preview 使用 textContent，不用 innerHTML，恶意引用中的标签仍作为文本。
HTML 语义控件、labels、aria-live、focus 与键盘操作属于主路径。
没有外部资源；CSP 只允许同源脚本和连接。fragment 只保存合成 ID，不保存题目或资料。

## 5. 界面状态

| 状态 | 可操作 | 文案 |
| --- | --- | --- |
| idle | 创建 | 输入问题与任务标题 |
| running | 取消、刷新 | 正在执行 |
| awaiting_approval | 批准、拒绝、取消 | 核对计划与来源 |
| committed | 刷新、删除 | 已提交本地任务 |
| completed/rejected/cancelled/failed | 刷新、删除 | 明确终态 |
| 请求未知 | 刷新 | 不自动重试写入 |

<a id="ag-12b-s6"></a>
## 6. 最小可运行页面

完整文件 `labs/ag12b/ui.html`：

<!-- file: labs/ag12b/ui.html -->
```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>本地私有资料 Agent</title>
<main>
  <h1>本地私有资料与任务 Agent</h1>
  <p>仅处理启动时明确选择的资料。远程模型、文件写、Shell 和通知关闭。</p>
  <form id="create">
    <p><label for="question">资料问题</label>
      <input id="question" name="question" required minlength="2" maxlength="80" value="backup"></p>
    <p><label for="title">待批准任务标题</label>
      <input id="title" name="title" required maxlength="120" value="Make a local backup reminder"></p>
    <button id="start">创建任务</button>
  </form>
  <h2>任务状态</h2>
  <p id="status" role="status" aria-live="polite">尚未创建任务</p>
  <pre id="answer"></pre>
  <h2>审批预览</h2>
  <pre id="preview"></pre>
  <p>
    <button id="approve" disabled>批准计划</button>
    <button id="reject" disabled>拒绝计划</button>
    <button id="cancel" disabled>取消任务</button>
    <button id="refresh" disabled>刷新状态</button>
    <button id="delete" disabled>删除本地任务记录</button>
  </p>
  <p id="error" role="alert"></p>
</main>
<script type="module" src="/ui.js"></script>
</html>
```

完整文件 `labs/ag12b/ui.mjs`：

<!-- file: labs/ag12b/ui.mjs -->
```js
const statuses = new Set(["running", "awaiting_approval", "completed", "committed",
  "rejected", "cancelled", "failed"]);
export function parseSnapshot(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("invalid_response");
  if (Object.keys(raw).some(key => !["id", "status", "answer", "preview", "digest", "error"].includes(key))) {
    throw new Error("invalid_response");
  }
  if (typeof raw.id !== "string" || !/^[a-z0-9-]{1,80}$/.test(raw.id)
    || !statuses.has(raw.status)) throw new Error("invalid_response");
  for (const [field, max] of [["answer", 2000], ["preview", 4000]]) {
    if (raw[field] !== undefined && (typeof raw[field] !== "string" || raw[field].length > max)) {
      throw new Error("invalid_response");
    }
  }
  if (raw.digest !== undefined && (typeof raw.digest !== "string" || !/^[a-f0-9]{64}$/.test(raw.digest))) {
    throw new Error("invalid_response");
  }
  if (raw.error !== undefined && !["task_failed", "cancelled"].includes(raw.error)) {
    throw new Error("invalid_response");
  }
  if (raw.status === "awaiting_approval" && (!raw.digest || !raw.preview)) {
    throw new Error("invalid_approval");
  }
  return raw;
}
export function controls(snapshot) {
  return { approve: snapshot.status === "awaiting_approval",
    cancel: ["running", "awaiting_approval"].includes(snapshot.status),
    delete: !["running", "awaiting_approval"].includes(snapshot.status) };
}
if (typeof document !== "undefined") {
  const $ = id => document.getElementById(id);
  const labels = { running: "正在执行", awaiting_approval: "等待审批，请核对计划",
    completed: "回答完成，未写入任务", committed: "已提交本地任务",
    rejected: "计划已拒绝", cancelled: "任务已取消", failed: "任务失败，未宣称提交成功" };
  let id = location.hash.slice(1), snapshot, generation = 0, controller, timer;
  let busy = false;
  const render = value => {
    snapshot = parseSnapshot(value); id = snapshot.id; location.hash = id;
    $("status").textContent = `${id}: ${labels[snapshot.status]}`;
    $("answer").textContent = snapshot.answer ?? "";
    $("preview").textContent = snapshot.preview ?? "";
    const state = controls(snapshot);
    $("approve").disabled = $("reject").disabled = !state.approve || busy;
    $("cancel").disabled = !state.cancel || busy;
    $("delete").disabled = !state.delete || busy;
    $("refresh").disabled = busy;
  };
  async function request(path, data) {
    clearTimeout(timer); controller?.abort();
    const current = ++generation; controller = new AbortController(); busy = true;
    $("error").textContent = ""; $("start").disabled = true;
    for (const key of ["approve", "reject", "cancel", "refresh", "delete"]) $(key).disabled = true;
    try {
      const response = await fetch(path, { signal: controller.signal,
        ...(data === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify(data) }) });
      if (!response.ok) throw new Error("operation_rejected");
      const value = await response.json();
      if (current !== generation) return;
      busy = false;
      if (path === "/delete") {
        if (value.deleted !== true) throw new Error("invalid_response");
        id = ""; snapshot = undefined; location.hash = "";
        $("status").textContent = "本地任务记录已删除";
        $("answer").textContent = $("preview").textContent = "";
      } else {
        render(value);
        if (snapshot.status === "running") timer = setTimeout(() => request(`/task/${id}`), 500);
      }
    } catch {
      if (current === generation) {
        busy = false; $("error").textContent = "操作结果未知或被拒绝。保留任务 ID，刷新查询；不自动重试写入。";
        $("refresh").disabled = !id;
      }
    } finally { if (current === generation) { busy = false; $("start").disabled = false; } }
  }
  $("create").addEventListener("submit", event => {
    event.preventDefault();
    if (!busy) request("/task", { question: $("question").value, title: $("title").value });
  });
  for (const action of ["approve", "reject"]) {
    $(action).addEventListener("click", () => request("/decision",
      { id, decision: { action, digest: snapshot.digest } }));
  }
  $("cancel").addEventListener("click", () => request("/cancel", { id }));
  $("refresh").addEventListener("click", () => request(`/task/${id}`));
  $("delete").addEventListener("click", () => {
    if (confirm("删除此本地任务记录、checkpoint 与 trace？源资料需单独撤回。")) request("/delete", { id });
  });
  window.addEventListener("pagehide", () => { clearTimeout(timer); controller?.abort(); });
  if (/^[a-z0-9-]{1,80}$/.test(id)) request(`/task/${id}`);
}
```

<a id="ag-12b-s7"></a>
## 7. 测试与运行

完整文件 `labs/ag12b/ui.test.mjs`：

<!-- file: labs/ag12b/ui.test.mjs -->
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSnapshot, controls } from "./ui.mjs";
test("invalid and incomplete approval cannot enable write buttons", () => {
  assert.throws(() => parseSnapshot({ id: "task-1", status: "success" }));
  assert.throws(() => parseSnapshot({ id: "task-1", status: "awaiting_approval" }));
  assert.throws(() => parseSnapshot({ id: "task-1", status: "running", actor: "bob" }));
  const value = parseSnapshot({ id: "task-1", status: "awaiting_approval",
    preview: "Create a local task.", digest: "a".repeat(64) });
  assert.equal(controls(value).approve, true);
});
test("committed and cancelled are distinct terminal states", () => {
  for (const status of ["committed", "cancelled", "failed"]) {
    const state = controls(parseSnapshot({ id: "task-1", status }));
    assert.equal(state.approve, false);
    assert.equal(state.cancel, false);
    assert.equal(state.delete, true);
  }
});
```

```bash
node --check labs/ag12b/ui.mjs
node --test labs/ag12b/ui.test.mjs
```

预期 2 项通过。页面必须由 AG-14A 服务器提供，不能双击 file:// HTML；
完整启动命令见 Capstone。停止用 Ctrl+C，刷新仅恢复同 ID，不自动批准。

<a id="ag-12b-s8"></a>
## 8. 错误实验与排查

把 awaiting_approval 必须有 digest/preview 的判断删除，第一项红灯。
恢复后复验。UI 显示 committed 却 DB 无行时检查 backend，不能改文案隐藏冲突。
禁止把恶意 answer 用 innerHTML 展示；浏览器验收要使用带 `<img onerror>` 的合成文本。

## 9. 课后题与答案

1. abort fetch 等于取消任务吗？不是，必须调用 cancel API。
2. 刷新会重新批准吗？不会，按 fragment ID 查询。
3. 为什么 fragment 不存问题？问题可能敏感，ID 足以恢复。
4. 请求失败能自动新建同一任务吗？不能，写结果可能未知。

<a id="ag-12b-s10"></a>
## 10. 三类练习与答案

**基础**：答案含 HTML 标签。答案：textContent 显示原文，不执行事件；CSP 也是额外防线。

**进阶**：持久任务清单。答案：新增 actor 绑定的列表接口和本地恢复入口，
为创建响应丢失提供权威查找；新增端点前定义分页、保留和对象授权，不猜任务成功。

**故障注入**：旧请求在新任务后返回。答案：generation 不同不 render；
abort 只是优化，generation 才明确禁止迟到覆盖。

<a id="ag-12b-s11"></a>
## 11. 阶段验收

- [ ] 2 项纯逻辑测试通过。
- [ ] 浏览器通过创建、预览、拒绝、批准、取消、刷新与删除。
- [ ] live region、键盘按钮、恶意文本不执行。
- [ ] 未知结果不自动重试写；关闭页不假报已取消。

## 12. 常见问题

**为什么没有 WebSocket？** 小规模本地状态轮询足够，减少连接协议与恢复复杂度。
需要高频进度时可增加 SSE，但仍要处理取消、迟到和终态，不能只替换 transport。

## 13. 扩展阅读

[AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)、
[textContent](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)。

## 我现在能做到什么

我能通过本地 UI 操作真实任务，保持未知、取消、审批与提交语义一致。

## 单元导航

- 上一单元：[Loopback API](./01-loopback-api-task-lifecycle.md)
- 下一单元：[一致备份与删除账本](../13-delivery/01-backup-restore-deletion-ledger.md)
- 本卷入口：[README](../README.md)
