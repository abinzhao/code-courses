# 图片加载、解码、性能与失败恢复

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 区分加载、解码和跨源状态，并通过事件、DOM 属性和 Network 证据恢复失败。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `MED-005`、`MED-006` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

区分加载、解码和跨源状态，并通过事件、DOM 属性和 Network 证据恢复失败。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 MED-005（`loading`、`decoding`、`fetchpriority`）、MED-006（图片 CORS、referrer 与解码失败）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 `loading`、`decoding`、`fetchpriority` 是三种不同提示

三个属性分别作用于不同阶段：

| 属性 | 常见值 | 主要问题 |
| --- | --- | --- |
| `loading` | `eager`、`lazy` | 是否推迟屏外图片获取 |
| `decoding` | `auto`、`async`、`sync` | 如何安排解码与呈现 |
| `fetchpriority` | `auto`、`high`、`low` | 相对获取优先级提示 |

首屏主要商品图：

```html
<img
  src="./images/lamp-1200.jpg"
  alt="米白色阅读台灯"
  width="1200"
  height="900"
  loading="eager"
  decoding="async"
  fetchpriority="high">
```

屏外相关推荐图：

```html
<img
  src="./images/chair-640.jpg"
  alt=""
  width="640"
  height="480"
  loading="lazy"
  decoding="async"
  fetchpriority="low">
```

边界如下：

- `eager` 是默认获取策略，但首屏关键图显式写出可帮助审查意图。
- `lazy` 的触发距离由浏览器决定，不等于“滚动到图片正上方才请求”。
- 首屏最大内容图通常不应懒加载，否则可能延迟关键内容出现。
- `decoding="async"` 是解码提示，不是网络异步开关，也不保证某一帧一定出现图片。
- `fetchpriority` 是优先级提示，不会绕过带宽、缓存、调度或资源失败。
- 不要给页面上几十张图片都写 `fetchpriority="high"`；如果一切都高，就没有相对优先级。
- `loading="lazy"` 与 `fetchpriority="high"` 放在同一首屏图上通常表达了冲突意图，应重新判断图片究竟是否关键。

### 4.2 `decoding` 属性与 `decode()` 方法不是一回事

`decoding` 属性告诉浏览器偏好的解码安排。`decode()` 方法返回 Promise，让脚本等待当前图片资源可解码：

```js
const nextImage = new Image();
nextImage.src = "./images/lamp-detail-1200.jpg";
nextImage.alt = "台灯底座右侧的浅色划痕";

try {
  await nextImage.decode();
  document.querySelector("#detail-view").replaceChildren(nextImage);
} catch (error) {
  console.error("图片下载或解码失败", error);
}
```

`decode()` 成功表示当前资源已经准备好解码呈现，不表示图片永久可用，也不表示业务数据有效。以下情况会拒绝 Promise：

- 请求失败。
- 图片字节损坏或格式无法解码。
- 调用后又修改了该图片的资源。

动态切图时，先等待 `decode()` 再替换可减少用户看到空白帧的机会。普通静态图片不必机械地全部调用 `decode()`。

### 4.3 `referrerpolicy` 控制来源信息，不控制跨源授权

图片请求可能携带 `Referer` 请求头。`referrerpolicy` 控制浏览器发送多少来源信息：

```html
<img
  src="https://images.example.test/lamp.jpg"
  alt="米白色阅读台灯"
  width="1200"
  height="900"
  referrerpolicy="no-referrer">
```

常见策略：

| 值 | 跨源请求中的典型效果 |
| --- | --- |
| `no-referrer` | 不发送 referrer |
| `same-origin` | 只在同源请求发送 |
| `origin` | 只发送来源 origin |
| `strict-origin-when-cross-origin` | 同源可带完整来源，安全跨源只带 origin；现代默认策略 |

`referrerpolicy` 不是隐藏用户身份的完整方案，也不会阻止目标服务器看到 IP、请求时间和其他网络信息。更不会让一个被 CORS 阻止的请求自动通过。

### 4.4 `crossorigin` 改变请求模式，权限由图片服务器响应

普通跨源图片经常可以直接显示：

```html
<img
  src="https://cdn.example.test/lamp.jpg"
  alt="米白色阅读台灯"
  width="1200"
  height="900">
```

但没有 CORS 授权时，脚本不能安全地把它画进 Canvas 后再读取像素。添加 `crossorigin` 会让浏览器按 CORS 模式请求：

```html
<img
  src="https://cdn.example.test/lamp.jpg"
  crossorigin="anonymous"
  alt="米白色阅读台灯"
  width="1200"
  height="900">
```

- `anonymous`：发送 CORS 请求，不携带用户凭据。
- `use-credentials`：发送带凭据的 CORS 请求，对服务器响应要求更严格。

服务器必须返回匹配的 `Access-Control-Allow-Origin`；带凭据时还需要正确的凭据授权响应。客户端写一个属性不能替服务器授权。

下面是明确错误的推理：

```html
<!-- 错误：若服务器没有 CORS 响应头，属性可能让原本能显示的跨源图加载失败。 -->
<img
  src="https://third-party.example/lamp.jpg"
  crossorigin="anonymous"
  alt="米白色阅读台灯">
```

动态创建图片时，要在设置 `src` 前设置 `crossOrigin`，避免先以错误模式发起请求：

```js
const image = new Image();
image.crossOrigin = "anonymous";
image.src = "https://cdn.example.test/lamp.jpg";
```

CORS 不是认证，不是图片防盗链，也不是上传能力。是否允许显示、是否允许读取像素、是否发送 Cookie、是否允许业务访问，是不同问题。

### 4.5 用一组状态判断成功，而不是只看 `complete`

图片常用观察点：

| 观察点 | 成功时 | 失败时 | 注意 |
| --- | --- | --- | --- |
| `load` 事件 | 触发 | 不触发 | 监听应尽早注册 |
| `error` 事件 | 不触发 | 触发 | 不提供 HTTP 状态细节 |
| `complete` | `true` | 终态也可能为 `true` | 不能单独判成功 |
| `naturalWidth` | 大于 `0` | 通常为 `0` | 与当前资源有关 |
| `naturalHeight` | 大于 `0` | 通常为 `0` | 与当前资源有关 |
| `currentSrc` | 选中 URL | 可能仍有 URL | 有 URL 不代表解码成功 |
| `decode()` | Promise fulfilled | Promise rejected | 失败常见 `EncodingError` |

一个实用判断是：

```js
function hasUsableImage(image) {
  return image.complete && image.naturalWidth > 0;
}
```

但事件仍然重要，因为属性快照不会告诉你状态何时变化。图片可能在脚本注册监听前已经从缓存完成，因此初始化时要同时检查 `complete`：

```js
const image = document.querySelector("#product-photo");

function report() {
  console.log({
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    currentSrc: image.currentSrc
  });
}

image.addEventListener("load", report);
image.addEventListener("error", report);

if (image.complete) {
  report();
}
```

### 4.6 图片失败至少分为请求失败和解码失败

常见故障：

1. URL 拼错或服务器返回 404。
2. 服务器返回 HTML 错误页，状态甚至可能是 200，但内容不是图片。
3. 响应是图片 MIME 类型，字节却损坏。
4. 图片格式不被当前浏览器支持。
5. 加了 `crossorigin`，服务器却没有允许当前 origin。
6. `srcset` 某个候选错误，只有特定宽度或 DPR 才失败。
7. 调用 `decode()` 后立即改 `src`，旧 Promise 被拒绝。

`error` 事件只告诉你元素失败，不直接给出 HTTP 状态。根因需要回到 Network 检查：

- Request URL 是否正确。
- Status 是否为 200、404 或其他值。
- Response `Content-Type` 是否匹配。
- 响应体是否真是图片字节。
- Console 是否有 CORS 或解码信息。
- `currentSrc` 是否指向你以为的候选。

回退必须防止无限循环：

```js
const image = document.querySelector("#product-photo");

image.addEventListener("error", () => {
  if (image.dataset.fallbackApplied === "true") {
    return;
  }

  image.dataset.fallbackApplied = "true";
  image.src = "./images/photo-unavailable.svg";
});
```

不要把原本描述商品与瑕疵的 `alt` 改成“图片失败”。`alt` 是原图不可用时的内容替代，应继续保留原图所传达的信息；加载状态由邻近状态区单独说明。

如果图片位于 `picture` 中，只改内部 `img.src` 可能仍被匹配的 `source` 覆盖。恢复时还要移除或修正失败的 `source` 候选，集成案例会演示。

## 5. 元素、属性、API 或配置清单

### 5.1 `HTMLImageElement` 观察 API

| API | 类型 | 解释 |
| --- | --- | --- |
| `src` | 可读写属性 | 解析后的绝对来源 URL |
| `currentSrc` | 只读属性 | 当前选择的候选绝对 URL |
| `complete` | 只读布尔值 | 请求是否进入完成状态，包含失败终态 |
| `naturalWidth` | 只读数字 | 固有宽度，不可用时为 `0` |
| `naturalHeight` | 只读数字 | 固有高度，不可用时为 `0` |
| `width`、`height` | 可读写数字 | 当前渲染尺寸 |
| `decode()` | Promise 方法 | 等待当前资源完成可用解码 |
| `load` | 事件 | 图片成功加载 |
| `error` | 事件 | 图片加载或解码失败 |

## 6. 最小可运行案例

### 6.1 文件位置与打开方式

创建：

```text
practice/html-images/image-state.html
```

把下面完整代码保存为 UTF-8。它只使用内联 SVG data URL，不依赖网络、图片文件或软件包，可以直接双击打开，也可以运行：

```bash
cd practice/html-images
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000/image-state.html
```

### 6.2 完整自包含案例

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>图片状态观察</title>
  <style>
    :root {
      font-family: system-ui, sans-serif;
      color-scheme: light;
    }

    body {
      max-width: 760px;
      margin: 0 auto;
      padding: 24px;
      line-height: 1.6;
      color: #17201d;
      background: #f4f1e8;
    }

    figure {
      margin: 24px 0;
      overflow: hidden;
      border: 2px solid #174d3a;
      border-radius: 16px;
      background: #dce9df;
    }

    img {
      display: block;
      width: 100%;
      height: auto;
    }

    figcaption,
    #state {
      padding: 12px 16px;
    }

    #state {
      min-height: 3em;
      border-left: 4px solid #d47c34;
      background: #fff;
      white-space: pre-wrap;
    }

    button {
      margin-right: 8px;
      padding: 10px 14px;
    }
  </style>
</head>
<body>
  <h1>图片成功、失败与恢复</h1>
  <p>图片区域在下载前已按 640:360 预留，因此状态文字不会突然下移。</p>

  <figure>
    <img
      id="demo-image"
      src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20640%20360%22%3E%3Crect%20width%3D%22640%22%20height%3D%22360%22%20fill%3D%22%23174d3a%22%2F%3E%3Ccircle%20cx%3D%22320%22%20cy%3D%22150%22%20r%3D%2280%22%20fill%3D%22%23f2b45b%22%2F%3E%3Crect%20x%3D%22290%22%20y%3D%22225%22%20width%3D%2260%22%20height%3D%2290%22%20rx%3D%2212%22%20fill%3D%22%23f8f2df%22%2F%3E%3Ctext%20x%3D%22320%22%20y%3D%22340%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2222%22%20fill%3D%22white%22%3E640%20x%20360%3C%2Ftext%3E%3C%2Fsvg%3E"
      alt="绿色背景上的黄色台灯示意图"
      width="640"
      height="360"
      decoding="async">
    <figcaption>这是信息图片，替代文本描述了示意图内容。</figcaption>
  </figure>

  <p id="state" role="status">等待图片状态……</p>

  <p>
    <button id="break-image" type="button">注入损坏字节</button>
    <button id="restore-image" type="button">恢复正确图片</button>
  </p>

  <script>
    const image = document.querySelector("#demo-image");
    const state = document.querySelector("#state");
    const goodSource = image.src;

    function snapshot(label) {
      const values = {
        event: label,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        currentSrc: image.currentSrc
      };

      state.textContent = JSON.stringify(values, null, 2);
      console.table(values);
    }

    async function inspectDecode(label) {
      try {
        await image.decode();
        snapshot(`${label}: decode fulfilled`);
      } catch (error) {
        snapshot(`${label}: decode rejected (${error.name})`);
      }
    }

    image.addEventListener("load", () => {
      inspectDecode("load");
    });

    image.addEventListener("error", () => {
      snapshot("error");
    });

    document.querySelector("#break-image").addEventListener("click", () => {
      image.src = "data:image/png;base64,AAAA";
      snapshot("刚设置损坏来源");
      inspectDecode("损坏来源");
    });

    document.querySelector("#restore-image").addEventListener("click", () => {
      image.src = goodSource;
      snapshot("刚恢复正确来源");
      inspectDecode("恢复来源");
    });

    if (image.complete) {
      inspectDecode("初始化缓存状态");
    }
  </script>
</body>
</html>
```

### 6.3 预期结果

首次打开：

- 显示绿色背景的台灯示意图。
- 图片区域在绘制前已保留 16:9 空间。
- `decode()` 成功，`naturalWidth` 为 `640`，`naturalHeight` 为 `360`。
- `complete` 为 `true`，`currentSrc` 是 data URL。

点击“注入损坏字节”：

- 图片无法解码，触发 `error`。
- `decode()` 拒绝，常见错误名为 `EncodingError`。
- 失败进入终态后，`complete` 仍可能是 `true`。
- `naturalWidth` 与 `naturalHeight` 为 `0`。
- `alt` 仍让页面保留“绿色背景上的黄色台灯示意图”这一意义。

点击“恢复正确图片”：

- 再次触发成功路径。
- 固有尺寸恢复为 640 × 360。
- 页面不需要刷新即可恢复。

### 6.4 失败证据

如果页面没有按预期工作，按顺序检查：

1. Console 是否有 JavaScript 语法错误。
2. Elements 中 `img` 的 `src` 是否被复制时断行或改写。
3. 点击损坏按钮后是否出现 `error` 快照。
4. `complete` 是否为真但 `naturalWidth` 为 0。
5. 恢复按钮是否把 `src` 改回最初 data URL。

本案例故意证明：

```text
complete === true
```

不能推出：

```text
图片成功并且可解码
```

更可靠的成功证据至少是 `complete && naturalWidth > 0`，或成功的 `load`/`decode()`。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [响应式图片选源与艺术指导](02-responsive-image-selection.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 MED-005（`loading`、`decoding`、`fetchpriority`） 对应的元素、属性或状态；
- 在项目中实现并标出与 MED-006（图片 CORS、referrer 与解码失败） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`02-responsive-image-selection.md`](02-responsive-image-selection.md)。

## 8. 常见错误与排查路径

### 8.1 错误五：首屏主图懒加载

错误：

```html
<img
  src="./images/hero.jpg"
  alt="米白色阅读台灯"
  loading="lazy"
  fetchpriority="high">
```

这同时表达“可以延后”和“优先获取”。若图片是首屏主要内容，应移除 lazy；若确实在屏外，则通常也不需要 high。属性应反映页面真实位置，而不是套用性能清单。

### 8.2 错误六：把 `complete` 当成功

错误：

```js
if (image.complete) {
  console.log("图片成功");
}
```

修复：

```js
if (image.complete && image.naturalWidth > 0) {
  console.log("图片已经可用");
} else if (image.complete) {
  console.error("图片已经结束，但没有可用固有宽度");
}
```

再结合 `load`、`error`、Network 和 `decode()` 判断根因。

### 8.3 错误七：用 `referrerpolicy` 修 CORS

错误：

```html
<img
  src="https://cdn.example.test/lamp.jpg"
  crossorigin="anonymous"
  referrerpolicy="no-referrer"
  alt="米白色阅读台灯">
```

如果服务器没有正确 `Access-Control-Allow-Origin`，隐藏 referrer 不会授予权限。CORS 由请求模式和服务器响应共同决定。

### 8.4 一份完整诊断与恢复记录

故障注入：把 `lamp-wide-800.jpg` 替换为只有四个无效字节的同名文件，服务器仍返回 200。

| 项目 | 记录 |
| --- | --- |
| 文件位置 | `practice/html-images/images/lamp-wide-800.jpg` |
| 打开方式 | `python3 -m http.server 8000`；访问 `/neighbor-market.html` |
| 预期故障 | JPEG 回退分支选中 800w 时，请求成功但解码失败 |
| 页面现象 | 主图不显示，状态区进入回退路径 |
| Network | Status 200；请求 URL 正确；传输有少量字节 |
| Console/API | `error` 触发；`complete === true`；`naturalWidth === 0`；`decode()` 拒绝 |
| 已排除 | 不是 404，不是路径错误；同源请求也不是 CORS |
| 根因 | 响应字节不是有效 JPEG，网络完成不等于解码成功 |
| 最小修复 | 恢复有效 JPEG，不改 HTML 选源规则 |
| 复测 | 禁用缓存后刷新；`naturalWidth > 0`；`decode()` 成功；回退标记不存在 |

这个记录比“图片坏了，重传一下”更有价值，因为它区分了请求层和解码层。

### 8.5 通用排查顺序

遇到破图时按以下顺序：

1. **Elements**：确认当前 `src`、`srcset`、`sizes`、`picture source`。
2. **Console**：读取 CORS、MIME、解码或脚本错误。
3. **Network**：找到实际请求 URL，而不是只看源码里的 `src`。
4. **状态**：记录 Status、Content-Type、Transferred、Initiator。
5. **DOM API**：记录 `currentSrc`、`complete`、`naturalWidth`、`naturalHeight`。
6. **解码**：调用 `decode()` 并捕获错误名。
7. **候选条件**：核对视口、DPR、媒体条件与缓存。
8. **最小修复**：只修路径、响应、候选、比例或 CORS 中的真实根因。
9. **同点复测**：清空旧 Network 记录，用同样条件重新加载。

不要通过删除 `alt`、隐藏错误、吞掉 Promise 拒绝或强制所有页面使用一张超大图来制造“看起来正常”。

## 9. 课后题

### 9.1 答题标准

- 必须区分固有尺寸、渲染尺寸和候选描述符。
- 必须说出 `alt` 由上下文职责决定，而不是由文件名决定。
- 必须把 `loading`、`decoding`、`fetchpriority` 分成不同阶段。
- 必须把 CORS 权限归到服务器响应，而不是客户端愿望。
- 必须说明“成功请求”和“成功解码”不是同一事实。

## 10. 实践练习

### 10.1 故障练习：从 200 响应定位到解码失败

文件位置：

```text
practice/html-images/decode-failure.html
```

故障注入步骤：

1. 先用有效 `valid.jpg` 建立成功基线。
2. 复制页面后，把 `src` 改为 `broken.jpg`。
3. 让 `broken.jpg` 存在，但内容不是有效图片字节。
4. 保持本地服务器返回该文件，观察请求与解码。
5. 记录 `load`、`error`、`complete`、`naturalWidth`、`currentSrc` 和 `decode()`。
6. 恢复有效文件并按相同条件复测。

必须填写：

| 项目 | 必填内容 |
| --- | --- |
| 文件位置 | HTML 与损坏图片相对路径 |
| 打开方法 | 启动命令与 URL |
| 预期故障 | 注入前的预测 |
| 请求证据 | URL、Status、Content-Type、Transferred |
| DOM 证据 | 五个状态/API 结果 |
| 根因 | 请求失败或解码失败 |
| 最小修复 | 只修真实根因 |
| 恢复结果 | 同一观察点的复测值 |

**答案标准**

- 不能因为 Status 200 就判成功。
- 不能因为 `complete` 为真就判成功。
- 应以 `naturalWidth === 0`、`error` 和被拒绝的 `decode()` 证明不可用。
- 恢复后要禁用缓存或确认新响应，不得用旧请求记录作为结果。
- 回退逻辑必须有一次性保护，不能无限修改 `src`。

## 11. 阶段验收

### 11.1 性能与安全边界验收

- [ ] 首屏主要图片没有盲目懒加载。
- [ ] 屏外图片可以 lazy，但仍提供尺寸。
- [ ] `fetchpriority="high"` 只用于少量、经证据确认的关键图。
- [ ] 没把 `decoding` 当网络加载策略。
- [ ] 没把 `referrerpolicy` 当 CORS 或认证。
- [ ] 明白 CORS 授权来自服务器响应头。
- [ ] 没有声称 HTML 提供上传、付款、保存或服务端图片转换。

### 11.2 失败恢复验收

- [ ] 同时监听或检查成功与失败状态。
- [ ] 不用 `complete` 单独判断成功。
- [ ] 记录 `currentSrc`，排查实际候选而不是只看 `src`。
- [ ] 能区分 404、CORS 与解码失败。
- [ ] 回退脚本有一次性标记。
- [ ] `picture` 回退时处理失败的 `source`/`srcset`。
- [ ] 修复后清空旧证据并在相同条件复测。

### 11.3 可执行自检

在“邻里集市”页面 Console 运行：

```js
const listing = document.querySelector(".listing");
const hero = document.querySelector("#hero-image");
const images = [...document.images];

const checks = {
  integerPriceCents:
    Number.isInteger(Number(listing.dataset.priceCents)),
  utcStoredTime:
    listing.dataset.publishedAt.endsWith("Z"),
  everyImageHasAlt:
    images.every((image) => image.hasAttribute("alt")),
  everyImageHasDimensions:
    images.every((image) =>
      Number(image.getAttribute("width")) > 0 &&
      Number(image.getAttribute("height")) > 0
    ),
  heroUsable:
    hero.complete && hero.naturalWidth > 0,
  heroHasSelectedSource:
    hero.currentSrc.length > 0,
  heroNotLazy:
    hero.loading !== "lazy"
};

console.table(checks);
console.assert(
  Object.values(checks).every(Boolean),
  "图片验收存在失败项"
);
```

如果主图故意处于回退状态，`heroUsable` 仍可为真，因为自包含说明图可以成功解码；此时还应检查：

```js
document.querySelector("#hero-image").dataset.fallbackApplied
```

该自检只证明当前 DOM 的部分事实，不证明候选文件压缩质量、真实用户性能、屏幕阅读器体验或服务器 CORS 配置全部正确。

## 12. 常见问题

### 12.1 `loading="lazy"` 越多越好吗？

不是。首屏关键图懒加载可能推迟主要内容；屏外图片通常更适合。是否受益取决于页面位置和真实加载证据。

### 12.2 `decode()` 成功是否说明网络请求是 200？

它说明当前图片已能完成解码，不是通用 HTTP 状态接口。具体请求状态仍应在 Network 或服务端日志中检查。

### 12.3 图片 `error` 事件里能直接读到 404 吗？

通常不能。元素事件不提供完整 HTTP 状态；应在 Network 查看状态、响应头和响应内容。

### 12.4 跨源图片能显示，为什么 Canvas 仍报安全错误？

显示跨源图片与脚本读取其像素是不同权限。读取像素需要 CORS 模式请求和图片服务器明确授权；Canvas 的完整规则会在后续嵌入与 Canvas 课程展开。

### 12.5 `referrerpolicy="no-referrer"` 能保护所有隐私吗？

不能。它只控制 referrer 信息，不隐藏 IP、请求时间，也不替代认证、授权、Cookie 策略或服务端访问控制。

### 12.6 为什么 data URL 案例不用于性能结论？

它适合稳定观察解码和 DOM 状态，但没有真实独立网络文件、缓存与候选体积。响应式性能结论必须用真实资源和 Network 验证。

## 13. 扩展阅读

### 13.1 状态、解码与性能

- [MDN：`HTMLImageElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement)
- [MDN：`HTMLImageElement.decode()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode)
- [MDN：Lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading)
- [MDN：Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)
- [MDN：CORS-enabled images](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [web.dev：优化 CLS](https://web.dev/articles/optimize-cls)

阅读资料时，持续追问：

1. 这是内容语义、布局提示、浏览器选择还是服务器授权？
2. 这个属性影响请求、解码还是绘制阶段？
3. 观察到的是源代码意图，还是 Network 与 DOM 的实际结果？
4. 失败后，用户是否仍能理解缺失了什么并继续操作？

## 我现在能做到什么

- 能解释并验证：区分加载、解码和跨源状态，并通过事件、DOM 属性和 Network 证据恢复失败。
- `MED-005`：`loading`、`decoding`、`fetchpriority`
- `MED-006`：图片 CORS、referrer 与解码失败
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：响应式图片选源与艺术指导](02-responsive-image-selection.md) · [下一课：音频、视频、来源与原生控件](04-media-elements-sources-controls.md) · [返回 HTML 模块](../README.md)
