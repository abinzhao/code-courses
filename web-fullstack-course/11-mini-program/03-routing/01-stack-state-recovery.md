# MP-05 返回栈与页面恢复：深链不依赖上一页

## 任务卡

- 任务：解析分享 ID，验证返回栈、冷启动和本地恢复的职责。
- 产出：独立 `route.mjs`，以及 MP-24 详情页的实际导航轨迹。
- 运行：Node 验证参数；工具分别 navigateTo、redirectTo、reLaunch。
- 边界：Node 的解析断言不证明真实平台栈容量或路由成功。

## 1. 任务背景

用户从分享卡片进入详情，没有列表缓存，也可能未登录。若详情从“上一页选中对象”
取数据，冷启动就空白。返回时页面仍保留，却可能已经被别人预约，必须重新读取权威状态。

## 2. 学习目标

按 ID 重建页面；选择正确路由 API；把查询、滚动位置与服务器资源分开；
避免过期缓存和后台恢复自动写入。

## 3. 预备知识

完成运行时篇。独立实验创建单文件；平台接线使用 MP-24 的 home/detail 完整文件，
路径分别 `/pages/home/index`、`/pages/detail/index?id=lamp-1`。

<a id="s4"></a>
## 4. 核心理论

navigateTo 压栈并隐藏原页；navigateBack 回到保留实例；redirectTo 替换当前页；
reLaunch 清栈重建；switchTab 只能去配置过的 tabBar 页面，不能拿它导航普通详情。
官方栈限制会影响重复压栈，应按目标基础库核对，不在业务里靠无限 navigateTo 返回首页。

路由输入是外部输入，缺失、过长、非法字符返回可恢复错误。分享只带稳定 ID，
不带 Token、用户草稿或完整敏感对象。服务端返回 404、401、409 是不同恢复路径。
恢复可以保留 q 与滚动位置，但商品状态以重新读取结果为准；写操作不在 show 自动发起。

## 5. API 清单

| 操作 | 使用位置 |
| --- | --- |
| navigateTo | 首页→详情，保留首页 |
| navigateBack | 详情→原首页 |
| redirectTo | 当前页不可继续时替换 |
| reLaunch | 明确重置导航，不恢复旧身份 |
| useRouter | Taro 页面参数，不当可信 ID |
| useShareAppMessage | 分享 ID 和公开标题 |

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `route.mjs`：

```js
import assert from "node:assert/strict";
export function routeId(params) {
  const id = params?.id;
  if (typeof id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(id))
    throw new Error("invalid listing id");
  return id;
}
export function detailPath(id) {
  return `/pages/detail/index?id=${encodeURIComponent(routeId({ id }))}`;
}
assert.equal(detailPath("lamp-1"), "/pages/detail/index?id=lamp-1");
for (const params of [{}, { id: "../account" }, { id: "x".repeat(81) }, { id: 1 }])
  assert.throws(() => routeId(params));
console.info("route assertions: 5 passed");
```

运行 `node route.mjs`，预期 `route assertions: 5 passed`。文件无常驻进程、缓存或网络，
命令退出即清理完成。工具中创建 MP-24 完整项目，`npm run build:weapp`，导入输出目录，
从首页打开详情，再返回；另用启动路径直接打开详情，不预热列表。

<a id="s7"></a>
## 7. 邻里集市集成案例

详情 onShow 按合法 ID GET `/listings/:id`；商品 confirmed 后对应 sold，
返回列表也重新读。分享冷启能显示公开详情，预约点击时才要求登录。
草稿页从 userId 命名空间读本地数据，不能将 URL 的 userId 当身份。
详情加载失败保留“重读”和“返回”入口；无返回栈时使用 reLaunch 到首页，而不是盲目 back。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：详情读取上页内存对象，工具直接启动详情。现象为空白或旧状态，
证据是没有 GET 请求且缓存缺失，根因是隐式上游依赖。恢复按 ID 读取，
分别复验热返回、冷分享、404。分享参数含 Token 属于泄露风险，应立即移除，
日志只记录路由名与脱敏 ID，不保存完整启动 query。

## 9. 课后题

1. 返回会再次 load 吗？答案：保留页通常只 show，重新创建另论。
2. URL 的 ownerId 能授权吗？答案：不能。
3. 分享标题能当详情吗？答案：只是公开投影，状态重新读。

<a id="s10"></a>
## 10. 实践练习

- 基础：空 ID。参考答案：解析失败显示无效链接，禁止发 GET 空路径。
- 进阶：无栈返回。参考答案：检查平台页面栈，若只有当前页则 reLaunch 首页，
  不循环 navigateTo 制造重复首页。
- 故障注入：详情 hidden 时迟到响应更新。参考答案：hide 增代次；
  恢复时新 GET，只有当前代次提交，沿用 MP-02 测试方式。

<a id="s11"></a>
## 11. 阶段验收

- [ ] Node 五条断言通过，缺失参数不发请求。
- [ ] 工具冷深链、热返回、404 与无栈回首页均记录。
- [ ] 分享没有凭据或草稿，身份由服务端确认。
- [ ] 后台返回仅重读，不自动预约。

## 12. 常见问题

能把整个 Listing 放 query 吗？不能可靠恢复，可能过期、超长或泄露。
栈容量多少？按当前平台官方文档和工具验证，不把微信限制推给支付宝。

## 13. 扩展阅读

[微信路由](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/route.html)、
[Taro 路由 API](https://docs.taro.zone/docs/apis/route/navigateTo/)。

## 我现在能做到什么

我能让公开详情在无上页、无登录和返回恢复时按同一规则工作。

## 单元导航

[上一单元](../02-rendering/02-taro-render-budget.md) · [下一单元](02-subpackages-preload.md) · [本卷](../README.md)
