# 54-前后端联调、Mock 与类型同步

## 目标

上一单元解决了“接口应该长什么样”，本单元解决“接口在落地阶段如何不互相阻塞、不互相猜测”。

真实全栈项目中最昂贵的阶段往往不是编码，而是联调：前端等后端、本地跨域报错、Cookie 带不上、401 反复出现、字段名与文档不一致、Mock 数据和真实数据两套结构。这些问题的共同根源是缺少一条清晰的协作主线——环境如何划分、凭证如何传递、问题如何定位、Mock 如何可信、类型如何只定义一次。

完成本知识单元后，学员应能够：

1. 划分本地、开发、预发等联调环境，说明请求 Base URL 如何通过环境变量注入，避免把地址写死在代码中。
2. 解释同源策略与 CORS 的协作机制，正确处理 Cookie 凭证（`credentials`、`SameSite`）与 `Authorization` 头部两类鉴权传递方式。
3. 使用浏览器 Network 面板、状态码、请求/响应头、`curl` 复现与后端日志（含请求 ID）系统化定位联调问题，而不是反复刷新碰运气。
4. 使用 MSW 在开发期拦截 `fetch`/XHR 请求，编写 handlers 并支持成功、空数据、错误等多场景切换。
5. 使用 openapi-typescript 从 OpenAPI 契约生成 TypeScript 类型，并在请求层与组件中使用生成类型。
6. 建立“契约为单一真相源”的类型同步流程，保证 Mock 数据符合真实类型，并按联调清单完成接口签收。

本单元的核心信念是：Mock 的价值不在于“让页面看起来能跑”，而在于“在后端缺席时，依然严格遵守契约”；类型的价值不在于“多写几个 interface”，而在于“全栈只有一处定义，其余全部由它生成”。

## 技术栈

| 工具或库 | 当前稳定版本线 | 用途 | 学习要求 |
|---|---|---|---|
| MSW（Mock Service Worker） | 2.x 稳定版 | 开发期与测试期请求拦截 | 掌握 handlers、browser/node worker、场景化 Mock |
| openapi-typescript | 7.x 稳定版 | 从 OpenAPI 生成 TS 类型 | 掌握命令行参数、生成路径类型与组件类型 |
| openapi-fetch | 0.13.x 稳定版 | 类型安全的 fetch 客户端 | 会与生成类型组合，得到端到端类型提示 |
| @faker-js/faker | 9.x 稳定版 | 生成结构化随机数据 | 会按 Schema 生成稳定形态的 Mock 数据 |
| TypeScript | 5.x 稳定版 | 类型系统 | 掌握类型收窄、可空处理、satisfies 校验 |
| Vite | 6.x 稳定版 | 前端构建与环境变量 | 掌握 `.env` 文件与 `VITE_` 前缀暴露规则 |
| pnpm | 当前稳定版 | 依赖与脚本管理 | 统一 typegen、dev、test 脚本 |
| 浏览器 DevTools | 当前稳定版 | 联调取证 | 熟练使用 Network、Application、Console 面板 |

约定：

- API 地址统一来自 `VITE_API_BASE_URL`，代码中禁止出现写死的域名。
- 所有令牌、Cookie 值在文档与示例中只写占位符 `<ACCESS_TOKEN>`、`<SESSION_COOKIE>`。
- 生成的类型文件统一放在 `src/shared/api/generated/schema.ts`，该文件头部保留生成器声明，禁止手工修改。
- Mock 数据文件统一放在 `src/mocks/`，handlers 按业务模块拆分，与契约标签对应。
- 是否启用 Mock 由 `VITE_USE_MOCK=true|false` 控制，默认开发环境开启，CI 构建必须关闭。

开始前检查环境：

```bash
node -v
pnpm -v
ls openapi/openapi.yaml
```

预期观察：能看到 Node、pnpm 版本，并确认契约文件存在；后续所有类型都从这份契约生成。

## 详细的理论知识讲解和示例伪代码

### 1. 联调流程与环境划分

#### 1.1 为什么要先划清环境

“联调出问题”有一半是环境问题：前端以为打到开发环境，实际请求发到了本地 Mock；后端在预发改了结构，前端还在对开发环境。环境不划清，任何现象都无法归因。

一条请求在不同阶段的目标地址通常是：

```text
浏览器页面
  └─ VITE_USE_MOCK=true   → 请求根本不出浏览器，被 MSW 拦截
  └─ VITE_USE_MOCK=false
       └─ VITE_API_BASE_URL
            = http://localhost:4000   → 本地直连后端进程
            = https://api.dev...      → 团队开发环境
            = https://api.staging...  → 预发环境（最接近生产）
```

#### 1.2 Vite 环境变量

在项目根目录按模式准备 env 文件：

```bash
# .env.development
VITE_USE_MOCK=true
VITE_API_BASE_URL=http://localhost:4000

# .env.staging
VITE_USE_MOCK=false
VITE_API_BASE_URL=https://api.staging.example.com
```

集中读取，避免 `import.meta.env` 散落在业务代码各处：

```ts
// src/shared/api/config.ts
export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL as string,
  useMock: import.meta.env.VITE_USE_MOCK === 'true',
};

if (!apiConfig.baseUrl) {
  throw new Error('缺少 VITE_API_BASE_URL，无法初始化 API 层');
}
```

#### 1.3 全栈关系

环境划分是双边约定：后端需要清楚每个环境部署了哪个版本、数据是否可写、是否对外开放；前端需要清楚自己当前请求的是哪个环境。跨环境的问题（例如在预发验证开发环境的修复）会产生大量无效沟通，因此“先报环境，再报现象”是联调第一句话的规范。

#### 1.4 常见误区

> 误区一：在业务代码里用 `if (location.hostname === 'localhost')` 判断环境。

环境判断散落在多处必然遗漏。环境只能来自构建期注入的环境变量，并集中读取。

> 误区二：把预发地址提交进 `.env.development`，再靠记忆手动切换。

配置文件应按模式固化，手动切换迟早出错，且无法被其他同学复现。

### 2. 跨域与凭证

#### 2.1 同源策略与 CORS

浏览器在“协议 + 域名 + 端口”三者完全一致时才视为同源。前端跑在 `http://localhost:5173`、后端在 `http://localhost:4000`，对浏览器而言就是跨域，请求会受 CORS 约束。

CORS 的本质是**后端通过响应头授权浏览器放行**，而不是前端设置某个开关。需要关注的三个响应头：

```text
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: Content-Type, Authorization
```

带凭证时 `Allow-Origin` 不能是 `*`，必须回显具体来源。后端对预检请求（OPTIONS）返回 204，并允许实际请求使用的方法与头部。

#### 2.2 两类凭证传递方式

| 方式 | 前端写法 | 后端要点 | 适用场景 |
|---|---|---|---|
| Cookie 会话 | `credentials: 'include'` | 配置 CORS 凭证、`SameSite`、`HttpOnly` | 浏览器同站主会话 |
| Authorization 头 | `Authorization: Bearer <token>` | 解析并校验令牌 | 跨站、移动端、令牌型 API |

Cookie 方式的请求封装：

```ts
export async function requestWithCookie<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...init,
    credentials: 'include', // 跨域时必须显式声明，否则 Cookie 不会发送
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw normalizeError(response);
  }
  return response.json() as Promise<T>;
}
```

Bearer 令牌方式：

```ts
export async function requestWithToken<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw normalizeError(response);
  }
  return response.json() as Promise<T>;
}
```

#### 2.3 Cookie 属性的全栈协作

后端通过 `Set-Cookie` 下发会话时，常见属性必须联合调试：

```text
Set-Cookie: sid=<SESSION_COOKIE>;
  HttpOnly      # JS 读不到，防 XSS 窃取
  Secure        # 仅 HTTPS 发送（本地 http 调试需注意）
  SameSite=Lax  # 跨站是否携带；跨站调用需要 None + Secure
  Path=/
```

前端现象与后端配置的对应关系：跨站调用完全没带 Cookie，多半是 `SameSite` 策略拦截；JS 里 `document.cookie` 读不到，多半是 `HttpOnly` 生效（这是正常的，不是故障）。

#### 2.4 常见误区

> 误区一：跨域报错就去前端找“关闭跨域”的插件或代理开关长期使用。

开发代理只能用于本地开发；真正的跨域授权必须由后端 CORS 头解决，否则部署后必然复现。

> 误区二：把令牌放进 localStorage 就以为绝对安全，或把会话 Cookie 设成可被 JS 读取。

令牌存储要结合 XSS 风险评估；会话 Cookie 应保持 `HttpOnly`，两类方案都不能在日志中打印凭证。

### 3. 联调问题定位方法

#### 3.1 先取证后改码

联调排障的标准顺序：

```text
1. 确认环境：Base URL、Mock 开关、当前登录用户
2. 复现并抓取 Network 中的请求：方法、URL、状态码
3. 检查请求头与请求体：Content-Type、Authorization、Cookie、payload
4. 检查响应头与响应体：CORS 头、错误码、错误体结构
5. 用 curl 在终端复现，排除浏览器插件与缓存干扰
6. 带 traceId 请后端查同一请求的服务端日志
7. 根据证据判断归属，一次只验证一个假设
```

#### 3.2 从 Network 导出 curl 复现

在 Network 面板右键请求可以复制为 cURL。终端复现可以剥离浏览器因素：

```bash
curl -i -X POST 'https://api.staging.example.com/v1/articles' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  --data '{"title":"联调测试","content":"hello"}'
```

判读：curl 同样失败，问题基本在后端或请求内容；curl 成功而浏览器失败，问题在跨域、凭证或浏览器策略。

#### 3.3 归一化错误，前端可观测

请求层把所有失败归一成带状态码、业务码与 traceId 的错误对象，UI 与日志都有稳定字段可用：

```ts
type AppError = {
  type: 'network' | 'http' | 'business' | 'unknown';
  status?: number;
  code?: string;
  message: string;
  traceId?: string;
};

export async function normalizeError(response: Response): Promise<AppError> {
  let body: { error?: { code?: string; message?: string; traceId?: string } } = {};
  try {
    body = await response.json();
  } catch {
    return { type: 'unknown', status: response.status, message: '响应不是合法 JSON' };
  }

  return {
    type: response.status < 500 ? 'business' : 'http',
    status: response.status,
    code: body.error?.code,
    message: body.error?.message ?? `请求失败：${response.status}`,
    traceId: body.error?.traceId,
  };
}
```

#### 3.4 全栈关系与请求 ID

一次请求横跨浏览器、网关、应用、数据库。没有统一标识，双方只能靠时间和内容“猜是同一条”。前端在需要时生成或透传 `X-Trace-Id`，后端把它写进每条日志：

```ts
function withTrace(init: RequestInit): RequestInit {
  const traceId = crypto.randomUUID();
  return {
    ...init,
    headers: { ...init.headers, 'X-Trace-Id': traceId },
  };
}
```

报障时把状态码、请求路径、traceId、复现时间一并给出，后端可直接定位，沟通成本最低。

#### 3.5 常见误区

> 误区一：看到红色请求就说“后端挂了”。

404 可能是路径写错，401 是令牌问题，CORS 报错可能只是预检失败。先看状态码与响应头再下结论。

> 误区二：报障只发一句“接口不好使”，附一张全是其他请求的截图。

无法复现的描述等于没有报障。最小报障信息是：环境、方法路径、状态码、traceId、复现步骤。

### 4. MSW 开发期 Mock

#### 4.1 MSW 的工作原理

MSW 在浏览器中注册一个 Service Worker，请求在真正发出网络之前被它拦截；在 Node 环境则通过拦截原生请求模块生效。因为拦截发生在请求层，**业务代码完全不知道自己在使用 Mock**，这是它相对“在组件里写假数据”的根本优势。

#### 4.2 初始化

```bash
pnpm add -D msw
pnpm exec msw init public/ --save
```

在应用入口根据环境开关启动：

```ts
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { articleHandlers } from './handlers/articles';

export const worker = setupWorker(...articleHandlers);
```

```ts
// src/main.tsx
import { apiConfig } from './shared/api/config';

async function bootstrap() {
  if (apiConfig.useMock) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'error' });
  }
  const { App } = await import('./App');
  // 挂载应用（各框架挂载方式不同，这里只表达顺序）
}

bootstrap();
```

`onUnhandledRequest: 'error'` 会让任何未覆盖的请求直接报错，迫使 handlers 与真实调用保持同步，避免“页面假装成功”。

#### 4.3 编写 handlers

```ts
// src/mocks/handlers/articles.ts
import { http, HttpResponse } from 'msw';
import { apiConfig } from '@/shared/api/config';
import { mockArticles } from '../data/articles';

const base = apiConfig.baseUrl;

export const articleHandlers = [
  http.get(`${base}/articles`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');
    const start = (page - 1) * pageSize;

    return HttpResponse.json({
      items: mockArticles.slice(start, start + pageSize),
      pagination: { page, pageSize, total: mockArticles.length },
    });
  }),

  http.get(`${base}/articles/:id`, ({ params }) => {
    const found = mockArticles.find((item) => item.id === params.id);
    if (!found) {
      return HttpResponse.json(
        { error: { code: 'ARTICLE_NOT_FOUND', message: '指定的文章不存在' } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ data: found });
  }),
];
```

#### 4.4 场景切换

联调中最有价值的不是成功态，而是异常态。用查询参数或专用 header 在开发期切换场景：

```ts
http.get(`${base}/articles`, ({ request }) => {
  const scenario = new URL(request.url).searchParams.get('scenario');

  if (scenario === 'server-error') {
    return HttpResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '服务暂时不可用' } },
      { status: 500 },
    );
  }
  if (scenario === 'empty') {
    return HttpResponse.json({ items: [], pagination: { page: 1, pageSize: 20, total: 0 } });
  }
  // 默认成功数据
});
```

#### 4.5 全栈关系与测试复用

同一套 handlers 可以在 Node 测试环境启动，组件测试因此打到“符合契约的假服务”，而不是侵入组件内部：

```ts
import { setupServer } from 'msw/node';
import { articleHandlers } from '@/mocks/handlers/articles';

const server = setupServer(...articleHandlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

#### 4.6 常见误区

> 误区一：Mock 返回什么结构由前端随便定，等联调时再改。

Mock 必须严格符合契约；结构自由的 Mock 只会把问题推迟到联调，让 Mock 失去意义。

> 误区二：把 Mock 开关带进生产包，或在 CI 构建中保留 MSW。

生产环境必须 `VITE_USE_MOCK=false`，否则真实用户可能被浏览器内拦截响应。

### 5. OpenAPI 生成 TypeScript 类型

#### 5.1 为什么不手写接口类型

手写类型必然产生第二份事实来源：契约改了、类型忘了改，编译期看似正确、运行时直接崩溃。类型应从契约生成，契约合并即触发类型更新。

#### 5.2 生成命令

```bash
pnpm add -D openapi-typescript
pnpm exec openapi-typescript openapi/openapi.yaml \
  --output src/shared/api/generated/schema.ts
```

在 `package.json` 中固化脚本：

```json
{
  "scripts": {
    "typegen": "openapi-typescript openapi/openapi.yaml -o src/shared/api/generated/schema.ts",
    "predev": "pnpm typegen",
    "prebuild": "pnpm typegen"
  }
}
```

#### 5.3 使用生成类型

生成文件把 components 与 paths 都表达为类型：

```ts
import type { components, paths } from './generated/schema';

type Article = components['schemas']['Article'];
type ArticleCreateRequest = components['schemas']['ArticleCreateRequest'];
type ArticleListResponse = components['schemas']['ArticleListResponse'];

// 单个操作的请求/响应由 paths 精确推导
type ListArticlesQuery =
  paths['/articles']['get']['parameters']['query'];
type ListArticles200 =
  paths['/articles']['get']['responses'][200]['content']['application/json'];
```

#### 5.4 类型安全的请求函数

结合 openapi-fetch，让“路径、方法、请求体、响应体”全部由生成类型约束：

```bash
pnpm add openapi-fetch
```

```ts
import createClient from 'openapi-fetch';
import type { paths } from './generated/schema';
import { apiConfig } from './config';

export const apiClient = createClient<paths>({ baseUrl: apiConfig.baseUrl });

export async function fetchArticles(page: number) {
  const { data, error } = await apiClient.GET('/articles', {
    params: { query: { page, pageSize: 20 } },
  });

  if (error) {
    // error 已根据契约推导为对应错误响应
    throw new Error(error.error.message);
  }
  return data; // 类型为成功响应体，无需手动断言
}

export async function createArticle(input: { title: string; content: string }) {
  const { data, error } = await apiClient.POST('/articles', {
    body: input, // 字段名、类型、必填项由契约约束，写错字段名会直接编译失败
  });

  if (error) {
    throw new Error(error.error.message);
  }
  return data;
}
```

#### 5.5 全栈关系

后端修改契约后，前端 `pnpm typegen` 会让所有受影响的调用点在编译期变红——这正是类型同步的价值：变更从“联调时的运行时事故”变成“改契约后的编译期清单”。前端的工作量不再是猜字段，而是逐个修复编译器指出的位置。

#### 5.6 常见误区

> 误区一：觉得生成文件“不好看”，手动进去改字段名。

生成文件任何手改都会在下次生成时丢失。契约有问题就改契约，再重新生成。

> 误区二：生成了类型，却继续用 `any` 接收响应。

`as any` 会让整条类型链路短路。请求层必须把生成类型传递到组件，编译期保护才能成立。

### 6. 类型单一真相源

#### 6.1 三层结构

健康的类型体系只有三层，方向严格自上而下：

```text
第 1 层：openapi.yaml              ← 唯一事实来源（人维护）
第 2 层：generated/schema.ts       ← 生成层（机器维护，禁止手改）
第 3 层：业务代码、视图模型、Mock   ← 消费层（引用第 2 层）
```

任何在第 3 层重新声明的接口结构，都是对单一真相源的破坏。

#### 6.2 消费层的正确姿势

组件中直接引用推导类型，不为同一份数据另起 interface：

```tsx
import type { components } from '@/shared/api/generated/schema';

type ArticleListItem = components['schemas']['Article'];

function ArticleCard({ article }: { article: ArticleListItem }) {
  return (
    <article>
      <h3>{article.title}</h3>
      <p>状态：{article.status === 'published' ? '已发布' : '草稿'}</p>
    </article>
  );
}
```

只有“为视图定制的派生结构”才允许新建类型，且必须用映射从生成类型派生，保持字段联动：

```ts
type ArticleViewModel = Pick<components['schemas']['Article'], 'id' | 'title' | 'status'> & {
  displayDate: string;
};

function toViewModel(article: components['schemas']['Article']): ArticleViewModel {
  return {
    id: article.id,
    title: article.title,
    status: article.status,
    displayDate: new Date(article.createdAt).toLocaleDateString('zh-CN'),
  };
}
```

#### 6.3 同步流程与 CI 守门

类型同步要靠流程而非记忆：

```bash
# 契约变更后
pnpm typegen
pnpm typecheck
git diff --exit-code src/shared/api/generated/schema.ts
```

在 CI 中重新生成并比对：若有人改了契约却忘记提交生成文件，这一步会失败并给出明确提示。

#### 6.4 全栈关系

单一真相源让“后端说改了、前端说没收到”的争论可以用文件解决：比对 `openapi.yaml` 的版本与生成文件的时间戳/哈希即可。责任边界从口头承诺变成版本库里的提交记录。

#### 6.5 常见误区

> 误区一：前端图省事，在业务代码里复制一份“看起来差不多”的类型。

契约一旦演进，复制类型必然过期。差异不会被编译器发现，只会在运行时爆炸。

> 误区二：把生成文件加进 `.gitignore`。

忽略生成文件会让 CI 与其他同学无法获得一致类型，也无法做“改契约忘生成”的守门检查。

### 7. Mock 数据与契约一致

#### 7.1 用 satisfies 约束 Mock 数据

Mock 数据集直接用生成类型约束，字段拼错、漏必填立即报错：

```ts
import type { components } from '@/shared/api/generated/schema';

type Article = components['schemas']['Article'];

export const mockArticles = [
  {
    id: '3f1e4d2a-0001-4000-8000-000000000001',
    title: '契约优先开发入门',
    content: '先定义接口，再并行实现前后端。',
    status: 'published',
    tags: ['api'],
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: '3f1e4d2a-0002-4000-8000-000000000002',
    title: '空值语义的三种约定',
    content: '缺省、null、空字符串不可混用。',
    status: 'draft',
    tags: [],
    createdAt: '2026-09-12T02:30:00.000Z',
    updatedAt: '2026-09-12T02:30:00.000Z',
  },
] satisfies Article[];
```

#### 7.2 用 faker 批量造数

数据量大时用 faker 生成，但结构仍由生成类型约束：

```ts
import { faker } from '@faker-js/faker';
import type { components } from '@/shared/api/generated/schema';

type Article = components['schemas']['Article'];

export function createMockArticle(overrides: Partial<Article> = {}): Article {
  const createdAt = faker.date.past({ years: 1 }).toISOString();
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence({ min: 3, max: 8 }),
    content: faker.lorem.paragraphs(2),
    status: faker.helpers.arrayElement(['draft', 'published', 'archived']),
    tags: faker.helpers.arrayElements(['api', 'docker', 'cicd', 'react'], { min: 0, max: 3 }),
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

export const mockArticlePool = Array.from({ length: 47 }, () => createMockArticle());
```

#### 7.3 异常场景也要符合契约

错误 Mock 的响应体必须匹配 `Error` Schema，否则前端错误分支永远没被正确演练：

```ts
http.post(`${base}/articles`, async ({ request }) => {
  const body = (await request.json()) as { title?: string };

  if (!body.title || body.title.trim().length === 0) {
    return HttpResponse.json(
      {
        error: {
          code: 'VALIDATION_FAILED',
          message: '请求参数校验未通过',
          details: [{ field: 'title', message: '标题不能为空' }],
        },
      },
      { status: 422 },
    );
  }

  return HttpResponse.json({ data: createMockArticle({ title: body.title }) }, { status: 201 });
});
```

#### 7.4 全栈关系

Mock 与契约一致，意味着联调切换到真实后端时，前端理论上零改动；若切换后大量报错，先怀疑实现是否偏离契约，而不是怀疑前端。这让“Mock 开发”真正成为可信的并行手段。

#### 7.5 常见误区

> 误区一：Mock 数据只造成功态，错误页从未在开发环境出现过。

错误、空态、加载态都是一等场景。没有演练过的异常分支，上线后第一次出现就是事故。

> 误区二：用固定“aaa、111”这类一眼假的占位字符串。

不真实的数据无法暴露排版、长度与边界问题。Mock 数据应接近真实形态，但依然是虚构内容。

### 8. 联调清单与签收规范

#### 8.1 接口不是“通了”就算完成

一个接口从开发到签收，需要走完清单中的每一项：

```text
联调清单（每个接口一份）：
[ ] 契约已评审合并，操作 ID、字段语义无争议
[ ] 前端使用生成类型，无手写重复 interface
[ ] Mock 成功、空态、错误三类场景齐全且符合 Schema
[ ] 真实环境连通，方法、路径、头部与契约一致
[ ] 2xx 数据结构与契约逐项核对（含分页、可空字段）
[ ] 4xx 错误体结构与业务码核对
[ ] 鉴权：未登录、登录过期、无权限三种情况验证
[ ] 边界：超长输入、特殊字符、分页越界
[ ] 并发：快速重复操作、筛选快速切换无竞态
[ ] 关 Mock、清缓存后复测通过，traceId 可追踪
```

#### 8.2 签收记录示例

用表格固定结论，双方对结果负责：

```text
接口：POST /v1/articles
契约版本：1.4.0      环境：staging
签收人：前端 / 后端    日期：2026-10-09
结果：通过
遗留：无
证据：traceId=01HXYZEXAMPLE，响应符合 ArticleResponse
```

#### 8.3 全栈关系

清单把“联调”从口头协作变成可审计的工程活动：未签收的接口不能进入验收，签收后再发现问题按缺陷流程处理并回查契约。它同时保护双方——前端不能要求契约外字段，后端不能交付契约外结构。

#### 8.4 常见误区

> 误区一：接口在自己机器上通了就通知测试验收。

本地通过不代表预发通过；必须在团队环境关 Mock 复测，并验证异常与鉴权场景。

> 误区二：联调发现契约有缺陷，私下让后端“先加个字段顶上”。

绕过契约的临时改动不会留下记录，第三个人接手必然踩坑。任何缺陷都应先改契约、再改实现、再重新生成。

## 课后题

1. 为什么说联调阶段的问题有一半是环境问题？请说明请求 Base URL 与 Mock 开关应如何管理。
2. 场景分析：学员把 `VITE_API_BASE_URL` 直接写在组件的 `fetch` 里，换环境时全局搜索替换。这种做法会出现哪些问题？正确的集中管理方式是什么？
3. CORS 是前端问题还是后端问题？为什么带 Cookie 时后端不能把 `Access-Control-Allow-Origin` 设为 `*`？
4. 请比较 Cookie 会话与 `Authorization: Bearer` 两种凭证传递方式在前端写法、后端配置与适用场景上的差异。
5. 场景分析：前端调用跨站接口时请求里完全没有携带会话 Cookie，而后端确认已经下发。请列出至少两个可能原因，并说明如何一步步验证。
6. 浏览器里接口报 CORS 错误，但用相同参数的 curl 请求成功。这个对比说明了什么？下一步应检查哪些响应头？
7. 场景分析：联调时接口间歇性返回 500，双方都无法稳定复现。为了让后端能定位同一条请求，前端报障时至少应提供哪些信息？traceId 在链路中起什么作用？
8. MSW 是如何做到“业务代码无感知”的？`onUnhandledRequest: 'error'` 为什么比默认放行更适合团队开发？
9. 为什么类型必须从 OpenAPI 生成而不是手写？生成文件为什么禁止手工修改，且应提交进版本库？
10. 场景分析：后端把契约里的 `authorName` 改成了 `author.displayName`，前端重新生成类型后多处编译失败。请解释为什么这恰恰是类型同步在发挥作用，以及前端应按什么顺序处理。

## 实践练习题

### 练习 1：环境与请求层

#### 任务

为一个 Vite + React 项目建立环境划分与统一请求层，支持 Cookie 与 Bearer 两种凭证方式。

#### 步骤约束

1. 创建 `.env.development` 与 `.env.staging`，分别配置 `VITE_API_BASE_URL` 与 `VITE_USE_MOCK`。
2. 编写集中配置模块，启动时校验 Base URL 是否存在，缺失要显式报错。
3. 实现两个请求函数：一个默认 `credentials: 'include'`，一个携带 `Authorization: Bearer <token>`。
4. 实现归一化错误函数，输出包含状态码、业务码、traceId 的错误对象。
5. 在 README 中写明如何切换环境，并解释为什么不能用 hostname 判断环境。

#### 提交物

- env 文件与配置模块；
- 请求层与错误归一化代码；
- README 环境说明；
- 至少两个针对错误归一化的单元测试。

#### 验收标准

- 业务代码中不存在写死域名；
- 两种凭证方式均可正确构造请求；
- 非法 JSON、4xx、5xx 都能被归一化为稳定结构；
- 测试不依赖真实后端；
- 文档中没有真实令牌。

### 练习 2：MSW 场景化 Mock

#### 任务

为文章列表与详情接入 MSW，覆盖成功、空数据、404、500、422 五类场景，并在组件测试中复用 handlers。

#### 步骤约束

1. 安装 MSW 并初始化 Service Worker 到 `public/`。
2. 按模块拆分 handlers，列表分页行为必须真实（切片与 total 正确）。
3. 通过 `scenario` 查询参数支持空数据与 500 场景切换。
4. 详情接口对不存在的 ID 返回符合错误契约的 404；创建接口对空标题返回 422 与字段级错误。
5. worker 启动使用 `onUnhandledRequest: 'error'`。
6. 编写一个组件测试，在 Node 环境用同一套 handlers 驱动列表渲染。

#### 提交物

- handlers 与数据文件；
- worker 启动与入口接入代码；
- 场景切换说明；
- 组件测试代码与运行结果。

#### 验收标准

- 打开页面时请求不出网络即可渲染；
- 五类场景都能复现，错误体符合契约 Schema；
- 未覆盖请求会直接报错；
- 测试与开发环境共用同一份 handlers；
- 生产构建配置中 Mock 关闭。

### 练习 3：类型生成与单一真相源

#### 任务

从上一单元的 OpenAPI 契约生成 TS 类型，改造请求层与组件，并让 Mock 数据全部受生成类型约束。

#### 步骤约束

1. 安装 openapi-typescript 与 openapi-fetch，编写 `typegen` 脚本并挂到 predev/prebuild。
2. 使用生成类型实现列表查询与创建文章两个调用，禁止 `any`。
3. 至少一个组件直接引用 `components['schemas']` 中的类型接收数据。
4. 用 `satisfies` 改造全部 Mock 数据集，并用 faker 新增一个工厂函数批量造数。
5. 在 CI（或本地脚本）中实现“重新生成 + 比对差异”的守门检查。
6. 主动制造一次契约变更（如重命名字段），记录编译器报出的所有位置并逐一修复。

#### 提交物

- 生成类型文件与请求客户端；
- 改造后的组件与 Mock 数据；
- CI 守门步骤配置；
- 契约变更前后的编译器输出对比与修复记录；
- 100 至 200 字的单一真相源实践总结。

#### 验收标准

- `pnpm typecheck` 全绿，且无手写重复接口类型；
- 请求路径、请求体、响应体均有类型提示；
- Mock 数据字段错误能被编译器发现；
- 契约变更后所有受影响位置都由编译器指出；
- 未提交生成文件差异时守门检查会失败。

## 阶段验收作业

### 作业名称

契约驱动的全链路联调工程

### 作业场景

你要在“文章与评论”系统上证明：即使后端尚未就绪，前端也能严格按契约完成开发；当后端就绪后，切换环境即可完成联调签收，且类型、Mock、真实响应三者始终一致。评审关注的不是页面数量，而是协作主线是否真的建立起来。

### 提交物

```text
joint-lab/
├── openapi/
│   └── openapi.yaml
├── src/
│   ├── shared/api/
│   │   ├── config.ts
│   │   ├── client.ts
│   │   ├── errors.ts
│   │   └── generated/schema.ts
│   ├── mocks/
│   │   ├── browser.ts
│   │   ├── handlers/
│   │   └── data/
│   ├── features/
│   └── main.tsx
├── docs/
│   ├── environments.md
│   └── signoff-checklist.md
├── .github/workflows/type-sync.yml
└── README.md
```

### 必做内容

1. 至少消费契约中的四个操作，请求层使用 openapi-fetch 与生成类型，全程无 `any`。
2. Mock 覆盖每个操作的成功、空态与至少一种错误场景，错误体符合错误契约。
3. 至少完成一次现场“Mock → 真实环境”切换演示，切换后业务代码零改动。
4. 凭证方式任选一种完整实现；若选 Cookie，必须说明跨域与 SameSite 配置。
5. CI 中包含 typegen 差异比对、typecheck 与测试三步。
6. 联调清单为四个接口各填写一份签收记录，包含环境、契约版本、traceId 与结论。
7. 在文档中记录一次真实（或演练）报障的完整取证过程。

### 演示步骤

学员需要在 20 分钟内完成以下演示：

1. 说明当前环境配置，指出 Base URL 与 Mock 开关来自哪里。
2. 在 Mock 模式下演示列表成功、空态、500 三个场景。
3. 展示一个受生成类型约束的创建流程，现场把字段名改错，说明编译器会如何拦截。
4. 关闭 Mock，切换到真实或教学环境，复测同一组操作并展示签收记录。
5. 用 curl 复现一条失败请求，讲解如何用 traceId 串联后端日志。
6. 展示 CI 的类型同步守门，并解释其失败时的含义。

导师可以临时要求学员切换场景或环境，验证流程是否真实可操作，而不是记住了固定顺序。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 环境与请求层 | 20 | 环境变量集中管理，请求层支持凭证与归一化错误，无写死地址 |
| MSW Mock 质量 | 20 | 覆盖成功/空态/错误，分页真实，未覆盖请求报错，测试可复用 |
| 类型生成与单一真相源 | 25 | 类型由契约生成，调用端到端安全，无手写重复类型与 any |
| Mock 与契约一致性 | 15 | Mock 数据受生成类型约束，错误场景符合 Error Schema |
| 联调与签收 | 10 | 可完成环境切换，签收记录完整，traceId 可追踪 |
| 规范与表达 | 10 | 结构清晰，密钥占位，文档可指导他人复现 |

细分评分规则：

#### 环境与请求层：20 分

- env 划分与集中配置正确：8 分；
- 凭证传递实现正确：6 分；
- 归一化错误可观测：6 分。

#### MSW Mock 质量：20 分

- handlers 与模块划分清晰：6 分；
- 五类场景齐全且可切换：8 分；
- worker 严格模式与测试复用：6 分。

#### 类型生成与单一真相源：25 分

- 生成脚本与生成文件管理正确：7 分；
- openapi-fetch 端到端类型安全：10 分；
- 视图模型正确派生、无复制类型：8 分。

#### Mock 与契约一致性：15 分

- 数据用 satisfies/faker 约束：8 分；
- 错误响应符合契约：7 分。

#### 联调与签收：10 分

- Mock 到真实环境零改动切换：5 分；
- 四份签收记录与 traceId 完整：5 分。

#### 规范与表达：10 分

- 目录与命名统一：4 分；
- 无真实凭证与敏感信息：3 分；
- 文档与演示清晰：3 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 请求地址写死在业务代码中，或环境判断散落在多处。
2. Mock 结构与契约不一致，且未被任何类型或工具发现。
3. 请求层或组件中使用 `any` 绕过生成类型，类型链路实质失效。
4. 生产构建保留 MSW 或 Mock 开关为开启状态。
5. 无法完成 Mock 到真实环境的切换演示，或签收记录缺少关键证据。
6. 出现真实令牌、Cookie 值或其他敏感信息。
7. 只提交截图，没有源码、命令与签收文档。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 划分联调环境并注入 Base URL | env 文件、config.ts 与 environments.md |
| 处理跨域与凭证 | client.ts 的凭证实现与配置说明 |
| 系统化定位联调问题 | 取证文档、curl 复现与 traceId 串联记录 |
| 使用 MSW 开发期 Mock | handlers、场景切换与组件测试 |
| 从 OpenAPI 生成 TS 类型 | generated/schema.ts 与 openapi-fetch 调用 |
| 建立单一真相源并完成签收 | CI 守门、签收清单与现场切换演示 |

### 提交前自检

- [ ] 所有请求都经过集中配置的请求层，没有写死域名。
- [ ] 凭证示例中只出现 `<ACCESS_TOKEN>`、`<SESSION_COOKIE>` 占位符。
- [ ] Mock 覆盖每个操作的成功、空态与错误场景。
- [ ] 生成类型文件已提交，且业务代码没有手工重复定义。
- [ ] `pnpm typecheck` 与测试在本地通过。
- [ ] CI 的生成差异比对能发现“改契约忘提交”的情况。
- [ ] 关闭 Mock、清缓存后在真实环境复测通过。
- [ ] 四个接口的签收记录包含环境、契约版本与 traceId。
