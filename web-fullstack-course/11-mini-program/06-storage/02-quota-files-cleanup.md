# MP-12 配额、缓存与文件：有所有权的清理

## 任务卡

- 任务：对草稿、缓存与持久图片分别建立预算和清理规则。
- 产出：独立 `files.mjs`、`files.test.mjs`，平台文件 API 接线检查表。
- 运行：`node --test files.test.mjs`。
- 证据：超限不写、失败不删旧文件、越界路径拒绝、删除失败可重试。
- 边界：Node 替身验证协议，不证明平台磁盘容量或文件有效期。

## 1. 任务背景

把相册选择的 tempFilePath 存进草稿，不代表图片已持久化。反过来，每次选择都保存文件，
不清理旧文件，会占满空间。storage key、临时文件、持久文件与服务器对象是四种资源，
不能用“清缓存”一次处理所有业务数据。

## 2. 学习目标

区分 key-value 与文件预算；在写入前进行估算并处理真实失败；为文件记录用户、
用途和路径；只删除自有文件；采用先保存新记录再回收旧资源的顺序。

## 3. 预备知识

完成 [草稿迁移](01-user-drafts-migration.md)。本实验无安装，无真实文件 IO。
微信 FileSystemManager、抖音与支付宝文件 API 的方法名、用户目录和限额分别核对，
不要复制浏览器 File/Blob/FileReader 到小程序页面。

<a id="s4"></a>
## 4. 核心理论

### 4.1 两个预算与一个失败

JSON 长度不是 UTF-8 字节：中文、emoji 会不同。storage 实際记账单位与上限由平台定义，
应用预算只是更保守的准入，不保证最终写入成功。用 getStorageInfo 查看平台计量，
同时捕获 setStorageSync 抛错。持久文件另有总量，不能把 Storage 剩余量当文件空间。

### 4.2 谁能删什么

清理对象必须是应用登记的持久文件，不删除相册源文件、未知路径、用户其他文件。
用 platform 返回的路径与用户目录校验，不仅做字符串包含检查。
下例严格限制 `/app/market/owner/id.jpg` 的教学路径；生产由 adapter 提供真实路径验证器，
不要把这个虚构目录写进平台 API。

### 4.3 先持久引用，再回收

保存新图片 → 写用户文件索引 → 替换草稿引用 → 回收旧图片。
索引写失败先补偿删除刚保存的新文件；失败的删除登记待清理，不假装释放空间。
如果草稿引用更新失败，仍保留可恢复索引，由下一次启动 reconciliation 决定，
不在 catch 内删除还被草稿引用的文件。多记录非事务，必须记录每步提交点。

## 5. 实验设计

文件数量预算 3、单图 2 MiB 是教学选择，不是平台官方上限。
单用户只允许自己索引中的精确路径，删除失败留索引，重试后才能移除。
列表 API 返回结构从 unknown 验证，不信调试工具编辑过的索引。

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `files.mjs`：

```js
export function utf8Bytes(value) { return new TextEncoder().encode(JSON.stringify(value)).byteLength; }
export function createFileOwner(io, user) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(user)) throw new Error("invalid owner");
  const prefix = `/app/market/${user}/`, key = `market:files:${user}`;
  const valid = path => typeof path === "string" && path.startsWith(prefix) &&
    /^[a-zA-Z0-9-]+\.jpg$/.test(path.slice(prefix.length));
  const read = () => {
    const value = io.get(key) ?? [];
    if (!Array.isArray(value) || value.length > 3 || !value.every(valid)) throw new Error("invalid index");
    return [...value];
  };
  return {
    list: read,
    async add(tempPath, bytes) {
      if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > 2 * 1024 * 1024) throw new Error("size");
      const old = read();
      if (old.length >= 3) throw new Error("count budget");
      const path = await io.save(tempPath, prefix);
      if (!valid(path)) throw new Error("adapter returned unowned path");
      try { io.set(key, [...old, path]); }
      catch (cause) {
        try { await io.remove(path); }
        catch { throw new AggregateError([cause], "index failed; new file cleanup unconfirmed"); }
        throw cause;
      }
      return path;
    },
    async remove(path) {
      const old = read();
      if (!valid(path) || !old.includes(path)) throw new Error("unowned file");
      await io.remove(path);
      io.set(key, old.filter(p => p !== path));
    }
  };
}
```

`remove` 文件成功而索引失败时留下悬空索引；真实 adapter 应将“文件已不存在”视为删除完成，
以便重试。权限失败、目录越界和其他错误不能归为“已不存在”。
TextEncoder 用于 Node 字节实验；小程序是否支持须按基础库验证或在 adapter 提供等价计量。

完整文件 `files.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { utf8Bytes, createFileOwner } from "./files.mjs";
test("byte budget and owned-path deletion", async () => {
  assert.ok(utf8Bytes({ title: "台灯" }) > JSON.stringify({ title: "台灯" }).length);
  const map = new Map(), removed = [];
  const io = { get: k => map.get(k), set: (k,v) => map.set(k,v),
    save: async () => "/app/market/a/one.jpg", remove: async p => { removed.push(p); } };
  const files = createFileOwner(io, "a");
  await assert.rejects(files.add("temp", 3 * 1024 * 1024), /size/);
  const path = await files.add("temp", 1024);
  await assert.rejects(files.remove("/app/market/b/one.jpg"), /unowned/);
  assert.deepEqual(removed, []);
  await files.remove(path); assert.deepEqual(files.list(), []);
});
test("index failure compensates; failed delete keeps retryable ownership", async () => {
  const map = new Map(), removed = [];
  const io = { get: k => map.get(k), set: (k,v) => map.set(k,v),
    save: async () => "/app/market/a/one.jpg", remove: async p => { removed.push(p); } };
  const full = createFileOwner({ ...io, set() { throw new Error("quota"); } }, "a");
  await assert.rejects(full.add("temp", 1024), /quota/);
  assert.equal(removed.length, 1);
  const files = createFileOwner(io, "a"); const path = await files.add("temp", 1024);
  const failing = createFileOwner({ ...io, remove: async () => { throw new Error("busy"); } }, "a");
  await assert.rejects(failing.remove(path), /busy/);
  assert.deepEqual(failing.list(), [path]);
});
```

```bash
node --test files.test.mjs
```

预期 2/2，无磁盘修改，自然退出。真实实验先拍临时测试图片、登记路径，
在工具中检查保存后的索引及重启存在性，最后仅删自己登记的测试文件。
不要让课堂 cleanup 扫描整个用户目录。

<a id="s7"></a>
## 7. 邻里集市集成案例

MP-24 默认 imagePaths 只预览，重启失效时重新选择。这是明确边界，不偷偷宣称已保存。
扩展持久草稿时为每用户增加文件索引，平台 adapter 调用 FileSystemManager save/copy/unlink
并返回受控路径；草稿只引用索引文件。发布成功后由索引回收本用户不再引用文件，
不能删除其他用户仍使用的公共缓存。

可淘汰列表缓存优先于草稿、未确定预约意图和会话。列表 cache 使用 TTL 与服务器 version，
即便缓存写失败仍可展示当前成功响应；预约意图存储失败则不能发送新预约。
同样的 quota error，按数据职责有不同失败策略。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：remove 先删索引再删文件，注入文件删除失败后丢失所有权，无法安全回收。
修复为保留待清理路径。再注入 `../` 或 b 路径，删除必须拒绝。
真机空间不足从应用预算、平台计量、文件总量与失败码定位，不能仅看 JSON.length。

## 9. 课后题

1. 临时图片缓存多久？答案：不能依赖固定时间，平台可能回收，重启时检查存在性。
2. 为什么不自动清草稿腾空间？答案：它是用户数据，不是可随意淘汰缓存。
3. 上传成功就能删本地图吗？答案：先确认服务器已校验对象与草稿/发布引用提交点。

<a id="s10"></a>
## 10. 实践练习

- 基础：加入第 4 张图。参考答案：已有 3 项时 count budget 拒绝，save 不被调用。
- 进阶：删除成功但索引写失败。参考答案：重试 adapter 对明确不存在返回完成，
  再更新索引，不能忽略所有 unlink 异常。
- 故障注入：清理用 `path.includes(user)`。参考答案：`/app/market/ba/...` 对 a 会误命中；
  使用严格受控目录及精确索引，拒绝未登记路径。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 2/2 测试覆盖预算、归属、补偿和可重试清理。
- [ ] cache、草稿、意图、会话和文件分别有淘汰策略。
- [ ] 平台重启/配额/文件存在性另有真实证据或未验证标记。
- [ ] 未使用通配目录删除、全局 storage 清理或相册源文件删除。

## 12. 常见问题

服务器对象 key 不是本机路径，清理服务器对象要后端鉴权、引用计数/TTL，
不能由客户端构造任意 delete URL。临时上传孤儿应由服务器回收任务处理。

## 13. 扩展阅读

[微信文件系统](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/file-system.html)、
[微信 getStorageInfo](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.getStorageInfo.html)、
[Taro setStorageSync](https://docs.taro.zone/docs/apis/storage/setStorageSync)。

## 我现在能做到什么

我能为缓存和文件设置预算，安全补偿失败，并只清理有明确所有权的资源。

## 单元导航

[上一单元](01-user-drafts-migration.md) ·
[下一单元](../07-permissions/01-privacy-permission-flow.md) · [本卷](../README.md)
