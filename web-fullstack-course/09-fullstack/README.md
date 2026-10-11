# 第九卷：全栈联调与交付

## 本卷定位与教材结构

本卷把前端、API 和数据库组合成可验证、可发布、可回滚、可恢复的邻里集市。详细教程位于稳定
编号章入口之下；章入口负责顺序和综合验收，教程负责完整交付步骤，覆盖矩阵负责证据归属。阅读
完成不自动等于具备中级能力，结业必须由可重复证据证明。

## 学习路线

### 01 契约集成

章入口：[让 API、React 与 Vue 使用同一契约](01-contract-integration.md)

1. [工作区契约与运行时验证](01-contract-integration/01-workspace-contract-runtime-validation.md)
2. [同源 Session、CSRF 与浏览器客户端](01-contract-integration/02-same-origin-session-csrf-client.md)
3. [React/Vue 身份与数据集成](01-contract-integration/03-react-vue-auth-data-integration.md)
4. [编辑冲突、请求竞态与端到端验收](01-contract-integration/04-edit-conflict-races-end-to-end.md)

### 02 Docker 与 Compose

章入口：[把运行条件变成可审查文件](02-docker-compose.md)

1. [多阶段镜像与构建上下文](02-docker-compose/01-multi-stage-image-build-context.md)
2. [Compose 服务、网络、健康与迁移](02-docker-compose/02-compose-services-network-health-migrations.md)
3. [Secret、Volume、持久化与故障](02-docker-compose/03-secrets-volumes-persistence-failures.md)

### 03 Nginx、HTTPS 与边缘部署

章入口：[保持 SPA、资源与 API 边界](03-nginx-https-deployment.md)

1. [Web 镜像、SPA 静态资源与缓存](03-nginx-https-deployment/01-web-image-spa-static-cache.md)
2. [Nginx 代理、HTTPS 与同源契约](03-nginx-https-deployment/02-nginx-proxy-https-same-origin.md)
3. [Compose TLS、证书与故障诊断](03-nginx-https-deployment/03-compose-tls-certificate-diagnosis.md)

### 04 CI、发布与回滚

章入口：[让证据跟随同一提交与制品](04-ci-release-rollback.md)

1. [本地质量门与干净安装](04-ci-release-rollback/01-local-quality-gates-clean-install.md)
2. [GitHub Actions 数据库与浏览器门禁](04-ci-release-rollback/02-github-actions-database-browser-gates.md)
3. [不可变镜像与发布自动化](04-ci-release-rollback/03-immutable-images-release-automation.md)
4. [回滚、Expand/Contract 与证据](04-ci-release-rollback/04-rollback-expand-contract-evidence.md)

### 05 性能、安全与运维

章入口：[用恢复能力而不是正常截图验收](05-performance-security-operations.md)

1. [负载基线与慢查询证据](05-performance-security-operations/01-load-baseline-slow-query.md)
2. [日志、指标、告警与磁盘](05-performance-security-operations/02-logs-metrics-alerts-disk.md)
3. [备份完整性与隔离恢复](05-performance-security-operations/03-backup-integrity-isolated-restore.md)
4. [故障演练与凭据轮换](05-performance-security-operations/04-failure-drills-credential-rotation.md)

### 06 毕业项目

章入口：[用客观证据评定全栈能力](06-graduation-project.md)

1. [结业范围、业务闭环与证据包](06-graduation-project/01-capstone-scope-business-evidence.md)
2. [评分、复审与独立修改](06-graduation-project/02-scoring-review-independent-change.md)

## 学习与运行

先完成 [React](../05-react/README.md) 或 [Vue](../06-vue/README.md)、[工程化](../07-engineering/README.md)
和[后端综合项目](../08-backend/10-api-capstone.md)。精确技术选择、核验日期和兼容线统一见
[版本基线](../00-guide/02-version-baseline.md)；每次验收保存实际工具、服务、镜像和数据库探针，
不能用配置文件存在代替运行证据。

教材仓库只保存 Markdown。应用、清单、锁文件、证书、私钥、dump、日志、容器状态和构建产物
只能存在于读者项目或临时验证目录。

## 连续项目与边界

### 邻里集市拓扑

```text
browser
  -> HTTPS Nginx : same origin
       -> React or Vue static dist
       -> /api/v1 -> Nest API
                      -> PostgreSQL 18
                      -> optional Redis/BullMQ
```

两个前端都必须覆盖登录恢复、列表、发布、编辑 `409`、收藏、预约冲突、错误与恢复状态。金额始终为非负安全整数分，持久化时间为 UTC ISO 8601。浏览器取消等待不回滚后端事务；Cookie、Origin、CSRF、CORS、TLS、CSP、限频、输入验证和对象授权是不同控制。

本卷示例只允许回环地址、`.test` 域名或明确隔离资源。发布、远程镜像写入、托管工作流触发、生产负载、数据库迁移、恢复、故障注入和凭据轮换都需要单独授权；教材命令不得默认指向公网或现有数据库。

### 证据分级

| 标签 | 可以证明 | 不能扩大为 |
| --- | --- | --- |
| STATIC | 语法、schema、配置合并和 guard 形状 | 容器能启动、代理能转发、CI 已运行 |
| LOCAL RUNTIME | 指定机器、版本、隔离数据上的观察结果 | 公共 PKI、生产容量、云故障恢复 |
| EXTERNAL / MANUAL | 实际托管或人工环境记录 | 未运行项目的“预计通过” |

Dockerfile、Compose、Nginx、workflow 和 shell 的解析结果必须分别记录。浏览器、PostgreSQL、Redis、备份恢复和故障演练只有实际运行才得分。Safari、Firefox、真实移动设备和 VoiceOver/NVDA/JAWS 保持人工缺口，除非保存了对应环境与结果。

## 验收

- [全栈覆盖矩阵](FULLSTACK-COVERAGE.md)
- [统一项目契约](../00-guide/05-project-assessment.md)
- [版本基线](../00-guide/02-version-baseline.md)
- [全书验证记录](../VALIDATION.md)

最终证据包至少包含：冷安装与锁文件、前后端质量门、真实 HTTP/数据库断言、两个前端浏览器路径、镜像 digest、Compose/Nginx/TLS 检查、发布与回滚、日志/指标、备份校验与隔离恢复、RTO/RPO、故障恢复和脱敏说明。未执行的维度不得计分。

## 验证范围

本卷已完成文档结构、代码与配置抽取、共享契约、代表性类型/测试、Nginx 静态解析、本地证书和
安全拒绝路径验证；容器运行、目标数据库、托管 CI、远程制品、发布回滚与灾难恢复仍受本机或
外部环境限制。精确数量、版本、运行结果、独立复审与未验证范围统一见
[交付与验证说明](../VALIDATION.md)。

## 资料与导航

- [Docker](https://docs.docker.com/)
- [Compose Specification](https://docs.docker.com/reference/compose-file/)
- [Nginx](https://nginx.org/en/docs/)
- [GitHub Actions](https://docs.github.com/actions)
- [PostgreSQL 18](https://www.postgresql.org/docs/18/)
- [OpenSSL](https://docs.openssl.org/)

[上一卷：业务后端](../08-backend/README.md) · [全书入口](../README.md) ·
[结业标准](06-graduation-project.md)
