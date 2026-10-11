# EX09 消息 Schema：版本、响应与错误

## 任务卡

120 分钟；前置 EX07、unknown 类型；产出消息白名单和非法输入表。

## 1. 任务背景

content、popup 与 SW 不共享函数调用栈。跨边界消息会被序列化，TypeScript 类型不会跟着运行。
页面提供的值、未来版本 UI 和坏 storage 都可能不是声明类型。

## 2. 学习目标

从 unknown 校验带版本的 discriminated union；拒绝额外字段；保持成功/失败响应明确；
区分 schema 校验与 sender 授权。

## 3. 前置知识与环境

完整工程 EX23；测试 EX24；执行 `npm test`。不用新依赖，字段有限时小 parser 足够可审计。

<a id="s4"></a>
## 4. 核心机制

消息 v=1。REPORT 带 item；SAVE 带 item/note；GET/DELETE 只有 v/type；
SET_RETENTION 只允许 1/7/30。exact keys 防止偷偷传 tabId、cookie 或 future 字段。
响应 `{ok:true,data}` 或 `{ok:false,error:'REQUEST_FAILED'}`；GET/SAVE 返回 State，
REPORT 返回 accepted，content 不应拿它当 State。异步监听采用 callback+return true。
解析只回答“形状是否合法”，authorize 才回答“谁能执行”；不能合为信任消息自带 role。

## 5. 设计与步骤

先失败用例：null、v2、额外字段、超长备注、未知 type；再正常值。
UI request 收到成功后仍 migrate 响应，不仅 `as State`；失败显示状态，不泄露原始输入。

<a id="s6"></a>
## 6. 最小可运行示例

在 EX23 工程创建个人 `schema.test.ts`：

```ts
import { it, expect } from 'vitest';
import { parseMessage } from './shared/domain';
it('rejects extra authority fields', () => {
  expect(parseMessage({ v: 1, type: 'GET' })).toEqual({ v: 1, type: 'GET' });
  expect(() => parseMessage({ v: 1, type: 'GET', tabId: 7 })).toThrow('SCHEMA');
  expect(() => parseMessage({ v: 2, type: 'GET' })).toThrow('VERSION');
  expect(() => parseMessage({ v: 1, type: 'SET_RETENTION', days: 365 })).toThrow();
});
```

`npx vitest run schema.test.ts` 预期 1 passed。完整 parser 在
[domain.ts](../12-capstone/01-complete-project-rebuild.md#file-shared-domain-ts)，不是留空练习。
脚本自动结束；个人增量测试单独保存；浏览器/fixture 关闭清理。

<a id="s7"></a>
## 7. 业务集成

background 在任何 IO 前 parseMessage，再 authorize。UI 不知道失败是 sender 还是 storage，
但状态提示可重开核对数据；测试直接验证具体边界。
不在日志打印完整 raw message，也不接收任意 JSON 作为 storage 更新命令。

<a id="s8"></a>
## 8. 错误实验与排查

把 raw 类型写成 Message 并删除 parser，TS 编译依然可能通过，但运行时额外字段用例应失败。
恢复 unknown→parser 后再运行，不放宽测试。将 response 误认为 State，UI 应拒绝而非显示空数据。
通道关闭错误先查 return true、worker listener 和入口 URL，不无穷重发。

## 9. 课后思考与答案

1. 为什么 exact keys？答案：协议变更显式升级，减少隐藏权限字段和兼容歧义。
2. schema 安全是否等于授权安全？答案：否，合法 DELETE 来自 content 仍必须拒绝。
3. 错误能否返回整条请求？答案：不能，可能包含私密备注；只返回稳定错误码。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：为 note=501 写断言。答案：parseMessage SAVE throw，不截断。
- 进阶：设计 v2 升级。答案：显式双版本转换并测试；当前不实现，未知版本拒绝。
- 故障注入：GET 多传 role=admin。答案：SCHEMA 拒绝，storage 不写，删额外字段恢复。

<a id="s11"></a>
## 11. 验收清单

- [ ] 五类消息字段与版本明确。
- [ ] unknown 入口校验，额外字段拒绝。
- [ ] 成功与错误响应可区别。
- [ ] schema 与 sender 分开测试。
- [ ] 无 raw 敏感日志和自动无穷重试。

## 12. 小结

运行时边界需要运行时 parser，静态类型只帮助合法代码作者。

## 13. 扩展阅读

- [Chrome Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [TypeScript Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

## 我现在能做到什么

能建立小而严格的跨上下文协议，给未知输入和失败响应明确语义。

## 单元导航

[上一页 EX08](../04-content-dom/02-iframe-spa-observer-cleanup.md) · [卷入口](../README.md) · [下一页 EX10](02-sender-tab-origin-authorization.md)
