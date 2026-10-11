# WAAPI、滚动时间线与减少动作：管理对象生命周期和渐进增强

## 任务卡

邻里集市收藏按钮需要可暂停、继续、取消和重复播放的短反馈，文章页还想增加阅读进度装饰。本课交付一个 Web Animations API 控制台，并在支持滚动时间线时启用进度条；任何 API 缺失或减少动作偏好都不能阻止收藏。

- **建议时间：**5–6 小时。
- **可见结果：**收藏状态即时更新，动画对象可控制；滚动进度只在支持时出现。
- **验收证据：**普通/reduce 模式记录、连续点击 Console、功能检测报告和不支持路径截图。

## 1. 任务背景

CSS 动画适合声明式状态变化；当组件需要持有、暂停、反转、替换或取消某个具体效果时，Web Animations API（WAAPI）提供 `Animation` 对象。

滚动驱动动画又把进度来源从墙上时钟换成滚动或视图时间线。它能减少手写每帧 scroll 监听，但支持范围和组合规则比普通关键帧更新。本课采用三层能力：

```text
静态文字与状态（必需）
  → WAAPI 短反馈（检测后增强）
  → CSS 滚动时间线装饰（@supports 内增强）
```

每一层都可独立缺失，核心任务仍应完成。

## 2. 学习目标

完成后你应能：

- 用 `Element.animate()` 创建并保存 `Animation`；
- 使用 `play()`、`pause()`、`reverse()`、`cancel()` 和 `finish()`；
- 读取 `playState`、`currentTime`、`playbackRate` 和 pending 状态；
- 正确处理 `ready` 与 `finished` Promise；
- 理解取消会使当前 `finished` Promise 拒绝；
- 区分效果填充、`commitStyles()` 与基础样式所有权；
- 使用 `getAnimations()` 限定并清理组件效果；
- 区分 document、scroll 与 view timeline；
- 使用 `animation-range` 限制滚动进度区间；
- 同时提供 API 检测、CSS `@supports` 和减少动作替代。

## 3. 预备知识

先完成[过渡、关键帧与可取消状态](02-transitions-keyframes-cancelable-state.md)，理解 Promise 的 fulfilled/rejected 分支和 `matchMedia()`。个人路径：

```text
market-learning/practice/css-08-waapi/index.html
```

需要能在 Console 检查未处理拒绝，在 Animations/Performance 面板查看效果，并模拟 `prefers-reduced-motion`。

## 4. 核心理论

### 4.1 Element.animate 返回可控制对象

```js
const animation = element.animate(
  [
    { transform: "scale(1)" },
    { transform: "scale(1.05)", offset: 0.45 },
    { transform: "scale(1)" }
  ],
  { duration: 220, easing: "ease-out" }
);
```

关键帧可以是数组，也可按属性组织；options 对应 `KeyframeEffect` 的时间参数。返回的 Animation 默认关联文档时间线并立即播放。

组件应保存自己创建的对象引用，而不是每次从整页猜“哪个动画属于我”。新反馈开始前取消旧对象，可保证同一职责只有一个活动效果。

### 4.2 控制方法与状态

- `play()`：从当前或合适时间继续；
- `pause()`：冻结当前时间，不删除效果；
- `reverse()`：反转播放方向，边界行为取决于当前时间和速率；
- `cancel()`：清除开始时间和效果贡献，回到 idle；
- `finish()`：跳到与播放方向一致的结束边界，某些无限动画不能完成；
- `updatePlaybackRate()`：在保持时间连续性时更新速度。

`playState` 常见值有 idle、running、paused、finished；还要留意 pending 操作。控制按钮文字应从真实对象状态渲染，而不是只维护另一份容易漂移的布尔值。

### 4.3 Promise 生命周期与取消

`ready` 在待处理的播放/暂停任务就绪时解决；`finished` 在动画正常完成时解决。调用 `cancel()` 会拒绝当前 `finished` Promise，并在后续播放时产生新的 Promise。

因此每次创建动画后立即同时注册成功和拒绝分支：

```js
animation.finished.then(
  () => cleanup(animation, "finished"),
  error => cleanup(animation, error.name)
);
```

不要只写 `.then()`，也不要用空 catch 吞掉本应记录的非取消错误。预期的 `AbortError` 可以作为生命周期证据记录。

### 4.4 Fill、commitStyles 与清理

`fill: "forwards"` 让效果在活动区间后继续贡献值，长期堆积会让基础样式与实际呈现难以推导。

`commitStyles()` 可把当前计算效果提交到元素的行内样式，再取消效果；它不是业务持久化，也会改变样式所有权。使用前要确认：

- 目标浏览器支持；
- 行内值不会覆盖主题或响应式规则；
- 提交后确实取消旧动画；
- 清理路径能恢复基础状态。

短暂收藏反馈通常不需要 forwards 或 commit，关键帧回到基础值后直接释放对象更清晰。

`element.getAnimations()` 返回影响元素的动画，可能包括 CSS transition、CSS animation 和祖先/后代选项下的对象。过滤名称或保存引用，避免误取消页面其他效果。

### 4.5 Scroll 与 view timeline

普通文档时间线按时间推进。滚动驱动动画有两类常见进度：

- scroll progress timeline：按某滚动容器在某轴上的滚动范围推进；
- view progress timeline：按主体元素经过滚动视口的可见过程推进。

CSS 可用匿名 `scroll()`/`view()`，也可通过 `scroll-timeline-name`、`view-timeline-name` 定义命名时间线。`animation-range-start/end` 或 `animation-range` 把效果附着到时间线的一段。

关键边界：

- `animation` 简写可能重置 `animation-timeline`，后者通常写在简写之后；
- 无可滚动范围时，scroll timeline 无有效进度；
- view timeline 的 inset、轴和书写模式共同决定范围；
- 内容不能等待进度到达才变得可读；
- JS `ScrollTimeline`/`ViewTimeline` 构造器与 CSS 语法支持不必同步；
- 支持检测只能证明解析/接口存在，不能证明组合视觉正确。

### 4.6 减少动作是等价替代

`prefers-reduced-motion: reduce` 不只是把 duration 变小。对于收藏反馈，应：

- 直接更新 `aria-pressed`、文字和静态颜色；
- 不创建缩放或位移动画；
- 取消偏好切换前仍在运行的对象；
- 隐藏非必要滚动进度运动，或改为不动的文字进度；
- 保留焦点、状态和操作。

系统偏好可能在页面运行期间改变，因此 JS 用 MediaQueryList 的 change 事件同步清理。

## 5. API、属性与检测清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `Element.animate()` | 创建并播放效果 | `node.animate(frames, options)` | 缺失时状态仍要更新 |
| `Animation.play/pause()` | 控制时间推进 | `animation.pause()` | pending 状态需观察 |
| `Animation.reverse()` | 反转方向 | `animation.reverse()` | 边界和负速率需测试 |
| `Animation.cancel()` | 解除效果并回 idle | `animation.cancel()` | `finished` 会拒绝 |
| `Animation.finish()` | 跳到结束边界 | `animation.finish()` | 无限效果不可正常完成 |
| `Animation.finished` | 正常完成 Promise | `.then(ok, rejected)` | 每次重新播放可能替换 |
| `Animation.ready` | 待处理任务就绪 Promise | `await animation.ready` | 不等于视觉完成 |
| `currentTime` / `playState` | 读取当前进度/状态 | `animation.playState` | 可能为 null/pending |
| `updatePlaybackRate()` | 平滑更新速率 | `updatePlaybackRate(.5)` | 不用于业务节流 |
| `commitStyles()` | 提交当前效果样式 | `animation.commitStyles()` | 行内样式所有权风险 |
| `getAnimations()` | 查询相关动画 | `node.getAnimations()` | 过滤后再控制 |
| `animation-timeline` | 选择进度时间线 | `scroll(root block)` | 简写可重置 |
| `animation-range` | 限制附着范围 | `entry 0% cover 40%` | 依赖 timeline 支持 |
| `scroll-timeline-*` | 命名滚动时间线 | `--reading block` | 有限支持增强 |
| `view-timeline-*` | 命名视图时间线 | `--card block` | 逐浏览器复验 |
| `CSS.supports()` / `@supports` | 检测解析能力 | `(animation-timeline: scroll())` | 不证明行为完整 |

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-08-waapi/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WAAPI 与滚动进度 · 邻里集市</title>
  <style>
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: #20382a;
      background: #f3f7f3;
      font: 1rem/1.7 system-ui, sans-serif;
    }
    .reading-progress {
      display: none;
      position: fixed;
      z-index: 10;
      inset: 0 0 auto;
      height: .35rem;
      transform: scaleX(0);
      transform-origin: left;
      background: #2c7447;
    }
    @keyframes reading-progress {
      from { transform: scaleX(0); }
      to { transform: scaleX(1); }
    }
    @supports (animation-timeline: scroll()) {
      .reading-progress {
        display: block;
        animation: reading-progress linear both;
        animation-timeline: scroll(root block);
      }
    }
    main {
      width: min(100% - 2rem, 44rem);
      margin: 2rem auto;
    }
    .card {
      padding: 1rem;
      border: 2px solid #326747;
      background: #fff;
    }
    .card + .card { margin-block-start: 4rem; }
    button {
      min-height: 2.75rem;
      margin: .25rem;
      padding: .55rem .85rem;
      color: inherit;
      font: inherit;
    }
    #favorite[aria-pressed="true"] { background: #dfeee2; }
    #report {
      padding: .75rem;
      color: #edf4ee;
      background: #17251c;
      white-space: pre-wrap;
    }
    .reading-copy { min-height: 55vh; }
    :focus-visible {
      outline: 3px solid #175ca2;
      outline-offset: 3px;
    }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      .reading-progress { display: none; animation: none; }
    }
  </style>
</head>
<body>
  <div class="reading-progress" aria-hidden="true"></div>
  <main>
    <h1>可取消收藏反馈</h1>
    <article class="card">
      <h2>可调节阅读台灯</h2>
      <p>39.00 元。收藏仅保存在页面内存，没有发送请求。</p>
      <button id="favorite" type="button" aria-pressed="false">收藏台灯</button>
      <button id="pause" type="button">暂停反馈</button>
      <button id="resume" type="button">继续反馈</button>
      <button id="reverse" type="button">反向反馈</button>
      <button id="cancel" type="button">取消反馈</button>
      <p id="status" role="status">尚未收藏。</p>
      <pre id="report"></pre>
    </article>
    <section class="reading-copy" aria-labelledby="guide-title">
      <h2 id="guide-title">使用说明</h2>
      <p>向下滚动观察顶部进度装饰。若浏览器不支持滚动时间线，顶部不会出现进度条，正文仍完整。</p>
      <p>连续收藏会先取消旧反馈，再创建一个新对象。取消反馈不改变收藏状态。</p>
    </section>
    <article class="card">
      <h2>边界说明</h2>
      <p>这不是服务器收藏结果、阅读完成证明或交易进度。滚动装饰不可作为唯一导航。</p>
      <a href="#guide-title">返回使用说明</a>
    </article>
  </main>
  <script>
    const favorite = document.querySelector("#favorite");
    const status = document.querySelector("#status");
    const report = document.querySelector("#report");
    const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
    let activeAnimation = null;

    function write(extra = "") {
      const timelineSupport = typeof CSS !== "undefined" &&
        CSS.supports("animation-timeline", "scroll()");
      report.textContent = [
        `Element.animate: ${typeof favorite.animate === "function"}`,
        `CSS scroll timeline 解析: ${timelineSupport}`,
        `ScrollTimeline 构造器: ${typeof ScrollTimeline === "function"}`,
        `减少动作: ${motionPreference.matches}`,
        `当前动画: ${activeAnimation ? activeAnimation.playState : "none"}`,
        extra
      ].filter(Boolean).join("\n");
    }

    function release(animation, result) {
      if (activeAnimation === animation) activeAnimation = null;
      write(`上一反馈结果: ${result}`);
    }

    function stopActive(reason) {
      if (!activeAnimation) {
        write(`${reason}: 没有活动反馈`);
        return;
      }
      const previous = activeAnimation;
      activeAnimation = null;
      previous.cancel();
      write(`${reason}: 已请求取消，收藏状态未改变`);
    }

    function playFeedback() {
      stopActive("替换旧反馈");
      if (motionPreference.matches || typeof favorite.animate !== "function") {
        write("使用静态反馈");
        return;
      }
      const animation = favorite.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.06)", offset: .45 },
          { transform: "scale(1)" }
        ],
        { duration: 480, easing: "ease-out" }
      );
      activeAnimation = animation;
      animation.finished.then(
        () => release(animation, "正常完成"),
        error => release(animation, `被取消（${error.name}）`)
      );
      write("新反馈已创建");
    }

    favorite.addEventListener("click", () => {
      const pressed = favorite.getAttribute("aria-pressed") !== "true";
      favorite.setAttribute("aria-pressed", String(pressed));
      favorite.textContent = pressed ? "取消收藏台灯" : "收藏台灯";
      status.textContent = pressed
        ? "已收藏（仅内存）。"
        : "已取消收藏（仅内存）。";
      playFeedback();
    });

    document.querySelector("#pause").addEventListener("click", () => {
      if (activeAnimation) activeAnimation.pause();
      write("请求暂停");
    });
    document.querySelector("#resume").addEventListener("click", () => {
      if (activeAnimation) activeAnimation.play();
      write("请求继续");
    });
    document.querySelector("#reverse").addEventListener("click", () => {
      if (activeAnimation) activeAnimation.reverse();
      write("请求反向");
    });
    document.querySelector("#cancel").addEventListener("click", () => {
      stopActive("用户取消装饰");
    });

    function preferenceChanged() {
      if (motionPreference.matches) stopActive("进入减少动作模式");
      write("偏好已变化");
    }
    if (typeof motionPreference.addEventListener === "function") {
      motionPreference.addEventListener("change", preferenceChanged);
    } else {
      motionPreference.addListener(preferenceChanged);
    }
    write();
  </script>
</body>
</html>
```

### 6.2 运行与观察

```bash
cd market-learning/practice/css-08-waapi
python3 -m http.server 8000
```

打开 `http://localhost:8000/`，结束时按 `Control+C`。

验证：

1. 点击收藏后，文字和 `aria-pressed` 先改变；
2. 暂停、继续、反向、取消只控制当前装饰；
3. 快速点击二十次，Console 没有未处理 Promise rejection；
4. 在运行中切换 reduce，活动对象被取消且静态状态保留；
5. 支持滚动时间线时顶部条随根滚动推进，不支持时没有空白或报错；
6. 禁用 JavaScript 后，正文和边界说明仍可读；按钮没有伪造成功行为。

## 7. 邻里集市集成案例

集成到商品详情页时：

- 组件只保存自己创建的 `Animation` 引用；
- 新反馈开始前取消旧反馈，并注册 rejected 分支；
- 收藏状态与按钮文字在动画之前同步更新；
- API 不存在、对象创建失败或 reduce 模式均退回静态背景；
- 页面隐藏时可按产品需要暂停长动作，恢复时重新检查资源；
- 组件卸载时取消所属动画和 MediaQueryList 监听；
- 阅读进度是 `aria-hidden` 装饰，不表示用户理解或完成；
- 滚动时间线不控制正文显示、按钮可用性或交易状态；
- 兼容判断记录 CSS 和 JS 两套能力，不用用户代理字符串猜浏览器。

真正的收藏接口还需要认证、对象授权、失败恢复和并发策略，本课没有发送网络请求。

## 8. 常见错误与排查路径

### 明确错误案例：取消后不处理 finished

```js
const animation = button.animate(frames, options);
animation.finished.then(() => {
  status.textContent = "收藏成功";
});
animation.cancel();
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | 快速点击后 Console 出现未处理 Promise rejection，状态文案也与收藏意图混在一起 |
| 证据 | rejected reason 常为 `AbortError`；Network 没有任何收藏请求 |
| 原因 | `cancel()` 拒绝 finished，且代码把动画完成错误地当作业务成功 |
| 修复 | 状态先同步更新；finished 同时处理成功/拒绝，只清理动画引用和记录诊断 |
| 复验 | 连续点击、手动取消、reduce 切换和组件移除均无未处理拒绝 |

其他故障：

- pause 按钮无效：对象已 finished/idle，先读取 `playState`；
- 取消错了页面其他动画：不要无过滤地取消 `document.getAnimations()`；
- forwards 效果长期覆盖主题：删除持久 fill，回到基础状态所有权；
- commit 后响应式失效：行内样式压过规则，明确清理或不用 commit；
- 滚动条不动：确认存在滚动范围、轴正确、简写未重置 timeline；
- `CSS.supports` 为 true 但组合失败：加真实滚动复验，不升级为“完整支持”。

## 9. 课后题

**问题 1：`ready` 与 `finished` 的区别是什么？**

<details>
<summary>参考答案</summary>

ready 对应待处理播放/暂停操作进入可执行状态；finished 对应当前播放方向正常到达结束边界。二者都不是业务保存成功。

</details>

**问题 2：为什么每次创建动画都要处理 rejected 分支？**

<details>
<summary>参考答案</summary>

取消会拒绝当前 finished Promise，而频繁交互中取消是正常路径。显式处理可区分预期 AbortError 与真正异常，避免未处理拒绝。

</details>

**问题 3：`@supports` 通过能否证明滚动动画可上线？**

<details>
<summary>参考答案</summary>

不能。它主要证明声明能被解析；时间线查找、滚动范围、animation 简写、range、书写模式和浏览器缺陷仍需运行验证。

</details>

## 10. 实践练习

### 基础：速度控制

- **文件：**`exercise-playback-rate.html`。
- **操作：**增加 0.5x、1x、2x 按钮，调用 `updatePlaybackRate()`。
- **预期：**当前效果时间连续，状态文字不变化。
- **失败观察：**记录 currentTime、playState 和 playbackRate。
- **完成标准：**无活动对象时按钮给出可见说明，不抛错。

### 进阶：视图时间线卡片

- **文件：**`exercise-view-timeline.html`。
- **操作：**在 `@supports` 内让装饰边框随卡片进入视口变化。
- **预期：**不支持时保留完整静态边框和内容。
- **失败观察：**检查滚动容器、轴、range、Computed timeline。
- **完成标准：**正文不因时间线缺失而隐藏，reduce 下关闭运动。

### 故障注入：动画对象泄漏

- **文件：**`exercise-animation-leak.md`。
- **操作：**故意每次点击把对象 push 到数组且不清理，再用 `getAnimations()` 和内存工具观察。
- **预期：**对象引用持续增长；修复后只保留当前对象。
- **失败观察：**记录数组长度、活动动画数量和 Heap 证据。
- **完成标准：**完成、取消和卸载路径都释放组件引用。

## 11. 阶段验收

- [ ] Element.animate 缺失时核心状态仍工作；
- [ ] 每个 Animation 有明确所有者和清理路径；
- [ ] finished 的 fulfilled/rejected 均处理；
- [ ] cancel 不回滚业务状态；
- [ ] pause、play、reverse 的无对象路径安全；
- [ ] reduce 偏好运行时变化会停止非必要动作；
- [ ] 滚动时间线位于 `@supports` 增强层；
- [ ] animation 简写不会意外重置 timeline；
- [ ] 阅读进度不承担语义或交易职责；
- [ ] 兼容结论区分解析、接口和真实行为。

## 12. 常见问题

**应该优先用 CSS animation 还是 WAAPI？**<br>
简单状态与固定序列优先 CSS；需要对象级暂停、替换、反向、时序编排或动态关键帧时考虑 WAAPI。选择由控制需求决定，不由“更现代”决定。

**可以直接设置 `animation.currentTime` 做滚动动画吗？**<br>
可以构建自定义同步，但需要处理节流、滚动范围、恢复和性能。原生滚动时间线支持时更声明式；无论哪种都应是增强。

**`commitStyles()` 能保存收藏按钮最终状态吗？**<br>
不能保存业务，只把当前效果的计算值写成行内呈现。收藏仍需 DOM/应用状态，持久化还需服务端接口。

**减少动作下能保留淡入吗？**<br>
是否保留取决于动作必要性和用户研究。默认应移除明显位移、缩放、视差与长平滑滚动，保留即时文字、边框或颜色结果；不要假设所有透明度变化都安全。

## 13. 扩展阅读

资料核验日期：2026-10-10。

- [Web Animations Level 1](https://www.w3.org/TR/web-animations-1/)：时间模型、Animation 与 KeyframeEffect。
- [MDN：Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)：接口与示例。
- [MDN：Animation.finished](https://developer.mozilla.org/en-US/docs/Web/API/Animation/finished)：Promise 替换和取消边界。
- [Scroll-driven Animations Level 1](https://www.w3.org/TR/scroll-animations-1/)：scroll/view timeline 和范围模型。
- [MDN：CSS scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations)：属性、时间线与兼容信息。
- [MDN：prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)：用户偏好和替代路径。

WAAPI 核心在现代浏览器中较成熟；`commitStyles()` 细节、CSS scroll/view timeline、`animation-range`、命名时间线作用域及 JS `ScrollTimeline`/`ViewTimeline` 构造器需分别核对。课程快照中滚动驱动动画仍按有限支持增强处理，不声称 Firefox 稳定线与 Safari/Chromium 所有组合一致。真实 Safari、Firefox、移动设备和辅助技术未自动验证。

## 我现在能做到什么

我能管理 WAAPI 对象及其 Promise 生命周期，把滚动时间线限制为可检测增强，并在减少动作或 API 缺失时交付等价静态状态。下一章会把这些行为放进有主题、层与系统模式契约的组件。

## 单元导航

- [上一课：过渡、关键帧与可取消状态](02-transitions-keyframes-cancelable-state.md)
- [返回第八章目录](../README.md#第八章变换过渡与可取消动画)
- [下一章：现代 CSS 组件](../09-components-modern-css/01-custom-properties-property-themes.md)
- [返回 CSS 模块](../README.md)
