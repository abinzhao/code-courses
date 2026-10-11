# MP-24 完整客户端：从空目录到微信与抖音验收

## 任务卡

- 任务：将 MP-23 服务接到完整 Taro 客户端，演练离线草稿与预约响应丢失。
- 产出：本篇 24 个完整文件、MP-23 五文件、MP-15 三文件，共 32 个；精确目录见 §5。
- 运行：`npm install`、`npm run typecheck`、`npm test`、微信/抖音 build。
- 证据：列表→详情→登录→预约→同键恢复→确认售出；发布草稿与退出清理。
- 边界：demo 服务在客户端内存运行，所有业务成功标记“演示”；构建不证明平台审核或真机。

## 1. 任务背景

文件清单必须可复建，而不是只有项目说明。客户端既要展示服务端权威资源，也要明确本地
草稿、请求进行中和结果未知。错误输入、403、409、离线和配额失败不能被统一替换成成功。

## 2. 学习目标

从空目录安装锁定依赖；实现所有页面；集中平台 adapter 和配置；保护会话代次；
恢复持久幂等意图；区分教学 transport 和真实网络接线。

## 3. 预备知识

完成 MP-23，创建其五文件。本篇所有路径都相对项目根。AppID 是公开平台标识，
下面未填真实值；密钥绝不进入 config、defineConstants 或客户端。
Node、工具、账号与真机要求见本卷 README。

<a id="s4"></a>
## 4. 核心理论

### 4.1 页面与服务分离

首页读取分页，详情重新读 ID，发布页保存用户隔离草稿，预约页读取本人资源，
账户页提供登录/退出和可控网络故障。页面没有平台密钥、对象授权算法或数据库承诺。
写请求仍经 parser，demo transport 也不能绕过数据准入。

### 4.2 恢复意图

点击预约前先持久保存 `{listingId,version,key}`。响应未知时保留原命令；恢复先按 key
查询，404 时同键同 payload 重试。成功后删除；首次命令得到契约明确拒绝时标记 rejected，
用户点“结束已拒绝意图”后，再显式点击预约才建立新键和当前版本。
已未知命令的 404/重试冲突不升级为确定拒绝；保留原键，不能自动 retry 或 fresh key。
存储失败则不发送新请求。
这里不离线排队自动预约，用户必须显式恢复。show 只读刷新，不触发写。

### 4.3 会话代次

每次登录/退出递增 session epoch。异步写完成后比较 epoch，旧账号结果不进入新账号 UI。
离线退出只能清本机，撤销失败必须提示，不能描述为全端注销。Token expiresAt 是客户端
预检查；真正过期/撤销由后端决定。
退出在删除数据前持久记录待清理键，所有键与日志清理确认后才解锁新登录。
失败重试不会丢 owner；重启读取待清理记录仍阻塞。教学服务重启不恢复旧 Token，
存储中旧 session 仅作为清理 owner 的线索，账户页显式退出清理后再登录。

### 4.4 发布回执与界面草稿

每个 owner 只有一个草稿槽；发 POST 前同步建立 module holder，并持久保存
`market:publishing:<owner>` 原 payload 操作标记。页面卸载、重挂载或退出不结束命令；
pending/unknown 不允许再次 POST，进程重启将原标记作为 unknown 恢复。
parseListing 成功后先按请求捕获 owner 写 `market:published:<owner>`，再检查会话和
页面生命周期；正常 storage 下即使已卸载或切换身份，原 owner 回执仍持久可恢复。
生命周期只控制 UI 与草稿清理，不吞成功。新挂载订阅共享 holder，不依赖旧页面 ref。
清理失败仍显示 publishedId，只可重试清理；确认后显式开始下一份才删除标记与回执。
holder 最多 16 个 owner，只驱逐已持久可恢复的非 pending 状态；在途和未持久成功不可驱逐，
无可驱逐项则停止新命令。监听在卸载时删除，不保留页面引用。
回执磁盘写失败仅保留同进程成功知识与原持久未知标记，不保证崩溃后找回 publishedId。
当前发布端点没有服务端幂等键或按命令查询；未知态只提供人工核对说明，须以原账号查
服务端商品记录/运营支持，取得权威 ID 后修复原回执，或业务确认未创建后结束原标记。
不能凭草稿、列表未出现、网络恢复或重新登录判断未创建，也不提供强制重发按钮。
发布页同会话返回保留未保存编辑；初进或 epoch 变化才读取持久草稿。
图片回调合并最新编辑，generation 与 session epoch 同时检查，旧选择不覆盖新选择。

## 5. 精确目录与接线

```text
package.json
tsconfig.json
babel.config.js
config/index.ts
project.config.json
project.tt.json
project.alipay.json
src/app.tsx
src/app.config.ts
src/app.css
src/domain.ts              MP-23
src/request.ts             MP-23
src/storage.ts             MP-23
src/mock-service.ts        MP-23
src/platform.ts
src/upload.ts              MP-15
src/upload-platform.ts     MP-15
src/client.ts
src/components/ReservationLabel.tsx
src/pages/home/index.tsx
src/pages/detail/index.tsx
src/pages/detail/index.config.ts
src/pages/account/index.tsx
src/packages/publish/index.tsx
src/packages/reservations/index.tsx
tests/contracts.test.ts    MP-23
tests/view.test.tsx
tests/client.test.ts
tests/fixture.ts
tests/recovery.test.tsx
tests/publish-lifecycle.test.tsx
tests/upload.test.ts       MP-15
```

不需要额外图片、icon 或隐藏配置文件。临时选择的图片只预览，不引用外网占位图。
本地演示没有 HTTP 端口；真实模式必须替换 client 的 transport，并配置 HTTPS 合法域名。
另完整创建 [MP-15 §6](../08-media/01-image-validation-upload.md#s6) 的 upload.ts、
upload-platform.ts 和 upload.test.ts，平台选择图片后执行实际元信息预检。
上传控制器完整但默认不发送上传请求；真实服务器接线必须另获授权。

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `package.json`：

```json
{
  "name": "course-mini-market", "version": "1.0.0", "private": true,
  "scripts": {
    "typecheck": "tsc --noEmit", "test": "tsx --test tests/*.test.ts tests/*.test.tsx",
    "build:weapp": "taro build --type weapp", "build:tt": "taro build --type tt",
    "build:alipay": "taro build --type alipay"
  },
  "dependencies": {
    "@tarojs/components": "4.3.0", "@tarojs/helper": "4.3.0",
    "@tarojs/plugin-framework-react": "4.3.0",
    "@tarojs/plugin-platform-weapp": "4.3.0", "@tarojs/plugin-platform-tt": "4.3.0",
    "@tarojs/plugin-platform-alipay": "4.3.0", "@tarojs/react": "4.3.0",
    "@tarojs/runtime": "4.3.0", "@tarojs/shared": "4.3.0", "@tarojs/taro": "4.3.0",
    "react": "18.3.1", "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@babel/core": "7.28.0", "@babel/preset-react": "7.27.1", "@babel/preset-typescript": "7.27.1",
    "@tarojs/cli": "4.3.0", "@tarojs/webpack5-runner": "4.3.0",
    "@types/node": "22.15.30", "@types/react": "18.3.23", "@types/react-dom": "18.3.7",
    "babel-preset-taro": "4.3.0",
    "typescript": "5.9.3", "tsx": "4.20.5", "webpack": "5.91.0", "postcss": "8.5.6",
    "react-test-renderer": "18.3.1", "@types/react-test-renderer": "18.3.1"
  }
}
```

完整文件 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020", "module": "ESNext", "moduleResolution": "Bundler",
    "jsx": "react-jsx", "strict": true, "esModuleInterop": true, "skipLibCheck": true,
    "types": ["node", "@tarojs/taro"], "lib": ["ES2020", "DOM"], "noEmit": true
  },
  "include": ["src", "config", "tests"]
}
```

DOM lib 仅为依赖类型兼容，不授权小程序页面调用 DOM。

完整文件 `babel.config.js`：

```js
module.exports = { presets: [["taro", { framework: "react", ts: true }]] };
```

完整文件 `config/index.ts`：

```ts
import { defineConfig } from "@tarojs/cli";
export default defineConfig({
  projectName: "course-mini-market", date: "2026-10-12",
  designWidth: 750, deviceRatio: { 640: 1.17, 750: 1, 828: 0.905 },
  sourceRoot: "src", outputRoot: `dist/${process.env.TARO_ENV || "weapp"}`,
  framework: "react", compiler: "webpack5", plugins: [],
  mini: {}, h5: { publicPath: "/", staticDirectory: "static" },
  defineConstants: { __DEMO__: "true" }
});
```

完整文件 `project.config.json`：

```json
{"miniprogramRoot":"./","projectname":"course-mini-market","appid":"touristappid","setting":{"es6":false,"minified":true},"compileType":"miniprogram"}
```

完整文件 `project.tt.json`：

```json
{"miniprogramRoot":"./","projectname":"course-mini-market-tt","appid":"","setting":{"es6":false,"minified":true}}
```

完整文件 `project.alipay.json`：

```json
{"appid":"","compileType":"mini","component2":true,"enableAppxNg":true}
```

Taro 读取这些源配置，各平台工具读取输出目录。游客/空 AppID 只便于构建，不证明
预览、登录或发布可用。输出中的平台实际配置文件名必须检查，不凭源文件名假设。

完整文件 `src/app.config.ts`：

```ts
export default defineAppConfig({
  pages: ["pages/home/index", "pages/detail/index", "pages/account/index"],
  subPackages: [{ root: "packages", pages: ["publish/index", "reservations/index"] }],
  window: { navigationBarTitleText: "邻里集市演示", backgroundTextStyle: "light" },
  permission: { "scope.userLocation": { desc: "仅用于选择附近区域，可手工输入" } },
  requiredPrivateInfos: ["getLocation"]
});
```

完整文件 `src/app.tsx`：

```tsx
import { PropsWithChildren } from "react";
import "./app.css";
export default function App({ children }: PropsWithChildren) { return children; }
```

完整文件 `src/app.css`：

```css
page { background: #fafafa; color: #222; font-size: 30px; }
.page { padding: 24px; padding-bottom: calc(32px + env(safe-area-inset-bottom)); }
.row { padding: 24px 0; border-bottom: 1px solid #ccc; }
.message { margin: 20px 0; color: #734600; overflow-wrap: break-word; }
input, textarea { background: #fff; padding: 16px; margin: 16px 0; border: 1px solid #ccc; }
button { margin: 16px 0; min-height: 88px; }
.photo { width: 180px; height: 180px; }
```

Taro 按 designWidth 将样式 px 转为平台尺寸，和原生直接写 rpx 不同；检查输出和真机，
避免在 JS 内按相同比例再换算一次。

完整文件 `src/platform.ts`：

```ts
import Taro from "@tarojs/taro";
import { RequestIO } from "./request";
import { StorageIO } from "./storage";
import { inspectImages } from "./upload-platform";
declare const wx: {
  requestSubscribeMessage(options: {
    tmplIds: string[];
    success(result: Record<string, unknown>): void;
    fail(result: { errMsg: string }): void;
  }): void;
};
export const platform = {
  name: process.env.TARO_ENV || "unknown",
  storage: {
    get: key => Taro.getStorageSync(key),
    set: (key, value) => Taro.setStorageSync(key, value),
    remove: key => Taro.removeStorageSync(key)
  } satisfies StorageIO,
  async loginCode(): Promise<string> {
    if (process.env.TARO_ENV === "alipay" || process.env.TARO_ENV === "h5")
      throw new Error("此适配练习尚未接平台授权码，不能假装已登录");
    const result = await Taro.login();
    if (!result.code) throw new Error("platform code missing");
    return result.code;
  },
  async chooseImages() {
    const result = await Taro.chooseImage({ count: 3, sizeType: ["compressed"], sourceType: ["album", "camera"] });
    const images = await inspectImages(result.tempFilePaths);
    return images.map(image => image.path);
  },
  async locate(): Promise<string> {
    if (process.env.TARO_ENV === "h5") throw new Error("H5 演示请手工输入区域");
    const result = await Taro.getLocation({ type: "gcj02" });
    return `${result.latitude.toFixed(2)},${result.longitude.toFixed(2)}`;
  },
  async subscribe(templateId: string): Promise<void> {
    if (process.env.TARO_ENV !== "weapp") throw new Error("当前平台订阅消息未适配，请在预约页查看");
    if (!templateId) throw new Error("需要已配置且用途匹配的模板 ID");
    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      wx.requestSubscribeMessage({ tmplIds: [templateId], success: resolve,
        fail: error => reject(new Error(error.errMsg)) });
    });
    if (result[templateId] !== "accept") throw new Error("未接受订阅，可继续查看预约");
  }
};
export const realTransport: RequestIO = {
  request(options) {
    const task = Taro.request({
      url: options.url, method: options.method, data: options.data as object,
      header: options.header, timeout: options.timeout,
      success: result => options.success({ statusCode: result.statusCode, data: result.data }),
      fail: result => options.fail({ errMsg: result.errMsg })
    });
    return { abort() { task.abort(); } };
  }
};
```

adapter 只接合法能力调用，不主动弹自制隐私同意窗。微信定位、相机和隐私相关声明需根据
实际调用配置后台与基础库；抖音/支付宝分别审核。未适配能力抛出可恢复错误，而非假成功。
微信订阅采用明确原生接口：Taro 4.3.0 的跨平台 Option 将 tmplIds/entityIds 同时列为必需，
不能为编译通过向微信传支付宝字段。返回值保持 unknown 并检查模板结果，不关闭 strict。

完整文件 `src/client.ts`：

```ts
import { createRequest, ApiError } from "./request";
import { createMockTransport } from "./mock-service";
import { platform } from "./platform";
import { createDraftStore } from "./storage";
import { object, text, utc, Listing, Reservation, parsePage, parseListing, parseReservation } from "./domain";
interface Session { token: string; userId: string; expiresAt: string }
interface Intent { listingId: string; version: number; key: string; state?: "rejected" }
let session: Session | undefined;
let epoch = 0;
let cleanupBlocked = false;
const pendingCleanup = new Set<string>();
let cleanupLoadError = "";
export const demo = createMockTransport();
const wire = createRequest(demo, "https://demo.example.invalid/api/v1");
export const drafts = createDraftStore(platform.storage);
const sessionKey = "market:session";
const cleanupKey = "market:cleanup";
function parseSession(value: unknown): Session {
  const x = object(value);
  return { token: text(x.token, "token"), userId: text(x.userId, "userId"), expiresAt: utc(x.expiresAt) };
}
try {
  const pending = platform.storage.get(cleanupKey);
  if (pending) {
    if (!Array.isArray(pending) || !pending.every(key => typeof key === "string" &&
      (key === sessionKey || /^market:(draft|favorites):.+$/.test(key))))
      throw new Error("待清理记录损坏，需人工核对原数据");
    pending.forEach(key => pendingCleanup.add(key));
    cleanupBlocked = true;
  }
  const stored = platform.storage.get(sessionKey);
  if (stored) {
    const parsed = parseSession(stored);
    // The in-memory demo service restarts too; stored identity is only a cleanup hint.
    pendingCleanup.add(sessionKey);
    pendingCleanup.add(`market:draft:${encodeURIComponent(parsed.userId)}`);
    pendingCleanup.add(`market:favorites:${parsed.userId}`);
    cleanupBlocked = true;
  }
} catch (error) { cleanupBlocked = true; cleanupLoadError = message(error); }
export function current() { return { session, epoch, cleanupBlocked }; }
export function message(error: unknown): string {
  if (error instanceof ApiError)
    return `${error.kind}/${error.status}/${error.code || error.message} ${error.requestId}`;
  return error instanceof Error ? error.message : "操作失败";
}
function localLogout() {
  const owner = session?.userId;
  session = undefined; epoch++;
  if (cleanupLoadError) throw new Error(`本机清理未确认：${cleanupLoadError}；不删除原数据`);
  const failures: string[] = [];
  if (owner) {
    pendingCleanup.add(sessionKey);
    pendingCleanup.add(`market:draft:${encodeURIComponent(owner)}`);
    pendingCleanup.add(`market:favorites:${owner}`);
  }
  cleanupBlocked = pendingCleanup.size > 0 || cleanupBlocked;
  try { platform.storage.set(cleanupKey, [...pendingCleanup]); }
  catch {
    // Keep the stored session/owner as a restart cleanup hint if journaling fails.
    return ["待清理记录保存失败；未删除原数据"];
  }
  for (const key of pendingCleanup) {
    try { platform.storage.remove(key); }
    catch { failures.push(key === sessionKey ? "会话" : "用户本地数据"); }
  }
  if (!failures.length) {
    try { platform.storage.remove(cleanupKey); pendingCleanup.clear(); cleanupBlocked = false; }
    catch { failures.push("待清理记录"); cleanupBlocked = true; }
  }
  return failures;
}
export async function api<T>(method: "GET" | "POST", path: string, data: unknown,
  parser: (value: unknown) => T, authenticated = false): Promise<T> {
  const started = epoch, token = session?.token ?? "";
  if (authenticated && (!session || Date.parse(session.expiresAt) <= Date.now()))
    throw new Error("请重新登录；本地草稿不自动提交");
  try {
    const value = await wire(method, path, data, parser, token).promise;
    if (authenticated && started !== epoch) throw new Error("会话已改变，请重新读取");
    return value;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && started === epoch) {
      const failures = localLogout();
      if (failures.length) throw new Error("认证失效；本机存储清理未确认，请重试退出清理");
    }
    throw error;
  }
}
export async function login(role: "buyer" | "seller") {
  if (cleanupBlocked) throw new Error("本机存储清理未确认，请重试退出清理；重启仍需确认清理");
  if (session) throw new Error("切换账号前请先退出");
  const started = ++epoch;
  const code = `demo-${role}-user1-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const value = await wire("POST", "/auth/exchange", { code }, parseSession).promise;
  if (started !== epoch) throw new Error("登录已失效");
  platform.storage.set(sessionKey, value); session = value;
}
export async function logout(): Promise<string> {
  const token = session?.token;
  const failures = localLogout();
  let result = token ? "服务端演示会话已撤销" : "本机清理重试；未发起服务端撤销";
  try {
    if (token) await wire("POST", "/auth/logout", {}, object, token).promise;
  } catch { result = "仅本机退出：服务端撤销未确认，离线恢复后需处理"; }
  if (failures.length) result += "；本机存储清理未确认，已禁止新登录，请重试退出清理；重启仍保持阻塞";
  return result;
}
export function list(q = "") {
  return api("GET", `/listings?q=${encodeURIComponent(q)}&page=1&pageSize=20`, {}, parsePage);
}
export function detail(id: string): Promise<Listing> {
  return api("GET", `/listings/${encodeURIComponent(id)}`, {}, parseListing);
}
export function reservations(): Promise<Reservation[]> {
  return api("GET", "/reservations", {}, value => {
    if (!Array.isArray(value)) throw new Error("reservations array");
    return value.map(parseReservation);
  }, true);
}
function intentKey(user: string, listingId: string) {
  return `market:intent:${encodeURIComponent(user)}:${encodeURIComponent(listingId)}`;
}
function readIntent(owner: string, listingId: string): Intent | undefined {
  const stored = platform.storage.get(intentKey(owner, listingId));
  if (!stored) return undefined;
  const x = object(stored);
  if (x.listingId !== listingId || typeof x.version !== "number" || !Number.isSafeInteger(x.version) ||
    x.version < 1 || (x.state !== undefined && x.state !== "rejected"))
    throw new Error("预约意图损坏，先人工核对，不创建新键");
  return { listingId, version: x.version, key: text(x.key, "key"),
    ...(x.state === "rejected" ? { state: "rejected" } : {}) };
}
export function hasRejectedIntent(listingId: string) {
  const owner = session?.userId;
  return !!owner && readIntent(owner, listingId)?.state === "rejected";
}
export function endRejectedIntent(listingId: string) {
  const owner = session?.userId;
  if (!owner || readIntent(owner, listingId)?.state !== "rejected")
    throw new Error("仅可结束确定拒绝的意图；未知结果必须同键恢复");
  platform.storage.remove(intentKey(owner, listingId));
}
export async function reserve(item: Listing): Promise<Reservation> {
  const started = epoch;
  const owner = session?.userId;
  if (!owner) throw new Error("请先登录");
  const storageKey = intentKey(owner, item.id);
  const stored = readIntent(owner, item.id);
  let intent: Intent;
  if (stored) {
    intent = stored;
    if (intent.state === "rejected") throw new Error("请先结束已拒绝意图，再显式开始新预约");
    try {
      const found = await api("GET", `/reservations/by-key/${encodeURIComponent(intent.key)}`,
        {}, parseReservation, true);
      platform.storage.remove(storageKey); return found;
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
    if (started !== epoch || owner !== session?.userId) throw new Error("会话已改变，原意图保持");
  } else {
    intent = { listingId: item.id, version: item.version,
      key: `intent-${Date.now()}-${Math.random().toString(36).slice(2)}` };
    platform.storage.set(storageKey, intent);
  }
  let result: Reservation;
  try {
    result = await api("POST", `/listings/${encodeURIComponent(intent.listingId)}/reservations`,
      { version: intent.version, key: intent.key }, parseReservation, true);
  } catch (error) {
    // Only these contract responses prove this command was rejected, not a transport timeout.
    if (!stored && started === epoch && owner === session?.userId && error instanceof ApiError &&
      error.kind === "http" && ((error.status === 409 && error.code === "LISTING_CONFLICT") ||
      (error.status === 403 && error.code === "SELF_RESERVATION") ||
      (error.status === 404 && error.code === "LISTING_NOT_FOUND"))) {
      platform.storage.set(storageKey, { ...intent, state: "rejected" });
    }
    throw error;
  }
  platform.storage.remove(storageKey);
  return result;
}
export function favoriteIds(): string[] {
  const owner = session?.userId;
  if (!owner) return [];
  const value = platform.storage.get(`market:favorites:${owner}`);
  if (!value) return [];
  if (!Array.isArray(value) || !value.every(x => typeof x === "string")) throw new Error("收藏损坏");
  return value;
}
export function toggleFavorite(id: string) {
  if (!session) throw new Error("请先登录以隔离本地收藏");
  const ids = favoriteIds();
  platform.storage.set(`market:favorites:${session.userId}`,
    ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
}
```

客户端会话可保存在平台私有 storage，但它不是 HttpOnly，也不能承载平台密钥。
demo 重启后旧业务 Token 不恢复为可用 session；旧 owner 仅供显式清理，不能自动假造服务端会话。
预约意图保留用于同一用户恢复；退出不自动删除未确定意图，也不在新用户命名空间读取它。

<a id="s7"></a>
## 7. 邻里集市集成案例

完整文件 `src/pages/home/index.tsx`：

```tsx
import { useRef, useState } from "react";
import Taro, { useDidShow, useDidHide } from "@tarojs/taro";
import { View, Text, Button, Input } from "@tarojs/components";
import { Listing } from "../../domain";
import { list, message, current, favoriteIds, toggleFavorite } from "../../client";
export default function Home() {
  const [items, setItems] = useState<Listing[]>([]), [q, setQ] = useState("");
  const [status, setStatus] = useState(""), [favorites, setFavorites] = useState<string[]>([]);
  const generation = useRef(0);
  const reload = async (query = q) => {
    const n = ++generation.current, ownerEpoch = current().epoch;
    setStatus("读取中");
    try {
      const page = await list(query);
      if (n !== generation.current || ownerEpoch !== current().epoch) return;
      setItems(page.items); setFavorites(favoriteIds()); setStatus(`${page.total} 件（演示）`);
    } catch (error) { if (n === generation.current) setStatus(message(error)); }
  };
  useDidShow(() => { void reload(); });
  useDidHide(() => { generation.current++; });
  return <View className="page">
    <Text>邻里集市，无支付，内存演示</Text>
    <Input value={q} placeholder="搜索商品" onInput={e => setQ(e.detail.value)} />
    <Button onClick={() => void reload()}>搜索</Button>
    <Button onClick={() => Taro.navigateTo({ url: "/pages/account/index" })}>账户与故障开关</Button>
    <Button onClick={() => Taro.navigateTo({ url: "/packages/publish/index" })}>发布草稿</Button>
    <Button onClick={() => Taro.navigateTo({ url: "/packages/reservations/index" })}>我的预约</Button>
    <View className="message">{status}</View>
    {items.map(item => <View className="row" key={item.id}>
      <Text onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${encodeURIComponent(item.id)}` })}>
        {item.title} / {(item.priceCents / 100).toFixed(2)} 元 / {item.status}
      </Text>
      <Button onClick={() => {
        try { toggleFavorite(item.id); setFavorites(favoriteIds()); }
        catch (error) { setStatus(message(error)); }
      }}>{favorites.includes(item.id) ? "取消收藏" : "收藏（本地）"}</Button>
    </View>)}
  </View>;
}
```

完整文件 `src/pages/detail/index.tsx`：

```tsx
import { useRef, useState } from "react";
import { useRouter, useDidShow, useDidHide, useShareAppMessage } from "@tarojs/taro";
import { View, Text, Button } from "@tarojs/components";
import { Listing } from "../../domain";
import { detail, reserve, message, current, hasRejectedIntent, endRejectedIntent } from "../../client";
export default function Detail() {
  const router = useRouter(), [item, setItem] = useState<Listing>();
  const [status, setStatus] = useState(""), [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const generation = useRef(0), submitting = useRef(false), refreshing = useRef(false);
  const id = router.params.id ?? "";
  const reload = async () => {
    const n = ++generation.current;
    refreshing.current = true; setReading(true); setItem(undefined);
    try {
      if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw new Error("商品 ID 无效");
      const value = await detail(id);
      if (n === generation.current) setItem(value);
    } catch (error) { if (n === generation.current) setStatus(message(error)); }
    finally { if (n === generation.current) { refreshing.current = false; setReading(false); } }
  };
  useDidShow(() => { void reload(); });
  useDidHide(() => { generation.current++; });
  useShareAppMessage(() => ({
    title: item?.title ?? "邻里集市",
    path: `/pages/detail/index?id=${encodeURIComponent(id)}`
  }));
  const submit = async () => {
    if (!item || submitting.current || refreshing.current) return;
    const started = current().epoch;
    submitting.current = true; setBusy(true); setStatus("预约处理中，尚未成功");
    try {
      const value = await reserve(item);
      if (started === current().epoch) setStatus(`演示预约 ${value.id}：${value.status}`);
    } catch (error) {
      if (started === current().epoch) setStatus(`${message(error)}；未知结果同键恢复；确定拒绝先结束意图`);
    } finally { submitting.current = false; setBusy(false); await reload(); }
  };
  return <View className="page">
    {item && <View><Text>{item.title}</Text><View>{item.description}</View>
      <View>{item.priceCents} 分 / {item.status} / v{item.version}</View></View>}
    <View className="message">{status}</View>
    <Button disabled={busy || reading || !item} onClick={() => void submit()}>预约或恢复原预约</Button>
    <Button disabled={busy || reading || !item} onClick={() => {
      if (submitting.current || refreshing.current) return;
      try {
        if (!hasRejectedIntent(id)) throw new Error("无确定拒绝的意图；未知结果不可结束");
        endRejectedIntent(id);
        setStatus("已结束拒绝意图；读取新版本后，请显式点击预约开始新意图");
        void reload();
      } catch (error) { setStatus(message(error)); }
    }}>结束已拒绝意图</Button>
    <Button openType="share">分享商品</Button>
    <Text>reserved/sold 的新预约由服务拒绝；恢复原键仍可查询。</Text>
  </View>;
}
```

完整文件 `src/pages/detail/index.config.ts`：

```ts
export default definePageConfig({ enableShareAppMessage: true });
```

必须重编译后验证对应平台分享冷启，hook 存在不表示目标平台分享配置已生效。

完整文件 `src/pages/account/index.tsx`：

```tsx
import { useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import { current, login, logout, demo, message } from "../../client";
import { platform } from "../../platform";
export default function Account() {
  const [status, setStatus] = useState(""), [busy, setBusy] = useState(false), [offline, setOffline] = useState(false);
  const action = async (job: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try { const result = await job(); setStatus(typeof result === "string" ? result : "演示登录完成"); }
    catch (error) { setStatus(message(error)); }
    finally { setBusy(false); }
  };
  return <View className="page">
    <Text>平台 {platform.name} / {current().session?.userId ?? "未登录"}</Text>
    <Button disabled={busy || !!current().session} onClick={() => void action(() => login("buyer"))}>演示买家登录</Button>
    <Button disabled={busy || !!current().session} onClick={() => void action(() => login("seller"))}>演示卖家登录</Button>
    <Button disabled={busy} onClick={() => void action(logout)}>退出并清理当前用户草稿</Button>
    <Button onClick={() => { demo.setOffline(!offline); setOffline(!offline); }}>
      {offline ? "恢复演示网络" : "模拟离线"}</Button>
    <Button onClick={() => { demo.dropNextReservation(); setStatus("下一次预约：服务已提交但响应丢失"); }}>
      注入预约响应丢失</Button>
    <View className="message">{status}</View>
    <Text>这些按钮不调用平台真实登录。真实登录接线见本篇 §12。</Text>
  </View>;
}
```

完整文件 `src/packages/publish/index.tsx`：

```tsx
import { useEffect, useRef, useState } from "react";
import { View, Text, Input, Textarea, Button, Image } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";
import { Draft } from "../../storage";
import { cents, object, text, integer, parseListing } from "../../domain";
import { api, current, drafts, message } from "../../client";
import { platform } from "../../platform";
const blank: Draft = { schema: 2, title: "", description: "", priceText: "", imagePaths: [] };
interface Receipt { id: string; cleaned: boolean }
interface Payload { title: string; description: string; priceCents: number }
interface PublishHolder {
  state: "pending" | "unknown" | "published"; payload?: Payload;
  receipt?: Receipt; durable: boolean; error: string;
}
// One draft slot per owner; never evict in-flight or non-durable success knowledge.
const holders = new Map<string, PublishHolder>();
const listeners = new Set<(owner: string) => void>();
const receiptKey = (owner: string) => `market:published:${encodeURIComponent(owner)}`;
const operationKey = (owner: string) => `market:publishing:${encodeURIComponent(owner)}`;
function remember(owner: string, holder: PublishHolder) {
  if (!holders.has(owner) && holders.size >= 16) {
    const evictable = [...holders].find(([, value]) => value.state !== "pending" && value.durable);
    if (!evictable) throw new Error("发布本地记忆已满；先核对在途结果，不创建新命令");
    holders.delete(evictable[0]);
  }
  holders.set(owner, holder);
}
function notify(owner: string) { listeners.forEach(listener => listener(owner)); }
function readPublish(owner: string): PublishHolder | undefined {
  const remembered = holders.get(owner);
  if (remembered) return remembered;
  const stored = platform.storage.get(receiptKey(owner));
  let holder: PublishHolder;
  if (stored) {
    const x = object(stored);
    if (typeof x.cleaned !== "boolean") throw new Error("发布回执损坏，先人工核对，不重新发布");
    holder = { state: "published", receipt: { id: text(x.id, "publishedId"), cleaned: x.cleaned },
      durable: true, error: "" };
  } else {
    const marker = platform.storage.get(operationKey(owner));
    if (!marker) return undefined;
    const x = object(marker);
    if (x.schema !== 1 || x.state !== "unknown") throw new Error("发布操作标记损坏，先人工核对");
    const p = object(x.payload);
    holder = { state: "unknown", payload: { title: text(p.title, "title"),
      description: text(p.description, "description", true), priceCents: integer(p.priceCents, "priceCents") },
      durable: true, error: "" };
  }
  remember(owner, holder); return holder;
}
function keepReceipt(owner: string, receipt: Receipt) {
  platform.storage.set(receiptKey(owner), receipt);
  const holder = holders.get(owner)!;
  holder.receipt = receipt; holder.state = "published"; holder.durable = true; holder.error = "";
}
export default function Publish() {
  const [draft, setDraft] = useState<Draft>(blank), [status, setStatus] = useState("");
  const [region, setRegion] = useState(""), [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt>();
  const [operation, setOperation] = useState<"pending" | "unknown">();
  const [readBlocked, setReadBlocked] = useState(false), readBlockedRef = useRef(false);
  const latest = useRef(draft), receiptRef = useRef<Receipt>();
  const editingEpoch = useRef(-1), imageGeneration = useRef(0), submitting = useRef(false);
  const replaceDraft = (next: Draft) => { latest.current = next; setDraft(next); };
  const replaceReceipt = (next?: Receipt) => { receiptRef.current = next; setReceipt(next); };
  const showHolder = (holder?: PublishHolder) => {
    replaceReceipt(holder?.receipt);
    setOperation(holder && holder.state !== "published" ? holder.state : undefined);
    if (holder?.receipt) setStatus(`演示已发布 ${holder.receipt.id}；${holder.receipt.cleaned
      ? "本地草稿已清理，可显式开始下一份" : "本地清理未确认，请仅重试清理"}；${holder.error}；图片未上传`);
    else if (holder) setStatus(holder.state === "pending" ? "发布在途，尚未取得回执；不可新建命令"
      : `发布结果未知：${holder.error}；保留原操作标记，需人工核对，不重新 POST`);
  };
  useEffect(() => {
    const changed = (owner: string) => {
      const now = current();
      if (now.session?.userId === owner && editingEpoch.current === now.epoch)
        showHolder(holders.get(owner));
    };
    listeners.add(changed);
    return () => { listeners.delete(changed); imageGeneration.current++; editingEpoch.current = -1; };
  }, []);
  const loadDraft = () => {
    const now = current();
    if (editingEpoch.current === now.epoch) return;
    editingEpoch.current = now.epoch; imageGeneration.current++;
    submitting.current = false; setBusy(false);
    replaceDraft(blank); showHolder(); setRegion(""); setStatus("");
    readBlockedRef.current = false; setReadBlocked(false);
    try {
      const user = now.session?.userId;
      const holder = user ? readPublish(user) : undefined;
      showHolder(holder);
      replaceDraft(user && !holder?.receipt?.cleaned ? drafts.read(user) ?? blank : blank);
    }
    catch (error) {
      readBlockedRef.current = true; setReadBlocked(true);
      setStatus(`草稿读取失败：${message(error)}；未删除原数据，请修复后重新读取`);
    }
  };
  useDidShow(loadDraft);
  const save = (next = latest.current) => {
    const user = current().session?.userId;
    if (!user) throw new Error("请先登录；不写匿名共享草稿");
    if (readBlockedRef.current) throw new Error("草稿或回执读取未确认，不覆盖原数据");
    if (editingEpoch.current !== current().epoch || receiptRef.current || readPublish(user))
      throw new Error("请重新读取当前会话；已发布回执不可再次提交");
    drafts.save(user, next); replaceDraft(next); setStatus("已保存本地草稿，不是已发布");
  };
  const photos = async () => {
    const started = current().epoch, n = ++imageGeneration.current;
    if (submitting.current || receiptRef.current || readBlockedRef.current ||
      holders.has(current().session?.userId ?? "")) return;
    try {
      const paths = await platform.chooseImages();
      if (started !== current().epoch || started !== editingEpoch.current ||
        n !== imageGeneration.current || receiptRef.current ||
        holders.has(current().session?.userId ?? "")) return;
      save({ ...latest.current, imagePaths: paths });
      setStatus("临时图片已选；重启可能失效，发布 demo 不上传图片");
    } catch (error) {
      if (started === current().epoch && n === imageGeneration.current)
        setStatus(`选择取消或失败：${message(error)}`);
    }
  };
  const cleanupPublished = () => {
    const owner = current().session?.userId, known = receiptRef.current;
    if (!owner || editingEpoch.current !== current().epoch || !known) return;
    try {
      keepReceipt(owner, known);
      drafts.clear(owner);
      const cleaned = { ...known, cleaned: true };
      keepReceipt(owner, cleaned); replaceReceipt(cleaned); replaceDraft(blank);
      notify(owner);
      setStatus(`演示已发布 ${known.id}；本地草稿已清理；图片未上传`);
    } catch (error) {
      setStatus(`演示已发布 ${known.id}；本地清理未确认：${message(error)}；仅重试清理，不再 POST`);
    }
  };
  const publish = async () => {
    if (submitting.current || receiptRef.current || readBlockedRef.current) return;
    const started = current(), owner = started.session?.userId;
    let holder: PublishHolder | undefined;
    submitting.current = true; setBusy(true); imageGeneration.current++;
    try {
      if (!owner) throw new Error("请先登录");
      if (readPublish(owner)) return;
      save();
      const snapshot = latest.current;
      if (!snapshot.title.trim() || snapshot.title.length > 80) throw new Error("标题 1–80 字");
      const payload = { title: snapshot.title.trim(), description: snapshot.description,
        priceCents: cents(snapshot.priceText) };
      const candidate: PublishHolder = { state: "pending", payload, durable: false, error: "" };
      remember(owner, candidate); holder = candidate;
      try { platform.storage.set(operationKey(owner), { schema: 1, state: "unknown", payload }); }
      catch (error) { holders.delete(owner); holder = undefined; throw error; }
      notify(owner);
      const captured = holder;
      await api("POST", "/listings", payload, value => {
        const item = parseListing(value);
        // Persist parsed success for the captured owner before api's session/UI guard.
        captured.receipt = { id: item.id, cleaned: false }; captured.state = "published";
        try { keepReceipt(owner, captured.receipt); }
        catch (error) { captured.error = `回执持久保存未确认：${message(error)}`; }
        notify(owner);
        return item;
      }, true);
      if (started.epoch === current().epoch && editingEpoch.current === started.epoch) {
        cleanupPublished();
      }
    } catch (error) {
      if (holder && owner && !holder.receipt) {
        holder.state = "unknown"; holder.durable = true; holder.error = message(error); notify(owner);
      } else if (!holder && started.epoch === current().epoch && editingEpoch.current === started.epoch)
        setStatus(`${message(error)}；未取得发布回执，保留草稿；未知结果需人工核对，不自动重试`);
    } finally {
      if (started.epoch === current().epoch && editingEpoch.current === started.epoch) {
        submitting.current = false; setBusy(false);
      }
    }
  };
  const locked = busy || !!receipt || !!operation || readBlocked;
  return <View className="page">
    <Text>发布草稿（离线仅可保存）</Text>
    <Input disabled={locked} value={draft.title} placeholder="标题" maxlength={80}
      onInput={e => replaceDraft({ ...latest.current, title: e.detail.value })} />
    <Textarea disabled={locked} value={draft.description} placeholder="描述" maxlength={1000}
      onInput={e => replaceDraft({ ...latest.current, description: e.detail.value })} />
    <Input disabled={locked} value={draft.priceText} placeholder="金额：元，如 12.30"
      onInput={e => replaceDraft({ ...latest.current, priceText: e.detail.value })} />
    <Input value={region} placeholder="可手工输入区域；不上传精确坐标"
      onInput={e => setRegion(e.detail.value)} />
    <Button onClick={() => {
      void platform.locate().then(setRegion).catch(error => setStatus(`${message(error)}；请手工输入区域`));
    }}>使用时请求位置（可拒绝）</Button>
    <Button disabled={locked} onClick={() => void photos()}>选择临时图片</Button>
    {draft.imagePaths.map(path => <Image key={path} src={path} className="photo" mode="aspectFit" />)}
    <Button disabled={locked} onClick={() => { try { save(); } catch (error) { setStatus(message(error)); } }}>保存本地草稿</Button>
    <Button disabled={locked} onClick={() => void publish()}>发布演示商品（无图片上传）</Button>
    {readBlocked && <Button onClick={() => { editingEpoch.current = -1; loadDraft(); }}>
      重读草稿与回执</Button>}
    {operation === "unknown" && <Button onClick={() => {
      setStatus("请以原账号在服务端商品记录/运营支持中核对原标题、金额与提交时间；"
        + "取得权威商品 ID 后修复原 owner 回执，或经业务恢复确认未创建后清除原操作标记；不重新 POST");
    }}>查看发布人工核对说明</Button>}
    {receipt && !receipt.cleaned && <Button onClick={cleanupPublished}>重试已发布草稿清理</Button>}
    {receipt?.cleaned && <Button onClick={() => {
      try {
        const owner = current().session?.userId;
        if (!owner || editingEpoch.current !== current().epoch) throw new Error("请重新读取当前会话");
        platform.storage.remove(operationKey(owner));
        platform.storage.remove(receiptKey(owner)); holders.delete(owner); notify(owner);
        showHolder(); replaceDraft(blank); setStatus("已开始下一份草稿；尚未发布");
      } catch (error) { setStatus(message(error)); }
    }}>开始下一份草稿</Button>}
    <View className="message">{status}</View>
  </View>;
}
```

完整文件 `src/packages/reservations/index.tsx`：

```tsx
import { useRef, useState } from "react";
import { useDidShow, useDidHide } from "@tarojs/taro";
import { View, Text, Button, Input } from "@tarojs/components";
import { Reservation, parseReservation } from "../../domain";
import { api, reservations, current, message } from "../../client";
import { platform } from "../../platform";
import { ReservationLabel } from "../../components/ReservationLabel";
export default function Reservations() {
  const [items, setItems] = useState<Reservation[]>([]), [status, setStatus] = useState("");
  const [templateId, setTemplateId] = useState(""), [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const reload = async () => {
    const n = ++generation.current;
    try { const result = await reservations(); if (n === generation.current) setItems(result); }
    catch (error) { if (n === generation.current) { setItems([]); setStatus(message(error)); } }
  };
  useDidShow(() => { void reload(); });
  useDidHide(() => { generation.current++; });
  const transition = async (id: string, next: string) => {
    if (busy) return;
    const started = current().epoch;
    setBusy(true);
    try {
      const result = await api("POST", `/reservations/${id}/${next}`, {}, parseReservation, true);
      if (started === current().epoch) setStatus(`演示 ${result.status}`);
    } catch (error) { if (started === current().epoch) setStatus(message(error)); }
    finally { setBusy(false); await reload(); }
  };
  const owner = current().session?.userId;
  return <View className="page">
    <Text>订阅只通知，页面始终重新读取状态</Text>
    <Input value={templateId} placeholder="微信真实模板 ID（可不填）"
      onInput={e => setTemplateId(e.detail.value)} />
    <Button onClick={() => {
      void platform.subscribe(templateId).then(() => setStatus("已接受通知授权，非预约成功"))
        .catch(error => setStatus(message(error)));
    }}>使用时申请订阅（可拒绝）</Button>
    <Button onClick={() => void reload()}>读取权威演示状态</Button>
    <View className="message">{status}</View>
    {items.map(r => <View className="row" key={r.id}>
      <Text>{r.id} / <ReservationLabel item={r} /> / {r.createdAt}</Text>
      {r.status === "pending" && owner === r.sellerId &&
        <Button disabled={busy} onClick={() => void transition(r.id, "confirm")}>卖家确认（同时售出，无支付）</Button>}
      {r.status === "pending" &&
        <Button disabled={busy} onClick={() => void transition(r.id, "cancel")}>取消</Button>}
    </View>)}
  </View>;
}
```

完整文件 `src/components/ReservationLabel.tsx`：

```tsx
import { Reservation } from "../domain";
export function ReservationLabel({ item, loading = false }: { item?: Reservation; loading?: boolean }) {
  if (loading) return <>读取中，尚未取得权威状态</>;
  if (!item) return <>暂无可访问预约</>;
  switch (item.status) {
    case "pending": return <>待卖家确认（无支付）</>;
    case "confirmed": return <>卖家已确认，商品售出（无支付）</>;
    case "cancelled": return <>预约已取消</>;
  }
}
```

完整文件 `tests/view.test.tsx`：

```tsx
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ReservationLabel } from "../src/components/ReservationLabel";
import { Reservation } from "../src/domain";
const item: Reservation = { id: "r1", listingId: "l1", buyerId: "a", sellerId: "b",
  key: "k", status: "pending", version: 1, createdAt: "2026-10-12T00:00:00.000Z" };
test("actual React component renders distinct authoritative states", () => {
  assert.equal(renderToStaticMarkup(<ReservationLabel item={item} />), "待卖家确认（无支付）");
  assert.match(renderToStaticMarkup(<ReservationLabel item={{ ...item, status: "confirmed" }} />), /商品售出/);
  assert.equal(renderToStaticMarkup(<ReservationLabel item={{ ...item, status: "cancelled" }} />), "预约已取消");
});
test("loading and inaccessible state never imply business success", () => {
  assert.match(renderToStaticMarkup(<ReservationLabel item={item} loading />), /尚未取得/);
  assert.equal(renderToStaticMarkup(<ReservationLabel />), "暂无可访问预约");
});
```

完整文件 `tests/client.test.ts`：

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { RequestOptions } from "../src/request";
interface FixtureIO {
  map: Map<string, unknown>; failedKey: string; removed: string[];
}
async function fixture() {
  const root = await mkdtemp(join(process.cwd(), ".client-fixture-"));
  for (const file of ["domain.ts", "request.ts", "storage.ts", "mock-service.ts", "client.ts"])
    await writeFile(join(root, file), await readFile(join(process.cwd(), "src", file)));
  await writeFile(join(root, "platform.ts"), `
export const fixtureIO = { map: new Map<string, unknown>(), failedKey: "", removed: [] as string[] };
export const platform = { storage: {
  get: (key: string) => fixtureIO.map.get(key),
  set: (key: string, value: unknown) => { fixtureIO.map.set(key, value); },
  remove: (key: string) => {
    fixtureIO.removed.push(key);
    if (key === fixtureIO.failedKey) throw new Error("fixture storage failure");
    fixtureIO.map.delete(key);
  }
} };
`);
  const client = await import(pathToFileURL(join(root, "client.ts")).href) as typeof import("../src/client");
  const adapter = await import(pathToFileURL(join(root, "platform.ts")).href) as { fixtureIO: FixtureIO };
  return { client, io: adapter.fixtureIO, close: () => rm(root, { recursive: true, force: true }) };
}
test("logout invalidates immediately even when transport remains pending", async () => {
  const f = await fixture();
  try {
    await f.client.login("buyer");
    let pending: RequestOptions | undefined;
    f.client.demo.request = options => { pending = options; return { abort() {} }; };
    const leaving = f.client.logout();
    assert.equal(f.client.current().session, undefined);
    pending!.fail({ errMsg: "offline" });
    assert.match(await leaving, /撤销未确认/);
  } finally { await f.close(); }
});
test("cleanup attempts each key and blocks login if local removal fails", async () => {
  const f = await fixture();
  try {
    await f.client.login("buyer");
    f.io.failedKey = "market:session";
    assert.match(await f.client.logout(), /存储清理未确认/);
    assert.equal(f.client.current().session, undefined);
    assert.equal(f.io.removed.length, 3);
    await assert.rejects(f.client.login("seller"), /清理未确认/);
  } finally { await f.close(); }
});
test("recovery 404 from old session cannot submit using new account", async () => {
  const f = await fixture();
  try {
    await f.client.login("buyer");
    const item = await f.client.detail("lamp-1"), owner = f.client.current().session!.userId;
    f.io.map.set(`market:intent:${encodeURIComponent(owner)}:lamp-1`,
      { listingId: "lamp-1", version: 1, key: "original" });
    const original = f.client.demo.request;
    let oldQuery: RequestOptions | undefined, posts = 0;
    f.client.demo.request = options => {
      if (options.url.includes("/reservations/by-key/")) {
        oldQuery = options; return { abort() {} };
      }
      if (/\/listings\/.*\/reservations$/.test(options.url)) posts++;
      return original(options);
    };
    const recovery = f.client.reserve(item);
    const rejection = assert.rejects(recovery, /会话已改变/);
    await f.client.logout(); await f.client.login("seller");
    oldQuery!.success({ statusCode: 404, data: { code: "INTENT_NOT_FOUND", requestId: "fixture" } });
    await rejection;
    assert.equal(posts, 0);
    assert.ok(f.io.map.has(`market:intent:${encodeURIComponent(owner)}:lamp-1`));
  } finally { await f.close(); }
});
```

完整文件 `tests/fixture.ts`：

```ts
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
export interface FixtureIO {
  map: Map<string, unknown>; failedKey: string; failedSetKey: string; removed: string[];
  chooseImages: () => Promise<string[]>;
}
export async function fixture(seed: [string, unknown][] = []) {
  const root = await mkdtemp(join(process.cwd(), ".client-fixture-"));
  await writeFile(join(root, "tsconfig.json"), await readFile(join(process.cwd(), "tsconfig.json")));
  for (const file of ["domain.ts", "request.ts", "storage.ts", "mock-service.ts", "client.ts",
    "packages/publish/index.tsx", "pages/detail/index.tsx"]) {
    const target = join(root, file);
    await mkdir(dirname(target), { recursive: true });
    const source = await readFile(join(process.cwd(), "src", file), "utf8");
    const compiled = file.endsWith(".tsx") ? ts.transpileModule(source, {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020 }
    }).outputText : source;
    await writeFile(target, compiled.split('"@tarojs/taro"').join('"../../taro-fixture"')
      .split('"@tarojs/components"').join('"../../components-fixture"'));
  }
  await writeFile(join(root, "platform.ts"), `
export const fixtureIO = {
  map: new Map<string, unknown>(${JSON.stringify(seed)}), failedKey: "", failedSetKey: "",
  removed: [] as string[], chooseImages: async () => [] as string[]
};
export const platform = { chooseImages: () => fixtureIO.chooseImages(), storage: {
  get: (key: string) => fixtureIO.map.get(key),
  set: (key: string, value: unknown) => {
    if (key === fixtureIO.failedSetKey) throw new Error("fixture write failure");
    fixtureIO.map.set(key, value);
  },
  remove: (key: string) => {
    fixtureIO.removed.push(key);
    if (key === fixtureIO.failedKey) throw new Error("fixture storage failure");
    fixtureIO.map.delete(key);
  }
} };
`);
  await writeFile(join(root, "taro-fixture.ts"), `
export const hooks = { show: () => {}, hide: () => {} };
export const useDidShow = (callback: () => void) => { hooks.show = callback; };
export const useDidHide = (callback: () => void) => { hooks.hide = callback; };
export const useRouter = () => ({ params: { id: "lamp-1" } });
export const useShareAppMessage = (_callback: unknown) => {};
`);
  await writeFile(join(root, "components-fixture.ts"), `
export const View = "view", Text = "text", Button = "button", Input = "input";
export const Textarea = "textarea", Image = "image";
`);
  const load = (file: string) => import(pathToFileURL(join(root, file)).href);
  const client = await load("client.ts") as typeof import("../src/client");
  const adapter = await load("platform.ts") as { fixtureIO: FixtureIO };
  const taro = await load("taro-fixture.ts") as { hooks: { show(): void; hide(): void } };
  return { client, io: adapter.fixtureIO, hooks: taro.hooks,
    publishPage: async () => (await load("packages/publish/index.tsx") as
      typeof import("../src/packages/publish/index")).default,
    detailPage: async () => (await load("pages/detail/index.tsx") as
      typeof import("../src/pages/detail/index")).default,
    close: () => rm(root, { recursive: true, force: true }) };
}
```

完整文件 `tests/recovery.test.tsx`：

```tsx
import { test } from "node:test";
import assert from "node:assert/strict";
import { create, act, ReactTestRenderer } from "react-test-renderer";
import { fixture } from "./fixture";
import { Draft } from "../src/storage";
import { createRequest, RequestOptions } from "../src/request";
import { object, parseReservation } from "../src/domain";
const saved: Draft = { schema: 2, title: "saved", description: "original",
  priceText: "12.00", imagePaths: [] };
function button(view: ReactTestRenderer, label: string) {
  return view.root.findAllByType("button").find(node => node.children.join("") === label)!;
}
async function click(view: ReactTestRenderer, label: string) {
  const node = button(view, label);
  assert.ok(node, `button ${label}`);
  assert.notEqual(node.props.disabled, true);
  await act(async () => { node.props.onClick(); });
}
function input(view: ReactTestRenderer, placeholder: string, value: string) {
  act(() => {
    view.root.findAllByType("input").find(node => node.props.placeholder === placeholder)!
      .props.onInput({ detail: { value } });
  });
}
function visible(view: ReactTestRenderer) { return JSON.stringify(view.toJSON()); }
test("published receipt survives cleanup failure; retry only removes draft", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("seller");
    const owner = f.client.current().session!.userId;
    f.client.drafts.save(owner, saved);
    const Page = await f.publishPage();
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    let posts = 0;
    const original = f.client.demo.request;
    f.client.demo.request = options => {
      if (options.method === "POST" && options.url.endsWith("/listings")) posts++;
      return original(options);
    };
    f.io.failedKey = `market:draft:${encodeURIComponent(owner)}`;
    await click(view!, "发布演示商品（无图片上传）");
    assert.match(visible(view!), /演示已发布 listing-/);
    assert.match(visible(view!), /清理未确认/);
    const publishButton = button(view!, "发布演示商品（无图片上传）");
    assert.equal(publishButton.props.disabled, true);
    await act(async () => { publishButton.props.onClick(); });
    await click(view!, "重试已发布草稿清理");
    assert.equal(posts, 1);
    f.io.failedKey = "";
    await click(view!, "重试已发布草稿清理");
    assert.equal(f.client.drafts.read(owner), undefined);
    assert.equal(posts, 1);
    assert.match(visible(view!), /演示已发布 listing-/);
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
test("same-session show preserves unsaved edits, identity change reloads", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("seller");
    f.client.drafts.save("seller", saved);
    const Page = await f.publishPage();
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    input(view!, "标题", "unsaved-new-title");
    act(() => { f.hooks.show(); });
    assert.equal(view!.root.findAllByType("input")[0].props.value, "unsaved-new-title");
    assert.equal(f.client.drafts.read("seller")!.title, "saved");
    await f.client.logout(); await f.client.login("buyer");
    act(() => { f.hooks.show(); });
    assert.equal(view!.root.findAllByType("input")[0].props.value, "");
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
test("image await merges latest edits and latest image selection wins", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("seller");
    f.client.drafts.save("seller", saved);
    const Page = await f.publishPage();
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    const complete: ((paths: string[]) => void)[] = [];
    f.io.chooseImages = () => new Promise(resolve => { complete.push(resolve); });
    await click(view!, "选择临时图片");
    input(view!, "标题", "new-during-picker");
    await act(async () => { complete[0](["first.png"]); });
    assert.equal(f.client.drafts.read("seller")!.title, "new-during-picker");
    await click(view!, "选择临时图片");
    await click(view!, "选择临时图片");
    await act(async () => { complete[2](["latest.png"]); });
    await act(async () => { complete[1](["stale.png"]); });
    assert.deepEqual(f.client.drafts.read("seller")!.imagePaths, ["latest.png"]);
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
test("old-session image completion cannot write new-user draft or status", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("seller");
    f.client.drafts.save("seller", saved);
    const Page = await f.publishPage();
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    let complete!: (paths: string[]) => void;
    f.io.chooseImages = () => new Promise(resolve => { complete = resolve; });
    await click(view!, "选择临时图片");
    await f.client.logout(); await f.client.login("buyer");
    act(() => { f.hooks.show(); });
    const before = visible(view!);
    await act(async () => { complete(["old.png"]); });
    assert.equal(visible(view!), before);
    assert.equal(f.client.drafts.read(f.client.current().session!.userId), undefined);
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
test("second logout keeps failed owner key blocked; restart retains cleanup", async () => {
  const f = await fixture();
  try {
    await f.client.login("seller"); f.client.drafts.save("seller", saved);
    f.io.failedKey = "market:draft:seller";
    await f.client.logout(); await f.client.logout();
    assert.equal(f.client.current().cleanupBlocked, true);
    await assert.rejects(f.client.login("buyer"), /清理未确认/);
    assert.equal(f.io.removed.filter(key => key === f.io.failedKey).length, 2);
    const restart = await fixture([...f.io.map]);
    try {
      assert.equal(restart.client.current().cleanupBlocked, true);
      await assert.rejects(restart.client.login("buyer"), /清理未确认/);
      await restart.client.logout();
      assert.equal(restart.io.map.has("market:draft:seller"), false);
      assert.equal(restart.client.current().cleanupBlocked, false);
      await restart.client.login("buyer");
    } finally { await restart.close(); }
  } finally { await f.close(); }
});
test("definite conflict requires ending rejected intent before explicit fresh begin", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("buyer");
    const send = createRequest(f.client.demo, "https://demo.invalid/api/v1");
    const auth = await send("POST", "/auth/exchange", { code: "demo-buyer-other" }, object).promise;
    const token = auth.token as string;
    const other = await send("POST", "/listings/lamp-1/reservations",
      { version: 1, key: "other-key" }, parseReservation, token).promise;
    const Page = await f.detailPage();
    act(() => { view = create(<Page />); });
    await act(async () => { f.hooks.show(); });
    await click(view!, "预约或恢复原预约");
    const owner = f.client.current().session!.userId;
    const key = `market:intent:${encodeURIComponent(owner)}:lamp-1`;
    const intent = f.io.map.get(key) as { key: string; version: number; state?: string };
    assert.equal(intent.version, 2);
    assert.equal(intent.state, "rejected");
    await send("POST", `/reservations/${other.id}/cancel`, {}, parseReservation, token).promise;
    act(() => { f.hooks.show(); });
    await act(async () => {});
    let posts = 0;
    const original = f.client.demo.request;
    f.client.demo.request = options => {
      if (options.method === "POST" && options.url.endsWith("/reservations")) posts++;
      return original(options);
    };
    await assert.rejects(f.client.reserve(await f.client.detail("lamp-1")), /结束已拒绝意图/);
    assert.equal(posts, 0);
    await click(view!, "结束已拒绝意图");
    assert.equal(f.io.map.has(key), false);
    assert.equal(posts, 0);
    await click(view!, "预约或恢复原预约");
    assert.equal(posts, 1);
    const mine = (await f.client.reservations())[0];
    assert.notEqual(mine.key, intent.key);
    assert.equal(mine.status, "pending");
    assert.equal((await f.client.detail("lamp-1")).version, 4);
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
test("unknown outcome preserves payload; query 404 never creates fresh key", async () => {
  const f = await fixture();
  try {
    await f.client.login("buyer");
    const item = await f.client.detail("lamp-1");
    f.client.demo.setOffline(true);
    await assert.rejects(f.client.reserve(item), /offline/);
    const owner = f.client.current().session!.userId;
    const key = `market:intent:${encodeURIComponent(owner)}:lamp-1`;
    const first = f.io.map.get(key);
    f.client.demo.setOffline(false);
    const result = await f.client.reserve(item);
    assert.equal(result.key, (first as { key: string }).key);
    assert.equal(f.io.map.has(key), false);
  } finally { await f.close(); }
});
test("unknown intent cannot be ended and malformed HTTP rejection stays unknown", async () => {
  const f = await fixture();
  try {
    await f.client.login("buyer");
    const item = await f.client.detail("lamp-1");
    const original = f.client.demo.request;
    let posts = 0;
    f.client.demo.request = options => {
      if (options.method === "POST" && options.url.endsWith("/reservations")) {
        posts++; options.success({ statusCode: 409, data: { unexpected: true } });
        return { abort() {} };
      }
      return original(options);
    };
    await assert.rejects(f.client.reserve(item), /HTTP 409/);
    const owner = f.client.current().session!.userId;
    const key = `market:intent:${encodeURIComponent(owner)}:lamp-1`;
    const stored = f.io.map.get(key);
    assert.equal(f.client.hasRejectedIntent(item.id), false);
    assert.throws(() => f.client.endRejectedIntent(item.id), /未知结果必须同键恢复/);
    assert.deepEqual(f.io.map.get(key), stored);
    assert.equal(posts, 1);
  } finally { await f.close(); }
});
test("unknown original POST stays same-key when recovery replay returns contract conflict", async () => {
  const f = await fixture();
  try {
    await f.client.login("buyer");
    const item = await f.client.detail("lamp-1");
    const original = f.client.demo.request;
    let posts = 0;
    const payloads: unknown[] = [];
    f.client.demo.request = options => {
      if (options.method === "POST" && options.url.endsWith("/reservations")) {
        posts++; payloads.push(options.data);
        if (posts === 1) options.fail({ errMsg: "unknown first write" });
        else options.success({ statusCode: 409, data: { code: "LISTING_CONFLICT", requestId: "fixture" } });
        return { abort() {} };
      }
      return original(options);
    };
    await assert.rejects(f.client.reserve(item), /unknown first write/);
    await assert.rejects(f.client.reserve(item), /HTTP 409/);
    assert.deepEqual(payloads[1], payloads[0]);
    assert.equal(f.client.hasRejectedIntent(item.id), false);
    assert.throws(() => f.client.endRejectedIntent(item.id), /未知结果必须同键恢复/);
  } finally { await f.close(); }
});
test("cleanup journal write failure preserves owner data and restart recovery hint", async () => {
  const f = await fixture();
  try {
    await f.client.login("seller"); f.client.drafts.save("seller", saved);
    f.io.failedSetKey = "market:cleanup";
    assert.match(await f.client.logout(), /清理未确认/);
    assert.equal(f.client.current().session, undefined);
    assert.equal(f.client.current().cleanupBlocked, true);
    assert.deepEqual(f.io.removed, []);
    const restart = await fixture([...f.io.map]);
    try {
      assert.equal(restart.client.current().session, undefined);
      assert.equal(restart.client.current().cleanupBlocked, true);
      assert.deepEqual(restart.client.drafts.read("seller"), saved);
      await restart.client.logout();
      assert.equal(restart.client.current().cleanupBlocked, false);
      assert.equal(restart.client.drafts.read("seller"), undefined);
    } finally { await restart.close(); }
  } finally { await f.close(); }
});
test("known publish receipt survives page remount before failed cleanup is retried", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("seller"); f.client.drafts.save("seller", saved);
    const Page = await f.publishPage();
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    let posts = 0;
    const original = f.client.demo.request;
    f.client.demo.request = options => {
      if (options.method === "POST" && options.url.endsWith("/listings")) posts++;
      return original(options);
    };
    f.io.failedKey = "market:draft:seller";
    await click(view!, "发布演示商品（无图片上传）");
    act(() => { view!.unmount(); view = create(<Page />); });
    act(() => { f.hooks.show(); });
    assert.match(visible(view!), /演示已发布 listing-/);
    assert.equal(button(view!, "发布演示商品（无图片上传）").props.disabled, true);
    f.io.failedKey = "";
    await click(view!, "重试已发布草稿清理");
    assert.equal(posts, 1);
    await click(view!, "开始下一份草稿");
    assert.equal(button(view!, "发布演示商品（无图片上传）").props.disabled, false);
    assert.equal(f.io.map.has("market:published:seller"), false);
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
test("corrupt receipt fails closed instead of replacing original draft with blank", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("seller"); f.client.drafts.save("seller", saved);
    f.io.map.set("market:published:seller", { id: "", cleaned: "bad" });
    const Page = await f.publishPage();
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    assert.match(visible(view!), /回执损坏/);
    await act(async () => {
      button(view!, "发布演示商品（无图片上传）").props.onClick();
    });
    assert.deepEqual(f.client.drafts.read("seller"), saved);
    assert.equal(button(view!, "发布演示商品（无图片上传）").props.disabled, true);
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
test("ending rejection blocks fresh begin until new authoritative detail arrives", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("buyer");
    const owner = f.client.current().session!.userId;
    f.io.map.set(`market:intent:${encodeURIComponent(owner)}:lamp-1`,
      { listingId: "lamp-1", version: 1, key: "rejected", state: "rejected" });
    const Page = await f.detailPage();
    act(() => { view = create(<Page />); });
    await act(async () => { f.hooks.show(); });
    const original = f.client.demo.request;
    let pending!: RequestOptions, posts = 0;
    f.client.demo.request = options => {
      if (options.method === "GET" && options.url.endsWith("/listings/lamp-1")) {
        pending = options; return { abort() {} };
      }
      if (options.method === "POST" && options.url.endsWith("/reservations")) posts++;
      return original(options);
    };
    await act(async () => {
      button(view!, "结束已拒绝意图").props.onClick();
    });
    const begin = button(view!, "预约或恢复原预约");
    const blocked = begin.props.disabled;
    await act(async () => { begin.props.onClick(); });
    await act(async () => { original(pending); });
    assert.equal(posts, 0);
    assert.equal(blocked, true);
    assert.equal(button(view!, "预约或恢复原预约").props.disabled, false);
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
```

完整文件 `tests/publish-lifecycle.test.tsx`：

```tsx
import { test } from "node:test";
import assert from "node:assert/strict";
import { create, act, ReactTestRenderer } from "react-test-renderer";
import { fixture } from "./fixture";
import { RequestOptions, WireResult } from "../src/request";
const saved = { schema: 2 as const, title: "saved", description: "original",
  priceText: "12.00", imagePaths: [] as string[] };
const label = "发布演示商品（无图片上传）";
function button(view: ReactTestRenderer, name = label) {
  const node = view.root.findAllByType("button").find(node => node.children.join("") === name);
  assert.ok(node, name); return node;
}
async function click(view: ReactTestRenderer, name = label) {
  const node = button(view, name);
  assert.notEqual(node.props.disabled, true);
  await act(async () => { node.props.onClick(); });
}
function visible(view: ReactTestRenderer) { return JSON.stringify(view.toJSON()); }
function delayCreate(f: Awaited<ReturnType<typeof fixture>>) {
  const original = f.client.demo.request, pending: RequestOptions[] = [];
  f.client.demo.request = options => {
    if (options.method === "POST" && options.url.endsWith("/listings")) {
      pending.push(options); return { abort() {} };
    }
    return original(options);
  };
  return { pending, finish: () => pending.forEach(options => original(options)) };
}
test("pending publish stays one command across page remount and updates the new page", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("seller"); f.client.drafts.save("seller", saved);
    const Page = await f.publishPage();
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    const delayed = delayCreate(f);
    await click(view!);
    act(() => { view!.unmount(); view = create(<Page />); });
    act(() => { f.hooks.show(); });
    await act(async () => { button(view!).props.onClick(); });
    await act(async () => { delayed.finish(); });
    const created = (await f.client.list()).items.filter(item => item.title === saved.title).length;
    console.info(JSON.stringify({ scenario: "pending-remount", posts: delayed.pending.length, created }));
    assert.equal(delayed.pending.length, 1);
    assert.equal(created, 1);
    assert.match(visible(view!), /演示已发布 listing-/);
    assert.equal(button(view!).props.disabled, true);
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
test("successful response after unmount is durable and recoverable in a fresh module", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("seller"); f.client.drafts.save("seller", saved);
    const Page = await f.publishPage();
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    const delayed = delayCreate(f);
    await click(view!);
    act(() => { view!.unmount(); view = undefined; });
    await act(async () => { delayed.finish(); });
    const receipt = f.io.map.get("market:published:seller") as { id: string; cleaned: boolean };
    console.info(JSON.stringify({ scenario: "unmounted-success", receipt: receipt ?? null,
      draftPresent: f.io.map.has("market:draft:seller") }));
    assert.ok(receipt?.id);
    assert.equal(receipt.cleaned, false);
    assert.deepEqual(f.client.drafts.read("seller"), saved);
    const restart = await fixture([...f.io.map]);
    let next: ReactTestRenderer | undefined;
    try {
      await restart.client.logout(); await restart.client.login("seller");
      const Next = await restart.publishPage();
      act(() => { next = create(<Next />); });
      act(() => { restart.hooks.show(); });
      assert.match(visible(next!), new RegExp(receipt.id));
      assert.equal(button(next!).props.disabled, true);
      await click(next!, "重试已发布草稿清理");
      assert.equal((restart.io.map.get("market:published:seller") as { cleaned: boolean }).cleaned, true);
    } finally { if (next) act(() => next!.unmount()); await restart.close(); }
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
test("late parsed success belongs to the captured owner without changing the new identity UI", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("seller"); f.client.drafts.save("seller", saved);
    const Page = await f.publishPage();
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    const original = f.client.demo.request;
    let deliver!: () => void;
    f.client.demo.request = options => {
      if (options.method === "POST" && options.url.endsWith("/listings"))
        return original({ ...options, success: (result: WireResult) => {
          deliver = () => options.success(result);
        } });
      return original(options);
    };
    await click(view!);
    await f.client.logout(); await f.client.login("buyer");
    const buyer = f.client.current().session!.userId;
    f.client.drafts.save(buyer, { ...saved, title: "buyer draft" });
    act(() => { f.hooks.show(); });
    const before = visible(view!);
    await act(async () => { deliver(); });
    assert.equal(visible(view!), before);
    assert.equal(f.client.drafts.read(buyer)!.title, "buyer draft");
    assert.ok(f.io.map.get("market:published:seller"));
    assert.equal(f.io.map.has(`market:published:${encodeURIComponent(buyer)}`), false);
    await f.client.logout(); await f.client.login("seller");
    act(() => { f.hooks.show(); });
    assert.match(visible(view!), /演示已发布 listing-/);
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
test("unknown publish blocks new POST on click, remount, logout and restart", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("seller"); f.client.drafts.save("seller", saved);
    const Page = await f.publishPage();
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    const delayed = delayCreate(f);
    await click(view!);
    await act(async () => { delayed.pending[0].fail({ errMsg: "response unknown" }); });
    await act(async () => { button(view!).props.onClick(); });
    assert.equal(delayed.pending.length, 1);
    act(() => { view!.unmount(); view = create(<Page />); });
    act(() => { f.hooks.show(); });
    assert.equal(button(view!).props.disabled, true);
    await click(view!, "查看发布人工核对说明");
    assert.match(visible(view!), /原账号.*服务端.*不重新 POST/);
    await f.client.logout();
    assert.ok(f.io.map.has("market:publishing:seller"));
    const restart = await fixture([...f.io.map]);
    let next: ReactTestRenderer | undefined;
    try {
      await restart.client.login("seller");
      const Next = await restart.publishPage();
      act(() => { next = create(<Next />); });
      act(() => { restart.hooks.show(); });
      assert.equal(button(next!).props.disabled, true);
      await act(async () => { button(next!).props.onClick(); });
      assert.equal((await restart.client.list()).items.length, 1);
      assert.ok(restart.io.map.has("market:publishing:seller"));
    } finally { if (next) act(() => next!.unmount()); await restart.close(); }
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
test("operation marker must be durable before any publish POST", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("seller"); f.client.drafts.save("seller", saved);
    const Page = await f.publishPage();
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    f.io.failedSetKey = "market:publishing:seller";
    const delayed = delayCreate(f);
    await click(view!);
    const posts = delayed.pending.length;
    if (posts) await act(async () => { delayed.pending[0].fail({ errMsg: "finish red probe" }); });
    assert.equal(posts, 0);
    assert.deepEqual(f.client.drafts.read("seller"), saved);
    assert.match(visible(view!), /write failure/);
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
test("unmounted receipt write failure keeps known success for same-process remount cleanup", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("seller"); f.client.drafts.save("seller", saved);
    const Page = await f.publishPage();
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    const delayed = delayCreate(f);
    f.io.failedSetKey = "market:published:seller";
    await click(view!);
    act(() => { view!.unmount(); view = undefined; });
    await act(async () => { delayed.finish(); });
    assert.equal(f.io.map.has("market:published:seller"), false);
    assert.ok(f.io.map.has("market:publishing:seller"));
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    assert.match(visible(view!), /演示已发布 listing-/);
    assert.equal(button(view!).props.disabled, true);
    assert.deepEqual(f.client.drafts.read("seller"), saved);
    f.io.failedSetKey = "";
    await click(view!, "重试已发布草稿清理");
    assert.equal(delayed.pending.length, 1);
    assert.equal((f.io.map.get("market:published:seller") as { cleaned: boolean }).cleaned, true);
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
test("malformed operation marker fails closed without replacing draft or sending POST", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("seller"); f.client.drafts.save("seller", saved);
    const corrupt = { schema: 1, state: "unknown", payload: null };
    f.io.map.set("market:publishing:seller", corrupt);
    const Page = await f.publishPage();
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    const delayed = delayCreate(f);
    await act(async () => { button(view!).props.onClick(); });
    const posts = delayed.pending.length;
    if (posts) await act(async () => { delayed.pending[0].fail({ errMsg: "finish red probe" }); });
    assert.equal(posts, 0);
    assert.equal(button(view!).props.disabled, true);
    assert.deepEqual(f.client.drafts.read("seller"), saved);
    assert.deepEqual(f.io.map.get("market:publishing:seller"), corrupt);
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
test("next draft requires confirmed deletion of both operation marker and receipt", async () => {
  const f = await fixture();
  let view: ReactTestRenderer | undefined;
  try {
    await f.client.login("seller"); f.client.drafts.save("seller", saved);
    const Page = await f.publishPage();
    act(() => { view = create(<Page />); });
    act(() => { f.hooks.show(); });
    await click(view!);
    f.io.failedKey = "market:publishing:seller";
    await click(view!, "开始下一份草稿");
    assert.equal(button(view!).props.disabled, true);
    assert.ok(f.io.map.has("market:published:seller"));
    f.io.failedKey = "";
    await click(view!, "开始下一份草稿");
    assert.equal(button(view!).props.disabled, false);
    assert.equal(f.io.map.has("market:publishing:seller"), false);
    assert.equal(f.io.map.has("market:published:seller"), false);
  } finally { if (view) act(() => view!.unmount()); await f.close(); }
});
```

客户端测试把**最终完整 client 源文件原样复制**到每测试独立目录，仅将 platform IO 换成
符合 StorageIO 的受控替身；领域、请求、教学 service、client 均不改实现。
页面测试以 TypeScript 的 react-jsx 转译真实 Publish/Detail，仅替换 Taro hook/组件导入；
react-test-renderer 执行实际输入和按钮回调，不镜像页面实现。测试依赖仅 dev，不进入包图。
临时目录由 finally 清理，不接平台账号，不以此证明 Taro storage 或真机登录。

从项目根运行：

```bash
npm install --no-audit --no-fund
npm run typecheck
npm test
npm run build:weapp
npm run build:tt
```

首次生成 package-lock 后使用 npm ci 重装。预期两个 dist 平台目录均含 app 配置、
三个主包页面、两个分包页面和公共运行时。命令结束后无常驻服务；若另开 watch 则 Control-C。
导入各自输出目录，不将微信产物导入抖音工具。本卷实际结果见 SELF-CHECK。

<a id="s8"></a>
## 8. 常见错误与排查路径

### 8.1 完整故障路径

1. 演示买家登录，首页打开台灯。
2. 账户页点“注入响应丢失”，返回详情点击预约。
3. 页面显示 network 与保留意图；商品刷新为 reserved，不显示预约成功。
4. 点“预约或恢复原预约”，查询原 key 返回原 pending 预约。
5. 退出后卖家登录，预约页确认；退出后同一演示买家登录，读取 confirmed 终态。
6. 首页刷新为 sold。取消练习使用新发布商品，不改测试预期。

离线路径：登录后开离线，发布页保存草稿成功，提交未取得回执后锁定原操作；
恢复网络也不能重新 POST，只能查看人工核对说明。预约则显式同键恢复，不自动预约。
配额或操作标记写失败必须发生在 wire 之前；坏草稿不静默删除。
确定拒绝路径：商品 reserved v2 时首次预约返回 LISTING_CONFLICT，保留 rejected 原键；
取消使商品回 available v3 后，先“结束已拒绝意图”，再点击预约，新键以 v3 创建 pending。
未知响应即使查询 404/重试 409，也不开放结束；继续原键恢复或人工核对，不默默换键。
发布清理路径：POST 成功后注入草稿删除失败，仍显示 publishedId，只“重试已发布草稿清理”；
清理通过后“开始下一份草稿”才解除提交锁。后台返回与选择图片期间修改标题不丢编辑。
发布生命周期路径：延迟 POST，卸载重挂载再次点击仍只有一次 create；
成功响应在卸载后到达，原 owner 回执先落盘，旧草稿不由卸载页清理。
退出/切换身份后响应不改变新 UI，但原 owner 回执仍归原账号；重启显式清理登录后可恢复。
退出清理路径：首次某 owner 键删除失败，再次退出仍重试同键，全部确认前禁止新登录；
重启保留阻塞，不把“重启”作为绕过未清理数据的办法。
编译报依赖缺失先核对 `npm ls` 和同版 Taro，不通过禁用 strict 或使用 any 修复。

## 9. 课后题

1. touristappid 能证明发布吗？答案：不能，只是本地项目配置。
2. 本地 demo 需要合法域名吗？答案：transport 不访问网络；真实模式必须合法 HTTPS。
3. 临时图片路径能永久保存吗？答案：不；要验证持久文件能力、清理与服务端上传。

<a id="s10"></a>
## 10. 实践练习

- 基础：搜索不存在商品。参考答案：page.items=[]、total=0，显示 0 件，不报 parser 错误。
- 进阶：抖音替换订阅 adapter。参考答案：先核对账号、模板与最新官方 API，
  为 accept/reject/能力缺失分别测试；接口仍返回授权结果，不修改 Reservation status。
- 故障注入：在 reserve 失败时删除 intent。参考答案：响应丢失后再点会创建新键并 409；
  修复为仅确定成功后清理，同键查询或重试，不靠按钮文案伪装成功。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 精确清单每文件已创建，两平台构建与类型/测试均记录真实摘要。
- [ ] 买家/卖家、搜索、详情分享、收藏、草稿、发布、预约恢复、取消、确认售出有操作记录。
- [ ] 离线仅草稿，UI 标记所有业务为演示，不误称生产成功。
- [ ] 第二平台独立验证路由、生命周期、图片拒绝、域名、会话与预约。
- [ ] 位置拒绝可手工输入，订阅拒绝可手工回读，未适配返回明确错误。
- [ ] 无秘密、运行文件或构建产物进入教材仓库。
- [ ] 无工具/账号/真机时不勾选平台、预览、提审和真实后端通过。

## 12. 常见问题

### 真实接线与明确未实现

现存 Web 会话 API 不直接接受本篇 Bearer；auth/exchange、Bearer me/logout、
按键恢复查询是需要实现的小程序后端扩展，不是把 base URL 改掉即可 Web 互通。
替换 `createRequest(demo,...)` 为 `createRequest(realTransport,"https://合法域名/api/v1")`；
login 改为 `platform.loginCode()` 并发送 `{platform: platform.name,code}`，移除课堂角色按钮。
后端实现 MP-23 §12，不把客户端 mock-service 打进生产包；以构建常量和独立入口裁掉 demo。
关闭 demo 开关不足以移除包体和伪身份逻辑，构建后必须检查依赖图和字符串。

发布图片扩展使用 MP-15 的上传控制器与后端接口，服务端返回已校验 imageKey，
发布 DTO 增加 imageKeys；这里默认只展示临时图片，不声称已完成真实上传。
区域输入是暂存界面状态，不进入当前 Listing 八字段；正式地域筛选需契约评审、
粗粒度 regionId、服务端字段与隐私声明，不能偷加精确位置。
demo 不支持自动刷新 Token、服务端数据库、微信真实登录、真实订阅发送、支付、
平台审核或多进程并发。这些是生产扩展，不是本地演示遗漏文件。

## 13. 扩展阅读

[Taro 配置](https://docs.taro.zone/docs/config/)、
[项目配置](https://docs.taro.zone/docs/project-config/)、
[Taro React 页面](https://docs.taro.zone/docs/react-page/)、
[持续集成](https://docs.taro.zone/docs/plugin-mini-ci/)。

## 我现在能做到什么

我能从完整 Markdown 文件清单复建双平台客户端，演练预约不确定恢复，并准确报告未验证范围。

## 单元导航

[上一单元](01-domain-service-tests.md) ·
[下一单元：本卷覆盖与毕业验收](../MINI-PROGRAM-COVERAGE.md) · [本卷](../README.md)
