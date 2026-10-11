# MP-19 确定性多层测试：领域、请求与组件不混证据

## 任务卡

- 任务：建立可控异步测试与实际 React 文案组件测试，再列平台验收层。
- 产出：`src/components/ReservationLabel.tsx`、`tests/view.test.tsx`、测试顺序与故障预测。
- 运行：MP-24 `npm test`、`npm run typecheck`。
- 证据：预约状态文案、可控请求完成顺序、已取消晚回调不写入。
- 边界：React 服务端组件测试不是 Taro 渲染或平台交互测试。

## 1. 任务背景

“测试全部通过”如果只是 Node parser 测试，不能证明平台隐私弹窗和返回栈。
反过来，真机点击一次成功也不证明并发取消、code 重放和错误 parser。
不同层回答不同问题，测试报告必须说明覆盖与不覆盖什么。

## 2. 学习目标

从不变量设计测试；控制完成顺序而非 sleep；让测试覆盖真正组件；
区分 Node、React、平台工具、真机、服务器五层；建立红灯失败预测与恢复证据。

## 3. 预备知识

完成 [第二平台](../09-adapters/02-douyin-alipay-h5.md) 与 MP-23/24。
参考现存 [JS 确定性异步测试](../../04-javascript-typescript/09-testing-debugging-algorithms/02-deterministic-async-testing-debugging.md)。
MP-24 包清单包含既有 react-dom 和对应开发类型，无需新增组件测试运行时。
MP-24 页面操作回归另外使用同版 react-test-renderer 与类型包，仅作为 dev 依赖。

<a id="s4"></a>
## 4. 核心理论

### 4.1 五层责任

| 层 | 能证明 | 不能证明 |
| --- | --- | --- |
| Node 纯逻辑 | parser/金额/UTC/迁移/同步领域/可控 IO | 平台身份、磁盘限额、TLS |
| React 文案组件 | 实际组件选择状态与可见文案 | 小程序样式、tap、桥性能 |
| 平台工具 | 目标模板、生命周期、配置与网络轨迹 | 全部真机表现、审核成功 |
| 真机 | 冷热启动、后台、设备权限、真实弱网 | 数据库事务完整性 |
| 真实后端 | code 交换、对象授权、持久幂等/事务 | 设备 UI 和权限弹窗 |

本章组件测试直接渲染 React 组件，使用实际 react-dom/server；
不声称 DOM/H5 或 Taro 客户端完成。页面交互另由 MP-20。
MP-24 的 recovery 测试转译真实 Publish/Detail 并驱动输入、按钮和受控 show，
覆盖页面闭包与客户端 IO 边界；仍不证明 Taro 平台 tap、返回栈或真机权限。

### 4.2 控制时点

RequestIO 保存 success/fail 回调，测试显式调用 B success→A success 或 abort→success。
假时钟注入 auth/session，而非把 timeout 改小靠 CPU 调度。
状态机用独立 service 实例；两买家用不同身份；迁移用全新 Map。
测试不能共享全局变量串行碰巧通过。

### 4.3 红灯的含义

先让未实现函数以稳定错误运行，预测哪条断言失败；模块缺失只证明启动失败，
不是业务红灯。已完成实现可故障注入验证测试敏感性，但应标为 mutation 实验，
不伪称首次 TDD。本卷 SELF-CHECK 分别记录实际红灯与最终复建绿灯。

## 5. 组件责任

ReservationLabel 只负责从权威 Reservation 到可见文案，不接网络、不改状态。
使用 Fragment 可放在 Taro Text 内，不引入 HTML。
pending 明确“待卖家确认”，confirmed 表明售出无支付，cancelled 表明取消，
未选择与读取中不伪装业务成功。

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `src/components/ReservationLabel.tsx`：

```tsx
import { Reservation } from "../domain";
export function ReservationLabel({ item, loading = false }: { item?: Reservation; loading?: boolean }) {
  if (loading) return <>读取中，尚未取得权威状态</>;
  if (!item) return <>暂无可访问预约</>;
  switch (item.status) {
    case "pending": return <>待卖家确认（无支付）</>;
    case "confirmed": return <>卖家已确认，商品售出（无支付）</>;
    case "cancelled": return <>预约已取消</>;
  }
}
```

完整文件 `tests/view.test.tsx`：

```tsx
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ReservationLabel } from "../src/components/ReservationLabel";
import { Reservation } from "../src/domain";
const item: Reservation = { id: "r1", listingId: "l1", buyerId: "a", sellerId: "b",
  key: "k", status: "pending", version: 1, createdAt: "2026-10-12T00:00:00.000Z" };
test("actual React component renders distinct authoritative states", () => {
  assert.equal(renderToStaticMarkup(<ReservationLabel item={item} />), "待卖家确认（无支付）");
  assert.match(renderToStaticMarkup(<ReservationLabel item={{ ...item, status: "confirmed" }} />), /商品售出/);
  assert.equal(renderToStaticMarkup(<ReservationLabel item={{ ...item, status: "cancelled" }} />), "预约已取消");
});
test("loading and inaccessible state never imply business success", () => {
  assert.match(renderToStaticMarkup(<ReservationLabel item={item} loading />), /尚未取得/);
  assert.equal(renderToStaticMarkup(<ReservationLabel />), "暂无可访问预约");
});
```

package.json 的 test 同时选择 `.test.ts` 与 `.test.tsx`，精确完整版本见 MP-24。

```bash
npm test
npm run typecheck
```

预期新增组件测试 2/2；已有 parser/request/领域/storage 测试仍全部运行。
无服务、无浏览器、无平台 runtime，自然退出。每次实验清理自己的 Map/回调，
不能删除失败测试或降低断言制造通过。

<a id="s7"></a>
## 7. 邻里集市集成案例

MP-24 reservations 页面在 Taro Text 中用 ReservationLabel，
列表仍来自 parseReservation，组件不接受任意未验证 status。
领域测试覆盖 confirm 后 Listing sold；组件测试覆盖“商品售出”，
两者连接在客户端页面，但工具点击路径仍必须独立验证。

请求层测试检查 HTTP malformed 不丢 HTTP 类别、parser 异常区分 parse、
abort 先结算、已结束不再 abort。客户端 epoch 的完整 IO 测试通过受控 platform 替身，
替身只提供真实接口形状，不改变生产分支；不能用直接返回成功的 mock 绕过 client。
MP-24 页面回归覆盖发布回执与独立清理、重复退出和重启阻塞、返回保留编辑、
图片合并与代次、确定拒绝显式结束、未知请求同键恢复以及坏回执拒绝覆盖。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：把 confirmed 文案改 pending，第一条组件测试失败；
把 request abort 的 settled 删除，late success 可能写入错误结果。
恢复实现后重新跑全部相关测试。不要靠截图看不到冲突就删除领域断言。
若 React 组件测试失败，先检查 JSX 配置与安装版本，不把错误归到真机基础库。

## 9. 课后题

1. 为什么不用 sleep(10) 等请求？答案：调度不确定，控制回调才能确定时序。
2. SSR 组件通过可证明 tap 吗？答案：不能，只证明真实组件的文本选择。
3. mock 能证明数据库事务吗？答案：不能，要真实数据库并发验收。

<a id="s10"></a>
## 10. 实践练习

- 基础：loading=true 时传 confirmed。参考答案：仍显示读取中，不提前显示成功。
- 进阶：扩展两买家测试。参考答案：独立账号同时请求同 Listing，
  只允许一个 pending，另一 409；真实事务另用数据库测试。
- 故障注入：测试只匹配 `/预约/`。参考答案：会漏掉状态文案回归；
  对 cancelled/pending 用精确文案、confirmed 检查售出，保持合法产品语义。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 2 项真实 React 组件测试与全套 Node 通过。
- [ ] 测试无固定 sleep、共享实例污染和随意放宽断言。
- [ ] 请求与状态机覆盖失败时点，不只 happy path。
- [ ] 报告明确五层证据，平台/后端未测不冒充通过。

## 12. 常见问题

测试组件是否要引入完整 DOM 库？本卷文案组件不需要；交互复杂时可以引入合适测试框架，
但仍应测试业务事件与平台 adapter，并说明 DOM 模拟不证明小程序渲染。

## 13. 扩展阅读

[Node test](https://nodejs.org/api/test.html)、
[React renderToStaticMarkup](https://react.dev/reference/react-dom/server/renderToStaticMarkup)、
[Taro Hooks](https://docs.taro.zone/docs/hooks)。

## 我现在能做到什么

我能控制失败顺序并测试实际组件，准确说明每层测试的证明边界。

## 单元导航

[上一单元](../09-adapters/02-douyin-alipay-h5.md) ·
[下一单元](02-device-weak-network.md) · [本卷](../README.md)
