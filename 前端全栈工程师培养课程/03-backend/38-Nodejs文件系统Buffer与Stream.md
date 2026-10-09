# 38-Node.js 文件系统、Buffer 与 Stream

## 目标

后端服务大量时间在与数据打交道：读配置、写日志、处理上传、导出报表、转存文件。本单元解决一个核心问题——**数据的体量不等于内存的容量**。小文件可以一次性读入，大文件必须分块流动。理解 Buffer 和 Stream，才能写出在 10 GB 文件面前同样稳定的程序。

完成本知识单元后，学员应能够：

1. 使用 `node:fs/promises` 完成文件读写、目录创建与遍历，并理解回调风格、Promise 风格与同步 API 的适用场景。
2. 使用 `node:path` 处理路径，解释为什么字符串拼接路径在跨平台时会出错。
3. 解释 Buffer 的二进制内存模型，能在字符串、Buffer 与十六进制/Base64 编码之间转换，并理解 UTF-8 多字节字符带来的边界问题。
4. 区分 Readable、Writable、Duplex、Transform 四类流，能自定义流并理解流的两种工作模式。
5. 使用 `pipeline` 组合多个流，解释背压（backpressure）的产生与传播，知道为什么不应优先使用裸 `pipe`。
6. 为大文件设计流式处理方案（复制、压缩、散列校验、逐行解析），并对流链路上的错误做完整处理与资源清理。

## 技术栈

| 工具或环境 | 版本线 | 用途 | 学习要求 |
|---|---|---|---|
| Node.js | 当前 LTS | 文件、Buffer 与流的运行时 | 掌握 fs/path/buffer/stream 内置模块 |
| TypeScript | 5.x 稳定版 | 类型化流与文件处理逻辑 | 能给流和对象模式负载声明类型 |
| tsx | 当前稳定版 | 开发期运行 TS | 配合 watch 模式调试流程序 |
| pnpm | 当前稳定版 | 包管理与脚本 | 组织实验脚本 |
| @types/node | 与 Node LTS 对应大版本 | 内置模块类型 | 理解 Buffer/Stream 类型声明 |

约定：

- 文件 I/O 默认使用 `node:fs/promises`；回调风格只在讲解事件循环语义或对接老代码时出现。
- 路径一律经 `node:path` 构造，不手写 `/` 或 `\` 拼接。
- 示例中使用自行生成的临时数据文件，不操作任何真实用户文件与系统目录。
- 大文件实验通过脚本生成有限大小的测试数据（如几百 MB），实验结束清理。

## 详细的理论知识讲解和示例伪代码

### 1. 文件系统 API：三种风格与基本读写

#### 1.1 定义

`node:fs` 提供文件系统操作。Node.js 为几乎每个操作提供了三种风格：

```text
Promise 风格（node:fs/promises）：返回 Promise，配合 async/await，主线代码首选
回调风格（node:fs）：error-first 回调，最老牌的异步接口
同步风格（*Sync 后缀）：阻塞主线程直到完成，仅适合启动期加载或 CLI 瞬时任务
```

三者完成的工作完全相同，差别在“如何把结果交回给你”以及“是否阻塞主线程”。

Promise 风格读写：

```js
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const configText = await readFile('./config/app.json', 'utf8');
const config = JSON.parse(configText);

config.port = 4000;
await mkdir('./dist', { recursive: true });
await writeFile('./dist/app.json', JSON.stringify(config, null, 2), 'utf8');
```

回调风格（理解历史代码与 I/O 语义）：

```js
import { readFile } from 'node:fs';

readFile('./config/app.json', 'utf8', (err, data) => {
  if (err) {
    console.error('读取失败：', err.message);
    return;
  }
  console.log('文件长度：', data.length);
});
```

同步风格的正确使用位置：

```ts
// 仅在进程启动的最早期加载必要配置：此时还没有开始服务，阻塞一次可接受
import { readFileSync } from 'node:fs';

const bootConfig = JSON.parse(
  readFileSync(new URL('./boot.json', import.meta.url), 'utf8'),
);
console.log('启动配置：', bootConfig);
```

#### 1.2 与 Web/后端的关系

- 请求处理路径中绝不能出现 `*Sync` 调用：一次同步磁盘等待会卡住整个事件循环，所有并发请求一起陪葬。
- `readFile` 看似简单，底层是“打开文件 → 反复读取 → 拼接完整内容 → 关闭文件”，文件越大，占用内存越多——它把整个文件放进内存。因此它只适合小文件（配置、模板、小型 JSON）。
- 给 I/O 操作传编码（如 `'utf8'`）时，`readFile` 返回字符串；不传则返回 Buffer，这是下一节的主题。

类型化的读写封装：

```ts
import { readFile, writeFile } from 'node:fs/promises';

interface UserPreference {
  theme: 'light' | 'dark';
  language: string;
}

async function readPreferences(file: string): Promise<UserPreference> {
  const text = await readFile(file, 'utf8');
  const parsed: unknown = JSON.parse(text);
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'theme' in parsed &&
    'language' in parsed
  ) {
    return parsed as UserPreference;
  }
  throw new Error('偏好文件结构不合法');
}

async function savePreferences(file: string, pref: UserPreference): Promise<void> {
  await writeFile(file, JSON.stringify(pref), 'utf8');
}
```

#### 1.3 常见误区

> 在请求处理里用 `readFileSync` “就慢一点点”。

磁盘等待是不可控的，且会阻塞所有请求。请求路径中只用异步 API。

> 回调里不判断 err，因为“文件肯定在”。

部署路径、权限、磁盘满都可能导致失败。回调风格第一个参数必须检查；Promise 风格必须 `try/catch`。

> `writeFile` 会帮我创建目录。

不会。父目录不存在时直接报错；应先 `mkdir(dir, { recursive: true })`。

> `writeFile` 是“追加”。

默认是覆盖。追加要用 `appendFile` 或可写流的 `flags: 'a'`，覆盖写重要文件前应先备份或写临时文件再重命名。

### 2. 目录遍历、文件信息与安全写入

#### 2.1 定义

常用的目录与元信息 API：

| API | 作用 |
|---|---|
| `mkdir(path, { recursive })` | 递归创建目录 |
| `readdir(path, { withFileTypes })` | 读取目录项；`withFileTypes` 可直接区分文件/目录，避免额外 stat |
| `stat(path)` / `lstat(path)` | 获取元信息：大小、mtime、是否目录；lstat 不跟随符号链接 |
| `rename(old, new)` | 移动/重命名，可用于原子替换 |
| `unlink`/`rm` | 删除文件/目录（rm 支持 recursive） |
| `watch` | 监听文件变化（开发工具热重启常用，生产慎用） |

递归列出所有文件：

```js
import { readdir } from 'node:fs/promises';
import path from 'node:path';

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(full);
      }
      return full;
    }),
  );
  return files.flat();
}

const allFiles = await walk('./src');
console.log(allFiles);
```

现代版本的 `readdir('./src', { recursive: true })` 可直接递归返回路径，但遍历时需要区分类型、做过滤或统计时，手写递归仍更灵活。

#### 2.2 与 Web/后端的关系

目录遍历是很多后端工具的基础：统计项目结构、清理临时目录、批量导入数据。必须知道两个安全边界：

1. 遍历用户可控路径（如上传目录、按参数拼出的路径）时，要防止路径逃逸：`../../etc/passwd` 这类输入可能跳出预期目录。处理方式是规范化路径后，确认结果仍位于允许的根目录之内。
2. 不要在遍历时跟随不可信的符号链接，使用 `lstat` 并检查 `isSymbolicLink`。

路径逃逸防护示例：

```ts
import path from 'node:path';

function resolveSafe(rootDir: string, userInput: string): string {
  const root = path.resolve(rootDir);
  const target = path.resolve(root, userInput);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error('路径超出允许范围');
  }
  return target;
}

// 安全：在 data 目录内定位文件
resolveSafe('./data', 'uploads/a.txt');
// 抛错：试图逃逸
resolveSafe('./data', '../../etc/passwd');
```

#### 2.3 安全写入：临时文件 + 原子替换

直接覆盖写有风险：进程中途崩溃会留下写了一半的文件。稳妥做法是“写临时文件，再 rename 替换”。

```text
1. 在目标目录写一个带随机名的临时文件（同目录才能保证 rename 原子性）
2. 写完并 flush 后，rename 为目标文件名
3. 任何一步失败，删除临时文件，原文件保持完好
```

```ts
import { writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

async function atomicWrite(file: string, contents: string): Promise<void> {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  try {
    await writeFile(tmp, contents, 'utf8');
    await rename(tmp, file);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
}
```

#### 2.4 常见误区

> 用字符串比较判断“路径在目录内”。

必须先 `path.resolve` 规范化，再比较前缀并带上分隔符（`root + path.sep`），否则 `/data-evil` 会被误认为 `/data` 的子路径。

> rename 在任何系统上都是原子的。

同文件系统内的替换是原子的；跨文件系统（如从 `/tmp` 移到另一块盘）实际上是复制加删除，不原子。临时文件应与目标在同一目录。

> `watch` 可以可靠地用于生产监听。

不同平台事件语义不一致，可能丢失或合并事件。生产配置监听应配合轮询校验或只用于开发体验。

### 3. path 模块与跨平台路径

#### 3.1 定义

`node:path` 负责路径的拼接、解析与转换。核心 API：

| API | 作用 |
|---|---|
| `path.join(...segments)` | 用平台分隔符拼接并规范化 |
| `path.resolve(...segments)` | 拼接并返回绝对路径 |
| `path.basename(p, ext)` | 取文件名，可去掉扩展名 |
| `path.dirname(p)` | 取目录 |
| `path.extname(p)` | 取扩展名（含点） |
| `path.parse(p)` / `path.format(o)` | 路径与结构化对象互转 |
| `path.sep` / `path.delimiter` | 平台分隔符（`/` 或 `\`）与 PATH 分隔符（`:` 或 `;`） |

```js
import path from 'node:path';

const report = path.join('output', 'reports', '2026', 'summary.json');
// macOS/Linux: output/reports/2026/summary.json
// Windows:    output\reports\2026\summary.json

console.log(path.parse(report));
// { root: '', dir: 'output/reports/2026', base: 'summary.json',
//   ext: '.json', name: 'summary' }
```

`path.resolve` 与 `join` 的关键差别：

```text
join：只做拼接与规范化，结果可以是相对路径
resolve：从右向左拼，直到拼出绝对路径；无路径可拼时使用 process.cwd()
```

#### 3.2 与 Web/后端的关系

服务常在 Linux 上运行、在 macOS/Windows 上开发。硬编码分隔符会让代码在某一类系统上直接失效。

```ts
// 错误：把 Unix 风格写死，Windows 上路径语义错误
const bad = 'data' + '/' + 'users' + '/' + '1.json';

// 正确：同一份源码在各平台表现一致
import path from 'node:path';
const good = path.join('data', 'users', '1.json');
```

URL 路径与文件路径是两个世界：HTTP 请求路径永远用 `/`（如 `/api/users`），文件路径必须用 `path`。处理 `import.meta.url` 时要先从 URL 转成文件路径再用 path 操作：

```ts
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(here, 'data', 'seed.json');
```

#### 3.3 常见误区

> 用 `path.join('/api/', 'users')` 构造 URL。

path 面向文件系统，在 Windows 上会得到反斜杠。URL 拼接用 `new URL()` 或字符串模板（URL 路径分隔符固定为 `/`）。

> `__dirname + '/x'` 是稳妥写法。

ESM 没有 `__dirname`，且字符串拼接不带规范化。应 `path.join(dirname(fileURLToPath(import.meta.url)), 'x')`。

> 扩展名判断用 `endsWith('.JSON')`。

扩展名大小写在不同系统上表现不同，应取 `path.extname` 后统一转小写比较。

### 4. Buffer：二进制数据与字符编码

#### 4.1 定义

Buffer 是 Node.js 中处理二进制数据的对象，可以理解为一块固定大小的内存，里面按字节存放数据。它在 TypedArray 体系中继承自 `Uint8Array`，同时提供大量二进制辅助方法。

```text
字符串：    "你好"            人类可读，按某种编码解释字节才有意义
Buffer：    <e4 bd a0 e5 a5 bd>  原始字节，长度固定
编码：      字符 ↔ 字节 的映射规则（utf8、ascii、base64、hex、latin1）
```

基本操作：

```js
import { Buffer } from 'node:buffer';

const buf = Buffer.from('你好', 'utf8');
console.log(buf.length);        // 6：两个汉字在 UTF-8 中各占 3 字节
console.log(buf.toString('hex'));   // e4bda0e5a5bd
console.log(buf.toString('base64')); // 5L2g5aW9

const decoded = Buffer.from('5L2g5aW9', 'base64').toString('utf8');
console.log(decoded);           // 你好
```

Buffer 内存分配与写入：

```js
const buf = Buffer.alloc(8); // 分配 8 字节并初始化为 0，安全
buf.writeUInt16BE(256, 0);   // 按大端在前两个字节写入整数
console.log(buf);            // <01 00 00 ... >
console.log(buf.readUInt16BE(0)); // 256

const raw = Buffer.allocUnsafe(64); // 不初始化，可能含旧数据，但更快
raw.fill(0);                        // 手动清零后再用
```

#### 4.2 与 Web/后端的关系

- 文件不指定编码时返回 Buffer；网络请求体、图片、压缩包、加密结果都是二进制。处理这些数据时，字符串反而会破坏数据（字符串编码会改写字节）。
- 现代 Web 标准里对应的概念是 `Uint8Array`；浏览器与 Node 可以在这个层面交换二进制。
- Base64/hex 不是加密，它们只是二进制的可打印表示，不能用来“保护”数据。

TypeScript 中按结构处理字节：

```ts
import { Buffer } from 'node:buffer';

function frame(payload: string): Buffer {
  const body = Buffer.from(payload, 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]); // 4 字节长度前缀 + 负载
}

const packet = frame('hello');
console.log(packet.length, packet.toString('hex'));
```

#### 4.3 UTF-8 边界问题

UTF-8 是变长编码（1-4 字节），流分块时一个汉字可能被切到两个 chunk 中。直接对单个 chunk 调 `toString('utf8')` 会产生乱码。

```text
chunk 1 结尾：e4 bd      （"你" 的前 2 字节，不完整）
chunk 2 开头：a0 e5 ...  （"你" 的第 3 字节 + 后续）

错误做法：chunk1.toString('utf8') + chunk2.toString('utf8')
         → 第一个字符变成替换符号 �
正确思路：使用支持编码的字符串解码器（会跨 chunk 缓存不完整字节），
         或用 Node 的 readline/StringDecoder
```

```js
import { StringDecoder } from 'node:string_decoder';

const decoder = new StringDecoder('utf8');
const part1 = Buffer.from([0xe4, 0xbd]);
const part2 = Buffer.from([0xa0, 0xe5, 0xa5, 0xbd]);

console.log(decoder.write(part1)); // 空：不完整字符被缓存
console.log(decoder.write(part2)); // 你好
console.log(decoder.end());        // 冲刷剩余字节
```

#### 4.4 常见误区

> Buffer 长度等于字符串长度。

只对 ASCII 近似成立；中文、emoji 在 UTF-8 中占多字节。`'你'.length` 是 1，Buffer 长度是 3。

> `allocUnsafe` 和 `alloc` 只是速度差别。

`allocUnsafe` 不初始化，可能泄漏内存里的旧数据（潜在信息泄漏）。对外输出前必须填满或清零。

> Base64 输出看起来随机，所以是安全的。

Base64 可一键还原，不含任何机密性；安全要靠加密与密钥管理。

> 把图片 Buffer 按 utf8 转字符串再转回，图片没事。

UTF-8 转换会替换非法字节序列，二进制数据会被破坏。二进制必须全程 Buffer 或显式用 base64/latin1 之类无损通道。

### 5. Stream：四类流与两种模式

#### 5.1 定义

流（stream）是一种把数据从源头逐步搬到目的地的抽象。核心价值：**不需要一次性拥有全部数据**，内存占用与文件大小解耦。

| 类型 | 职责 | 内置例子 |
|---|---|---|
| Readable（可读流） | 数据来源，被消费 | `fs.createReadStream`、HTTP 响应（请求方）、`process.stdin` |
| Writable（可写流） | 数据目的地，被写入 | `fs.createWriteStream`、HTTP 请求（发送方）、`process.stdout` |
| Duplex（双工流） | 同时可读可写，两端独立 | TCP socket |
| Transform（转换流） | 读入数据、变换后输出（是特殊 Duplex） | `zlib.createGzip`、加密流、自定义解析器 |

流通过事件工作：

```text
Readable 事件：data（有数据）、end（读完）、error、close、readable
Writable 事件：drain（可以继续写）、finish（写完）、error、close
```

最小的文件复制（先看事件式，再看更好的 pipeline）：

```js
import { createReadStream, createWriteStream } from 'node:fs';

const rs = createReadStream('./big.bin');
const ws = createWriteStream('./big-copy.bin');

rs.on('data', (chunk) => {
  ws.write(chunk);
});
rs.on('end', () => {
  ws.end();
});
```

上面这段能跑，但没有处理背压和错误——第 6 节会用 pipeline 重写。

#### 5.2 流动模式与暂停模式

Readable 有两种模式，初学者最容易在这里踩坑：

```text
暂停模式（paused，默认）：不主动吐数据，需要调用 read() 主动取
流动模式（flowing）：监听 'data' 或调用 pipe/pipeline 后，数据持续推给消费者
切换陷阱：监听了 'data' 却没人真正处理，数据会直接流失
```

实践建议：不要混用手动 `read()` 与事件监听；业务代码统一使用 `pipeline`，让库去管理模式切换。

#### 5.3 自定义流

自定义 Readable（生成 0-9 的数字流）：

```js
import { Readable } from 'node:stream';

class CounterStream extends Readable {
  constructor(max) {
    super();
    this.current = 0;
    this.max = max;
  }

  _read() {
    if (this.current < this.max) {
      this.push(String(this.current++));
    } else {
      this.push(null); // null 表示数据结束
    }
  }
}
```

自定义 Transform（把 chunk 转大写）：

```ts
import { Transform, TransformCallback } from 'node:stream';

class UppercaseTransform extends Transform {
  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    // 错误处理风格：callback(err) 传出错误；正常时 callback(null, 处理结果)
    callback(null, Buffer.from(chunk.toString('utf8').toUpperCase(), 'utf8'));
  }
}
```

更简洁的现代写法是对象构造形式：

```js
import { Transform } from 'node:stream';

const upper = new Transform({
  transform(chunk, encoding, callback) {
    callback(null, chunk.toString().toUpperCase());
  },
});
```

#### 5.4 与 Web/后端的关系

HTTP 请求体和响应体在 Node 中都是流：上传文件时数据逐块到达，转发请求时可以“边收边发”，下载时可以“边读盘边写网络”。这让一个低内存进程能处理远超自身内存的传输。文件报表生成、日志归档、代理转发都建立在流之上。

#### 5.5 常见误区

> 用了流就一定更省内存。

如果在流的回调里把所有 chunk 累积进一个数组最后拼接，就退化成了 readFile，省内存的好处全丢。要“边到边处理”。

> Transform 就是 Duplex，随便写哪个都行。

Duplex 的读写两端相互独立（如 socket）；Transform 的输出由输入经过 `_transform` 产生。做数据加工应选 Transform。

> `_read`/`_transform` 里抛同步异常会被正常捕获。

应以 callback(err) 传错或异步捕获；未处理异常可能使进程崩溃。

### 6. pipe、pipeline 与背压

#### 6.1 定义：背压是什么

背压是“下游消费不过来，向上游发出的减速信号”。

```text
场景：读盘速度 500 MB/s，写网络只有 50 MB/s

没有背压：
  内存中持续堆积等待写出的 chunk → 内存暴涨 → OOM 进程被杀

有背压：
  ws.write() 返回 false（内部缓冲区超高位线）
  上游应暂停读取，等待 ws 的 'drain' 事件
  缓冲区排空后 'drain' 触发，上游恢复读取
  → 两端速度自动匹配，内存保持平稳
```

`pipe` 和 `stream.pipeline` 都内置背压传播：在可写方返回 false 时自动暂停可读方，drain 后恢复。

#### 6.2 为什么首选 pipeline

两者差别是工程级的：

```text
readable.pipe(writable)
  优点：自动处理背压
  缺点：错误不会自动沿链路传播，任何一处报错其他流可能不关闭，
        容易泄漏文件描述符；需要手动给每个流挂 error 处理

stream.pipeline(...streams, callback) / Promise 版
  优点：背压 + 任一流出错自动销毁全部流并清理资源 +
        完成回调统一处理结果；是官方推荐的组合方式
```

pipeline 复制文件（正确版）：

```js
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

try {
  await pipeline(
    createReadStream('./big.bin'),
    createWriteStream('./big-copy.bin'),
  );
  console.log('复制完成');
} catch (err) {
  console.error('流处理失败：', err);
}
```

多段流水线：读取 → 解压/压缩 → 加密 → 写文件：

```ts
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { createCipheriv, randomBytes } from 'node:crypto';

const key = randomBytes(32); // 示例密钥每次随机生成，真实项目从密钥管理读取
const iv = randomBytes(16);

await pipeline(
  createReadStream('./data.csv'),
  createGzip(),
  createCipheriv('aes-256-cbc', key, iv),
  createWriteStream('./data.csv.gz.enc'),
);
```

背压在整条链上逐段传播：加密慢就暂停压缩，压缩慢就暂停读盘，任何一段都不会被冲垮。

#### 6.3 手写背压（理解原理）

```js
rs.on('data', (chunk) => {
  const ok = ws.write(chunk);
  if (!ok) {
    rs.pause(); // 下游告急：暂停上游
  }
});

ws.on('drain', () => {
  rs.resume(); // 下游排空：恢复上游
});
```

业务代码不应手写这套逻辑——容易漏掉 error 和边界；但必须能解释 pipeline 在底层做了什么。

#### 6.4 与 Web/后端的关系

请求转发、文件下载、日志归档这些后端高频路径的共同点是“两端速度不匹配”：网络慢于磁盘、客户端慢于服务端。pipeline 让每一段都按最慢下游的节奏工作，是服务在高并发大传输下保持内存稳定的核心机制。排查“传输时内存涨”“连接中断后文件句柄不释放”这两类问题时，首先检查是否使用了 pipeline、错误是否沿链传播。

#### 6.5 常见误区

> pipe 会帮我处理所有错误。

不会。pipe 只管背压，错误要逐个监听；这正是推荐 pipeline 的首要原因。

> 出错后进程退出，资源自然没了，所以不用清理。

长驻服务不会因单个请求失败就退出；未关闭的流会泄漏文件描述符，积累后服务无法再打开新文件。pipeline 的自动销毁解决的就是这个问题。

> 背压会让数据丢失。

背压只是暂停传输，数据不丢；它防止的是内存被冲垮。

### 7. 对象模式与流式数据加工

#### 7.1 定义

默认流搬运的是 Buffer/字符串。设置 `objectMode: true` 后，流可以搬运普通 JS 对象，每个对象算作一个“块”。这让流可以成为数据加工管线：原始字节 → 解析成行对象 → 过滤/转换 → 聚合或输出。

```text
普通模式：chunk 是 Buffer，内部缓冲按字节计
对象模式：chunk 是对象，内部缓冲按个数计（highWaterMark 表示对象数量）
典型链路：Readable(字节) → Transform(解析为对象，objectMode) →
          Transform(业务处理) → Writable(对象→输出格式)
```

逐行处理 CSV/JSON Lines 的转换流：

```js
import { Transform } from 'node:stream';

class LineParser extends Transform {
  constructor() {
    super({ readableObjectMode: true }); // 输出端是对象，输入端仍是字节
    this.remainder = '';
  }

  _transform(chunk, encoding, callback) {
    const text = this.remainder + chunk.toString('utf8');
    const lines = text.split('\n');
    this.remainder = lines.pop() ?? ''; // 最后一段可能不完整，留到下次
    for (const line of lines) {
      if (line.trim()) {
        this.push({ raw: line, length: line.length });
      }
    }
    callback();
  }

  _flush(callback) {
    if (this.remainder.trim()) {
      this.push({ raw: this.remainder, length: this.remainder.length });
    }
    callback();
  }
}
```

消费对象、过滤并重新序列化：

```ts
import { Transform } from 'node:stream';

interface LogLine {
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

const parseLog: Transform = new Transform({
  objectMode: true,
  transform(obj: { raw: string }, _encoding, callback) {
    const match = /^(INFO|WARN|ERROR)\s+(.*)$/.exec(obj.raw);
    if (match) {
      const line: LogLine = { level: match[1] as LogLine['level'], message: match[2] };
      callback(null, line);
    } else {
      callback(); // 无法解析的行：丢弃但不使整链失败，属于有意的兜底策略
    }
  },
});

const onlyErrors: Transform = new Transform({
  objectMode: true,
  transform(line: LogLine, _encoding, callback) {
    if (line.level === 'ERROR') {
      callback(null, JSON.stringify(line) + '\n');
    } else {
      callback();
    }
  },
});
```

#### 7.2 与 Web/后端的关系

对象模式是“流式 ETL”的基础：大日志按行过滤统计、大 CSV 逐行入库、批量数据逐段调接口。内存里同一时刻只有一行，文件再大也扛得住。数据库批量写入时，可在对象模式流中攒够一批（如 500 条）再写，兼顾内存与吞吐。

#### 7.3 常见误区

> 对象模式可以随便放大对象，反正按个数计。

每个对象仍占真实内存；highWaterMark 限制的是缓冲对象个数，单个对象过大一样有风险。

> 转换流可以在输入端和输出端都自由切换类型。

一个流的两端模式可以不同（如 LineParser 字节进、对象出），但要显式声明 `writableObjectMode`/`readableObjectMode`，否则 push 对象会报“无效 chunk 类型”。

> 解析行时直接 `split('\n')` 就万无一失。

末尾行可能跨 chunk，必须缓存余数，并在 `_flush` 处理最后一行。

### 8. 大文件处理策略与完整错误处理

#### 8.1 定义：决策框架

面对一个文件任务，先问三个问题：

```text
1. 文件可能多大？   小且有明确上界 → readFile 简单直接
                    无界或很大（用户上传、日志、导出）→ 必须流式
2. 是否需要全部数据才能处理？  只转换/过滤/复制 → 流式
                    需要全局排序/全量统计 → 考虑外部算法、数据库或分块聚合
3. 下游是什么？      文件、网络、数据库都有各自速度，统一由 pipeline 对接
```

常见大文件任务的流式骨架：

| 任务 | 链路 |
|---|---|
| 复制/转存 | readStream → writeStream |
| 压缩归档 | readStream → gzip → writeStream |
| 完整性校验 | readStream → crypto.Hash（Transform 思路）→ 读 hash |
| 格式转换 | readStream → lineParse → transform → gzip → writeStream |
| HTTP 下载转发 | 上游 res（Readable）→ 本服务 res（Writable） |

散列校验示例：

```js
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';

async function sha256Of(file) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(file), hash);
  return hash.digest('hex');
}

const digest = await sha256Of('./big.bin');
console.log('sha256:', digest);
```

#### 8.2 完整错误处理清单

一条流链路可能失败的位置：

```text
源头：文件不存在、权限不足、读取中途磁盘错误
中段：解析非法数据、转换逻辑异常、压缩/加密失败
终点：磁盘满、网络中断、连接被重置
程序取消：用户中止、请求超时（用 AbortController 联动销毁整条 pipeline）
```

统一处理模板：

```ts
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';

async function compressFile(src: string, dest: string, signal: AbortSignal): Promise<void> {
  const rs = createReadStream(src);
  const gz = createGzip();
  const ws = createWriteStream(dest);

  signal.addEventListener('abort', () => {
    rs.destroy();
    ws.destroy();
  });

  try {
    await pipeline(rs, gz, ws);
  } catch (err) {
    if (signal.aborted) {
      console.log('任务被取消，已清理临时文件');
    } else {
      console.error('压缩失败：', err);
    }
    throw err; // 让调用方决定退出码，不能吞掉假装成功
  }
}
```

错误分层原则（与第 37 单元呼应）：

```text
用户可修正的问题（文件不存在、参数非法）：输出“怎么改”，用明确退出码
程序内部错误（权限、磁盘满、上游故障）：保留详细错误用于排查，但不向终端泄漏敏感路径之外的信息
异步错误不吞：catch 后要么重试（有策略）、要么上报并失败
```

#### 8.3 性能与正确性的平衡点

- 调大 highWaterMark 能减少事件次数、提高吞吐，但增加单流缓冲；默认值对多数场景足够，先测量再调。
- 并行处理多个文件时注意 libuv 线程池（第 37 单元）：文件流的并发度要有限制，否则排队且占文件描述符。
- “先写临时文件、完成后 rename”同样适用于流式产物，避免下游读到半成品。

#### 8.4 与 Web/后端的关系

后端接收的文件体量往往由用户或外部系统决定，开发者无法控制上界。因此“默认流式、显式限制、失败清理”不是优化项，而是服务稳定性的基线：它保证处理 1 KB 文件与处理 5 GB 文件时，进程的内存与文件描述符占用处在同一量级。接口评审时，任何“先全部读进来再说”的实现都应被追问“最大可能输入是多少”。

#### 8.5 常见误区

> 文件大不了，readFile 最省事。

用户上传和导出场景没有“大不了”的上界；一次超大 readFile 就可能让进程 OOM。无界输入默认流式。

> pipeline catch 到错误后文件处理完了，不用管半成品。

失败产物应删除或标记，否则下游可能把半成品当正式数据。

> 流程序不需要测试大文件，逻辑对就行。

边界问题（跨 chunk 的字符、跨 chunk 的行、下游中断、取消）只在真实分块下出现。测试应使用小 highWaterMark 人为制造切碎效果。

## 课后题

1. 比较 fs 的 Promise、回调、同步三种风格。为什么请求处理路径中禁止使用同步 API？
2. `readFile` 在底层做了哪些事？为什么说它“把文件大小变成了内存占用”？
3. 场景分析：某服务在处理请求时调用了 `readFileSync` 加载一个模板，平时正常；部署到共享磁盘后，高峰期所有接口间歇性卡顿数秒。请给出根因与修复方案。
4. 写出至少四个 `path` 模块 API 及其作用。为什么 HTTP URL 路径不应该用 path 构造？
5. 场景分析：学员写出 `path.resolve('/data', userInput)` 后直接读取文件，传入 `../../etc/passwd` 导致读到了预期之外的文件。请写出安全校验函数的关键逻辑。
6. Buffer 与字符串是什么关系？解释 `Buffer.from('你').length` 与 `'你'.length` 不同的原因。
7. 场景分析：一个 TCP 服务把收到的每个 chunk 单独 `toString('utf8')` 后转发，偶发出现 `�` 乱码。请解释根因，给出两种解决思路。
8. 列出四类流及其职责，各举一个 Node.js 内置例子。Duplex 与 Transform 的本质差别是什么？
9. 什么是背压？沿着“读盘 → gzip → 网络发送”的链路描述背压如何逐段传播。为什么首选 pipeline 而不是裸 pipe？
10. 场景分析：一个日志统计脚本处理 5 GB 文件，用流逐行解析并把所有 ERROR 行 push 进一个全局数组最后统一输出，运行中内存仍持续上涨直至进程被杀。请指出设计错误，并给出内存恒定的改写思路。

## 实践练习题

### 练习 1：文件工具箱（fs + path + Buffer）

#### 任务

创建 `file-toolbox`，实现一个命令行工具，支持三个子命令：统计目录中各类后缀文件的数量与总大小、把一个文件转换为 Base64 输出到另一个文件、以及把输入文件按指定大小（字节）做信息读取并打印 SHA-256。

#### 步骤约束

1. 项目使用 ESM + TypeScript，通过 tsx 运行；目录操作使用 `fs/promises`，路径全部经 `path` 构造。
2. 目录统计递归遍历，忽略 `node_modules` 与 `.git`；统计结果按扩展名分组（扩展名统一转小写）。
3. Base64 子命令对超过 10 MB 的输入必须改用流式读取处理，不能直接 readFile。
4. 命令参数缺失或非法时打印用法并以退出码 1 结束；成功以 0 结束。
5. 所有目标路径写入前做存在性检查，默认不覆盖已有文件，需显式参数才允许覆盖。
6. 自行生成测试目录与样例文件，不操作任何系统或他人目录。

#### 提交物

- 完整 TypeScript 源码与 `package.json`；
- 三个子命令的运行记录；
- 参数非法、目标已存在两种错误场景记录；
- 一份命令用法说明（含退出码约定）。

#### 验收标准

- 统计结果与实际目录一致，大小写扩展名正确归并；
- 大文件路径不使用 readFile；
- 不覆盖未授权文件，错误退出码正确；
- 路径处理在 macOS/Linux 上均可运行。

### 练习 2：流管线处理器（四类流 + pipeline + 背压）

#### 任务

编写 `stream-processor`：读取一个大文本文件，经自定义 Transform 逐行解析为对象，过滤出指定级别的日志行，再经 gzip 压缩写入输出文件。整条链使用 Promise 版 `pipeline`。

#### 步骤约束

1. 先用脚本生成至少 200 MB 的 JSON Lines 测试数据，每行形如 `{"level":"INFO|WARN|ERROR","message":"...","ts":...}`。
2. LineParser 必须正确处理跨 chunk 的残行与 `_flush` 收尾，输出端使用对象模式。
3. 过滤级别由命令行参数指定；非法行计数并跳过，不使整链失败。
4. 处理过程中用脚本采样进程内存，证明内存占用不随文件大小增长（给出对比数据）。
5. 支持传入超时参数，超时后通过 AbortController 取消并清理半成品文件。
6. 为制造边界问题，测试时把读入流 highWaterMark 调小（如 32 字节），验证不出现残行与乱码。

#### 提交物

- 数据生成脚本与处理器源码；
- 内存采样数据与结论；
- 超时取消与半成品清理的演示记录；
- 非法行计数统计。

#### 验收标准

- 输出结果与用全量读入方式得到的基准结果一致；
- 内存曲线平稳，不随输入规模线性增长；
- pipeline 任一位置出错时所有流被销毁、无残留文件描述符；
- 残行、非法行、取消三类边界均有明确处理。

### 练习 3：分片上传与重组（综合）

#### 任务

实现一个“文件分片—重组—校验”工具：把源文件按固定大小切成多个分片（流式切分），记录分片清单（含序号、大小、每片 SHA-256）；再根据清单把分片按序重组为新文件，并对重组结果计算散列与源文件比对。

#### 步骤约束

1. 分片大小可配置；切分与重组全部使用流，不允许把整个文件读入内存。
2. 清单文件使用 JSON，写入采用“临时文件 + rename”的原子方式。
3. 重组时校验分片序号连续性与每片散列；任一片缺失或损坏则失败并退出码非零，不产出看似成功的文件。
4. 重组产物先写入临时文件，全部校验通过后再 rename 为目标文件。
5. 用一个含中文与二进制内容的混合测试文件验证字节级一致性（比较源与产物的散列）。
6. 实验结束清理所有分片与临时文件。

#### 提交物

- 切分与重组两个程序的源码；
- 分片清单样例；
- 正常重组、缺片、坏片三种场景的记录与退出码；
- 源文件与产物散列一致的证据。

#### 验收标准

- 处理过程内存占用与文件大小无关；
- 字节级重组正确，二进制与多字节字符无损坏；
- 损坏与缺片场景不会生成误导性产物；
- 清单与产物写入均为原子替换。

## 阶段验收作业

### 作业名称

大文件流式处理服务：从工具箱到管线工程

### 作业场景

团队需要一个数据预处理服务，每天处理大小不可预期的数据文件（从几 KB 到数 GB）。团队要求你证明：你清楚什么时候用一次性读取、什么时候必须流式；你能把字节流变成对象流再变成压缩产物；你处理得了背压、取消、残行和损坏分片，且失败时不会留下伪装成成功的产物。

### 提交物

```text
stream-final/
├── file-toolbox/          # 练习 1 成果
├── stream-processor/      # 练习 2 成果
├── shard-merge/           # 练习 3 成果：分片切分与重组
├── docs/
│   ├── decision.md        # readFile vs stream 的决策说明与实测数据
│   └── backpressure.md    # 背压传播图与内存曲线
├── tests/                 # 边界测试：残行、切碎 chunk、取消、损坏分片
└── README.md
```

### 演示步骤

学员在 20 分钟内完成：

1. 讲解 fs 三种风格的取舍，并指出示例代码中一处“请求路径里的同步调用”为什么危险。
2. 运行文件工具箱的三个子命令，展示错误参数与不覆盖策略。
3. 现场生成一个 200 MB 文件并跑流处理器，展示实时内存曲线平稳。
4. 把输入流 highWaterMark 调到极小，演示残行与多字节字符仍正确处理。
5. 演示超时取消：产物被清理、退出码非零。
6. 完成分片切分、正常重组，再现场删/改一个分片演示失败保护。

### 评分标准（合计 100 分）

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| fs 与 path 掌握 | 15 | 三种风格取舍正确，路径跨平台，含安全路径校验 |
| Buffer 与编码 | 15 | 二进制/字符串/编码转换正确，理解 UTF-8 边界 |
| 流类型与自定义流 | 20 | 四类流区分清楚，自定义 Readable/Transform 正确 |
| pipeline 与背压 | 20 | 使用 pipeline，背压与资源销毁处理完整 |
| 大文件工程方案 | 15 | 内存恒定、原子写入、取消与损坏保护闭环 |
| 测试与可复现性 | 10 | 边界测试齐全，README 可指导复现 |
| 表达与数据支撑 | 5 | 结论有内存/散列实测数据，区分事实与推断 |

细分规则：

- fs 与 path（15 分）：异步 API 使用 5 分；目录递归与统计 4 分；安全路径 3 分；不覆盖策略 3 分。
- Buffer 与编码（15 分）：转换 API 4 分；长度/多字节解释 4 分；StringDecoder 边界处理 4 分；无损二进制意识 3 分。
- 流类型（20 分）：四类流辨析 6 分；自定义流实现 6 分；对象模式双端声明 4 分；残行/flush 处理 4 分。
- pipeline 与背压（20 分）：pipeline 全链路 6 分；背压传播解释 5 分；错误自动销毁 5 分；取消清理 4 分。
- 大文件工程（15 分）：内存实测平稳 5 分；原子写入 4 分；分片完整性保护 4 分；退出码正确 2 分。
- 测试与可复现性（10 分）：四类边界测试 5 分；README 完整 3 分；产物与源码分离、实验数据可清理 2 分。
- 表达（5 分）：图表 2 分；实测数据支撑 2 分；复盘改进 1 分。

70 分及以上通过。

### 强制不通过条件

出现以下任一情况即不通过，修正后重新验收：

1. 对无界大小的输入使用 readFile，或无法解释何时该流式。
2. 在请求处理路径中使用 `*Sync` 阻塞 API。
3. 使用裸 data/write 事件处理大文件却未处理背压，或坚持认为 pipe 会自动处理错误。
4. 流链路出错后不销毁流、不清理半成品，留下文件描述符泄漏或伪装成功的产物。
5. 重组文件在缺片或坏片时仍输出“成功”文件。
6. 项目无法按 README 在另一台当前 LTS 环境复现。
7. 提交真实密钥或把密码写进源码与配置。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 使用 fs/promises 并理解三种 API 风格 | file-toolbox 与现场问答 |
| 使用 path 编写跨平台路径代码 | 安全路径校验与全部路径构造 |
| 掌握 Buffer 与编码、理解 UTF-8 边界 | 编码转换演示与切碎 chunk 测试 |
| 区分并自定义四类流 | stream-processor 中的 LineParser 与过滤流 |
| 使用 pipeline 处理背压与错误 | 全链路实现、内存曲线与取消演示 |
| 设计大文件流式方案并处理错误 | 分片重组综合作业与三类失败场景 |

### 提交前自检

- [ ] 六个学习目标均有对应证据。
- [ ] 全项目搜索不到 `*Sync` 出现在请求/流处理路径中（启动期除外并已注明）。
- [ ] 所有路径经 path 构造，用户输入路径经过逃逸校验。
- [ ] 二进制处理全程 Buffer，未对图片/压缩数据做有损字符串转换。
- [ ] 所有多流组合使用 Promise 版 pipeline，错误分支会销毁全部流。
- [ ] 大文件实验有内存采样数据，证明内存不随输入规模增长。
- [ ] 残行、切碎 chunk、取消、坏片、缺片五类边界均有测试。
- [ ] 产物写入采用原子替换，失败不留下伪装成功的文件。
- [ ] README 不含真实用户名、绝对路径、密钥或个人敏感信息。
