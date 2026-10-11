# 会话、收藏命令与并发保护：迟到结果不能跨越注销

## 任务卡

- **任务**：实现会话读取、保守收藏命令、per-ID 锁、epoch 防迟到和注销清理。
- **产出**：最小并发实验 `state-lab/session-epoch.ts`，主项目 `MarketProvider` 聚焦实现。
- **运行**：Node.js 24、React 19.3、同源教学 API；网络故障实验使用 DevTools Offline。
- **完成证据**：失败保持旧 selected，logout 后旧 Promise 不能恢复用户或收藏。
- **边界**：前端锁只减少本页面重复命令；服务端仍负责身份、幂等、CSRF 与一致性。

## 1. 任务背景

用户点收藏，请求尚未完成就注销。若旧 Promise 随后成功，朴素代码会把上一位用户的收藏
重新写回当前页面。`disabled` 也不是同步锁：点击发生到 React 提交禁用状态之间仍可能收到
第二次事件。

本课使用两种独立保护：商品 ID 锁阻止同一目标重复写，session epoch 判定异步结果是否仍
属于当前会话。锁不跨浏览器，epoch 也不撤销服务器事务；两者只约束当前客户端写回。

## 2. 学习目标

完成后你能：

1. 区分 401 与网络/503 会话失败；
2. 用 per-ID `Set` 锁住单个收藏命令；
3. 用递增 epoch 丢弃旧会话结果；
4. 在注销时同步清理客户端私有状态；
5. 解释取消请求、忽略结果与撤销事务的区别。

## 3. 预备知识

复用上一课 `favoriteReducer` 与 `ApiError(status, body)`。接口使用同源 HttpOnly 教学 Cookie，
浏览器代码不读取或持久化凭据。PUT 表示目标“已收藏”，DELETE 表示目标“未收藏”；不要
改为 toggle POST。教学 API 的 Cookie 和 CSRF 标记都不是生产安全证据。

## 4. 核心理论

### 4.1 401 是确定身份结果，网络失败不是

401 表示当前请求没有有效身份，可以清空用户私有状态并显示登录入口。Offline、超时或 503
只说明本次无法确认，不应把最后已知用户误判成已注销。

### 4.2 保守更新先等服务器

命令开始只加入 pending；成功后才更新 selected。失败无需回滚，旧状态自然保留。网络延迟
会更明显，但逻辑适合先建立正确性。第 07 章再以单飞实验比较乐观更新。

### 4.3 epoch 是会话世代号

异步开始时捕获 `epoch.current`。登录身份改变、401 失效或 logout 时递增；then/catch/finally
写回前必须比较。旧结果可以完成，但不能跨世代污染新状态。

### 4.4 Abort 不等于服务端撤销

`AbortController` 可停止客户端等待或传输；服务器可能已经提交 PUT。注销后要以服务端身份
和后续读取为准，不能声称 abort 回滚了数据库。

## 5. 元素、属性、API 或配置清单

| 接口 / 状态 | 用途 | 边界 |
| --- | --- | --- |
| `GET /auth/me` | 读取当前会话摘要 | 401 与基础设施失败分开 |
| `POST /auth/logout` | 撤销会话 | 失败时不能假装服务端已注销 |
| `PUT /favorites/:id` | 幂等设为收藏 | 必须由服务端鉴权 |
| `DELETE /favorites/:id` | 幂等设为未收藏 | 重复调用仍是目标状态 |
| `useRef(Set)` | 同步 per-ID 锁 | 只在当前页面进程 |
| `useRef(number)` | 当前 session epoch | 不替代服务器 session version |
| `AbortSignal` | 取消等待 | 不撤销已提交事务 |
| `aria-pressed` | 暴露收藏开关状态 | 不授予操作权限 |

## 6. 最小可运行案例

最小实验先证明“旧结果被忽略”，不依赖 React。

**完整文件：`state-lab/session-epoch.ts`**

```ts
type User = Readonly<{ id: string; name: string }>;

class SessionEpoch {
  #value = 0;
  user: User | null = null;
  favorites = new Set<string>();

  capture(): number {
    return this.#value;
  }

  accept(epoch: number): boolean {
    return epoch === this.#value;
  }

  applyUser(epoch: number, user: User): void {
    if (this.accept(epoch)) this.user = user;
  }

  applyFavorite(epoch: number, id: string): void {
    if (this.accept(epoch)) this.favorites.add(id);
  }

  invalidate(): void {
    this.#value += 1;
    this.user = null;
    this.favorites.clear();
  }
}

const session = new SessionEpoch();
const oldEpoch = session.capture();
session.applyUser(oldEpoch, { id: "demo-buyer", name: "演示居民" });
session.invalidate();
session.applyFavorite(oldEpoch, "lamp-1");

if (session.user !== null) throw new Error("old user restored");
if (session.favorites.size !== 0) throw new Error("old favorite restored");
console.log("late-session-result-is-ignored");
```

**命令：在 `state-lab` 执行**

```bash
pnpm exec tsc --strict --target ES2022 --module NodeNext \
  --moduleResolution NodeNext session-epoch.ts
node session-epoch.js
```

预期输出 `late-session-result-is-ignored`。渐进扩展：创建新 epoch，写入 `desk-1`，证明新
会话结果可接受，而旧 epoch 仍被拒绝。

## 7. 邻里集市集成案例

以下片段进入 Provider；`api` 必须在非 2xx 时抛出含 status 的 `ApiError`。

**关键片段：`apps/react-web/src/MarketContext.tsx`**

```tsx
const locks = useRef(new Set<string>());
const epoch = useRef(0);

function clearPrivateState() {
  epoch.current += 1;
  locks.current.clear();
  dispatch({ type: "reset" });
  setUser(null);
  setSessionLoading(false);
}

async function refreshSession() {
  const startedAt = epoch.current;
  setSessionLoading(true);
  setSessionError("");
  try {
    const nextUser = await api<User>("/auth/me");
    if (startedAt === epoch.current) setUser(nextUser);
  } catch (error) {
    if (startedAt !== epoch.current) return;
    if (error instanceof ApiError && error.status === 401) {
      clearPrivateState();
    } else {
      setSessionError(toMessage(error, "会话读取失败"));
    }
  } finally {
    if (startedAt === epoch.current) setSessionLoading(false);
  }
}

async function setFavorite(id: string, selected: boolean) {
  if (locks.current.has(id)) return;
  locks.current.add(id);
  const startedAt = epoch.current;
  dispatch({ type: "start", id });
  try {
    await api(`/favorites/${encodeURIComponent(id)}`, {
      method: selected ? "PUT" : "DELETE",
    });
    if (startedAt === epoch.current) {
      dispatch({ type: "saved", id, selected });
    }
  } catch (error) {
    if (startedAt !== epoch.current) return;
    if (error instanceof ApiError && error.status === 401) {
      clearPrivateState();
    } else {
      dispatch({ type: "failed", id, message: toMessage(error, "收藏失败") });
    }
  } finally {
    if (startedAt === epoch.current) locks.current.delete(id);
  }
}

async function logout() {
  await api("/auth/logout", { method: "POST", body: "{}" });
  clearPrivateState();
  setSessionError("");
  setSessionLoading(false);
}
```

初始 `useEffect` 也要捕获 epoch 并在 cleanup abort。logout 只有服务端成功后才声明完成；
若请求失败，显示错误并保留当前会话，避免界面与服务端事实相反。

收藏按钮：

```tsx
const selected = favorites.ids.includes(id);
const pending = favorites.pending.includes(id);
return (
  <button
    type="button"
    aria-pressed={selected}
    disabled={pending || user === null}
    onClick={() => void setFavorite(id, !selected)}
  >
    {pending ? "正在保存" : selected ? "取消收藏" : "收藏"}
  </button>
);
```

disabled 是反馈，`locks.current` 才覆盖提交前窗口；服务端鉴权才覆盖其他客户端。

## 8. 常见错误与排查路径

**明确错误示例：**

```ts
api("/favorites/lamp-1", { method: "PUT" })
  .then(() => dispatch({ type: "saved", id: "lamp-1", selected: true }));
```

它没有会话世代检查。logout 后 Promise resolve 会恢复旧数据。

| 项目 | 记录 |
| --- | --- |
| 现象 | 注销后收藏数量从 0 跳回 1，或旧用户名重新出现 |
| 证据 | Network 显示旧请求在 logout 后完成；React DevTools 显示旧 dispatch |
| 原因 | Promise 写回没有绑定发起时的 session epoch |
| 修复 | 捕获 epoch；身份改变时递增并清私有状态；每次写回前比较 |
| 复验 | 慢网收藏后注销，旧请求完成但 UI 仍为未登录、收藏 0 |

另一个错误是 catch 一律 `setUser(null)`。Offline 后用户被误登出；修复为只有确定 401 才
失效，其他错误进入可重试 `sessionError`。

## 9. 课后题

1. 为什么 disabled 不能替代同步锁？
2. per-ID 锁为什么优于一个全局 boolean？
3. 取消 fetch 是否证明 PUT 没写入？
4. logout 请求失败时为什么不应立即清 UI 并宣称完成？

答案：

1. 状态提交前存在重复事件窗口，也不覆盖脚本或其他标签页。
2. 不同商品可安全并行，不互相阻塞。
3. 不能；服务器可能已收到并提交，需重新读取权威状态。
4. 服务端会话可能仍有效，假清理会制造两端不一致。

## 10. 实践练习

**基础**：Offline 后取消收藏。验收：alert 出现、selected 仍 true、pending 解除。

**进阶**：用可控 deferred Promise 测试先发 `/auth/me`、再 logout、最后 resolve。参考标准：
用户仍为 null，不使用 `setTimeout` 猜顺序。

**故障注入**：暂时删除 epoch 比较。慢网收藏后注销应复现旧收藏回写；恢复检查后复验，
不能通过忽略测试或缩短延迟获得绿色。

## 11. 阶段验收

- [ ] 初始会话、显式 refresh 和 logout 都绑定 epoch。
- [ ] 401 清私有状态，503/Offline 保留已知状态并可重试。
- [ ] 同一 ID 单飞，不同 ID 可并行。
- [ ] PUT/DELETE 使用目标状态而非 toggle endpoint。
- [ ] 写失败保留原 selected，解除 pending。
- [ ] logout 成功后清用户、收藏、锁和错误。
- [ ] 旧 resolve/reject 都不跨 epoch 写回。
- [ ] 已说明前端锁和 abort 不提供服务端事务保证。

## 12. 常见问题

**能否把 epoch 放进 state？**

可以，但它不参与显示。ref 可同步读取且不触发渲染，更适合命令有效性标记。

**为什么不乐观收藏？**

先用保守模型建立并发正确性；第 07 章会在单飞约束下演示乐观回滚。

**401 后是否还要 dispatch failed？**

不应把已重置状态再写入旧商品错误；清私有状态并展示重新登录入口。

## 13. 扩展阅读

资料快照：2026-10-11。

- [React：Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [React：Referencing Values with Refs](https://react.dev/learn/referencing-values-with-refs)
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [MDN：401 Unauthorized](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401)
- [MDN：503 Service Unavailable](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/503)
- [OWASP：Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

兼容边界：此处教学 API 为同源内存服务。生产会话撤销、CSRF、速率限制和跨实例一致性
必须在后端验证。

## 我现在能做到什么

我能让会话相关异步结果只写回发起它的世代，用 per-ID 锁关闭重复命令窗口，并准确区分
“客户端忽略迟到结果”与“服务器事务已被撤销”。

## 单元导航

- 上一单元：[状态所有权、reducer 与 Context](./01-state-ownership-reducer-context.md)
- 下一单元：[外部 store、Context 性能与 SSR](./03-external-store-context-performance-ssr.md)
- 分卷目录：[React](../README.md)
