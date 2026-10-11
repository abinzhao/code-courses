# EX15 网络与 CSP：公开请求，不携带认证

## 任务卡

120 分钟；前置 HTTP、EX14；产出无凭证回环 fetch、CSP 拒绝与权限/CORS 分层诊断。

## 1. 任务背景

浏览助手不需要接管用户会话。跨源访问能力不是登录身份；复制 cookies、抓表单 token、
让后台代发任意 URL 都超出课程目标。

## 2. 学习目标

区分 host permission、CORS、CSP 与认证；固定 URL、credentials omit、超时和响应 parser；
禁用远程执行，避免开放代理消息。

## 3. 前置知识与环境

EX23 fixture 提供 `/api/public`。主线 options 从 UI Enable target host 获得授权后实验；
未授权失败应记录，不能把 permissions mock 成成功。
主线实际业务仍只用公开 DOM，fetch 是独立机制实验，不持久写网络响应。

<a id="s4"></a>
## 4. 核心机制

host permission 控制扩展目标能力；extension page CSP connect-src 控制连接目的；
content script 中网络仍与页面 CORS 语境有关，不能用扩展权限一概解释所有请求。
认证是服务端判定，权限不产生账户身份。`credentials:'omit'` 不发送 cookies；
不加 Authorization，不读 cookies，不接收任意 URL 或任意 headers。
MV3 不允许远程托管代码；CSP `script-src 'self'`，不 unsafe-eval、不内联扩展脚本。
connect-src 仅回环 4173；生产项目接 HTTPS 公共 API 需重新明确合同和授权，不能照搬本地配置。

## 5. 设计与步骤

请求端点是常量，AbortController 五秒超时；检查 status、JSON shape 与内容类型预期，
只输出 public status/count。不把返回 JSON 当脚本执行，也不直接 innerHTML。

<a id="s6"></a>
## 6. 最小可运行示例

在主线 options 的 DevTools 控制台执行完整探针，先启动 fixture 并通过 UI 主动授权：

```js
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);
try {
  const response = await fetch('http://127.0.0.1:4173/api/public', {
    credentials: 'omit', redirect: 'error', signal: controller.signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw Error(`HTTP_${response.status}`);
  const value = await response.json();
  if (!value || value.status !== 'public-fixture' ||
      !Number.isSafeInteger(value.itemCount)) throw Error('SCHEMA');
  console.log('PUBLIC_FETCH', value.status, value.itemCount);
} finally { clearTimeout(timeout); }
```

预期 PUBLIC_FETCH public-fixture 2；Network 查看目标固定、没有凭证头，不读取或输出真实 cookie。
该探针本次未单独自动实测，读者记录权限接受与请求结果。
停止：通过 UI Revoke，关独立浏览器，fixture `Ctrl+C`；不留下远程监听服务。

<a id="s7"></a>
## 7. 业务集成

[wxt.config](../12-capstone/01-complete-project-rebuild.md#file-wxt-config-ts) 限定 connect-src，
background 没有任意 FETCH 消息。若以后增加网络，必须新 schema、目的地 allowlist、
body 大小/错误合同与评审；当前不假设需要认证。
公开备注仅留 local，fetch 例子不上传任何 Item/note。

<a id="s8"></a>
## 8. 错误实验与排查

停 fixture 后运行探针，预期连接失败，finally 清定时器；恢复服务器重试。
在个人配置把 connect-src 改为 `'none'`，build/load 后 Network/console 出现 CSP 拒绝，
恢复 exact endpoint 后复验。不要通过加 `*` 或 unsafe-eval 解决。
content fetch 失败先检查页面 CORS/CSP；options 失败分别核对授权、CSP、服务器和状态。

## 9. 课后思考与答案

1. host permission 等于登录吗？答案：不，不能替代服务端身份与资源授权。
2. 为什么 redirect:error？答案：固定公共目的地实验不跟随跳到另一目的地，缩小网络范围。
3. 可以把返回字符串 eval 吗？答案：不，数据 parser 与代码来源是不同边界。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：停服务。答案：失败可见，timer 清理，无 storage 写。
- 进阶：设计固定 API parser。答案：限定字段、整数范围、响应大小和错误码；当前示例只公共两个字段。
- 故障注入：CSP none。答案：记录 CSP 拒绝，恢复特定 connect-src，不加宽至所有网络。

<a id="s11"></a>
## 11. 验收清单

- [ ] URL 固定，credentials omit，无认证数据采集。
- [ ] 有超时、status 和 JSON parser。
- [ ] 权限/CORS/CSP/认证分别说明。
- [ ] 无远程代码、任意 FETCH 代理。
- [ ] 未实测 fetch 与已实测产物区分。

## 12. 小结

网络能力应比业务目标更窄，不能借平台特权绕过用户会话边界。

## 13. 扩展阅读

- [Chrome Cross-Origin Requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)
- [Extension CSP](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)
- [MDN Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)

## 我现在能做到什么

能分层定位网络失败，并保持公开访问、无凭证与无远程执行的边界。

## 单元导航

[上一页 EX14](../07-permissions/02-optional-host-revocation.md) · [卷入口](../README.md) · [下一页 EX16](02-web-accessible-resources.md)
