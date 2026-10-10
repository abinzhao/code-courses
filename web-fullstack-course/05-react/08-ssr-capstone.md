# 08 SSR 与综合项目：从原始 HTML 到安全水合

## 本章任务、产出与前置

先完成 SPA 的路由、状态、测试和现代 API 实验。本章比较 CSR、SSR、SSG 与混合渲染，
再建立隔离 Vite SSR 路径，验证原始 HTML、无 JavaScript GET 搜索、安全序列化、状态码、
请求隔离与水合交互。

最后一课是本卷唯一的完整最终项目快照。前七章和本章前两课只给最小文件或聚焦片段，
避免多份“最终源码”漂移。快照使用公开商品数据，不序列化 cookie、CSRF、密码、私有用户
或服务器密钥；真实后端、数据库事务、生产双构建与部署仍是后续卷职责。

## 学习路线

| 顺序 | 教程 | 核心产出 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [渲染模式与水合契约](08-ssr-capstone/01-rendering-modes-hydration-contract.md) | 四种模式决策、渐进 GET、水合故障实验 | 170 分钟 |
| 2 | [Vite SSR、序列化与请求隔离](08-ssr-capstone/02-vite-ssr-serialization-isolation.md) | 200/503/404、安全 JSON、每请求状态 | 210 分钟 |
| 3 | [流式、RSC 与综合验收](08-ssr-capstone/03-streaming-rsc-capstone-acceptance.md) | 唯一完整快照、重建命令与验收矩阵 | 300 分钟 |

前三课依次回答“为何渲染”“怎样隔离”“怎样交付”。SSR 与 RSC 不是同义词；普通 Vite
加入 `'use server'` 也不会自动获得 Server Function 协议。

## 源码所有权

| 内容 | 所有者 |
| --- | --- |
| 水合不变量与故障实验 | 第 1 课 |
| SSR 请求、序列化与缓存边界 | 第 2 课 |
| 最终 `package.json`、配置、SPA/SSR 源码与测试 | 第 3 课 |
| 真实授权、事务、数据库与部署 | 后端和全栈卷 |

## 章级邻里集市任务

1. `/?q=台灯` 返回 200，原始 HTML 含“九成新台灯”；
2. `/?q=__error` 返回 503 与恢复链接，而不是空列表；
3. `/missing` 返回真实 404；
4. 禁用 JavaScript 后 GET 搜索仍返回筛选后的 HTML；
5. 初始 JSON 把 `<`、U+2028、U+2029 安全转义；
6. 服务端与客户端使用同一初始输入，水合计数从 0 到 1；
7. 每个请求创建新 store，不在模块 singleton 保存用户状态；
8. 流式 shell、错误、abort 与首字节后的状态码边界有明确说明；
9. RSC、Server Function、React cache 与 Next 的适用边界可解释；
10. 从 Markdown 快照重建后通过类型、测试、构建、SSR 与 Chromium 静态检查。

## 综合验收证据

- [ ] CSR/SSR/SSG/混合选择包含成本与失效条件。
- [ ] 随机数、时区、浏览器全局、非法 HTML mismatch 可复现并修复。
- [ ] SSR 上游只来自可信 origin，带超时并检查 HTTP/schema。
- [ ] 私有会话数据不进入公开缓存或 initial JSON。
- [ ] 200、503、404 与空结果语义不混淆。
- [ ] 原始 HTML 有内容，水合无 recoverable mismatch。
- [ ] 完整文件路径在唯一快照中不重复。
- [ ] 类型、测试、构建和 SSR 命令记录真实退出结果。
- [ ] Safari、Firefox、辅助技术、生产部署与负载未执行时明确列为未验证。

## 导航

[上一章：性能与现代 React](07-performance-modern-react.md) ·
[本卷目录](README.md) ·
[覆盖矩阵](REACT-COVERAGE.md) ·
[下一卷：Vue](../06-vue/README.md)
