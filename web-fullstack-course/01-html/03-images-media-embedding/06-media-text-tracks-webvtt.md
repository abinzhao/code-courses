# 文本轨道、WebVTT 与媒体可访问性

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 使用 track 和 WebVTT 提供字幕、描述与章节，并明确性能、隐私和无障碍边界。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `MED-009` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

使用 track 和 WebVTT 提供字幕、描述与章节，并明确性能、隐私和无障碍边界。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 MED-009（`track`、WebVTT、字幕、描述、章节）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 `track` 与四种用户需求

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

### 4.2 WebVTT 文件与 cue 规则

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

### 4.3 性能、无障碍与隐私边界

- 长视频默认考虑 `preload="metadata"`，让用户决定是否消耗更多流量。
- 不突然播放有声内容；保留原生 `controls`，并处理 `play()` 拒绝。
- 为预录同步视频提供准确 captions；重要声音也要进入字幕。
- 关键视觉信息提供 descriptions 或页面文字稿，不能只依赖海报。
- 不在验货视频中暴露住址、门牌、面部、车牌、通知内容或其他个人信息。
- 媒体来源必须有使用许可；不要把网络视频地址当成可随意复制的素材。
- 下载成功、字幕存在和视频可访问是三项不同验收，必须分别检查。
- 本课的本地静态服务器只读取练习文件，不接收上传，也不实现持久化。

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `MED-009`：`track`、WebVTT、字幕、描述、章节

## 6. 最小可运行案例

在个人练习目录中新建 `practice/06-media-text-tracks-webvtt/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 MED-009（`track`、WebVTT、字幕、描述、章节） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 在打开页面前写下预期 DOM、默认行为或请求结果；
4. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
5. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

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

### 8.1 字幕文件请求成功但不显示

- **现象**：VTT 返回 200，播放器中没有字幕或 cue 不出现。
- **证据**：检查响应正文、`Content-Type`、轨道菜单、cue 时间和 `track.readyState`。
- **可能原因**：缺少 `WEBVTT`、空行错误、用了逗号毫秒、cue 在视频时长之外、MIME 错误、跨源未授权或轨道未启用。
- **修复**：按 WebVTT 规则修正，使用 `text/vtt`，再选择对应轨道。
- **复验**：在 0–8 秒分别出现三个 cue，中文轨道包含重要声音。

## 9. 课后题

### 9.1 设计题

商品验货视频没有对白，只有手指指出裂纹和一声蜂鸣。是否可以只提供 subtitles？

<details>
<summary>查看设计答案</summary>

不可以。没有需要翻译的对白时，subtitles 不是主要需求。蜂鸣属于理解内容所需的音频信息，应进入 captions；裂纹位置和手指动作属于关键视觉信息，应进入 descriptions 或页面文字稿。页面还应明确文字说明商品缺陷。

</details>

## 10. 实践练习

### 10.1 提升：接入学习者提供的视频与四类轨道

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

### 10.2 故障：来源、VTT 与播放政策

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

### 文本轨道与可访问性

- [ ] WebVTT 头、空行、时间轴和 cue 合法；
- [ ] captions 包含对白、说话人和重要声音；
- [ ] subtitles、descriptions、chapters 职责没有混用；
- [ ] 页面提供可独立阅读的文字稿；
- [ ] 键盘可操作原生控件和自定义重试按钮；
- [ ] 不把某一浏览器的自动播放结果写成跨浏览器保证。

## 12. 常见问题

### Q6：字幕存在就等于视频可访问吗？

不等于。字幕解决音频信息的一部分；关键视觉内容还需要描述或文字稿，播放器和自定义控件也要可用键盘操作。字幕本身还必须准确同步。

### Q10：跨域视频能播放，为什么跨域 VTT 失败？

媒体、轨道和脚本访问有各自的 CORS 条件。跨源 VTT 需要服务端允许相应跨源请求，媒体元素也要按需求正确设置 `crossorigin`。最简单的入门环境是同源静态服务器。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：使用 track 和 WebVTT 提供字幕、描述与章节，并明确性能、隐私和无障碍边界。
- `MED-009`：`track`、WebVTT、字幕、描述、章节
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：媒体播放状态、事件与故障恢复](05-media-playback-state-events.md) · [下一课：嵌入文档、安全边界与图像映射](07-embedded-documents-image-maps.md) · [返回 HTML 模块](../README.md)
