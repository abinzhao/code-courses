# Core Web Vitals 与性能预算：指标、因果和同条件复验

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个可在正常/故障模式间切换的页面、实验指标面板和可判定资源/交互预算 |
| 文件 | `browser-lab/server.mjs`、`public/index.html`、`public/main.js` |
| 运行方式 | 正常访问 `/`；故障访问 `/?bad=1`，分别录制至少 5 次 |
| 故障设计 | 慢 LCP 图片、无尺寸图片、延迟横幅、260 ms 点击处理 |
| 可观察证据 | LCP 候选、CLS 会话窗口、交互耗时候选、Long Task、资源数/传输字节 |
| 结论边界 | 页面内值是实验数据，不是 Chrome UX Report 字段数据或正式用户第 75 百分位 |
| 安全/隐私 | 指标不携带用户输入和完整 URL；真实 RUM 需采样、同意、保留期和脱敏 |
| 证据边界 | 本地候选与五次录制只用于可控回归，不替代真实设备、CrUX 或用户 p75 |
| 建议时间 | 阅读 45 分钟，实验 60 分钟，练习 35 分钟 |

## 1. 任务背景

邻里集市首页可能出现三类用户体验问题：

- 主商品图很晚才成为可见主要内容；
- 图片和横幅到达后把“预约”按钮推走；
- 用户点击筛选后，页面很久才呈现下一帧。

它们分别与 LCP、CLS 和 INP 相关。但指标只描述结果，不自动指出原因。LCP 变差可能来自 TTFB、资源发现、下载或渲染延迟；INP 变差可能来自输入等待、事件处理或下一帧呈现；CLS 需要找到具体 shift source。

## 2. 学习目标

- 解释 LCP、CLS、INP 的观察对象与聚合方式；
- 区分实验室单次数据、RUM 字段数据和 Core Web Vitals 判定口径；
- 用 PerformanceObserver 收集本地诊断候选，并说明近似边界；
- 把预算写成可判定的资源、长任务和体验约束；
- 从指标回到 Network/Performance/Layout Shift 调用证据；
- 避免把同时变化、单次高分或工具分数当作因果证明。

## 3. 预备知识

先完成[DevTools 证据链](01-network-performance-memory-evidence.md)。需要理解 Performance 时间线、资源条目、长任务与布局变化。建议用无痕测试窗口，关闭扩展，固定视口和网络条件。

本课阈值采用 2026-10-11 官方资料快照：

| 指标 | 良好 | 需改进 | 较差 |
| --- | ---: | ---: | ---: |
| LCP | ≤ 2.5 s | ≤ 4.0 s | > 4.0 s |
| INP | ≤ 200 ms | ≤ 500 ms | > 500 ms |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 |

正式评估通常看移动/桌面分别统计的第 75 百分位。本地一次低于阈值不代表整体良好。

## 4. 核心理论

### 4.1 LCP 是候选演进，不只是 onload

浏览器观察视口内符合条件的较大图像或文本内容，随着新内容呈现更新候选。首次用户输入或页面隐藏后候选通常停止。诊断可拆成：

```text
TTFB
  + 资源加载延迟（何时被发现/请求）
  + 资源加载时长
  + 元素渲染延迟
= LCP
```

优化图片字节只影响其中一段。若资源迟到才被 JavaScript 添加，发现延迟可能才是主因。

### 4.2 CLS 使用会话窗口

单个 LayoutShift 的 value 反映不稳定元素影响区域和移动距离。CLS 不是把页面终身所有 shift 无限累加，而是取会话窗口的最大累计值：窗口在相邻 shift 间隔超过 1 秒或总跨度超过 5 秒时结束。由最近用户输入引发的预期变化通常排除。

给图片 `width/height` 或 `aspect-ratio` 预留空间，常能消除加载后位移；这不等于所有布局变化都应禁止。

### 4.3 INP 覆盖完整交互延迟

一次交互大致包括：

```text
输入延迟 → 事件处理 → 呈现延迟
```

INP 按页面交互数量处理异常值：交互少于 50 次时通常取最慢交互；之后每增加 50 次可忽略一个
最慢异常值，得到接近第 98 百分位的代表值。Event Timing 条目可辅助本地诊断，但本课页面内
“最大 interaction duration”只是少量交互下的候选近似，不替代标准库和浏览器最终 INP 计算。

### 4.4 Long Task 是原因线索，不是 INP 本身

超过 50 ms 的主线程任务可能阻塞输入，但 Long Task 也可能发生在无交互时；一次交互也可能被多个任务和渲染延迟影响。要在 Performance 时间线上把交互条目与任务、布局、绘制对齐。

### 4.5 性能预算应靠近原因

体验阈值适合目标，工程预算适合门禁：

- 首屏请求数与传输字节；
- 关键图片尺寸和发现时机；
- 主线程长任务数量/时长；
- 关键交互处理预算；
- 图片尺寸属性与布局偏移来源；
- 新依赖压缩后增量。

预算必须注明页面、设备、网络、构建与统计方式。

## 5. 元素、属性、API 或配置清单

| API / 字段 | 作用 | 边界 |
| --- | --- | --- |
| `PerformanceObserver` | 订阅性能条目 | 先检查 `supportedEntryTypes` |
| `largest-contentful-paint` | LCP 候选 | 页面内读取受权限/生命周期限制 |
| `layout-shift` | 布局偏移条目 | 过滤 `hadRecentInput`，按会话聚合 |
| `event` | Event Timing 交互条目 | `interactionId` 为 0 的条目需区分 |
| `longtask` | ≥50 ms 主线程任务 | 不等于 INP |
| `resource` | 请求 timing/transferSize | 缓存、跨源 Timing-Allow-Origin 影响字段 |
| `entry.startTime` | 相对 time origin 时间 | 不是 UTC 时间 |
| `entry.duration` | 条目持续时间 | 可能量化，定义因 entry type 而异 |
| `web-vitals` | 常用标准测量库 | 生产应锁版本并记录归因字段 |
| CrUX | 匿名聚合真实用户数据 | 不是单个会话诊断工具 |

## 6. 最小可运行案例

### 6.1 `server.mjs`

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(process.argv[2] ?? "./public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function send(res, status, type, body, headers = {}) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
  res.writeHead(status, {
    "Content-Type": type,
    "Content-Length": bytes.length,
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(bytes);
}

createServer(async (req, res) => {
  try {
    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET" });
      res.end();
      return;
    }
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/hero.svg") {
      const delay = Math.min(
        3000,
        Math.max(0, Number(url.searchParams.get("delay")) || 0),
      );
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
        <rect width="640" height="360" fill="#dbeafe"/>
        <circle cx="210" cy="190" r="95" fill="none" stroke="#1e3a8a" stroke-width="16"/>
        <circle cx="450" cy="190" r="95" fill="none" stroke="#1e3a8a" stroke-width="16"/>
        <path d="M210 190 L300 90 L380 190 L270 190 L335 115 L450 190"
          fill="none" stroke="#b45309" stroke-width="15"/>
        <text x="320" y="335" text-anchor="middle" font-size="28">邻里自行车</text>
      </svg>`;
      send(res, 200, "image/svg+xml; charset=utf-8", svg, {
        "Server-Timing": `hero-delay;dur=${delay}`,
      });
      return;
    }

    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, "." + (
      pathname.endsWith("/") ? `${pathname}index.html` : pathname
    ));
    const type = types[extname(file)];
    if (!file.startsWith(root + sep) || !type) {
      send(res, 404, "text/plain; charset=utf-8", "资源不存在");
      return;
    }
    send(res, 200, type, await readFile(file));
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : 500;
    send(res, status, "text/plain; charset=utf-8", "实验服务失败");
  }
}).listen(3300, "127.0.0.1", () => {
  console.log(`实验根目录：${root}`);
  console.log("正常：http://127.0.0.1:3300/");
  console.log("故障：http://127.0.0.1:3300/?bad=1");
});
```

### 6.2 `public/index.html`

```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>Web Vitals 预算实验</title>
<style>
  body { max-width: 48rem; margin: auto; font: 16px/1.5 system-ui; }
  img { display: block; max-width: 100%; height: auto; background: #dbeafe; }
  #late-banner { padding: 2rem; background: #fef3c7; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #999; padding: .4rem; text-align: left; }
  .pass { color: #166534; }
  .fail { color: #991b1b; }
</style>
<main>
  <h1>邻里集市性能预算</h1>
  <p>模式：<strong id="mode">读取中</strong></p>
  <div id="banner-anchor"></div>
  <img id="hero" width="640" height="360"
    alt="一辆用于邻里当面交易的自行车示意图">
  <h2>自行车，28000 分</h2>
  <button id="reserve" type="button">检查预约状态</button>
  <p id="status" role="status">尚未检查</p>

  <h2>本次实验候选值</h2>
  <table>
    <thead><tr><th>指标</th><th>值</th><th>本课预算</th><th>结果</th></tr></thead>
    <tbody id="metrics"></tbody>
  </table>
  <button id="report" type="button">刷新预算报告</button>
  <p id="boundary">页面内候选值不是正式字段数据。</p>
</main>
<script type="module" src="./main.js"></script>
</html>
```

### 6.3 `public/main.js`

```js
const params = new URLSearchParams(location.search);
const badMode = params.get("bad") === "1";
const mode = document.querySelector("#mode");
const hero = document.querySelector("#hero");
const bannerAnchor = document.querySelector("#banner-anchor");
const reserveButton = document.querySelector("#reserve");
const status = document.querySelector("#status");
const metricsBody = document.querySelector("#metrics");
const reportButton = document.querySelector("#report");

const values = {
  lcp: null,
  cls: 0,
  interaction: null,
  longTasks: 0,
  longestTask: 0,
  resources: 0,
  transferBytes: 0,
};
const interactions = new Map();
let clsSessionValue = 0;
let clsSessionStart = 0;
let clsLastTime = 0;

mode.textContent = badMode ? "故障模式" : "正常模式";
if (badMode) {
  hero.removeAttribute("width");
  hero.removeAttribute("height");
  setTimeout(() => {
    const banner = document.createElement("p");
    banner.id = "late-banner";
    banner.textContent = "延迟插入的社区活动横幅";
    bannerAnchor.append(banner);
  }, 700);
}
hero.src = `/hero.svg?delay=${badMode ? 1600 : 100}`;

function observe(type, callback, options = {}) {
  if (!PerformanceObserver.supportedEntryTypes.includes(type)) return;
  const observer = new PerformanceObserver((list) => callback(list.getEntries()));
  observer.observe({ type, buffered: true, ...options });
}

observe("largest-contentful-paint", (entries) => {
  const last = entries.at(-1);
  if (last) values.lcp = last.startTime;
});

observe("layout-shift", (entries) => {
  for (const entry of entries) {
    if (entry.hadRecentInput) continue;
    const startsNewSession = (
      clsSessionStart === 0 ||
      entry.startTime - clsLastTime > 1000 ||
      entry.startTime - clsSessionStart > 5000
    );
    if (startsNewSession) {
      clsSessionStart = entry.startTime;
      clsSessionValue = entry.value;
    } else {
      clsSessionValue += entry.value;
    }
    clsLastTime = entry.startTime;
    values.cls = Math.max(values.cls, clsSessionValue);
  }
});

observe("event", (entries) => {
  for (const entry of entries) {
    if (!entry.interactionId) continue;
    const previous = interactions.get(entry.interactionId) ?? 0;
    interactions.set(entry.interactionId, Math.max(previous, entry.duration));
  }
  values.interaction = interactions.size
    ? Math.max(...interactions.values())
    : null;
}, { durationThreshold: 16 });

observe("longtask", (entries) => {
  for (const entry of entries) {
    values.longTasks += 1;
    values.longestTask = Math.max(values.longestTask, entry.duration);
  }
});

reserveButton.addEventListener("click", () => {
  const startedAt = performance.now();
  const workMs = badMode ? 260 : 20;
  while (performance.now() - startedAt < workMs) {
    Math.sqrt(Math.random() * 1000);
  }
  status.textContent =
    `状态仍需服务端确认；本地处理约 ${Math.round(performance.now() - startedAt)} ms`;
});

function resourceTotals() {
  const navigations = performance.getEntriesByType("navigation");
  const resources = performance.getEntriesByType("resource");
  const requests = [...navigations, ...resources];
  values.resources = requests.length;
  values.transferBytes = requests.reduce(
    (sum, entry) => sum + (entry.transferSize || 0),
    0,
  );
}

function format(value, unit, digits = 0) {
  return value === null ? "尚无样本" : `${value.toFixed(digits)} ${unit}`;
}

function row(name, valueText, budgetText, passed) {
  const tr = document.createElement("tr");
  const result = passed === null ? "未判定" : passed ? "通过" : "未通过";
  tr.innerHTML = `<th scope="row"></th><td></td><td></td><td></td>`;
  tr.children[0].textContent = name;
  tr.children[1].textContent = valueText;
  tr.children[2].textContent = budgetText;
  tr.children[3].textContent = result;
  tr.children[3].className = passed === null ? "" : passed ? "pass" : "fail";
  return tr;
}

function renderReport() {
  resourceTotals();
  metricsBody.replaceChildren(
    row("LCP 候选", format(values.lcp, "ms"), "≤ 2500 ms",
      values.lcp === null ? null : values.lcp <= 2500),
    row("CLS 会话最大值", format(values.cls, "", 3), "≤ 0.1",
      values.cls <= 0.1),
    row("交互耗时候选", format(values.interaction, "ms"), "≤ 200 ms",
      values.interaction === null ? null : values.interaction <= 200),
    row("Long Task", `${values.longTasks} 个；最长 ${values.longestTask.toFixed(0)} ms`,
      "关键交互不新增 > 50 ms 任务", values.longTasks === 0),
    row("导航与资源请求", String(values.resources), "≤ 8 个", values.resources <= 8),
    row("传输字节", `${values.transferBytes} B`, "≤ 200000 B",
      values.transferBytes <= 200000),
  );
}

reportButton.addEventListener("click", renderReport);
window.addEventListener("load", () => {
  setTimeout(renderReport, badMode ? 2200 : 400);
});
```

运行：

```bash
cd browser-lab
node server.mjs ./public
```

正常模式和 `/?bad=1` 各执行：

1. 固定窗口与 Network 节流，硬导航；
2. 页面稳定后点击“检查预约状态”一次；
3. 点“刷新预算报告”并保存数字；
4. Performance 录制相同动作，查看 LCP candidate、Layout Shifts、Interaction 与 Long Task；
5. 每种模式至少 5 次，报告中位数和范围，不只取最佳值。

故障模式预期：LCP 图片约 1.6 秒后到达（本机总值还含其他阶段）、CLS 增加、交互约 260 ms 且出现 Long Task。正常模式不应出现故意横幅/尺寸位移，交互处理约 20 ms。

## 7. 邻里集市集成案例

项目预算示例（不是行业统一事实）：

```text
页面：公开商品详情，生产构建
环境：目标中端移动设备；固定慢速网络配置；5 次冷启动
体验目标：LCP p75 ≤ 2.5 s；INP p75 ≤ 200 ms；CLS p75 ≤ 0.1
工程门禁：
  - 首屏最多 8 个关键请求
  - 首屏压缩传输 ≤ 200 KiB
  - 主商品图在 HTML 中可发现且预留宽高比
  - 预约交互不新增 > 50 ms 主线程任务
  - 新依赖记录压缩后增量与使用路径
```

RUM 上报只传页面类别、粗粒度设备/网络、指标值、归因类别和匿名发布版本；不传搜索词、商品标题、用户 ID、完整 URL、Cookie 或 DOM 文本。按隐私政策设置采样和保留期。

离线命中可能改善加载数字但返回陈旧业务数据，不能用性能预算压过正确性。安全头、授权和内容校验也不能为“更快”移除。优化后必须回归错误、键盘、权限和离线状态。

## 8. 常见错误与排查路径

### 错误示例：指标改善就宣称某改动是原因

```js
// 错误推理：部署同时改了图片、缓存和服务器，却只归功于压缩图片。
console.log("LCP 下降 30%，所以图片压缩是唯一原因");
```

### 错误示例：单次 Lighthouse 100 分即毕业

```text
一次本地运行、未知缓存状态、无真实交互 → 不能代表用户 p75。
```

### 诊断记录

| 字段 | 记录 |
| --- | --- |
| 现象 | 故障模式中主图晚出现，按钮下移，点击后约四分之一秒才更新 |
| 证据 | Network hero-delay 约 1600 ms；Layout Shift source 指向横幅/图片；Event/Long Task 约 260 ms |
| 原因 | 图片发现后人为延迟且未预留尺寸；延迟横幅插入；点击处理同步忙等 |
| 修复 | HTML 预留尺寸并减少关键资源延迟；横幅预留槽位；拆分/移除同步重计算 |
| 复验 | 固定条件各 5 次；正常模式候选值和 Performance 调用链均不再出现故障源 |

这份记录只证明实验因果，因为每次只切换已知模式。生产中一次改多个变量时，应使用分阶段发布、对照或更细归因，避免把相关当因果。

## 9. 课后题

1. **LCP 等于页面 load 时间吗？**
   答：不等于。LCP 是最大内容候选的呈现时间，生命周期和停止条件不同。
2. **所有布局变化都计入 CLS 吗？**
   答：不是，最近用户输入引起的预期变化通常排除，并按会话窗口聚合。
3. **Long Task 数为 0 是否保证 INP 良好？**
   答：不保证，输入排队、多个小任务和呈现延迟仍可能影响交互。
4. **本地 5 次结果能否替代 p75 字段数据？**
   答：不能，只能用于可控回归；字段数据来自真实用户分布。
5. **`transferSize === 0` 是否说明资源 0 字节？**
   答：不一定，缓存、跨源 timing 限制或实现会影响该字段。

## 10. 实践练习

### 基础：修复图片空间

保留慢图片，只恢复 `width/height`。

**验收答案：**CLS 对应图片位移消失或显著下降；LCP 加载延迟仍存在，证明两个问题可独立。

### 进阶：拆分交互长任务

把 260 ms 工作分成可中断小块或移到 Worker，并保持结果一致。

**验收答案：**Performance 不再有单个 260 ms 任务；交互呈现更早；总 CPU 与 Worker 通信成本有记录。

### 故障注入：缓存状态混淆

分别在 Disable cache、正常 HTTP cache 和 Service Worker 控制下测试。

**验收答案：**每组标明响应来源，不混算；内容新鲜度单独校验；不通过清除所有同源数据制造“修复”。

## 11. 阶段验收

- [ ] 三个文件可运行，正常与故障模式差异稳定可观察；
- [ ] LCP、CLS、交互候选、Long Task、资源数与字节均有页面和 DevTools 证据；
- [ ] 每种模式至少 5 次，报告条件、中位数/范围而非最佳单次；
- [ ] 能从指标定位到具体网络、DOM 或调用栈；
- [ ] 预算注明页面、构建、设备、网络与统计口径；
- [ ] RUM 方案不上传用户输入、标识、完整 URL 和 DOM 文本；
- [ ] 明确本地候选不等于正式 INP、CrUX 或真实用户 p75。

## 12. 常见问题

**为什么页面内值和 DevTools/Lighthouse 不完全相同？**
观察停止时机、工具版本、节流、缓存、采样和指标实现可能不同。先对齐环境与定义，再比较。

**应该优化到阈值刚好通过吗？**
阈值是体验分档，不是停止思考的线。应留回归余量，并结合业务关键路径和真实分布。

**能否自己实现代码替代 `web-vitals`？**
本课实现用于理解和故障实验。生产建议使用维护中的标准库和浏览器字段数据，锁版本并记录归因。

**LCP 元素一定是图片吗？**
不一定，也可能是文本或其他符合条件的内容。应查看实际 LCP entry 和 DevTools 标注。

## 13. 扩展阅读

- [web.dev: Web Vitals](https://web.dev/articles/vitals)
- [web.dev: Optimize LCP](https://web.dev/articles/optimize-lcp)
- [web.dev: Optimize CLS](https://web.dev/articles/optimize-cls)
- [web.dev: Optimize INP](https://web.dev/articles/optimize-inp)
- [W3C: Largest Contentful Paint](https://w3c.github.io/largest-contentful-paint/)
- [W3C: Layout Instability](https://wicg.github.io/layout-instability/)
- [W3C: Event Timing](https://w3c.github.io/event-timing/)

资料快照日期：2026-10-11。阈值和指标定义应在使用时复核官方资料；实验未验证 CrUX、真实 RUM、低端移动设备、Safari/Firefox 或生产 CDN。

## 我现在能做到什么

我能解释 LCP、CLS 和 INP 的形成方式，用可控故障把指标追溯到网络、布局和主线程原因，并建立带环境、统计口径、隐私和正确性边界的性能预算。

## 单元导航

[上一课：DevTools 证据链](01-network-performance-memory-evidence.md) · [本章目录](../README.md#06-devtools-与性能诊断) · [本卷目录](../README.md) · [继续：JavaScript 与 TypeScript](../../04-javascript-typescript/README.md)
