# MP-11 用户隔离草稿：schema 迁移与损坏恢复

## 任务卡

- 任务：把“保存了一段 JSON”变成有版本、用户归属和失败语义的草稿。
- 产出：Capstone `src/storage.ts` 与新增 `tests/drafts.test.ts`。
- 运行：MP-24 项目根 `npm test`。
- 证据：V1→V2、读后验证、两个用户隔离、迁移写失败不删旧记录。
- 边界：本地保存不是服务端发布，离线不会自动预约或发布。

## 1. 任务背景

A 写草稿退出，B 登录后不应看到 A 标题。版本升级后 priceCents 改成输入字符串，
也不能直接把旧对象当新 Draft。storage 是外部输入：旧版本、坏 JSON、
调试工具编辑与空间不足都能破坏其内容。

## 2. 学习目标

以业务 userId 命名空间隔离；建立 schema 准入与单向迁移；保留失败原记录；
把 UI 中编辑、持久保存与服务器资源区分开；为损坏数据提供显式恢复。

## 3. 预备知识

完成 [Token 隔离](../05-auth/02-token-logout-isolation.md)。
先从 [MP-23 §6](../12-capstone/01-domain-service-tests.md#s6) 创建完整
`domain.ts/storage.ts`，用 [MP-24 §6](../12-capstone/02-client-platform-delivery.md#s6)
建立 package/tsconfig。本篇测试是增补，不替换 contracts。

<a id="s4"></a>
## 4. 核心理论

### 4.1 数据状态而非 Boolean

编辑中的表单值可能不合法，例如金额 `"12."`。Draft 允许保留输入状态，
发布时才用 cents 验证。不能保存草稿时把金额截成 12，或把空金额写为 0。
读草稿 parser 校验 schema、文本、图片数组和数量，发布 parser 校验业务字段。

### 4.2 迁移的提交点

迁移过程：读 unknown → 验证 V1 → 构造 V2 → 写同 key → 返回 V2。
如果写失败，原 V1 仍可用于下一次迁移，页面显示失败，不能先 remove 旧值。
两个 key 的“先写新再删旧”也不是事务，需要恢复记录；本卷只做同 key 单记录迁移。
平台 IO 原子性不由 Node Map 证明，真实工具须注入配额故障。

### 4.3 损坏恢复与退出

坏数据不静默用 blank 覆盖。界面清空当前可见表单，显示“原记录未删除”；
给用户明确“放弃坏草稿”操作后才 clear 当前 user。不要把坏内容上传日志。
匿名草稿与实名草稿默认不合并；账号绑定/游客迁移另需授权与冲突规则。

## 5. 文件与不变量

key 为 `market:draft:${encodeURIComponent(userId)}`，所有 read/save/clear 都需要 user。
priceText 是本地输入；priceCents 只出现在领域 API。imagePaths 是临时预览引用，
不保证下次启动有效。没有相同 user 就没有跨设备同步声明。

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `tests/drafts.test.ts`：

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDraftStore, Draft, StorageIO } from "../src/storage";
function fixture() {
  const map = new Map<string, unknown>();
  const io: StorageIO = {
    get: key => map.get(key), set: (key,value) => { map.set(key,value); },
    remove: key => { map.delete(key); }
  };
  return { map, io };
}
const blank: Draft = { schema: 2, title: "", description: "", priceText: "12.", imagePaths: [] };
test("V1 integer cents migrates without floating point formatting", () => {
  const { map, io } = fixture();
  map.set("market:draft:a", { schema: 1, title: "台灯", priceCents: 1230 });
  const store = createDraftStore(io);
  assert.equal(store.read("a")?.priceText, "12.30");
  assert.equal((map.get("market:draft:a") as Draft).schema, 2);
  assert.equal(store.read("a")?.priceText, "12.30");
});
test("failed migration preserves original and never leaks into another user", () => {
  const { map, io } = fixture();
  const original = { schema: 1, title: "a-only", priceCents: 1 };
  map.set("market:draft:a", original);
  const store = createDraftStore({ ...io, set() { throw new Error("quota"); } });
  assert.throws(() => store.read("a"), /quota/);
  assert.deepEqual(map.get("market:draft:a"), original);
  assert.equal(store.read("b"), undefined);
});
test("partial input persists, corrupt/unknown schema rejected, owner clear only", () => {
  const { map, io } = fixture();
  const store = createDraftStore(io);
  store.save("a/b", blank); store.save("b", { ...blank, title: "b-only" });
  assert.equal(store.read("a/b")?.priceText, "12.");
  assert.ok(map.has("market:draft:a%2Fb"));
  store.clear("a/b"); assert.equal(store.read("b")?.title, "b-only");
  for (const bad of [{ schema: 3 }, { ...blank, imagePaths: [1] }, "broken"]) {
    map.set("market:draft:bad", bad);
    assert.throws(() => store.read("bad"));
    assert.deepEqual(map.get("market:draft:bad"), bad);
  }
  assert.throws(() => store.save("", blank), /user/);
});
```

```bash
npm test
npm run typecheck
```

预期新增 3 项通过，其他测试保留；没有平台依赖被加载到 Node。
命令结束自然退出。Map 夹具每测试独立，清理只发生在自己的 Map，
真机不要用 `clearStorage` 一键清全应用数据来验证用户隔离。

<a id="s7"></a>
## 7. 邻里集市集成案例

MP-24 publish onShow 先把 UI 设为 blank，再读取当前 owner 草稿；
读取成功才填入，失败保留原记录并呈现错误。保存检查当前 session，
不创建 `market:draft:undefined`。离线可以保存 priceText 等未完成输入，
POST `/listings` 前 title/cents 再验证，失败保持草稿。

恢复按钮仅读，放弃按钮经明确用户操作调用 `drafts.clear(owner)`。
退出清当前用户草稿是本卷既定策略；需要“退出仍保留”时必须改策略、告知隐私影响并补测试，
不能一半页面清理、一半页面读取全局 key。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：把 key 改为固定 `market:draft`，先 a 存、再 b 读，隔离测试失败。
再把迁移 io.set 前加 remove，配额故障使原记录丢失。修复 key 和提交点，
不在 catch 中保存 blank 来“恢复正常”。
平台同步 IO 抛错需页面捕获；记录 key 类型、schema 和 requestId，不记真实正文。

## 9. 课后题

1. 为什么草稿金额不立刻转 cents？答案：草稿保留未完成输入，发布才验证。
2. 未知 schema 可以降为 V1 吗？答案：不，未来格式不能臆测；拒绝并保留。
3. 图片路径失效等于草稿损坏吗？答案：不，结构与资源可用性分别验证，允许重新选择。

<a id="s10"></a>
## 10. 实践练习

- 基础：保存 `"0.00"`。参考答案：Draft 原样返回，发布 cents 为 0，不因 falsy 丢金额。
- 进阶：迁移 priceCents=-1。参考答案：integer 准入拒绝，旧记录不变；不取绝对值修正。
- 故障注入：A→B 后让 read(B) 抛错。参考答案：页面必须空白并报错，不继续展示 A；
  修复 onShow 的先清界面顺序，不删除 A 数据来掩盖串号。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 3 项测试覆盖迁移、配额失败、非法 schema 和隔离。
- [ ] 本地未完成输入不会被强制修正成服务端合法数据。
- [ ] 坏数据保留，界面不泄漏上一账号内容。
- [ ] 实际工具记录重启恢复与临时图片失效；未做则标未验证。
- [ ] 不使用全局 clearStorage 清其他用户记录。

## 12. 常见问题

草稿是否可以加 updatedAt？可作为以后需求，但本卷 V2 没有该字段。
若新增，定义 V3 parser/迁移与排序规则，再讨论冲突，不直接改所有旧对象。

## 13. 扩展阅读

[微信 Storage](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorage.html)、
[Taro setStorageSync](https://docs.taro.zone/docs/apis/storage/setStorageSync)、
[unknown 解析器](../../04-javascript-typescript/08-typescript-domain-design/02-unknown-runtime-parsers-errors.md)。

## 我现在能做到什么

我能保存未完成草稿、隔离账号并安全迁移，损坏与写失败不会伪装成成功。

## 单元导航

[上一单元](../05-auth/02-token-logout-isolation.md) ·
[下一单元](02-quota-files-cleanup.md) · [本卷](../README.md)
