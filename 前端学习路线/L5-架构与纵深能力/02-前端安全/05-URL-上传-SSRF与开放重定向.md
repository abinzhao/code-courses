# URL、上传、SSRF 与开放重定向

<!-- course-meta:start -->
> - 层级：L5
> - 先修：[文件系统安全](../../L4-全栈与服务端/02-Node.js后端基础/05-文件系统-路径与子进程安全.md)、[认证授权](../../L4-全栈与服务端/06-生产后端基础/01-认证授权与RBAC.md)
> - 建议用时：180 分钟
> - 一手资料：[SSRF](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)、[上传](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
<!-- course-meta:end -->

## 学习目标

- 能识别从 URL、文件到服务端资源的信任跨越。
- 能设计允许列表、内容验证和隔离，说明简单字符串规则的漏洞。

## 内容讲解

### 1. 前端链接与重定向

外链使用 URL 解析器并限制 HTTP(S)。登录后的 returnTo 默认只接受本站相对路径：

```js
export function safeReturnPath(raw, origin) {
  try {
    if (typeof raw !== 'string' || !raw.startsWith('/')) return '/';
    const url = new URL(raw, origin);
    if (url.origin !== origin) return '/';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
}
```

应测试 `//other.example/`、反斜杠、无效输入与编码情况。生产常进一步限制为登记路由 ID。字符串包含域名不等于目标属于该域；URL 的 username/password 也可能混淆显示。

### 2. SSRF 是服务端请求边界

文章导入、图片代理、Webhook 和 URL 摘要都可能把用户输入变成服务端网络请求。风险在于服务端能访问浏览器不能访问的网络或凭据。

最简单可靠的产品设计是只允许预先登记的服务和端点，而不是任意 URL：

```text
用户选择 sourceId → 服务端查受控配置 → 请求固定端点
```

确实允许外部 URL 时，限制协议、主机、端口、解析后 IP、重定向每一跳、超时、响应大小与网络出口；防止私网、loopback、链路本地和敏感服务访问。DNS 重绑定、IPv6 与替代表达不能靠一个正则完整解决。

服务端 DNS/IP 校验与实际连接需一致；仅先校验再由另一个不受控解析器连接仍可能有竞态。生产使用出口代理和网络隔离作为纵深控制。

### 3. 上传管道

```text
身份/额度 → 大小与格式 → 安全解码/扫描
→ 服务端生成 ID → 隔离存储 → 权限检查 → 安全下载
```

扩展名、Content-Type 和文件签名各有盲区，需要组合验证。图片可在受控流程解码并重新编码；压缩包限制解压总大小、文件数和路径；拒绝 archive traversal。

上传主动内容使用独立 origin 或 attachment 下载。`Content-Disposition` 文件名需安全编码，不能拼接 CR/LF；SVG/HTML 不能当普通图片直接放主站 origin 执行。

### 4. 服务端注入

SQL 使用参数化查询，不能拼接用户值。排序字段、表名无法用普通参数代替，需明确允许列表。shell 命令使用固定程序和参数数组，模板、正则与日志同样有注入/资源耗尽边界。

### 5. 本地验证用例

URL：正常路径、协议相对 URL、非 HTTP 协议、凭据、陌生主机、重定向。上传：超大文件、扩展名与实际内容不符、重复文件名、含目录的归档、权限不足下载。

SSRF 实验只在本地靶场验证“禁止目标被拒绝”，不探测真实内部服务或云元数据。

## 常见问题

**前端拒绝恶意 URL 足够吗？** 用户可绕过页面直接调用 API，服务端必须独立验证。

**限制域名后能跟随任意重定向吗？** 不能，每一跳和最终连接都需满足规则。

## 实操作业

基础给 returnTo 写边界测试；进阶设计上传状态与下载权限；挑战为 URL 导入画数据流并验证允许/拒绝目标。

### 参考答案与验收

重定向目标必须保持允许 origin；不可信文件不在主站执行；每个下载重新授权；拒绝路径不产生文件或外部请求。报告明确仍未验证的 DNS/IP/出口约束。

<!-- atlas-task:start -->
## Atlas 项目任务

保护 Atlas returnTo、附件、图片代理和导入接口；提供服务端验证及失败回归。见 [L5 里程碑](../../projects/atlas/milestones/L5.md)。
<!-- atlas-task:end -->

---

## 本节小结

URL 与文件是外部输入，安全策略必须延伸到服务端连接、存储和交付。

<!-- course-nav:start -->
---

[上一篇：安全头、Trusted Types 与跨源隔离](./04-安全头-Trusted-Types与跨源隔离.md) · [课程地图](../../README.md) · [下一篇：微信小程序开发](../03-跨端开发/01-微信小程序开发.md)
<!-- course-nav:end -->
