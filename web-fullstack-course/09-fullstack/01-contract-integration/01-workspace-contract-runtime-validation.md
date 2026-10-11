# 工作区契约与运行时校验：先合并责任，再连接页面

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一份合并前清单、一次无覆盖 dry-run、结构化 manifest 整合脚本、外部 JSON 运行时解析器 |
| 练习位置 | 读者自己的 `market/` 工作区；教材仓库只保存教程 |
| 固定基线 | Node.js 24 LTS、pnpm `12.10.1`、NestJS `12.1.1`、React `19.3`、Vue `3.5.43` |
| 核心证据 | 三个应用可被包名选中、只有一份根锁文件、整数分与 UTC 契约通过、损坏 JSON 被拒绝 |
| 建议时间 | 180 分钟 |
| 环境标签 | **local** 工作区整合；不证明浏览器会话、PostgreSQL 18 或容器运行 |

后端第 10 章仍是 `packages/contracts/index.ts` 和 API 完整源码的唯一 owner。本课只拥有
`scripts/integrate-workspace.mjs` 与 `packages/contracts/runtime.ts`。后面三课分别拥有客户端、
框架接线和编辑页，不重复这些完整文件。

## 1. 任务背景

React 卷、Vue 卷和后端卷都曾建立可独立学习的工程。如果把三个根目录直接覆盖到一起，最后写入
的 `package.json`、锁文件和配置会悄悄抹掉前两个工程的脚本。即使文件都“复制成功”，前端还可能
把 `19900` 分当成 `19900` 元，或把代理返回的 HTML 强制断言成 `Listing`。

全栈整合首先解决两个问题：

1. **文件责任**：哪个工程提供根工作区、应用目录、领域类型和锁文件；
2. **数据责任**：编译期类型、运行时 JSON、显示模型和服务端授权分别由谁保证。

本课以[后端 API 综合项目](../../08-backend/10-api-capstone.md)的 `market/` 为目标根，只迁入两个
前端应用目录。旧根 manifest、旧锁文件、`node_modules`、`dist`、`.env` 和模拟 API 不迁入。

## 2. 学习目标

完成本课后，你能够：

1. 在复制前列出来源、目标、保留项、排除项和唯一 owner；
2. 用 `rsync --dry-run` 证明不会覆盖已有应用，再执行同一组规则；
3. 用 JSON API 修改 manifest，保留已有 scripts、dependencies 和 exports；
4. 让 `apps/api`、`apps/react-web`、`apps/vue-web` 和 `packages/contracts` 共用一个 pnpm 安装边界；
5. 区分 TS 7 语言主线与 TS 6 编译器 API 兼容线，不把版本命令混称；
6. 保持 `priceCents` 为有界整数分、时间为 UTC ISO 8601、编辑携带服务端 `version`；
7. 把网络响应先视为 `unknown`，在进入 React/Vue 状态前解析；
8. 识别破坏性复制、幽灵依赖、陈旧锁文件、UI 字段污染 API 类型和单位错配。

## 3. 预备知识

- 完成[Workspace、组件库与 Design Tokens](../../07-engineering/04-workspace-component-library.md)；
- 完成[API 综合项目](../../08-backend/10-api-capstone.md)，并保留其真实 manifest 和迁移；
- 阅读[版本基线](../../00-guide/02-version-baseline.md)和
  [邻里集市项目契约](../../00-guide/05-project-assessment.md)；
- 能运行 `git status --short`、`node --version`、`pnpm --version` 和 `pnpm --filter`；
- 两个来源前端都应先通过自己的类型检查和构建。

先在三个来源根分别保存状态。若目标 `market/apps/react-web` 或 `market/apps/vue-web` 已存在，
先逐文件比较，不能把“已有目录”解释为允许覆盖。

## 4. 核心理论

### 4.1 先画责任表，再移动文件

| 资产 | 唯一来源 | 整合动作 | 禁止动作 |
| --- | --- | --- | --- |
| 根 `package.json` | 后端 `market/` | 结构化增加脚本 | 用前端根文件覆盖 |
| `pnpm-workspace.yaml` | 后端 `market/` | 确认包含 `apps/*`、`packages/*` | 建第二个 workspace |
| 根锁文件 | 整合后的根 | manifest 变更后由 pnpm 更新 | 复制任一旧锁文件 |
| `apps/react-web` | React 最终应用 | dry-run 后迁入整个应用 | 只挑 `src/` 丢配置与测试 |
| `apps/vue-web` | Vue 最终应用 | dry-run 后迁入整个应用 | 把 React 配置改名复用 |
| `apps/api` | 后端第 10 章 | 原样保留 | 为前端方便改授权规则 |
| `packages/contracts/index.ts` | 后端第 10 章 | 原样保留领域 DTO | 加入卡片封面等 UI 字段 |
| `packages/contracts/runtime.ts` | 本课 | 新增外部数据解析 | 用 `as Listing` 代替解析 |

工程卷的纯 TypeScript 实验不是第三个前端。React/Vue 的 SSR 实验也不应覆盖 SPA 入口。整合的是
每卷最终应用，不是所有历史练习的并集。

### 4.2 一份锁文件对应一个安装边界

根 manifest 声明 `packageManager: "pnpm@12.10.1"`，成员通过 `workspace:*` 依赖 contracts。
修改成员或依赖后先运行普通安装更新锁文件，再在干净状态运行 frozen 安装：

```text
manifest 变化 -> pnpm install -> 审查 pnpm-lock.yaml
稳定复现     -> pnpm install --frozen-lockfile
```

`--frozen-lockfile` 失败不是“pnpm 太严格”，而是清单与锁文件不一致的证据。不能删除锁文件重新
解析后就声称复现成功。

### 4.3 类型兼容与数据可信是两条轴

TS 7 可用于主语言检查；Vue 语言工具或其他依赖旧编译器 API 的工具按实际兼容范围使用 TS 6。
命令必须说明调用哪个二进制：

```bash
pnpm exec tsc --version
pnpm exec tsc6 --version
```

无论哪个版本通过，HTTP 响应在运行时仍是 `unknown`。类型声明在编译后消失，旧 API、错误代理、
缓存污染或部署漂移都可能返回错误结构。正确数据流是：

```text
Response -> unknown -> runtime parser -> Listing/PublicUser -> framework state
```

### 4.4 领域契约不能吸收显示便利

固定不变量：

- `priceCents` 是 `0..100000000` 的安全整数分；
- `createdAt` 是以 `Z` 结尾的 UTC ISO 8601 字符串；
- `ownerId`、`status`、`version` 来自服务端；
- 分页 `page` 是 `1..10000`、`pageSize` 是 `1..100`；超过总数的页可返回合法空数组；
- PATCH 发送读到的 `version`，服务端冲突返回 `409`；
- 认证只建立 actor，后端对象授权仍决定谁能编辑；
- 预约由数据库事务和唯一约束保证原子性，按钮禁用不是锁。

`coverUrl`、本地收藏动画、格式化金额和 `name` 显示标签属于 UI 模型或适配器。把它们加入 API
`Listing` 会迫使后端返回并不拥有的数据，也会让两个前端的局部需求污染公共契约。

合法 Listing JSON 示例：

```json
{
  "id": "20000000-0000-4000-8000-000000000001",
  "title": "二手自行车",
  "description": "刹车已保养，可在社区门口自提",
  "priceCents": 19900,
  "status": "available",
  "ownerId": "10000000-0000-4000-8000-000000000001",
  "version": 1,
  "createdAt": "2026-10-11T00:00:00.000Z"
}
```

其中 `priceCents` 不是字符串或浮点元，时间不是无时区本地文本。示例 ID 是教材虚构值，不代表真实
用户数据。

### 4.5 可复制不等于可合并

文件复制只证明字节到达目标。整合还要验证：

1. pnpm 是否识别成员；
2. 每个应用是否声明直接依赖；
3. exports 是否允许公共入口；
4. 类型检查是否覆盖真实源码；
5. 运行时 parser 是否拒绝损坏输入；
6. 原有 dev/lint/test/build 脚本是否仍在。

## 5. API、配置与文件责任清单

| 名称 | 最小用法 | 作用 | 边界 |
| --- | --- | --- | --- |
| `rsync -an` | 来源目录尾部带 `/` | 只预览迁移文件 | 不证明目标构建成功 |
| `packageManager` | `pnpm@12.10.1` | 固定包管理器入口 | 不固定 Node 与依赖图 |
| `workspace:*` | 应用依赖 contracts | 强制使用本地成员 | 不建立 exports |
| `exports` | `./runtime` 等子路径 | 约束公共入口 | 不能替代依赖声明 |
| `pnpm-lock.yaml` | 根目录唯一一份 | 固定解析图 | 必须由 pnpm 生成 |
| `pnpm --filter` | 按 `name` 选择包 | 验证成员与脚本 | 文件夹名不一定是包名 |
| `unknown` | parser 输入 | 阻止未校验字段进入领域 | 仍需逐字段检查 |
| `Number.isSafeInteger` | 检查金额与版本 | 拒绝小数和不安全整数 | 还需业务上下限 |
| `Date.parse` + `Z` | 检查 UTC 字符串 | 拒绝本地时间和坏日期 | 展示时才本地化 |
| HTTP `409` | version/预约冲突 | 表示当前状态不接受操作 | 不能自动无限重试 |

## 6. 最小可运行案例

### 6.1 先做无覆盖 dry-run

在 `market/` 的父目录设置真实绝对路径，仅运行只读预览：

```bash
export REACT_SOURCE=/absolute/path/to/react-course-project/apps/react-web
export VUE_SOURCE=/absolute/path/to/vue-course-project/apps/vue-web
test ! -e market/apps/react-web
test ! -e market/apps/vue-web
rsync -an --exclude=node_modules --exclude=dist --exclude=.env \
  --exclude=pnpm-lock.yaml "$REACT_SOURCE/" market/apps/react-web/
rsync -an --exclude=node_modules --exclude=dist --exclude=.env \
  --exclude=pnpm-lock.yaml "$VUE_SOURCE/" market/apps/vue-web/
```

预期只出现对应应用内文件，没有根 manifest、锁文件或依赖目录。`test` 非零表示目标已存在，应停止
并比较，不加 `--delete` 或覆盖参数。确认后把两条 `rsync` 的 `-an` 改为 `-a` 执行一次。

### 6.2 结构化合并 manifest

完整文件：`market/scripts/integrate-workspace.mjs`

```js
import { access, readFile, writeFile } from "node:fs/promises";

const checkOnly = process.argv.includes("--check");
const required = [
  "package.json",
  "pnpm-workspace.yaml",
  "apps/api/package.json",
  "apps/react-web/package.json",
  "apps/vue-web/package.json",
  "packages/contracts/package.json",
  "packages/contracts/index.ts",
];

for (const path of required) {
  await access(path).catch(() => {
    throw new Error(`missing required integration input: ${path}`);
  });
}

async function updateJson(path, transform) {
  const beforeText = await readFile(path, "utf8");
  const before = JSON.parse(beforeText);
  const after = transform(before);
  const afterText = `${JSON.stringify(after, null, 2)}\n`;
  if (checkOnly) {
    if (afterText !== beforeText) {
      throw new Error(`${path} is not integrated; run without --check`);
    }
    return;
  }
  if (afterText !== beforeText) await writeFile(path, afterText);
}

await updateJson("package.json", (value) => ({
  ...value,
  private: true,
  packageManager: "pnpm@12.10.1",
  scripts: {
    ...value.scripts,
    "dev:react": "pnpm --filter @market/react-web dev",
    "dev:vue": "pnpm --filter @market/vue-web dev",
    "typecheck:web": "pnpm --filter @market/react-web typecheck && pnpm --filter @market/vue-web typecheck",
    "build:all": "pnpm --filter @market/api build && pnpm --filter @market/react-web build && pnpm --filter @market/vue-web build",
  },
}));

for (const app of ["react-web", "vue-web"]) {
  await updateJson(`apps/${app}/package.json`, (value) => ({
    ...value,
    name: `@market/${app}`,
    private: true,
    dependencies: {
      ...value.dependencies,
      "@market/contracts": "workspace:*",
    },
  }));
}

await updateJson("packages/contracts/package.json", (value) => {
  if (value.exports !== undefined &&
      (value.exports === null || typeof value.exports !== "object" ||
       Array.isArray(value.exports))) {
    throw new Error("contracts exports has an unsupported shape; review it manually");
  }
  return {
    ...value,
    exports: {
      ...value.exports,
      ".": "./index.ts",
      "./runtime": "./runtime.ts",
      "./client": "./client.ts",
      "./browser-api": "./browser-api.ts",
      "./edit": "./edit.ts",
    },
  };
});

console.log(checkOnly
  ? "workspace integration check: PASS"
  : "workspace manifests integrated; review the diff before pnpm install");
```

在 `market/` 根运行：

```bash
node scripts/integrate-workspace.mjs
git diff -- package.json apps/react-web/package.json \
  apps/vue-web/package.json packages/contracts/package.json
node scripts/integrate-workspace.mjs --check
```

预期 diff 只增加约定键，原脚本和依赖仍在；检查模式输出
`workspace integration check: PASS`。若 JSON 无法解析或 exports 形状未知，脚本非零退出，先人工理解，
不能改成字符串替换。

### 6.3 运行时解析器

完整文件：`market/packages/contracts/runtime.ts`

```ts
import type {
  ApiError,
  Listing,
  ListingPage,
  ListingStatus,
  PublicUser,
} from "./index.js";

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label}: expected object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label}: expected non-empty string`);
  }
  return value;
}

function uuid(value: unknown, label: string): string {
  const result = text(value, label);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(result)
  ) {
    throw new TypeError(`${label}: expected UUID`);
  }
  return result.toLowerCase();
}

function integer(value: unknown, label: string, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) {
    throw new TypeError(`${label}: expected safe integer ${min}..${max}`);
  }
  return Number(value);
}

function utcIso(value: unknown, label: string): string {
  const result = text(value, label);
  const time = Date.parse(result);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result) ||
    !Number.isFinite(time) ||
    new Date(time).toISOString() !== result
  ) {
    throw new TypeError(`${label}: expected UTC ISO 8601 string`);
  }
  return result;
}

export function parseListing(value: unknown): Listing {
  const source = record(value, "listing");
  const status = text(source.status, "listing.status");
  if (!["available", "reserved", "sold"].includes(status)) {
    throw new TypeError("listing.status: unknown value");
  }
  return {
    id: uuid(source.id, "listing.id"),
    title: text(source.title, "listing.title"),
    description: typeof source.description === "string"
      ? source.description
      : (() => { throw new TypeError("listing.description: expected string"); })(),
    priceCents: integer(source.priceCents, "listing.priceCents", 0, 100000000),
    status: status as ListingStatus,
    ownerId: uuid(source.ownerId, "listing.ownerId"),
    version: integer(source.version, "listing.version", 1, Number.MAX_SAFE_INTEGER),
    createdAt: utcIso(source.createdAt, "listing.createdAt"),
  };
}

export function parseListingPage(value: unknown): ListingPage {
  const source = record(value, "listingPage");
  if (!Array.isArray(source.items)) {
    throw new TypeError("listingPage.items: expected array");
  }
  const items = source.items.map(parseListing);
  const page = integer(
    source.page,
    "listingPage.page",
    1,
    10000,
  );
  const pageSize = integer(source.pageSize, "listingPage.pageSize", 1, 100);
  const total = integer(
    source.total,
    "listingPage.total",
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const offset = (page - 1) * pageSize;
  const maximumItems = Math.min(
    pageSize,
    Math.max(total - offset, 0),
  );
  if (
    !Number.isSafeInteger(offset) ||
    items.length > maximumItems ||
    new Set(items.map((item) => item.id)).size !== items.length
  ) {
    throw new TypeError("listingPage: inconsistent pagination");
  }
  return { items, page, pageSize, total };
}

export function parseSession(
  value: unknown,
): { user: PublicUser; csrfToken: string } {
  const source = record(value, "session");
  const user = record(source.user, "session.user");
  if (user.role !== "user" && user.role !== "admin") {
    throw new TypeError("session.user.role: unknown value");
  }
  const csrfToken = text(source.csrfToken, "session.csrfToken");
  if (!/^[a-f0-9]{64}$/.test(csrfToken)) {
    throw new TypeError("session.csrfToken: invalid token shape");
  }
  return {
    user: {
      id: text(user.id, "session.user.id"),
      email: text(user.email, "session.user.email"),
      role: user.role,
    },
    csrfToken,
  };
}

export function parseApiError(value: unknown, requestId: string): ApiError {
  const source = value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    code: typeof source.code === "string" ? source.code : "HTTP_ERROR",
    message: typeof source.message === "string"
      ? source.message
      : "服务暂时不可用",
    requestId: typeof source.requestId === "string"
      ? source.requestId
      : requestId,
  };
}
```

这个 parser 返回新对象，不把未声明 UI 字段带入领域。分页规则与后端查询参数一致：
`page <= 10000`、`pageSize <= 100`；即使 `(page - 1) * pageSize > total`，空 `items` 也是正常的
越界页响应，不应因 `offset > total` 被误判为损坏。parser 仍拒绝不安全 offset、超过 pageSize 或
total 的 items 以及页内重复 ID。它检查响应形状，但不会授予权限；服务端仍必须从 session 取得
actor 并执行对象授权。

## 7. 邻里集市集成案例

### 7.1 安装与成员证据

完成两个应用迁入和两个完整文件后，在 `market/` 根执行：

```bash
pnpm --version
pnpm install
pnpm install --frozen-lockfile
pnpm list -r --depth -1
pnpm --filter @market/api build
pnpm --filter @market/react-web typecheck
pnpm --filter @market/vue-web typecheck
pnpm build:all
find . -name pnpm-lock.yaml -not -path "*/node_modules/*" -print
```

预期 pnpm 为 `12.10.1`；列表中有四个成员；最后只打印根锁文件。第一次普通安装负责生成或更新
锁文件，第二次 frozen 安装证明清单与锁一致。当前主机若不是 Node 24，应记录实际版本并在符合
基线的临时环境复验，不把 Node 22 结果冒充 Node 24。

### 7.2 契约故障探针

在读者自己的测试文件中分别向 `parseListing` 传入：

```ts
const brokenUnit = {
  id: "20000000-0000-4000-8000-000000000001",
  title: "二手自行车",
  description: "可自提",
  priceCents: "19900",
  status: "available",
  ownerId: "10000000-0000-4000-8000-000000000001",
  version: 1,
  createdAt: "2026-10-11T00:00:00.000Z",
};
```

预期抛出 `listing.priceCents` 错误；把字符串改为整数 `19900` 后解析成功。再把时间改成
`2026-10-11 08:00:00` 或不存在日期 `2026-02-30T08:00:00.000Z`，预期规范 UTC 校验失败。
修复为带毫秒且往返不变的 `2026-10-11T00:00:00.000Z` 后，页面展示时才用用户时区转换。

分页测试还要覆盖两组相反判定：

```ts
parseListingPage({ items: [], page: 10000, pageSize: 100, total: 1 });
// 合法：查询页已超过最后一页，后端返回空数组。

parseListingPage({ items: [], page: 10001, pageSize: 100, total: 1 });
// 非法：page 超过后端允许的 10000。
```

第一条必须成功，不能恢复 `offset > total` 拒绝；第二条必须抛出 `listingPage.page`。另分别构造
101 个 items、`items.length > total` 和重复 ID，预期仍以 `inconsistent pagination` 拒绝。这样测试
同时证明“越界空页合法”和其余响应一致性约束没有被放宽。

### 7.3 集成边界

到本课结束，以下结论仍不能声称：

- Cookie、CSRF 或登录恢复已经在浏览器通过；
- React/Vue 已连接真实 API；
- PostgreSQL 18 迁移、原子预约或容器已运行；
- UI 隐藏编辑按钮完成对象授权；
- `mock`、`static` 数据已经成为真实后端数据。

## 8. 常见错误与排查路径

### 明确错误：用来源根目录覆盖目标根

```bash
# 错误示例：会把目标 manifest、锁文件和应用一起覆盖
rsync -a "$REACT_PROJECT/" market/
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | API 脚本消失，根锁文件大幅重写，Vue 成员找不到 |
| 证据 | `git diff --name-status` 显示根文件被替换；`pnpm list -r` 缺成员 |
| 原因 | 把独立工程根当成可覆盖的应用子目录 |
| 修复 | 恢复自己的工作副本，只迁入 `apps/react-web/`；manifest 用结构化脚本合并 |
| 复验 | 四成员可见、原 API 脚本仍在、唯一根锁文件 frozen 安装成功 |

### 其他高频问题

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 本机可 import，干净安装失败 | 成员未声明 contracts | 靠根依赖形成幽灵依赖 | 在真实消费者声明 `workspace:*` | 删除安装结果后 frozen 安装 |
| frozen 安装失败 | lockfile importer 不匹配 | manifest 改后未更新锁 | 普通安装并审查锁文件 | 再运行 frozen 安装 |
| 页面金额放大 100 倍 | Network 为 `19900`，提交却为 `199` | 元/分语义错配 | 表单明确单位并用整数解析 | 数据库与响应仍为 `19900` |
| 类型通过，运行时报错 | 响应为 HTML 或字符串金额 | 用断言信任外部 JSON | 从 `unknown` 运行时解析 | 错误受控，合法响应通过 |
| 越界空页被报损坏 | `page=10000,total=1,items=[]` 抛错 | 把 offset 大于 total 当响应矛盾 | 只检查安全 offset 与 items 约束 | 越界空页通过，`page=10001` 拒绝 |
| API 类型出现 `coverUrl` | 后端没有对应字段 | UI 模型污染公共 DTO | 在前端适配层增加显示字段 | API parser 不再要求该字段 |

## 9. 课后题

**1. 为什么不复制前端的 `pnpm-lock.yaml`？**
参考答案：整合后只有一个安装边界，锁文件必须由整合后的全部 manifest 共同生成。复制任一局部锁
会遗漏其他成员或覆盖后端解析图。

**2. TypeScript 已声明 `priceCents: number`，为何还检查运行时？**
参考答案：HTTP JSON、缓存和代理不受本地编译器约束，类型会在编译后消失。外部值只有通过 parser
后才满足本应用契约。

**3. 前端比较 `user.id === listing.ownerId` 是否完成授权？**
参考答案：没有。它只改善界面；攻击者可绕过 UI，后端必须以 session actor 和目标对象再次判断。

**4. 为什么 `createdAt` 保存 UTC、显示时才本地化？**
参考答案：时间点只有一个，显示时区因用户而异。持久化本地字符串会丢失时区和夏令时语义。

## 10. 实践练习

### 基础：建立合并清单

在个人 `market/docs/integration-inventory.md` 记录责任表、两个来源绝对路径、dry-run 命令与输出摘要。
完成标准：明确根文件不覆盖，目标已存在时命令停止，排除项包含依赖、构建和环境文件。

### 进阶：增加 parser 边界测试

在 `packages/contracts/runtime.test.ts` 测试金额 `0`、上限、字符串金额、非法状态、本地时间、总数
小数，以及分页 `page=10000` 的越界空页、`page=10001`、超 pageSize、超 total 和重复 ID。运行当前
contracts 包的测试脚本。完成标准：合法金额边界和越界空页通过；损坏输入分别在预期断言内失败；
测试不使用 `as Listing` 制造输入可信。

### 故障注入：制造锁文件漂移

只在个人工作区为 React 应用临时增加一个开发依赖，不更新锁文件，运行：

```bash
pnpm install --frozen-lockfile
```

预期非零退出。保存现象、首条错误、原因；随后运行普通安装并审查锁文件，再运行 frozen 安装。
不得通过删除锁文件、关闭 frozen 或提交 `node_modules` 制造绿色。

## 11. 阶段验收

- [ ] dry-run 输出经过人工审查，实际迁移只包含两个应用目录。
- [ ] 根 manifest、API 应用和后端 contracts 类型没有被覆盖。
- [ ] `node scripts/integrate-workspace.mjs --check` 退出 0。
- [ ] pnpm 精确为 `12.10.1`，根锁文件唯一，frozen 安装通过。
- [ ] API、React、Vue 能按包名选中并执行各自 build/typecheck。
- [ ] `priceCents`、UTC、owner、status、version 和 `409` 语义保持统一。
- [ ] 外部 Listing、分页、session 和错误均从 `unknown` 解析。
- [ ] 分页只接受 `page=1..10000`、`pageSize=1..100`；越界空页合法，超限、超量和重复 ID 拒绝。
- [ ] 至少保存一次破坏性复制或锁漂移的失败与修复证据。
- [ ] 证据标为 local；未运行的浏览器、数据库和容器能力没有写成通过。

提交材料应含文件位置、命令、实际退出码、关键输出、失败前后 diff 和未验证边界。

## 12. 常见问题

**可以保留两个前端各自的锁文件吗？**
本课程将 `market/` 定义为一个 workspace，因此只保留根锁文件。真正独立部署的仓库可以有自己的
安装边界，但不能在同一 workspace 中混用两套口径。

**为什么整合脚本预先写入后面课程的 exports？**
它只声明稳定公共路径，后面课程分别创建对应文件。执行后应立即按本章顺序完成文件，不能在中间
状态运行全量构建。

**能直接共享后端 parser 吗？**
只能共享环境无关、浏览器可构建的 contracts 代码。不能把 Nest、Node crypto、数据库或 server
配置带入浏览器包。

**能用 Zod 等库简化 parser 吗？**
可以，但应先复用工作区已有依赖并评估浏览器体积。本课手写小型 parser 是为了展示每个不变量，
不是要求大型系统永远手写 schema。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [pnpm Workspaces](https://pnpm.io/workspaces)：核对成员、workspace 协议和根安装边界。
- [pnpm Filtering](https://pnpm.io/filtering)：核对包名与依赖方向选择。
- [Node.js Package Exports](https://nodejs.org/api/packages.html#package-entry-points)：理解公共子路径。
- [TypeScript Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)：区分类型解析与运行时解析。
- [MDN：Date time string format](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format)：核对 ISO 时间解析边界。
- [项目契约](../../00-guide/05-project-assessment.md)：复核金额、状态、权限和 HTTP 约定。

## 我现在能做到什么

我能在不覆盖三个独立工程历史的前提下，把 API、React、Vue 和 contracts 组织成一个可检查的
workspace；我能让外部 JSON 在进入框架状态前接受金额、UTC、状态和版本校验，并明确类型共享不等于
认证、授权或事务已经成立。

## 单元导航

[章节 hub](../01-contract-integration.md) ·
[上一卷：API 综合项目](../../08-backend/10-api-capstone.md) ·
[下一课：同源 Session、CSRF 与共享客户端](02-same-origin-session-csrf-client.md) ·
[全栈交付卷目录](../README.md)
