# 注入、CSRF 与业务逻辑验证

<!-- course-meta:start -->
> - 层级：L5
> - 先修：[请求重放](./02-代理-请求重放与访问控制测试.md)、[CSRF](../02-前端安全/02-CSRF与认证安全.md)
> - 建议用时：240 分钟
> - 一手资料：[WSTG 输入验证](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/07-Input_Validation_Testing/)、[CSRF 防御](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
<!-- course-meta:end -->

## 学习目标

- 能从输入到 sink 追踪注入，区分 HTML 注入与实际脚本执行。
- 能在真实浏览器验证 CSRF 前提和状态变化。
- 能测试金额、顺序、并发和重试类业务边界。

## 内容讲解

### 1. XSS 最小证明

在本地靶场 `/preview` 输入只改变 DOM 的 marker：

```html
<img src=x onerror="document.body.dataset.lab='xss'">
```

漏洞版在浏览器设置 dataset，修复版显示文本而不执行。保存请求、响应 HTML、DOM marker 和修复后的相同输入证据。

HTML 中含 marker 不等于执行成功；script 标签通过某些 innerHTML 路径插入也不一定执行。测试需对应实际 sink 和上下文，不能套固定 payload 列表。

对富文本验证允许格式保留、事件属性/危险协议移除、净化后不再次拼接不可信字符串。CSP 阻止执行也不能代替根因修复，输出编码与文本渲染仍需要。

### 2. CSRF 的三个前提

浏览器自动携带身份、攻击者能触发写请求、服务端缺少有效请求来源/意图约束。阅读响应不是必要前提，因此 CORS 拒绝读取不说明没有写入。

按[靶场双端口说明](../../projects/security-lab/README.md)操作，先设 Cookie，再从 4186 页面提交到 4185。它们跨源但同站，SameSite Lax 可能仍携带 Cookie。

观察 Network 中 Cookie、Origin 和请求方法，提交后读取虚构资料确认是否改变。修复版应返回 403 且状态不变；同源正常表单仍成功。

现代浏览器 SameSite 默认、第三方 Cookie 与隐私模式会影响实验，不应为了让演示成功全局关闭浏览器保护；记录实际前提与目标环境。

### 3. SQL 与其他注入

本地靶场没有 SQL 引擎，不能把它的 HTTP 返回当 SQL 注入证据。数据库实验应在独立种子库检查参数化与约束：

```js
// 使用真实数据库驱动时，值通过参数传递。
await client.query('SELECT id FROM articles WHERE title = $1', [userTitle]);
```

输入包含引号时仍应作为数据查询。表名、排序字段需要允许列表。模板、正则、shell 与文件路径也是 sink，分别按对应解释器验证。

禁止用生产数据库验证破坏性语句；本路线的目标是开发者确认并修复自己的应用边界。

### 4. 业务逻辑

| 测试 | 应检查 |
|---|---|
| 跳过审核直接发布 | 服务端状态机拒绝 |
| 改客户端角色/价格/作者 | 服务端重算并授权 |
| 重复同一 mutationId | 最多一次业务写入 |
| 两个旧 revision 更新 | 一个成功，另一个冲突 |
| 超额上传/负数数量 | schema 与额度拒绝 |
| 取消后重试 | 状态未知可查询，不重复副作用 |

业务漏洞经常没有明显异常页面。检查最终状态、审计和重复记录，不能只检查返回码。

## 常见问题

**漏洞演示可以读 Cookie 证明影响吗？** 本课只需 DOM marker 和虚构状态，不需收集凭据；HttpOnly 也不阻止所有 XSS 行为。

**加输入过滤就解决注入了吗？** 需对应输出/解释器上下文，黑名单难覆盖所有语法。

## 实操作业

基础验证 marker；进阶完成跨源表单和正常表单复测；挑战建立三个业务状态/并发用例并关联数据库状态。

### 参考答案与验收

XSS 必须有浏览器行为证据；CSRF 必须有实际身份携带和状态变化；业务逻辑需检查最终状态。修复不应破坏正常富文本、合法表单或重试恢复。

<!-- atlas-task:start -->
## Atlas 项目任务

为 Atlas 编辑、发布、附件和审核建立注入、跨源、幂等与并发测试。见 [L5 里程碑](../../projects/atlas/milestones/L5.md)。
<!-- atlas-task:end -->

---

## 本节小结

漏洞验证围绕真实解释器和业务状态，修复后以同一请求与正常路径共同回归。

<!-- course-nav:start -->
---

[上一篇：代理、请求重放与访问控制测试](./02-代理-请求重放与访问控制测试.md) · [课程地图](../../README.md) · [下一篇：扫描误报、修复复测与安全门禁](./04-扫描误报-修复复测与安全门禁.md)
<!-- course-nav:end -->
