# 纯函数与组件契约测试：断言用户行为而非实现细节

## 任务卡

- **任务**：为金额、草稿、reducer、会话顺序和发布表单建立会失败的自动化契约。
- **产出**：`src/contracts.test.ts`、`src/ListingForm.test.tsx` 与测试环境配置。
- **运行**：Vitest、jsdom、Testing Library、user-event，Node.js 24。
- **完成证据**：四个共享场景通过；错误金额实现与失败重置实现能稳定制造红灯。
- **边界**：Mock 只替代持久化边界，不证明真实 HTTP、Cookie、权限或数据库正确。

## 1. 任务背景

测试若只断言“组件存在”或内部 setter 被调用，金额单位错误、失败后草稿丢失、收藏重复和
会话迟到仍可能全部漏过。稳定契约应从用户输入、可访问名称、请求 DTO 和可见结果观察。

本课先测试纯规则，再测试组件交互。测试失败时修实现，不删除边界输入、不放宽断言，也不
用无意义 Mock 让错误代码变绿。

## 2. 学习目标

完成后你能：

1. 用表驱动测试固定金额完整字符串契约；
2. 验证 reducer 不变性与幂等目标；
3. 用 `userEvent` 按真实交互提交表单；
4. 用 role/label 查询可访问 DOM；
5. 用可控 Promise 测试异步顺序而非任意 sleep。

## 3. 预备知识

保留 `parsePrice`、`validateDraft`、`favoriteReducer` 和 `ListingForm`。价格规则：
`35.10 → 3510`，`0` 与 `1000000.00` 合法；负数、指数、前导零、三位小数和超过上限拒绝。
表单失败保留草稿，成功后才重置。

安装依赖：

```bash
pnpm add -D vitest jsdom @testing-library/react \
  @testing-library/user-event @testing-library/jest-dom
```

## 4. 核心理论

### 4.1 先证明测试能发现目标错误

红灯必须因目标行为缺失，而不是语法、路径或环境损坏。比如临时让价格解析接受 `3e2`，
应只有对应边界断言失败；恢复实现后全套通过。

### 4.2 Mock 应放在系统边界

表单测试可 Mock `onSave`，但金额解析、字段输入和错误展示保持真实。若连 validator 都
Mock，测试只证明 Mock 返回了预设值。

### 4.3 可访问查询更接近用户

`getByRole("button", {name: "发布"})` 同时验证语义和名称。class、组件实例、state 字段是
实现细节，重构后不应成为无意义的失败来源。

### 4.4 异步断言等待条件

`findByRole` 等节点出现，`waitFor` 重试断言。固定 sleep 在快机器浪费时间，在慢 CI 又可能
不足。顺序竞态用 deferred Promise 精确控制完成次序。

## 5. 元素、属性、API 或配置清单

| API | 用途 | 常见错误 |
| --- | --- | --- |
| `it.each` | 表驱动边界 | 把不同语义都塞进不可读一项 |
| `expect(...).toEqual` | 结构比较 | 只用 truthy 检查 0 |
| `userEvent.setup` | 接近用户的输入序列 | 直接改 DOM value |
| `getByRole` / `getByLabelText` | 可访问查询 | 用 class 定位主控件 |
| `findBy*` | 等待异步出现 | 未 await |
| `waitFor` | 等待断言成立 | 回调中制造副作用 |
| `vi.fn` | 替代边界并检查 DTO | Mock 业务规则本身 |
| `cleanup` | 隔离每个组件测试 | 测试共享 DOM |

## 6. 最小可运行案例

**完整文件：`apps/react-web/src/contracts.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { favoriteReducer, initialFavorites } from "./favorite-state";
import { parsePrice, validateDraft } from "./form";

describe("price-and-draft-contract", () => {
  it.each([
    ["35.10", 3510],
    ["0", 0],
    ["1000000.00", 100000000],
    ["-1", null],
    ["3e2", null],
    ["01", null],
    ["35.001", null],
    ["1000000.01", null],
  ])("parsePrice(%s)", (text, expected) => {
    expect(parsePrice(text)).toBe(expected);
  });

  it("trims text and produces integer cents", () => {
    expect(validateDraft({
      title: " 二手书架 ",
      description: " 可拆卸，配件齐全。 ",
      price: "120.00",
    })).toEqual({
      ok: true,
      value: {
        title: "二手书架",
        description: "可拆卸，配件齐全。",
        priceCents: 12000,
      },
    });
  });
});

describe("favorite-target-is-idempotent", () => {
  it("does not duplicate selected ids and preserves the input", () => {
    const action = { type: "saved", id: "lamp-1", selected: true } as const;
    const once = favoriteReducer(initialFavorites, action);
    const twice = favoriteReducer(once, action);
    expect(twice.ids).toEqual(["lamp-1"]);
    expect(initialFavorites.ids).toEqual([]);
  });

  it("keeps the previous selection after failure", () => {
    const selected = { ...initialFavorites, ids: ["lamp-1"] };
    const pending = favoriteReducer(selected, { type: "start", id: "lamp-1" });
    const failed = favoriteReducer(pending, {
      type: "failed",
      id: "lamp-1",
      message: "网络不可用",
    });
    expect(failed.ids).toEqual(["lamp-1"]);
    expect(failed.pending).toEqual([]);
  });
});
```

**命令：在 `apps/react-web` 执行**

```bash
pnpm exec vitest run src/contracts.test.ts
```

预期两组场景全部通过。渐进扩展：把 `parsePrice` 临时改成 `parseFloat * 100`，指数或尾随
文本相关测试必须先失败，再恢复严格实现。

## 7. 邻里集市集成案例

**完整文件：`apps/react-web/src/ListingForm.test.tsx`**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import ListingForm from "./ListingForm";

it("failed-publish-keeps-draft", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn()
    .mockRejectedValueOnce(new Error("服务暂不可用"))
    .mockResolvedValueOnce(undefined);

  render(<ListingForm onSave={onSave} />);
  await user.type(screen.getByLabelText("标题"), "二手书架");
  await user.type(screen.getByLabelText("描述"), "可拆卸，配件齐全。");
  await user.type(screen.getByLabelText("价格（元）"), "120.00");
  await user.click(screen.getByRole("button", { name: "发布" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("服务暂不可用");
  expect(screen.getByLabelText("标题")).toHaveValue("二手书架");
  expect(onSave).toHaveBeenLastCalledWith({
    title: "二手书架",
    description: "可拆卸，配件齐全。",
    priceCents: 12000,
  });

  await user.click(screen.getByRole("button", { name: "发布" }));
  await waitFor(() => {
    expect(screen.getByLabelText("标题")).toHaveValue("");
  });
  expect(screen.getByRole("status")).toHaveTextContent("发布成功");
});
```

测试环境：

**关键片段：`apps/react-web/vitest.config.ts`**

```ts
test: {
  environment: "jsdom",
  setupFiles: ["./src/test-setup.ts"],
  include: ["src/**/*.test.{ts,tsx}"],
}
```

`test-setup.ts` 导入 `@testing-library/jest-dom/vitest` 并在 afterEach cleanup。发布 Mock 只替代
持久化；输入、校验、整数分 DTO、错误和重置均由真实组件执行。

会话顺序测试使用手工 deferred：

```ts
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
```

先发请求、执行 logout、再 resolve，断言场景名 `late-session-result-is-ignored` 且 user 仍 null。

## 8. 常见错误与排查路径

**明确错误示例：**

```tsx
fireEvent.change(container.querySelector(".price")!, {
  target: { value: "120.00" },
});
expect(componentState.price).toBe("120.00");
```

它绕过可访问名称并断言内部状态，没有证明用户能提交整数分。

| 项目 | 记录 |
| --- | --- |
| 现象 | 发布失败后测试仍通过，但真实页面清空了草稿 |
| 证据 | 测试只断言 onSave 被调用，没有检查失败后的输入值 |
| 原因 | 断言停在内部回调，没有覆盖可见恢复行为 |
| 修复 | Mock 第一次 reject；查询 alert；断言三个输入仍保留 |
| 复验 | 错误实现先红；成功后重置、失败后保留两条路径都绿 |

不要把期望改成浮点元，也不要让 Mock validator 直接返回正确 DTO。

## 9. 课后题

1. 为什么 `toBeTruthy()` 不适合验证 0 分？
2. 为什么 jsdom 通过不证明 history fallback？
3. 为什么失败发布必须检查输入值？
4. 为什么 deferred 比 sleep 更适合竞态测试？

答案：

1. 0 是合法金额但为 falsy，且该断言没有检查单位。
2. jsdom 不启动真实静态服务器，也不覆盖浏览器导航栈。
3. 错误提示存在不代表草稿没有被意外清空。
4. deferred 精确控制完成顺序，不依赖机器速度。

## 10. 实践练习

**基础**：补充标题过短测试。验收：onSave 未调用，错误与输入关联。

**进阶**：实现 `late-session-result-is-ignored`，使用 deferred 控制先 logout 后 resolve。

**故障注入**：让失败 catch 也执行 reset。测试必须在“标题仍为二手书架”处失败；恢复为
仅成功重置后通过。

## 11. 阶段验收

- [ ] 金额合法上下界和五类非法形式有断言。
- [ ] reducer 幂等、不变性与失败保留有断言。
- [ ] 组件通过 label/role 操作。
- [ ] 发布请求体使用 12000 整数分。
- [ ] 失败保留草稿，成功才重置。
- [ ] 异步测试无任意 sleep。
- [ ] 已保存至少一次目标明确的红灯证据。
- [ ] Mock 没有替代验证、授权判断或用户事件。

## 12. 常见问题

**是否应该测试每个 Hook 调用次数？**

不应作为主契约。测试可见行为与纯状态结果，避免锁死实现。

**是否所有网络都要真实请求？**

组件层 Mock 明确边界；浏览器层再运行真实教学 API。两者不能互相冒充。

**快照测试够吗？**

大快照难表达金额、焦点和恢复语义，应以目标断言为主。

## 13. 扩展阅读

资料快照：2026-10-11。

- [Vitest Guide](https://vitest.dev/guide/)
- [Testing Library：Guiding Principles](https://testing-library.com/docs/guiding-principles)
- [Testing Library：About Queries](https://testing-library.com/docs/queries/about)
- [user-event Introduction](https://testing-library.com/docs/user-event/intro)
- [React：Testing Recipes](https://react.dev/learn)

兼容边界：示例按当前 Vitest 与 Testing Library API 编写；安装后记录实际补丁版本。jsdom
不实现完整布局、辅助技术树或所有浏览器导航行为。

## 我现在能做到什么

我能让测试先因目标错误失败，再用纯规则和可访问用户交互固定金额、草稿、收藏和异步顺序，
而不依赖组件内部实现。

## 单元导航

- 章节目录：[第 06 章目录](../README.md#第六章测试与无障碍)
- 下一单元：[路由、浏览器、无障碍与错误恢复](./02-router-browser-accessibility-errors.md)
