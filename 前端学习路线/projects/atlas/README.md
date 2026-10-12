# Atlas 贯穿项目

Atlas 是 `前端学习路线` 的可运行项目基线。它从零依赖 HTML/CSS/JavaScript 应用开始，后续按 L0-L5 逐步演进，而不是为每篇课程创建彼此无关的临时代码。

## 运行

要求：

- Node.js 24 LTS，或 Node.js 22 维护版
- 不需要安装第三方依赖

```bash
cd 前端学习路线/projects/atlas
npm start
```

访问：

```text
http://127.0.0.1:4173
```

运行验证：

```bash
npm run check
npm test
npm run verify
```

## 当前能力

- 语义化 HTML 与跳过导航
- 响应式 CSS 和深浅色系统颜色
- 文章搜索与状态筛选
- Fetch 请求、状态码和 JSON 协议检查
- AbortController 请求竞态控制
- DOM 模板与事件委托
- localStorage 收藏持久化与多标签页同步
- Node.js 内置测试
- 零依赖静态服务器和文章 API

## 目录

```text
atlas/
├── package.json
├── server.mjs
├── src/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── articles.js
├── tests/
│   └── articles.test.js
└── milestones/
    ├── L0.md
    ├── L1.md
    ├── L2.md
    ├── L3.md
    ├── L4.md
    └── L5.md
```

## 课程使用规则

1. 每课先运行 `npm run verify`，确认起点可用。
2. 只修改课程任务要求的范围。
3. 完成后保存命令输出或浏览器验证记录。
4. 课程示例与 Atlas 结构不同时，先解释差异再迁移。
5. 不在项目中提交令牌、真实用户数据或本机绝对路径。

## 故障注入

本项目刻意保持结构简单，适合作为调试练习：

- 修改脚本路径观察 404
- 在 `/api/articles?delay=2000` 模拟慢请求
- 快速发起多个搜索验证请求取消
- 修改 localStorage 数据观察 schema 恢复
- 删除模板字段观察入口边界错误

## 阶段迁移

每个层级的目标、保留项、替换项和验收命令位于 `milestones/`。迁移时保留业务行为与测试契约，不能只重写 UI 后宣称阶段完成。
