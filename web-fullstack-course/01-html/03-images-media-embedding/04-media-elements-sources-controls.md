# 音频、视频、来源与原生控件

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 声明 audio、video 和 source 资源，配置原生控件与加载属性并验证回退。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `MED-007`、`MED-008` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

声明 audio、video 和 source 资源，配置原生控件与加载属性并验证回退。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 MED-007（`audio`、`video` 与媒体 `source`）、MED-008（controls、preload、autoplay、muted、poster、playsinline）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 从容器到可播放时间轴

文件扩展名只描述容器的一部分信息。一个 `.mp4` 文件内部仍可能使用浏览器不支持的编解码器。浏览器处理媒体时大致经历：

```text
解析 audio/video
  → 收集 src 或 source 候选
  → 根据 type 和自身能力筛选
  → 请求资源
  → 读取元数据
  → 解码当前播放位置附近的数据
  → 在时间轴上播放
```

因此，“请求返回 200”只证明拿到了响应，不证明内容能解码；“浏览器支持 MP4”也不证明任意 MP4 内部编码都能播放。

### 4.2 `audio` 与 `video`

`audio` 用于音频资源：

```html
<audio controls src="media/notice.wav">
  浏览器不支持 audio 元素。
</audio>
```

`video` 用于视频以及随视频同步的音频和文本轨道：

```html
<video controls width="640" height="360">
  <source src="media/inspection.webm" type="video/webm">
  <source src="media/inspection.mp4" type="video/mp4">
  浏览器不支持 video 元素。
</video>
```

两者都继承 `HTMLMediaElement` 的状态、方法和事件。`video` 另外拥有画面尺寸、`poster` 和 `playsinline` 等视频职责。

元素内部的普通文本是给不支持该媒体元素的旧用户代理使用的后备内容。现代浏览器支持 `video` 但所有来源都失败时，通常不会自动显示这段文字。资源失败的恢复入口应放在媒体元素旁边，并由 `error` 状态更新。

### 4.3 直接 `src` 与子 `source`

只有一个资源时，可以直接写 `src`：

```html
<audio controls src="tone.wav"></audio>
```

需要格式或编码回退时，省略媒体元素的 `src`，改用有顺序的 `source`：

```html
<audio controls>
  <source src="notice.ogg" type="audio/ogg">
  <source src="notice.wav" type="audio/wav">
</audio>
```

浏览器按资源选择算法处理候选。`type` 是筛选提示，可让浏览器跳过明确不支持的类型；它必须与真实响应和真实编码相符。不要为了“保险”把同一个 MP4 虚报成多个 MIME 类型。

`currentSrc` 返回最终选择资源的绝对 URL。资源选择前可能是空字符串。页面相对路径和 `currentSrc` 显示不同不是错误，因为后者通常已经解析成绝对 URL。

候选顺序表达偏好，不是质量竞赛。浏览器不会下载所有文件再挑“最好看的”。生产页面只列出真实存在、已测试且许可清楚的文件。

### 4.4 用户控制与加载属性

#### `controls`

`controls` 是布尔属性。出现时，浏览器提供播放、暂停、进度、音量等原生控件：

```html
<video controls></video>
```

`controls="false"` 仍表示属性存在，因而仍会启用控件。要关闭它，应删除属性。基础页面优先保留原生控件；自定义按钮不能替代完整的键盘、音量、字幕和全屏功能。

#### `preload`

`preload` 是加载提示：

| 值 | 意图 | 不能保证的事 |
| --- | --- | --- |
| `none` | 在用户播放前尽量不预取媒体 | 完全零请求 |
| `metadata` | 先取时长、轨道、尺寸等元数据 | 只下载固定大小 |
| `auto` | 浏览器可以积极加载 | 一定完整下载 |
| 空值 | 与 `auto` 同一状态 | 所有浏览器策略一致 |

浏览器可以考虑节流、流量节省、缓存和自动播放而覆盖提示。`autoplay` 通常会使“需要播放数据”的需求高于 `preload` 提示。

#### `autoplay` 与 `muted`

`autoplay` 请求在条件满足时自动播放。现代浏览器通常限制有声自动播放。静音媒体或没有音轨的视频更容易获准，所以装饰性循环常见：

```html
<video autoplay muted loop playsinline>
  <source src="ambient.webm" type="video/webm">
</video>
```

这仍然不是成功保证。用户偏好、节能、可见性、浏览器政策和嵌入权限都可能改变结果。邻里集市验货视频含信息，不应突然播放；默认使用 `controls`，由用户决定何时开始。

HTML `muted` 属性设置默认静音状态；脚本中的 `media.muted` 表示当前静音状态。静音不等于音量为零：`muted` 和 `volume` 是不同属性。

#### `poster`

`poster` 只属于 `video`，提供视频数据尚未显示时的代表图：

```html
<video controls poster="media/inspection-poster.jpg"></video>
```

海报图不是视频内容的文字替代，也没有 `alt` 属性。关键视觉信息仍需字幕、描述或邻近文字稿。

#### `playsinline`

`playsinline` 提示移动浏览器在元素区域内播放，而不是自动切到独立全屏播放器：

```html
<video controls playsinline></video>
```

它不代表“禁止全屏”，也不保证所有设备使用相同界面。

#### `loop`

`loop` 请求播放结束后从头继续。它适合明确的短循环，不适合让信息型视频无休止播放。启用正向循环时，不要依赖 `ended` 事件做唯一业务收尾；循环可能使媒体不进入可观察的结束状态。

## 5. 元素、属性、API 或配置清单

### 5.1 元素与属性

| 名称 | 作用 | 最小示例 | 边界 |
| --- | --- | --- | --- |
| `audio` | 嵌入音频 | `<audio controls src="tone.wav">` | 没有画面和 `poster` |
| `video` | 嵌入视频及同步轨道 | `<video controls>` | 关键画面仍需文字替代 |
| 媒体 `source` | 提供有序候选来源 | `<source src="a.webm" type="video/webm">` | 与图片 `picture` 中的 source 选择条件不同 |
| `track` | 关联 WebVTT 文本轨道 | `<track kind="captions" src="a.vtt">` | `kind` 决定用途 |
| `controls` | 显示浏览器原生控件 | `<video controls>` | 布尔属性，`"false"` 仍启用 |
| `preload` | 给出预加载提示 | `preload="metadata"` | 浏览器可以覆盖 |
| `autoplay` | 请求自动播放 | `<video autoplay>` | 受政策限制 |
| `muted` | 默认静音 | `<video muted>` | 不等于 `volume=0` |
| `poster` | 视频播放前代表图 | `poster="poster.jpg"` | 不是文字替代 |
| `playsinline` | 提示内联播放 | `<video playsinline>` | 不禁止用户全屏 |
| `loop` | 结束后循环 | `<audio loop>` | 不要依赖 `ended` 收尾 |
| `type` | 声明来源 MIME | `type="video/mp4"` | 必须匹配真实资源 |
| `srclang` | 声明文本轨道语言 | `srclang="zh-CN"` | captions/subtitles 应准确标注 |
| `label` | 播放器中可见轨道名 | `label="中文"` | 应让用户能区分 |
| `default` | 默认选择文本轨道 | `<track default>` | 同类轨道谨慎只设一个 |

## 6. 最小可运行案例

### 6.1 渐进扩展：观察来源回退

为了观察一次受控回退，临时把音频改为：

```html
<audio id="demo-audio" controls preload="metadata">
  <source src="tone-not-provided.ogg" type="audio/ogg">
  <source src="tone.wav" type="audio/wav">
  浏览器不支持 HTML audio 元素。
</audio>
```

刷新后查看：

- Network 中第一个来源可能出现 404；
- 第一个 `source` 触发自己的 `error`；
- 音频仍可通过 WAV 播放；
- `audio.currentSrc` 最终以 `/tone.wav` 结尾。

可在原脚本初始化部分追加：

```js
for (const source of audio.querySelectorAll("source")) {
  source.addEventListener("error", () => {
    console.warn("source failed", source.src, source.type);
  });
}
```

这是故意缺失文件的实验。记录证据后删除不存在的生产候选，不要把长期 404 当成正常回退策略。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [文本轨道、WebVTT 与媒体可访问性](06-media-text-tracks-webvtt.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 MED-007（`audio`、`video` 与媒体 `source`） 对应的元素、属性或状态；
- 在项目中实现并标出与 MED-008（controls、preload、autoplay、muted、poster、playsinline） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`06-media-text-tracks-webvtt.md`](06-media-text-tracks-webvtt.md)。

## 8. 常见错误与排查路径

### 8.1 `controls="false"` 仍显示控件

- **现象**：写了 `controls="false"`，控件仍存在。
- **证据**：Elements 中属性仍在。
- **原因**：`controls` 是布尔属性，存在即为真。
- **修复**：需要原生控件就写 `controls`；确实不需要时删除属性。
- **复验**：键盘用户仍有等价的自定义控制，且播放、暂停、音量、字幕和焦点均经过测试。

### 8.2 所有来源失败

按以下顺序排查：

1. **Elements**：路径、候选顺序和 `type` 是否正确。
2. **Network**：请求是否发出，状态是 200、206、404 还是其他；响应大小是否合理。
3. **Response Headers**：MIME 是否与资源匹配；跨源时 CORS 是否允许。
4. **Console**：是否有解码、CORS、VTT 或未处理 Promise 错误。
5. **运行时状态**：记录 `currentSrc`、`networkState`、`readyState`，以及 `video.error` 是 `null` 还是包含错误码。
6. **来源级错误**：分别监听每个 `source` 的 `error`。
7. **独立播放**：直接打开资源 URL，确认它不是 HTML 错误页伪装成 `.mp4`。
8. **编码验证**：换用已知受目标浏览器支持的编码重新导出媒体。

服务器支持 Range 请求常有利于跳转和按需加载。状态 206 本身不是失败，它表示返回了部分内容。真正判断还要结合请求头、响应头和播放行为。

### 8.3 用后备文本处理现代浏览器的资源失败

- **现象**：所有 `source` 404，但元素内部的“请下载视频”没有出现。
- **证据**：浏览器支持 `video` 元素，因此忽略为旧浏览器准备的普通后备内容。
- **原因**：元素后备与资源失败是不同问题。
- **修复**：在媒体元素旁放置始终可访问的文字稿或下载说明；分别监听子 `source` 的 `error`，并结合 `networkState` 更新状态。
- **复验**：即使媒体错误，页面仍有可见、可聚焦的恢复路径。

### 8.4 已填写的诊断与恢复记录

```text
故障注入：
把 media/inspection.webm 和 media/inspection.mp4 临时改名。

现象：
海报可见，但播放失败；每个子 source 都报告失败，页面显示“所有 source 候选均失败”。

Network 证据：
两个视频请求均返回 404，VTT 请求成功。

DOM/API 证据：
currentSrc 为空或没有可播放值；
networkState = 3（NETWORK_NO_SOURCE）；
两个 source 均已触发 error；
video.error 可以仍为 null，父 video 的 error 也可以不触发。

原因：
HTML 候选路径与磁盘文件名不一致，没有可用媒体来源。

修复：
恢复两个文件名；确认 source 的 type 与真实资源匹配；调用 load()。

复验：
至少一个请求返回 200 或 206；
loadedmetadata 与 canplay 出现；
currentSrc 指向成功来源；
点击播放后 play() fulfilled，并发生 playing。

未验证范围：
其他浏览器、真实屏幕阅读器、跨源 CDN 和生产转码流程。
```

恢复记录必须包含故障前后证据，不能只写“刷新后好了”。

## 9. 课后题

1. MED-007（`audio`、`video` 与媒体 `source`）解决的内容关系或浏览器行为是什么？
2. 哪个相似写法只会得到接近的外观，却不能表达相同语义？
3. 你会用哪一项开发者工具证据区分正确实现和偶然显示？
4. 本课结论中，哪些需要服务端、其他浏览器或辅助技术继续验证？

## 10. 实践练习

选择一件与教材不同的邻里商品，完成一次迁移练习：

1. 先写内容关系、机器值或交互目标，不先写标签；
2. 用 MED-007（`audio`、`video` 与媒体 `source`）、MED-008（controls、preload、autoplay、muted、poster、playsinline） 实现最小页面；
3. 制造一个本课错误并保留失败证据；
4. 修复后重复键盘或开发者工具检查；
5. 在记录中解释为什么没有选择一个视觉相似的替代写法。

## 11. 阶段验收

### 结构与资源

- [ ] 页面使用 `audio` 或 `video` 表达真实媒体，而不是插件元素；
- [ ] 多来源时使用有序 `source` 和准确 `type`；
- [ ] 能用 `currentSrc` 指出最终选择；
- [ ] `controls` 保留原生恢复路径；
- [ ] `preload` 的描述没有写成强制保证；
- [ ] `poster`、`playsinline`、`muted`、`autoplay` 和 `loop` 的适用边界解释正确。

### 项目边界

- [ ] `priceCents` 使用整数分，例如 `12900`；
- [ ] 存储时间使用带 `Z` 的 UTC ISO 8601；
- [ ] 视频、海报和 VTT 明确由学习者提供；
- [ ] 没有实现或声称文件上传、转码、服务器存储和持久化；
- [ ] 媒体不包含隐私信息，来源许可可说明；
- [ ] 教材仓库没有新增媒体、实验目录、包清单或依赖。

### 提交证据

```text
个人练习路径：
浏览器与版本：
学习者媒体来源与许可：
currentSrc：
loadedmetadata 时的 duration：
播放 Promise 结果：
字幕与文字稿检查：
来源回退记录：
媒体错误恢复记录：
键盘操作结果：
隐私检查：
未验证浏览器与辅助技术：
```

## 12. 常见问题

### Q1：加上 `muted autoplay` 就一定自动播放吗？

不一定。静音通常更容易满足政策，但浏览器、用户设置、节能、可见性和嵌入权限仍可影响结果。始终观察 `play()` Promise 和真实事件。

### Q2：为什么不移除 `controls`，只用自己的漂亮按钮？

原生控件已经处理大量键盘、音量、进度、字幕、全屏和平台差异。基础阶段保留它更可靠。自定义控件必须覆盖并测试所有等价能力。

### Q3：`muted` 和 `volume = 0` 一样吗？

听觉结果都可能是无声，但状态不同。`muted` 是明确静音开关，`volume` 是 0 到 1 的音量。界面和策略可能分别观察它们。

### Q4：`preload="none"` 能保证零流量吗？

不能。它是提示，浏览器仍可能进行必要请求。海报、VTT 或页面其他资源也有独立流量。用 Network 实测目标环境。

### Q5：为什么有 200 响应，视频仍不能播放？

响应可能是错误 HTML、MIME 不匹配、文件损坏或内部编解码器不受支持。继续检查响应正文、大小、`error.code`、Console 和媒体编码。

### Q7：音频也能使用 `track` 吗？

HTML 可以关联文本轨道，但浏览器原生界面的呈现能力可能不同。音频内容仍应提供邻近文字稿，不能把可访问性完全押在某个播放器菜单上。

### Q11：能只放 MP4 吗？

可以，前提是目标浏览器确实支持该文件内部的编码。多 `source` 是兼容策略，不是形式要求。只有一个真实、已测来源时，不要伪造第二个扩展名。

## 13. 扩展阅读

资料与链接核验日期：2026-10-10。

- [WHATWG HTML：video、audio、track 与媒体元素](https://html.spec.whatwg.org/multipage/media.html)：规范性定义，含资源选择、错误码、状态、播放、文本轨道和事件汇总；核验时 Living Standard 标注更新于 2026-09-29。
- [W3C WebVTT Editor’s Draft](https://w3c.github.io/webvtt/)：文件结构、cue、字幕、章节、API 与 `text/vtt`；核验页面版本为 2026-05-20。
- [W3C WCAG 2.2：预录字幕 1.2.2](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html)：解释 captions 必须包含理解内容所需的对白与非语言声音；核验页面更新于 2026-08-10。
- [W3C WCAG 2.2：预录音频描述或媒体替代 1.2.3](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html)：核对关键视觉信息的替代要求。
- [Chrome Developers：Autoplay policy](https://developer.chrome.com/blog/autoplay)：Chrome 的静音、有声自动播放和 `play()` Promise 建议。
- [WebKit：New video policies for iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/)：理解 WebKit 中静音、用户激活与 `playsinline` 的历史政策背景。
- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：核对整数分、UTC 时间、教学状态与服务端能力边界。

标准定义接口和状态；自动播放、原生控件、格式支持和辅助技术呈现仍需在实际目标浏览器、设备和用户设置中验证。不要用单一浏览器的一次成功替代兼容性测试。

## 我现在能做到什么

- 能解释并验证：声明 audio、video 和 source 资源，配置原生控件与加载属性并验证回退。
- `MED-007`：`audio`、`video` 与媒体 `source`
- `MED-008`：controls、preload、autoplay、muted、poster、playsinline
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：图片加载、解码、性能与失败恢复](03-image-loading-state-failures.md) · [下一课：媒体播放状态、事件与故障恢复](05-media-playback-state-events.md) · [返回 HTML 模块](../README.md)
