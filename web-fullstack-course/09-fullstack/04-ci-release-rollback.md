# 04 CI、发布与回滚：让同一制品可验证、可切换、可恢复

## 本章任务

把邻里集市从“开发机能构建”提升为四条彼此分离的交付证据链：

```text
本地门禁
  -> 托管 CI 验证候选提交
  -> 授权目标按不可变 digest 发布并等待 readiness
  -> 应用回滚 + 数据库 expand/contract 兼容
```

CI 通过不授权发布，镜像构建不等于写入 registry，readiness 通过不等于完整浏览器业务通过，应用
回滚也不等于数据库恢复。本章示例的写操作只允许个人本地或明确创建的隔离目标；不会触发托管
Actions、外部 registry、远端部署或生产数据操作。

## 必要前置与权限

- 已完成[第 03 章：Nginx、HTTPS 与同源部署](03-nginx-https-deployment.md)。
- 工作区已有一个锁文件，API、React、Vue 各自拥有真实 `typecheck/test/build` 或对应脚本。
- PostgreSQL 18 测试库、迁移、真实 HTTP 测试和两套浏览器 journey 已存在。
- 发布操作者必须另行获得目标主机、secret、registry 只读和环境审批；读完本章不会自动获得权限。
- 当前环境没有 Docker、Nginx、actionlint 时，只执行 Bash/YAML/文本静态检查并记录阻塞。

## 学习顺序

| 顺序 | 教程 | 单一责任 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [本地质量门与干净冻结安装](04-ci-release-rollback/01-local-quality-gates-clean-install.md) | 让源码、迁移、双前端与浏览器检查先在本地可复现，并证明门能失败 | 130 分钟 |
| 2 | [GitHub Actions 数据库、双前端与浏览器门禁](04-ci-release-rollback/02-github-actions-database-browser-gates.md) | 用最小权限 PG18 job 完整映射本地命令，不携带发布凭据 | 170 分钟 |
| 3 | [不可变镜像与受守卫发布自动化](04-ci-release-rollback/03-immutable-images-release-automation.md) | 用 digest、DDL/DML 身份、迁移门、Nginx reload 和 readiness 发布 | 180 分钟 |
| 4 | [回滚、expand/contract 与证据保全](04-ci-release-rollback/04-rollback-expand-contract-evidence.md) | 恢复旧应用且保留新写入，用兼容窗口代替破坏性 schema 逆转 | 150 分钟 |

## 章级邻里集市综合任务

只在隔离目标完成一次“发布失败 → 修复 → 发布 → 回滚”演练：

1. 从干净提交冻结安装，运行 API、PG18 迁移两次、HTTP/数据库测试、React/Vue 门与顺序浏览器
   journey。
2. 注入一个真实迁移失败，证明发布在切换应用前非零停止；恢复迁移后重跑。
3. 使用已经存在的 API/Web repository digest，不在目标机重新 build，也不推送 registry。
4. 记录 commit、lock checksum、两个 image digest、migration checksum、config version 和前一版本
   digest。
5. 用 DDL 身份迁移，用 DML 身份运行 API；外部 HTTPS readiness 有界等待。
6. 发布后创建一条虚构商品：价格保持整数分，时间保持 UTC；登录仍用同源 Secure Cookie，写操作
   仍需 Origin/CSRF，owner 授权仍由后端执行。
7. 切回前一 API/Web digest，不运行旧迁移、不 DROP 新 schema，证明新写入仍可读取。
8. 保留前后响应、数据库兼容查询、requestId 和 UTC 时间；不保留 Cookie、token、连接串或密码。

## 章级验收证据

| 证据 | 通过条件 | 外部/未验证边界 |
| --- | --- | --- |
| 本地门禁 | 错误注入先失败、恢复后真实源码门退出 0 | 只覆盖当前机器 |
| Workflow 静态检查 | YAML 可解析，最小权限、PG18、双前端、浏览器、三镜像齐全 | 不等于 hosted run |
| CI 运行 | 只有真实授权 Actions URL 与结论可记为通过 | 当前任务不触发 |
| Release guard | tag、HTTP URL、缺参数均在任何 Docker 调用前失败 | 不证明目标权限 |
| Readiness | 有界轮询外部 HTTPS endpoint，失败非零 | 不替浏览器 smoke |
| 回滚 | 使用记录的旧 digest，新写入保留，旧应用兼容扩展 schema | 不等备份恢复 |
| 数据演进 | expand、过渡读写/回填、观察窗、contract 分阶段 | 不可逆迁移需单审 |

本章不会执行 registry 写入、workflow dispatch、远端 SSH、云资源修改或生产发布。真实 Actions、
受保护环境审批、registry promotion、公共域名和生产回滚均保持外部证据，除非另有明确授权和真实
运行记录。

## 章节导航

- 上一章：[03 Nginx、HTTPS 与同源部署](03-nginx-https-deployment.md)
- 第一课：[本地质量门与干净冻结安装](04-ci-release-rollback/01-local-quality-gates-clean-install.md)
- 下一章：[05 性能、安全与运维](05-performance-security-operations.md)
- 覆盖审计：[全栈覆盖矩阵](FULLSTACK-COVERAGE.md)
- 分卷入口：[全栈集成与交付](README.md)
