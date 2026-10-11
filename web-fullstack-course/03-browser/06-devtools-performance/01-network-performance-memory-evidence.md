# DevTools 证据链：网络、主线程、内存与页面状态

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个可控慢请求、长任务和资源泄漏实验，以及一份跨面板诊断记录 |
| 文件 | `browser-lab/server.mjs`、`public/index.html`、`public/main.js` |
| 运行方式 | `node server.mjs ./public`，用 Chromium DevTools 逐项录制 |
| 证据面板 | Network、Performance、Rendering、Memory、Application、Coverage、Elements Accessibility |
| 故障开关 | API 延迟/失败、180 ms 主线程阻塞、面板清理遗漏 |
| 隐私边界 | 只使用公开演示数据；导出 HAR/截图/快照前检查 URL、Header、响应与用户信息 |
| 安全边界 | 诊断不能读取或分享凭据、私人响应、真实用户标识和未授权生产内存 |
| 证据边界 | DevTools 会增加开销；开发机构建和单次录制不代表真实用户分布 |
| 建议时间 | 阅读 45 分钟，实验 60 分钟，练习 35 分钟 |

## 1. 任务背景

“页面很慢”不是可执行问题。它可能是：

- 请求未发出或服务器响应慢；
- 下载内容过大；
- JavaScript 长任务阻塞输入；
- 样式/布局/绘制反复；
- 事件监听或定时器未清理；
- 缓存、Service Worker 或旧存储改变行为；
- 可访问名称缺失，让用户根本无法理解控件。

DevTools 面板不是七套互不相关的答案。诊断要从固定动作出发，把网络时间、主线程工作、内存保留和页面状态串成一条证据链。

## 2. 学习目标

- 把模糊现象改写成环境、动作和可观察结果；
- 用 Network 区分排队、TTFB、下载、状态码和重复请求；
- 用 Performance 定位长任务、调用栈、布局与绘制；
- 用 Rendering 辅助观察 paint、layout shift 和 FPS，而不把叠层当根因；
- 用 Heap Snapshot/Allocation 找到保留路径，而非只看瞬时曲线；
- 检查 Application、Coverage 和 Accessibility 提供的边界证据；
- 形成“现象、证据、原因、修复、复验”的可交接记录。

## 3. 预备知识

需要能启动本地 Node 服务、使用 Elements/Console/Network，并理解事件监听、定时器和 AbortController。关闭无关扩展，记录 Chromium 版本、设备、窗口、网络节流与是否打开 DevTools。

录制前先确认实验没有其他 Service Worker 控制。若有，记录它而不是直接清除；只有确认它属于旧实验后才注销。

## 4. 核心理论

### 4.1 诊断从可重复场景开始

一个合格场景包含：

```text
环境：浏览器版本、设备、构建、网络、数据量
起点：硬导航/重复导航、缓存状态、登录状态
动作：点击什么、输入什么、重复几次
现象：何时开始、持续多久、用户看到什么
```

优化前后必须保持这些条件一致。只挑一次最快结果会产生选择偏差。

### 4.2 Network 回答“等待在哪里”

| 证据 | 能支持的判断 | 不能单独证明 |
| --- | --- | --- |
| 请求未出现 | 事件/代码路径可能未执行 | 服务端一定正常 |
| Queueing 长 | 请求优先级或连接竞争值得检查 | 一定是浏览器连接上限 |
| TTFB 长 | 服务器/代理/网络首字节链路慢 | 数据库一定是根因 |
| Content Download 长 | 字节量或网络吞吐值得检查 | 压缩一定没开 |
| Initiator 重复 | 某调用链反复发起 | 重复一定无业务必要 |
| ServiceWorker 标记 | 响应经过 SW | 内容一定新鲜 |

请求详情可能含 Cookie、Token、查询参数和私人响应。分享 HAR 前必须脱敏。

### 4.3 Performance 回答“主线程做了什么”

录制应只覆盖目标动作。长任务常以超过 50 ms 标记，这只是诊断阈值；多个 40 ms 任务也可能持续阻塞。查看 Main 轨道调用栈、Event Timing、Style/Layout、Paint 与截图，找到时间归属。

Performance.mark/measure 能标记业务阶段，但标记本身不解释因果。需要与调用栈和代码对应。

### 4.4 Memory 回答“为什么还活着”

内存上升不等于泄漏，GC、JIT、图片解码和缓存都会改变曲线。泄漏证据应是：

1. 固定动作重复多轮；
2. 强制 GC 仅作为实验辅助；
3. 快照中对象数量/保留大小持续增加；
4. Retainers 指向未清理的 listener、timer 或集合；
5. 修复后同条件不再增长。

### 4.5 其他面板补齐上下文

- Rendering：Paint flashing、Layout Shift Regions、FPS 辅助定位视觉工作；
- Application：Storage、Cache、Service Worker 解释状态来源；
- Coverage：一次场景中未执行的 CSS/JS 字节，不能直接等同可删除代码；
- Accessibility：名称、角色、属性和树结构，不能替代真实屏幕阅读器测试；
- Console：错误和自定义标记，不能当作唯一性能量化。

## 5. 元素、属性、API 或配置清单

| 工具 / API | 用途 | 使用边界 |
| --- | --- | --- |
| Network Preserve log | 保留导航/跳转请求 | 会混入多场景，需标记起点 |
| Disable cache | 控制 DevTools 打开时缓存 | 不代表真实重复访问 |
| Performance record | 主线程、渲染、网络时间线 | 录制本身有开销 |
| Paint flashing | 显示重绘区域 | 重绘不一定是主要瓶颈 |
| Heap snapshot | 对象与保留路径 | 快照时刻不是增长趋势 |
| Allocation instrumentation | 查看一段时间分配 | 开销更高，缩小场景 |
| Application | 检查存储/SW/缓存 | 只删除当前实验数据 |
| Coverage | 当前操作未使用字节 | 路由/权限路径可能尚未执行 |
| Accessibility tree | 检查角色与名称 | 仍需键盘和真实 AT 验证 |
| `performance.mark/measure` | 标记业务阶段 | 测量边界必须写清 |

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
const listings = Array.from({ length: 120 }, (_, index) => ({
  id: `listing-${index + 1}`,
  title: `公开商品 ${index + 1}`,
  priceCents: 1000 + index * 125,
}));

function send(res, status, type, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET" });
      res.end();
      return;
    }
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/api/v1/listings") {
      const delay = Math.min(
        3000,
        Math.max(0, Number(url.searchParams.get("delay")) || 600),
      );
      const startedAt = performance.now();
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
      if (url.searchParams.get("fail") === "1") {
        send(res, 503, "application/json; charset=utf-8", JSON.stringify({
          code: "LAB_FAILURE",
          message: "可控 503",
        }), { "Server-Timing": `wait;dur=${performance.now() - startedAt}` });
        return;
      }
      send(res, 200, "application/json; charset=utf-8", JSON.stringify({
        items: listings,
        total: listings.length,
      }), { "Server-Timing": `wait;dur=${performance.now() - startedAt}` });
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
  console.log("打开 http://127.0.0.1:3300");
});
```

### 6.2 `public/index.html`

```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>DevTools 证据实验</title>
<main>
  <h1>邻里集市诊断台</h1>
  <section aria-labelledby="network-title">
    <h2 id="network-title">网络与渲染</h2>
    <label for="delay">API 延迟（毫秒）</label>
    <input id="delay" type="number" value="600" min="0" max="3000">
    <label><input id="fail" type="checkbox"> 返回 503</label>
    <button id="load" type="button">加载 120 件商品</button>
    <button id="block" type="button">制造 180 ms 长任务</button>
    <p id="status" role="status">尚未运行</p>
    <ul id="list"></ul>
  </section>

  <section aria-labelledby="memory-title">
    <h2 id="memory-title">面板生命周期</h2>
    <label><input id="leak" type="checkbox"> 故意跳过清理</label>
    <button id="open" type="button">打开商品面板</button>
    <button id="close" type="button">关闭商品面板</button>
    <button id="clear-leaks" type="button">清理故意保留的资源</button>
    <div id="panel-host"></div>
  </section>
</main>
<script type="module" src="./main.js"></script>
</html>
```

### 6.3 `public/main.js`

```js
const delayInput = document.querySelector("#delay");
const failInput = document.querySelector("#fail");
const loadButton = document.querySelector("#load");
const blockButton = document.querySelector("#block");
const status = document.querySelector("#status");
const list = document.querySelector("#list");
const leakInput = document.querySelector("#leak");
const openButton = document.querySelector("#open");
const closeButton = document.querySelector("#close");
const clearLeaksButton = document.querySelector("#clear-leaks");
const panelHost = document.querySelector("#panel-host");

let currentPanel;
const leakedCleanups = [];
const runCount = Number(localStorage.getItem("diagnostic-run-count") ?? "0") + 1;
localStorage.setItem("diagnostic-run-count", String(runCount));
console.info("诊断页本地运行次数", runCount);

function validatePayload(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    !Array.isArray(value.items) ||
    !Number.isInteger(value.total)
  ) {
    throw new TypeError("列表响应不合法");
  }
  return value;
}

function renderListings(items) {
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const row = document.createElement("li");
    row.textContent = `${item.title}，${item.priceCents} 分`;
    fragment.append(row);
  }
  list.replaceChildren(fragment);
}

loadButton.addEventListener("click", async () => {
  const query = new URLSearchParams({
    delay: delayInput.value,
    fail: failInput.checked ? "1" : "0",
  });
  status.textContent = "正在加载";
  performance.mark("listings:start");
  try {
    const response = await fetch(`/api/v1/listings?${query}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = validatePayload(await response.json());
    renderListings(data.items);
    status.textContent = `已显示 ${data.total} 件`;
  } catch (error) {
    status.textContent = `加载失败：${error.message}`;
  } finally {
    performance.mark("listings:end");
    performance.measure("listings:total", "listings:start", "listings:end");
    console.table(performance.getEntriesByName("listings:total").slice(-1));
    performance.clearMarks();
    performance.clearMeasures();
  }
});

blockButton.addEventListener("click", () => {
  const start = performance.now();
  while (performance.now() - start < 180) {
    Math.sqrt(Math.random() * 1000);
  }
  status.textContent = `主线程阻塞约 ${Math.round(performance.now() - start)} ms`;
});

function mountPanel() {
  const panel = document.createElement("section");
  panel.tabIndex = 0;
  panel.innerHTML = "<h3>自行车详情</h3><p>每秒更新本地时间戳。</p>";
  panelHost.replaceChildren(panel);
  const controller = new AbortController();
  const timer = setInterval(() => {
    panel.dataset.updatedAt = String(Date.now());
  }, 1000);
  panel.addEventListener("click", () => {
    console.info("面板点击", panel.dataset.updatedAt);
  }, { signal: controller.signal });
  return {
    panel,
    cleanup() {
      controller.abort();
      clearInterval(timer);
      panel.remove();
    },
  };
}

openButton.addEventListener("click", () => {
  currentPanel?.cleanup();
  currentPanel = mountPanel();
  currentPanel.panel.focus();
});

closeButton.addEventListener("click", () => {
  if (!currentPanel) return;
  if (leakInput.checked) {
    currentPanel.panel.remove();
    leakedCleanups.push(currentPanel.cleanup);
  } else {
    currentPanel.cleanup();
  }
  currentPanel = undefined;
});

clearLeaksButton.addEventListener("click", () => {
  for (const cleanup of leakedCleanups.splice(0)) cleanup();
  status.textContent = "已清理本实验故意保留的 timer/listener";
});

window.addEventListener("pagehide", () => {
  currentPanel?.cleanup();
  currentPanel = undefined;
  for (const cleanup of leakedCleanups.splice(0)) cleanup();
});

function unusedFormattingExperiment(value) {
  return `未执行实验：${value}`;
}
void unusedFormattingExperiment;
```

运行：

```bash
cd browser-lab
node server.mjs ./public
```

按下面固定场景采集：

1. Network 清空记录，加载 `delay=600`，查看 Timing 与 `Server-Timing`；再勾选 503。
2. Performance 录制“加载 → 长任务 → 停止”，定位 180 ms 调用栈与列表 DOM 提交。
3. Rendering 打开 Paint flashing，重新加载列表，观察重绘范围。
4. Memory 在“故意跳过清理”下开关面板 20 次，GC 后快照搜索相关节点与 timer；清理后复验。
5. Application 查看 `diagnostic-run-count`，确认没有未知 Service Worker/Cache。
6. Coverage 开始记录并执行完整场景，找到未执行函数；不要立即删除。
7. Elements > Accessibility 检查按钮名称、status live region 与标题结构。

## 7. 邻里集市集成案例

团队诊断模板：

```text
标题：商品列表加载后输入卡顿
环境：构建 SHA、Chromium 版本、设备、视口、网络、数据量
动作：硬导航 → 点击加载 → 输入固定三个字符
现象：输入反馈延迟约 ...
Network：请求状态、TTFB、下载、Initiator、请求 ID
Performance：交互、最长任务、调用栈、layout/paint
Memory/Application：保留路径、缓存/SW/存储状态
假设：一条可证伪原因
修改：对应原因的最小改动
复验：同环境重复次数与结果范围
边界：未覆盖的真实设备、浏览器和用户数据
```

导出证据前删除 Cookie、Authorization、查询 Token、私人响应、用户 ID 和本地文件路径。必要时用最小公开数据重新复现，而不是分享生产 HAR。

离线问题先在 Application/Network 确认响应来源；性能问题不能通过清空所有数据“修好”后就结束，因为那没有解释根因。面板清理属于生命周期正确性，优化后还要回归按钮、键盘焦点和错误状态。

## 8. 常见错误与排查路径

### 错误示例：只看总耗时就归因后端

```js
const start = performance.now();
await fetch("/api/v1/listings").then((response) => response.json());
renderListings(items);
console.log(performance.now() - start); // 混合网络、解析与渲染。
```

### 错误示例：内存涨一次就宣布泄漏

```js
console.log(performance.memory?.usedJSHeapSize);
// 单点值受 GC、JIT、缓存和实现影响，不能证明保留路径。
```

### 诊断记录

| 字段 | 记录 |
| --- | --- |
| 现象 | 勾选跳过清理并重复开关面板后，定时活动持续，快照中旧面板增加 |
| 证据 | Allocation/Heap retainers 指向 timer 回调闭包；清理前每秒仍改旧 panel.dataset |
| 原因 | 关闭时只移除 DOM，没有 abort listener 与 clearInterval |
| 修复 | mount 返回幂等 cleanup，关闭和 pagehide 都调用；故障实验资源单独可清理 |
| 复验 | 同样 20 轮后，GC 快照不再线性增加，关闭后无持续 timer 活动 |

排查顺序始终从用户现象和固定动作开始，再选择面板；不要先抓一切证据后寻找故事。

## 9. 课后题

1. **TTFB 长能否直接证明数据库慢？**
   答：不能，它包含客户端到首字节链路；还需服务端分段时序、日志和查询证据。
2. **长任务阈值以下是否一定流畅？**
   答：不一定，连续小任务也会挤压渲染和输入机会。
3. **Heap 使用量下降是否证明无泄漏？**
   答：不证明；要看固定动作后对象是否仍被不必要引用以及趋势。
4. **Coverage 显示红色的代码能否删除？**
   答：不能直接删除，当前场景可能没覆盖其他路由、权限或错误路径。
5. **Accessibility tree 正确是否等于真实屏幕阅读器通过？**
   答：不等于，还需键盘和目标辅助技术验证。

## 10. 实践练习

### 基础：拆分请求和渲染测量

分别标记 fetch/parse 与 DOM render。

**验收答案：**两个 measure 不重叠或边界说明清楚；Network 与 Performance 能互相定位；不把本机绝对值写成预算。

### 进阶：修复列表提交

比较逐条 `append` 与 DocumentFragment 单次提交。

**验收答案：**相同 120 条、同样录制条件；结果顺序和无障碍不变；报告样本范围与 layout/paint 差异。

### 故障注入：旧 Service Worker

注册一个只属于实验的旧 Worker 让列表返回缓存响应，再从 Application/Network 定位并清理。

**验收答案：**证据包含 controller、响应来源和缓存名；只注销实验 registration，不清除其他同源数据。

## 11. 阶段验收

- [ ] 三个文件可运行，600 ms、503、180 ms 和泄漏开关均可复现；
- [ ] Network 与 Performance 能分别定位等待和主线程工作；
- [ ] Memory 结论包含重复动作、保留路径和修复后复验；
- [ ] Application、Coverage、Accessibility 各有明确检查结果与边界；
- [ ] 证据文件不含凭据、私人响应和真实用户标识；
- [ ] 前后对比使用同样场景并报告范围而非单次最佳值；
- [ ] 能说明 DevTools 开销、开发构建与未测浏览器/设备风险。

## 12. 常见问题

**应该先跑 Lighthouse 还是先录 Performance？**
已有具体交互问题时先固定场景并录对应面板。Lighthouse 可做宽泛提示，但不能替代问题调用链。

**可以在生产页面抓 Heap Snapshot 吗？**
快照可能包含敏感数据且开销高。优先在可控环境用匿名数据复现，并遵守授权与数据处理规则。

**为何保留一个未使用函数？**
它为 Coverage 提供稳定证据。红色只表示本次场景未执行，示范为何不能机械删除。

**DevTools 截图能作为唯一验收吗？**
不能。还应记录环境、动作、原始数字或调用栈和同条件复验，截图只是证据之一。

## 13. 扩展阅读

- [Chrome DevTools: Network](https://developer.chrome.com/docs/devtools/network/)
- [Chrome DevTools: Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Chrome DevTools: Memory problems](https://developer.chrome.com/docs/devtools/memory-problems/)
- [Chrome DevTools: Coverage](https://developer.chrome.com/docs/devtools/coverage/)
- [Chrome DevTools: Accessibility reference](https://developer.chrome.com/docs/devtools/accessibility/reference/)
- [MDN: Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)

资料快照日期：2026-10-11。面板名称和位置会随 Chromium 版本变化；实验未在 Safari/Firefox、真实屏幕阅读器或生产用户数据上执行。

## 我现在能做到什么

我能从固定用户动作建立跨 Network、Performance、Memory 和页面状态的证据链，区分观察、推断与结论，并在不泄露用户数据的前提下完成同条件复验。

## 单元导航

[上一章：Worker、离线与平台能力](../README.md#05-worker离线与平台能力) · [本章目录](../README.md#06-devtools-与性能诊断) · [下一课：Core Web Vitals 与预算](02-core-web-vitals-budgets-diagnosis.md)
