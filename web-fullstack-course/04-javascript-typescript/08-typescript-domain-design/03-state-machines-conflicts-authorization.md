# 状态机、版本冲突与授权边界：失败也要有合法去向

## 任务卡

- **任务**：用判别联合表达编辑、保存、成功、冲突和权限失败，并处理版本化补丁。
- **产出**：完整文件 `ts-lab/src/state-machine.ts`。
- **运行**：复用严格项目，双线类型检查后构建并执行模拟的 409、成功和 401 结果。
- **完成证据**：确定的状态迁移输出、非法版本拒绝和跨层保证说明。
- **边界**：响应均为本地受控夹具；真实身份、事务和数据库唯一性未在本单元执行。

## 1. 任务背景

用户读取商品版本 1，编辑期间别人把它改成版本 2。客户端提交旧版本时，服务端应返回
409，而不是静默覆盖。页面需要保留草稿、展示当前服务端版本，并让用户审查后决定。

如果只用 `saving/error/data` 三个可选字段，冲突容易被当成普通错误，草稿可能丢失；
如果客户端把版本自行加一重试，又绕过了并发保护。状态机把每个合法阶段及其数据写清，
但真正比较版本、检查所有者和建立预约唯一性仍属于服务端。

## 2. 学习目标

完成后你能：

1. 设计 `editing/saving/saved/conflict/error` 判别状态；
2. 用类型化结果区分 200、400、409、401 和 403；
3. 在 409 时同时保留草稿与服务端当前资源；
4. 拒绝补丁版本和编辑基线不一致；
5. 解释同源身份、对象授权和事务唯一性的责任边界。

## 3. 预备知识

需要保留 `contracts.ts`，理解 `ListingPatch`、`version` 和 `ApiErrorBody`。
同源 HttpOnly Cookie 只能让服务端识别会话；前端脚本不能读取该 Cookie，也不能因为按钮
可见就获得编辑权限。写请求仍需 CSRF 防护，CORS 不替代 CSRF 或对象授权。

## 4. 核心理论

### 4.1 状态迁移必须保留恢复信息

`saving` 保留本次草稿和补丁；`conflict` 保留草稿与服务端当前 Listing；
`error` 保留草稿和稳定错误代码。这样页面不会为了显示失败而丢掉用户输入。

### 4.2 HTTP 状态具有不同恢复语义

- 200：已有资源更新成功；
- 400：请求字段或参数不满足契约，使用稳定 `VALIDATION` 错误并保留草稿；
- 401：没有有效身份，应引导重新认证；
- 403：身份已知但无权操作，不应自动重试；
- 409：资源状态冲突，应读取当前资源并让用户处理。

不能把这些状态全部转换成 200 加文本判断。

### 4.3 乐观版本需要原子比较

客户端发送读到的 `version`。后端必须在同一事务或条件更新中比较并写入，成功后产生新版本。
客户端自己 `version + 1` 只是在猜测，不能证明中间没有其他写入。

### 4.4 不同保证不能互相替代

前端状态机保证界面不会进入声明外的组合；后端授权保证当前会话可操作目标；
数据库唯一约束或事务保证并发预约最多一个有效记录。禁用按钮只改善体验。

## 5. 元素、属性、API 或配置清单

| 状态/协议 | 必需数据 | 恢复动作 |
| --- | --- | --- |
| `editing` | 草稿、读取版本 | 校验后提交 |
| `saving` | 草稿、补丁 | 等待一个终态 |
| `saved` | 服务端 Listing | 使用服务端新版本 |
| `conflict` | 草稿、当前 Listing | 审查差异后重新提交 |
| `error` | 草稿、代码、requestId | 按 401/403/其他处理 |
| 400 | `VALIDATION` 错误体 | 保留草稿并定位输入问题 |
| 409 | 当前资源或可重新读取线索 | 不盲目重试 |
| 401/403 | 标准错误体 | 分别认证或解释权限 |

## 6. 最小可运行案例

完整文件 `ts-lab/src/state-machine.ts`：

```ts
import {
  createCents,
  type ApiErrorBody,
  type Listing,
  type ListingDraft,
  type ListingPatch,
} from "./contracts.js";

type EditingState = {
  phase: "editing";
  draft: ListingDraft;
  baseVersion: number;
};

type SavingState = {
  phase: "saving";
  draft: ListingDraft;
  patch: ListingPatch;
};

type ConflictState = {
  phase: "conflict";
  draft: ListingDraft;
  current: Listing;
};

type SaveState =
  | EditingState
  | SavingState
  | { phase: "saved"; listing: Listing }
  | ConflictState
  | {
      phase: "error";
      draft: ListingDraft;
      code: "VALIDATION" | "AUTHENTICATION_REQUIRED" | "FORBIDDEN";
      requestId: string;
      message: string;
    };

type SaveOutcome =
  | { ok: true; status: 200; listing: Listing }
  | {
      ok: false;
      status: 400;
      error: ApiErrorBody & { code: "VALIDATION" };
    }
  | { ok: false; status: 409; current: Listing }
  | { ok: false; status: 401 | 403; error: ApiErrorBody };

function assertNever(value: never): never {
  throw new Error(`unhandled outcome: ${JSON.stringify(value)}`);
}

function beginSave(state: EditingState, patch: ListingPatch): SavingState {
  if (patch.version !== state.baseVersion) {
    throw new Error("patch version differs from editing base");
  }
  return { phase: "saving", draft: state.draft, patch };
}

function finishSave(state: SavingState, outcome: SaveOutcome): SaveState {
  switch (outcome.status) {
    case 200:
      return { phase: "saved", listing: outcome.listing };
    case 400:
      return {
        phase: "error",
        draft: state.draft,
        code: "VALIDATION",
        requestId: outcome.error.requestId,
        message: outcome.error.message,
      };
    case 409:
      return {
        phase: "conflict",
        draft: state.draft,
        current: outcome.current,
      };
    case 401:
      return {
        phase: "error",
        draft: state.draft,
        code: "AUTHENTICATION_REQUIRED",
        requestId: outcome.error.requestId,
        message: outcome.error.message,
      };
    case 403:
      return {
        phase: "error",
        draft: state.draft,
        code: "FORBIDDEN",
        requestId: outcome.error.requestId,
        message: outcome.error.message,
      };
    default:
      return assertNever(outcome);
  }
}

function continueAfterConflictReview(state: ConflictState): EditingState {
  return {
    phase: "editing",
    draft: state.draft,
    baseVersion: state.current.version,
  };
}

const draft: ListingDraft = {
  title: "阅读灯",
  description: "保留我的草稿",
  priceYuan: "19.90",
};
const version1: Listing = {
  id: "listing-1",
  title: "台灯",
  description: "旧描述",
  priceCents: createCents(1990),
  status: "available",
  ownerId: "user-1",
  version: 1,
  createdAt: "2026-10-11T08:00:00.000Z",
};
const version2: Listing = {
  ...version1,
  description: "另一位会话已更新",
  version: 2,
};

const editing: EditingState = {
  phase: "editing",
  draft,
  baseVersion: version1.version,
};
const firstSaving = beginSave(editing, {
  version: editing.baseVersion,
  title: "阅读灯",
});
console.log(`saving:v${firstSaving.patch.version}`);

const conflicted = finishSave(firstSaving, {
  ok: false,
  status: 409,
  current: version2,
});
if (conflicted.phase !== "conflict") throw new Error("expected conflict");
console.log(
  `conflict:server-v${conflicted.current.version},draft=${conflicted.draft.title}`,
);

const reviewed = continueAfterConflictReview(conflicted);
const secondSaving = beginSave(reviewed, {
  version: reviewed.baseVersion,
  title: reviewed.draft.title,
});
const saved = finishSave(secondSaving, {
  ok: true,
  status: 200,
  listing: { ...version2, title: "阅读灯", version: 3 },
});
if (saved.phase !== "saved") throw new Error("expected saved");
console.log(`saved:${saved.listing.id}@v${saved.listing.version}`);

const invalid = finishSave(firstSaving, {
  ok: false,
  status: 400,
  error: {
    code: "VALIDATION",
    message: "标题长度不合法",
    requestId: "request-400",
  },
});
if (invalid.phase !== "error") throw new Error("expected validation error");
console.log(`${invalid.code}:${invalid.requestId}`);

const unauthorized = finishSave(firstSaving, {
  ok: false,
  status: 401,
  error: {
    code: "UNAUTHENTICATED",
    message: "请重新登录",
    requestId: "request-401",
  },
});
if (unauthorized.phase !== "error") throw new Error("expected error");
console.log(`${unauthorized.code}:${unauthorized.requestId}`);
```

`continueAfterConflictReview` 只应在用户或明确策略审查差异后调用；它不自动合并字段。

## 7. 邻里集市集成案例

运行：

```bash
pnpm typecheck:all
pnpm build
node dist/state-machine.js
```

完整输出：

```text
saving:v1
conflict:server-v2,draft=阅读灯
saved:listing-1@v3
VALIDATION:request-400
AUTHENTICATION_REQUIRED:request-401
```

真实客户端还需要：

1. PATCH 发送 `ListingPatch` 与同源凭据，并由 CSRF 机制保护；
2. 200 响应先作为 `unknown` 解析为完整 Listing；
3. 400 `VALIDATION` 保留草稿、字段错误与 requestId；
4. 409 响应中的当前资源也必须解析，或按 requestId 重新 GET；
5. 401/403 错误体经过 `parseApiError`；
6. 请求取消不撤销服务端已提交事务，取消后仍可能需要重新读取。

本案例只测试纯迁移，不声称真实 HTTP 已执行。

## 8. 常见错误与排查路径

**明确错误示例：**

```ts
async function overwriteAfterConflict(patch: ListingPatch): Promise<void> {
  patch.version += 1;
  await sendAgain(patch);
}
```

除了引用了未定义的教学占位函数，这种策略的根本错误是客户端猜测版本并盲目重试。
另一错误是看到“编辑”按钮就认为服务端会授权。

| 项目 | 记录 |
| --- | --- |
| 现象 | 两位用户的修改互相覆盖，或 409 后无限重试 |
| 证据 | 客户端在本地递增 version；后端更新没有条件比较 |
| 原因 | 把版本号当客户端计数器，没有原子并发控制 |
| 修复 | 发送读取版本；后端条件更新；409 返回/读取当前资源并进入冲突态 |
| 复验 | 旧版本写入稳定得到 409，草稿保留；审查后新提交使用服务端当前版本 |

不要通过放宽类型、捕获后返回成功或删除 409 分支让测试变绿。

## 9. 课后题

1. 为什么 401 与 403 不应合并成“没有数据”？
2. 409 后为什么不能直接 `version += 1`？
3. 禁用预约按钮为什么不能保证唯一预约？
4. 状态机通过是否证明服务端事务正确？

答案：

1. 前者缺有效身份，后者身份已知但无权；恢复动作不同。
2. 客户端不知道期间发生了几次修改，也未审查新内容。
3. 其他浏览器和进程仍可并发请求，需服务端事务或数据库约束。
4. 不能；它只验证前端纯状态迁移，需要独立接口和并发测试。

## 10. 实践练习

**基础**：增加 403 结果，预期状态码为 `FORBIDDEN`，草稿不丢失。

参考答案：

```ts
const forbidden = finishSave(firstSaving, {
  ok: false,
  status: 403,
  error: {
    code: "NOT_OWNER",
    message: "只能编辑自己的商品",
    requestId: "request-403",
  },
});
if (forbidden.phase !== "error" || forbidden.code !== "FORBIDDEN") {
  throw new Error("expected forbidden state");
}
```

**进阶**：为冲突页写纯展示函数，输出当前版本和草稿标题。参考标准：只接收
`ConflictState`，不在展示函数中重新发请求或修改草稿。

**故障注入**：把补丁版本改为 99。`beginSave` 必须在发请求前拒绝
`patch version differs from editing base`；恢复正确版本后输出不变。

## 11. 阶段验收

- [ ] 状态机完整文件在两条编译器线上通过。
- [ ] 200 进入 saved，400 保留草稿并进入 `VALIDATION` error，409 进入 conflict。
- [ ] 401 与 403 进入不同稳定代码的 error。
- [ ] 冲突状态同时保留草稿和当前服务端资源。
- [ ] 补丁版本与编辑基线不一致时拒绝。
- [ ] 新增 outcome 状态会触发 `never` 检查。
- [ ] 文档没有把模拟响应描述成真实 API 通过。
- [ ] 能指出授权、版本比较和预约唯一性的服务端所有者。

## 12. 常见问题

**PATCH 成功一定返回 200 吗？**

常见为 200 或 204。本课的编辑契约返回完整资源并使用 200；创建资源的 201 属于另一条状态机，
不能混入编辑 outcome 来放宽穷尽检查。

**409 是否只用于乐观锁？**

不是。它表示请求与当前资源状态冲突，具体恢复信息由接口契约定义。

**客户端能在冲突后自动合并吗？**

只有字段级规则明确且不会破坏业务时才可设计；本课要求用户审查，避免静默覆盖。

**CORS 配好后是否无需对象授权？**

不是。CORS 约束浏览器跨源读取，不判断当前用户是否拥有某件商品。

## 13. 扩展阅读

资料快照：2026-10-11。

- [RFC 9110：201 Created](https://www.rfc-editor.org/rfc/rfc9110.html#name-201-created)
- [RFC 9110：401 Unauthorized](https://www.rfc-editor.org/rfc/rfc9110.html#name-401-unauthorized)
- [RFC 9110：403 Forbidden](https://www.rfc-editor.org/rfc/rfc9110.html#name-403-forbidden)
- [RFC 9110：409 Conflict](https://www.rfc-editor.org/rfc/rfc9110.html#name-409-conflict)
- [MDN：HTTP conditional requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests)
- [OWASP：Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP：Cross-Site Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

兼容边界：具体状态码、冲突体和 CSRF 机制应由真实 API 契约固定。本单元未执行服务端、
数据库、跨用户并发或真实 Cookie 测试。

## 我现在能做到什么

我能让保存的每个成功与失败都有合法状态，保留冲突恢复所需数据，并清楚说明前端状态、
后端授权和数据库一致性各自负责什么。

## 单元导航

- 上一单元：[`unknown`、运行时解析器与错误路径](./02-unknown-runtime-parsers-errors.md)
- 下一单元：[第 09 章入口](../09-testing-debugging-algorithms.md)
