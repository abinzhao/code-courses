# 02 — Network 面板与性能分析

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L0 Web 基石
> - 先修：[01 — Elements 与 Styles 调试](./01-Elements与Styles调试.md)
> - 建议用时：90-150 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Chrome DevTools](https://developer.chrome.com/docs/devtools/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 读懂 Network 面板的请求列表，能用过滤器快速筛选目标请求
- 理解一个请求从发起到完成经历的所有阶段（DNS → TCP → TLS → Request → Response）
- 能熟练查看请求详情：Headers、Preview、Response、Timing、Cookies
- 掌握请求节流（Throttle），在慢网络条件下验证页面表现
- 能用 Performance 面板录制页面加载过程，从 Flame Chart 中定位长任务
- 理解 DCL、FCP、LCP、TTI 等关键时间指标的含义
- 会用 Lighthouse 生成一份审计报告，并读懂其中的优化建议

---

## 内容讲解

### 一、Network 面板入门

#### 1.1 打开和初始设置

```
F12 → Network 标签
```

开始之前做好三个设置：

```
☑ Preserve log      ← 页面跳转时保留所有日志，不会自动清空
☑ Disable cache     ← 开发期间禁用浏览器缓存，确保拿到最新资源
  All  ▼             ← 请求类型过滤器，默认 "All" 显示全部
```

Network 面板**只在打开后**才会记录请求。如果你在打开之前就已经加载了页面，刷新一次让它重新记录。

#### 1.2 请求列表解读

每个请求一行，核心列如下：

```
Name          Status  Type      Size      Time    Waterfall
────────────────────────────────────────────────────────────
index.html    200     document  15.2 KB   120 ms  ████░░░░
style.css     200     stylesheet 8.1 KB   45 ms   ░████░░░
app.js        200     script    156 KB    320 ms  ░░██████
data.json     200     xhr       2.3 KB    180 ms  ░░░░████
logo.png      200     png       45 KB     210 ms  ░░░█████
```

| 列名 | 含义 | 重点关注 |
|---|---|---|
| **Name** | 文件名或路径 | 点击展开详情 |
| **Status** | HTTP 状态码 | 红色（4xx/5xx）需要立即关注 |
| **Type** | 资源类型 | document、script、stylesheet、xhr/fetch、image、font、media |
| **Size** | 传输大小 | 两行：上行是实际传输大小（gzip 后），下行是原始大小 |
| **Time** | 总耗时 | 包含排队、连接、发送、等待、下载的全部时间 |
| **Waterfall** | 时间瀑布图 | 直观看到请求之间的并行/串行关系和每个阶段的耗时 |

**信息栏**（面板底部）：

```
12 requests | 287 KB transferred | 1.2 MB resources | Finish: 1.35s | DOMContentLoaded: 480ms | Load: 1.2s
```

- **requests**：请求总数
- **transferred**：实际传输量（压缩后）
- **resources**：资源原始大小
- **DOMContentLoaded**：HTML 解析完成，DOM 树构建完毕的时机
- **Load**：所有资源（含图片）加载完毕的时机

#### 1.3 过滤器

**类型过滤器（顶部按钮）**：

```
All  XHR  JS  CSS  Img  Media  Font  Doc  WS  Wasm  Manifest  Other
```

点击 `XHR` → 只看所有 API 请求（XHR 和 Fetch 都归在这一类里）。

**搜索与高级过滤**：

在 Filter 输入框中可以按多种条件筛选：

```
输入 "api"        → 过滤 URL 中包含 "api" 的请求
输入 "domain:cdn" → 只看 cdn 域名的请求
输入 "status-code:404" → 只看 404 请求
输入 "-status-code:200" → 排除所有 200 请求（只看异常）
输入 "method:POST" → 只看 POST 请求
输入 "larger-than:100K" → 只看大于 100KB 的资源
```

---

### 二、请求详情

点击请求列表中的任意一行，打开详情面板，你会看到以下标签页：

#### 2.1 Headers

最常用的标签页，分为四个区域：

```
General（通用信息）
  Request URL: https://api.example.com/users?page=1
  Request Method: GET
  Status Code: 200 OK
  Remote Address: 13.225.78.9:443

Response Headers（响应头 — 服务器返回的）
  content-type: application/json; charset=utf-8
  cache-control: max-age=3600
  content-encoding: gzip        ← 用了 gzip 压缩

Request Headers（请求头 — 浏览器发出的）
  accept: application/json
  authorization: Bearer eyJhbGci...  ← 认证令牌
  cookie: session_id=abc123

Query String Parameters（查询参数）
  page: 1
  size: 20
```

**实用技巧**：
- 点击 `view source` → 看到原始的请求/响应头文本（去掉格式化的排版）
- 选中请求头中的某个值，可以快速复制
- `content-encoding: gzip` 存在说明这个响应的传输体积是被压缩过的，比实际小很多

#### 2.2 Preview 与 Response

| 标签 | 用途 |
|---|---|
| **Preview** | 渲染后的预览。如果是 JSON，显示为可折叠的树形结构；如果是图片，显示缩略图；如果是 HTML，尝试渲染 |
| **Response** | 原始响应文本，未经格式化，适合全文搜索或复制 |

> **场景**：你在调试一个 API 返回的数据不对。打开 Network → 找到对应的 xhr 请求 → 点击 **Preview** → 快速浏览 JSON 结构 → 如果结构看起来正常但渲染出错，切到 **Response** → `Cmd+F` 搜关键字确认数据具体值。

#### 2.3 Timing

Timing 标签把一个请求的时间轴拆成了几个阶段：

```
Queueing          2.5 ms   ← 浏览器排队等待发送
Stalled           4.2 ms   ← 请求被阻塞（浏览器最多 6 个同源并发 TCP 连接）
DNS Lookup        8.1 ms   ← DNS 解析域名到 IP
Initial Connection 12.3 ms ← TCP 三次握手
SSL/TLS           15.7 ms  ← HTTPS 的安全握手（HTTP 无此阶段）
Request sent      0.3 ms   ← 把请求发出去
Waiting (TTFB)   82.6 ms   ← 首字节时间（服务器处理请求）
Content Download  5.1 ms   ← 下载响应体
─────────────────────────
Total:          130.8 ms
```

> **TTFB（Time To First Byte）是最值得关注的指标**。如果 Waiting (TTFB) 很大（>200ms），说明**服务端处理慢**；如果 Content Download 很大，说明**响应体太大或者网络带宽小**。

#### 2.4 Cookies

展示当前请求携带和设置的 Cookie：

```
Name          Value           Domain         Path    Expires     HttpOnly  Secure
session_id    abc123def456    .example.com   /       2026-10-13  ☑         ☑
```

`HttpOnly` 勾选表示 JS 无法通过 `document.cookie` 读取这个 Cookie，防止 XSS 攻击窃取。

---

### 三、请求节流（Throttling）

#### 3.1 开启节流

Network 面板顶部：

```
Online  ▼
├── Online              ← 不限制（默认）
├── Fast 3G             ← 模拟快速 3G
├── Slow 3G             ← 模拟慢速 3G（推荐用于测试）
├── Slow 4G
├── Offline             ← 模拟断网
└── Add...              ← 自定义上行/下行速度和延迟
```

选择 **Slow 3G** 后刷新页面，你会直观感受到：
- 图片懒加载的行为是否正常（先看到占位？还是大片空白？）
- 是否开启了 gzip 压缩（1MB 的 JS 在慢网络下是灾难）
- 首屏渲染是否被体积大的 JS/CSS 阻塞

> **必做实验**：把你自己的项目首页切到 Slow 3G，看需要多少秒才能交互。如果超过 5 秒，说明你有优化空间。

#### 3.2 自定义节流

点击 **Add...** → 自定义配置：

```
Profile Name: 我的 2G
Download: 50 kb/s       ← 下载速度
Upload: 20 kb/s         ← 上传速度
Latency: 300 ms         ← 网络延迟（RTT）
```

---

### 四、Performance 面板

#### 4.1 录制流程

```
打开 Performance 面板
→ 点击左上角 ● 录制按钮（或 Cmd+E）
→ 执行你想分析的操作（如刷新页面、滚动、点击按钮）
→ 点击 Stop 停止录制
→ 等待分析完成
```

#### 4.2 面板六大区域

录制完成后你会看到：

```
┌────────────────────────────────────────────────────┐
│ ① Overview（概览时间轴）                              │
│    FPS  ──┬──┬──┬──────┬──┬── （帧率曲线）           │
│    CPU   ██████████████████████ （CPU 使用类型）     │
│    NET   ████░░░░████░░░░█████ （网络请求时间线）      │
├────────────────────────────────────────────────────┤
│ ② Network（网络请求条）                                │
│    每个颜色的横条代表一个请求                            │
├────────────────────────────────────────────────────┤
│ ③ Main（主线程 Flame Chart）                          │
│    倒置的火焰图——函数调用栈                             │
│    宽度 = 耗时，越宽越值得优化                           │
├────────────────────────────────────────────────────┤
│ ④ Summary（摘要，显示在底部）                           │
│    Scripting: 45%   Rendering: 30%   Painting: 15%  │
│    Other: 10%                                       │
└────────────────────────────────────────────────────┘
```

#### 4.3 读懂 Flame Chart（火焰图）

```
┌──────────────────────────────────────────────────────┐
│  Evaluate Script  ██████████████                      │  ← 顶层任务
│    parseHTML       ██████░░░░░░                       │  ← HTML 解析
│    compileScript   ░░████████░░                       │  ← JS 编译
│    Function Call   ░░░░░░████](████████)              │  ← 函数调用
│      render         ░░░░░░░░░░░░][████         ← 这个函数很宽，耗时久！│
└──────────────────────────────────────────────────────┘
```

**关键规则**：
- X 轴 = 时间，越宽 = 耗时越长 = **需要关注**
- Y 轴 = 调用深度，上方是调用者，下方是被调用者
- **黄色长条** = 脚本执行时间长，可能是计算密集型代码
- **紫色长条** = 重排重绘（Layout / Paint）
- **红色三角标记** = 长任务（执行时间超过 50ms），阻塞用户交互

**操作方式**：
- 点击任意颜色块 → 底部 Summary 显示该函数的详细信息
- 滚轮缩放时间轴（也可以用 W/A/S/D 快捷键）
- 按 `W` 放大、`S` 缩小、`A` 左移、`D` 右移

#### 4.4 CPU 时间拆解

Summary 饼图把 CPU 时间归为四类：

| 类别 | 含义 | 优化方向 |
|---|---|---|
| **Scripting**（黄色） | JS 解析、编译、执行 | 减少首屏 JS 体积、懒加载、Web Worker |
| **Rendering**（紫色） | 样式计算和布局（Layout） | 减少 DOM 操作、避免强制同步布局 |
| **Painting**（绿色） | 绘制和合成 | 善用 `will-change`、`transform` 代替 `left/top` |
| **System**（灰色） | 浏览器内部开销 | 一般不可控 |

---

### 五、关键时间指标

| 指标 | 全称 | 含义 | 好/差标准 |
|---|---|---|---|
| **DCL** | DOMContentLoaded | HTML 解析完成，DOM 树就绪 | — |
| **FCP** | First Contentful Paint | 页面上首次渲染出任何内容（文字、图片等） | < 1.8s 好 / > 3s 差 |
| **LCP** | Largest Contentful Paint | 视口内最大可见元素（如首屏大图、大段文字）渲染完成 | < 2.5s 好 / > 4s 差 |
| **TTI** | Time to Interactive | 页面完全可交互（主线程空闲足够处理用户输入） | < 3.8s 好 / > 7.3s 差 |
| **TBT** | Total Blocking Time | FCP 到 TTI 之间，主线程被长任务（>50ms）阻塞的总时间 | < 200ms 好 / > 600ms 差 |
| **CLS** | Cumulative Layout Shift | 页面加载过程中布局偏移的累计分数 | < 0.1 好 / > 0.25 差 |

**在 Performance 面板中定位这些指标**：

录制完成后，Overview 时间轴上方会标出 **DCL**、**FCP**、**LCP** 的垂直线。点击线可以跳到对应时刻，查看是该时刻什么操作触发了这个指标。

---

### 六、Lighthouse 审计

#### 6.1 生成报告

```
打开你想要的页面
→ F12 → Lighthouse 标签
→ 选择审计类别：
    ☑ Performance（性能）
    ☑ Accessibility（无障碍）
    ☑ Best Practices（最佳实践）
    ☑ SEO（搜索引擎优化）
→ 设备选择：○ Mobile  ○ Desktop
→ 点击 "Generate report"
→ 等待 30-60 秒完成
```

#### 6.2 读懂报告

报告从五个维度打分，0-100 分：

```
Performance        92  ●●●●●●●●●○
Accessibility      85  ●●●●●●●●○○
Best Practices    100  ●●●●●●●●●●
SEO                78  ●●●●●●●○○○
```

**只看分数是不够的，要看具体建议**。向下滚动到 **Opportunities（优化机会）** 和 **Diagnostics（诊断信息）**：

```
Opportunities（能省多少时间）
  ▲ Remove unused JavaScript         Potential savings: 120 KB
  ▲ Serve images in next-gen formats  Potential savings: 45 KB
  ▲ Eliminate render-blocking resources Potential savings: 0.8s

Diagnostics（诊断问题）
  ● Avoid an excessive DOM size      968 elements
  ● Reduce JavaScript execution time 2.1s
  ● Ensure text remains visible during webfont load
```

**优先级判断**：Opportunities 中 Estimated Savings 大的优先处理，Diagnostics 中红色/橙色标记的也需要关注。

---

### 七、实战：录制首页加载过程并找出性能瓶颈

以任何一个真实网站或你自己的项目为例。

#### Step 1：录制

```
F12 → Performance 面板
→ 点击 ● 录制按钮
→ Cmd+R（刷新页面）
→ 加载完成后点击 Stop
```

#### Step 2：概览层分析

先看 Overview 区域的三条线：

```
FPS  ─────────────────[红色线表示掉帧]─────────
```
FPS 掉到 30 以下说明有卡顿。放大那段区域，看主线程在干什么。

#### Step 3：定位长任务

在 Main 行中找到 **红色三角**，这标记了超过 50ms 的长任务：

```
Main  ████████▲████████████▲████████
             ↑               ↑
          长任务 1         长任务 2
```

点击三角 → Summary 面板显示任务信息。如果某个自执行函数耗时 300ms，说明你的首屏 JS 太重了。

#### Step 4：检查网络请求时序

查看 Network 行，看资源加载是否存在串行阻塞：

```
Network  ┌─────────┬──────────┬─────┐
         │ defer.js │  app.js  │ API │  ← API 必须等 app.js 执行完才能发出
         └─────────┴──────────┴─────┘
```

如果 `app.js` 之后才发 API 请求，说明数据获取太晚了。可以考虑**提前发起请求**（如 `<link rel="prefetch">` 或在 HTML 中内联 fetch）。

#### Step 5：Lighthouse 交叉验证

```
切换到 Lighthouse 标签
→ 勾选 Performance
→ 点击 Generate report
→ 对比 Performance 录制中发现的瓶颈和 Lighthouse 建议是否一致
```

比如 Performance 中发现某个 JS 执行了 2 秒，Lighthouse 的 Opportunities 里大概率会出现 "Reduce JavaScript execution time"。

---

## 常见问题

**Q1：Network 面板中请求 Size 列显示 "(memory cache)" 或 "(disk cache)" 是什么意思？**

说明资源没有走网络，直接从浏览器缓存中加载。memory cache 是从内存读（最快），disk cache 是从硬盘读（次快）。这解释了为什么有些请求的 Time 只有 1-2ms——它们根本没出浏览器。

**Q2：为什么我录制的 Performance 数据和 Lighthouse 给的数据不一样？**

这是正常的。两者测试方式不同：Performance 面板是你手动操作时的真实表现；Lighthouse 是在受控的模拟条件下（默认模拟 Moto G4 + Slow 4G）运行的。通常 Lighthouse 给出的指标比你的本地机器更保守、更接近真实用户。

**Q3：Status 列的 "(failed)" 红色请求要怎么排查？**

可能的情况：CORS 被拦截、证书过期、域名解析失败、请求被浏览器扩展拦截。点击该请求 → 看 Headers 标签 → General 区域通常会有错误提示，如 "Provisional headers are shown" 表示请求根本没发出去。

**Q4：Network 面板中 Timing 的 Stalled 很长是什么原因？**

大多数情况是浏览器限制了同源并发数（Chrome 最多 6 个同源 TCP 连接）。如果同时有 10 个请求指向同一个域名，后面 4 个就会进入 Stalled 状态等待前面的完成。解决：域名分片（CDN）或升级 HTTP/2。

**Q5：Lighthouse 评分 100 是不是就完美了？**

不是。Lighthouse 只是一个实验室环境的审计工具，不代表真实用户的实际体验。你的页面可能在 Lighthouse 中用模拟网络得了高分，但在真实弱网环境下仍然很慢。真实用户数据要看 Chrome User Experience Report（CrUX）或 RUM（真实用户监控）。

**Q6：Performance 面板录制太卡了，有什么办法减少开销？**

在 Performance 面板的设置齿轮中：降低录制时的采样频率、关闭 "Screenshots"（截屏）和 "Memory" 选项，只保留核心的 CPU 和 Network 数据。

**Q7：如何知道某个 CSS 动画是否导致了性能问题？**

Performance 录制后，看 FPS 线是否有明显下跌。如果有，在 Overview 中框选掉帧区域，放大 Main 行看是否有紫色的 Recalculate Style / Layout 块反复出现。另外可以开启 Rendering 面板的 **Paint Flashing** 选项——每次页面发生绘制时会闪烁绿色，闪烁越频繁说明合成越少、重绘越多。

---

## 实操作业

### 基础练习：请求探险

1. 打开掘金（juejin.cn），在 Network 面板中找到：
   - 一个 Type 为 `document` 的请求，记录它的 Status、Size 和 Time
   - 一个 Type 为 `xhr/fetch` 的请求，查看它的 Request URL 和 Response（Preview 模式）
   - 一个 Type 为 `image` 的请求，对比它的 Size 上下行差异（实际传输 vs 原始大小）
2. 在 Network 面板底部信息栏找到 `DOMContentLoaded` 和 `Load` 的时间差，这个差值说明了什么？

### 进阶练习：性能审计

对你自己的项目（或任一网页）做一次完整的性能分析：

1. 在 Slow 3G 节流下加载页面，用手机秒表记录从回车到页面可滚动的时间
2. 用 Performance 面板录制加载过程，找到 **耗时最长的函数**（在 Main 行中找最宽的块）
3. 找到至少一个 **红色三角标记的长任务**（>50ms），点击它，记录它是什么操作触发的
4. 运行 Lighthouse，记录 Performance 分数和 Top 3 优化建议
5. 对比你在 Performance 中发现的瓶颈和 Lighthouse 的建议是否一致

### 挑战练习：优化闭环

1. 用 Lighthouse 审计你自己的项目，记录初始 Performance 分数
2. 根据 Opportunities 中的建议，选择一项实施优化（比如压缩图片、移除未使用的 JS、减少渲染阻塞资源）
3. 优化后再次运行 Lighthouse，记录新的分数
4. 写一段 200 字的总结：你做了什么优化、分数提升了多少、最大的感悟是什么

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L0 里程碑](../../projects/atlas/milestones/L0.md)
- 本课任务：在 Atlas 中构造与“Network 面板与性能分析”相关的可观察场景，使用 DevTools 或请求日志记录现象、时间线和结论。
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

- Network 面板是你理解"页面加载过程中发生了什么"的核心工具，**Timing 瀑布图**让每个请求的生命周期一览无余
- **过滤器**是你效率提升的关键：`larger-than:`、`status-code:`、`-status-code:` 值得记住
- 请求详情中 **Headers** 是最常用的标签页，**Preview/Response** 帮你快速判断 API 返回是否正确
- **请求节流**让你不用换设备就能模拟真实用户的网络环境，Slow 3G 是每次发布前的必测项
- Performance 面板的 **Flame Chart** 让你的性能瓶颈可视化，50ms 以上的长任务是需要重点消灭的对象
- **FCP、LCP、TTI、TBT、CLS** 是五个最重要的用户体验指标，Lighthouse 会对它们做综合评分
- Lighthouse 不只是打分，**Opportunities 和 Diagnostics** 才是最值得读的部分——它告诉你具体怎么改

<!-- course-nav:start -->
---

[上一篇：01 — Elements 与 Styles 调试](./01-Elements与Styles调试.md) · [课程地图](../../README.md) · [下一篇：03 — Sources 断点调试与 Console 进阶](./03-Sources断点调试与性能面板.md)
<!-- course-nav:end -->
