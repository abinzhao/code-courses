# EX16 Web Accessible Resources：不需要暴露，就不要声明

## 任务卡

90 分钟；前置 EX15；产出资源引用图与生成 manifest 零 WAR 断言。

## 1. 任务背景

popup CSS/JS 由扩展自己的页面加载，不等于网页需要访问它们。
把整个 bundle 设为 web_accessible_resources 会扩大指纹与攻击面，也可能暴露本应内部的页面。

## 2. 学习目标

区分扩展内部资源与网页请求资源；理解 WAR matches、resources 与 use_dynamic_url；
审计最小暴露，而不是为了让任意链接能打开就放 `*`。

## 3. 前置知识与环境

EX23 build，EX24 artifacts 脚本。主线没有页面图片资产，不生成占位图片，
content 标记通过文本/DOM 创建，故 WAR 应不存在。

<a id="s4"></a>
## 4. 核心机制

网页引用 `chrome-extension://.../asset` 通常受 WAR gate；扩展页自己引用本地 bundle 不需 WAR。
content 执行脚本由 scripting/内容入口机制管理，不需为了 executeScript 把脚本公开给网页。
若实际需要网页加载单个静态资产，声明精确 resources 与目标 matches；
dynamic URL 缩小固定 URL 可见性，但不是秘密管理和业务授权。
WAR 匹配通常按 origin 语义处理路径限制，不能把匹配字符串当精细资源鉴权。
本卷无此需求，所以零声明比通用公开目录更简单可审计。

## 5. 设计与步骤

列出 popup/options/sidepanel、共享 chunk、CSS、content 和 background 的请求方；
确认网页不主动加载任何扩展 URL。产物测试检查 WAR undefined 与无静态 content entry。

<a id="s6"></a>
## 6. 最小可运行示例

工程中保存个人 `resources.mjs`，只读产物：

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
for (const browser of ['chrome', 'firefox']) {
  const manifest = JSON.parse(await readFile(`.output/${browser}-mv3/manifest.json`, 'utf8'));
  assert.equal(manifest.web_accessible_resources, undefined);
  assert.ok(manifest.action.default_popup);
  console.log(browser, 'internal popup resource only PASS');
}
```

先双 build 再 `node resources.mjs`，预期两行 PASS。
完整更广 artifact 审计见 [tests/artifacts.mjs](../12-capstone/02-five-path-acceptance.md#file-tests-artifacts-mjs)。
脚本结束无服务；关手工浏览器和 fixture。

<a id="s7"></a>
## 7. 业务集成

content 创建 shadow 文本标记，不 iframe 嵌入整个 popup，不向页面传备注。
App 的 CSS 在内部入口加载；脚本通过 WXT 打包，只来自本地文件。
未来若新增网页资产，需另列资源用途、精确文件和 host，并增加产物断言，当前不预建兼容层。

<a id="s8"></a>
## 8. 错误实验与排查

在个人 wxt manifest 加 `web_accessible_resources`，哪怕只有一项，本卷 artifacts 应失败；
恢复零声明后双 build 通过。不要用放宽测试解释为“功能需要”，先确认真实请求方。
若 popup CSS 未加载，检查 HTML/构建入口和内部路径；这通常不是需要 WAR。
页面试图打开内部页面失败是预期边界，不为方便调试把 options 公开。

## 9. 课后思考与答案

1. content script 文件要 WAR 吗？答案：本卷 scripting/注册方式不需要网页直接请求。
2. dynamic URL 能装秘密吗？答案：不能，资源不应包含秘密。
3. manifest 中没声明就能证明没有外泄？答案：只证明资源 gate；仍需网络、消息、日志审计。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：画内部请求。答案：popup.html→main chunk/CSS；网页→content DOM 文本，无扩展资源 URL。
- 进阶：为未来一张图写评审合同。答案：单资源、限定目标、无秘密、必要性与跨平台验证；本卷不添加。
- 故障注入：公开 `*.js`。答案：artifact 失败，删除广泛暴露声明后复验。

<a id="s11"></a>
## 11. 验收清单

- [ ] 主线 WAR 为 undefined。
- [ ] 内部 UI 和 content 执行不靠网页公开资源。
- [ ] 无整目录 wildcard 和公开 options。
- [ ] 资源说明不冒充数据泄露完整证明。
- [ ] 双平台产物检查通过。

## 12. 小结

资源暴露从真实加载方出发，零需求就零声明。

## 13. 扩展阅读

- [Chrome WAR](https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources)
- [MDN WAR](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources)

## 我现在能做到什么

能把扩展内部资产与网页访问面分开，保持主线最小暴露。

## 单元导航

[上一页 EX15](01-fetch-csp-no-credentials.md) · [卷入口](../README.md) · [下一页 EX17](../09-wxt-build/01-entrypoints-generated-manifest.md)
