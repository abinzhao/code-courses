# 01-错误监控与 Sentry

## 学习目标

- 理解可观测性三大支柱（Logging / Metrics / Tracing）在前端场景下的定位和边界
- 掌握 Sentry 的核心概念（Issue、Event、Breadcrumb、Release、Environment）及其协作关系
- 能独立完成 React / Vue / Next.js 项目的 Sentry 集成，覆盖错误捕获、Source Map、Release 追踪
- 理解前端错误捕获的完整链路：`try/catch` → `window.onerror` → `unhandledrejection` → `ErrorBoundary`
- 建立从"被动收到报错"到"主动发现问题"的监控思维

---

## 内容讲解

### 一、可观测性的三大支柱：为什么前端需要它

后端工程师对这三根柱子再熟悉不过，但前端的处境不同——你写的代码运行在用户的浏览器里，你无法登录服务器看日志，唯一的信号来源就是代码中主动上报的数据。

| 支柱 | 定义 | 前端场景 |
|------|------|----------|
| **Logging**（日志） | 离散事件的文本记录 | 错误堆栈、console 输出、用户操作路径（Breadcrumb） |
| **Metrics**（指标） | 聚合后的数值数据 | P75 LCP、P95 JS 错误率、PV/UV |
| **Tracing**（追踪） | 一条请求贯穿全链路的完整轨迹 | 从用户点击 → 前端 API 调用 → 后端服务 → 数据库，全链路耗时可视 |

**用户视角 vs 开发者视角**：

```
用户看到：页面白屏了 / 按钮点了没反应 / 数据加载不出来
开发者需要知道：哪个文件的第几行出错了 / 什么操作触发的 / 影响多少用户 / 哪个 Release 引入的

Sentr 做的事：把用户侧的"体感问题"自动翻译成"
开发者可行动的"技术诊断信息"
```

**监控不是事后补丁**。在架构设计阶段就应该定义好：错误怎么分类、告警怎么分级、什么样的错误值得唤醒你。否则上线后，你面对的就是一堆重复的 JS Error，不知道哪些是噪音、哪些是真正的线上故障。

---

### 二、Sentry 的核心概念

这五个概念是 Sentry 的"领域语言"，理解它们你才能读懂 Sentry 的界面和配置。

#### 2.1 Issue（问题）

Issue 是 Sentry 对同类错误的分组。Sentry 按堆栈指纹自动去重——同一个 `TypeError: Cannot read properties of undefined`，无论触发 1 次还是 10 万次，只创建 1 个 Issue。

```
Event（单次错误发生）──聚合──→ Issue（同一类错误）
                  ──聚合──→
```

每个 Issue 有生命周期状态：`unresolved → resolved → ignored`。

#### 2.2 Event（事件）

一次具体的错误发生，包含完整的上下文：

```
Event 携带的信息 = 错误堆栈
                 + 用户 IP / User Agent / 浏览器 / OS
                 + 发生时间
                 + Breadcrumbs（操作路径）
                 + Release 版本
                 + Environment（production / staging）
                 + Tags（自定义标签，如 userId、planType）
```

#### 2.3 Breadcrumb（面包屑）

出 bug 之前用户做了什么？点击了哪个按钮？调用了哪个接口？Breadcrumb 就是这些信息的**时间线记录**。

```javascript
// Sentry 自动记录的 Breadcrumb：
// - 所有 console.log / warn / error
// - 所有 fetch / XHR 请求（URL + 状态码）
// - 所有点击和输入事件
// - 页面导航（pushState / replaceState）
// - DOM 事件

// 你也可以手动添加业务级 Breadcrumb：
Sentry.addBreadcrumb({
  category: 'checkout',   // 业务分类
  message: '用户点击了"立即支付"按钮',
  level: 'info',           // info / warning / error
  data: { orderId: 'ORD-20240101-001', amount: 29900 }, // 业务上下文
});
```

痛点场景：错误堆栈显示 `Cannot read properties of null`，但没有 Breadcrumb 你就不知道用户是怎么走到这一步的。加上 Breadcrumb 后，你能看到完整的操作路径：`进入首页 → 搜索"MacBook Pro" → 点击商品 → 加入购物车 → 点击结算（报错！！！）`。

#### 2.4 Release（版本）

Release 让你把错误关联到具体的代码版本（commit）。配置后 Sentry 能直接告诉你哪个 commit 引入了这个错误。

```bash
# 构建时注入版本号
SENTRY_RELEASE=$(git rev-parse HEAD)  # 用 Git commit SHA 作为版本号
```

每次部署时通知 Sentry "新 Release 已上线"，Sentry 会在 Issue 详情中标注"Release X 开始出现，Release Y 修复了"。

#### 2.5 Environment（环境）

区分 staging / production / 本地开发。同一个错误在不同环境应分到不同的 Issue 组，因为预发环境的报错不需要生产环境级别的告警。

---

### 三、Sentry 集成：Next.js 实战

以 Next.js 14（App Router）为例，展示生产级的 Sentry 集成配置。

#### 3.1 安装依赖

```bash
npm install @sentry/nextjs
```

#### 3.2 初始化配置

```javascript
// sentry.client.config.js —— 客户端配置（运行在浏览器中）
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // DSN 是 Sentry 识别项目的唯一标识，从 Sentry 后台 Settings → Projects → Client Keys 获取
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 采样率：生产环境不需要 100% 采集，0.1 表示采集 10%
  // 原因：JS 错误量巨大，全量采集成本高且没必要
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
  
  // 错误采样率：0.3 表示采集 30% 的错误事件
  // 注意：这不是随机丢错误，而是 Sentry 在客户端决定是否发送
  sampleRate: process.env.NODE_ENV === 'production' ? 0.3 : 1.0,

  // 环境标识
  environment: process.env.NODE_ENV,

  // 版本号：从环境变量注入，构建时由 CI 写入
  release: process.env.SENTRY_RELEASE || 'local',

  // 集成：Sentry 自动增强的能力
  integrations: [
    // replayIntegration：录屏回放，记录错误发生前几秒的用户操作画面
    // 注意：录屏数据量大，建议只在错误事件触发时才上传
    Sentry.replayIntegration({
      maskAllText: true,            // 脱敏所有文字内容
      blockAllMedia: true,          // 阻止录制媒体内容
      maskAllInputs: true,          // 脱敏表单输入
    }),
    // browserProfilingIntegration：采集 JS 执行性能数据
    Sentry.browserProfilingIntegration(),
  ],

  // replay 的采样率：每个页面加载时以 10% 的概率开始录屏
  replaysSessionSampleRate: 0.1,
  // 当错误发生时，90% 的概率保留对应的录屏回放
  replaysOnErrorSampleRate: 0.9,

  // 在发送前过滤/修改事件
  beforeSend(event, hint) {
    // 过滤掉不需要监控的错误（如浏览器插件注入的脚本错误、断网等）
    const error = hint.originalException;
    
    // 过滤浏览器扩展/插件导致的错误
    if (error && error.message && browserExtensionError(error.message)) {
      return null; // 返回 null 表示不上报
    }

    // 过滤 Network Error（通常是用户断网，不是代码 bug）
    if (error instanceof TypeError && error.message === 'NetworkError when attempting to fetch resource.') {
      return null;
    }

    return event;
  },
});

// 浏览器扩展/插件的错误特征：文件路径包含 chrome-extension:// 或 moz-extension://
function browserExtensionError(message) {
  return /chrome-extension:|moz-extension:|safari-extension:/.test(message);
}
```

```javascript
// sentry.server.config.js —— 服务端配置（运行在 Node.js 中）
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || 'local',
  
  // 服务端特有的能力：采集 API Route 的性能数据
  integrations: [
    Sentry.httpIntegration(),           // 自动追踪服务端 HTTP 请求
    Sentry.extraErrorDataIntegration(), // 在错误事件中附加更多上下文
  ],
});
```

```javascript
// sentry.edge.config.js —— Edge Runtime 配置（Next.js Middleware / Edge API Route）
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || 'local',
});
```

#### 3.3 Next.js 配置文件

修改 `next.config.js` 让 Sentry 系列配置生效：

```javascript
// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... 你的其他 Next.js 配置
  
  // 关键：输出 source map，构建完成后 Sentry 会自动上传
  productionBrowserSourceMaps: true,
};

// withSentryConfig 封装了 sourceMap 上传 + release 注入等能力
module.exports = withSentryConfig(nextConfig, {
  // 静默模式：构建时不打印 Sentry 配置日志
  silent: true,

  // 上传 source map 到 Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // 上传完成后自动删除本地 source map 文件，避免部署到 CDN
  // 这是安全关键配置：source map 绝不能暴露在生产环境
  sourcemaps: {
    disable: false,
    deleteSourcemapsAfterUpload: true,
  },

  // 其他 Sentry 构建选项
  widenClientFileUpload: true,
});
```

#### 3.4 全局错误边界（Error Boundary）

Sentry 的 ErrorBoundary 是 React 组件级别的最后一道防线：

```javascript
// components/sentry-error-boundary.js
'use client';

import * as Sentry from '@sentry/nextjs';
import { Component } from 'react';

/**
 * Sentry 增强的 Error Boundary
 * 捕获 React 组件树中的渲染错误，自动上报到 Sentry
 */
class SentryErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  // static getDerivedStateFromError：在渲染阶段被调用，不允许副作用
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // componentDidCatch：在 commit 阶段被调用，可以做副作用（如上报）
  componentDidCatch(error, errorInfo) {
    // 上报到 Sentry，并获取 eventId
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack, // React 组件渲染栈
        },
      },
    });

    this.setState({ errorId });

    // 多次上报同一错误时的去重处理（可选）
    console.error('[ErrorBoundary] 捕获到渲染错误', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorId: null });
  };

  render() {
    if (this.state.hasError) {
      // 降级 UI：展示给用户看的友好错误页面
      return this.props.fallback ? (
        this.props.fallback({ errorId: this.state.errorId, reset: this.handleReset })
      ) : (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>页面出错了</h2>
          <p>错误 ID：{this.state.errorId}</p>
          <button onClick={this.handleReset}>重试</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SentryErrorBoundary;
```

```javascript
// app/layout.js —— 在根布局中包裹 Error Boundary
import SentryErrorBoundary from '@/components/sentry-error-boundary';

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <SentryErrorBoundary
          fallback={({ errorId, reset }) => (
            <div className="error-page">
              <h1>抱歉，页面出现了意外错误</h1>
              <p>错误追踪码：<code>{errorId}</code></p>
              <p>请将此码提供给技术支持，便于快速定位问题。</p>
              <button onClick={reset} className="btn-primary">
                点击重试
              </button>
            </div>
          )}
        >
          {children}
        </SentryErrorBoundary>
      </body>
    </html>
  );
}
```

---

### 四、错误捕获的完整链路

前端的错误不是"一个 try/catch 就完了"。不同类型、不同执行阶段的错误需要用不同机制捕获。

```
                         ┌─ try/catch ───────── 同步代码错误
                         │
                         ├─ .catch() ───────── Promise 链中的拒绝
                         │
前端错误捕获体系 ────────┼─ window.onerror ──── 未捕获的同步运行时错误
                         │
                         ├─ unhandledrejection ─ 未捕获的 Promise 拒绝
                         │
                         ├─ ErrorBoundary ───── React 渲染过程中的错误
                         │
                         └─ Sentry.captureException ─ 手动上报（业务逻辑中主动埋点）
```

```javascript
// 错误的五种"逃脱"路径和对应的捕获手段

// 1. 同步 try/catch —— 只捕获同步执行过程中的错误
try {
  JSON.parse('invalid json'); // ✅ 能被捕获
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'json-parse' },       // 打标签，方便在 Sentry 中按 feature 筛选
    extra: { input: 'invalid json' },       // 附加数据（注意不要包含敏感信息）
  });
}

// 2. Promise .catch() —— 捕获异步操作中的拒绝
fetch('/api/checkout')
  .then(res => res.json())
  .catch(error => {
    // ⚠️ 注意：如果这里又抛出一个错误，也没人捕获了
    Sentry.captureException(error, {
      tags: { api: 'checkout' },
    });
  });

// 3. window.onerror —— 最后的全局兜底，捕获"漏网"的同步错误
//    Sentry SDK 会自动注册这个处理器，你不需要手动配置
//    这里展示的是原理：
window.addEventListener('error', (event) => {
  // event.error 是 Error 对象
  // event.message 是错误消息
  // event.filename / event.lineno / event.colno 是出错位置
  console.error('[Global Error]', event.error);
  // Sentry 已经在内部处理了这个事件，你不需要二次上报
});

// 4. unhandledrejection —— 捕获"漏网"的 Promise 拒绝
//    同样，Sentry SDK 自动处理，这里展示原理：
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
  // preventDefault() 阻止浏览器在控制台打印默认错误
  event.preventDefault();
});

// 5. 手动上报 —— 不是错误但你需要知道的事情
//    例如：关键业务流程的异常分支
async function checkout(cart) {
  if (cart.items.length === 0) {
    // 这不是代码错误，但属于异常状态，值得上报供分析
    Sentry.captureMessage('用户尝试结算空购物车', {
      level: 'warning',         // 不是 error，只是 warning
      tags: { feature: 'checkout' },
      extra: { userId: cart.userId },
    });
    return;
  }
  // ... 正常流程
}
```

**错误捕获的优先级**：`ErrorBoundary`（组件级）→ `try/catch`（业务逻辑级）→ `window.onerror` + `unhandledrejection`（全局兜底）。不要让错误漏到全局兜底才处理——那是最后的手段，此时你丢失了很多上下文信息。

---

### 五、Source Map 的安全部署方案

Source Map 是把线上压缩混淆后的代码映射回源码的关键工具。没有它，Sentry 只会显示 `main.abc123.js:1:4231`，有它才能看到 `checkout.ts:142` 的原始调用栈。

**核心安全问题**：Source Map 如果被部署到 CDN，任何人都能通过浏览器 DevTools 看到你的源码（含注释、商业逻辑）。正确姿势是 **私有 Source Map**——只上传到 Sentry，不部署到公共网络。

```bash
# 构建流程（由 withSentryConfig 自动编排）：
#
# 1. next build → 生成 .js 文件 + .js.map 文件
# 2. Sentry CLI → 自动将 .map 文件上传到 Sentry 服务器
# 3. 构建完成后 → 自动删除 .map 文件
# 4. 部署到 CDN → 只有 .js 文件，没有 .map 文件
#
# 安全保证：
# - 用户浏览器 = 只有压缩代码，无法反查源码
# - Sentry 后台 = 有 .map 文件，能将压缩代码还原为源码 + 错误行号
```

```bash
# CI/CD 中的环境变量配置（示例：GitHub Actions）
# .github/workflows/deploy.yml

jobs:
  deploy:
    steps:
      - name: Build with Sentry
        env:
          # Sentry 项目标识
          SENTRY_ORG: 'my-company'
          SENTRY_PROJECT: 'web-frontend'
          # Auth Token：Sentry → Settings → Auth Tokens → Create Token（scope: project:releases）
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          # DSN：Sentry → Settings → Projects → Client Keys → DSN
          NEXT_PUBLIC_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
          # 用 Git commit SHA 作为 Release 标识
          SENTRY_RELEASE: ${{ github.sha }}
        run: |
          npm run build  # withSentryConfig 会自动处理 source map 上传和删除
```

---

### 六、Release 追踪：关联错误到 Commit

每一次部署都创建一个 Sentry Release，关联 Git 仓库：

```bash
# 手动创建 Release（在构建脚本中）
# package.json → scripts → "sentry:release": "sentry-cli releases new $SENTRY_RELEASE"

# 推荐方式：使用 @sentry/nextjs 的自动集成
# 在 next.config.js 中配置后，每次构建都会自动创建 Release + 上传 Source Map
```

在 Sentry 后台开启 GitHub 集成后，Issue 详情页会显示 **"Suspect Commits"**（可疑提交）——Sentry 自动对比当前 Release 和上一个 Release 之间的 diff，标出可能引入该错误的 commit。

```yaml
# sentry 后台 → Settings → Integrations → GitHub → Add Repository
# 配置后 Sentry 能：
# 1. 在 Issue 中展示 Suspect Commits
# 2. 标记 Issue 的 "Resolved in next release" 状态
# 3. 自动分配 Issue 给频繁修改相关文件的开发者
```

---

### 七、告警配置和 Issue 管理

#### 7.1 告警规则

Sentry 的告警不是"有错误就通知你"，而是基于统计规则，避免告警疲劳：

| 告警类型 | 触发条件 | 适用场景 |
|----------|----------|----------|
| **New Issue** | 出现全新的错误类型 | 重点关注：新部署后出现的错误 |
| **Issue 频率飙升** | 过去 1 小时内某 Issue 的发生次数是过去 24 小时均值的 2 倍以上 | 突发大量同一错误（往往是功能挂了） |
| **错误率阈值** | 指定时间段内 error / transaction 比例超过设定值 | 兜底：整体系统健康的温度计 |
| **自定义 Metric** | 你定义的条件，如 `checkout_success_rate < 95%` | 业务指标偏离正常范围 |

```javascript
// 主动上报业务 metrics，用于自定义告警
// 例如：结算成功率低于 95% 就告警
async function checkout() {
  try {
    await api.checkout();
    // 上报成功事件
    Sentry.metrics.increment('checkout.success', 1, {
      tags: { payment_method: 'wechat_pay' },
    });
  } catch (error) {
    Sentry.captureException(error);
    // 上报失败事件
    Sentry.metrics.increment('checkout.failure', 1, {
      tags: { payment_method: 'wechat_pay', error_type: error.name },
    });
    throw error;
  }
}
```

#### 7.2 错误分级

不是所有错误都值得半夜叫醒你。建立分级体系：

```
P0 — 立即修复（告警后 1h 内响应）
  • 整个页面白屏（Root ErrorBoundary 触发）
  • 核心流程全部中断（如支付、登录）
  
P1 — 24h 内修复
  • 非核心功能报错（如评论模块）
  • 降级后不影响主流程的功能
  
P2 — 迭代修复
  • 低频偶发错误（只有特定设备/浏览器触发）
  • 视觉层面的小问题
  • 第三方脚本的脚本错误（非你控制的代码）
```

在 Sentry 中通过 `level` 标签和 Issue Owner 机制实现分级：

```javascript
// 根据影响面标记错误等级
function reportError(error, context) {
  Sentry.withScope(scope => {
    scope.setTag('severity', context.severity); // P0 / P1 / P2
    scope.setTag('feature', context.feature);
    
    if (context.severity === 'P0') {
      scope.setLevel('fatal');
    }
    
    Sentry.captureException(error);
  });
}
```

---

### 八、实战：为 Next.js 项目集成 Sentry 全流程

下面是一个可执行的集成清单，假设你有一个生产环境的 Next.js 项目：

**步骤 1：创建 Sentry 项目**

```
Sentr 后台 → Create Project → 选择 Next.js → 获取 DSN → 复制
```

**步骤 2：安装 SDK 并初始化**

```bash
npm install @sentry/nextjs
```

然后创建上述三个配置文件：`sentry.client.config.js`、`sentry.server.config.js`、`sentry.edge.config.js`。

**步骤 3：配置 Next.js**

修改 `next.config.js`（见上文）。

**步骤 4：添加 ErrorBoundary**

在 `app/layout.js` 中包裹（见上文）。

**步骤 5：配置 CI/CD 环境变量**

```bash
# .env.local（本地开发用，不提交到 Git）
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxx
SENTRY_ORG=my-org
SENTRY_PROJECT=my-nextjs-app
```

**步骤 6：验证**

```bash
npm run build  # 检查 source map 是否上传成功
npm run dev    # 在浏览器中抛一个错误，检查 Sentry 后台是否收到
```

在浏览器控制台中执行快速验证：

```javascript
// 在页面任意位置执行，触发一个测试错误
Sentry.captureException(new Error('Sentry 集成验证测试'));
```

然后去 Sentry 后台 → Issues，应该能看到这条测试事件。

---

## 常见问题

**Q1：Sentry 和自建日志系统（如 ELK）有什么区别？**

Sentry 专为错误监控设计，自动聚合、去重、追踪 Release、提供 Source Map 还原。ELK 是通用日志系统，适合后端海量日志的搜索和分析。前端场景：错误监控用 Sentry，用户行为日志用埋点系统（见下一节），后端日志用 ELK。三者互补，不是替代关系。

**Q2：`sampleRate` 设为 0.3 会不会漏掉关键错误？**

采样是按 Event 维度随机丢弃，不是按 Issue 维度。同一个 Issue 出现 100 次，采样 30% 意味着你会收到约 30 个 Event，仍然能正常创建 Issue。Sentry 的 Issue 聚合不依赖全量数据，30% 采样在大多数场景下足够。只有当你需要精确统计某类错误的发生次数时，才需要调高采样率。

**Q3：Source Map 上传失败怎么办？构建会不会中断？**

Sentry Webpack Plugin（`withSentryConfig` 内部使用）默认不会让 Source Map 上传失败中断构建——它只打印警告。但你应该在 CI 中部署后检查 Sentry Releases 页面，确认当前 Release 的 Artifacts 数量 > 0。如果发现上传失败，通常是 Auth Token 权限不够或网络问题。

**Q4：ErrorBoundary 能捕获所有 React 错误吗？**

不能。Error Boundary 只能捕获**渲染过程中**和**生命周期方法中**的错误，不能捕获：(1) 事件处理器中的错误，(2) 异步代码（`setTimeout` / `Promise`）中的错误，(3) 服务端渲染（SSR）中的错误，(4) Error Boundary 自身抛出的错误。事件处理器需要自己的 `try/catch`，SSR 需要服务端的 Sentry 配置。

**Q5：Breadcrumb 会包含敏感数据吗？怎么处理？**

Sentry 默认 Breadcrumb 会记录 fetch/XHR 的 URL 和状态码，但不记录请求体和响应体。如果你需要更严格的控制，可以在 `beforeBreadcrumb` 中过滤：

```javascript
Sentry.init({
  beforeBreadcrumb(breadcrumb) {
    // 过滤掉包含 token 或 password 的 URL
    if (breadcrumb.category === 'fetch' && breadcrumb.data?.url?.includes('token=')) {
      return null; // 丢弃这条 Breadcrumb
    }
    return breadcrumb;
  },
});
```

**Q6：`@sentry/nextjs` 和 `@sentry/react` 有什么区别？**

`sentry/nextjs` 是 `@sentry/react` 的超集——它在 React SDK 基础上增加了：(1) Next.js 服务端（API Route / SSR）的自动埋点，(2) Edge Runtime 支持，(3) 自动 Source Map 上传，(4) 自动 Release 创建。如果你的项目是 Next.js，直接用 `@sentry/nextjs` 就好。

**Q7：如何过滤第三方脚本（广告、分析 SDK）导致的错误？**

在 `beforeSend` 中检查错误堆栈中是否包含第三方域名：

```javascript
Sentry.init({
  beforeSend(event) {
    const frames = event.exception?.values?.[0]?.stacktrace?.frames;
    const thirdParty = frames?.every(f => 
      f.filename?.includes('googletagmanager') || 
      f.filename?.includes('analytics')
    );
    if (thirdParty) return null; // 全是第三方脚本的错误，不上报
    return event;
  },
});
```

**Q8：有没有必要给 API 调用也加 Sentry 监控？**

有必要，但不要重复。如果后端已经有 APM（如 Datadog、OpenTelemetry），让后端团队负责后端错误追踪即可。前端侧用 Sentry 记录 API 调用的**客户端视角**——请求是否成功了？返回了 4xx/5xx 吗？耗时多久？这能帮你区分"后端返回的错误"和"前端调用逻辑的错误"。

---

## 实操作业

### 基础练习：完成一个 Sentry 最小集成

1. 在 Sentry 官网注册免费账号，创建一个 Next.js 项目
2. 按照本文第四节的步骤，完成完整的 Sentry 集成（配置 → SDK 初始化 → ErrorBoundary）
3. 故意写一段会抛出错误的代码，验证错误出现在 Sentry 后台
4. 在 Sentry 后台查看 Issue 详情，理解 Event / Breadcrumb / Tags / Release 各部分的含义

### 进阶练习：配置 Release + Source Map + 告警

1. 在 Sentry 后台配置 GitHub 集成，开启 Suspect Commits 功能
2. 在项目中集成 Sentry Release：用 Git commit SHA 作为版本号
3. 构建一个生产版本，验证 Source Map 成功上传后本地文件已删除
4. 配置告警规则：新建 Issue 告警 + 错误率阈值告警
5. 验证告警：手动触发错误，确认能收到通知（邮件 / Slack / 飞书）

### 挑战练习：建立完整的可观测性体系

1. 在项目中建立 Breadcrumb 规范：定义关键业务流程（注册、登录、下单）的标准操作路径
2. 编写错误分级 SOP 文档：定义 P0/P1/P2 的判定标准和处理流程
3. 配置 Sentry + Slack/飞书 Webhook：P0 错误（白屏、支付失败）走即时通知，P1/P2 走日报/周报汇总
4. 实现自定义 Metrics 上报：结算成功率、搜索空结果率、页面加载失败率
5. 在 Sentry Dashboard 中创建团队共享的监控看板

---

## 本节小结

错误监控不是"装个 SDK 就完事"。从架构视角看，你需要建立三个层次的认知：

1. **捕获层**：理解每种错误机制（同步 / 异步 / 渲染 / 全局）的边界和兜底关系，确保没有"抓不到"的错误
2. **分析层**：Source Map 让你看到源码行号，Breadcrumb 让你看到操作路径，Release 让你定位到具体 commit——三者一起，才能从"有一个报错"变成"知道为什么报错"
3. **运营层**：错误分级让你知道哪些值得叫醒你，告警规则让你在用户还没大规模反馈之前就发现故障

最后记住一个原则：**每一条错误日志都是用户的一次糟糕体验。你不会希望自己是最后知道的那个人。**