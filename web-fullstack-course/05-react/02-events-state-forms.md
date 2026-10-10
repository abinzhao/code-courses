# 02 事件、状态快照与可提交表单

## 本章任务

把第 1 章静态目录升级为可搜索、可筛选、可发布、可注入失败的内存应用。输入是用户编辑的字符串，输出是经过验证的完整 `Listing` 与明确的 loading/error/success 反馈。

本章不发 HTTP 请求。新增商品只存在当前标签页，刷新即恢复 fixture；`local-user` 不代表真实认证身份。

## 必要前置

- 已完成[第 1 章](01-jsx-components.md)并保留领域、卡片和 Vite 配置。
- 理解 render 纯度、props、稳定 key 与整数分/UTC 契约。
- 会使用数组 `map`、`filter` 和对象展开。
- 能运行 `pnpm typecheck`、`pnpm build`。

## 学习路线

| 顺序 | 教程 | 核心产出 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [事件、状态快照与不可变更新](./02-events-state-forms/01-events-state-snapshots-updates.md) | 批处理证据、typed event、不可变更新 | 90 分钟 |
| 2 | [受控、非受控表单与金额验证](./02-events-state-forms/02-controlled-uncontrolled-form-validation.md) | `parsePrice`、`validateDraft`、可恢复表单 | 120 分钟 |
| 3 | [搜索、发布与状态所有权](./02-events-state-forms/03-search-publish-state-ownership.md) | 内存版邻里集市闭环 | 120 分钟 |

第 2 课建立提交边界，第 3 课复用它；不要跳过金额矩阵直接把 number 输入接进 Listing。建议总投入约 6 小时。

## 章级综合任务

在 `apps/react-web` 完成：

1. 标题搜索、只看可预约与重置筛选。
2. 数量、列表和空状态来自同一 `visible`。
3. 发布表单支持 Enter、pending 防重复、错误保留草稿。
4. `35.10` 转为 `3510`；零元与 `1000000.00` 合法。
5. 负数、指数、前导零、三位小数和超限输入拒绝。
6. 保存事件一次性生成本地 UUID 与 UTC ISO 时间。
7. 教学故障第一次失败、第二次恢复成功且不重复新增。

## 综合验收证据

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm test
pnpm typecheck
pnpm build
```

验收清单：

- [ ] `price-and-draft-contract` 全部通过。
- [ ] “正确 +2”稳定增加 2，能解释旧快照。
- [ ] 数组和对象更新不改写旧 state。
- [ ] 输入“台灯”、未知关键字和清空分别得到成功、空、恢复状态。
- [ ] 失败保存出现 alert、保留草稿、按钮恢复。
- [ ] 成功保存后字段清空，列表只新增一次。
- [ ] 新商品字段完整，金额为整数分、时间为 UTC。
- [ ] 刷新丢失数据与本章内存边界一致。
- [ ] 320px 下无页面级横向滚动，Tab/Enter 主路径可用。

失败不能通过删除测试、放宽正则或提前清空字段处理。保留输入、命令退出码和用户可见证据，修复后执行同一路径。

## 状态所有权结论

| 状态 | 本章所有者 | 下一阶段变化 |
| --- | --- | --- |
| 表单草稿 | `ListingForm` 局部 state | 提交仍局部，持久化改为 HTTP |
| 商品列表 | 共同父级 state | 第 3 章改为服务器资源状态 |
| 搜索关键字 | 页面局部 state | 第 4 章进入 URL |
| 筛选结果/数量 | render 派生 | 始终不复制为第二份真相 |
| 用户身份 | 未实现 | 由服务端 Cookie 会话确定 |

## 章节导航

[上一章：JSX 与组件](01-jsx-components.md) · [React 学习路线](README.md) · [下一章：Effect、HTTP 与自定义 Hook](03-effects-reuse.md)
