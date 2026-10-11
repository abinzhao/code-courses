# EX07 公开 DOM Parser：从字符串到受限 Item

## 任务卡

120 分钟；前置 DOM、TypeScript；产出字段白名单 parser、DOM 集成断言与恶意形状标题实验。

## 1. 任务背景

邻里集市页面可能变化或包含嵌入内容。本卷只读取公开 article 的 ID、标题、整数分和 URL。
页面输入框、Cookie、账号、页面全局对象不属于任务，也不能为“方便”一起采集。

## 2. 学习目标

严格验证 URL/ID/标题/价格；使用整数分避免浮点与区域格式猜测；
用 text sink 展示不可信字符串，并对缺字段明确失败。

## 3. 前置知识与环境

EX23 fixture 和 domain.ts 完整源码；`npm install`、`npm test`。
fixture 价格合同是 `data-cents`，不能根据显示的 `19.90 yuan` 自创 locale parser。

<a id="s4"></a>
## 4. 核心机制

selector 只负责定位，不是校验。`textContent` 可能为 null、超长或全空；
attribute 永远先是字符串，`Number('')===0` 是典型陷阱。
先正则 `^(0|[1-9]\d*)$`，再 safe integer 与 0..100000000；
URL 必须 exact origin、无账号、query/hash，路径 ID 与字段 ID 一致。
Item 是公开投影而非完整 Listing；不加入 Web 合同之外的状态。

## 5. 设计与步骤

targetUrl → query public article → lexical cents → parseItem → safe render。
业务最大标题 120、备注 500、ID 40；超过上限拒绝，不静默截断成另一商品或价格。

<a id="s6"></a>
## 6. 最小可运行示例

在完整工程保存个人 `dom-lab.mjs`：

```js
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<article data-market-item="lamp"><h1>&lt;img src=x&gt;</h1><p data-cents="1990"></p></article><input value="not-part-of-item">');
const article = dom.window.document.querySelector('article[data-market-item]');
const raw = article.querySelector('[data-cents]').getAttribute('data-cents');
assert.match(raw, /^(0|[1-9]\d*)$/);
const priceCents = Number(raw);
assert.ok(Number.isSafeInteger(priceCents));
const display = dom.window.document.createElement('p');
display.textContent = article.querySelector('h1').textContent;
assert.equal(display.querySelector('img'), null);
assert.equal(priceCents, 1990);
console.log('DOM text + cents PASS');
dom.window.close();
```

`node dom-lab.mjs` 预期 PASS。它演示词法与 sink；全部业务约束由
[domain](../12-capstone/01-complete-project-rebuild.md#file-shared-domain-ts) 的 readPublicItem/parseItem 完成。
脚本结束释放 JSDOM；手工浏览器关闭、fixture `Ctrl+C`。

<a id="s7"></a>
## 7. 业务集成

content 调用 readPublicItem；popup executeScript 只返回序列化公开对象，再在扩展端 parseItem。
两条入口都不能信任页面返回类型，也不能以 TS `as Item` 替代运行时检查。
popup 读取前后检查 tab URL，处理用户导航；content REPORT 还受 sender 校验。

<a id="s8"></a>
## 8. 错误实验与排查

fixture 中把 data-cents 改为 `19.90`、`-1`、空串，parser 应拒绝而非显示 0。
把 URL 换 localhost、添加 query、字段 ID 与路径不同，测试应 throw。
将标题设为 `<img...>`，sink 应显示文本且 img count=0。
恢复 fixture 后重新运行 DOM 和浏览器测试，不能只放宽断言。

## 9. 课后思考与答案

1. 为什么不 parseFloat？答案：它接受部分字符串且无法确保整数分合同。
2. 字段公开是否可以不校验？答案：不能，公开数据仍能破坏 UI 和业务一致性。
3. 缺字段时应保存部分项吗？答案：本卷拒绝，避免无 ID 或错误价格的持久数据。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：列出采集字段。答案：仅 id/title/priceCents/url，input 不在 selector 或数据结构内。
- 进阶：加入两个 article 到实验页。答案：当前合同取第一个匹配；真实产品若多商品需另定列表合同，不随意合并。
- 故障注入：超长标题。答案：SCHEMA 拒绝，UI unsupported，修复源字段后可恢复。

<a id="s11"></a>
## 11. 验收清单

- [ ] URL 与字段 ID 一致，整数分有上下界。
- [ ] 缺失/超长/负数/额外字段被拒绝。
- [ ] 文本标题没有解析成 HTML。
- [ ] 未读取表单、cookies 或秘密。
- [ ] 原文 fixture 恢复并复验。

## 12. 小结

DOM parser 把任务范围写进代码；selector、类型注解和文本安全是不同层次。

## 13. 扩展阅读

- [MDN textContent](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)
- [MDN URL](https://developer.mozilla.org/en-US/docs/Web/API/URL)
- [Number.isSafeInteger](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger)

## 我现在能做到什么

能从不可信公开 DOM 构造受限业务投影，而不扩大采集范围。

## 单元导航

[上一页 EX06](../03-worker-lifecycle/02-termination-alarms-retention.md) · [卷入口](../README.md) · [下一页 EX08](02-iframe-spa-observer-cleanup.md)
