# 02-RUM 性能监控与埋点

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L5 架构与纵深能力
> - 先修：[01-错误监控与 Sentry](./01-错误监控与Sentry.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[OpenTelemetry](https://opentelemetry.io/docs/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 RUM（真实用户监控）与 Synthetic Monitoring 的本质区别和互补关系
- 掌握 Web Vitals 指标的采集方式（Google `web-vitals` 库）
- 能设计一套完整的前端埋点体系：事件模型、数据模型、上报策略
- 理解埋点 SDK 的核心实现原理：队列缓冲、批量上报、数据采样
- 拥有性能基线思维：能建立告警阈值并在 CI/CD 中执行性能门禁
- 理解隐私合规（GDPR / 个保法）对前端数据采集的约束

---

## 内容讲解

### 一、RUM 的核心价值：真实用户数据 vs 实验室数据

Synthetic Monitoring（如 Lighthouse）在你控制的设备上模拟固定场景，适合 CI 门禁和回归对比。但真实用户用的是千奇百怪的设备和网络——iPhone 15 Pro 在 5G 下的体验和红米 9A 在 3G 下的体验完全不同。

RUM 解决的就是这个问题：直接从用户浏览器采集真实的性能数据，告诉你**用户实际感受到了什么**。

```
Synthetic 告诉你：在模拟的 Moto G4 + 3G 网络下，LCP = 2.3s
RUM 告诉你：P75 的 LCP = 3.8s，P95 = 8.2s，80% 的慢加载来自 Android + 4G 用户

结论：你的 CDN 在移动网络下有问题，而不是实验室数据能反映出来的。
```

RUM 的核心指标分为两类：

| 类别 | 指标 | 含义 |
|------|------|------|
| **Web Vitals**（浏览器标准） | LCP / INP / CLS | 加载、交互、视觉稳定性 |
| | TTFB | 首字节时间——衡量服务器+网络延迟 |
| | FCP | 首次内容绘制——用户看到第一个像素的时刻 |
| **自定义指标**（业务定义） | PV / UV | 页面浏览量 / 独立访客数 |
| | 页面停留时长 | 用户在页面上的活跃时间 |
| | API 耗时分布 | P50 / P75 / P95 的接口响应时间 |
| | 错误率 | 按页面 / 接口维度统计的 JS 异常比例 |
| | 自定义转化率 | 注册完成率、下单成功率等业务漏斗指标 |

---

### 二、Web Vitals 的采集：Google 官方 `web-vitals` 库

不要自己拿 `PerformanceObserver` 裸写 Web Vitals 采集——Google 的 `web-vitals` 库已经把各种浏览器兼容性、指标算法细节（如 CLS 的会话窗口计算）封装好了。

```bash
npm install web-vitals
```

```javascript
// lib/vitals.js —— Web Vitals 统一采集模块
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

/**
 * 上报函数：将采集到的指标数据发送到你的 RUM 后端
 * web-vitals 的回调在指标最终确定后触发，每个指标在页面生命周期内只触发一次
 * （INP 例外：它可能在多次交互后才确定最终值）
 */
function sendToRUM(metric) {
  // metric 对象的结构：
  // {
  //   name: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB',
  //   value: 数字（LCP/FCP/TTFB 是毫秒，CLS 是分数，INP 是毫秒）,
  //   rating: 'good' | 'needs-improvement' | 'poor',
  //   delta: 相对于上一次上报的变化量,
  //   id: 当前页面加载的唯一标识,
  //   navigationType: 'navigate' | 'reload' | 'back-forward-cache' | 'prerender',
  //   entries: PerformanceEntry[] 数组, // 底层的 Performance API 条目
  // }

  // 方式一：使用 `navigator.sendBeacon` 确保页面卸载时也能上报
  // sendBeacon 的优势：异步、不阻塞页面卸载、浏览器保证发送
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    // 附加上下文信息
    timestamp: Date.now(),
    pageURL: location.href,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/rum/vitals', new Blob([body], { type: 'application/json' }));
  } else {
    // sendBeacon 不支持的降级方案：fetch + keepalive
    fetch('/api/rum/vitals', {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {}); // 静默失败，上报失败不能影响业务
  }
}

/**
 * 初始化 Web Vitals 采集
 * 每个回调在指标"最终确定"后触发：
 *   - LCP：页面加载完成后，最大内容绘制稳定时触发
 *   - CLS：页面隐藏（切换 Tab / 关闭）时触发（累积值）
 *   - INP：用户离开页面时触发（整个会话中最长交互延迟）
 *   - FCP/TTFB：首次确定后立即触发
 */
export function initVitals() {
  onLCP(sendToRUM);
  onINP(sendToRUM);
  onCLS(sendToRUM);
  onFCP(sendToRUM);
  onTTFB(sendToRUM);
}

// 在应用入口调用：
// main.js 或 app/layout.js 的客户端组件中
// import { initVitals } from '@/lib/vitals';
// initVitals();
```

**重要细节**：

- `onCLS` 的回调在页面生命周期结束时触发（用户关闭 Tab、切到后台），因为 CLS 是累积值，早触发没有意义。如果你的 SPA 有软路由切换，需要显式告知 `web-vitals` 当前页面已变更。
- 对于 SPA（React Router / Vue Router），每次路由切换后应该上报一次当前页面的 FCP/LCP：

```javascript
// lib/vitals-spa.js —— SPA 场景下的 Web Vitals 采集
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

let vitalsInitialized = false;

export function initSPAVitals(onReport) {
  if (vitalsInitialized) return;
  vitalsInitialized = true;
  onCLS(onReport);
  onINP(onReport);
  onFCP(onReport);
  onTTFB(onReport);
  // LCP 特殊处理：SPA 中每次路由变化需要重新观测
  onLCP(onReport, { reportAllChanges: true }); // ⚠️ 关键配置
}

// 路由变化时重置指标观测（让 web-vitals 知道"新页面开始了"）
export function resetVitalsOnRouteChange() {
  // web-vitals 内部维护了页面加载状态，SPA 路由变化时
  // 需要清空已存储的 metric 值，重新开始观测
  // 具体做法：在路由切换后重新调用 onFCP/onLCP
  // 注意：INP 和 CLS 是会话级别的，不应该 reset
}
```

---

### 三、性能数据的上报策略

「采集什么」已经清楚了，下一步是「怎么发到服务端」。核心考量是**可靠性、采样率、性能开销**。

#### 3.1 上报时机

| 时机 | 适用数据 | 传输方式 |
|------|----------|----------|
| 页面卸载时 | Web Vitals（CLS/INP 必须在此时才能确定） | `sendBeacon` |
| 数据达到阈值时 | 错误事件 | `fetch` + `keepalive` |
| 定时批量 | 用户行为事件、API 耗时 | `fetch`（在空闲时发送） |
| 页面切换时（SPA） | PV、页面停留时长 | `fetch` |

#### 3.2 批量上报：减少网络开销

单个事件一条 HTTP 请求 = 浪费带宽 + 阻塞浏览器并发连接数。最好用**消费队列**模式：

```javascript
// lib/reporter.js —— 批量上报引擎
class Reporter {
  constructor(options = {}) {
    this.queue = [];                    // 事件缓冲队列
    this.maxSize = options.maxSize || 20;       // 达到 20 条立即上报
    this.flushInterval = options.flushInterval || 5000; // 每 5 秒定时上报
    this.endpoint = options.endpoint || '/api/rum/events';
    this.sampleRate = options.sampleRate || 1.0;     // 采样率：1.0 = 全量
    
    // 启动定时刷新
    this.timer = setInterval(() => this.flush(), this.flushInterval);

    // 页面卸载时强制发送
    window.addEventListener('beforeunload', () => this.flush(true));
    // 页面隐藏时也发送（移动端切后台）
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.flush(true);
    });
  }

  /**
   * 添加一条事件到上报队列
   * @param {Object} event - 事件数据
   */
  push(event) {
    // 采样判断：每个事件以 sampleRate 的概率被保留
    if (Math.random() > this.sampleRate) return;

    // 附加公共字段（减少每个事件的冗余）
    this.queue.push({
      ...event,
      _ts: Date.now(),              // 事件发生时间戳（客户端时钟）
      _url: location.href,          // 当前页面 URL
      _ua: navigator.userAgent,     // User Agent（后端解析设备/浏览器类型）
    });

    // 队列满了 → 立即发送
    if (this.queue.length >= this.maxSize) {
      this.flush();
    }
  }

  /**
   * 立即发送队列中的所有事件
   * @param {boolean} useBeacon - 页面卸载时使用 sendBeacon（更可靠）
   */
  flush(useBeacon = false) {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0);  // 清空队列，取出所有事件
    const body = JSON.stringify({ events: batch });

    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(this.endpoint, body);
    } else {
      fetch(this.endpoint, {
        method: 'POST',
        body,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {});
    }
  }

  /** 销毁上报器（SPA 路由切换时可能需要重建） */
  destroy() {
    clearInterval(this.timer);
    this.flush(true);
  }
}

// 导出单例
export const reporter = new Reporter({
  maxSize: 20,
  flushInterval: 5000,
  sampleRate: 1.0,
});
```

#### 3.3 利用 `requestIdleCallback` 发送

避免上报逻辑和用户交互争抢主线程：

```javascript
flush() {
  if (this.queue.length === 0) return;
  const batch = this.queue.splice(0);

  // 在浏览器空闲时发送，不阻塞渲染和交互
  const send = () => {
    navigator.sendBeacon(this.endpoint, JSON.stringify({ events: batch }));
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(send, { timeout: 2000 }); // 如果 2s 内浏览器都不空闲，强制执行
  } else {
    send();
  }
}
```

---

### 四、自定义埋点的设计：事件模型和数据模型

Web Vitals 只覆盖性能指标。业务层面需要自己的埋点体系——用户做了什么、转化率多少、哪个功能用得最多。

#### 4.1 事件模型

好的埋点体系需要统一的事件模型，而不是每个开发者随手写一个 `fetch('/api/track', ...)`：

```
事件 = {
  事件类型（eventType）：'page_view' | 'click' | 'expose' | 'api_call' | 'error' | 'business'
  
  事件名称（eventName）：具体语义，如 'checkout_complete'、'search_submit'
  
  事件属性（properties）：{  // 灵活扩展的键值对
    业务属性：orderAmount: 29900,
    技术属性：apiEndpoint: '/api/checkout',
    用户属性：userId: 'xxx'（脱敏后）,
  }
  
  公共属性（由 SDK 自动附加）：timestamp, pageURL, sessionId, userId, deviceInfo
}
```

```javascript
// lib/tracker.js —— 统一埋点 SDK
import { reporter } from './reporter';

class Tracker {
  constructor() {
    this.sessionId = this._getSessionId();
    this.userId = null;   // 登录后由业务方设置
  }

  /**
   * 页面浏览（PV）
   */
  trackPageView(pageName, properties = {}) {
    reporter.push({
      type: 'page_view',
      event: pageName,
      properties: {
        referrer: document.referrer,
        ...properties,
      },
    });
  }

  /**
   * 用户点击行为
   */
  trackClick(elementName, properties = {}) {
    reporter.push({
      type: 'click',
      event: elementName,
      properties,
    });
  }

  /**
   * 元素曝光（进入视口）
   * @param {string} elementName - 被曝光元素的标识
   * @param {object} properties - 附加上下文
   */
  trackExpose(elementName, properties = {}) {
    reporter.push({
      type: 'expose',
      event: elementName,
      properties: {
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        ...properties,
      },
    });
  }

  /**
   * API 调用耗时
   * @param {string} endpoint - API 路径
   * @param {number} duration - 耗时（毫秒）
   * @param {number} status - HTTP 状态码
   */
  trackAPI(endpoint, duration, status, properties = {}) {
    reporter.push({
      type: 'api_call',
      event: endpoint,
      properties: {
        duration,             // 耗时
        status,               // 状态码
        isSlow: duration > 3000, // 慢请求标记（> 3s）
        ...properties,
      },
    });
  }

  /**
   * 业务事件（自定义语义）
   * @example tracker.trackBusiness('checkout_complete', { orderId: 'xxx', amount: 29900 })
   */
  trackBusiness(eventName, properties = {}) {
    reporter.push({
      type: 'business',
      event: eventName,
      properties,
    });
  }

  /**
   * JS 错误上报（已有 Sentry 时通常不用这层，这里是降级方案）
   */
  trackError(error, properties = {}) {
    reporter.push({
      type: 'error',
      event: error.message || 'unknown_error',
      properties: {
        stack: error.stack?.slice(0, 500), // 堆栈截断，避免数据过大
        fileName: error.fileName,
        lineNumber: error.lineNumber,
        ...properties,
      },
    });
  }

  /** 生成或恢复 Session ID */
  _getSessionId() {
    // 从 sessionStorage 中读取，页面刷新保持同一会话
    let sid = sessionStorage.getItem('_rum_sid');
    if (!sid) {
      sid = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem('_rum_sid', sid);
    }
    return sid;
  }
}

// 导出单例
export const tracker = new Tracker();
```

#### 4.2 数据模型：后端表结构建议

```
上报事件表（rum_events）:
  id            BIGINT PRIMARY KEY
  event_type    VARCHAR(32)    -- 'page_view' | 'click' | 'expose' | 'api_call' | 'error' | 'business'
  event_name    VARCHAR(128)   -- 'home_page' | 'checkout_complete' 等
  properties    JSON           -- 事件属性，灵活扩展
  user_id       VARCHAR(64)    -- 脱敏后的用户标识
  session_id    VARCHAR(128)   -- 会话 ID
  page_url      VARCHAR(2048)  -- 当前页面 URL
  referrer      VARCHAR(2048)  -- 来源页面
  user_agent    TEXT           -- User Agent 原始字符串
  client_ts     BIGINT         -- 客户端时间戳
  server_ts     BIGINT         -- 服务端接收时间戳（用这个做时间序列分析，避免客户端时钟偏差）

Web Vitals 指标表（rum_vitals）:
  id            BIGINT PRIMARY KEY
  metric_name   VARCHAR(16)    -- 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB'
  metric_value  DOUBLE         -- 具体数值
  rating        VARCHAR(16)    -- 'good' | 'needs-improvement' | 'poor'
  page_url      VARCHAR(2048)
  session_id    VARCHAR(128)
  device_type   VARCHAR(16)    -- 'mobile' | 'tablet' | 'desktop'（后端从 UA 解析）
  client_ts     BIGINT
```

---

### 五、埋点 SDK 的实现原理：从零到一

上面你已经看到了 SDK 的核心组件。这里总结一下它的完整架构：

```
┌─────────────────────────────────────────────────────────┐
│                    埋点 SDK 架构                          │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│  │ Tracker   │    │ vitals.js│    │ 自动采集  │           │
│  │ 手动埋点   │    │ WebVitals│    │ 错误/PV   │           │
│  │ 业务事件   │    │ 性能指标  │    │ API 耗时  │           │
│  └─────┬─────┘    └─────┬─────┘    └─────┬─────┘         │
│        │                │                │               │
│        └────────────────┼────────────────┘               │
│                         ▼                                │
│              ┌──────────────────┐                        │
│              │   Reporter       │ ← 队列缓冲 + 批量上报    │
│              │   (事件队列)      │                        │
│              └────────┬─────────┘                        │
│                       │                                  │
│                       ▼                                  │
│    ┌──────────────────────────────────┐                  │
│    │   sendBeacon / fetch + keepalive │ → RUM 后端       │
│    └──────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

**关键设计决策**：

| 决策点 | 选项 | 选择 | 理由 |
|--------|------|------|------|
| 传输方式 | sendBeacon vs fetch vs img beacon | sendBeacon（主要） + fetch（降级） | sendBeacon 保证页面卸载时送达，浏览器不限制；img 方式有 URL 长度限制 |
| 上报时机 | 实时 vs 批量 vs 页面卸载时 | 批量（常规）+ 卸载时（强制） | 减少 HTTP 连接数，降低对业务请求的抢占 |
| 队列持久化 | localStorage vs 内存 vs IndexedDB | 内存 | 页面刷新后重新采集，不需要跨页面持久化 |
| 采样位置 | 客户端采样 vs 服务端采样 | 客户端 | 减少无效传输，但会导致 P95 等分位数统计不精确（需要用采样率回推） |

---

### 六、数据分析平台：自建 vs 三方

| 维度 | 三方（GA4 / 火山引擎） | 自建 |
|------|------------------------|------|
| **接入成本** | 低：引入 SDK，配 dashboard 即用 | 高：需要后端、存储、可视化全套 |
| **灵活性** | 受限：按平台预定义的分析维度 | 完全自由：你想怎么分析都可以 |
| **数据所有权** | 数据在三方，有合规风险 | 数据在你手上 |
| **维护成本** | 零 | 需要持续投入 |
| **推荐场景** | 中小企业、没有数据团队 | 大厂、对数据安全和定制化要求高 |

**推荐的组合策略**：核心性能指标用自建 RUM（数据在你手上，可以做深度分析），用户行为分析用 GA4（即开即用，UBA 能力强），错误监控用 Sentry（专有领域最强）。

---

### 七、性能基线的建立和告警

#### 7.1 建立基线

性能基线的建立分三步：

```
第 1 步：采集 30 天的 RUM 数据
        → 取每个指标每天的 P75 值
        → 画趋势图，观察波动幅度

第 2 步：计算正常范围
        → 正常 = 过去 30 天 P75 的均值 ± 30%
        → 例如 LCP P75 = 2.0s，正常范围 = 1.4s ~ 2.6s

第 3 步：设定告警阈值
        → 告警阈值应该比"正常范围上限"更宽松
        → 例如 LCP 告警阈值 = 3.0s（而不是正常上限 2.6s）
        → 原因：避免正常波动触发告警（告警疲劳）
```

#### 7.2 告警配置（以自建 RUM 为例）

```yaml
# 告警规则配置示意
alerts:
  - name: "LCP 劣化"
    metric: LCP_P75
    condition: "过去 15 分钟 > 过去 24 小时均值的 1.5 倍"
    severity: warning

  - name: "LCP 严重劣化"
    metric: LCP_P75
    condition: "过去 15 分钟 > 基线值的 2 倍，持续 30 分钟"
    severity: critical
  
  - name: "JS 错误率飙升"
    metric: js_error_rate
    condition: "过去 5 分钟 > 5%（正常 < 1%）"
    severity: critical

  - name: "API 慢请求比例"
    metric: api_slow_rate
    condition: "过去 10 分钟 > 10% 的 API 调用 > 3s"
    severity: warning
```

**告警原则**：宁可少报几次，也不要误报。每一次误报都在消耗团队的信任，久而久之告警就变成了"狼来了"。

---

### 八、数据采样和上报频率策略

全量采集是理想，但在高流量场景下（日 PV > 100 万），全量会把你的后端存储撑爆。

**策略一：固定比例采样**

```javascript
// 10% 采样：每 10 个用户只采集 1 个的完整数据
const sampleRate = 0.1;
const shouldSample = Math.random() < sampleRate;
```

问题：低流量时就采不到足够数据。解决方案：**动态采样**。

**策略二：按流量动态调整**

```javascript
// 流量越高采样率越低，保证后端接收的事件量稳定
function getDynamicSampleRate(targetQPS = 100) {
  // 假设后端能承受 100 QPS 的上报
  const currentQPS = estimateCurrentQPS(); // 通过心跳包或后端下发的配置
  return Math.min(1.0, targetQPS / currentQPS);
}
```

**策略三：分层采样**

下面只是初始示例，实际比例要根据事件价值、流量、隐私约束、后端容量和误差预算确定，并支持动态下发：

```
核心事件（错误、支付失败）  → 高采样率，必要时全量
性能指标（Web Vitals）     → 30% 采样
用户行为（点击、曝光）     → 10% 采样
页面浏览（PV）              → 5% 采样
```

---

### 九、隐私合规：GDPR、数据脱敏、用户同意

这是前端监控最容易踩的坑。你采集的每一条数据都可能涉及用户隐私。

#### 9.1 必须遵守的原则

```
不采集：
  ✗ 密码、身份证号、银行卡号（绝不，连脱敏都不要采）
  ✗ 表单中实际输入的内容（text input 的 value）
  ✗ 完整的 Cookie 字符串
  ✗ localStorage 中的认证 token

需要脱敏后采集：
  △ userId → 用 HMAC 哈希后的一串字符
  △ email → 只保留域名部分（@example.com）
  △ 手机号 → 只保留前 3 位 + *** + 后 4 位
  △ IP 地址 → 后端记录时只保留 /24 前缀（不精确到具体用户）
```

#### 9.2 用户同意（Consent）

GDPR 要求：在采集任何个人数据之前，必须获得用户的明确同意。

```javascript
// lib/consent.js —— 用户同意管理
const CONSENT_KEY = '_rum_consent';

export const ConsentStatus = {
  GRANTED: 'granted',       // 用户同意
  DENIED: 'denied',         // 用户拒绝
  PENDING: 'pending',       // 等待用户选择
};

/**
 * 获取当前同意状态
 */
export function getConsentStatus() {
  const stored = localStorage.getItem(CONSENT_KEY);
  if (stored === ConsentStatus.GRANTED || stored === ConsentStatus.DENIED) {
    return stored;
  }
  return ConsentStatus.PENDING;
}

/**
 * 用户做出选择后调用
 */
export function setConsent(status) {
  localStorage.setItem(CONSENT_KEY, status);
  if (status === ConsentStatus.GRANTED) {
    // 同意后才初始化 RUM 上报
    initRUM();
  } else {
    // 拒绝后禁用所有采集
    reporter.destroy();
  }
}

// 在 Tracker 和 Reporter 中加一层门禁：
class Tracker {
  trackClick(...args) {
    // 如果用户还没同意，不采集
    if (getConsentStatus() !== ConsentStatus.GRANTED) return;
    // ... 正常上报逻辑
  }
}
```

#### 9.3 数据脱敏实现

```javascript
// lib/sanitizer.js —— 数据脱敏工具
export function sanitize(data) {
  if (typeof data === 'string') {
    // 移除疑似手机号的内容（11 位连续数字）
    data = data.replace(/\b1[3-9]\d{9}\b/g, match => {
      return match.slice(0, 3) + '****' + match.slice(-4);
    });

    // 移除疑似邮箱的内容
    data = data.replace(/\b[\w.-]+@([\w-]+\.)+[\w-]+\b/g, match => {
      const [_, domain] = match.split('@');
      return `***@${domain}`;
    });

    // 移除疑似身份证的内容（18 位）
    data = data.replace(/\b\d{17}[\dXx]\b/g, '********18位身份证********');
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  if (data && typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      // 跳过明确非敏感的键
      if (['password', 'token', 'secret', 'authorization'].includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]'; // 标记为已移除
        continue;
      }
      sanitized[key] = sanitize(value);
    }
    return sanitized;
  }

  return data;
}
```

---

### 十、实战：实现一个完整的性能监控 SDK

下面是一个可独立运行的完整 SDK（精简版），覆盖 PV/UV、Web Vitals、错误上报、用户行为追踪四大核心能力：

```javascript
// rum-sdk.js —— 前端 RUM 监控 SDK（可直接引入项目使用）
//
// 使用方式：
//   import { initRUM } from './rum-sdk.js';
//   initRUM({ appId: 'my-app', sampleRate: 0.3, endpoint: 'https://rum.example.com/api/collect' });

// ============ 1. Reporter：批量上报引擎 ============
class Reporter {
  constructor({ endpoint, maxSize = 20, flushInterval = 5000 }) {
    this.endpoint = endpoint;
    this.maxSize = maxSize;
    this.queue = [];
    this.timer = setInterval(() => this.flush(), flushInterval);
    window.addEventListener('beforeunload', () => this.flush(true));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.flush(true);
    });
  }

  push(event) {
    this.queue.push(event);
    if (this.queue.length >= this.maxSize) this.flush();
  }

  flush(useBeacon = false) {
    if (this.queue.length === 0) return;
    const batch = JSON.stringify({ events: this.queue.splice(0) });
    const send = () => {
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(this.endpoint, batch);
      } else {
        fetch(this.endpoint, { method: 'POST', body: batch, keepalive: true }).catch(() => {});
      }
    };
    if (window.requestIdleCallback) {
      requestIdleCallback(send, { timeout: 2000 });
    } else {
      send();
    }
  }

  destroy() {
    clearInterval(this.timer);
    this.flush(true);
  }
}

// ============ 2. 公共上下文（每个事件都会携带） ============
function getCommonContext() {
  return {
    appId: getCommonContext._appId,
    sessionId: getCommonContext._sessionId,
    pageURL: location.href,
    referrer: document.referrer,
    timestamp: Date.now(),
    // 设备信息：后端从 UA 解析时更准确，这里做客户端快速分类
    screenSize: `${window.screen.width}x${window.screen.height}`,
  };
}

// ============ 3. PV/UV 采集 ============
function trackPageView() {
  reporter.push({
    type: 'page_view',
    pageURL: location.href,
    title: document.title,
    ...getCommonContext(),
  });
}

// ============ 4. Web Vitals 采集 ============
async function initWebVitals() {
  // 动态导入 web-vitals，如果未安装则跳过
  try {
    const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import('web-vitals');
    const callback = (metric) => {
      reporter.push({
        type: 'web_vital',
        metricName: metric.name,
        metricValue: metric.value,
        rating: metric.rating,
        ...getCommonContext(),
      });
    };
    onCLS(callback);
    onINP(callback);
    onLCP(callback);
    onFCP(callback);
    onTTFB(callback);
  } catch (e) {
    // web-vitals 未安装，跳过
  }
}

// ============ 5. JS 错误采集 ============
function initErrorCapture() {
  // 未捕获的同步错误
  window.addEventListener('error', (event) => {
    // 区分 JS 错误和资源加载错误
    if (event.error) {
      reporter.push({
        type: 'js_error',
        message: event.message,
        stack: event.error.stack?.slice(0, 500),
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        ...getCommonContext(),
      });
    }
  });

  // 未捕获的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    reporter.push({
      type: 'js_error',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack?.slice(0, 500),
      ...getCommonContext(),
    });
  });
}

// ============ 6. 用户行为追踪 ============
function initBehaviorTracking() {
  // 只追踪用户主动触发的点击——忽略程序触发的 click()
  document.addEventListener('click', (event) => {
    const target = event.target.closest('button, a, [data-track]');
    if (!target) return;

    const trackName = target.dataset.track || // <button data-track="checkout_submit">
                      target.textContent?.trim().slice(0, 50) || // 按钮文字（截断）
                      target.tagName.toLowerCase();

    reporter.push({
      type: 'behavior',
      action: 'click',
      element: trackName,
      elementPath: getElementPath(target), // CSS 选择器路径
      ...getCommonContext(),
    });
  }, true);  // 使用捕获阶段，防止事件被阻止冒泡

  // 页面停留时长：进入 → 离开 = 差值
  const enterTime = Date.now();
  window.addEventListener('beforeunload', () => {
    reporter.push({
      type: 'behavior',
      action: 'page_exit',
      stayDuration: Date.now() - enterTime, // 停留时长（毫秒）
      ...getCommonContext(),
    });
  });
}

/**
 * 获取元素在 DOM 树中的路径（用于定位用户点击了哪里）
 * 例如：div#app > main > section.hero > button.cta-button
 */
function getElementPath(el) {
  const path = [];
  while (el && el !== document.body) {
    let selector = el.tagName.toLowerCase();
    if (el.id) selector += `#${el.id}`;
    else if (el.className && typeof el.className === 'string') {
      selector += `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`;
    }
    path.unshift(selector);
    el = el.parentElement;
  }
  return path.join(' > ');
}

// ============ 7. 统一初始化入口 ============
let reporter = null;

/**
 * 初始化 RUM SDK
 * @param {Object} options
 * @param {string} options.appId - 应用标识（必填）
 * @param {string} options.endpoint - 数据接收端点（必填）
 * @param {number} options.sampleRate - 采样率，0~1，默认 0.3
 */
export function initRUM({ appId, endpoint, sampleRate = 0.3 }) {
  // 采样：sampleRate 的概率不采集
  if (Math.random() > sampleRate) {
    console.log(`[RUM SDK] 当前会话未被采样（sampleRate=${sampleRate}）`);
    return;
  }

  // 初始化 Session ID（同一次页面会话共享）
  let sid = sessionStorage.getItem('_rum_sid');
  if (!sid) {
    sid = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('_rum_sid', sid);
  }

  getCommonContext._appId = appId;
  getCommonContext._sessionId = sid;

  // 创建 Reporter
  reporter = new Reporter({ endpoint });

  // 初始化各采集模块
  trackPageView();            // PV
  initWebVitals();            // Web Vitals
  initErrorCapture();         // JS 错误
  initBehaviorTracking();     // 用户行为

  // SPA 路由变化时重新上报 PV（需要业务方在路由切换时调用）
  if (!window.__rumSPAHookInstalled) {
    window.__rumSPAHookInstalled = true;
    window.addEventListener('popstate', trackPageView);
    // 劫持 pushState 和 replaceState（SPA 路由通常用到它们）
    const origPushState = history.pushState;
    history.pushState = function (...args) {
      origPushState.apply(this, args);
      trackPageView();
    };
    const origReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      origReplaceState.apply(this, args);
      trackPageView();
    };
  }

  console.log(`[RUM SDK] 初始化完成（appId=${appId}, sampleRate=${sampleRate}）`);
}

// ============ 8. 暴露手动埋点 API ============
export function rumTrack(eventName, properties = {}) {
  if (!reporter) return;
  reporter.push({
    type: 'custom',
    event: eventName,
    properties,
    ...getCommonContext(),
  });
}

// ============ 9. 暴露销毁 API ============
export function destroyRUM() {
  if (reporter) {
    reporter.destroy();
    reporter = null;
  }
}
```

**在 Next.js 项目中使用**：

```javascript
// app/layout.js 的客户端组件中
'use client';

import { useEffect } from 'react';
import { initRUM } from '@/lib/rum-sdk';

export default function ClientLayout({ children }) {
  useEffect(() => {
    initRUM({
      appId: 'my-nextjs-app',
      endpoint: '/api/rum/collect', // Next.js API Route 作为接收端点
      sampleRate: process.env.NODE_ENV === 'production' ? 0.3 : 1.0,
    });
  }, []);

  return <>{children}</>;
}
```

**后端接收端点示例（Next.js API Route）**：

```javascript
// app/api/rum/collect/route.js
export async function POST(request) {
  try {
    const { events } = await request.json();

    // 服务端采样（第二层）：如果客户端上传太频繁，服务端再做一次降采样
    // 这里简化处理：直接写入日志/消息队列，实际项目用 Kafka / Pulsar
    for (const event of events) {
      event.server_ts = Date.now(); // 服务端时间戳
      // 写入日志文件 / 消息队列 / 数据库（取决于你们的后端架构）
      // 示例：stdout 输出，由日志采集系统（如 Filebeat）转发到 Kafka
      console.log(JSON.stringify(event));
    }

    return Response.json({ status: 'ok' });
  } catch (error) {
    return Response.json({ status: 'error', message: error.message }, { status: 400 });
  }
}
```

---

## 常见问题

**Q1：`sendBeacon` 和 `fetch + keepalive` 有什么区别，什么时候用哪个？**

`sendBeacon` 用于把少量数据异步加入发送队列，特别适合 `visibilitychange`/页面离开场景；返回 `true` 只表示成功排队，不保证服务端收到。`fetch(..., { keepalive: true })` 更通用，可读取响应并设置更多请求选项，但同样受浏览器的请求体大小和生命周期限制。正常批量上报可用 `fetch`，页面隐藏时尝试 `sendBeacon` 或 `keepalive`，服务端仍需按“可能丢失、可能重复”设计。

**Q2：SPA 路由切换时 Web Vitals 怎么处理？**

SPA 的"软路由"不会触发浏览器的完整页面加载，所以 LCP/FCP 不会重新计算，CLS 会跨页面累积（影响准确性）。解决方案：(1) `onLCP` 设置 `reportAllChanges: true`；(2) 路由切换时手动重置 metric 状态；(3) 上报时附带当前路由路径，以便后端区分。

**Q3：采样后如何还原真实的事件量？**

只有在每个事件以已知、独立且稳定的 30% 概率随机入样时，`样本事件量 / 0.3` 才是总体数量的无偏估计；动态采样时应随事件记录采样率，并按入样概率加权。P75/P95 不能除以采样率，应直接从具有代表性的样本估计并报告样本量或置信区间。低频关键事件可能需要更高采样率，但全量采集仍会受丢包、拦截和成本影响。

**Q4：为什么我的 RUM 数据和 GA4 的数据对不上？**

正常。原因：(1) 采样率不同；(2) 用户群体不同（有的用户装了 Ad Blocker 会屏蔽 GA4 但不会屏蔽你的自建 RUM）；(3) 指标定义不同（比如 PV 的"页面"概念在 SPA 中定义方式可能不同）；(4) 时钟偏差和数据延迟。差距在 10% 以内是正常的，超过 30% 需要排查采集逻辑差异。

**Q5：`requestIdleCallback` 上报有风险吗？**

有。页面持续繁忙时空闲回调可能长时间得不到执行。设置 `timeout` 会让任务过期后尽快获得调度资格，但主线程被长任务阻塞时仍不能保证精确在 2 秒执行。应先做特性检测，准备 `setTimeout` 等降级，并在 `visibilitychange` 时额外刷新关键缓冲区；不要只依赖空闲回调保存唯一一份事件。

**Q6：自建 RUM 的后端该用什么技术栈？**

推荐链路：`客户端上报` → `Nginx 接收` → `Kafka/Pulsar（消息队列缓冲）` → `Flink/Spark Streaming（实时聚合）` → `ClickHouse/StarRocks（时序存储）` → `Grafana（可视化）`。如果团队规模小，简化为 `客户端` → `Node.js 接收` → `PostgreSQL + TimescaleDB 插件` → `Grafana` 也足够。

**Q7：怎么检测用户是否装了 Ad Blocker？我需要知道采集覆盖率。**

```javascript
// 在页面中放一个"诱饵"脚本，Ad Blocker 通常会拦截它
const testScript = document.createElement('script');
testScript.src = '/analytics-test.js'; // 文件名包含 "analytics" 容易被拦截
testScript.onerror = () => {
  // 加载失败 = 被 Ad Blocker 拦截
  reporter.push({ type: 'internal', event: 'adblock_detected' });
};
document.head.appendChild(testScript);
```

**Q8：埋点事件的定义文档应该怎么管理？**

不要口头约定。建立一个**埋点字典（Tracking Plan）**——一个表格文档，每行列出一个埋点事件的完整定义：事件名、触发时机、属性列表和类型、是否 PII（个人可识别信息）、责任人。每次新增或修改埋点时，先改字典再改代码。可以用 Avo、Segment Protocols 等工具做自动化校验。

---

## 实操作业

### 基础练习：集成 `web-vitals` 并上报

1. 在任意一个前端项目中安装 `web-vitals`：`npm install web-vitals`
2. 按照本文第二节的代码，完成 LCP、INP、CLS、FCP、TTFB 五个指标的采集
3. 将采集到的指标通过 `sendBeacon` 上报到一个本地 Node.js 服务器（或 Next.js API Route）
4. 在浏览器 DevTools 的 Network 面板中确认数据成功发送
5. 用 Lighthouse 跑一次页面，将 Synthetic 数据与你自己采集的 RUM 数据做对比

### 进阶练习：实现完整的 RUM SDK

1. 将本文第十节的 `rum-sdk.js` 复制到你的项目中，补充完成以下功能：
   - API 调用耗时自动采集（通过劫持 `fetch` 和 `XMLHttpRequest`）
   - 资源加载耗时自动采集（通过 `PerformanceObserver` 监听 `resource` 类型）
   - 白屏时间采集（从 `navigationStart` 到 FCP 的时间段）
2. 在后端实现一个最小接收端点，将数据写入本地 JSON 文件
3. 写一个简单的数据查询脚本，统计过去 24 小时的 PV、UV、P75 LCP、JS 错误率
4. 在你的项目页面上手动触发 100 次不同操作，验证埋点数据的完整性

### 挑战练习：建立完整的可观测性闭环

1. 部署一套完整的 RUM 数据管道（推荐 ClickHouse + Grafana，或使用 Supabase + Metabase）
2. 在 Grafana 中搭建以下看板：
   - Web Vitals 时间趋势图（三个指标、按设备类型拆分）
   - 页面性能排行榜（按 LCP P75 排序，找出最慢的前 10 个页面）
   - API 耗时分布（P50 / P75 / P95 / P99，按接口拆分）
   - 用户行为漏斗（首页 → 搜索 → 商品详情 → 加购 → 下单 → 支付）
3. 基于 30 天 RUM 数据建立性能基线，设定告警规则
4. 编写一份《前端可观测性白皮书》，包含：可观测性体系架构图、指标定义、告警规则、故障响应 SOP、隐私合规措施

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L5 里程碑](../../projects/atlas/milestones/L5.md)
- 本课任务：按 L5 里程碑在 Atlas 中建立“RUM 性能监控与埋点”的可量化基线、改进方案、前后证据和长期治理规则。
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

RUM 和埋点是前端可观测性的"肉身"——没有它们，你只能靠用户反馈才能知道线上发生了什么。从架构视角看，建立 RUM 体系需要回答五个问题：

1. **采集什么**：Web Vitals + 自定义业务指标 + 用户行为，覆盖性能和业务两个维度
2. **怎么采**：利用浏览器原生 API（`PerformanceObserver`、`sendBeacon`、`web-vitals` 库），不重复造轮子
3. **怎么发**：队列缓冲 + 批量上报 + 空闲时发送，不对业务性能产生影响
4. **怎么存和看**：时序数据库 + 可视化平台，让数据能说话
5. **怎么合规**：数据脱敏、用户同意、最小够用原则——监控数据也是用户数据

最后一句忠告：**不要等到用户投诉"页面好慢"才开始埋点。监控是设计阶段就要考虑的事，上线后再补，既漏数据又不系统。**

<!-- course-nav:start -->
---

[上一篇：01-错误监控与 Sentry](./01-错误监控与Sentry.md) · [课程地图](../../README.md) · [下一篇：01-Design Tokens 与 DTCG 规范](../05-设计系统/01-Design-Tokens与DTCG规范.md)
<!-- course-nav:end -->
