# MP-23 邻里集市 Capstone：领域、可控服务与失败证据

## 任务卡

- 任务：构建不接支付的完整市场领域服务，先测试再实现，接到下一篇 Taro 客户端。
- 产出：`src/domain.ts`、`src/mock-service.ts`、`src/storage.ts`、`src/request.ts`
  与 `tests/contracts.test.ts`，均为完整文件。
- 运行：使用 MP-24 包清单，`npm test`、`npm run typecheck`。
- 证据：非法 JSON、code 重放、同键恢复、两买家冲突、对象授权、退出、迁移和取消。
- 边界：本服务是单 JS 实例内存 demo，不是平台 code2Session、数据库或生产上传后端。

## 1. 任务背景

应用能显示列表不意味着预约可靠。真正的闭环要处理：用户点击、服务端提交、响应丢失、
返回后查询、同键重试、另一买家冲突、卖家确认和退出后禁止旧会话写入。
教学服务把业务规则放在可测试边界，不把本地 storage “保存成功”描述为预约成功。

## 2. 学习目标

从 unknown 解析完整领域数据；用用户/操作/幂等键作用域约束写意图；实现合法状态迁移；
区分内存模型和生产事务；设计可替换请求、storage 与平台能力接口。

## 3. 预备知识

完成前 11 章。新建个人项目，使用 MP-24 的 package.json、tsconfig 和构建配置；
本篇五文件与下一篇共同构成一项目。测试夹具是虚构台灯，不包含真实用户信息。

<a id="s4"></a>
## 4. 核心理论

### 4.1 状态和单位

Listing 固定八字段，状态 `available/reserved/sold`。Reservation 包含双方、
商品、幂等键、版本与 UTC，状态 `pending/confirmed/cancelled`。
新预约同时将商品 available → reserved；pending 取消回 available；pending 确认转 sold。
终态重复确认/取消返回冲突，遵循共享契约，不擅自增加交易状态。

### 4.2 幂等和身份

code 的一用性与业务幂等是两回事。demo code 使用 `demo-buyer-*`/`demo-seller-*`，
仅让课堂切换虚构角色；生产不得根据客户端 code 前缀选择身份。
幂等记录绑定业务 userId 和 key，保存原 payload 指纹；同键不同 payload 返回 409。
身份由 Token 查会话，不能信请求体的 buyerId/ownerId。

### 4.3 单实例不等于事务

handle 同步执行，所以本实例能先比较 version 再更新；多个服务进程、数据库和网络
不会共享这份 Map。生产要事务锁/版本比较、有效预约唯一约束、持久幂等记录和 TTL，
不能把这份 demo 服务部署成可信授权系统。

## 5. 文件与端点清单

| 文件 | 所有权 |
| --- | --- |
| domain.ts | unknown、整数分、UTC、状态准入 |
| mock-service.ts | 演示会话、对象授权、同步幂等状态机 |
| storage.ts | 用户草稿 V1→V2、可观察配额失败 |
| request.ts | parser、错误、取消，不导入平台运行时 |
| contracts.test.ts | 独立实例和确定性边界测试 |

接口基路径 `/api/v1` 在请求层配置；服务 handle 接收其后的路径。
Bearer、auth/exchange、me/logout 与按键恢复查询均是小程序后端扩展合同；
现存 Web 会话 API 不直接接受此客户端，demo 也不是可直接 Web 互通的服务器。
GET `/listings`、`/listings/:id`；POST `/listings`（201）；
POST `/auth/exchange`、`/auth/logout`；
GET `/reservations`、POST `/listings/:id/reservations`（201）、GET `/reservations/by-key/:key`；
POST `/reservations/:id/{confirm,cancel}`。按键查询是本卷明确增加的恢复接口，需真实后端实现。

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `src/domain.ts`：

```ts
export type ListingStatus = "available" | "reserved" | "sold";
export type ReservationStatus = "pending" | "confirmed" | "cancelled";
export interface Listing {
  id: string; title: string; description: string; priceCents: number;
  status: ListingStatus; ownerId: string; version: number; createdAt: string;
}
export interface Reservation {
  id: string; listingId: string; buyerId: string; sellerId: string;
  key: string; status: ReservationStatus; version: number; createdAt: string;
}
export interface ListingPage { items: Listing[]; page: number; pageSize: number; total: number }
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("object");
  return value as Record<string, unknown>;
}
export function text(value: unknown, field: string, empty = false): string {
  if (typeof value !== "string" || (!empty && !value.trim())) throw new Error(field);
  return value;
}
export function integer(value: unknown, field: string, min = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) throw new Error(field);
  return value;
}
export function utc(value: unknown): string {
  const s = text(value, "createdAt");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s) ||
      !Number.isFinite(Date.parse(s)) || new Date(s).toISOString() !== s) throw new Error("UTC");
  return s;
}
function state<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new Error("status");
  return value as T;
}
export function parseListing(value: unknown): Listing {
  const x = object(value);
  return { id: text(x.id, "id"), title: text(x.title, "title"),
    description: text(x.description, "description", true), priceCents: integer(x.priceCents, "priceCents"),
    status: state(x.status, ["available", "reserved", "sold"]),
    ownerId: text(x.ownerId, "ownerId"), version: integer(x.version, "version", 1), createdAt: utc(x.createdAt) };
}
export function parseReservation(value: unknown): Reservation {
  const x = object(value);
  return { id: text(x.id, "id"), listingId: text(x.listingId, "listingId"),
    buyerId: text(x.buyerId, "buyerId"), sellerId: text(x.sellerId, "sellerId"),
    key: text(x.key, "key"), status: state(x.status, ["pending", "confirmed", "cancelled"]),
    version: integer(x.version, "version", 1), createdAt: utc(x.createdAt) };
}
export function parsePage(value: unknown): ListingPage {
  const x = object(value);
  if (!Array.isArray(x.items)) throw new Error("items");
  return { items: x.items.map(parseListing), page: integer(x.page, "page", 1),
    pageSize: integer(x.pageSize, "pageSize", 1), total: integer(x.total, "total") };
}
export function cents(input: string): number {
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(input)) throw new Error("金额格式");
  const [yuan, fraction = ""] = input.split(".");
  return integer(Number(yuan) * 100 + Number(fraction.padEnd(2, "0")), "priceCents");
}
```

完整文件 `src/storage.ts`：

```ts
import { object, text, integer } from "./domain";
export interface StorageIO {
  get(key: string): unknown; set(key: string, value: unknown): void; remove(key: string): void;
}
export interface Draft {
  schema: 2; title: string; description: string; priceText: string; imagePaths: string[];
}
function parseDraft(value: unknown): Draft {
  const x = object(value);
  if (x.schema !== 2 || !Array.isArray(x.imagePaths) ||
      !x.imagePaths.every(p => typeof p === "string") || x.imagePaths.length > 3) throw new Error("draft schema");
  return { schema: 2, title: text(x.title, "title", true),
    description: text(x.description, "description", true),
    priceText: text(x.priceText, "priceText", true), imagePaths: x.imagePaths };
}
export function createDraftStore(io: StorageIO) {
  const key = (user: string) => `market:draft:${encodeURIComponent(text(user, "user"))}`;
  return {
    read(user: string): Draft | undefined {
      const value = io.get(key(user));
      if (value === undefined || value === "") return undefined;
      const x = object(value);
      if (x.schema === 1) {
        const amount = integer(x.priceCents, "priceCents");
        const migrated: Draft = { schema: 2, title: text(x.title, "title", true), description: "",
          priceText: `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, "0")}`, imagePaths: [] };
        io.set(key(user), migrated);
        return migrated;
      }
      return parseDraft(value);
    },
    save(user: string, draft: Draft) {
      const valid = parseDraft(draft);
      if (JSON.stringify(valid).length > 32000) throw new Error("draft quota budget");
      io.set(key(user), valid);
    },
    clear(user: string) { io.remove(key(user)); }
  };
}
```

完整文件 `src/request.ts`：

```ts
import { object } from "./domain";
export class ApiError extends Error {
  constructor(public kind: "network" | "http" | "parse" | "cancelled",
    message: string, public status = 0, public code = "", public requestId = "") { super(message); }
}
export interface WireResult { statusCode: number; data: unknown }
export interface RequestOptions {
  url: string; method: "GET" | "POST"; data: unknown; header: Record<string, string>; timeout: number;
  success(value: WireResult): void; fail(value: { errMsg: string }): void;
}
export interface RequestIO { request(options: RequestOptions): { abort(): void } }
export function createRequest(io: RequestIO, base: string) {
  return function request<T>(method: "GET" | "POST", path: string, data: unknown,
    parser: (value: unknown) => T, token = "") {
    let settled = false;
    let rejectPromise: (error: Error) => void = () => {};
    let task: { abort(): void } | undefined;
    const promise = new Promise<T>((resolve, reject) => {
      rejectPromise = reject;
      const fail = (error: Error) => { if (!settled) { settled = true; reject(error); } };
      try {
        task = io.request({ url: base + path, method, data, timeout: 10000,
          header: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          fail: value => fail(new ApiError("network", value.errMsg)),
          success: result => {
            if (settled) return;
            if (result.statusCode < 200 || result.statusCode >= 300) {
              let code = "INVALID_ERROR", id = "";
              try {
                const x = object(result.data);
                if (typeof x.code === "string") code = x.code;
                if (typeof x.requestId === "string") id = x.requestId;
              } catch { /* Preserve HTTP failure even when its body is malformed. */ }
              fail(new ApiError("http", `HTTP ${result.statusCode}`, result.statusCode, code, id));
              return;
            }
            try { const value = parser(result.data); settled = true; resolve(value); }
            catch (error) { fail(new ApiError("parse", error instanceof Error ? error.message : "parser")); }
          }
        });
      } catch (error) { fail(new ApiError("network", error instanceof Error ? error.message : "request")); }
    });
    return { promise, abort() {
      if (settled) return;
      settled = true;
      rejectPromise(new ApiError("cancelled", "request cancelled"));
      task?.abort();
    } };
  };
}
```

<a id="s7"></a>
## 7. 邻里集市集成案例

完整文件 `src/mock-service.ts`：

```ts
import { Listing, Reservation, object, text, integer, parseListing } from "./domain";
import { WireResult, RequestIO } from "./request";
export function createService() {
  const listings = new Map<string, Listing>([["lamp-1", { id: "lamp-1", title: "台灯",
    description: "九成新，自提", priceCents: 1200, status: "available", ownerId: "seller",
    version: 1, createdAt: "2026-10-12T00:00:00.000Z" }]]);
  const sessions = new Map<string, string>(), usedCodes = new Set<string>();
  const reservations = new Map<string, Reservation>();
  const intents = new Map<string, { fingerprint: string; id: string }>();
  let serial = 0;
  const ok = (data: unknown): WireResult => ({ statusCode: 200, data });
  const error = (statusCode: number, code: string): WireResult =>
    ({ statusCode, data: { code, requestId: `demo-${++serial}` } });
  const snapshot = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  const handle = (method: string, path: string, input: unknown = {}, token = ""): WireResult => {
    try {
      const [route, query = ""] = path.split("?");
      const body = object(input);
      if (method === "POST" && route === "/auth/exchange") {
        const code = text(body.code, "code");
        if (!/^demo-(buyer|seller)-[a-zA-Z0-9-]+$/.test(code)) return error(400, "DEMO_CODE_ONLY");
        if (usedCodes.has(code)) return error(409, "CODE_REPLAY");
        usedCodes.add(code);
        const userId = code.startsWith("demo-seller-") ? "seller" : code.split("-").slice(1, 3).join("-");
        const next = `demo-session-${++serial}`;
        sessions.set(next, userId);
        return ok({ token: next, userId, expiresAt: new Date(Date.now() + 3600000).toISOString() });
      }
      const user = sessions.get(token);
      if (method === "POST" && route === "/auth/logout") {
        if (!user) return error(401, "SESSION_EXPIRED");
        sessions.delete(token); return ok({ revoked: true });
      }
      if (method === "GET" && route === "/listings") {
        const q = decodeURIComponent(query.match(/(?:^|&)q=([^&]*)/)?.[1] ?? "");
        const items = [...listings.values()].filter(x => x.title.includes(q));
        return ok({ items: snapshot(items), page: 1, pageSize: 20, total: items.length });
      }
      if (method === "GET" && route.startsWith("/listings/")) {
        const item = listings.get(decodeURIComponent(route.slice(10)));
        return item ? ok(snapshot(item)) : error(404, "LISTING_NOT_FOUND");
      }
      if (!user) return error(401, "SESSION_EXPIRED");
      if (method === "POST" && route === "/listings") {
        const item = parseListing({ ...body, id: `listing-${++serial}`, ownerId: user,
          status: "available", version: 1, createdAt: new Date().toISOString() });
        listings.set(item.id, item); return { statusCode: 201, data: snapshot(item) };
      }
      if (method === "GET" && route === "/reservations") {
        return ok(snapshot([...reservations.values()].filter(r => r.buyerId === user || r.sellerId === user)));
      }
      if (method === "GET" && route.startsWith("/reservations/by-key/")) {
        const key = decodeURIComponent(route.slice("/reservations/by-key/".length));
        const intent = intents.get(`${user}:${key}`);
        return intent ? ok(snapshot(reservations.get(intent.id))) : error(404, "INTENT_NOT_FOUND");
      }
      const createMatch = route.match(/^\/listings\/([^/]+)\/reservations$/);
      if (method === "POST" && createMatch) {
        const listingId = decodeURIComponent(createMatch[1]), key = text(body.key, "key");
        const version = integer(body.version, "version", 1);
        const fingerprint = JSON.stringify({ listingId, version }), scope = `${user}:${key}`;
        const old = intents.get(scope);
        if (old) return old.fingerprint === fingerprint
          ? { statusCode: 201, data: snapshot(reservations.get(old.id)) } : error(409, "KEY_PAYLOAD_MISMATCH");
        const item = listings.get(listingId);
        if (!item) return error(404, "LISTING_NOT_FOUND");
        if (item.ownerId === user) return error(403, "SELF_RESERVATION");
        if (item.version !== version || item.status !== "available") return error(409, "LISTING_CONFLICT");
        const r: Reservation = { id: `reservation-${++serial}`, listingId, buyerId: user,
          sellerId: item.ownerId, key, status: "pending", version: 1, createdAt: new Date().toISOString() };
        reservations.set(r.id, r); intents.set(scope, { fingerprint, id: r.id });
        listings.set(item.id, { ...item, status: "reserved", version: item.version + 1 });
        return { statusCode: 201, data: snapshot(r) };
      }
      const match = route.match(/^\/reservations\/([^/]+)\/(confirm|cancel)$/);
      if (method === "POST" && match) {
        const r = reservations.get(match[1]);
        if (!r) return error(404, "RESERVATION_NOT_FOUND");
        const next = match[2] === "confirm" ? "confirmed" : "cancelled";
        const actorAllowed = next === "confirmed" ? user === r.sellerId :
          user === r.buyerId || user === r.sellerId;
        if (!actorAllowed) return error(403, "OBJECT_FORBIDDEN");
        if (r.status !== "pending") return error(409, "STATE_CONFLICT");
        const changed: Reservation = { ...r, status: next, version: r.version + 1 };
        reservations.set(r.id, changed);
        {
          const item = listings.get(r.listingId)!;
          listings.set(item.id, { ...item, status: next === "confirmed" ? "sold" : "available",
            version: item.version + 1 });
        }
        return ok(snapshot(changed));
      }
      return error(404, "ROUTE_NOT_FOUND");
    } catch { return error(400, "INVALID_INPUT"); }
  };
  return { handle };
}
export function createMockTransport(service = createService()): RequestIO & {
  setOffline(value: boolean): void; dropNextReservation(): void;
} {
  let offline = false, drop = false;
  return {
    setOffline(value) { offline = value; },
    dropNextReservation() { drop = true; },
    request(options) {
      let aborted = false;
      Promise.resolve().then(() => {
        if (aborted) return;
        if (offline) { options.fail({ errMsg: "demo offline" }); return; }
        const token = options.header.Authorization?.replace(/^Bearer /, "") ?? "";
        const path = options.url.split("/api/v1")[1] ?? "/missing";
        const result = service.handle(options.method, path, options.data, token);
        if (drop && options.method === "POST" && /^\/listings\/[^/]+\/reservations$/.test(path) && result.statusCode === 201) {
          drop = false; options.fail({ errMsg: "response lost after commit" }); return;
        }
        options.success(result);
      });
      return { abort() { aborted = true; } };
    }
  };
}
```

服务将课堂卖家映射为 seller，买家映射为独立的虚构 buyer ID。
两买家争抢测试覆盖不同业务身份，但不证明平台身份映射；生产必须从平台身份映射独立 userId。
下一篇运行 UI 时默认内存服务启动即有台灯；重编译/进程重启重置状态，草稿仍在平台 storage。
无需端口、外部 API 或秘密，停止工具后 demo 进程结束。

完整文件 `tests/contracts.test.ts`：

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseListing, parseReservation, parsePage } from "../src/domain";
import { createService } from "../src/mock-service";
import { createDraftStore } from "../src/storage";
import { createRequest, ApiError } from "../src/request";
const listing = { id: "lamp-1", title: "台灯", description: "九成新",
  priceCents: 1200, status: "available", ownerId: "seller", version: 1,
  createdAt: "2026-10-12T00:00:00.000Z" };
test("listing requires integer cents, canonical UTC and all states", () => {
  assert.equal(parseListing(listing).priceCents, 1200);
  for (const status of ["available", "reserved", "sold"])
    assert.equal(parseListing({ ...listing, status }).status, status);
  for (const patch of [{ priceCents: 1.2 }, { priceCents: -1 },
    { createdAt: "2026-02-30T00:00:00.000Z" }, { ownerId: "" }])
    assert.throws(() => parseListing({ ...listing, ...patch }));
});
test("page and reservation reject invalid fields", () => {
  assert.equal(parsePage({ items: [listing], page: 1, pageSize: 20, total: 1 }).total, 1);
  assert.throws(() => parsePage({ items: [], page: 0, pageSize: 20, total: 0 }));
  assert.throws(() => parseReservation({}));
});
test("code is one-use and logout revokes the demo session", () => {
  const service = createService();
  const a = service.handle("POST", "/auth/exchange", { code: "demo-buyer-a" });
  assert.equal(a.statusCode, 200);
  assert.equal(service.handle("POST", "/auth/exchange", { code: "demo-buyer-a" }).statusCode, 409);
  const token = (a.data as { token: string }).token;
  assert.equal(service.handle("POST", "/auth/logout", {}, token).statusCode, 200);
  assert.equal(service.handle("GET", "/reservations", {}, token).statusCode, 401);
});
test("reservation retry same key returns same resource, altered payload conflicts", () => {
  const service = createService();
  const auth = service.handle("POST", "/auth/exchange", { code: "demo-buyer-b" });
  const token = (auth.data as { token: string }).token;
  const body = { listingId: "lamp-1", version: 1, key: "intent-1" };
  const first = service.handle("POST", "/listings/lamp-1/reservations", body, token);
  assert.equal(first.statusCode, 201);
  assert.deepEqual(service.handle("POST", "/listings/lamp-1/reservations", body, token), first);
  assert.equal(service.handle("POST", "/listings/lamp-1/reservations", { ...body, version: 2 }, token).statusCode, 409);
  assert.equal(service.handle("GET", "/reservations/by-key/intent-1", {}, token).statusCode, 200);
});
test("two buyers conflict and only authorized actors may transition", () => {
  const service = createService();
  const token = (code: string) => (service.handle("POST", "/auth/exchange", { code }).data as {token:string}).token;
  const a = token("demo-buyer-c"), b = token("demo-buyer-d"), seller = token("demo-seller-a");
  const result = service.handle("POST", "/listings/lamp-1/reservations", { version: 1, key: "a" }, a);
  const id = (result.data as {id:string}).id;
  assert.equal(service.handle("POST", "/listings/lamp-1/reservations", { version: 1, key: "b" }, b).statusCode, 409);
  assert.equal(service.handle("POST", `/reservations/${id}/confirm`, {}, b).statusCode, 403);
  assert.equal(service.handle("POST", `/reservations/${id}/confirm`, {}, seller).statusCode, 200);
  assert.equal(service.handle("POST", `/reservations/${id}/cancel`, {}, a).statusCode, 409);
  assert.equal((service.handle("GET", "/listings/lamp-1").data as {status:string}).status, "sold");
});
test("draft migration isolates users, detects quota and clears only owner", () => {
  const map = new Map<string, unknown>();
  const io = { get: (k:string) => map.get(k), set: (k:string,v:unknown) => { map.set(k,v); },
    remove: (k:string) => { map.delete(k); } };
  map.set("market:draft:a", { schema: 1, title: "旧", priceCents: 100 });
  const store = createDraftStore(io);
  assert.equal(store.read("a")?.schema, 2);
  store.save("b", { schema: 2, title: "新", description: "", priceText: "1.00", imagePaths: [] });
  store.clear("a");
  assert.equal(store.read("a"), undefined); assert.equal(store.read("b")?.title, "新");
  const full = createDraftStore({ ...io, set() { throw new Error("quota"); } });
  assert.throws(() => full.save("c", { schema: 2, title: "x", description: "", priceText: "0", imagePaths: [] }), /quota/);
});
test("request abort and malformed body are distinct and settled", async () => {
  let aborts = 0;
  const request = createRequest({ request(options) {
    options.success({ statusCode: 200, data: { nope: true } });
    return { abort() { aborts++; } };
  } }, "https://api.example.invalid");
  await assert.rejects(request("GET", "/listings", {}, parsePage).promise,
    (e: unknown) => e instanceof ApiError && e.kind === "parse");
  const slow = createRequest({ request() { return { abort() { aborts++; } }; } }, "https://api.example.invalid");
  const task = slow("GET", "/listings", {}, parsePage);
  task.abort();
  await assert.rejects(task.promise, (e: unknown) => e instanceof ApiError && e.kind === "cancelled");
  assert.equal(aborts, 1);
});
```

<a id="s8"></a>
## 8. 常见错误与排查路径

先创建测试，再临时让 handle 返回 501、parser 抛出未实现、storage 空返回、request 直接 resolve。
运行 npm test 应为 7 项失败，不把缺模块的启动错误当业务红灯。恢复本篇完整实现再运行。

故障注入：将 old intent 检查移到 available 判断之后。同键重试见 reserved 而 409；
证据是第一次 201、第二次 409，修复为先按作用域查询幂等记录，再判断新写。
删除 owner 校验会让陌生 Token 确认别人的预约；不能通过 UI 隐藏按钮掩盖。

## 9. 课后题

1. 为什么 code 不用同一个值重试？答案：它是一次性凭据；后端需把业务交换与重放登记
   做成原子消费，失败不确定时重新获取 code，并避免重复创建业务用户。
2. 为什么 parser 不直接 `as Listing`？答案：类型断言不验证金额、日期与状态。
3. 取消后旧 key 可新预约吗？答案：不，本 key 仍代表原意图；新预约明确创建新 key。

<a id="s10"></a>
## 10. 实践练习

- 基础：验证 `cents("12.30")` 得 1230，`cents("1e2")` 抛错。参考答案：
  用 `assert.equal`/`assert.throws`，不要 parseFloat 截断。
- 进阶：验证取消事务。参考答案：新实例创建 pending，买家 POST cancel，
  断言 Reservation cancelled、Listing available、version 加 1；再次 cancel 为 409，
  不将终态重复操作当幂等创建。
- 故障注入：丢失预约响应后换 key。参考答案：新 key 会撞 reserved；恢复原 key 查询，
  原预约返回 pending，再读 Listing，不显示“再创建成功”。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 五个文件来自正文，无空实现、any 或缺省成功。
- [ ] parser 覆盖三类商品/预约状态、整数分、UTC 和完整字段。
- [ ] 同键不同 payload 409，退出后旧 Token 401。
- [ ] 权限由服务处理，不依赖按钮显示。
- [ ] 配额写失败向调用方传播；草稿迁移不合并账号。
- [ ] 明确 Map、虚构会话、临时文件和真实后端的边界。

## 12. 常见问题

### 生产扩展精确契约

`/auth/exchange` 收 `{platform,code}`，服务端按受信配置选择 AppID 与密钥，通过 TLS
调用微信 code2Session、抖音对应登录接口、支付宝授权码交换接口。按
`platform + appId + platformSubject` 唯一映射业务用户；平台 session_key 与密钥只存后端。
code 哈希建立短期唯一消费记录，事务消费、限制频率、绑定调用场景，不在日志存原 code。
签发短期业务 access token 和可撤销刷新会话，后端检查 expiry/revoked、轮换刷新凭据。
demo expiresAt 仅供客户端演示，Map 未执行后端 expiry；生产必须执行。

预约数据库事务同时比较 Listing version/status、插入唯一有效预约、更新商品、
插入 `(userId,operation,key)` 唯一幂等记录和 payload hash。查询仅返回本人可访问记录，
404 不代表可无条件换 key；须同键重试。后端通知通过 outbox，避免事务成功但消息丢失。
图片接口返回 uploadId/对象 key/校验状态，服务端限制大小、魔数、归属、有效期；
发布只能引用本人已校验对象。这里不提供可直接上线的秘密或数据库迁移脚本。

## 13. 扩展阅读

[微信 code2Session](https://developers.weixin.qq.com/miniprogram/dev/server/API/user-login/api_code2session)、
[Taro 请求](https://docs.taro.zone/docs/apis/network/request/)、
[Taro setStorageSync](https://docs.taro.zone/docs/apis/storage/setStorageSync)。
2026-10-12 官方核对确认 code2Session 只允许服务端调用。

## 我现在能做到什么

我能把预约成功、未知结果与草稿区分开，构造可测试领域服务并列出真实后端所需保证。

## 单元导航

[上一单元：回退](../11-release/02-review-rollout-rollback.md) ·
[下一单元：完整客户端](02-client-platform-delivery.md) · [本卷](../README.md)
