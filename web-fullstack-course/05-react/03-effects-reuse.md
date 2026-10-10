# 03 Effect、HTTP 与自定义 Hook

## 本章任务

把第 2 章内存列表接到 `/api/v1/listings`，建立可取消、可解析、可重试的服务器资源状态。使用 Vite middleware 提供本机教学 API，验证正常、空数据、503、Offline 和快速搜索竞态。

本章 API 保存在开发服务器进程内存，假登录和固定 CSRF 字符串都不是生产安全能力。

## 必要前置

- 已完成[第 2 章](02-events-state-forms.md)。
- 保留 `Listing`、`Page<T>`、`ListingCard`、`validateDraft`。
- 理解 state 快照、不可变更新和提交失败恢复。
- 能使用 Chromium DevTools Network 面板。

## 学习路线

| 顺序 | 教程 | 核心产出 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [Effect 生命周期、清理与 Strict Mode](./03-effects-reuse/01-effects-lifecycle-cleanup-strict-mode.md) | 对称订阅与清理证据 | 100 分钟 |
| 2 | [HTTP 边界、请求取消与资源状态](./03-effects-reuse/02-fetch-http-abort-resource-state.md) | runtime parser、ApiError、Abort、资源联合 | 150 分钟 |
| 3 | [自定义 Hook、本机教学 API 与重试](./03-effects-reuse/03-custom-hooks-local-api-retry.md) | `useListings` 与 Vite 本机 API | 180 分钟 |

第 2 课建立客户端边界，第 3 课才提供真实端点。建议总投入 7 至 8 小时，包含 Network 限速与故障复验。

## 章级综合任务

1. 只为浏览器订阅和 HTTP 读取使用 Effect。
2. 所有 setup 有对称 cleanup，Strict Mode 保持开启。
3. JSON 从 `unknown` 解析，检查金额、状态、版本和 UTC 时间。
4. HTTP 非 2xx 保存 status/code/requestId。
5. q 改变时 Abort 旧请求并忽略晚到结果。
6. `__error` 显示 503 error；未知普通 q 显示 success-empty。
7. Offline 后恢复并重试，保留关键字。
8. 开发 API 仅绑定 `127.0.0.1`，明确内存、假登录和无事务边界。

## 综合验收证据

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm dev --host 127.0.0.1
```

浏览器证据：

- [ ] 初始请求 200，显示两条 fixture。
- [ ] “台灯”返回一条；未知关键字返回 200 空状态。
- [ ] `__error` 返回 503，显示 code/requestId 与重试。
- [ ] Offline 显示网络错误，不伪装 empty。
- [ ] 慢速网络下先输入“台”再输入“台灯”，最终结果只属于“台灯”。
- [ ] Network 可见过期请求 cancelled/aborted 或结果被忽略。
- [ ] Console 不输出 Cookie、CSRF 值、密码或私有用户对象。
- [ ] 重启开发服务器后内存恢复 fixture，符合教学边界。

## 边界声明

Vite middleware 没有真实数据库、事务、生产身份、真实 CSRF、速率限制、审计、TLS 或多进程一致性。两标签演示结果不能替代后端数据库并发测试。真实后端阶段删除插件并使用开发代理，生产代理与安全配置另行验收。

## 章节导航

[上一章：事件、状态与表单](02-events-state-forms.md) · [React 学习路线](README.md) · [下一章：Data Router 与服务端数据](04-routing-data.md)
