# 过渡、关键帧与可取消状态：让动作服从组件状态机

## 任务卡

邻里集市卡片要在“可预约”和“已预约”之间平滑切换，并在重复操作时给出一次短反馈。业务状态必须立即确定，过渡或关键帧被取消时也不能丢失。本课交付一个能记录 transition/animation 生命周期并单独取消装饰动作的状态实验。

- **建议时间：**5–6 小时。
- **可见结果：**状态可快速往返，反馈可重播和取消，文字与 `data-state` 始终一致。
- **验收证据：**事件日志、减少动作录屏、快速点击记录和取消后状态截图。

## 1. 任务背景

CSS transition 描述“旧计算值到新计算值”的变化，keyframes 描述一段命名时间序列。二者都属于呈现系统，不知道商品是否真的已预约，也无法替代网络事务。

可靠组件需要先定义状态机：

```text
available ⇄ reserved
```

点击操作同步完成合法状态迁移，再让 CSS 根据 `data-state` 和临时反馈类绘制过程。若动作被中断，状态机仍停在最近一次明确状态；取消装饰不等于撤销业务。

## 2. 学习目标

完成后你应能：

- 写出明确的 transition 属性、时长、缓动和延迟列表；
- 解释多列表长度不同时的重复匹配规则；
- 区分可插值属性、离散属性和不可动画上下文；
- 理解 `transitionrun/start/end/cancel` 的触发边界；
- 用 `@keyframes` 定义端点、中间帧和每段缓动；
- 区分 `animation-fill-mode` 的呈现效果与真实状态；
- 正确使用迭代、方向、播放状态和负延迟；
- 处理重复触发、中断、元素移除和减少动作；
- 避免 `transition: all` 与动画简写的意外重置；
- 把动作事件用于观测，而不是业务提交。

## 3. 预备知识

先完成[变换、坐标系与合成](01-transforms-coordinates-compositing.md)，并理解 `data-*`、`aria-pressed` 和 DOM 事件。个人路径：

```text
market-learning/practice/css-08-state/index.html
```

需要能在 DevTools Elements 中观察类名和 Computed transition/animation，并在 Rendering 中模拟减少动作。

## 4. 核心理论

### 4.1 Transition 连接两组计算值

transition 不会自己创造状态变化。伪类、属性、类名或脚本先让属性获得新计算值，浏览器再尝试插值。

```css
.card {
  transition:
    background-color 180ms ease-out,
    transform 140ms ease-out;
}
.card[data-state="reserved"] {
  background-color: #dce8df;
  transform: translateY(-2px);
}
```

四类长属性分别是：

- `transition-property`：参与变化的属性；
- `transition-duration`：每个属性的持续时间；
- `transition-timing-function`：输入时间到输出进度的映射；
- `transition-delay`：等待时间，负值表示从过程中的某一时刻开始。

逗号列表长度不同时，较短列表会按规范重复匹配。为了审查清晰，关键组件优先让每一项在简写里自包含。`transition: all` 会把未来新增的颜色、尺寸、阴影甚至调试属性纳入动作，范围不可预测。

### 4.2 插值、离散切换与事件

数值、颜色、长度和兼容的变换列表通常可插值；`display` 等传统上离散切换。不同值类型若无法转换，也可能退化为离散变化。

较新的 `transition-behavior: allow-discrete` 与 `@starting-style` 能增强部分进入/退出场景，但支持和具体属性组合需单独核对。必要内容仍应在没有这些能力时立即出现或消失。

生命周期事件可用于记录：

- `transitionrun`：transition 被创建；
- `transitionstart`：延迟结束并开始；
- `transitionend`：正常到达末端；
- `transitioncancel`：被反向、移除或其他变化取消。

时长为零、元素被移除、属性不再参与或浏览器合并变化时，不能假定一定收到 `end`。因此业务成功不能挂在 `transitionend` 上。

### 4.3 缓动表达速度，不表达状态

`linear` 等速；`ease-out` 常用于快速响应后减速；`steps()` 产生离散阶段；`cubic-bezier()` 自定义曲线。贝塞尔两个 x 控制点必须落在允许范围，y 可超出 0–1 形成回弹，但过度位移可能引发不适。

`linear()` 可表达多段线性进度，属于比经典关键字更新的语法。将它视为增强，基础反馈仍提供成熟缓动。

### 4.4 Keyframes 描述时间序列

`@keyframes` 使用 `from`/`to` 或百分比选择器：

```css
@keyframes confirm {
  0% { scale: 1; }
  45% { scale: 1.04; }
  100% { scale: 1; }
}
```

未写出的端点可能从基础样式取得值。关键帧之间的 easing 可在关键帧规则或 animation 配置中影响分段。重复百分比规则会按规则合并，而不是简单保留最后一个完整块。

animation 由名称、时长、缓动、延迟、迭代次数、方向、填充模式、播放状态和组合方式控制。简写会重置未写出的长属性；涉及 `animation-timeline` 时尤其要注意书写顺序。

### 4.5 Fill、direction 与真实状态

`animation-fill-mode: forwards` 让动画结束后继续贡献末帧呈现，但不会：

- 修改元素的 class、attribute 或行内 style；
- 保存内存或服务器状态；
- 保证下一次动画从业务期望值开始。

`backwards` 在正延迟期间应用首个相关关键帧，`both` 合并前后填充。`direction` 可为 normal、reverse、alternate、alternate-reverse；迭代次数可为小数或 infinite。无限动作必须有暂停路径，并避免持续吸引注意。

### 4.6 重播、中断和状态所有权

重复添加已经存在的类不会产生新的样式变化，动画不一定重播。可选择：

- 交替两个等价 keyframe 名；
- 创建新元素或使用 WAAPI 新 Animation；
- 在明确生命周期中先移除类、下一帧再添加；
- 不为装饰重播而强制同步读取布局。

快速反向 transition 会从当前呈现值向新值继续，而不是瞬移回原端点。CSS 负责视觉连续，组件状态机负责最终 `data-state`。

减少动作模式可移除 animation 和 transform transition，仅保留即时颜色、边框、文字或图标变化。不要把全部时长改为 `0.001ms` 后仍保留大量位移。

## 5. 属性、规则与事件清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `transition` | 四类过渡值简写 | `color 160ms ease` | 省略项会重置 |
| `transition-property` | 选择变化属性 | `background-color, transform` | 避免 `all` |
| `transition-duration` | 设置持续时间 | `160ms` | 0 时不要等 end |
| `transition-delay` | 设置延迟 | `-40ms` | 负值从中途开始 |
| `transition-timing-function` | 映射时间进度 | `ease-out` | 不改变业务结果 |
| `transition-behavior` | 允许部分离散过渡 | `allow-discrete` | 新能力，逐项验证 |
| `@starting-style` | 定义进入起始样式 | `@starting-style { ... }` | 回退必须立即可见 |
| `@keyframes` | 定义命名时间序列 | `@keyframes pulse` | 名称不等于状态 |
| `animation` | 动画长属性简写 | `pulse 220ms ease-out` | 可能重置 timeline |
| `animation-direction` | 设置播放方向 | `alternate` | 与迭代共同解释 |
| `animation-fill-mode` | 控制前后呈现影响 | `both` | 不写入 DOM 状态 |
| `animation-play-state` | 暂停或播放 | `paused` | 移除动画不是暂停 |
| `animation-composition` | 控制效果组合 | `add` | 属性及兼容边界需验证 |
| transition/animation 事件 | 观察生命周期 | `animationcancel` | 不作成功事务 |

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-08-state/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>可取消状态反馈 · 邻里集市</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #20382a;
      background: #f3f7f3;
      font: 1rem/1.65 system-ui, sans-serif;
    }
    main {
      width: min(100% - 2rem, 44rem);
      margin: 2rem auto;
    }
    button {
      min-height: 2.75rem;
      padding: .55rem .85rem;
      color: inherit;
      font: inherit;
    }
    .controls { display: flex; flex-wrap: wrap; gap: .75rem; }
    .card {
      margin-block: 1rem;
      padding: 1rem;
      border: 3px solid #326747;
      background: #fff;
      transition:
        background-color 240ms ease-out,
        border-color 240ms ease-out,
        transform 180ms ease-out;
    }
    .card[data-state="reserved"] {
      border-color: #8c5d25;
      background-color: #fff3df;
      transform: translateY(-2px);
    }
    @keyframes confirm-a {
      0% { scale: 1; }
      45% { scale: 1.04; }
      100% { scale: 1; }
    }
    @keyframes confirm-b {
      0% { scale: 1; }
      45% { scale: 1.04; }
      100% { scale: 1; }
    }
    .card.feedback-a { animation: confirm-a 260ms ease-out 1; }
    .card.feedback-b { animation: confirm-b 260ms ease-out 1; }
    #log {
      min-height: 10rem;
      max-height: 18rem;
      padding: .75rem;
      overflow: auto;
      color: #edf4ee;
      background: #17251c;
      white-space: pre-wrap;
    }
    :focus-visible {
      outline: 3px solid #175ca2;
      outline-offset: 3px;
    }
    @media (prefers-reduced-motion: reduce) {
      .card {
        transition: background-color 0s, border-color 0s;
        transform: none;
        animation: none !important;
      }
    }
  </style>
</head>
<body>
  <main>
    <h1>预约状态反馈</h1>
    <article class="card" id="card" data-state="available">
      <h2>可调节阅读台灯</h2>
      <p>39.00 元。状态只保存在本页面内存，没有发送请求。</p>
      <p id="status" role="status">当前状态：可预约。</p>
    </article>
    <div class="controls">
      <button id="toggle" type="button">切换预约状态</button>
      <button id="feedback" type="button">重播短反馈</button>
      <button id="cancel" type="button">取消装饰动作</button>
      <button id="clear" type="button">清空日志</button>
    </div>
    <h2 id="log-title">动作事件日志</h2>
    <pre id="log" role="region" aria-labelledby="log-title" tabindex="0"></pre>
  </main>
  <script>
    const card = document.querySelector("#card");
    const status = document.querySelector("#status");
    const log = document.querySelector("#log");
    let feedbackVariant = false;

    function write(message) {
      const line = `${performance.now().toFixed(0)}ms ${message}`;
      log.textContent = `${line}\n${log.textContent}`.slice(0, 5000);
    }

    function renderState(nextState) {
      card.dataset.state = nextState;
      const reserved = nextState === "reserved";
      status.textContent = reserved
        ? "当前状态：已预约（仅内存）。"
        : "当前状态：可预约。";
      document.querySelector("#toggle").textContent = reserved
        ? "取消预约状态"
        : "切换预约状态";
      write(`业务状态同步变为 ${nextState}`);
    }

    function playFeedback() {
      card.classList.remove("feedback-a", "feedback-b");
      feedbackVariant = !feedbackVariant;
      card.classList.add(feedbackVariant ? "feedback-a" : "feedback-b");
      write("请求一次装饰反馈");
    }

    document.querySelector("#toggle").addEventListener("click", () => {
      const next = card.dataset.state === "available" ? "reserved" : "available";
      renderState(next);
      playFeedback();
    });

    document.querySelector("#feedback").addEventListener("click", playFeedback);

    document.querySelector("#cancel").addEventListener("click", () => {
      card.classList.remove("feedback-a", "feedback-b");
      card.getAnimations().forEach(animation => {
        if (animation.animationName.startsWith("confirm-")) animation.cancel();
      });
      write(`装饰已取消；业务状态保持 ${card.dataset.state}`);
    });

    document.querySelector("#clear").addEventListener("click", () => {
      log.textContent = "";
    });

    ["transitionrun", "transitionstart", "transitionend", "transitioncancel",
     "animationstart", "animationend", "animationcancel"].forEach(type => {
      card.addEventListener(type, event => {
        const subject = event.propertyName || event.animationName;
        write(`${type}: ${subject}`);
      });
    });

    renderState("available");
  </script>
</body>
</html>
```

### 6.2 运行与观察

```bash
cd market-learning/practice/css-08-state
python3 -m http.server 8000
```

打开 `http://localhost:8000/`，结束时按 `Control+C`。

验证：

1. 快速切换十次，`data-state`、文字和按钮语义始终一致；
2. 过渡反向时可能出现 cancel/end 的不同组合，但状态不依赖它们；
3. 连续“重播短反馈”每次都会换 keyframe 名并获得新动画；
4. 点击“取消装饰动作”，卡片状态和状态文字不回滚；
5. 开启减少动作，颜色立即切换且没有缩放、位移；
6. Console 无异常；日志只作为观察证据，不作为持久化记录。

## 7. 邻里集市集成案例

正式组件采用“状态先行、动作从属”的流程：

1. 校验当前操作是否允许；
2. 同步更新内存状态、DOM 属性、可见文字与无障碍状态；
3. 启动可选 transition 或 keyframe；
4. 新输入到达时取消或反向旧动作；
5. 网络请求若在后续课程加入，由请求状态机处理成功、失败和冲突；
6. 动画事件只写诊断日志，不宣称预约成功；
7. reduce 模式移除非必要运动，状态变化仍即时；
8. 页面卸载或组件移除时不等待动画结束。

若真实预约失败，应显示服务器错误并按产品规则恢复业务状态，而不是监听 `animationcancel` 猜测失败。

## 8. 常见错误与排查路径

### 明确错误案例：动画结束后才写预约状态

```js
card.addEventListener("animationend", () => {
  card.dataset.state = "reserved";
});
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | 用户快速点击或减少动作时，界面有时永远不进入已预约 |
| 证据 | 动画被取消或根本未创建，日志没有对应 `animationend` |
| 原因 | 把不可靠的呈现生命周期当作业务状态提交点 |
| 修复 | 点击处理器先同步提交合法内存状态，随后启动可选装饰 |
| 复验 | 普通、reduce、取消、元素移除和零时长下状态结果一致 |

其他故障：

- 新增 padding 后也慢慢变化：检查是否使用 `transition: all`；
- 第二次点击没有反馈：类名未变化，选择交替名称或 WAAPI；
- `forwards` 后 Computed 看似保持但 DOM 未变：区分动画效果值与基础样式；
- `animation-timeline` 消失：检查后写的 `animation` 简写是否重置；
- transition 结束事件数量不固定：属性列表、反向、中断和零时长均会影响；
- reduce 模式仍短暂缩放：检查脚本动画和 CSS 动画两条路径。

## 9. 课后题

**问题 1：为什么不推荐组件默认写 `transition: all`？**

<details>
<summary>参考答案</summary>

它会让未来加入的任何可动画属性都参与，导致尺寸、位置、调试状态或主题切换出现意外动作，也使性能和审查边界不清晰。

</details>

**问题 2：`fill-mode: forwards` 是否把末帧写回样式？**

<details>
<summary>参考答案</summary>

不会。它让动画效果在结束后继续参与呈现，但不修改 class、attribute、行内样式或业务数据。移除动画后基础样式重新生效。

</details>

**问题 3：transition 被反向时为什么还能视觉连续？**

<details>
<summary>参考答案</summary>

浏览器可从当前呈现值向新的目标值插值；最终状态由最新计算值决定。具体时长调整和事件序列应以目标浏览器观察。

</details>

## 10. 实践练习

### 基础：多属性列表

- **文件：**`exercise-transition-list.html`。
- **操作：**为边框色、背景色和 transform 分别设置时长并记录事件。
- **预期：**每个参与属性有可解释的 run/start/end 序列。
- **失败观察：**保存 Computed 列表和事件日志。
- **完成标准：**不使用 `all`，能说明列表匹配关系。

### 进阶：暂停的教学指示器

- **文件：**`exercise-pause.html`。
- **操作：**为非业务装饰增加开始、暂停、继续和停止按钮。
- **预期：**`animation-play-state` 暂停时间，停止移除效果；核心操作不受影响。
- **失败观察：**记录 paused 与移除类后的差异。
- **完成标准：**无限动画有明确暂停入口，reduce 下默认静止。

### 故障注入：等待结束再提交

- **文件：**`exercise-event-failure.md`。
- **操作：**临时采用错误片段，再分别取消、设 0ms、开启 reduce、移除节点。
- **预期：**至少一个路径收不到预期 end，状态失配可复现。
- **失败观察：**保存事件日志、DOM 状态和可见文字。
- **完成标准：**恢复状态先行架构，所有路径结果一致。

## 11. 阶段验收

- [ ] transition 只列必要属性；
- [ ] 能解释 duration、delay 和 easing；
- [ ] 能区分插值与离散切换；
- [ ] 生命周期事件只用于观察；
- [ ] keyframes 的端点和中间帧可推导；
- [ ] fill、direction、iteration 不冒充业务状态；
- [ ] 重复触发不依赖强制同步布局；
- [ ] 中断、取消和元素移除后状态一致；
- [ ] reduce 模式提供静态等价反馈；
- [ ] 新离散过渡语法有回退和兼容标记。

## 12. 常见问题

**什么时候用 transition，什么时候用 keyframes？**<br>
两个明确状态之间通常用 transition；需要多个时间节点、重复或独立时间序列时用 keyframes。两者都不负责业务事务。

**能用负 delay 加快响应吗？**<br>
负 delay 表示动画从已过去的进度开始，不是减少总定义复杂度。应有明确视觉目的并测试事件与填充行为。

**动画类为何不能直接删除再同步添加？**<br>
浏览器可能把同一任务内的样式变化合并，看不到中间状态。可交替名称、分帧调度或使用 WAAPI；不要靠 `offsetWidth` 强制布局作为默认方案。

**`animationcancel` 能表示用户取消预约吗？**<br>
不能。它只表示动画效果被取消，可能来自样式变化、元素移除或脚本操作。业务取消必须有独立意图和状态迁移。

## 13. 扩展阅读

资料核验日期：2026-10-10。

- [CSS Transitions Level 2](https://www.w3.org/TR/css-transitions-2/)：过渡生成、事件与离散行为。
- [CSS Animations Level 1](https://www.w3.org/TR/css-animations-1/)：关键帧、列表和生命周期。
- [MDN：Using CSS transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions)：过渡语法与事件。
- [MDN：Using CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations/Using_CSS_animations)：关键帧和动画属性。
- [MDN：@starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style)：进入样式及兼容信息。
- [MDN：transition-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/transition-behavior)：离散过渡增强。

经典 transition 和 keyframes 属于成熟主线；`allow-discrete`、`@starting-style`、`linear()` 与 `animation-composition` 较新，具体属性组合、事件顺序和旧浏览器行为需按目标矩阵验证。Safari、Firefox 与辅助技术未在本课自动验证。

## 我现在能做到什么

我能把状态迁移与呈现动作分开，设计明确的 transition 与 keyframes，并让快速输入、取消和减少动作都不破坏组件结果。下一课会用 WAAPI 管理动画对象，并把滚动时间线限制在渐进增强层。

## 单元导航

- [上一课：变换、坐标系与合成](01-transforms-coordinates-compositing.md)
- [返回第八章目录](../README.md#第八章变换过渡与可取消动画)
- [下一课：WAAPI、滚动时间线与减少动作](03-waapi-scroll-timeline-reduced-motion.md)
- [返回 CSS 模块](../README.md)
