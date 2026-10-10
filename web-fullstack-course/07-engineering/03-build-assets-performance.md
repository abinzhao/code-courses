# 03 构建、资源、缓存与性能预算

## 本章任务

把前两章已通过 `quality` 的 `market-engineering-lab` 构建为可检查的生产资源：读懂 Vite 8 / Rolldown 构建图，验证动态模块的真实请求时机，明确公开配置与发布缓存边界，并用 Node.js 脚本执行 JavaScript 体积预算。

本章只产生本地构建与生产预览证据。它不证明 CDN 缓存头、TLS、真实用户网络、生产压缩、线上发布或回滚已经通过。

## 必要前置

- 完成 [pnpm、Vite 与 ESM](01-pnpm-vite-esm.md)，能够运行开发、构建和预览命令。
- 完成 [Lint、格式与质量门禁](02-lint-format-quality.md)，`pnpm quality` 已通过。
- 使用 Node.js 24.21.0、pnpm 12.10.1、Vite 8.3.0 和现代浏览器。
- 所有实验在读者自己的 `market-engineering-lab/` 中执行，不在教材目录安装依赖或生成 `dist/`。

## 学习路线

| 顺序 | 教程 | 主要产出 | 建议投入 |
| --- | --- | --- | ---: |
| 1 | [Vite 8 构建图、Chunk 与动态导入](03-build-assets-performance/01-vite-build-graph-chunks-dynamic-import.md) | 构建文件清单、动态 chunk 前后请求证据 | 3 小时 |
| 2 | [客户端环境、Source Map、缓存与发布](03-build-assets-performance/02-client-env-sourcemaps-cache-release.md) | 公开变量证据、`base`/Source Map/发布诊断记录 | 3 小时 |
| 3 | [递归资源预算与生产预览](03-build-assets-performance/03-asset-budget-production-preview.md) | raw + gzip 报告、正常门禁与 1 byte 失败证据 | 3 小时 |

三课按顺序复用同一个实验：第一课形成可延后加载的构建图，第二课补充公开配置与发布语义，第三课读取已经生成的 `dist/`。预算脚本故意拒绝缺失构建，因此不能跳过构建直接运行。

## 章级邻里集市任务

完成一个本机静态邻里集市页面：

1. 首屏显示教学商品“台灯”和整数分价格 `19.90 元`。
2. 点击“加载教学统计”后才请求 report chunk；请求失败时有可恢复提示。
3. 页面显示明确可公开的站点标签和 release id，不放入 token、密码或 Cookie。
4. 根路径与 `/market/` 子路径的 `base` 选择有对应部署说明。
5. 带 hash 资源和 HTML 使用不同缓存职责，发布顺序是资源先于入口。
6. 递归预算脚本报告每个 JavaScript 文件的 raw 与 gzip 字节；默认单文件 gzip 不超过 80 KiB、全部 JavaScript gzip 不超过 180 KiB。

商品是源码内静态教学数据，不是外部 JSON；价格保持非负安全整数分，`createdAt` 保持 UTC ISO 8601。页面没有真实登录、授权、预约事务或后端持久化。

## 章级验收证据

- [ ] `find dist -type f -print | sort` 保存本次构建的 HTML、CSS 和带 hash JavaScript 清单。
- [ ] 生产预览 Network 记录证明 report chunk 在点击前未请求、点击后才请求。
- [ ] `VITE_PUBLIC_LABEL` 的演示值可在页面或产物中观察，并能解释它为何不是秘密。
- [ ] wrong `base`、缺失懒加载 chunk 和公开 Source Map 均有“现象、证据、原因、修复、复验”记录。
- [ ] 正常预算退出 0；缺失 `dist/` 被拒绝；1 byte 阈值实验退出非零；恢复后再次退出 0。
- [ ] 能区分“全部构建 JavaScript”“首屏实际请求”“本地 gzip 估算”和“生产响应压缩”。
- [ ] 明确记录尚未验证生产缓存头、CDN、真实网络性能、线上发布与回滚。

## 证据边界

`vite preview` 只用于本地检查生产构建，不是生产服务器。内容 hash 只是缓存寻址的一部分，不是安全签名。Source Map 不公开也不能保护浏览器端秘密。预算通过只说明当前构建符合这组体积上限，不说明交互速度、Core Web Vitals 或生产容量达标。

[上一章：Lint、格式与质量门禁](02-lint-format-quality.md) · [下一章：Workspace、组件库与 Design Tokens](04-workspace-component-library.md) · [工程卷目录](README.md)
