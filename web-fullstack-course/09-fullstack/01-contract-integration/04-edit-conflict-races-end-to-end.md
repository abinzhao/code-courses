# 编辑冲突、竞态与端到端验收：保留草稿，以服务器事实收敛

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 整数分草稿解析器、React/Vue 编辑页、显式 `409` 重读/采用流程、双端验收记录 |
| 核心业务 | owner 才能编辑；PATCH 携带读取到的 version；冲突不覆盖、不无限重试 |
| 竞态目标 | 路由切换后旧 GET 不写回；重复保存只发一条；取消等待不声称事务回滚 |
| 可见结果 | 保存后版本递增；冲突时草稿原样保留；比较最新内容后由用户明确采用 |
| 建议时间 | 240 分钟 |
| 环境标签 | 双前端 **local** E2E；原子预约必须由真实 API/数据库证据证明 |

本课拥有 `packages/contracts/edit.ts`、它的纯函数测试和两套编辑页。客户端、认证 Provider/store 和
router 主文件仍由前课或框架卷拥有；这里只给出最小接线，不复制整份 router。

## 1. 任务背景

王阿姨打开版本 1 的自行车商品，修改标题但暂未保存。另一个已登录窗口先把价格改好，服务器版本
变成 2。王阿姨若仍用版本 1 提交，服务端必须返回 `409 VERSION_CONFLICT`。前端不能悄悄把她的
草稿覆盖成服务器内容，也不能自动把同一草稿重发到版本 2。

同时还存在三类竞态：

1. 从商品 A 快速切到 B，A 的 GET 晚返回并覆盖 B；
2. 连续点击保存，两个 PATCH 携带同一 version；
3. 页面离开或 fetch abort 后，服务器可能已经提交。

正确目标不是“永远没有冲突”，而是让冲突可见、输入不丢、服务器事实可重读、下一次写入由用户
明确决定。

## 2. 学习目标

完成本课后，你能够：

1. 把金额草稿作为字符串编辑，严格转换为 `0..100000000` 整数分；
2. 把服务端 Listing 保存为 `base`，PATCH 使用 `base.version`；
3. 只把服务器成功响应中的新 version 写回 base，不在客户端自增；
4. 同时执行 UI owner 提示与后端对象授权，正确处理 403；
5. 在 409 时保留标题、描述和金额草稿，禁止自动覆盖重试；
6. 显式读取 `latest`，展示差异，再由用户选择采用新 version；
7. 用 AbortController/generation 阻止旧 GET 结果写入新路由；
8. 防重复提交，并说明按钮锁不是跨标签或数据库锁；
9. 将网络失败和非 ApiFailure 标为结果未知并阻塞重试，显式重读、比较、采用后再决定；
10. 用相同路径验收 React/Vue，并保留原子预约的一成功一 409 证据。

## 3. 预备知识

- 完成[React Context 与 Vue Pinia 等价接入](03-react-vue-auth-data-integration.md)；
- API PATCH `/api/v1/listings/:id` 已执行 session 认证、owner 条件和 version 条件；
- API 预约使用真实事务与数据库唯一约束，而不是内存按钮状态；
- 理解[乐观锁、死锁、重试与回滚](../../08-backend/05-transactions-concurrency/03-optimistic-lock-deadlock-retry-rollback.md)；
- 准备两个虚构账号和两个独立浏览器上下文，不共享 Cookie jar。

不要用生产账号、生产商品或公开主机做冲突实验。所有写操作只指向个人本地 `market`。

## 4. 核心理论

### 4.1 base、draft 与 latest 必须分开

```text
base    = 本表单当前认可的服务器版本
draft   = 用户尚未提交的输入
latest  = 冲突后显式重读的服务器最新状态
```

若把三者合成一个对象，重读会覆盖草稿，输入事件又会改写 version。分开后，409 流程可以是：

```text
PATCH(base.version=1, draft) -> 409
保留 base=1 和 draft
GET latest=2
展示 latest 与 draft
用户点击“采用版本 2”
base=latest，draft 仍保留
再次 PATCH(version=2, draft)
```

采用 version 不代表自动接受服务器字段。用户必须看见差异；复杂系统可提供字段级合并，本课采用
“保留完整草稿 + 展示最新服务端内容”的可判定方案。

### 4.2 金额先验证字符串，再转整数

`<input type="number">` 仍可能产生空串、科学计数和小数。草稿保持字符串，parser 只接受十进制数字：

- `0`、`19900`、`100000000` 合法；
- `-1`、`1.5`、`1e3`、空白、`100000001` 非法；
- 不使用 `parseFloat(value) * 100` 猜测单位；
- API 与数据库始终保存整数分。

### 4.3 前端 owner 判断只改善体验

`auth.user?.id === base.ownerId` 可禁用按钮和解释原因，但请求最终权限由后端 session actor 与目标
行判断。客户端不能提交 `ownerId`，也不能把 role 改成 admin 获权。403 后保留草稿，查 requestId、
session、Origin/CSRF 和 owner，不把 403 改成 409 或 200。

### 4.4 三种“取消”不能混称

| 动作 | 实际效果 | 不能推出 |
| --- | --- | --- |
| Abort GET | 客户端停止等待读取 | 服务端一定没执行查询 |
| 页面离开时忽略旧结果 | 不再写当前 UI | mutation 没提交 |
| 数据库 ROLLBACK | 事务内写入不生效 | 外部副作用自动撤销 |

本课对 GET 使用 AbortController；对 PATCH 不提供“取消即撤销”的按钮。页面离开后只忽略迟到响应，
重新进入时必须读取服务器事实。

PATCH 的普通 `Error`、`TypeError` 或其他非 `ApiFailure` 只说明客户端没有拿到确定响应，不证明事务
未提交。因此 403、409 和未知结果都会进入 `blocked=true`：立即再次点击不能发送第二条 PATCH。
用户必须显式 reread 获取服务器事实；重读成功后仍保持阻塞，直到比较并 adopt 最新 version 才解除。

### 4.5 409 是并发控制结果，不是服务器故障

version 冲突与预约冲突都使用 409，但稳定 `code` 应区分：

- `VERSION_CONFLICT`：编辑基于旧 version；
- `RESERVATION_CONFLICT`：商品已被另一个预约占用。

二者都不自动无限重试。编辑需用户比较草稿；预约需重读商品为 `reserved`。原子性由后端事务和唯一
约束证明，不由两个前端恰好显示相同按钮证明。

## 5. API、配置与文件责任清单

| 名称 | 最小用法 | 作用 | 边界 |
| --- | --- | --- | --- |
| `ListingDraft` | 三个 string 字段 | 保留原始输入 | 不含 owner/status/version |
| `parseDraft` | draft -> mutation input | 严格整数分和长度 | 不能做后端授权 |
| `base.version` | PATCH body `version` | 乐观并发前提 | 不由客户端自增 |
| `ApiFailure.status` | 403/409 分流 | 提供恢复路径 | 仍检查稳定 code |
| `latest` | 冲突后 GET | 展示服务器事实 | 不自动覆盖 draft |
| `blocked` | 403/409/未知 PATCH 结果 | 禁止未收敛前重试 | 重读比较并采用后解除 |
| operation lock | ref/boolean | 防同页面重复点击 | 不是跨标签锁 |
| generation | route/请求序号 | 拒绝迟到结果 | 不是数据库事务 ID |
| `AbortController` | GET cleanup | 停止等待旧读取 | 不回滚 PATCH |
| `role="alert"` | 无权限/读取失败 | 及时宣布错误 | 普通进度用 status |
| `role="status"` | 保存/重读结果 | 非打断反馈 | 不隐藏 requestId 证据 |

## 6. 最小可运行案例

### 6.1 完整草稿解析器

完整文件：`market/packages/contracts/edit.ts`

```ts
import type { Listing } from "./index.js";

export type ListingDraft = {
  title: string;
  description: string;
  priceCents: string;
};

export type ListingMutation = {
  title: string;
  description: string;
  priceCents: number;
};

export function draftOf(listing: Listing): ListingDraft {
  return {
    title: listing.title,
    description: listing.description,
    priceCents: String(listing.priceCents),
  };
}

export function parseDraft(draft: ListingDraft): ListingMutation {
  const title = draft.title.trim();
  if (title.length < 1 || title.length > 100) {
    throw new RangeError("标题去除首尾空白后必须为 1 至 100 个字符");
  }
  if (draft.description.length > 2000) {
    throw new RangeError("描述最多 2000 个字符");
  }
  if (!/^(0|[1-9]\d{0,8})$/.test(draft.priceCents)) {
    throw new TypeError("价格必须是 0 至 100000000 的十进制整数分");
  }
  const priceCents = Number(draft.priceCents);
  if (!Number.isSafeInteger(priceCents) ||
      priceCents < 0 ||
      priceCents > 100000000) {
    throw new RangeError("价格必须是 0 至 100000000 分");
  }
  return {
    title,
    description: draft.description,
    priceCents,
  };
}
```

完整文件：`market/packages/contracts/edit.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { parseDraft } from "./edit.js";

describe("parseDraft", () => {
  it.each(["0", "19900", "100000000"])(
    "accepts integer cents %s",
    (priceCents) => {
      expect(parseDraft({
        title: "  二手自行车  ",
        description: "可自提",
        priceCents,
      })).toEqual({
        title: "二手自行车",
        description: "可自提",
        priceCents: Number(priceCents),
      });
    },
  );

  it.each(["", "-1", "1.5", "1e3", "01", "100000001"])(
    "rejects invalid cents %s",
    (priceCents) => {
      expect(() => parseDraft({
        title: "台灯",
        description: "",
        priceCents,
      })).toThrow();
    },
  );

  it("rejects blank title and overlong description", () => {
    expect(() => parseDraft({
      title: "   ",
      description: "",
      priceCents: "0",
    })).toThrow();
    expect(() => parseDraft({
      title: "书架",
      description: "x".repeat(2001),
      priceCents: "12000",
    })).toThrow();
  });
});
```

从 `market/` 运行 contracts 现有测试脚本或：

```bash
pnpm --filter @market/contracts test
```

预期三个合法边界通过，六个非法金额和两个文本边界失败在断言内。若 contracts 包尚无 test script，
按现有工程测试模式增加 Vitest 脚本，不在教材仓库生成 package 或锁文件。

## 7. 邻里集市集成案例

### 7.1 React 编辑页完整文件

完整文件：`market/apps/react-web/src/listings/EditListingPage.tsx`

```tsx
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import type { Listing } from "@market/contracts";
import {
  ApiFailure,
  getListing,
  updateListing,
} from "@market/contracts/client";
import {
  draftOf,
  parseDraft,
} from "@market/contracts/edit";
import type { ListingDraft } from "@market/contracts/edit";
import { useAuth } from "../auth/AuthProvider";

const emptyDraft: ListingDraft = {
  title: "",
  description: "",
  priceCents: "",
};

export default function EditListingPage() {
  const { id = "" } = useParams();
  const auth = useAuth();
  const [base, setBase] = useState<Listing | null>(null);
  const [latest, setLatest] = useState<Listing | null>(null);
  const [draft, setDraft] = useState<ListingDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  const operation = useRef(false);

  useEffect(() => {
    const ownGeneration = ++generation.current;
    const controller = new AbortController();
    setBase(null);
    setLatest(null);
    setDraft(emptyDraft);
    setLoading(true);
    setBusy(false);
    setBlocked(false);
    setMessage("");

    getListing(id, controller.signal)
      .then((listing) => {
        if (ownGeneration !== generation.current) return;
        setBase(listing);
        setDraft(draftOf(listing));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted ||
            ownGeneration !== generation.current) return;
        setMessage(reason instanceof Error ? reason.message : "读取失败");
      })
      .finally(() => {
        if (ownGeneration === generation.current) setLoading(false);
      });

    return () => {
      controller.abort();
      generation.current += 1;
    };
  }, [id]);

  const owner = Boolean(base && auth.user?.id === base.ownerId);

  async function save() {
    if (!base || !owner || blocked || operation.current) return;
    const ownGeneration = generation.current;
    operation.current = true;
    setBusy(true);
    setMessage("");
    try {
      const saved = await updateListing(base, parseDraft(draft));
      if (ownGeneration !== generation.current) return;
      setBase(saved);
      setDraft(draftOf(saved));
      setLatest(null);
      setBlocked(false);
      setMessage(`已保存服务器版本 ${saved.version}`);
    } catch (reason) {
      if (ownGeneration !== generation.current) return;
      if (reason instanceof ApiFailure && reason.status === 409) {
        setBlocked(true);
        setMessage("版本冲突：草稿已保留，请重读并比较最新内容");
      } else if (reason instanceof ApiFailure && reason.status === 403) {
        setBlocked(true);
        setMessage("服务端拒绝此操作：草稿已保留，请核对身份和 requestId");
      } else {
        setBlocked(true);
        setMessage(reason instanceof Error
          ? `保存结果未知：${reason.message}；请先重读`
          : "保存结果未知：请先重读");
      }
    } finally {
      operation.current = false;
      if (ownGeneration === generation.current) setBusy(false);
    }
  }

  async function reread() {
    if (operation.current) return;
    const ownGeneration = generation.current;
    operation.current = true;
    setBusy(true);
    try {
      const next = await getListing(id);
      if (ownGeneration !== generation.current) return;
      setLatest(next);
      setBlocked(true);
      setMessage("已读取服务器最新内容；当前草稿和提交版本均未改变");
    } catch (reason) {
      if (ownGeneration === generation.current) {
        setMessage(reason instanceof Error ? reason.message : "重读失败");
      }
    } finally {
      operation.current = false;
      if (ownGeneration === generation.current) setBusy(false);
    }
  }

  function adoptLatestVersion() {
    if (!latest || auth.user?.id !== latest.ownerId) return;
    setBase(latest);
    setLatest(null);
    setBlocked(false);
    setMessage("已采用最新服务器版本；草稿仍保留，请检查后提交");
  }

  if (loading) return <p role="status">正在读取待编辑商品</p>;
  if (!base) {
    return (
      <main>
        <p role="alert">{message || "商品不可用"}</p>
        <Link to={`/listings/${encodeURIComponent(id)}`}>返回详情</Link>
      </main>
    );
  }

  return (
    <main>
      <h1>编辑商品</h1>
      <p>本次提交基于服务器版本 {base.version}</p>
      {!owner && (
        <p role="alert">当前身份不是商品所有者；后端仍会执行最终授权</p>
      )}
      <form onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}>
        <fieldset disabled={busy}>
          <label>
            标题
            <input
              required
              maxLength={100}
              value={draft.title}
              onChange={(event) => setDraft({
                ...draft,
                title: event.target.value,
              })}
            />
          </label>
          <label>
            描述
            <textarea
              maxLength={2000}
              value={draft.description}
              onChange={(event) => setDraft({
                ...draft,
                description: event.target.value,
              })}
            />
          </label>
          <label>
            价格（整数分）
            <input
              required
              inputMode="numeric"
              pattern="(0|[1-9][0-9]{0,8})"
              value={draft.priceCents}
              onChange={(event) => setDraft({
                ...draft,
                priceCents: event.target.value,
              })}
            />
          </label>
          <button disabled={!owner || blocked || busy}>保存</button>
        </fieldset>
      </form>
      <button type="button" disabled={busy} onClick={() => void reread()}>
        重读服务器内容，保留草稿
      </button>
      {latest && (
        <section aria-label="服务器最新内容">
          <h2>服务器最新版本 {latest.version}</h2>
          <p>标题：{latest.title}</p>
          <p>描述：{latest.description}</p>
          <p>价格：{latest.priceCents} 分；状态：{latest.status}</p>
          <button
            type="button"
            disabled={busy || auth.user?.id !== latest.ownerId}
            onClick={adoptLatestVersion}
          >
            已比较，采用该版本并保留草稿
          </button>
        </section>
      )}
      <p role="status">{message}</p>
      <Link to={`/listings/${encodeURIComponent(id)}`}>返回详情</Link>
    </main>
  );
}
```

在已有 router 导入此组件并增加：

```tsx
{ path: "listings/:id/edit", element: <EditListingPage /> }
```

该对象放入既有根 route 的 `children`。若同一 route element 会跨 id 复用，本文件的 Effect 已按
id 重置并用 generation 隔离旧结果，无需复制 router 创建第二份包装器。

### 7.2 Vue 编辑页完整文件

完整文件：`market/apps/vue-web/src/pages/EditListingPage.vue`

```vue
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import type { Listing } from "@market/contracts";
import {
  ApiFailure,
  getListing,
  updateListing,
} from "@market/contracts/client";
import {
  draftOf,
  parseDraft,
} from "@market/contracts/edit";
import type { ListingDraft } from "@market/contracts/edit";
import { useAuthStore } from "../stores/auth";

const route = useRoute();
const auth = useAuthStore();
const id = computed(() => String(route.params.id ?? ""));
const base = ref<Listing | null>(null);
const latest = ref<Listing | null>(null);
const draft = ref<ListingDraft>({
  title: "",
  description: "",
  priceCents: "",
});
const loading = ref(true);
const busy = ref(false);
const blocked = ref(false);
const message = ref("");
let generation = 0;

const owner = computed(
  () => Boolean(base.value && auth.user?.id === base.value.ownerId),
);

watch(id, (nextId, _oldId, onCleanup) => {
  const ownGeneration = ++generation;
  const controller = new AbortController();
  onCleanup(() => {
    controller.abort();
    generation += 1;
  });
  base.value = null;
  latest.value = null;
  draft.value = { title: "", description: "", priceCents: "" };
  loading.value = true;
  busy.value = false;
  blocked.value = false;
  message.value = "";

  getListing(nextId, controller.signal)
    .then((listing) => {
      if (ownGeneration !== generation) return;
      base.value = listing;
      draft.value = draftOf(listing);
    })
    .catch((reason: unknown) => {
      if (controller.signal.aborted || ownGeneration !== generation) return;
      message.value = reason instanceof Error ? reason.message : "读取失败";
    })
    .finally(() => {
      if (ownGeneration === generation) loading.value = false;
    });
}, { immediate: true });

async function save() {
  if (!base.value || !owner.value || blocked.value || busy.value) return;
  const ownGeneration = generation;
  busy.value = true;
  message.value = "";
  try {
    const saved = await updateListing(
      base.value,
      parseDraft(draft.value),
    );
    if (ownGeneration !== generation) return;
    base.value = saved;
    draft.value = draftOf(saved);
    latest.value = null;
    blocked.value = false;
    message.value = `已保存服务器版本 ${saved.version}`;
  } catch (reason) {
    if (ownGeneration !== generation) return;
    if (reason instanceof ApiFailure && reason.status === 409) {
      blocked.value = true;
      message.value = "版本冲突：草稿已保留，请重读并比较最新内容";
    } else if (reason instanceof ApiFailure && reason.status === 403) {
      blocked.value = true;
      message.value = "服务端拒绝此操作：草稿已保留，请核对身份和 requestId";
    } else {
      blocked.value = true;
      message.value = reason instanceof Error
        ? `保存结果未知：${reason.message}；请先重读`
        : "保存结果未知：请先重读";
    }
  } finally {
    if (ownGeneration === generation) busy.value = false;
  }
}

async function reread() {
  if (busy.value) return;
  const ownGeneration = generation;
  busy.value = true;
  try {
    const next = await getListing(id.value);
    if (ownGeneration !== generation) return;
    latest.value = next;
    blocked.value = true;
    message.value = "已读取服务器最新内容；当前草稿和提交版本均未改变";
  } catch (reason) {
    if (ownGeneration === generation) {
      message.value = reason instanceof Error ? reason.message : "重读失败";
    }
  } finally {
    if (ownGeneration === generation) busy.value = false;
  }
}

function adoptLatestVersion() {
  if (!latest.value || auth.user?.id !== latest.value.ownerId) return;
  base.value = latest.value;
  latest.value = null;
  blocked.value = false;
  message.value = "已采用最新服务器版本；草稿仍保留，请检查后提交";
}
</script>

<template>
  <p v-if="loading" role="status">正在读取待编辑商品</p>
  <main v-else-if="!base">
    <p role="alert">{{ message || "商品不可用" }}</p>
    <RouterLink :to="`/listings/${encodeURIComponent(id)}`">
      返回详情
    </RouterLink>
  </main>
  <main v-else>
    <h1>编辑商品</h1>
    <p>本次提交基于服务器版本 {{ base.version }}</p>
    <p v-if="!owner" role="alert">
      当前身份不是商品所有者；后端仍会执行最终授权
    </p>
    <form @submit.prevent="save">
      <fieldset :disabled="busy">
        <label>
          标题
          <input v-model="draft.title" required maxlength="100" />
        </label>
        <label>
          描述
          <textarea v-model="draft.description" maxlength="2000" />
        </label>
        <label>
          价格（整数分）
          <input
            v-model="draft.priceCents"
            required
            inputmode="numeric"
            pattern="(0|[1-9][0-9]{0,8})"
          />
        </label>
        <button :disabled="!owner || blocked || busy">保存</button>
      </fieldset>
    </form>
    <button type="button" :disabled="busy" @click="reread">
      重读服务器内容，保留草稿
    </button>
    <section v-if="latest" aria-label="服务器最新内容">
      <h2>服务器最新版本 {{ latest.version }}</h2>
      <p>标题：{{ latest.title }}</p>
      <p>描述：{{ latest.description }}</p>
      <p>价格：{{ latest.priceCents }} 分；状态：{{ latest.status }}</p>
      <button
        type="button"
        :disabled="busy || auth.user?.id !== latest.ownerId"
        @click="adoptLatestVersion"
      >
        已比较，采用该版本并保留草稿
      </button>
    </section>
    <p role="status">{{ message }}</p>
    <RouterLink :to="`/listings/${encodeURIComponent(id)}`">
      返回详情
    </RouterLink>
  </main>
</template>
```

在现有 Vue router 增加导入和 route record：

```ts
{ path: "/listings/:id/edit", component: EditListingPage }
```

详情页可以只对 owner 显示链接以改善体验，但直接输入 URL 时组件和后端仍必须正确拒绝非 owner。

### 7.3 双窗口冲突与预约验收

编辑冲突：

1. 浏览器 A、B 以同一 owner 打开版本 1；
2. A 修改价格并保存，响应 Listing version 为 2；
3. B 保留不同草稿并保存，Network 为 409 `VERSION_CONFLICT`；
4. B 的三个输入值不变，按钮进入 blocked；
5. B 点击重读，看到版本 2，但草稿仍不变；
6. B 点击明确采用，再保存，服务器响应版本 3。

未知 PATCH 结果：

1. 让 PATCH 已到达服务端后断开响应，或让客户端收到普通网络 `TypeError`；
2. React/Vue 都显示“保存结果未知”，保留草稿并进入 blocked；
3. 未重读、未采用前再次提交，Network 中没有第二条 PATCH；
4. 点击重读取得服务器事实后仍保持 blocked，比较后点击采用才解除；
5. 只有随后再次提交才允许产生新 PATCH，且使用重读到的 version。

对象授权：

1. 账号乙直接访问账号甲商品编辑 URL；
2. 页面显示非 owner，绕过 disabled 直接发 PATCH；
3. 服务端返回 403，数据库标题、金额和 version 不变。

原子预约：

1. 两个不同买家对同一 available 商品并发 POST；
2. 预期一个 201、一个 409 `RESERVATION_CONFLICT`；
3. 重读后两端都看到 reserved；
4. 数据库最终只有一个有效 Reservation。

最后一条必须有真实 API/数据库断言才算通过；静态页面、Mock 或两个禁用按钮不能证明原子性。

## 8. 常见错误与排查路径

### 明确错误：409 后替换草稿并自动重发

```ts
// 错误示例：用户输入被覆盖，且可能覆盖对方更改
const latest = await getListing(id);
setDraft(draftOf(latest));
await updateListing(latest, oldDraft);
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | 用户看到“保存成功”，自己或对方字段却被无提示覆盖 |
| 证据 | Network 为 409 -> GET -> 自动 PATCH；没有用户确认动作 |
| 原因 | 把业务冲突误当可透明重试的瞬时错误 |
| 修复 | base/draft/latest 分离；409 阻塞保存；显式比较和采用 |
| 复验 | 409 后输入逐字保持；没有第二条 PATCH；确认后才提交新 version |

### 快速定位表

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| `199.00` 被存成 199 分 | PATCH body `199` | 表单单位混乱 | 明示整数分并严格 parse | body/DB 都是 `19900` |
| 非 owner 仍能写 | 403 测试反而 200 | 后端只信前端按钮 | SQL/service 带 actor owner | DB 不变且 403 |
| A 商品响应覆盖 B | route 已是 B，内容是 A | 旧 GET 无 cleanup | abort + generation | 快切只显示 B |
| 连点发两条 PATCH | 两条相同 version | pending 锁设置太晚 | 同步 operation ref/boolean | 一次操作一条请求 |
| 网络失败后立刻重试 | 第一次其实已 version+1 | 未让非 ApiFailure 进入 blocked | 未知结果置 blocked，重读并采用后再提交 | 采用前无第二条 PATCH |
| 预约两次都 201 | DB 有两个有效预约 | 缺事务/唯一约束 | 修后端原子预约 | 一 201、一 409、count=1 |

## 9. 课后题

**1. 为什么保存成功后使用响应 version，而不是 `base.version + 1`？**
参考答案：服务器是状态权威，可能有触发器、其他字段变化或不同版本策略。客户端猜测会与真实响应
漂移。

**2. 409 后为何不把 latest 直接赋给 draft？**
参考答案：draft 是用户尚未提交的工作，直接替换会丢输入。latest 应单独展示，让用户决定合并。

**3. 防重复按钮能保证同一商品只有一个预约吗？**
参考答案：不能。其他标签、用户和服务实例仍可并发；数据库事务与唯一约束才是最终防线。

**4. 页面离开时 abort PATCH 是否等于取消保存？**
参考答案：不等于。请求可能已经到达并提交。重新进入页面后必须读取服务器状态。

## 10. 实践练习

### 基础：金额边界

在两端依次提交 `0`、`100000000`、`01`、`1.5`、`100000001`。记录在
`evidence/edit-cents.md`。完成标准：前两个成功并保持整数；后三个在客户端拒绝，直接绕过客户端时
后端仍拒绝非法值。

### 进阶：可见字段差异

在 latest 区域为 title/description/priceCents 增加“服务器值 / 我的草稿”对照，不自动合并。
完成标准：409 后三字段同时可比较，采用动作只更新 base version，draft 不变。

### 故障注入：迟到响应与未知提交

先延迟商品 A GET 后切到 B，证明 A 不覆盖 B；再让 PATCH 在服务器提交后断开响应，证明页面显示
“结果未知”、立即进入 blocked 且再次提交不产生 PATCH。显式 GET 发现新 version 后仍需比较并采用
才解除 blocked。记录现象、证据、原因、修复、复验五项，不通过自动重发制造绿色。

## 11. 阶段验收

- [ ] parser 覆盖金额 `0`、上限、负数、小数、科学计数、前导零和超上限。
- [ ] 两端编辑页都分离 base、draft、latest。
- [ ] owner 成功保存后使用服务端响应 version；非 owner 绕过 UI 仍为 403。
- [ ] 409 后草稿逐字保留，没有自动第二次 PATCH。
- [ ] latest 明确展示，只有用户采用后才使用新 version。
- [ ] 路由快切时旧 GET 不覆盖新商品，abort 不显示成业务错误。
- [ ] 同一页面连续点击只发一条 mutation。
- [ ] React/Vue 的非 ApiFailure/网络未知 PATCH 结果都置 blocked，草稿不变且立即重试不发请求。
- [ ] blocked 只在显式重读、比较并采用最新 version 后解除，不声称 abort 回滚。
- [ ] React/Vue 走同一五条编辑路径，数据结果与恢复语义相同。
- [ ] 原子预约只有在一 201、一 409、数据库 count=1 时记为运行通过。

## 12. 常见问题

**能自动合并不冲突字段吗？**
可以作为进阶，但必须比较 base/latest/draft 三方并定义字段规则。本课先使用明确人工采用，避免看似
智能却覆盖输入。

**为什么 `01` 被拒绝？**
它虽然可转成 1，但规范化前后文本不同，容易隐藏单位和输入错误。用户可输入 `1`。

**403 后要不要重新登录？**
先按稳定 code 判断。401 才明确要求认证；403 可能是非 owner、Origin 或 CSRF。查 requestId 和
当前身份，不循环登录。

**预约冲突与编辑冲突可以共用同一句文案吗？**
不应。都为 409，但恢复不同：编辑保留并比较草稿，预约重读商品状态且不能覆盖已有预约。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [MDN：HTTP 409](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409)：核对冲突状态语义。
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)：核对客户端取消边界。
- [React：Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)：理解 cleanup 和旧结果。
- [Vue：Watchers](https://vuejs.org/guide/essentials/watchers.html)：理解 route 参数观察与 cleanup。
- [PostgreSQL 18：Explicit Locking](https://www.postgresql.org/docs/18/explicit-locking.html)：复核后端行锁边界。
- [后端原子预约教程](../../08-backend/05-transactions-concurrency/02-atomic-reservations-concurrency-reproduction.md)：核对真实并发证据。

## 我现在能做到什么

我能让整数分编辑、对象授权、乐观锁和界面竞态形成完整恢复闭环：成功使用服务器 version，403 保留
输入，409 显式重读和采用，网络未知先查事实；我也能用相同证据验收 React/Vue，而不把按钮锁、
AbortController 或 Mock 当成数据库原子性。

## 单元导航

[章节 hub](../01-contract-integration.md) ·
[上一课：React Context 与 Vue Pinia 等价接入](03-react-vue-auth-data-integration.md) ·
[下一章：Docker Compose](../02-docker-compose.md) ·
[全栈交付卷目录](../README.md)
