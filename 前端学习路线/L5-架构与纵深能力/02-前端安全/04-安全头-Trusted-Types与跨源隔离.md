# 安全头、Trusted Types 与跨源隔离

<!-- course-meta:start -->
> - 层级：L5
> - 先修：[XSS 与 CSP](./01-XSS防御与CSP策略.md)、[来源隔离](../../L0-Web基石/01-浏览器原理与渲染机制/05-来源隔离-CORS与跨窗口通信.md)
> - 建议用时：180 分钟
> - 一手资料：[安全头](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)、[Trusted Types](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)
<!-- course-meta:end -->

## 学习目标

- 能解释每个安全头保护的边界，并在实际响应验证。
- 能逐步迁移危险 DOM sink，而不建立“全部信任”的策略。
- 能判断跨源隔离对登录、嵌入和资源的影响。

## 内容讲解

### 1. 控制与边界

| 控制 | 主要用途 | 不能替代 |
|---|---|---|
| CSP script-src | 限制可执行脚本来源 | 安全 DOM、授权 |
| frame-ancestors | 限制谁可嵌入当前页面 | iframe 内部权限 |
| nosniff | 限制错误 MIME 的执行 | 上传内容检查 |
| Referrer-Policy | 限制 Referer 泄漏 | 秘密不进入 URL |
| Permissions-Policy | 限制页面能力 | 用户授权及产品权限 |
| HSTS | 在适用条件下强制 HTTPS | 首次访问与证书配置 |
| COOP/COEP/CORP | 浏览上下文或资源隔离 | CORS 和业务授权 |

HSTS 在生产 HTTPS 主机确认子域与证书后配置，includeSubDomains/preload 不能盲目复制。`frame-ancestors` 应通过响应头发送，不能靠 meta 实现。

### 2. CSP 迁移

先盘点脚本、内联事件、第三方、动态 import 和框架启动代码。在 Report-Only 观察违规，逐步清除不必要来源再 enforcing。

每次响应生成不可预测 nonce，模板与 CSP 同步使用。不能把一个固定 nonce 写到仓库或在共享缓存里不受控复用。哈希适合固定脚本；strict-dynamic 对信任链有影响，需按目标浏览器与框架文档验证。

报告中的 URL、页面路径和代码片段可能含敏感数据，收集时脱敏限额。没有报告不代表没有攻击或策略有效。

### 3. Trusted Types

支持时可用 `require-trusted-types-for 'script'` 强制关键 DOM sink 接收受控值。默认优先 textContent；确实需要富文本时使用经过维护的净化库并建立窄范围策略：

```js
// 前提：DOMPurify 已作为本地依赖加载并经项目审查。
const policy = globalThis.trustedTypes?.createPolicy('atlas-rich-text', {
  createHTML: (value) => DOMPurify.sanitize(value, { RETURN_TRUSTED_TYPE: false }),
});
const clean = policy
  ? policy.createHTML(untrustedHtml)
  : DOMPurify.sanitize(untrustedHtml);
container.innerHTML = clean;
```

这只是富文本渲染适配示例，策略本身不是净化器。不能 `createHTML: value => value` 把所有字符串直接信任；净化后的 DOM 也不能再次拼接不可信 HTML。

不同浏览器支持范围不同，能力检测与目标环境测试必须保留。CSP enforce 与库/框架冲突时按 sink 迁移，不以全面 unsafe-inline 回退作为最终方案。

### 4. 跨源隔离

启用 COOP same-origin 和满足 COEP 的策略后，才可能得到 `crossOriginIsolated`。COEP require-corp 会影响跨源图片、脚本和 iframe 的加载；credentialless 等方案有不同凭据语义与兼容性。

```js
console.log({ isolated: globalThis.crossOriginIsolated });
```

COOP 可能切断 popup opener，影响 OAuth、支付和跨窗口流程；需要联合回归，不能只验证 SharedArrayBuffer 可用。

## 常见问题

**安全头全加上是不是最安全？** 策略需匹配资源和业务；错误隔离会破坏登录与内容加载。

**React 自动转义是否覆盖 innerHTML？** 不覆盖显式 HTML sink、恶意 URL 和不可信脚本等边界。

## 实操作业

基础为本地 Atlas 检查响应头；进阶列危险 sink 并迁移为文本/净化；挑战启用隔离并回归 popup、iframe 和图片。

### 参考答案与验收

用浏览器响应和 Console 证明 enforcing；文本 marker 保持文本；富文本保留允许标签、移除主动内容；隔离开启后业务主路径仍可用。只提交配置不算通过。

<!-- atlas-task:start -->
## Atlas 项目任务

建立 Atlas 安全头清单、CSP 迁移与 sink 清单，覆盖登录和编辑器回归。见 [L5 里程碑](../../projects/atlas/milestones/L5.md)。
<!-- atlas-task:end -->

---

## 本节小结

安全头是边界控制，需和安全渲染、框架集成及业务回归一起验证。

<!-- course-nav:start -->
---

[上一篇：03-供应链安全与依赖审计](./03-供应链安全与依赖审计.md) · [课程地图](../../README.md) · [下一篇：URL、上传、SSRF 与开放重定向](./05-URL-上传-SSRF与开放重定向.md)
<!-- course-nav:end -->
