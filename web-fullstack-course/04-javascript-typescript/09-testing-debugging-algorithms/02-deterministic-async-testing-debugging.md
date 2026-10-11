# 确定性异步测试与系统调试：控制顺序，不猜时间

## 任务卡

- **任务**：用手动 Promise 验证旧响应与销毁后的响应都不能改变可见状态。
- **产出**：`js-lab/search-controller.mjs` 与 `js-lab/search-controller.test.mjs` 两个完整文件。
- **运行**：Node.js 24 LTS，使用内置测试与断言，无定时睡眠。
- **完成证据**：tests 2 / pass 2 / fail 0、一次旧响应回归红灯和五段式调试记录。
- **边界**：读取器故意忽略 `AbortSignal` 以隔离代次规则；不证明真实 HTTP 已取消。

## 1. 任务背景

用户先搜索“台灯”，紧接着搜索“书架”。如果旧请求更晚完成，它不能覆盖最新界面。
依赖 `setTimeout(100)` 的测试会受机器负载影响，也无法精确保证哪个请求先完成。

手动 Promise 把“何时完成”交给测试：先解析书架，再解析台灯，直接观察成功状态。
这不是模拟内部算法，而是在可控边界上构造真实竞态顺序。

## 2. 学习目标

完成后你能：

1. 构造由测试手动 resolve/reject 的 Promise；
2. 分别验证迟到成功、迟到失败和 dispose 规则；
3. 解释取消信号与代次新鲜度为何都需要；
4. 使用 Node inspector、浏览器 Sources 和 Network 收集证据；
5. 按复现、最小化、假设、观测、修复、回归调试。

## 3. 预备知识

先理解 Promise、`async/await`、`AbortController` 和第 06 章搜索控制器。
本单元只验证控制器可见状态，不启动服务器。每项测试建立自己的 Map、状态数组和控制器，
结束时显式 dispose，避免测试间共享状态。

## 4. 核心理论

### 4.1 取消和新鲜度处理不同失败

`AbortController` 通知支持信号的读取器停止工作，节省资源；但读取器可能忽略信号，
响应也可能已经到达。递增 `generation` 让旧任务即使完成也失去展示资格。
两者不是二选一。

### 4.2 dispose 是生命周期边界

页面离开、组件卸载或测试结束后，不应再显示成功或错误。dispose 应使当前代次失效、
发出取消并阻止新搜索。它不撤销已经提交到服务端的写事务。

### 4.3 确定性测试直接安排完成顺序

测试在 Map 中保存每个查询的控制句柄。调用 `resolve("书架")` 后等待对应任务，再完成
“台灯”。没有任意等待，也没有依赖 CPU 快慢。

### 4.4 调试是证据循环

1. **复现**：固定输入和操作顺序；
2. **最小化**：移除 DOM 与真实网络，留下控制器；
3. **假设**：旧任务缺少新鲜度判断；
4. **观测**：记录 query、generation、phase；
5. **修复**：只在当前代次展示；
6. **回归**：运行竞态、dispose 和相关正常测试。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 边界 |
| --- | --- | --- |
| `Promise` 构造器 | 暴露测试控制的 resolve/reject | 只用于难重现边界 |
| `AbortController` | 通知取消 | 读取器可忽略，服务端事务可已完成 |
| `generation` | 判断结果是否仍最新 | 只管当前控制器实例 |
| `dispose()` | 结束生命周期 | 应幂等且不显示取消错误 |
| `node --inspect-brk` | 在首行暂停 Node | 调试端口只绑定本机 |
| Sources | 断点、作用域与调用栈 | 不替代 Network 协议证据 |
| Network | URL、状态、时序、响应 | 不证明界面状态一定正确 |

## 6. 最小可运行案例

完整文件 `js-lab/search-controller.mjs`：

```js
export function createSearchController(readPage, show) {
  let active;
  let generation = 0;
  let disposed = false;

  return {
    async search(q) {
      if (disposed) throw new Error("search controller disposed");
      const current = ++generation;
      active?.abort();
      const controller = new AbortController();
      active = controller;
      show({ phase: "loading", q });

      try {
        const page = await readPage(q, controller.signal);
        if (current !== generation || controller.signal.aborted) return;
        show({ phase: "success", q, page });
      } catch (error) {
        if (current !== generation || controller.signal.aborted) return;
        show({
          phase: "error",
          q,
          message: error instanceof Error ? error.message : "request failed",
        });
      } finally {
        if (current === generation && active === controller) active = undefined;
      }
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      generation += 1;
      active?.abort();
      active = undefined;
    },
  };
}
```

旧任务在成功和失败分支都先检查代次与自己的 signal。`finally` 只清理引用，不输出状态，
因此旧请求不会把新请求的 loading 擅自清除。

## 7. 邻里集市集成案例

完整文件 `js-lab/search-controller.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSearchController } from "./search-controller.mjs";

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {
    promise,
    resolve(value) {
      resolve(value);
    },
    reject(error) {
      reject(error);
    },
  };
}

function getPending(pending, query) {
  const task = pending.get(query);
  if (task === undefined) throw new Error(`missing pending query: ${query}`);
  return task;
}

test("late old success or error cannot replace the newest result", async () => {
  const pending = new Map();
  const states = [];
  const readPage = (query) => {
    const task = createDeferred();
    pending.set(query, task);
    return task.promise;
  };
  const controller = createSearchController(
    readPage,
    (state) => states.push(state),
  );
  const page = { items: [], page: 1, pageSize: 20, total: 0 };

  const oldTask = controller.search("台灯");
  const latestTask = controller.search("书架");
  getPending(pending, "书架").resolve(page);
  await latestTask;
  getPending(pending, "台灯").resolve(page);
  await oldTask;

  assert.deepEqual(
    states
      .filter((state) => state.phase === "success")
      .map((state) => state.q),
    ["书架"],
  );
  assert.equal(states.at(-1)?.phase, "success");

  const staleErrorTask = controller.search("旧错误");
  const newestSuccessTask = controller.search("最新成功");
  getPending(pending, "最新成功").resolve(page);
  await newestSuccessTask;
  getPending(pending, "旧错误").reject(new Error("stale failure"));
  await staleErrorTask;

  assert.deepEqual(
    states
      .filter((state) => state.phase === "success")
      .map((state) => state.q),
    ["书架", "最新成功"],
  );
  assert.equal(states.filter((state) => state.phase === "error").length, 0);
  assert.equal(states.at(-1)?.phase, "success");
  controller.dispose();
});

test("disposed controller cannot show a completed response", async () => {
  const task = createDeferred();
  const states = [];
  const controller = createSearchController(
    () => task.promise,
    (state) => states.push(state),
  );
  const pendingSearch = controller.search("台灯");

  controller.dispose();
  task.resolve({ items: [], page: 1, pageSize: 20, total: 0 });
  await pendingSearch;

  assert.equal(
    states.filter((state) => state.phase === "success").length,
    0,
  );
  assert.equal(states.filter((state) => state.phase === "loading").length, 1);
});
```

从 `js-lab` 运行：

```bash
node --test search-controller.test.mjs
```

摘要应包含 tests 2、pass 2、fail 0。第一项同时让旧请求迟到成功和迟到失败，证明两条分支都
不能覆盖最新成功；第二项验证销毁后不提交完成结果。

## 8. 常见错误与排查路径

**明确错误实验：**

临时删除成功和失败分支中的：

```js
if (current !== generation || controller.signal.aborted) return;
```

读取器故意忽略 signal，旧台灯会进入第二个 success，第一项测试失败。

| 项目 | 记录 |
| --- | --- |
| 现象 | 快速搜索后最终显示旧的“台灯”结果 |
| 证据 | 成功状态顺序为 `["书架", "台灯"]`；旧任务 generation 较小 |
| 原因 | 代码只发出取消，没有在展示前验证结果新鲜度 |
| 修复 | 成功与失败分支都比较代次和当前 signal |
| 复验 | 两项测试通过；最终 success 只包含“书架” |

不能通过增加睡眠、放宽为“包含书架即可”或让读取器自动服从取消来掩盖代次缺陷。

真实页面排查时：

- Sources 在 `show` 前断点，记录 query 与 generation；
- Network 查看两个请求发起、取消和完成顺序；
- Console 只记录 requestId、状态和必要路径，不记录 Cookie、Token 或完整用户数据；
- 修复后重复同一输入顺序，并运行自动化回归。

## 9. 课后题

1. 为什么 `setTimeout(100)` 不是稳定竞态测试？
2. 读取器已经支持 signal，为什么仍保留 generation？
3. dispose 后为什么不显示“请求失败”？
4. Network 显示 cancelled 是否证明服务端没有写入？

答案：

1. 时间不保证完成顺序，机器负载会改变结果。
2. 取消可能太晚、被忽略或响应已完成；展示仍需新鲜度判断。
3. 生命周期结束或用户换目标不是服务器故障，不应产生过期反馈。
4. 不能；客户端停止等待时服务端事务可能已经提交。

## 10. 实践练习

**基础**：让当前查询拒绝，预期最后状态为 error：

```js
const current = controller.search("书架");
getPending(pending, "书架").reject(new Error("offline"));
await current;
assert.equal(states.at(-1)?.phase, "error");
```

参考标准：把它并入已有测试进行本地练习，不改变最终计划要求的两项测试计数。

**进阶**：先发旧查询，再发当前查询；旧查询 reject、当前查询 resolve。参考结果：
旧错误不出现，当前成功出现一次。

**故障注入**：让 `finally` 无条件调用 `show({ phase: "idle" })`。预期旧请求完成时可能覆盖
新 success；删除该呈现副作用，清理只处理本请求拥有的资源。

## 11. 阶段验收

- [ ] 两个完整文件通过 `node --check`。
- [ ] 最终测试恰好 2 项，全部通过且没有时间睡眠。
- [ ] 旧读取器忽略 signal 时，代次规则仍阻止覆盖。
- [ ] dispose 后完成响应不会产生 success 或 error。
- [ ] 每项测试使用独立状态并结束控制器生命周期。
- [ ] 已保存删除新鲜度判断后的失败摘要。
- [ ] 调试记录包含复现、证据、原因、修复和回归。
- [ ] 日志方案不包含真实凭据、完整响应或敏感身份数据。

## 12. 常见问题

**手动 Promise 是不是 mock？**

它是边界替身，用来控制真实难复现的完成顺序；只要不复制被测控制器逻辑，就有价值。

**为什么不断言 AbortError 名称？**

本测试专注可见状态，且读取器故意忽略信号。真实 fetch 取消应另做协议测试。

**测试能并行运行吗？**

夹具无共享全局状态，可以；但任何端口、假时钟或共享资源都要有独立隔离与清理。

**Node 调试器能看浏览器 Network 吗？**

不能。Node inspector 看进程内状态；浏览器 DevTools 才有页面请求、DOM 和渲染证据。

## 13. 扩展阅读

资料快照：2026-10-11。

- [Node.js 24：Test runner](https://nodejs.org/docs/latest-v24.x/api/test.html)
- [Node.js：Debugging](https://nodejs.org/en/learn/getting-started/debugging)
- [MDN：Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Chrome DevTools：JavaScript debugging](https://developer.chrome.com/docs/devtools/javascript)
- [Chrome DevTools：Network reference](https://developer.chrome.com/docs/devtools/network/reference)

兼容边界：本单元没有真实网络、浏览器渲染或服务端事务。Safari、Firefox 和移动网络行为
未验证，不能由 Node 结果推断。

## 我现在能做到什么

我能用可控完成顺序稳定复现异步竞态，分别验证取消、新鲜度和销毁规则，并从运行时证据
而不是任意等待中定位问题。

## 单元导航

- 上一单元：[Node 测试、断言与 TDD 边界](./01-node-test-assertions-tdd-boundaries.md)
- 下一单元：[数据结构、复杂度、搜索与排序](./03-data-structures-complexity-search-sort.md)
- 分卷目录：[JavaScript / TypeScript](../README.md)
