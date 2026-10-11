# showPicker 与渐进增强

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 把 showPicker() 作为可检测增强，并在不支持、拒绝或无脚本时保留原生输入基线。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | 本章辅助能力 |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

把 showPicker() 作为可检测增强，并在不支持、拒绝或无脚本时保留原生输入基线。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 showPicker 与渐进增强；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 `showPicker()`：增强，不是前置条件

部分有原生选择器的类型支持：

```js
input.showPicker();
```

常见候选包括日期、时间、颜色和文件。调用前检测：

```js
const canShowPicker =
  "showPicker" in HTMLInputElement.prototype &&
  typeof input.showPicker === "function";
```

还必须在真实用户激活中调用：

```js
button.addEventListener("click", () => {
  if (typeof input.showPicker !== "function") {
    input.focus();
    return;
  }

  try {
    input.showPicker();
  } catch (error) {
    console.log(error.name);
    input.focus();
  }
});
```

可能失败的原因包括：

- 没有瞬时用户激活，抛出 `NotAllowedError`；
- 控件状态不允许选择，抛出 `InvalidStateError`；
- 跨源嵌入等安全限制，可能抛出 `SecurityError`；
- 浏览器虽有方法，但当前类型或平台没有对应 UI。

降级不是自己重写复杂日期选择器，而是让用户直接点击原生控件、聚焦控件或输入标准值。

### 4.2 渐进增强的正确顺序

对 input 类型的渐进增强应遵循：

```text
可见 label 和说明
  → 合适的 type
  → 合适的 name/value
  → HTML 原生 min/max/step 等约束
  → 读取标准 DOM 状态
  → 特性检测 selection / step / showPicker
  → 额外预览和业务映射
  → 服务端重新验证与可信处理
```

不要倒过来：

- 不要先做自定义日期选择器，再删除原生日期语义；
- 不要用脚本把所有字段都强制转成 Number；
- 不要把 hidden 当作权限系统；
- 不要因为有 `accept` 就省略服务端文件验证；
- 不要因为提交被拦截就把本地预览称为发布成功。

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- 本课是本章的能力补充课，不新增覆盖矩阵编号。

## 6. 最小可运行案例

创建 `practice/html-show-picker/minimal.html`，包含一个日期输入、一个颜色输入和两个显式 `type="button"` 的增强按钮。

1. 每个输入都有可见 `label`，即使脚本失败也能直接操作；
2. 点击增强按钮时先检测 `showPicker`，再在 `try/catch` 中调用；
3. 不支持或调用被拒绝时，把焦点移回对应原生输入并显示错误名称；
4. 删除脚本后复验：两个原生输入仍可使用。

通过标准：真实用户点击可以触发支持环境的选择器；不支持、拒绝和无脚本三条路径都有可见回退。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [选择、文件、隐藏与命令输入](07-choice-file-command-inputs.md)，避免复制整份应用。本课只完成以下增量：

- 为日期和颜色输入保留可见标签与直接操作路径；
- 增强按钮只在真实点击中检测并调用 `showPicker()`；
- 记录不支持、调用拒绝和无脚本三条回退路径；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`07-choice-file-command-inputs.md`](07-choice-file-command-inputs.md)。

## 8. 常见错误与排查路径

### 8.1 错误案例：不做检测直接 `showPicker()`

```js
// 错误案例
dateInput.showPicker();
```

恢复：

```js
if (typeof dateInput.showPicker === "function") {
  try {
    dateInput.showPicker();
  } catch (error) {
    console.log(error.name);
    dateInput.focus();
  }
} else {
  dateInput.focus();
}
```

仍要从用户点击事件中调用。

## 9. 课后题

1. showPicker 与渐进增强解决的内容关系或浏览器行为是什么？
2. 哪个相似写法只会得到接近的外观，却不能表达相同语义？
3. 你会用哪一项开发者工具证据区分正确实现和偶然显示？
4. 本课结论中，哪些需要服务端、其他浏览器或辅助技术继续验证？

## 10. 实践练习

选择一件与教材不同的邻里商品，完成一次迁移练习：

1. 先写内容关系、机器值或交互目标，不先写标签；
2. 用 showPicker 与渐进增强 实现最小页面；
3. 制造一个本课错误并保留失败证据；
4. 修复后重复键盘或开发者工具检查；
5. 在记录中解释为什么没有选择一个视觉相似的替代写法。

## 11. 阶段验收

### 11.1 专属 API 与渐进增强

- [ ] `showPicker()` 先做特性检测。
- [ ] 只为具有原生选择器的输入类型提供增强入口。
- [ ] `showPicker()` 从真实用户激活调用。
- [ ] 调用失败时记录具体异常，并仍可聚焦或直接操作原生控件。
- [ ] 删除脚本后，日期和颜色输入仍有可见标签并可直接使用。
- [ ] 没有为了统一外观重写复杂原生选择器。

## 12. 常见问题

### Q24：`showPicker()` 存在就一定能打开吗？

不一定。还受当前类型、用户激活、控件状态、跨源上下文和平台 UI 影响。必须在点击处理器中调用、捕获具体异常，并保留直接操作控件的降级。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：把 showPicker() 作为可检测增强，并在不支持、拒绝或无脚本时保留原生输入基线。
- 本课是本章的能力补充课，不新增覆盖矩阵编号。
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：选择、文件、隐藏与命令输入](07-choice-file-command-inputs.md) · [下一课：标签、可见名称与 textarea](09-label-textarea.md) · [返回 HTML 模块](../README.md)
