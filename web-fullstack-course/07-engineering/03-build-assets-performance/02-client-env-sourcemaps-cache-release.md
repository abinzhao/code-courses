# 客户端环境、Source Map、缓存与发布

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | 已生成入口 chunk 与按交互加载的 report chunk |
| 输入 | 公开站点标签、release id、根路径或子路径部署约定 |
| 输出 | 可观察的公开变量、`base`/Source Map 诊断记录与发布顺序 |
| 文件 | `.env.production`、`src/vite-env.d.ts`、`src/public-env.ts`、`vite.config.mjs` |
| 运行 | `pnpm build`、`rg`/`find` 检查产物、生产预览 Network |
| 版本 | Node.js 24.21.0、pnpm 12.11.2、Vite 8.3.4 |
| 边界 | mode 不是授权；本地响应不证明生产缓存、CDN、TLS、发布或回滚 |

## 1. 任务背景

前端构建需要站点标题、部署路径和版本标识，但浏览器拿到的配置都是公开信息。把值存进 CI secret，再以 `VITE_` 注入，不会让最终 bundle 保密。浏览器必须读取的值只能按公开配置设计；真正的密钥、会话判定和权限留在服务端。

构建后还会遇到另一类跨版本问题：HTML 引用新资源、旧标签页仍引用旧动态 chunk、子路径与 `base` 不一致、Source Map 被公开上传。发布不是“复制一个 dist”这么简单，而是入口、资源、缓存和保留窗口的顺序契约。

## 2. 学习目标

- 说明 `VITE_` 客户端暴露规则，并为 `import.meta.env` 增加类型与运行时检查。
- 区分 Vite mode、`NODE_ENV`、部署环境和后端授权。
- 比较 `build.sourcemap` 的 `false`、`true`、`inline` 与 `"hidden"`。
- 为根路径、固定子路径和相对路径选择匹配的 `base`。
- 区分 HTML 重新验证与带 hash 资源长期缓存。
- 制定“资源先于入口、保留旧资源”的发布顺序。
- 诊断 wrong `base`、缺失 lazy chunk 与公开演示值，并说明回滚限制。

## 3. 预备知识

从第一课完成后的实验根执行：

```bash
cd "$HOME/code/market-engineering-lab"
pnpm quality
pnpm build
find dist -type f -print | sort
```

确认构建存在入口和 report chunk。后续故障实验只在读者自己的练习目录进行；移动构建文件前记录路径，并在同一轮实验恢复。不要使用真实 token、密码、Cookie、个人数据或生产 URL。

本课把下面四种事实分开：

```text
mode 名称：选择哪组构建配置
VITE_ 值：会进入客户端的公开字符串
服务端身份/权限：由真实后端判定
发布环境：服务器、CDN、TLS、缓存和保留策略
```

任何一层的名字都不能替代另一层的证据。

## 4. 核心理论

### 4.1 `VITE_` 是公开输入

Vite 在开发时通过 `import.meta.env` 提供变量，并在生产构建时静态替换。默认只有 `VITE_` 前缀的自定义变量暴露给客户端；值按字符串读取。以下值适合公开：

- 站点显示名称；
- 已公开 API origin；
- release id 或 commit id；
- 非敏感功能展示开关。

以下值不能进入客户端：

- 数据库密码、服务端私钥和签名密钥；
- 能越过服务端权限的供应商 token；
- 用户会话 Cookie 或长期 Bearer token；
- 只有受控服务才能拥有的管理凭据。

`.d.ts` 只提供静态提示，不验证构建环境真的给了值。即使接口把字段声明为必填，错误 CI 配置仍可在运行时缺失，因此关键公开配置也要在应用启动时检查并给出明确失败。

### 4.2 mode 不是安全边界

`vite build` 默认使用 `production` mode；`vite build --mode staging` 会读取 `.env.staging`。mode 负责配置选择，不会给用户授予“staging 管理员”身份，也不保证对应服务器安全。

`import.meta.env.MODE`、`PROD` 和 `DEV` 可用于构建分支，但不能写成：

```ts
const canDeleteAnyListing = import.meta.env.MODE === "admin";
```

浏览器代码和环境值都可被观察或修改。对象授权必须由后端根据已认证身份、资源所有者和角色执行。隐藏按钮只能改善体验，不能成为权限检查。

### 4.3 Source Map 的发布风险

Vite `build.sourcemap` 的含义：

| 值 | 产物 | 风险与用途 |
| --- | --- | --- |
| `false` | 不生成生产 map | 默认；仍不能隐藏浏览器 JavaScript |
| `true` | 独立 `.map`，bundle 有引用注释 | 若公开部署，可直接被开发者工具发现 |
| `"inline"` | map 作为 data URI 放进 bundle | 增大 JavaScript，并直接交给每个客户端 |
| `"hidden"` | 独立 `.map`，bundle 不写引用注释 | map 文件仍存在；若一起公开上传，知道 URL 仍可下载 |

Source Map 可能包含源路径、源文本和注释。需要错误监控时，应把 map 上传到受控服务并从公开静态目录排除，再验证访问控制和保留期。`"hidden"` 不是加密，也不是“安全 Source Map”。

不发布 map 仍不能存放前端秘密：压缩后的 JavaScript始终会到用户设备，字符串、请求协议和业务分支都能被分析。

### 4.4 `base` 是 URL 契约

Vite 会按 `base` 重写 HTML、CSS `url()` 和 JavaScript 导入的构建资源路径：

| 部署入口 | 建议 `base` | 页面示例 |
| --- | --- | --- |
| 域名根 | `"/"` | `https://market.example/` |
| 固定子路径 | `"/market/"` | `https://example.test/market/` |
| 最终路径构建时未知且宿主允许相对资源 | `"./"` | 嵌套静态目录 |

固定子路径应以 `/` 开始和结束。代码需要拼接公开路径时使用静态替换的 `import.meta.env.BASE_URL`，不要手写与配置可能漂移的 `/market/`。

`base` 正确不代表客户端路由 fallback 已配置；SPA 深链仍需要服务器路由策略。反过来，服务器能返回 HTML 也不代表资源 URL 正确。诊断时分别查看页面 URL、`dist/index.html` 引用、Network 请求 URL 和服务器挂载目录。

### 4.5 hash 资源与 HTML 使用不同缓存职责

内容相关文件名允许新旧版本拥有不同 URL，生产常见策略是：

```text
index.html:
  Cache-Control: no-cache
  每次使用前重新验证，及时获得新的资源 URL

assets/name-<hash>.js:
  Cache-Control: public, max-age=31536000, immutable
  URL 内容不变时长期复用
```

`no-cache` 表示使用前重新验证，不等于完全禁止存储。具体策略要结合平台和合规要求实测。Vite 只生成文件，不替生产服务器设置这些响应头。

若 HTML 也长期 immutable，用户可能无法发现新入口。若发布后立即删除旧 hash 文件，已打开的旧页面点击懒加载功能时会请求旧 chunk 并失败。

### 4.6 发布顺序与回滚边界

静态前端发布的安全顺序至少包含：

1. 关联源码提交、依赖锁和构建产物。
2. 上传新 hash 资源，但暂不切换 HTML。
3. 验证新资源可读、内容类型和完整文件集正确。
4. 最后切换或上传新 HTML。
5. 验证入口、首屏和动态 import。
6. 在论证过的窗口内保留旧 hash 资源。
7. 观察错误率和资源 404，再决定回收。

回滚旧 HTML 的前提是它引用的旧资源仍存在。前端回滚不能撤销已经成功的数据库写入、预约事务、邮件发送或不兼容 schema 迁移；这些需要后端向前兼容与独立恢复方案。

## 5. 元素、属性、API 或配置清单

| 配置/文件/命令 | 作用 | 本课规则 | 不能证明 |
| --- | --- | --- | --- |
| `.env.production` | production mode 的公开构建值 | 只放明确可公开的演示值 | 文件名不会把秘密变安全 |
| `.env.[mode]` | mode 专用变量 | mode 只选择配置 | 用户身份或对象授权 |
| `VITE_` | 默认客户端变量前缀 | 值按公开字符串处理 | CI secret 注入后仍不保密 |
| `src/vite-env.d.ts` | 扩展 `ImportMetaEnv` 类型 | 不含 import，保留运行时校验 | 实际环境一定存在 |
| `import.meta.env.MODE` | 当前 Vite mode | 用于配置/展示 | 管理员权限 |
| `import.meta.env.BASE_URL` | 构建后的公开 base | 动态 URL 使用原样属性访问 | 路由 fallback 已配置 |
| `base` | 重写构建资源 URL | 与真实挂载路径一致 | CDN/服务器自动部署 |
| `build.sourcemap` | 生产 Source Map 方式 | 默认 `false`；发布前审查 | 前端代码或秘密不可见 |
| `find dist -name '*.map'` | 检查 map 是否生成 | 发布清单必须明确包含/排除 | map 不可通过其他渠道访问 |
| `rg -n <marker> dist` | 证明演示值进入产物 | 只使用假的公开 marker | 所有压缩/编码形式都能被简单文本搜索 |
| Response Headers | 观察缓存与压缩 | 生产 URL 实测后才下结论 | 本地配置文本等于线上行为 |
| release id | 关联构建与提交 | 可公开、不可作授权凭据 | 部署一定来自该提交 |

## 6. 最小可运行案例

用明显公开的值证明暴露规则。不要替换为真实凭据。

**完整文件：`.env.production`**

```dotenv
VITE_PUBLIC_LABEL=邻里集市公开演示
VITE_RELEASE_ID=training-2026-10-11
VITE_PUBLIC_DEMO=PUBLIC_TRAINING_VALUE
```

**完整文件：`src/vite-env.d.ts`**

```ts
interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_PUBLIC_LABEL?: string;
  readonly VITE_RELEASE_ID?: string;
  readonly VITE_PUBLIC_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

**完整文件：`src/public-env.ts`**

```ts
export type PublicEnv = {
  label: string;
  releaseId: string;
  demoValue: string;
};

function required(value: string | undefined, key: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`missing public config: ${key}`);
  return normalized;
}

export function readPublicEnv(): PublicEnv {
  return {
    label: required(import.meta.env.VITE_PUBLIC_LABEL, "VITE_PUBLIC_LABEL"),
    releaseId: required(import.meta.env.VITE_RELEASE_ID, "VITE_RELEASE_ID"),
    demoValue: required(import.meta.env.VITE_PUBLIC_DEMO, "VITE_PUBLIC_DEMO"),
  };
}
```

暂时用最小入口观察值。

**完整文件：`src/main.ts`**

```ts
import { readPublicEnv } from "./public-env";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("missing #app");

const env = readPublicEnv();
const heading = document.createElement("h2");
const details = document.createElement("p");
heading.textContent = env.label;
details.textContent =
  `release=${env.releaseId}; demo=${env.demoValue}; mode=${import.meta.env.MODE}`;
app.replaceChildren(heading, details);
```

执行：

```bash
pnpm quality
pnpm build
rg -n 'PUBLIC_TRAINING_VALUE|training-2026-10-11' dist
pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort
```

预期页面和产物能观察到演示值，证明它是公开客户端配置。`rg` 未命中不能作为保密证明，因为压缩、编码或间接变换可能改变文本形态；浏览器运行值才是最终边界。

临时删除 `.env.production` 中 `VITE_RELEASE_ID` 后重建，应用应在启动时报告 `missing public config`，而不是显示模糊的 `undefined`。恢复文件并重建，页面再次成功。

## 7. 邻里集市集成案例

恢复第一课的商品与 report 入口，在查询 `#app` 之后创建公开配置展示：

```ts
import { readPublicEnv } from "./public-env";

const env = readPublicEnv();
const buildInfo = document.createElement("p");
buildInfo.textContent = `${env.label} · release ${env.releaseId}`;
document.title = env.label;
```

再把第一课的 `app.replaceChildren(...)` 精确替换为：

```ts
app.replaceChildren(title, price, buildInfo, reportButton, reportTarget);
```

`VITE_PUBLIC_DEMO` 只用于暴露实验，不必展示在正式教学页面。商品继续使用 `priceCents: 1990` 和 UTC `createdAt`；配置标签不能改变商品所有者、角色或预约状态。

根路径配置保持：

```js
export default defineConfig({
  base: "/",
  build: {
    sourcemap: false,
  },
});
```

若明确部署到 `/market/`，把 `base` 改为：

```js
export default defineConfig({
  base: "/market/",
  build: {
    sourcemap: false,
  },
});
```

然后执行：

```bash
pnpm build
rg -n '/market/assets/' dist/index.html
pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort
```

从 `http://127.0.0.1:4173/market/` 验证入口和 report 动态加载。若目标服务器实际只把文件挂在 `/`，该构建的 `/market/assets/...` 会请求错误位置；修复配置后重新构建，不手改 `dist/index.html`。

发布记录模板：

```text
源码/制品标识：
目标入口与 base：
先上传的 hash 资源：
后切换的 HTML：
旧资源保留窗口与依据：
入口/首屏/report chunk 验证：
生产响应头：
未验证：CDN、TLS、真实后端、数据库写入与回滚
```

模板中的空项必须填入真实观测或标记“未验证”，不能因为本地 preview 通过就代填生产结论。

## 8. 常见错误与排查路径

**故意错误：把看似敏感的名称加上 `VITE_`，误以为来自 CI secret 就不会公开。**

```dotenv
VITE_DEMO_SECRET=PUBLIC_TRAINING_VALUE
```

这里的值是专门构造的公开教学字符串，不是真实 secret。入口读取并构建后，浏览器可观察它。

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 演示“secret”出现在页面或 bundle | 页面值、产物字符串、DevTools | `VITE_` 在构建时进入客户端 | 真正秘密移到服务端；公开值按用途重新命名 | 客户端只剩允许公开的配置，服务端权限另测 |
| 子路径页面空白，JS/CSS 404 | Network 请求 `/assets` 或错误 `/market/assets` | `base` 与实际挂载路径不一致 | 配置目标 base 后重新构建并部署完整 dist | 入口、CSS、entry、report 均 200 |
| 旧标签页点击统计时报 chunk 404 | 旧页面请求旧 hash，Network 404 | 新发布删除了旧动态资源 | 资源先上传、HTML 后切换、保留旧资源 | 旧标签页和新入口都能完成动态加载 |
| `"hidden"` map 仍能下载 | `find dist -name '*.map'` 有文件，直接 URL 200 | hidden 只省略引用注释，不删除 map | 受控上传后从公开制品排除，或设 `false` | 公开 URL 404，监控上传另有授权证据 |
| 新 HTML 长期不出现 | HTML 响应 `immutable` 或陈旧边缘缓存 | 入口与 hash 资源使用同一长期策略 | HTML 重新验证，hash 资源长期缓存 | 生产响应头和发布后入口版本一致 |

### 缺失 lazy chunk 的可恢复实验

先启动预览并打开页面，让入口加载但不要点击统计。另一个终端执行：

```bash
chunk="$(find dist/assets -type f -name 'report-*.js' -print -quit)"
test -n "$chunk"
mv "$chunk" "$chunk.missing"
```

回到旧页面点击“加载教学统计”。预期 Network 404、页面显示失败、按钮恢复可用。随后立即恢复：

```bash
mv "$chunk.missing" "$chunk"
```

刷新并再次点击，应恢复 200。若 `find` 未找到文件，先回到第一课检查动态边界，不凭空移动其他 chunk。该实验只是本地模拟旧资源缺失；生产保留窗口仍需平台证据。

### Source Map 公开实验

把 `sourcemap` 临时改为 `"hidden"`：

```bash
pnpm build
find dist -type f -name '*.map' -print
```

预期存在 `.map`，即使构建 JavaScript 末尾没有引用注释。恢复 `false`、重建并确认公开 `dist` 不含 map。不要把 map 内容上传到工单或公开聊天。

## 9. 课后题

1. **为什么 CI secret 注入的 `VITE_API_KEY` 仍不是秘密？**<br>
   答：CI 只保护构建前取值；构建会把 `VITE_` 值静态放进发给浏览器的资源。
2. **`--mode staging` 是否能让 staging 用户拥有特殊权限？**<br>
   答：不能。mode 选择构建配置，身份和对象授权必须由后端执行。
3. **`sourcemap: "hidden"` 与 `false` 有什么差别？**<br>
   答：hidden 仍生成独立 map，只不在 bundle 写引用；false 不生成生产 map。
4. **为什么先上传资源再切换 HTML？**<br>
   答：避免新 HTML 已引用新资源，而资源尚不可读的发布窗口。
5. **前端回滚为何不能撤销预约？**<br>
   答：预约是服务端/数据库已经发生的写入，替换静态资源不会反向执行事务。

## 10. 实践练习

**基础：根路径与子路径对照。**<br>
分别用 `base: "/"` 和 `base: "/market/"` 构建，保存两次 `dist/index.html` 的资源 URL。验收：能指出哪一份匹配哪个入口，不混用旧 `dist`。

**进阶：写发布清单。**<br>
为两个连续 release 设计资源上传、HTML 切换、旧资源保留和回滚步骤。验收：每一步有可观察检查，明确数据库写入不在前端回滚范围。

**故障注入：旧页面缺少 report chunk。**<br>
按本节移动/恢复 chunk。验收：失败时有 404、页面错误与可重试按钮；恢复后同一路径成功。不得通过吞异常或删除动态功能制造绿灯。

## 11. 阶段验收

- [ ] 页面与构建产物能观察到专用公开演示值，实验没有使用真实秘密。
- [ ] `src/vite-env.d.ts` 提供类型，`readPublicEnv` 仍执行运行时缺失检查。
- [ ] 能解释 mode、`NODE_ENV`、部署环境和后端授权的不同职责。
- [ ] 根路径与 `/market/` 构建各有匹配 URL；wrong `base` 有 Network 证据。
- [ ] 缺失 report chunk 进入失败状态，恢复资源后重新成功。
- [ ] `"hidden"` Source Map 仍生成文件的事实已观察，并恢复 `sourcemap: false`。
- [ ] 发布顺序是 hash 资源先于 HTML，旧资源有保留策略。
- [ ] 明确记录本地 preview 未验证生产缓存头、CDN、TLS、真实发布和回滚。

## 12. 常见问题

**API URL 可以放在 `VITE_` 吗？**<br>
可以，浏览器本来就需要知道请求地址，但必须把它当公开信息。拥有 URL 不等于拥有接口权限。

**把变量放进 `.env.local` 就安全了吗？**<br>
文件可避免提交，但值一旦以 `VITE_` 被客户端构建读取，仍会进入浏览器。文件保密与产物保密是两件事。

**HTML 一定要 `no-store` 吗？**<br>
不一定。常见目标是及时重新验证；具体 `no-cache`、短缓存或平台策略需按业务与生产响应实测。

**可以捕获 `vite:preloadError` 后无限刷新吗？**<br>
不应。Vite 提供该事件处理动态导入加载错误，但恢复必须避免刷新循环，并配合 HTML 重新验证与旧资源保留。

## 13. 扩展阅读

资料快照日期：2026-10-11。

- [Vite：Env Variables and Modes](https://vite.dev/guide/env-and-mode)：`VITE_` 暴露、类型扩展、mode 与 `NODE_ENV`。
- [Vite：Building for Production](https://vite.dev/guide/build)：`base`、动态导入加载错误与旧资源问题。
- [Vite：Shared Options `base`](https://vite.dev/config/shared-options#base)：根路径、绝对子路径与相对 base。
- [Vite：Build Options `sourcemap`](https://vite.dev/config/build-options#build-sourcemap)：生产 Source Map 取值。
- [Vite：Deploying a Static Site](https://vite.dev/guide/static-deploy)：`dist` 与 `vite preview` 的本地边界。
- [MDN：HTTP Caching](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Caching)：重新验证、长期缓存与响应头语义。

## 我现在能做到什么

我能把客户端配置按公开信息设计，诊断 `base`、Source Map 和旧 chunk 故障，并写出资源先于入口、保留旧资源且不夸大回滚能力的发布方案。

## 单元导航

[返回章目录](../README.md#03-构建资源缓存与性能预算) · [上一课：Vite 8 构建图、Chunk 与动态导入](01-vite-build-graph-chunks-dynamic-import.md) · [下一课：递归资源预算与生产预览](03-asset-budget-production-preview.md)
