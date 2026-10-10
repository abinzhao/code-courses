# 04 原型、类与 ECMAScript 模块

## 本章任务与产出

本章从对象的属性查找出发，建立 `this` 的调用模型，再把邻里集市的金额、目录、汇总与入口拆成明确的 ESM 依赖图。

完成后你将得到：

- 一份可运行的原型链、脱离方法和有状态类实验；
- 一套由 `money.mjs`、`catalog.mjs`、`summary.mjs` 与入口组成的 ESM；
- 一份单次求值、实时绑定、动态导入和循环依赖诊断记录；
- 一张没有内置原型修改、工具反向依赖入口或共享可变商品数组的模块图。

运行基线为 Node.js 24 LTS。浏览器 ESM 必须使用 `type="module"` 并通过 HTTP 加载。

## 必要前置

先完成：

- [函数契约、作用域与异常](./02-functions-scope-errors.md)
- [对象、数组与数据边界](./03-objects-arrays-data.md)

你应能解释引用、普通记录、非负安全整数分和异常传播。本章不把 API DTO 转成类层次，也不把模块内存描述成数据库、身份或授权。

## 学习路线

| 顺序 | 教程 | 核心问题 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [原型链、`this` 与类的适用边界](./04-prototypes-modules/01-prototype-chain-this-classes.md) | 属性从哪里来，方法为何会失去接收者，何时值得使用类？ | 70 分钟 |
| 2 | [ESM 导入、导出与路径解析](./04-prototypes-modules/02-esm-import-export-resolution.md) | 如何建立能在 Node 与浏览器解释的显式模块契约？ | 85 分钟 |
| 3 | [模块图、共享状态与动态导入](./04-prototypes-modules/03-module-graphs-state-dynamic-import.md) | 模块何时求值，状态由谁拥有，如何处理按需加载与循环依赖？ | 80 分钟 |

依赖顺序不可颠倒：先理解方法与状态，再拆文件，最后分析整个模块图。预计总投入约 4 小时，包含故障注入与复验。

## 章级邻里集市任务

在 `js-lab/modules/` 完成以下模块：

```text
main.mjs
├── catalog.mjs
├── money.mjs
├── summary.mjs
│   └── money.mjs
└── notice.mjs（动态导入）
```

要求：

1. `money.mjs` 只负责校验和格式化非负安全整数分；
2. `catalog.mjs` 提供商品读取快照，不直接导出可变数组；
3. `summary.mjs` 接收普通商品记录并返回 `{ count, totalCents }`；
4. `main.mjs` 是唯一启动入口，输出商品、数量和金额；
5. 通知能力通过 `import()` 按需加载，加载失败有明确错误状态；
6. 工具模块不导入入口、DOM 或网络层；
7. 不修改任何内置原型，不用 `instanceof` 代替 DTO 字段校验。

商品记录仍是普通数据。类只用于确有独立生命周期的本地状态；模块状态不提供刷新后的持久化，更不授予服务端对象权限。

## 综合验收证据

- [ ] 直接方法、脱离方法、`call`/`bind` 的结果均可预测并复现；
- [ ] `node modules/main.mjs` 输出 0 分商品在内的正确数量和合计；
- [ ] 路径缺少 `./`、扩展名错误、命名导出不匹配都有独立诊断记录；
- [ ] 同一动态模块求值一次，两次导入的命名空间对象严格相等；
- [ ] 修改读取快照不污染目录内部记录；
- [ ] 依赖图从入口流向功能模块；`summary.mjs` 可依赖 `money.mjs`，但任何工具模块都不反向导入入口；
- [ ] 浏览器通过 HTTP 加载 ESM，Network 无 404，Console 无未处理错误。

保存命令输出、错误修复前后对比和最终依赖图，作为本章验收证据。

## 章节导航

- 上一章：[03 对象、数组与数据边界](./03-objects-arrays-data.md)
- 下一章：[05 DOM、事件与可访问状态](./05-dom-events.md)
- 分卷首页：[JavaScript 与 TypeScript](./README.md)
