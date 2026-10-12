# 01-Core Web Vitals 深度解析

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L5 架构与纵深能力
> - 先修：[03 结构化日志、追踪、健康检查与备份恢复](../../L4-全栈与服务端/06-生产后端基础/03-结构化日志-追踪-健康检查与备份恢复.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[web.dev Performance](https://web.dev/performance/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 深入理解 LCP、INP、CLS 三大核心指标的测量原理和优化方向
- 掌握 CrUX 报告、PageSpeed Insights、Lighthouse 的解读方法
- 建立 RUM（真实用户监控）和 Synthetic Monitoring（实验室数据）的对比认知
- 能独立完成一个页面的 Core Web Vitals 诊断与修复全流程
- 建立性能预算（Performance Budget）的概念和实践

---

## 内容讲解

### 一、Core Web Vitals 全景

Google 在 2020 年推出 Core Web Vitals，并在 2024 年 3 月将 INP 正式替换 FID 成为三大核心指标之一。这三个指标分别衡量加载、交互、视觉稳定性三个维度：

| 指标 | 维度 | 优秀 | 需改进 | 差 |
|------|------|------|--------|-----|
| **LCP**（Largest Contentful Paint） | 加载性能 | ≤ 2.5s | 2.5s ~ 4.0s | > 4.0s |
| **INP**（Interaction to Next Paint） | 交互响应 | ≤ 200ms | 200ms ~ 500ms | > 500ms |
| **CLS**（Cumulative Layout Shift） | 视觉稳定性 | ≤ 0.1 | 0.1 ~ 0.25 | > 0.25 |

> **为什么 INP 替代了 FID？** FID 只测量首次交互的输入延迟（Input Delay），不关心交互完成后页面的处理时间和渲染时间。一个按钮点击后如果触发 500ms 的重计算，FID 只记录 5ms，完全不能反映真实体验。INP 衡量整个交互周期（输入延迟 → 处理时间 → 渲染延迟），是更诚实的用户体验指标。

---

### 二、LCP（最大内容绘制）深度解析

#### 测量原理

浏览器在页面加载过程中持续追踪"视口内最大可见元素"的变化。LCP 最终取的是这个最大元素完成渲染的时刻。

**LCP 候选元素**（按优先级）：

1. `<img>` 元素
2. `<svg>` 内的 `<image>` 元素
3. `<video>` 的 poster 属性图片
4. 通过 `url()` 加载背景图的元素
5. 包含文本节点的块级元素或内联元素

**LCP 的四个子阶段**（在 Lighthouse 中展开可见）：

```
TTFB（首字节时间）→ 资源加载延迟 → 资源加载时长 → 元素渲染延迟
   ↓                    ↓              ↓              ↓
服务器响应速度        发现资源的时间   下载资源的时间   渲染到屏幕的时间
```

#### LCP 过高的常见根因

1. **服务器响应慢**（TTFB 高）：后端处理慢、没有 CDN、服务器距离用户远
2. **关键资源发现晚**：LCP 图片不在 HTML 中直接引用，而是由 JS 动态插入或通过 CSS `background-image` 加载
3. **资源本身过大**：未压缩的高清大图
4. **客户端渲染阻塞**：JS Bundle 过大，解析/执行时间过长，推迟了 LCP 元素的渲染

#### LCP 优化策略

**策略一：减少 TTFB**

```
用户 → CDN 边缘节点（有缓存）→ 直接返回  ← 理想路径
用户 → CDN 边缘节点（无缓存）→ 源站 → 返回  ← 可接受
用户 → 源站（无 CDN）→ 返回               ← 差
```

- 静态资源上 CDN，HTML 也尽量走 CDN 缓存
- 使用 SSR / SSG 替代纯 CSR，让 HTML 在服务端就包含内容
- 后端 API 响应时间控制在 100ms 以内

**策略二：让 LCP 资源尽早被发现**

```html
<!-- ✅ 最直接的方式：LCP 图片直接写在 HTML 中 -->
<img src="/hero-banner.webp" alt="主视觉" width="1200" height="600" />

<!-- ✅ 预加载 LCP 资源：告诉浏览器"这个资源很重要，马上开始下载" -->
<link rel="preload" as="image" href="/hero-banner.webp" fetchpriority="high" />

<!-- ✅ 预连接到图片 CDN 域名，省去 DNS + TCP + TLS 握手时间 -->
<link rel="preconnect" href="https://images.cdn.example.com" />
```

**策略三：优化资源本身**

```html
<!-- ✅ 使用现代图片格式 + 响应式尺寸 -->
<picture>
  <source srcset="/hero.avif" type="image/avif" />
  <source srcset="/hero.webp" type="image/webp" />
  <img src="/hero.jpg" alt="主视觉" width="1200" height="600" fetchpriority="high" />
</picture>
```

**策略四：内联关键 CSS，延迟非关键 CSS**

```html
<head>
  <!-- 关键 CSS 内联：首屏样式直接写在 HTML 中，无需额外请求 -->
  <style>
    /* 仅包含首屏可见元素的样式，通常 < 14KB */
    .hero { display: flex; align-items: center; min-height: 100vh; }
    .hero-img { width: 100%; max-width: 1200px; aspect-ratio: 2/1; }
  </style>

  <!-- 非关键 CSS 异步加载：不阻塞渲染 -->
  <link rel="preload" href="/styles/full.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="/styles/full.css" /></noscript>
</head>
```

---

### 三、INP（交互到下次绘制）深度解析

#### 测量原理

INP 衡量的是：用户与页面交互（点击、触摸、按键）后，到浏览器实际绘制出下一帧之间的**最长延迟**。

```
用户点击按钮
    ↓
[输入延迟 ~5ms]       ← 主线程正在执行其他任务，无法立即响应
    ↓
[事件处理 ~50ms]      ← 你的 JS 代码执行（更新状态、计算数据等）
    ↓
[渲染延迟 ~15ms]      ← 浏览器执行样式计算、布局、绘制
    ↓
用户看到视觉反馈       ← 这才是用户感知到的"响应"

INP = 5 + 50 + 15 = 70ms ✅ 优秀
```

**INP 的采样方式**：不测量所有交互，而是取页面生命周期内所有交互中第 98 百分位的延迟值。这意味着即使大部分交互很快，只要存在少数慢交互，INP 就会很差。

#### 导致 INP 过高的三大元凶

**元凶一：长任务（Long Task）**

JavaScript 是单线程的。任何执行超过 50ms 的任务都是"长任务"，在此期间浏览器无法响应用户输入。

```javascript
// ❌ 长任务示例：同步处理 10 万条数据
function processAll() {
  const data = fetchData(); // 假设返回 100000 条
  data.forEach(item => {
    heavyTransform(item);  // 每条 0.1ms，总计 10 秒
  });
  renderUI(data); // 用户在这 10 秒内点击任何按钮都不会有反应
}

// ✅ 拆分长任务：将大任务切成小块，每 50ms 让出主线程
async function processInChunks(data, chunkSize = 1000) {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);

    // 用 setTimeout 将后续任务放回宏任务队列，让浏览器有机会处理用户输入
    await new Promise(resolve => {
      setTimeout(() => {
        chunk.forEach(item => heavyTransform(item));
        resolve();
      }, 0);
    });
  }
  renderUI(data);
}

// ✅ 更好的方案：把重计算丢给 Web Worker
// worker.js
self.onmessage = (e) => {
  const result = e.data.map(item => heavyTransform(item));
  self.postMessage(result); // Worker 独立线程，完全不阻塞主线程
};

// main.js
const worker = new Worker('/worker.js');
worker.onmessage = (e) => postMessage(renderUI(e.data));
worker.postMessage(largeData);
```

**元凶二：大量 DOM 操作**

```javascript
// ❌ 每次点击都触发大量 DOM 重排
list.forEach(item => {
  const li = document.createElement('li');
  li.textContent = item.name;
  container.appendChild(li); // 每次 append 都可能触发 Layout
});

// ✅ 使用 DocumentFragment 批量操作
const fragment = document.createDocumentFragment();
list.forEach(item => {
  const li = document.createElement('li');
  li.textContent = item.name;
  fragment.appendChild(li);
});
container.appendChild(fragment); // 只触发一次 Layout
```

**元凶三：第三方脚本**

```html
<!-- 第三方脚本（分析、广告、A/B测试等）往往是长任务的罪魁祸首 -->
<!-- ✅ 使用 async/defer 避免阻塞，并监控第三方脚本性能 -->
<script async src="https://third-party.com/analytics.js"></script>
```

#### INP 监控：用 PerformanceObserver 采集长任务

```javascript
// 用 PerformanceObserver 监控长任务，建立自己的 INP 预警机制
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      // 长任务定义：连续执行超过 50ms 的任务
      console.warn(`[长任务] 耗时 ${entry.duration.toFixed(0)}ms`, {
        startTime: entry.startTime,
        // 通过 attribution 可以知道是谁触发的（脚本 URL、iframe 等）
        attribution: entry.attribution,
      });

      // 实际项目中应上报到监控平台（如 Sentry、自建 RUM）
      reportToMonitoring({
        type: 'long-task',
        duration: entry.duration,
        url: entry.attribution?.[0]?.containerSrc || location.href,
      });
    }
  }
});
observer.observe({ type: 'longtask', buffered: true });
```

---

### 四、CLS（累计布局偏移）深度解析

#### 测量原理

CLS 计算的是：视口内可见元素在两次渲染帧之间，发生意外位置变化的程度。

```
CLS = 影响分数 × 距离分数

影响分数：不稳定元素在视口内占的面积比例（0~1）
距离分数：元素移动距离占视口最大尺寸的比例（0~1）

示例：视口内一张图片，占视口 50%，突然向下移动了视口高度的 25%
CLS 贡献 = 0.5 × 0.25 = 0.125  ← 单次偏移超过 0.1，已经触发"差"评级
```

**关键规则**：
- 用户交互后 500ms 内的偏移不计入 CLS（视为用户预期内的布局变化）
- 多次偏移会累积

#### CLS 的常见根因和修复

**根因一：无尺寸的图片/视频/广告位**

```html
<!-- ❌ 图片没有宽高：图片加载前高度为 0，加载后突然撑开 -->
<img src="/banner.jpg" alt="" />

<!-- ✅ 预留尺寸：利用 aspect-ratio 或明确的 width/height -->
<img src="/banner.jpg" alt="" width="1200" height="600"
     style="width: 100%; height: auto; aspect-ratio: 2/1;" />

<!-- ✅ CSS 层面统一防御 -->
img, video, iframe, [style*="background-image"] {
  aspect-ratio: attr(width) / attr(height); /* 不够精确，用具体值更好 */
}
```

**根因二：动态注入内容**

```html
<!-- ❌ 广告加载后撑开页面，把内容向下推 -->
<div id="ad-container">
  <!-- 广告 JS 加载后在此插入 250px 高的广告 -->
</div>

<!-- ✅ 预留最小高度，内容加载后不会产生偏移 -->
<div id="ad-container" style="min-height: 250px;">
  <!-- 广告 JS 加载后在此插入广告，高度不会超过 250px -->
</div>
```

**根因三：FOIT / FOUT（字体加载导致的闪烁）**

```css
/* ❌ 默认行为：字体加载完成前文字不可见（FOIT），
   加载后替换，如果 fallback 字体尺寸不同会导致偏移 */
@font-face {
  font-family: 'CustomSans';
  src: url('/fonts/custom.woff2') format('woff2');
  /* 没有 font-display，默认行为是 block：最多 3s 不可见 */
}

/* ✅ 使用 font-display: optional + 字体度量匹配 */
@font-face {
  font-family: 'CustomSans';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: optional; /* 100ms 内没加载完就用 fallback，不再切换 */
}

/* ✅ 进一步：让 fallback 字体与自定义字体的度量值（ascent/descent/x-height）匹配 */
body {
  font-family: 'CustomSans', 'Fallback Sans', system-ui;
}

/* @font-face 中使用 size-adjust 微调 fallback 字体以匹配自定义字体的度量 */
@font-face {
  font-family: 'Fallback Sans';
  src: local('Arial');
  size-adjust: 105%;      /* 将 fallback 字体的尺寸调整到接近自定义字体 */
  ascent-override: 90%;   /* 覆盖 ascender 度量 */
  descent-override: 20%;  /* 覆盖 descender 度量 */
}
```

**根因四：动画使用布局属性**

```css
/* ❌ 用 top/left 做动画：触发 Layout，且如果元素脱离文档流可能导致周围元素偏移 */
.box { transition: top 0.3s; }

/* ✅ 用 transform 做动画：不触发 Layout，不影响周围元素，不产生 CLS */
.box { transition: transform 0.3s; }
```

---

### 五、工具解读：CrUX / PSI / Lighthouse

#### CrUX（Chrome User Experience Report）

CrUX 是 Google 从真实 Chrome 用户那里收集的匿名性能数据，是全球最大的 RUM 数据集。

```
访问方式：
1. PageSpeed Insights 中"真实用户体验"部分 → 数据来源 = CrUX
2. Chrome DevTools → Lighthouse → 报告顶部的 CrUX 数据
3. BigQuery 中直接查询 CrUX 公开数据集
4. CrUX Dashboard（基于 Data Studio）
```

**CrUX 的关键特征**：
- 源自真实 Chrome 用户的 28 天聚合数据
- 只对公开可访问、流量足够的页面可用
- 按 75 百分位（P75）报告，而不是平均值

#### Lighthouse（实验室数据 / Synthetic Monitoring）

```javascript
// Lighthouse 可以用 CLI 集成到 CI 流程中
// npm install -g lighthouse

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

async function runAudit(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const result = await lighthouse(url, {
    port: chrome.port,
    onlyCategories: ['performance'],
  });

  const scores = {
    performance: result.lhr.categories.performance.score * 100,
    lcp: result.lhr.audits['largest-contentful-paint'].numericValue,
    cls: result.lhr.audits['cumulative-layout-shift'].numericValue,
    // 注意：Lighthouse 目前仍报告 TBT（Total Blocking Time），
    // 它和 INP 高度相关但不完全相同
    tbt: result.lhr.audits['total-blocking-time'].numericValue,
  };

  console.log('性能评分:', scores);
  await chrome.kill();
}
```

#### RUM vs Synthetic 对比决策表

| 维度 | RUM（真实用户监控） | Synthetic（实验室数据） |
|------|---------------------|------------------------|
| **数据来源** | 真实用户的浏览器 | 受控环境（模拟设备/网络） |
| **覆盖范围** | 所有用户、所有设备、所有网络 | 单一配置，重复运行 |
| **典型工具** | web-vitals.js, Sentry, Datadog RUM | Lighthouse, WebPageTest |
| **最大优势** | 反映真实用户体验，包含长尾数据 | 可复现、可对比、可集成 CI |
| **最大局限** | 需要足够流量才有统计意义 | 不反映真实设备/网络多样性 |

**正确姿势**：两者结合。Lighthouse 用于 CI 门禁和开发阶段验证；RUM 用于上线后监控和问题发现。

---

### 六、建立性能预算（Performance Budget）

性能预算 = 你为页面设定的性能上限。超过这个上限就视为性能回归。

```javascript
// performance-budget.config.js —— 团队共享的性能预算配置
module.exports = {
  // 资源体积预算
  budgets: [
    {
      resourceType: 'total',
      budget: 500,        // 总 JS 不超过 500KB（压缩后）
    },
    {
      resourceType: 'image',
      budget: 300,       // 图片总计不超过 300KB
    },
    {
      resourceType: 'font',
      budget: 100,       // 字体总计不超过 100KB
    },
  ],

  // 指标预算
  metrics: {
    LCP: 2500,           // ≤ 2500ms
    INP: 200,            // ≤ 200ms
    CLS: 0.1,            // ≤ 0.1
    TTFB: 800,           // ≤ 800ms
  },
};

// 在 webpack 配置中使用（构建时硬性检查）
// webpack.config.js
module.exports = {
  performance: {
    maxAssetSize: 250 * 1024,       // 单个文件不超过 250KB
    maxEntrypointSize: 500 * 1024,  // 入口总大小不超过 500KB
    hints: 'error',                  // CI 中超标则构建失败
  },
};
```

**性能预算的制定原则**：
1. 基于现有数据（不是拍脑袋）：先测 30 天 P75，取现有值的 80% 作为目标
2. 分设备等级：低端机（Moto G4）的预算应比高端机（iPhone 15 Pro）更严格
3. CI 集成：每次 PR 在 Lighthouse CI 中跑一遍，超过预算自动标记

---

### 七、实战：诊断并修复一个存在 LCP / INP / CLS 问题的页面

以一段典型的"有待优化的电商详情页"为例：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>商品详情页 — 优化前</title>

  <!-- 问题 1：CSS 是外链，阻塞渲染 -->
  <link rel="stylesheet" href="/styles/main.css" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC" />

  <!-- 问题 2：脚本是同步加载的，阻塞解析 -->
  <script src="/vendor/jquery.min.js"></script>
  <script src="/vendor/lodash.min.js"></script>
  <script src="/app/bundle.js"></script>
</head>
<body>
  <!-- 问题 3：LCP 图片没有宽高，且是 .jpg（体积大） -->
  <div class="hero">
    <img src="/hero-banner.jpg" class="hero-img" />
  </div>

  <!-- 问题 4：产品列表由 JS 动态渲染，白屏时间长 -->
  <div id="product-list"></div>

  <script>
    // 问题 5：同步处理大量数据，阻塞主线程（INP 杀手）
    const products = generateProducts(5000); // 生成 5000 条假数据
    const container = document.getElementById('product-list');
    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <h3>${p.name}</h3>
        <p>${p.price}</p>
        <button onclick="addToCart(${p.id})">加入购物车</button>
      `;
      container.appendChild(card);
    });

    // 问题 6：广告动态插入，没有预留高度（CLS 杀手）
    setTimeout(() => {
      const ad = document.createElement('div');
      ad.className = 'ad-banner';
      ad.innerHTML = '<img src="/ad.jpg" />';
      document.querySelector('.hero').after(ad);
    }, 2000);
  </script>
</body>
</html>
```

**优化后的版本：**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>商品详情页 — 优化后</title>

  <!-- ✅ 修复 1：关键 CSS 内联，非关键 CSS 异步加载 -->
  <style>
    /* 仅首屏关键样式，约 8KB */
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,sans-serif}
    .hero{position:relative;width:100%;aspect-ratio:2/1;overflow:hidden;background:#f0f0f0}
    .hero-img{width:100%;height:100%;object-fit:cover}
    .ad-placeholder{min-height:90px;background:#fafafa;margin:16px 0}
    .product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;padding:16px}
    .product-card{border:1px solid #eee;border-radius:8px;padding:16px;min-height:150px}
    .skeleton{background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  </style>
  <link rel="preload" href="/styles/full.css" as="style" onload="this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="/styles/full.css" /></noscript>

  <!-- ✅ 修复 2：预连接到关键域名 -->
  <link rel="preconnect" href="https://images.cdn.example.com" />
  <link rel="dns-prefetch" href="https://analytics.example.com" />

  <!-- ✅ 修复 3：LCP 图片预加载 + 使用 WebP + 指定宽高 -->
  <link rel="preload" as="image" href="/hero-banner.webp" fetchpriority="high" />
</head>
<body>
  <!-- ✅ 修复 3（续）：图片指定宽高，避免 CLS -->
  <div class="hero">
    <picture>
      <source srcset="/hero-banner.avif" type="image/avif" />
      <source srcset="/hero-banner.webp" type="image/webp" />
      <img src="/hero-banner.jpg" alt="主视觉"
           width="1200" height="600" class="hero-img"
           fetchpriority="high" />
    </picture>
  </div>

  <!-- ✅ 修复 6：广告位预留高度 -->
  <div class="ad-placeholder" id="ad-container">
    <p style="text-align:center;color:#999;line-height:90px">广告加载中...</p>
  </div>

  <!-- ✅ 修复 4：骨架屏占位，等 JS 加载完再填充真实内容 -->
  <div class="product-grid" id="product-list">
    <!-- 骨架屏：用固定的骨架卡片占位，CLS = 0 -->
    <div class="product-card skeleton"></div>
    <div class="product-card skeleton"></div>
    <div class="product-card skeleton"></div>
    <div class="product-card skeleton"></div>
    <div class="product-card skeleton"></div>
    <div class="product-card skeleton"></div>
  </div>

  <!-- ✅ 修复 2（续）：非关键脚本延迟加载 -->
  <script defer src="/vendor/jquery.min.js"></script>
  <script defer src="/vendor/lodash.min.js"></script>

  <script type="module">
    // ✅ 修复 5：拆分长任务，分批渲染
    import { generateProducts } from '/app/data.js';

    const TOTAL = 5000;
    const BATCH_SIZE = 20; // 每批渲染 20 个
    const allProducts = generateProducts(TOTAL);
    const container = document.getElementById('product-list');

    // 清除骨架屏
    container.innerHTML = '';

    let rendered = 0;

    function renderBatch() {
      const batch = allProducts.slice(rendered, rendered + BATCH_SIZE);
      const fragment = document.createDocumentFragment();

      batch.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
          <h3>${p.name}</h3>
          <p>${p.price}</p>
          <button data-id="${p.id}" class="add-to-cart-btn">加入购物车</button>
        `;
        fragment.appendChild(card);
      });

      container.appendChild(fragment);
      rendered += BATCH_SIZE;

      if (rendered < TOTAL) {
        // 每批之间让出主线程 16ms，保证 INP 不受影响
        setTimeout(renderBatch, 16);
      }
    }

    renderBatch();

    // ✅ 修复 5（续）：事件委托，避免给每个按钮绑定事件
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.add-to-cart-btn');
      if (btn) {
        const id = btn.dataset.id;
        addToCart(id);
      }
    });
  </script>
</body>
</html>
```

**诊断 → 修复全流程总结：**

| 步骤 | 做什么 | 工具 |
|------|--------|------|
| 1. 测量基线 | 获取当前 LCP / INP / CLS 值 | PageSpeed Insights + Lighthouse |
| 2. 定位瓶颈 | 找出哪个阶段耗时最长 | Lighthouse 的"Opportunities"和"Diagnostics" |
| 3. 制定方案 | 按投入产出比排优先级 | LCP > INP > CLS（通常顺序） |
| 4. 实施优化 | 修改代码、配置 CDN、优化资源 | 各指标对应的优化策略 |
| 5. 验证效果 | 重新测量，确认指标改善 | Lighthouse CI 对比 |
| 6. 建立监控 | 设置性能预算 + RUM 告警 | web-vitals.js + Sentry / 自建 |

---

## 常见问题

**Q1：LCP 元素是图片还是文本块，哪个更大？**

A：LCP 元素的选择与元素类型无关，只与渲染后占据的视口面积有关。一个包含大段文字的 `<p>` 占据的视口面积可能比一张小图更大。你用 DevTools 的 Performance 面板录制后，在 Timings 轨中可以看到每次 LCP 候选元素的变化过程——观察"最大元素"如何从标题文字逐渐变成 Hero 图片。

**Q2：INP 和 First Input Delay（FID）到底差在哪里？**

A：FID 只测量"浏览器收到交互事件 → 开始执行事件处理器"的延迟。INP 测量从"用户交互开始 → 浏览器实际绘制出视觉反馈"的完整延迟。举例：你点击一个按钮，FID 记录的是"点击 → 事件处理器开始执行"（假设 5ms，看起来很好），但 INP 记录的是"点击 → 页面出现加载动画/列表更新"（可能是 500ms，如果事件处理器里做了重计算）。

**Q3：INP 达标了但用户还是觉得卡，为什么？**

A：INP 取的是第 98 百分位值，意味着如果你只有 2% 的交互很慢但 INP < 200ms，可能报告值看起来不错。但用户感知是瞬间的——只要有一次点击后卡了半秒，他就会留下"这个页面有点卡"的印象。所以 INP 达标不等于体验完美，还要关注 INP 的分布情况和异常值。

**Q4：CLS 在移动端比桌面端更严重吗？**

A：是的，因为移动端视口更小。同样的位移距离在移动端视口中占比更大，导致距离分数更高。而且移动端网络不稳定，字体/图片加载更慢，异步广告加载的延迟更大，都导致 CLS 问题在移动端更突出。

**Q5：Lighthouse 跑出来分数很高，但 PSI 上的 CrUX 数据很差，怎么回事？**

A：这是典型的"Synthetic vs RUM 差距"。可能原因：(1) Lighthouse 用模拟的网络和设备，真实用户设备更差、网络更慢；(2) 你的用户分布在全球，CDN 没覆盖到；(3) Lighthouse 跑的是首页（你专门优化过的），而用户更多访问的是详情页。解决方法：在 CrUX Dashboard 中按设备、网络、地域分布查看，找到真实用户的瓶颈。

**Q6：为什么我的 LCP 图片用了 preload 还是不理想？**

A：检查三个点：(1) `fetchpriority="high"` 加了没有——preload 只告诉浏览器"提前下载"，但不告诉"这个比其他 preload 资源更优先"；(2) 是否和其他高优先级资源竞争带宽——比如同时 preload 了 5 个大图；(3) 图片 URL 是否经过了重定向——preload 对跨域重定向的支持不完善。

**Q7：什么时候用 `font-display: swap` 而不是 `optional`？**

A：`swap` 使用很短的阻塞期和无限交换期：先显示 fallback，字体之后加载完成仍会替换，适合必须展示品牌字体的页面。`optional` 只有很短的阻塞期且没有交换期，本次导航中错过窗口后通常继续使用 fallback，浏览器仍可在后续导航利用缓存。具体时长由浏览器实现决定；内容站点可结合 `size-adjust` 降低字体切换造成的 CLS。

**Q8：要不要把所有图片都换成 WebP/AVIF？**

A：AVIF 压缩率最高但编码慢（不适合用户上传后实时转换的场景），WebP 是当前最平衡的选择（压缩率好、编解码快、兼容性好）。策略：静态资源（banner、图标）用 AVIF + WebP 双格式 fallback；用户生成内容（UGC）用 WebP；需要透明通道的用 WebP（AVIF 对透明支持历史不长，老设备有兼容风险）。

---

## 实操作业

### 基础练习：测量三个指标的基线

1. 找一个你参与过的线上项目（或任意公开网站），用 PageSpeed Insights 跑一份报告
2. 记录 LCP、INP（如果没有 CrUX 数据则记录 TBT）、CLS 的值和评级
3. 展开 Lighthouse 的 Diagnostics 部分，列出 5 条优化建议
4. 用 DevTools Performance 面板录制一次页面加载，找到 LCP 时间点对应的火焰图位置

### 进阶练习：优化一个存在问题的页面

使用上面"实战"部分的优化前代码（或你的实际项目），完成以下操作：

1. 在本地搭建一个静态服务器，确保页面可访问
2. 用 Lighthouse 测量基线数据，截图保存
3. 按优先级逐个实施优化（LCP → INP → CLS），每优化一项就重新测量一次
4. 写一份优化报告，包含：每项优化的前后数据对比、优化手段、投入产出评估
5. 建立性能预算配置文件，将优化后的指标作为 CI 门禁基线

### 挑战练习：建立 RUM 监控体系

1. 在你的项目中集成 `web-vitals` 库，采集所有三个指标的真实用户数据
2. 将数据上报到你的 RUM 平台（Sentry / Datadog / 自建）
3. 设置告警规则：当 P75 LCP > 3s 或 P75 INP > 300ms 或 P75 CLS > 0.15 时触发告警
4. 在 Grafana 或同等工具中建立 Core Web Vitals Dashboard，包含：
   - 三个指标的时间趋势图（按天）
   - 按设备类型（mobile/desktop）拆分的分布图
   - 按页面路由拆分的排行榜（找出最需要优化的页面）
5. 写一份 RUM 监控体系的设计文档，说明为什么选择了这些阈值和可视化方式

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L5 里程碑](../../projects/atlas/milestones/L5.md)
- 本课任务：按 L5 里程碑在 Atlas 中建立“Core Web Vitals 深度解析”的可量化基线、改进方案、前后证据和长期治理规则。
- 起始验证：在 `前端学习路线` 目录运行 `npm run atlas:test`。
- 自动检查：为本课新增或修改的行为补充测试；无法自动化的浏览器行为必须保留截图、Network、Performance 或无障碍树证据。

### 项目验收

- [ ] 正常路径可以从统一入口复现
- [ ] 空值、错误或权限边界至少覆盖一项
- [ ] 相关自动测试通过，且没有删除既有断言
- [ ] 记录一个“现象—原因—验证—结论”
<!-- atlas-task:end -->

---

## 本节小结

Core Web Vitals 不是单纯"跑个 Lighthouse 看看分数"就结束了。作为架构视角的开发者，你需要建立三层认知：

1. **理解测量原理**：LCP 的四个子阶段、INP 的完整交互周期、CLS 的累积计算方式——只有理解原理才能在优化时直击要害
2. **建立数据闭环**：Synthetic（Lighthouse CI 门禁）→ RUM（上线后真实监控）→ 告警（异常检测）→ 回归优化，形成持续改进的飞轮
3. **建立性能预算**：用数据驱动而不是感觉驱动。先测量基线，再设定目标，用 CI 强制执行，让性能不会在迭代中悄悄退化

记住：性能优化的最大敌人不是技术，而是"现在还能用，下次再说"。每一次 PR 都应该是性能预算的验证节点。

<!-- course-nav:start -->
---

[上一篇：03 结构化日志、追踪、健康检查与备份恢复](../../L4-全栈与服务端/06-生产后端基础/03-结构化日志-追踪-健康检查与备份恢复.md) · [课程地图](../../README.md) · [下一篇：02-代码分割与懒加载策略](./02-代码分割与懒加载策略.md)
<!-- course-nav:end -->
