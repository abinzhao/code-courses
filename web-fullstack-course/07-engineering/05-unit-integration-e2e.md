# 05 单元、集成与端到端测试

## 本章使命

本章不按工具知名度安排测试，而按证据层级回答三个问题：

1. 领域规则在纯输入输出下是否成立；
2. HTTP、运行时解析与异步状态连接后是否仍然成立；
3. 浏览器加载生产构建产物后，用户能否观察到正确结果与恢复路径。

你会在前三章的独立练习 `market-engineering-lab/` 中加入 Vitest 5.0.3 与
Playwright 1.64.0。第四章的 `market-workspace/` 不在本章被覆盖；共享包、双框架和
完整质量门禁将在第 07 章结业工程中统一组装。

本章产出是三组能发现错误的测试及其红绿证据，不是一个覆盖率百分比：

- 领域测试锁定整数分、UTC、分页、唯一性和输入不可变；
- 集成测试连接真实 `Response`、HTTP 状态、解析器、取消与状态发布；
- E2E 测试连接 Vite 生产构建、本机只读教学 API 与 Chromium 用户操作。

## 必要前置与版本

先完成：

- [pnpm、Vite 与 ESM](01-pnpm-vite-esm.md)；
- [Lint、格式与质量门禁](02-lint-format-quality.md)；
- [构建、资源、缓存与性能预算](03-build-assets-performance.md)；
- [TypeScript 运行时解析器教程](../04-javascript-typescript/08-typescript-domain-design/02-unknown-runtime-parsers-errors.md)。

本章固定 Node.js 24.21.0、pnpm 12.11.2、Vitest 5.0.3、Playwright 1.64.0、
Vite 8.3.4 与匹配 Playwright 的 Chromium。命令都从读者自己的
`market-engineering-lab/` 根目录执行；教材仓库不安装依赖、不保存锁文件和构建产物。

## 学习路线

| 顺序 | 教程 | 核心问题 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [Vitest 5：用单元测试锁定领域边界](05-unit-integration-e2e/01-vitest-unit-domain-boundaries.md) | 纯领域规则怎样产生独立、可重复的失败证据 | 100 分钟 |
| 2 | [Vitest 5：集成 HTTP、解析器与请求竞态](05-unit-integration-e2e/02-vitest-integration-http-races.md) | 协议、解析与异步状态怎样无任意等待地连接 | 130 分钟 |
| 3 | [Playwright 1.64：验收生产构建页面](05-unit-integration-e2e/03-playwright-built-page-e2e.md) | 用户在真实构建页上能观察到什么 | 130 分钟 |

依赖顺序是“领域契约 → HTTP 与状态控制 → 浏览器行为”。第三课会复用前两课的真实实现，
但不会用浏览器路由拦截替换解析器或教学 API。建议分两次学习：先完成前两课及
`pnpm test`，再安装匹配 Chromium 并完成 `pnpm test:e2e`。

## 章级邻里集市任务

为邻里集市列表搜索建立一条累计证据链：

1. `1990` 分显示 `19.90`，`0` 分显示 `0.00`；负数、小数和不安全整数被拒绝。
2. 外部 JSON 保持 `unknown`，只有通过 UTC、分页、重复 ID 和金额解析后才能发布。
3. 查询保留特殊字符，使用同源凭据策略，并把同一个 `AbortSignal` 传到请求边界。
4. 新搜索会取消旧搜索；即使注入的读取器忽略取消，旧编号仍无权发布。
5. 页面离开后的请求结果不能发布；失败后可重新搜索恢复。
6. Chromium 只连接 Vite production preview 上的本机只读教学 API，完成七个场景。

每条产品规则都落在最小充分层，不用昂贵的 E2E 重复所有纯函数组合：

| 产品规则 | 最小充分层 | 必须出现的失败证据 |
| --- | --- | --- |
| 整数分与 UTC 规范化 | Vitest 单元测试 | 除数改为 `1000` 时金额断言失败 |
| 分页矛盾、重复 ID、输入不可变 | Vitest 单元测试 | 解析器接受矛盾数据时断言失败 |
| HTTP 500、查询编码、凭据、信号、解析器 | Vitest 集成测试 | 删除 `response.ok` 检查后 500 用例失败 |
| 取消、过期结果、销毁 | Vitest 确定性竞态测试 | 同时移除取消与 generation guard 后旧结果出现 |
| 用户可见金额、空态、错误与恢复 | Playwright 构建页 E2E | 移除行为或占用严格端口时测试明确失败 |

## 综合验收与证据

| 命令或观察 | 合格证据 | 不能推出的结论 |
| --- | --- | --- |
| `pnpm exec vitest --version` | 输出 `vitest/5.0.3` | 业务断言已经运行 |
| `pnpm test` | 领域、HTTP、解析和竞态测试实际执行且退出 0 | 浏览器产物可用 |
| 金额除数故障注入 | 指定金额测试先红、恢复后转绿 | 所有金额币种规则齐全 |
| 竞态故障注入 | 旧结果发布断言先红、恢复后转绿 | 服务端写操作已撤销 |
| `pnpm exec playwright --version` | 输出 `Version 1.64.0` | 匹配 Chromium 已安装 |
| `pnpm test:e2e` | 严格端口 4173 上七个场景通过 | 真实生产服务器已部署 |
| 端口占用实验 | preview 明确非零退出，释放后通过 | 生产端口治理已完成 |
| 失败 trace | 只保留失败现场并受控访问 | trace 不含敏感数据 |

章级验收必须同时满足：

- [ ] 每条产品规则能映射到最小充分测试层。
- [ ] Vitest 预期值由业务规则独立写出，没有调用待测实现生成预期。
- [ ] 异步测试由 deferred promise、请求事件或自动等待驱动，没有任意 `sleep`。
- [ ] 七个 E2E 场景分别覆盖 `19.90`、`0.00`、HTTP 500、字符串价格拒绝、空成功、
      旧结果防护和失败恢复。
- [ ] 至少完成金额、HTTP、竞态与浏览器行为的红绿故障注入。
- [ ] 能区分真实 `Response` 对象、本机教学 API、浏览器路由 mock 与真实后端。

## 证据边界

Vitest 中注入请求函数仍会使用真实 `Response`、JSON 消费和真实解析器，但没有经过网络、
Cookie 存储、CORS 或服务器。Playwright 连接的是 Vite preview 中明确标记的本机只读教学
API，不使用路由拦截冒充后端，也不包含身份、授权、事务或数据库。

因此本章不能证明真实登录、CSRF 防护、对象授权、并发预约唯一性、生产缓存、TLS、部署或
回滚。真实预约唯一性必须由后端数据库约束和并发集成测试证明；前端取消只停止等待或忽略
旧结果，不能撤销服务端已经完成的写入。

## 章节导航

[上一章：Workspace、组件库与 Design Tokens](04-workspace-component-library.md) ·
[工程卷目录](README.md) ·
[工程化覆盖矩阵](ENGINEERING-COVERAGE.md) ·
[下一章：CI、Git 与发布](06-ci-git-release.md)
