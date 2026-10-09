# 23-React 组件测试与 Testing Library

## 目标

组件测试验证“一个组件在真实浏览器般的环境中，面对用户操作和接口数据时，是否表现出正确行为”。它位于纯函数单元测试与 E2E 测试之间：比单元测试更贴近用户，比 E2E 更快、更稳定、更容易定位问题。本单元学习以 Vitest 为运行器、Testing Library 为交互哲学的组件测试体系。

完成本知识单元后，学员应能够：

1. 在 Vite + React + TypeScript 项目中配置 Vitest 与 jsdom，编写并运行第一个组件测试。
2. 使用 Testing Library 的 `render` 与 `screen`，按“角色 → 标签 → 文本”的查询优先级定位元素，区分 `getBy`、`queryBy`、`findBy` 的使用时机。
3. 使用 `user-event` 模拟真实用户的点击、键入、选择和键盘操作，而不是只派发孤立的 DOM 事件。
4. 使用 `waitFor`/`findBy` 处理异步渲染，理解超时与重试机制，杜绝固定延时等待。
5. 使用 `vi.mock` 隔离模块，使用 MSW 在网络层拦截请求，构造成功、失败和延迟等稳定场景。
6. 为回调、表单与异步数据流编写行为导向的测试；坚持不测实现细节，并掌握命名、结构与替身策略上的可维护性原则。

本单元的核心信念是：测试越像用户使用软件，就越能给重构提供保护，也越不会因为内部改写而批量崩溃。

## 技术栈

| 工具或库 | 当前稳定版本线 | 用途 | 学习要求 |
|---|---|---|---|
| Vitest | 3.x 稳定版 | 测试运行器、断言、Mock | 掌握配置、`describe/it/expect`、`vi.fn`、`vi.mock` |
| jsdom | 当前稳定版 | 浏览器 DOM 环境模拟 | 理解其能力边界（有 DOM、无真实布局与绘制） |
| @testing-library/react | 16.x 稳定版 | 渲染组件与清理 | 掌握 `render`、`screen`、`within`、`act` 相关用法 |
| @testing-library/user-event | 14.x 稳定版 | 高级用户交互模拟 | 掌握 `setup`、`click`、`type`、`clear`、`selectOptions`、`keyboard` |
| @testing-library/jest-dom | 6.x 稳定版 | DOM 风格断言匹配器 | 掌握 `toBeInTheDocument`、`toHaveTextContent`、`toBeDisabled` 等 |
| MSW | 2.x 稳定版 | 网络请求拦截 | 掌握 `setupServer`、`http.get/post`、`HttpResponse`、运行时改 handler |
| React | 19.x | 被测 UI 库 | 测试覆盖第 21、22 单元的表单与异步组件 |
| ESLint | 9.x flat config | 测试代码质量 | 测试文件同样受规则约束 |

约定：

- 示例显式从 `vitest` 导入 `describe/it/expect`，配置中 `globals: false`，避免依赖隐式全局。
- 组件测试中的接口地址使用 `https://api.example.com`，由 MSW 拦截，测试不访问真实网络。
- 断言同时使用 Vitest 原生匹配器与 jest-dom DOM 匹配器；二者互补。

## 详细的理论知识讲解和示例伪代码

### 1. Vitest + jsdom 配置与第一个测试

#### 1.1 安装与配置

```bash
pnpm add -D vitest jsdom @testing-library/react @testing-library/user-event
pnpm add -D @testing-library/jest-dom @vitejs/plugin-react
pnpm add -D msw
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// globals: false 时显式注册清理，保证每个用例后的 DOM 与订阅被移除
afterEach(() => {
  cleanup();
});
```

`package.json` 脚本：

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

#### 1.2 第一个测试

```tsx
// Welcome.tsx
type WelcomeProps = { name: string };

export function Welcome(props: WelcomeProps) {
  return <h1>你好，{props.name}</h1>;
}
```

```tsx
// Welcome.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Welcome } from './Welcome';

describe('Welcome', () => {
  it('渲染传入的姓名', () => {
    render(<Welcome name="小林" />);

    expect(
      screen.getByRole('heading', { name: '你好，小林' }),
    ).toBeInTheDocument();
  });
});
```

#### 1.3 与 Web 的关系

jsdom 用 JavaScript 实现了一套足够完整的 DOM：`document`、事件、属性、表单 API 都在，React 像在浏览器里一样把组件提交到“页面”。但 jsdom 不做布局（所有元素尺寸为零）、不绘制、不实现完整的动画与导航，因此它适合验证结构、属性和交互逻辑，不能验证像素、真实滚动性能或跨浏览器样式问题——那是 E2E 与手工测试的职责。

#### 1.4 常见误区

> 误区一：认为“Vitest 通过了，浏览器里就一定没问题”。

jsdom 与真实浏览器存在差异；关键路径仍需 Playwright 覆盖。

> 误区二：在多个测试文件中重复初始化全局环境。

环境配置只放 `setupFiles`，不要在每个用例顶部 import 匹配器。

### 2. render、screen 与查询优先级

#### 2.1 render 与 screen

`render(<Component />)` 把组件挂载到 jsdom 的容器中；`screen` 绑定整个文档体，建议优先使用，因为它不依赖 `render` 的返回结构，代码更稳定。需要在某个容器内查询时使用 `within`。

```tsx
import { render, screen, within } from '@testing-library/react';

export function NavigationExample() {
  return (
    <nav aria-label="主导航">
      <a href="/home">首页</a>
      <a href="/reports">报表</a>
    </nav>
  );
}

// 测试中
render(<NavigationExample />);
const nav = screen.getByRole('navigation', { name: '主导航' });
expect(within(nav).getByRole('link', { name: '首页' })).toHaveAttribute(
  'href',
  '/home',
);
```

#### 2.2 查询优先级

Testing Library 提供按可访问性排序的查询族，优先级从高到低：

| 优先级 | 查询 | 适用 |
|---:|---|---|
| 1 | `getByRole('button', { name: '保存' })` | 所有人可感知的元素，首选 |
| 2 | `getByLabelText('邮箱')` | 表单字段 |
| 3 | `getByPlaceholderText(...)` | 没有 label 时的过渡方案 |
| 4 | `getByText('提交成功')` | 非交互文本 |
| 5 | `getByDisplayValue(...)` | 按当前值定位输入 |
| 6 | `getByAltText(...)`、`getByTitle(...)` | 图片、带 title 的元素 |
| 7 | `getByTestId(...)` | 以上都不适用时的最后手段 |

按角色查询天然要求组件写得语义化：没有 `aria-label` 的图标按钮、用 `<div onClick>` 伪装的按钮都查不到——测试会“倒逼”可访问性改进。

#### 2.3 getBy / queryBy / findBy 与多选版本

| 形式 | 找不到时 | 找到多个时 | 典型用途 |
|---|---|---|---|
| `getByXxx` | 抛错 | 抛错 | 期望元素存在（同步） |
| `queryByXxx` | 返回 null | 抛错 | 断言元素不存在 |
| `findByXxx` | 超时抛错 | 重试期间多个可接受 | 等待异步元素出现 |
| `getAllByXxx` / `queryAllByXxx` / `findAllByXxx` | 同单值规则 | 返回数组 | 同级多个元素 |

```tsx
import { render, screen } from '@testing-library/react';

function ResultSection({ showHint }: { showHint: boolean }) {
  return (
    <section>
      <h2>结果</h2>
      {showHint ? <p>请修正后再提交</p> : null}
    </section>
  );
}

// 断言“不存在”必须用 queryBy，而不是 try/catch getBy
render(<ResultSection showHint={false} />);
expect(screen.queryByText('请修正后再提交')).not.toBeInTheDocument();

render(<ResultSection showHint={true} />);
expect(screen.getByText('请修正后再提交')).toBeInTheDocument();
```

#### 2.4 与 Web 的关系

查询优先级不是 Testing Library 的主观偏好，而是在复刻“网页用户如何找到元素”：屏幕阅读器和键盘用户通过角色树（button、heading、list、textbox）导航，视觉用户通过标签和文本识别目标。`getByRole` 读取的正是浏览器计算出的可访问性树，`getByLabelText` 依赖 HTML 中 label 与控件的真实关联。用这些查询写测试，等于验证“真实用户（含辅助技术用户）是否能感知并操作这个元素”；只有当元素在可访问性层面不存在时，才退而使用 test-id。

#### 2.5 常见误区

> 误区一：到处使用 test-id。

test-id 与用户体验无关，class 名和结构调整时还容易失效；应先问“用户怎么找到它”。

> 误区二：用 `getBy` 断言元素消失。

元素不存在时 getBy 直接抛错，测试失败原因会变成“找不到元素”而非断言不通过；断言不存在使用 queryBy。

### 3. user-event：像用户一样操作

#### 3.1 定义

`fireEvent` 只是向 DOM 派发一个合成事件；`@testing-library/user-event` 在其之上模拟完整交互：点击会先聚焦再触发一系列事件，键入会逐字符触发 keydown/keypress/input/keyup 并尊重 maxlength、只读、禁用等约束，更接近真人行为。

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';

function EchoField() {
  const [value, setValue] = useState('');
  return (
    <label>
      搜索
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <output>{value}</output>
    </label>
  );
}

describe('EchoField', () => {
  it('逐字符输入并显示', async () => {
    render(<EchoField />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('搜索'), 'react 测试');

    expect(screen.getByRole('status')).toHaveTextContent('react 测试');
  });
});
```

常用操作：

```tsx
const user = userEvent.setup();

await user.click(screen.getByRole('button', { name: '删除' });
await user.clear(screen.getByLabelText('标题'));
await user.type(screen.getByLabelText('标题'), '新标题');
await user.selectOptions(screen.getByLabelText('分类'), 'tech');
await user.tab(); // 验证焦点顺序
await user.keyboard('{Enter}');
await user.hover(screen.getByText('提示源'));
```

#### 3.2 与 Web 的关系

真实交互是“多个事件 + 焦点变化 + 浏览器默认行为”的组合。例如勾选复选框时浏览器先移动焦点、切换 checked、再触发 click 与 change；仅派发 change 事件的测试可能在真实操作中暴露问题。user-event 还默认遵守 `disabled` 等约束，当测试试图点击禁用按钮时会得到错误，帮助发现真实可操作性问题。

#### 3.3 常见误区

> 误区一：不 await user-event 返回的 Promise。

交互后的状态更新发生在异步事件链中，缺少 await 会产生断言先于渲染执行的偶发失败。

> 误区二：需要验证焦点行为时仍用 fireEvent.mouseDown 之类的手工事件。

`user.click` 与 `user.tab()` 自动管理焦点；手拼事件链容易与浏览器行为不一致。

### 4. waitFor 与 findBy：处理异步

#### 4.1 findBy：等待出现的首选

`findByRole` 等方法等价于“在超时时间内反复尝试 getBy，直到成功或超时”，默认超时 1000ms：

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

function SaveButton() {
  const [saved, setSaved] = useState(false);

  if (saved) {
    return <p role="status">保存成功</p>;
  }

  return (
    <button
      type="button"
      onClick={() => {
        setTimeout(() => setSaved(true), 50);
      }}
    >
      保存
    </button>
  );
}

it('点击后异步出现成功提示', async () => {
  const user = userEvent.setup();
  render(<SaveButton />);

  await user.click(screen.getByRole('button', { name: '保存' }));

  // 不需要 sleep，自动轮询直到元素出现
  expect(await screen.findByRole('status')).toHaveTextContent('保存成功');
});
```

#### 4.2 waitFor：等待任意条件

当等待的结果不是“某个查询成功”（例如等待 Mock 函数被调用、等待文本从 A 变 B），使用 `waitFor`：

```tsx
import { waitFor } from '@testing-library/react';
import { vi } from 'vitest';

const onSaved = vi.fn();

await waitFor(
  () => {
    expect(onSaved).toHaveBeenCalledWith({ id: 'item-1' });
  },
  { timeout: 1000, interval: 50 },
);
```

还可以用 `waitForElementToBeRemoved` 明确表达“等待加载态消失”，比轮询否定断言更语义化。

#### 4.3 与 Web 的关系

网络往返、定时器、Promise 微任务让真实页面的更新天然异步，而且耗时不确定。固定延时（等待 1000ms）在快机器上浪费时间，在慢机器或 CI 高负载时又不够，是最常见的“偶发红”来源。可轮询断言把“等待时间”变成“等待条件”，既快又稳。

#### 4.4 常见误区

> 误区一：把等待包在断言外层，断言本身仍只执行一次。

应让断言在 `waitFor` 回调内反复执行，或直接使用 findBy。

> 误区二：配合 fake timers 时没有推进时间。

启用模拟计时器后，需要按测试库文档在 `advanceTimersWrapper` 中推进，否则 findBy 永远等不到。

### 5. Mock 模块与 MSW 拦截网络

#### 5.1 vi.mock：隔离模块边界

当被测组件依赖难以在测试中运行的模块（导航、埋点、复杂第三方 SDK），用 `vi.mock` 替换它：

```tsx
// src/features/tracker.ts
export function track(event: string) {
  // 真实埋点实现
}
```

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackMock = vi.fn();

vi.mock('../features/tracker', () => ({
  track: (event: string) => trackMock(event),
}));

function ShareButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        const { track } = await import('../features/tracker');
        track('share_click');
      }}
    >
      分享
    </button>
  );
}

describe('ShareButton', () => {
  beforeEach(() => {
    trackMock.mockClear();
  });

  it('点击时上报分享事件', async () => {
    const user = userEvent.setup();
    render(<ShareButton />);

    await user.click(screen.getByRole('button', { name: '分享' }));

    await expect
      .poll(() => trackMock.mock.calls.length)
      .toBe(1);
    expect(trackMock).toHaveBeenCalledWith('share_click');
  });
});
```

#### 5.2 MSW：在网络层拦截

更推荐的做法是不 mock fetch 本身，而让组件发出真实请求，由 MSW 在网络层返回可控响应——组件、请求封装和序列化逻辑全部得到真实执行。

```ts
// src/test/server.ts
import { setupServer } from 'msw/node';

export const server = setupServer();
```

```ts
// src/test/setup.ts 中追加生命周期
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
```

在测试中声明场景：

```tsx
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';

type Item = { id: string; title: string };

const items: Item[] = [
  { id: '1', title: '第一篇' },
  { id: '2', title: '第二篇' },
];

beforeEach(() => {
  server.use(
    http.get('https://api.example.com/v1/items', () => {
      return HttpResponse.json({ items });
    }),
  );
});
```

失败与延迟场景：

```tsx
server.use(
  http.get('https://api.example.com/v1/items', () => {
    return HttpResponse.json({ message: 'boom' }, { status: 500 });
  }),
);

server.use(
  http.get('https://api.example.com/v1/items', async () => {
    await delay(200);
    return HttpResponse.json({ items });
  }),
);

async function delay(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
```

校验请求内容（配合 `waitFor`）：

```tsx
let requestBody: { title: string } | null = null;

server.use(
  http.post('https://api.example.com/v1/items', async ({ request }) => {
    requestBody = (await request.json()) as { title: string };
    return HttpResponse.json({ id: 'new-1' }, { status: 201 });
  }),
);
```

#### 5.3 与 Web 的关系

组件发出的请求要经过 URL 拼接、请求头、序列化、凭据策略等多个环节，mock 掉整个 fetch 会让这些环节完全失去覆盖。MSW 拦截发生在请求发出之后、网络到达之前，既保持隔离性（不依赖后端、不产生真实流量），又保留了请求链路的真实性，还能让同一套 handler 在 E2E 甚至开发环境复用。

#### 5.4 常见误区

> 误区一：全局 mock `globalThis.fetch`，手写一套只认某个参数的假实现。

请求形状稍变测试就与真实行为脱节；优先使用 MSW。

> 误区二：忘记 `resetHandlers`，上一个用例的 handler 污染后续用例。

每个用例后重置，并在未声明请求时让 `onUnhandledRequest: 'error'` 暴露意外流量。

### 6. 回调与表单测试

#### 6.1 回调测试

```tsx
type ItemRowProps = {
  id: string;
  title: string;
  onDelete: (id: string) => void;
};

function ItemRow(props: ItemRowProps) {
  return (
    <li>
      <span>{props.title}</span>
      <button type="button" onClick={() => props.onDelete(props.id)}>
        删除
      </button>
    </li>
  );
}

it('点击删除时把 id 传给回调', async () => {
  const onDelete = vi.fn();
  const user = userEvent.setup();

  render(<ItemRow id="item-7" title="报告" onDelete={onDelete} />);

  await user.click(screen.getByRole('button', { name: '删除' }));

  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onDelete).toHaveBeenCalledWith('item-7');
});
```

#### 6.2 表单测试：校验、提交与服务端错误

直接复用第 21 单元的 RHF + Zod 表单模式，从用户视角覆盖完整链路：

```tsx
it('失焦出现错误，修正后可以提交', async () => {
  const user = userEvent.setup();

  server.use(
    http.post('https://api.example.com/v1/items', () => {
      return HttpResponse.json({ id: 'new-1' }, { status: 201 });
    }),
  );

  render(<ArticleForm />);

  await user.click(screen.getByLabelText('标题'));
  await user.tab(); // 触发失焦校验

  expect(await screen.findByRole('alert')).toHaveTextContent('标题不能为空');

  await user.type(screen.getByLabelText('标题'), '合法标题');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '发布' }));

  await waitFor(() => {
    expect(screen.getByText('发布成功')).toBeInTheDocument();
  });
});

it('服务端返回 400 时回填字段错误', async () => {
  const user = userEvent.setup();

  server.use(
    http.post('https://api.example.com/v1/items', () => {
      return HttpResponse.json(
        {
          code: 'VALIDATION_FAILED',
          issues: [{ field: 'title', message: '标题包含违规内容' }],
        },
        { status: 400 },
      );
    }),
  );

  render(<ArticleForm />);

  await user.type(screen.getByLabelText('标题'), '含违规词的标题');
  await user.click(screen.getByRole('button', { name: '发布' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '标题包含违规内容',
  );
});
```

#### 6.3 与 Web 的关系

表单的全部复杂度都在“用户操作序列 → 可见反馈”上：失焦、键入、提交、等待、回填。以字段 label 和按钮可见名称驱动测试，能覆盖 schema 接入、错误关联、提交状态等真实风险；如果只对 schema 写纯函数测试，则 UI 是否把错误呈现给用户完全没有保障。

#### 6.4 常见误区

> 误区：为了省事直接调用从模块里导出的 onSubmit 函数。

这样绕过了 RHF 的注册、校验和事件绑定，测试通过但界面可能根本无法提交。

### 7. 不测实现细节：行为导向的测试哲学

#### 7.1 定义

实现细节指“用户不会感知、且改动它不应影响功能”的代码内部决策：state 变量名、useState 拆成几个、useReducer 还是自定义 Hook、组件嵌套层级、class 名与内联样式。好测试断言行为，好重构只改实现——如果一次纯重构就让大批测试失败，说明测试在测实现。

```tsx
// 反模式：直接读取组件实例或按 class 查询
container.querySelector('.submit-btn');
screen.getByTestId('internal-wrapper');

// 正确：断言用户能做什么、能看到什么
screen.getByRole('button', { name: '保存' });
screen.getByText('保存成功');
```

快照测试的取舍：超大 JSX 快照对任何改动都“变化”，审阅者只能机械批准，几乎不提供保护。可以对稳定的小型纯展示输出使用快照，但不要用它替代针对行为的具体断言。

#### 7.2 判断标准

写每条断言前问三个问题：

```text
1. 用户（或使用该组件的下游代码）会这样感知它吗？
2. 如果我把内部实现换一种写法，这条断言还应成立吗？
3. 测试失败时，它能指出“什么行为坏了”吗？
```

三个问题都为“是”，基本就是行为断言；出现“否”，考虑重写查询或断言。

#### 7.3 与 Web 的关系

用户操作网页时只能看到内容、使用键盘鼠标、感知等待与错误；他们无法直接调用 setState。以同一界面为测试界面，是组件测试与 E2E 共享的哲学，差别只是环境与成本。这也让组件测试成为安全重构的基石：库升级（如第 21、22 单元中的表单与并发 API 演进）时，只要行为不变，测试应继续通过。

#### 7.4 常见误区

> 误区一：把 Hook 返回值整个导出只为测试方便。

为测试改变生产 API 是本末倒置；需要测试复杂状态逻辑时，用自定义 Hook 的公开行为（配合 renderHook）或从组件界面测试。

> 误区二：断言 `style` 颜色来验证错误状态。

应断言错误文本与 aria 属性；视觉样式是实现细节，颜色还可被主题替换。

### 8. 测试可维护性

#### 8.1 结构与命名

每个用例遵循 Arrange-Act-Assert：准备渲染与数据、执行用户操作、断言可见结果。用例名描述“在什么条件下，发生什么行为”，而不是 “test1/handles click”。

```tsx
describe('ItemList', () => {
  it('数据加载失败时显示错误信息和重试按钮', async () => {
    // arrange：声明 500 响应
    server.use(
      http.get('https://api.example.com/v1/items', () =>
        HttpResponse.json({ message: 'error' }, { status: 500 }),
      ),
    );

    // act
    render(<ItemList />);

    // assert
    expect(await screen.findByRole('alert')).toHaveTextContent('加载失败');
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });
});
```

#### 8.2 替身策略与稳定性

```text
优先顺序：
真实组件 + MSW 真实请求链路
    ↓ 无法实现时
vi.mock 替换边界清晰、接口稳定的模块
    ↓ 仅用于纯协作者
vi.fn 观察回调调用
    ↓ 最后手段
重写组件内部行为的假实现
```

其他纪律：

- 一个用例只验证一个行为；共享 setup 用 `beforeEach` 重建，不用例间传递可变变量。
- 查询文本与组件文案集中管理的常量保持一致；避免正则过宽匹配到多个节点。
- 不用 `setTimeout` 等待，不依赖执行顺序，不依赖测试文件排序。
- Mock 在用例间复位（`mockClear`/`resetHandlers`），避免跨用例污染。
- 断言要具体：比较具体文本和调用参数，而非“不为空”。

#### 8.3 覆盖率的正确态度

覆盖率说明“哪些代码在测试中被执行过”，不说明“行为是否被验证”——无断言的测试也能拉高数字。把覆盖率当作发现未测试区域的信号，而不是考核目标；为补百分比写的空测试只会增加维护负担。优先为这些位置写测试：含分支逻辑的交互、曾出缺陷的模块、多处复用的组件、关键业务表单。

#### 8.4 与 Web 的关系

测试套件本身也是工程产品：它会在团队每个人的机器和 CI 上每天运行很多次。偶发失败（flaky test）会让团队逐渐忽略测试信号，最终形同虚设；稳定、快速、命名清晰、失败即定位的测试才能长期支撑持续交付。这与第 24 单元的质量门禁直接衔接。

#### 8.5 常见误区

> 误区一：一个巨型用例走完“加载 → 搜索 → 编辑 → 删除”，中途失败无法定位。

应拆成独立行为；公共步骤通过渲染辅助函数或 MSW handler 复用。

> 误区二：为了“稳定”把所有网络都 mock 成同步返回。

掩盖了加载态与竞态问题；保留少量延迟场景验证异步 UI。

## 课后题

1. Vitest 配置中 `environment: 'jsdom'` 解决了什么问题？jsdom 与真实浏览器相比有哪些能力缺失？
2. Testing Library 的查询优先级是什么？请说明 `getByRole` 为什么排在第一位，以及它如何“倒逼”可访问性。
3. `getBy`、`queryBy`、`findBy` 在找不到元素时分别如何表现？断言“元素不存在”应该用哪一个？
4. `user-event` 相比 `fireEvent` 多模拟了哪些真实行为？为什么调用后必须 `await`？
5. `waitFor` 与 `findBy` 的关系是什么？固定 `setTimeout` 式等待为什么会造成偶发失败？
6. 场景分析：某测试用 `vi.fn` 替换了全局 fetch，组件请求头从 `content-type` 改为另一种写法后测试仍通过，但联调时后端解析失败。测试为什么失去了发现问题的能力？应如何改进？
7. 场景分析：MSW 全局设置了 `onUnhandledRequest: 'error'`，某次新增用例一运行就报“发现未处理请求”。这个报错说明什么？应如何处置才是正确的？
8. 场景分析：一次纯重构把两个 `useState` 合并为 `useReducer` 后，八个测试红了六个，但功能手工验证正常。请判断测试的问题，并给出重写思路。
9. 场景分析：某表单测试通过直接调用导出的提交函数获得成功，但用户在界面点击“发布”没有任何反应。测试为什么会“通过”？正确的测试应覆盖什么？
10. 为什么不应把覆盖率数字当作目标？请说明覆盖率高但质量仍可能不足的两类情形。

## 实践练习题

### 练习 1：列表四态与回调测试

#### 任务

为一个知识条目列表组件编写测试，覆盖加载中、空数据、加载失败（含重试按钮）、成功展示四种状态，并验证点击条目的回调参数。

#### 步骤约束

1. 四种状态全部通过 MSW handler 构造：延时、空数组、500、正常列表，不修改组件代码切换状态。
2. 使用 `getByRole`/`findByRole` 查询加载提示、空态文案、错误区域与列表项。
3. 成功状态断言列表项数量（使用 `getAllByRole('listitem')`）与具体标题。
4. 点击某条目，使用 `vi.fn()` 断言回调收到该条目 id。
5. 错误状态下点击“重试”，第二次请求返回正常数据，断言列表出现。

#### 提交物

- 列表组件测试文件；
- 四个状态对应的 handler 写法；
- 测试运行结果（全绿记录）。

#### 验收标准

- 不使用 test-id 与 class 查询；
- 异步状态均用 findBy/waitFor，无固定等待；
- 每个用例相互独立、可单独运行；
- 失败信息能直接指出是哪一状态异常。

### 练习 2：RHF + Zod 表单测试

#### 任务

为第 21 单元练习 2 完成的发布表单编写组件测试，覆盖字段校验、修正解除、提交成功、提交中禁用与防重复。

#### 步骤约束

1. 通过 label 查询字段，通过按钮名称查询提交按钮。
2. 用例一：失焦显示必填错误，键入合法内容后错误消失。
3. 用例二：正文少于 20 字提交被拦截，不产生网络请求（断言没有匹配的 post 请求发生）。
4. 用例三：合法提交时按钮先进入禁用/忙碌态再恢复，且快速双击只产生一个请求。
5. 使用 MSW 返回 201，并校验请求体中的字段（标签数组、可见范围）。

#### 提交物

- 表单测试文件；
- “请求只发生一次”的断言方式说明；
- 测试结果与覆盖场景清单。

#### 验收标准

- 测试从用户操作出发，不直接调用内部提交函数；
- 提交中状态可被观察到；
- 请求体校验真实有效；
- 测试不随内部 Hook 改名而失效。

### 练习 3：MSW 全链路交互测试

#### 任务

为“列表 + 新建”功能编写集成式组件测试：加载列表、打开新建弹窗、提交后列表刷新显示新条目、失败时保留弹窗并显示错误。

#### 步骤约束

1. 初始 GET 返回两条数据；POST 返回 201 后，测试让下一次 GET 返回包含新条目的三条数据（在 post handler 中切换响应数据）。
2. 提交成功后断言弹窗关闭（queryBy 断言消失）且列表出现新标题。
3. POST 返回 500 时断言弹窗保留、错误提示出现、已填内容不丢失。
4. 校验从打开弹窗到完成提交全过程使用 role/label 查询；焦点首次进入弹窗第一个字段的行为可选验证。
5. 至少包含一条“请求顺序”断言：先 POST，再 GET。

#### 提交物

- 全链路测试文件；
- 请求顺序与请求体的校验代码；
- 成功与失败两条路径的运行记录。

#### 验收标准

- 不 mock 组件模块，仅用 MSW 控制网络；
- 弹窗开关与列表刷新行为来自真实渲染；
- 用例结构清晰、断言具体；
- 连续多次运行结果稳定。

## 阶段验收作业

### 作业名称

行为导向的 React 组件测试套件

### 作业场景

团队要求你为已有功能模块（知识条目列表 + 发布表单 + 弹窗新建流程）建立一套组件测试。评审不关心覆盖率数字，而关心：测试是否像用户一样操作、是否稳定可重复、是否在重构后仍能通过、失败时能否准确定位行为缺陷。

### 提交物

```text
component-tests/
├── src/
│   ├── test/
│   │   ├── setup.ts
│   │   └── server.ts
│   ├── features/
│   │   └── items/
│   │       ├── ItemList.tsx
│   │       ├── ItemList.test.tsx
│   │       ├── ArticleForm.tsx
│   │       ├── ArticleForm.test.tsx
│   │       ├── CreateItemDialog.tsx
│   │       └── CreateItemDialog.test.tsx
│   └── vitest.config.ts
└── README.md
```

提交要求：

1. 三个测试文件分别对应列表四态、表单校验与提交、弹窗全链路，用例总数不少于 12 条。
2. 所有网络场景由 MSW 构造；除明确的边界模块外，不 mock 业务组件。
3. 失败用例（400、500、空态、延迟）都有真实断言，不允许只写成功路径。
4. README 写明测试命令、用例结构、如何新增一个 MSW 场景，以及已知 jsdom 限制。
5. 测试代码本身通过 ESLint；无真实网络请求、无凭据。

### 演示步骤

学员在 15 分钟内完成：

1. 运行全量测试，展示全部通过；单独运行任一文件，展示相互独立。
2. 临时把组件的某个按钮文案改错（模拟真实缺陷），展示对应测试失败并解读失败信息，随后还原。
3. 演示列表的错误态与重试路径测试。
4. 演示表单校验、提交中禁用与双击只发一次请求的测试。
5. 演示弹窗成功后列表刷新、失败后保留内容两条链路。
6. 讲解一次“实现重构（合并 state）”时哪些测试保持绿色，以及为什么。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 查询与交互质量 | 20 | 按优先级查询，user-event 完整模拟，无 test-id 依赖 |
| 异步处理 | 15 | findBy/waitFor 使用正确，无固定等待，超时配置合理 |
| 网络替身策略 | 20 | MSW 场景完整（成功/失败/空/延迟），请求体与顺序可校验 |
| 行为覆盖 | 20 | 四态、表单、回调、弹窗链路齐全，失败路径有断言 |
| 不测实现细节 | 15 | 重构保持绿色，命名体现行为，无内部状态断言 |
| 规范与可维护性 | 10 | 结构清晰，独立可重复，lint 通过，README 完整 |

细分规则：

- 查询交互 20 分：role/label 优先 8 分，user-event 用法 8 分，无 test-id 滥用 4 分。
- 异步处理 15 分：findBy/waitFor 8 分，稳定性 4 分，fake timers 正确性 3 分。
- 网络替身 20 分：MSW 生命周期 6 分，场景完整 8 分，请求断言 6 分。
- 行为覆盖 20 分：列表四态 6 分，表单 8 分，弹窗链路 6 分。
- 实现细节 15 分：重构耐受性 8 分，命名与断言导向 7 分。
- 可维护性 10 分：AAA 结构 4 分，lint 3 分，README 3 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 测试依赖固定延时等待，或连续运行三次以上出现偶发失败。
2. 主要查询依赖 test-id、class 名或内部状态名，行为重构即批量崩溃。
3. 只覆盖成功路径，错误、空态、加载失败均无断言。
4. 通过 mock 掉整个业务组件或直接调用内部提交函数“制造通过”，界面行为没有真实覆盖。
5. 用例之间共享可变数据、不能单独运行，或 handler 跨用例污染。
6. 发现缺陷时测试仍然通过（测试与真实行为脱节），且无法解释原因。
7. 提交真实接口凭据，或测试访问真实外部网络。
8. 测试代码无法按 README 在评审环境运行。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 配置 Vitest + jsdom 并运行组件测试 | `vitest.config.ts`、setup 文件与演示步骤 1 |
| 掌握查询优先级与 get/query/find 区别 | 三个测试文件中的查询方式、演示步骤 2 |
| 使用 user-event 模拟真实交互 | 表单与弹窗测试、演示步骤 4、5 |
| 处理异步渲染 | findBy/waitFor 用法与稳定性记录 |
| 使用 vi.mock 与 MSW 控制依赖与网络 | `server.ts`、handler 场景、请求断言 |
| 测试回调与表单行为 | 回调参数断言、表单校验与回填测试 |
| 坚持不测实现细节与可维护性原则 | 演示步骤 6、用例命名与结构检查 |

### 提交前自检

- [ ] 所有用例可单文件、单用例独立运行。
- [ ] 查询从 role、label 开始，test-id 仅出现在无替代方案处。
- [ ] 每个 user-event 调用都被 await。
- [ ] 代码中不存在以毫秒为单位的固定等待。
- [ ] MSW 生命周期完整，未处理请求会报错。
- [ ] 成功与失败路径都断言了用户可见结果。
- [ ] 做一次内部重构，确认测试保持绿色。
- [ ] README 可指导他人新增场景，`pnpm lint` 与 `pnpm test` 通过。
