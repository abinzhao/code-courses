# 上传流、类型、存储与清理：让不可信字节有界地落地

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个标准库流式摄取 CLI、一份上传状态机与安全下载清单 |
| 练习位置 | 源码在读者自己的 `market-backend-lab/uploads/`；运行数据只放 `/tmp/market-upload-lab/` |
| 运行条件 | Node.js 24；最小案例不启动 HTTP、数据库或对象存储 |
| 核心命令 | `node uploads/ingest.mjs SOURCE /tmp/market-upload-lab` |
| 成功证据 | 小文件按服务端随机键提升；超限/错误签名失败；失败后无本次 `.part` 或对象 |
| 失败证据 | `FILE_TOO_LARGE`、`UNSUPPORTED_SIGNATURE`、目标冲突等错误非零退出 |
| 环境标签 | 本机文件系统教学实验；**不是生产上传服务，也不是完整图片安全验证** |

## 1. 任务背景

浏览器提交了 `photo.jpg`、`Content-Type: image/jpeg` 和 500 KB 正文，不代表服务端收到的是安全
JPEG。文件名、扩展名、MIME、`Content-Length` 和 multipart 字段都由客户端控制。攻击者可以
伪造声明、使用路径片段、发送超限流、在连接中途断开，或提交签名正确但解码后异常巨大的文件。

上传链路必须同时管理：

- **身份与对象权限**：谁可以给哪件商品增加文件；
- **协议和资源上限**：总请求、文件数、单文件字节、时间；
- **内容判定**：签名字节、完整解码、像素和恶意内容；
- **存储隔离**：服务端生成键、不可执行目录、非同源直出；
- **一致性与清理**：临时、已验证、已登记、删除中等状态；
- **下载响应**：按元数据查键，控制 disposition、类型和嗅探。

本课只实现其中可由 Node 标准库观察的“有界流 + 签名初筛 + 隔离键 + 失败清理”。完整 HTTP、
图片解码、扫描、对象存储和数据库状态机通过设计清单说明，不冒充已运行。

## 2. 学习目标

完成本课后，你能够：

1. 解释为什么不能先把整个文件读成一个 `Buffer`；
2. 用 `pipeline` 传播读写错误并尊重背压；
3. 在流动期间累计真实字节并在超限时终止；
4. 区分客户端 MIME、签名字节和完整解码；
5. 使用服务端随机键，不把客户端文件名放入存储路径；
6. 将临时隔离、校验、提升、元数据登记和清理写成状态机；
7. 设计默认下载而非同源执行的响应；
8. 明确第 10 章 capstone 不实现生产上传。

## 3. 预备知识

- 理解 Node Readable、Transform、Writable 与 `pipeline`；
- 理解认证只证明身份，对象授权还需验证当前用户拥有 Listing；
- 理解文件系统路径和 URL 是不同命名空间；
- 已阅读[统一项目契约](../../00-guide/05-project-assessment.md)。

创建源码目录：

```bash
mkdir -p uploads
node --version
```

运行数据使用 `/tmp/market-upload-lab`，不要把摄取文件放进教材仓库或 Git。练习结束只清理由自己
创建并核对过的临时目录。

## 4. 核心理论

### 4.1 上限必须存在于每一层

典型上传路径：

```text
浏览器 -> 反向代理 -> Node HTTP/parser -> 应用 Transform -> 隔离存储
```

代理的 body cap 可以提早拒绝，应用流 cap 是最后防线；二者不能互相替代。`Content-Length`
只能作为早期提示，因为请求可能没有该头、使用分块传输或声明不实。应用必须按实际收到的 chunk
累计字节。

还要限制文件数量、字段数量、字段名/文本长度、头部大小和总处理时间。只限制每个文件，攻击者
仍可同时发送大量小文件耗尽句柄和磁盘。

### 4.2 流和背压控制内存，不自动保证安全

`pipeline(readable, transform, writable)` 会把下游写入速度反馈给上游，并在任一阶段错误时
销毁链路。它避免应用无限积累 chunk，但不会替你验证类型、权限、路径、配额或超时。

Transform 可以检查累计字节和前缀。检查前缀时必须缓存尚不足以判断的少量字节；通过后把缓存
重新推给下游，不能悄悄吞掉文件头。

### 4.3 三种“类型证据”不能混为一谈

| 证据 | 来源 | 能证明 | 不能证明 |
| --- | --- | --- | --- |
| 文件名/扩展名 | 客户端 | 用户希望的展示名 | 文件真实类型和安全性 |
| MIME 声明 | 客户端或代理 | 协议中的自报类型 | 字节是否匹配 |
| 签名字节 | 服务端读取前缀 | 前缀像某种格式 | 文件完整、可解码、无恶意载荷 |
| 受限完整解码 | 服务端隔离处理 | 结构可解码、可检查尺寸 | 自动证明业务授权 |
| 重新编码/扫描 | 受控工具 | 降低已知内容风险 | 绝对无风险 |

本课只识别 PNG 八字节签名和 JPEG 三字节起始标记。生产图片还要使用受维护解码器，在 CPU、
内存、像素和时间限制下完整解码，最好重新编码成允许格式。

### 4.4 客户端名称只用于受控显示

不要这样拼路径：

```js
// 错误示例：客户端名称可能是 ../../config 或包含平台分隔符。
const target = join(uploadRoot, clientFilename);
```

服务端生成不可预测键，例如 UUID。存储根目录来自可信配置，临时与对象目录由应用创建，文件
权限最小化。原始展示名若确需保留，应单独存入元数据，限制长度和控制字符，并在下载头中按
框架提供的安全 API 编码。

### 4.5 隔离、提升和登记是状态机

推荐流程：

```text
已授权
  -> pending 元数据/配额预留
  -> quarantine 临时对象
  -> 签名 + 完整解码 + 扫描
  -> 服务端键提升为 ready 对象
  -> 元数据标记 ready
  -> 可下载
```

任一步失败都要定义补偿：

- 流失败：删除临时对象，释放配额；
- 内容失败：保留最少审计元数据，删除或隔离字节；
- 提升成功但 DB 标记失败：删除新对象或由 orphan sweeper 回收；
- DB ready 成功但响应丢失：客户端按上传请求幂等键查询，不重复创建；
- 删除请求：先标记 deleting，删除对象后完成元数据；失败可重试。

数据库事务不能包住对象存储网络写入并获得原子提交。状态机、幂等键、补偿和定期清理比假装
跨系统事务更诚实。

### 4.6 安全下载从业务 ID 开始

下载 URL 接受文件业务 ID，不接受磁盘相对路径。服务端先认证、检查 Listing 可见性，再从可信
元数据得到 `storage_key`。未知内容默认：

```http
Content-Disposition: attachment
X-Content-Type-Options: nosniff
Content-Type: application/octet-stream
```

允许内联图片时也应只用服务端确认的类型，最好放在独立无凭证域名，并设置严格 CSP。SVG、
HTML 等可执行内容不能因为扩展名像图片就从应用同源内联。

## 5. 元素、属性、API 或配置清单

| API / 配置 | 本课用途 | 边界 |
| --- | --- | --- |
| `createReadStream` | 按需读取源文件 | 源路径在 CLI 实验中由读者控制 |
| `Transform` | 累计字节、缓存并检查前缀 | 不做完整图片解码 |
| `pipeline` | 连接流、传播错误和背压 | 仍需业务清理 |
| `createWriteStream(..., { flags: "wx" })` | 排他创建临时文件 | 不允许覆盖 |
| `randomUUID()` | 生成服务端存储键 | 不是用户身份或幂等键 |
| `mode: 0o600` | 最小化本机文件权限 | 已存在目录权限需另审查 |
| `link` + `unlink` | 同文件系统教学提升且拒绝覆盖 | 对象存储需自己的原子/条件 API |
| `Content-Length` | 早期拒绝提示 | 不可信，仍按实际字节计数 |
| `Content-Disposition` | 控制下载/展示 | 文件名必须安全编码 |
| `nosniff` | 阻止浏览器改猜类型 | 不替代正确 Content-Type 和隔离 |
| 临时清理器 | 回收超时 pending/orphan | 需租约避免删除活跃上传 |

## 6. 最小可运行案例

### 6.1 创建流式摄取文件

用编辑器创建完整文件 `uploads/ingest.mjs`：

```js
import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { link, mkdir, unlink } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

const MAX_BYTES = 1024 * 1024;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);

function detectSignature(prefix) {
  if (prefix.length >= PNG.length && prefix.subarray(0, PNG.length).equals(PNG)) {
    return { mediaType: "image/png", extension: "png" };
  }
  if (prefix.length >= JPEG.length && prefix.subarray(0, JPEG.length).equals(JPEG)) {
    return { mediaType: "image/jpeg", extension: "jpg" };
  }
  throw new Error("UNSUPPORTED_SIGNATURE");
}

class ByteAndSignatureGate extends Transform {
  constructor(maxBytes) {
    super();
    this.maxBytes = maxBytes;
    this.bytes = 0;
    this.prefix = Buffer.alloc(0);
    this.detected = undefined;
  }

  _transform(chunk, _encoding, callback) {
    this.bytes += chunk.length;
    if (this.bytes > this.maxBytes) {
      callback(new Error("FILE_TOO_LARGE"));
      return;
    }

    if (this.detected) {
      callback(null, chunk);
      return;
    }

    this.prefix = Buffer.concat([this.prefix, chunk]);
    if (this.prefix.length < PNG.length) {
      callback();
      return;
    }

    try {
      this.detected = detectSignature(this.prefix);
      const buffered = this.prefix;
      this.prefix = Buffer.alloc(0);
      callback(null, buffered);
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    if (this.detected) {
      callback();
      return;
    }
    try {
      this.detected = detectSignature(this.prefix);
      this.push(this.prefix);
      this.prefix = Buffer.alloc(0);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

const [sourceArg, rootArg] = process.argv.slice(2);
if (!sourceArg || !rootArg) {
  throw new Error("usage: node uploads/ingest.mjs SOURCE STORAGE_ROOT");
}

const source = resolve(sourceArg);
const root = resolve(rootArg);
const quarantine = join(root, "quarantine");
const objects = join(root, "objects");
await mkdir(quarantine, { recursive: true, mode: 0o700 });
await mkdir(objects, { recursive: true, mode: 0o700 });

const key = randomUUID();
const temporary = join(quarantine, `${key}.part`);
let finalPath;
let linked = false;
const gate = new ByteAndSignatureGate(MAX_BYTES);

try {
  await pipeline(
    createReadStream(source),
    gate,
    createWriteStream(temporary, { flags: "wx", mode: 0o600 }),
  );

  finalPath = join(objects, `${key}.${gate.detected.extension}`);
  await link(temporary, finalPath);
  linked = true;
  await unlink(temporary);

  console.log(JSON.stringify({
    storageKey: basename(finalPath),
    mediaType: gate.detected.mediaType,
    bytes: gate.bytes,
    validation: "signature-only",
  }));
} catch (error) {
  await unlink(temporary).catch(() => {});
  if (linked && finalPath) {
    await unlink(finalPath).catch(() => {});
  }
  throw error;
}
```

输出不回显客户端源文件名。提升使用同一文件系统内的硬链接并在目标存在时失败；生产对象存储
应使用条件创建和自己的完整性校验。

### 6.2 创建签名夹具并观察

下面的文件只包含签名和少量教学字节，**不是真正可解码图片**。它用来证明签名 gate 的范围：

```bash
node -e "require('node:fs').writeFileSync('/tmp/market-tiny.png', Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00]))"
node uploads/ingest.mjs /tmp/market-tiny.png /tmp/market-upload-lab
find /tmp/market-upload-lab -maxdepth 2 -type f -print
```

预期命令输出一行 JSON，`mediaType` 是 `image/png`、`bytes` 是 `9`、
`validation` 明确为 `signature-only`；`objects/` 有一个随机 `.png`，`quarantine/` 没有本次
`.part`。随机键每次不同，不把示例 UUID 写成固定预期。

### 6.3 观察错误签名和超限清理

```bash
node -e "require('node:fs').writeFileSync('/tmp/market-text.bin', 'not an image')"
node uploads/ingest.mjs /tmp/market-text.bin /tmp/market-upload-lab

node -e "require('node:fs').writeFileSync('/tmp/market-large.png', Buffer.alloc(1024*1024+1)); const f=require('node:fs').openSync('/tmp/market-large.png','r+'); require('node:fs').writeSync(f,Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),0,8,0); require('node:fs').closeSync(f)"
node uploads/ingest.mjs /tmp/market-large.png /tmp/market-upload-lab
find /tmp/market-upload-lab/quarantine -type f -name '*.part' -print
```

两次摄取都应非零退出，错误分别包含 `UNSUPPORTED_SIGNATURE` 和 `FILE_TOO_LARGE`；最后的 find
不应显示失败任务的 `.part`。不要把“签名夹具成功”改写成“图片解码与扫描通过”。

## 7. 邻里集市集成案例

### 7.1 HTTP 边界顺序

为 `POST /api/v1/listings/:id/images` 设计以下顺序：

1. 在读取大正文前验证会话、Origin、CSRF 和 Listing owner；
2. multipart parser 限制总正文、1 个文件、字段数量和文本长度；
3. 文件流进入 quarantine gate，按实际字节限制；
4. 使用受限解码器检查格式、像素、帧数和资源消耗，必要时重新编码；
5. 恶意内容扫描若为异步，文件保持 `quarantined`，不能公开下载；
6. 以服务端键提升对象，在数据库事务中把 metadata 标记 `ready`；
7. 响应只返回业务 file ID、确认类型、整数 bytes 和 UTC `createdAt`。

Controller 不接受 `ownerId`、`storageKey`、`status=ready` 等客户端字段。文件元数据示例：

文件只扩展 Listing 的资源关系，不改变商品契约：Listing 的 `priceCents` 仍是非负安全整数分，
文件与商品时间字段对外仍使用 UTC ISO 8601。

```ts
type ListingFile = {
  id: string;
  listingId: string;
  storageKey: string;
  mediaType: "image/png" | "image/jpeg";
  byteSize: number;
  status: "pending" | "quarantined" | "ready" | "deleting" | "failed";
  createdAt: string; // UTC ISO 8601
};
```

若上传需要收费配额，配额单位也是整数 byte，不用浮点 MB 参与持久化计算。

### 7.2 数据库和对象存储一致性

一个可恢复策略：

```text
事务 A：INSERT upload(status='pending', request_key UNIQUE), 预留配额
事务外：流式写 quarantine -> 解码/扫描 -> 条件创建 final object
事务 B：UPDATE upload SET status='ready', storage_key=... WHERE status='pending'
失败补偿：删除对象、释放配额、标记 failed
周期任务：回收超过租约且无活跃心跳的 pending；对账 orphan object
```

重复请求使用 `(owner_id, request_key)` 唯一约束返回同一上传状态。清理器必须检查租约或状态，
不能按“文件创建超过 10 分钟”直接删除仍在处理的大文件。

### 7.3 下载边界

`GET /api/v1/files/:id`：

- 按业务 ID 查 metadata，不把 `:id` 当相对路径；
- 检查文件所属 Listing 的可见性；
- 只接受服务端生成且匹配固定模式的 storage key；
- `ready` 之外返回受控状态，不直接打开 quarantine；
- 默认 attachment + nosniff；确认安全的重编码图片才考虑 inline；
- 日志记录业务 file ID、结果和 bytes，不记录 Cookie、原始路径或对象存储签名 URL。

### 7.4 与 capstone 的明确边界

第 10 章 API 综合项目不包含 multipart parser、图片解码器、扫描器、对象存储 SDK、文件表或
上传路由。完成本课意味着读者能设计和验证独立摄取边界，**不意味着 capstone 已实现生产
上传**。若把上传纳入毕业扩展，应建立新的依赖、迁移、测试和运行证据，而不是把本 CLI 复制到
Controller 就宣布完成。

## 8. 常见错误与排查路径

### 8.1 明确错误示例：先读完整 Buffer

```js
// 错误：字节上限检查发生在内存已经分配之后。
const body = await readAll(request);
if (body.length > MAX_BYTES) throw new Error("too large");
```

- **现象**：多个并发大请求使进程 RSS 快速增长，甚至被系统终止。
- **证据**：内存曲线先增长，`FILE_TOO_LARGE` 日志在完整读取后才出现。
- **原因**：上限检查太晚，且没有背压和并发预算。
- **修复**：代理早拒绝 + parser limit + 流中累计实际字节 + 并发/超时限制。
- **复验**：授权测试中并发发送超限流，进程保持在预算内，每个请求受控失败，临时对象被清理。

### 8.2 只信任 MIME

- **现象**：`text/html` 字节以 `image/png` 声明进入公开目录。
- **证据**：保存的前缀不匹配 PNG，但 metadata 来自请求头。
- **原因**：把客户端声明当服务端确认类型。
- **修复**：签名初筛、完整受限解码、服务端确定类型；可执行格式默认拒绝或隔离下载。
- **复验**：伪造 MIME 的文本文件返回受控 415/验证错误，不产生 ready 对象。

### 8.3 清理时误删已有对象

- **现象**：一次目标冲突后，旧文件消失。
- **证据**：catch 无条件 `unlink(target)`，没有区分本次是否创建。
- **原因**：资源所有权状态不明确。
- **修复**：排他创建并用 `linked/created` 标志只清理由本次创建的资源。
- **复验**：预置同名目标、触发冲突，校验其摘要不变且本次临时文件消失。

### 8.4 本地磁盘在多副本丢文件

- **现象**：上传成功后另一副本处理下载却 404。
- **证据**：metadata 共享，文件只存在某个容器本地路径。
- **原因**：把实例磁盘误当共享持久存储。
- **修复**：使用受控对象存储/共享卷，或把服务路由和生命周期限制写清。
- **复验**：跨副本读取、重启、备份和权限测试均有真实环境证据后再宣称可用。

## 9. 课后题

1. **为什么 `Content-Length` 小于上限仍要在流里计数？**
   答案：该头可能缺失或不实，分块传输也没有可信总长；实际 chunk 才是资源事实。
2. **PNG 签名匹配能否证明图片可安全展示？**
   答案：不能，只证明前缀像 PNG；还需完整受限解码、像素限制、重新编码/扫描和响应隔离。
3. **为什么不保留用户文件名作为磁盘名？**
   答案：它不可信、可能包含路径和控制字符，也会冲突；应生成服务端键，展示名放受限元数据。
4. **数据库事务为何不能让对象存储写入一起原子提交？**
   答案：它们是不同系统；需要状态机、幂等、补偿和对账。

## 10. 实践练习

### 基础：增加 JPEG 签名用例

创建以 `ff d8 ff` 开头的签名夹具。可判定标准：输出确认 `image/jpeg`、随机 `.jpg` 键和实际
bytes；文档仍标注 `signature-only`。

### 进阶：设计配额预留

写出用户总配额与单文件 cap 的数据库状态转换。可判定标准：并发上传不能都基于同一旧余额
通过；失败会释放预留；整数 byte 不用浮点；重复 request key 不重复扣减。

### 故障注入：提升后元数据失败

在个人副本中让 `link` 成功后故意抛错。可判定标准：命令非零退出，final 与 `.part` 都不存在；
恢复后正常摄取成功。记录现象、证据、原因、修复和复验。

## 11. 阶段验收

- [ ] 源文件通过流处理，没有先读完整 Buffer；
- [ ] 字节 cap 基于实际 chunk，错误会传播到顶层非零退出；
- [ ] 签名字节、客户端 MIME 和完整解码的证据范围被分开；
- [ ] 存储键由服务端生成，客户端文件名不参与路径；
- [ ] 成功后 quarantine 无本次 `.part`，失败后无本次 final；
- [ ] 上传状态、幂等、补偿、孤儿清理和安全下载均有明确责任；
- [ ] 报告明确声明未运行 HTTP、数据库、解码器、扫描器和对象存储；
- [ ] 第 10 章不被描述为已经实现生产上传。

## 12. 常见问题

**可以把上传目录挂到静态服务器吗？**
不应默认这样做。它可能绕过授权、响应头和隔离，且 HTML/SVG 会在应用同源执行。应通过受控
下载或独立资源域名提供。

**为什么示例使用硬链接提升？**
它在同一文件系统内可排他创建目标，便于观察“不覆盖”。不同挂载点或对象存储不适用，应改用
对应平台的条件创建和校验。

**病毒扫描通过就安全了吗？**
不是。扫描只覆盖已知规则；仍需格式白名单、受限解码、重新编码、权限、隔离和更新策略。

**流式上传能否绕过 CSRF？**
不能。Cookie 浏览器写操作仍需 Origin/CSRF 检查；流解决资源处理，不解决用户意图证明。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Node.js Streams](https://nodejs.org/api/stream.html)
- [Node.js `stream.pipeline`](https://nodejs.org/api/stream.html#streampipeline)
- [Node.js File System](https://nodejs.org/api/fs.html)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [MDN `Content-Disposition`](https://developer.mozilla.org/docs/Web/HTTP/Headers/Content-Disposition)
- [MDN `X-Content-Type-Options`](https://developer.mozilla.org/docs/Web/HTTP/Headers/X-Content-Type-Options)

## 我现在能做到什么

我能把上传设计成有界流和可恢复资源状态机，用服务端键、签名初筛、隔离提升与失败清理缩小
风险，并明确指出完整解码、扫描、对象存储和生产 HTTP 尚需哪些真实证据。

## 单元导航

- 章入口：[07 搜索、分页与文件](../07-search-pagination-files.md)
- 上一课：[Offset、Keyset 与一致分页](02-offset-keyset-consistent-pagination.md)
- 下一章：[08 Redis、Outbox 与队列](../08-redis-queues-reliability.md)
