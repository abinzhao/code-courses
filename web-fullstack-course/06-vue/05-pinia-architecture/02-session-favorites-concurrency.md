# 让会话与收藏在乱序响应中收敛

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | 上一课的 `market` setup store、`ApiError`、幂等 HTTP |
| 输入 | 会话读取、登录/退出、`PUT/DELETE` 收藏和任意完成顺序 |
| 输出 | 每 ID busy、epoch 隔离、失败保持、401 恢复 |
| 重点文件 | `src/stores/market.ts`、`FavoriteButton.vue`、store 测试 |
| 验证 | deferred Promise 顺序测试、离线失败、退出期间晚到响应 |
| 边界 | 客户端锁不替代服务端幂等、权限和持久化 |

## 1. 任务背景

用户在弱网下点击收藏，随后退出。旧收藏请求可能晚于退出完成。如果它仍写回 store，匿名界面会重新出现前一用户的收藏。另一个常见错误是先乐观反转图标，再遇到失败却不知道服务器是否执行，最终 UI 与服务端分叉。

本课采用保守策略：请求成功后才提交客户端反馈；每个商品串行，但不同商品可并行；每次会话边界递增 epoch，旧请求只能结束，不能回写新会话。

## 2. 学习目标

- 区分“目标状态命令”和“反转当前状态命令”。
- 使用每 ID busy 防止同一商品并发，保留不同商品并行。
- 使用 epoch/generation 阻止旧请求跨登录、退出或 401 回写。
- 正确区分 401 与网络/503，并定义退出失败语义。
- 用可控 Promise 测试完成顺序，不依赖随机 sleep。

## 3. 预备知识

收藏契约为：

```text
PUT    /api/v1/favorites/:listingId  -> 最终已收藏
DELETE /api/v1/favorites/:listingId  -> 最终未收藏
```

重复发送相同目标仍收敛到同一状态。Cookie 由浏览器自动发送；前端不保存凭据。`api()` 必须在 `response.ok === false` 时抛出含 status 的 `ApiError`。

## 4. 核心理论

### 4.1 保守提交与幂等目标

反转接口“再切一次”在重试时可能恢复原状态。`PUT/DELETE` 描述目标，即使客户端不知道上一次响应是否丢失，也能安全重发同一目标。

保守提交时序：

```text
读取已确认状态 → 锁定 listingId → 发送目标 → 成功后提交 → 解锁
                                      └→ 失败：保留旧状态
```

它牺牲瞬时反馈速度，换取更清晰的失败语义。乐观更新也可以做，但必须保存基线、序列化同一实体写入并处理服务端最终状态；本章不把复杂性藏掉。

### 4.2 epoch 是客户端结果所有权

请求开始时保存 `token = epoch`。登录、退出、401 确认匿名时递增 epoch。请求完成后只有 `token === epoch` 才能写回。

epoch 不取消服务器执行，也不提供事务。它只回答：“这个结果还属于当前浏览器会话吗？”若可能，应同时传 `AbortSignal` 减少浪费；但写请求即使中止连接，也不能假设服务器回滚。

### 4.3 退出失败

只有服务端确认 `/auth/logout` 成功后才清本地会话。若请求失败，保留当前摘要并显示“退出失败，请重试”，避免 UI 假装匿名而 Cookie 仍有效。401 则不同：服务端已确认当前请求没有有效身份，可以清理客户端用户数据。

## 5. 元素、属性、API 或配置清单

| 接口/状态 | 作用 | 成功规则 | 失败规则 |
| --- | --- | --- | --- |
| `loadSession()` | 读取 `/auth/me` | 当前 epoch 写入用户 | 401 清理；其他错误可重试 |
| `login()` | 建立教学会话 | 先切 epoch，再写新用户 | 保留匿名并显示错误 |
| `logout()` | 撤销会话 | 响应成功后清理 | 不清本地摘要 |
| `setFavorite(id, enabled)` | 设置目标状态 | 成功且 epoch 相同才更新 | 保留旧选中状态 |
| `busyById[id]` | 同实体单飞 | 请求期间 `true` | finally 解锁当前 epoch |
| `epoch` | 会话代际 | 会话边界递增 | 不是安全凭据 |
| `aria-pressed` | 暴露按钮选中状态 | 与已确认状态一致 | pending 不伪造成功 |

## 6. 最小可运行案例

先在纯 TypeScript 中观察旧任务为何必须失效。

**完整文件：`apps/vue-web/src/labs/epoch.ts`**

```ts
export function createEpochGuard() {
  let epoch = 0
  return {
    capture: () => epoch,
    current: (token: number) => token === epoch,
    advance: () => {
      epoch += 1
      return epoch
    },
  }
}
```

**完整文件：`apps/vue-web/src/labs/epoch.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { createEpochGuard } from './epoch'

describe('epoch guard', () => {
  it('会话切换后拒绝旧 token', () => {
    const guard = createEpochGuard()
    const beforeLogout = guard.capture()
    expect(guard.current(beforeLogout)).toBe(true)
    guard.advance()
    expect(guard.current(beforeLogout)).toBe(false)
    expect(guard.current(guard.capture())).toBe(true)
  })
})
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm exec vitest run src/labs/epoch.test.ts
```

预期 1 个测试通过。错误实验是让 `advance()` 不增加数值，测试必须失败；恢复后再次通过。

## 7. 邻里集市集成案例

**关键片段：`apps/vue-web/src/stores/market.ts`**

```ts
function clearPrivateState() {
  user.value = null
  favoriteIds.value = []
  busyById.value = {}
}

function resetClientSession() {
  epoch.value += 1
  clearPrivateState()
}

async function loadSession() {
  if (sessionStatus.value === 'loading') return
  const token = epoch.value
  sessionStatus.value = 'loading'
  sessionError.value = ''
  try {
    const result = await api<UserSummary>('/auth/me')
    if (token !== epoch.value) return
    user.value = result
    sessionStatus.value = 'ready'
  } catch (error) {
    if (token !== epoch.value) return
    if (error instanceof ApiError && error.status === 401) {
      resetClientSession()
      sessionStatus.value = 'ready'
      return
    }
    sessionStatus.value = 'error'
    sessionError.value = toMessage(error, '会话读取失败。')
  }
}

async function login() {
  const token = epoch.value + 1
  epoch.value = token
  clearPrivateState()
  sessionStatus.value = 'loading'
  sessionError.value = ''
  try {
    const result = await api<UserSummary>('/auth/login', {
      method: 'POST',
      body: '{}',
    })
    if (token !== epoch.value) return
    user.value = result
    sessionStatus.value = 'ready'
  } catch (error) {
    if (token !== epoch.value) return
    sessionStatus.value = 'error'
    sessionError.value = toMessage(error, '登录失败。')
    throw error
  }
}

async function logout() {
  const token = epoch.value + 1
  epoch.value = token
  sessionStatus.value = 'loading'
  sessionError.value = ''
  try {
    await api('/auth/logout', { method: 'POST', body: '{}' })
    if (token !== epoch.value) return
    clearPrivateState()
    sessionStatus.value = 'ready'
  } catch (error) {
    if (token !== epoch.value) return
    sessionStatus.value = 'error'
    sessionError.value = toMessage(error, '退出失败。')
    throw error
  }
}

async function setFavorite(id: string, enabled: boolean) {
  if (!user.value) throw new Error('请先登录。')
  if (busyById.value[id]) return
  const token = epoch.value
  busyById.value = { ...busyById.value, [id]: true }
  try {
    await api(`/favorites/${encodeURIComponent(id)}`, {
      method: enabled ? 'PUT' : 'DELETE',
    })
    if (token !== epoch.value) return
    favoriteIds.value = enabled
      ? [...new Set([...favoriteIds.value, id])]
      : favoriteIds.value.filter(value => value !== id)
  } catch (error) {
    if (token !== epoch.value) return
    if (error instanceof ApiError && error.status === 401) {
      resetClientSession()
      sessionStatus.value = 'ready'
    }
    throw error
  } finally {
    if (token === epoch.value) {
      busyById.value = { ...busyById.value, [id]: false }
    }
  }
}
```

`toMessage` 只把安全、面向用户的消息映射出来，不直接渲染堆栈或后端内部详情。

**关键片段：`apps/vue-web/src/FavoriteButton.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMarketStore } from './stores/market'

const props = defineProps<{ listingId: string }>()
const store = useMarketStore()
const selected = computed(() => store.favoriteIds.includes(props.listingId))
const feedback = ref('')
const failed = ref(false)

async function submitTarget() {
  feedback.value = ''
  failed.value = false
  const target = !selected.value
  try {
    await store.setFavorite(props.listingId, target)
    feedback.value = target ? '已收藏。' : '已取消收藏。'
  } catch (error) {
    failed.value = true
    feedback.value = error instanceof Error ? error.message : '收藏失败。'
  }
}
</script>

<template>
  <div>
    <button type="button"
      :disabled="!!store.busyById[listingId]"
      :aria-pressed="selected"
      @click="submitTarget">
      {{ store.busyById[listingId] ? '正在保存' : selected ? '取消收藏' : '收藏' }}
    </button>
    <p v-if="feedback" :role="failed ? 'alert' : 'status'">{{ feedback }}</p>
  </div>
</template>
```

登录成功使用固定演示身份 `demo-buyer / 演示居民`。按钮禁用只减少重复意图，真正的幂等和授权必须由 API 实现。

## 8. 常见错误与排查路径

**错误示例：请求前立即反转，失败时不恢复。**

```ts
favoriteIds.value = selected ? without(id) : [...favoriteIds.value, id]
await api('/favorites/toggle', { method: 'POST' })
```

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 退出后收藏重新出现 | 时间线显示旧 PUT 最后完成 | 无 epoch 检查 | 会话边界递增并检查 token | deferred 测试中保持空数组 |
| 离线点击后图标变选中 | 请求失败但先改 state | 无回滚的乐观更新 | 成功后提交或实现完整回滚 | offline 后保持旧状态 |
| 所有收藏按钮都禁用 | 只有一个全局 pending | 锁粒度过大 | `busyById` | 两商品可并行 |
| 退出失败却显示匿名 | Network 为 503 | 失败也 reset | 仅成功后 reset | 重试仍显示当前用户 |
| 401 被显示为系统故障 | `ApiError.status === 401` | 未区分身份和设施错误 | 清理会话并提供登录入口 | 页面进入匿名状态 |

排查时记录请求方法、listing ID、开始 epoch、完成 epoch、HTTP status 和最终数组。不要打印 Cookie 或真实个人数据。

## 9. 课后题

1. **为什么不能只用 `disabled` 防重复收藏？**<br>
   答：另一个标签页、重试或直接请求仍可并发；后端 `PUT/DELETE` 幂等才定义最终状态。
2. **Abort 写请求后能否认为服务器没执行？**<br>
   答：不能。连接中止不等于事务回滚；应通过幂等目标重新收敛或读取服务端状态。
3. **epoch 为什么在登录成功时也要增加？**<br>
   答：登录建立新身份边界，匿名阶段开始的旧请求不得写入新用户视图。
4. **重复 `PUT` 为什么不重复计数？**<br>
   答：客户端用 `Set` 收敛，服务端关系有 `(userId, listingId)` 唯一约束。

## 10. 实践练习

**基础：取消收藏。**先成功 PUT，再成功 DELETE，断言数组为空；DELETE 失败时仍保留原收藏。

**进阶：并行不同 ID。**让 `lamp-1` 与 `desk-1` 请求都处于 pending，断言两个 busy 均为 true，完成一个不解锁另一个。

**故障注入：退出期间晚到。**用 deferred Promise 暂停 PUT，完成 logout 后再 resolve PUT。答案标准：`user === null`、`favoriteIds === []`、`busyById` 不保留前会话条目。

建议测试骨架：

```ts
let finish!: () => void
request.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
const write = store.setFavorite('lamp-1', true)
request.mockResolvedValueOnce({ ok: true })
await store.logout()
finish()
await write
expect(store.favoriteIds).toEqual([])
```

## 11. 阶段验收

- [ ] 同一商品重复 PUT 后只有一个 ID。
- [ ] DELETE 失败保留原选中状态。
- [ ] 401 清理会话；503 保留摘要并显示重试。
- [ ] 退出失败不提前 reset。
- [ ] 退出后旧收藏响应不回写。
- [ ] 每 ID busy 允许不同商品并行。
- [ ] UI 不声称按钮锁提供后端授权或事务。

命令：

```bash
pnpm exec vitest run src/stores/market.test.ts
pnpm exec vue-tsc -b
pnpm build
```

三条命令必须退出 0；实际测试数量以本机输出为准。

## 12. 常见问题

**为什么不直接做乐观收藏？**<br>
可以，但必须处理并发序号、失败回滚、会话切换和服务端最终值。本课先建立可证明正确的保守版本。

**刷新后怎样恢复收藏？**<br>
当前契约没有查询接口，无法恢复。应先设计 `GET /favorites` 或用户详情字段、分页和缓存规则，再实现重新验证。

**多标签页退出怎样同步？**<br>
本课只保证单应用实例。生产可结合服务端 401、`BroadcastChannel` 或受控 storage 事件同步摘要，不能复制 HttpOnly 凭据。

## 13. 扩展阅读

资料快照日期：2026-10-10。

- [Pinia Actions](https://pinia.vuejs.org/core-concepts/actions.html)：异步 action 与错误传播。
- [MDN HTTP PUT](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/PUT)：目标资源替换和幂等语义。
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)：中止只影响客户端等待的边界。
- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：收藏、会话和授权要求。

## 我现在能做到什么

我能让会话和收藏在失败、重复点击、退出和响应乱序下收敛到可解释状态，并知道客户端协调不能替代后端约束。

## 单元导航

[上一课：状态所有权](01-state-ownership-pinia-store.md) · [返回章入口](../05-pinia-architecture.md) · [下一课：provide/inject 与 SSR 隔离](03-provide-inject-store-ssr.md)
