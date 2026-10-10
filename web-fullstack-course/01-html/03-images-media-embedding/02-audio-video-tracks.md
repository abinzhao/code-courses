# 音频、视频与文本轨道：让媒体可播放、可理解、可恢复

> 所属章节：图片、媒体与嵌入
> 建议学习时间：6–8 小时
> 阶段成果：生成一段短音频，接入商品验货视频、字幕与播放失败恢复

## 任务卡

邻里集市准备在商品详情中展示一段验货视频。只写一句“这里有视频”不能让用户检查划痕，只放一个视频文件也会留下很多问题：

- 浏览器能否解码这个容器和编解码器？
- 用户没有听见声音时，能否通过字幕理解内容？
- 看不见画面时，是否有视觉描述或完整文字稿？
- 页面能否在自动播放被拒绝、资源不存在或字幕损坏时给出恢复入口？
- 开发者如何区分“还没加载”“正在缓冲”“已经暂停”和“所有来源都失败”？

你的任务不是制作一个视频网站，而是建立一条可观察的媒体链路：

```text
学习者提供媒体
  → 浏览器选择 source
  → 读取元数据与媒体数据
  → 用户发起播放
  → play() Promise 成功或拒绝
  → 事件与状态提供诊断证据
  → track 和页面文字提供等价信息
```

**完成本课后，你将交付：**

- 一段由 Python 标准库生成的短 WAV 音频；
- 一个可播放、暂停、重新加载并显示状态的最小页面；
- 一份语法完整的 WebVTT 字幕文件；
- 一个含来源回退、字幕、翻译字幕、描述和章节的商品验货视频；
- 一次 `play()` 被拒绝后的恢复；
- 一份媒体来源失败的诊断与复验记录。

本课所有代码都写在 Markdown 中。教材仓库不新增媒体、实验目录、包清单或依赖。练习中的音频由学习者在个人练习目录生成；视频、封面和其他文本轨道也由学习者自行提供。

## 1. 任务背景

`audio` 和 `video` 是浏览器内建的时基媒体播放器。它们负责资源选择、下载、解码、时间轴、音量和原生控制条；`track` 则把带时间的信息关联到媒体。

这条链路有三个容易混淆的层次：

1. **HTML 声明**：`source`、`controls`、`preload` 和 `track` 告诉浏览器有哪些候选资源和提示。
2. **浏览器策略**：浏览器根据格式支持、网络、节能策略、用户设置和自动播放政策做决定。
3. **运行时证据**：`currentSrc`、`readyState`、`networkState`、事件和 `error` 告诉代码实际发生了什么。

属性通常不是强制命令。例如，`preload="metadata"` 是加载提示，不保证浏览器只下载固定字节；`autoplay` 是播放请求，不会越过浏览器政策；`playsinline` 是内联播放提示，也不保证每个环境具有完全相同的界面。

邻里集市当前仍是 HTML 阶段。商品价格使用整数分，存储时间使用 UTC ISO 8601 字符串；商品状态、媒体路径和播放结果都是静态教学数据。没有账号、上传、转码、数据库或对象存储。

## 2. 学习目标

完成本课后，你应能：

- 区分 `audio`、`video`、媒体 `source` 和 `track` 的职责；
- 使用 `type` 提供多个媒体候选，并用 `currentSrc` 确认实际选择；
- 解释 `controls`、`preload`、`autoplay`、`muted`、`poster`、`playsinline` 和 `loop`；
- 说明为什么静音自动播放更容易获准，但仍不能假设一定成功；
- 读取 `currentTime`、`duration`、`readyState`、`networkState`、`paused`、`ended` 和 `error`；
- 正确等待并捕获 `play()` 返回的 Promise；
- 使用 `pause()` 停止推进时间轴，使用 `load()` 重新执行资源选择；
- 根据 `loadedmetadata`、`playing`、`waiting`、`pause`、`ended` 和 `error` 等事件解释状态变化；
- 编写合法 WebVTT 文件，并区分 captions、subtitles、descriptions 和 chapters；
- 用 Network、Console、媒体状态和 `<source>` 错误定位来源回退问题；
- 为媒体失败提供可操作的文字说明、重试按钮和替代内容。

## 3. 预备知识

开始前建议完成：

- [响应式图片与加载性能](01-images-responsive-performance.md)；
- [URL、链接与安全导航](../02-structure-links-lists/02-urls-links-navigation.md)；
- [列表、图注与内容分组](../02-structure-links-lists/03-lists-figures-content-groups.md)。

你需要能够：

- 创建完整 HTML 文档；
- 在终端运行 `python3`；
- 用浏览器打开 `http://localhost:8000/`；
- 在 DevTools 中查看 Elements、Console 和 Network；
- 理解事件监听和 Promise 的最基本含义。

本课不要求：

- 安装 npm 包或媒体处理软件；
- 掌握音视频编解码原理；
- 建立真实上传接口；
- 把学习者媒体放入教材仓库；
- 在浏览器端实现转码或永久存储。

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

### 4.5 `play()` 返回 Promise

`media.play()` 发起异步播放并返回 Promise：

```js
async function startPlayback(media, status) {
  try {
    await media.play();
    status.textContent = "播放已经开始。";
  } catch (error) {
    status.textContent = `无法自动播放：${error.name}。请按播放按钮。`;
  }
}
```

Promise 成功表示播放已经开始，不表示整个文件会顺利播放到结尾。常见拒绝包括：

- `NotAllowedError`：自动播放政策或权限不允许；
- `NotSupportedError`：没有可用来源或格式不受支持；
- `AbortError`：播放请求被新的 `pause()`、`load()` 或资源切换中断，具体名称取决于实现与时序。

不能调用 `play()` 后立即把界面改成“正在播放”。先等待 Promise，再结合 `playing`、`pause`、`waiting` 和 `error` 事件更新状态。

用户点击按钮通常能提供播放所需的用户激活，但仍应捕获拒绝，因为资源和设备也可能失败。

### 4.6 七个关键运行时状态

#### `currentSrc`

当前实际选中的媒体 URL。使用多个 `source` 时，它是确认回退结果的第一条证据。

#### `currentTime`

当前播放位置，单位为秒。读取它可以显示进度；设置它会发起跳转：

```js
media.currentTime = Math.min(5, media.duration);
```

只有在 `duration` 是有限数值且目标可跳转时才这样做。直播、未加载元数据或不可寻址资源需要不同处理。

#### `duration`

媒体时长，单位为秒：

- 元数据未知时通常为 `NaN`；
- 普通有限媒体是非负有限数；
- 无界媒体流可能为 `Infinity`。

因此不要直接把它格式化成“NaN 秒”。先用 `Number.isFinite()` 判断。

#### `readyState`

`readyState` 说明当前播放位置附近有多少可用数据：

| 常量 | 数值 | 含义 |
| --- | ---: | --- |
| `HAVE_NOTHING` | 0 | 连元数据都没有 |
| `HAVE_METADATA` | 1 | 已获得元数据 |
| `HAVE_CURRENT_DATA` | 2 | 当前帧或采样可用，但不足以继续 |
| `HAVE_FUTURE_DATA` | 3 | 当前与至少一点后续数据可用 |
| `HAVE_ENOUGH_DATA` | 4 | 浏览器估计可继续播放到结束 |

这是“数据可用程度”，不是网络是否正常。`HAVE_ENOUGH_DATA` 也是估计，网络随后仍可能变慢。

#### `networkState`

`networkState` 说明资源选择和网络活动：

| 常量 | 数值 | 含义 |
| --- | ---: | --- |
| `NETWORK_EMPTY` | 0 | 尚未初始化资源 |
| `NETWORK_IDLE` | 1 | 已选择资源，但当前没有取数据 |
| `NETWORK_LOADING` | 2 | 正在取数据 |
| `NETWORK_NO_SOURCE` | 3 | 没有可用来源 |

“暂停”与“网络空闲”不是同一概念。媒体可以暂停但仍在预加载，也可以播放缓存数据而网络暂时空闲。

#### `paused` 与 `ended`

`paused` 初始为 `true`，表示时间轴当前未按正常播放推进。`ended` 表示播放到达结束位置。暂停在最后一帧和自然播放结束可以同时表现为不再推进，但 `ended` 能区分是否到达结尾。

#### `error`

没有终止性媒体错误时，`error` 为 `null`。有错误时，它是 `MediaError`：

| `code` | 常量 | 诊断方向 |
| ---: | --- | --- |
| 1 | `MEDIA_ERR_ABORTED` | 用户或代码中止获取 |
| 2 | `MEDIA_ERR_NETWORK` | 已开始下载后发生网络问题 |
| 3 | `MEDIA_ERR_DECODE` | 已取得数据，但解码失败或内容损坏 |
| 4 | `MEDIA_ERR_SRC_NOT_SUPPORTED` | 没有可支持来源，或资源类型不适用 |

`error.message` 可能提供实现相关信息，也可能为空。它不能代替 Network 响应、服务器日志和来源级错误证据。

### 4.7 `pause()` 与 `load()`

`pause()` 同步请求暂停，不返回 Promise：

```js
media.pause();
```

它不会把 `currentTime` 自动归零，也不保证立即停止下载。再次播放通常从当前时间继续。

`load()` 让媒体元素重新执行资源选择和加载：

```js
media.load();
```

适用场景包括：

- 脚本修改了 `src` 或 `source` 后重新选择；
- 故障恢复时重新请求；
- 需要回到初始加载状态。

`load()` 会重置时间轴和若干状态，并可能使尚未完成的 `play()` Promise 被拒绝。不要在 `timeupdate` 等高频事件中调用它，否则会不断重新开始。

### 4.8 用事件还原媒体过程

媒体事件不会全部冒泡，也没有固定的完整顺序适用于所有网络。应直接监听媒体元素或具体 `source`。

| 事件 | 可观察含义 | 常见用途 |
| --- | --- | --- |
| `loadstart` | 浏览器开始寻找媒体数据 | 标记加载开始 |
| `durationchange` | `duration` 变化 | 刷新时长 |
| `loadedmetadata` | 时长、轨道、视频尺寸等元数据可用 | 启用跳转和显示时长 |
| `loadeddata` | 当前播放位置的首批数据可用 | 确认首帧或当前采样 |
| `canplay` | 可以开始，但未必能无缓冲播完 | 启用播放入口 |
| `canplaythrough` | 浏览器估计可播到结束 | 仅作提示，不作保证 |
| `play` | `paused` 变为 `false`，收到播放意图 | 显示“正在启动” |
| `playing` | 因缺数据暂停后恢复或真正开始推进 | 显示“正在播放” |
| `waiting` | 因暂时缺少数据等待 | 显示缓冲状态 |
| `stalled` | 浏览器尝试取数据但没有收到数据 | 检查网络 |
| `seeking` / `seeked` | 开始 / 完成跳转 | 更新进度交互 |
| `timeupdate` | 播放位置周期变化 | 粗粒度进度；频率不固定 |
| `pause` | 播放暂停 | 更新按钮和状态 |
| `ended` | 到达媒体末尾 | 提供重播入口 |
| `volumechange` | 音量或静音变化 | 同步音量界面 |
| `ratechange` | 播放速率变化 | 同步倍速界面 |
| `progress` | 浏览器取得媒体数据 | 观察缓冲范围 |
| `suspend` | 浏览器主动暂停取数据 | 不等于播放失败 |
| `emptied` | 已有媒体资源被清空 | 常见于 `load()` 或换源 |
| `error` | 媒体元素自身进入终止性错误 | 直接 `src` 失败时展示恢复信息；使用子 `source` 时还要分别监听候选错误 |

`timeupdate` 不保证逐帧触发，不能用它制作精密动画。媒体画面同步动画需要后续学习更专门的 API。

使用多个子 `source` 时要特别区分两层错误：每个候选失败会在对应 `source` 上触发 `error`；所有候选耗尽后，父媒体元素会进入 `NETWORK_NO_SOURCE`，但父元素的 `error` 事件不一定触发，`media.error` 也可以仍是 `null`。因此不能只监听父元素来判断多候选全部失败。

### 4.9 `track` 与四种用户需求

`track` 把外部定时文本关联到 `audio` 或 `video`。常用属性：

```html
<track
  kind="captions"
  src="tracks/inspection.zh-CN.vtt"
  srclang="zh-CN"
  label="中文"
  default
>
```

四种轨道不能只根据文件名区分，关键是 `kind`：

| `kind` | 服务对象与内容 | 例子 |
| --- | --- | --- |
| `captions` | 不便获取音频信息的用户；包含对话、说话人和重要非语言声音 | “发布者：开关正常”与“[开关按下声]” |
| `subtitles` | 听得到声音但不理解原语言的用户；主要翻译对话 | 把中文解说翻译为英文 |
| `descriptions` | 不便获取视觉信息的用户；描述动作、场景和屏幕文字 | “镜头靠近插头，绝缘层完整” |
| `chapters` | 按时间命名段落，支持导航 | “外观检查”“通电检查” |

`default` 是布尔属性，表示在用户偏好没有指定其他轨道时优先启用。一个媒体元素中不要给多个同类同语言轨道都加 `default`。

字幕不是文字稿的替代。字幕与时间同步，文字稿则能脱离播放器顺序阅读、搜索和复制。重要验货信息应在页面附近提供完整文字版本。

### 4.10 WebVTT 文件与 cue 规则

最小合法 WebVTT：

```vtt
WEBVTT

00:00:00.000 --> 00:00:02.500
<v 发布者>先检查台灯外观。

00:00:02.500 --> 00:00:05.000
[开关按下声]
<v 发布者>开关和灯泡工作正常。
```

需要遵守：

1. 文件以 `WEBVTT` 开头，前面不能有普通文字；通常保存为 UTF-8。
2. 头部后有空行，cue 之间也用空行分隔。
3. 时间轴使用 `开始 --> 结束`，毫秒分隔符是句点，不是逗号。
4. 每个 cue 的开始时间必须早于结束时间，并与真实媒体同步。
5. 小于一小时可以写 `MM:SS.mmm`；教材统一写清晰的 `HH:MM:SS.mmm`。
6. cue 标识符可选；若使用，单独放在时间轴上一行。
7. `line`、`position`、`size` 和 `align` 等 cue 设置写在结束时间之后。
8. `NOTE` 可以写注释；注释块与其他块之间需要正确空行。
9. captions 应包含理解内容所需的说话人和声音，不只抄对白。
10. 服务端应发送 `text/vtt`；跨源轨道还需要正确 CORS 响应。

浏览器没有显示字幕时，先检查 Network 中 VTT 是否成功、响应 MIME、Console、`track.readyState` 和 cue 时间，再检查播放器菜单是否启用了轨道。

### 4.11 性能、无障碍与隐私边界

- 长视频默认考虑 `preload="metadata"`，让用户决定是否消耗更多流量。
- 不突然播放有声内容；保留原生 `controls`，并处理 `play()` 拒绝。
- 为预录同步视频提供准确 captions；重要声音也要进入字幕。
- 关键视觉信息提供 descriptions 或页面文字稿，不能只依赖海报。
- 不在验货视频中暴露住址、门牌、面部、车牌、通知内容或其他个人信息。
- 媒体来源必须有使用许可；不要把网络视频地址当成可随意复制的素材。
- 下载成功、字幕存在和视频可访问是三项不同验收，必须分别检查。
- 本课的本地静态服务器只读取练习文件，不接收上传，也不实现持久化。

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

### 5.2 状态与方法

| API | 类型 | 读写 | 观察重点 |
| --- | --- | --- | --- |
| `currentSrc` | 字符串 | 只读 | 最终选择的绝对 URL |
| `currentTime` | 秒数 | 读写 | 当前播放位置与跳转 |
| `duration` | 秒数 | 只读 | 可能是 `NaN` 或 `Infinity` |
| `readyState` | 数字 | 只读 | 当前附近数据可用程度 |
| `networkState` | 数字 | 只读 | 资源与网络活动状态 |
| `paused` | 布尔值 | 只读 | 当前是否暂停 |
| `ended` | 布尔值 | 只读 | 是否到达末尾 |
| `error` | `MediaError` 或 `null` | 只读 | 终止性媒体错误 |
| `play()` | Promise | 调用 | 必须处理成功和拒绝 |
| `pause()` | `undefined` | 调用 | 暂停但不归零 |
| `load()` | `undefined` | 调用 | 重置并重新选择资源 |

### 5.3 快速判读组合

| 观察值 | 可能状态 | 下一步 |
| --- | --- | --- |
| `currentSrc=""`、`networkState=0` | 尚未开始资源选择 | 检查 DOM、调用时机和 `load()` |
| `readyState=1`、`paused=true` | 元数据已有，等待用户播放 | 正常；检查 controls |
| `networkState=2`、触发 `waiting` | 正在取数据但播放缺料 | 检查网速、Range 和响应大小 |
| `networkState=3`、子 `source` 均触发 `error` | 多候选全部失败；父元素 `error` 可以仍为 `null` | 检查每个路径、MIME、格式和编码 |
| 直接 `src` 失败且 `error.code=4` | 媒体元素没有可支持来源 | 检查 URL、响应类型和实际编码 |
| `paused=true`、`ended=true` | 已到达末尾 | 提供重播或设置 `currentTime=0` |
| `play()` 拒绝且名称为 `NotAllowedError` | 自动播放不获准 | 等待用户点击后重试 |

## 6. 最小可运行案例

### 6.1 文件位置

在个人练习项目中创建以下文件。不要在教材仓库生成 `tone.wav`：

```text
market-learning/
└── practice/
    └── html-08-media/
        ├── make_tone.py
        ├── index.html
        └── tone.wav        # 运行脚本后生成
```

### 6.2 用标准库生成短 WAV

把下面的完整脚本保存为 `make_tone.py`。它只使用 Python 标准库，生成 0.75 秒、440 Hz、单声道、16 位 PCM WAV：

```python
from math import pi, sin
from pathlib import Path
import struct
import wave


OUTPUT = Path(__file__).with_name("tone.wav")
SAMPLE_RATE = 8_000
DURATION_SECONDS = 0.75
FREQUENCY_HZ = 440.0
AMPLITUDE = 0.25
SAMPLE_WIDTH_BYTES = 2
CHANNELS = 1


def build_frames() -> bytes:
    frame_count = round(SAMPLE_RATE * DURATION_SECONDS)
    fade_frames = max(1, round(SAMPLE_RATE * 0.02))
    frames = bytearray()

    for index in range(frame_count):
        fade_in = min(1.0, index / fade_frames)
        fade_out = min(1.0, (frame_count - 1 - index) / fade_frames)
        envelope = max(0.0, min(fade_in, fade_out))
        sample = AMPLITUDE * envelope * sin(
            2 * pi * FREQUENCY_HZ * index / SAMPLE_RATE
        )
        frames.extend(struct.pack("<h", round(sample * 32_767)))

    return bytes(frames)


def main() -> None:
    with wave.open(str(OUTPUT), "wb") as audio_file:
        audio_file.setnchannels(CHANNELS)
        audio_file.setsampwidth(SAMPLE_WIDTH_BYTES)
        audio_file.setframerate(SAMPLE_RATE)
        audio_file.writeframes(build_frames())

    print(f"generated: {OUTPUT}")


if __name__ == "__main__":
    main()
```

脚本中的淡入淡出用于减少波形在边界突然截断产生的爆音。它是教学音，不是音乐素材。

### 6.3 完整 HTML

把下面内容保存为同目录的 `index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>媒体状态观察器</title>
  </head>
  <body>
    <main>
      <h1>媒体状态观察器</h1>
      <p>这段 440 Hz 教学音由本地 Python 标准库脚本生成。</p>

      <audio id="demo-audio" controls preload="metadata">
        <source src="tone.wav" type="audio/wav">
        浏览器不支持 HTML audio 元素。
      </audio>

      <p>
        <button id="play-button" type="button">脚本播放</button>
        <button id="pause-button" type="button">暂停</button>
        <button id="reload-button" type="button">重新加载</button>
      </p>

      <p>
        最近结果：
        <output id="status" aria-live="polite">等待操作。</output>
      </p>
      <h2>媒体状态</h2>
      <pre id="details"></pre>
    </main>

    <script>
      const audio = document.querySelector("#demo-audio");
      const playButton = document.querySelector("#play-button");
      const pauseButton = document.querySelector("#pause-button");
      const reloadButton = document.querySelector("#reload-button");
      const status = document.querySelector("#status");
      const details = document.querySelector("#details");

      const readyStateNames = [
        "HAVE_NOTHING",
        "HAVE_METADATA",
        "HAVE_CURRENT_DATA",
        "HAVE_FUTURE_DATA",
        "HAVE_ENOUGH_DATA"
      ];
      const networkStateNames = [
        "NETWORK_EMPTY",
        "NETWORK_IDLE",
        "NETWORK_LOADING",
        "NETWORK_NO_SOURCE"
      ];

      function readableNumber(value) {
        return Number.isFinite(value) ? Number(value.toFixed(3)) : String(value);
      }

      function showSnapshot(lastEvent) {
        details.textContent = JSON.stringify(
          {
            lastEvent,
            currentSrc: audio.currentSrc,
            currentTime: readableNumber(audio.currentTime),
            duration: readableNumber(audio.duration),
            readyState: readyStateNames[audio.readyState],
            networkState: networkStateNames[audio.networkState],
            paused: audio.paused,
            ended: audio.ended,
            error: audio.error
              ? {
                  code: audio.error.code,
                  message: audio.error.message
                }
              : null
          },
          null,
          2
        );
      }

      const observedEvents = [
        "loadstart",
        "durationchange",
        "loadedmetadata",
        "loadeddata",
        "canplay",
        "play",
        "playing",
        "waiting",
        "pause",
        "ended",
        "emptied",
        "error"
      ];

      for (const eventName of observedEvents) {
        audio.addEventListener(eventName, () => {
          showSnapshot(eventName);
        });
      }

      playButton.addEventListener("click", async () => {
        status.textContent = "正在请求播放……";
        try {
          await audio.play();
          status.textContent = "播放已经开始。";
        } catch (error) {
          status.textContent = `播放失败：${error.name}。请检查资源或浏览器政策。`;
          playButton.focus();
        }
        showSnapshot("play() settled");
      });

      pauseButton.addEventListener("click", () => {
        audio.pause();
        status.textContent = "已请求暂停，时间位置不会自动归零。";
        showSnapshot("pause() called");
      });

      reloadButton.addEventListener("click", () => {
        audio.load();
        status.textContent = "已重新执行资源选择。";
        showSnapshot("load() called");
      });

      showSnapshot("script initialized");
    </script>
  </body>
</html>
```

### 6.4 运行与打开方法

在 `html-08-media` 目录执行：

```bash
python3 make_tone.py
python3 -m http.server 8000
```

保持终端运行，在浏览器打开：

```text
http://localhost:8000/
```

使用 HTTP 而不是直接双击文件，能让 Network 请求、MIME 和后续 WebVTT 行为更接近真实页面。停止服务器时在终端按 `Ctrl+C`。

### 6.5 预期结果与失败证据

预期结果：

- 目录中生成 `tone.wav`，教材仓库没有新增媒体；
- 原生播放按钮和“脚本播放”都能听到约 0.75 秒短音；
- `loadedmetadata` 后，`duration` 接近 `0.75`；
- 播放时 `paused` 变为 `false`，结束后 `ended` 为 `true`；
- `currentSrc` 以 `/tone.wav` 结尾；
- 点击“暂停”不把 `currentTime` 自动改回 `0`；
- 点击“重新加载”会出现 `emptied`、`loadstart` 等新记录。

失败证据：

- Python 报错，或者脚本运行后没有 `tone.wav`；
- Network 中 `tone.wav` 返回 404；
- `networkState` 最终为 `NETWORK_NO_SOURCE`；
- `error.code` 为 3 或 4；
- `duration` 在 `loadedmetadata` 后仍为 `NaN`；
- 页面声称“播放成功”，但 `play()` 实际被拒绝或没有 `playing` 事件。

如果 8000 端口被占用，可使用 `python3 -m http.server 8001`，并打开对应端口。这只是静态文件服务器，不实现上传或存储。

### 6.6 渐进扩展：观察来源回退

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

### 6.7 明确的错误案例

下面的写法错误地把自动播放请求当成既成事实：

```html
<!-- 错误案例：有声自动播放可能被拒绝，也没有恢复入口 -->
<audio id="notice" autoplay src="notice.wav"></audio>
<p>语音已经开始播放。</p>
```

问题有三层：

1. 有声自动播放常被浏览器阻止；
2. 没有 `controls`，用户无法自行开始或调整；
3. 固定文字在 `play()` 失败时仍谎报成功。

正确方向是保留 `controls`，只在 `await media.play()` 成功或收到 `playing` 后报告播放，并在拒绝时显示可聚焦的播放按钮。

## 7. 邻里集市集成案例

### 7.1 媒体来源合同

商品“阅读台灯”的验货片段采用以下教学合同：

| 项目 | 约定 |
| --- | --- |
| 视频长度 | 至少 8 秒，含外观、插头和通电检查 |
| 视频文件 | `inspection.webm`、`inspection.mp4`，至少一个能在目标浏览器播放 |
| 海报 | `inspection-poster.jpg`，代表验货内容 |
| 字幕 | 中文 captions，含对白与重要声音 |
| 翻译 | 英文 subtitles，只翻译语言内容 |
| 描述 | 中文 descriptions，描述关键视觉动作 |
| 章节 | 中文 chapters，提供时间段名称 |
| 文字稿 | 页面内完整文字，可独立阅读 |
| 隐私 | 不出现人脸、住址、门牌、车牌或通知内容 |

**媒体文件边界：**

- 视频、海报和 VTT 文件均由学习者在自己的 `market-learning` 练习目录生成或提供；
- 教材仓库不包含这些媒体资产；
- 页面没有文件上传控件，没有上传请求，也没有服务器端存储；
- `python3 -m http.server` 只提供本地静态读取，不接收或持久化文件；
- 手机拍摄的视频在使用前应移除隐私信息，并确认素材许可。

### 7.2 文件位置

```text
market-learning/
└── practice/
    └── html-08-media/
        ├── market.html
        ├── media/
        │   ├── inspection.webm
        │   ├── inspection.mp4
        │   └── inspection-poster.jpg
        └── tracks/
            ├── inspection.zh-CN.vtt
            ├── inspection.en.vtt
            ├── inspection.descriptions.zh-CN.vtt
            └── inspection.chapters.zh-CN.vtt
```

### 7.3 完整 captions WebVTT

把下面内容保存为 `tracks/inspection.zh-CN.vtt`：

```vtt
WEBVTT

NOTE 邻里集市阅读台灯验货片段，中文隐藏式字幕

00:00:00.000 --> 00:00:02.500
<v 发布者>先看灯罩，左侧有一道浅划痕。

00:00:02.500 --> 00:00:05.000
<v 发布者>插头和电源线外皮完整。

00:00:05.000 --> 00:00:08.000
[开关按下声]
<v 发布者>灯泡点亮，开关工作正常。
```

这是一份完整文件，不要把围栏标记写入 `.vtt`。最后一个 cue 的结束时间必须落在学习者视频时长内。

### 7.4 其他三类轨道

`tracks/inspection.en.vtt`：

```vtt
WEBVTT

00:00:00.000 --> 00:00:02.500
The lampshade has a light scratch on the left.

00:00:02.500 --> 00:00:05.000
The plug and cable insulation are intact.

00:00:05.000 --> 00:00:08.000
The bulb lights up and the switch works.
```

`tracks/inspection.descriptions.zh-CN.vtt`：

```vtt
WEBVTT

00:00:00.000 --> 00:00:02.500
镜头靠近白色灯罩左侧，手指指向一道浅划痕。

00:00:02.500 --> 00:00:05.000
镜头沿黑色电源线移动到两脚插头，外皮没有破损。

00:00:05.000 --> 00:00:08.000
手按下底座开关，暖色灯泡点亮。
```

`tracks/inspection.chapters.zh-CN.vtt`：

```vtt
WEBVTT

00:00:00.000 --> 00:00:02.500
灯罩外观

00:00:02.500 --> 00:00:05.000
插头与电源线

00:00:05.000 --> 00:00:08.000
通电检查
```

浏览器对 descriptions 的自动语音呈现和 chapters 的原生界面支持可能不同。轨道语义仍应正确，同时保留页面文字稿，并在目标浏览器和辅助技术中实测。

### 7.5 完整商品页面

把下面内容保存为 `market.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>阅读台灯验货片段 · 邻里集市</title>
  </head>
  <body>
    <header>
      <p>邻里集市</p>
    </header>

    <main>
      <article>
        <header>
          <h1>阅读台灯</h1>
          <dl>
            <div>
              <dt>价格</dt>
              <dd><data value="12900">129 元</data></dd>
            </div>
            <div>
              <dt>发布时间</dt>
              <dd>
                <time datetime="2026-10-10T08:00:00Z">
                  2026 年 10 月 10 日
                </time>
              </dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>可预约（静态教学状态）</dd>
            </div>
          </dl>
        </header>

        <section aria-labelledby="inspection-title">
          <h2 id="inspection-title">验货片段</h2>
          <p>
            视频展示灯罩划痕、电源线和通电结果。
            由你决定何时播放，不会自动播放。
          </p>

          <figure>
            <video
              id="inspection-video"
              controls
              preload="metadata"
              poster="media/inspection-poster.jpg"
              playsinline
              width="640"
              height="360"
            >
              <source
                src="media/inspection.webm"
                type="video/webm"
              >
              <source
                src="media/inspection.mp4"
                type="video/mp4"
              >
              <track
                kind="captions"
                src="tracks/inspection.zh-CN.vtt"
                srclang="zh-CN"
                label="中文"
                default
              >
              <track
                kind="subtitles"
                src="tracks/inspection.en.vtt"
                srclang="en"
                label="English"
              >
              <track
                kind="descriptions"
                src="tracks/inspection.descriptions.zh-CN.vtt"
                srclang="zh-CN"
                label="中文视觉描述"
              >
              <track
                kind="chapters"
                src="tracks/inspection.chapters.zh-CN.vtt"
                srclang="zh-CN"
                label="验货章节"
              >
              浏览器不支持 HTML video 元素。
            </video>
            <figcaption>
              8 秒验货片段：灯罩、线材与通电检查。
            </figcaption>
          </figure>

          <p>
            <button id="play-inspection" type="button">播放验货片段</button>
            <button id="reload-inspection" type="button">重新加载媒体</button>
          </p>
          <p>
            播放状态：
            <output id="media-status" aria-live="polite">等待用户播放。</output>
          </p>
          <h3>媒体诊断证据</h3>
          <pre id="media-evidence"></pre>
        </section>

        <section aria-labelledby="transcript-title">
          <h2 id="transcript-title">验货文字稿</h2>
          <ol>
            <li>0–2.5 秒：灯罩左侧有一道浅划痕。</li>
            <li>2.5–5 秒：插头和电源线外皮完整。</li>
            <li>5–8 秒：按下开关后灯泡点亮，开关正常。</li>
          </ol>
          <p>
            文字稿可脱离播放器阅读。本页不提供上传，也不会把视频保存到服务器。
          </p>
        </section>
      </article>
    </main>

    <script>
      const video = document.querySelector("#inspection-video");
      const playButton = document.querySelector("#play-inspection");
      const reloadButton = document.querySelector("#reload-inspection");
      const mediaStatus = document.querySelector("#media-status");
      const mediaEvidence = document.querySelector("#media-evidence");

      function mediaErrorDetails() {
        if (!video.error) {
          return null;
        }
        return {
          code: video.error.code,
          message: video.error.message
        };
      }

      function renderEvidence(lastEvent) {
        mediaEvidence.textContent = JSON.stringify(
          {
            lastEvent,
            currentSrc: video.currentSrc,
            currentTime: Number.isFinite(video.currentTime)
              ? Number(video.currentTime.toFixed(2))
              : String(video.currentTime),
            duration: Number.isFinite(video.duration)
              ? Number(video.duration.toFixed(2))
              : String(video.duration),
            readyState: video.readyState,
            networkState: video.networkState,
            paused: video.paused,
            ended: video.ended,
            error: mediaErrorDetails()
          },
          null,
          2
        );
      }

      playButton.addEventListener("click", async () => {
        mediaStatus.textContent = "正在请求播放……";
        try {
          await video.play();
          mediaStatus.textContent = "验货片段正在播放。";
        } catch (error) {
          mediaStatus.textContent =
            `无法播放：${error.name}。请检查媒体文件后重试。`;
          playButton.focus();
        }
        renderEvidence("play() settled");
      });

      reloadButton.addEventListener("click", () => {
        failedSources.clear();
        video.load();
        mediaStatus.textContent = "已重新加载，请再次播放。";
        renderEvidence("load() called");
      });

      video.addEventListener("playing", () => {
        mediaStatus.textContent = "验货片段正在播放。";
        renderEvidence("playing");
      });

      video.addEventListener("waiting", () => {
        mediaStatus.textContent = "媒体暂时缺少数据，正在等待。";
        renderEvidence("waiting");
      });

      video.addEventListener("pause", () => {
        if (!video.ended) {
          mediaStatus.textContent = "验货片段已暂停。";
        }
        renderEvidence("pause");
      });

      video.addEventListener("ended", () => {
        mediaStatus.textContent = "验货片段已播放完毕。";
        renderEvidence("ended");
      });

      video.addEventListener("error", () => {
        const code = video.error ? video.error.code : "unknown";
        mediaStatus.textContent =
          `媒体元素发生终止性错误，错误码：${code}。`;
        playButton.focus();
        renderEvidence("media element error");
      });

      const sources = [...video.querySelectorAll("source")];
      const failedSources = new Set();

      video.addEventListener("loadstart", () => {
        failedSources.clear();
      });

      for (const source of sources) {
        source.addEventListener("error", () => {
          failedSources.add(source);
          console.warn("媒体候选失败", source.src, source.type);

          if (failedSources.size === sources.length) {
            queueMicrotask(() => {
              mediaStatus.textContent =
                `所有 source 候选均失败；networkState=${video.networkState}，` +
                `media.error=${video.error ? video.error.code : "null"}。`;
              playButton.focus();
              renderEvidence("all source candidates failed");
            });
          }
        });
      }

      renderEvidence("script initialized");
    </script>
  </body>
</html>
```

### 7.6 打开方法与预期结果

从 `html-08-media` 目录运行：

```bash
python3 -m http.server 8000
```

打开：

```text
http://localhost:8000/market.html
```

预期结果：

- 页面显示整数机器值 `12900` 对应 129 元；
- `datetime` 使用 `2026-10-10T08:00:00Z`；
- 海报先出现，视频不自动发声；
- 原生 controls 可用键盘操作；
- 播放器字幕菜单能找到“中文”和“English”；
- 中文 captions 与画面时间同步，并包含开关声；
- 页面文字稿不依赖轨道显示；
- `currentSrc` 指向实际可播放的 WebM 或 MP4；
- 一个来源失败时，Console 能提供来源级证据；
- 所有子 `source` 失败时，页面通过候选错误计数和 `networkState` 给出重试方向，而不是等待父 `video` 的 `error`。

失败证据：

- Network 中视频、海报或 VTT 返回 404；
- VTT 响应不是 `text/vtt`，或 Console 报跨源问题；
- `currentSrc` 为空、`networkState` 为 3，且全部子 `source` 已触发 `error`；
- 使用子 `source` 时 `video.error` 可能仍为 `null`，不能把缺少错误码误判为成功；
- 字幕只写对白，遗漏理解所需的“开关按下声”；
- 视频含有隐私信息；
- 页面出现文件上传、上传成功或服务器已保存等本课没有实现的声明。

## 8. 常见错误与排查路径

### 8.1 `play()` 被拒绝却显示“正在播放”

**错误案例：**

```js
const video = document.querySelector("video");
video.play();
document.querySelector("#status").textContent = "正在播放";
```

**现象：**界面显示正在播放，视频仍停在海报。

**证据：**Console 出现未处理的 Promise 拒绝，常见名称为 `NotAllowedError`；没有 `playing` 事件。

**原因：**代码没有等待 `play()`，自动播放政策或资源错误拒绝了请求。

**恢复：**

```js
const video = document.querySelector("video");
const retryButton = document.querySelector("#retry-play");
const status = document.querySelector("#status");

async function requestPlayback() {
  status.textContent = "正在请求播放……";
  try {
    await video.play();
    status.textContent = "正在播放。";
  } catch (error) {
    status.textContent =
      `播放未开始：${error.name}。请点击按钮重试。`;
    retryButton.hidden = false;
    retryButton.focus();
  }
}

retryButton.addEventListener("click", () => {
  requestPlayback();
});

requestPlayback();
```

页面需要存在：

```html
<video controls src="media/inspection.mp4"></video>
<button id="retry-play" type="button" hidden>点击播放</button>
<p id="status" aria-live="polite">等待播放。</p>
```

首次页面加载调用可能成功也可能拒绝，取决于浏览器和用户历史；代码不能把拒绝当成所有环境的固定结果。按钮点击后的用户激活提供恢复机会，仍需保留异常处理。

### 8.2 `controls="false"` 仍显示控件

- **现象**：写了 `controls="false"`，控件仍存在。
- **证据**：Elements 中属性仍在。
- **原因**：`controls` 是布尔属性，存在即为真。
- **修复**：需要原生控件就写 `controls`；确实不需要时删除属性。
- **复验**：键盘用户仍有等价的自定义控制，且播放、暂停、音量、字幕和焦点均经过测试。

### 8.3 所有来源失败

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

### 8.4 `preload="none"` 后立即读取时长

- **现象**：页面初始化时 `duration` 是 `NaN`。
- **证据**：`readyState` 为 0，`loadedmetadata` 尚未发生。
- **原因**：浏览器还没有元数据。
- **修复**：在 `loadedmetadata` 后读取，或根据产品需求使用 `preload="metadata"`。
- **复验**：事件发生后时长是有限数；未知时界面显示“时长尚未加载”。

### 8.5 字幕文件请求成功但不显示

- **现象**：VTT 返回 200，播放器中没有字幕或 cue 不出现。
- **证据**：检查响应正文、`Content-Type`、轨道菜单、cue 时间和 `track.readyState`。
- **可能原因**：缺少 `WEBVTT`、空行错误、用了逗号毫秒、cue 在视频时长之外、MIME 错误、跨源未授权或轨道未启用。
- **修复**：按 WebVTT 规则修正，使用 `text/vtt`，再选择对应轨道。
- **复验**：在 0–8 秒分别出现三个 cue，中文轨道包含重要声音。

### 8.6 `pause()` 被误当成停止和卸载

- **现象**：点击暂停后期待进度归零、网络请求取消。
- **证据**：`currentTime` 保持原值，Network 可能继续获取。
- **原因**：`pause()` 只暂停播放推进。
- **修复**：若产品确实需要“回到开头”，暂停后显式设置 `currentTime = 0`；若要重新选择资源，谨慎调用 `load()`。
- **复验**：暂停与重置是两个可分别观察的动作。

### 8.7 用后备文本处理现代浏览器的资源失败

- **现象**：所有 `source` 404，但元素内部的“请下载视频”没有出现。
- **证据**：浏览器支持 `video` 元素，因此忽略为旧浏览器准备的普通后备内容。
- **原因**：元素后备与资源失败是不同问题。
- **修复**：在媒体元素旁放置始终可访问的文字稿或下载说明；分别监听子 `source` 的 `error`，并结合 `networkState` 更新状态。
- **复验**：即使媒体错误，页面仍有可见、可聚焦的恢复路径。

### 8.8 已填写的诊断与恢复记录

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

### 9.1 理解题

1. 为什么 `preload="metadata"` 不是“只下载元数据”的强制命令？
2. `play` 事件和 `playing` 事件分别说明什么？
3. `currentSrc` 比读取第一个 `source.src` 多提供了什么信息？
4. captions 与 subtitles 的核心区别是什么？
5. 为什么 `poster` 不能替代视觉描述？
6. `pause()` 与 `load()` 对时间轴有什么不同？
7. 为什么媒体内部后备文字不能作为资源 404 的唯一恢复方式？

<details>
<summary>查看理解题答案</summary>

1. `preload` 是提示，浏览器可依据缓存、网络、节能、自动播放和用户设置调整实际加载。
2. `play` 表示收到播放意图且 `paused` 发生变化；`playing` 表示媒体已经开始或从缺数据等待中恢复推进。
3. `currentSrc` 给出浏览器实际选择并解析后的绝对 URL，而第一个候选不一定获选。
4. captions 面向无法获得音频信息的用户，包含对白、说话人和重要声音；subtitles 主要翻译用户听得到但不理解的语言。
5. 海报是代表图，没有文字替代机制，也不能完整描述视频中的关键动作。
6. `pause()` 停止推进但保留位置；`load()` 重置加载过程并重新选择资源，通常也重置播放位置和状态。
7. 现代浏览器支持媒体元素时不会因资源失败自动显示那段旧浏览器后备文字，需要元素外的状态与替代内容。

</details>

### 9.2 状态推理题

观察到：

```json
{
  "currentSrc": "",
  "duration": "NaN",
  "readyState": 0,
  "networkState": 3,
  "paused": true,
  "ended": false,
  "error": null,
  "failedSourceCount": 2
}
```

最可能的诊断是什么？第一轮应该收集哪些证据？

<details>
<summary>查看推理答案</summary>

没有可用媒体来源。两个子 `source` 都失败时，父媒体元素可以保持 `error === null`；先检查 Elements 中的路径和 `type`，再看 Network 状态、响应 MIME、Console、每个 `source` 的错误以及文件真实编码。不能只根据扩展名或父元素错误码判定浏览器一定支持。

</details>

### 9.3 设计题

商品验货视频没有对白，只有手指指出裂纹和一声蜂鸣。是否可以只提供 subtitles？

<details>
<summary>查看设计答案</summary>

不可以。没有需要翻译的对白时，subtitles 不是主要需求。蜂鸣属于理解内容所需的音频信息，应进入 captions；裂纹位置和手指动作属于关键视觉信息，应进入 descriptions 或页面文字稿。页面还应明确文字说明商品缺陷。

</details>

## 10. 实践练习

### 10.1 基础：生成并观察音频

文件位置：

```text
practice/html-08-media/
```

要求：

- 运行本课标准库脚本生成 `tone.wav`；
- 使用 `audio`、`source`、`controls` 和 `preload="metadata"`；
- 显示 `currentSrc`、`duration`、`paused` 和 `ended`；
- 记录 `loadedmetadata`、`playing`、`pause` 和 `ended`；
- 通过本地 HTTP 服务器打开。

答案标准：

- WAV 在个人练习目录生成，不进入教材仓库；
- `currentSrc` 指向 WAV；
- 时长约 0.75 秒；
- 自然播放结束后 `ended === true`；
- 页面不把自动播放当作前提。

### 10.2 提升：接入学习者提供的视频与四类轨道

这是显式的外部视频练习合同：

1. 学习者自行提供至少 8 秒的 WebM 或 MP4 验货视频，不从教材仓库获取；
2. 不得包含人脸、住址、门牌、车牌或通知隐私；
3. 至少提供两个 `source` 候选；如果只有一个真实格式，就只保留一个真实候选，不能复制改后缀；
4. 创建 captions、subtitles、descriptions 和 chapters 四个 WebVTT；
5. captions 包含说话人和重要声音，subtitles 只承担翻译；
6. 页面提供完整文字稿；
7. 使用 `poster`、`controls`、`preload="metadata"` 和 `playsinline`；
8. 不使用自动播放；
9. 页面明确“媒体由学习者提供，无上传和服务器存储”；
10. 用键盘完成播放、暂停、进度和字幕选择。

答案标准：

- `currentSrc` 与实际成功来源一致；
- 四个 `kind` 没有混用；
- 每个 VTT 从 `WEBVTT` 开始，cue 时间落在视频范围内；
- 关闭声音后，captions 仍能传达重要声音；
- 不看画面时，descriptions 或文字稿能传达关键检查；
- Network 无长期故意 404；
- 没有上传成功、服务器保存或真实商品状态等虚假声明。

### 10.3 故障：来源、VTT 与播放政策

依次完成三个故障注入，每次恢复后再进行下一个：

1. 把第一个视频文件改名，观察第二来源回退；
2. 删除 VTT 第一行的 `WEBVTT`，观察字幕失败；
3. 在页面加载时调用有声视频的 `play()`，观察 Promise 成功或拒绝，并保证两种结果界面都真实。

每次记录：

```text
故障注入：
可见现象：
Network / Console 证据：
currentSrc：
readyState / networkState：
error 或 Promise 结果：
原因：
最小修复：
复验事件与状态：
未验证范围：
```

答案标准：

- 第一来源失败时，能用 `currentSrc` 证明是否回退，而不是凭画面猜测；
- VTT 修复后，0–8 秒 cue 可见且内容同步；
- `play()` 成功才显示“正在播放”，拒绝时显示按钮并允许用户重试；
- 记录区分来源错误、轨道错误和策略拒绝，不把三者混成“视频坏了”。

## 11. 阶段验收

### 结构与资源

- [ ] 页面使用 `audio` 或 `video` 表达真实媒体，而不是插件元素；
- [ ] 多来源时使用有序 `source` 和准确 `type`；
- [ ] 能用 `currentSrc` 指出最终选择；
- [ ] `controls` 保留原生恢复路径；
- [ ] `preload` 的描述没有写成强制保证；
- [ ] `poster`、`playsinline`、`muted`、`autoplay` 和 `loop` 的适用边界解释正确。

### 状态与恢复

- [ ] `play()` 的 Promise 成功和拒绝都被处理；
- [ ] `pause()` 不被描述为卸载或归零；
- [ ] `load()` 只在需要重新选择和重置时调用；
- [ ] 页面能显示 `currentTime`、`duration`、`readyState`、`networkState`、`paused`、`ended` 和 `error`；
- [ ] 至少记录 `loadedmetadata`、`playing`、`waiting`、`pause`、`ended` 和 `error`；
- [ ] 所有来源失败时有可见恢复入口和文字替代；
- [ ] 恢复记录包含现象、证据、原因、修复和复验。

### 文本轨道与可访问性

- [ ] WebVTT 头、空行、时间轴和 cue 合法；
- [ ] captions 包含对白、说话人和重要声音；
- [ ] subtitles、descriptions、chapters 职责没有混用；
- [ ] 页面提供可独立阅读的文字稿；
- [ ] 键盘可操作原生控件和自定义重试按钮；
- [ ] 不把某一浏览器的自动播放结果写成跨浏览器保证。

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

### Q6：字幕存在就等于视频可访问吗？

不等于。字幕解决音频信息的一部分；关键视觉内容还需要描述或文字稿，播放器和自定义控件也要可用键盘操作。字幕本身还必须准确同步。

### Q7：音频也能使用 `track` 吗？

HTML 可以关联文本轨道，但浏览器原生界面的呈现能力可能不同。音频内容仍应提供邻近文字稿，不能把可访问性完全押在某个播放器菜单上。

### Q8：循环媒体为什么可能没有 `ended`？

正向播放并启用 `loop` 时，媒体会回到开头继续，通常不会进入供业务收尾使用的结束状态。需要计数或停止时，应设计明确逻辑，不依赖自然 `ended`。

### Q9：调用 `pause()` 会停止下载吗？

不保证。暂停播放与资源获取是不同状态，预加载和缓存策略仍可能继续工作。观察 Network 与 `networkState`。

### Q10：跨域视频能播放，为什么跨域 VTT 失败？

媒体、轨道和脚本访问有各自的 CORS 条件。跨源 VTT 需要服务端允许相应跨源请求，媒体元素也要按需求正确设置 `crossorigin`。最简单的入门环境是同源静态服务器。

### Q11：能只放 MP4 吗？

可以，前提是目标浏览器确实支持该文件内部的编码。多 `source` 是兼容策略，不是形式要求。只有一个真实、已测来源时，不要伪造第二个扩展名。

### Q12：如何显示精确的逐帧进度？

`timeupdate` 频率不固定，不适合逐帧任务。本课只做粗粒度状态。逐帧媒体处理需要后续专门 API 和目标浏览器验证。

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

我能从候选来源、加载状态、播放 Promise、事件和错误码解释媒体实际发生了什么，而不是只看播放器有没有出现。我还能生成本地教学音频，编写合法 WebVTT，为商品验货视频提供字幕、翻译、描述、章节和文字稿，并在自动播放或资源加载失败时给出真实、可操作的恢复路径。

## 单元导航

- [上一课：响应式图片与加载性能](01-images-responsive-performance.md)
- [返回第三章入口](../03-images-media-embedding.md)
- [下一课：嵌入、SVG 与 Canvas](03-embedding-svg-canvas.md)
- [返回 HTML 模块](../README.md)
