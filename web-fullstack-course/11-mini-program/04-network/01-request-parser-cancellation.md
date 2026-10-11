# MP-07 请求、parser 与取消：HTTP 成功不等于可信数据

## 任务卡

- 任务：为 RequestTask 建立 unknown 准入、分类错误与保证结束的取消。
- 产出：MP-23 的完整 `src/request.ts`/`src/domain.ts`，本篇 `tests/network.test.ts`。
- 运行：MP-24 项目 `npm test`、类型检查与微信 build。
- 边界：替身不访问网络；合法域名、TLS 与超时需平台实测。

## 1. 任务背景

request 的 success 回调也可能带 HTTP 401/500。后端返回 200 错字段仍不能显示商品。
页面 hide 时取消读取，客户端可能已经收到数据；还需要页面代次防迟到更新。

## 2. 学习目标

区分传输、HTTP、parser 与用户取消；保护错误 code/requestId；检查合法域名、TLS、
超时和后台恢复；知道取消不回滚预约事务。

## 3. 预备知识

创建 MP-23 的 domain/request 完整文件及 MP-24 package/tsconfig。新增下面完整测试，
无需启动平台或 API。真实 API 不使用 `example.invalid`，它只是明确不可用的示例域名。

<a id="s4"></a>
## 4. 核心理论

网络 success 仅表示平台收到响应；statusCode 必须先分类，再解析 body。
200/201 的数据保持 unknown，解析整数分、UTC、完整字段和受控状态。
非 2xx 保留 status/code/requestId，错误正文损坏时仍是 HTTP 错误，不能转换成成功空列表。

RequestTask.abort 是平台 API，不等于 AbortController；封装保证 abort 后 Promise 拒绝且只
settle 一次，迟到 callback 不再改变结果。页面仍比较 generation，因为请求可能不可取消。
读取可取消，写入取消/超时变成未知结果，必须同键恢复，不能显示“已取消预约”。

真实网络另有约束：合法域名、HTTPS 证书链、请求/上传域名分别配置，工具“不校验域名”
不能作为真机通过证据。H5 还有 CORS，与小程序合法域名是不同边界。

## 5. API 清单

| 接口 | 输入/输出 |
| --- | --- |
| createRequest(io,base) | 注入平台请求，返回带 abort 的任务 |
| parser | unknown → 完整资源或抛错 |
| ApiError | network/http/parse/cancelled |
| timeout | 10 秒课堂预算，不保证服务端停止 |
| requestId | 脱敏诊断，不记录 Token 或原响应 |

<a id="s6"></a>
## 6. 最小可运行案例

请求完整实现见 [MP-23 §6](../12-capstone/01-domain-service-tests.md#s6)，不是伪代码；
复制该节的两个指定文件，新增完整文件 `tests/network.test.ts`：

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequest, ApiError, RequestOptions } from "../src/request";
import { parsePage } from "../src/domain";
test("HTTP body corruption remains HTTP error with status", async () => {
  const send = createRequest({ request(o) {
    o.success({ statusCode: 503, data: "bad gateway" });
    return { abort() {} };
  } }, "https://api.example.invalid");
  await assert.rejects(send("GET", "/listings", {}, parsePage).promise,
    (e: unknown) => e instanceof ApiError && e.kind === "http" && e.status === 503);
});
test("abort settles even when the platform ignores abort", async () => {
  let options: RequestOptions | undefined;
  const send = createRequest({ request(o) { options = o; return { abort() {} }; } },
    "https://api.example.invalid");
  const pending = send("GET", "/listings", {}, parsePage);
  pending.abort();
  options?.success({ statusCode: 200, data: { items: [], page: 1, pageSize: 20, total: 0 } });
  await assert.rejects(pending.promise,
    (e: unknown) => e instanceof ApiError && e.kind === "cancelled");
});
```

运行 `npx tsx --test tests/network.test.ts`，预期 2/2。
再运行 `npm run typecheck`，确认注入接口与平台 adapter 相容。
命令完成没有常驻服务；每测试建立新 transport，没有共享定时器和会话。

<a id="s7"></a>
## 7. 邻里集市集成案例

首页 GET `/listings?page=1&pageSize=20&q=`，detail GET `/listings/:id`；
响应都通过 parser。MP-24 的 realTransport 接 Taro.request，默认 demo transport
故意注入离线/丢失响应，页面反馈分类错误。
真实读取页 hide 时 abort 当前句柄并递增代次，show 创建新读取；finally 只释放本句柄。
401 触发当前会话退出，409 保留用户输入并读当前资源，不盲重试新命令。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：跳过 statusCode 判断，503 HTML 进入 parse 错误；第一项失败。
恢复先 HTTP 分类再 parser。第二实验：abort 只调用平台 task.abort 不拒绝 Promise，
第二项可能挂起；封装先 settled、reject，再调用平台取消。
平台排查顺序：域名配置→TLS→网络状态→超时→HTTP→body→页面代次，不能开域名豁免掩盖。

## 9. 课后题

1. 201 需要 parser 吗？答案：需要，状态码不保证字段。
2. request 泛型能校验数据吗？答案：不能。
3. 网络 cancelled 能证明预约回滚吗？答案：不能，读同键结果。

<a id="s10"></a>
## 10. 实践练习

- 基础：400 含 code/requestId。参考答案：替身返回 `{code:"VALIDATION",requestId:"r1"}`，
  断言 ApiError 两字段保留。
- 进阶：旧 GET 迟到失败。参考答案：复用 MP-02 手动 Promise，最新成功后 reject 旧读取，
  UI 没有 stale error。
- 故障注入：parser 失败返回空页。参考答案：非法 JSON 不再失败，会误称无商品；
  恢复抛错与重试入口，不能放宽断言。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 两条网络测试通过，取消不挂起。
- [ ] HTTP、parser、取消分开，requestId 可追踪且无凭据日志。
- [ ] 平台合法域名/TLS/超时单独记录，不冒充 Node 已验证。
- [ ] 读取取消与写事务未知区分。

## 12. 常见问题

可自动重试所有请求吗？只读可按预算重试；写入须同键和后端契约。
工具能联网就够吗？域名豁免和模拟网络不能证明真机。

## 13. 扩展阅读

[微信网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)、
[wx.request](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html)、
[Taro request](https://docs.taro.zone/docs/apis/network/request/)。

## 我现在能做到什么

我能将外部响应安全准入，稳定结束取消任务，并按层定位网络故障。

## 单元导航

[上一单元](../03-routing/02-subpackages-preload.md) · [下一单元](02-idempotency-uncertain-result.md) · [本卷](../README.md)
