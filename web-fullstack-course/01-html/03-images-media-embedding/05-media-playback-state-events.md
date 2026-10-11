# 媒体播放状态、事件与故障恢复

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 观察媒体状态与事件，处理 play() Promise、暂停、重载和策略拒绝。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `MED-010` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

观察媒体状态与事件，处理 play() Promise、暂停、重载和策略拒绝。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 MED-010（媒体状态、事件和 `play()` Promise）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

### 3.1 预备材料 1

```text
学习者提供媒体
  → 浏览器选择 source
  → 读取元数据与媒体数据
  → 用户发起播放
  → play() Promise 成功或拒绝
  → 事件与状态提供诊断证据
  → track 和页面文字提供等价信息
```

## 4. 核心理论

### 4.1 `play()` 返回 Promise

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

### 4.2 七个关键运行时状态

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

### 4.3 `pause()` 与 `load()`

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

### 4.4 用事件还原媒体过程

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

## 5. 元素、属性、API 或配置清单

### 5.1 状态与方法

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

### 5.2 快速判读组合

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

### 6.6 明确的错误案例

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

本章的完整项目代码集中在 [文本轨道、WebVTT 与媒体可访问性](06-media-text-tracks-webvtt.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 MED-010（媒体状态、事件和 `play()` Promise） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`06-media-text-tracks-webvtt.md`](06-media-text-tracks-webvtt.md)。

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

### 8.2 `preload="none"` 后立即读取时长

- **现象**：页面初始化时 `duration` 是 `NaN`。
- **证据**：`readyState` 为 0，`loadedmetadata` 尚未发生。
- **原因**：浏览器还没有元数据。
- **修复**：在 `loadedmetadata` 后读取，或根据产品需求使用 `preload="metadata"`。
- **复验**：事件发生后时长是有限数；未知时界面显示“时长尚未加载”。

### 8.3 `pause()` 被误当成停止和卸载

- **现象**：点击暂停后期待进度归零、网络请求取消。
- **证据**：`currentTime` 保持原值，Network 可能继续获取。
- **原因**：`pause()` 只暂停播放推进。
- **修复**：若产品确实需要“回到开头”，暂停后显式设置 `currentTime = 0`；若要重新选择资源，谨慎调用 `load()`。
- **复验**：暂停与重置是两个可分别观察的动作。

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

## 11. 阶段验收

### 状态与恢复

- [ ] `play()` 的 Promise 成功和拒绝都被处理；
- [ ] `pause()` 不被描述为卸载或归零；
- [ ] `load()` 只在需要重新选择和重置时调用；
- [ ] 页面能显示 `currentTime`、`duration`、`readyState`、`networkState`、`paused`、`ended` 和 `error`；
- [ ] 至少记录 `loadedmetadata`、`playing`、`waiting`、`pause`、`ended` 和 `error`；
- [ ] 所有来源失败时有可见恢复入口和文字替代；
- [ ] 恢复记录包含现象、证据、原因、修复和复验。

## 12. 常见问题

### Q8：循环媒体为什么可能没有 `ended`？

正向播放并启用 `loop` 时，媒体会回到开头继续，通常不会进入供业务收尾使用的结束状态。需要计数或停止时，应设计明确逻辑，不依赖自然 `ended`。

### Q9：调用 `pause()` 会停止下载吗？

不保证。暂停播放与资源获取是不同状态，预加载和缓存策略仍可能继续工作。观察 Network 与 `networkState`。

### Q12：如何显示精确的逐帧进度？

`timeupdate` 频率不固定，不适合逐帧任务。本课只做粗粒度状态。逐帧媒体处理需要后续专门 API 和目标浏览器验证。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：观察媒体状态与事件，处理 play() Promise、暂停、重载和策略拒绝。
- `MED-010`：媒体状态、事件和 `play()` Promise
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：音频、视频、来源与原生控件](04-media-elements-sources-controls.md) · [下一课：文本轨道、WebVTT 与媒体可访问性](06-media-text-tracks-webvtt.md) · [返回 HTML 模块](../README.md)
