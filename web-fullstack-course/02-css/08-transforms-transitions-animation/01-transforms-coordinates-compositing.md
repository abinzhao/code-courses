# 变换、坐标系与合成：从参考盒推导视觉几何

## 任务卡

邻里集市商品卡需要一个轻微抬升反馈，但它不能推开相邻卡片，也不能让固定提示意外跟随卡片滚动。本课交付一个可切换变换顺序、原点和包含块的观察台，用布局矩形、视觉矩形与浏览器性能证据解释结果。

- **建议时间：**4–5 小时。
- **可见结果：**同一元素切换两种函数顺序后沿不同路径移动，周围布局占位不变。
- **验收证据：**`getBoundingClientRect()` 报告、Computed 面板截图、堆叠/包含块观察和 Performance 记录。

## 1. 任务背景

`transform` 发生在元素完成布局之后。浏览器先为商品卡分配正常流位置，再把它的绘制结果平移、旋转或缩放。因此视觉盒可以越过相邻内容，而相邻卡通常不会为它重新让位。

这一区分解决三个常见误判：

1. 看见元素移动，不等于布局坐标改变；
2. 看见 GPU 图层，不等于动画没有成本；
3. 看见 `position: fixed`，不等于它永远相对视口。

变换还可能建立堆叠上下文和定位包含块，所以它既是几何工具，也会改变后代定位与绘制边界。

## 2. 学习目标

完成后你应能：

- 区分布局盒、变换参考盒和变换后的视觉包围框；
- 解释百分比平移为何通常参考元素自身的参考盒；
- 预测 `transform-origin` 改变旋转中心后的轨迹；
- 用“依次应用坐标变换”理解函数顺序，而不是死记截图；
- 解释二维矩阵的平移、缩放、旋转和倾斜组合；
- 区分 `transform` 与独立的 `translate`、`rotate`、`scale`；
- 识别变换建立堆叠上下文和包含块的副作用；
- 评估合成层、纹理尺寸、绘制与 `will-change` 的真实成本；
- 为三维效果提供焦点、背面和减少动作边界。

## 3. 预备知识

先完成[盒模型、流与定位](../03-box-sizing-flow-position.md)和[逻辑属性、输入能力与偏好](../07-responsive-container/03-logical-properties-input-safe-area-preferences.md)。个人路径：

```text
market-learning/practice/css-08-transform/index.html
```

需要会使用 Elements 的 Computed 面板、Console 和 Performance 面板。若浏览器没有图层面板，只记录可获得的绘制与合成证据，不把工具缺失写成页面通过。

## 4. 核心理论

### 4.1 布局位置与视觉位置分离

正常流按未变换的盒参与排版。`translateX(3rem)` 改变绘制位置，但 `offsetLeft` 通常仍反映布局位置；`getBoundingClientRect()` 返回变换后的视口包围框。旋转后的包围框是能包住旋转图形的轴对齐矩形，宽高可能同时增加。

点击、命中测试通常跟随变换后的视觉区域。视觉溢出仍可能被祖先 `overflow` 裁切。变换不会自动扩大滚动或布局空间到符合设计预期，必须实测。

### 4.2 参考盒、原点与百分比

`transform-box` 选择变换参考盒。普通 HTML CSS 盒与 SVG 图形的默认参考可能不同，所以跨两类元素时不能假定完全一致。

`transform-origin` 指定变换原点，默认接近盒中心。旋转左上角铰链可写：

```css
.tag {
  transform-origin: left top;
  transform: rotate(8deg);
}
```

`translateX(50%)` 的百分比通常依据由 `transform-box` 决定的参考盒宽度，而不是父容器剩余空间。要按父容器排版，应优先使用 Grid、Flex 或定位约束。

### 4.3 函数顺序就是坐标系变化

以下两条不是同一个结果：

```css
.a { transform: translateX(5rem) rotate(30deg); }
.b { transform: rotate(30deg) translateX(5rem); }
```

变换函数组合为矩阵；每一步会改变后续操作所处的坐标关系。最可靠的学习方式是画出局部 x/y 轴，再逐项应用，而不是把函数看成互不影响的属性列表。

二维 `matrix(a, b, c, d, e, f)` 可直观理解为：

- `a`、`d` 常参与缩放；
- `b`、`c` 常参与旋转或倾斜；
- `e`、`f` 是平移分量；
- 实际组合值相互耦合，不适合徒手维护复杂界面。

开发时优先写可读的变换函数，DevTools 或计算库可用于观察合成矩阵。

### 4.4 独立变换与三维空间

`translate`、`rotate`、`scale` 可分别层叠和过渡，减少覆盖整个 `transform` 字符串的风险。它们与 `transform` 同时存在时有规范定义的应用次序，不能按声明先后猜测。

三维空间还涉及：

- 父级 `perspective` 与函数 `perspective()` 的作用范围不同；
- `transform-style: preserve-3d` 请求保留后代三维关系；
- 某些分组属性会迫使后代扁平化；
- `backface-visibility: hidden` 只隐藏绘制背面，不移除 DOM、焦点或业务状态。

翻转卡片若把可聚焦按钮留在视觉背面，会制造键盘陷阱。本课程主任务使用二维短反馈；三维只做带静态回退的实验。

### 4.5 堆叠上下文、包含块与合成

非 `none` 的变换通常建立新的堆叠上下文。后代的高 `z-index` 只能在该上下文内部比较，不能穿过外部兄弟上下文。

变换元素也可能成为 `position: absolute` 与 `position: fixed` 后代的包含块。给卡片祖先随手加 `transform: translateZ(0)`，可能让原本固定在视口的提示改为跟随祖先。

`transform` 与 `opacity` 常可在合成阶段更新，但“可合成”不等于“零成本”：

- 首次仍需样式、布局和绘制；
- 大尺寸图层需要纹理内存；
- 大量层会增加合成与上传成本；
- 阴影、滤镜、裁切和混合可能扩大绘制区域；
- `will-change` 只是提示，不保证提升，并可能提前占用资源。

用 Performance 证据决定优化，不把 `translateZ(0)` 当通用咒语。

## 5. 属性、函数与观察清单

| 名称 | 作用 | 最小用法 | 观察边界 |
| --- | --- | --- | --- |
| `transform` | 应用函数列表或矩阵 | `translateY(-2px) scale(1.02)` | 不重排相邻正常流 |
| `translate()` | 二维/三维平移 | `translate(1rem, 0)` | 百分比看变换参考盒 |
| `rotate()` | 围绕原点旋转 | `rotate(8deg)` | 改变视觉包围框 |
| `scale()` | 缩放坐标 | `scale(1.03)` | 文字和边界一起缩放 |
| `skew()` | 倾斜坐标轴 | `skewX(4deg)` | 正文易变形，谨慎使用 |
| `matrix()` | 表达二维组合矩阵 | `matrix(1,0,0,1,16,0)` | 适合观察，不利于手工维护 |
| `transform-origin` | 指定变换原点 | `left center` | 原点自身也可位于盒外 |
| `transform-box` | 指定参考盒 | `border-box` | HTML/SVG 默认需分别核对 |
| `translate` | 独立平移属性 | `0 -2px` | 与 transform 有固定组合顺序 |
| `rotate` | 独立旋转属性 | `2deg` | `none` 与零角度语义不同 |
| `scale` | 独立缩放属性 | `1.02` | 可按类型插值 |
| `perspective` | 给后代建立透视 | `600px` | 数值越小透视通常越强 |
| `transform-style` | 请求保留三维后代 | `preserve-3d` | 可能被分组属性扁平化 |
| `backface-visibility` | 控制背面绘制 | `hidden` | 不控制焦点或 DOM 可达性 |
| `will-change` | 提示未来变化 | `transform` | 临时、少量使用并实测 |

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-08-transform/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>变换坐标观察台 · 邻里集市</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #20382a;
      background: #f3f7f3;
      font: 1rem/1.65 system-ui, sans-serif;
    }
    main {
      width: min(100% - 2rem, 52rem);
      margin: 2rem auto;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: .75rem;
      margin-block: 1rem;
    }
    button {
      min-height: 2.75rem;
      padding: .55rem .85rem;
      color: inherit;
      font: inherit;
    }
    .stage {
      position: relative;
      min-height: 18rem;
      padding: 2rem;
      overflow: auto;
      border: 2px solid #66806d;
      background:
        linear-gradient(#dce7df 1px, transparent 1px),
        linear-gradient(90deg, #dce7df 1px, transparent 1px),
        #fff;
      background-size: 2rem 2rem;
    }
    .layout-slot {
      width: 12rem;
      min-height: 9rem;
      border: 2px dashed #8c5d25;
    }
    .card {
      width: 12rem;
      min-height: 9rem;
      padding: 1rem;
      border: 2px solid #326747;
      background: #e7f2e8;
      transform-origin: center;
      transform: translateX(6rem) rotate(20deg);
    }
    .stage.order-reversed .card {
      transform: rotate(20deg) translateX(6rem);
    }
    .stage.origin-corner .card {
      transform-origin: left top;
    }
    .stage.is-containing-block {
      transform: translate(0);
    }
    .fixed-note {
      position: fixed;
      inset: auto 1rem 1rem auto;
      max-width: 16rem;
      padding: .5rem;
      border: 2px solid #175ca2;
      background: #fff;
    }
    #report {
      padding: .75rem;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      background: #17251c;
      color: #edf4ee;
    }
    :focus-visible {
      outline: 3px solid #175ca2;
      outline-offset: 3px;
    }
    @media (prefers-reduced-motion: reduce) {
      .card { transform: none; }
    }
  </style>
</head>
<body>
  <main>
    <h1>变换坐标观察台</h1>
    <p>虚线是布局槽，绿色卡是变换后的绘制结果。</p>
    <div class="controls">
      <button id="order" type="button" aria-pressed="false">交换函数顺序</button>
      <button id="origin" type="button" aria-pressed="false">原点改为左上</button>
      <button id="containing" type="button" aria-pressed="false">给舞台添加变换</button>
    </div>
    <section class="stage" id="stage">
      <div class="layout-slot">
        <article class="card" id="card">
          <strong>可调节台灯</strong>
          <p>39.00 元，静态商品演示。</p>
        </article>
      </div>
      <p class="fixed-note">观察我相对视口还是变换祖先定位。</p>
    </section>
    <pre id="report" role="status" aria-label="变换与合成报告"></pre>
  </main>
  <script>
    const stage = document.querySelector("#stage");
    const card = document.querySelector("#card");
    const report = document.querySelector("#report");

    function toggle(buttonId, className) {
      const button = document.querySelector(buttonId);
      button.addEventListener("click", () => {
        const active = stage.classList.toggle(className);
        button.setAttribute("aria-pressed", String(active));
        requestAnimationFrame(renderReport);
      });
    }

    function round(value) {
      return Math.round(value * 10) / 10;
    }

    function renderReport() {
      const rect = card.getBoundingClientRect();
      const style = getComputedStyle(card);
      report.textContent = [
        `offsetLeft（布局）: ${card.offsetLeft}`,
        `视觉矩形 left/top: ${round(rect.left)} / ${round(rect.top)}`,
        `视觉矩形 width/height: ${round(rect.width)} / ${round(rect.height)}`,
        `computed transform: ${style.transform}`,
        `transform-origin: ${style.transformOrigin}`,
        `舞台是否建立变换包含块: ${stage.classList.contains("is-containing-block")}`,
        "收藏与价格均为静态演示，没有网络请求"
      ].join("\n");
    }

    toggle("#order", "order-reversed");
    toggle("#origin", "origin-corner");
    toggle("#containing", "is-containing-block");
    addEventListener("resize", renderReport);
    renderReport();
  </script>
</body>
</html>
```

### 6.2 运行与观察

```bash
cd market-learning/practice/css-08-transform
python3 -m http.server 8000
```

打开 `http://localhost:8000/`，结束时按 `Control+C`。

按顺序验证：

1. 虚线布局槽不随绿色卡视觉移动而扩大；
2. 交换函数顺序后，Computed 矩阵和视觉位置改变；
3. 原点改为左上后，旋转包围框的 `top/left` 改变；
4. 舞台获得非 `none` 变换后，fixed 提示相对它定位；
5. 开启减少动作后，核心商品、价格和报告仍可读；
6. Performance 录制三次切换，记录样式、布局、绘制和合成活动，避免先下结论。

## 7. 邻里集市集成案例

把机制用于商品卡时遵循以下边界：

- 商品网格位置由 Grid/Flex 决定，`transform` 只做不超过数像素的反馈；
- 卡片抬升不能遮挡关键邻居，容器需评估溢出和堆叠；
- 收藏结果由 `aria-pressed`、文字和内存状态表达，缩放只是装饰；
- 卡片祖先不为“开启 GPU”随意添加变换，以免改变 fixed 提示；
- 三维翻转不承载唯一价格、状态或操作入口；
- 减少动作下删除位移和缩放，保留边框、背景与文字反馈；
- 大图卡片先在低端设备录制证据，再决定是否分层；
- 页面明确写“静态/内存演示”，不把视觉反馈描述为服务器成功。

项目中预约、对象授权与并发不由 CSS 处理，继续遵守[项目契约](../../00-guide/05-project-assessment.md)。

## 8. 常见错误与排查路径

### 明确错误案例：用变换修复正常布局

```css
.card {
  transform: translateX(18rem);
}
```

这会留下原布局空位、覆盖其他卡片，并让 DOM 顺序与视觉顺序分离。应使用 Grid/Flex/正常流安排结构，仅把变换用于短暂视觉反馈。

| 记录项 | 内容 |
| --- | --- |
| 现象 | 商品卡看似移到右列，但左侧留空，缩放后覆盖下一张卡 |
| 证据 | `offsetLeft` 未变化，`getBoundingClientRect().left` 变化；Grid overlay 仍显示原网格项位置 |
| 原因 | 变换发生在布局后，没有重新参与网格轨道分配 |
| 修复 | 用 `grid-column`、自动放置或 Flex 排列卡片，移除结构性平移 |
| 复验 | 320px、200% 缩放和长标题下无覆盖；布局与视觉矩形职责一致 |

其他故障：

- 旋转方向“不对”：先确认函数顺序、书写模式、原点和 Computed 矩阵；
- fixed 提示突然跟随卡片：沿祖先查找非 `none` 的 transform/filter/perspective；
- 高 `z-index` 仍被遮挡：检查新堆叠上下文，不继续盲目增大数值；
- SVG 与 HTML 旋转中心不同：显式检查 `transform-box` 和 `transform-origin`；
- 文字放大后模糊：避免长期缩放正文，回到真实字号和布局；
- 图层数量暴涨：移除永久 `will-change` 和无证据的 `translateZ(0)`。

## 9. 课后题

**问题 1：`translateX(50%)` 为什么不表示父容器的一半？**

<details>
<summary>参考答案</summary>

变换百分比通常依据元素自己的变换参考盒。父容器空间属于布局问题，应使用 Grid、Flex、百分比尺寸或定位约束表达。

</details>

**问题 2：交换 `rotate()` 与 `translateX()` 为什么会改变结果？**

<details>
<summary>参考答案</summary>

函数会组合为矩阵，前一步改变后续操作所处的坐标关系。旋转后的局部 x 轴方向与原坐标轴不同，因此沿它平移会到达不同位置。

</details>

**问题 3：transform 动画一定比 width 动画快吗？**

<details>
<summary>参考答案</summary>

不能无条件断言。transform 常有更好的合成路径，但图层尺寸、滤镜、绘制、内存、设备和页面结构都影响成本，必须以目标页面 Performance 证据判断。

</details>

## 10. 实践练习

### 基础：原点九宫格

- **文件：**`exercise-origins.html`。
- **操作：**同一卡片分别使用左上、中心、右下原点旋转 15deg。
- **预期：**布局槽一致，视觉轨迹和包围框不同。
- **失败观察：**记录 `transform-origin` 与 rect，而不是只写“看起来偏了”。
- **完成标准：**能用原点位置解释三种结果。

### 进阶：堆叠与包含块地图

- **文件：**`exercise-containing-block.md` 和完整页面副本。
- **操作：**逐层给祖先添加/移除 transform，记录 absolute、fixed 与 z-index 结果。
- **预期：**定位参照和堆叠边界可由祖先链解释。
- **失败观察：**保存 Computed、DOM 祖先和截图。
- **完成标准：**不靠增加 z-index 试错，能定位首个相关上下文。

### 故障注入：永久提升所有卡片

- **文件：**`exercise-layer-failure.md`。
- **操作：**给所有卡片加 `will-change: transform` 与 `translateZ(0)`，录制滚动，再移除重测。
- **预期：**结果可能无收益或增加层/内存；以工具证据为准。
- **失败观察：**记录图层、绘制、内存或帧时间，若面板不可用则标未验证。
- **完成标准：**只在已证明有益的短生命周期元素保留提示。

## 11. 阶段验收

- [ ] 能区分布局槽与视觉包围框；
- [ ] 能解释百分比平移的参考盒；
- [ ] 能从坐标变化推导函数顺序；
- [ ] 能使用 origin 而不靠反复拖动猜位置；
- [ ] 能识别独立变换和 transform 的组合边界；
- [ ] 能定位变换建立的堆叠上下文与包含块；
- [ ] fixed 后代变化有可复现证据；
- [ ] 减少动作下没有必要位移；
- [ ] 性能结论来自录制，不来自属性名称。

## 12. 常见问题

**可以用 transform 改变 DOM 阅读顺序吗？**<br>
不可以。视觉移动不会改变 DOM、焦点或辅助技术顺序。结构顺序应符合任务，再用布局系统排列。

**`scale(0)` 等于隐藏元素吗？**<br>
不等于。它仍在 DOM 与布局中，也可能保持可聚焦。需要隐藏、禁用或从可访问树移除时应使用符合状态语义的方法。

**`backface-visibility: hidden` 能防止背面按钮获得焦点吗？**<br>
不能。它控制绘制，不控制焦点。交互翻面需要同步管理可见性、惯性状态和焦点路径。

**什么时候使用 `will-change`？**<br>
只有目标元素即将频繁改变、测量证明浏览器准备成本是问题时短暂使用；动作结束后可移除。不要全局永久设置。

## 13. 扩展阅读

资料核验日期：2026-10-10。

- [CSS Transforms Module Level 1](https://www.w3.org/TR/css-transforms-1/)：二维变换、参考盒和矩阵模型。
- [CSS Transforms Module Level 2](https://www.w3.org/TR/css-transforms-2/)：独立变换与三维扩展。
- [MDN：transform](https://developer.mozilla.org/en-US/docs/Web/CSS/transform)：语法、堆叠上下文与示例。
- [MDN：transform-origin](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-origin)：原点计算与观察。
- [MDN：CSS performance optimization](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS)：性能测量边界。

二维 transform 属于成熟能力；独立变换属性的旧浏览器支持、SVG 参考盒、三维扁平化、图层提升和低性能设备表现仍需按目标矩阵验证。Safari、Firefox、真实移动 GPU 和辅助技术未在本课自动验证。

## 我现在能做到什么

我能从布局盒、参考盒、原点和函数顺序解释变换结果，识别堆叠与包含块副作用，并用性能证据约束合成优化。下一课会让这些几何变化服从可中断的组件状态。

## 单元导航

- [返回第八章入口](../08-transforms-transitions-animation.md)
- [下一课：过渡、关键帧与可取消状态](02-transitions-keyframes-cancelable-state.md)
- [上一章：响应式布局与容器查询](../07-responsive-container.md)
- [返回 CSS 模块](../README.md)
