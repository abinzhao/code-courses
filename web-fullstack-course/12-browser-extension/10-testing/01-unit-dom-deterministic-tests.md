# EX19 确定性测试：纯逻辑、DOM 与故障 IO

## 任务卡

150 分钟；前置 Vitest、EX11；产出 parser/sender/迁移/并发/恢复测试与失败证据。

## 1. 任务背景

扩展测试不能只有“装上点一次”。schema、sender、迁移与并发可以在 Node 下确定性验证；
真实平台权限和 SW 停止则留给浏览器层，不用无意义 mock 冒充。

## 2. 学习目标

分离纯函数和 IO；注入时钟、失败存储与 DOM；先失败再修复；
清理 JSDOM，理解单测不能证明真实权限。

## 3. 前置知识与环境

EX23/24 重建工程，Vitest 5.0.3、jsdom 29.0.0，版本见 BASELINE。
完整 tests/domain.test.ts 在 EX24，不是只有测试大纲。

<a id="s4"></a>
## 4. 核心机制

纯逻辑：parseItem/Message、authorize、migrate；
DOM 集成：JSDOM 提供 document，readPublicItem 用实际 selector；
IO 合同：createRepository 注入 read/write/remove 和 clock，验证顺序与失败。
测试替身只模拟边界 IO，不覆盖真实浏览器 sender；
时钟注入替代等 30 天，Promise.all 验证同一 writer 并发，不依赖随机延迟证明稳定性。
Node test 进程结束前 close JSDOM；错误用 rejects/toThrow，不靠 console 是否红色。
当前 check 排除测试文件，因此 Vitest 执行不等于这些 TS 测试静态类型检查通过。

## 5. 设计与步骤

建立可观察断言：无额外字段、错误 origin 拒绝、content DELETE 拒绝、迁移不续命、
并发两项、失败后继续、重建恢复、过期清理、删除后无写。
正文用完整源码避免示例与真实工程漂移，最终再机械提取重跑。

<a id="s6"></a>
## 6. 最小可运行示例

个人工程保存 `tests/sink.test.ts`。它与完整测试同处 `tests/`，属于当前类型检查明确排除的测试层，
避免把需要 jsdom 类型声明的小实验混入生产源码检查。

```ts
import { it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { readPublicItem, ORIGIN } from '../shared/domain';
it('keeps markup-shaped public titles as text', () => {
  const dom = new JSDOM('<article data-market-item="lamp"><h1>&lt;img src=x&gt;</h1><p data-cents="1"></p></article>');
  try {
    const item = readPublicItem(dom.window.document, `${ORIGIN}/items/lamp`);
    const output = dom.window.document.createElement('p');
    output.textContent = item.title;
    expect(output.querySelector('img')).toBeNull();
    expect(output.textContent).toBe('<img src=x>');
  } finally { dom.window.close(); }
});
```

`npx vitest run tests/sink.test.ts` 预期 1 passed；完整套件 `npm test`，实际结果见 SELF-CHECK。
随后运行 `npm run check`，生产源码检查仍应通过；Vitest 执行测试不证明测试文件的静态类型检查。
错误实验把 sink 改 innerHTML 时新增 img，断言应失败；恢复 textContent 后再通过。
脚本无浏览器后台；个人增量文件单独保留，fixture 若启动则 `Ctrl+C`。

<a id="s7"></a>
## 7. 业务集成

[完整 domain 测试](../12-capstone/02-five-path-acceptance.md#file-tests-domain-test-ts)
对应业务边界，不是复制实现结果后仅快照。
write 失败先 reject，再第二 SAVE 成功证明队列恢复；重建换 repository 但同 IO，
对应 SW 终止后重读持久状态。已验证条目与平台未验证项分别列出。

<a id="s8"></a>
## 8. 错误实验与排查

删 parser origin 检查，外源测试失败；删除 tail 恢复行，第二次保存失败；
让 prune undefined 也 write，删除后空写断言失败。
先记录失败用例与错误，再恢复最小实现；不删测试、不 catch 返回成功、不用总是 true 的 mock。
若测试挂起，检查未 close 的 DOM、fixture、browser 与定时器，而非默认加大超时。

## 9. 课后思考与答案

1. mock sender 能证明平台传了什么？答案：不能，仅验证授权函数；真实来源在 EX20。
2. 为什么不是全量截图？答案：逻辑合同适合精确断言，截图不证明 IO 一致性。
3. alarm 创建测试等于清理？答案：不，注册、触发、业务过滤分别断言。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：note=501。答案：parseMessage 拒绝；不迁就超长输入。
- 进阶：queue failure。答案：第一次 write reject、原数据未变、第二次 SAVE 成功。
- 故障注入：未知 storage version。答案：GET reject，write 次数为零，不能默默清空。

<a id="s11"></a>
## 11. 验收清单

- [ ] 纯逻辑、DOM、IO 层职责明确。
- [ ] 至少一次失败实验后恢复通过。
- [ ] 时钟和存储注入可解释，无真实秘密。
- [ ] JSDOM/finally 清理完成。
- [ ] 测试通过不冒充真实权限与全平台运行。

## 12. 小结

确定性测试把可验证合同前移，浏览器测试负责剩余真实平台边界。

## 13. 扩展阅读

- [Vitest](https://vitest.dev/guide/)
- [jsdom](https://github.com/jsdom/jsdom)
- [Chrome 扩展端到端测试](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing)

## 我现在能做到什么

能用稳定断言验证边界和一致性，不靠等待、截图或宽松 mock 证明正确。

## 单元导航

[上一页 EX18](../09-wxt-build/02-firefox-env-build-differences.md) · [卷入口](../README.md) · [下一页 EX20](02-browser-profile-e2e-debugging.md)
