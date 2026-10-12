# 07 Fetch、表单与浏览器存储

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L1 JavaScript 与 TypeScript
> - 先修：[06 DOM、事件模型与事件委托](./06-DOM事件与事件委托.md)
> - 建议用时：120-180 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[TypeScript](https://www.typescriptlang.org/docs/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 能使用 URL、Request、Response 和 Fetch 发起请求
- 理解 Fetch 只在网络失败等场景自动 reject
- 能处理超时、取消、竞态、错误响应和 JSON 解析失败
- 能使用 FormData 处理原生表单
- 能区分 Cookie、localStorage、sessionStorage、IndexedDB
- 能为本地数据设计版本、容量和隐私边界

---

## 内容讲解

### 一、先构造 URL，再发请求

```js
const url = new URL('/api/articles', window.location.origin);
url.searchParams.set('keyword', 'event loop');
url.searchParams.set('page', '1');

const response = await fetch(url);
```

手工拼接容易遗漏编码：

```js
// 不推荐
fetch(`/api/articles?keyword=${keyword}&page=${page}`);
```

URL API 会正确编码查询值，并明确区分路径与参数。

### 二、Fetch 的错误边界

```js
async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const body = await response.text();
    throw new HttpError(response.status, body);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new TypeError(`预期 JSON，实际为 ${contentType || '未知类型'}`);
  }

  return response.json();
}
```

`fetch()` 收到 404、500 时通常仍会 fulfilled。只有 DNS、连接中断、CORS 拒绝、显式取消等无法得到正常响应的情况才会 reject。

错误至少分层：

```text
网络层：没有拿到 Response
HTTP 层：Response 状态不是 2xx
协议层：Content-Type 或 JSON 结构不符合约定
业务层：接口返回业务错误
```

### 三、超时与取消

现代环境可使用：

```js
const response = await fetch('/api/articles', {
  signal: AbortSignal.timeout(5000),
});
```

需要同时支持主动取消：

```js
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort('timeout'), 5000);

try {
  const response = await fetch('/api/articles', {
    signal: controller.signal,
  });
  return await response.json();
} finally {
  clearTimeout(timeoutId);
}
```

取消不是错误吞掉器。区分用户主动取消、超时和真实网络故障：

```js
try {
  await fetch(url, { signal });
} catch (error) {
  if (signal.aborted) {
    console.log('请求已取消', signal.reason);
    return;
  }
  throw error;
}
```

### 四、处理搜索竞态

用户快速输入：

```text
请求 A: "rea"  ───────────────→ 较晚返回
请求 B: "react" ─────→ 较早返回
```

如果不取消 A，旧结果可能覆盖新结果。

```js
let activeController;

async function searchArticles(keyword) {
  activeController?.abort('superseded');
  activeController = new AbortController();

  const url = new URL('/api/articles', location.origin);
  url.searchParams.set('keyword', keyword);

  const response = await fetch(url, {
    signal: activeController.signal,
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
```

取消只能减少无用工作。服务端仍可能已经处理请求，写操作还需要幂等和并发控制。

### 五、FormData 保留原生表单能力

```html
<form id="article-form">
  <label>
    标题
    <input name="title" required maxlength="100" />
  </label>
  <button type="submit">保存</button>
</form>
```

```js
const form = document.querySelector('#article-form');

form?.addEventListener('submit', async event => {
  event.preventDefault();

  if (!(event.currentTarget instanceof HTMLFormElement)) return;
  if (!event.currentTarget.reportValidity()) return;

  const formData = new FormData(event.currentTarget);

  const response = await fetch('/api/articles', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    // 显示服务端错误
  }
});
```

发送 FormData 时不要手动设置 `Content-Type: multipart/form-data`，浏览器需要自动补充 boundary。

如果接口要求 JSON：

```js
const payload = Object.fromEntries(formData);

await fetch('/api/articles', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
  },
  body: JSON.stringify(payload),
});
```

多选字段可能重复，`Object.fromEntries` 只保留最后一个值，应使用 `formData.getAll()`。

### 六、浏览器存储如何选择

| 方案 | 生命周期 | 容量/特点 | 适合 |
|---|---|---|---|
| Cookie | 按过期策略；随匹配请求发送 | 容量小，可设 HttpOnly/Secure/SameSite | 服务端会话标识、协议状态 |
| sessionStorage | 标签页会话 | 同源、同步 API | 单标签页临时状态 |
| localStorage | 主动清除前长期存在 | 同源、同步 API | 小型非敏感偏好 |
| IndexedDB | 主动清除前长期存在 | 异步、事务、结构化数据 | 大量离线数据、索引 |

localStorage 示例：

```js
const STORAGE_KEY = 'atlas:preferences:v1';

export function savePreferences(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function loadPreferences() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { theme: 'system' };

  try {
    const value = JSON.parse(raw);
    return validatePreferences(value);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { theme: 'system' };
  }
}
```

关键点：

- key 带命名空间和版本。
- JSON 解析可能失败。
- 存储数据也要运行时校验。
- localStorage 是同步 API，不适合大量数据。
- 任何页面脚本都能读取 localStorage，不存访问令牌和敏感个人数据。

### 七、IndexedDB 是数据库，不是“大号 localStorage”

IndexedDB 支持：

- object store
- key 和 index
- 事务
- 异步请求
- Blob 与结构化克隆值

设计前先回答：

1. 数据模型是什么？
2. 主键和查询索引是什么？
3. schema 版本如何升级？
4. 升级失败如何恢复？
5. 用户退出登录时哪些数据必须清理？
6. 多标签页如何协调写入？

复杂项目优先使用成熟封装，但仍需理解事务和升级回调。

### 八、存储不是可靠服务端

浏览器存储可能因以下原因丢失：

- 用户主动清理
- 隐私模式或配额策略
- 浏览器回收
- 站点数据策略
- schema 升级错误

因此：

```text
服务端数据：权威来源
浏览器数据库：缓存、离线副本、待同步操作
内存状态：当前界面工作集
```

离线写入需要冲突策略，不能只在联网后“全部覆盖上传”。

---

## 常见问题

### Q1：为什么 404 没有进入 catch？

因为 Fetch 已拿到合法 HTTP Response。检查 `response.ok` 或状态码并主动抛出 HTTP 错误。

### Q2：CORS 能在前端关闭吗？

不能。CORS 是服务器通过响应头授权浏览器读取跨源响应。前端不能自行授予权限。

### Q3：GET 请求能带 body 吗？

Web 平台 Fetch 不支持 GET/HEAD body。使用查询参数表达读取条件。

### Q4：localStorage 能存对象吗？

只能存字符串。序列化后还要考虑类型丢失、schema 版本和解析失败。

### Q5：Cookie 一定不安全吗？

不是。设置 `HttpOnly`、`Secure`、适当 `SameSite`、最小 Path/Domain 和短生命周期可以建立较强边界。错误配置才是主要风险。

### Q6：IndexedDB 能跨域共享吗？

不能，按 origin 隔离。子域、协议和端口变化都可能形成不同存储空间。

---

## 实操作业

### 基础：文章查询

实现 `fetchArticles({ keyword, page, signal })`：

- 使用 URL API
- 检查 HTTP 状态
- 检查 Content-Type
- 支持取消
- 返回结构化错误

### 进阶：偏好存储

为 Atlas 实现主题、每页数量和最近标签：

- key 带版本
- 数据运行时校验
- 解析失败自动恢复
- 监听 `storage` 事件同步多标签页

### 挑战：离线收藏队列

使用 IndexedDB 保存离线收藏操作：

1. 设计 object store 与索引。
2. 定义 pending/synced/failed 状态。
3. 联网后按幂等键同步。
4. 处理同一文章反复收藏/取消的合并规则。
5. 提供清理和重试界面。

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：URLSearchParams 编码 keyword/page，检查 response.ok 与 MIME 后解析 JSON；signal 传入 fetch。分别测 401、500、HTML 响应、坏 JSON 与取消，取消不伪装成服务器失败。
- **进阶**：schema 版本与字段校验后才恢复；坏 JSON/未知版本走默认值或明确迁移。storage 事件只通知其他文档，同页需自行更新；拒绝存储时仍可继续临时使用。
- **挑战**：IndexedDB 保存 operationId、articleId、最终意图与状态；同文章收藏/取消合并，但已发送操作不能随意删除。重复同步由服务端幂等，失败可重试且不无限循环。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L1 里程碑](../../projects/atlas/milestones/L1.md)
- 本课任务：把“Fetch、表单与浏览器存储”落实为 Atlas 中可独立导入的模块或纯函数，补充正常、边界、异常三类自动测试。
- 起始验证：在 `前端学习路线` 目录运行 `npm run atlas:test`。
- 自动检查：为本课新增或修改的行为补充测试；无法自动化的浏览器行为必须保留截图、Network、Performance 或无障碍树证据。

### 项目验收

- [ ] 正常路径可以从统一入口复现
- [ ] 空值、错误或权限边界至少覆盖一项
- [ ] 相关自动测试通过，且没有删除既有断言
- [ ] 记录一个“现象—原因—验证—结论”
<!-- atlas-task:end -->

---

## 本节小结

- Fetch 的 fulfilled 不代表 HTTP 成功
- 请求错误要区分网络、HTTP、协议和业务层
- AbortSignal 用于取消和竞态控制，不替代服务端幂等
- FormData 保留浏览器原生表单能力
- localStorage 只适合小型非敏感数据，IndexedDB 适合结构化离线数据
- 浏览器存储是可丢失副本，不能替代服务端权威数据

<!-- course-nav:start -->
---

[上一篇：06 DOM、事件模型与事件委托](./06-DOM事件与事件委托.md) · [课程地图](../../README.md) · [下一篇：08 错误处理与调试](./08-错误处理与调试.md)
<!-- course-nav:end -->
