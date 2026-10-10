# 01 JSX、组件与第一版邻里集市

## 本章任务

从空的个人练习目录建立 React 19.3 + Vite 8 + TypeScript 应用，把两条静态商品数据渲染成语义卡片。本章只处理静态 UI：不请求 API、不建立会话、不声称持久化或授权。

输入是符合领域契约的 `Listing[]`，输出是两张可在 320 CSS 像素宽度阅读的商品卡片。

## 必要前置

- JavaScript 函数、对象、数组、模块与 `map`。
- HTML 标题、段落、`article`、表单标签的基本语义。
- 能运行终端命令并区分教材目录与个人练习工作区。
- 已阅读[版本基线](../00-guide/02-version-baseline.md)和[邻里集市项目契约](../00-guide/05-project-assessment.md)。

不要求掌握类组件、状态管理库、路由或后端框架。

## 学习路线

| 顺序 | 教程 | 核心产出 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [JSX、渲染纯度与提交阶段](./01-jsx-components/01-rendering-jsx-purity.md) | 安全文本渲染与 Strict Mode 纯度证据 | 90 分钟 |
| 2 | [组件边界、组合与列表身份](./01-jsx-components/02-components-props-composition-list-identity.md) | `ListingCard`、`children` 与稳定 key 实验 | 100 分钟 |
| 3 | [Vite、TypeScript 与第一版邻里集市](./01-jsx-components/03-vite-typescript-first-market.md) | 可类型检查、构建和浏览的静态应用 | 120 分钟 |

按顺序学习。第 2 课依赖第 1 课的纯渲染模型；第 3 课把前两课文件接入真实 Vite 工程。建议总投入约 5 小时，包含故障实验和复验。

## 章级综合任务

在 `neighborhood-market/apps/react-web` 完成静态目录：

1. 使用完整 `Listing` 字段渲染 `lamp-1` 与 `desk-1`。
2. 金额分别保存为 `3500`、`8000` 整数分。
3. `createdAt` 保存 UTC ISO 8601，显示时本地化。
4. 卡片用 `children` 组合附加内容，用 `listing.id` 作为 key。
5. 加入“二手书架”fixture：`12000` 分、`sold`、独立 ID。
6. 页面明确写出“静态教学数据”，不把按钮隐藏描述成授权。

## 综合验收证据

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
node --version
pnpm --version
pnpm list --depth 0
pnpm exec tsc6 --version
pnpm typecheck
pnpm build
```

验收清单：

- [ ] Node、pnpm 与依赖版本是实际命令输出。
- [ ] 类型检查和生产构建退出码均为 0。
- [ ] 浏览器显示台灯 35 元、折叠桌 80 元、书架 120 元。
- [ ] 危险标题只显示为文本，没有生成注入元素。
- [ ] 反转列表后备注与焦点仍跟随原商品。
- [ ] 320 CSS 像素宽度无页面级横向滚动。
- [ ] Console 无 key、挂载容器或受控输入警告。
- [ ] 能解释 React 元素、render、commit、DOM 与 key 的边界。

失败时保留命令退出码、Console 信息和复现步骤；修复后执行相同路径。不要关闭 Strict Mode、删除类型门禁或放宽领域类型来制造通过。

## 项目边界

本章数据是静态 fixture。刷新、登录、发布、预约、收藏、对象授权和数据库事务均未实现。下一章先引入本地内存状态；第 3 章才接本机教学 API；第 4 章再建立可刷新路由与服务端数据流程。

## 章节导航

[React 学习路线](README.md) · [下一章：事件、状态与表单](02-events-state-forms.md)
