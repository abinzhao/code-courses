# 09 测试、调试与算法：用证据守住正确性

## 本章任务、产出与前置

先完成函数、异步请求、TypeScript 数据边界和状态机。本章只使用 Node.js 24 内置的
`node:test` 与 `node:assert/strict`，不提前引入 Vitest、Playwright 或工程 workspace。

最终产出是读者个人 `js-lab/` 中的金额、搜索控制器和算法夹具。教材仓库只嵌入完整文件，
不创建 `package.json`、依赖、覆盖率目录或实验源码。

## 学习路线

| 顺序 | 教程 | 完整夹具 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [Node 测试、断言与 TDD 边界](09-testing-debugging-algorithms/01-node-test-assertions-tdd-boundaries.md) | `money.mjs` + `money.test.mjs`，3 项测试 | 140 分钟 |
| 2 | [确定性异步测试与系统调试](09-testing-debugging-algorithms/02-deterministic-async-testing-debugging.md) | `search-controller.mjs` + 测试，2 项测试 | 150 分钟 |
| 3 | [数据结构、复杂度、搜索与排序](09-testing-debugging-algorithms/03-data-structures-complexity-search-sort.md) | `algorithms.mjs` + `unique.test.mjs`，1 项测试 | 150 分钟 |

先建立可失败的行为断言，再控制异步完成顺序，最后在正确性证据上分析复杂度。
算法优化不能覆盖状态竞态、API 校验、后端分页或数据库约束。

## 章级邻里集市任务

完成以下六项自动化测试：

1. 严格解析合法元文本；
2. 拒绝非法、错误类型和超大金额；
3. 合计整数分且不修改输入；
4. 迟到旧响应不能覆盖最新搜索；
5. 已销毁控制器不能显示完成响应；
6. 唯一 ID 保持第一次出现顺序且不修改输入。

再运行搜索与排序演示，写清：

- 二分搜索只适用于按同一比较规则有序的数据；
- 插入排序示例先复制输入，最坏成本为 O(n²)；
- Map/Set 索引需要建立和维护成本；
- 大规模数据仍由后端分页、排序和数据库约束负责。

## 失败证据要求

每篇至少保留一项“先失败、后修复”的记录：

- 金额解析改为 `parseFloat` 后，尾随文字测试失败；
- 删除代次保护后，旧响应进入可见成功状态；
- 未排序数组交给二分搜索时违反前提；
- 原地排序时源数组被改变。

失败证据不是把错误实现留在最终夹具中。恢复正确实现后必须重新运行全部六项测试。

## 综合验收证据

- [ ] `node --test` 汇总为 tests 6、pass 6、fail 0。
- [ ] 三项金额测试覆盖 0、空数组、`NaN`、溢出和输入不变。
- [ ] 两项异步测试使用手动 Promise，不依赖任意毫秒睡眠。
- [ ] 每项测试结束后没有共享控制器、定时器或监听端口残留。
- [ ] 唯一 ID 测试覆盖重复、空输入和源数组不变。
- [ ] 算法演示输出逐行匹配，排序不修改来源。
- [ ] 能说明二分前提、索引维护成本与一次线性查找的取舍。
- [ ] 调试记录包含现象、证据、假设、修复和回归，日志不含敏感信息。
- [ ] 浏览器 Sources/Network、真实 API 和跨浏览器验证未被 Node 测试冒充。

## 导航

[上一章：TypeScript 领域设计](08-typescript-domain-design.md) ·
[本卷目录](README.md) ·
[覆盖矩阵](JS-TS-COVERAGE.md) ·
[下一卷：React](../05-react/README.md)
