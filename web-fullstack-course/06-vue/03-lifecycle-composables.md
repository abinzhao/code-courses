# 03 生命周期、请求竞争与 Composable

> 本章目标：把浏览器内存列表接到本机教学 API，在组件生命周期内正确建立、清理和重试请求，并阻止旧响应覆盖当前查询。

## 本章任务

沿用第 2 章领域与组件，接入 `GET /api/v1/listings?page=1&pageSize=20&q=`。页面要明确区分
loading、error、empty 和 success；输入 `__error` 显示 503 恢复路径，快速切换搜索时最终结果
必须属于当前关键字。

教学 API 只绑定回环地址，数据存在 Vite 进程内存，重启即清空。固定教学 cookie 和
`demo-csrf` 只演示协议形状，不是生产认证或 CSRF 防护。

## 前置与产出

- 前置：[响应式、事件与表单](./02-reactivity-events-forms.md)。
- 输入：关键字、页码、刷新 revision 和 HTTP 响应。
- 输出：生命周期探针、统一 HTTP helper、`useListings`、服务端列表页和本机教学 API。
- 建议投入：6 小时；每课 110 至 130 分钟。
- 完成边界：读请求可取消或忽略；取消不等于服务器事务回滚。

## 三课学习路线

| 顺序 | 教程 | 核心产出 | 依赖 |
| --- | --- | --- | --- |
| 1 | [生命周期、watch 与同步清理](./03-lifecycle-composables/01-lifecycle-watch-cleanup.md) | 钩子时机、显式依赖、计时器/监听器清理 | 第 2 章 |
| 2 | [HTTP 错误、取消与资源状态](./03-lifecycle-composables/02-fetch-http-abort-resource-state.md) | `ApiError`、`response.ok`、`AbortController`、资源联合 | 第 1 课 |
| 3 | [Composable、重试与本机教学 API](./03-lifecycle-composables/03-composables-local-api-retry.md) | `useListings`、Vite middleware、完整页面 | 前两课 |

## 章级邻里集市任务

完成五条路径：

1. 初次打开先显示 loading，再显示两条商品；
2. 搜索“台灯”得到一条，未知文字得到成功的 empty；
3. 输入 `__error` 得到 503 错误和重试按钮，不误显示空列表；
4. Network 限速后快速切换关键字，旧响应不能覆盖当前结果；
5. 停止开发服务后保留可恢复错误证据，重启后恢复。

## 综合验收

- [ ] 生命周期和 watcher 在同步 setup 阶段注册，外部资源都有对称清理。
- [ ] fetch 对 404/503 检查 `response.ok`，错误保留 status/code/requestId。
- [ ] `Resource<T>` 的 loading、error、success 互斥，empty 是 success 数据。
- [ ] 每次参数变化取消旧读请求，并在写入状态前再次检查过期。
- [ ] 重试产生新请求，不直接伪造 success。
- [ ] 教学 API 明确内存、回环、假登录、固定 CSRF、无数据库事务边界。
- [ ] `vue-tsc`、测试、构建和 Chromium 竞争路径通过。

## 能力边界

泛型 `api<T>` 不是运行时 schema 解析器；教学中间件不是生产后端；前端取消不保证服务器停止；
读请求的自动重试策略不能直接套到预约等写操作。

## 上下章导航

[上一章：响应式、事件与表单](./02-reactivity-events-forms.md) ·
[下一章：路由、URL 与服务端数据](./04-router-data.md)
