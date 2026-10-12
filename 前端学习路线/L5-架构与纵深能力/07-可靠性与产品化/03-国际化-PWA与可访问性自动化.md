# 03 国际化、PWA 与可访问性自动化

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L5 架构与纵深能力
> - 先修：[02 威胁建模与安全验证](./02-威胁建模与安全验证.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN Web Docs](https://developer.mozilla.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 能区分国际化、本地化、区域格式和内容翻译
- 能设计稳定消息 ID、变量、复数与回退策略
- 理解 PWA Manifest、Service Worker、缓存和更新生命周期
- 能设计离线状态与冲突恢复
- 能建立静态、组件、E2E 和人工可访问性验证
- 能避免把自动扫描分数当作产品可用性结论

---

## 内容讲解

### 一、国际化不只是翻译字符串

需要处理：

- 语言
- 地区
- 复数规则
- 日期、时间、数字、货币
- 时区
- 排序与搜索
- 从右到左书写
- 文案长度
- 图片和法规差异

```js
new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
}).format(1234.5);
```

不要手工拼接货币符号或日期顺序。

### 二、消息契约

避免把中文原文直接当 key：

```json
{
  "article.publish.success": "文章已发布",
  "article.comments.count": "{count, plural, =0 {暂无评论} one {# 条评论} other {# 条评论}}"
}
```

稳定消息 ID 与业务语义绑定，文案变化不会导致 key 变化。

变量要有类型与来源约束，避免把 HTML 拼进翻译：

```tsx
<Trans
  id="article.author"
  values={{ authorName }}
  components={{ profileLink: <a href={profileUrl} /> }}
/>
```

翻译系统应支持富文本占位组件，而不是允许任意 HTML。

### 三、Locale 解析与回退

```text
zh-Hans-CN
→ zh-Hans
→ zh
→ 默认语言
```

来源优先级需要明确：

1. 用户账户设置
2. URL 路径或域名
3. 本地 Cookie
4. Accept-Language
5. 默认语言

URL 中的 locale 更利于分享、SEO 和缓存。不要让同一 URL 因 Cookie 返回不可预测语言却缺少正确缓存策略。

### 四、RTL 与布局

```html
<html lang="ar" dir="rtl">
```

CSS 优先逻辑属性：

```css
.card {
  padding-inline: 1rem;
  border-inline-start: 4px solid currentColor;
}
```

还要验证：

- 图标方向
- 时间线和进度
- 数字与代码的双向文本
- 表格阅读顺序
- 动画方向

### 五、PWA 的三个核心

#### Web App Manifest

```json
{
  "name": "Atlas",
  "short_name": "Atlas",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#05603a",
  "background_color": "#ffffff",
  "icons": []
}
```

#### Service Worker

运行在独立上下文，拦截受控范围内的请求，管理缓存与后台事件。

#### HTTPS

除 localhost 外，Service Worker 需要安全上下文。

安装性不是唯一目标。离线、更新、存储、通知和平台差异都需设计。

### 六、缓存策略按资源类型决定

| 资源 | 策略示例 |
|---|---|
| 带哈希静态资源 | Cache First |
| HTML 导航 | Network First + 离线页 |
| 文章列表 | Stale While Revalidate |
| 发布写请求 | Network Only，失败进入受控队列 |
| 用户敏感数据 | 明确加密、清理与禁止共享缓存 |

不要用一个 Service Worker 策略覆盖所有请求。

### 七、更新生命周期

```text
install → waiting → activate
```

新 Service Worker 可能等待旧页面关闭。直接 `skipWaiting()` + `clients.claim()` 会让新运行时代码接管旧页面，资源版本不匹配时可能出错。

更新 UX：

1. 检测 waiting worker。
2. 提示“有新版本”。
3. 确认用户没有未保存内容。
4. 激活并刷新。
5. 记录更新失败。

### 八、离线写入

离线保存草稿需要：

- 本地操作 ID
- 基础版本
- 创建时间
- 重试状态
- 幂等键
- 冲突策略

```text
本地基于 version=7 修改
服务端已到 version=9
→ 不能静默覆盖
→ 显示差异、合并或保留副本
```

后台同步不是保证执行的任务队列，浏览器可能终止 Service Worker。关键写入需要用户可见状态和再次打开后的恢复。

### 九、可访问性自动化分层

#### 静态检查

- JSX/模板规则
- label 关联
- 禁止无语义点击元素
- 图片 alt 规则

#### 组件测试

- role/name/state
- 键盘操作
- 焦点移动
- 错误反馈

#### E2E

- 仅键盘完成关键路径
- 页面标题与 landmark
- Dialog 焦点管理
- 路由后焦点与播报

#### 自动扫描

axe、Lighthouse 等能发现部分规则错误，不能判断文案是否清晰、焦点顺序是否符合任务或屏幕阅读器体验是否合理。

#### 人工验证

- 键盘
- 200%/400% 放大
- 屏幕阅读器
- 高对比/强制颜色
- 减少动画
- 不同输入设备

### 十、可访问性门禁

PR 至少执行：

```text
lint
组件可访问性测试
关键页面 axe 扫描
键盘 E2E
```

发布前人工抽查关键旅程。发现问题时记录违反的用户任务和 WCAG 成功标准，不只记录工具规则 ID。

---

## 常见问题

### Q1：中文产品也需要国际化架构吗？

如果确定永远单语言，可以避免完整翻译平台，但日期、时区、数字和文案可扩展性仍值得明确。

### Q2：机器翻译能直接上线吗？

低风险内容可辅助，但关键交易、法律、安全和品牌文案需要人工审校与上下文。

### Q3：PWA 能完全替代原生应用吗？

取决于平台能力、商店分发、后台限制、通知和硬件 API。应按产品需求评估。

### Q4：离线优先是不是所有数据都缓存？

不是。敏感性、容量、一致性和恢复成本决定缓存范围。

### Q5：axe 零问题是否符合 WCAG？

不能得出该结论。自动工具只能检测可编码规则的一部分。

### Q6：ARIA 能修复错误 HTML 吗？

优先使用原生元素。ARIA 改变辅助技术语义，不自动提供键盘行为和浏览器原生能力。

---

## 实操作业

### 基础：Atlas 双语言

实现中文与英文：

- URL locale
- 消息 ID
- 日期与数字格式
- 语言回退
- 记住用户偏好

### 进阶：可控离线阅读

为公开文章实现：

- Manifest
- 离线页
- 文章缓存版本
- 更新提示
- 缓存清理
- 敏感工作台不进入共享缓存

### 挑战：产品化门禁

建立 CI：

- 缺失翻译 key 检查
- RTL 截图回归
- 组件 axe 测试
- 键盘发布流程 E2E
- Service Worker 更新测试
- 离线草稿冲突测试

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：locale 路由白名单、message ID 与 fallback，Intl 指定 locale/timeZone；记用户选择但不覆盖 URL 明确语言。缺 key/未知语言/日期跨日均测试。
- **进阶**：缓存公开文章带版本与更新时间，更新提示后安全刷新；敏感工作台绕过共享缓存。注销清用户范围数据但不丢未同步草稿，离线失败有可操作回退。
- **挑战**：CI 检查缺 key、RTL、axe 与键盘流程，SW 新旧版本用真实浏览器演练。自动扫描通过不等于屏幕阅读器通过；冲突返回409并保留两份草稿。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L5 里程碑](../../projects/atlas/milestones/L5.md)
- 本课任务：按 L5 里程碑在 Atlas 中建立“国际化、PWA 与可访问性自动化”的可量化基线、改进方案、前后证据和长期治理规则。
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

- 国际化涵盖语言、地区、复数、格式、时区和书写方向
- 稳定消息 ID 与结构化变量比字符串替换更可靠
- PWA 需要设计缓存、更新、离线写入和冲突恢复
- Service Worker 不是可靠后台服务器
- 可访问性验证必须组合静态、组件、E2E、扫描与人工测试

<!-- course-nav:start -->
---

[上一篇：02 威胁建模与安全验证](./02-威胁建模与安全验证.md) · [课程地图](../../README.md) · [下一篇：Web 渗透测试：范围、靶场与证据](../08-Web安全测试/01-测试范围-靶场与证据.md)
<!-- course-nav:end -->
